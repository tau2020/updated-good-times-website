#!/usr/bin/env node
/**
 * Checks a deployed Good Times site from the outside, the way a visitor reaches it,
 * and changes nothing (the one POST is an empty body that no mode stores).
 * Run after every deployment; the deploy workflow does.
 *
 *   node scripts/cloudflare/smoke.mjs <url> --env preview|production [--domain]
 *
 *   <url>      the deployment (https://staging.good-times-in-cape-town.pages.dev …)
 *   --env      which environment's settings to expect (scripts/cloudflare/project.mjs)
 *   --domain   also check the domain itself: HTTP → HTTPS, www → apex, TLS
 *
 * Exits 1 when a check fails, listing every result.
 */
import { pathToFileURL } from 'node:url';
import { ENVIRONMENTS, DOMAIN } from './project.mjs';

// The template's earlier operator, which must never be named on this site.
const FORMER_OPERATOR = /jap[ -]?shuttles|japshuttlesandtours/i; // brand-guard-allow: the check that keeps the name out
const PAGES = ['/', '/tours/', '/tours/cape-peninsula-private-tour/', '/tours/sky-diving/', '/packages/', '/packages/garden-route-private-tour/', '/transfers/', '/destinations/', '/about/', '/reviews/', '/faq/', '/enquire/', '/contact/', '/privacy/', '/terms/'];

/**
 * @param {{ url: string, env: 'preview'|'production', domain?: boolean, fetchImpl?: typeof fetch }} opts
 * @returns {Promise<{ ok: boolean, results: { name: string, ok: boolean, detail: string }[] }>}
 */
export async function smoke({ url, env, domain = false, fetchImpl = fetch }) {
  const base = url.replace(/\/+$/, '');
  const vars = ENVIRONMENTS[env]?.vars;
  if (!vars) throw new Error(`unknown environment "${env}"`);
  const production = vars.SITE_ENV === 'production';
  const pagesDev = /\.pages\.dev$/i.test(new URL(base).hostname);
  const results = [];
  const check = async (name, fn) => {
    try {
      const detail = await fn();
      results.push({ name, ok: true, detail: detail || 'ok' });
    } catch (err) {
      results.push({ name, ok: false, detail: err.message });
    }
  };
  const get = (path, init = {}) => fetchImpl(`${base}${path}`, { redirect: 'manual', ...init, signal: AbortSignal.timeout(20_000) });
  const expect = (cond, msg) => {
    if (!cond) throw new Error(msg);
  };

  await check('home page', async () => {
    const res = await get('/');
    expect(res.status === 200, `status ${res.status}`);
    const html = await res.text();
    expect(/<title>Good Times in Cape Town \| /.test(html), 'title missing');
    expect(!FORMER_OPERATOR.test(html), 'another business is named on the page');
    const robots = /<meta name="robots" content="([^"]+)">/.exec(html)?.[1];
    expect(robots === (production ? 'index,follow' : 'noindex,nofollow'), `meta robots ${robots}`);
    const canonical = /<link rel="canonical" href="([^"]+)">/.exec(html)?.[1];
    expect(canonical === `${vars.PUBLIC_SITE_URL}/`, `canonical ${canonical}`);
    return `canonical ${canonical}`;
  });
  await check('search engines', async () => {
    const res = await get('/');
    await res.arrayBuffer();
    const tag = res.headers.get('x-robots-tag');
    // Preview builds are noindex everywhere; production only on Cloudflare's own pages.dev addresses.
    const want = !production || pagesDev;
    expect(want ? /noindex/.test(tag || '') : !tag, `X-Robots-Tag ${tag || 'absent'}`);
    const robots = await (await get('/robots.txt')).text();
    expect(production ? robots.includes(`Sitemap: ${vars.PUBLIC_SITE_URL}/sitemap.xml`) : robots.includes('Disallow: /'), 'robots.txt');
    if (production) {
      const sitemap = await (await get('/sitemap.xml')).text();
      expect(sitemap.includes(`<loc>${vars.PUBLIC_SITE_URL}/packages/garden-route-private-tour/</loc>`), 'sitemap lacks the packages');
    }
    return want ? `noindex (${tag})` : 'indexable';
  });
  await check('security headers', async () => {
    const res = await get('/');
    await res.arrayBuffer();
    for (const h of ['content-security-policy', 'strict-transport-security', 'x-content-type-options']) expect(res.headers.get(h), `${h} missing`);
    expect(res.headers.get('x-frame-options') === 'DENY', 'X-Frame-Options');
    return 'CSP, HSTS, nosniff, DENY';
  });
  for (const path of PAGES.slice(1)) {
    await check(`page ${path}`, async () => {
      const res = await get(path);
      await res.arrayBuffer();
      expect(res.status === 200, `status ${res.status}`);
    });
  }
  await check('current-site address redirect', async () => {
    const res = await get('/tour/garden-route-private-tour/');
    await res.arrayBuffer();
    const to = res.headers.get('location') || '';
    expect(res.status === 301 && /\/packages\/garden-route-private-tour\/$/.test(to), `${res.status} → ${to || 'nowhere'}`);
    return `301 → ${to}`;
  });
  await check('missing page', async () => {
    const res = await get('/no-such-page/');
    await res.arrayBuffer();
    expect(res.status === 404, `status ${res.status}`);
  });
  await check('enquiry API', async () => {
    const health = await get('/api/health');
    expect(health.status === 200, `health ${health.status}`);
    const body = await health.json();
    const mode = vars.ENQUIRY_SYSTEM_ENABLED === 'false' ? 'disabled' : vars.ENQUIRY_MODE;
    expect(body.enquiries === mode, `health says ${body.enquiries}, expected ${mode}`);
    const post = await get('/api/enquiries', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    const answer = await post.json();
    // An empty body is never stored: preview refuses it, live rejects it as invalid.
    if (mode === 'live') expect(post.status === 400 && answer.errors, `live POST {} → ${post.status}`);
    else expect(post.status === 503, `POST {} → ${post.status}`);
    return `${body.enquiries}; POST {} → ${post.status}`;
  });
  await check('hero photograph', async () => {
    const res = await get('/assets/img/cape-point-headland-800.avif');
    const bytes = await res.arrayBuffer();
    expect(res.status === 200 && bytes.byteLength > 1000, `status ${res.status}, ${bytes.byteLength} bytes`);
    expect(/image\/avif/.test(res.headers.get('content-type') || ''), `content-type ${res.headers.get('content-type')}`);
    return `${bytes.byteLength} bytes, ${res.headers.get('content-type')}`;
  });
  await check('email logo', async () => {
    const res = await get('/assets/brand/gt-logo-reversed-email.png');
    await res.arrayBuffer();
    expect(res.status === 200, `status ${res.status}`);
  });
  if (domain) {
    await check('HTTP → HTTPS', async () => {
      const res = await fetchImpl(`http://${DOMAIN.apex}/tours/`, { redirect: 'manual', signal: AbortSignal.timeout(20_000) });
      expect([301, 302, 307, 308].includes(res.status) && res.headers.get('location')?.startsWith(`https://${DOMAIN.apex}/`), `${res.status} → ${res.headers.get('location')}`);
      return `${res.status} → ${res.headers.get('location')}`;
    });
    await check('www → apex', async () => {
      const res = await fetchImpl(`https://${DOMAIN.www}/tours/?from=smoke`, { redirect: 'manual', signal: AbortSignal.timeout(20_000) });
      expect(res.status === 301 && res.headers.get('location') === `https://${DOMAIN.apex}/tours/?from=smoke`, `${res.status} → ${res.headers.get('location')}`);
      return `301 → ${res.headers.get('location')}`;
    });
  }
  return { ok: results.every((r) => r.ok), results };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const argv = process.argv.slice(2);
  const url = argv.find((a) => /^https?:\/\//.test(a));
  const env = argv[argv.indexOf('--env') + 1];
  if (!url || !argv.includes('--env')) {
    console.error('usage: node scripts/cloudflare/smoke.mjs <url> --env preview|production [--domain]');
    process.exit(2);
  }
  const { ok, results } = await smoke({ url, env, domain: argv.includes('--domain') });
  for (const r of results) console.log(`${r.ok ? '✓' : '✗'} ${r.name.padEnd(48)} ${r.detail}`);
  console.log(ok ? `\nall ${results.length} checks passed on ${url}` : `\n${results.filter((r) => !r.ok).length} of ${results.length} checks failed on ${url}`);
  process.exitCode = ok ? 0 : 1;
}
