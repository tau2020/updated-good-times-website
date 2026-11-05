/* Good Times in Cape Town — the sand journey's scene: one coordinate space, one progress value (shared by the renderer
   and the unit tests).

   World units are centimetres of beach seen from above (x right, y down the screen, z up out of the sand). The stage
   shows a window of it; `s` is CSS pixels per centimetre, chosen per screen so a 25 cm adult foot is about 17% of
   the stage's height (19% on a portrait phone, never more than 165 px) (close enough to see the toes, the arch and the rim). One bare-footed adult strolls the beach
   with a real, unhurried stride on soft sand (about 57 cm a step, feet 13 cm apart, toes turned out 7°), so the trail is longer than the
   screen: once the stage is held the camera glides along the walk, and it stops for the sweep.

   Everything here is a pure function of the layout (stage size, where the stage pins) and of the scroll progress p
   in [0, 1]. stateAt(p) is the whole visual state: the same p gives the same prints, the same sweep and the same
   grains whether the visitor scrolled forwards, backwards, reloaded half way or jumped there; nothing accumulates.

   Storyboard in p (docs/motion/03-step-sequence.md):
     0.00–0.04  the sand rises under the hero, untouched
     0.04–0.13  the first print forms just under the hero's edge (heel, then ball, then toes), while the hero is still
                in view: the one scene crossing the boundary
     pin–0.60   the other prints, one after another (the second just before the stage is held), the camera gliding
                along the walk; the last (8th; 6th on a portrait phone) is complete at 0.60
     0.605–0.87 long brushing passes, side by side and back and forth, sweep the sand off, the first over the last prints,
                then outwards; each pushes a heap ahead of it, piles sand along its sides and spills a few grains
     0.84–0.95  what is left crumbles into rounded clumps, those next to swept ground first, uncovering Camps Bay; the
                prints go with the sand they were pressed into
     0.89–0.985 the words and the link to the Cape Peninsula day rise in; from 0.95 the photograph is clear */
import { seeded, range, hash, clamp, mix, smoothstep } from './random.js';
import { FOOT, envelopes, variation } from './foot.js';
import { vnoise, h2f } from './noise.js';

/** Eight steps on wide screens; six on portrait phones, where the brief allows fewer (the stride stays real). */
export const STEPS = 8;
export const STEPS_PORTRAIT = 6;
export const PHASE = { first: [0.04, 0.09], walkEnd: 0.6, reveal: 0.605, erosion: 0.84, clear: 0.95, words: [0.89, 0.985] };
/** Where the progress starts: the section's top this far down the screen (sand-journey.js uses the same value). */
export const START = 0.72;
/** The sun, from the upper left and low (about 28° up), so the prints' walls cast shadows: unit vector towards it. */
export const LIGHT = (() => {
  const v = [-0.64, -0.6, 0.48];
  const n = Math.hypot(...v);
  return v.map((x) => x / n);
})();
export const SEED = 20261105;

/**
 * The scene for a stage of width × height CSS px. pinAt: the progress at which the stage is held (the controller
 * measures it from the scroll geometry). quality: 'full' or 'lite' (fewer grains).
 */
export function layoutScene({ width, height, pinAt = 0.25, seed = SEED, quality = 'full' }) {
  const W = Math.max(1, width);
  const H = Math.max(1, height);
  const portrait = H > W * 1.05;
  const s = clamp(Math.min((portrait ? 0.19 : 0.17) * H, 0.3 * W, 165) / FOOT.length, 3.4, 8.4);
  const rnd = seeded(seed);

  // The gait: down the screen (portrait) or down and across it (landscape), with a slight meander
  // Where the first print sits (just under the hero's edge) and where the last one finishes: the walk runs straight
  // between them, down a portrait screen, along the diagonal of a wide one (more of the trail in view, less panning)
  const first = portrait ? [0.5 * W, 0.24 * H] : [0.1 * W, 0.22 * H];
  const target = portrait ? [0.5 * W, 0.68 * H] : [0.78 * W, 0.72 * H];
  const heading = Math.atan2(target[1] - first[1], target[0] - first[0]);
  const h = [Math.cos(heading), Math.sin(heading)];
  const left = [h[1], -h[0]]; // the walker's left, in screen coordinates (y down)
  const stepWidth = 13;
  const toeOut = 7;
  const steps = [];
  const count = portrait ? STEPS_PORTRAIT : STEPS;
  let along = 0;
  for (let k = 0; k < count; k++) {
    const sseed = hash(seed, k + 1);
    const v = variation(sseed);
    const isLeft = k % 2 === 0;
    if (k) along += 57 * range(rnd, 0.96, 1.04);
    const sway = 3.2 * Math.sin(k * 0.95 + 0.6);
    const side = (isLeft ? 1 : -1) * (stepWidth / 2) * range(rnd, 0.9, 1.1);
    const c = [h[0] * along + left[0] * (side + sway), h[1] * along + left[1] * (side + sway)];
    // Toes out: the left foot turns towards the walker's left, the right foot towards the right
    const a = heading + (((isLeft ? -1 : 1) * toeOut + v.angle) * Math.PI) / 180;
    const fh = [Math.cos(a), Math.sin(a)];
    // sigma: +1 right foot (medial = the walker's left), −1 left foot (medial = the walker's right)
    steps.push({ index: k, foot: isLeft ? 'left' : 'right', sigma: isLeft ? -1 : 1, c, h: fh, v, depth: 2.1 * v.depth, seed: sseed, onset: 0, duration: 0 });
  }

  // Where the first print sits on the stage, and the camera before it moves
  const cam0 = [steps[0].c[0] - (first[0] - W / 2) / s, steps[0].c[1] - (first[1] - H / 2) / s];
  const at0 = (k) => [((steps[k].c[0] - cam0[0]) * s + W / 2) / W, ((steps[k].c[1] - cam0[1]) * s + H / 2) / H];

  // Timing. While the stage scrolls in (before the pin) the camera is still, so a print can only be made where the part
  // of the stage already on screen shows it: the first one just under the hero's edge, then as many more as fit. The
  // rest are made after the pin, the camera gliding along with them. Each press lasts a little longer than the interval
  // between heel strikes (a walk's double support).
  const pin = clamp(pinAt, PHASE.first[0] + PHASE.first[1] + 0.04, 0.36);
  steps[0].onset = PHASE.first[0];
  steps[0].duration = PHASE.first[1];
  steps[0].phase = 'entry';
  // The part of the stage on screen at p, as a fraction of its height (its top is START down the screen at p = 0)
  const shown = (p) => 1 - START + (p * START) / pin;
  const halfFoot = (FOOT.length * 0.55 * s) / H;
  // (wide screens only: on a portrait screen a stride is a third of the stage's height, and a second print made before
  // the stage is held would put the walk ahead of where the camera can follow)
  let entry = 1;
  for (let k = 1; k < count - 1 && !portrait; k++) {
    const [x, y] = at0(k);
    const from = Math.max(steps[k - 1].onset + 0.065, ((y + halfFoot + 0.04 - 1 + START) * pin) / START);
    if (x > 0.92 || y > 0.8 || from + 0.072 > pin - 0.03 || shown(from) < y + halfFoot) break;
    steps[k].onset = from;
    steps[k].duration = 0.072;
    steps[k].phase = 'entry';
    entry = k + 1;
  }
  const walkFrom = Math.max(pin - 0.03, steps[entry - 1].onset + 0.05);
  const spacing = (PHASE.walkEnd - walkFrom) / (count - entry - 1 + 1.18);
  const dur = spacing * 1.18;
  for (let k = entry; k < count; k++) {
    steps[k].onset = walkFrom + spacing * (k - entry) + (k > entry && k < count - 1 ? range(rnd, -0.002, 0.002) : 0);
    steps[k].duration = dur;
    steps[k].phase = 'walk';
  }

  // The camera: still while the stage scrolls in (the first prints sit just under the hero's edge), then a glide along
  // the walk that brings the last print to the target point as its heel strikes; still again for the sweep
  // How far the camera must travel along the walk for the last print to finish at the target point
  const last = steps[count - 1].c;
  const lx = (last[0] - cam0[0]) * s + W / 2 - target[0];
  const ly = (last[1] - cam0[1]) * s + H / 2 - target[1];
  const panTotal = Math.max(0, lx * h[0] + ly * h[1]);
  // An even glide over the whole walk (eased only at its ends), not a chase of each step: the sand never moves much
  // faster than the page scrolls
  // The glide ends as the last heel strikes, so the last print is pressed at the target point, not past it
  const glideEnd = steps[count - 1].onset + steps[count - 1].duration * 0.45;
  const camAt = (p) => {
    const u = clamp((Math.min(p, PHASE.walkEnd) - (pin - 0.02)) / (glideEnd - (pin - 0.02)));
    const eased = 0.6 * u + 0.4 * u * u * (3 - 2 * u);
    const ahead = panTotal * eased;
    return [cam0[0] + (h[0] * ahead) / s, cam0[1] + (h[1] * ahead) / s];
  };
  const camEnd = camAt(PHASE.walkEnd);

  // The sweep: someone brushing the sand off in long, gently curved passes, side by side and back and forth, in one
  // direction (along the walk on wide screens, across the screen on portrait ones), starting with the pass over the
  // last prints and working outwards. Each pass is a circular arc from beyond one edge of the held stage to beyond
  // the other; whatever is left in between crumbles in the erosion.
  const vw = W / s;
  const vh = H / s;
  const prev = steps[count - 2].c;
  const focus = [(last[0] + prev[0]) / 2, (last[1] + prev[1]) / 2];
  const dir0 = portrait ? 0 : heading;
  const ux = Math.cos(dir0);
  const uy = Math.sin(dir0);
  const nx = -uy;
  const ny = ux;
  const alongExt = Math.abs(ux) * vw + Math.abs(uy) * vh;
  const acrossExt = Math.abs(nx) * vw + Math.abs(ny) * vh;
  const meanW = (portrait ? 0.2 : 0.25) * vh * (portrait ? 0.9 : 1);
  const step = 0.62 * meanW;
  // Lanes across the whole held stage, offsets measured from the line through the last prints
  const fOff = (focus[0] - camEnd[0]) * nx + (focus[1] - camEnd[1]) * ny;
  const lanes = [];
  for (let o = -acrossExt / 2 - step * 0.3; o <= acrossExt / 2 + step * 0.3; o += step) lanes.push(o);
  lanes.sort((a, b) => Math.abs(a - fOff) - Math.abs(b - fOff));
  const n = Math.min(16, lanes.length);
  const strokes = [];
  for (let j = 0; j < n; j++) {
    const off = lanes[j] + range(rnd, -0.12, 0.12) * step;
    const jit = (range(rnd, -7, 7) * Math.PI) / 180;
    const dx = Math.cos(dir0 + jit) * (j % 2 ? -1 : 1);
    const dy = Math.sin(dir0 + jit) * (j % 2 ? -1 : 1);
    const cx = camEnd[0] + nx * off;
    const cy = camEnd[1] + ny * off;
    const half = 0.62 * alongExt;
    const A = [cx - dx * half, cy - dy * half];
    const B = [cx + dx * half, cy + dy * half];
    // A gentle bow: the centre sits far to one side of the chord
    const R = range(rnd, 320, 900);
    const chord = Math.hypot(B[0] - A[0], B[1] - A[1]);
    const side = rnd() < 0.5 ? 1 : -1;
    const dist = Math.sqrt(Math.max(1, R * R - (chord / 2) * (chord / 2)));
    const O = [(A[0] + B[0]) / 2 - dy * dist * side, (A[1] + B[1]) / 2 + dx * dist * side];
    const a0 = Math.atan2(A[1] - O[1], A[0] - O[0]);
    let a1 = Math.atan2(B[1] - O[1], B[0] - O[0]);
    let dA = a1 - a0;
    while (dA > Math.PI) dA -= 2 * Math.PI;
    while (dA < -Math.PI) dA += 2 * Math.PI;
    const u = n > 1 ? j / (n - 1) : 0;
    strokes.push({
      O,
      R,
      a0,
      dA,
      width: meanW * range(rnd, 0.88, 1.14),
      seed: hash(seed, 101 + j),
      start: PHASE.reveal + 0.008 + (PHASE.erosion - PHASE.reveal - 0.07) * Math.pow(u, 0.9) + range(rnd, -0.004, 0.004),
      duration: range(rnd, 0.075, 0.1),
    });
  }

  const scene = { width: W, height: H, s, portrait, heading, h, steps, strokes, cam0, camEnd, pin, seed, quality, camAt, target, panTotal };
  scene.grains = makeGrains(scene, quality === 'lite' ? 0.45 : 1);
  return scene;
}

/** The visual state at progress p: the camera, each step's press, each stroke's head, the erosion. */
export function stateAt(scene, p) {
  const P = clamp(p);
  return {
    p: P,
    cam: scene.camAt(P),
    steps: scene.steps.map((st) => ({ ...envelopes(st, P), active: P >= st.onset })),
    strokes: scene.strokes.map((st) => clamp((P - st.start) / st.duration) * 1.08),
    revealOn: P >= PHASE.reveal,
    erosion: smoothstep(PHASE.erosion, PHASE.clear, P),
    clear: P >= PHASE.clear,
    words: smoothstep(PHASE.words[0], PHASE.words[1], P),
  };
}

/** Where a point lies on an arc stroke: t along it (0 start → 1 end, outside [0, 1] beyond it) and d from its line. */
export function onArc(sk, x, y) {
  const vx = x - sk.O[0];
  const vy = y - sk.O[1];
  const r = Math.hypot(vx, vy);
  const mid = sk.a0 + 0.5 * sk.dA;
  let rel = Math.atan2(vy, vx) - mid;
  rel -= 2 * Math.PI * Math.floor((rel + Math.PI) / (2 * Math.PI));
  return { t: 0.5 + rel / sk.dA, d: Math.abs(r - sk.R) };
}

/** The half-width of a stroke at t: narrow where the brush touches down, full from half way, ragged along its sides
    (never narrowing again, so the swept ground only ever grows as the head moves on). */
const halfWidth = (sk, t, wob) => 0.5 * sk.width * (0.55 + 0.45 * Math.sqrt(Math.sin((Math.PI / 2) * clamp(2 * t)))) * wob;

/**
 * How much sand has been swept away at world point (x, y): 0 = untouched, 1 = gone (before the grain-level dither).
 * The CPU reference of the shader's reveal() (same structure, same integer-hash noise). Exactly 0 before the sweep
 * and exactly 1 from PHASE.clear.
 */
export function revealAt(scene, x, y, p) {
  if (p < PHASE.reveal) return 0;
  if (p >= PHASE.clear) return 1;
  const st = stateAt(scene, p);
  const qx = x + 5 * (vnoise(x * 0.04, y * 0.04) - 0.5);
  const qy = y + 5 * (vnoise(x * 0.04 + 31.7, y * 0.04 - 12.9) - 0.5);
  let cleared = 0;
  let wide = 0;
  scene.strokes.forEach((sk, j) => {
    const head = Math.min(st.strokes[j], 1);
    if (head <= 0) return;
    if (Math.abs(Math.hypot(qx - sk.O[0], qy - sk.O[1]) - sk.R) > 0.65 * sk.width + 16) return;
    const { t } = onArc(sk, qx, qy);
    let dd;
    if (t >= 0 && t <= head) dd = Math.abs(Math.hypot(qx - sk.O[0], qy - sk.O[1]) - sk.R);
    else {
      const S = [sk.O[0] + sk.R * Math.cos(sk.a0), sk.O[1] + sk.R * Math.sin(sk.a0)];
      const Hd = [sk.O[0] + sk.R * Math.cos(sk.a0 + sk.dA * head), sk.O[1] + sk.R * Math.sin(sk.a0 + sk.dA * head)];
      dd = Math.min(Math.hypot(qx - S[0], qy - S[1]), Math.hypot(qx - Hd[0], qy - Hd[1]));
    }
    const wob = 1 + 0.36 * (vnoise(qx * 0.11 + j * 13.1, qy * 0.11) - 0.5) + 0.16 * (vnoise(qx * 0.4, qy * 0.4 + j * 7.3) - 0.5);
    const half = halfWidth(sk, clamp(t, 0, head), wob);
    dd += 2.2 * (vnoise(qx * 0.3, qy * 0.3 + j) - 0.5);
    cleared = Math.max(cleared, 1 - smoothstep(half - 2.2, half + 0.8, dd));
    wide = Math.max(wide, 1 - smoothstep(half + 2, half + 14, dd));
  });
  // The erosion: what is left breaks into rounded clumps (a union of discs, each shrinking at its own moment)
  let remain = 0;
  if (st.erosion <= 0) remain = 1;
  else {
    const x0 = qx / 4.5;
    const y0 = qy / 4.5;
    const ix = Math.floor(x0);
    const iy = Math.floor(y0);
    const wob2 = 0.26 * (vnoise(qx * 0.9, qy * 0.9) - 0.5) + 0.12 * (vnoise(qx * 2.7, qy * 2.7) - 0.5);
    for (let jy = -1; jy <= 1; jy++) {
      for (let jx = -1; jx <= 1; jx++) {
        const cx = ix + jx;
        const cy = iy + jy;
        const px = cx + h2f(cx + 11, cy);
        const py = cy + h2f(cx, cy + 988);
        // Clumps next to swept ground go first, the rest in turn (never holes punched everywhere at once)
        const tau = 0.45 * h2f(cx - 33, cy + 4111) + 0.55 * (1 - wide);
        const r = 1.3 * (1 - smoothstep(0.7 * tau, 0.7 * tau + 0.3, st.erosion));
        remain = Math.max(remain, 1 - smoothstep(r - 0.32, r + 0.04, Math.hypot(x0 - px, y0 - py) + wob2));
      }
    }
  }
  return clamp(1 - (1 - cleared) * remain);
}

/* The grains: a fixed pool, each with a birth, a life and a path, all from the seed. Their state at p is computed
   from p alone (pos = start + velocity × eased age, a low arc in z), so seeking needs no history. */
function makeGrains(scene, density) {
  const list = [];
  const rnd = seeded(hash(scene.seed, 777));
  const n1 = Math.round(26 * density);
  scene.steps.forEach((st, k) => {
    for (let g = 0; g < n1; g++) {
      const r = rnd();
      const region = r < 0.42 ? 'heel' : r < 0.76 ? 'ball' : 'toes';
      const t0 = region === 'heel' ? range(rnd, 0.06, 0.36) : region === 'ball' ? range(rnd, 0.34, 0.7) : range(rnd, 0.62, 0.94);
      const a = range(rnd, 0, Math.PI * 2);
      let lm;
      let ly;
      let out;
      if (region === 'heel') {
        lm = FOOT.heel.c[0] + Math.cos(a) * FOOT.heel.r[0] * 1.08;
        ly = FOOT.heel.c[1] + Math.sin(a) * FOOT.heel.r[1] * 1.08;
        out = [Math.cos(a), Math.sin(a)];
      } else if (region === 'ball') {
        const u = rnd();
        lm = mix(FOOT.ball.a[0], FOOT.ball.b[0], u) + Math.cos(a) * 2.4;
        ly = mix(FOOT.ball.a[1], FOOT.ball.b[1], u) + Math.sin(a) * 2.2;
        out = [Math.cos(a), Math.sin(a)];
      } else {
        const toe = FOOT.toes[Math.floor(rnd() * 5)];
        const fa = range(rnd, -0.6, 0.6) + Math.PI / 2;
        lm = toe.c[0] + Math.cos(fa) * toe.r[0] * 1.2;
        ly = toe.c[1] + Math.sin(fa) * toe.r[1] * 1.2;
        out = [Math.cos(fa) * 0.6, 1]; // the push-off flicks sand forwards
      }
      const speed = range(rnd, 1.2, region === 'toes' ? 5.5 : 4);
      list.push({ kind: 0, step: k, local: [lm, ly], out: [out[0] * speed, out[1] * speed], born: st.onset + t0 * st.duration, life: range(rnd, 0.006, 0.013), z: range(rnd, 0.4, region === 'toes' ? 2.2 : 1.4), size: range(rnd, 0.9, 1.9), shade: rnd() < 0.3 ? range(rnd, 0.62, 0.8) : range(rnd, 0.92, 1.08) });
    }
  });
  const n2 = Math.round(24 * density);
  scene.strokes.forEach((sk) => {
    for (let g = 0; g < n2; g++) {
      const f = range(rnd, 0.06, 0.94);
      const a = sk.a0 + sk.dA * f;
      const off = (rnd() < 0.5 ? -1 : 1) * Math.pow(rnd(), 0.35) * 0.5 * sk.width;
      const rr = sk.R + off;
      const pos = [sk.O[0] + Math.cos(a) * rr, sk.O[1] + Math.sin(a) * rr];
      // The brush's direction of travel (the arc's tangent), plus a little outwards
      const dir = Math.sign(sk.dA);
      const tan = [-Math.sin(a) * dir, Math.cos(a) * dir];
      const nrm = [Math.cos(a) * Math.sign(off), Math.sin(a) * Math.sign(off)];
      const sp = range(rnd, 3, 10);
      const lat = range(rnd, 0.5, 2.5);
      list.push({ kind: 1, pos, out: [tan[0] * sp + nrm[0] * lat, tan[1] * sp + nrm[1] * lat], born: sk.start + (f / 1.08) * sk.duration, life: range(rnd, 0.008, 0.02), z: range(rnd, 0.3, 1.3), size: range(rnd, 1, 2.3), shade: range(rnd, 0.82, 1.06) });
    }
  });
  const n3 = Math.round(70 * density);
  const vw = scene.width / scene.s;
  const vh = scene.height / scene.s;
  for (let g = 0; g < n3; g++) {
    const pos = [scene.camEnd[0] + range(rnd, -0.48, 0.48) * vw, scene.camEnd[1] + range(rnd, -0.48, 0.48) * vh];
    const a = range(rnd, 0, Math.PI * 2);
    const sp = range(rnd, 0.8, 3.2);
    list.push({ kind: 2, pos, out: [Math.cos(a) * sp, Math.sin(a) * sp], born: range(rnd, PHASE.erosion + 0.02, PHASE.clear - 0.03), life: range(rnd, 0.012, 0.022), z: range(rnd, 0.05, 0.35), size: range(rnd, 1.6, 3), shade: range(rnd, 0.84, 1.02) });
  }
  return list;
}

/**
 * The grains alive at p, as stage CSS pixels: [x, y, size, alpha, shade, height(px)] × count. A grain is drawn only
 * while it lives; a sweep or erosion grain only over sand that is still there when it is born.
 */
export function grainsAt(scene, p, cam = scene.camAt(p)) {
  const out = [];
  const W2 = scene.width / 2;
  const H2 = scene.height / 2;
  for (const g of scene.grains) {
    const age = (p - g.born) / g.life;
    if (age < 0 || age >= 1) continue;
    let x;
    let y;
    if (g.kind === 0) {
      const st = scene.steps[g.step];
      const fh = st.h;
      const med = [st.sigma * fh[1], -st.sigma * fh[0]]; // the medial direction
      const wx = st.c[0] + med[0] * g.local[0] * st.v.width + fh[0] * g.local[1] * st.v.length;
      const wy = st.c[1] + med[1] * g.local[0] * st.v.width + fh[1] * g.local[1] * st.v.length;
      const ox = med[0] * g.out[0] + fh[0] * g.out[1];
      const oy = med[1] * g.out[0] + fh[1] * g.out[1];
      const e = 1 - (1 - age) * (1 - age);
      x = wx + ox * e;
      y = wy + oy * e;
      if (p >= PHASE.reveal) continue;
    } else {
      const e = 1 - (1 - age) * (1 - age);
      x = g.pos[0] + g.out[0] * e;
      y = g.pos[1] + g.out[1] * e;
      if (revealAt(scene, g.pos[0], g.pos[1], g.born) > 0.5 && g.kind === 2) continue;
    }
    const alpha = smoothstep(0, 0.08, age) * (1 - smoothstep(0.72, 1, age));
    const z = 4 * age * (1 - age) * g.z;
    out.push((x - cam[0]) * scene.s + W2, (y - cam[1]) * scene.s + H2, g.size, alpha, g.shade, z * scene.s);
  }
  return out;
}
