/**
 * Configuration switches. This file deliberately does not load the test
 * helper: it controls the environment itself (each test file runs in its own
 * process) and never opens a database.
 */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const KEYS = ['ENQUIRY_SYSTEM_ENABLED', 'ENQUIRY_MODE', 'DATABASE_URL', 'ENQUIRY_SIGNING_SECRET', 'FROM_EMAIL', 'ENQUIRY_TEAM_EMAIL', 'REPLY_TO_EMAIL', 'PUBLIC_SITE_URL', 'EMAIL_PROVIDER', 'RESEND_API_KEY', 'NODE_ENV', 'VERCEL_ENV', 'SITE_ENV', 'DATABASE_HTTP_ENDPOINT', 'RESEND_API_URL'];
// Stop lib/config.mjs from reading a developer's local .env during this test.
process.env.VERCEL = '1';

const { config, resetConfig, ConfigError } = await import('../lib/config.mjs');
const { handle } = await import('../lib/http/app.mjs');

beforeEach(() => {
  for (const k of KEYS) delete process.env[k];
  resetConfig();
});

const post = () => new Request('http://test.local/api/enquiries', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });

test('preview is the default: nothing else is required, health says preview, the API refuses with 503', async () => {
  assert.equal(config.mode, 'preview');
  assert.equal(config.enabled, true);
  assert.equal(config.accepting, false);
  assert.equal((await (await handle(new Request('http://test.local/api/health'))).json()).enquiries, 'preview');
  const res = await handle(post());
  assert.equal(res.status, 503);
  assert.equal((await res.json()).code, 'preview');
  // Status links are inactive too.
  const s = await handle(new Request('http://test.local/api/enquiries/00000000-0000-4000-8000-000000000000/status?token=x'));
  assert.equal(s.status, 503);
});

test('disabled: 503 with no other settings; false, 0, no and off all switch it off (any case)', async () => {
  for (const off of ['false', 'FALSE', '0', 'no', 'No', 'off', ' OFF ']) {
    process.env.ENQUIRY_SYSTEM_ENABLED = off;
    process.env.ENQUIRY_MODE = 'live';
    resetConfig();
    assert.equal(config.enabled, false, off);
    assert.equal(config.accepting, false, off);
    const res = await handle(post());
    assert.equal(res.status, 503, off);
    assert.equal((await res.json()).code, 'disabled');
  }
  for (const on of ['true', '1', 'yes', 'on', '']) {
    process.env.ENQUIRY_SYSTEM_ENABLED = on;
    delete process.env.ENQUIRY_MODE;
    resetConfig();
    assert.equal(config.enabled, true, on);
  }
});

test('ENQUIRY_MODE is read case-insensitively', () => {
  process.env.ENQUIRY_MODE = 'LIVE';
  process.env.ENQUIRY_SYSTEM_ENABLED = 'false';
  assert.equal(config.mode, 'live');
});

test('live without the required settings fails fast (503 to visitors, a clear list for the operator)', async () => {
  process.env.ENQUIRY_MODE = 'live';
  assert.throws(() => config.enabled, (e) => e instanceof ConfigError && /ENQUIRY_TEAM_EMAIL is required/.test(e.message) && /DATABASE_URL is required/.test(e.message) && /ENQUIRY_SIGNING_SECRET is required/.test(e.message));
  resetConfig();
  const orig = console.error;
  console.error = () => {};
  try {
    const res = await handle(post());
    assert.equal(res.status, 503);
    assert.equal((await res.json()).code, 'misconfigured');
  } finally {
    console.error = orig;
  }
});

test('live with a complete configuration; the inherited inbox variable is not read', () => {
  Object.assign(process.env, {
    ENQUIRY_MODE: 'live',
    DATABASE_URL: 'pglite://memory',
    ENQUIRY_SIGNING_SECRET: 'x'.repeat(40),
    FROM_EMAIL: 'Good Times in Cape Town <enquiries@test.invalid>',
    ENQUIRY_TEAM_EMAIL: 'team@test.invalid',
    REPLY_TO_EMAIL: 'reply@test.invalid',
    PUBLIC_SITE_URL: 'http://test.local/',
  });
  assert.equal(config.accepting, true);
  assert.equal(config.email.teamInbox, 'team@test.invalid');
  assert.equal(config.siteUrl, 'http://test.local');
  assert.equal(config.email.provider, 'file');
  assert.equal(config.cronSecret, undefined);
  assert.equal(config.calcom, undefined); // brand-guard-allow: proves the integration is gone
});

test('production refuses the file email provider and a short signing secret', () => {
  Object.assign(process.env, {
    ENQUIRY_MODE: 'live',
    NODE_ENV: 'production',
    DATABASE_URL: 'postgres://user@host/db',
    ENQUIRY_SIGNING_SECRET: 'short',
    FROM_EMAIL: 'enquiries@test.invalid',
    ENQUIRY_TEAM_EMAIL: 'team@test.invalid',
    REPLY_TO_EMAIL: 'reply@test.invalid',
    PUBLIC_SITE_URL: 'https://example.invalid',
  });
  assert.throws(() => config.enabled, (e) => /EMAIL_PROVIDER must be "resend" in production/.test(e.message) && /at least 32 characters/.test(e.message));
});

const liveProduction = () =>
  Object.assign(process.env, {
    ENQUIRY_MODE: 'live',
    SITE_ENV: 'production',
    DATABASE_URL: 'postgres://user@host/db',
    ENQUIRY_SIGNING_SECRET: 'x'.repeat(40),
    EMAIL_PROVIDER: 'resend',
    RESEND_API_KEY: 're_test',
    FROM_EMAIL: 'Good Times in Cape Town <info@goodtimesincapetown.co.za>',
    ENQUIRY_TEAM_EMAIL: 'info@goodtimesincapetown.co.za',
    REPLY_TO_EMAIL: 'info@goodtimesincapetown.co.za',
    PUBLIC_SITE_URL: 'https://goodtimesincapetown.co.za',
  });

test('SITE_ENV=production (how the Cloudflare production environment says so) is production: the file provider is refused', () => {
  liveProduction();
  assert.equal(config.isProduction, true);
  assert.equal(config.email.resendApiUrl, 'https://api.resend.com/emails');
  resetConfig();
  process.env.EMAIL_PROVIDER = 'file';
  assert.throws(() => config.enabled, /EMAIL_PROVIDER must be "resend" in production/);
  resetConfig();
  process.env.SITE_ENV = 'preview';
  assert.equal(config.isProduction, false);
});

test('the local-test endpoints (DATABASE_HTTP_ENDPOINT, RESEND_API_URL) are refused in production, live or not', () => {
  liveProduction();
  process.env.DATABASE_HTTP_ENDPOINT = 'http://127.0.0.1:4444/sql';
  process.env.RESEND_API_URL = 'http://127.0.0.1:5555/emails';
  assert.throws(() => config.enabled, (e) => /DATABASE_HTTP_ENDPOINT is for local tests/.test(e.message) && /RESEND_API_URL is for local tests/.test(e.message));
  resetConfig();
  process.env.ENQUIRY_MODE = 'preview';
  assert.throws(() => config.enabled, /DATABASE_HTTP_ENDPOINT is for local tests/);
  resetConfig();
  process.env.SITE_ENV = 'preview';
  assert.equal(config.databaseHttpEndpoint, 'http://127.0.0.1:4444/sql');
  assert.equal(config.email.resendApiUrl, 'http://127.0.0.1:5555/emails');
});

test('a preview that really sends through Resend delivers only to Resend’s test inbox; production, the file provider and local stand-ins are untouched', async () => {
  const { routed } = await import('../lib/email/send.mjs');
  liveProduction();
  assert.equal(config.email.previewSink, '');
  assert.equal(routed('traveller@example.com'), 'traveller@example.com');
  resetConfig();
  process.env.SITE_ENV = 'preview';
  assert.equal(config.email.previewSink, 'delivered@resend.dev');
  assert.equal(routed('traveller@example.com'), 'delivered@resend.dev', 'a real address typed into a public preview never receives mail');
  assert.equal(routed('delivered+e2e-42@resend.dev'), 'delivered+e2e-42@resend.dev', 'the staging browser suite’s own addresses still arrive');
  resetConfig();
  process.env.RESEND_API_URL = 'http://127.0.0.1:5555/emails';
  assert.equal(config.email.previewSink, '', 'the local Resend stand-in sends nowhere, so the Functions tests keep their recipients');
  resetConfig();
  process.env.RESEND_API_URL = 'https://api.resend.com/emails/';
  assert.equal(config.email.previewSink, 'delivered@resend.dev', 'any address that is not a loopback stand-in keeps the sink: it fails closed');
  resetConfig();
  delete process.env.RESEND_API_URL;
  process.env.EMAIL_PROVIDER = 'file';
  assert.equal(config.email.previewSink, '');
});

test('the API’s own responses carry HSTS like the static pages (site/_headers does not reach Functions)', async () => {
  const res = await handle(new Request('http://test.local/api/health'));
  assert.equal(res.headers.get('strict-transport-security'), 'max-age=31536000; includeSubDomains');
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
});
