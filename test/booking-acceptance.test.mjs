/**
 * Acceptance matrix for the owner's booking rules (approved 8 Nov 2026: BOOKING_RULES in
 * src/assets/js/enquiry-schema.js, lib/bookings/availability.mjs, lib/enquiries/store.mjs). One test per item,
 * each on the real store and availability code against the in-process PGlite database (test/helpers/env.mjs),
 * mostly through the HTTP handler the form posts to:
 *
 *    1  two overlapping bookings fit the default two vehicles; the third is refused
 *    2  Closed and Cancelled release the vehicle; reopening is checked again
 *    3  a day set to 0 vehicles takes nothing that day
 *    4  a day set to 1 vehicle takes one; removing the count restores two
 *    5  flexible dates with no date: stored, holding nothing
 *    6  a Garden Route package holds its nights plus one day
 *    7  an airport transfer holds 2 hours, to the minute
 *    8  any other transfer holds 3 hours, to the minute
 *    9  a return holds its own interval; each leg is checked
 *   10  48 hours' notice and pickups from 04:00 to 23:00, at their boundaries
 *   11  simultaneous requests for the last vehicle never overbook it
 *   12  the same `now` gives the same answers whatever the process time zone
 *   and  the visitor-facing messages: "48 hours’ notice", and no promise of a confirmed booking
 *
 * Each test uses its own dates, far enough ahead for the notice, and puts them back to the normal vehicles first
 * (the helpers give every date 50, so other test files never meet the limit by accident).
 */
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { query, one, closeDb, post, validTour, validTransfer, key, inDays, OUTBOX, decodeEml } from './helpers/env.mjs';
import { handle } from '../lib/http/app.mjs';
import * as schema from '../lib/enquiries/schema.mjs';
import * as availability from '../lib/bookings/availability.mjs';
import { createEnquiry, setStatus, transitionStatus, setDayCapacity, dedupeContent, UnavailableError } from '../lib/enquiries/store.mjs';
import { dedupeHash } from '../lib/security/hash.mjs';
import { formatDayDate } from '../lib/email/layout.mjs';

const { BOOKING_RULES, validateEnquiry, earliestDate, todayInSast, sastEpoch } = schema;
const { holdsFor, dayStart, addDays, DAY_MS } = availability;

after(() => closeDb());

const STAFF = { actor: 'staff@test.invalid' };
/** The statuses that hold a vehicle, written out here (the approved rule) rather than imported. */
const HOLDING = ['NEW', 'CONTACTED', 'QUOTED', 'CONFIRMED'];
const TOUR_NOTICE = (first) => `Tours need 48 hours’ notice. Choose ${first} or later.`;
const TRANSFER_NOTICE = 'Transfers need 48 hours’ notice. Choose a pickup at least 48 hours from now.';
const PICKUP_HOURS = 'Pickups run from 04:00 to 23:00, Cape Town time.';
/** Wording that would promise a booking the team has not confirmed. */
const PROMISE = /\binstant(ly)?\b|\bimmediate(ly)?\b|\bguarantee|\b(is|are|has been|have been) confirmed\b|\byou(’|')re booked\b/i;

/* ---------- helpers ---------- */

/** Every message the API sent back in this file, checked by the last test. */
const MESSAGES = [];

async function send(body) {
  const res = await handle(...post('/api/enquiries', body, { headers: { 'idempotency-key': key() } }));
  const json = await res.json();
  MESSAGES.push(...(res.status >= 400 ? [json.error, ...Object.values(json.errors || {})] : [JSON.stringify(json)]));
  return { status: res.status, body: json };
}

const accepted = (r, what = 'accepted') => assert.equal(r.status, 201, `${what}: ${JSON.stringify(r.body)}`);
/** A 409 from the availability check, pointing at `field`, its message matching `message`. */
function refused(r, field, message) {
  assert.equal(r.status, 409, JSON.stringify(r.body));
  assert.equal(r.body.code, 'unavailable');
  assert.equal(r.body.field, field);
  assert.equal(r.body.errors[field], r.body.error);
  assert.match(r.body.error, message);
}

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const day = (iso) => esc(formatDayDate(iso)); // 'Monday 7 December 2026'
const FULL = (d) => new RegExp(`^We are fully booked on ${day(d)}\\. Choose another date`);
const NOT_TAKING = (d) => new RegExp(`^We are not taking bookings on ${day(d)}\\. Choose another date`);
const BUSY = (d, ret = false) => new RegExp(`^Every vehicle is already booked at that ${ret ? 'return ' : ''}time on ${day(d)}\\. `);
const NO_TRANSFERS = (d, ret = false) => new RegExp(`^We are not taking ${ret ? 'return ' : ''}transfers on ${day(d)}\\. `);

let seq = 0;
const unique = (what) => `${what}-${++seq}@acceptance.example`;
const tourOn = (date, extra = {}) => {
  const email = unique('tour');
  return { ...validTour(), preferred_date: date, email, special_requests: email, ...extra };
};
const packageFrom = (date, nights) => tourOn(date, { tour_slug: 'garden-route-private-tour', nights });
/** An airport arrival (the helpers' transfer) with no return, unless `extra` says otherwise. */
const airport = (date, time, extra = {}) => {
  const email = unique('transfer');
  return { ...validTransfer(), transfer_date: date, transfer_time: time, return_trip: false, email, notes: email, ...extra };
};
const departure = (date, time) => airport(date, time, { transfer_type: 'airport-departure', flight_number: '' });
const otherTransfer = (date, time) => airport(date, time, { transfer_type: 'other' });
const withReturn = (date, time, returnDate, returnTime) => airport(date, time, { return_trip: true, return_date: returnDate, return_time: returnTime });

/** Back to the normal vehicles (no count set in the dashboard). */
const normal = (...dates) => Promise.all(dates.map((d) => setDayCapacity(d, null, STAFF)));
const count = async () => (await one('SELECT count(*)::int AS n FROM enquiries')).n;
const idOf = async (reference) => (await one('SELECT id FROM enquiries WHERE reference_number = $1', [reference])).id;
const statusOf = async (reference) => (await one('SELECT status FROM enquiries WHERE reference_number = $1', [reference]))?.status;

/**
 * The most vehicles the stored active requests have out at any instant of a Cape Town date, counted from the rows
 * themselves (each request once, whatever its intervals). The load only rises where a hold starts, so the day's
 * start and every start inside it cover every instant.
 */
async function peakOn(date) {
  const start = dayStart(date);
  const end = start + DAY_MS;
  const { rows } = await query(`SELECT slot_start, slot_end, return_slot_start, return_slot_end FROM enquiries WHERE status = ANY($1::text[]) AND slot_start IS NOT NULL`, [HOLDING]);
  const requests = rows.map((r) =>
    [
      [r.slot_start, r.slot_end],
      [r.return_slot_start, r.return_slot_end],
    ]
      .filter(([a, b]) => a && b)
      .map(([a, b]) => [new Date(a).getTime(), new Date(b).getTime()]),
  );
  const moments = new Set([start]);
  for (const list of requests) for (const [s] of list) if (s > start && s < end) moments.add(s);
  let peak = { load: 0, at: start };
  for (const t of moments) {
    const load = requests.filter((list) => list.some(([s, e]) => s <= t && t < e)).length;
    if (load > peak.load) peak = { load, at: t };
  }
  return peak;
}
const vehiclesOn = async (date) => (await one('SELECT vehicles FROM day_capacity WHERE day = $1::date', [date]))?.vehicles ?? BOOKING_RULES.vehicles;
/** The stored active holds never exceed a date's vehicles at any instant. */
async function neverOverbooked(...dates) {
  for (const date of dates) {
    const [peak, vehicles] = [await peakOn(date), await vehiclesOn(date)];
    assert.ok(peak.load <= vehicles, `${date}: ${peak.load} vehicles out at ${new Date(peak.at).toISOString()}, ${vehicles} available`);
  }
}
/** Active requests whose (first) hold starts on a date. */
const activeOn = async (date) =>
  (await one(`SELECT count(*)::int AS n FROM enquiries WHERE status = ANY($1::text[]) AND slot_start >= $2 AND slot_start < $3`, [HOLDING, new Date(dayStart(date)).toISOString(), new Date(dayStart(date) + DAY_MS).toISOString()])).n;

/* ---------- the matrix ---------- */

test('1 · two overlapping bookings fit the default two vehicles; the third is refused, nothing stored', async () => {
  assert.equal(BOOKING_RULES.vehicles, 2);
  const date = inDays(100);
  await normal(date);
  accepted(await send(tourOn(date)), 'a tour holds its whole date');
  accepted(await send(airport(date, '10:00')), 'an airport transfer the same morning: the second vehicle');
  const before = await count();
  refused(await send(tourOn(date)), 'preferred_date', FULL(date));
  refused(await send(otherTransfer(date, '11:00')), 'transfer_time', BUSY(date));
  assert.equal(await count(), before, 'the refused requests leave nothing behind');
  await neverOverbooked(date);
});

test('2 · Closed and Cancelled release the vehicle, so a refused request then fits; reopening is checked again', async () => {
  const date = inDays(110);
  await normal(date);
  const a = await send(tourOn(date));
  const b = await send(tourOn(date));
  accepted(a);
  accepted(b);
  const waiting = tourOn(date);
  refused(await send(waiting), 'preferred_date', FULL(date));

  // Closed (here by the team's email link) releases A's vehicle: the same request now fits.
  const idA = await idOf(a.body.reference);
  assert.equal((await transitionStatus(idA, 'CLOSED')).ok, true);
  const w = await send(waiting);
  accepted(w, 'refused while A held its vehicle, it fits once A is Closed');
  // Reopening A is checked like a new request, and refused while both vehicles are out; a link cannot reopen at all.
  const reopen = await setStatus(idA, 'CONFIRMED', STAFF);
  assert.equal(reopen.ok, false);
  assert.equal(reopen.reason, 'unavailable');
  assert.match(reopen.message, /vehicles are taken/);
  assert.equal((await transitionStatus(idA, 'CONFIRMED')).reason, 'terminal');
  assert.equal(await statusOf(a.body.reference), 'CLOSED');

  // Cancelled (from the dashboard) releases B's vehicle in the same way.
  const late = tourOn(date);
  refused(await send(late), 'preferred_date', FULL(date));
  const idB = await idOf(b.body.reference);
  assert.equal((await setStatus(idB, 'CANCELLED', STAFF)).ok, true);
  accepted(await send(late), 'it fits once B is Cancelled');
  assert.equal((await setStatus(idB, 'NEW', STAFF)).reason, 'unavailable');
  assert.equal(await statusOf(b.body.reference), 'CANCELLED');

  // With a vehicle free again, reopening succeeds, and the reopened request holds its vehicle once more.
  assert.equal((await setStatus(await idOf(w.body.reference), 'CANCELLED', STAFF)).ok, true);
  assert.equal((await setStatus(idA, 'QUOTED', STAFF)).ok, true);
  refused(await send(tourOn(date)), 'preferred_date', FULL(date));
  await neverOverbooked(date);
});

test('3 · a day closed in the dashboard (0 vehicles) takes nothing that day: tours, packages, transfers, returns', async () => {
  const closed = inDays(120);
  const [before, after] = [addDays(closed, -1), addDays(closed, 1)];
  await normal(before, after);
  await setDayCapacity(closed, 0, { note: 'Team day off', ...STAFF });
  refused(await send(tourOn(closed)), 'preferred_date', NOT_TAKING(closed));
  refused(await send(airport(closed, '04:00')), 'transfer_time', NO_TRANSFERS(closed));
  refused(await send(departure(closed, '12:00')), 'transfer_time', NO_TRANSFERS(closed));
  refused(await send(otherTransfer(closed, '23:00')), 'transfer_time', NO_TRANSFERS(closed));
  refused(await send(withReturn(before, '10:00', closed, '18:00')), 'return_time', NO_TRANSFERS(closed, true));
  refused(await send(packageFrom(before, 2)), 'preferred_date', NOT_TAKING(closed));
  // A 3-hour transfer at 23:00 the evening before would still be out after midnight.
  refused(await send(otherTransfer(before, '23:00')), 'transfer_time', NO_TRANSFERS(closed));
  // The days either side are unaffected.
  accepted(await send(airport(before, '21:00')), 'back at 23:00, before the closed day');
  accepted(await send(tourOn(after)));
  // The calendar's month view marks the day closed (and so full).
  const res = await handle(new Request(`http://test.local/api/availability?month=${closed.slice(0, 7)}`, { headers: { 'x-forwarded-for': '198.51.100.120' } }));
  const month = await res.json();
  assert.ok(month.closed.includes(closed) && month.full.includes(closed), JSON.stringify(month));
});

test('4 · a day set to 1 vehicle takes one booking and refuses the second; removing the count restores 2', async () => {
  const date = inDays(130);
  await setDayCapacity(date, 1, { note: 'One driver', ...STAFF });
  accepted(await send(tourOn(date)));
  const second = tourOn(date);
  refused(await send(second), 'preferred_date', FULL(date));
  refused(await send(airport(date, '09:00')), 'transfer_time', BUSY(date));
  await neverOverbooked(date);
  await setDayCapacity(date, null, STAFF);
  assert.equal(await one('SELECT 1 FROM day_capacity WHERE day = $1::date', [date]), null, 'no count left: the default applies');
  accepted(await send(second), 'the same request, once the day is back to two vehicles');
  refused(await send(tourOn(date)), 'preferred_date', FULL(date));
  await neverOverbooked(date);

  // One vehicle by the hour: one transfer at a time.
  const hourly = inDays(131);
  await setDayCapacity(hourly, 1, STAFF);
  accepted(await send(airport(hourly, '10:00')));
  refused(await send(airport(hourly, '11:00')), 'transfer_time', BUSY(hourly));
  accepted(await send(airport(hourly, '12:00')), 'the vehicle is back at 12:00');
  await neverOverbooked(hourly);
});

test('5 · flexible dates with no date: stored, holding nothing; a full or closed day does not matter, and no vehicle is taken', async () => {
  const full = inDays(140);
  const closed = inDays(141);
  const empty = inDays(142);
  await normal(full, empty);
  await setDayCapacity(closed, 0, STAFF);
  accepted(await send(tourOn(full)));
  accepted(await send(tourOn(full)));
  refused(await send(tourOn(full)), 'preferred_date', FULL(full));

  // More flexible requests than any day has vehicles, naming the full and the closed day in their own words.
  const refs = [];
  for (const words of [`${full} or the day after`, `Any day around ${closed}`, 'Any week in the autumn']) {
    const r = await send(tourOn('', { dates_flexible: true, flexible_dates: words }));
    accepted(r, words);
    refs.push(r.body.reference);
  }
  for (const ref of refs) {
    const row = await one('SELECT preferred_date::text AS preferred_date, dates_flexible, slot_start, slot_end, return_slot_start, return_slot_end FROM enquiries WHERE reference_number = $1', [ref]);
    assert.deepEqual(row, { preferred_date: null, dates_flexible: true, slot_start: null, slot_end: null, return_slot_start: null, return_slot_end: null });
  }
  assert.deepEqual(holdsFor(validateEnquiry(tourOn('', { dates_flexible: true })).data), []);
  // Even confirmed it holds nothing: an empty day still fits exactly two tours.
  assert.equal((await setStatus(await idOf(refs[0]), 'CONFIRMED', STAFF)).ok, true);
  accepted(await send(tourOn(empty)));
  accepted(await send(tourOn(empty)));
  refused(await send(tourOn(empty)), 'preferred_date', FULL(empty));
  await neverOverbooked(full, empty);
});

test('6 · a Garden Route package holds its nights plus one day: its last day is shared with one day tour, the day after is free', async () => {
  const start = inDays(150);
  const days = [0, 1, 2, 3, 4].map((n) => addDays(start, n));
  const [last, next] = [days[3], days[4]];
  await normal(...days);
  const pkg = await send(packageFrom(start, 3));
  accepted(pkg, '3 nights: four days');
  const row = await one('SELECT slot_start, slot_end FROM enquiries WHERE reference_number = $1', [pkg.body.reference]);
  assert.equal(new Date(row.slot_start).getTime(), dayStart(start));
  assert.equal(new Date(row.slot_end).getTime(), dayStart(next), 'held until midnight after its fourth day');

  accepted(await send(tourOn(last)), 'a day tour on its last day takes the other vehicle');
  refused(await send(tourOn(last)), 'preferred_date', FULL(last));
  refused(await send(airport(last, '22:00')), 'transfer_time', BUSY(last));
  accepted(await send(tourOn(next)), 'the day after: both vehicles free');
  accepted(await send(tourOn(next)));
  refused(await send(tourOn(next)), 'preferred_date', FULL(next));
  // A second package over the same nights is refused at the first date both vehicles are out: the last held day.
  refused(await send(packageFrom(days[1], 2)), 'preferred_date', FULL(last));
  accepted(await send(tourOn(start)), 'its first day: the package and one day tour');
  refused(await send(tourOn(start)), 'preferred_date', FULL(start));
  await neverOverbooked(...days);
});

test('7 · an airport transfer holds a vehicle for 2 hours: the next may start exactly when it ends, not a minute earlier', async () => {
  assert.equal(BOOKING_RULES.transferHold['airport-arrival'], 120);
  assert.equal(BOOKING_RULES.transferHold['airport-departure'], 120);
  const date = inDays(160);
  await normal(date);
  const first = await send(airport(date, '10:00'));
  accepted(first);
  accepted(await send(departure(date, '10:00')), 'both vehicles out from 10:00 to 12:00');
  const row = await one('SELECT slot_start, slot_end FROM enquiries WHERE reference_number = $1', [first.body.reference]);
  assert.deepEqual([new Date(row.slot_start).getTime(), new Date(row.slot_end).getTime()], [sastEpoch(date, '10:00'), sastEpoch(date, '12:00')]);
  refused(await send(airport(date, '11:59')), 'transfer_time', BUSY(date));
  accepted(await send(airport(date, '12:00')), 'starts exactly when the first two end');
  // The other edge: one ending exactly when they start fits; a minute later does not.
  accepted(await send(departure(date, '08:00')));
  refused(await send(departure(date, '08:01')), 'transfer_time', BUSY(date));
  await neverOverbooked(date);
});

test('8 · any other transfer holds a vehicle for 3 hours: the same edges', async () => {
  assert.equal(BOOKING_RULES.transferHold.other, 180);
  const date = inDays(170);
  await normal(date);
  const first = await send(otherTransfer(date, '09:00'));
  accepted(first);
  accepted(await send(otherTransfer(date, '09:00')), 'both vehicles out from 09:00 to 12:00');
  const row = await one('SELECT slot_start, slot_end FROM enquiries WHERE reference_number = $1', [first.body.reference]);
  assert.deepEqual([new Date(row.slot_start).getTime(), new Date(row.slot_end).getTime()], [sastEpoch(date, '09:00'), sastEpoch(date, '12:00')]);
  refused(await send(otherTransfer(date, '11:59')), 'transfer_time', BUSY(date));
  accepted(await send(otherTransfer(date, '12:00')), 'starts exactly when the first two end');
  accepted(await send(otherTransfer(date, '06:00')), 'ends exactly when they start');
  refused(await send(otherTransfer(date, '06:01')), 'transfer_time', BUSY(date));
  await neverOverbooked(date);
});

test('9 · a return transfer holds its own interval: each leg is checked, and a return into a full slot is refused even when the outbound fits', async () => {
  const out = inDays(180);
  const back = inDays(182);
  await normal(out, back);
  accepted(await send(airport(back, '18:00')));
  accepted(await send(airport(back, '18:00')), 'both vehicles out from 18:00 to 20:00 on the return day');
  const before = await count();
  refused(await send(withReturn(out, '10:00', back, '18:30')), 'return_time', BUSY(back, true));
  assert.equal(await count(), before, 'the outbound is not kept on its own');

  const trip = await send(withReturn(out, '10:00', back, '20:00'));
  accepted(trip, 'a return when they are back fits');
  const row = await one('SELECT slot_start, slot_end, return_slot_start, return_slot_end FROM enquiries WHERE reference_number = $1', [trip.body.reference]);
  assert.deepEqual(
    [row.slot_start, row.slot_end, row.return_slot_start, row.return_slot_end].map((t) => new Date(t).getTime()),
    [sastEpoch(out, '10:00'), sastEpoch(out, '12:00'), sastEpoch(back, '20:00'), sastEpoch(back, '22:00')],
    'two separate intervals',
  );
  // The return interval takes a vehicle of its own on the return day...
  accepted(await send(airport(back, '20:30')));
  refused(await send(airport(back, '21:00')), 'transfer_time', BUSY(back));
  // ...and the outbound is checked too: refused at its outbound time although its return would fit.
  accepted(await send(airport(out, '10:00')), 'the second vehicle that morning');
  refused(await send(withReturn(out, '11:00', back, '23:00')), 'transfer_time', BUSY(out));
  await neverOverbooked(out, back);
});

/** Runs `fn` again if Cape Town's date changed while it ran, so a test run at midnight cannot race the clock. */
async function onOneCapeTownDay(fn) {
  for (let attempt = 0; ; attempt++) {
    const today = todayInSast();
    await fn(today);
    if (todayInSast() === today || attempt === 2) return;
  }
}

test('10 · 48 hours’ notice and pickups from 04:00 to 23:00, Cape Town time, at their boundaries', async () => {
  assert.equal(BOOKING_RULES.minNoticeHours, 48);
  assert.deepEqual({ ...BOOKING_RULES.transferHours }, { first: '04:00', last: '23:00' });
  // On a pinned clock, 10:00 on Friday 16 October 2026 in Cape Town.
  const now = Date.parse('2026-10-16T10:00:00+02:00');
  const check = (body) => validateEnquiry(body, { now });
  const transfer = airport('2026-10-18', '10:00');
  assert.equal(check(transfer).ok, true, 'a pickup exactly 48 hours ahead');
  assert.equal(check({ ...transfer, transfer_time: '09:59' }).errors.transfer_time, TRANSFER_NOTICE, '47 hours 59 minutes');
  assert.equal(validateEnquiry(transfer, { now: now + 1 }).errors.transfer_time, TRANSFER_NOTICE, 'a millisecond short');
  assert.equal(check({ ...transfer, transfer_date: '2026-10-17', transfer_time: '23:00' }).errors.transfer_date, TRANSFER_NOTICE);
  assert.equal(earliestDate(now), '2026-10-18');
  assert.equal(check(tourOn('2026-10-18')).ok, true, 'a date-only tour on the Cape Town date 48 hours on');
  assert.equal(check(tourOn('2026-10-17')).errors.preferred_date, TOUR_NOTICE('2026-10-18'));
  assert.equal(earliestDate(Date.parse('2026-10-16T23:59:00+02:00')), '2026-10-18', 'still the 18th at 23:59');
  assert.equal(earliestDate(Date.parse('2026-10-16T22:00:00Z')), '2026-10-19', 'midnight in Cape Town (22:00 UTC) moves it on');

  // Through the API on the real clock: tomorrow is always too soon, the day after always offered to a tour, and
  // three days on even the first pickup of the day is fine.
  await onOneCapeTownDay(async (today) => {
    const [tomorrow, first, third] = [1, 2, 3].map((n) => addDays(today, n));
    const tour = await send(tourOn(tomorrow));
    assert.equal(tour.status, 400);
    assert.equal(tour.body.errors.preferred_date, TOUR_NOTICE(first));
    accepted(await send(tourOn(first)), 'the first date offered');
    const soon = await send(airport(tomorrow, '23:00'));
    assert.equal(soon.status, 400);
    assert.equal(soon.body.errors.transfer_date, TRANSFER_NOTICE);
    accepted(await send(airport(third, '04:00')), 'three days on, the first pickup of the day');
    // The form's live check says the same, before anything is sent.
    const live = await (await handle(...post('/api/availability', tourOn(tomorrow)))).json();
    assert.equal(live.errors.preferred_date, TOUR_NOTICE(first));
  });

  // Pickup hours, outbound and return: 03:59 and 23:01 refused, 04:00 and 23:00 accepted.
  const [d1, d2, d3] = [inDays(190), inDays(191), inDays(192)];
  for (const time of ['03:59', '23:01']) {
    const outbound = await send(airport(d1, time));
    assert.equal(outbound.status, 400, time);
    assert.equal(outbound.body.errors.transfer_time, PICKUP_HOURS);
    const ret = await send(withReturn(d1, '12:00', d2, time));
    assert.equal(ret.status, 400, time);
    assert.equal(ret.body.errors.return_time, PICKUP_HOURS);
  }
  for (const time of ['04:00', '23:00']) {
    accepted(await send(airport(d1, time)), time);
    accepted(await send(withReturn(d2, '12:00', d3, time)), `a return at ${time}`);
  }
});

test('11 · simultaneous requests for the last vehicle: at most one is kept, and the vehicles are never overbooked', async () => {
  // createEnquiry checks, stores, checks again with the new row counted and removes it if over: racers started
  // together can all be removed (the approved rule: "at worst both are asked to choose again"). A row removed
  // within its own request was never a booking (no 201, no email), so the instants checked are those of the
  // booked day once the requests have been answered.
  // Through the form's endpoint: six tours at once for the last vehicle of a day.
  const date = inDays(200);
  await normal(date);
  accepted(await send(tourOn(date)));
  const racers = await Promise.all(Array.from({ length: 6 }, () => send(tourOn(date))));
  for (const r of racers) assert.ok(r.status === 201 || (r.status === 409 && r.body.code === 'unavailable'), JSON.stringify(r.body));
  const won = racers.filter((r) => r.status === 201);
  assert.ok(won.length <= 1, `${won.length} kept for one vehicle`);
  for (const r of won) assert.equal(await statusOf(r.body.reference), 'NEW', 'a request told it was received is kept');
  assert.equal(await activeOn(date), 1 + won.length, 'the refused leave nothing behind');
  await neverOverbooked(date);
  // The vehicle is not lost in the race: if nobody kept it, it is offered again.
  if (!won.length) accepted(await send(tourOn(date)));
  refused(await send(tourOn(date)), 'preferred_date', FULL(date));

  // Straight into the store, mixed: transfers and a tour that all overlap one another, for the last vehicle of a
  // day; a round started together and rounds started a moment apart (different interleavings).
  for (const [round, stagger] of [0, 1, 3].entries()) {
    const d = inDays(201 + round);
    await normal(d);
    accepted(await send(tourOn(d)), 'the first vehicle, all day');
    const contenders = [airport(d, '10:00'), airport(d, '10:00'), departure(d, '10:00'), otherTransfer(d, '11:00'), otherTransfer(d, '11:00'), tourOn(d)].map((body) => {
      const v = validateEnquiry(body);
      assert.equal(v.ok, true, JSON.stringify(v.errors));
      return v.data;
    });
    const settled = await Promise.allSettled(
      contenders.map(async (data, k) => {
        if (stagger) await new Promise((ok) => setTimeout(ok, k * stagger));
        return createEnquiry(data, { idempotencyKey: key(), dedupeHash: dedupeHash(data.email, dedupeContent(data)) });
      }),
    );
    for (const s of settled) assert.ok(s.status === 'fulfilled' || s.reason instanceof UnavailableError, String(s.reason?.stack || s.reason));
    const kept = settled.filter((s) => s.status === 'fulfilled');
    assert.ok(kept.length <= 1, `round ${round}: ${kept.length} kept for one vehicle`);
    assert.equal(await activeOn(d), 1 + kept.length, `round ${round}: the refused leave nothing behind`);
    await neverOverbooked(d);
    if (!kept.length) accepted(await send(airport(d, '10:00')), 'the vehicle was not lost');
    refused(await send(airport(d, '10:30')), 'transfer_time', BUSY(d));
  }
});

/**
 * The time-zone-sensitive answers for fixed inputs. Self-contained (it is also run from its source in child
 * processes), so it takes the modules as an argument.
 */
async function probe({ schema, availability }) {
  const { earliestDate, todayInSast, sastEpoch, validateEnquiry } = schema;
  const { holdsFor, fits, monthView, dayStart } = availability;
  // 10:00, 23:59 and midnight in Cape Town; near UTC midnight; the daylight-saving changes of New York, Auckland and Europe.
  const nows = ['2026-10-16T08:00:00Z', '2026-10-16T21:59:00Z', '2026-10-16T22:00:00Z', '2026-10-16T23:30:00Z', '2026-10-17T00:00:00Z', '2026-03-08T06:30:00Z', '2026-11-01T05:30:00Z', '2026-04-04T13:30:00Z', '2026-09-26T14:30:00Z', '2026-03-29T00:30:00Z'];
  const earliest = Object.fromEntries(nows.map((n) => [n, earliestDate(Date.parse(n))]));
  const today = Object.fromEntries(nows.map((n) => [n, todayInSast(Date.parse(n))]));
  const requests = {
    tourOnNewYorkFallBack: { enquiry_type: 'tour', tour_slug: 'cape-peninsula-private-tour', preferred_date: '2026-11-01' },
    tourOnAucklandSpringForward: { enquiry_type: 'tour', tour_slug: 'cape-peninsula-private-tour', preferred_date: '2026-09-27' },
    packageOverNewYorkSpringForward: { enquiry_type: 'tour', tour_slug: 'garden-route-private-tour', preferred_date: '2026-03-07', nights: 3 },
    airportWithReturn: { enquiry_type: 'transfer', transfer_type: 'airport-arrival', transfer_date: '2026-11-01', transfer_time: '04:00', return_trip: true, return_date: '2026-11-01', return_time: '23:00' },
    otherOverMidnight: { enquiry_type: 'transfer', transfer_type: 'other', transfer_date: '2026-04-04', transfer_time: '23:00', return_trip: false },
  };
  const holds = Object.fromEntries(Object.entries(requests).map(([k, d]) => [k, holdsFor(d)]));
  const all = Object.values(holds).flat();
  const capacity = (date) => (date === '2026-11-02' ? 0 : 1);
  const fit = Object.fromEntries(Object.entries(holds).map(([k, h]) => [k, h.map((i) => fits(all, i, capacity))]));
  const months = Object.fromEntries(['2026-03', '2026-04', '2026-09', '2026-11'].map((m) => [m, monthView(all, m, capacity)]));
  const at = Date.parse('2026-11-01T05:30:00Z'); // 07:30 in Cape Town; 01:30, the hour New York lives twice
  const transfer = { enquiry_type: 'transfer', transfer_type: 'airport-departure', pickup_location: 'Sea Point', destination: 'Cape Town International Airport (CPT)', adults: 1, name: 'Ann Lee', email: 'ann@example.com', consent: true, terms: true };
  const verdict = (body) => {
    const r = validateEnquiry(body, { now: at });
    return { ok: r.ok, errors: r.errors };
  };
  const checks = {
    pickupExactly48h: verdict({ ...transfer, transfer_date: '2026-11-03', transfer_time: '07:30' }),
    pickup47h59: verdict({ ...transfer, transfer_date: '2026-11-03', transfer_time: '07:29' }),
    tourFirstDate: verdict({ ...transfer, enquiry_type: 'tour', tour_slug: 'custom', preferred_date: '2026-11-03', pickup_area: 'Sea Point' }),
    tourDayBefore: verdict({ ...transfer, enquiry_type: 'tour', tour_slug: 'custom', preferred_date: '2026-11-02', pickup_area: 'Sea Point' }),
  };
  return { earliest, today, midnight: dayStart('2026-11-01'), pickup: sastEpoch('2026-03-08', '04:00'), holds, fit, months, checks };
}

test('12 · the same `now` gives the same first dates, holds and checks whatever the process time zone (UTC, Johannesburg, New York, Auckland)', async () => {
  const url = (rel) => pathToFileURL(fileURLToPath(new URL(rel, import.meta.url))).href;
  const script = `
    const schema = await import(${JSON.stringify(url('../lib/enquiries/schema.mjs'))});
    const availability = await import(${JSON.stringify(url('../lib/bookings/availability.mjs'))});
    const probe = ${probe.toString()};
    const january = new Date(Date.UTC(2026, 0, 15, 12)).getTimezoneOffset();
    console.log(JSON.stringify({ zone: Intl.DateTimeFormat().resolvedOptions().timeZone, january, results: await probe({ schema, availability }) }));
  `;
  const zones = ['UTC', 'Africa/Johannesburg', 'America/New_York', 'Pacific/Auckland'];
  const run = promisify(execFile);
  const outputs = await Promise.all(zones.map(async (TZ) => JSON.parse((await run(process.execPath, ['--input-type=module', '-e', script], { env: { ...process.env, TZ } })).stdout)));
  // Each process really ran in its own zone (minutes behind UTC in January)...
  assert.deepEqual(outputs.map((o) => o.january), [0, -120, 300, -780]);
  // ...and every one gave the same answers as this process...
  const here = JSON.parse(JSON.stringify(await probe({ schema, availability })));
  for (const [i, o] of outputs.entries()) assert.deepEqual(o.results, here, zones[i]);
  // ...which are the right ones.
  const r = outputs[0].results;
  assert.equal(r.earliest['2026-10-16T08:00:00Z'], '2026-10-18');
  assert.equal(r.earliest['2026-10-16T21:59:00Z'], '2026-10-18');
  assert.equal(r.earliest['2026-10-16T22:00:00Z'], '2026-10-19');
  assert.equal(r.earliest['2026-10-16T23:30:00Z'], '2026-10-19');
  assert.equal(r.today['2026-10-16T23:30:00Z'], '2026-10-17');
  assert.equal(r.midnight, Date.parse('2026-10-31T22:00:00Z'));
  assert.deepEqual(r.holds.tourOnNewYorkFallBack, [{ start: Date.parse('2026-10-31T22:00:00Z'), end: Date.parse('2026-11-01T22:00:00Z') }], 'a whole 24-hour Cape Town day, even on New York’s 25-hour one');
  assert.deepEqual(r.holds.packageOverNewYorkSpringForward, [{ start: Date.parse('2026-03-06T22:00:00Z'), end: Date.parse('2026-03-10T22:00:00Z') }]);
  assert.deepEqual(r.holds.airportWithReturn, [
    { start: Date.parse('2026-11-01T02:00:00Z'), end: Date.parse('2026-11-01T04:00:00Z') },
    { start: Date.parse('2026-11-01T21:00:00Z'), end: Date.parse('2026-11-01T23:00:00Z') },
  ]);
  assert.deepEqual(r.holds.otherOverMidnight, [{ start: Date.parse('2026-04-04T21:00:00Z'), end: Date.parse('2026-04-05T00:00:00Z') }]);
  assert.equal(r.checks.pickupExactly48h.ok, true);
  assert.deepEqual(r.checks.pickup47h59.errors, { transfer_time: TRANSFER_NOTICE });
  assert.equal(r.checks.tourFirstDate.ok, true);
  assert.deepEqual(r.checks.tourDayBefore.errors, { preferred_date: TOUR_NOTICE('2026-11-03') });
});

test('the visitor-facing messages say “48 hours’ notice” and never promise a confirmed booking', async () => {
  const now = Date.parse('2026-10-16T10:00:00+02:00');
  const notices = [validateEnquiry(tourOn('2026-10-17'), { now }).errors.preferred_date, validateEnquiry(airport('2026-10-17', '12:00'), { now }).errors.transfer_date];
  assert.deepEqual(notices, [TOUR_NOTICE('2026-10-18'), TRANSFER_NOTICE]);
  for (const m of notices) assert.doesNotMatch(m, /24 hours/);

  // Every answer the API gave in this file (refusals, notices, the 201s), with one of each kind from here.
  const [date, closed] = [inDays(210), inDays(211)];
  await normal(date);
  await setDayCapacity(closed, 0, STAFF);
  const r = await send(tourOn(date));
  accepted(r);
  accepted(await send(tourOn(date)));
  refused(await send(tourOn(date)), 'preferred_date', FULL(date));
  refused(await send(airport(date, '09:00')), 'transfer_time', BUSY(date));
  refused(await send(tourOn(closed)), 'preferred_date', NOT_TAKING(closed));
  refused(await send(withReturn(inDays(209), '09:00', closed, '09:00')), 'return_time', NO_TRANSFERS(closed, true));
  assert.equal((await send(tourOn(addDays(todayInSast(), 1)))).status, 400);
  assert.equal((await send(airport(addDays(todayInSast(), 1), '12:00'))).status, 400);
  assert.equal((await send(airport(inDays(212), '23:30'))).status, 400);
  assert.ok(MESSAGES.length >= 16, `${MESSAGES.length} messages seen`);
  for (const m of MESSAGES) assert.doesNotMatch(m, PROMISE, m);
  assert.ok(MESSAGES.includes(TRANSFER_NOTICE));
  assert.ok(MESSAGES.some((m) => /^Tours need 48 hours’ notice\. Choose \d{4}-\d{2}-\d{2} or later\.$/.test(m)));
  assert.ok(!MESSAGES.some((m) => /24 hours/.test(m)));

  // The visitor's acknowledgement says plainly that nothing is booked yet.
  const email = (await one('SELECT email FROM enquiries WHERE reference_number = $1', [r.body.reference])).email;
  const ack = readdirSync(OUTBOX)
    .filter((f) => f.endsWith('.eml'))
    .map((f) => readFileSync(join(OUTBOX, f), 'utf8'))
    .find((m) => new RegExp(`^To: ${esc(email)}\\r?$`, 'm').test(m)); // not the team's copy, whose Reply-To is the visitor
  assert.ok(ack, 'the acknowledgement was sent');
  const [text] = decodeEml(ack);
  assert.match(text, /This is not yet a confirmed booking\./);
  assert.doesNotMatch(text, PROMISE);
});
