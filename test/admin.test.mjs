import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { query, one, closeDb, post, validTour, validTransfer, key, inDays, OUTBOX, decodeEml, emlSubject } from './helpers/env.mjs';

process.env.ADMIN_EMAILS = 'Staff@Test.invalid, second@test.invalid';
const { resetConfig } = await import('../lib/config.mjs');
resetConfig();
const { handle } = await import('../lib/http/app.mjs');
const { sessionToken, signInToken, SESSION_COOKIE, formToken, safeNext } = await import('../lib/admin/auth.mjs');
const { retryFailedEmails } = await import('../lib/email/send.mjs');

after(() => closeDb());

const ORIGIN = 'http://test.local';
const req = (path, { method = 'GET', cookie = '', form = null, origin = ORIGIN, ip = '192.0.2.10', headers = {} } = {}) =>
  handle(
    new Request(`${ORIGIN}${path}`, {
      method,
      headers: {
        ...(cookie ? { cookie } : {}),
        ...(form ? { 'content-type': 'application/x-www-form-urlencoded' } : {}),
        ...(origin && method === 'POST' ? { origin } : {}),
        'x-forwarded-for': ip,
        ...headers,
      },
      body: form ? new URLSearchParams(form) : undefined,
    }),
  );
const session = (email = 'staff@test.invalid') => {
  const token = sessionToken(email);
  return { cookie: `${SESSION_COOKIE}=${token}`, form: formToken({ token }) };
};
const outbox = () =>
  readdirSync(OUTBOX)
    .filter((f) => f.endsWith('.eml'))
    .map((f) => readFileSync(join(OUTBOX, f), 'utf8'));
async function booking(body) {
  const res = await handle(...post('/api/enquiries', body, { headers: { 'idempotency-key': key() } }));
  assert.equal(res.status, 201);
  return one('SELECT id, reference_number FROM enquiries WHERE reference_number = $1', [(await res.json()).reference]);
}

test('the dashboard is behind sign-in, and its pages forbid scripts and indexing', async () => {
  const r = await req('/admin/');
  assert.equal(r.status, 303);
  assert.equal(r.headers.get('location'), '/admin/sign-in');
  const page = await req('/admin/sign-in');
  assert.equal(page.status, 200);
  assert.match(page.headers.get('content-security-policy'), /default-src 'none'/);
  assert.doesNotMatch(page.headers.get('content-security-policy'), /script-src/);
  assert.match(page.headers.get('x-robots-tag'), /noindex/);
  const signIn = await page.text();
  assert.match(signIn, /Email me a sign-in link/);
  // The site's own icons: without them a browser falls back to /favicon.ico and may show WordPress's cached "W"
  assert.match(signIn, /<link rel="icon" href="\/assets\/brand\/favicon\.svg" type="image\/svg\+xml">/);
  assert.match(signIn, /<link rel="icon" href="\/assets\/brand\/favicon\.ico" sizes="any">/);
});

test('sign-in: a staff address gets a link; anyone else gets the same answer and no email', async () => {
  const before = outbox().length;
  const other = await req('/admin/sign-in', { method: 'POST', form: { email: 'stranger@example.com' }, ip: '192.0.2.21' });
  assert.equal(other.status, 200);
  const otherText = await other.text();
  assert.equal(outbox().length, before, 'nothing sent to a non-staff address');
  const staff = await req('/admin/sign-in', { method: 'POST', form: { email: 'STAFF@test.invalid' }, ip: '192.0.2.22' });
  assert.equal(await staff.text(), otherText, 'same answer either way');
  const mails = outbox().slice(before);
  assert.equal(mails.length, 1);
  assert.match(emlSubject(mails[0]), /sign-in link/);
  const [text] = decodeEml(mails[0]);
  const link = /http:\/\/test\.local(\/admin\/sign-in\/confirm\?token=[A-Za-z0-9_.-]+)/.exec(text)[1];
  assert.equal((await one(`SELECT count(*)::int AS n FROM email_log WHERE template = 'admin-sign-in'`)).n, 0, 'the link is never stored');

  // Opening the link only asks; the button signs in, once.
  const ask = await req(link);
  assert.equal(ask.status, 200);
  assert.doesNotMatch(ask.headers.get('set-cookie') || '', /gt_admin/);
  const token = new URL(link, ORIGIN).searchParams.get('token');
  const confirm = await req('/admin/sign-in/confirm', { method: 'POST', form: { token } });
  assert.equal(confirm.status, 303);
  const cookie = confirm.headers.get('set-cookie');
  assert.match(cookie, /^__Host-gt_admin=.+; Path=\/; HttpOnly; Secure; SameSite=Lax/);
  const list = await req('/admin/', { cookie: cookie.split(';')[0] });
  assert.equal(list.status, 200);
  assert.match(await list.text(), /staff@test\.invalid/);
  const again = await req('/admin/sign-in/confirm', { method: 'POST', form: { token } });
  assert.equal(again.status, 400);
  assert.match(await again.text(), /already been used/);
});

test('sign-in refuses expired, forged and cross-site attempts, and sessions of addresses no longer listed', async () => {
  const expired = signInToken('staff@test.invalid', { now: Date.now() - 3600_000 });
  assert.match(await (await req('/admin/sign-in/confirm', { method: 'POST', form: { token: expired } })).text(), /expired/);
  const forged = `${signInToken('staff@test.invalid').split('.')[0]}.AAAA`;
  assert.equal((await req('/admin/sign-in/confirm', { method: 'POST', form: { token: forged } })).status, 400);
  assert.equal((await req('/admin/sign-in/confirm', { method: 'POST', form: { token: signInToken('staff@test.invalid') }, origin: 'https://evil.example' })).status, 403);
  const gone = session('former@test.invalid');
  assert.equal((await req('/admin/', { cookie: gone.cookie })).status, 303);
});

test('dashboard pages keep a referrer policy under which browsers send a real Origin on form posts', async () => {
  // no-referrer makes browsers send `Origin: null` on every form post, which locked staff out.
  const res = await req('/admin/sign-in');
  assert.equal(res.headers.get('referrer-policy'), 'same-origin');
  const post = (origin, site, ip) => req('/admin/sign-in', { method: 'POST', form: { email: 'staff@test.invalid' }, origin, ip, headers: site ? { 'sec-fetch-site': site } : {} });
  assert.equal((await post('null', 'same-origin', '192.0.2.40')).status, 200);
  assert.equal((await post('null', 'cross-site', '192.0.2.41')).status, 403);
  assert.equal((await post('null', '', '192.0.2.42')).status, 403);
});

test('bookings list, search and detail show what staff need; changes need the form token', async () => {
  const s = session();
  const b = await booking({ ...validTransfer(), email: 'listme@example.com', notes: 'Wheelchair <b>folding</b>' });
  const list = await (await req('/admin/?view=all&q=listme', { cookie: s.cookie })).text();
  assert.match(list, new RegExp(b.reference_number));
  assert.match(list, /Airport arrival|airport/i);
  const detail = await (await req(`/admin/bookings/${b.id}`, { cookie: s.cookie })).text();
  assert.match(detail, /listme@example\.com/);
  assert.match(detail, /Wheelchair &lt;b&gt;folding&lt;\/b&gt;/, 'visitor text escaped');
  assert.match(detail, /Transfer request received/, 'history');
  assert.match(detail, /new-enquiry-internal/, 'email log');

  const noToken = await req(`/admin/bookings/${b.id}/status`, { method: 'POST', cookie: s.cookie, form: { status: 'CONFIRMED' } });
  assert.equal(noToken.status, 403);
  const crossSite = await req(`/admin/bookings/${b.id}/status`, { method: 'POST', cookie: s.cookie, form: { status: 'CONFIRMED', form: s.form }, origin: 'https://evil.example' });
  assert.equal(crossSite.status, 403);
  assert.equal((await one('SELECT status FROM enquiries WHERE id = $1', [b.id])).status, 'NEW');
});

test('confirming emails the customer a booking confirmation and records who did it; cancelling can stay silent', async () => {
  const s = session();
  const b = await booking({ ...validTour(), preferred_date: inDays(50), email: 'confirmme@example.com', special_requests: 'x1' });
  const before = outbox().length;
  const r = await req(`/admin/bookings/${b.id}/status`, { method: 'POST', cookie: s.cookie, form: { status: 'CONFIRMED', notify: 'on', form: s.form } });
  assert.equal(r.status, 303);
  assert.match(r.headers.get('location'), /m=status\.CONFIRMED\.emailed/);
  const sent = outbox().slice(before);
  assert.equal(sent.length, 1);
  assert.match(emlSubject(sent[0]), new RegExp(`${b.reference_number} is confirmed`));
  assert.match(sent[0], /To: confirmme@example\.com/);
  const ev = await one(`SELECT actor, detail FROM enquiry_events WHERE enquiry_id = $1 AND kind = 'status'`, [b.id]);
  assert.equal(ev.actor, 'staff@test.invalid');
  assert.equal(ev.detail, 'New → Confirmed');

  const before2 = outbox().length;
  await req(`/admin/bookings/${b.id}/status`, { method: 'POST', cookie: s.cookie, form: { status: 'CANCELLED', form: s.form } });
  assert.equal(outbox().length, before2, 'notify unticked: no email');
  assert.equal((await one('SELECT status FROM enquiries WHERE id = $1', [b.id])).status, 'CANCELLED');
  const page = await (await req(`/admin/bookings/${b.id}?m=status.CANCELLED`, { cookie: s.cookie })).text();
  assert.match(page, /Status set to Cancelled/);
});

test('team notes and day vehicles are saved; a closed day stops new bookings', async () => {
  const s = session();
  const b = await booking({ ...validTour(), preferred_date: inDays(51), email: 'noteme@example.com', special_requests: 'x2' });
  await req(`/admin/bookings/${b.id}/note`, { method: 'POST', cookie: s.cookie, form: { note: 'Called, waiting for flight times', form: s.form } });
  assert.equal((await one('SELECT staff_note FROM enquiries WHERE id = $1', [b.id])).staff_note, 'Called, waiting for flight times');

  const day = inDays(52);
  const saved = await req('/admin/availability', { method: 'POST', cookie: s.cookie, form: { day, vehicles: '0', note: 'Team day off', form: s.form } });
  assert.equal(saved.status, 303);
  assert.deepEqual(await one('SELECT vehicles, note, updated_by FROM day_capacity WHERE day = $1::date', [day]), { vehicles: 0, note: 'Team day off', updated_by: 'staff@test.invalid' });
  const refused = await handle(...post('/api/enquiries', { ...validTour(), preferred_date: day, email: 'dayoff@example.com' }, { headers: { 'idempotency-key': key() } }));
  assert.equal(refused.status, 409);
  const page = await (await req(`/admin/availability?from=${day}`, { cookie: s.cookie })).text();
  assert.match(page, /Closed/);
  assert.match(page, /Team day off/);
  const bad = await req('/admin/availability', { method: 'POST', cookie: s.cookie, form: { day: '2000-01-01', vehicles: '2', form: s.form } });
  assert.match(bad.headers.get('location'), /m=dayinvalid/);
  // Empty vehicles: back to normal.
  await req('/admin/availability', { method: 'POST', cookie: s.cookie, form: { day, vehicles: '', form: s.form } });
  assert.equal(await one('SELECT 1 FROM day_capacity WHERE day = $1::date', [day]), null);
});

test('the team notification links the request in the dashboard', async () => {
  const before = outbox().length;
  const b = await booking({ ...validTour(), preferred_date: inDays(53), email: 'linkme@example.com', special_requests: 'x3' });
  const team = outbox()
    .slice(before)
    .find((m) => /To: team@test\.invalid/.test(m));
  assert.ok(decodeEml(team)[0].includes(`http://test.local/admin/bookings/${b.id}`));
  await query('SELECT 1');
});

test('a signed-out link into the dashboard comes back to the same page after sign-in; only dashboard paths are followed', async () => {
  const b = await booking({ ...validTour(), preferred_date: inDays(54), email: 'deeplink@example.com', special_requests: 'x4' });
  const r = await req(`/admin/bookings/${b.id}`);
  assert.equal(r.headers.get('location'), `/admin/sign-in?next=${encodeURIComponent(`/admin/bookings/${b.id}`)}`);
  const form = await (await req(`/admin/sign-in?next=${encodeURIComponent(`/admin/bookings/${b.id}`)}`)).text();
  assert.match(form, new RegExp(`name="next" value="/admin/bookings/${b.id}"`));
  const before = outbox().length;
  await req('/admin/sign-in', { method: 'POST', form: { email: 'staff@test.invalid', next: `/admin/bookings/${b.id}` }, ip: '192.0.2.30' });
  const link = /http:\/\/test\.local(\/admin\/sign-in\/confirm\?[^\s"]+)/.exec(decodeEml(outbox().slice(before)[0])[0])[1];
  const ask = await (await req(link)).text();
  const url = new URL(link, ORIGIN);
  const done = await req('/admin/sign-in/confirm', { method: 'POST', form: { token: url.searchParams.get('token'), next: /name="next" value="([^"]+)"/.exec(ask)[1] } });
  assert.equal(done.headers.get('location'), `/admin/bookings/${b.id}`);
  assert.match(done.headers.get('set-cookie'), /SameSite=Lax/, 'Lax, so the link from webmail arrives signed in');
  for (const bad of ['https://evil.example/', '//evil.example/admin/', '/admin//evil.example', '/admin/../api/health', '/api/health', 'javascript:alert(1)', '/admin/<x>']) assert.equal(safeNext(bad), '/admin/', bad);
  assert.equal(safeNext('/admin/?view=new&q=GT'), '/admin/?view=new&q=GT');
});

test('sign-in limits are per connection: requests from elsewhere cannot use up a member of staff’s links', async () => {
  for (let i = 0; i < 3; i++) await req('/admin/sign-in', { method: 'POST', form: { email: 'second@test.invalid' }, ip: '198.51.100.66' });
  assert.equal((await req('/admin/sign-in', { method: 'POST', form: { email: 'second@test.invalid' }, ip: '198.51.100.66' })).status, 429);
  assert.equal((await req('/admin/sign-in', { method: 'POST', form: { email: 'second@test.invalid' }, ip: '198.51.100.67' })).status, 200);
});

test('a failed confirmation email is never sent late once the booking has been cancelled', async () => {
  const b = await booking({ ...validTour(), preferred_date: inDays(55), email: 'late@example.com', special_requests: 'x5' });
  await query(`INSERT INTO email_log (enquiry_id, template, recipient, status, attempts, payload) VALUES ($1, 'booking-confirmed', 'late@example.com', 'failed', 1, $2)`, [b.id, JSON.stringify({ template: 'booking-confirmed', props: { enquiry: { reference_number: b.reference_number } }, to: 'late@example.com' })]);
  await query(`UPDATE enquiries SET status = 'CANCELLED' WHERE id = $1`, [b.id]);
  const before = outbox().length;
  const r = await retryFailedEmails({ log: () => {} });
  assert.ok(r.superseded >= 1);
  assert.equal(outbox().slice(before).filter((m) => /late@example\.com/.test(m)).length, 0);
  assert.match((await one(`SELECT error FROM email_log WHERE enquiry_id = $1 AND template = 'booking-confirmed'`, [b.id])).error, /superseded: the booking is now CANCELLED/);
});

test('unknown statuses and views are refused, not passed to the database', async () => {
  const s = session();
  const b = await booking({ ...validTour(), preferred_date: inDays(56), email: 'proto@example.com', special_requests: 'x6' });
  const r = await req(`/admin/bookings/${b.id}/status`, { method: 'POST', cookie: s.cookie, form: { status: 'constructor', form: s.form } });
  assert.equal(r.status, 400);
  assert.equal((await req('/admin/?view=constructor', { cookie: s.cookie })).status, 200);
});

test('failed emails are visible: a count beside Retry, a mark on the booking, a warning when none was ever sent; superseded ones are not counted', async () => {
  const s = session();
  const { failedEmailSummary } = await import('../lib/email/send.mjs');
  const start = await failedEmailSummary();
  // A request whose two emails failed (the provider was down).
  const failing = await booking({ ...validTour(), preferred_date: inDays(61), email: 'down@example.com', special_requests: 'x7' });
  await query(`UPDATE email_log SET status = 'failed', error = 'Resend responded 401: API key is invalid' WHERE enquiry_id = $1`, [failing.id]);
  // A request stored while the email log could not be written: no email row at all.
  const silent = await handle(...post('/api/enquiries', { ...validTour(), preferred_date: inDays(62), email: 'silent@example.com', special_requests: 'x8' }, { headers: { 'idempotency-key': key() } }));
  const silentRef = (await silent.json()).reference;
  const silentRow = await one('SELECT id FROM enquiries WHERE reference_number = $1', [silentRef]);
  await query('DELETE FROM email_log WHERE enquiry_id = $1', [silentRow.id]);
  // A superseded confirmation (failed, attempts used up on purpose): never to be sent, so never counted.
  await query(`INSERT INTO email_log (enquiry_id, template, recipient, status, attempts, error, payload) VALUES ($1, 'booking-confirmed', 'down@example.com', 'failed', 5, 'superseded: the booking is now CANCELLED', '{}')`, [failing.id]);

  const sum = await failedEmailSummary();
  assert.equal(sum.retryable - start.retryable, 2, 'the two failed emails');
  assert.equal(sum.givenUp - start.givenUp, 0, 'the superseded one is not "gave up"');

  const list = await (await req('/admin/?view=all', { cookie: s.cookie })).text();
  assert.match(list, new RegExp(`${sum.retryable} emails? failed to send and will go again when you press Retry`));
  const rowOf = (ref) => list.slice(list.indexOf(ref), list.indexOf('</tr>', list.indexOf(ref)));
  assert.match(rowOf(failing.reference_number), /Email failed/);
  assert.match(rowOf(silentRef), /No email sent/);
  const detail = await (await req(`/admin/bookings/${silentRow.id}`, { cookie: s.cookie })).text();
  assert.match(detail, /No email was sent for this request/);

  // Gave up after five attempts (not superseded): said separately.
  await query(`UPDATE email_log SET attempts = 5 WHERE enquiry_id = $1 AND template = 'enquiry-received'`, [failing.id]);
  assert.equal((await failedEmailSummary()).givenUp - start.givenUp, 1);
  assert.match(await (await req('/admin/?view=all', { cookie: s.cookie })).text(), /1 gave up after 5 attempts/);

  // After a successful retry the count drops and the mark goes.
  await query(`UPDATE email_log SET attempts = 1 WHERE enquiry_id = $1`, [failing.id]);
  await query(`UPDATE email_log SET attempts = 5 WHERE enquiry_id = $1 AND template = 'booking-confirmed'`, [failing.id]);
  await retryFailedEmails({ log: () => {} });
  const after = await (await req('/admin/?view=all', { cookie: s.cookie })).text();
  assert.doesNotMatch(after.slice(after.indexOf(failing.reference_number), after.indexOf('</tr>', after.indexOf(failing.reference_number))), /Email failed/);
});
