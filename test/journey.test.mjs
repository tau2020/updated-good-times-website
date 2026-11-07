/**
 * The owner's brief of 6 Nov 2026 ("surgical enhancement"), its non-negotiables in the built pages: the signature leaf
 * (ui.mjs › leafButton, design/button-tokens.md), the three primary calls to action, the Cape Peninsula entrance's exact
 * words and the plug-ins it loads (design/motion-bible.md §4), and the photograph corrections
 * (reports/client-corrections.md): each corrected photograph in one place only, the goats gone, the disliked transfer
 * photograph nowhere. The motion itself is tested in a browser (test/e2e/motion.spec.mjs, test/e2e/site.spec.mjs).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { site } from '../src/data/site.mjs';
import { images } from '../src/data/images.mjs';
import { tours } from '../src/data/tours.mjs';
import { layout } from '../src/partials/layout.mjs';
import { leafButton, leafShape, leafDefs, LEAF_PATH, LEAF_STEM, LEAF_VEIN, LEAF_VEINLETS, SIGNATURE_CTA, SIGNATURE_DESC_ID } from '../src/partials/ui.mjs';
import { SAND_WORDS } from '../src/partials/sand-journey.mjs';
import { SERVICES } from '../src/partials/living-cape.mjs';

const dir = new URL('../src/pages/', import.meta.url);
const pages = [];
for (const f of readdirSync(dir).filter((f) => f.endsWith('.mjs')).sort()) {
  const mod = await import(new URL(f, dir));
  pages.push(...(Array.isArray(mod.pages) ? mod.pages : [mod.page]).filter(Boolean));
}
const rendered = pages.map((p) => ({ path: p.path, html: layout(p, site) }));
const home = rendered.find((p) => p.path === 'index.html').html;
const css = (f) => readFileSync(new URL(`../src/assets/css/${f}`, import.meta.url), 'utf8');
/** Every leaf on a page: [opening tag attributes, label]. */
const leaves = (html) => [...html.matchAll(/<a class="leaf-btn([^"]*)"([^>]*)>([\s\S]*?)<\/a>/g)].map((m) => ({ cls: m[1], attrs: m[2], inner: m[3], label: (/<span class="leaf-btn__label">([\s\S]*?)<\/span>$/.exec(m[3]) || [])[1] }));
const text = (s) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
/** Where a photograph is shown in a page's own content (<main>; the concierge and the phone menu repeat the four
    services' photographs on every page as navigation): one entry per <img> of that slot, as page paths. */
const mainOf = (html) => html.slice(html.indexOf('<main'), html.indexOf('</main>'));
const shownOn = (name) => rendered.flatMap((p) => [...mainOf(p.html).matchAll(new RegExp(`<img [^>]*src="(?:\\.\\./)*assets/img/${name}-\\d+\\.`, 'g'))].map(() => p.path));

test('the leaf: one link, its drawing behind its words, hidden from assistive technology and never focusable', () => {
  const a = leafButton({ href: 'tours/', label: 'View the Tours' });
  assert.match(a, /^<a class="leaf-btn" href="tours\/" data-leaf><svg class="leaf-btn__shape" viewBox="0 0 240 64" preserveAspectRatio="none" aria-hidden="true" focusable="false">/);
  assert.match(a, /<span class="leaf-btn__label">View the Tours<\/span><\/a>$/);
  // Its parts, in this order: the focus ring and the body (one outline), the stem, the midrib, the side veins
  const d = [...leafShape().matchAll(/<path class="leaf-btn__(\w+)" d="([^"]+)"/g)].map((m) => [m[1], m[2]]);
  assert.deepEqual(d, [['ring', LEAF_PATH], ['body', LEAF_PATH], ['stem', LEAF_STEM], ['vein', LEAF_VEIN], ['veinlets', LEAF_VEINLETS]]);
  assert.match(leafShape(), /class="leaf-btn__vein" d="[^"]+" pathLength="1"/, 'the midrib draws (a dash offset from 1 to 0)');
  // Sizes, placement classes, extra attributes and the scene that plays its entrance
  assert.match(leafButton({ href: 'x/', label: 'Y', size: 'large compact', cls: 'hero__cta', attrs: 'data-intro', owner: 'hero' }), /^<a class="leaf-btn leaf-btn--large leaf-btn--compact hero__cta" href="x\/" data-leaf data-intro data-leaf-owner="hero">/);
  // Words with markup keep the plain label as the visible text
  assert.match(leafButton({ href: 'x/', label: 'Find Your Good Time', html: 'Find Your <em>Good Time</em>' }), /<span class="leaf-btn__label">Find Your <em>Good Time<\/em><\/span>/);
  // The signature is described wherever it appears
  assert.match(leafButton({ href: 'enquire/', label: SIGNATURE_CTA }), new RegExp(`aria-describedby="${SIGNATURE_DESC_ID}"`));
  assert.doesNotMatch(leafButton({ href: 'x/', label: 'Arrange My Transfer' }), /aria-describedby/);
  // Escaped
  assert.match(leafButton({ href: 'a/?b=1&c=2', label: 'A & B' }), /href="a\/\?b=1&amp;c=2"[\s\S]*>A &amp; B<\/span>/);
});

test('every page: one set of leaf gradients after the skip link; every leaf a link with words, never inside a form', () => {
  assert.match(leafDefs(), /^<svg class="leaf-defs" [^>]*aria-hidden="true"[^>]*>/);
  for (const id of ['gt-leaf-fill', 'gt-leaf-fill-hover', 'gt-leaf-vein']) assert.match(leafDefs(), new RegExp(`id="${id}"`));
  for (const { path, html } of rendered) {
    assert.equal((html.match(/class="leaf-defs"/g) || []).length, 1, `${path}: one set of gradients`);
    assert.ok(html.indexOf('class="leaf-defs"') > html.indexOf('class="skip-link'), `${path}: after the skip link`);
    for (const l of leaves(html)) {
      assert.match(l.attrs, /^ href="[^"]+" data-leaf/, `${path}: a link with a destination`);
      assert.ok(l.label && text(l.label).length > 2, `${path}: words in every leaf`);
    }
    for (const form of html.match(/<form\b[\s\S]*?<\/form>/g) || []) assert.doesNotMatch(form, /leaf-btn/, `${path}: a leaf never submits a form`);
  }
});

test('the leaf in the stylesheet: at least 44 px tall at every size, white words, a visible focus ring, forced colours and reduced motion', () => {
  const b = css('buttons.css');
  const px = (name) => Number((new RegExp(`--${name}:\\s*(\\d+)px`).exec(b) || [])[1]);
  for (const n of ['leaf-h', 'leaf-h-large', 'leaf-h-compact']) assert.ok(px(n) >= 44, `${n} is ${px(n)} px`);
  assert.match(b, /\.leaf-btn:focus-visible[^{]*\{[^}]*\}|\.leaf-btn:focus-visible \.leaf-btn__ring/);
  assert.match(b, /@media \(forced-colors: active\)[\s\S]*?\.leaf-btn/);
  assert.match(b, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.leaf-btn/);
  assert.doesNotMatch(b, /\.leaf-btn[^{]*\{[^}]*outline:\s*(?:none|0)\s*;[^}]*\}(?![\s\S]*leaf-btn__ring)/, 'the outline is never removed without the ring');
  // This sheet loads after styles.css, so .leaf-btn's display would show the header's leaf on phones: it must not
  assert.match(b, /@media \(max-width: 39\.99em\) \{\s*\.header-cta\.leaf-btn \{\s*display: none;/);
  assert.match(css('styles.css'), /\.header-cta \{\s*display: none;\s*\}/);
});

test('the primary calls to action: Find Your Good Time to the tours, Plan My Day in the header, Explore the Cape Peninsula Tour at the end of the footprints', () => {
  const all = leaves(home);
  const hero = all.find((l) => /hero__cta/.test(l.cls));
  assert.equal(text(hero.label), 'Find Your Good Time');
  assert.match(hero.attrs, /href="tours\/"/);
  assert.match(home, /Good Times Start Here/i, 'the slogan stays');
  for (const { path, html } of rendered) {
    const header = leaves(html).find((l) => /header-cta/.test(l.cls));
    assert.equal(text(header.label), SIGNATURE_CTA, `${path}: header`);
  }
  const sand = all.find((l) => /sand-journey__cta/.test(l.cls));
  assert.equal(text(sand.label), 'Explore the Cape Peninsula Tour');
  assert.match(sand.attrs, /href="tours\/cape-peninsula-private-tour\/"/, 'the existing tour page, unchanged');
  assert.ok(tours.some((t) => t.slug === 'cape-peninsula-private-tour'));
});

test('the Cape Peninsula entrance: the owner’s words exactly, and its two plug-ins on the home page only, before the scene', () => {
  assert.deepEqual(SAND_WORDS, {
    eyebrow: 'Cape Peninsula · Coastal journey',
    title: 'Look where your footsteps led.',
    line: 'One private day on the coast: big views, the penguins at Boulders and plenty of reasons to stop.',
    cta: 'Explore the Cape Peninsula Tour',
  });
  const s = home.slice(home.indexOf('<section class="sand-journey"'), home.indexOf('</section>', home.indexOf('<section class="sand-journey"')));
  for (const w of Object.values(SAND_WORDS)) assert.ok(text(s).includes(w), w);
  const order = [...home.matchAll(/<script src="assets\/js\/([^"]+)" defer>/g)].map((m) => m[1]);
  for (const plug of ['vendor/CustomEase.min.js', 'vendor/SplitText.min.js']) {
    assert.ok(order.indexOf(plug) > order.indexOf('vendor/gsap.min.js'), plug);
    assert.ok(order.indexOf(plug) < order.indexOf('sand-journey.js'), `${plug} before the scene`);
    assert.ok(order.indexOf(plug) < order.indexOf('hero.js'), `${plug} before the intro (the header leaf's unfurl ease)`);
  }
  for (const { path, html } of rendered.filter((p) => p.path !== 'index.html')) assert.doesNotMatch(html, /CustomEase|SplitText/, `${path}: no plug-in without a purpose`);
  // Static first: the words are plain HTML in the markup (split only by the script, with motion)
  assert.match(s, /<h2 class="sand-journey__title" id="sand-journey-title">Look where your footsteps led\.<\/h2>/);
  const js = readFileSync(new URL('../src/assets/js/sand-journey.js', import.meta.url), 'utf8');
  assert.match(js, /SplitText\.create\(title, \{ type: 'lines,words', mask: 'lines'[^}]*autoSplit: true/);
  assert.match(js, /CustomEase\.create\('peninsulaRise'/);
});

test('the photograph corrections: the goats gone, the disliked transfer photograph nowhere, each corrected photograph in one place only', () => {
  assert.ok(!images.some((i) => /goat/i.test(i.name) || /goat/i.test(i.alt || '')), 'no goat photograph in the library');
  for (const { path, html } of rendered) assert.doesNotMatch(html, /goat/i, `${path}: no goats, no goat caption`);
  // §2.3: the personal photographs the airport transfer showed are gone from the library and every page: the selfie on
  // the home page's Airport Transfers way, and traveller 04 (tried for the transfers banner, retired)
  for (const gone of ['transfer-driver-selfie', 'airport-terminal-arrival']) {
    assert.ok(!images.some((i) => i.name === gone), `${gone} is out of the library`);
    for (const { path, html } of rendered) assert.doesNotMatch(html, new RegExp(gone), `${path}: ${gone}`);
  }
  const once = {
    'guide-selfie-peninsula': 'index.html', // §2.1: the goats' place on the home page (traveller 106)
    'private-guests-arms-raised': 'index.html', // §2.2: the interlude (two guests, arms raised, blue sea)
    'airport-mother-city-welcome': 'transfers/index.html', // §2.3: the transfers banner (traveller 12)
    'airport-meet-and-greet': 'transfers/index.html', // §2.4: the airport transfer's own photograph (meet and greet)
    'bokaap-pink-blue-houses': 'tours/cape-town-city-private-tour/index.html', // §2.6: the City tour (traveller 10)
    'winelands-garden-lunch': 'about/index.html', // §2.5: Meet our team (the previous photograph, restored)
  };
  for (const [name, path] of Object.entries(once)) {
    assert.ok(images.some((i) => i.name === name), `${name} is in the library`);
    assert.deepEqual(shownOn(name), [path], `${name}: shown once, on ${path}`);
  }
  // §2.3: the airport service's own photograph (its way on the home page, the concierge, the phone menu and the enquiry
  // form's first step) is the terminal's welcome banner (traveller 11), not a selfie; nowhere else in the content
  assert.equal(SERVICES.find((x) => x.id === 'airport').image, 'airport-welcome-banner');
  assert.deepEqual([...new Set(shownOn('airport-welcome-banner'))].sort(), ['design-system/index.html', 'enquire/index.html', 'index.html']);
  // §2.4: the transfers banner and the airport departure row are different photographs
  const transfers = rendered.find((p) => p.path === 'transfers/index.html').html;
  const imgIn = (html) => (/<img [^>]*src="(?:\.\.\/)*assets\/img\/([a-z0-9-]+?)-\d+\./.exec(html) || [])[1];
  const banner = imgIn(transfers.slice(transfers.indexOf('<div class="banner__media">')));
  const rowOf = (id) => [...transfers.matchAll(/<article class="row-card"[\s\S]*?<\/article>/g)].map((m) => m[0]).find((a) => a.includes(`transfer=${id}"`));
  const departure = imgIn(rowOf('airport-departure'));
  assert.equal(banner, 'airport-mother-city-welcome');
  assert.ok(departure, 'the airport departure row has its photograph');
  assert.notEqual(departure, banner, 'Transfers and Airport departure differ');
  assert.notEqual(departure, 'airport-meet-and-greet');
});

test('the company statement sits under the logo on every page, exactly as supplied', () => {
  for (const { path, html } of rendered) assert.match(html, /Make Unforgettable Experience In The Mother City/, path);
});
