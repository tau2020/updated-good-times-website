import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { one, closeDb, post, validTour, validTransfer, key } from './helpers/env.mjs';
import { handle } from '../lib/http/app.mjs';
import { signAction, verifyAction, actionUrl } from '../lib/security/signing.mjs';
import { canTransition, STATUSES, ACTIONS } from '../lib/enquiries/status.mjs';

after(() => closeDb());

const DAY = 24 * 3600 * 1000;
const tokenFor = (id, status, expiresAt = Date.now() + DAY) => new URL(actionUrl({ enquiryId: id, status, expiresAt })).searchParams.get('token');
/** What a link scanner or a click does: GET the link. */
const link = (id, status, expiresAt) => new Request(actionUrl({ enquiryId: id, status, expiresAt: expiresAt ?? Date.now() + DAY }));
/** What the confirmation page's button does: POST the token. */
const apply = (id, status, expiresAt, token = tokenFor(id, status, expiresAt)) =>
  new Request(`http://test.local/api/enquiries/${id}/status`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token }).toString() });
const statusOf = async (id) => (await one('SELECT status FROM enquiries WHERE id = $1', [id])).status;

async function create(body) {
  const res = await handle(...post('/api/enquiries', body, { headers: { 'idempotency-key': key() } }));
  assert.equal(res.status, 201);
  const { reference } = await res.json();
  return one('SELECT id, status, reference_number FROM enquiries WHERE reference_number = $1', [reference]);
}

test('the booking status pipeline and link actions', () => {
  assert.deepEqual(STATUSES, ['NEW', 'CONTACTED', 'QUOTED', 'CONFIRMED', 'CLOSED', 'CANCELLED']);
  assert.deepEqual(Object.keys(ACTIONS), ['CONTACTED', 'QUOTED', 'CONFIRMED', 'CLOSED']);
});

test('tokens verify, reject tampering, reject expiry', () => {
  const t = signAction({ enquiryId: 'abc', status: 'CONFIRMED', expiresAt: Date.now() + DAY });
  const v = verifyAction(t);
  assert.equal(v.ok, true);
  assert.equal(v.enquiryId, 'abc');
  assert.equal(v.status, 'CONFIRMED');
  assert.equal(verifyAction(t.slice(0, -2) + 'zz').reason, 'signature');
  assert.equal(verifyAction(t.replace(/^[^.]+/, Buffer.from('abc|CLOSED|9999999999').toString('base64url'))).reason, 'signature');
  assert.equal(verifyAction('garbage').reason, 'malformed');
  assert.equal(verifyAction('').reason, 'malformed');
  assert.equal(verifyAction(signAction({ enquiryId: 'abc', status: 'CONTACTED', expiresAt: Date.now() - 1000 })).reason, 'expired');
  assert.equal(verifyAction(t, { secret: 'a-different-secret-that-is-long-enough' }).reason, 'signature');
  assert.match(actionUrl({ enquiryId: 'abc', status: 'CLOSED', expiresAt: Date.now() + DAY }), /^http:\/\/test\.local\/api\/enquiries\/abc\/status\?token=/);
});

test('state machine: links move forwards only; CLOSED is final; CONFIRMED can still be closed', () => {
  assert.equal(canTransition('NEW', 'CONTACTED').ok, true);
  assert.equal(canTransition('NEW', 'CONFIRMED').ok, true, 'skipping ahead is fine');
  assert.equal(canTransition('QUOTED', 'CONFIRMED').ok, true);
  assert.equal(canTransition('CONFIRMED', 'CLOSED').ok, true);
  assert.equal(canTransition('CONTACTED', 'CONTACTED').reason, 'already');
  assert.equal(canTransition('QUOTED', 'CONTACTED').reason, 'backwards');
  assert.equal(canTransition('CONFIRMED', 'QUOTED').reason, 'backwards');
  assert.equal(canTransition('CLOSED', 'CONTACTED').reason, 'terminal');
  assert.equal(canTransition('CLOSED', 'CONFIRMED').reason, 'terminal');
  assert.equal(canTransition('NEW', 'NEW').reason, 'invalid', 'NEW is not a link action');
  assert.equal(canTransition('NEW', 'QUOTE_SENT').reason, 'invalid');
  assert.equal(canTransition('BOGUS', 'CLOSED').reason, 'invalid');
});

test('GET only shows a confirmation page (link scanners cannot change anything); POST applies it', async () => {
  const row = await create({ ...validTour(), email: 'scanner@example.com', name: 'Eve <script>alert(1)</script>' });
  // A scanner opens every link in the email, several times.
  for (const status of ['CONTACTED', 'QUOTED', 'CONFIRMED', 'CLOSED', 'CLOSED']) {
    const res = await handle(link(row.id, status));
    assert.equal(res.status, 200);
  }
  assert.equal(await statusOf(row.id), 'NEW', 'GET never changes the status');

  const page = await (await handle(link(row.id, 'CONFIRMED'))).text();
  assert.match(page, /<link rel="icon" href="\/assets\/brand\/favicon\.svg" type="image\/svg\+xml">/, 'the site\'s icon, not the browser\'s fallback');
  assert.match(page, new RegExp(`Mark ${row.reference_number} as “Confirmed”\\?`));
  assert.match(page, /<form method="post" action="\/api\/enquiries\/[0-9a-f-]{36}\/status">/);
  assert.match(page, /<input type="hidden" name="token" value="[A-Za-z0-9_.-]+">/);
  assert.match(page, /<button type="submit">Mark confirmed<\/button>/);
  assert.match(page, /Only if you have confirmed the booking with the customer/);
  assert.doesNotMatch(page, /<script>alert/);
  assert.match(page, /Eve &lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  const headers = (await handle(link(row.id, 'CONTACTED'))).headers;
  assert.equal(headers.get('referrer-policy'), 'no-referrer');
  assert.match(headers.get('content-security-policy'), /default-src 'none'/);
  assert.match(headers.get('content-security-policy'), /form-action 'self'/);

  const posted = await handle(apply(row.id, 'CONTACTED'));
  assert.equal(posted.status, 200);
  assert.match(await posted.text(), /is now “Contacted”/);
  assert.equal(await statusOf(row.id), 'CONTACTED');
});

test('status links: contacted → quoted → confirmed (operator) → closed; reuse, stale, expired and forged tokens change nothing', async () => {
  const row = await create({ ...validTour(), email: 'status@example.com' });
  assert.equal(row.status, 'NEW');

  const contacted = await handle(apply(row.id, 'CONTACTED'));
  assert.equal(contacted.status, 200);
  const page1 = await contacted.text();
  assert.match(page1, new RegExp(`${row.reference_number} is now “Contacted”`));
  assert.match(page1, /noindex/);
  assert.match(page1, /gt-logo-reversed-compact\.svg/);
  assert.match(page1, /alt="Good Times in Cape Town"/);
  assert.doesNotMatch(page1, /safari|soul|SJ-|jap[ -]?shuttles|\bJAP\b/i); // brand-guard-allow: proves no earlier operator is named
  assert.equal(await statusOf(row.id), 'CONTACTED');
  assert.ok((await one('SELECT last_contacted_at FROM enquiries WHERE id = $1', [row.id])).last_contacted_at);

  // Reused: no change. The GET page says so too, without a button.
  const again = await handle(apply(row.id, 'CONTACTED'));
  assert.equal(again.status, 200);
  assert.match(await again.text(), /already/i);
  const againPage = await (await handle(link(row.id, 'CONTACTED'))).text();
  assert.match(againPage, /already/i);
  assert.doesNotMatch(againPage, /<form/);

  assert.equal((await handle(apply(row.id, 'QUOTED'))).status, 200);
  assert.equal(await statusOf(row.id), 'QUOTED');

  // A stale "contacted" token from the same email cannot move it back (GET or POST)
  const staleGet = await handle(link(row.id, 'CONTACTED'));
  assert.equal(staleGet.status, 409);
  assert.doesNotMatch(await staleGet.text(), /<form/);
  const stale = await handle(apply(row.id, 'CONTACTED'));
  assert.equal(stale.status, 409);
  assert.match(await stale.text(), /back a step/);
  assert.equal(await statusOf(row.id), 'QUOTED');

  // Expired (GET and POST)
  assert.equal((await handle(link(row.id, 'CONFIRMED', Date.now() - 1))).status, 410);
  assert.equal((await handle(apply(row.id, 'CONFIRMED', Date.now() - 1))).status, 410);
  assert.equal(await statusOf(row.id), 'QUOTED');

  // Forged: a token for another enquiry id, posted to this enquiry
  const other = tokenFor('00000000-0000-4000-8000-000000000000', 'CONFIRMED');
  assert.equal((await handle(apply(row.id, 'CONFIRMED', undefined, other))).status, 403);
  assert.equal((await handle(apply(row.id, 'CONFIRMED', undefined, 'garbage'))).status, 400);
  assert.equal((await handle(apply(row.id, 'CONFIRMED', undefined, ''))).status, 400);
  // POST must be a form, and small
  const json = new Request(`http://test.local/api/enquiries/${row.id}/status`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token: tokenFor(row.id, 'CONFIRMED') }) });
  assert.equal((await handle(json)).status, 415);
  const big = new Request(`http://test.local/api/enquiries/${row.id}/status`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: `token=${'x'.repeat(5000)}` });
  assert.equal((await handle(big)).status, 413);
  assert.equal(await statusOf(row.id), 'QUOTED');

  // Operator-confirmed
  const confirmed = await handle(apply(row.id, 'CONFIRMED'));
  assert.equal(confirmed.status, 200);
  const page2 = await confirmed.text();
  assert.match(page2, /is now “Confirmed”/);
  assert.match(page2, /Recorded as confirmed; the customer has been emailed their booking confirmation/);
  assert.equal(await statusOf(row.id), 'CONFIRMED');
  assert.equal((await handle(apply(row.id, 'QUOTED'))).status, 409);
  assert.equal(await statusOf(row.id), 'CONFIRMED');

  // Close, then nothing reopens it
  assert.equal((await handle(apply(row.id, 'CLOSED'))).status, 200);
  const reopen = await handle(apply(row.id, 'CONFIRMED'));
  assert.equal(reopen.status, 409);
  assert.match(await reopen.text(), /closed/);
  assert.equal(await statusOf(row.id), 'CLOSED');
});

test('a transfer can be confirmed straight from NEW; unknown enquiries are 404', async () => {
  const row = await create({ ...validTransfer(), email: 'confirm-direct@example.com' });
  assert.equal((await handle(apply(row.id, 'CONFIRMED'))).status, 200);
  assert.equal(await statusOf(row.id), 'CONFIRMED');
  assert.equal((await one('SELECT last_contacted_at FROM enquiries WHERE id = $1', [row.id])).last_contacted_at, null);
  assert.equal((await handle(link('00000000-0000-4000-8000-000000000000', 'CLOSED'))).status, 404);
  assert.equal((await handle(apply('00000000-0000-4000-8000-000000000000', 'CLOSED'))).status, 404);
});
