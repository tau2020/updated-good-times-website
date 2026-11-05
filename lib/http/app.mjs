/**
 * Router for the enquiry API. Host-agnostic: takes a Web Request, returns a
 * Web Response. Mounted by api/*.mjs on Vercel and by src/tools/serve.mjs
 * locally, so both run exactly the same code. Routes are matched on the
 * exact pathname.
 */
import { config, ConfigError } from '../config.mjs';
import { json, empty } from './response.mjs';
import { one } from '../db/index.mjs';
import { postEnquiry } from './enquiries.mjs';
import { getStatusAction, postStatusAction } from './status.mjs';
import { getAvailability, postAvailability } from './availability.mjs';
import { getCurrency } from './currency.mjs';
import { ADMIN_ROUTES } from './admin.mjs';

const PAUSED = 'Online enquiries are paused at the moment. Please try again later.';

/** ?check=db also proves the database answers and is migrated (live deployments only). Reports nothing else. */
async function health(request) {
  const enquiries = !config.enabled ? 'disabled' : config.mode === 'live' ? 'live' : 'preview';
  const out = { status: 'ok', enquiries, time: new Date().toISOString() };
  if (config.accepting && new URL(request.url).searchParams.get('check') === 'db') {
    try {
      await one('SELECT 1 FROM enquiries LIMIT 1');
      await one('SELECT 1 FROM day_capacity LIMIT 1');
      out.database = 'ok';
    } catch (err) {
      console.error(`[health] database: ${err.message}`);
      return json(503, { ...out, status: 'error', database: 'error' });
    }
  }
  return json(200, out);
}

const ROUTES = [
  { method: 'POST', pattern: /^\/api\/enquiries\/?$/, handler: postEnquiry },
  { method: 'OPTIONS', pattern: /^\/api\/enquiries\/?$/, handler: () => empty(204, { Allow: 'POST, OPTIONS' }) },
  // GET shows a confirmation page; only POST changes the status (link scanners only GET).
  { method: 'GET', pattern: /^\/api\/enquiries\/(?<id>[0-9a-f-]{36})\/status\/?$/, handler: getStatusAction },
  { method: 'POST', pattern: /^\/api\/enquiries\/(?<id>[0-9a-f-]{36})\/status\/?$/, handler: postStatusAction },
  { method: 'GET', pattern: /^\/api\/health\/?$/, handler: health },
  { method: 'GET', pattern: /^\/api\/availability\/?$/, handler: getAvailability },
  { method: 'POST', pattern: /^\/api\/availability\/?$/, handler: postAvailability },
  { method: 'GET', pattern: /^\/api\/currency\/?$/, handler: getCurrency },
  ...ADMIN_ROUTES,
];

/** True when the pathname belongs to this API (used by the dev server to decide whether to delegate). */
export function matches(pathname) {
  return ROUTES.some((r) => r.pattern.test(pathname));
}

export async function handle(request, ctx = {}) {
  const { pathname } = new URL(request.url);
  const candidates = ROUTES.filter((r) => r.pattern.test(pathname));
  if (!candidates.length) return json(404, { ok: false, error: 'Not found' });
  const match = candidates.find((r) => r.method === request.method);
  if (!match) return json(405, { ok: false, error: 'Method not allowed' }, { Allow: candidates.map((r) => r.method).join(', ') });
  try {
    const params = pathname.match(match.pattern)?.groups ?? {};
    return await match.handler(request, { ...ctx, params });
  } catch (err) {
    if (err instanceof ConfigError) {
      console.error(err.message);
      return json(503, { ok: false, code: 'misconfigured', error: PAUSED });
    }
    console.error(`[enquiry-api] ${request.method} ${pathname}:`, err);
    return json(500, { ok: false, error: 'Something went wrong on our side. Please try again in a moment.' });
  }
}
