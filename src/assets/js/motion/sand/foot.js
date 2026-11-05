/* Good Times in Cape Town — the bare adult foot that presses into the sand (shared by the shader and the unit tests).

   One canonical foot, in centimetres, seen from above, sole down. Axes: `m` towards the medial side (the big toe's
   side, towards the walker's other foot), `y` towards the toes; origin at the middle of the foot. A left and a right
   foot differ only in which way `m` points in the world (scene.js), so the big toe is always on the inside of the
   trail. Contact areas, as a walking adult leaves them in firm, slightly damp sand:
     - the heel pad, round and deepest (it takes the heel strike);
     - the midfoot, a broad band on the outer side (nearly half the foot's width) and shallower towards the arch, so
       the outline runs on unbroken from the heel to the ball;
     - no medial arch contact: the shallow arch the brief asks for is the gentle hollow on the big toe's side;
     - the ball, a wide band from the first metatarsal head (medial, larger, deeper) to the fifth;
     - five separate oval toe pads in a descending arc, tucked close to the ball, the big toe largest and furthest in
       (its proximal phalanx joining it faintly to the ball), the little toe smallest and set back; a thin ridge of
       sand stands between the toes and the ball.
   Each part's contact spreads as it sinks (the sand caves in from the middle), so nothing appears as a full outline
   at zero depth, and the push-off heaps a little sand in front of the toes.
   Each step varies this foot a little (length, width, toe spread, depth, which half carries more weight, how much the
   little toe shows), so no two prints are stamped copies, and no print is a mirror image of the one before it.
   The shader's constants are generated from these numbers (shaders.js), and depthAt() below is the same model on
   the CPU without the grain noise, for the anatomy tests (test/motion-sand.test.mjs). */
import { clamp, mix, smoothstep, seeded, range } from './random.js';

export const FOOT = {
  length: 24.85, // heel back to the tip of the big toe
  heel: { c: [-0.3, -8.5], r: [3.15, 4.0], w: 1.0 },
  // The midfoot: a broad band along the outer side. A normal arch touches over nearly half the foot's width here, so
  // the outline runs on unbroken from the heel to the ball, with a gentle hollow on the big toe's side
  lateral: { a: [-0.9, -5.2], b: [-1.7, 2.6], ra: 2.25, rb: 2.85, w: 0.6 },
  ball: { a: [2.3, 5.3], b: [-3.2, 3.7], ra: 2.85, rb: 2.15, w: 0.95 },
  // The big toe's proximal phalanx often touches too, joining the big toe's pad to the ball
  hallux: { a: [2.5, 7.2], b: [2.6, 9.0], ra: 1.1, rb: 1.2, w: 0.32 },
  // Big toe first (medial), little toe last (lateral): oval pads in a descending arc, tucked close to the ball
  toes: [
    { c: [2.65, 10.45], r: [1.5, 1.95], w: 0.86 },
    { c: [0.45, 9.3], r: [0.9, 1.3], w: 0.6 },
    { c: [-1.15, 8.5], r: [0.85, 1.2], w: 0.54 },
    { c: [-2.48, 7.75], r: [0.8, 1.1], w: 0.48 },
    { c: [-3.55, 7.05], r: [0.72, 0.98], w: 0.42 },
  ],
  wall: 1.05, // cm over which a print's wall falls to its floor (the sole): sand slumps, it is never a clean cut
  toeWall: 0.55,
  rim: 1.35, // cm from the edge to the crest of the displaced sand
  rimHeight: 0.22, // of the step's depth
  blend: [2.6, 2.4], // fillets: heel to the midfoot band, the band to the ball (cm)
  // How far in (cm) each part's contact starts before it is pressed: the patch spreads outwards as the weight comes
  // on (the sand caves in from the middle), so no part appears as a full outline at zero depth
  grow: [1.8, 0.9],
};

/** The press of one step at progress p: heel first, then the ball, then the toes (each eased, all monotonic in p). */
export function envelopes(step, p) {
  const t = clamp((p - step.onset) / step.duration);
  return { t, heel: smoothstep(0, 0.4, t), fore: smoothstep(0.28, 0.78, t), toes: smoothstep(0.55, 0.96, t) };
}

/** The per-step variation of the canonical foot, from the step's seed. */
export function variation(seed) {
  const r = seeded(seed);
  return {
    length: range(r, 0.97, 1.03),
    width: range(r, 0.95, 1.06),
    spread: range(r, 0.93, 1.09),
    depth: range(r, 0.9, 1.1),
    heelBias: range(r, -0.08, 0.08),
    fifth: range(r, 0.3, 0.5),
    angle: range(r, -2.5, 2.5),
  };
}

/* --- The CPU reference (no grain noise): signed distances and the depth of the print at a local point --- */
const len = (x, y) => Math.hypot(x, y);
export function sdEllipse(px, py, rx, ry) {
  const k0 = len(px / rx, py / ry);
  const k1 = len(px / (rx * rx), py / (ry * ry));
  return k1 === 0 ? -Math.min(rx, ry) : (k0 * (k0 - 1)) / k1;
}
export function sdCapsule(px, py, ax, ay, bx, by, ra, rb) {
  const pax = px - ax;
  const pay = py - ay;
  const bax = bx - ax;
  const bay = by - ay;
  const h = clamp((pax * bax + pay * bay) / (bax * bax + bay * bay));
  return len(pax - bax * h, pay - bay * h) - mix(ra, rb, h);
}
export function smin(a, b, k) {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}

/** The toe pads' centres for a step's toe spread (spread about the second toe). */
export function toeCentres(spread = 1) {
  const pivot = FOOT.toes[1].c;
  return FOOT.toes.map((t) => [pivot[0] + (t.c[0] - pivot[0]) * spread, t.c[1] - Math.abs(t.c[0] - pivot[0]) * (spread - 1) * 0.35]);
}

/**
 * The print at local point (m, y) of a step with variation v and envelopes env, depth in cm (positive = below the
 * surface) and the rim (raised, cm). maxDepth is the step's full depth at the heel.
 */
export function depthAt(m, y, v, env, maxDepth) {
  const L = v.length;
  const W = v.width;
  const pm = m / W;
  const py = y / L;
  const F = FOOT;
  const sdH = sdEllipse(pm - F.heel.c[0], py - F.heel.c[1], F.heel.r[0], F.heel.r[1]);
  const sdL = sdCapsule(pm, py, F.lateral.a[0], F.lateral.a[1], F.lateral.b[0], F.lateral.b[1], F.lateral.ra, F.lateral.rb);
  const sdB = sdCapsule(pm, py, F.ball.a[0], F.ball.a[1], F.ball.b[0], F.ball.b[1], F.ball.ra, F.ball.rb);
  const envSole = mix(env.heel, env.fore, smoothstep(-7, -1, py));
  const sole = smin(smin(sdH, sdL, F.blend[0]), sdB, F.blend[1]) + Math.pow(1 - envSole, 1.5) * F.grow[0];
  // How much each part carries (heel and ball deep, the midfoot shallower towards the arch; the arch does not touch)
  const wH = (F.heel.w + v.heelBias) * smoothstep(0.9, -0.6, sdH);
  const wL = F.lateral.w * (0.35 + 0.65 * smoothstep(1.2, -2.5, pm)) * smoothstep(0.9, -0.6, sdL);
  const wB = (F.ball.w - v.heelBias) * smoothstep(0.9, -0.6, sdB) * mix(0.84, 1, clamp((pm + 3.4) / 5.8));
  const weight = Math.max(wH, wL, wB);
  const cup = clamp(-sole / 2);
  const dSole = maxDepth * smoothstep(0, F.wall, -sole) * weight * envSole * (0.88 + 0.12 * cup);
  // The toes, each its own pad
  const tc = toeCentres(v.spread);
  const hx = F.hallux;
  const growT = Math.pow(1 - env.toes, 1.5) * F.grow[1];
  let toes = sdCapsule(pm, py, hx.a[0], hx.a[1], hx.b[0], hx.b[1], hx.ra, hx.rb) + growT;
  let dToes = maxDepth * hx.w * smoothstep(0, F.toeWall, -toes) * env.toes;
  F.toes.forEach((t, i) => {
    const w = i === 4 ? v.fifth : t.w;
    const sd = sdEllipse(pm - tc[i][0], py - tc[i][1], t.r[0], t.r[1]) + growT;
    toes = Math.min(toes, sd);
    const tip = 0.8 + 0.2 * clamp((py - tc[i][1]) / t.r[1] + 0.5);
    dToes = Math.max(dToes, maxDepth * w * smoothstep(0, F.toeWall, -sd) * tip * env.toes);
  });
  const depth = Math.max(dSole, dToes);
  const sd = Math.min(sole, toes);
  let rim = 0;
  if (sd > 0) {
    const k = sd / F.rim;
    const near = mix(envSole, env.toes, smoothstep(-0.8, 0.8, sole - toes));
    // Most sand is pushed up behind the heel (the strike) and in front of the toes (the push-off)
    const where = 1 + 0.35 * smoothstep(-9, -12.5, py) + 0.55 * smoothstep(9, 12.5, py);
    rim = F.rimHeight * maxDepth * k * Math.exp(1 - k) * near * where * smoothstep(19, 15.5, Math.hypot(pm, py));
  }
  return { depth, rim, sole, toes, sd };
}
