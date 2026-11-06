/**
 * The sand journey's model (assets/js/motion/sand/): the foot's anatomy, the press of each step, the walk, the sweep
 * and the grains, all pure functions of the scroll progress p. The browser checks (the real shader, determinism of
 * the drawn frames forwards and backwards, the tiers and the fallbacks) are test/e2e/motion.spec.mjs.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { FOOT, envelopes, variation, depthAt } from '../src/assets/js/motion/sand/foot.js';
import { layoutScene, photoPlacement, stateAt, revealAt, grainsAt, PHASE, PHOTO, STEPS, STEPS_PORTRAIT, LIGHT } from '../src/assets/js/motion/sand/scene.js';
import { SAND } from '../src/assets/js/motion/sand/shaders.js';
import { hash2u } from '../src/assets/js/motion/sand/noise.js';
import { site } from '../src/data/site.mjs';
import { layout } from '../src/partials/layout.mjs';
import { tours } from '../src/data/tours.mjs';
import { SAND_TOUR, SAND_IMAGE, SAND_FILM, SAND_WORDS } from '../src/partials/sand-journey.mjs';
import { pages as tourPages } from '../src/pages/tours.mjs';

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

// The stage below the sticky header (113 px on the home page's desktop header, 90 px on a 390 px phone, whose call bar
// covers the stage's lowest 76 px)
const desk = layoutScene({ width: 1440, height: 900, pinAt: 0.72 / (0.72 + 2.0), headerH: 113 });
const phone = layoutScene({ width: 390, height: 844, pinAt: 0.72 / (0.72 + 1.7), headerH: 90, bar: 76 });

test('the walk: eight steps (six on a portrait phone), alternating, big toes inside the trail, a real stride, all made in view, done before the sweep', () => {
  assert.deepEqual([STEPS, STEPS_PORTRAIT], [8, 6]);
  for (const [sc, headerH] of [[desk, 113], [phone, 90]]) {
    const n = sc.portrait ? STEPS_PORTRAIT : STEPS;
    assert.equal(sc.steps.length, n);
    const footPx = FOOT.length * sc.s;
    // Every print is pressed where it can be seen: on the stage, clear of the header, at its start and its end
    for (const st of sc.steps) {
      for (const p of [st.onset, st.onset + st.duration]) {
        const cam = sc.camAt(p);
        const x = (st.c[0] - cam[0]) * sc.s + sc.width / 2;
        const y = (st.c[1] - cam[1]) * sc.s + sc.height / 2;
        assert.ok(x > 0.04 * sc.width && x < 0.96 * sc.width && y > headerH + 0.3 * footPx && y < 0.88 * sc.height, `print ${st.index} at p ${p.toFixed(3)}: ${x.toFixed(0)}, ${y.toFixed(0)}`);
      }
    }
    for (let k = 1; k < n; k++) {
      const a = sc.steps[k - 1];
      const b = sc.steps[k];
      assert.notEqual(b.foot, a.foot, 'left, right, left…');
      // The destination image's own stride (about 1.95 foot lengths, unhurried on soft sand), the walk before it the same
      const stride = Math.hypot(b.c[0] - a.c[0], b.c[1] - a.c[1]);
      assert.ok(stride > 42 && stride < 58, `step ${k}: ${stride.toFixed(1)} cm`);
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

test('one trail, one walker: the walk ends on the destination image’s own four prints (place, heading, foot and size), at every layout', () => {
  // [width, height, header, call bar]: wide desktops and laptops, a small window and a tablet with the call bar, portrait
  // tablets and phones, phones on their side and a low window (the image fitted beside the words)
  const layouts = [
    [1440, 900, 113, 0], [1920, 1080, 113, 0], [1280, 720, 113, 0], [1366, 657, 113, 0], [1024, 768, 113, 0], [900, 700, 85, 76],
    [768, 1024, 85, 76], [390, 844, 90, 76], [360, 740, 83, 76], [375, 667, 86, 76],
    [844, 390, 85, 76], [667, 375, 85, 76], [1280, 600, 113, 0],
  ];
  for (const [W, H, headerH, bar] of layouts) {
    const name = `${W}×${H}`;
    const place = photoPlacement(W, H, headerH, bar);
    const sc = layoutScene({ width: W, height: H, pinAt: 0.72 / (0.72 + (W / H <= 1 || W < 768 ? 1.7 : 2.0)), headerH, bar });
    const n = sc.steps.length;
    const end = sc.camAt(1);
    assert.ok(Math.hypot(end[0] - sc.camEnd[0], end[1] - sc.camEnd[1]) < 1e-9, `${name}: the walk ends in the image's own framing`);
    assert.deepEqual(sc.camAt(PHASE.walkEnd), end, `${name}: and holds still for the sweep`);
    const at = (st) => [(st.c[0] - end[0]) * sc.s + W / 2, (st.c[1] - end[1]) * sc.s + H / 2];
    assert.ok(Math.abs(FOOT.length * sc.s - PHOTO.footLength * place.k) < 1e-6, `${name}: the animated feet are the photographed ones' size`);
    PHOTO.prints.forEach((pr, i) => {
      const st = sc.steps[n - 4 + i];
      assert.equal(st.photo, i);
      assert.equal(st.foot, pr.foot, `${name}: print ${i + 1} is the image's ${pr.foot} foot`);
      const [x, y] = at(st);
      const want = [place.ox + pr.c[0] * place.k, place.oy + pr.c[1] * place.k];
      assert.ok(Math.hypot(x - want[0], y - want[1]) < 0.01, `${name}: print ${i + 1} at (${x.toFixed(2)}, ${y.toFixed(2)}), the image's at (${want[0].toFixed(2)}, ${want[1].toFixed(2)})`);
      assert.ok(Math.abs((Math.atan2(st.h[1], st.h[0]) * 180) / Math.PI - pr.angle) < 1e-9, `${name}: print ${i + 1} heads as the image's`);
      assert.deepEqual([st.v.length, st.v.width, st.v.angle], [1, 1, 0], 'no variation on a photographed print');
    });
    // Never a print twice: the animated prints before the image's four end off the image (they go with the sand)
    const box = [Math.max(0, place.ox), Math.max(headerH, place.oy), Math.min(W, place.ox + PHOTO.width * place.k), Math.min(H - bar, place.oy + PHOTO.height * place.k)];
    const r = 0.55 * FOOT.length * sc.s;
    for (const st of sc.steps.slice(0, n - 4)) {
      const [x, y] = at(st);
      assert.ok(x + r < box[0] || x - r > box[2] || y + r < box[1] || y - r > box[3], `${name}: print ${st.index + 1} ends off the image (${x.toFixed(0)}, ${y.toFixed(0)})`);
    }
    // One direction, no kink where the image's prints take over: each foot's track (a print to the next of the same
    // foot) heads within 20° of the image's own trail and turns less than 10° from one print to the next
    const deg = (r) => (r * 180) / Math.PI;
    const trail = Math.atan2(PHOTO.prints[3].c[1] - PHOTO.prints[0].c[1], PHOTO.prints[3].c[0] - PHOTO.prints[0].c[0]);
    let prevDir = null;
    for (let k = 2; k < n; k++) {
      const dir = Math.atan2(sc.steps[k].c[1] - sc.steps[k - 2].c[1], sc.steps[k].c[0] - sc.steps[k - 2].c[0]);
      assert.ok(Math.abs(deg(dir - trail)) < 20, `${name}: print ${k + 1}'s track heads along the trail (${deg(dir - trail).toFixed(1)}°)`);
      if (prevDir !== null) assert.ok(Math.abs(deg(dir - prevDir)) < 10, `${name}: print ${k + 1}'s track turns gently (${deg(dir - prevDir).toFixed(1)}°)`);
      prevDir = dir;
    }
    // The woman is whole in every layout: hat to feet inside the image's visible part
    const [sx0, sy0, sx1, sy1] = PHOTO.subject;
    assert.ok(place.ox + sx0 * place.k >= 0 && place.ox + sx1 * place.k <= W && place.oy + sy0 * place.k >= headerH && place.oy + sy1 * place.k <= H - bar, `${name}: the woman whole`);
  }
});

test('the scene is deterministic: the same layout and p give the same state, whatever came before', () => {
  const again = layoutScene({ width: 1440, height: 900, pinAt: 0.72 / (0.72 + 2.0), headerH: 113 });
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
  const lite = layoutScene({ width: 390, height: 844, pinAt: 0.72 / (0.72 + 1.7), headerH: 90, bar: 76, quality: 'lite' });
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
  // The owner's words (6 Nov 2026), in the site's sentence case and without "breathtaking" or "unforgettable" since the
  // copy refresh of the same day (content/copy-audit.md); the headline names the section, the link an ordinary HTML
  // link to the existing tour
  assert.deepEqual(SAND_WORDS, {
    eyebrow: 'Cape Peninsula · Coastal journey',
    title: 'Look where your footsteps led.',
    line: 'One private day on the coast: big views, the penguins at Boulders and plenty of reasons to stop.',
    cta: 'Explore the Cape Peninsula Tour',
  });
  assert.match(s, /<div class="sand-journey__head">\s*<p class="sand-journey__eyebrow">Cape Peninsula · Coastal journey<\/p>\s*<h2 class="sand-journey__title" id="sand-journey-title">Look where your footsteps led\.<\/h2>\s*<\/div>/);
  assert.match(s, /<div class="sand-journey__foot">\s*<p class="sand-journey__line">One private day on the coast: big views, the penguins at Boulders and plenty of reasons to stop\.<\/p>\s*<a class="btn gt-button gt-button--primary sand-journey__cta" href="tours\/cape-peninsula-private-tour\/"><span>Explore the Cape Peninsula Tour<\/span><\/a>\s*<\/div>/);
  // Next comes the credentials strip, where the removed water chapter was (qa/surgical-change-report.md)
  assert.ok(s.indexOf('<section class="gt-credentials"') > s.indexOf('</section>'), 'the credentials strip follows the scene');
  const t = tours.find((x) => x.slug === SAND_TOUR);
  assert.ok(t && tourPages.some((pg) => pg.path === `tours/${t.slug}/index.html`), 'the link goes to an existing tour page');
  assert.ok(existsSync(new URL(`../src/pages/tours.mjs`, import.meta.url)), 'tour pages exist');
  // The destination: the owner's film over its own first frame (the poster), not a still or the Camps Bay photograph
  assert.match(s, new RegExp(`assets/img/${SAND_IMAGE}-`));
  assert.doesNotMatch(s, /camps-bay|ocean-footprints-reveal/);
  assert.match(s, /width="1280" height="720" loading="lazy" decoding="async" fetchpriority="low"/, 'its own size reserved, fetched after the hero');
  assert.match(readFileSync(new URL('../docs/RIGHTS_REGISTER.md', import.meta.url), 'utf8'), new RegExp(`\\| ${SAND_IMAGE} \\|[^\\n]*In use`));
  // The film: decorative, muted, inline, looped, nothing fetched until the script attaches it, no controls, no focus
  const film = /<video class="sand-journey__film"([^>]*)><\/video>/.exec(s);
  assert.ok(film, 'the film is in the destination, after its poster');
  for (const a of ['aria-hidden="true"', 'muted', 'playsinline', 'loop', 'preload="none"', 'tabindex="-1"', 'width="1280" height="720"', `data-mp4="${SAND_FILM.mp4}"`]) assert.ok(film[1].includes(a), a);
  assert.doesNotMatch(film[1], /\bcontrols\b|\bautoplay\b|\bsrc=/, 'no controls, no autoplay attribute, no source before the script decides');
  assert.ok(existsSync(new URL(`../src/${SAND_FILM.mp4}`, import.meta.url)), 'the film is in the build');
  assert.ok(s.indexOf('data-sand-film') > s.indexOf(`assets/img/${SAND_IMAGE}-`), 'over its poster');
  assert.match(html, /<script src="assets\/js\/sand-journey\.js" defer><\/script>\n<script src="assets\/js\/living-cape\.js" defer>/, 'before the chapters measure their triggers');
});
