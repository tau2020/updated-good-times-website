#!/usr/bin/env node
/**
 * The historical URL suite: every address in the registry (src/data/legacy-urls.mjs) against a running site, the
 * local Pages runtime or a deployment. It changes nothing (GET requests only).
 *
 *   node qa/legacy-urls.mjs --base=<url> --env=preview|production [--domain] [--out=<file.json>] [--md=<file.md>]
 *
 *   --base    the site: http://127.0.0.1:8788 (wrangler pages dev), https://<branch>.good-times-in-cape-town.pages.dev …
 *   --env     the build deployed there, which decides the robots signals to expect: a preview build is noindex
 *             everywhere; a production build is indexable, except on Cloudflare's own pages.dev addresses
 *   --domain  after the cutover only: also the host redirects, from the live domain: the other host and http answer one
 *             redirect to the same path on the canonical https host (PUBLIC_SITE_URL), and an old address on the other
 *             host reaches its page in two at most
 *
 * For each address: the status and Location of the first response (a redirect is one 301, its Location exactly the
 * registry's destination with Pages' query rule), every hop to the final response (at most 5; a URL seen twice is a
 * loop), the final status, and that the final page is the related one: its canonical path, a topic word in its title
 * (without the " | Good Times" every title ends with) or main heading, and for a booking link a tour the form offers
 * (the browser test, test/e2e/legacy-booking.spec.mjs, checks that it is chosen). A preserved file must match its
 * checksum; a retired or held address must answer 404, without a redirect. Behind Cloudflare Access, set
 * CF_ACCESS_CLIENT_ID and CF_ACCESS_CLIENT_SECRET. Exits 1 when anything fails.
 */
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { legacyUrls, concreteUrls } from '../src/data/legacy-urls.mjs';
import { sourcesOf, inEnv } from '../src/data/redirects.mjs';
import { locationFor } from '../src/tools/pages-redirects.mjs';
import { ENVIRONMENTS, DOMAIN } from '../scripts/cloudflare/project.mjs';

const MAX_HOPS = 5;
const PROBE = 'utm_source=legacy-suite';
/** The canonical origin production builds name (PUBLIC_SITE_URL): the apex unless the owner chooses www (A2). */
const CANONICAL = ENVIRONMENTS.production.vars.PUBLIC_SITE_URL.replace(/\/$/, '');
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&#39;|&rsquo;|’/g, "'").replace(/&quot;/g, '"');
const text = (html, re) => decode((re.exec(html)?.[1] || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());

/** What every concrete address of an entry should do in this environment's build. */
export function casesFor(entry, { env }) {
  const here = inEnv(entry, env);
  const target = entry.to ? new URL(entry.to, 'https://x.invalid') : null;
  const final = target && { status: 200, path: target.pathname, topic: entry.topic };
  const missing = (url) => ({ url, expect: { status: 404 } });
  switch (entry.action) {
    case 'keep':
    case 'page':
      return [here ? { url: entry.path, expect: { status: 200, path: entry.path, topic: entry.topic } } : missing(entry.path)];
    case 'redirect': {
      const urls = [...sourcesOf(entry.path), `${entry.path}?${PROBE}`, ...(entry.samples || [])];
      // An entry for another environment's build (the sitemap redirects in a preview build) is left out of this one.
      return urls.map((url) => (here ? { url, expect: { status: 301, to: entry.to, final } } : missing(url)));
    }
    case 'prefix':
      return (entry.samples || []).map((url) => (here ? { url, expect: { status: 301, to: entry.to, final } } : missing(url)));
    case 'platform':
      return [{ url: entry.path, expect: { status: 308, to: entry.to, final } }];
    case 'asset':
      return [{ url: entry.path, expect: { status: 200, sha256: entry.asset.sha256, type: entry.asset.type } }];
    case 'query':
      return [{ url: entry.path, expect: { status: 200, path: '/', topic: entry.topic } }];
    case 'retire':
    case 'hold':
      return entry.untestable ? [] : concreteUrls(entry).map(missing);
    default:
      return []; // host: --domain only
  }
}

/** Follow an address hop by hop (at most MAX_HOPS redirects); the last response's body is left unread. */
export function follower(get) {
  return async (start, problems) => {
    const hops = [];
    const seen = new Set();
    let url = start;
    let res;
    for (;;) {
      if (seen.has(url)) {
        problems.push(`redirect loop: ${url} again`);
        return { hops, res: null, url };
      }
      seen.add(url);
      res = await get(url);
      const location = res.headers.get('location');
      hops.push({ url, status: res.status, location });
      if (res.status < 300 || res.status >= 400 || !location) return { hops, res, url };
      await res.arrayBuffer();
      if (hops.length > MAX_HOPS) {
        problems.push(`more than ${MAX_HOPS} redirects`);
        return { hops, res: null, url };
      }
      url = new URL(location, url).href;
    }
  };
}

/** Run the suite. */
export async function runLegacySuite({ base, env, domain = false, fetchImpl = fetch, concurrency = 8 }) {
  base = base.replace(/\/+$/, '');
  if (!['preview', 'production'].includes(env)) throw new Error(`--env must be preview or production, not ${env}`);
  const pagesDev = /\.pages\.dev$/i.test(new URL(base).hostname);
  const headers = process.env.CF_ACCESS_CLIENT_ID ? { 'CF-Access-Client-Id': process.env.CF_ACCESS_CLIENT_ID, 'CF-Access-Client-Secret': process.env.CF_ACCESS_CLIENT_SECRET || '' } : {};
  const get = (url) => fetchImpl(url, { redirect: 'manual', headers, signal: AbortSignal.timeout(20_000) });
  const enquireOptions = new Set();
  {
    const res = await get(`${base}/enquire/`);
    const html = await res.text();
    for (const m of html.matchAll(/<option value="([^"]+)"/g)) enquireOptions.add(m[1]);
  }

  /** The robots signals a final HTML page must carry in this environment. */
  const robotsProblems = (res, html, path) => {
    const out = [];
    const header = res.headers.get('x-robots-tag') || '';
    const meta = /<meta name="robots" content="([^"]+)">/.exec(html)?.[1] || '';
    const deliberate = path === '/terms/' || path === '/404.html';
    if (env === 'preview') {
      if (meta !== 'noindex,nofollow') out.push(`preview page with meta robots "${meta}"`);
      if (!/noindex/.test(header)) out.push('preview page without X-Robots-Tag: noindex');
    } else {
      if (!deliberate && meta !== 'index,follow') out.push(`production page with meta robots "${meta}"`);
      if (pagesDev && !/noindex/.test(header)) out.push('production build on pages.dev without X-Robots-Tag: noindex');
      if (!pagesDev && /noindex/.test(header)) out.push(`production build answers X-Robots-Tag "${header}" off pages.dev: it would drop out of search on the domain`);
    }
    return out;
  };

  const follow = follower(get);

  const runCase = async (entry, c) => {
    const problems = [];
    const { hops, res, url } = await follow(`${base}${c.url}`, problems);
    const rel = (h) => ({ ...h, url: h.url.startsWith(base) ? h.url.slice(base.length) || '/' : h.url });
    const result = () => ({ url: c.url, path: entry.path, action: entry.action, priority: entry.priority, ok: problems.length === 0, hops: hops.map(rel), problems });
    const first = hops[0];
    if (first.status !== c.expect.status) problems.push(`status ${first.status}, expected ${c.expect.status}`);
    if (c.expect.to) {
      const want = locationFor({ to: c.expect.to }, `${base}${c.url}`);
      const got = first.location ? new URL(first.location, `${base}${c.url}`) : null;
      const gotRel = got ? `${got.pathname}${got.search}${got.hash}` : null;
      if (gotRel !== want) problems.push(`Location ${first.location}, expected ${want}`);
      const redirects = hops.filter((h) => h.status >= 300 && h.status < 400).length;
      if (redirects !== 1) problems.push(`${redirects} redirects to the final page (one expected)`);
    } else if (first.status >= 300 && first.status < 400) problems.push(`unexpected redirect to ${first.location}`);
    if (!res) return result(); // a loop or too many hops: already reported, and the body is gone
    const finalHop = hops.at(-1);
    const finalExpect = c.expect.final || c.expect;
    const ctype = res.headers.get('content-type') || '';
    let body = null;
    if (c.expect.sha256) {
      const bytes = Buffer.from(await res.arrayBuffer());
      const sha = createHash('sha256').update(bytes).digest('hex');
      if (sha !== c.expect.sha256) problems.push(`checksum ${sha.slice(0, 12)}…, not the original's ${c.expect.sha256.slice(0, 12)}…`);
      if (!ctype.startsWith(c.expect.type)) problems.push(`content-type ${ctype}, expected ${c.expect.type}`);
    } else if (/text\/html/.test(ctype)) body = await res.text();
    else await res.arrayBuffer();
    if (finalHop.status !== finalExpect.status && !(c.expect.to && finalHop.status >= 300 && finalHop.status < 400)) problems.push(`final status ${finalHop.status}, expected ${finalExpect.status}`);
    if (body && finalHop.status === 200 && finalExpect.path) {
      const canonical = /<link rel="canonical" href="([^"]+)">/.exec(body)?.[1];
      const canonicalUrl = canonical ? new URL(canonical) : null;
      if (!canonicalUrl) problems.push('final page has no canonical');
      else {
        if (canonicalUrl.pathname !== finalExpect.path) problems.push(`canonical ${canonical}, expected the path ${finalExpect.path}`);
        if (env === 'production' && canonicalUrl.origin !== CANONICAL) problems.push(`canonical origin ${canonicalUrl.origin}, expected ${CANONICAL}`);
      }
      if (finalExpect.topic) {
        // Every title ends with " | Good Times": without it, a topic cannot match by accident.
        const words = `${text(body, /<title>([\s\S]*?)<\/title>/).replace(/\s*\|\s*Good Times$/, '')} | ${text(body, /<h1\b[^>]*>([\s\S]*?)<\/h1>/)}`;
        if (!words.toLowerCase().includes(finalExpect.topic.toLowerCase())) problems.push(`"${finalExpect.topic}" in neither the title nor the main heading (${words.slice(0, 120)})`);
      }
      problems.push(...robotsProblems(res, body, finalExpect.path));
      // A booking link: the tour it names is one the form offers.
      const finalUrl = new URL(url);
      const tour = finalUrl.searchParams.get('tour') || /^\/users\/book\/([a-z0-9-]+)\/?$/.exec(finalUrl.searchParams.get('next') || '')?.[1];
      if (finalUrl.pathname === '/enquire/' && tour && tour !== 'airport-private-transfer' && !enquireOptions.has(tour)) problems.push(`the form offers no tour "${tour}"`);
    }
    if (c.expect.status === 404 && finalHop.status === 404 && body && !/noindex/.test(body)) problems.push('the 404 page is indexable');
    return result();
  };

  const jobs = legacyUrls.flatMap((entry) =>
    casesFor(entry, { env }).map((c) => () => runCase(entry, c).catch((err) => ({ url: c.url, path: entry.path, action: entry.action, ok: false, hops: [], problems: [err.message] }))),
  );
  if (domain) jobs.push(...hostJobs({ follow }));
  const results = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (next < jobs.length) {
        const i = next++;
        results[i] = await jobs[i]();
      }
    }),
  );
  const failed = results.filter((r) => !r.ok);
  return { ok: failed.length === 0, total: results.length, failed: failed.length, results };
}

/**
 * After the cutover: the other host (www, or the apex if www becomes canonical) and http answer one redirect to the
 * same path on the canonical https host; an old address asked of the other host reaches its page in two at most.
 */
export function hostJobs({ follow }) {
  const canonical = new URL(CANONICAL);
  const other = canonical.hostname === DOMAIN.apex ? DOMAIN.www : DOMAIN.apex;
  const probes = ['/', '/tours/', `/tours/?${PROBE}`];
  const jobs = [];
  const job = (from, check) => async () => {
    const problems = [];
    try {
      const { hops, res } = await follow(from, problems);
      if (res) await res.arrayBuffer();
      check(hops, problems);
      return { url: from, path: 'host', action: 'host', ok: problems.length === 0, hops, problems };
    } catch (err) {
      return { url: from, path: 'host', action: 'host', ok: false, hops: [], problems: [err.message] };
    }
  };
  // The other host over https, and the canonical host over http, take one redirect; http on the other host may take
  // two (Always Use HTTPS, then the host rule). Each ends on the same path and query on the canonical host.
  for (const [origin, most] of [[`https://${other}`, 1], [`http://${canonical.hostname}`, 1], [`http://${other}`, 2]]) {
    for (const p of probes) {
      const want = new URL(p, CANONICAL);
      jobs.push(
        job(`${origin}${p}`, (hops, problems) => {
          if (![301, 308].includes(hops[0].status)) problems.push(`status ${hops[0].status}, expected 301`);
          const redirects = hops.length - 1;
          if (redirects < 1 || redirects > most) problems.push(`${redirects} redirects (at most ${most})`);
          const last = hops.at(-1);
          if (last.status !== 200 || last.url !== want.href) problems.push(`ends at ${last.url} (${last.status}), expected ${want.href}`);
        }),
      );
    }
  }
  // An old address on the other host: host redirect, then the path's own, then the page.
  const old = legacyUrls.find((e) => e.path === '/tour/cape-peninsula-private-tour/');
  jobs.push(
    job(`https://${other}${old.path}`, (hops, problems) => {
      const last = hops.at(-1);
      const redirects = hops.length - 1;
      if (redirects < 1 || redirects > 2) problems.push(`${redirects} redirects (one or two expected)`);
      if (last.status !== 200 || new URL(last.url).href !== new URL(old.to, CANONICAL).href) problems.push(`ends at ${last.url} (${last.status}), expected ${new URL(old.to, CANONICAL).href}`);
    }),
  );
  return jobs;
}

/** A short Markdown report. */
export function markdownReport({ base, env, ok, total, failed, results }) {
  const rows = results.map((r) => `| ${r.ok ? 'pass' : '**FAIL**'} | \`${r.url}\` | ${r.action} | ${r.hops.map((h) => `${h.status}${h.location ? ` → ${h.location}` : ''}`).join(' ; ')} | ${r.problems.join('; ')} |`);
  return [`# Historical URL suite`, '', `${base} (${env} build): ${total - failed} of ${total} pass${ok ? '' : `, ${failed} fail`}.`, '', '| Result | Address | Action | Responses | Problems |', '|---|---|---|---|---|', ...rows, ''].join('\n');
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
  const base = arg('base');
  const env = arg('env');
  if (!base || !env) {
    console.error('usage: node qa/legacy-urls.mjs --base=<url> --env=preview|production [--domain] [--out=<file.json>] [--md=<file.md>]');
    process.exit(2);
  }
  const report = await runLegacySuite({ base, env, domain: process.argv.includes('--domain') });
  if (arg('out')) writeFileSync(arg('out'), JSON.stringify({ base, env, date: new Date().toISOString(), ...report }, null, 2));
  if (arg('md')) writeFileSync(arg('md'), markdownReport({ base, env, ...report }));
  for (const r of report.results.filter((x) => !x.ok)) console.log(`FAIL ${r.url}: ${r.problems.join('; ')}`);
  console.log(`${report.total - report.failed} of ${report.total} historical URL checks pass (${base}, ${env} build)`);
  process.exit(report.ok ? 0 : 1);
}
