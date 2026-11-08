/**
 * scripts/cloudflare/secrets.mjs against an in-memory Cloudflare API (no network): only the declared names, only from
 * files, checked before anything is sent; never the main project's shared preview environment; one PATCH of one
 * environment; a read-back that catches a lost or changed variable; and no value in anything it prints.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { putSecrets, problemWith, generateSecret } from '../scripts/cloudflare/secrets.mjs';
import { Refusal } from '../scripts/cloudflare/setup.mjs';
import * as project from '../scripts/cloudflare/project.mjs';

const GT = { id: 'acc-gt', name: "Goodtimesincapetown@gmail.com's Account" };
const MAIN = project.PROJECT.name;
const TEST = project.TEST_PROJECT.name;
const DB = 'postgresql://gt_app:pw-0123456789abcdef@ep-x-pooler.c-8.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const FILES = {
  '/s/db': `${DB}\n`,
  '/s/db-owner': DB.replace('gt_app', 'neondb_owner'),
  '/s/db-plain': DB.replace('sslmode=require', 'sslmode=disable'),
  '/s/resend': 're_fake_stand_in_not_a_key',
  '/s/short': 'too-short',
  '/s/empty': '\n',
};

function mockApi(projects = {}, { dropOn = null } = {}) {
  const s = { projects: structuredClone(projects) };
  const calls = [];
  const res = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  const ok = (result) => res(200, { success: true, errors: [], result });
  async function fetchImpl(url, init = {}) {
    const u = new URL(url);
    const method = init.method || 'GET';
    const body = init.body ? JSON.parse(init.body) : undefined;
    const path = u.pathname.replace(/^\/client\/v4/, '');
    calls.push({ method, path, body });
    if (path === '/accounts') return ok([GT]);
    if (path === '/user') return res(403, { success: false, errors: [{ code: 9109, message: 'no permission' }] });
    if (method === 'POST' && path === `/accounts/${GT.id}/pages/projects`) {
      s.projects[body.name] = { name: body.name, production_branch: body.production_branch, deployment_configs: { production: { env_vars: {} }, preview: { env_vars: {} } } };
      return ok(s.projects[body.name]);
    }
    const m = /^\/accounts\/acc-gt\/pages\/projects\/([^/]+)$/.exec(path);
    if (m) {
      const p = s.projects[m[1]];
      if (!p) return res(404, { success: false, errors: [{ code: 8000007, message: 'Project not found' }] });
      if (method === 'GET') {
        // Like Cloudflare: a secret's value never comes back.
        const view = structuredClone(p);
        for (const c of Object.values(view.deployment_configs || {})) for (const v of Object.values(c.env_vars || {})) if (v.type === 'secret_text') delete v.value;
        return ok(view);
      }
      if (method === 'PATCH') {
        for (const [name, cfg] of Object.entries(body.deployment_configs || {})) {
          const into = (p.deployment_configs[name] ||= { env_vars: {} });
          into.env_vars = { ...(dropOn === name ? {} : into.env_vars), ...cfg.env_vars };
        }
        return ok(p);
      }
    }
    return res(404, { success: false, errors: [{ code: 7003, message: `no route ${method} ${path}` }] });
  }
  return { s, calls, fetchImpl, writes: () => calls.filter((c) => c.method !== 'GET') };
}

const lines = [];
const out = () => lines.join('\n');
const run = (argv, api, { files = FILES, written = {} } = {}) => {
  lines.length = 0;
  return putSecrets(argv, {
    env: { CLOUDFLARE_API_TOKEN: 'cfut_test', CLOUDFLARE_ACCOUNT_ID: GT.id },
    fetchImpl: api.fetchImpl,
    log: (l) => lines.push(l),
    read: (f) => {
      if (!(f in files)) throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
      return files[f];
    },
    write: (f, v) => {
      if (f in files || f in written) throw Object.assign(new Error('EEXIST'), { code: 'EEXIST' });
      written[f] = v;
    },
  });
};
const live = () => ({
  [MAIN]: { name: MAIN, production_branch: 'main', deployment_configs: { production: { env_vars: { ENQUIRY_MODE: { type: 'plain_text', value: 'preview' }, SITE_ENV: { type: 'plain_text', value: 'production' } } }, preview: { env_vars: { ENQUIRY_MODE: { type: 'plain_text', value: 'preview' } } } } },
});

test('values are checked as lib/config.mjs will check them', () => {
  assert.equal(problemWith('DATABASE_URL', DB), '');
  assert.match(problemWith('DATABASE_URL', FILES['/s/db-owner']), /database owner/);
  assert.match(problemWith('DATABASE_URL', FILES['/s/db-plain']), /TLS/);
  assert.match(problemWith('DATABASE_URL', 'mysql://x@y/z'), /not a postgres/);
  assert.equal(problemWith('RESEND_API_KEY', FILES['/s/resend']), '');
  assert.match(problemWith('RESEND_API_KEY', 'sk_live_123456789'), /not a Resend API key/);
  assert.match(problemWith('ENQUIRY_SIGNING_SECRET', 'short'), /32 characters/);
  assert.match(problemWith('ENQUIRY_ACCESS_KEY', 'a b'.repeat(20)), /space/);
  assert.equal(problemWith('ENQUIRY_SIGNING_SECRET', generateSecret()), '');
  assert.equal(generateSecret().length, 64);
  assert.notEqual(generateSecret(), generateSecret());
});

test('refused before any call: another name, a value on the command line, an unreadable, empty or wrong value, the main project’s shared preview, --create on main', async () => {
  for (const [argv, re] of [
    [['main', 'production', 'SOMETHING=@/s/db', '--apply'], /SOMETHING is not one of good-times-in-cape-town's secrets/],
    [['main', 'production', 'ENQUIRY_ACCESS_KEY=@/s/db', '--apply'], /ENQUIRY_ACCESS_KEY is not one of good-times-in-cape-town's secrets/],
    [['main', 'production', `DATABASE_URL=${DB}`, '--apply'], /give each secret as NAME=@file/],
    [['main', 'production', 'DATABASE_URL=@/s/missing', '--apply'], /DATABASE_URL: cannot read its file/],
    [['main', 'production', 'RESEND_API_KEY=@/s/empty', '--apply'], /RESEND_API_KEY is empty; nothing was changed/],
    [['main', 'production', 'DATABASE_URL=@/s/db-owner', '--apply'], /connects as the database owner/],
    [['test', 'preview', 'ENQUIRY_ACCESS_KEY=@/s/short', '--apply'], /shorter than 32 characters/],
    [['main', 'preview', 'DATABASE_URL=@/s/db', '--apply'], /preview environment is shared by staging/],
    [['main', 'production', 'DATABASE_URL=@/s/db', '--create', '--apply'], /--create is only for the test project/],
    [['main', 'production', 'DATABASE_URL=@/s/db', 'DATABASE_URL=@/s/db', '--apply'], /DATABASE_URL is given twice/],
    [['elsewhere', 'production', 'DATABASE_URL=@/s/db'], /say which project/],
    [['main', 'staging', 'DATABASE_URL=@/s/db'], /say which environment/],
  ]) {
    const api = mockApi(live());
    await assert.rejects(run(argv, api), (e) => e instanceof Refusal && re.test(e.message), argv.join(' '));
    assert.deepEqual(api.calls, [], `${argv.join(' ')}: no call at all`);
  }
  // The refusal for a value on the command line does not repeat the value.
  await assert.rejects(run(['main', 'production', `DATABASE_URL=${DB}`], mockApi(live())), (e) => !e.message.includes('pw-0123456789abcdef'));
});

test('without --apply: says what it would set, writes nothing', async () => {
  const api = mockApi(live());
  const r = await run(['main', 'production', 'DATABASE_URL=@/s/db', 'RESEND_API_KEY=@/s/resend', '--generate', 'ENQUIRY_SIGNING_SECRET=@/s/new-signing'], api);
  assert.equal(r.applied, false);
  assert.deepEqual(api.writes(), []);
  assert.match(out(), /· add DATABASE_URL \(from its file\)/);
  assert.match(out(), /· add ENQUIRY_SIGNING_SECRET \(a new random value, kept in \/s\/new-signing\)/);
  assert.match(out(), /read-only run/);
});

test('--apply: one PATCH of that environment, encrypted, read back; the other environment and every plain value unchanged; no value printed', async () => {
  const api = mockApi(live());
  const written = {};
  await run(['main', 'production', 'DATABASE_URL=@/s/db', 'RESEND_API_KEY=@/s/resend', '--generate', 'ENQUIRY_SIGNING_SECRET=@/s/new-signing', '--apply'], api, { written });
  const patches = api.writes();
  assert.equal(patches.length, 1);
  assert.equal(patches[0].method, 'PATCH');
  assert.deepEqual(Object.keys(patches[0].body.deployment_configs), ['production']);
  const sent = patches[0].body.deployment_configs.production.env_vars;
  assert.deepEqual(Object.keys(sent).sort(), ['DATABASE_URL', 'ENQUIRY_SIGNING_SECRET', 'RESEND_API_KEY']);
  for (const v of Object.values(sent)) assert.equal(v.type, 'secret_text');
  assert.equal(sent.DATABASE_URL.value, DB, 'trimmed');
  assert.equal(sent.ENQUIRY_SIGNING_SECRET.value, written['/s/new-signing'], 'the generated value is the one kept in its file');
  const prod = api.s.projects[MAIN].deployment_configs.production.env_vars;
  assert.equal(prod.ENQUIRY_MODE.value, 'preview', 'the live switch is untouched');
  assert.deepEqual(api.s.projects[MAIN].deployment_configs.preview.env_vars, { ENQUIRY_MODE: { type: 'plain_text', value: 'preview' } });
  assert.match(out(), /✓ read back: DATABASE_URL, RESEND_API_KEY, ENQUIRY_SIGNING_SECRET stored encrypted/);
  for (const v of [DB, FILES['/s/resend'], written['/s/new-signing'], 'pw-0123456789abcdef']) assert.ok(!out().includes(v), 'no value in the output');
});

test('--generate never overwrites a file', async () => {
  const api = mockApi(live());
  await assert.rejects(run(['main', 'production', '--generate', 'ENQUIRY_SIGNING_SECRET=@/s/db', '--apply'], api), /cannot create \/s\/db \(it exists/);
  assert.deepEqual(api.writes(), []);
});

test('a lost secret or a changed variable fails the read-back', async () => {
  const projects = live();
  projects[MAIN].deployment_configs.production.env_vars.OLD_SECRET = { type: 'secret_text', value: 'x' };
  const api = mockApi(projects, { dropOn: 'production' });
  await assert.rejects(run(['main', 'production', 'DATABASE_URL=@/s/db', '--apply'], api), /read back after the update: production lost ENQUIRY_MODE; production lost SITE_ENV; production lost OLD_SECRET/);
});

test('the test project: --create makes it bare, then its preview secrets; refused without --create when it is missing', async () => {
  const api = mockApi({});
  await assert.rejects(run(['test', 'preview', 'DATABASE_URL=@/s/db', '--apply'], api), /good-times-enquiry-test does not exist yet: add --create/);
  assert.deepEqual(api.writes(), []);
  const written = {};
  await run(['test', 'preview', 'DATABASE_URL=@/s/db', 'RESEND_API_KEY=@/s/resend', '--generate', 'ENQUIRY_SIGNING_SECRET=@/s/t-sign', '--generate', 'ENQUIRY_ACCESS_KEY=@/s/t-access', '--create', '--apply'], api, { written });
  assert.deepEqual(api.writes().map((c) => c.method), ['POST', 'PATCH']);
  assert.deepEqual(api.writes()[0].body, { name: TEST, production_branch: 'main' }, 'bare: no variables, no live switch');
  const prev = api.s.projects[TEST].deployment_configs.preview.env_vars;
  assert.deepEqual(Object.keys(prev).sort(), [...project.TEST_SECRETS].sort());
  assert.notEqual(written['/s/t-sign'], written['/s/t-access']);
  assert.deepEqual(api.s.projects[TEST].deployment_configs.production.env_vars, {}, 'its production gets nothing');
  assert.ok(!api.writes().some((c) => c.path.includes(MAIN)), 'the main project is not touched');
});
