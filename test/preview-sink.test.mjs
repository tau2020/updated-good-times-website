/**
 * A public preview that sends through Resend (config.email.previewSink)
 * delivers every enquiry email to Resend's test inbox, at the moment of
 * sending: new requests, and retries of rows stored before the sink existed.
 * Resend is never reached: fetch is replaced and records what would be sent.
 */
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { query, one, closeDb, post, validTour, key } from './helpers/env.mjs';

// The staging set-up: Resend for real, not production, the default API address. A test deployment's staff address
// (ADMIN_EMAILS) is real, and EMAIL_TEST_RECIPIENTS names the one owned inbox that may receive real mail.
Object.assign(process.env, { EMAIL_PROVIDER: 'resend', RESEND_API_KEY: 're_test_preview', SITE_ENV: 'preview', ADMIN_EMAILS: 'staff@goodtimes.test, owner@goodtimes.test' });
delete process.env.EMAIL_TEST_RECIPIENTS;
delete process.env.RESEND_API_URL;
const { config, resetConfig } = await import('../lib/config.mjs');
resetConfig();

const sent = [];
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  if (!String(url).startsWith('https://api.resend.com/')) throw new Error(`unexpected request to ${url}`);
  sent.push(JSON.parse(init.body));
  return new Response(JSON.stringify({ id: `msg-${sent.length}` }), { status: 200, headers: { 'content-type': 'application/json' } });
};
after(async () => {
  globalThis.fetch = realFetch;
  await closeDb();
});

const { handle } = await import('../lib/http/app.mjs');
const { retryFailedEmails } = await import('../lib/email/send.mjs');

test('the sink is on for this set-up', () => {
  assert.equal(config.isProduction, false);
  assert.equal(config.email.previewSink, 'delivered@resend.dev');
});

test('a new request: the team copy and the visitor’s acknowledgement both go to the test inbox', async () => {
  sent.length = 0;
  const res = await handle(...post('/api/enquiries', { ...validTour(), email: 'real.traveller@example.com' }, { headers: { 'idempotency-key': key() } }));
  assert.equal(res.status, 201);
  assert.equal(sent.length, 2);
  for (const m of sent) assert.deepEqual(m.to, ['delivered@resend.dev']);
  assert.ok(!JSON.stringify(sent.map((m) => m.to)).includes('real.traveller@example.com'));
  const logged = await query(`SELECT recipient FROM email_log ORDER BY created_at DESC LIMIT 2`);
  assert.deepEqual(logged.rows.map((r) => r.recipient), ['delivered@resend.dev', 'delivered@resend.dev']);
});

test('a retry of a row stored with a real address (before the sink) goes to the test inbox too', async () => {
  const enquiry = await one(`SELECT * FROM enquiries ORDER BY created_at DESC LIMIT 1`);
  const props = { enquiry: { ...enquiry, created_at: String(enquiry.created_at), updated_at: String(enquiry.updated_at) } };
  await query(`INSERT INTO email_log (enquiry_id, template, recipient, status, payload) VALUES ($1, 'enquiry-received', 'stored.before@example.com', 'failed', $2)`, [
    enquiry.id,
    JSON.stringify({ template: 'enquiry-received', props, to: 'stored.before@example.com', replyTo: null }),
  ]);
  sent.length = 0;
  const summary = await retryFailedEmails({ log: () => {} });
  assert.ok(summary.sent >= 1, JSON.stringify(summary));
  assert.ok(sent.length >= 1);
  for (const m of sent) assert.deepEqual(m.to, ['delivered@resend.dev']);
});

test('Resend’s own test addresses keep their address (the staging browser suite reads them back)', async () => {
  sent.length = 0;
  const res = await handle(...post('/api/enquiries', { ...validTour(), email: 'delivered+e2e-7@resend.dev', pickup_area: 'Green Point' }, { headers: { 'idempotency-key': key() } }));
  assert.equal(res.status, 201);
  assert.ok(sent.some((m) => m.to[0] === 'delivered+e2e-7@resend.dev'));
});

test('the staff sign-in link obeys the sink too: Resend’s test inbox, or an allowlisted owned inbox, never another address', async () => {
  const signIn = (email, ip) =>
    handle(
      new Request('http://test.local/admin/sign-in', {
        method: 'POST',
        headers: { origin: 'http://test.local', 'content-type': 'application/x-www-form-urlencoded', 'x-forwarded-for': ip },
        body: new URLSearchParams({ email }),
      }),
      { ip },
    );
  sent.length = 0;
  assert.equal((await signIn('staff@goodtimes.test', '192.0.2.31')).status, 200);
  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0].to, ['delivered@resend.dev'], 'not the staff address itself');
  assert.match(sent[0].subject, /sign-in link/);

  // The allowlisted owned inbox receives its own link.
  process.env.EMAIL_TEST_RECIPIENTS = 'owner@goodtimes.test';
  resetConfig();
  try {
    sent.length = 0;
    assert.equal((await signIn('owner@goodtimes.test', '192.0.2.32')).status, 200);
    assert.deepEqual(sent.map((m) => m.to), [['owner@goodtimes.test']]);
  } finally {
    delete process.env.EMAIL_TEST_RECIPIENTS;
    resetConfig();
  }
});
