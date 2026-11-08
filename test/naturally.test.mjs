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
import { guestReviews } from '../src/data/guest-reviews.mjs';
import { esc } from '../src/partials/ui.mjs';

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

test('buttons: the leaf-green tokens as briefed, every pairing at WCAG AA, one pill system with no leaf on it (8 Nov 2026), a 2 px lift and reduced motion', () => {
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
  // No leaf on the pills (the owner's request of 8 Nov 2026): no leaf token, and nothing drawn after a pill's words but
  // the loading ring; the credentials strip draws its own leaf bullets, outside the button system
  assert.doesNotMatch(b, /--btn-leaf|gt-button--plain/, 'no leaf token or leaf opt-out in the button system');
  const afters = b.match(/[^{}]*\.gt-button[^{}]*::(after|before)[^{]*\{/g) || [];
  assert.ok(afters.length > 0 && afters.every((r) => /aria-busy/.test(r)), `only the loading ring is drawn on a pill: ${afters.filter((r) => !/aria-busy/.test(r)).join(' | ')}`);
  assert.doesNotMatch(read('src/assets/css/styles.css'), /var\(--btn-leaf/, 'no sheet reads a button leaf');
  assert.match(b, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?transform: none !important/);
  assert.match(b, /:focus-visible \{\s*outline: 3px solid var\(--btn-focus\);/);
  // Nothing loops but the loading ring, which stops with reduced motion
  assert.equal((b.match(/infinite/g) || []).length, 1);
  assert.match(b, /\.gt-button\[aria-busy='true'\]::after \{[^}]*animation: gt-button-turn 0\.8s linear infinite;/);
  // The medallion pill, the hero's pill and the signature leaf are retired (the leaf at the owner's request of 8 Nov
  // 2026: every former leaf is the green pill): their styles are gone
  const styles = read('src/assets/css/styles.css');
  assert.doesNotMatch(styles, /\.btn-coin|\.btn-champagne|\.hero__cta-sheen/);
  assert.doesNotMatch(b, /\.leaf-btn|--leaf-/);
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
  const block = html.slice(html.indexOf('<section class="lc-memory'), html.indexOf('</section>', html.indexOf('<section class="lc-memory')));
  assert.match(block, /Chapman’s Peak Drive, above Hout Bay/);
  assert.match(block, /A guest’s photograph from a Good Times tour/);
  assert.doesNotMatch(block, new RegExp(`\\b(${guestReviews.map((r) => r.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`));
  assert.match(read('docs/RIGHTS_REGISTER.md'), new RegExp(`\\| ${name} \\|[^\\n]*In use`));
});

test('guest voices (8 Nov 2026): each platform’s own rating and review form, no date; the reviewers’ own words, eight drawn and the rest waiting; no summary, no Read more', () => {
  const html = render('index.html');
  const at = html.indexOf('<section class="voices');
  const sec = html.slice(at, html.indexOf('</section>', at));
  assert.ok(at > 0 && /id="reviews"/.test(sec), 'the chapter keeps the #reviews anchor');
  assert.doesNotMatch(html, /class="stories|story-card|data-stories|voices-proof|voices-postcard|voices-note|In our words|Review summary|summed up/, 'the summaries and the themes in our words are gone');
  // The bar: Tripadvisor's and Google's own figures from the one place each is kept, linked, with their own review forms
  const ta = site.tripadvisor;
  const g = site.google;
  const bar = sec.slice(sec.indexOf('<ul class="rating-bar'), sec.indexOf('</ul>', sec.indexOf('<ul class="rating-bar')));
  assert.equal(ta.reviewCount, 264);
  for (const [name, p] of [['Tripadvisor', ta], ['Google', g]]) {
    assert.ok(bar.includes(`<p class="rating-bar__name">${name} rating</p>`), name);
    assert.ok(bar.includes(`<span class="rating-bar__value">${p.rating.toFixed(1)}</span><span class="visually-hidden"> out of 5</span>`), name);
    assert.ok(bar.includes(`<a class="rating-bar__count" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">${p.reviewCount} reviews<span class="visually-hidden"> on ${name}</span>`), name);
    assert.ok(bar.includes(`href="${esc(p.writeReviewUrl)}" target="_blank" rel="noopener noreferrer">Write a review<span class="visually-hidden"> on ${name}</span>`), name);
  }
  assert.match(ta.writeReviewUrl, /^https:\/\/www\.tripadvisor\.co\.za\/UserReviewEdit-g312659-d19611200-/);
  assert.equal(g.writeReviewUrl, `https://search.google.com/local/writereview?placeid=${g.placeId}`);
  assert.doesNotMatch(bar, /As of|As listed|checked|20\d\d|November/i, 'no date beside the figures (the owner’s instruction)');
  assert.doesNotMatch(sec, new RegExp(`\\b${ta.reviewCount + g.reviewCount}\\b`), 'no total of unlike counts');
  // The cards: the newest eight drawn here; "Load more" takes the rest from the reviews page, which carries them all
  assert.equal((sec.match(/<li class="review-card" data-review-id="/g) || []).length, 8);
  assert.doesNotMatch(sec, /review-card__more|Read more/, 'no Read more on the cards (the owner’s request of 8 Nov 2026)');
  assert.doesNotMatch(sec, /<template data-review-rest>/);
  assert.match(sec, /<div class="review-wall" data-review-wall data-step="8" data-more-from="reviews\/" data-voice>/);
  assert.match(sec, /<button class="btn gt-button gt-button--secondary review-wall__more" type="button" data-review-more hidden>Load more<span class="visually-hidden"> reviews<\/span><\/button>/);
  assert.ok(sec.includes(`<a class="review-wall__all" href="reviews/">See all ${guestReviews.length} reviews</a>`));
  assert.match(sec, /<p class="visually-hidden" role="status" data-review-status><\/p>/);
  const all = render('reviews/index.html');
  const wall = all.slice(all.indexOf('<div class="review-wall"'));
  assert.equal((wall.slice(0, wall.indexOf('<template data-review-rest>')).match(/<li class="review-card" data-review-id="/g) || []).length, 12, 'twelve drawn on the reviews page');
  assert.equal((all.match(/<li class="review-card" data-review-id="/g) || []).length, guestReviews.length, 'every review in the archive');
  for (const [where, html, list] of [['home', sec, guestReviews.slice(0, 8)], ['reviews', all, guestReviews]]) {
    let last = -1;
    for (const r of list) {
      const quote = `<blockquote class="review-card__quote"><p>“${esc(r.title)}”</p></blockquote>`;
      const i = html.indexOf(quote);
      assert.ok(i > last, `${where} ${r.id}: the reviewer’s own title, word for word, newest first`);
      last = i;
      assert.ok(html.includes(`<li class="review-card" data-review-id="${r.id}">`), `${where} ${r.id}: keyed by its review`);
      assert.ok(html.includes(`<time class="review-card__date" datetime="${r.date}" data-review-date>`), `${where} ${r.id}`);
      assert.ok(html.includes(`<span class="review-card__stars" style="--n:${r.rating}" aria-hidden="true"></span><span class="visually-hidden">Rated ${r.rating} out of 5</span>`), `${where} ${r.id}`);
    }
  }
  assert.doesNotMatch(all, /Review summary|summed up|class="themes"/);
  assert.doesNotMatch(sec, /lorem ipsum|placeholder|AggregateRating/i);
  // A tour's own page: its own listing's reviews only
  const peninsula = render('tours/cape-peninsula-private-tour/index.html');
  const own = guestReviews.filter((r) => r.tour === 'cape-peninsula-private-tour');
  assert.equal((peninsula.match(/<li class="review-card" data-review-id="/g) || []).length, own.length);
  for (const r of guestReviews.filter((x) => x.tour !== 'cape-peninsula-private-tour')) assert.ok(!peninsula.includes(`data-review-id="${r.id}"`), `${r.id}: not on the Peninsula’s page`);
});
