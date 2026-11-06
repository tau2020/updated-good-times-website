/* Good Times in Cape Town — integer-hash noise, written the same way here and in the shader (shaders.js) so the CPU
   reference of the reveal mask follows the GPU's (32-bit unsigned arithmetic wraps identically in both). */

/** A 2D lattice hash: two int32 → uint32 (the shader's hash2u). */
export function hash2u(x, y) {
  let h = (Math.imul(x | 0, 0x8da6b343) ^ Math.imul(y | 0, 0xd8163841)) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0x5bd1e995) >>> 0;
  h ^= h >>> 15;
  return h >>> 0;
}

/** The hash as a float in [0, 1) (24 bits, exactly representable in a 32-bit float). */
export const h2f = (x, y) => (hash2u(x, y) & 0xffffff) / 16777216;

/** Value noise in [0, 1), smooth (C1), on the integer lattice. */
export function vnoise(x, y) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = h2f(ix, iy);
  const b = h2f(ix + 1, iy);
  const c = h2f(ix, iy + 1);
  const d = h2f(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}
