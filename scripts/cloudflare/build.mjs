#!/usr/bin/env node
/**
 * Builds site/ with one Pages environment's plain variables, from
 * scripts/cloudflare/project.mjs, so the static build sees exactly what that
 * environment's Functions see at runtime. Run it before `wrangler pages deploy`.
 *
 *   node scripts/cloudflare/build.mjs preview|production
 *
 * A production build for deployment is refused until the owner has approved the
 * release (RELEASE in project.mjs); the tests build production on their own.
 */
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ENVIRONMENTS, RELEASE } from './project.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const name = process.argv[2];
const env = ENVIRONMENTS[name];
if (!env) {
  console.error(`usage: node scripts/cloudflare/build.mjs ${Object.keys(ENVIRONMENTS).join('|')}`);
  process.exit(2);
}
if (name === 'production' && !RELEASE.approved) {
  console.error('Refused: the owner has not approved a production release (RELEASE in scripts/cloudflare/project.mjs). Build "preview" for staging.');
  process.exit(2);
}
execFileSync(process.execPath, ['src/build.mjs'], { cwd: ROOT, stdio: 'inherit', env: { ...process.env, ...env.vars } });
