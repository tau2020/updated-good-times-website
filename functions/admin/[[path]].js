/**
 * Cloudflare Pages Function: the staff bookings dashboard under /admin/
 * (lib/http/admin.mjs, routed by lib/http/app.mjs). The same adapter as the
 * API's: configuration bridged into process.env, the client IP taken from
 * CF-Connecting-IP.
 */
import { handle } from '../../lib/http/app.mjs';
import { bridgeEnv, withTrustedIp } from '../api/[[path]].js';

let bridged = false;

export async function onRequest(context) {
  if (!bridged) {
    bridgeEnv(context.env);
    bridged = true;
  }
  // waitUntil: the sign-in email is sent after the answer, so staff and non-staff addresses answer alike.
  return handle(withTrustedIp(context.request), { waitUntil: (p) => context.waitUntil(p) });
}
