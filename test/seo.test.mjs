/**
 * Search signals of the production build (Step 4B, Phase C): every indexable page has its own title and description,
 * one main heading, structured data that parses and names the page, content in the HTML itself (no script needed to
 * read or reach it), and internal links that land on a page directly, never on an address _redirects would bounce.
 * Every page in the sitemap can be reached by links from the home page; the restored pages are among them.
 * (Canonicals, robots and the sitemap's own rules: test/production-build.test.mjs.)
 */
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, statSync, cpSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, dirname, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ENVIRONMENTS, DOMAIN } from '../scripts/cloudflare/project.mjs';
import { parseRedirects, matchRedirect } from '../src/tools/pages-redirects.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = `https://${DOMAIN.apex}`;
let out;
let pages; // path ("/tours/") → html

before(() => {
  const work = mkdtempSync(join(tmpdir(), 'gt-seo-'));
  for (const dir of ['src', 'lib']) cpSync(join(ROOT, dir), join(work, dir), { recursive: true });
  cpSync(join(ROOT, 'package.json'), join(work, 'package.json'));
  execFileSync(process.execPath, ['src/build.mjs'], { cwd: work, env: { ...process.env, ...ENVIRONMENTS.production.vars, VERCEL: '1' }, stdio: 'pipe' });
  out = join(work, 'site');
  process.on('exit', () => rmSync(work, { recursive: true, force: true }));
  const files = (d) => readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? files(join(d, n)) : [join(d, n)]));
  pages = new Map(
    files(out)
      .filter((f) => f.endsWith('.html'))
      .map((f) => [`/${relative(out, f).replace(/(^|\/)index\.html$/, '$1')}`, readFileSync(f, 'utf8')]),
  );
});

const indexable = () => [...pages].filter(([, html]) => /<meta name="robots" content="index,follow">/.test(html));
const title = (html) => /<title>([^<]*)<\/title>/.exec(html)?.[1];
const description = (html) => /<meta name="description" content="([^"]*)">/.exec(html)?.[1];

test('every indexable page has its own title and description; the restored pages’ titles fit in a result', () => {
  const list = indexable();
  assert.ok(list.length >= 22, `${list.length} indexable pages`);
  const titles = list.map(([, h]) => title(h));
  const descriptions = list.map(([, h]) => description(h));
  assert.equal(new Set(titles).size, titles.length, `duplicate titles: ${titles.filter((t, i) => titles.indexOf(t) !== i)}`);
  assert.equal(new Set(descriptions).size, descriptions.length, 'duplicate descriptions');
  for (const [p, h] of list) assert.ok(description(h).length >= 70 && description(h).length <= 230, `${p}: description of ${description(h).length} characters`);
  for (const p of ['/services/', '/safety/']) assert.ok(title(pages.get(p)).replace(/&amp;/g, '&').length <= 60, `${p}: ${title(pages.get(p))}`);
});

test('structured data parses on every page and names the page it is on; breadcrumbs below the home page', () => {
  for (const [p, html] of pages) {
    if (p === '/404.html') continue;
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
    assert.equal(blocks.length, 1, `${p}: one JSON-LD block`);
    const graph = blocks[0]['@graph'];
    const types = graph.map((n) => n['@type']);
    for (const t of ['TravelAgency', 'WebSite', 'WebPage']) assert.ok(types.includes(t), `${p}: ${t}`);
    const node = graph.find((n) => n['@type'] === 'WebPage');
    assert.equal(node.url, `${ORIGIN}${p}`, `${p}: WebPage url`);
    if (p !== '/') {
      const crumbs = graph.find((n) => n['@type'] === 'BreadcrumbList');
      assert.ok(crumbs, `${p}: BreadcrumbList`);
      assert.equal(crumbs.itemListElement.at(-1).item, `${ORIGIN}${p}`, `${p}: the last crumb is the page`);
    }
    assert.doesNotMatch(JSON.stringify(graph), /__SITE__|preview\.goodtimesincapetown\.invalid|pages\.dev/, `${p}: absolute production URLs`);
  }
  const list = JSON.parse(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(pages.get('/services/'))[1])['@graph'].find((n) => n['@type'] === 'ItemList');
  const listed = new Set(list.itemListElement.map((it) => new URL(it.url).pathname));
  for (const it of list.itemListElement) assert.ok(pages.has(new URL(it.url).pathname), `${it.url} is a page`);
  const offerings = [...pages.keys()].filter((p) => /^\/(tours|packages)\/[^/]+\/$/.test(p)).concat('/transfers/');
  assert.ok(offerings.length >= 12);
  for (const p of offerings) assert.ok(listed.has(p), `the services page lists ${p}`);
});

test('the HTML carries the content and the links: one main heading, real text in <main>, navigation in plain links', () => {
  for (const [p, html] of indexable()) {
    assert.equal((html.match(/<h1\b/g) || []).length, 1, `${p}: one h1`);
    const main = /<main\b[^>]*>([\s\S]*?)<\/main>/.exec(html)?.[1] || '';
    const words = main.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<svg[\s\S]*?<\/svg>/g, ' ').replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean);
    assert.ok(words.length >= 60, `${p}: ${words.length} words in <main> without scripts`);
    assert.doesNotMatch(html, /href="javascript:/, `${p}: no script links`);
  }
});

test('internal links land on a page or file directly: none is redirected by _redirects, none is missing', () => {
  const redirects = parseRedirects(readFileSync(join(out, '_redirects'), 'utf8'));
  const problems = [];
  for (const [p, html] of pages) {
    const dir = p === '/404.html' ? '/' : p.endsWith('/') ? p : posix.dirname(p) + '/';
    const base = /<base href="([^"]+)">/.exec(html)?.[1] || dir;
    for (const m of html.matchAll(/<a\b[^>]*\bhref="([^"#][^"]*|#[^"]*)"/g)) {
      const href = m[1];
      if (/^(https?:|mailto:|tel:|#)/.test(href)) continue;
      const url = new URL(href, `https://site.invalid${base}`);
      const path = url.pathname;
      if (matchRedirect(redirects, path)) problems.push(`${p}: links to ${href}, which _redirects sends elsewhere`);
      const file = path.endsWith('/') ? join(out, path, 'index.html') : join(out, path);
      if (!existsSync(file)) problems.push(`${p}: links to ${href}, which is not in the build`);
    }
  }
  assert.deepEqual(problems, []);
});

test('every page of the sitemap is reached by links from the home page, the restored pages included', () => {
  const sitemap = [...readFileSync(join(out, 'sitemap.xml'), 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
  for (const p of ['/services/', '/safety/']) assert.ok(sitemap.includes(p), `${p} in the sitemap`);
  const seen = new Set(['/']);
  const queue = ['/'];
  while (queue.length) {
    const p = queue.shift();
    const html = pages.get(p);
    if (!html) continue;
    for (const m of html.matchAll(/<a\b[^>]*\bhref="([^"]*)"/g)) {
      if (/^(https?:|mailto:|tel:|#)/.test(m[1])) continue;
      const next = new URL(m[1], `https://site.invalid${p}`).pathname;
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  assert.deepEqual(sitemap.filter((p) => !seen.has(p)), [], 'pages no link reaches');
  for (const [p, html] of pages) if (p !== '/404.html') assert.match(html, /<a href="(\.\.\/)*services\/">Services<\/a>[\s\S]*<a href="(\.\.\/)*safety\/">Safety &amp; Trust<\/a>/, `${p}: the footer links both`);
});

test('the 404 page names no canonical and stays out of search', () => {
  const html = pages.get('/404.html');
  assert.doesNotMatch(html, /rel="canonical"/);
  assert.doesNotMatch(html, /property="og:url"/);
  assert.match(html, /<meta name="robots" content="noindex,nofollow">/);
});
