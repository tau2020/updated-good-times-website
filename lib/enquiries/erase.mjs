/**
 * Erasing a customer's personal information: a deletion request (POPIA s.24,
 * GDPR Art. 17) by reference or email address, or the retention period
 * applied to everything older than a date.
 *
 * Erasing deletes the enquiry row; its email log (which holds the rendered
 * emails' details) and its history go with it (ON DELETE CASCADE). Other
 * traces are outside the database or short-lived: rate-limit rows hold keyed
 * hashes and are pruned once over an hour old (opportunistically), and the
 * server's log has the recipient of an email that failed to send. An open
 * request (New, Contacted, Quoted or Confirmed, for a trip not yet over or
 * with flexible dates) is never erased by accident: `includeActive` must say
 * so, because erasing it loses the booking and frees its vehicle.
 */
import { query } from '../db/index.mjs';
import { ACTIVE } from './status.mjs';
import { REFERENCE_RE } from './reference.mjs';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** "a••••@example.com": enough for staff to recognise the request, not a copy of the address in a terminal log. */
export const maskEmail = (email) => String(email ?? '').replace(/^(.)[^@]*/, (_, first) => `${first}••••`);

/**
 * The enquiries one selector matches, newest first, with whether each is still
 * open (`holds_vehicle`). Exactly one of reference, email or before.
 */
export async function findForErasure({ reference, email, before } = {}) {
  const given = [reference, email, before].filter((v) => v !== undefined && v !== '');
  if (given.length !== 1) throw new Error('Give exactly one of --reference, --email or --before');
  let where;
  let param;
  if (reference !== undefined) {
    param = String(reference).trim().toUpperCase();
    if (!REFERENCE_RE.test(param)) throw new Error('A reference looks like GT-ABC123');
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

/** Delete these enquiries (and, by cascade, their email log and history). Returns the references erased. */
export async function eraseEnquiries(rows, { includeActive = false } = {}) {
  const active = rows.filter((r) => r.holds_vehicle);
  if (active.length && !includeActive) {
    throw new Error(`${active.map((r) => r.reference_number).join(', ')} still open (a trip to come, or flexible dates); close or cancel them first, or pass --include-active`);
  }
  if (!rows.length) return [];
  const { rows: gone } = await query('DELETE FROM enquiries WHERE id = ANY($1::uuid[]) RETURNING reference_number', [rows.map((r) => r.id)]);
  return gone.map((r) => r.reference_number);
}
