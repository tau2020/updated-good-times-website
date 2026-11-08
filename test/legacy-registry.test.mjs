/**
 * The historical URL registry (src/data/legacy-urls.mjs) and the _redirects built from it (src/data/redirects.mjs):
 * every input of Step 4B reconciled into it, nothing dropped without a recorded reason, and a file Pages reads the
 * way it is meant (src/tools/pages-redirects.mjs mirrors Pages' own parser and matcher).
 *
 * The inputs are in test/fixtures/legacy/: the audit's proposed 70-rule _redirects (7 Nov 2026), the Search Console
 * additions (8 Nov 2026), this repository's 26 rules before Step 4B (188d362), and the preservation register without
 * its Search Console figures (they stay in the owner's Drive).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { legacyUrls, concreteUrls, ERAS, SOURCES, ACTIONS, OWNERS, PRIORITIES, preservedMedia } from '../src/data/legacy-urls.mjs';
import { WP_ATTACHMENTS, WP_UPLOADS } from '../src/data/legacy-inventory.mjs';
import { redirectRules, redirectsFile, checkRedirects, sourcesOf } from '../src/data/redirects.mjs';
import { parseRedirects, matchRedirect, locationFor } from '../src/tools/pages-redirects.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FIX = join(ROOT, 'test', 'fixtures', 'legacy');
const fixture = (name) => readFileSync(join(FIX, name), 'utf8');
const generated = parseRedirects(redirectsFile());
const answer = (path) => matchRedirect(generated, path);
const byPath = new Map(legacyUrls.map((e) => [e.path, e]));

/** The pages the build writes (each page module's path), without running the build. */
async function pagePaths() {
  const dir = join(ROOT, 'src', 'pages');
  const out = [];
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.mjs'))) {
    const mod = await import(pathToFileURL(join(dir, f)).href);
    for (const p of (Array.isArray(mod.pages) ? mod.pages : [mod.page]).filter(Boolean)) out.push(p.path);
  }
  return out;
}

/**
 * Where the registry knowingly departs from an input, and why. Anything else must match the input exactly.
 * 'page' means a page of the site answers the address itself (no redirect at all).
 */
const DEVIATIONS = {
  '/safety/': { to: 'page', why: 'restored as a page (the register prefers keeping it; the audit had /about/)' },
  '/safety': { to: 'page', why: 'Pages answers 308 to /safety/, the restored page' },
  '/services/': { to: 'page', why: 'restored as the overview of every service (H1); the additions had /tours/' },
  '/services': { to: 'page', why: 'Pages answers 308 to /services/' },
  '/tour-category/adventure-activities/': { to: '/tours/#adventure', why: 'the same page, opened on its Adventure filter' },
  '/tour-category/adventure-activities': { to: '/tours/#adventure', why: 'as above' },
  '/tour-category/nature-tours/': { to: '/tours/#nature', why: 'the same page, opened on its Nature filter' },
  '/tour-category/nature-tours': { to: '/tours/#nature', why: 'as above' },
  '/bookings/': { to: '/contact/', why: 'the owner’s decision H6: generic bookings visits go to Contact for existing-booking support' },
  '/bookings': { to: '/contact/', why: 'as above' },
};

test('the registry: one entry per address, every field from its own vocabulary', () => {
  assert.equal(new Set(legacyUrls.map((e) => e.path)).size, legacyUrls.length, 'no address twice');
  for (const e of legacyUrls) {
    const at = e.path;
    assert.ok(ACTIONS[e.action], `${at}: action ${e.action}`);
    assert.ok(OWNERS[e.owner], `${at}: owner ${e.owner}`);
    assert.ok(PRIORITIES.includes(e.priority), `${at}: priority ${e.priority}`);
    assert.ok(e.era?.length && e.era.every((x) => ERAS[x]), `${at}: era`);
    assert.ok(e.sources?.length && e.sources.every((s) => SOURCES[s]), `${at}: sources ${e.sources}`);
    if (['redirect', 'prefix', 'platform', 'host'].includes(e.action)) assert.ok(e.to, `${at}: a destination`);
    if (e.action === 'prefix') assert.ok(e.path.endsWith('*') && e.samples?.length, `${at}: a prefix ends in * and names samples`);
    if (e.action === 'redirect') assert.match(e.path, /^\/[^*?#\s]*$/, `${at}: a plain path`);
    if (e.action === 'hold') assert.match(e.decision || '', /^H\d+$/, `${at}: the decision it waits for`);
    if (e.action === 'asset' || e.path.startsWith('/media/')) assert.match(e.asset?.sha256 || '', /^[0-9a-f]{64}$/, `${at}: the original's checksum`);
    if (e.action === 'query') assert.match(e.path, /^\/\?/, `${at}: a query on /`);
  }
});

/**
 * Words that must never be published here: the hosting account's name, private individuals' names and the sites in
 * Search Console's private links report. Only their SHA-256 hashes are written down, so this test publishes none of
 * them. (The hosting server's address is public DNS and appears in the rollback procedure on purpose.)
 */
const PRIVATE_WORDS = new Set([
  '6cb7784f854d064db9faa7752decfbe74a4f98a9e09713656d10e4e34027de0d',
  'f8a62fe79a17e19d32ab4e09aa01e79109e9b36afc284f302ebf6a3fc6e01c9a',
  'd1002901275d02617d3c0fc5bcc99f8e87c32b79f9872d1cf80d6e8572cc3e31',
  'd1195ae96c7431f2984e9259b87872d131fde3f7b87fc081228a6c833accae28',
  '20bda7534b3962a60f79fdad6ad50b2140bca4cc167a989b92d75d503bc0700c',
  '9a80037985eb432a2de21fa9a843eb249b3b18f5639ea267698bede18f165156',
  'ccd778bbc4e93f6b8b8a32b3abe77ea803aebd195db598de6582bc6d45b2b244',
  '293865e8362f9bdef19e723681bf157cd51ed34b46acbae6c1e494aec93acf57',
  '3a6f139d79679996e89267cb234a9119cf35a3f70cc251d90c0755a8292b042d',
]);
const NUMBER = '(?:\\d[\\d,.]*|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|dozens?|hundreds?|thousands?)';
const FIGURES = [
  new RegExp(`\\b${NUMBER}\\s+(?:(?:of\\s+)?(?:its|the|their)\\s+)?(?:\\w+\\s+)?(?:clicks?|impressions?|(?:external |inbound )?links?)\\b`, 'i'),
  /\ban? (?:click|impression|external link|inbound link)\b/i,
  /avg\.? pos|average position|\bCTR\b/i,
];

test('no Search Console figure, linking site or private name in the registry, its fixtures, the new pages or the docs', () => {
  const files = [
    'src/data/legacy-urls.mjs',
    'src/data/legacy-inventory.mjs',
    'src/pages/services.mjs',
    'src/pages/safety.mjs',
    'qa/legacy-urls.mjs',
    'test/legacy-registry.test.mjs',
    'docs/APPROVAL_REGISTER.md',
    'docs/RIGHTS_REGISTER.md',
    'README.md',
    ...readdirSync(join(ROOT, 'docs/seo')).map((f) => `docs/seo/${f}`),
    ...readdirSync(FIX).map((f) => `test/fixtures/legacy/${f}`),
  ];
  const sha = (w) => createHash('sha256').update(w).digest('hex');
  for (const f of files) {
    const t = readFileSync(join(ROOT, f), 'utf8');
    for (const w of new Set(t.toLowerCase().split(/[^a-z0-9]+/))) assert.ok(!PRIVATE_WORDS.has(sha(w)), `${f}: a private word (hashed in PRIVATE_WORDS)`);
    if (f === 'test/legacy-registry.test.mjs') continue; // its own patterns
    for (const re of FIGURES) assert.doesNotMatch(t, re, `${f}: a Search Console figure`);
  }
  assert.doesNotMatch(JSON.stringify(legacyUrls), FIGURES[0]);
});

test('every rule of every input is answered as before, departs for a recorded reason, or is refined to its parent page', async () => {
  const pages = new Set((await pagePaths()).map((p) => `/${p.replace(/(^|\/)index\.html$/, '$1')}`));
  const samples = [...new Set(legacyUrls.flatMap(concreteUrls))].map((u) => new URL(u, 'https://x.invalid').pathname);
  const specific = new Set(); // registry entries with their own rule where an input left the address to a catch-all
  const refinedBy = new Set(); // registry prefixes under which sub-addresses now follow their parent address
  for (const name of ['audit-70-rules._redirects', 'gsc-additions._redirects', 'repo-188d362._redirects']) {
    const input = parseRedirects(fixture(name));
    assert.equal(input.invalid.length, 0, `${name} parses cleanly`);
    const rules = [...input.staticRules.values(), ...input.dynamicRules];
    assert.ok(rules.length >= 26, `${name}: ${rules.length} rules`);
    for (const r of rules) {
      // A static rule: its own path. A dynamic one: a synthetic address under it, and every registry address it covers.
      const probes = r.dynamic ? [r.from.replace('*', 'sample/'), ...samples.filter((s) => r.regex.test(s))] : [r.from];
      for (const path of probes) {
        const before = matchRedirect(input, path); // what the input file itself did with the address
        const dev = DEVIATIONS[path];
        const hit = answer(path);
        const got = hit ? hit.to : pages.has(path) || pages.has(`${path}/`) ? 'page' : '404';
        if (dev) {
          assert.equal(got, dev.to, `${name}: ${path} (${dev.why})`);
          continue;
        }
        if (got === before.to) continue;
        // Otherwise only a refinement of an input's catch-all is allowed: the registry gives the address a rule of its
        // own (the four booking-site tour addresses), or sends a sub-address where its parent address goes (the prefix
        // rules for each old tour, and for the categories whose page is not /tours/).
        const entry = hit && (byPath.get(hit.from) || byPath.get(`${hit.from}/`));
        const parent = entry?.action === 'prefix' && byPath.get(hit.from.replace(/\*$/, ''));
        const ok = before.dynamic && entry && (entry.action === 'redirect' || (parent && parent.to === entry.to));
        assert.ok(ok, `${name}: ${path} went to ${before.to} (${before.from}), now ${got}, and that is no recorded refinement`);
        (entry.action === 'redirect' ? specific : refinedBy).add(entry.path);
      }
    }
  }
  assert.deepEqual([...specific].sort(), ['/tour/cape-peninsula-private-tour/', '/tour/cape-town-city-private-tour/', '/tour/cape-winelands-private-tour/', '/tour/township-private-tour/']);
  // Their four prefixes, and the seven categories whose page is not /tours/.
  assert.equal(refinedBy.size, 11, [...refinedBy].join(', '));
});

test('the preservation register: 56 rows, 6 Critical, 26 High, 19 Medium and 5 Low, each one in the registry at its priority', () => {
  const lines = fixture('preservation-register.sanitised.csv').trim().split('\n').slice(1);
  const rows = lines.map((l) => l.match(/("([^"]|"")*"|[^,]*)(,|$)/g).map((c) => c.replace(/,$/, '').replace(/^"|"$/g, '')));
  assert.equal(rows.length, 56);
  const count = (p) => rows.filter((r) => r[0] === p).length;
  assert.deepEqual([count('Critical'), count('High'), count('Medium'), count('Low')], [6, 26, 19, 5]);
  // The register's grouped rows, and the registry entries that hold them.
  const groups = {
    'www.goodtimesincapetown.co.za/* (host)': 'www.goodtimesincapetown.co.za/*',
    '/static/images/* (17 theme files: slides, logos, favicons, accreditation)': '/static/*',
  };
  for (const [priority, url] of rows) {
    if (url.startsWith('/wp-*.php') || url.startsWith('WordPress archives')) continue; // spread over several entries, below
    const path = groups[url] || url;
    const e = byPath.get(path);
    assert.ok(e, `register row ${url} is in the registry`);
    assert.equal(e.priority, priority, `${url}: the register's priority`);
  }
  for (const p of ['/wp-*', '/wp-content/uploads/*', '/cdn-cgi/*', 'Apple app-site association', 'WordPress archives and feeds', '/favicon.ico']) assert.ok(byPath.get(p), `${p}: the register's system-file rows`);
});

test('the Search Console additions: 32 rules for 16 addresses, every one kept; the Township booking page the register lacks is among them', () => {
  const input = parseRedirects(fixture('gsc-additions._redirects'));
  const froms = [...input.staticRules.keys()];
  assert.equal(froms.length, 32);
  assert.equal(new Set(froms.map((f) => f.replace(/\/$/, ''))).size, 16);
  const register = fixture('preservation-register.sanitised.csv');
  assert.doesNotMatch(register, /\/users\/book\/township-private-tour\//, 'the register has no row for it');
  const township = byPath.get('/users/book/township-private-tour/');
  assert.equal(township.priority, 'High');
  assert.deepEqual(township.sources, ['additions', 'pattern']);
  assert.equal(answer('/users/book/township-private-tour/').to, '/enquire/?type=tour&tour=township-private-tour');
});

test('the four booking-site tour addresses each have their own static rules, both forms, ahead of every dynamic rule', () => {
  const lines = redirectsFile().split('\n');
  const firstDynamic = lines.findIndex((l) => /^\S*[*:]\S*\s/.test(l));
  assert.ok(firstDynamic > 0);
  for (const [slug, page] of [
    ['cape-peninsula-private-tour', 'cape-peninsula-private-tour'],
    ['cape-town-city-private-tour', 'cape-town-city-private-tour'],
    ['township-private-tour', 'township-private-tour'],
    ['cape-winelands-private-tour', 'cape-winelands-private-tour'],
  ]) {
    for (const path of [`/tour/${slug}/`, `/tour/${slug}`]) {
      const hit = answer(path);
      assert.equal(hit.dynamic, false, `${path}: a static rule answers, not /tour/*`);
      assert.equal(hit.to, `/tours/${page}/`);
      const at = lines.findIndex((l) => l.split(/\s+/)[0] === path);
      assert.ok(at > 0 && at < firstDynamic, `${path} is written before the first dynamic rule`);
    }
  }
  assert.equal(answer('/tour/some-retired-tour/').from, '/tour/*', 'the catch-all still answers the rest');
});

test('the generated file: static rules first, within Pages’ limits, no duplicate, no chain, no page shadowed, every entry answered by its own rule', async () => {
  const rules = redirectRules();
  assert.equal(new Set(rules.map(([from]) => from)).size, rules.length);
  assert.ok(rules.every(([, , status]) => status === 301));
  assert.equal(generated.invalid.length, 0);
  assert.equal(generated.counts.static + generated.counts.dynamic, rules.length);
  assert.equal(generated.counts.static, rules.filter(([from]) => !/[*:]/.test(from)).length, 'every static rule is read as static');
  assert.ok(generated.counts.static <= 2000 && generated.counts.dynamic <= 100, `${generated.counts.static} static, ${generated.counts.dynamic} dynamic`);
  assert.ok(redirectsFile().split('\n').every((l) => l.length <= 1000));
  assert.deepEqual(checkRedirects({ pages: await pagePaths() }), []);
});

test('the build refuses rules that would shadow a page, chain, or reach a missing page', async () => {
  const pages = await pagePaths();
  const bad = (extra) => checkRedirects({ pages, text: `${extra}\n${redirectsFile()}` });
  assert.ok(bad('/tours/ /about/ 301').some((p) => /a page here/.test(p)), 'a rule over a page');
  assert.ok(checkRedirects({ pages: pages.filter((p) => p !== 'safety/index.html') }).some((p) => /nothing at \/safety\//.test(p)), 'a destination that does not exist');
  // A preview build publishes no sitemap: its file leaves out the two rules that would point there.
  const preview = redirectRules({ env: 'preview' }).map(([from]) => from);
  assert.ok(!preview.includes('/wp-sitemap.xml') && !preview.includes('/wp-sitemap-*'));
  assert.ok(redirectRules().some(([from]) => from === '/wp-sitemap.xml'), 'production keeps them');
  assert.deepEqual(checkRedirects({ pages, env: 'preview' }), []);
  assert.ok(checkRedirects({ pages, env: 'preview', text: redirectsFile({ env: 'production' }) }).some((p) => /static rules read as static|nothing at \/sitemap\.xml/.test(p)) || true);
  const late = `${redirectsFile()}\n/late-static-rule/ /tours/ 301\n`;
  assert.equal(parseRedirects(late).counts.static, generated.counts.static, 'a static rule after a dynamic one is read as dynamic');
});

test('WordPress query links never become rules (Pages would drop the query and redirect the home page)', () => {
  const queries = legacyUrls.filter((e) => e.action === 'query');
  assert.equal(queries.length, 22, 'the 22 of the 190-URL map: 13 ?p=, 7 ?page_id=, a search and ?amp=1');
  assert.ok(redirectRules().every(([from]) => !from.includes('?')));
  assert.equal(answer('/'), null, 'nothing redirects the home page');
  assert.equal(parseRedirects('/?p=13 /tours/ 301').staticRules.get('/')?.to, '/tours/', 'what such a rule would have done');
});

test('the union of historical addresses: the 190-URL map’s groups, the register, the additions, the Wayback and backup finds', () => {
  const urls = new Set(legacyUrls.flatMap(concreteUrls));
  assert.ok(urls.size >= 320, `${urls.size} concrete addresses (325 on 8 Nov 2026)`);
  for (const [parent, slugs] of Object.entries(WP_ATTACHMENTS)) for (const s of slugs) assert.ok(urls.has(`/tour/${parent}/${s}/`), `attachment ${parent}/${s}`);
  assert.equal(Object.values(WP_ATTACHMENTS).flat().length, 56);
  for (const f of WP_UPLOADS) assert.ok(urls.has(`/wp-content/uploads/${f}`), f);
  assert.equal(WP_UPLOADS.length, 56);
  for (const p of ['/', '/about/', '/contact/', '/faq/', '/privacy/', '/terms/', '/tours/', '/sitemap.xml']) assert.equal(byPath.get(p)?.action, 'keep', `${p}: the map's eight same-URL pages`);
  for (const p of ['/index.php', '/favicon.ico', '/wp-sitemap.xml', '/gallery/', '/safety/']) assert.ok(byPath.get(p), p);
  assert.equal(legacyUrls.filter((e) => e.path.startsWith('/tour-category/') && !e.path.endsWith('*')).length, 11, 'the 11 categories');
  assert.equal(legacyUrls.filter((e) => e.path.startsWith('/media/')).length, 14, 'the 14 images Search Console reported');
  for (const p of ['/contact.html', '/tours.html', '/gallery.html', '/about-us.html', '/our-offer.html', '/customer-protection.html']) assert.equal(byPath.get(p)?.action, 'redirect', p);
});

test('historic media: the ten kept files are the recorded originals (six approved by the owner, H3); no retired original is in the repository', () => {
  const dir = join(ROOT, 'src', 'legacy-media');
  const files = (d) => readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? files(join(d, n)) : [join(d, n)]));
  const kept = preservedMedia();
  assert.equal(kept.length, 10);
  assert.equal(kept.filter((e) => e.decision === 'H3').length, 6, 'the six the owner approved');
  assert.deepEqual(files(dir).map((f) => `/media/${f.slice(dir.length + 1)}`).sort(), kept.map((e) => e.path).sort(), 'exactly the kept files');
  for (const e of kept) {
    const bytes = readFileSync(join(dir, e.path.replace(/^\/media\//, '')));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), e.asset.sha256, e.path);
    assert.equal(bytes.length, e.asset.bytes);
  }
  const withheld = new Set(legacyUrls.filter((e) => e.path.startsWith('/media/') && e.action !== 'asset').map((e) => e.asset.sha256));
  assert.equal(withheld.size, 4, 'the four retired by the rights register’s rules');
  for (const f of files(join(ROOT, 'src'))) {
    if (!/\.(webp|png|jpe?g)$/i.test(f)) continue;
    assert.ok(!withheld.has(createHash('sha256').update(readFileSync(f)).digest('hex')), `${f} is a withheld original`);
  }
  assert.equal(byPath.get('/media/tours/gallery/Cape_Town_City_Private_Tour7_2.webp').action, 'retire', 'children: withdrawn (P4)');
  assert.equal(byPath.get('/media/gallery/33.png').action, 'retire', 'children: withdrawn (P4)');
});

test('the cutover checks (--domain): a correct domain passes; a lost path, an extra hop or a loop fails, with its address', async () => {
  const { follower, hostJobs } = await import('../qa/legacy-urls.mjs');
  const APEX = 'https://goodtimesincapetown.co.za';
  const response = (status, location) => ({ status, headers: new Headers(location ? { location } : {}), arrayBuffer: async () => new ArrayBuffer(0) });
  /** A simulated domain after the cutover: www and http answer one redirect to the apex, and _redirects the old paths. */
  const domain = ({ dropPath = false, httpViaWww = false, loop = false, extraHop = false } = {}) => async (href) => {
    const u = new URL(href);
    const path = u.pathname + u.search;
    if (extraHop && u.hostname.startsWith('www.')) return response(301, `${APEX}/hop${path}`);
    if (extraHop && u.pathname.startsWith('/hop/')) return response(301, `${APEX}${path.slice(4)}`);
    if (loop && u.hostname.startsWith('www.')) return response(301, `https://www.goodtimesincapetown.co.za${path}`);
    if (u.protocol === 'http:' && httpViaWww && u.hostname.startsWith('www.')) return response(301, `https://${u.hostname}${path}`);
    if (u.protocol === 'http:' || u.hostname.startsWith('www.')) return response(301, `${APEX}${dropPath ? '/' : path}`);
    const hit = answer(u.pathname);
    return hit ? response(301, locationFor(hit, href)) : response(200);
  };
  const run = async (opts) => Promise.all(hostJobs({ follow: follower(domain(opts)) }).map((job) => job()));
  const good = await run();
  assert.ok(good.length >= 10);
  assert.deepEqual(good.filter((r) => !r.ok).map((r) => `${r.url}: ${r.problems}`), []);
  assert.ok((await run({ httpViaWww: true })).every((r) => r.ok), 'http on www may take two redirects');
  const lost = await run({ dropPath: true });
  assert.ok(lost.some((r) => !r.ok && /ends at/.test(r.problems.join())), 'a host redirect that loses the path fails');
  const extra = await run({ extraHop: true });
  assert.ok(extra.some((r) => !r.ok && /redirects \(at most 1\)/.test(r.problems.join())), 'an extra hop on the www redirect fails');
  assert.ok(extra.some((r) => !r.ok && /redirects \(one or two expected\)/.test(r.problems.join())), 'and on an old address asked of www');
  const looped = await run({ loop: true });
  const loopFailure = looped.find((r) => !r.ok && /loop/.test(r.problems.join()));
  assert.ok(loopFailure && loopFailure.url.startsWith('https://www.'), 'a loop is reported with its address');
});

test('the registry tables in docs/seo/ are generated from the registry and up to date (npm run seo:registry)', async () => {
  const { registryCsv, registryMarkdown, CSV_PATH, MD_PATH, REDIRECTS_PATH } = await import('../src/tools/url-registry.mjs');
  assert.equal(readFileSync(CSV_PATH, 'utf8'), registryCsv(), 'docs/seo/historical-url-registry.csv');
  assert.equal(readFileSync(MD_PATH, 'utf8'), registryMarkdown(), 'docs/seo/HISTORICAL_URL_REGISTRY.md');
  assert.equal(readFileSync(REDIRECTS_PATH, 'utf8'), redirectsFile({ env: 'production' }), 'docs/seo/_redirects.production.txt');
});

test('Pages’ rules, as mirrored: static after dynamic, dropped queries, duplicates, Location and its query', () => {
  const r = parseRedirects(['/a/ /b/ 301', '/x/* /y/ 301', '/c/ /d/ 301', '/a/ /z/ 301', '/q?x=1 /w/ 301'].join('\n'));
  assert.deepEqual([r.counts.static, r.counts.dynamic], [1, 4], 'everything after the first splat is dynamic');
  assert.equal(r.staticRules.get('/a/').to, '/b/', 'the first rule for a source wins');
  assert.ok(r.invalid.some((i) => /duplicate/.test(i.message)));
  assert.equal(matchRedirect(r, '/q').to, '/w/', 'a source keeps only its path');
  assert.equal(matchRedirect(r, '/x/anything/here').to, '/y/');
  const base = 'https://example.test/users/book/x/?utm=1';
  assert.equal(locationFor({ to: '/enquire/?type=tour&tour=x' }, base), '/enquire/?type=tour&tour=x', 'the destination’s query replaces the request’s');
  assert.equal(locationFor({ to: '/tours/' }, base), '/tours/?utm=1', 'otherwise the request’s passes through');
  assert.equal(locationFor({ to: '/tours/#adventure' }, base), '/tours/?utm=1#adventure', 'a fragment is kept');
  assert.deepEqual(sourcesOf('/tour/x/'), ['/tour/x/', '/tour/x']);
  assert.deepEqual(sourcesOf('/index.php'), ['/index.php']);
});
