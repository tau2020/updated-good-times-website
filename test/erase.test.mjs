/**
 * Erasing personal information (lib/enquiries/erase.mjs and
 * scripts/erase-personal-data.mjs): deletion requests by reference or email,
 * the retention cut-off, the cascade to the email log and history, the
 * guard on requests that still hold a vehicle, and the retention periods
 * (--retention): which requests they select, exactly, and the tool's dry run
 * and --apply.
 */
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { query, one, closeDb, post, validTour, validTransfer, key } from './helpers/env.mjs';
import { handle } from '../lib/http/app.mjs';
import { findForErasure, eraseEnquiries, maskEmail, retentionPeriods, retentionCutoffs, calendarMonthsBefore, parseNow } from '../lib/enquiries/erase.mjs';
import { setStatus, transitionStatus, setStaffNote } from '../lib/enquiries/store.mjs';
import { site } from '../src/data/site.mjs';
import { main } from '../scripts/erase-personal-data.mjs';

after(() => closeDb());

const book = async (body) => {
  const res = await handle(...post('/api/enquiries', body, { headers: { 'idempotency-key': key() } }));
  assert.equal(res.status, 201);
  return (await res.json()).reference;
};
const idOf = async (reference) => (await one('SELECT id FROM enquiries WHERE reference_number = $1', [reference]))?.id;
/** Rows left anywhere for one request. By id, not by a join, so the cascade itself is what is tested. */
const traces = async (reference, id) =>
  one(
    `SELECT (SELECT count(*)::int FROM enquiries WHERE reference_number = $1) AS enquiries,
            (SELECT count(*)::int FROM email_log WHERE enquiry_id = $2::uuid) AS emails,
            (SELECT count(*)::int FROM enquiry_events WHERE enquiry_id = $2::uuid) AS events,
            (SELECT count(*)::int FROM email_log WHERE payload::text LIKE '%' || $1 || '%') AS logged`,
    [reference, id],
  );

test('exactly one selector, in the right shape', async () => {
  await assert.rejects(findForErasure({}), /exactly one/);
  await assert.rejects(findForErasure({ reference: 'GT-ABC123', email: 'a@b.co' }), /exactly one/);
  await assert.rejects(findForErasure({ reference: 'ABC123' }), /GT-ABC234/);
  await assert.rejects(findForErasure({ email: 'nobody' }), /whole email/);
  await assert.rejects(findForErasure({ before: '1 Nov' }), /YYYY-MM-DD/);
});

test('a deletion request by reference erases the request, its emails and its history; nothing else', async () => {
  const keep = await book({ ...validTour(), email: 'keep.me@example.com' });
  const ref = await book({ ...validTour(), email: 'erase.me@example.com', special_requests: 'Erase-me marker' });
  const id = await idOf(ref);
  const rows = await findForErasure({ reference: ref.toLowerCase() });
  assert.deepEqual(rows.map((r) => r.reference_number), [ref]);
  assert.equal(rows[0].holds_vehicle, true, 'a NEW request for a future date is open');
  await assert.rejects(eraseEnquiries(rows), /still open/, 'never loses a booking by accident');
  assert.equal((await traces(ref, id)).enquiries, 1, 'nothing erased by the refused call');

  await query(`UPDATE enquiries SET status = 'CANCELLED' WHERE reference_number = $1`, [ref]);
  await query(`INSERT INTO enquiry_events (enquiry_id, actor, kind, detail) SELECT id, 'staff@test.invalid', 'status', 'Cancelled' FROM enquiries WHERE reference_number = $1`, [ref]);
  const before = await traces(ref, id);
  assert.ok(before.emails >= 2 && before.events >= 1, 'there was an email log and a history to erase');
  const cancelled = await findForErasure({ reference: ref });
  assert.equal(cancelled[0].holds_vehicle, false);
  assert.deepEqual(await eraseEnquiries(cancelled), [ref]);
  assert.deepEqual(await traces(ref, id), { enquiries: 0, emails: 0, events: 0, logged: 0 }, 'the email log’s copies of the details and the history went too');
  assert.equal((await one(`SELECT count(*)::int AS n FROM email_log WHERE payload::text LIKE '%Erase-me marker%'`)).n, 0);
  assert.equal((await traces(keep, await idOf(keep))).enquiries, 1, 'another customer’s request is untouched');
});

test('by email address: every request from that address, any case; --include-active frees the vehicle', async () => {
  const a = await book({ ...validTour(), email: 'Repeat.Guest@example.com' });
  const b = await book({ ...validTransfer(), email: 'repeat.guest@example.com' });
  const rows = await findForErasure({ email: ' REPEAT.GUEST@example.com ' });
  assert.deepEqual(new Set(rows.map((r) => r.reference_number)), new Set([a, b]));
  assert.deepEqual(new Set(await eraseEnquiries(rows, { includeActive: true })), new Set([a, b]));
  assert.equal((await findForErasure({ email: 'repeat.guest@example.com' })).length, 0);
});

test('the retention cut-off takes only requests received and served before the date', async () => {
  const old = await book({ ...validTour(), email: 'old.trip@example.com' });
  const recent = await book({ ...validTour(), email: 'recent.trip@example.com' });
  const servedLater = await book({ ...validTour(), email: 'served.later@example.com' });
  // The old request was received and served in 2024; the recent one is still to come;
  // the third was received in 2024 for a trip in 2025, after the cut-off.
  await query(`UPDATE enquiries SET created_at = '2024-01-10', slot_start = '2024-02-01T06:00:00Z', slot_end = '2024-02-01T21:59:59Z', status = 'CLOSED' WHERE reference_number = $1`, [old]);
  await query(`UPDATE enquiries SET created_at = '2024-11-10', slot_start = '2025-02-01T06:00:00Z', slot_end = '2025-02-01T21:59:59Z', status = 'CLOSED' WHERE reference_number = $1`, [servedLater]);
  const rows = await findForErasure({ before: '2025-01-01' });
  const refs = rows.map((r) => r.reference_number);
  assert.ok(refs.includes(old));
  assert.ok(!refs.includes(recent));
  assert.ok(!refs.includes(servedLater), 'a trip after the cut-off is kept, even if requested before it');
  await eraseEnquiries(rows);
  assert.equal((await traces(old, null)).enquiries, 0);
  assert.equal((await traces(recent, null)).enquiries, 1);
});

test('a confirmed booking with flexible dates is open, so the retention cut-off never erases it by accident', async () => {
  const flexible = await book({ ...validTour(), email: 'flexible.guest@example.com', preferred_date: '', dates_flexible: true, flexible_dates: 'Any week in March' });
  await query(`UPDATE enquiries SET created_at = '2024-06-01', status = 'CONFIRMED' WHERE reference_number = $1`, [flexible]);
  const row = (await findForErasure({ before: '2025-01-01' })).find((r) => r.reference_number === flexible);
  assert.ok(row, 'received before the cut-off, so the cut-off matches it');
  assert.equal(row.holds_vehicle, true, 'no slot yet, but still an open booking');
  await assert.rejects(eraseEnquiries([row]), /still open/);
});

test('the terminal shows a masked address, not the address', () => {
  assert.equal(maskEmail('amara.okafor@example.com'), 'a••••@example.com');
});

/* ---------- the retention periods (--retention) ---------- */

const DAY = 86_400_000;
const iso = (ms) => new Date(ms).toISOString();
/** "Now" for the retention tests: pinned before anything is seeded, so every boundary below is exact. */
const NOW = Date.now();
const ago = (days) => NOW - days * DAY;
const ahead = (days) => NOW + days * DAY;
const yearsAgo = (n) => calendarMonthsBefore(NOW, 12 * n);
const ONE_MONTH = calendarMonthsBefore(NOW, 1);
const FIVE_YEARS = yearsAgo(5);

/** The tool's output and exit code, run in this process against the test database. */
async function run(args) {
  const out = [];
  const err = [];
  const code = await main(args, { log: (s) => out.push(s), error: (s) => err.push(s) });
  return { code, out: out.join('\n'), err: err.join('\n') };
}

/**
 * Seed one request as it would be after its life so far: booked through the API (so it has its email log and
 * history), then given its status, history and dates. `trip` and `ret` are when the outbound (or tour) and the
 * return ended; null means no slot (flexible dates).
 */
async function seed({ tag, type = 'tour', status, updated, trip = null, ret = null, history = [] }) {
  const email = `${tag}@retention.example`;
  const body = type === 'tour' ? { ...validTour(), email, special_requests: tag } : { ...validTransfer(), email, notes: tag };
  const reference = await book(body);
  const id = await idOf(reference);
  for (const detail of history) await query(`INSERT INTO enquiry_events (enquiry_id, actor, kind, detail) VALUES ($1, 'staff@test.invalid', 'status', $2)`, [id, detail]);
  const hold = type === 'tour' ? DAY : 2 * 3600e3;
  await query(
    `UPDATE enquiries SET status = $2, created_at = $3, updated_at = $3, slot_start = $4, slot_end = $5, return_slot_start = $6, return_slot_end = $7 WHERE id = $1`,
    [id, status, iso(updated), trip === null ? null : iso(trip - hold), trip === null ? null : iso(trip), ret === null ? null : iso(ret - hold), ret === null ? null : iso(ret)],
  );
  return { tag, reference, id, email };
}

test('retention: the periods are the privacy notice’s, in Cape Town calendar months; --now is a date or a time with its offset', () => {
  assert.deepEqual(retentionPeriods(), { unconvertedMonths: 1, convertedYears: 5 }, 'the owner’s periods (8 Nov 2026)');
  assert.deepEqual(retentionPeriods(), { unconvertedMonths: site.legal.retention.unconvertedMonths, convertedYears: site.legal.retention.confirmedYears });
  assert.match(site.legal.retention.text, /one month after our last contact about it, or once the date you asked about has passed, whichever is later/);
  assert.match(site.legal.retention.text, /five years after your trip/);
  assert.throws(() => retentionPeriods({ unconvertedMonths: 1 }), /retention periods are not set/);

  const at = (s) => Date.parse(s);
  assert.equal(calendarMonthsBefore(at('2026-11-08T10:00:00+02:00'), 1), at('2026-10-08T10:00:00+02:00'));
  // A day the shorter month lacks becomes its last day.
  assert.equal(calendarMonthsBefore(at('2026-03-31T10:00:00+02:00'), 1), at('2026-02-28T10:00:00+02:00'));
  assert.equal(calendarMonthsBefore(at('2028-03-31T10:00:00+02:00'), 1), at('2028-02-29T10:00:00+02:00'));
  assert.equal(calendarMonthsBefore(at('2026-01-15T00:30:00+02:00'), 1), at('2025-12-15T00:30:00+02:00'));
  // Cape Town’s calendar, not UTC’s: 23:00 UTC on 30 March is already 31 March in Cape Town.
  assert.equal(calendarMonthsBefore(at('2026-03-30T23:00:00Z'), 1), at('2026-02-28T01:00:00+02:00'));
  // Five years: 29 February 2028 → 28 February 2023.
  assert.equal(calendarMonthsBefore(at('2028-02-29T12:00:00+02:00'), 60), at('2023-02-28T12:00:00+02:00'));
  const c = retentionCutoffs(at('2026-11-08T10:00:00+02:00'));
  assert.equal(iso(c.unconvertedBefore), '2026-10-08T08:00:00.000Z');
  assert.equal(iso(c.convertedUpTo), '2021-11-08T08:00:00.000Z');

  assert.equal(parseNow('2026-11-08'), at('2026-11-08T00:00:00+02:00'), 'a date is its midnight in Cape Town');
  assert.equal(parseNow('2026-11-08T09:00:00Z'), at('2026-11-08T09:00:00Z'));
  assert.equal(parseNow('2026-11-08T11:00+02:00'), at('2026-11-08T09:00:00Z'));
  for (const bad of ['2026-11-08T09:00', '8 Nov 2026', '2026-02-30', '2026-02-30T10:00:00Z', '', 'now']) assert.throws(() => parseNow(bad), /--now takes a date/, bad);
});

test('retention: one selector at a time, and --now only with --retention', async () => {
  await assert.rejects(findForErasure({ retention: true, email: 'a@b.co' }), /exactly one of --reference, --email, --before or --retention/);
  await assert.rejects(findForErasure({ retention: true, before: '2025-01-01' }), /exactly one/);
  await assert.rejects(findForErasure({ retention: true, reference: 'GT-ABC123' }), /exactly one/);
  await assert.rejects(findForErasure({ email: 'a@b.co', now: NOW }), /--now goes with --retention/);
  await assert.rejects(findForErasure({ retention: true, now: '2026-11-08T10:00' }), /--now takes a date/);
  for (const args of [['--retention', '--email', 'a@b.co'], ['--retention', '--before', '2025-01-01'], ['--email', 'a@b.co', '--now', '2026-11-08'], ['--retention', '--now'], ['--retention', '--now', 'tomorrow']]) {
    const r = await run(args);
    assert.equal(r.code, 1, args.join(' '));
    assert.ok(r.err, args.join(' '));
  }
});

/**
 * The requests the retention tests seed, as `[seed, expected]`: 'unconverted' or 'converted' when the rule
 * selects it at NOW, null when it must be kept.
 */
const CASES = [
  // Not converted: a month after the last contact, once the date asked about has passed, and no vehicle held.
  [{ tag: 'a-u-closed-due', status: 'CLOSED', updated: ago(40), trip: ago(35) }, 'unconverted'],
  [{ tag: 'a-u-cancelled-date-to-come', status: 'CANCELLED', updated: ago(120), trip: ahead(20) }, null], // cancelled long ago, date still to come
  [{ tag: 'a-u-recent-contact', status: 'CLOSED', updated: ago(20), trip: ago(60) }, null],
  [{ tag: 'a-u-month-exactly', status: 'CLOSED', updated: ONE_MONTH, trip: ago(90) }, null], // "more than" one month
  [{ tag: 'a-u-month-and-1ms', status: 'CLOSED', updated: ONE_MONTH - 1, trip: ago(90) }, 'unconverted'],
  [{ tag: 'a-u-trip-ends-now', status: 'CLOSED', updated: ago(90), trip: NOW }, null], // its date has not yet passed
  [{ tag: 'a-u-trip-ended-1ms', status: 'CLOSED', updated: ago(90), trip: NOW - 1 }, 'unconverted'],
  [{ tag: 'a-u-never-actioned', status: 'NEW', updated: ago(45), trip: ago(50) }, 'unconverted'], // open, but its trip is over
  [{ tag: 'a-u-open-flexible', status: 'NEW', updated: ago(400) }, null], // holds a vehicle until staff close it
  [{ tag: 'a-u-quoted-flexible', status: 'QUOTED', updated: ago(400), history: ['New → Quoted'] }, null],
  [{ tag: 'a-u-closed-flexible', status: 'CLOSED', updated: ago(40) }, 'unconverted'],
  [{ tag: 'a-u-quoted-then-closed', status: 'CLOSED', updated: ago(35), trip: ago(40), history: ['New → Quoted', 'Quoted → Closed'] }, 'unconverted'],
  [{ tag: 'a-u-return-to-come', type: 'transfer', status: 'CLOSED', updated: ago(60), trip: ago(30), ret: ahead(10) }, null], // the return is part of the date asked about
  [{ tag: 'a-u-return-passed', type: 'transfer', status: 'CLOSED', updated: ago(40), trip: ago(50), ret: ago(45) }, 'unconverted'],
  // Converted: five years after the trip (or the last activity, without a trip date).
  [{ tag: 'a-c-confirmed-recent', status: 'CONFIRMED', updated: ago(60), trip: ago(60) }, null],
  [{ tag: 'a-c-confirmed-6-years', status: 'CONFIRMED', updated: yearsAgo(6), trip: yearsAgo(6) }, 'converted'],
  [{ tag: 'a-c-five-years-exactly', status: 'CONFIRMED', updated: yearsAgo(6), trip: FIVE_YEARS }, 'converted'],
  [{ tag: 'a-c-five-years-less-1ms', status: 'CONFIRMED', updated: yearsAgo(6), trip: FIVE_YEARS + 1 }, null],
  [{ tag: 'a-c-was-confirmed-then-closed', status: 'CLOSED', updated: ago(730), trip: ago(730), history: ['Confirmed → Closed'] }, null], // a history that only shows it leaving Confirmed
  [{ tag: 'a-c-no-slot-due', status: 'CLOSED', updated: FIVE_YEARS - DAY, history: ['Contacted → Confirmed', 'Confirmed → Closed'] }, 'converted'],
  [{ tag: 'a-c-no-slot-not-due', status: 'CLOSED', updated: yearsAgo(4), history: ['Contacted → Confirmed', 'Confirmed → Closed'] }, null],
  [{ tag: 'a-c-confirmed-flexible', status: 'CONFIRMED', updated: yearsAgo(7) }, null], // an open booking: holds a vehicle
  [{ tag: 'a-c-return-later', type: 'transfer', status: 'CONFIRMED', updated: yearsAgo(6), trip: FIVE_YEARS - 10 * DAY, ret: FIVE_YEARS + 10 * DAY }, null],
];

let seeded;
/** The cases above, plus two whose history is written by the real dashboard and email-link code. Seeded once. */
function seedCases() {
  seeded ??= (async () => {
    const all = [];
    for (const [spec, expected] of CASES) all.push({ ...(await seed(spec)), expected });
    // Confirmed then cancelled from the dashboard, two years ago: a booking, kept for five years.
    const dash = await seed({ tag: 'a-c-dashboard-confirmed-cancelled', status: 'NEW', updated: NOW });
    assert.equal((await setStatus(dash.id, 'CONFIRMED', { actor: 'staff@test.invalid' })).ok, true);
    assert.equal((await setStatus(dash.id, 'CANCELLED', { actor: 'staff@test.invalid' })).ok, true);
    await query(`UPDATE enquiries SET updated_at = $2, slot_start = $3, slot_end = $2 WHERE id = $1`, [dash.id, iso(ago(730)), iso(ago(731))]);
    all.push({ ...dash, expected: null });
    // Quoted, confirmed and closed by the email links, six years ago: due.
    const links = await seed({ tag: 'a-c-links-confirmed-closed', status: 'NEW', updated: NOW });
    for (const to of ['QUOTED', 'CONFIRMED', 'CLOSED']) assert.equal((await transitionStatus(links.id, to)).ok, true, to);
    await query(`UPDATE enquiries SET updated_at = $2, slot_start = $3, slot_end = $2 WHERE id = $1`, [links.id, iso(yearsAgo(6)), iso(yearsAgo(6) - DAY)]);
    all.push({ ...links, expected: 'converted' });
    const details = async (id) => (await query(`SELECT detail FROM enquiry_events WHERE enquiry_id = $1 AND kind = 'status'`, [id])).rows.map((r) => r.detail).sort();
    assert.deepEqual(await details(dash.id), ['Confirmed → Cancelled', 'New → Confirmed'].sort(), 'the history the tool reads, as the dashboard writes it');
    assert.deepEqual(await details(links.id), ['Confirmed → Closed', 'New → Quoted', 'Quoted → Confirmed'].sort(), 'and as the email links write it');
    return all;
  })();
  return seeded;
}

test('retention: selects exactly the unconverted requests a month after the last contact once their date has passed, and the converted bookings five years after the trip', async () => {
  const all = await seedCases();
  const due = await findForErasure({ retention: true, now: NOW });
  assert.ok(due.every((r) => r.holds_vehicle === false), 'never a request that holds a vehicle');
  const byRef = new Map(due.map((r) => [r.reference_number, r]));
  for (const s of all) assert.equal(byRef.get(s.reference)?.category ?? null, s.expected, s.tag);
  const order = due.map((r) => r.category);
  assert.ok(!order.includes('converted') || order.lastIndexOf('unconverted') < order.indexOf('converted'), 'listed by category, the requests that never became bookings first');

  // The request cancelled months ago for a date still to come is selected once that date has passed...
  const cancelled = all.find((s) => s.tag === 'a-u-cancelled-date-to-come');
  const later = await findForErasure({ retention: true, now: ahead(20) + 1 });
  assert.equal(later.find((r) => r.reference_number === cancelled.reference)?.category, 'unconverted');
  // ...while a booking whose trip ended two months ago is still kept then: five years, not one month.
  const recent = all.find((s) => s.tag === 'a-c-confirmed-recent');
  assert.equal(later.find((r) => r.reference_number === recent.reference), undefined);
});

test('retention: the dry run lists each category with masked addresses and changes nothing; --apply erases exactly those, with their email log and history', async () => {
  const all = await seedCases();
  const dueRefs = (await findForErasure({ retention: true, now: NOW })).map((r) => r.reference_number);
  const count = async () => (await one('SELECT count(*)::int AS n FROM enquiries')).n;
  const before = await count();

  const dry = await run(['--retention', '--now', iso(NOW)]);
  assert.equal(dry.code, 0, dry.err);
  const split = dry.out.indexOf('\nConverted');
  const [unconvertedPart, convertedPart] = [dry.out.slice(0, split), dry.out.slice(split)];
  assert.match(unconvertedPart, /Not converted \(never Confirmed\), last activity before .+, the date asked about passed, no vehicle held: \d+/);
  assert.match(convertedPart, /^\nConverted \(Confirmed\), the trip \(or, without one, the last activity\) ended at or before .+: \d+/);
  for (const s of all) {
    if (s.expected === 'unconverted') assert.ok(unconvertedPart.includes(s.reference), s.tag);
    else if (s.expected === 'converted') assert.ok(convertedPart.includes(s.reference), s.tag);
    else assert.ok(!dry.out.includes(s.reference), `${s.tag} is not listed`);
    assert.ok(!dry.out.includes(s.email), `${s.tag}: the address is masked`);
  }
  assert.match(dry.out, /a••••@retention\.example/);
  assert.match(dry.out, /tax query or a dispute/, 'legal exceptions are left to a person');
  assert.match(dry.out, new RegExp(`${dueRefs.length} would be erased\\. Nothing changed: add --apply to erase\\.`));
  assert.equal(await count(), before, 'the dry run changed nothing');

  const toGo = all.filter((s) => s.expected);
  const toKeep = all.filter((s) => !s.expected);
  for (const s of toGo) {
    const t = await traces(s.reference, s.id);
    assert.ok(t.emails >= 2 && t.events >= 2, `${s.tag} has an email log and a history to erase`);
  }
  const applied = await run(['--retention', '--now', iso(NOW), '--apply']);
  assert.equal(applied.code, 0, applied.err);
  assert.match(applied.out, new RegExp(`Erased ${dueRefs.length}\\.`));
  for (const s of toGo) assert.deepEqual(await traces(s.reference, s.id), { enquiries: 0, emails: 0, events: 0, logged: 0 }, s.tag);
  for (const s of toKeep) {
    const t = await traces(s.reference, s.id);
    assert.equal(t.enquiries, 1, s.tag);
    assert.ok(t.emails >= 2 && t.events >= 1, `${s.tag} keeps its email log and history`);
  }
  assert.equal(await count(), before - dueRefs.length);
  assert.equal((await findForErasure({ retention: true, now: NOW })).length, 0, 'nothing left that is due');
});

test('retention: never a request that holds a vehicle, even with --include-active; one reopened or touched after it was listed is kept', async () => {
  const open = await seed({ tag: 'g-open-flexible', status: 'NEW', updated: ago(400) });
  const future = await seed({ tag: 'g-confirmed-trip-to-come', status: 'CONFIRMED', updated: ago(400), trip: ahead(30) });
  const quoted = await seed({ tag: 'g-quoted-trip-to-come', status: 'QUOTED', updated: ago(400), trip: ahead(5) });
  const closed = await seed({ tag: 'g-closed-due', status: 'CLOSED', updated: ago(40), trip: ago(40) });
  const r = await run(['--retention', '--include-active', '--apply']);
  assert.equal(r.code, 0, r.err);
  assert.match(r.out, /--include-active does not apply to --retention/);
  for (const s of [open, future, quoted]) assert.equal((await traces(s.reference, s.id)).enquiries, 1, s.tag);
  assert.equal((await traces(closed.reference, closed.id)).enquiries, 0);

  // Listed, then reopened (it holds a vehicle again) or touched by staff (its last contact is now): both kept.
  const reopened = await seed({ tag: 'g-reopened', status: 'CLOSED', updated: ago(40) });
  const touched = await seed({ tag: 'g-touched', status: 'CLOSED', updated: ago(40), trip: ago(40) });
  const confirmedLate = await seed({ tag: 'g-confirmed-after-listing', status: 'CLOSED', updated: ago(40), trip: ago(40) });
  const listed = await findForErasure({ retention: true });
  for (const s of [reopened, touched, confirmedLate]) assert.ok(listed.some((x) => x.reference_number === s.reference), `${s.tag} was listed`);
  await query(`UPDATE enquiries SET status = 'NEW' WHERE id = $1`, [reopened.id]);
  await setStaffNote(touched.id, 'The guest called back', { actor: 'staff@test.invalid' });
  await query(`UPDATE enquiries SET status = 'CONFIRMED' WHERE id = $1`, [confirmedLate.id]);
  const erased = await eraseEnquiries(listed, { includeActive: true });
  for (const s of [reopened, touched, confirmedLate]) {
    assert.ok(!erased.includes(s.reference), s.tag);
    assert.equal((await traces(s.reference, s.id)).enquiries, 1, s.tag);
  }
});

test('retention: a --now later than the clock rehearses what will be due, and is refused with --apply', async () => {
  const s = await seed({ tag: 'f-cancelled-date-to-come', status: 'CANCELLED', updated: ago(120), trip: ahead(20) });
  assert.ok(!(await run(['--retention'])).out.includes(s.reference), 'not due today: its date is still to come');
  const when = iso(ahead(21));
  const rehearsal = await run(['--retention', '--now', when]);
  assert.equal(rehearsal.code, 0, rehearsal.err);
  assert.ok(rehearsal.out.includes(s.reference), 'due once its date has passed');
  const refused = await run(['--retention', '--now', when, '--apply']);
  assert.equal(refused.code, 1);
  assert.match(refused.err, /later than the clock/);
  assert.equal((await traces(s.reference, s.id)).enquiries, 1, 'nothing erased');
});
