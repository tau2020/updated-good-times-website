/**
 * The hero's services (the owner's hero-services brief of 7 Nov 2026): the exact sentence and the four services, the
 * site's own icon set, fonts and tokens; the block beside the hero (inside .hero-shell, after the hero section), so the
 * approved hero itself is unchanged; its sheet and its entrance on the home page only; the crop it is placed by kept in
 * step with the hero's own (styles.css §7); its entrance a segment of the hero's one timeline.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { site } from '../src/data/site.mjs';
import { layout } from '../src/partials/layout.mjs';
import { HERO_HEADLINE, HERO_LEAD, HERO_SERVICES, HERO_ACTIONS, heroServices } from '../src/partials/hero-services.mjs';
import { icon } from '../src/partials/ui.mjs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const dir = new URL('../src/pages/', import.meta.url);
const pages = [];
for (const f of readdirSync(dir).filter((f) => f.endsWith('.mjs')).sort()) {
  const mod = await import(new URL(f, dir));
  pages.push(...(Array.isArray(mod.pages) ? mod.pages : [mod.page]).filter(Boolean));
}
const home = layout(pages.find((p) => p.path === 'index.html'), site);
const text = (html) => html.replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

test('the exact words of the brief: one sentence, four services', () => {
  assert.equal(`${HERO_LEAD.text} ${HERO_LEAD.mark}`, 'Private tours, airport transfers and authentic Cape Town experiences tailored for you.');
  assert.deepEqual(
    HERO_SERVICES.map((s) => [s.icon, s.title, s.text]),
    [
      ['camera', 'Private Tours', 'City, township & cultural experiences'],
      ['van', 'Airport Transfers', 'Reliable, safe & comfortable travel'],
      ['mountain', 'Adventure Add-ons', 'Wine, wildlife, scenic & outdoor experiences'],
      ['group', 'Custom Journeys', 'Personalised tours for individuals, families & groups'],
    ],
  );
  const block = heroServices();
  // The headline first (the owner's choice of 7 Nov 2026): "Good Times" in white, "Start Here!" on its lime swash
  assert.deepEqual(HERO_HEADLINE, { first: 'Good Times', mark: 'Start Here!' });
  assert.ok(block.indexOf('class="hero-headline"') < block.indexOf('class="hero-services__lead"'), 'the headline heads the block');
  assert.match(block, /<span class="hero-headline__line hero-headline__mark"><svg class="hero-headline__swash" [^>]*aria-hidden="true" focusable="false">[\s\S]*?<\/svg><span class="hero-headline__start">Start Here!<\/span><\/span>/);
  assert.equal(text(block.match(/<p class="hero-services__lead"[\s\S]*?<\/p>/)[0]), 'Private tours, airport transfers and authentic Cape Town experiences tailored for you.');
  // "tailored for you." carries the brush mark: decoration, hidden from assistive technology
  assert.match(block, /<span class="hero-services__mark">tailored for you\.<svg class="hero-services__brush" [^>]*aria-hidden="true" focusable="false"/);
  assert.match(block, /<ul class="hero-services__list" role="list" aria-label="What we do">/);
  assert.equal((block.match(/<li class="hero-services__item"/g) || []).length, 4);
  // Its only links are the two calls to action (the owner's choice of 7 Nov 2026), the site's pills, after the services
  assert.deepEqual(HERO_ACTIONS.map((a) => [a.label, a.href]), [['Explore Our Tours', 'tours/'], ['Our Experiences', 'tours/#adventure']]);
  const links = [...block.matchAll(/<a class="([^"]*)" href="([^"]*)">([\s\S]*?)<\/a>/g)].map((m) => [m[1], m[2], m[3].replace(/<[^>]+>/g, '')]);
  assert.deepEqual(links, [
    ['btn gt-button gt-button--primary hero-services__cta', 'tours/', 'Explore Our Tours'],
    ['btn gt-button gt-button--secondary gt-button--on-dark hero-services__cta', 'tours/#adventure', 'Our Experiences'],
  ]);
  assert.ok(block.indexOf('class="hero-services__actions"') > block.indexOf('class="hero-services__list"'), 'after the services');
  assert.doesNotMatch(block, /<button|tabindex/);
});

test('the icons are the site’s own line icons, in the one stroke system', () => {
  for (const s of HERO_SERVICES) {
    const svg = icon(s.icon);
    assert.match(svg, new RegExp(`^<svg class="icon icon--${s.icon} " viewBox="0 0 24 24" aria-hidden="true" focusable="false">`), s.icon);
    assert.doesNotMatch(svg, /fill="(?!none)|<image|<text/, `${s.icon}: line art only`);
  }
});

test('on the home page: the block follows the hero section inside .hero-shell, and the hero section itself is as it was', () => {
  const shell = home.slice(home.indexOf('<div class="hero-shell">'), home.indexOf('<section class="sand-journey"'));
  assert.ok(shell.startsWith('<div class="hero-shell">\n<section class="hero" aria-labelledby="hero-title">'));
  const at = shell.indexOf('<div class="hero-services" data-hero-services>');
  assert.ok(at > 0, 'the block is in the shell');
  const hero = shell.slice(0, at);
  assert.match(hero, /<\/section>\s*$/, 'right after the hero section closes');
  assert.doesNotMatch(hero, /hero-services|tailored for you/, 'nothing added inside the hero section');
  assert.equal((hero.match(/<a /g) || []).length, 0, 'no link in the hero: the leaf gave its place to the headline (7 Nov 2026)');
  assert.match(shell.slice(at), /<\/ul>\s*<div class="hero-services__actions" data-intro>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*$/, 'the shell closes after the block');
  assert.equal((home.match(/Private tours, airport transfers and authentic Cape Town experiences/g) || []).length, 1, 'once');
});

test('its sheet on the home page only; no new font, script or library', () => {
  assert.match(home, /<link rel="stylesheet" href="assets\/css\/hero-services\.css[^"]*">/);
  for (const p of pages.filter((x) => x.path !== 'index.html')) assert.doesNotMatch(layout(p, site), /hero-services/, p.path);
  const css = read('src/assets/css/hero-services.css');
  assert.doesNotMatch(css, /@font-face|@import|url\(/, 'nothing loaded from the sheet');
  for (const [, family] of css.matchAll(/font-family:\s*([^;]+);/g)) assert.match(family, /^var\(--font-(display|body|accent)\)$/, family);
  for (const [, colour] of css.matchAll(/(?:^|[\s;{])(?:color|background|fill):\s*(#[0-9a-f]{3,8})\b/gi)) assert.fail(`a raw colour in place of a token: ${colour}`);
  const scripts = pages.find((p) => p.path === 'index.html').scripts;
  assert.deepEqual(scripts.filter((s) => /hero-services/.test(s)), [], 'its entrance lives in hero.js');
});

test('placed by the hero’s own crop: the focus by shape kept in step with styles.css', () => {
  const styles = read('src/assets/css/styles.css');
  const hs = read('src/assets/css/hero-services.css');
  // styles.css §7: the hero's focus x by shape (50% by default, 66% up to 16:9, 84% up to 8:5), always 75% down
  assert.match(styles, /\.hero \{[\s\S]*?--hero-focus: 50% 75%;/);
  assert.match(styles, /@media \(max-aspect-ratio: 16\/9\) \{\s*\.hero \{\s*--hero-focus: 66% 75%;/);
  assert.match(styles, /@media \(max-aspect-ratio: 8\/5\) \{\s*\.hero \{\s*--hero-focus: 84% 75%;/);
  assert.match(hs, /--hs-fx: 0\.5;/);
  assert.match(hs, /\(max-aspect-ratio: 16\/9\)[^{]*\{\s*\.hero-shell \{\s*--hs-fx: 0\.66;/);
  assert.match(hs, /\(max-aspect-ratio: 8\/5\)[^{]*\{\s*\.hero-shell \{\s*--hs-fx: 0\.84;/);
  // object-fit: cover, 75% from the top, the poster 1280 × 720 (hero-moment-poster)
  assert.match(hs, /--hs-s: max\(calc\(100vw \/ 1280\), calc\(var\(--hs-h\) \/ 720\)\);/);
  assert.match(hs, /bottom: calc\(25% \+ 100 \* var\(--hs-s\)/, 'its foot above the sleeping friend’s hair (poster y 440)');
});

test('its entrance is the hero’s one timeline: the headline at the leaf’s old moment, then the services, in opacity and a small rise', () => {
  const js = read('src/assets/js/hero.js');
  assert.equal((js.match(/gsap\.timeline\(/g) || []).length, 1, 'one timeline');
  assert.doesNotMatch(js, /ScrollTrigger|matchMedia\(\s*\)|SplitText/, 'no trigger, no split');
  assert.match(js, /tl\.addLabel\('headline', 2\.2\);/, 'the headline takes the leaf’s moment');
  assert.match(js, /tl\.addLabel\('services', 'headline\+=0\.45'\);/);
  assert.match(js, /gsap\.set\(headline, \{ opacity: 0, y: 16 \}\)/);
  assert.match(js, /tl\.to\(swash, \{ clipPath: 'inset\(-20% 0% -20% -5%\)', duration: 0\.5/);
  assert.doesNotMatch(js, /hero__cta/, 'the leaf’s act is gone');
  assert.match(js, /gsap\.set\(lead, \{ opacity: 0, y: 14 \}\)/);
  assert.match(js, /gsap\.set\(items, \{ opacity: 0, y: 12 \}\)/);
  assert.doesNotMatch(js.slice(js.indexOf("var services ="), js.indexOf('window.__heroEntrance =')).replace(/if \(cta\)[^\n]*autoAlpha[^\n]*/g, ''), /autoAlpha: 0\b(?![\s\S]*cta)/, 'the services never hidden from assistive technology');
  assert.match(js, /tl\.to\(items, \{ opacity: 1, y: 0, duration: 0\.55, stagger: 0\.12, ease: 'power2\.out'/);
  assert.match(js, /tl\.to\(brush, \{ clipPath: 'inset\(-50% 0% -50% -5%\)', duration: 0\.55/);
});
