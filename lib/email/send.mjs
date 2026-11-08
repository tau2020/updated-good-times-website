/**
 * Send a template and record the attempt in email_log.
 *
 * Contract: sendTemplate() NEVER throws for a provider failure. It logs the
 * row as `failed` with the error and returns { ok:false }, so the calling
 * request (which has already stored the enquiry) still succeeds. The
 * `payload` column holds everything needed to re-render, so
 * retryFailedEmails() can replay it later.
 */
import { query, one } from '../db/index.mjs';
import { config } from '../config.mjs';
import { getProvider } from './provider.mjs';
import { renderTemplate } from './templates/index.mjs';
import { safeReplyTo, headerSafe } from './sanitise.mjs';

export const MAX_ATTEMPTS = 5;
/** Emails that announce a status: only ever (re)sent while the booking still has it. */
const STATUS_TEMPLATES = { 'booking-confirmed': 'CONFIRMED', 'booking-cancelled': 'CANCELLED' };
/** A row still `queued` after this long belongs to a send that never finished (e.g. the function was stopped). */
const STALE_QUEUED_MINUTES = 10;

/**
 * Upper bound on one provider call, on top of the provider's own timeout, so
 * no provider (or a hung connection) can hold the request past its budget.
 */
let sendTimeoutMs = 12_000;
/** Test helper: shorten the per-send time limit. */
export function setSendTimeoutMs(ms) {
  sendTimeoutMs = ms;
}

/**
 * In a preview that really sends (config.email.previewSink), any address outside Resend's test domain goes to its test
 * inbox, except the owned inboxes a test deployment names in EMAIL_TEST_RECIPIENTS (refused in production).
 */
export const routed = (to) =>
  config.email.previewSink && !/@resend\.dev$/i.test(to) && !config.email.testRecipients.includes(String(to).trim().toLowerCase()) ? config.email.previewSink : to;

function withTimeout(promise, ms) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`email send timed out after ${ms} ms`)), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

/**
 * @param {string} template     registry name
 * @param {object} props        template props (must be JSON-serialisable)
 * @param {{ to: string, enquiryId?: string|null, replyTo?: string|null }} opts
 */
export async function sendTemplate(template, props, { to, enquiryId = null, replyTo = null }) {
  const recipient = routed(headerSafe(to, 200));
  const log = await one(
    `INSERT INTO email_log (enquiry_id, template, recipient, status, payload) VALUES ($1, $2, $3, 'queued', $4) RETURNING id`,
    [enquiryId, template, recipient, JSON.stringify({ template, props, to: recipient, replyTo })],
  );
  return attempt(log.id, { template, props, to: recipient, replyTo });
}

async function attempt(logId, { template, props, to: stored, replyTo }) {
  // Routed again at the moment of sending, so a retry of a row stored before the sink existed obeys it too.
  const to = routed(stored);
  let message;
  try {
    message = renderTemplate(template, props);
  } catch (err) {
    await query(`UPDATE email_log SET status = 'failed', error = $2, attempts = attempts + 1, updated_at = now() WHERE id = $1`, [logId, `render: ${err.message}`.slice(0, 500)]);
    return { ok: false, logId, error: err.message };
  }
  const reply = safeReplyTo(replyTo) || config.email.replyTo;
  try {
    const provider = await getProvider();
    const { id } = await withTimeout(
      provider.send({
        to,
        subject: message.subject,
        html: message.html,
        text: message.text,
        replyTo: reply,
        headers: { 'X-Entity-Ref-ID': String(logId) },
      }),
      sendTimeoutMs,
    );
    await query(`UPDATE email_log SET status = 'sent', provider_message_id = $2, error = NULL, attempts = attempts + 1, updated_at = now() WHERE id = $1`, [logId, id]);
    return { ok: true, logId, providerMessageId: id };
  } catch (err) {
    const error = String(err?.message || err).slice(0, 500);
    await query(`UPDATE email_log SET status = 'failed', error = $2, attempts = attempts + 1, updated_at = now() WHERE id = $1`, [logId, error]);
    console.error(`[email] ${template} → ${to} failed: ${error}`);
    return { ok: false, logId, error };
  }
}

/**
 * What the dashboard shows beside its retry button: emails that failed (or were cut off while queued) and will go
 * again on a retry, and those that gave up after MAX_ATTEMPTS. A status email superseded by a later status is
 * neither: it must never be sent.
 */
export async function failedEmailSummary({ staleQueuedMinutes = STALE_QUEUED_MINUTES } = {}) {
  const row = await one(
    `SELECT count(*) FILTER (WHERE attempts < $1 AND (status = 'failed' OR (status = 'queued' AND updated_at < now() - make_interval(mins => $2))))::int AS retryable,
            count(*) FILTER (WHERE status = 'failed' AND attempts >= $1 AND coalesce(error, '') NOT LIKE 'superseded:%')::int AS given_up
       FROM email_log`,
    [MAX_ATTEMPTS, staleQueuedMinutes],
  );
  return { retryable: Number(row?.retryable ?? 0), givenUp: Number(row?.given_up ?? 0) };
}

/**
 * Replay every failed row that still has attempts left, plus rows stuck in
 * `queued` for longer than STALE_QUEUED_MINUTES (a send that was cut off).
 * Delivery is at-least-once: a cut-off send that did reach the provider may
 * be sent again. Returns a summary.
 */
export async function retryFailedEmails({ limit = 50, staleQueuedMinutes = STALE_QUEUED_MINUTES, log = console.log } = {}) {
  const { rows } = await query(
    `SELECT l.id, l.template, l.payload, e.status AS enquiry_status FROM email_log l
     LEFT JOIN enquiries e ON e.id = l.enquiry_id
     WHERE l.attempts < $1
       AND (l.status = 'failed' OR (l.status = 'queued' AND l.updated_at < now() - make_interval(mins => $3)))
     ORDER BY l.created_at ASC LIMIT $2`,
    [MAX_ATTEMPTS, limit, staleQueuedMinutes],
  );
  const summary = { considered: rows.length, sent: 0, failed: 0, superseded: 0 };
  for (const row of rows) {
    // A status email that no longer matches the booking (confirmed, then cancelled) is never sent late.
    const wants = STATUS_TEMPLATES[row.template];
    if (wants && row.enquiry_status !== wants) {
      await query(`UPDATE email_log SET status = 'failed', error = $2, attempts = $3, updated_at = now() WHERE id = $1`, [row.id, `superseded: the booking is now ${row.enquiry_status || 'gone'}`, MAX_ATTEMPTS]);
      summary.superseded++;
      log(`skip   ${row.template}: the booking is now ${row.enquiry_status || 'gone'}`);
      continue;
    }
    const payload = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload;
    const r = await attempt(row.id, payload);
    summary[r.ok ? 'sent' : 'failed']++;
    log(`${r.ok ? 'sent  ' : 'failed'} ${row.template} → ${payload.to}${r.ok ? '' : ` (${r.error})`}`);
  }
  return summary;
}
