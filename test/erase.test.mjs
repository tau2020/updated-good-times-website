/**
 * Erasing personal information (lib/enquiries/erase.mjs and
 * scripts/erase-personal-data.mjs): deletion requests by reference or email,
 * the retention cut-off, the cascade to the email log and history, and the
 * guard on requests that still hold a vehicle.
 */
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { query, one, closeDb, post, validTour, validTransfer, key } from './helpers/env.mjs';
import { handle } from '../lib/http/app.mjs';
import { findForErasure, eraseEnquiries, maskEmail } from '../lib/enquiries/erase.mjs';

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
  await assert.rejects(findForErasure({ reference: 'ABC123' }), /GT-ABC123/);
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
