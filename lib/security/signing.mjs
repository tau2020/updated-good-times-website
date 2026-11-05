/**
 * Signed, expiring tokens for the status action links in the team email.
 *
 *   token = base64url(payload) . base64url(hmac_sha256(secret, payload))
 *   payload = `${enquiryId}|${status}|${expiresUnixSeconds}`
 *
 * Verification is constant-time and rejects anything malformed or expired.
 * Single-use is enforced by the status state machine, not by the token.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { config } from '../config.mjs';

const b64 = (buf) => Buffer.from(buf).toString('base64url');

function mac(payload, secret) {
  return createHmac('sha256', secret).update(payload).digest();
}

export function signAction({ enquiryId, status, expiresAt, secret = config.signingSecret }) {
  if (!enquiryId || !status || !expiresAt) throw new Error('signAction: enquiryId, status and expiresAt are required');
  const payload = `${enquiryId}|${status}|${Math.floor(expiresAt / 1000)}`;
  return `${b64(payload)}.${b64(mac(payload, secret))}`;
}

/** @returns {{ ok: true, enquiryId, status, expiresAt } | { ok: false, reason: 'malformed'|'signature'|'expired' }} */
export function verifyAction(token, { now = Date.now(), secret = config.signingSecret } = {}) {
  if (typeof token !== 'string' || token.length > 512) return { ok: false, reason: 'malformed' };
  const [p, s] = token.split('.');
  if (!p || !s) return { ok: false, reason: 'malformed' };
  let payload;
  let sig;
  try {
    payload = Buffer.from(p, 'base64url').toString('utf8');
    sig = Buffer.from(s, 'base64url');
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  const expected = mac(payload, secret);
  if (sig.length !== expected.length || !timingSafeEqual(sig, expected)) return { ok: false, reason: 'signature' };
  const [enquiryId, status, exp] = payload.split('|');
  const expiresAt = Number(exp) * 1000;
  if (!enquiryId || !status || !Number.isFinite(expiresAt)) return { ok: false, reason: 'malformed' };
  if (expiresAt < now) return { ok: false, reason: 'expired' };
  return { ok: true, enquiryId, status, expiresAt };
}

/** Absolute URL for one action link. */
export function actionUrl({ enquiryId, status, expiresAt }) {
  const token = signAction({ enquiryId, status, expiresAt });
  return `${config.siteUrl}/api/enquiries/${encodeURIComponent(enquiryId)}/status?token=${token}`;
}
