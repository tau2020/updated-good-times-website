/**
 * POST /api/enquiries: the visitor-facing intake for both request paths
 * (tour enquiry and transfer request).
 *
 * Order of checks is deliberate: cheap rejections first, the database only
 * for the rate limit and the store, and the enquiry is committed before any
 * email is attempted so an email outage can never lose a request.
 *
 *   enabled / live → body limit (enforced while streaming) → rate limit →
 *   honeypot / too fast by the browser's monotonic elapsed_ms (decoy)
 *   → validation → idempotency / de-duplication → availability → store → email → 201
 */
import { randomUUID } from 'node:crypto';
import { config } from '../config.mjs';
import { validateEnquiry } from '../enquiries/schema.mjs';
import { createEnquiry, dedupeContent, DuplicateEnquiryError, UnavailableError } from '../enquiries/store.mjs';
import { notifyNewEnquiry } from '../enquiries/notify.mjs';
import { one } from '../db/index.mjs';
import { checkRateLimit, pruneRateLimits } from '../security/ratelimit.mjs';
import { hashIp, dedupeHash, clientIp } from '../security/hash.mjs';
import { json, readJson } from './response.mjs';

const KEY_RE = /^[A-Za-z0-9_-]{16,128}$/;

/** The hidden anti-spam field. A meaningless name, so browser autofill and password managers leave it alone. */
export const HONEYPOT = 'gt_hp_check';

/**
 * Time spent on the form, as measured by the browser with performance.now()
 * (monotonic, so a wrong device clock cannot affect it). A non-negative
 * integer number of milliseconds; anything else, or nothing, is "unknown"
 * and never counts as too fast. Capped at a week.
 */
export function elapsedMs(value) {
  if (value === undefined || value === null || value === '') return null;
  const n = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) return null;
  return Math.min(n, 7 * 24 * 3600 * 1000);
}

/** Bots get a cheerful 200 and nothing else. Never tell them why. */
const decoy = () => json(200, { ok: true });

export async function postEnquiry(request, ctx = {}) {
  if (!config.enabled) return json(503, { ok: false, code: 'disabled', error: 'Online enquiries are paused at the moment. Please try again later.' });
  // A preview deployment never accepts enquiries, even if someone posts to it directly.
  if (config.mode !== 'live') return json(503, { ok: false, code: 'preview', error: 'This is a preview of the website. Enquiries are not sent from it.' });

  const body = await readJson(request, config.limits.maxBodyBytes);
  if (!body.ok) return json(body.status, { ok: false, error: body.error });

  const ip = clientIp(request.headers, ctx.ip);
  const ipHash = hashIp(ip);
  const limit = await checkRateLimit(`enquiries:${ipHash}`);
  if (!limit.allowed) {
    return json(429, { ok: false, error: 'Too many attempts. Please wait a minute and try again.' }, { 'Retry-After': String(limit.retryAfter) });
  }
  // Housekeeping without a cron: now and then, drop rate-limit windows older than an hour.
  if (Math.random() < 0.05) await pruneRateLimits().catch(() => {});

  const f = body.body;
  // Anti-spam: the hidden field was filled, or the form was completed faster than a person could.
  if (typeof f[HONEYPOT] === 'string' && f[HONEYPOT].trim() !== '') return decoy();
  const elapsed = elapsedMs(f.elapsed_ms);
  if (elapsed !== null && elapsed < config.limits.minSecondsOnForm * 1000) return decoy();

  const { ok, data, errors } = validateEnquiry(f);
  if (!ok) return json(400, { ok: false, error: 'Please check the highlighted fields.', errors });

  let idempotencyKey = request.headers.get('idempotency-key') || (typeof f.idempotency_key === 'string' ? f.idempotency_key : '');
  if (!KEY_RE.test(idempotencyKey)) idempotencyKey = randomUUID();

  let enquiry;
  try {
    enquiry = await createEnquiry(data, {
      idempotencyKey,
      dedupeHash: dedupeHash(data.email, dedupeContent(data)),
      ipHash,
      userAgent: request.headers.get('user-agent') || '',
      pageUrl: typeof f.page_url === 'string' ? f.page_url : '',
    });
  } catch (err) {
    // The vehicles are taken at that time: nothing stored, nothing emailed; the form points at the field.
    if (err instanceof UnavailableError) return json(409, { ok: false, code: 'unavailable', error: err.message, field: err.field, errors: { [err.field]: err.message } });
    if (err instanceof DuplicateEnquiryError) {
      // A retry of a request that was stored but never announced (the first attempt failed before emailing):
      // announce it now, so neither Good Times nor the visitor is left without the emails.
      const prior = err.kind === 'idempotency' ? err.existing : null;
      if (prior?.id && !ctx.skipNotify && !(await one('SELECT 1 FROM email_log WHERE enquiry_id = $1 LIMIT 1', [prior.id]))) await notifyNewEnquiry(prior);
      return json(409, {
        ok: false,
        code: err.kind === 'idempotency' ? 'duplicate_submission' : 'duplicate_content',
        error: err.message,
        reference: err.existing?.reference_number ?? null,
      });
    }
    throw err;
  }

  // The enquiry is committed. Emails are best-effort: failures are logged
  // in email_log for retry and surface only as `emailed: false`.
  let emailed = true;
  if (!ctx.skipNotify) {
    const r = await notifyNewEnquiry(enquiry);
    emailed = r.allSent;
  }
  if (typeof ctx.onCreated === 'function') await ctx.onCreated(enquiry);

  return json(201, { ok: true, reference: enquiry.reference_number, enquiry_type: enquiry.enquiry_type, emailed });
}
