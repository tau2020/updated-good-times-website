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
import { ctaButton, SIGNATURE_CTA, SIGNATURE_DESC_ID, NAV_CTA } from '../src/partials/ui.mjs';
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
/** Every primary pill on a page: its classes, attributes and words (the former leaves are among them since 8 Nov 2026). */
const pills = (html) => [...html.matchAll(/<a class="btn gt-button gt-button--primary([^"]*)"([^>]*)>([\s\S]*?)<\/a>/g)].map((m) => ({ cls: m[1], attrs: m[2], inner: m[3], label: (/<span>([\s\S]*?)<\/span>$/.exec(m[3]) || [])[1] }));
const text = (s) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
/** Where a photograph is shown in a page's own content (<main>; the concierge and the phone menu repeat the four
    services' photographs on every page as navigation): one entry per <img> of that slot, as page paths. */
const mainOf = (html) => html.slice(html.indexOf('<main'), html.indexOf('</main>'));
const shownOn = (name) => rendered.flatMap((p) => [...mainOf(p.html).matchAll(new RegExp(`<img [^>]*src="(?:\\.\\./)*assets/img/${name}-\\d+\\.`, 'g'))].map(() => p.path));

test('the leaf-shaped buttons are the standard green pill (the owner’s request of 8 Nov 2026): one helper, no leaf drawing anywhere', () => {
  const a = ctaButton({ href: 'tours/', label: 'View the Tours' });
  assert.equal(a, '<a class="btn gt-button gt-button--primary" href="tours/"><span>View the Tours</span></a>');
  // Sizes, placement classes, extra attributes and the scene that plays its entrance
  assert.equal(ctaButton({ href: 'x/', label: 'Y', size: 'large', cls: 'lc-seal', attrs: 'data-intro', owner: 'invite' }), '<a class="btn gt-button gt-button--primary gt-button--large lc-seal" href="x/" data-intro data-cta-owner="invite"><span>Y</span></a>');
  // The signature is described wherever it appears, and only once
  const sig = ctaButton({ href: 'enquire/', label: SIGNATURE_CTA });
  assert.equal((sig.match(new RegExp(`aria-describedby="${SIGNATURE_DESC_ID}"`, 'g')) || []).length, 1);
  assert.doesNotMatch(ctaButton({ href: 'x/', label: 'Arrange My Transfer' }), /aria-describedby/);
  // Escaped
  assert.match(ctaButton({ href: 'a/?b=1&c=2', label: 'A & B' }), /href="a\/\?b=1&amp;c=2"><span>A &amp; B<\/span>/);
  for (const { path, html } of rendered) {
    assert.doesNotMatch(html, /leaf-btn|leaf-defs|gt-leaf-|data-leaf|leaf\.js/, `${path}: no leaf drawing, gradient, hook or script`);
    for (const form of html.match(/<form\b[\s\S]*?<\/form>/g) || []) assert.doesNotMatch(form, /gt-button--primary"[^>]* href=/, `${path}: a link never sits in a form as its action`);
  }
  const b = css('buttons.css');
  assert.doesNotMatch(b, /\.leaf-btn|--leaf-/, 'no leaf component in the button system');
  // This sheet loads after styles.css, so .gt-button's display would show the navbar's pill on phones: it must not
  assert.match(b, /@media \(max-width: 39\.99em\) \{\s*\.header-cta\.gt-button \{\s*display: none;/);
  assert.match(css('styles.css'), /\.header-cta \{\s*display: none;\s*\}/);
});

test('the primary calls to action: Book Your Adventure in the navbar, Explore the Cape Peninsula Tour at the end of the footprints; the hero has its headline', () => {
  const all = pills(home);
  // The owner's choice of 7 Nov 2026: the hero's Find Your Good Time leaf gave its place to the headline
  assert.equal(all.find((l) => /hero__cta/.test(l.cls)), undefined);
  assert.doesNotMatch(home, /Find Your Good Time/);
  assert.match(home, /<p class="hero-headline" data-intro>/);
  assert.match(home, /Good Times Start Here/i, 'the slogan stays');
  for (const { path, html } of rendered) {
    const header = pills(html).find((l) => /header-cta/.test(l.cls));
    assert.equal(text(header.label), NAV_CTA, `${path}: header`);
    assert.match(header.attrs, new RegExp(`aria-describedby="${SIGNATURE_DESC_ID}"`), `${path}: the booking action's description`);
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
