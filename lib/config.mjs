/**
 * Enquiry system: typed, fail-fast configuration.
 *
 * Every runtime environment variable is read here and nowhere else (the
 * build-time ones live in src/data/site.mjs). `config` is a lazy getter so
 * that importing this module (e.g. from the build, or a test that only
 * touches pure functions) never throws; the first *access* does.
 *
 * Two switches decide whether the API accepts enquiries:
 *   ENQUIRY_SYSTEM_ENABLED=false (or 0 / no / off) → 503 (paused), nothing else required
 *   ENQUIRY_MODE=preview (default) → 503 (preview), nothing else required
 *   ENQUIRY_MODE=live              → accepts enquiries; database, email and
 *                                    secrets must all be configured
 *
 * Local dev reads `.env` from the repo root when present. Cloudflare Pages
 * (functions/api/[[path]].js copies its bindings into process.env) and Vercel
 * inject the variables themselves, so `.env` is never needed in production.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * True inside the Cloudflare Workers runtime (Pages Functions), whose
 * navigator.userAgent is documented as 'Cloudflare-Workers'. There is no file
 * system to read `.env` from and no `import.meta.url`, so nothing at module
 * level may touch either: the module would fail to load and take every
 * Function of the deployment down with it.
 */
export const ON_WORKERS = globalThis.navigator?.userAgent === 'Cloudflare-Workers';

/** Load repo-root .env into process.env (never overriding real env). No-op on Cloudflare and Vercel. */
export function loadDotEnv() {
  if (ON_WORKERS || process.env.VERCEL) return;
  const file = join(dirname(fileURLToPath(import.meta.url)), '..', '.env');
  if (!existsSync(file)) return;
  for (const raw of readFileSync(file, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    const hash = val.search(/\s#/);
    if (hash >= 0 && !/^["']/.test(val)) val = val.slice(0, hash).trim();
    val = val.replace(/^(["'])(.*)\1$/, '$2');
    if (!(key in process.env)) process.env[key] = val;
  }
}

class ConfigError extends Error {
  constructor(problems) {
    super(`Enquiry system configuration is incomplete:\n  - ${problems.join('\n  - ')}\nSee .env.example.`);
    this.name = 'ConfigError';
  }
}

const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const RESEND_API_URL = 'https://api.resend.com/emails';
/** Display exchange rates (lib/currency/rates.mjs): the ECB's reference rates through Frankfurter. */
const RATES_URL = 'https://api.frankfurter.dev/v1/latest';
/** Resend's test inbox: accepts mail and delivers it nowhere. */
const PREVIEW_SINK = 'delivered@resend.dev';
/** A local stand-in for Resend (the Functions tests): sends nowhere, so needs no sink. */
const LOOPBACK = /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?\//i;
const isEmailish = (v) => EMAIL_RE.test(v) || /^[^<>]+<[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+>$/.test(v);

function build() {
  loadDotEnv();
  const env = process.env;
  const problems = [];
  const str = (key, { required = false, def = '' } = {}) => {
    const v = (env[key] ?? '').trim();
    if (!v && required) problems.push(`${key} is required`);
    return v || def;
  };
  const int = (key, def) => {
    const v = env[key]?.trim();
    if (!v) return def;
    const n = Number(v);
    if (!Number.isInteger(n) || n <= 0) problems.push(`${key} must be a positive integer (got "${v}")`);
    return n;
  };

  // Same reading as src/data/site.mjs: false, 0, no or off (any case) switch enquiries off.
  const enabled = !['false', '0', 'no', 'off'].includes(str('ENQUIRY_SYSTEM_ENABLED', { def: 'true' }).toLowerCase());
  const mode = str('ENQUIRY_MODE', { def: 'preview' }).toLowerCase() === 'live' ? 'live' : 'preview';
  // Only a live, enabled system needs the database, email and secrets.
  const accepting = enabled && mode === 'live';
  const emailProvider = str('EMAIL_PROVIDER', { def: 'file' }).toLowerCase();
  if (!['resend', 'file'].includes(emailProvider)) problems.push('EMAIL_PROVIDER must be "resend" or "file"');

  const cfg = {
    enabled,
    mode,
    accepting,
    // SITE_ENV=production is how the Cloudflare production environment says so (scripts/cloudflare/project.mjs).
    isProduction: env.NODE_ENV === 'production' || env.VERCEL_ENV === 'production' || str('SITE_ENV').toLowerCase() === 'production',
    siteUrl: str('PUBLIC_SITE_URL', { required: accepting }).replace(/\/+$/, ''),
    databaseUrl: str('DATABASE_URL', { required: accepting }),
    // Local tests only: send Neon's HTTP queries to a stand-in (scripts/cloudflare/local-pages.mjs). Refused in production.
    databaseHttpEndpoint: str('DATABASE_HTTP_ENDPOINT'),
    signingSecret: str('ENQUIRY_SIGNING_SECRET', { required: accepting }),
    email: {
      provider: emailProvider,
      resendApiKey: str('RESEND_API_KEY', { required: accepting && emailProvider === 'resend' }),
      // Local tests only, like DATABASE_HTTP_ENDPOINT. Refused in production.
      resendApiUrl: str('RESEND_API_URL', { def: RESEND_API_URL }),
      from: str('FROM_EMAIL', { required: accepting }),
      teamInbox: str('ENQUIRY_TEAM_EMAIL', { required: accepting }),
      replyTo: str('REPLY_TO_EMAIL', { required: accepting }),
    },
    // Where display exchange rates come from; 'off' shows every price in GBP (tests, or an emergency).
    ratesUrl: str('EXCHANGE_RATES_URL', { def: RATES_URL }),
    // Staff who may sign in to the dashboard (/admin/) with an emailed link. Comma-separated; empty turns sign-in off.
    adminEmails: Object.freeze(
      str('ADMIN_EMAILS')
        .split(',')
        .map((a) => a.trim().toLowerCase())
        .filter(Boolean),
    ),
    limits: {
      requestsPerMinute: int('RATE_LIMIT_PER_MINUTE', 10),
      maxBodyBytes: 32 * 1024,
      minSecondsOnForm: 3,
      duplicateWindowMinutes: 10,
      actionLinkDays: 14,
      signInLinkMinutes: 20,
      adminSessionHours: 12,
      signInPerMinute: 5,
      availabilityPerMinute: 60,
    },
  };

  // A preview that sends through Resend (staging's own key) delivers every enquiry email only to Resend's test
  // inbox: the previews are public, so they must never email a real traveller or carry mail to any address
  // typed in. Only a loopback stand-in is exempt, so an unusual RESEND_API_URL fails closed.
  cfg.email.previewSink = !cfg.isProduction && emailProvider === 'resend' && !LOOPBACK.test(cfg.email.resendApiUrl) ? PREVIEW_SINK : '';

  if (accepting) {
    if (cfg.signingSecret && cfg.signingSecret.length < 32) problems.push('ENQUIRY_SIGNING_SECRET must be at least 32 characters');
    if (cfg.email.from && !isEmailish(cfg.email.from)) problems.push('FROM_EMAIL is not a valid address');
    if (cfg.email.teamInbox && !EMAIL_RE.test(cfg.email.teamInbox)) problems.push('ENQUIRY_TEAM_EMAIL is not a valid address');
    if (cfg.email.replyTo && !EMAIL_RE.test(cfg.email.replyTo)) problems.push('REPLY_TO_EMAIL is not a valid address');
    for (const a of cfg.adminEmails) if (!EMAIL_RE.test(a)) problems.push(`ADMIN_EMAILS: "${a}" is not a valid address`);
    if (cfg.siteUrl && !/^https?:\/\//.test(cfg.siteUrl)) problems.push('PUBLIC_SITE_URL must start with http:// or https://');
    if (cfg.isProduction && emailProvider !== 'resend') problems.push('EMAIL_PROVIDER must be "resend" in production');
    if (ON_WORKERS && cfg.databaseUrl && !/^postgres(ql)?:\/\//.test(cfg.databaseUrl)) problems.push('DATABASE_URL must be a postgres:// connection string on Cloudflare (pglite:// needs a local disk)');
    if (ON_WORKERS && emailProvider !== 'resend') problems.push('EMAIL_PROVIDER must be "resend" on Cloudflare (the file provider needs a local disk)');
  }
  if (cfg.isProduction && cfg.databaseHttpEndpoint) problems.push('DATABASE_HTTP_ENDPOINT is for local tests and must not be set in production');
  if (cfg.isProduction && cfg.email.resendApiUrl !== RESEND_API_URL) problems.push('RESEND_API_URL is for local tests and must not be set in production');
  if (cfg.isProduction && ![RATES_URL, 'off'].includes(cfg.ratesUrl)) problems.push('EXCHANGE_RATES_URL may only be "off" in production');
  if (problems.length) throw new ConfigError(problems);
  return Object.freeze(cfg);
}

let cached;
/** Resolved configuration. Throws ConfigError on first access if anything required is missing. */
export const config = new Proxy(
  {},
  {
    get(_, key) {
      cached ??= build();
      return cached[key];
    },
    ownKeys() {
      cached ??= build();
      return Reflect.ownKeys(cached);
    },
    getOwnPropertyDescriptor(_, key) {
      cached ??= build();
      return Object.getOwnPropertyDescriptor(cached, key);
    },
  },
);

/** Test helper: forget the cached config so the next access re-reads process.env. */
export function resetConfig() {
  cached = undefined;
}
export { ConfigError };
