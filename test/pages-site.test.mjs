/**
 * The whole site as Pages serves it: each environment's build (variables from
 * scripts/cloudflare/project.mjs, as the deploy workflow builds it) under
 * `wrangler pages dev` with the same runtime variables, checked by the
 * post-deploy smoke suite (scripts/cloudflare/smoke.mjs). _headers, the
 * Functions and the static files all come from the real build.
 *
 * An environment that takes live bookings gets what Cloudflare gives it as
 * secrets: a database (PGlite behind a Neon HTTP stand-in, migrated through
 * the Neon driver), a Resend stand-in and a signing secret. Nothing leaves the
 * machine.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, cpSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ENVIRONMENTS } from '../scripts/cloudflare/project.mjs';
import { smoke } from '../scripts/cloudflare/smoke.mjs';
import { startPagesDev } from './helpers/pages-dev.mjs';
import { termsPublished } from '../src/pages/terms.mjs';
import { startNeonStandIn } from './helpers/neon-standin.mjs';
import { startResendStandIn } from './helpers/resend-standin.mjs';
import { site } from '../src/data/site.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Build a copy of the repository with one environment's variables; returns its site/ directory. */
function build(vars) {
  const work = mkdtempSync(join(tmpdir(), 'gt-site-'));
  for (const dir of ['src', 'lib']) cpSync(join(ROOT, dir), join(work, dir), { recursive: true });
  cpSync(join(ROOT, 'package.json'), join(work, 'package.json'));
  execFileSync(process.execPath, ['src/build.mjs'], { cwd: work, env: { ...process.env, ...vars, VERCEL: '1' }, stdio: 'pipe' });
  process.on('exit', () => rmSync(work, { recursive: true, force: true }));
  return join(work, 'site');
}

const DB = 'postgres://gt:pw@ep-gt-site-123456.eu-central-1.aws.neon.tech/gt?sslmode=require';
const anyLive = Object.values(ENVIRONMENTS).some((e) => e.vars.ENQUIRY_MODE === 'live');
let neon;
let resend;

before(async () => {
  if (!anyLive) return;
  neon = await startNeonStandIn();
  resend = await startResendStandIn();
  Object.assign(process.env, { DATABASE_URL: DB, DATABASE_HTTP_ENDPOINT: neon.url, VERCEL: '1' });
  delete process.env.ENQUIRY_MODE;
  const { migrate } = await import('../lib/db/migrate.mjs');
  await migrate({ log: () => {} });
  await (await import('../lib/db/index.mjs')).closeDb();
});

after(async () => {
  await neon?.close();
  await resend?.close();
});

/**
 * The runtime bindings: the environment's variables, plus stand-in secrets
 * when it is live. The runtime refuses stand-in endpoints under
 * SITE_ENV=production (lib/config.mjs), so a live production runtime runs
 * here as SITE_ENV=preview; the pages it serves are still the production build.
 */
function bindings(vars) {
  if (vars.ENQUIRY_MODE !== 'live') return vars;
  return {
    ...vars,
    SITE_ENV: 'preview',
    DATABASE_URL: DB,
    DATABASE_HTTP_ENDPOINT: neon.url,
    RESEND_API_KEY: resend.apiKey,
    RESEND_API_URL: resend.url,
    ENQUIRY_SIGNING_SECRET: 'pages-site-signing-secret-0123456789abcdef',
  };
}

for (const env of ['preview', 'production']) {
  test(`the ${env} build passes every post-deploy smoke check on the Pages runtime`, async () => {
    const vars = ENVIRONMENTS[env].vars;
    const dev = await startPagesDev({ dir: build(vars), bindings: bindings(vars) });
    try {
      const { results } = await smoke({ url: dev.url, env });
      // A production build publishes the booking terms once approved, or as a marked draft under the owner's release
      // override (src/pages/terms.mjs › termsPublished); otherwise that one check is expected to find nothing.
      const unpublished = env === 'production' && !termsPublished({ ...site, preview: false }) ? ['page /terms/'] : [];
      const failed = results.filter((r) => !r.ok && !unpublished.includes(r.name));
      assert.deepEqual(failed.map((r) => `${r.name}: ${r.detail}`), []);
      for (const name of unpublished) assert.equal(results.find((r) => r.name === name)?.detail, 'status 404', `${name}: not published before approval`);
      assert.ok(results.length >= 12, `${results.length} checks`);
    } finally {
      await dev.stop();
    }
  });
}
