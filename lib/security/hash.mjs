/**
 * Hashing helpers. The IP hash is keyed with the signing secret so the stored
 * value cannot be reversed by brute-forcing the IPv4 space.
 */
import { createHash, createHmac } from 'node:crypto';
import { config } from '../config.mjs';

export function sha256(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

/** Keyed hash of a visitor IP. Same IP → same hash within one deployment's secret. */
export function hashIp(ip) {
  return createHmac('sha256', config.signingSecret).update(`ip:${ip || 'unknown'}`).digest('hex').slice(0, 32);
}

/** Keyed hash of a short identifier (a typed email address in a rate-limit key), so it is never stored in the clear. */
export function keyedHash(value) {
  return createHmac('sha256', config.signingSecret).update(`id:${value}`).digest('hex').slice(0, 32);
}

/** Hash used to spot the same person sending the same request again within the duplicate window (see dedupeContent()). */
export function dedupeHash(email, content) {
  return sha256(`${String(email).trim().toLowerCase()}\n${String(content).trim()}`);
}

/**
 * Best-effort client IP. Vercel sets x-forwarded-for (client first) and
 * x-real-ip; the local server passes the socket address in via `fallback`.
 */
export function clientIp(headers, fallback = '') {
  const xff = headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return headers.get('x-real-ip')?.trim() || fallback || '';
}
