/**
 * Availability: which requests hold a vehicle, when, and whether one more fits.
 *
 * Every request holds vehicle time, worked out from BOOKING_RULES (in the
 * shared schema, so the form and the API agree):
 *   tour            its whole date (Cape Town time)
 *   package         its date plus one day per night
 *   transfer        the pickup time plus the type's hold (or the whole date)
 *   + a return      a second interval for the return pickup
 * A tour with flexible dates and no date holds nothing until Good Times fixes one.
 *
 * A request fits when, at every moment of each interval it holds, the
 * requests already holding a vehicle plus this one stay within the vehicles
 * of that date (BOOKING_RULES.vehicles, or the day's own count from the
 * dashboard; 0 closes the day). Only ACTIVE requests hold time: CLOSED and
 * CANCELLED release it.
 *
 * The functions on intervals are pure (epoch milliseconds, half-open
 * [start, end)); the ones at the bottom read the database.
 */
import { BOOKING_RULES, PACKAGE_SLUGS, sastEpoch, todayInSast, isValidDate } from '../enquiries/schema.mjs';
import { packageBySlug } from '../../src/data/packages.mjs';
import { ACTIVE } from '../enquiries/status.mjs';
import { query } from '../db/index.mjs';

export const DAY_MS = 24 * 3600 * 1000;

/** Midnight at the start of a Cape Town date, as epoch ms. */
export const dayStart = (iso) => sastEpoch(iso, '00:00');

/** The Cape Town date `n` days after `iso`. */
export const addDays = (iso, n) => todayInSast(dayStart(iso) + n * DAY_MS);

/** Nights a package request holds: the nights asked for, else the package's suggested or shortest length. */
function packageNights(d) {
  if (d.nights > 0) return d.nights;
  const p = packageBySlug(d.tour_slug);
  return p?.nights?.suggested || p?.nights?.min || 1;
}

/** Overlapping or touching intervals of one request become one (a same-day return must not count twice). */
export function merge(intervals) {
  const sorted = intervals.filter((i) => i && Number.isFinite(i.start) && Number.isFinite(i.end) && i.end > i.start).sort((a, b) => a.start - b.start);
  const out = [];
  for (const i of sorted) {
    const last = out[out.length - 1];
    if (last && i.start <= last.end) last.end = Math.max(last.end, i.end);
    else out.push({ ...i });
  }
  return out;
}

/**
 * The vehicle time a validated request holds (validateEnquiry() data), at most
 * two intervals: [outbound or tour, return].
 */
export function holdsFor(d) {
  if (d.enquiry_type === 'transfer') {
    const hold = BOOKING_RULES.transferHold[d.transfer_type] ?? BOOKING_RULES.transferHold.other;
    const one = (date, time) => {
      if (!isValidDate(date) || !time) return null;
      if (hold === 'day') return { start: dayStart(date), end: dayStart(date) + DAY_MS };
      const start = sastEpoch(date, time);
      return { start, end: start + hold * 60_000 };
    };
    return merge([one(d.transfer_date, d.transfer_time), d.return_trip ? one(d.return_date, d.return_time) : null]);
  }
  if (!isValidDate(d.preferred_date)) return [];
  const days = PACKAGE_SLUGS.includes(d.tour_slug) ? packageNights(d) + 1 : 1;
  return [{ start: dayStart(d.preferred_date), end: dayStart(d.preferred_date) + days * DAY_MS }];
}

/** Requests holding a vehicle at instant t. */
export const loadAt = (holds, t) => holds.reduce((n, h) => n + (h.start <= t && t < h.end ? 1 : 0), 0);

/**
 * Whether `extra` more vehicles fit throughout `interval`, given the holds
 * already there and `capacity(dateIso)` vehicles per Cape Town date. The load
 * only rises where a hold starts and the capacity only changes at midnight, so
 * checking the interval's start and those points inside it covers every moment.
 *
 * @returns {{ ok: true } | { ok: false, at: number, date: string, closed: boolean }}
 */
export function fits(holds, interval, capacity, { extra = 1 } = {}) {
  const points = new Set([interval.start]);
  for (const h of holds) if (h.start > interval.start && h.start < interval.end) points.add(h.start);
  for (let day = dayStart(todayInSast(interval.start)) + DAY_MS; day < interval.end; day += DAY_MS) points.add(day);
  for (const t of [...points].sort((a, b) => a - b)) {
    const date = todayInSast(t);
    const cap = capacity(date);
    if (loadAt(holds, t) + extra > cap) return { ok: false, at: t, date, closed: cap === 0 };
  }
  return { ok: true };
}

/**
 * Per Cape Town date of a month: `full` when a whole-day booking (a tour) no
 * longer fits, `closed` when not even a short transfer fits at any moment.
 */
export function monthView(holds, month, capacity) {
  const first = `${month}-01`;
  const full = [];
  const closed = [];
  for (let date = first; date.slice(0, 7) === month; date = addDays(date, 1)) {
    const start = dayStart(date);
    const end = start + DAY_MS;
    const cap = capacity(date);
    if (fits(holds, { start, end }, capacity).ok) continue;
    full.push(date);
    // The load is lowest at the day's start or where a hold ends.
    const points = [start, ...holds.filter((h) => h.end > start && h.end < end).map((h) => h.end)];
    if (cap === 0 || points.every((t) => loadAt(holds, t) >= cap)) closed.push(date);
  }
  return { full, closed };
}

/* ---------- database ---------- */

const NO_ID = '00000000-0000-0000-0000-000000000000';
const ACTIVE_SQL = ACTIVE.map((s) => `'${s}'`).join(',');

/** Active holds that overlap [from, to), optionally leaving one request out. */
export async function holdsBetween(from, to, { excludeId = NO_ID } = {}) {
  const { rows } = await query(
    `SELECT id, (EXTRACT(EPOCH FROM slot_start) * 1000)::float8 AS s, (EXTRACT(EPOCH FROM slot_end) * 1000)::float8 AS e
       FROM enquiries WHERE status IN (${ACTIVE_SQL}) AND slot_start < $2 AND slot_end > $1 AND id <> $3
     UNION ALL
     SELECT id, (EXTRACT(EPOCH FROM return_slot_start) * 1000)::float8, (EXTRACT(EPOCH FROM return_slot_end) * 1000)::float8
       FROM enquiries WHERE status IN (${ACTIVE_SQL}) AND return_slot_start < $2 AND return_slot_end > $1 AND id <> $3`,
    [new Date(from).toISOString(), new Date(to).toISOString(), excludeId],
  );
  // One request's own intervals never count twice against each other.
  const byId = new Map();
  for (const r of rows) byId.set(r.id, [...(byId.get(r.id) || []), { start: Number(r.s), end: Number(r.e) }]);
  return [...byId.entries()].flatMap(([id, list]) => merge(list).map((h) => ({ ...h, id })));
}

/** capacity(dateIso) for the dates in [fromIso, toIso], from the dashboard's day counts or the default. */
export async function capacityBetween(fromIso, toIso) {
  const { rows } = await query(`SELECT day::text AS day, vehicles FROM day_capacity WHERE day >= $1::date AND day <= $2::date`, [fromIso, toIso]);
  const map = new Map(rows.map((r) => [r.day, Number(r.vehicles)]));
  return (date) => (map.has(date) ? map.get(date) : BOOKING_RULES.vehicles);
}

/**
 * Check intervals against the database. `extra: 1` before a request is stored
 * (does one more fit?); `extra: 0` after (with it stored, is anything over?).
 *
 * @returns {Promise<{ ok: true } | { ok: false, index: number, at: number, date: string, closed: boolean }>}
 */
export async function checkHolds(intervals, { excludeId, extra = 1 } = {}) {
  for (const [index, interval] of intervals.entries()) {
    const holds = await holdsBetween(interval.start, interval.end, { excludeId });
    const capacity = await capacityBetween(todayInSast(interval.start), todayInSast(interval.end - 1));
    const r = fits(holds, interval, capacity, { extra });
    if (!r.ok) return { ...r, index };
  }
  return { ok: true };
}

/** Full and closed dates of one month ('YYYY-MM'). */
export async function availabilityForMonth(month) {
  const first = `${month}-01`;
  const next = addDays(first, 32).slice(0, 7) + '-01';
  const holds = await holdsBetween(dayStart(first), dayStart(next));
  const capacity = await capacityBetween(first, addDays(next, -1));
  return monthView(holds, month, capacity);
}
