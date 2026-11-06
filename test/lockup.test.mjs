/**
 * The brand lockup (Addendum, 6 Nov 2026): the company statement, exactly as Good Times supplied it, set beneath the
 * approved logo wherever the lockup appears (the header of every page, and the footer); never inside the artwork, and
 * never inside the logo link, whose box the aircraft's dock is measured from. The logo files are untouched. On the home
 * page with motion, the GSAP entrance reveals the statement once the logo is whole; without motion it is simply there.
 * The e2e tests (test/e2e/site.spec.mjs › header, and the entrance) check the same on the rendered pages.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { site } from '../src/data/site.mjs';
import { layout } from '../src/partials/layout.mjs';

const STATEMENT = 'Make Unforgettable Experience In The Mother City';
const read = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');
const css = read('assets/css/styles.css');
const tokens = read('assets/css/tokens.css');
const hero = read('assets/js/hero.js');
/** The body of the first rule whose selector line is exactly `selector`, after `from` (an index in `sheet`). */
const rule = (sheet, selector, from = 0) => {
  const at = sheet.indexOf(`\n${selector} {`, from);
  assert.ok(at >= 0, `a rule for ${selector}`);
  return sheet.slice(at, sheet.indexOf('}', at));
};

const dir = new URL('../src/pages/', import.meta.url);
const pages = [];
for (const f of readdirSync(dir).filter((f) => f.endsWith('.mjs')).sort()) {
  const mod = await import(new URL(f, dir));
  pages.push(...(Array.isArray(mod.pages) ? mod.pages : [mod.page]).filter(Boolean));
}
const production = { ...site, preview: false, env: 'production' };

test('the statement is exactly as supplied', () => {
  assert.equal(site.statement, STATEMENT);
});

test('every page’s header: the logo link, then the statement directly beneath it; the link holds only the artwork and the aircraft’s dock', () => {
  for (const x of [site, production]) {
    for (const p of pages) {
      const html = layout(p, x);
      const header = html.slice(html.indexOf('<header'), html.indexOf('</header>'));
      const m = header.match(/<div class="brand-lockup">\s*<a class="brand"[^>]*>([\s\S]*?)<\/a>\s*<p class="brand-lockup__statement" data-intro data-statement>([^<]*)<\/p>\s*<\/div>/);
      assert.ok(m, `${p.path}: the lockup`);
      assert.equal(m[2], STATEMENT, p.path);
      assert.doesNotMatch(m[1], /brand-lockup__statement|Unforgettable/, `${p.path}: the link keeps exactly the logo's box`);
      assert.match(m[1], /<img class="brand__logo brand__logo--ink" src="(?:\.\.\/)*assets\/brand\/gt-logo-compact\.svg" alt="" width="2121" height="564">/, p.path);
      assert.equal((html.match(/class="brand-lockup__statement"/g) || []).length, 2, `${p.path}: the header's and the footer's, nowhere else`);
    }
  }
});

test('the footer: the reversed compact artwork with the statement under it; the full artwork, which carries the logo pack’s older tagline, is not used', () => {
  for (const p of pages) {
    const html = layout(p, site);
    const footer = html.slice(html.indexOf('<footer'), html.indexOf('</footer>'));
    assert.match(
      footer,
      /<div class="brand-lockup brand-lockup--footer">\s*<img src="(?:\.\.\/)*assets\/brand\/gt-logo-reversed-compact\.svg" alt="Good Times in Cape Town" width="2121" height="564"[^>]*>\s*<p class="brand-lockup__statement">Make Unforgettable Experience In The Mother City<\/p>\s*<\/div>/,
      p.path,
    );
    assert.doesNotMatch(html, /gt-logo-reversed\.svg|gt-logo-primary\.svg/, `${p.path}: never two taglines`);
    assert.doesNotMatch(html, /memories in the Mother City/i, `${p.path}: the older tagline is not repeated as text`);
  }
});

test('the logo artwork is untouched: the approved compact files, byte for byte', () => {
  const sha = (f) => createHash('sha256').update(readFileSync(new URL(`../src/assets/brand/${f}`, import.meta.url))).digest('hex');
  assert.equal(sha('gt-logo-compact.svg'), '8210f47bb609c03dd8892e0649586a568190f2d5ae385da34e4f9d4b0ee23457');
  assert.equal(sha('gt-logo-reversed-compact.svg'), 'c6eb11f787b1d9acdcc58e6012ad467fe1ce38cf5444ac45cf64dc5b397fc5f2');
});

test('the statement’s type: DM Sans on one line, sized from the logo’s width (never under 10 px or over 13 px), green as in the logo', () => {
  const st = rule(css, '.brand-lockup__statement');
  for (const d of ['font-family: var(--font-body);', 'font-size: var(--statement-size);', 'font-weight: 600;', 'white-space: nowrap;', 'color: var(--green-primary);']) assert.ok(st.includes(d), d);
  assert.match(css, /--statement-size: clamp\(10px, calc\(var\(--lockup-w\) \/ 25\), 13px\);/);
  // The header's lockup width follows the logo: its height from 40em (2121:564), its width on phones
  assert.match(css, /--lockup-w: calc\(var\(--logo-h, 69\.1px\) \* 3\.7606\);/);
  assert.match(rule(css, '  body', css.indexOf('/* Phones: the lockup takes the row')), /--lockup-w: var\(--brand-w\);/);
  // On dark grounds (the footer, the header over the home film) the reversed logo's own green
  assert.match(tokens, /--logo-green-on-dark: #45e375;/);
  assert.match(rule(css, '.on-dark .brand-lockup__statement'), /color: var\(--logo-green-on-dark\);/);
  assert.match(rule(css, '.site-header--overlay:not(.is-condensed) .brand-lockup__statement'), /color: var\(--logo-green-on-dark\);/);
});

test('the header grows by the statement’s line only, and phones narrower than 360 px leave it out', () => {
  const phones = rule(css, '  body', css.indexOf('/* Phones: the lockup takes the row'));
  assert.match(phones, /--header-h: calc\(var\(--brand-w\) \* 0\.2659 \+ var\(--statement-h\) \+ 14px\);/);
  const narrow = css.slice(css.indexOf('@media (max-width: 22.49em)'));
  assert.match(narrow, /^@media \(max-width: 22\.49em\) \{\s*body \{\s*--statement-h: 0px;\s*\}\s*\.site-header \.brand-lockup__statement \{\s*display: none;/);
  assert.match(css, /@media \(min-width: 40em\) and \(max-width: 63\.99em\) \{\s*body \{\s*--header-h: 96px;/);
  assert.match(tokens, /--header-h: 96px;/);
  // The home page's overlay header already had room: unchanged
  assert.match(css, /\.has-overlay-header \{\s*--header-h: 112px;/);
  // The lockup takes the logo's old place in the row
  assert.match(rule(css, '.brand-lockup'), /flex-shrink: 0;[\s\S]*margin-right: auto;/);
  assert.doesNotMatch(rule(css, '.brand'), /margin-right|flex-shrink/);
});

test('the reveal: GSAP draws the statement in after the logo entrance completes (the landing), on the home page with motion only', () => {
  // Without motion (no html.cine), or off the home page, the script stops before anything is hidden
  assert.match(hero, /if \(!html\.classList\.contains\('cine'\) \|\| !gsap \|\| !document\.body\.classList\.contains\('home'\)\) return finish\(\);/);
  assert.match(hero, /var statement = header && one\('\.brand-lockup__statement', header\);/);
  assert.match(hero, /var staged = \[brand, statement, bookNow\]\.concat\(titles\)\.filter\(Boolean\);\s*gsap\.set\(staged, \{ opacity: 0 \}\);/);
  assert.match(hero, /tl\.addLabel\('statement', plane \? landing \+ 0\.1 : 1\.2\);/);
  assert.match(hero, /tl\.to\(statement, \{ opacity: 1, y: 0, clipPath: 'inset\(-1em 0% -1em -1em\)', duration: 0\.6, ease: 'power2\.out', clearProps: 'transform,clipPath' \}, 'statement'\);/);
  // Until the timeline takes over it is held like the rest of the header's entrance, with the same timed fallback
  assert.match(css, /\.cine:not\(\.intro-ready\) \.home \[data-intro\] \{\s*opacity: 0;[\s\S]*?animation: intro-fallback 1ms linear 2\.8s forwards;/);
});

test('the share image’s description and the emails’ header carry the statement too', async () => {
  const html = layout(pages.find((p) => p.path === 'index.html'), site);
  assert.match(html, /<meta property="og:image:alt" content="The Good Times in Cape Town logo, Table Mountain and a dotted flight path over the name, and beneath it: Make Unforgettable Experience In The Mother City">/);
  const { shell } = await import('../lib/email/layout.mjs');
  const mail = shell({ title: 't', body: '<p>b</p>' });
  assert.match(mail, /gt-logo-reversed-email\.png[^>]*>\s*<\/a>\s*<p style="margin:4px 0 0;[^"]*color:#45e375">Make Unforgettable Experience In The Mother City<\/p>/);
});
