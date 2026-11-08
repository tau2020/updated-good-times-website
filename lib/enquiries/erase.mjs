/**
 * Erasing a customer's personal information: a deletion request (POPIA s.24,
 * GDPR Art. 17) by reference or email address, everything received and served
 * before a date, or the retention periods applied as routine housekeeping.
 *
 * Erasing deletes the enquiry row; its email log (which holds the rendered
 * emails' details) and its history go with it (ON DELETE CASCADE). Other
 * traces are outside the database or short-lived: rate-limit rows hold keyed
 * hashes and are pruned once over an hour old (opportunistically), and the
 * server's log has the recipient of an email that failed to send. An open
 * request (New, Contacted, Quoted or Confirmed, for a trip not yet over or
 * with flexible dates) is never erased by accident: `includeActive` must say
 * so, because erasing it loses the booking and frees its vehicle. Without it,
 * the deletion itself checks again, so a request reopened after it was listed
 * is kept.
 *
 * THE RETENTION PERIODS (`retention: true`, the script's --retention). The owner's periods (8 Nov 2026), as the
 * privacy notice states them (site.legal.retention: unconvertedMonths, confirmedYears), applied exactly so, at the
 * moment `now` (the clock, or --now for a rehearsal):
 *
 *   converted     the request is CONFIRMED now, or its history shows it was ever moved to Confirmed: an
 *                 enquiry_events row of kind 'status' (store.mjs writes "<from> → <to>", e.g. "Quoted → Confirmed")
 *                 that reads "… → Confirmed", or "Confirmed → …" (every request starts as New, so one that left
 *                 Confirmed was moved there). Selected once 5 years (confirmedYears) have passed since the end of its
 *                 trip, coalesce(return_slot_end, slot_end), or since its last activity (updated_at) when it has no
 *                 slot:   coalesce(return_slot_end, slot_end, updated_at) <= now − 5 years.
 *   unconverted   every other request. Selected only when ALL of:
 *                   updated_at < now − 1 calendar month (unconvertedMonths)     a month after our last contact;
 *                   coalesce(return_slot_end, slot_end) IS NULL or < now         the date asked about has passed;
 *                   it does not hold vehicle time (holds_vehicle false)          so an open request with flexible
 *                                                                                dates waits until staff close it.
 *                 The privacy notice: "If your request does not become a booking, we delete it one month after our
 *                 last contact about it, or once the date you asked about has passed, whichever is later." So a
 *                 Cancelled or Closed request for a date still to come waits for that date, however long ago it
 *                 was cancelled.
 *   never         a request that holds a vehicle (an active status with a trip not yet over, or with no date), as
 *                 of the clock or of `now`, whichever is earlier: whatever its category, even with includeActive
 *                 (--include-active). Erasing re-applies the whole rule at the same `now`, so a request reopened,
 *                 confirmed or touched after it was listed is kept until a later run.
 *
 * Months and years are calendar ones in Cape Town time (UTC+2 all year, no daylight saving), whatever the
 * machine's or the database's time zone: one month before 31 March is the last day of February, five years before
 * 29 February 2028 is 28 February 2023. Legal exceptions (a tax query, a dispute) are decided by a person, never by
 * this tool: it lists what is due, and only --apply erases.
 */
import { query } from '../db/index.mjs';
import { ACTIVE, STATUS_LABELS } from './status.mjs';
import { REFERENCE_RE } from './reference.mjs';
import { isValidDate, sastEpoch } from './schema.mjs';
import { site } from '../../src/data/site.mjs';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
/** --now: a Cape Town date (its midnight), or a time with its offset (an offset-less time would depend on the machine's zone). */
const NOW_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2}))?$/;
/** Cape Town is UTC+2 all year (the enquiry schema's SAST_OFFSET). */
const SAST_MS = 2 * 3600 * 1000;

/** "a••••@example.com": enough for staff to recognise the request, not a copy of the address in a terminal log. */
export const maskEmail = (email) => String(email ?? '').replace(/^(.)[^@]*/, (_, first) => `${first}••••`);

/** The periods the privacy notice states (site.legal.retention), in whole calendar months and years. */
export function retentionPeriods(retention = site.legal?.retention) {
  const months = retention?.unconvertedMonths;
  const years = retention?.confirmedYears;
  if (!Number.isInteger(months) || months < 1 || !Number.isInteger(years) || years < 1) {
    throw new Error('The retention periods are not set: site.legal.retention needs unconvertedMonths and confirmedYears');
  }
  return { unconvertedMonths: months, convertedYears: years };
}

/**
 * The same Cape Town wall-clock moment `months` calendar months earlier; a day the shorter month lacks becomes its
 * last day (31 March → 28 or 29 February). Fixed offset arithmetic only, so the machine's time zone never matters.
 */
export function calendarMonthsBefore(ms, months) {
  const t = new Date(Number(ms) + SAST_MS); // the Cape Town wall clock, read with the UTC getters
  const first = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() - months, 1));
  const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  const moved = Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), Math.min(t.getUTCDate(), lastDay), t.getUTCHours(), t.getUTCMinutes(), t.getUTCSeconds(), t.getUTCMilliseconds());
  return moved - SAST_MS;
}

/** The moments the retention rule compares with, for `now` (epoch ms). */
export function retentionCutoffs(now, periods = retentionPeriods()) {
  return {
    now,
    ...periods,
    /** An unconverted request's last activity must be before this. */
    unconvertedBefore: calendarMonthsBefore(now, periods.unconvertedMonths),
    /** A converted booking's trip (or, without one, its last activity) must have ended at or before this. */
    convertedUpTo: calendarMonthsBefore(now, 12 * periods.convertedYears),
  };
}

/** --now: 'YYYY-MM-DD' (midnight in Cape Town) or an ISO time with Z or ±HH:MM. Epoch ms. */
export function parseNow(value) {
  const s = String(value ?? '').trim();
  const ms = NOW_RE.test(s) && isValidDate(s.slice(0, 10)) ? (s.length === 10 ? sastEpoch(s) : Date.parse(s)) : NaN;
  if (!Number.isFinite(ms)) throw new Error('--now takes a date, YYYY-MM-DD (midnight in Cape Town), or a time with its offset, e.g. 2026-11-08T09:00:00Z');
  return ms;
}

const toMs = (now) => {
  const ms = now === undefined ? Date.now() : typeof now === 'string' ? parseNow(now) : Number(now instanceof Date ? now.getTime() : now);
  if (!Number.isFinite(ms)) throw new Error('`now` must be a time');
  return ms;
};

/**
 * The retention rule as one SELECT over enquiries (see the header), with its six parameters ($1–$6), so listing
 * and erasing apply the very same rule.
 */
function dueQuery(now) {
  const c = retentionCutoffs(now);
  const confirmed = STATUS_LABELS.CONFIRMED;
  const text = `SELECT e.* FROM (
      SELECT q.id, q.reference_number, q.enquiry_type, q.status, q.email, q.created_at, q.updated_at,
             coalesce(q.return_slot_end, q.slot_end) AS trip_end,
             (q.status = ANY($1::text[]) AND (coalesce(q.return_slot_end, q.slot_end) IS NULL OR coalesce(q.return_slot_end, q.slot_end) > least(now(), $2::timestamptz))) AS holds_vehicle,
             (q.status = 'CONFIRMED' OR EXISTS (
                SELECT 1 FROM enquiry_events ev
                 WHERE ev.enquiry_id = q.id AND ev.kind = 'status' AND (ev.detail LIKE $5::text OR ev.detail LIKE $6::text))) AS converted
        FROM enquiries q) e
     WHERE NOT e.holds_vehicle
       AND CASE WHEN e.converted THEN coalesce(e.trip_end, e.updated_at) <= $4::timestamptz
                ELSE e.updated_at < $3::timestamptz AND (e.trip_end IS NULL OR e.trip_end < $2::timestamptz) END`;
  const iso = (ms) => new Date(ms).toISOString();
  return { text, params: [[...ACTIVE], iso(c.now), iso(c.unconvertedBefore), iso(c.convertedUpTo), `% → ${confirmed}`, `${confirmed} → %`] };
}

/** The requests the retention periods select at `now`: unconverted first, then converted; newest first in each. */
async function findDue(now) {
  const at = toMs(now);
  const { text, params } = dueQuery(at);
  const { rows } = await query(`${text} ORDER BY e.converted, e.created_at DESC`, params);
  return rows.map(({ converted, holds_vehicle, ...r }) => ({
    ...r,
    holds_vehicle: Boolean(holds_vehicle),
    category: converted ? 'converted' : 'unconverted',
    retention_at: new Date(at).toISOString(),
  }));
}

/**
 * The enquiries one selector matches, newest first, with whether each is still
 * open (`holds_vehicle`). Exactly one of reference, email, before or retention
 * (`now`, epoch ms or an ISO string, goes with retention only).
 */
export async function findForErasure({ reference, email, before, retention = false, now } = {}) {
  const given = [reference, email, before].filter((v) => v !== undefined && v !== '').length + (retention ? 1 : 0);
  if (given !== 1) throw new Error('Give exactly one of --reference, --email, --before or --retention');
  if (retention) return findDue(now);
  if (now !== undefined) throw new Error('--now goes with --retention');
  let where;
  let param;
  if (reference !== undefined) {
    param = String(reference).trim().toUpperCase();
    if (!REFERENCE_RE.test(param)) throw new Error('A reference looks like GT-ABC234');
    where = 'reference_number = $1';
  } else if (email !== undefined) {
    param = String(email).trim().toLowerCase();
    if (!param.includes('@')) throw new Error('Give a whole email address');
    where = 'lower(email) = $1';
  } else {
    param = String(before).trim();
    if (!DATE_RE.test(param) || Number.isNaN(Date.parse(param))) throw new Error('--before takes a date, YYYY-MM-DD');
    // Received before the date, and the service (if it had a time) also over by then.
    where = 'created_at < $1::date AND coalesce(return_slot_end, slot_end, created_at) < $1::date';
  }
  const { rows } = await query(
    `SELECT id, reference_number, enquiry_type, status, email, created_at,
            (status = ANY($2::text[]) AND (coalesce(return_slot_end, slot_end) IS NULL OR coalesce(return_slot_end, slot_end) > now())) AS holds_vehicle
       FROM enquiries WHERE ${where} ORDER BY created_at DESC`,
    [param, [...ACTIVE]],
  );
  return rows.map((r) => ({ ...r, holds_vehicle: Boolean(r.holds_vehicle) }));
}

/**
 * Delete these enquiries (and, by cascade, their email log and history). Returns the references erased, which
 * can be fewer than the rows given: one listed by the retention rule is erased only if the rule still selects it,
 * and without `includeActive` none that holds a vehicle by now.
 */
export async function eraseEnquiries(rows, { includeActive = false } = {}) {
  const active = rows.filter((r) => r.holds_vehicle);
  if (active.length && !includeActive) {
    throw new Error(`${active.map((r) => r.reference_number).join(', ')} still open (a trip to come, or flexible dates); close or cancel them first, or pass --include-active`);
  }
  if (!rows.length) return [];
  const gone = [];
  for (const at of new Set(rows.map((r) => r.retention_at).filter(Boolean))) {
    const { text, params } = dueQuery(Date.parse(at));
    const ids = rows.filter((r) => r.retention_at === at).map((r) => r.id);
    const { rows: erased } = await query(`DELETE FROM enquiries WHERE id = ANY($7::uuid[]) AND id IN (SELECT due.id FROM (${text}) due) RETURNING reference_number`, [...params, ids]);
    gone.push(...erased);
  }
  const others = rows.filter((r) => !r.retention_at).map((r) => r.id);
  if (others.length) {
    const { rows: erased } = await query(
      `DELETE FROM enquiries WHERE id = ANY($1::uuid[])
         AND ($2::boolean OR NOT (status = ANY($3::text[]) AND (coalesce(return_slot_end, slot_end) IS NULL OR coalesce(return_slot_end, slot_end) > now())))
       RETURNING reference_number`,
      [others, includeActive, [...ACTIVE]],
    );
    gone.push(...erased);
  }
  return gone.map((r) => r.reference_number);
}
