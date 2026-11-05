// Security headers stay identical across hosts: vercel.json must match the
// policy that src/build.mjs writes to site/_headers (src/partials/security.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { contentSecurityPolicy, SECURITY_HEADERS, CACHE_RULES, headersFile } from '../src/partials/security.mjs';

const vercel = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
const pageRule = vercel.headers.find((h) => h.source === '/((?!api/).*)');
const get = (rule, key) => rule?.headers.find((h) => h.key === key)?.value;

test('vercel.json page CSP matches the generated policy', () => {
  assert.ok(pageRule, 'page header rule present');
  assert.equal(get(pageRule, 'Content-Security-Policy'), contentSecurityPolicy());
});

test('vercel.json carries every security header with the same value', () => {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) assert.equal(get(pageRule, k), v, k);
});

test('vercel.json cache rules match _headers', () => {
  for (const [path, v] of Object.entries(CACHE_RULES)) {
    const rule = vercel.headers.find((h) => h.source === path.replace('/*', '/(.*)'));
    assert.equal(get(rule, 'Cache-Control'), v, path);
  }
});

test('CSP allows no inline script except the hashed head script, and no third party but the analytics beacon file and its endpoint (D79)', () => {
  const csp = contentSecurityPolicy();
  assert.match(csp, /script-src 'self' 'sha256-[A-Za-z0-9+/=]{44}' https:\/\/static\.cloudflareinsights\.com\/beacon\.min\.js;/);
  assert.match(csp, /connect-src 'self' https:\/\/cloudflareinsights\.com\/cdn-cgi\/rum;/);
  assert.doesNotMatch(csp, /unsafe-eval|\*/);
  // Exactly those two addresses, as full paths (no host-wide source, no trailing slash): the zone's own injected
  // beacon (/beacon.min.js/v…) does not match, so it stays blocked.
  assert.deepEqual(csp.match(/https?:\/\/[^\s;]+/g), ['https://static.cloudflareinsights.com/beacon.min.js', 'https://cloudflareinsights.com/cdn-cgi/rum']);
  assert.doesNotMatch(csp.match(/script-src [^;]+/)[0], /unsafe-inline/);
});

test('_headers marks preview builds noindex; production is indexable on its domain but never on pages.dev', () => {
  assert.match(headersFile({ preview: true }), /X-Robots-Tag: noindex, nofollow/);
  assert.doesNotMatch(headersFile({ preview: true }), /pages\.dev/, 'a preview build is noindex everywhere already');
  const prod = headersFile({ preview: false });
  // The site-wide rule carries no robots header: the custom domain is indexable.
  const site = prod.split('\n\n')[0];
  assert.match(site, /^\/\*\n/);
  assert.doesNotMatch(site, /X-Robots-Tag/);
  // Cloudflare's own addresses (project and per-deployment subdomains) are kept out of search results.
  assert.match(prod, /\nhttps:\/\/:project\.pages\.dev\/\*\n {2}X-Robots-Tag: noindex, nofollow\n/);
  assert.match(prod, /\nhttps:\/\/:version\.:project\.pages\.dev\/\*\n {2}X-Robots-Tag: noindex, nofollow\n/);
});
