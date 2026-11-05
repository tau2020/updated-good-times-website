/**
 * The sand journey's model (assets/js/motion/sand/): the foot's anatomy, the press of each step, the walk, the sweep
 * and the grains, all pure functions of the scroll progress p. The browser checks (the real shader, determinism of
 * the drawn frames forwards and backwards, the tiers and the fallbacks) are test/e2e/motion.spec.mjs.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { FOOT, envelopes, variation, depthAt } from '../src/assets/js/motion/sand/foot.js';
import { layoutScene, stateAt, revealAt, grainsAt, PHASE, STEPS, STEPS_PORTRAIT, LIGHT } from '../src/assets/js/motion/sand/scene.js';
import { SAND } from '../src/assets/js/motion/sand/shaders.js';
import { hash2u } from '../src/assets/js/motion/sand/noise.js';
import { site } from '../src/data/site.mjs';
import { layout } from '../src/partials/layout.mjs';
import { tours } from '../src/data/tours.mjs';
import { SAND_TOUR, SAND_IMAGE } from '../src/partials/sand-journey.mjs';

const plain = { length: 1, width: 1, spread: 1, depth: 1, heelBias: 0, fifth: 0.44, angle: 0 };
const full = { heel: 1, fore: 1, toes: 1 };
const D = (m, y, env = full, v = plain) => depthAt(m, y, v, env, 2).depth;

test('the foot: five separate toes, the big toe the largest and on the medial side, in a descending arc', () => {
  assert.equal(FOOT.toes.length, 5);
  const [big, ...lesser] = FOOT.toes;
  assert.ok(big.c[0] > 0, 'the big toe is medial (+m)');
  for (const t of lesser) assert.ok(t.c[0] < big.c[0] && t.r[0] * t.r[1] < big.r[0] * big.r[1], 'the lesser toes are lateral of it and smaller');
  for (let i = 1; i < 5; i++) {
    assert.ok(FOOT.toes[i].c[0] < FOOT.toes[i - 1].c[0], 'medial to lateral');
    assert.ok(FOOT.toes[i].r[0] <= FOOT.toes[i - 1].r[0] || i === 1, 'getting smaller');
  }
  for (let i = 2; i < 5; i++) assert.ok(FOOT.toes[i].c[1] < FOOT.toes[i - 1].c[1], 'the arc descends towards the little toe');
  // Each toe pad is pressed in, with sand standing between neighbours and between the lesser toes and the ball
  for (const t of FOOT.toes) assert.ok(D(t.c[0], t.c[1]) > 0.5, 'a toe pad is a depression');
  assert.ok(D((FOOT.toes[1].c[0] + FOOT.toes[2].c[0]) / 2, (FOOT.toes[1].c[1] + FOOT.toes[2].c[1]) / 2 + 1.1) < D(FOOT.toes[1].c[0], FOOT.toes[1].c[1]) * 0.5, 'a gap between the second and third toes');
  // The ridge between the toes and the ball: half way from the third toe's back edge to the ball's front edge, the sand
  // stands higher than in either (the toes are tucked close, about 0.6 cm away)
  const t3 = FOOT.toes[2];
  const b = FOOT.ball;
  const h = (b.a[0] - t3.c[0]) / (b.a[0] - b.b[0]);
  const ballFront = b.a[1] + (b.b[1] - b.a[1]) * h + b.ra + (b.rb - b.ra) * h;
  const toeBack = t3.c[1] - t3.r[1];
  assert.ok(toeBack - ballFront > 0.3 && toeBack - ballFront < 1, `tucked close to the ball: ${(toeBack - ballFront).toFixed(2)} cm`);
  const ridge = D(t3.c[0], (toeBack + ballFront) / 2);
  assert.ok(ridge < 0.4 * D(t3.c[0], t3.c[1]) && ridge < 0.4 * D(t3.c[0], ballFront - 1.5), `a ridge between the third toe and the ball (${ridge.toFixed(2)} cm)`);
});

test('the foot: heel and ball deepest, the lateral midfoot shallow, the medial arch not touching (a shallow arch)', () => {
  const heel = D(FOOT.heel.c[0], FOOT.heel.c[1]);
  const ball = D(FOOT.ball.a[0], FOOT.ball.a[1]);
  const lateral = D((FOOT.lateral.a[0] + FOOT.lateral.b[0]) / 2 - 0.6, (FOOT.lateral.a[1] + FOOT.lateral.b[1]) / 2);
  const arch = D(2.2, -1.5);
  assert.ok(heel > 1.6 && ball > 1.4, `heel ${heel}, ball ${ball}`);
  assert.ok(lateral > 0.4 && lateral < heel * 0.6, `the lateral band is pressed but shallow: ${lateral}`);
  assert.ok(arch < 0.05, `the medial arch leaves no print: ${arch}`);
  // The outline runs on unbroken from the heel to the ball, the midfoot nearly half as wide as the forefoot
  const width = (y) => {
    let lo = null;
    let hi = null;
    for (let m = -6; m <= 6; m += 0.05) if (D(m, y) > 0.15) (lo = lo ?? m), (hi = m);
    return lo === null ? 0 : hi - lo;
  };
  const forefoot = width(4.6);
  const midfoot = width(-1.5);
  assert.ok(midfoot > 0.38 * forefoot && midfoot < 0.65 * forefoot, `midfoot ${midfoot.toFixed(1)} cm of a ${forefoot.toFixed(1)} cm forefoot`);
  for (let y = -10; y <= 4.5; y += 0.5) assert.ok(width(y) > 2, `no break in the outline at ${y}`);
  // Displaced sand stands just outside the print, not inside it
  const rimBehind = depthAt(FOOT.heel.c[0], FOOT.heel.c[1] - FOOT.heel.r[1] - FOOT.rim, plain, full, 2);
  assert.ok(rimBehind.rim > 0.2 && rimBehind.depth < 0.05, 'a rim of sand behind the heel');
  assert.equal(depthAt(0, 0, plain, { heel: 0, fore: 0, toes: 0 }, 2).depth, 0, 'nothing before the foot comes down');
});

test('each step presses heel, then ball, then toes, monotonically, and a step is never a stamped copy of the last', () => {
  const step = { onset: 0.2, duration: 0.05 };
  let prev = { heel: 0, fore: 0, toes: 0 };
  for (let p = 0.15; p <= 0.3; p += 0.0025) {
    const e = envelopes(step, p);
    for (const k of ['heel', 'fore', 'toes']) assert.ok(e[k] >= prev[k] - 1e-12, `${k} never lifts as p grows`);
    prev = e;
  }
  const mid = envelopes(step, 0.2 + 0.05 * 0.35);
  assert.ok(mid.heel > mid.fore && mid.fore > mid.toes, 'heel first, toes last');
  assert.deepEqual(envelopes(step, 0.19), { t: 0, heel: 0, fore: 0, toes: 0 });
  assert.deepEqual(envelopes(step, 0.26), { t: 1, heel: 1, fore: 1, toes: 1 });
  // Progressive formation: early in the press the heel is in, the toes not yet
  const early = { heel: 1, fore: 0.1, toes: 0 };
  assert.ok(D(FOOT.heel.c[0], FOOT.heel.c[1], early) > 1.5 && D(FOOT.toes[0].c[0], FOOT.toes[0].c[1], early) === 0);
  // The sand caves in from the middle: a lightly pressed heel has a small patch, never the full outline
  const light = { heel: 0.3, fore: 0, toes: 0 };
  const edge = [FOOT.heel.c[0] + FOOT.heel.r[0] * 0.85, FOOT.heel.c[1]];
  assert.ok(D(FOOT.heel.c[0], FOOT.heel.c[1], light) > 0.1, 'the middle of the heel is in');
  assert.equal(D(edge[0], edge[1], light), 0, 'its edge not yet');
  assert.ok(D(edge[0], edge[1]) > 0.5, 'the edge goes in as the weight comes on');
  const a = variation(1);
  const b = variation(2);
  assert.notDeepEqual(a, b, 'every step varies length, width, toe spread, depth and weight');
});

const desk = layoutScene({ width: 1440, height: 900, pinAt: 0.72 / (0.72 + 2.0) });
const phone = layoutScene({ width: 390, height: 844, pinAt: 0.72 / (0.72 + 1.7) });

test('the walk: eight steps (six on a portrait phone), alternating, big toes inside the trail, a real stride, all made in view, done before the sweep', () => {
  assert.deepEqual([STEPS, STEPS_PORTRAIT], [8, 6]);
  for (const sc of [desk, phone]) {
    const n = sc.portrait ? STEPS_PORTRAIT : STEPS;
    assert.equal(sc.steps.length, n);
    // Every print is pressed where it can be seen: on the stage (below the header's band) at its start and its end
    for (const st of sc.steps) {
      for (const p of [st.onset, st.onset + st.duration]) {
        const cam = sc.camAt(p);
        const x = (st.c[0] - cam[0]) * sc.s + sc.width / 2;
        const y = (st.c[1] - cam[1]) * sc.s + sc.height / 2;
        assert.ok(x > 0.06 * sc.width && x < 0.94 * sc.width && y > 0.14 * sc.height && y < 0.88 * sc.height, `print ${st.index} at p ${p.toFixed(3)}: ${x.toFixed(0)}, ${y.toFixed(0)}`);
      }
    }
    sc.steps.forEach((st, k) => assert.equal(st.foot, k % 2 ? 'right' : 'left'));
    for (let k = 1; k < n; k++) {
      const a = sc.steps[k - 1];
      const b = sc.steps[k];
      const stride = Math.hypot(b.c[0] - a.c[0], b.c[1] - a.c[1]);
      assert.ok(stride > 50 && stride < 66, `step ${k}: ${stride.toFixed(1)} cm`);
      // The medial direction of each foot points towards the other foot of the pair
      const med = [b.sigma * b.h[1], -b.sigma * b.h[0]];
      const toOther = [a.c[0] - b.c[0], a.c[1] - b.c[1]];
      const lateral = toOther[0] * med[0] + toOther[1] * med[1];
      assert.ok(lateral > 0, `step ${k}: the big toe faces the other foot`);
      assert.ok(b.onset > a.onset, 'one after another');
      // Within the entry and within the walk, a walk; between them the visitor scrolls the stage into place
      if (a.phase === b.phase) {
        assert.ok(b.onset < a.onset + a.duration, 'the next heel strikes as the last foot pushes off (a walk, not a hop)');
        assert.ok(b.onset > a.onset + a.duration * 0.5, 'never more than a short overlap');
      }
    }
    const last = sc.steps[n - 1];
    assert.ok(last.onset + last.duration <= PHASE.reveal + 1e-9, 'the last print is complete before the sweep begins');
    assert.ok(sc.steps[0].onset + sc.steps[0].duration < sc.pin, 'the first print forms while the hero is still in view');
    assert.deepEqual([...new Set(sc.steps.map((st) => st.phase))], ['entry', 'walk']);
    // On wide screens the walk is already under way while the stage scrolls in (more than one print before the pin)
    if (!sc.portrait) assert.ok(sc.steps.filter((st) => st.phase === 'entry').length >= 2);
  }
});

test('the scene is deterministic: the same layout and p give the same state, whatever came before', () => {
  const again = layoutScene({ width: 1440, height: 900, pinAt: 0.72 / (0.72 + 2.0) });
  assert.equal(JSON.stringify(again.steps), JSON.stringify(desk.steps));
  assert.equal(JSON.stringify(again.strokes), JSON.stringify(desk.strokes));
  const ps = [0, 0.04, 0.1, 0.3, 0.48, 0.55, 0.62, 0.72, 0.8, 0.9, 0.97, 1];
  const fwd = ps.map((p) => JSON.stringify(stateAt(desk, p)));
  const back = [...ps].reverse().map((p) => JSON.stringify(stateAt(desk, p))).reverse();
  assert.deepEqual(fwd, back);
  // The camera never jumps, and never moves the sand much faster than the page scrolls: at most about twice the
  // scroll's own speed (the section scrolls 0.72 of a screen to the pin, then --pin: 200svh desktop, 170svh phones)
  for (const [sc, perP] of [[desk, (0.72 + 2.0) * 900], [phone, (0.72 + 1.7) * 844]]) {
    let prev = sc.camAt(0);
    let fastest = 0;
    for (let p = 0; p <= 1; p += 0.0005) {
      const c = sc.camAt(p);
      const movedPx = Math.hypot(c[0] - prev[0], c[1] - prev[1]) * sc.s;
      fastest = Math.max(fastest, movedPx / (0.0005 * perP));
      prev = c;
    }
    assert.ok(fastest < 2.2, `the sand moves at most ${fastest.toFixed(2)}× the scroll`);
  }
  assert.deepEqual(desk.camAt(0.6), desk.camAt(0.95), 'the camera holds still for the sweep');
});

test('the sweep: untouched before it begins, gone everywhere at the end, and it only ever takes sand away', () => {
  const pts = [];
  const vw = desk.width / desk.s;
  const vh = desk.height / desk.s;
  for (let i = 0; i <= 12; i++) for (let j = 0; j <= 8; j++) pts.push([desk.camEnd[0] + (i / 12 - 0.5) * vw, desk.camEnd[1] + (j / 8 - 0.5) * vh]);
  for (const [x, y] of pts) {
    assert.equal(revealAt(desk, x, y, 0.5), 0);
    assert.equal(revealAt(desk, x, y, PHASE.reveal - 1e-6), 0);
    assert.equal(revealAt(desk, x, y, PHASE.clear), 1);
    assert.equal(revealAt(desk, x, y, 1), 1);
    let prev = 0;
    for (let p = PHASE.reveal; p < PHASE.clear; p += 0.01) {
      const r = revealAt(desk, x, y, p);
      assert.ok(r >= prev - 1e-9, `never refills at ${p.toFixed(2)}`);
      prev = r;
    }
  }
  const at = (p) => pts.reduce((s, [x, y]) => s + revealAt(desk, x, y, p), 0) / pts.length;
  const mid = at(0.7);
  assert.ok(mid > 0.15 && mid < 0.85, `partly swept at 0.7 (${mid.toFixed(2)}), not a wipe`);
  assert.ok(at(0.62) < mid && mid < at(0.85), 'gradual');
});

test('the grains: a fixed pool, positions from p alone, none before the first step or after the clear', () => {
  assert.equal(grainsAt(desk, 0).length, 0);
  assert.equal(grainsAt(desk, 1).length, 0);
  const p = desk.steps[3].onset + desk.steps[3].duration * 0.5;
  const a = grainsAt(desk, p);
  grainsAt(desk, 0.9);
  grainsAt(desk, 0.1);
  assert.deepEqual(grainsAt(desk, p), a, 'seeking elsewhere first changes nothing');
  assert.ok(a.length > 0 && a.length / 6 < 60, 'a few grains, short-lived, at the step being made');
  assert.ok(desk.grains.length < 900 && phone.grains.length < 900);
  const lite = layoutScene({ width: 390, height: 844, pinAt: 0.72 / (0.72 + 1.7), quality: 'lite' });
  assert.ok(lite.grains.length < phone.grains.length * 0.6, 'lite has fewer');
});

test('the shader is written from the same foot, light and hash as the tested model', () => {
  const v = (a) => `vec2(${a.map((n) => Number(n).toFixed(4)).join(', ')})`;
  assert.ok(SAND.includes(`const vec2 HEEL_C = ${v(FOOT.heel.c)}`));
  assert.ok(SAND.includes(`const vec2 BALL_A = ${v(FOOT.ball.a)}`));
  for (const t of FOOT.toes) assert.ok(SAND.includes(v(t.c)), 'every toe');
  assert.ok(SAND.includes('0x8da6b343u') && SAND.includes('0xd8163841u') && SAND.includes('0x5bd1e995u'));
  assert.equal(hash2u(-3, 7), hash2u(-3, 7));
  assert.ok(LIGHT[0] < 0 && LIGHT[1] < 0 && LIGHT[2] > 0.3 && LIGHT[2] < 0.6, 'a low sun from the upper left');
  assert.ok(!/\buTime\b|performance|Date/.test(SAND), 'no clock in the shader');
});

test('the scene in the page: between the hero and the first chapter, static and complete in its markup', async () => {
  const mod = await import('../src/pages/index.mjs');
  const html = layout(mod.page, site);
  const hero = html.indexOf('<section class="hero"');
  const sand = html.indexOf('<section class="sand-journey"');
  const chapter = html.indexOf('<div class="living-cape"');
  assert.ok(hero >= 0 && hero < sand && sand < chapter, 'right after the hero');
  // Its sheet is linked at its start, not in the head: the hero never waits for it
  assert.match(html.slice(sand, sand + 200), /^<section class="sand-journey"[^>]*>\n  <link rel="stylesheet" href="assets\/css\/motion\.css">/);
  assert.doesNotMatch(html.slice(0, html.indexOf('</head>')), /motion\.css/);
  const s = html.slice(sand, chapter);
  assert.match(s, /aria-labelledby="sand-journey-title"/);
  assert.doesNotMatch(s, /<canvas/, 'the canvas is the script’s, decorative and added only with motion');
  const t = tours.find((x) => x.slug === SAND_TOUR);
  assert.match(s, new RegExp(`<h2 class="sand-journey__title" id="sand-journey-title">${t.shortTitle}</h2>`));
  assert.ok(s.includes(t.card.replace(/’/g, '’')), 'the tour’s own words');
  assert.match(s, /<a class="btn gt-button gt-button--primary sand-journey__cta" href="tours\/cape-peninsula-private-tour\/"><span>Explore This Experience<\/span><span class="visually-hidden">: the Cape Peninsula Private Tour<\/span><\/a>/);
  assert.ok(existsSync(new URL(`../src/pages/tours.mjs`, import.meta.url)), 'tour pages exist');
  assert.match(s, new RegExp(`assets/img/${SAND_IMAGE}-`));
  assert.match(readFileSync(new URL('../docs/RIGHTS_REGISTER.md', import.meta.url), 'utf8'), new RegExp(`\\| ${SAND_IMAGE} \\|[^\\n]*In use`));
  assert.match(html, /<script src="assets\/js\/sand-journey\.js" defer><\/script>\n<script src="assets\/js\/living-cape\.js" defer>/, 'before the chapters measure their triggers');
});
