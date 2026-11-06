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
     0.605–0.80 long, gently curved brushing passes in parallel rows, back and forth, sweep the sand off, the first along
                the trail, then outwards to either side; each pushes a heap ahead of it, piles sand along its sides and
                spills a few grains. Together they cover the whole stage, so it clears steadily (by about 0.80 at every
                size; the last passes run out beyond it)
     0.76–0.95  what the passes leave at their edges crumbles into rounded clumps, those next to swept ground first,
                uncovering the destination: the woman at the water's edge, the walk's last four prints behind her, in
                the same places as the animated ones (the animated prints go with the sand they were pressed into; the
                image's stay)
     0.84–0.97  the eyebrow, the headline, the line and the link rise in, one after another; from 0.95 no sand is left
                anywhere (revealAt is exactly 1) */
import { seeded, range, hash, clamp, mix, smoothstep } from './random.js';
import { FOOT, envelopes, variation } from './foot.js';
import { vnoise, h2f } from './noise.js';

/** Eight steps on wide screens; six on portrait phones, where the brief allows fewer (the stride stays real). */
export const STEPS = 8;
export const STEPS_PORTRAIT = 6;
export const PHASE = { first: [0.04, 0.09], walkEnd: 0.6, reveal: 0.605, brush: 0.84, erosion: 0.76, clear: 0.95, words: [0.84, 0.97] };
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
 * The destination image's own trail (the owner's goodtimes-ocean-footprints-reveal, 1672 × 941): its four prints in
 * walking order, in image pixels, measured from the image (each print's dark interior: centroid, principal axis and
 * length; which foot from the side its big toe and its midfoot band are on). The animated walk ends on exactly these
 * four, so when the sand is swept away the same prints are there in the image: one trail, one walker.
 */
export const PHOTO = {
  width: 1672,
  height: 941,
  footLength: 132, // heel to toe tip, image px
  prints: [
    { c: [120.6, 320.5], angle: 24.3, foot: 'right' },
    { c: [348.5, 409.3], angle: 25.0, foot: 'left' },
    { c: [546.1, 561.8], angle: 20.0, foot: 'right' },
    { c: [816.5, 620.1], angle: 19.3, foot: 'left' },
  ],
  // The woman, hat to feet (x0, y0, x1, y1): every placement keeps her whole
  subject: [1100, 95, 1310, 662],
  // Where the image is fitted to a frame (portrait and short landscape screens), its x = 1340 (just past her hat) is
  // the frame's right edge
  portraitRight: 1340,
};

/**
 * Where motion.css places the image on a stage of W × H CSS px whose top headerH px lie under the sticky header and
 * whose bottom bar px lie under the call bar (phones and tablets): { k: CSS px per image px, ox, oy: the image's
 * top-left corner }.
 * - Wide screens: the image covers the stage below the header, anchored left (object-position 0% 25%).
 * - Portrait screens: a frame below the header, as tall as the screen is wide less what the words (17.5rem) and the
 *   call bar need under it (at least 13rem), the image height-fitted with its x = 1340 at the frame's right edge.
 * - Short landscape screens (at most 640 px tall): the image height-fitted between the header and the call bar, its
 *   x = 1340 at the right edge, the words to its left.
 * The page measures the real placement and passes it in; this is the same rule, for the tests.
 */
export function photoPlacement(W, H, headerH = 0, bar = 0) {
  const fit = (frameH, right) => {
    const k = frameH / PHOTO.height;
    return { k, ox: right - PHOTO.portraitRight * k, oy: headerH };
  };
  if (W / H <= 1) {
    const p = fit(Math.max(208, Math.min(W, H - headerH - bar - 280)), W);
    return { ...p, ox: Math.min(0, p.ox) };
  }
  if (H <= 640) return fit(H - headerH - bar, W);
  const bh = H - headerH;
  const k = Math.max(W / PHOTO.width, bh / PHOTO.height);
  return { k, ox: 0, oy: headerH + (bh - PHOTO.height * k) * 0.25 };
}

/**
 * The scene for a stage of width × height CSS px. pinAt: the progress at which the stage is held (the controller
 * measures it from the scroll geometry). photo: where the destination image sits ({ k, ox, oy }, measured by the page;
 * by default photoPlacement() with headerH and bar). quality: 'full' or 'lite' (fewer grains).
 */
export function layoutScene({ width, height, pinAt = 0.25, seed = SEED, quality = 'full', photo = null, headerH = 0, bar = 0 }) {
  const W = Math.max(1, width);
  const H = Math.max(1, height);
  const portrait = W / H <= 1;
  const place = photo || photoPlacement(W, H, headerH, bar);
  // The animated feet are the image's prints' size, so the two trails are one
  const s = (place.k * PHOTO.footLength) / FOOT.length;
  const rnd = seeded(seed);

  // World centimetres; the held view at the end is the stage itself (world = stage px / s), so the image's prints
  // have fixed world positions
  const camEnd = [W / 2 / s, H / 2 / s];
  const P = PHOTO.prints.map((pr) => ({
    c: [(place.ox + pr.c[0] * place.k) / s, (place.oy + pr.c[1] * place.k) / s],
    a: (pr.angle * Math.PI) / 180,
    foot: pr.foot,
  }));
  const d = [P[3].c[0] - P[0].c[0], P[3].c[1] - P[0].c[1]];
  const dl = Math.hypot(d[0], d[1]);
  const heading = Math.atan2(d[1], d[0]);
  const h = [d[0] / dl, d[1] / dl];
  let stride = 0;
  for (let i = 1; i < 4; i++) stride += Math.hypot(P[i].c[0] - P[i - 1].c[0], P[i].c[1] - P[i - 1].c[1]) / 3;

  // The gait: the last four steps are the image's; before them the walk is extended backwards with the image's own
  // stride, step width and alternation, along its walking line (between the two feet's tracks), bending gently away
  // from it (the walker comes in more level and veers down towards the water)
  const count = portrait ? STEPS_PORTRAIT : STEPS;
  const m = count - 4;
  const opposite = (f) => (f === 'left' ? 'right' : 'left');
  const mid = (a, b) => [(a.c[0] + b.c[0]) / 2, (a.c[1] + b.c[1]) / 2];
  const off = (q, a, b) => Math.abs((b.c[0] - a.c[0]) * (q.c[1] - a.c[1]) - (b.c[1] - a.c[1]) * (q.c[0] - a.c[0])) / Math.hypot(b.c[0] - a.c[0], b.c[1] - a.c[1]);
  // Half the distance between the tracks: each print's distance from the line through the two either side of it, halved
  const halfWidth = (off(P[1], P[0], P[2]) + off(P[2], P[1], P[3])) / 4;
  // The walking line where the first print was made, and its direction there
  const m12 = mid(P[0], P[1]);
  const m23 = mid(P[1], P[2]);
  const walkDir = Math.atan2(m23[1] - m12[1], m23[0] - m12[0]);
  const steps = [];
  for (let k = 0; k < count; k++) {
    const sseed = hash(seed, k + 1);
    const v = variation(sseed);
    steps.push({ index: k, v, seed: sseed, onset: 0, duration: 0 });
  }
  // The image's steps: their positions, headings and feet exactly; the foot's size is the image's (no variation)
  for (let i = 0; i < 4; i++) {
    const st = steps[m + i];
    st.foot = P[i].foot;
    st.c = P[i].c;
    st.h = [Math.cos(P[i].a), Math.sin(P[i].a)];
    st.v = { ...st.v, length: 1, width: 1, angle: 0 };
    st.photo = i;
  }
  // The walk before them, from the image's first print backwards: the line turns away from the image's own
  // direction slowly at first (the bend grows with the square of the distance), 4.5° a step on average (18° at the
  // first of eight steps, 9° at the first of six)
  let line = [m12[0] - (Math.cos(walkDir) * stride) / 2, m12[1] - (Math.sin(walkDir) * stride) / 2];
  let foot = P[0].foot;
  for (let j = 1; j <= m; j++) {
    const st = steps[m - j];
    const bend = walkDir - 4.5 * m * Math.pow(j / Math.max(1, m), 2) * (Math.PI / 180);
    const len = stride * range(rnd, 0.97, 1.03);
    line = [line[0] - Math.cos(bend) * len, line[1] - Math.sin(bend) * len];
    foot = opposite(foot);
    const left = [Math.sin(bend), -Math.cos(bend)]; // the walker's left (y down)
    const side = (foot === 'left' ? 1 : -1) * halfWidth * range(rnd, 0.85, 1.15);
    st.foot = foot;
    st.c = [line[0] + left[0] * side, line[1] + left[1] * side];
    const a = bend + ((foot === 'left' ? -1 : 1) * 4 + st.v.angle) * (Math.PI / 180);
    st.h = [Math.cos(a), Math.sin(a)];
  }
  for (const st of steps) {
    st.sigma = st.foot === 'left' ? -1 : 1;
    st.depth = 2.1 * st.v.depth;
  }

  // Where the first print sits (just under the hero's edge, and clear of the sticky header once the stage is held), and
  // the camera before it moves
  const footPx = FOOT.length * s;
  // A print's half-height on screen (a foot pointing across the screen is about 0.45 of its length tall)
  const halfH = (st) => (Math.abs(st.h[1]) * 0.55 + Math.abs(st.h[0]) * 0.22) * footPx;
  for (const st of steps) st.halfH = halfH(st);
  // The first two prints both clear the header by 8 px (the second, a left foot, lies a little higher than the first)
  const lift = Math.max(...[0, 1].map((k) => steps[k].halfH - (steps[k].c[1] - steps[0].c[1]) * s));
  const first = [(portrait ? 0.12 : 0.1) * W, Math.max(0.22 * H, headerH + 8 + lift)];
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
  const top = (headerH + 8) / H; // clear of the header once the stage is held
  let entry = 1;
  for (let k = 1; k < m; k++) {
    const [x, y] = at0(k);
    const from = Math.max(steps[k - 1].onset + 0.065, ((y + halfFoot + 0.04 - 1 + START) * pin) / START);
    if (x > 0.92 || y > 0.8 || y - steps[k].halfH / H < top || from + 0.072 > pin - 0.03 || shown(from) < y + halfFoot) break;
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

  // The camera: still while the stage scrolls in, then an even glide (eased only at its ends) from there to the held
  // view, which is the image's own framing: it arrives as the last heel strikes, and stays for the sweep
  const glideEnd = steps[count - 1].onset + steps[count - 1].duration * 0.45;
  const camAt = (p) => {
    const u = clamp((Math.min(p, PHASE.walkEnd) - (pin - 0.02)) / (glideEnd - (pin - 0.02)));
    const eased = 0.6 * u + 0.4 * u * u * (3 - 2 * u);
    return [mix(cam0[0], camEnd[0], eased), mix(cam0[1], camEnd[1], eased)];
  };
  const last = steps[count - 1].c;
  const panTotal = Math.hypot(camEnd[0] - cam0[0], camEnd[1] - cam0[1]) * s;

  // The sweep: someone brushing the sand off in long, gently curved passes, side by side and back and forth, in one
  // direction (along the trail), starting with the pass over the
  // last prints and working outwards. Each pass is a circular arc from beyond one edge of the held stage to beyond
  // the other; whatever is left in between crumbles in the erosion.
  const vw = W / s;
  const vh = H / s;
  const prev = steps[count - 2].c;
  const focus = [(last[0] + prev[0]) / 2, (last[1] + prev[1]) / 2];
  const dir0 = heading;
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
    const jit = (range(rnd, -3, 3) * Math.PI) / 180;
    const dx = Math.cos(dir0 + jit) * (j % 2 ? -1 : 1);
    const dy = Math.sin(dir0 + jit) * (j % 2 ? -1 : 1);
    const cx = camEnd[0] + nx * off;
    const cy = camEnd[1] + ny * off;
    const half = 0.62 * alongExt;
    const A = [cx - dx * half, cy - dy * half];
    const B = [cx + dx * half, cy + dy * half];
    // A gentle bow, the same way round for every pass (the brush works in parallel curved rows, so neighbouring passes
    // overlap rather than leave unswept bands between them; the passes go back and forth, so the side flips with them)
    const R = range(rnd, 650, 1300);
    const chord = Math.hypot(B[0] - A[0], B[1] - A[1]);
    const side = j % 2 ? -1 : 1;
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
      start: PHASE.reveal + 0.008 + (PHASE.brush - PHASE.reveal - 0.07) * Math.pow(u, 0.9) + range(rnd, -0.004, 0.004),
      duration: range(rnd, 0.075, 0.1),
    });
  }

  const scene = { width: W, height: H, s, portrait, heading, h, steps, strokes, cam0, camEnd, pin, seed, quality, camAt, panTotal, place, stride };
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
