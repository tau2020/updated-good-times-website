#!/usr/bin/env node
/**
 * The site as Cloudflare runs it, live, on this machine: the build and its
 * Functions in workerd (`wrangler pages dev`), with the production drivers
 * talking to local stand-ins: Neon's HTTP endpoint backed by PGlite (migrated
 * through the Neon driver, like `npm run db:migrate` in production) and a
 * Resend endpoint that keeps each email as JSON in data/outbox-pages/.
 * Nothing leaves the machine.
 *
 *   node scripts/cloudflare/local-pages.mjs [--port 8788]
 *
 * Then, for example, the live browser suite against it:
 *   E2E_ENQUIRY_MODE=live E2E_BASE_URL=http://127.0.0.1:8788 npx playwright test test/e2e/enquiry.spec.mjs test/e2e/launch.spec.mjs
 */
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startNeonStandIn } from '../../test/helpers/neon-standin.mjs';
import { startResendStandIn } from '../../test/helpers/resend-standin.mjs';
import { startPagesDev } from '../../test/helpers/pages-dev.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const argv = process.argv.slice(2);
const port = Number(argv.includes('--port') ? argv[argv.indexOf('--port') + 1] : 8788);
const url = `http://127.0.0.1:${port}`;
const DB = 'postgres://gt:local@ep-local-standin.eu-central-1.aws.neon.tech/gt?sslmode=require';

const neon = await startNeonStandIn();
const resend = await startResendStandIn({ outbox: join(ROOT, 'data', 'outbox-pages') });

// Migrate through the Neon driver, as production does.
Object.assign(process.env, { DATABASE_URL: DB, DATABASE_HTTP_ENDPOINT: neon.url, VERCEL: '1' });
delete process.env.ENQUIRY_MODE;
const { migrate } = await import('../../lib/db/migrate.mjs');
await migrate({ log: (m) => console.log(`database: ${m}`) });

const vars = {
  SITE_ENV: 'preview',
  ENQUIRY_MODE: 'live',
  ENQUIRY_SYSTEM_ENABLED: 'true',
  PUBLIC_SITE_URL: url,
  DATABASE_URL: DB,
  DATABASE_HTTP_ENDPOINT: neon.url,
  EMAIL_PROVIDER: 'resend',
  RESEND_API_KEY: resend.apiKey,
  RESEND_API_URL: resend.url,
  FROM_EMAIL: 'Good Times in Cape Town (local) <info@goodtimesincapetown.co.za>',
  ENQUIRY_TEAM_EMAIL: 'team@example.com',
  REPLY_TO_EMAIL: 'info@goodtimesincapetown.co.za',
  ENQUIRY_SIGNING_SECRET: 'local-pages-signing-secret-0123456789abcdef',
  RATE_LIMIT_PER_MINUTE: '120',
};
execFileSync(process.execPath, ['src/build.mjs'], { cwd: ROOT, env: { ...process.env, ...vars }, stdio: 'inherit' });

const dev = await startPagesDev({ dir: 'site', port, bindings: vars });
console.log(`\nlive on the Workers runtime: ${url}\nemails: data/outbox-pages/ · database: PGlite behind ${neon.url}\nCtrl-C stops everything.`);

const stop = async () => {
  await dev.stop();
  await neon.close();
  await resend.close();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
