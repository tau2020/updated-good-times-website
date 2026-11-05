import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { query, one, closeDb, post, validTour, validTransfer, key, inDays } from './helpers/env.mjs';
import { handle } from '../lib/http/app.mjs';
import { BOOKING_RULES } from '../lib/enquiries/schema.mjs';
import { holdsFor, fits, monthView, merge, dayStart, DAY_MS } from '../lib/bookings/availability.mjs';
import { setStatus } from '../lib/enquiries/store.mjs';

after(() => closeDb());

const H = 3600 * 1000;
const send = async (body) => {
  const res = await handle(...post('/api/enquiries', body, { headers: { 'idempotency-key': key() } }));
  return { status: res.status, body: await res.json() };
};
/** The tests share dates with no other file, and put a date back to the normal vehicles (BOOKING_RULES) first. */
const normal = (date) => query('DELETE FROM day_capacity WHERE day = $1::date', [date]);
const tourOn = (date, email) => ({ ...validTour(), preferred_date: date, email, special_requests: `${email} ${Math.random()}` });
const transferAt = (date, time, email, extra = {}) => ({ ...validTransfer(), transfer_date: date, transfer_time: time, return_trip: false, email, notes: `${email} ${Math.random()}`, ...extra });

/* ---------- pure rules ---------- */

test('what a request holds: a tour its date, a package its nights plus one day, a transfer its hold, a return a second interval', () => {
  const d = '2026-12-01';
  assert.deepEqual(holdsFor({ enquiry_type: 'tour', tour_slug: 'cape-town-city-private-tour', preferred_date: d }), [{ start: dayStart(d), end: dayStart(d) + DAY_MS }]);
  assert.deepEqual(holdsFor({ enquiry_type: 'tour', tour_slug: 'custom', preferred_date: '' }), [], 'flexible with no date holds nothing');
  const pkg = holdsFor({ enquiry_type: 'tour', tour_slug: 'garden-route-private-tour', preferred_date: d, nights: 4 });
  assert.equal((pkg[0].end - pkg[0].start) / DAY_MS, 5);
  const shortest = holdsFor({ enquiry_type: 'tour', tour_slug: 'garden-route-private-tour', preferred_date: d });
  assert.equal((shortest[0].end - shortest[0].start) / DAY_MS, 3, 'no nights given: the package\'s shortest length (2 nights, 3 days) is held');
  const airport = holdsFor({ enquiry_type: 'transfer', transfer_type: 'airport-arrival', transfer_date: d, transfer_time: '14:30', return_trip: true, return_date: '2026-12-05', return_time: '09:00' });
  assert.equal(airport.length, 2);
  assert.equal(airport[0].end - airport[0].start, BOOKING_RULES.transferHold['airport-arrival'] * 60_000);
  assert.equal(new Date(airport[0].start).toISOString(), '2026-12-01T12:30:00.000Z');
  const other = BOOKING_RULES.transferHold.other * 60_000;
  const apart = holdsFor({ enquiry_type: 'transfer', transfer_type: 'other', transfer_date: d, transfer_time: '07:00', return_trip: true, return_date: d, return_time: '17:00' });
  assert.equal(apart.length, 2, 'a same-day return hours later holds the vehicle twice');
  assert.equal(apart[0].end - apart[0].start, other);
  const close = holdsFor({ enquiry_type: 'transfer', transfer_type: 'other', transfer_date: d, transfer_time: '07:00', return_trip: true, return_date: d, return_time: '08:00' });
  assert.deepEqual(close, [{ start: apart[0].start, end: apart[0].start + 60 * 60_000 + other }], 'a same-day return inside the first hold counts once');
  assert.deepEqual(merge([{ start: 0, end: 10 }, { start: 5, end: 20 }, { start: 30, end: 40 }]), [{ start: 0, end: 20 }, { start: 30, end: 40 }]);
});

test('fits: the busiest moment of the interval decides, and a closed day fits nothing', () => {
  const d = '2026-12-02';
  const day = { start: dayStart(d), end: dayStart(d) + DAY_MS };
  const two = () => 2;
  const morning = { start: dayStart(d) + 8 * H, end: dayStart(d) + 10 * H };
  const evening = { start: dayStart(d) + 18 * H, end: dayStart(d) + 20 * H };
  assert.equal(fits([morning, evening], day, two).ok, true, 'one vehicle busy at any moment: a tour fits');
  assert.equal(fits([morning, { ...morning }], day, two).ok, false, 'both vehicles busy in the morning: no tour');
  assert.equal(fits([morning, { ...morning }], evening, two).ok, true, 'but an evening transfer still fits');
  const closed = fits([], day, () => 0);
  assert.equal(closed.ok, false);
  assert.equal(closed.closed, true);
  // A package over midnight: the next day's own count applies.
  const cap = (date) => (date === '2026-12-03' ? 0 : 2);
  assert.equal(fits([], { start: day.start, end: day.end + DAY_MS }, cap).date, '2026-12-03');
});

test('monthView: full when a tour no longer fits, closed when nothing fits at any moment', () => {
  const d = '2026-12-04';
  const tour = { start: dayStart(d), end: dayStart(d) + DAY_MS };
  const transfer = { start: dayStart('2026-12-05') + 9 * H, end: dayStart('2026-12-05') + 11 * H };
  const v = monthView([tour, { ...tour }, transfer, { ...transfer }], '2026-12', (date) => (date === '2026-12-24' ? 0 : 2));
  assert.deepEqual(v.full, ['2026-12-04', '2026-12-05', '2026-12-24']);
  assert.deepEqual(v.closed, ['2026-12-04', '2026-12-24'], 'the 5th still has free hours');
});

/* ---------- through the API ---------- */

test('a third tour on a two-vehicle day is refused with 409 and the field to change; nothing is stored or emailed', async () => {
  const date = inDays(40);
  await normal(date);
  assert.equal((await send(tourOn(date, 'cap1@example.com'))).status, 201);
  assert.equal((await send(tourOn(date, 'cap2@example.com'))).status, 201);
  const before = (await one('SELECT count(*)::int AS n FROM enquiries')).n;
  const third = await send(tourOn(date, 'cap3@example.com'));
  assert.equal(third.status, 409);
  assert.equal(third.body.code, 'unavailable');
  assert.equal(third.body.field, 'preferred_date');
  assert.match(third.body.errors.preferred_date, /fully booked/);
  assert.equal((await one('SELECT count(*)::int AS n FROM enquiries')).n, before);
  assert.equal((await one(`SELECT count(*)::int AS n FROM email_log l JOIN enquiries e ON e.id = l.enquiry_id WHERE e.email = 'cap3@example.com'`)).n, 0);
  // A transfer that day is refused too (both vehicles are out all day), at its time field.
  const flexible = await send({ ...tourOn(date, 'cap5@example.com'), dates_flexible: true, flexible_dates: 'Any day that week' });
  assert.equal(flexible.status, 409);
  assert.match(flexible.body.error, /clear the date/, 'never asks to tick a box that is already ticked');
  const t = await send(transferAt(date, '15:00', 'cap4@example.com'));
  assert.equal(t.status, 409);
  assert.equal(t.body.field, 'transfer_time');
});

test('cancelling a booking frees its vehicle; reopening it is refused while the vehicles are taken', async () => {
  const date = inDays(41);
  await normal(date);
  const a = await send(tourOn(date, 'free1@example.com'));
  await send(tourOn(date, 'free2@example.com'));
  const row = await one('SELECT id FROM enquiries WHERE reference_number = $1', [a.body.reference]);
  assert.equal((await setStatus(row.id, 'CANCELLED', { actor: 'test' })).ok, true);
  assert.equal((await send(tourOn(date, 'free3@example.com'))).status, 201, 'the freed vehicle is offered again');
  const reopen = await setStatus(row.id, 'CONFIRMED', { actor: 'test' });
  assert.equal(reopen.ok, false);
  assert.equal(reopen.reason, 'unavailable');
  assert.equal((await one('SELECT status FROM enquiries WHERE id = $1', [row.id])).status, 'CANCELLED');
});

test('transfers share the vehicles by the hour; a day closed in the dashboard takes nothing', async () => {
  const date = inDays(42);
  await normal(date);
  assert.equal((await send(transferAt(date, '10:00', 'hr1@example.com'))).status, 201);
  assert.equal((await send(transferAt(date, '10:30', 'hr2@example.com'))).status, 201);
  const clash = await send(transferAt(date, '11:00', 'hr3@example.com'));
  assert.equal(clash.status, 409, 'both vehicles are out from 10:00 to 12:30');
  assert.match(clash.body.error, /Every vehicle is already booked at that time/);
  assert.equal((await send(transferAt(date, '12:30', 'hr4@example.com'))).status, 201, 'the 10:00 vehicle is back at 12:00');

  const closed = inDays(43);
  await query(`INSERT INTO day_capacity (day, vehicles) VALUES ($1::date, 0) ON CONFLICT (day) DO UPDATE SET vehicles = 0`, [closed]);
  const r = await send(tourOn(closed, 'closed@example.com'));
  assert.equal(r.status, 409);
  assert.match(r.body.error, /not taking bookings/);
});

test('racing requests for the last vehicle: never more bookings than vehicles', async () => {
  const date = inDays(44);
  await normal(date);
  const results = await Promise.all([1, 2, 3, 4, 5].map((i) => send(tourOn(date, `race${i}@example.com`))));
  const accepted = results.filter((r) => r.status === 201).length;
  // Safety, not fairness: racers may all be asked to choose again, but the vehicles are never overbooked.
  assert.ok(accepted <= BOOKING_RULES.vehicles, `accepted ${accepted}`);
  for (const r of results) assert.ok([201, 409].includes(r.status));
  const stored = (await one(`SELECT count(*)::int AS n FROM enquiries WHERE preferred_date = $1::date AND status = 'NEW'`, [date])).n;
  assert.equal(stored, accepted, 'refused racers leave nothing behind');
  // Once the race is over, the remaining vehicles are offered again.
  for (let i = accepted; i < BOOKING_RULES.vehicles; i++) assert.equal((await send(tourOn(date, `after${i}@example.com`))).status, 201);
  assert.equal((await send(tourOn(date, 'after-full@example.com'))).status, 409);
});

test('GET /api/availability lists the month’s full and closed dates; POST checks one request without storing it', async () => {
  const date = inDays(45);
  await normal(date);
  await send(tourOn(date, 'month1@example.com'));
  await send(tourOn(date, 'month2@example.com'));
  const month = date.slice(0, 7);
  const res = await handle(new Request(`http://test.local/api/availability?month=${month}`, { headers: { 'x-forwarded-for': '198.51.100.7' } }));
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(body.full.includes(date), JSON.stringify(body));
  assert.ok(body.closed.includes(date));
  assert.match(body.earliest, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(JSON.stringify(body).includes('month1@example.com'), false, 'no personal data');

  assert.equal((await handle(new Request('http://test.local/api/availability?month=1999-01'))).status, 400);

  const before = (await one('SELECT count(*)::int AS n FROM enquiries')).n;
  const check = async (b) => (await handle(...post('/api/availability', b))).json();
  const full = await check(tourOn(date, 'check@example.com'));
  assert.equal(full.available, false);
  assert.equal(full.field, 'preferred_date');
  assert.equal((await check(tourOn(inDays(46), 'check@example.com'))).available, true);
  assert.equal((await one('SELECT count(*)::int AS n FROM enquiries')).n, before, 'a check stores nothing');
});

test('a request stored but never announced (the first attempt failed before emailing) is announced when the visitor resends it', async () => {
  const k = key();
  const body = tourOn(inDays(47), 'unannounced@example.com');
  const [request, ctx] = post('/api/enquiries', body, { headers: { 'idempotency-key': k } });
  const first = await handle(request, { ...ctx, skipNotify: true });
  assert.equal(first.status, 201);
  const { reference } = await first.json();
  const emails = async () => (await one('SELECT count(*)::int AS n FROM email_log l JOIN enquiries e ON e.id = l.enquiry_id WHERE e.reference_number = $1', [reference])).n;
  assert.equal(await emails(), 0);
  const again = await handle(...post('/api/enquiries', body, { headers: { 'idempotency-key': k } }));
  assert.equal(again.status, 409);
  assert.equal((await again.json()).reference, reference);
  assert.equal(await emails(), 2, 'team notification and acknowledgement sent on the retry');
  await handle(...post('/api/enquiries', body, { headers: { 'idempotency-key': k } }));
  assert.equal(await emails(), 2, 'and only once');
});
