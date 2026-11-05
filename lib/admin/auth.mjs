/**
 * Staff dashboard sign-in: no passwords. A member of staff (an address in
 * ADMIN_EMAILS) asks for a link, receives it by email, and pressing its
 * button starts a session.
 *
 *   sign-in token  base64url("signin|email|exp|jti") . hmac   20 minutes, single use (admin_sign_ins)
 *   session        base64url("session|email|exp") . hmac      12 hours, HttpOnly SameSite=Lax cookie
 *   form token     hmac("form|" + session), in every dashboard form (with an Origin check)
 *
 * Lax, not Strict, so the "Open in the bookings dashboard" link in the team
 * email (a click from webmail, a cross-site navigation) arrives signed in.
 * Every change is a POST, which Lax never carries cross-site, and each POST
 * also needs the form token and a same-origin Origin.
 *
 * All HMAC-SHA256 with ENQUIRY_SIGNING_SECRET; the leading word keeps the
 * three kinds (and the status-link tokens, which start with a uuid) from ever
 * being accepted as each other. Rotating the secret signs everyone out.
 */
import { createHmac, timingSafeEqual, randomBytes } from 'node:crypto';
import { config } from '../config.mjs';

export const SESSION_COOKIE = '__Host-gt_admin';

const b64 = (s) => Buffer.from(s).toString('base64url');
const mac = (payload) => createHmac('sha256', config.signingSecret).update(payload).digest();

function sign(payload) {
  return `${b64(payload)}.${b64(mac(payload))}`;
}

/** The payload's fields when the token is well formed and its signature holds, else null. */
function open(token, kind) {
  if (typeof token !== 'string' || token.length > 600) return null;
  const [p, s] = token.split('.');
  if (!p || !s) return null;
  let payload;
  let sig;
  try {
    payload = Buffer.from(p, 'base64url').toString('utf8');
    sig = Buffer.from(s, 'base64url');
  } catch {
    return null;
  }
  const expected = mac(payload);
  if (sig.length !== expected.length || !timingSafeEqual(sig, expected)) return null;
  const parts = payload.split('|');
  return parts[0] === kind ? parts.slice(1) : null;
}

export const isAdminEmail = (email) => config.adminEmails.includes(String(email ?? '').trim().toLowerCase());

export function signInToken(email, { now = Date.now() } = {}) {
  const exp = Math.floor(now / 1000) + config.limits.signInLinkMinutes * 60;
  return sign(`signin|${email.toLowerCase()}|${exp}|${randomBytes(12).toString('hex')}`);
}

/** @returns {{ ok: true, email, jti } | { ok: false, reason: 'invalid'|'expired'|'not-staff' }} */
export function readSignInToken(token, { now = Date.now() } = {}) {
  const f = open(token, 'signin');
  if (!f || f.length !== 3) return { ok: false, reason: 'invalid' };
  const [email, exp, jti] = f;
  if (!(Number(exp) * 1000 > now)) return { ok: false, reason: 'expired' };
  // Removed from ADMIN_EMAILS since the link was sent: no entry.
  if (!isAdminEmail(email)) return { ok: false, reason: 'not-staff' };
  return { ok: true, email, jti };
}

export function sessionToken(email, { now = Date.now() } = {}) {
  const exp = Math.floor(now / 1000) + config.limits.adminSessionHours * 3600;
  return sign(`session|${email.toLowerCase()}|${exp}`);
}

/** The signed-in address, or null. Checked on every request, so removing an address from ADMIN_EMAILS ends its sessions. */
export function readSession(request, { now = Date.now() } = {}) {
  const token = cookie(request, SESSION_COOKIE);
  const f = open(token, 'session');
  if (!f || f.length !== 2) return null;
  const [email, exp] = f;
  if (!(Number(exp) * 1000 > now) || !isAdminEmail(email)) return null;
  return { email, token };
}

export const formToken = (session) => createHmac('sha256', config.signingSecret).update(`form|${session.token}`).digest('base64url').slice(0, 32);

export function checkFormToken(session, value) {
  const want = Buffer.from(formToken(session));
  const got = Buffer.from(String(value ?? ''));
  return got.length === want.length && timingSafeEqual(got, want);
}

/**
 * A POST must come from this site's own pages: browsers send Origin on every
 * POST. A browser or extension that strips referrers sends `Origin: null`;
 * then only the browser's own Sec-Fetch-Site saying same-origin will do.
 */
export function sameOrigin(request) {
  const origin = request.headers.get('origin');
  const site = request.headers.get('sec-fetch-site');
  if (!origin) return site !== 'cross-site';
  if (origin === 'null') return site === 'same-origin';
  const own = new URL(request.url).origin;
  return origin === own || origin === config.siteUrl;
}

export function cookie(request, name) {
  for (const part of (request.headers.get('cookie') || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return '';
}

export const sessionCookie = (token) => `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${config.limits.adminSessionHours * 3600}`;
export const clearedCookie = () => `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;

/**
 * Where to go after signing in: a dashboard path (and query) only, never
 * another site or a protocol-relative URL. Anything else is the bookings list.
 */
export function safeNext(value) {
  const v = String(value ?? '');
  return /^\/admin\/[A-Za-z0-9\-._~/?=&%]{0,300}$/.test(v) && !v.includes('//') && !v.includes('..') ? v : '/admin/';
}
