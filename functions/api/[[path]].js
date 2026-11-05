/**
 * Cloudflare Pages Function: the enquiry API under /api/* (POST /api/enquiries,
 * GET|POST /api/enquiries/:id/status, GET /api/health).
 *
 * A thin adapter around the host-agnostic router in lib/http/app.mjs, the same
 * code the local server (src/tools/serve.mjs) and the Vercel functions (api/)
 * mount. Needs the `nodejs_compat` compatibility flag (node:crypto, Buffer,
 * process), set on the Pages project by scripts/cloudflare/project.mjs.
 *
 * Two platform details are settled here so lib/ stays host-agnostic:
 *  - Configuration: lib/config.mjs reads process.env. Pages passes variables
 *    and secrets as `env` bindings, so their string values are copied into
 *    process.env before the first request reads the configuration.
 *  - Client IP: Cloudflare sets CF-Connecting-IP to the visitor's address and
 *    a client cannot forge it, whereas X-Forwarded-For can arrive with a value
 *    the client chose prepended. The rate limit keys on the first
 *    X-Forwarded-For entry, so the trusted address is written there.
 *  - Country: Cloudflare's reading of the connection (request.cf.country),
 *    used only to choose a display currency (GET /api/currency).
 */
import { handle } from '../../lib/http/app.mjs';

let bridged = false;

/** Copy string bindings (vars and secrets) into process.env once per isolate; never override a real value. */
export function bridgeEnv(env, target = process.env) {
  for (const [key, value] of Object.entries(env || {})) {
    if (typeof value === 'string' && !(key in target)) target[key] = value;
  }
}

/** The request with X-Forwarded-For and X-Real-IP replaced by CF-Connecting-IP (unchanged when absent). */
export function withTrustedIp(request) {
  const ip = request.headers.get('cf-connecting-ip');
  if (!ip) return request;
  const headers = new Headers(request.headers);
  headers.set('x-forwarded-for', ip);
  headers.set('x-real-ip', ip);
  return new Request(request, { headers });
}

export async function onRequest({ request, env }) {
  if (!bridged) {
    bridgeEnv(env);
    bridged = true;
  }
  return handle(withTrustedIp(request), { country: request.cf?.country });
}
