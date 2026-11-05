/**
 * Enquiry status pipeline and the changes the team can make from the signed
 * links in the notification email:
 *
 *   NEW → CONTACTED → QUOTED → CONFIRMED → CLOSED       (and CANCELLED, from the dashboard)
 *
 * CONFIRMED means the operator has confirmed the booking with the customer;
 * nothing sets it automatically. Links only move an enquiry forwards (skipping
 * ahead is fine, e.g. NEW → CONFIRMED after a phone call), so a stale link in
 * an old email can never undo progress. CLOSED and CANCELLED are final for
 * links; the staff dashboard can set any status (lib/http/admin.mjs).
 *
 * The ACTIVE statuses hold a vehicle (lib/bookings/availability.mjs); CLOSED
 * and CANCELLED release it.
 */
export const STATUSES = Object.freeze(['NEW', 'CONTACTED', 'QUOTED', 'CONFIRMED', 'CLOSED', 'CANCELLED']);

/** Statuses whose requests hold vehicle time. */
export const ACTIVE = Object.freeze(['NEW', 'CONTACTED', 'QUOTED', 'CONFIRMED']);

/** Human names for each status, as shown on the status page. */
export const STATUS_LABELS = Object.freeze({
  NEW: 'New',
  CONTACTED: 'Contacted',
  QUOTED: 'Quoted',
  CONFIRMED: 'Confirmed',
  CLOSED: 'Closed',
  CANCELLED: 'Cancelled',
});

/** Statuses the team may set via a signed link, with the label shown on the link. */
export const ACTIONS = Object.freeze({
  CONTACTED: 'Mark contacted',
  QUOTED: 'Mark quoted',
  CONFIRMED: 'Mark confirmed',
  CLOSED: 'Close',
});

/** Once an enquiry is closed, links cannot change it. */
export const TERMINAL = Object.freeze(['CLOSED', 'CANCELLED']);

/** Statuses that mean the enquiry is no longer open. */
export const FINISHED = Object.freeze(['CONFIRMED', 'CLOSED', 'CANCELLED']);

export function isStatus(s) {
  return STATUSES.includes(s);
}

const rank = (s) => STATUSES.indexOf(s);

/**
 * Whether a link-driven change is allowed. Applying the same status twice is
 * a no-op ("already"); a closed enquiry cannot be reopened ("terminal"); a
 * link that would move the enquiry backwards is refused ("backwards").
 */
export function canTransition(from, to) {
  if (!isStatus(from) || !(to in ACTIONS)) return { ok: false, reason: 'invalid' };
  if (from === to) return { ok: false, reason: 'already' };
  if (TERMINAL.includes(from)) return { ok: false, reason: 'terminal' };
  if (rank(to) < rank(from)) return { ok: false, reason: 'backwards' };
  return { ok: true };
}
