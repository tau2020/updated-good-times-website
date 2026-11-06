/* Good Times in Cape Town — seeded randomness for the sand journey (shared by the renderer and the unit tests).
   Every value the scene uses is a pure function of a seed: the same seed gives the same footprints, strokes and
   grains on every visit, every reload and every scroll direction. */

/** mulberry32: a small, fast, well-distributed 32-bit generator. Returns a function giving floats in [0, 1). */
export function seeded(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A uniform value in [a, b) from a generator. */
export const range = (rnd, a, b) => a + (b - a) * rnd();

/** Integer hash of a few integers (stable, order-sensitive), for per-item seeds. */
export function hash(...ints) {
  let h = 2166136261 >>> 0;
  for (const n of ints) {
    h ^= n >>> 0;
    h = Math.imul(h, 16777619) >>> 0;
    h ^= h >>> 13;
  }
  return h >>> 0;
}

export const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const mix = (a, b, t) => a + (b - a) * t;
export function smoothstep(e0, e1, x) {
  const t = clamp((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
}
