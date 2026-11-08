/**
 * Enquiry persistence. Every write goes through here; the HTTP layer never
 * touches SQL. Rows come back with snake_case columns exactly as stored.
 */
import { query, one, isUniqueViolation } from '../db/index.mjs';
import { config } from '../config.mjs';
import { uniqueReference } from './reference.mjs';
import { canTransition, ACTIVE, STATUS_LABELS } from './status.mjs';
import { sastIso } from './schema.mjs';
import { holdsFor, checkHolds } from '../bookings/availability.mjs';
import { formatDayDate } from '../email/layout.mjs';
import { site } from '../../src/data/site.mjs';

/** How a request's acceptance of the Terms & Conditions reads in its history (`kind: 'terms'`). */
export const termsAcceptance = (version = site.legal.termsVersion) => `Accepted the Terms & Conditions, version ${version}`;

// Dates are cast to text so every driver returns 'YYYY-MM-DD' rather than a timezone-shifted Date.
export const COLUMNS = `id, reference_number, enquiry_type, status,
  name, email, phone, country, preferred_contact_method,
  tour_slug, preferred_date::text AS preferred_date, dates_flexible, flexible_dates, nights, pickup_area, children_ages,
  transfer_type, pickup_location, destination, pickup_at, pickup_date_sast, pickup_time_sast,
  return_trip, return_at, return_date_sast, return_time_sast, flight_number, suitcases, oversized_items, child_seats,
  adults, children, travellers, special_requirements, consent_at,
  created_at, updated_at, last_contacted_at,
  idempotency_key, dedupe_hash, ip_hash, user_agent, page_url,
  slot_start, slot_end, return_slot_start, return_slot_end, staff_note`;

export class DuplicateEnquiryError extends Error {
  constructor(kind, existing) {
    super(kind === 'idempotency' ? 'This enquiry has already been received.' : 'An identical enquiry was received a few minutes ago.');
    this.name = 'DuplicateEnquiryError';
    this.kind = kind;
    this.existing = existing;
  }
}

/**
 * The request does not fit: at some moment of a time it would hold, every
 * vehicle is already taken (or the day is closed). `field` names the form
 * field to point the visitor at.
 */
export class UnavailableError extends Error {
  constructor({ field, message }) {
    super(message);
    this.name = 'UnavailableError';
    this.field = field;
  }
}

/** The visitor-facing reason a request does not fit, pointed at the field to change. */
export function unavailableReason(data, failure) {
  const date = formatDayDate(failure.date);
  if (data.enquiry_type === 'transfer') {
    const ret = failure.index === 1;
    const field = ret ? 'return_time' : 'transfer_time';
    if (failure.closed) return { field, message: `We are not taking ${ret ? 'return ' : ''}transfers on ${date}. Choose another date, or contact us directly.` };
    return { field, message: `Every vehicle is already booked at that ${ret ? 'return ' : ''}time on ${date}. Choose another time or date, or contact us directly.` };
  }
  const instead = data.dates_flexible ? 'or clear the date and tell us which dates could work' : 'or tick “My dates are flexible”';
  if (failure.closed) return { field: 'preferred_date', message: `We are not taking bookings on ${date}. Choose another date, ${instead}.` };
  return { field: 'preferred_date', message: `We are fully booked on ${date}. Choose another date, ${instead}.` };
}

/** Throws UnavailableError when a validated request does not fit around the active requests. */
export async function assertAvailable(data, { excludeId } = {}) {
  const r = await checkHolds(holdsFor(data), { excludeId });
  if (!r.ok) throw new UnavailableError(unavailableReason(data, r));
}

/**
 * What makes two enquiries "the same request" for the de-duplication window:
 * the path and its key details, normalised. Combined with the email address
 * by dedupeHash().
 */
export function dedupeContent(data) {
  const norm = (v) => String(v ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  const parts =
    data.enquiry_type === 'transfer'
      ? ['transfer', data.transfer_type, data.pickup_location, data.destination, data.transfer_date, data.transfer_time, data.return_trip ? `${data.return_date} ${data.return_time}` : '', data.adults, data.children, data.flight_number, data.notes]
      : ['tour', data.tour_slug, data.preferred_date, data.dates_flexible ? data.flexible_dates || 'flexible' : '', data.nights || '', data.adults, data.children, data.pickup_area, data.special_requests];
  return parts.map(norm).join('|');
}

export async function getEnquiry(id) {
  return one(`SELECT ${COLUMNS} FROM enquiries WHERE id = $1`, [id]);
}

export async function getEnquiryByReference(reference) {
  return one(`SELECT ${COLUMNS} FROM enquiries WHERE reference_number = $1`, [reference]);
}

export async function findByIdempotencyKey(key) {
  return one(`SELECT ${COLUMNS} FROM enquiries WHERE idempotency_key = $1`, [key]);
}

export async function findRecentDuplicate(dedupeHash, minutes = config.limits.duplicateWindowMinutes) {
  return one(
    `SELECT ${COLUMNS} FROM enquiries WHERE dedupe_hash = $1 AND created_at > now() - make_interval(mins => $2) ORDER BY created_at DESC LIMIT 1`,
    [dedupeHash, minutes],
  );
}

/** Map validated form data onto table columns. Fields of the path not taken are stored blank. */
function toRow(data) {
  const transfer = data.enquiry_type === 'transfer';
  return {
    enquiry_type: transfer ? 'transfer' : 'tour',
    name: data.name,
    email: data.email,
    phone: data.phone,
    country: data.country,
    preferred_contact_method: data.preferred_contact_method,
    tour_slug: transfer ? '' : data.tour_slug,
    preferred_date: transfer ? '' : data.preferred_date,
    dates_flexible: transfer ? false : Boolean(data.dates_flexible),
    flexible_dates: transfer ? '' : data.flexible_dates,
    nights: transfer ? 0 : data.nights || 0,
    pickup_area: transfer ? '' : data.pickup_area,
    children_ages: transfer ? '' : data.children_ages,
    transfer_type: transfer ? data.transfer_type : '',
    pickup_location: transfer ? data.pickup_location : '',
    destination: transfer ? data.destination : '',
    pickup_at: transfer ? sastIso(data.transfer_date, data.transfer_time) : '',
    pickup_date_sast: transfer ? data.transfer_date : '',
    pickup_time_sast: transfer ? data.transfer_time : '',
    return_trip: transfer ? Boolean(data.return_trip) : false,
    return_at: transfer && data.return_trip ? sastIso(data.return_date, data.return_time) : '',
    return_date_sast: transfer && data.return_trip ? data.return_date : '',
    return_time_sast: transfer && data.return_trip ? data.return_time : '',
    flight_number: transfer ? data.flight_number : '',
    suitcases: transfer ? data.suitcases : 0,
    oversized_items: transfer ? data.oversized_items : '',
    child_seats: transfer ? data.child_seats : '',
    adults: data.adults,
    children: data.children,
    travellers: (data.adults || 0) + (data.children || 0),
    special_requirements: (transfer ? data.notes : data.special_requests) || '',
    ...slotsOf(holdsFor(data)),
  };
}

const iso = (ms) => (Number.isFinite(ms) ? new Date(ms).toISOString() : '');
function slotsOf(holds) {
  const [a, b] = holds;
  return { slot_start: iso(a?.start), slot_end: iso(a?.end), return_slot_start: iso(b?.start), return_slot_end: iso(b?.end) };
}

/**
 * Insert a validated enquiry. Generates a unique reference and raises
 * DuplicateEnquiryError on a repeated idempotency key or a same-person,
 * same-request repeat inside the window, and UnavailableError when the
 * vehicle time it needs is taken.
 *
 * Double bookings: availability is checked before the insert and again
 * after it, with the new row counted. Two requests racing for the last
 * vehicle are both stored before either second check runs, or one is checked
 * before the other is stored; either way the later second check sees both
 * and that request is removed again, so the vehicles are never overbooked
 * (at worst both racers are asked to choose again). Nothing is emailed until
 * this returns.
 */
export async function createEnquiry(data, { idempotencyKey, dedupeHash, ipHash = '', userAgent = '', pageUrl = '' }) {
  const prior = await findByIdempotencyKey(idempotencyKey);
  if (prior) throw new DuplicateEnquiryError('idempotency', prior);
  const recent = await findRecentDuplicate(dedupeHash);
  if (recent) throw new DuplicateEnquiryError('content', recent);

  await assertAvailable(data);

  const r = toRow(data);
  const exists = async (ref) => Boolean(await one('SELECT 1 FROM enquiries WHERE reference_number = $1', [ref]));
  for (let attempt = 0; attempt < 3; attempt++) {
    const reference = await uniqueReference(exists);
    try {
      const { rows } = await query(
        `INSERT INTO enquiries (
           reference_number, enquiry_type, name, email, phone, country, preferred_contact_method,
           tour_slug, preferred_date, dates_flexible, flexible_dates, pickup_area, children_ages,
           transfer_type, pickup_location, destination, pickup_at, pickup_date_sast, pickup_time_sast,
           return_trip, return_at, return_date_sast, return_time_sast, flight_number, suitcases, oversized_items, child_seats,
           adults, children, travellers, special_requirements, consent_at,
           idempotency_key, dedupe_hash, ip_hash, user_agent, page_url,
           nights, slot_start, slot_end, return_slot_start, return_slot_end
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7,
           $8, NULLIF($9, '')::date, $10, $11, $12, $13,
           $14, $15, $16, NULLIF($17, '')::timestamptz, $18, $19,
           $20, NULLIF($21, '')::timestamptz, $22, $23, $24, $25, $26, $27,
           $28, $29, $30, $31, now(),
           $32, $33, $34, $35, $36,
           $37, NULLIF($38, '')::timestamptz, NULLIF($39, '')::timestamptz, NULLIF($40, '')::timestamptz, NULLIF($41, '')::timestamptz
         ) RETURNING ${COLUMNS}`,
        [
          reference, r.enquiry_type, r.name, r.email, r.phone, r.country, r.preferred_contact_method,
          r.tour_slug, r.preferred_date, r.dates_flexible, r.flexible_dates, r.pickup_area, r.children_ages,
          r.transfer_type, r.pickup_location, r.destination, r.pickup_at, r.pickup_date_sast, r.pickup_time_sast,
          r.return_trip, r.return_at, r.return_date_sast, r.return_time_sast, r.flight_number, r.suitcases, r.oversized_items, r.child_seats,
          r.adults, r.children, r.travellers, r.special_requirements,
          idempotencyKey, dedupeHash, ipHash, userAgent.slice(0, 400), pageUrl.slice(0, 300),
          r.nights, r.slot_start, r.slot_end, r.return_slot_start, r.return_slot_end,
        ],
      );
      const created = rows[0];
      const holds = holdsFor(data);
      if (holds.length) {
        let after;
        try {
          after = await checkHolds(holds, { extra: 0 });
        } catch (err) {
          // The second check could not run (a database blip): take the request back rather than keep
          // one that was never checked and that nobody would be emailed about. The visitor can resend.
          await query('DELETE FROM enquiries WHERE id = $1', [created.id]).catch(() => {});
          throw err;
        }
        if (!after.ok) {
          await query('DELETE FROM enquiries WHERE id = $1', [created.id]);
          throw new UnavailableError(unavailableReason(data, after));
        }
      }
      await logEvent(created.id, { actor: 'website', kind: 'created', detail: `${created.enquiry_type === 'transfer' ? 'Transfer request' : 'Tour request'} received` });
      // The acceptance record (D78): the version of the text, the server's time (the event's `at`), and this request.
      if (data.terms) await logEvent(created.id, { actor: 'customer', kind: 'terms', detail: termsAcceptance() });
      return created;
    } catch (err) {
      if (isUniqueViolation(err, 'idempotency_key')) throw new DuplicateEnquiryError('idempotency', await findByIdempotencyKey(idempotencyKey));
      if (isUniqueViolation(err, 'reference_number')) continue; // lost a race on the reference; try another
      throw err;
    }
  }
  throw new Error('Could not store enquiry: reference collisions');
}

/**
 * Apply a link-driven status change. Guarded by the state machine and by a
 * conditional UPDATE so two clicks cannot both "win".
 */
export async function transitionStatus(id, to, { actor = 'email link' } = {}) {
  const current = await getEnquiry(id);
  if (!current) return { ok: false, reason: 'missing' };
  const check = canTransition(current.status, to);
  if (!check.ok) return { ...check, enquiry: current };
  const updated = await one(
    `UPDATE enquiries SET status = $2, updated_at = now(),
       last_contacted_at = CASE WHEN $2 IN ('CONTACTED','QUOTED') THEN now() ELSE last_contacted_at END
     WHERE id = $1 AND status = $3 RETURNING ${COLUMNS}`,
    [id, to, current.status],
  );
  if (!updated) return { ok: false, reason: 'already', enquiry: await getEnquiry(id) };
  await logEvent(id, { actor, kind: 'status', detail: `${STATUS_LABELS[current.status]} → ${STATUS_LABELS[to]}` });
  return { ok: true, enquiry: updated, from: current.status };
}

/* ---------- staff dashboard ---------- */

/** Record what happened to a request (shown in the dashboard). Never fails the caller. */
export async function logEvent(enquiryId, { actor = '', kind, detail = '' }) {
  try {
    await query('INSERT INTO enquiry_events (enquiry_id, actor, kind, detail) VALUES ($1, $2, $3, $4)', [enquiryId, String(actor).slice(0, 200), kind, String(detail).slice(0, 500)]);
  } catch (err) {
    console.error(`[events] ${kind} for ${enquiryId}: ${err.message}`);
  }
}

export async function eventsFor(enquiryId) {
  return (await query('SELECT at, actor, kind, detail FROM enquiry_events WHERE enquiry_id = $1 ORDER BY at ASC', [enquiryId])).rows;
}

export async function emailsFor(enquiryId) {
  return (await query('SELECT template, recipient, status, error, attempts, created_at, updated_at FROM email_log WHERE enquiry_id = $1 ORDER BY created_at ASC', [enquiryId])).rows;
}

const holdsOfRow = (row) =>
  [
    [row.slot_start, row.slot_end],
    [row.return_slot_start, row.return_slot_end],
  ]
    .filter(([a, b]) => a && b)
    .map(([a, b]) => ({ start: new Date(a).getTime(), end: new Date(b).getTime() }));

/**
 * Staff set any status from the dashboard. Moving a CLOSED or CANCELLED
 * request back to an active status takes its vehicle time again, so it is
 * checked like a new request (before and after the change) and refused when
 * the vehicles are taken.
 *
 * @returns {Promise<{ ok: true, enquiry, from } | { ok: false, reason: 'missing'|'invalid'|'already'|'unavailable', enquiry?, message? }>}
 */
export async function setStatus(id, to, { actor }) {
  if (!Object.hasOwn(STATUS_LABELS, to)) return { ok: false, reason: 'invalid' };
  const current = await getEnquiry(id);
  if (!current) return { ok: false, reason: 'missing' };
  if (current.status === to) return { ok: false, reason: 'already', enquiry: current };
  const reactivating = !ACTIVE.includes(current.status) && ACTIVE.includes(to);
  const holds = reactivating ? holdsOfRow(current) : [];
  if (holds.length) {
    const before = await checkHolds(holds, { excludeId: id });
    if (!before.ok) return { ok: false, reason: 'unavailable', enquiry: current, message: `The vehicles are taken on ${formatDayDate(before.date)}, so it cannot be reopened.` };
  }
  const updated = await one(
    `UPDATE enquiries SET status = $2, updated_at = now(),
       last_contacted_at = CASE WHEN $2 IN ('CONTACTED','QUOTED') THEN now() ELSE last_contacted_at END
     WHERE id = $1 AND status = $3 RETURNING ${COLUMNS}`,
    [id, to, current.status],
  );
  if (!updated) return { ok: false, reason: 'already', enquiry: await getEnquiry(id) };
  if (holds.length) {
    const after = await checkHolds(holds, { extra: 0 });
    if (!after.ok) {
      await query('UPDATE enquiries SET status = $2, updated_at = now() WHERE id = $1 AND status = $3', [id, current.status, to]);
      return { ok: false, reason: 'unavailable', enquiry: current, message: `The vehicles are taken on ${formatDayDate(after.date)}, so it cannot be reopened.` };
    }
  }
  await logEvent(id, { actor, kind: 'status', detail: `${STATUS_LABELS[current.status]} → ${STATUS_LABELS[to]}` });
  return { ok: true, enquiry: updated, from: current.status };
}

export async function setStaffNote(id, note, { actor }) {
  const updated = await one(`UPDATE enquiries SET staff_note = $2, updated_at = now() WHERE id = $1 RETURNING ${COLUMNS}`, [id, String(note).slice(0, 4000)]);
  if (updated) await logEvent(id, { actor, kind: 'note', detail: note ? 'Note updated' : 'Note cleared' });
  return updated;
}

/** Dashboard lists. `view`: upcoming (default) · new · past · cancelled · all. `q` matches reference, name, email or phone. */
export const VIEWS = Object.freeze({
  upcoming: { label: 'Upcoming', where: `status IN ('NEW','CONTACTED','QUOTED','CONFIRMED') AND (slot_start IS NULL OR GREATEST(slot_end, COALESCE(return_slot_end, slot_end)) > now())`, order: 'slot_start ASC NULLS FIRST, created_at ASC' },
  new: { label: 'New', where: `status = 'NEW'`, order: 'created_at DESC' },
  past: { label: 'Past', where: `status IN ('NEW','CONTACTED','QUOTED','CONFIRMED') AND slot_start IS NOT NULL AND GREATEST(slot_end, COALESCE(return_slot_end, slot_end)) <= now()`, order: 'slot_start DESC' },
  cancelled: { label: 'Closed & cancelled', where: `status IN ('CLOSED','CANCELLED')`, order: 'updated_at DESC' },
  all: { label: 'All', where: 'TRUE', order: 'created_at DESC' },
});

export async function listEnquiries({ view = 'upcoming', q = '', limit = 200 } = {}) {
  const v = Object.hasOwn(VIEWS, view) ? VIEWS[view] : VIEWS.upcoming;
  const params = [];
  let where = v.where;
  const term = String(q).trim().slice(0, 100);
  if (term) {
    params.push(`%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`);
    where += ` AND (reference_number ILIKE $1 OR name ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1)`;
  }
  params.push(Math.min(Math.max(Number(limit) || 200, 1), 500));
  // email_state: 'none' when no email was ever logged for it (the email log itself could not be written), 'failed' when
  // one failed and was not superseded (or has hung in `queued`), else 'ok'. The list marks the first two.
  const emailState = `(SELECT CASE WHEN count(*) = 0 THEN 'none'
      WHEN bool_or((l.status = 'failed' AND coalesce(l.error, '') NOT LIKE 'superseded:%') OR (l.status = 'queued' AND l.updated_at < now() - interval '10 minutes')) THEN 'failed'
      ELSE 'ok' END FROM email_log l WHERE l.enquiry_id = enquiries.id) AS email_state`;
  return (await query(`SELECT ${COLUMNS}, ${emailState} FROM enquiries WHERE ${where} ORDER BY ${v.order} LIMIT $${params.length}`, params)).rows;
}

/** Counts per view, for the dashboard tabs. */
export async function viewCounts() {
  const parts = Object.entries(VIEWS).map(([k, v]) => `(SELECT count(*)::int FROM enquiries WHERE ${v.where}) AS "${k}"`);
  return one(`SELECT ${parts.join(', ')}`);
}

/** The dashboard's day counts from `fromIso` on. */
export async function dayCapacities(fromIso, limit = 120) {
  return (await query('SELECT day::text AS day, vehicles, note, updated_by, updated_at FROM day_capacity WHERE day >= $1::date ORDER BY day ASC LIMIT $2', [fromIso, limit])).rows;
}

/** Set the vehicles for one date (0 closes it), or remove the override with `vehicles: null`. */
export async function setDayCapacity(day, vehicles, { note = '', actor }) {
  if (vehicles === null) return query('DELETE FROM day_capacity WHERE day = $1::date', [day]);
  return query(
    `INSERT INTO day_capacity (day, vehicles, note, updated_by, updated_at) VALUES ($1::date, $2, $3, $4, now())
     ON CONFLICT (day) DO UPDATE SET vehicles = EXCLUDED.vehicles, note = EXCLUDED.note, updated_by = EXCLUDED.updated_by, updated_at = now()`,
    [day, vehicles, String(note).slice(0, 200), actor],
  );
}
