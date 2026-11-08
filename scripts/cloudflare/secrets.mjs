#!/usr/bin/env node
/**
 * Put encrypted secrets into one environment of a Pages project, from files, without ever printing them.
 *
 *   CLOUDFLARE_API_TOKEN=… CLOUDFLARE_ACCOUNT_ID=… node scripts/cloudflare/secrets.mjs <main|test> <production|preview> \
 *     NAME=@file … [--generate NAME=@new-file] [--create] [--apply]
 *
 *   main   good-times-in-cape-town (PROJECT), names from SECRETS; its preview environment is refused (staging and
 *          every preview branch share it, and they never take enquiries)
 *   test   good-times-enquiry-test (TEST_PROJECT), names from TEST_SECRETS; --create makes the bare project when it
 *          does not exist yet (setup.mjs test --apply then adds its settings)
 *
 * Why a script: wrangler's `pages secret put` reaches only the production environment, and a value typed into the
 * dashboard is drift nobody can review. The names are declared in scripts/cloudflare/project.mjs; any other is
 * refused. Each value comes from a file (a value on the command line would stay in shell history and `ps`), trimmed,
 * and is checked the way lib/config.mjs will check it: a postgres URL for the restricted role (never the owner), a
 * Resend key, signing and access keys of at least 32 characters. `--generate` writes a new random value (48 bytes,
 * base64url) to a new 0600 file first and never overwrites one.
 *
 * Without --apply it only says what it would set. With it, one PATCH of that environment's secrets (the API merges
 * env_vars), then a read-back that proves every variable and secret the project had is still there, plain values
 * unchanged, the other environment untouched, and the new names stored encrypted (secret_text). Names only, always.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import * as defaults from './project.mjs';
import { cloudflareClient, resolveAccount, Refusal } from './setup.mjs';

const CF_API = 'https://api.cloudflare.com/client/v4';
const SPEC_RE = /^([A-Z][A-Z0-9_]*)=@(.+)$/;

export const generateSecret = () => randomBytes(48).toString('base64url');

/** Why a value is wrong for its name, or '' (the same rules lib/config.mjs applies at runtime). */
export function problemWith(name, value) {
  if (!value) return 'is empty';
  if (/\s/.test(value)) return 'contains a space or line break';
  if (name === 'DATABASE_URL') {
    let url;
    try {
      url = new URL(value);
    } catch {
      return 'is not a URL';
    }
    if (!/^postgres(ql)?:$/.test(url.protocol)) return 'is not a postgres:// URL';
    if (/_owner$/.test(decodeURIComponent(url.username))) return 'connects as the database owner: the application connects as its restricted role (scripts/db/app-role.mjs)';
    if (url.searchParams.get('sslmode') !== 'require' && url.searchParams.get('sslmode') !== 'verify-full') return 'does not require TLS (sslmode=require)';
  }
  if (name === 'RESEND_API_KEY' && !/^re_[A-Za-z0-9_]{8,}$/.test(value)) return 'is not a Resend API key';
  if ((name === 'ENQUIRY_SIGNING_SECRET' || name === 'ENQUIRY_ACCESS_KEY') && value.length < 32) return 'is shorter than 32 characters';
  return '';
}

/** Names and types of an environment's variables, values only for plain text (secrets have none to compare). */
const snapshot = (config) => Object.fromEntries(Object.entries(config?.env_vars || {}).map(([k, v]) => [k, { type: v?.type, value: v?.type === 'plain_text' ? v.value : undefined }]));

export async function putSecrets(argv, { env = process.env, fetchImpl = fetch, log = console.log, cfg = defaults, read = (f) => readFileSync(f, 'utf8'), write = (f, v) => writeFileSync(f, v, { mode: 0o600, flag: 'wx' }) } = {}) {
  const positional = [];
  const specs = [];
  let apply = false;
  let create = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--apply') apply = true;
    else if (a === '--create') create = true;
    else if (a === '--generate') specs.push({ spec: argv[++i] || '', generate: true });
    else if (a.startsWith('--')) throw new Refusal(`unknown option ${a}`);
    else if (a.includes('=')) specs.push({ spec: a, generate: false });
    else positional.push(a);
  }
  const [target, environment] = positional;
  const project = { main: cfg.PROJECT, test: cfg.TEST_PROJECT }[target];
  const allowed = { main: cfg.SECRETS, test: cfg.TEST_SECRETS }[target];
  if (!project) throw new Refusal(`say which project: main (${cfg.PROJECT.name}) or test (${cfg.TEST_PROJECT.name})`);
  if (!['production', 'preview'].includes(environment)) throw new Refusal('say which environment: production or preview');
  if (target === 'main' && environment === 'preview') {
    throw new Refusal(`${project.name}'s preview environment is shared by staging and every preview branch, which never take enquiries: it gets no secrets`);
  }
  if (create && target !== 'test') throw new Refusal(`--create is only for the test project; ${project.name} is managed by setup.mjs pages`);

  const items = specs.map(({ spec, generate }) => {
    const m = SPEC_RE.exec(spec);
    if (!m) throw new Refusal(`"${spec.replace(/=.*/s, '=…')}": give each secret as NAME=@file (a value on the command line would stay in shell history)`);
    const [, name, file] = m;
    if (!allowed.includes(name)) throw new Refusal(`${name} is not one of ${project.name}'s secrets (${allowed.join(', ')}; scripts/cloudflare/project.mjs)`);
    return { name, file, generate };
  });
  if (!items.length) throw new Refusal('name at least one secret: NAME=@file');
  const dup = items.find((it, i) => items.findIndex((o) => o.name === it.name) !== i);
  if (dup) throw new Refusal(`${dup.name} is given twice`);
  // Every value is read and checked before anything is sent; a generated one is only created when applying.
  for (const it of items) {
    if (it.generate) continue;
    let value;
    try {
      value = String(read(it.file)).trim();
    } catch {
      throw new Refusal(`${it.name}: cannot read its file`);
    }
    const problem = problemWith(it.name, value);
    if (problem) throw new Refusal(`${it.name} ${problem}; nothing was changed`);
    it.value = value;
  }

  if (!env.CLOUDFLARE_API_TOKEN) throw new Refusal('set CLOUDFLARE_API_TOKEN (a token created in the Good Times account; never commit it)');
  const cf = cloudflareClient({ token: env.CLOUDFLARE_API_TOKEN, base: env.CLOUDFLARE_API_BASE || CF_API, fetchImpl });
  const { account, proof } = await resolveAccount(cf, { match: cfg.ACCOUNT.match, accountId: env.CLOUDFLARE_ACCOUNT_ID || '' });
  log(`Account: ${account.name} [${account.id}], confirmed by ${proof}${apply ? '' : ' (read-only run)'}`);
  const path = `/accounts/${account.id}/pages/projects/${project.name}`;
  let before = await cf.find(path);
  if (!before && !create) throw new Refusal(`the Pages project ${project.name} does not exist${target === 'test' ? ' yet: add --create' : ''}`);
  const others = environment === 'production' ? 'preview' : 'production';
  const have = snapshot(before?.deployment_configs?.[environment]);
  log(`\nSecrets: ${project.name} › ${environment}`);
  if (!before) log(`  ${apply ? '→' : '·'} create the Pages project ${project.name} (bare, production branch ${project.productionBranch}; setup.mjs adds its settings)`);
  for (const it of items) {
    const was = have[it.name]?.type === 'secret_text' ? 'replace the secret' : have[it.name] ? 'replace the plain variable, as a secret,' : 'add';
    log(`  ${apply ? '→' : '·'} ${was} ${it.name} (${it.generate ? `a new random value, kept in ${it.file}` : 'from its file'})`);
  }
  if (!apply) return { project: before, items: items.map(({ name }) => name), applied: false };

  for (const it of items.filter((x) => x.generate)) {
    it.value = generateSecret();
    try {
      write(it.file, it.value);
    } catch (err) {
      throw new Refusal(`${it.name}: cannot create ${it.file} (${err.code === 'EEXIST' ? 'it exists; give it as NAME=@file to reuse it' : err.code || 'error'}); nothing was changed`);
    }
  }
  const envVars = Object.fromEntries(items.map((it) => [it.name, { type: 'secret_text', value: it.value }]));
  if (!before) {
    await cf.post(`/accounts/${account.id}/pages/projects`, { name: project.name, production_branch: project.productionBranch });
    before = (await cf.get(path)) || {};
  }
  const otherBefore = snapshot(before.deployment_configs?.[others]);
  await cf.patch(path, { deployment_configs: { [environment]: { env_vars: envVars } } });

  // Read back: nothing lost, nothing else changed, the new names encrypted.
  const after = await cf.get(path);
  const now = snapshot(after?.deployment_configs?.[environment]);
  const otherNow = snapshot(after?.deployment_configs?.[others]);
  const problems = [];
  for (const [k, v] of Object.entries(have)) {
    if (!now[k]) problems.push(`${environment} lost ${k}`);
    else if (!envVars[k] && (now[k].type !== v.type || now[k].value !== v.value)) problems.push(`${environment} ${k} changed`);
  }
  for (const k of Object.keys(envVars)) if (now[k]?.type !== 'secret_text') problems.push(`${k} is not stored encrypted`);
  for (const [k, v] of Object.entries(otherBefore)) if (!otherNow[k] || otherNow[k].type !== v.type || otherNow[k].value !== v.value) problems.push(`${others} ${k} changed`);
  for (const k of Object.keys(otherNow)) if (!otherBefore[k]) problems.push(`${others} gained ${k}`);
  if (problems.length) throw new Error(`read back after the update: ${problems.join('; ')}. Check the project's Variables and Secrets.`);
  const secrets = Object.entries(now).filter(([, v]) => v.type === 'secret_text').map(([k]) => k);
  log(`  ✓ read back: ${Object.keys(envVars).join(', ')} stored encrypted; ${environment} has the secrets ${secrets.join(', ')}; every other variable, and ${others}, unchanged`);
  return { project: after, items: Object.keys(envVars), applied: true };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  putSecrets(process.argv.slice(2)).catch((err) => {
    // Never echo a value: a failure names secrets, files and HTTP statuses only.
    const text = String(err.message).replace(/postgres(ql)?:\/\/\S+/g, '[redacted]').replace(/\bre_[A-Za-z0-9_]+/g, 're_[redacted]');
    console.error(`\n${err.name === 'Refusal' ? 'Refused' : 'Failed'}: ${text}`);
    process.exitCode = err.name === 'Refusal' ? 2 : 1;
  });
}
