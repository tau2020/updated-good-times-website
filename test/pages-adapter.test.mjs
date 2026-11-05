/**
 * The Pages Function adapter's two platform duties, in Node (the full
 * round trip in workerd is test/pages-functions.test.mjs): bindings into
 * process.env, and the trusted client address.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.VERCEL = '1'; // never read a developer's .env here
const { bridgeEnv, withTrustedIp } = await import('../functions/api/[[path]].js');

test('bridgeEnv copies string bindings, never overrides a value already set, and skips non-string bindings', () => {
  const target = { ENQUIRY_MODE: 'preview' };
  bridgeEnv({ ENQUIRY_MODE: 'live', DATABASE_URL: 'postgres://u@h/d', ASSETS: { fetch() {} }, COUNT: 3 }, target);
  assert.deepEqual(target, { ENQUIRY_MODE: 'preview', DATABASE_URL: 'postgres://u@h/d' });
  bridgeEnv(undefined, target);
  assert.equal(Object.keys(target).length, 2);
});

test('withTrustedIp writes CF-Connecting-IP over X-Forwarded-For and X-Real-IP, keeping the method, body and other headers', async () => {
  const req = new Request('https://goodtimesincapetown.co.za/api/enquiries', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'cf-connecting-ip': '198.51.100.9', 'x-forwarded-for': '1.2.3.4, 198.51.100.9', 'idempotency-key': 'abc' },
    body: '{"a":1}',
  });
  const out = withTrustedIp(req);
  assert.equal(out.headers.get('x-forwarded-for'), '198.51.100.9');
  assert.equal(out.headers.get('x-real-ip'), '198.51.100.9');
  assert.equal(out.headers.get('idempotency-key'), 'abc');
  assert.equal(out.method, 'POST');
  assert.equal(await out.text(), '{"a":1}');
});

test('withTrustedIp leaves a request without CF-Connecting-IP untouched (local server, other hosts)', () => {
  const req = new Request('http://127.0.0.1/api/health', { headers: { 'x-forwarded-for': '10.0.0.1' } });
  assert.equal(withTrustedIp(req), req);
});
