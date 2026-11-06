/**
 * The brand aircraft (partials/aircraft.mjs, assets/js/brand-plane.js): read from the approved lockup, never redrawn.
 * The browser checks (the flight, the landing to the pixel, reduced motion) are test/e2e/motion.spec.mjs.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { logoGeometry, dockBox, subpaths, routeFractions, aircraftFlight, DOCK_PAD } from '../src/partials/aircraft.mjs';
import { site } from '../src/data/site.mjs';
import { layout } from '../src/partials/layout.mjs';

const read = (f) => readFileSync(new URL(`../src/assets/brand/${f}`, import.meta.url), 'utf8');
const ink = read('gt-logo-compact.svg');
const gold = read('gt-logo-reversed-compact.svg');

test('the aircraft is the lockup’s own: the green airliner forming the "i" of "in", with its dotted route from the pin', () => {
  const g = logoGeometry(ink);
  assert.deepEqual([g.width, g.height, g.fill], [2121, 564, '#059A35']);
  assert.deepEqual([g.glyph.box.x0, g.glyph.box.x1, g.glyph.box.y0, g.glyph.box.y1], [974, 1054, 452, 547]);
  assert.equal(g.dots, 35);
  assert.equal(g.route.length, 37, 'pin, 35 dots, the aircraft');
  assert.deepEqual(g.route[0], g.pin);
  assert.deepEqual(g.route.at(-1), [g.glyph.box.cx, g.glyph.box.cy]);
  // The route is a chain: no hop is longer than a few dot spacings (the last one, into the glyph's centre, excepted)
  for (let i = 1; i < g.route.length - 1; i++) assert.ok(Math.hypot(g.route[i][0] - g.route[i - 1][0], g.route[i][1] - g.route[i - 1][1]) < 60);
  // The reversed lockup (over the hero) has the same aircraft and route in its own green
  const r = logoGeometry(gold);
  assert.equal(r.fill, '#45E375');
  assert.equal(r.glyph.d, g.glyph.d);
  assert.deepEqual(r.route, g.route);
});

test('the mask’s hole holds the airliner and nothing else of either lockup', () => {
  const b = logoGeometry(ink).glyph.box;
  const hole = { x0: b.x0 - DOCK_PAD, x1: b.x1 + DOCK_PAD, y0: b.y0 - DOCK_PAD, y1: b.y1 + DOCK_PAD };
  for (const svg of [ink, gold]) {
    for (const m of svg.matchAll(/<path\b[^>]*\sd="([^"]+)"/g)) {
      if (!/^[MLZ0-9.,\s-]+$/.test(m[1])) continue; // the mountain (gradient) path is far above the wordmark
      for (const sp of subpaths(m[1])) {
        const xs = sp.pts.map((p) => p[0]);
        const ys = sp.pts.map((p) => p[1]);
        const inside = Math.max(...xs) >= hole.x0 && Math.min(...xs) <= hole.x1 && Math.max(...ys) >= hole.y0 && Math.min(...ys) <= hole.y1;
        if (inside) assert.equal(sp.d, logoGeometry(ink).glyph.d, 'only the glyph meets the hole');
      }
    }
  }
  const d = dockBox();
  assert.equal(d.viewBox, `${b.x0 - DOCK_PAD} ${b.y0 - DOCK_PAD} ${b.w + 2 * DOCK_PAD} ${b.h + 2 * DOCK_PAD}`);
  assert.match(d.style, /^--dock-x: 45\.827%; --dock-y: 79\.787%; --dock-w: 3\.96%; --dock-h: 17\.553%; --hole-x: 47\.717%; --hole-y: 96\.774%$/);
  assert.ok(routeFractions().every(([x, y]) => x > 0 && x < 1 && y > 0 && y < 1));
});

test('the flight layer: decorative, hidden until the entrance, its landed shape exactly the logo’s glyph', () => {
  const layer = aircraftFlight();
  assert.match(layer, /^<div class="aircraft-flight" data-aircraft-flight data-variant="jet" aria-hidden="true" hidden>/);
  assert.doesNotMatch(aircraftFlight({ preview: true }), /\sid="(?!gt-aircraft-)/, 'only namespaced ids');
  assert.doesNotMatch(layer, /<a\b|<button\b|tabindex/, 'nothing focusable');
  const glyph = logoGeometry(ink).glyph.d.replace(/\s+/g, ' ');
  assert.equal(layer.split(`d="${glyph}"`).length - 1, 1, 'the logo’s own outline, once');
  assert.match(layer, new RegExp(`<path id="gt-aircraft-glyph" d="${glyph.replace(/[.]/g, '\\.')}"/>`));
  assert.equal(layer.split('href="#gt-aircraft-glyph"').length - 1, 3, 'the shadow, the flying airliner and the landed glyph all use it');
  assert.doesNotMatch(layer, /aircraft-flight__prop|data-aircraft-preview/, 'production: the logo’s airliner only');
  const preview = aircraftFlight({ preview: true });
  assert.match(preview, /data-aircraft-preview/);
  assert.match(preview, /class="aircraft-flight__prop"/, 'preview builds: the motion package’s propeller aircraft, the owner’s alternative');
});

test('only the home page carries the aircraft; every other page has the plain logo link', async () => {
  const { readdirSync } = await import('node:fs');
  const dir = new URL('../src/pages/', import.meta.url);
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.mjs'))) {
    const mod = await import(new URL(f, dir));
    for (const page of (Array.isArray(mod.pages) ? mod.pages : [mod.page]).filter(Boolean)) {
      const html = layout(page, site);
      const home = page.path === 'index.html';
      assert.equal(/data-aircraft-flight/.test(html), home, page.path);
      assert.equal(/data-aircraft-dock/.test(html), home, page.path);
      if (home) {
        assert.match(html, /<a class="brand" href="\.\/" aria-label="Good Times in Cape Town, home" data-intro style="--dock-x:/);
        assert.doesNotMatch(html, /is-awaiting-aircraft/, 'the logo is whole in the markup (no JavaScript, reduced motion)');
        assert.match(html, /<script src="assets\/js\/vendor\/MotionPathPlugin\.min\.js" defer><\/script>\n<script src="assets\/js\/brand-plane\.js" defer><\/script>\n<script src="assets\/js\/hero\.js" defer>/);
        if (site.preview) assert.match(html, /<button type="button" class="preview-bar__replay" data-intro-replay hidden>Replay the intro<\/button>/);
      }
    }
  }
});

test('MotionPathPlugin is GSAP 3.15.0 with its licence header, the same release as the core', () => {
  const v = (f) => readFileSync(new URL(`../src/assets/js/vendor/${f}`, import.meta.url), 'utf8').slice(0, 300);
  assert.match(v('MotionPathPlugin.min.js'), /MotionPathPlugin 3\.15\.0[\s\S]*Subject to the terms at https:\/\/gsap\.com\/standard-license/);
  assert.match(v('gsap.min.js'), /GSAP 3\.15\.0/);
  assert.match(readFileSync(new URL('../NOTICE.md', import.meta.url), 'utf8'), /MotionPathPlugin/);
});
