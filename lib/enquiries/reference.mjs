/**
 * Enquiry reference numbers: GT- plus six characters.
 *
 * The alphabet drops I, L, O, 0 and 1 so a reference survives being read
 * aloud over the phone or typed from a handwritten note. 31^6 ≈ 887 million
 * combinations; collisions are still checked against the database by the
 * caller (unique constraint + retry), never assumed away.
 */
import { randomInt } from 'node:crypto';

export const REFERENCE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const REFERENCE_PREFIX = 'GT-';
export const REFERENCE_RE = /^GT-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/;

/** Generate one candidate reference. `rng(max)` is injectable for tests. */
export function generateReference(rng = randomInt) {
  let out = REFERENCE_PREFIX;
  for (let i = 0; i < 6; i++) out += REFERENCE_ALPHABET[rng(REFERENCE_ALPHABET.length)];
  return out;
}

export function isReference(s) {
  return typeof s === 'string' && REFERENCE_RE.test(s);
}

/**
 * Generate references until `exists(ref)` resolves false. Throws after
 * `maxAttempts` so a broken exists() cannot loop forever.
 */
export async function uniqueReference(exists, { maxAttempts = 8, rng } = {}) {
  for (let i = 0; i < maxAttempts; i++) {
    const ref = generateReference(rng);
    if (!(await exists(ref))) return ref;
  }
  throw new Error(`Could not generate a unique reference after ${maxAttempts} attempts`);
}
