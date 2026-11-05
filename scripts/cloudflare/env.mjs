#!/usr/bin/env node
/**
 * The plain-text variables of one Pages environment, from
 * scripts/cloudflare/project.mjs, as KEY=value lines. The deploy workflow
 * appends them to $GITHUB_ENV before `npm run build`, so the static build
 * sees exactly what the Functions see at runtime.
 *
 *   node scripts/cloudflare/env.mjs production|preview          KEY=value lines
 *   node scripts/cloudflare/env.mjs production|preview --json   one JSON object
 */
import { ENVIRONMENTS } from './project.mjs';

const [name, flag] = process.argv.slice(2);
const env = ENVIRONMENTS[name];
if (!env) {
  console.error(`usage: node scripts/cloudflare/env.mjs ${Object.keys(ENVIRONMENTS).join('|')} [--json]`);
  process.exit(2);
}
for (const [k, v] of Object.entries(env.vars)) {
  // $GITHUB_ENV takes one KEY=value per line; a newline in a value would smuggle in another variable.
  if (/[\r\n]/.test(v)) throw new Error(`${k} must be a single line`);
}
console.log(flag === '--json' ? JSON.stringify(env.vars, null, 2) : Object.entries(env.vars).map(([k, v]) => `${k}=${v}`).join('\n'));
