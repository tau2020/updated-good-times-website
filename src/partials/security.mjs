/**
 * Security headers shared by every host configuration:
 *  - site/_headers (Cloudflare Pages, Netlify), written by src/build.mjs
 *  - vercel.json, checked against this module by test/headers.test.mjs
 * The CSP allows the single inline head script by hash; JSON-LD and JSON
 * config blocks are data and are not executed.
 */
import { createHash } from 'node:crypto';

import { INLINE_GATE } from './layout.mjs';

/**
 * Cloudflare Web Analytics (D79), loaded by assets/js/consent.js only after the visitor allows it. The policy names
 * the exact file and endpoint, not the hosts: the copy the zone injects by itself (a versioned path,
 * /beacon.min.js/v…, with an inline snippet) stays blocked, so nothing is counted without consent.
 */
export const ANALYTICS_BEACON = 'https://static.cloudflareinsights.com/beacon.min.js';
export const ANALYTICS_ENDPOINT = 'https://cloudflareinsights.com/cdn-cgi/rum';

export function contentSecurityPolicy() {
  const gate = createHash('sha256').update(INLINE_GATE).digest('base64');
  return [
    "default-src 'self'",
    `script-src 'self' 'sha256-${gate}' ${ANALYTICS_BEACON}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "media-src 'self'",
    "font-src 'self'",
    `connect-src 'self' ${ANALYTICS_ENDPOINT}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; ');
}

export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
};

export const CACHE_RULES = {
  '/assets/fonts/*': 'public, max-age=31536000, immutable',
  '/assets/img/*': 'public, max-age=604800',
  '/assets/video/*': 'public, max-age=604800',
  '/assets/brand/*': 'public, max-age=86400',
  '/assets/css/*': 'public, max-age=3600, must-revalidate',
  '/assets/js/*': 'public, max-age=3600, must-revalidate',
};

/**
 * Cloudflare's own addresses for a production build (the project's pages.dev
 * name and each deployment's hash or branch subdomain) serve the same pages as
 * the custom domain; these rules keep them out of search results, so only
 * the custom domain (PUBLIC_SITE_URL) is indexed. Pages matches the hostnames;
 * other hosts ignore absolute-URL rules.
 */
export const PAGES_DEV_NOINDEX = ['https://:project.pages.dev/*', 'https://:version.:project.pages.dev/*'];

/** `_headers` file body for static hosts. */
export function headersFile({ preview }) {
  const lines = ['/*', `  Content-Security-Policy: ${contentSecurityPolicy()}`];
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) lines.push(`  ${k}: ${v}`);
  if (preview) lines.push('  X-Robots-Tag: noindex, nofollow');
  lines.push('');
  for (const [path, v] of Object.entries(CACHE_RULES)) lines.push(path, `  Cache-Control: ${v}`);
  if (!preview) for (const rule of PAGES_DEV_NOINDEX) lines.push(rule, '  X-Robots-Tag: noindex, nofollow');
  return lines.join('\n') + '\n';
}
