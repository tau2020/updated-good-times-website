/**
 * The home hero, "the world has stopped, the memories haven't": the café scene held still (its poster and its film),
 * the one call to action, and the phone gallery (HeroPhoneGallery). What the HTML says before any script runs, where
 * the AI-generated pictures may appear (in the home hero only, and credited as what they are), and that the film's
 * freeze mask lets nothing move on a face. The browser checks are test/e2e/site.spec.mjs › home hero and qa/hero.mjs.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, existsSync, statSync } from 'node:fs';
import { site } from '../src/data/site.mjs';
import { layout } from '../src/partials/layout.mjs';
import { images, generated, ORIGIN_NOTES, creditFor } from '../src/data/images.mjs';
import { tours } from '../src/data/tours.mjs';
import { PHONE_GALLERY } from '../src/partials/phone-gallery.mjs';
import { FACES, FRAME } from '../src/data/hero-scene.mjs';
import { MOVING, WIDTH, HEIGHT, rasterize } from '../src/tools/hero-moment-mask.mjs';

const dir = new URL('../src/pages/', import.meta.url);
const pages = [];
for (const f of readdirSync(dir).filter((f) => f.endsWith('.mjs')).sort()) {
  const mod = await import(new URL(f, dir));
  pages.push(...(Array.isArray(mod.pages) ? mod.pages : [mod.page]).filter(Boolean));
}
const render = (path) => layout(pages.find((p) => p.path === path), site);
const home = render('index.html');
// The hero ends where the next section begins: the sand journey (partials/sand-journey.mjs), then the chapters
const hero = home.slice(home.indexOf('<section class="hero"'), home.indexOf('<section class="sand-journey"'));
const ai = [...images, ...generated].filter((i) => i.origin === 'G');

test('the hero: one h1 for search and screen readers, one call to action to the tours, no paragraph or second action', () => {
  assert.equal((home.match(/<h1\b/g) || []).length, 1);
  assert.match(hero, /<h1 class="visually-hidden" id="hero-title">Good Times in Cape Town: private tours of Cape Town and the Western Cape with local guides, since 2014<\/h1>/);
  const links = [...hero.matchAll(/<a class="([^"]*)" href="([^"]*)"([^>]*)>([\s\S]*?)<\/a>/g)];
  assert.equal(links.length, 1, 'one link in the hero');
  const [, cls, href, attrs, words] = links[0];
  assert.deepEqual([cls, href], ['btn-champagne hero__cta', 'tours/']);
  assert.match(attrs, /data-intro/, 'it takes part in the entrance');
  assert.equal(words.replace(/<[^>]+>/g, ''), 'Find Your Good Time');
  assert.match(words, /<span class="hero__cta-sheen" aria-hidden="true"><\/span>/);
  assert.doesNotMatch(hero, /hero__lead|hero__link|hero__actions|Arrange My Transfer|Explore Tours/);
});

test('the scene: the held frame first (described, preloaded, high priority), then the film, decorative and started only by main.js', () => {
  assert.match(hero, /<img src="assets\/img\/hero-moment-poster-960\.webp" alt="Four friends laughing at a photo on a phone at a café above the Atlantic, Table Mountain behind them, while the fifth sleeps with his head on the table" width="1280" height="720" loading="eager" decoding="async" fetchpriority="high">/);
  assert.match(home, /<link rel="preload" as="image" href="assets\/img\/hero-moment-poster-960\.avif" type="image\/avif" imagesrcset="[^"]*hero-moment-poster-1280\.avif 1280w"/);
  assert.doesNotMatch(home, /cape-point-headland/, 'the earlier hero photograph is gone from the home page');
  const video = /<video class="hero__video"([^>]*)><\/video>/.exec(hero)?.[1] || '';
  for (const a of ['aria-hidden="true"', ' muted', ' playsinline', ' loop', 'preload="none"', 'tabindex="-1"', 'data-mp4="assets/video/hero-moment-1280.mp4"', 'data-webm="assets/video/hero-moment-1280.webm"']) assert.ok(video.includes(a), `video ${a.trim()}`);
  assert.doesNotMatch(video, /\b(autoplay|controls|data-mp4-mobile)\b/);
  for (const f of [site.media.heroFilm.mp4, site.media.heroFilm.webm]) {
    const file = new URL(`../src/${f}`, import.meta.url);
    assert.ok(existsSync(file), f);
    assert.ok(statSync(file).size < 600_000, `${f}: the held picture costs almost nothing`);
  }
});

test('the phone gallery: six real Good Times days in order, the first ready before any script, the rest deferred, a closing copy', () => {
  const g = /<section class="phone-gallery"[\s\S]*?<\/section>/.exec(hero)?.[0] || '';
  assert.ok(g, 'in the hero');
  assert.match(g, /<section class="phone-gallery" id="phone-gallery" data-phone-gallery aria-roledescription="carousel" aria-labelledby="phone-gallery-title"/);
  assert.match(g, /<p class="phone-gallery__title" id="phone-gallery-title">Cape Town Memories<\/p>/);
  assert.match(g, /<span data-phone-count>1<\/span>\/6/);
  // The play/pause key appears only once the gallery actually moves (phone-gallery.js)
  assert.match(g, /<button class="phone-gallery__toggle" type="button" data-phone-toggle aria-label="Pause the photo gallery" hidden>/);
  const items = PHONE_GALLERY.items;
  // Cape Town Memories (media audit, 6 Nov 2026): real photographs of Good Times days, none of them AI-generated or used elsewhere.
  // The last one changed on 6 Nov 2026: traveller 106 went to the home page's moments in place of the goats (the owner's
  // brief, §2.1), so a Peninsula photograph used nowhere else took its place
  assert.deepEqual(items.map((i) => i.id), ['chapmans-peak', 'bo-kaap', 'boulders', 'winelands', 'cape-point', 'peninsula-rocks'], 'the gallery.json order');
  for (const item of items) assert.notEqual(images.find((x) => x.name === item.image)?.origin, 'G', `${item.id}: a real photograph`);
  const slides = [...g.matchAll(/<div class="phone-gallery__slide"([^>]*)>([\s\S]*?)<\/figure>\s*<\/div>/g)];
  assert.equal(slides.length, items.length + 1, 'six photographs and the copy of the first');
  slides.forEach(([, attrs, body], i) => {
    const item = items[i % items.length];
    const copy = i === items.length;
    assert.equal(/aria-hidden="true"/.test(attrs), copy, `slide ${i + 1}: only the copy is hidden`);
    if (!copy) assert.ok(attrs.includes(`role="group" aria-roledescription="slide" aria-label="${i + 1} of ${items.length}: ${item.caption}"`), `slide ${i + 1} label`);
    const wash = `assets/img/${item.image}-ambient.webp`;
    assert.ok(body.includes(i === 0 ? ` src="${wash}" alt=""` : ` data-src="${wash}" alt=""`), `slide ${i + 1}: its colour wash${i ? ', deferred' : ''}`);
    const img = /<img class="phone-gallery__img"([^>]*)>/.exec(body)[1];
    if (i === 0) {
      assert.match(img, new RegExp(`^ src="assets/img/${item.image}-480\\.webp"`));
      assert.match(body, new RegExp(`<source type="image/avif" srcset="assets/img/${item.image}-480\\.avif 480w`));
    } else {
      assert.match(img, /^ src="data:image\/gif;base64,[^"]+" data-src="assets\/img\/[a-z-]+-480\.webp"/);
      assert.doesNotMatch(body, /\ssrcset=/, `slide ${i + 1}: no real source until the script swipes`);
      assert.match(body, /data-srcset="assets\/img\/[a-z-]+-480\.avif 480w/);
    }
    const alt = /alt="([^"]*)"/.exec(img)[1];
    assert.equal(alt, copy ? '' : images.find((x) => x.name === item.image).alt);
    assert.ok(body.includes(`<span>${item.caption}</span>`), `slide ${i + 1}: its place`);
  });
  for (const item of items) assert.ok(tours.some((t) => t.slug === item.tour), `${item.id}: belongs to a real Good Times tour`);
});

test('the lift: one Enlarge button over the phone’s photo area, hidden until the script runs it; each slide says what the enlarged photograph shows', () => {
  const g = /<section class="phone-gallery"[\s\S]*?<\/section>/.exec(hero)?.[0] || '';
  assert.match(g, /<button class="phone-gallery__open" type="button" data-phone-open aria-haspopup="dialog" aria-label="Enlarge photo 1 of 6: Chapman’s Peak Drive" hidden><\/button>/);
  const slides = [...g.matchAll(/<div class="phone-gallery__slide"([^>]*)>/g)].map((m) => m[1]);
  const items = PHONE_GALLERY.items;
  slides.forEach((attrs, i) => {
    const item = items[i % items.length];
    const t = tours.find((x) => x.slug === item.tour);
    assert.ok(attrs.includes(`data-place="${item.caption}" data-tour="${t.shortTitle}" data-tour-href="tours/${t.slug}/" data-credit="${creditFor(item.image)}"`), `slide ${i + 1}: ${attrs}`);
  });
  // The dialog is made by the script, outside the hero: the hero's one link stays the call to action
  assert.doesNotMatch(home, /class="pg-zoom/);
});

test('the AI-generated pictures appear in the home hero and at the sand journey’s destination only, and the credits say what they are', () => {
  // Since the media audit (6 Nov 2026) only two: the café scene's held frame and the sand journey's film (its poster);
  // the phone's AI pictures gave way to real photographs
  assert.deepEqual(ai.map((i) => i.name).sort(), ['beach-film-poster', 'hero-moment-poster']);
  const uses = (html) => ai.filter((i) => html.includes(`assets/img/${i.name}-`)).map((i) => i.name);
  for (const p of pages.filter((p) => p.path !== 'index.html')) {
    const html = layout(p, site);
    assert.deepEqual(uses(html.slice(html.indexOf('<main'), html.indexOf('</main>'))), [], p.path);
  }
  // Below the hero: the owner's destination film in the sand journey (6 Nov 2026), and nothing AI-made in the chapters
  const sand = home.indexOf('<section class="sand-journey"');
  const chapters = home.indexOf('<div class="living-cape"');
  assert.deepEqual(uses(home.slice(sand, chapters)), ['beach-film-poster'], 'the sand journey: its destination only');
  assert.deepEqual(uses(home.slice(chapters)), [], 'nowhere in the chapters');
  assert.match(home.slice(sand, chapters), /<p class="sand-journey__credit">An AI-generated illustration<\/p>/, 'credited beside it');
  assert.equal(ORIGIN_NOTES.G, 'An AI-generated illustration supplied by Good Times in Cape Town, not a photograph of guests');
  const privacy = render('privacy/index.html');
  assert.match(privacy, /the café scene at the top of the home page is an AI-generated illustration of five friends/);
  assert.match(privacy, /the short film of the woman standing at the water’s edge after the footprints below it is AI-generated too/);
  for (const i of ai) assert.ok(privacy.includes(`<li>${i.alt}: ${ORIGIN_NOTES.G}</li>`), `${i.name} credited`);
});

test('the freeze mask lets only the cloud and the sea move, at least 12 px clear of every face', () => {
  assert.deepEqual([WIDTH, HEIGHT], [FRAME.width, FRAME.height], 'drawn in the film’s own pixels');
  const pgm = rasterize();
  const px = pgm.subarray(pgm.length - WIDTH * HEIGHT);
  for (const [name, [x0, y0, x1, y1]] of Object.entries(FACES)) {
    let moving = 0;
    for (let y = Math.max(0, y0 - 12); y < Math.min(HEIGHT, y1 + 12); y++) for (let x = Math.max(0, x0 - 12); x < Math.min(WIDTH, x1 + 12); x++) if (px[y * WIDTH + x]) moving++;
    assert.equal(moving, 0, `${name}: no moving pixel on the face or within 12 px of it`);
  }
  assert.equal(MOVING.length, 2, 'the cloud band and the sea');
  const share = px.reduce((n, v) => n + (v > 127), 0) / (WIDTH * HEIGHT);
  assert.ok(share > 0.05 && share < 0.2, `the weather is a small part of the frame (${(share * 100).toFixed(1)}%)`);
});
