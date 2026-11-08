/**
 * "Good Times, Naturally" (qa/surgical-change-report.md, 6 Nov 2026): the global type and button tokens, the removed
 * water chapter, the credentials strip and its verification gate, the owner's Cape Peninsula photograph in one place,
 * and the review cards' honesty rules. Every test reads the source or renders the pages as the build does.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { site } from '../src/data/site.mjs';
import { layout } from '../src/partials/layout.mjs';
import { imageByName } from '../src/data/images.mjs';
import { reviews } from '../src/data/reviews.mjs';

const ROOT = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), 'utf8');
const dir = new URL('../src/pages/', import.meta.url);
const pages = [];
for (const f of readdirSync(dir).filter((f) => f.endsWith('.mjs')).sort()) {
  const mod = await import(new URL(f, dir));
  pages.push(...(Array.isArray(mod.pages) ? mod.pages : [mod.page]).filter(Boolean));
}
const byPath = (p) => pages.find((x) => x.path === p);
const render = (path, s = site) => layout(byPath(path), s);
const CSS = readdirSync(new URL('src/assets/css/', ROOT)).filter((f) => f.endsWith('.css')).map((f) => [f, read(`src/assets/css/${f}`)]);

/** WCAG 2 contrast ratio of two #rrggbb colours */
const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};
const token = (css, name) => (new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})\\b`).exec(css) || [])[1]?.toLowerCase();

test('type: Bricolage Grotesque, DM Sans and Caveat, self-hosted WOFF2 under the OFL, one set of tokens, nothing left of the old faces', () => {
  const tokens = read('src/assets/css/tokens.css');
  assert.match(tokens, /--font-display: 'Bricolage Grotesque', 'Bricolage Grotesque Fallback'/);
  assert.match(tokens, /--font-body: 'DM Sans', 'DM Sans Fallback'/);
  assert.match(tokens, /--font-accent: 'Caveat', 'Caveat Fallback'/);
  for (const t of ['text-hero', 'text-h1', 'text-h2', 'text-h3', 'text-body', 'leading-display', 'leading-body', 'tracking-display']) assert.match(tokens, new RegExp(`--${t}:`), t);
  // The faces: each file exists, is a WOFF2 and carries its licence
  const styles = read('src/assets/css/styles.css');
  for (const [family, file, licence] of [
    ['Bricolage Grotesque', 'BricolageGrotesque.woff2', 'OFL-bricolage-grotesque.txt'],
    ['DM Sans', 'DMSans.woff2', 'OFL-dm-sans.txt'],
    ['DM Sans', 'DMSans-Italic.woff2', 'OFL-dm-sans.txt'],
    ['Caveat', 'Caveat.woff2', 'OFL-caveat.txt'],
  ]) {
    assert.match(styles, new RegExp(`font-family: '${family}';[\\s\\S]*?url\\('\\.\\./fonts/${file}'\\)`), file);
    const bytes = readFileSync(new URL(`src/assets/fonts/${file}`, ROOT));
    assert.equal(bytes.subarray(0, 4).toString('latin1'), 'wOF2', `${file} is WOFF2`);
    assert.match(read(`licenses/${licence}`), /SIL Open Font License, Version 1\.1/, licence);
  }
  // Metric-matched fallbacks, and swap, so nothing reflows badly while the faces load
  for (const f of ['Bricolage Grotesque Fallback', 'DM Sans Fallback', 'Caveat Fallback']) assert.match(styles, new RegExp(`font-family: '${f}';[\\s\\S]*?size-adjust:`), f);
  assert.equal((styles.match(/font-display: swap/g) || []).length, 4);
  // No sheet names a family of its own any more, and the old faces are gone
  for (const [f, css] of CSS) {
    assert.doesNotMatch(css, /Plus Jakarta|'Inter'|--font-serif/, f);
    for (const m of css.matchAll(/font-family:\s*([^;]+);/g)) {
      if (/@font-face/.test(css.slice(Math.max(0, m.index - 120), m.index))) continue;
      assert.match(m[1], /^var\(--(font-(display|body|accent)|lc-(display|ui))\)$|^inherit$/, `${f}: font-family ${m[1]}`);
    }
  }
  assert.ok(!existsSync(new URL('src/assets/fonts/PlusJakartaSans.woff2', ROOT)) && !existsSync(new URL('src/assets/fonts/Inter.woff2', ROOT)));
  // Two faces preloaded on every page, the ones the first screen uses
  const html = render('index.html');
  assert.deepEqual([...html.matchAll(/<link rel="preload" href="assets\/fonts\/([^"]+)"/g)].map((m) => m[1]), ['BricolageGrotesque.woff2', 'DMSans.woff2']);
  // Bricolage has no italic: a heading's <em> is a colour turn, never a faux slant
  assert.match(styles, /:is\(h1, h2, h3, h4\) em \{\s*font-style: normal;/);
  assert.match(styles, /font-synthesis: none;/);
});

test('buttons: the leaf-green tokens as briefed, every pairing at WCAG AA, one pill system with a leaf, a 2 px lift and reduced motion', () => {
  const tokens = read('src/assets/css/tokens.css');
  const want = { 'green-primary': '#147d43', 'green-deep': '#105b35', 'green-hover': '#106638', 'green-leaf-light': '#dff3de', 'green-soft-background': '#eff8f0', 'green-lime-accent': '#c9e970', 'ink-primary': '#10241d', 'surface-white': '#ffffff' };
  for (const [k, v] of Object.entries(want)) assert.equal(token(tokens, k), v, k);
  const c = (a, b) => contrast(token(tokens, a), token(tokens, b));
  assert.ok(c('surface-white', 'green-primary') >= 4.5, 'white on the primary');
  assert.ok(c('surface-white', 'green-hover') >= 4.5, 'white on hover');
  assert.ok(c('surface-white', 'green-deep') >= 4.5, 'white pressed');
  assert.ok(c('green-deep', 'green-leaf-light') >= 4.5, 'Soft Leaf words');
  assert.ok(c('green-primary', 'surface-white') >= 4.5, 'Fresh Air words');
  assert.ok(c('green-primary', 'green-soft-background') >= 4.5, 'green words on the soft ground');
  assert.ok(c('ink-primary', 'surface-white') >= 3 && c('green-lime-accent', 'ink-primary') >= 3, 'focus rings');
  assert.ok(c('surface-white', 'green-lime-accent') < 4.5, 'lime is decoration: never a ground for white words');
  const b = read('src/assets/css/buttons.css');
  assert.match(b, /--btn-radius: 999px;/);
  assert.match(b, /--btn-height-compact: 44px;/);
  assert.match(b, /--btn-height-large: 52px;/);
  assert.match(b, /--btn-lift: -2px;/);
  assert.match(b, /--btn-dur: 200ms;/);
  for (const v of ['primary', 'secondary', 'outline', 'on-image', 'tertiary', 'utility', 'danger']) assert.match(b, new RegExp(`\\.gt-button--${v} \\{`), v);
  assert.match(b, /mask: var\(--btn-leaf\)/, 'the leaf is a mask: no markup carries it');
  assert.match(b, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?transform: none !important/);
  assert.match(b, /:focus-visible \{\s*outline: 3px solid var\(--btn-focus\);/);
  // Nothing loops but the loading rings (the pill's and the leaf's), which stop with reduced motion
  assert.equal((b.match(/infinite/g) || []).length, 2);
  assert.match(b, /\.gt-button\[aria-busy='true'\]::after \{[^}]*animation: gt-button-turn 0\.8s linear infinite;/);
  assert.match(b, /\.leaf-btn\[aria-busy='true'\]::after \{[^}]*animation: gt-button-turn 0\.8s linear infinite;/);
  assert.match(b, /@media \(prefers-reduced-motion: reduce\) \{[^@]*\.leaf-btn\[aria-busy='true'\]::after \{\s*animation: none;/);
  // The signature leaf replaced the medallion pill and the hero's pill (design/button-tokens.md): their styles are gone
  const styles = read('src/assets/css/styles.css');
  assert.doesNotMatch(styles, /\.btn-coin|\.btn-champagne|\.hero__cta-sheen/);
  assert.match(b, /\.leaf-btn \{/);
});

test('the water chapter is gone: no markup, styles, script, timeline or test hook remains, and the coast road is chapter 01', () => {
  const html = render('index.html');
  assert.doesNotMatch(html, /data-sun|lc-sun|lc-water|sun-title|peninsula-bench-view/);
  for (const [f, css] of CSS) assert.doesNotMatch(css, /\.lc-sun|\.lc-water/, f);
  const js = read('src/assets/js/living-cape.js');
  assert.doesNotMatch(js, /data-sun|function water|api\.sun|api\.water|lc-water|gsap\.ticker/);
  // Hero, sand journey, the credentials strip, then the chapters, the coast road first
  const order = [...html.matchAll(/<(section|div) class="(hero|sand-journey|gt-credentials|living-cape)[" ]/g)].map((m) => m[2]);
  assert.deepEqual(order, ['hero', 'sand-journey', 'gt-credentials', 'living-cape']);
  const story = html.slice(html.indexOf('<div class="living-cape"'));
  assert.match(story, /^<div class="living-cape" data-living-cape>\s*<section class="lc-scene lc-scene--road/);
  assert.deepEqual([...story.matchAll(/<span class="lc-mark__num">(\d+)<\/span>/g)].map((m) => m[1]), ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10']);
});

test('credentials: the company’s own statements; the CTGA mark is the association’s own file, in every build now the membership is confirmed', () => {
  const ctga = site.credentials.ctga;
  assert.equal(ctga.verified, true, 'confirmed by the owner on 7 Nov 2026 (APPROVAL_REGISTER T1)');
  assert.equal(ctga.confirmed, '2026-11-07');
  const svg = read(`src/${ctga.logo}`);
  assert.match(svg, /<title>Cape Tourist Guides Association logo/);
  assert.doesNotMatch(svg, /<script|href=|<image|foreignObject/i);
  const strip = (s) => {
    const html = render('index.html', s);
    return html.slice(html.indexOf('<section class="gt-credentials"'), html.indexOf('<div class="living-cape"'));
  };
  const preview = strip({ ...site, preview: true, env: 'preview' });
  const production = strip({ ...site, preview: false, env: 'production' });
  for (const html of [preview, production]) {
    assert.match(html, /Local knowledge\. <em>Professional guiding\.<\/em>/);
    for (const p of site.credentials.points) assert.match(html, new RegExp(p.title));
    assert.match(html, new RegExp(`<img src="${ctga.logo}" alt="Cape Tourist Guides Association"`));
    assert.match(html, /Connected to the Cape’s professional guiding community\./);
    assert.doesNotMatch(html, /Preview only|is-pending|gt-credentials__pending/, 'no review note once confirmed');
  }
  // Were it ever unconfirmed again: a preview build would show it marked "preview only", production would leave it out
  const unconfirmed = { ...site.credentials, ctga: { ...ctga, verified: false } };
  assert.match(strip({ ...site, preview: true, env: 'preview', credentials: unconfirmed }), /Preview only: shown for review until the CTGA membership is confirmed/);
  assert.doesNotMatch(strip({ ...site, preview: false, env: 'production', credentials: unconfirmed }), /ctga|Tourist Guides|Preview only/i);
  // The association is never called an award, and the rating is not in the strip
  assert.doesNotMatch(preview, /award|winner|certified by/i);
  assert.doesNotMatch(preview, /Tripadvisor/);
});

test('the owner’s Cape Peninsula photograph: the original file’s renditions, whole and in its own shape, in one place, with factual alt text', () => {
  const name = 'chapmans-lookout-travellers';
  const img = imageByName(name);
  assert.equal(img.origin, 'O');
  assert.match(img.src, /Cape Peninsula Private Tour - traveller 077\.jpg$/);
  assert.match(img.alt, /Two travellers/);
  assert.match(img.alt, /Chapman’s Peak Drive/);
  assert.doesNotMatch(img.alt, /\b(he|she|his|her)\b/i, 'no pronouns assumed');
  const gen = JSON.parse(read('src/data/images.generated.json'))[name];
  assert.deepEqual([gen.width, gen.height], [2268, 4032]);
  for (const w of gen.widths) for (const ext of ['avif', 'webp']) assert.ok(existsSync(new URL(`src/assets/img/${name}-${w}.${ext}`, ROOT)), `${w}.${ext}`);
  assert.ok(Math.max(...gen.widths) <= gen.width, 'never upscaled');
  // Exactly one placement on the whole site
  const uses = pages.map((p) => [p.path, (render(p.path).match(new RegExp(`<img src="assets/img/${name}-`, 'g')) || []).length]).filter(([, n]) => n);
  assert.deepEqual(uses, [['index.html', 1]]);
  // Shown whole: the frame has the photograph's own proportions and the picture is contained
  const lc = read('src/assets/css/living-cape.css');
  assert.match(lc, /\.lc-memory__frame \{[^}]*aspect-ratio: 2268 \/ 4032;/);
  assert.match(lc, /\.lc-memory__frame img \{[^}]*object-fit: contain;/);
  // Captioned by place, credited, attached to no review and naming nobody
  const html = render('index.html');
  const block = html.slice(html.indexOf('<section class="lc-memory"'), html.indexOf('</section>', html.indexOf('<section class="lc-memory"')));
  assert.match(block, /Chapman’s Peak Drive, above Hout Bay/);
  assert.match(block, /A guest’s photograph from a Good Times tour/);
  assert.doesNotMatch(block, new RegExp(reviews.map((r) => r.author.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')));
  assert.match(read('docs/RIGHTS_REGISTER.md'), new RegExp(`\\| ${name} \\|[^\\n]*In use`));
});

test('reviews: real names and ratings, initials until an approved photo exists, labelled summaries, no stand-in faces, no hard-coded count', () => {
  const html = render('index.html');
  const sec = html.slice(html.indexOf('<section class="stories"'), html.indexOf('</section>', html.indexOf('<section class="stories"')));
  const cards = sec.match(/<li class="story-card"/g) || [];
  assert.equal(cards.length, reviews.length);
  assert.doesNotMatch(sec, /assets\/img\/avatars\//, 'no illustrated stand-in faces');
  assert.equal((sec.match(/class="story-card__initials" aria-hidden="true">/g) || []).length, reviews.length);
  // No reviewer photo is approved and supplied yet (content/reviews-source-audit.md): none is shown
  assert.doesNotMatch(sec, /assets\/img\/reviewers\//);
  for (const r of reviews) {
    assert.match(sec, new RegExp(`href="${r.url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`), r.author);
    assert.ok(!r.quote && !r.excerpt, `${r.author}: no verbatim text without the reviewer’s permission`);
  }
  assert.equal((sec.match(/The review in short, in our words/g) || []).length, reviews.length);
  assert.doesNotMatch(sec, /in their words|“/, 'no claim that the words are the reviewers’');
  // The listing's rating and its number of reviews (the owner's request of 8 Nov 2026), dated with the day both were read
  assert.match(sec, new RegExp(`Rated ${site.tripadvisor.rating.toFixed(1)} out of 5 on Tripadvisor`));
  assert.match(sec, new RegExp(`Number of reviews on <span>Tripadvisor: <strong>${site.tripadvisor.reviewCount}</strong></span>`));
  assert.equal(site.tripadvisor.reviewCount, 264);
  assert.match(sec, /As listed on 8 November 2026/);
  // Several visible at once without JavaScript: the grid is collapsed only by the script
  assert.doesNotMatch(sec, /class="stories__grid is-collapsed"/);
  assert.match(sec, /data-stories-more hidden/);
});
