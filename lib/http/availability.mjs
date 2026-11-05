/**
 * Availability for the booking form, read-only:
 *
 *   GET  /api/availability?month=YYYY-MM   the month's fully booked dates
 *        → { ok, month, earliest, full: [dates a tour no longer fits], closed: [dates nothing fits] }
 *   POST /api/availability                 the details step of the form (JSON, as sent on submit)
 *        → { ok, available: true } | { ok, available: false, field, error }
 *
 * Only dates and a yes/no leave the server: never who booked, or what. The
 * enquiry endpoint applies the same check again when the request is sent.
 */
import { config } from '../config.mjs';
import { validateEnquiry, earliestDate, todayInSast } from '../enquiries/schema.mjs';
import { availabilityForMonth } from '../bookings/availability.mjs';
import { assertAvailable, UnavailableError } from '../enquiries/store.mjs';
import { checkRateLimit } from '../security/ratelimit.mjs';
import { hashIp, clientIp } from '../security/hash.mjs';
import { json, readJson } from './response.mjs';

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

async function guard(request, ctx) {
  if (!config.enabled) return json(503, { ok: false, code: 'disabled', error: 'Online booking is paused at the moment.' });
  if (config.mode !== 'live') return json(503, { ok: false, code: 'preview', error: 'This is a preview of the website.' });
  const limit = await checkRateLimit(`availability:${hashIp(clientIp(request.headers, ctx.ip))}`, { limit: config.limits.availabilityPerMinute });
  if (!limit.allowed) return json(429, { ok: false, error: 'Too many requests. Please wait a minute.' }, { 'Retry-After': String(limit.retryAfter) });
  return null;
}

export async function getAvailability(request, ctx = {}) {
  const refused = await guard(request, ctx);
  if (refused) return refused;
  const month = new URL(request.url).searchParams.get('month') || '';
  const thisMonth = todayInSast().slice(0, 7);
  const lastMonth = `${Number(thisMonth.slice(0, 4)) + 3}${thisMonth.slice(4)}`;
  if (!MONTH_RE.test(month) || month < thisMonth || month > lastMonth) return json(400, { ok: false, error: 'Ask for a month like 2026-11, from this month up to three years ahead.' });
  const { full, closed } = await availabilityForMonth(month);
  return json(200, { ok: true, month, earliest: earliestDate(), full, closed });
}

export async function postAvailability(request, ctx = {}) {
  const refused = await guard(request, ctx);
  if (refused) return refused;
  const body = await readJson(request, 8 * 1024);
  if (!body.ok) return json(body.status, { ok: false, error: body.error });
  const type = body.body.enquiry_type;
  if (type !== 'tour' && type !== 'transfer') return json(400, { ok: false, error: 'Say whether this is a tour or a transfer.' });
  const { ok, data, errors } = validateEnquiry(body.body, { section: type });
  if (!ok) return json(400, { ok: false, error: 'Please check the highlighted fields.', errors });
  try {
    await assertAvailable({ ...data, enquiry_type: type });
  } catch (err) {
    if (err instanceof UnavailableError) return json(200, { ok: true, available: false, field: err.field, error: err.message });
    throw err;
  }
  return json(200, { ok: true, available: true });
}
