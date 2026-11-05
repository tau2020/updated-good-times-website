/* Good Times in Cape Town — the sand journey's shaders (WebGL2, GLSL ES 3.00).

   One full-stage pass draws the sand: a height field (low dunes, wind ripples, grain relief from a texture baked once
   at start, and the eight footprints from foot.js, each pressed heel → ball → toes by its envelopes), lit by one low
   sun from the upper left (normals from the height field, soft shadows cast by the prints' walls, occlusion in the
   cavities, compressed sand a little darker), and cut away by the sweep (strokes with ragged, crumbling edges, the
   remaining layer's thickness catching the light and shadowing the photograph beneath). A point pass draws the few
   grains in flight. The constants for the foot are written from foot.js, so the GPU and the tested CPU model agree.
   Nothing here reads a clock: the picture is a function of the uniforms, and the uniforms of the scroll progress. */
import { FOOT } from './foot.js';

const f = (n) => {
  const s = Number(n).toFixed(4);
  return s.includes('.') ? s : `${s}.0`;
};
const v2 = (a) => `vec2(${f(a[0])}, ${f(a[1])})`;

const HASH = `
uint hash2u(ivec2 p) {
  uint h = (uint(p.x) * 0x8da6b343u) ^ (uint(p.y) * 0xd8163841u);
  h ^= h >> 13; h *= 0x5bd1e995u; h ^= h >> 15;
  return h;
}
float h2f(ivec2 p) { return float(hash2u(p) & 0xffffffu) / 16777216.0; }
float vnoise(vec2 x) {
  vec2 i = floor(x); vec2 fr = x - i; vec2 u = fr * fr * (3.0 - 2.0 * fr);
  ivec2 c = ivec2(i);
  float a = h2f(c), b = h2f(c + ivec2(1, 0)), d = h2f(c + ivec2(0, 1)), e = h2f(c + ivec2(1, 1));
  return a + (b - a) * u.x + (d - a) * u.y + (a - b - d + e) * u.x * u.y;
}`;

export const VERTEX = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

/* The grain detail, baked once into a 1024² tile (one texel ≈ 0.7 mm of sand): R grain relief, G albedo variation,
   B mineral specks and shell fragments (0.5 = none), A broad mottling (damper, more compact patches). Tileable: every
   lattice wraps at the tile's size. */
export const BAKE = `#version 300 es
precision highp float;
precision highp int;
out vec4 outColor;
${HASH}
const int N = 1024;
float wrapNoise(vec2 x, int period) {
  vec2 i = floor(x); vec2 fr = x - i; vec2 u = fr * fr * (3.0 - 2.0 * fr);
  ivec2 c = ivec2(i);
  ivec2 c0 = ivec2((c.x % period + period) % period, (c.y % period + period) % period);
  ivec2 c1 = ivec2(((c.x + 1) % period + period) % period, ((c.y + 1) % period + period) % period);
  float a = h2f(c0), b = h2f(ivec2(c1.x, c0.y)), d = h2f(ivec2(c0.x, c1.y)), e = h2f(c1);
  return a + (b - a) * u.x + (d - a) * u.y + (a - b - d + e) * u.x * u.y;
}
void main() {
  vec2 t = gl_FragCoord.xy - 0.5;
  ivec2 it = ivec2(t);
  // Grains: one random height per texel, softened a little by its neighbours
  float g0 = h2f(it);
  float g1 = 0.25 * (h2f(ivec2((it.x + 1) % N, it.y)) + h2f(ivec2((it.x + N - 1) % N, it.y)) + h2f(ivec2(it.x, (it.y + 1) % N)) + h2f(ivec2(it.x, (it.y + N - 1) % N)));
  float grain = mix(g0, g1, 0.35);
  float relief = 0.55 * grain + 0.3 * wrapNoise(t / 4.0, 256) + 0.15 * wrapNoise(t / 8.0, 128);
  float albedo = 0.5 + 0.55 * (h2f(it + ivec2(7, 3)) - 0.5) + 0.25 * (wrapNoise(t / 4.0 + 17.0, 256) - 0.5);
  // Dark heavy minerals (1–2 % of grains), a few cream shell fragments a few texels wide (4 × 4 clusters)
  float speck = 0.5;
  float m = h2f(it + ivec2(101, 57));
  if (m < 0.016) speck = 0.08 + 0.2 * h2f(it + ivec2(5, 9));
  ivec2 cl = it / 4;
  vec2 inCl = vec2(it - cl * 4) - 1.5 + vec2(h2f(cl + ivec2(3, 1)), h2f(cl + ivec2(1, 3))) - 0.5;
  if (h2f(cl + ivec2(911, 37)) < 0.012 && length(inCl) < 1.7) speck = 0.9 + 0.1 * h2f(cl);
  float mottle = 0.62 * wrapNoise(t / 64.0, 16) + 0.38 * wrapNoise(t / 16.0, 64);
  outColor = vec4(clamp(relief, 0.0, 1.0), clamp(albedo, 0.0, 1.0), speck, mottle);
}`;

const toeConsts = FOOT.toes.map((t) => v2(t.c)).join(', ');
const toeRadii = FOOT.toes.map((t) => v2(t.r)).join(', ');
const toeWeights = FOOT.toes.map((t) => f(t.w)).join(', ');

export const SAND = `#version 300 es
precision highp float;
precision highp int;
out vec4 outColor;
uniform vec2 uRes;        // drawing buffer, device px
uniform float uScale;     // device px per cm
uniform vec2 uCam;        // world cm at the stage's centre
uniform int uSteps;
uniform vec4 uStepA[8];   // centre (cm), heading (unit)
uniform vec4 uStepB[8];   // sigma (+1 right, -1 left), length, width, depth (cm)
uniform vec4 uStepC[8];   // heel, fore, toes envelopes, toe spread
uniform vec4 uStepD[8];   // heel bias, little toe weight, seed, active
uniform int uStrokes;
uniform vec4 uStrokeA[16]; // arc centre (cm), radius (cm), start angle
uniform vec4 uStrokeB[16]; // signed sweep angle, width (cm), head (0..1.08), unused
uniform float uRevealOn;
uniform float uErosion;
uniform float uClear;
uniform vec3 uLight;
uniform float uFull;      // 1 full quality, 0 lite
uniform sampler2D uDetail;
${HASH}

const vec2 HEEL_C = ${v2(FOOT.heel.c)}; const vec2 HEEL_R = ${v2(FOOT.heel.r)};
const vec2 LAT_A = ${v2(FOOT.lateral.a)}; const vec2 LAT_B = ${v2(FOOT.lateral.b)};
const float LAT_RA = ${f(FOOT.lateral.ra)}; const float LAT_RB = ${f(FOOT.lateral.rb)}; const float LAT_W = ${f(FOOT.lateral.w)};
const vec2 BALL_A = ${v2(FOOT.ball.a)}; const vec2 BALL_B = ${v2(FOOT.ball.b)};
const float BALL_RA = ${f(FOOT.ball.ra)}; const float BALL_RB = ${f(FOOT.ball.rb)}; const float BALL_W = ${f(FOOT.ball.w)};
const vec2 HAL_A = ${v2(FOOT.hallux.a)}; const vec2 HAL_B = ${v2(FOOT.hallux.b)};
const float HAL_RA = ${f(FOOT.hallux.ra)}; const float HAL_RB = ${f(FOOT.hallux.rb)}; const float HAL_W = ${f(FOOT.hallux.w)};
const vec2 TOE_C[5] = vec2[5](${toeConsts});
const vec2 TOE_R[5] = vec2[5](${toeRadii});
const float TOE_W[5] = float[5](${toeWeights});
const float WALL = ${f(FOOT.wall)}; const float TOE_WALL = ${f(FOOT.toeWall)};
const float RIM = ${f(FOOT.rim)}; const float RIM_H = ${f(FOOT.rimHeight)};
const float BLEND_HL = ${f(FOOT.blend[0])}; const float BLEND_LB = ${f(FOOT.blend[1])};
const float GROW_SOLE = ${f(FOOT.grow[0])}; const float GROW_TOES = ${f(FOOT.grow[1])};

float sdEllipse(vec2 p, vec2 r) {
  float k0 = length(p / r); float k1 = length(p / (r * r));
  return k1 < 1e-5 ? -min(r.x, r.y) : k0 * (k0 - 1.0) / k1;
}
float sdCapsule(vec2 p, vec2 a, vec2 b, float ra, float rb) {
  vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h) - mix(ra, rb, h);
}
float smin(float a, float b, float k) { float h = max(k - abs(a - b), 0.0) / k; return min(a, b) - h * h * k * 0.25; }

// One print's relief at world point w (negative: pressed in; positive: the displaced rim). press: how compressed.
float footRelief(int i, vec2 w, out float press) {
  press = 0.0;
  vec4 A = uStepA[i]; vec4 B = uStepB[i]; vec4 C = uStepC[i]; vec4 D = uStepD[i];
  vec2 d = w - A.xy;
  vec2 fh = A.zw;
  vec2 med = B.x * vec2(fh.y, -fh.x);
  vec2 L = vec2(dot(d, med) / B.z, dot(d, fh) / B.y);
  float reach = length(L);
  if (reach > 19.5) return 0.0;
  // Grain-scale irregularity of the walls (crumbled edges, never a clean outline)
  float n = (vnoise(w * 2.6 + D.z) - 0.5) + 0.5 * (vnoise(w * 6.3 - D.z) - 0.5) + 0.3 * (vnoise(w * 13.0 + D.z * 0.5) - 0.5);
  float sdH = sdEllipse(L - HEEL_C, HEEL_R);
  float sdL = sdCapsule(L, LAT_A, LAT_B, LAT_RA, LAT_RB);
  float sdB = sdCapsule(L, BALL_A, BALL_B, BALL_RA, BALL_RB);
  float envSole = mix(C.x, C.y, smoothstep(-7.0, -1.0, L.y));
  // Each part's contact spreads as it sinks: the patch starts small in the middle and grows to the full outline
  float sole = smin(smin(sdH, sdL, BLEND_HL), sdB, BLEND_LB) + pow(1.0 - envSole, 1.5) * GROW_SOLE + n * 0.26;
  float wH = (1.0 + D.x) * smoothstep(0.9, -0.6, sdH);
  float wL = LAT_W * (0.35 + 0.65 * smoothstep(1.2, -2.5, L.x)) * smoothstep(0.9, -0.6, sdL);
  float wB = (BALL_W - D.x) * smoothstep(0.9, -0.6, sdB) * mix(0.84, 1.0, clamp((L.x + 3.4) / 5.8, 0.0, 1.0));
  float weight = max(wH, max(wL, wB));
  float cup = clamp(-sole / 2.0, 0.0, 1.0);
  float depth = B.w * smoothstep(0.0, WALL, -sole) * weight * envSole * (0.88 + 0.12 * cup);
  // Toes: the big toe's link to the ball, then the five pads (spread about the second toe)
  float growT = pow(1.0 - C.z, 1.5) * GROW_TOES;
  float toes = sdCapsule(L, HAL_A, HAL_B, HAL_RA, HAL_RB) + growT + n * 0.14;
  float dT = B.w * HAL_W * smoothstep(0.0, TOE_WALL, -toes) * C.z;
  for (int t = 0; t < 5; t++) {
    vec2 c = TOE_C[t];
    c.x = TOE_C[1].x + (c.x - TOE_C[1].x) * C.w;
    c.y -= abs(TOE_C[t].x - TOE_C[1].x) * (C.w - 1.0) * 0.35;
    float sd = sdEllipse(L - c, TOE_R[t]) + growT + n * 0.14;
    toes = min(toes, sd);
    float tw = t == 4 ? D.y : TOE_W[t];
    float tip = 0.8 + 0.2 * clamp((L.y - c.y) / TOE_R[t].y + 0.5, 0.0, 1.0);
    dT = max(dT, B.w * tw * smoothstep(0.0, TOE_WALL, -sd) * tip * C.z);
  }
  depth = max(depth, dT);
  press = depth / max(B.w, 0.01);
  float sd = min(sole, toes);
  float rim = 0.0;
  if (sd > 0.0) {
    float k = sd / RIM;
    // Which part's press raised this rim: blended across the line between the sole's and the toes' outlines (a hard
    // switch there would leave a seam while the toes are still in the air)
    float near = mix(envSole, C.z, smoothstep(-0.8, 0.8, sole - toes));
    float where = 1.0 + 0.35 * smoothstep(-9.0, -12.5, L.y) + 0.55 * smoothstep(9.0, 12.5, L.y);
    // The rim is lumpy: displaced sand gathers in soft heaps, never an even ring
    float lumps = 0.55 + 0.6 * vnoise(w * 0.85 + D.z * 0.37) + 0.25 * vnoise(w * 2.3 - D.z);
    // Fades to nothing well inside the distance at which a print stops being evaluated (no seam)
    rim = RIM_H * B.w * k * exp(1.0 - k) * near * where * lumps * smoothstep(19.0, 15.5, reach);
  }
  return rim - depth;
}

float prints(vec2 w, int i0, int i1, out float press) {
  float h = 0.0; press = 0.0; float pr;
  if (i0 >= 0) { h += footRelief(i0, w, pr); press = max(press, pr); }
  if (i1 >= 0) { h += footRelief(i1, w, pr); press = max(press, pr); }
  return h;
}

// Low dunes and wind ripples (cm), flattened where the foot compressed the sand
float ground(vec2 w, float press) {
  float dunes = 0.9 * (vnoise(w * 0.012) - 0.5) + 0.35 * (vnoise(w * 0.031 + 7.0) - 0.5);
  vec2 rd = normalize(vec2(0.94, 0.34));
  float warp = 9.0 * (vnoise(w * 0.022 + 3.1) - 0.5) + 2.5 * (vnoise(w * 0.09) - 0.5);
  float ph = (dot(w, rd) + warp) / 7.4;
  float fr = fract(ph);
  // Asymmetric ripple: a long gentle stoss slope and a short steep lee
  float rip = fr < 0.72 ? fr / 0.72 : 1.0 - (fr - 0.72) / 0.28;
  rip = smoothstep(0.0, 1.0, rip);
  float amp = 0.085 * (0.45 + 0.55 * vnoise(w * 0.05 + 11.0));
  return dunes + (rip - 0.5) * amp * (1.0 - 0.85 * press);
}

// How much of the sand has been swept away (0 untouched, 1 gone); the sand the brush pushed into piles (cm); and, on
// swept ground, how near the edge of the sand it is (where a few spilled grains lie). CPU reference: revealAt().
float reveal(vec2 w, out float pile, out float fringe) {
  pile = 0.0;
  fringe = 0.0;
  if (uRevealOn < 0.5) return 0.0;
  if (uClear > 0.5) return 1.0;
  vec2 q = w + 5.0 * vec2(vnoise(w * 0.04) - 0.5, vnoise(w * 0.04 + vec2(31.7, -12.9)) - 0.5);
  float cleared = 0.0;
  float inner = 0.0;
  float wide = 0.0;
  for (int j = 0; j < 16; j++) {
    if (j >= uStrokes) break;
    float head = min(uStrokeB[j].z, 1.0);
    if (head <= 0.0) continue;
    vec2 O = uStrokeA[j].xy; float R = uStrokeA[j].z; float a0 = uStrokeA[j].w; float dA = uStrokeB[j].x;
    vec2 v = q - O;
    // Every point of the stroke (body and both caps) lies on its circle, so a pixel further from the circle than the
    // widest half-width plus the margins below cannot be touched by it: skip it (most strokes, for most pixels)
    if (abs(length(v) - R) > 0.65 * uStrokeB[j].y + 16.0) continue;
    float rel = atan(v.y, v.x) - (a0 + 0.5 * dA);
    rel -= 6.28318530718 * floor((rel + 3.14159265359) / 6.28318530718);
    float t = 0.5 + rel / dA;
    // The swept ground is a capsule along the arc from its start to the brush's head: round at both ends
    float dd;
    vec2 Hd = O + R * vec2(cos(a0 + dA * head), sin(a0 + dA * head));
    if (t >= 0.0 && t <= head) dd = abs(length(v) - R);
    else {
      vec2 S = O + R * vec2(cos(a0), sin(a0));
      dd = min(distance(q, S), distance(q, Hd));
    }
    float tc = clamp(t, 0.0, head);
    float wob = 1.0 + 0.36 * (vnoise(q * 0.11 + vec2(float(j) * 13.1, 0.0)) - 0.5) + 0.16 * (vnoise(q * 0.4 + vec2(0.0, float(j) * 7.3)) - 0.5);
    float half_ = 0.5 * uStrokeB[j].y * (0.55 + 0.45 * sqrt(sin(1.57079632679 * clamp(2.0 * tc, 0.0, 1.0)))) * wob;
    dd += 2.2 * (vnoise(q * 0.3 + vec2(0.0, float(j))) - 0.5);
    float c = 1.0 - smoothstep(half_ - 2.2, half_ + 0.8, dd);
    cleared = max(cleared, c);
    wide = max(wide, 1.0 - smoothstep(half_ + 2.0, half_ + 14.0, dd));
    // Pushed sand: a soft ridge along the swept ground's sides, and a heap the brush drives ahead of it
    float ridge = exp(-pow((dd - half_ - 1.6) / 1.6, 2.0));
    float lump = 0.55 + 0.8 * vnoise(q * 0.7 + vec2(float(j)));
    pile = max(pile, 0.4 * ridge * lump);
    if (head < 1.0) {
      vec2 dir = normalize(vec2(-sin(a0 + dA * head), cos(a0 + dA * head)) * sign(dA));
      vec2 hp = Hd + dir * half_ * 0.55;
      pile = max(pile, 0.9 * exp(-dot(q - hp, q - hp) / (half_ * half_ * 0.45)) * lump);
    }
    // Swept with room to spare (more than 4 cm inside this stroke's edge)
    inner = max(inner, 1.0 - smoothstep(half_ - 6.0, half_ - 4.0, dd));
  }
  fringe = cleared * (1.0 - inner);
  // The erosion: what is left breaks into rounded clumps (a union of discs, each shrinking at its own moment), those
  // next to swept ground first, so the clearing spreads outwards instead of holes appearing everywhere at once
  float remain = 0.0;
  if (uErosion <= 0.0) remain = 1.0;
  else {
    vec2 x = q / 4.5; vec2 i = floor(x);
    float wob2 = 0.26 * (vnoise(q * 0.9) - 0.5) + 0.12 * (vnoise(q * 2.7) - 0.5);
    for (int jy = -1; jy <= 1; jy++) for (int jx = -1; jx <= 1; jx++) {
      ivec2 c = ivec2(i) + ivec2(jx, jy);
      vec2 pt = vec2(c) + vec2(h2f(ivec2(c.x + 11, c.y)), h2f(ivec2(c.x, c.y + 988)));
      float tau = 0.45 * h2f(ivec2(c.x - 33, c.y + 4111)) + 0.55 * (1.0 - wide);
      float r = 1.3 * (1.0 - smoothstep(0.7 * tau, 0.7 * tau + 0.3, uErosion));
      // A soft edge, so the dither below turns a clump's rim into loose grains
      remain = max(remain, 1.0 - smoothstep(r - 0.32, r + 0.04, distance(x, pt) + wob2));
    }
  }
  pile *= remain;
  return clamp(1.0 - (1.0 - cleared) * remain, 0.0, 1.0);
}

vec3 toSrgb(vec3 c) { return pow(clamp(c, 0.0, 1.0), vec3(1.0 / 2.2)); }

void main() {
  vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec2 w = uCam + (px - 0.5 * uRes) / uScale;
  float e = 1.0 / uScale;
  float L1 = length(uLight.xy);
  vec2 Ld = uLight.xy / L1;
  float tanEl = uLight.z / L1;

  // Everything that needs screen derivatives (texture LOD, the sweep edge's tilt) runs before any per-pixel branch
  float pile, fringe;
  float gone = reveal(w, pile, fringe);
  // At its edges the layer thins to loose grains (a grain-sized dither of what is left, fixed in the world), and on the
  // swept ground beside it a few spilled grains lie
  float left_ = 1.0 - gone;
  float grainCut = h2f(ivec2(floor(w * 6.0)));
  float sandA = left_ > 0.85 ? left_ : step(grainCut, left_ * 1.15 - 0.08);
  float thick = 0.55 * left_ + pile;
  vec2 tilt = vec2(dFdx(thick), -dFdy(thick)) * uScale;
  tilt *= min(1.0, 1.2 / max(length(tilt), 1e-4));
  vec2 uvA = w / 71.68;
  vec2 uvB = mat2(0.799, -0.602, 0.602, 0.799) * w / 101.3 + 0.37;
  vec4 tA = texture(uDetail, uvA);
  vec4 tB = texture(uDetail, uvB);
  float tx = 1.0 / 1024.0;
  float rAx = texture(uDetail, uvA + vec2(tx, 0.0)).r;
  float rAy = texture(uDetail, uvA + vec2(0.0, tx)).r;

  // The remaining layer's shadow on the photograph (one sample towards the sun; the edge's own softness does the rest),
  // and a few grains spilled from it onto the swept ground right beside it (only where sand is still there)
  float pl, fr;
  float nearSand = uRevealOn > 0.5 && gone > 0.0 ? 1.0 - reveal(w + Ld * 1.5, pl, fr) : 0.0;
  float shadeBelow = 0.3 * nearSand;
  float spill = step(1.0 - 0.16 * nearSand, h2f(ivec2(floor(w * 5.0)) + ivec2(71, 13)));
  sandA = max(sandA, spill * gone * (1.0 - uClear));
  if (sandA < 0.002) {
    outColor = vec4(0.0, 0.0, 0.0, shadeBelow * gone);
    return;
  }

  // The two prints near enough to matter here (each print's relief, rim included, ends 19 cm from its centre)
  int i0 = -1; int i1 = -1;
  for (int i = 0; i < 8; i++) {
    if (i >= uSteps) break;
    if (uStepD[i].w < 0.5) continue;
    if (distance(w, uStepA[i].xy) < 20.5 * max(uStepB[i].y, uStepB[i].z)) { if (i0 < 0) i0 = i; else if (i1 < 0) i1 = i; }
  }

  float press, pr2, pr3;
  float f0 = prints(w, i0, i1, press);
  float fx = prints(w + vec2(e, 0.0), i0, i1, pr2);
  float fy = prints(w + vec2(0.0, e), i0, i1, pr3);
  float g0 = ground(w, press), gx = ground(w + vec2(e, 0.0), press), gy = ground(w + vec2(0.0, e), press);
  float h0 = f0 + g0, hx = fx + gx, hy = fy + gy;

  // Grain relief from the baked tile (sampled above), flattened where the foot compressed the sand
  float smooth_ = 1.0 - 0.45 * press;
  vec2 micro = vec2(rAx - tA.r, rAy - tA.r) * 0.9 * smooth_ * clamp(uScale / 9.0, 0.35, 1.0);
  vec2 grad = vec2((hx - h0) / e, (hy - h0) / e);
  vec3 N = normalize(vec3(-grad.x - micro.x * 1.6 - tilt.x, -grad.y - micro.y * 1.6 - tilt.y, 1.0));

  // Soft shadows cast by the prints' walls (full quality), marching towards the sun
  float shadow = 1.0;
  if (uFull > 0.5 && i0 >= 0) {
    float base = f0;
    for (int k = 1; k <= 7; k++) {
      float dist = float(k) * 0.36;
      float pk;
      float hs = prints(w + Ld * dist, i0, i1, pk);
      float ray = base + dist * tanEl;
      shadow = min(shadow, clamp(1.0 - (hs - ray) * 1.3, 0.0, 1.0));
    }
    shadow = mix(0.45, 1.0, shadow);
  }

  // Occlusion in the cavities: deeper is darker, and the steep walls inside a print darker still
  float depth = max(-f0, 0.0);
  float crevice = smoothstep(0.35, 1.5, length(grad)) * smoothstep(0.05, 0.4, depth);
  float ao = clamp(1.0 - 0.3 * smoothstep(0.0, 1.7, depth) - 0.2 * crevice, 0.45, 1.0);

  // Albedo: pale Cape sand, grain by grain, damper and darker where compacted, specks and shell fragments
  vec3 sand = vec3(0.80, 0.70, 0.54);
  float varA = (tA.g - 0.5) * 0.24 + (tB.g - 0.5) * 0.14;
  vec3 col = sand * (1.0 + varA);
  float mott = mix(tA.a, tB.a, 0.5);
  col *= 0.94 + 0.12 * mott;
  float sp = tA.b;
  if (sp < 0.3) col = mix(col, vec3(0.08, 0.07, 0.065), 0.85 * smooth_);
  else if (sp > 0.85) col = mix(col, vec3(0.93, 0.89, 0.8), 0.7);
  // Compacted, a little damper: darker and slightly greyer where the foot pressed
  col = mix(col, col * vec3(0.86, 0.85, 0.86), smoothstep(0.08, 0.7, press));
  col *= 1.0 - 0.12 * smoothstep(0.1, 0.9, press);

  // Light: a warm low sun, a cool sky, grains a little rougher than Lambert
  float ndl = dot(N, uLight);
  float diff = clamp((ndl + 0.12) / 1.12, 0.0, 1.0);
  vec3 sun = vec3(1.0, 0.95, 0.86) * 1.18;
  vec3 sky = vec3(0.58, 0.66, 0.8) * 0.42;
  vec3 lit = col * (sun * diff * shadow + sky * (0.55 + 0.45 * N.z) * ao);
  lit *= mix(1.0, ao, 0.55);

  // What is left of the layer over the photograph, and its shadow where the photograph shows through
  vec3 rgb = toSrgb(lit);
  float a = sandA + shadeBelow * gone * (1.0 - sandA);
  outColor = vec4(rgb * sandA, a);
}`;

export const GRAIN_VERTEX = `#version 300 es
in vec4 aP;      // x, y (stage CSS px), size (CSS px), alpha
in vec2 aS;      // shade, height above the sand (CSS px)
uniform vec2 uStage;
uniform float uDpr;
uniform vec2 uShadow; // offset per unit of height (towards the lower right)
uniform float uPass;  // 0: shadows, 1: grains
out float vA; out float vShade;
void main() {
  vec2 p = aP.xy + uShadow * aS.y * (1.0 - uPass);
  gl_Position = vec4(p.x / uStage.x * 2.0 - 1.0, 1.0 - p.y / uStage.y * 2.0, 0.0, 1.0);
  gl_PointSize = max(1.0, aP.z * uDpr * (1.0 + 0.04 * aS.y * uPass));
  vA = aP.w * (uPass > 0.5 ? 1.0 : 0.28 * clamp(aS.y / 6.0, 0.0, 1.0));
  vShade = aS.x;
}`;

export const GRAIN_FRAGMENT = `#version 300 es
precision highp float;
in float vA; in float vShade;
uniform float uPass;
out vec4 outColor;
void main() {
  float r = length(gl_PointCoord - 0.5) * 2.0;
  float a = smoothstep(1.0, 0.45, r) * vA;
  vec3 c = uPass > 0.5 ? vec3(0.93, 0.86, 0.74) * vShade * (1.06 - 0.25 * r) : vec3(0.0);
  outColor = vec4(c * a, a);
}`;
