import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { query, one, closeDb, post, validTour, validTransfer, key, inDays } from './helpers/env.mjs';
import { handle } from '../lib/http/app.mjs';
import { getEnquiryByReference } from '../lib/enquiries/store.mjs';
import { resetConfig } from '../lib/config.mjs';

after(() => closeDb());

const send = async (body, opts) => {
  const res = await handle(...post('/api/enquiries', body, opts));
  return { status: res.status, headers: res.headers, body: await res.json() };
};
const count = async () => (await one('SELECT count(*)::int AS n FROM enquiries')).n;

test('tour enquiry → 201 with a GT- reference; the row holds the tour fields and NEW status', async () => {
  const r = await send({ ...validTour(), email: 'tour@example.com' }, { headers: { 'idempotency-key': key() } });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.match(r.body.reference, /^GT-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/);
  assert.equal(r.body.enquiry_type, 'tour');
  assert.equal(r.body.emailed, true);
  assert.equal(r.body.email, undefined, 'no personal data echoed back');
  const row = await getEnquiryByReference(r.body.reference);
  assert.equal(row.status, 'NEW');
  assert.equal(row.enquiry_type, 'tour');
  assert.equal(row.tour_slug, 'cape-peninsula-private-tour');
  assert.equal(row.preferred_date, inDays(30));
  assert.equal(row.dates_flexible, false);
  assert.equal(row.adults, 2);
  assert.equal(row.children, 1);
  assert.equal(row.travellers, 3);
  assert.equal(row.children_ages, '6');
  assert.equal(row.pickup_area, 'Hotel in Sea Point');
  assert.equal(row.special_requirements, 'A relaxed pace, please.');
  assert.equal(row.preferred_contact_method, 'email');
  assert.equal(row.country, 'United Kingdom');
  assert.ok(row.consent_at, 'consent time recorded');
  assert.equal(row.transfer_type, '');
  assert.equal(row.pickup_at, null);
  assert.equal(row.ip_hash.length, 32);
  assert.equal(row.user_agent, 'node-test');
  assert.equal(row.page_url, 'http://test.local/enquire/?type=tour');
});

test('transfer request → 201; pickup stored as an instant plus the SAST date and time as entered', async () => {
  const body = { ...validTransfer(), email: 'transfer@example.com' };
  const r = await send(body, { headers: { 'idempotency-key': key() } });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.match(r.body.reference, /^GT-/);
  assert.equal(r.body.enquiry_type, 'transfer');
  const row = await getEnquiryByReference(r.body.reference);
  assert.equal(row.enquiry_type, 'transfer');
  assert.equal(row.transfer_type, 'airport-arrival');
  assert.equal(row.pickup_location, 'Cape Town International Airport (CPT)');
  assert.equal(row.destination, 'Camps Bay, Victoria Road');
  assert.equal(row.pickup_date_sast, body.transfer_date);
  assert.equal(row.pickup_time_sast, '14:30');
  assert.equal(new Date(row.pickup_at).toISOString(), new Date(`${body.transfer_date}T12:30:00Z`).toISOString());
  assert.equal(row.return_trip, true);
  assert.equal(row.return_date_sast, body.return_date);
  assert.equal(row.return_time_sast, '09:00');
  assert.equal(new Date(row.return_at).toISOString(), new Date(`${body.return_date}T07:00:00Z`).toISOString());
  assert.equal(row.flight_number, 'BA 59');
  assert.equal(row.suitcases, 3);
  assert.equal(row.oversized_items, '1 golf bag');
  assert.equal(row.child_seats, 'age 4');
  assert.equal(row.special_requirements, 'Please wait at arrivals.');
  assert.equal(row.preferred_contact_method, 'whatsapp');
  assert.equal(row.tour_slug, '');
  assert.equal(row.preferred_date, null);
});

test('400 with field-level errors: tour without pickup or consent', async () => {
  const r = await send({ ...validTour(), pickup_area: '', consent: false }, { headers: { 'idempotency-key': key() } });
  assert.equal(r.status, 400);
  assert.ok(r.body.errors.pickup_area);
  assert.ok(r.body.errors.consent);
});

test('400: airport arrival without a flight number, past date, return before outbound, phone for WhatsApp', async () => {
  const r = await send({ ...validTransfer(), flight_number: '', transfer_date: inDays(-1), phone: '' }, { headers: { 'idempotency-key': key() } });
  assert.equal(r.status, 400);
  assert.ok(r.body.errors.flight_number);
  assert.ok(r.body.errors.transfer_date);
  assert.ok(r.body.errors.phone);
  const ret = await send({ ...validTransfer(), return_date: inDays(19) }, { headers: { 'idempotency-key': key() } });
  assert.equal(ret.status, 400);
  assert.ok(ret.body.errors.return_date);
});

test('400: invalid tour slug, transfer type or enquiry type', async () => {
  assert.ok((await send({ ...validTour(), tour_slug: 'not-a-tour' }, { headers: { 'idempotency-key': key() } })).body.errors.tour_slug);
  assert.ok((await send({ ...validTransfer(), transfer_type: 'limo' }, { headers: { 'idempotency-key': key() } })).body.errors.transfer_type);
  assert.ok((await send({ ...validTour(), enquiry_type: 'booking' }, { headers: { 'idempotency-key': key() } })).body.errors.enquiry_type);
});

test('409: a repeated idempotency key returns the existing reference and stores nothing new', async () => {
  const k = key();
  const first = await send({ ...validTour(), email: 'idem@example.com' }, { headers: { 'idempotency-key': k } });
  assert.equal(first.status, 201);
  const before = await count();
  const again = await send({ ...validTour(), email: 'idem@example.com', special_requests: 'Changed my mind about something.' }, { headers: { 'idempotency-key': k } });
  assert.equal(again.status, 409);
  assert.equal(again.body.code, 'duplicate_submission');
  assert.equal(again.body.reference, first.body.reference);
  assert.equal(await count(), before);
});

test('409: the same request from the same person within 10 minutes; a different request is fine', async () => {
  const body = { ...validTransfer(), email: 'dupe@example.com' };
  assert.equal((await send(body, { headers: { 'idempotency-key': key() } })).status, 201);
  const r = await send(body, { headers: { 'idempotency-key': key() } });
  assert.equal(r.status, 409);
  assert.equal(r.body.code, 'duplicate_content');
  assert.match(r.body.reference, /^GT-/);
  const other = await send({ ...body, transfer_time: '16:00' }, { headers: { 'idempotency-key': key() } });
  assert.equal(other.status, 201);
});

test('honeypot filled → 200 decoy without a reference; nothing stored', async () => {
  const before = await count();
  const r = await send({ ...validTour(), email: 'bot@example.com', gt_hp_check: 'http://spam.example' }, { headers: { 'idempotency-key': key() } });
  assert.equal(r.status, 200);
  assert.equal(r.body.ok, true);
  assert.equal(r.body.reference, undefined);
  assert.equal(await count(), before);
  // The old, autofill-prone field name is no longer the honeypot.
  const legacy = await send({ ...validTour(), email: 'autofill@example.com', website: 'https://my-homepage.example' }, { headers: { 'idempotency-key': key() } });
  assert.equal(legacy.status, 201);
});

test('completed in under 3 seconds by the browser’s own monotonic clock → the same silent 200; nothing stored', async () => {
  const before = await count();
  const fast = await send({ ...validTour(), email: 'fast@example.com', elapsed_ms: 500 }, { headers: { 'idempotency-key': key() } });
  assert.equal(fast.status, 200);
  assert.equal(fast.body.reference, undefined);
  const zero = await send({ ...validTransfer(), email: 'fast2@example.com', elapsed_ms: '0' }, { headers: { 'idempotency-key': key() } });
  assert.equal(zero.status, 200);
  assert.equal(await count(), before);
});

test('time on form is not judged by the device clock: a clock 2 hours ahead (or behind) still submits', async () => {
  const ahead = await send({ ...validTour(), email: 'clock-ahead@example.com', started_at: Date.now() + 2 * 3600e3, elapsed_ms: 45_000 }, { headers: { 'idempotency-key': key() } });
  assert.equal(ahead.status, 201, JSON.stringify(ahead.body));
  const behind = await send({ ...validTour(), email: 'clock-behind@example.com', started_at: Date.now() - 2 * 3600e3, elapsed_ms: 45_000 }, { headers: { 'idempotency-key': key() } });
  assert.equal(behind.status, 201);
});

test('a missing or malformed elapsed_ms is "unknown", never "too fast"', async () => {
  for (const [i, elapsed] of [undefined, null, '', -5, 'soon', 1.5, Number.NaN].entries()) {
    const body = { ...validTour(), email: `elapsed-${i}@example.com` };
    if (elapsed === undefined) delete body.elapsed_ms;
    else body.elapsed_ms = elapsed;
    const r = await send(body, { headers: { 'idempotency-key': key() } });
    assert.equal(r.status, 201, `elapsed_ms=${String(elapsed)}: ${JSON.stringify(r.body)}`);
  }
});

test('fields that do not apply are ignored, not rejected, and stored blank', async () => {
  const transfer = await send(
    { ...validTransfer(), email: 'ignore-transfer@example.com', transfer_type: 'other', flight_number: 'not a flight', return_trip: false, return_date: '2001-01-01', return_time: 'later', children: 0, child_seats: 'x'.repeat(500) },
    { headers: { 'idempotency-key': key() } },
  );
  assert.equal(transfer.status, 201, JSON.stringify(transfer.body));
  const t = await getEnquiryByReference(transfer.body.reference);
  assert.equal(t.flight_number, '');
  assert.equal(t.return_trip, false);
  assert.equal(t.return_date_sast, '');
  assert.equal(t.return_at, null);
  assert.equal(t.child_seats, '');
  const tour = await send(
    { ...validTour(), email: 'ignore-tour@example.com', dates_flexible: false, flexible_dates: 'y'.repeat(5000), children: 0, children_ages: 'z'.repeat(500), transfer_type: 'helicopter', destination: 'Mars' },
    { headers: { 'idempotency-key': key() } },
  );
  assert.equal(tour.status, 201, JSON.stringify(tour.body));
  const r = await getEnquiryByReference(tour.body.reference);
  assert.equal(r.flexible_dates, '');
  assert.equal(r.children_ages, '');
  assert.equal(r.transfer_type, '');
  assert.equal(r.destination, '');
});

test('429 on the 11th request in a minute from one IP, with Retry-After; other IPs unaffected', async () => {
  const ip = '198.51.100.42';
  for (let i = 0; i < 10; i++) {
    const r = await send({ ...validTour(), email: `rl${i}@example.com` }, { ip, headers: { 'idempotency-key': key() } });
    assert.equal(r.status, 201, `request ${i + 1}: ${JSON.stringify(r.body)}`);
  }
  const eleventh = await send({ ...validTour(), email: 'rl10@example.com' }, { ip, headers: { 'idempotency-key': key() } });
  assert.equal(eleventh.status, 429);
  assert.ok(Number(eleventh.headers.get('retry-after')) >= 1);
  const other = await send({ ...validTour(), email: 'other@example.com' }, { ip: '198.51.100.43', headers: { 'idempotency-key': key() } });
  assert.equal(other.status, 201);
});

test('503 when the enquiry system is disabled, and when the deployment is in preview mode', async () => {
  const before = await count();
  try {
    process.env.ENQUIRY_SYSTEM_ENABLED = 'false';
    resetConfig();
    const off = await send(validTour(), { headers: { 'idempotency-key': key() } });
    assert.equal(off.status, 503);
    assert.equal(off.body.code, 'disabled');
    const h = await (await handle(new Request('http://test.local/api/health'))).json();
    assert.equal(h.enquiries, 'disabled');

    for (const off of ['0', 'no', 'OFF', 'False']) {
      process.env.ENQUIRY_SYSTEM_ENABLED = off;
      resetConfig();
      const r = await send(validTour(), { headers: { 'idempotency-key': key() } });
      assert.equal(r.status, 503, `ENQUIRY_SYSTEM_ENABLED=${off}`);
      assert.equal(r.body.code, 'disabled');
    }

    process.env.ENQUIRY_SYSTEM_ENABLED = 'true';
    process.env.ENQUIRY_MODE = 'preview';
    resetConfig();
    const preview = await send(validTransfer(), { headers: { 'idempotency-key': key() } });
    assert.equal(preview.status, 503);
    assert.equal(preview.body.code, 'preview');
    assert.equal((await (await handle(new Request('http://test.local/api/health'))).json()).enquiries, 'preview');
  } finally {
    process.env.ENQUIRY_SYSTEM_ENABLED = 'true';
    process.env.ENQUIRY_MODE = 'live';
    resetConfig();
  }
  assert.equal(await count(), before);
});

test('newlines in the name are stripped before storage', async () => {
  const r = await send({ ...validTour(), email: 'nl@example.com', name: 'Mallory\r\nBcc: victim@example.com' }, { headers: { 'idempotency-key': key() } });
  assert.equal(r.status, 201);
  const row = await one('SELECT name FROM enquiries WHERE reference_number = $1', [r.body.reference]);
  assert.equal(row.name, 'Mallory Bcc: victim@example.com');
});

test('an oversize body without Content-Length (chunked) is cut off while streaming → 413', async () => {
  let pulled = 0;
  const chunk = new TextEncoder().encode('x'.repeat(4096));
  const stream = new ReadableStream({
    pull(controller) {
      pulled++;
      if (pulled > 64) return controller.close(); // would be 256 KB if read to the end
      controller.enqueue(chunk);
    },
  });
  const req = new Request('http://test.local/api/enquiries', { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.200' }, body: stream, duplex: 'half' });
  assert.equal(req.headers.get('content-length'), null);
  const res = await handle(req, { ip: '203.0.113.200' });
  assert.equal(res.status, 413);
  assert.ok(pulled < 20, `stopped reading early (pulled ${pulled} chunks)`);
});

test('body size limit → 413; non-JSON → 415; broken JSON → 400', async () => {
  assert.equal((await send({ ...validTour(), special_requests: 'x'.repeat(40 * 1024) }, { headers: { 'idempotency-key': key() } })).status, 413);
  const res = await handle(new Request('http://test.local/api/enquiries', { method: 'POST', headers: { 'content-type': 'text/plain' }, body: 'hi' }));
  assert.equal(res.status, 415);
  assert.equal((await send('{not json', { headers: { 'idempotency-key': key() } })).status, 400);
});

test('a missing idempotency key is tolerated (the server assigns one); the body key is used when no header', async () => {
  const r = await send({ ...validTour(), email: 'nokey@example.com' });
  assert.equal(r.status, 201);
  const row = await one('SELECT idempotency_key FROM enquiries WHERE reference_number = $1', [r.body.reference]);
  assert.match(row.idempotency_key, /^[0-9a-f-]{36}$/);
  const k = key();
  const viaBody = await send({ ...validTour(), email: 'bodykey@example.com', idempotency_key: k });
  assert.equal(viaBody.status, 201);
  assert.equal((await one('SELECT idempotency_key FROM enquiries WHERE reference_number = $1', [viaBody.body.reference])).idempotency_key, k);
});

test('router: unknown path 404, wrong method 405, health reports live; retired routes are gone', async () => {
  assert.equal((await handle(new Request('http://test.local/api/nope'))).status, 404);
  assert.equal((await handle(new Request('http://test.local/api/enquiries', { method: 'GET' }))).status, 405);
  const h = await handle(new Request('http://test.local/api/health'));
  assert.equal(h.status, 200);
  assert.equal((await h.json()).enquiries, 'live');
  assert.equal((await handle(new Request('http://test.local/api/jobs/follow-ups'))).status, 404);
  assert.equal((await handle(new Request('http://test.local/api/webhooks/calcom', { method: 'POST' }))).status, 404); // brand-guard-allow: proves the webhook is gone
});

test('the status CHECK constraint only allows the booking pipeline', async () => {
  const r = await send({ ...validTour(), email: 'check@example.com' }, { headers: { 'idempotency-key': key() } });
  const row = await getEnquiryByReference(r.body.reference);
  for (const s of ['CONTACTED', 'QUOTED', 'CONFIRMED', 'CLOSED']) await query('UPDATE enquiries SET status = $2 WHERE id = $1', [row.id, s]);
  await assert.rejects(query('UPDATE enquiries SET status = $2 WHERE id = $1', [row.id, 'QUOTE_SENT']), /check/i);
  await assert.rejects(query(`UPDATE enquiries SET enquiry_type = 'booking' WHERE id = $1`, [row.id]), /check/i);
});

test('rate_limits table holds one row per bucket', async () => {
  const rows = (await query('SELECT count(*)::int AS n FROM rate_limits')).rows[0].n;
  assert.ok(rows >= 2);
});
