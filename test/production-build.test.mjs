/**
 * The site as Cloudflare's production environment would build it (D59): the
 * variables come from scripts/cloudflare/project.mjs. Canonical and social
 * URLs, the sitemap and robots.txt name Good Times' own domain; nothing names
 * another business or the preview placeholder; the pages.dev addresses are
 * kept out of search results. Production is not released: enquiries stay in
 * preview mode and no deployment may go there before the owner approves.
 */
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, statSync, cpSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ENVIRONMENTS, DOMAIN, RELEASE, PROJECT, deployTarget } from '../scripts/cloudflare/project.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = `https://${DOMAIN.apex}`;
let out;

/** Build a copy of the repository with the production variables, so the shared site/ is left alone. */
before(() => {
  const work = mkdtempSync(join(tmpdir(), 'gt-prod-'));
  for (const dir of ['src', 'lib']) cpSync(join(ROOT, dir), join(work, dir), { recursive: true });
  cpSync(join(ROOT, 'package.json'), join(work, 'package.json'));
  const env = { ...process.env, ...ENVIRONMENTS.production.vars, VERCEL: '1' };
  execFileSync(process.execPath, ['src/build.mjs'], { cwd: work, env, stdio: 'pipe' });
  out = join(work, 'site');
  process.on('exit', () => rmSync(work, { recursive: true, force: true }));
});

const files = (dir) => readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? files(join(dir, n)) : [join(dir, n)]));
const html = () => files(out).filter((f) => f.endsWith('.html'));
const read = (p) => readFileSync(join(out, p), 'utf8');

test('production values: Good Times’ own domain, indexable, enquiries still in preview; nothing deploys there before the owner approves', () => {
  const v = ENVIRONMENTS.production.vars;
  assert.equal(ORIGIN, 'https://goodtimesincapetown.co.za');
  assert.equal(v.PUBLIC_SITE_URL, ORIGIN);
  assert.equal(v.SITE_ENV, 'production');
  assert.equal(v.ENQUIRY_MODE, 'preview', 'no live bookings until Good Times’ own database, sending domain and secrets are in place and approved');
  assert.equal(v.FROM_EMAIL, 'Good Times in Cape Town <hello@goodtimesincapetown.co.za>');
  // Notifications and replies go to the mailbox that receives mail today until Good Times confirms hello@ does (A4)
  assert.equal(v.ENQUIRY_TEAM_EMAIL, 'info@goodtimesincapetown.co.za');
  assert.equal(v.REPLY_TO_EMAIL, 'info@goodtimesincapetown.co.za');
  assert.equal(v.ADMIN_EMAILS, 'info@goodtimesincapetown.co.za');
  assert.equal(v.EMAIL_PROVIDER, 'resend');
  for (const [name, env] of Object.entries(ENVIRONMENTS)) {
    for (const value of Object.values(env.vars)) assert.doesNotMatch(value, /japshuttlesandtours|shuttlejap|\banesu\b/i, name); // brand-guard-allow: proves no former operator's address remains
  }
  // The release and the domain wait for the owner: a production deployment is refused, staging is not.
  // The release (A1) is recorded for the project's own production address; the domain cutover (A2) is not
  assert.equal(RELEASE.approved, true);
  assert.match(RELEASE.scope, /not the domain/);
  assert.equal(DOMAIN.approved, false);
  assert.deepEqual(deployTarget(PROJECT.productionBranch), { environment: 'production', alias: PROJECT.productionBranch });
  assert.throws(() => deployTarget(PROJECT.productionBranch, { release: { approved: false } }), /owner has not approved/);
  assert.deepEqual(deployTarget('feature-x'), { environment: 'preview', alias: PROJECT.stagingBranch, url: `https://${PROJECT.stagingBranch}.${PROJECT.name}.pages.dev` });
});

test('every page’s canonical and og:url is its own https://goodtimesincapetown.co.za address; pages are indexable', () => {
  for (const file of html()) {
    const page = readFileSync(file, 'utf8');
    const rel = relative(out, file);
    if (rel === '404.html') continue;
    const path = rel === 'index.html' ? '' : rel.replace(/index\.html$/, '');
    assert.match(page, new RegExp(`<link rel="canonical" href="${ORIGIN}/${path.replace(/[.]/g, '\\.')}">`), rel);
    assert.match(page, new RegExp(`<meta property="og:url" content="${ORIGIN}/${path.replace(/[.]/g, '\\.')}">`), rel);
    assert.match(page, /<meta name="robots" content="index,follow">/, rel);
    assert.doesNotMatch(page, /preview-bar|goodtimesincapetown\.invalid/, `${rel}: no preview banner or placeholder origin`);
  }
});

test('sitemap.xml lists every indexable page on Good Times’ domain, the multi-day tour included; robots.txt points to it', () => {
  const sitemap = read('sitemap.xml');
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert.ok(locs.length >= 20, `${locs.length} URLs`);
  for (const loc of locs) assert.ok(loc.startsWith(`${ORIGIN}/`), loc);
  for (const p of ['', 'tours/', 'tours/cape-peninsula-private-tour/', 'tours/sky-diving/', 'packages/', 'packages/garden-route-private-tour/', 'transfers/', 'destinations/', 'about/', 'reviews/', 'faq/', 'enquire/', 'contact/', 'privacy/']) assert.ok(locs.includes(`${ORIGIN}/${p}`), p || 'home');
  assert.doesNotMatch(sitemap, /design-system|404/, 'the internal pages stay out');
  assert.equal(new Set(locs).size, locs.length, 'no duplicates');
  assert.equal(read('robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${ORIGIN}/sitemap.xml\n`);
});

test('_headers: indexable on the domain, noindex on every pages.dev address, HSTS on', () => {
  const headers = read('_headers');
  assert.doesNotMatch(headers.split('\n\n')[0], /X-Robots-Tag/);
  assert.match(headers, /https:\/\/:project\.pages\.dev\/\*\n {2}X-Robots-Tag: noindex, nofollow/);
  assert.match(headers, /https:\/\/:version\.:project\.pages\.dev\/\*\n {2}X-Robots-Tag: noindex, nofollow/);
  assert.match(headers, /Strict-Transport-Security: max-age=31536000; includeSubDomains/);
});

test('no other business’s name or domain, and no preview placeholder, appears anywhere in the built site', () => {
  const FORMER = /japshuttlesandtours|jap[ -]?shuttles|shuttlejap/i; // brand-guard-allow: the check that keeps the template's earlier operator out
  for (const file of files(out).filter((f) => /\.(html|xml|txt|js|css|json|webmanifest|svg)$/.test(f) || f.endsWith('_headers') || f.endsWith('_redirects'))) {
    const body = readFileSync(file, 'utf8');
    assert.doesNotMatch(body, FORMER, relative(out, file));
    assert.doesNotMatch(body, /goodtimesincapetown\.invalid/, `${relative(out, file)}: the preview placeholder origin`);
  }
});

test('booking links stay on the site; only the verified email addresses are published', () => {
  const contact = read('contact/index.html');
  // Good Times' own addresses (its instruction of 6 Nov 2026): exactly these, never a guessed one
  const mailto = [...new Set([...contact.matchAll(/href="mailto:([^"]+)"/g)].map((m) => m[1]))].sort();
  assert.deepEqual(mailto, ['hello@goodtimesincapetown.co.za', 'stuart@goodtimesincapetown.co.za']);
  const tel = [...new Set([...contact.matchAll(/href="tel:([^"]+)"/g)].map((m) => m[1]))];
  assert.deepEqual(tel, ['+27723768432'], 'the published number');
  assert.doesNotMatch(contact, /wa\.me/, 'no WhatsApp link until Good Times confirms the number takes WhatsApp');
  const pkg = read('packages/garden-route-private-tour/index.html');
  assert.match(pkg, /<form class="enquiry-card" action="\.\.\/\.\.\/enquire\/"/);
  assert.match(read('index.html'), /href="enquire\/\?type=transfer/);
});

test('until Good Times approves them, the booking terms are not published and the privacy notice says it is a draft', async () => {
  const { site } = await import('../src/data/site.mjs');
  const files = html().map((f) => relative(out, f));
  assert.equal(files.includes(join('terms', 'index.html')), site.legal.termsApproved);
  assert.equal(/href="terms\/"/.test(read('index.html')), site.legal.termsApproved, 'the footer links to the terms only once they are published');
  assert.equal(/Draft for Good Times’ approval/.test(read('privacy/index.html')), !site.legal.privacyApproved);
  for (const f of files) assert.doesNotMatch(read(f), /class="pending"/, `${f}: production never shows a pending slot`);
});

test('visit statistics (D79): with no analytics token yet, no production page carries the analytics config, so the choice is never offered; nothing loads the beacon', () => {
  assert.equal(ENVIRONMENTS.production.vars.WEB_ANALYTICS_TOKEN, undefined, 'Good Times has no Web Analytics site token yet');
  assert.equal(ENVIRONMENTS.preview.vars.WEB_ANALYTICS_TOKEN, undefined, 'staging is never counted');
  for (const f of html().map((f) => relative(out, f))) {
    const page = read(f);
    if (!/<body/.test(page)) continue;
    assert.doesNotMatch(page, /<meta name="gt-analytics"/, `${f}: no config without a token`);
    // consent.js is on every page and stays silent without the config.
    assert.match(page, /<script src="(\.\.\/)*assets\/js\/consent\.js" defer><\/script>/, `${f}: consent script`);
    assert.doesNotMatch(page, /cloudflareinsights/, `${f}: no beacon in the HTML`);
  }
  // The policy still names only the beacon file, ready for a token once Good Times adds one.
  assert.match(read('_headers'), /script-src 'self' 'sha256-[^']+' https:\/\/static\.cloudflareinsights\.com\/beacon\.min\.js;/);
});
