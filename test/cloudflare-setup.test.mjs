/**
 * scripts/cloudflare/setup.mjs against an in-memory Cloudflare and Resend API
 * (no network): it works only in the Good Times account, reads before it
 * writes, makes exactly the planned changes, never deletes or overwrites a DNS
 * record, keeps secrets, refuses live enquiries without them, and leaves the
 * domain (which serves the current website) alone until the owner approves
 * the cutover.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crc32 } from 'node:zlib';
import { run, Refusal, tokenShape } from '../scripts/cloudflare/setup.mjs';
import * as project from '../scripts/cloudflare/project.mjs';

const CF = 'http://cf.test/client/v4';
const RS = 'http://resend.test';
const GT = { id: 'acc-gt', name: 'Goodtimesincapetown’s Account' };
const NAME = project.PROJECT.name;

/** An in-memory Cloudflare (and Resend) with just the endpoints the script uses. */
function mockApi(state = {}) {
  const s = {
    accounts: [GT],
    user: null,
    token: 'user', // what Cloudflare makes of the token: 'user', 'account' (of GT) or 'invalid'
    projects: {},
    domains: {},
    zones: [],
    records: [],
    settings: { always_use_https: 'off', min_tls_version: '1.0', email_obfuscation: 'on' },
    ruleset: null,
    routing: { enabled: false },
    addresses: [],
    rules: [],
    resendDomains: [],
    dropSecretsOnPatch: false,
    ...state,
  };
  const calls = [];
  const res = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  const ok = (result) => res(200, { success: true, errors: [], result });
  const missing = (message) => res(404, { success: false, errors: [{ code: 7003, message }], result: null });
  const merge = (cfg = {}, patch = {}) => {
    const env = { ...(cfg.env_vars || {}) };
    for (const [k, v] of Object.entries(patch.env_vars || {})) v === null ? delete env[k] : (env[k] = v);
    return { ...cfg, ...patch, env_vars: env };
  };
  let ids = 0;
  async function fetchImpl(url, init = {}) {
    const u = new URL(url);
    const method = init.method || 'GET';
    const body = init.body ? JSON.parse(init.body) : undefined;
    const path = u.pathname;
    calls.push({ method, path, query: u.search, body });
    if (url.startsWith(RS)) {
      if (method === 'GET' && path === '/domains') return res(200, { data: s.resendDomains });
      if (method === 'POST' && path === '/domains') {
        const d = { id: `rd-${++ids}`, name: body.name, region: body.region, status: 'not_started', records: [
          { record: 'SPF', name: 'send', type: 'MX', ttl: 'Auto', status: 'not_started', value: `feedback-smtp.${body.region}.amazonses.com`, priority: 10 },
          { record: 'SPF', name: 'send', type: 'TXT', ttl: 'Auto', status: 'not_started', value: '"v=spf1 include:amazonses.com ~all"' },
          { record: 'DKIM', name: 'resend._domainkey', type: 'TXT', ttl: 'Auto', status: 'not_started', value: 'p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC' },
        ] };
        s.resendDomains.push(d);
        return res(200, d);
      }
      const m = /^\/domains\/([^/]+)(\/verify)?$/.exec(path);
      if (m && method === 'GET') return res(200, s.resendDomains.find((d) => d.id === m[1]));
      if (m && method === 'POST' && m[2]) return res(200, { object: 'domain', id: m[1] });
      return res(404, { message: 'not found' });
    }
    const p = path.replace('/client/v4', '');
    let m;
    const invalidToken = res(401, { success: false, errors: [{ code: 1000, message: 'Invalid API Token' }] });
    if (p === '/user/tokens/verify') return s.token === 'user' ? ok({ id: 'tok', status: 'active' }) : invalidToken;
    if ((m = /^\/accounts\/([^/]+)\/tokens\/verify$/.exec(p))) return s.token === 'account' && m[1] === GT.id ? ok({ id: 'tok', status: 'active' }) : invalidToken;
    if (p === '/accounts') return s.token === 'invalid' ? res(403, { success: false, errors: [{ code: 9109, message: 'Invalid access token' }] }) : ok(s.accounts);
    if (p === '/user') return s.user ? ok(s.user) : res(403, { success: false, errors: [{ code: 9109, message: 'Unauthorized' }] });
    if ((m = /^\/accounts\/([^/]+)\/pages\/projects$/.exec(p)) && method === 'POST') {
      s.projects[body.name] = { name: body.name, subdomain: `${body.name}.pages.dev`, production_branch: body.production_branch, deployment_configs: { production: merge({}, body.deployment_configs.production), preview: merge({}, body.deployment_configs.preview) } };
      return ok(s.projects[body.name]);
    }
    if ((m = /^\/accounts\/([^/]+)\/pages\/projects\/([^/]+)$/.exec(p))) {
      const proj = s.projects[m[2]];
      if (!proj) return missing('Project not found');
      if (method === 'GET') return ok(structuredClone(proj));
      if (method === 'PATCH') {
        proj.production_branch = body.production_branch ?? proj.production_branch;
        for (const n of ['production', 'preview']) {
          const next = merge(proj.deployment_configs[n], body.deployment_configs[n]);
          if (s.dropSecretsOnPatch) for (const [k, v] of Object.entries(next.env_vars)) if (v.type === 'secret_text') delete next.env_vars[k];
          proj.deployment_configs[n] = next;
        }
        return ok(proj);
      }
    }
    if ((m = /^\/accounts\/([^/]+)\/pages\/projects\/([^/]+)\/domains$/.exec(p))) {
      s.domains[m[2]] ||= [];
      if (method === 'GET') return ok(s.domains[m[2]]);
      s.domains[m[2]].push({ name: body.name, status: 'pending' });
      return ok(s.domains[m[2]].at(-1));
    }
    if (p === '/zones') return ok(s.zones.filter((z) => z.name === u.searchParams.get('name') && z.account === u.searchParams.get('account.id')));
    if ((m = /^\/zones\/([^/]+)\/dns_records$/.exec(p))) {
      if (method === 'GET') return ok(s.records);
      const r = { id: `rec-${++ids}`, ...body };
      s.records.push(r);
      return ok(r);
    }
    if ((m = /^\/zones\/([^/]+)\/settings\/([a-z_]+)$/.exec(p))) {
      if (method === 'PATCH') s.settings[m[2]] = body.value;
      return ok({ id: m[2], value: s.settings[m[2]] });
    }
    if (p.endsWith('/rulesets/phases/http_request_dynamic_redirect/entrypoint')) {
      if (method === 'GET') return s.ruleset ? ok(structuredClone(s.ruleset)) : missing('could not find entrypoint ruleset');
      s.ruleset = { id: 'rs-1', phase: 'http_request_dynamic_redirect', rules: body.rules.map((r) => ({ id: `rule-${++ids}`, ...r })) };
      return ok(s.ruleset);
    }
    if ((m = /^\/zones\/([^/]+)\/rulesets\/([^/]+)\/rules(?:\/([^/]+))?$/.exec(p))) {
      if (method === 'POST') s.ruleset.rules.push({ id: `rule-${++ids}`, ...body });
      if (method === 'PATCH') Object.assign(s.ruleset.rules.find((r) => r.id === m[3]), body);
      return ok(s.ruleset);
    }
    if (/^\/zones\/[^/]+\/email\/routing$/.test(p)) return ok(s.routing);
    if (/^\/zones\/[^/]+\/email\/routing\/dns$/.test(p)) {
      s.routing.enabled = true;
      return ok(s.routing);
    }
    if (/^\/accounts\/[^/]+\/email\/routing\/addresses$/.test(p)) {
      if (method === 'POST') s.addresses.push({ email: body.email, verified: null });
      return ok(s.addresses);
    }
    if (/^\/zones\/[^/]+\/email\/routing\/rules$/.test(p)) {
      if (method === 'POST') s.rules.push(body);
      return ok(s.rules);
    }
    return res(404, { success: false, errors: [{ code: 0, message: `mock has no ${method} ${p}` }] });
  }
  const writes = () => calls.filter((c) => c.method !== 'GET');
  return { s, calls, writes, fetchImpl };
}

const lines = [];
/**
 * The script with project.mjs's settings, both environments in preview (as they
 * are today): these tests are about what the script does, not about the live
 * switches, which have their own tests (the live guard below; production-build.test.mjs).
 */
const quiet = { ...project, ENVIRONMENTS: Object.fromEntries(Object.entries(project.ENVIRONMENTS).map(([k, e]) => [k, { ...e, vars: { ...e.vars, ENQUIRY_MODE: 'preview' } }])) };

const exec = (argv, api, { cfg = quiet, env = {} } = {}) => {
  lines.length = 0;
  return run(argv, { env: { CLOUDFLARE_API_TOKEN: 'cf-test-token', CLOUDFLARE_API_BASE: CF, RESEND_API_BASE: RS, ...env }, fetchImpl: api.fetchImpl, log: (l) => lines.push(l), cfg });
};
const out = () => lines.join('\n');
const activeZone = { id: 'zone-1', name: project.DOMAIN.apex, status: 'active', account: GT.id, name_servers: ['ada.ns.cloudflare.com', 'bob.ns.cloudflare.com'] };
/** The same settings once the owner has approved the cutover: the only way the domain, email and resend steps may write. */
const cutover = { ...quiet, DOMAIN: { ...project.DOMAIN, approved: true } };
const APEX = project.DOMAIN.apex;
const WWW = project.DOMAIN.www;
const PAGES_DEV = `${NAME}.pages.dev`;

/* ---------- the token ---------- */

/** A token in Cloudflare's format: prefix, 40 characters, the CRC32 of those 40 as 8 hex digits. */
const tokenOf = (prefix, body) => `${prefix}${body}${(crc32(body) >>> 0).toString(16).padStart(8, '0')}`;
const BODY = 'EXAMPLEtokenBODYnotARealCredential000001';

test('tokenShape tells what a credential is without revealing it: kind, length, stray characters, checksum', () => {
  const good = tokenOf('cfut_', BODY);
  const typo = good.slice(0, 10) + (good[10] === 'x' ? 'y' : 'x') + good.slice(11);
  const cases = [
    [good, /^a User API Token \(cfut_\), 53 characters; its checksum matches, so it was copied whole$/],
    [typo, /checksum does not match, so it was mistyped or cut short/],
    [`pat ${good}`, /^a value without a token prefix, 57 characters; it contains a space or line break/],
    [`"${good}"`, /quotation marks/],
    [good.slice(0, 40), /checksum does not match/],
    [tokenOf('cfat_', BODY), /^an Account API Token \(cfat_\), 53 characters; its checksum matches/],
    [tokenOf('cfk_', BODY), /^a Global API Key, not an API token \(cfk_\)/],
    [BODY, /^an older-format API token \(no prefix\), 40 characters$/],
    ['0123456789abcdef0123456789abcdef01234', /older-format Global API Key, not an API token/],
  ];
  for (const [value, want] of cases) {
    const shape = tokenShape(value);
    assert.match(shape, want, value.length + ' characters');
    assert.ok(!shape.includes(BODY.slice(0, 8)), 'never echoes the value');
  }
});

test('a token Cloudflare accepts as neither a user nor an account token is refused before anything else, with its shape', async () => {
  const token = tokenOf('cfut_', BODY);
  const api = mockApi({ token: 'invalid' });
  await assert.rejects(exec(['pages', '--apply'], api, { env: { CLOUDFLARE_API_TOKEN: token, CLOUDFLARE_ACCOUNT_ID: '0123456789abcdef0123456789abcdef' } }), (e) => {
    assert.ok(e instanceof Refusal);
    assert.match(e.message, /accepts CLOUDFLARE_API_TOKEN neither as a user token nor as a token of the account/);
    assert.match(e.message, /a User API Token \(cfut_\), 53 characters; its checksum matches, so it was copied whole/);
    assert.match(e.message, /revoked, rolled or deleted, has expired, or belongs to another account/);
    assert.doesNotMatch(e.message, /does not look like an account ID/);
    assert.ok(!e.message.includes(token) && !e.message.includes(BODY), 'the token never appears');
    return true;
  });
  assert.deepEqual(api.calls.map((c) => c.path.replace('/client/v4', '')), ['/user/tokens/verify', '/accounts/0123456789abcdef0123456789abcdef/tokens/verify']);
  // The same with a prefix pasted in front, and an account ID that is not one.
  await assert.rejects(exec(['pages'], api, { env: { CLOUDFLARE_API_TOKEN: `pat ${token}`, CLOUDFLARE_ACCOUNT_ID: 'Good Times account' } }), /contains a space or line break.*does not look like an account ID/s);
  // Without an account ID only a user token can be verified; the first account call then fails as Cloudflare says.
  await assert.rejects(exec(['check'], api, { env: { CLOUDFLARE_API_TOKEN: token } }), /GET \/accounts\?per_page=50: 403 9109 Invalid access token/);
  assert.match(out(), /Cloudflare token: not a user token \(set CLOUDFLARE_ACCOUNT_ID to verify an account token\)/);
});

test('an account token is verified against CLOUDFLARE_ACCOUNT_ID and accepted', async () => {
  const api = mockApi({ token: 'account' });
  const { account } = await exec(['check'], api, { env: { CLOUDFLARE_API_TOKEN: tokenOf('cfat_', BODY), CLOUDFLARE_ACCOUNT_ID: GT.id } });
  assert.equal(account.id, GT.id);
  assert.match(out(), /^Cloudflare token: active account token$/m);
  await exec(['check'], mockApi());
  assert.match(out(), /^Cloudflare token: active user token$/m);
});


/* ---------- the account ---------- */

test('refuses an account that cannot be proven to be Good Times’, and changes nothing', async () => {
  assert.equal(project.ACCOUNT.match, 'goodtimesincapetown');
  const api = mockApi({ accounts: [{ id: 'acc-other', name: 'Driftnimbus Account' }] });
  await assert.rejects(exec(['pages', '--apply'], api), (e) => e instanceof Refusal && /none of this token's accounts .*is the Good Times account \(goodtimesincapetown\)/.test(e.message));
  assert.deepEqual(api.writes(), []);
  // An explicit id still needs proof: the name, or the token's owner.
  await assert.rejects(exec(['pages'], api, { env: { CLOUDFLARE_ACCOUNT_ID: 'acc-other' } }), /cannot be confirmed as the Good Times account \(goodtimesincapetown\)/);
  // Another operator's account is refused even when its owner holds the token and it is the only account.
  const another = mockApi({ accounts: [{ id: 'acc-operator', name: 'Another Operator’s Account' }], user: { email: 'owner@another-operator.example' } });
  await assert.rejects(exec(['pages', '--apply'], another), /is the Good Times account/);
  assert.deepEqual(another.writes(), []);
  // A renamed Good Times account is proven by its owner's address.
  const owned = mockApi({ accounts: [{ id: 'acc-renamed', name: 'Cape Tours' }], user: { email: 'goodtimesincapetown@example.com' } });
  const { account } = await exec(['check'], owned);
  assert.equal(account.id, 'acc-renamed');
  assert.match(out(), /confirmed by token owner goodtimesincapetown@example\.com/);
  await assert.rejects(run(['check'], { env: {}, fetchImpl: owned.fetchImpl, log: () => {} }), /set CLOUDFLARE_API_TOKEN \(a token created in the Good Times account/);
  // A valid token without any account permission sees no account at all: say what to add.
  await assert.rejects(exec(['pages', '--apply'], mockApi({ accounts: [] }), { env: { CLOUDFLARE_ACCOUNT_ID: GT.id } }), (e) => e instanceof Refusal && /reaches no Cloudflare account.*Account › Cloudflare Pages › Edit with Account Resources › Include › the Good Times account \(goodtimesincapetown\)/.test(e.message));
  // Without anything to match, no account can be confirmed.
  await assert.rejects(exec(['check'], mockApi(), { cfg: { ...quiet, ACCOUNT: { match: '' } } }), /ACCOUNT\.match is empty/);
});

test('check is read-only: it reports what would change and makes no write at all', async () => {
  const api = mockApi({ zones: [activeZone] });
  await exec(['check', '--apply'], api);
  assert.deepEqual(api.writes(), [], '--apply never applies to check');
  assert.match(out(), /Account: Goodtimesincapetown’s Account \[acc-gt\], confirmed by account name/);
  assert.match(out(), /would change:\n {6}create the Pages project "good-times-in-cape-town" \(direct upload; production branch main\)/);
  assert.match(out(), /add CNAME goodtimesincapetown\.co\.za → good-times-in-cape-town\.pages\.dev \(proxied\)/);
});

/* ---------- Pages ---------- */

test('pages --apply creates the project with both environments exactly as project.mjs says; a second run changes nothing', async () => {
  const api = mockApi();
  await exec(['pages', '--apply'], api);
  const proj = api.s.projects[NAME];
  assert.equal(NAME, 'good-times-in-cape-town');
  assert.equal(proj.production_branch, project.PROJECT.productionBranch);
  for (const env of ['production', 'preview']) {
    const c = proj.deployment_configs[env];
    assert.equal(c.compatibility_date, project.PROJECT.compatibilityDate);
    assert.deepEqual(c.compatibility_flags, ['nodejs_compat']);
    assert.deepEqual(c.env_vars, Object.fromEntries(Object.entries(quiet.ENVIRONMENTS[env].vars).map(([k, value]) => [k, { type: 'plain_text', value }])));
  }
  assert.equal(proj.deployment_configs.production.env_vars.PUBLIC_SITE_URL.value, 'https://goodtimesincapetown.co.za');
  assert.equal(proj.deployment_configs.preview.env_vars.SITE_ENV.value, 'preview');
  assert.equal(proj.deployment_configs.preview.env_vars.PUBLIC_SITE_URL.value, 'https://staging.good-times-in-cape-town.pages.dev');
  assert.match(out(), /production secrets: DATABASE_URL missing, RESEND_API_KEY missing, ENQUIRY_SIGNING_SECRET missing/);
  // Creating the project touches nothing but the project: no domain, DNS or other project.
  assert.deepEqual(api.writes().map((c) => `${c.method} ${c.path.replace('/client/v4', '')}`), [`POST /accounts/${GT.id}/pages/projects`]);
  const before = api.writes().length;
  await exec(['pages', '--apply'], api);
  assert.equal(api.writes().length, before, 'idempotent');
  assert.match(out(), /Pages: nothing to change/);
});

test('not released: deploying the production branch is refused until the owner approves; every other branch deploys a preview', () => {
  assert.equal(project.PROJECT.productionBranch, 'main');
  assert.equal(project.ENVIRONMENTS.production.branch, 'main');
  // Released on 7 Nov 2026 for the project's own production address only (A1); the lock still refuses without a release
  assert.equal(project.RELEASE.approved, true);
  assert.match(project.RELEASE.date, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(project.RELEASE.by, 'the release names who approved it');
  assert.deepEqual(project.deployTarget('main'), { environment: 'production', alias: 'main' });
  assert.throws(() => project.deployTarget('main', { release: { approved: false, date: '', by: '' } }), /deploys to production, which the owner has not approved .*Deploy to "staging" instead/);
  // Once the owner's approval is recorded, main deploys to production as itself.
  assert.deepEqual(project.deployTarget('main', { release: { approved: true, date: '2026-12-01', by: 'the owner' } }), { environment: 'production', alias: 'main' });
  assert.deepEqual(project.deployTarget('preview'), { environment: 'preview', alias: 'preview', url: 'https://preview.good-times-in-cape-town.pages.dev' });
  for (const branch of ['staging', 'good-times-conversion', 'feature/new-tour', 'fix/anything']) assert.deepEqual(project.deployTarget(branch), { environment: 'preview', alias: 'staging', url: 'https://staging.good-times-in-cape-town.pages.dev' });
  assert.equal(project.environmentFor('main'), 'production');
  for (const branch of ['preview', 'staging', 'good-times-conversion']) assert.equal(project.environmentFor(branch), 'preview');
  // The staging address is the preview environment's own, and what its build calls itself.
  assert.equal(project.ENVIRONMENTS.preview.url, 'https://staging.good-times-in-cape-town.pages.dev');
  assert.equal(project.ENVIRONMENTS.preview.vars.PUBLIC_SITE_URL, project.ENVIRONMENTS.preview.url);
});

test('no environment takes live enquiries yet, and the preview sends nothing anywhere', () => {
  for (const env of ['production', 'preview']) assert.equal(project.ENVIRONMENTS[env].vars.ENQUIRY_MODE, 'preview', env);
  const preview = project.ENVIRONMENTS.preview.vars;
  for (const k of ['EMAIL_PROVIDER', 'FROM_EMAIL', 'ENQUIRY_TEAM_EMAIL', 'REPLY_TO_EMAIL', 'ADMIN_EMAILS', 'DATABASE_URL', 'WEB_ANALYTICS_TOKEN']) assert.equal(preview[k], undefined, `preview has no ${k}`);
  assert.equal(preview.SITE_ENV, 'preview', 'staging is kept out of search indexes');
  // Production sends from Good Times' public address (hello@, 6 Nov 2026) and delivers to the mailbox that receives mail
  // today (info@) until Good Times confirms hello@ receives it; used only once production goes live.
  assert.deepEqual(project.MAILBOXES, { info: 'info@goodtimesincapetown.co.za' });
  assert.equal(project.PUBLIC_ADDRESS, 'hello@goodtimesincapetown.co.za');
  const prod = project.ENVIRONMENTS.production.vars;
  for (const k of ['ENQUIRY_TEAM_EMAIL', 'REPLY_TO_EMAIL', 'ADMIN_EMAILS']) assert.equal(prod[k], 'info@goodtimesincapetown.co.za', k);
  assert.equal(prod.FROM_EMAIL, 'Good Times in Cape Town <hello@goodtimesincapetown.co.za>');
  assert.equal(prod.WEB_ANALYTICS_TOKEN, undefined, 'no analytics token until Good Times has its own');
});

test('pages --apply moves the production branch to project.mjs’s and keeps the secrets', async () => {
  const secret = { type: 'secret_text' };
  const configs = Object.fromEntries(['production', 'preview'].map((env) => [env, { compatibility_date: project.PROJECT.compatibilityDate, compatibility_flags: ['nodejs_compat'], env_vars: { ...Object.fromEntries(Object.entries(quiet.ENVIRONMENTS[env].vars).map(([k, value]) => [k, { type: 'plain_text', value }])), DATABASE_URL: secret, RESEND_API_KEY: secret, ENQUIRY_SIGNING_SECRET: secret } }]));
  // A project made in the dashboard starts with another production branch; project.mjs says main.
  const api = mockApi({ projects: { [NAME]: { name: NAME, production_branch: 'production', deployment_configs: structuredClone(configs) } } });
  await exec(['pages', '--apply'], api);
  assert.match(out(), /production branch production → main/);
  assert.equal(api.s.projects[NAME].production_branch, 'main');
  for (const env of ['production', 'preview']) assert.equal(api.s.projects[NAME].deployment_configs[env].env_vars.DATABASE_URL.type, 'secret_text');
});

test('pages --apply fixes drift without touching secrets, and stops if the API ever drops one', async () => {
  const secret = { type: 'secret_text' };
  const drifted = { compatibility_date: '2024-01-01', compatibility_flags: [], env_vars: { ENQUIRY_MODE: { type: 'plain_text', value: 'live' }, DATABASE_URL: secret, RESEND_API_KEY: secret, ENQUIRY_SIGNING_SECRET: secret } };
  const api = mockApi({ projects: { [NAME]: { name: NAME, production_branch: 'main', deployment_configs: { production: structuredClone(drifted), preview: { env_vars: {} } } } } });
  await exec(['pages', '--apply'], api);
  const prod = api.s.projects[NAME].deployment_configs.production;
  assert.equal(prod.env_vars.ENQUIRY_MODE.value, 'preview', 'the code decides the live switch');
  assert.equal(prod.compatibility_date, project.PROJECT.compatibilityDate);
  for (const k of project.SECRETS) assert.deepEqual(prod.env_vars[k], secret, `${k} kept`);
  assert.match(out(), /production: ENQUIRY_MODE = "preview"/);

  const lossy = mockApi({ dropSecretsOnPatch: true, projects: { [NAME]: { name: NAME, production_branch: 'main', deployment_configs: { production: structuredClone(drifted), preview: { env_vars: {} } } } } });
  await assert.rejects(exec(['pages', '--apply'], lossy), /production lost the secrets DATABASE_URL, RESEND_API_KEY, ENQUIRY_SIGNING_SECRET/);
});

test('an environment switched to ENQUIRY_MODE=live is refused while its secrets are missing', async () => {
  const live = { ...project, ENVIRONMENTS: { ...project.ENVIRONMENTS, production: { ...project.ENVIRONMENTS.production, vars: { ...project.ENVIRONMENTS.production.vars, ENQUIRY_MODE: 'live' } } } };
  const api = mockApi({ projects: { [NAME]: { name: NAME, production_branch: 'main', deployment_configs: { production: { env_vars: { DATABASE_URL: { type: 'secret_text' } } }, preview: {} } } } });
  await assert.rejects(exec(['pages', '--apply'], api, { cfg: live }), (e) => e instanceof Refusal && /production is set to ENQUIRY_MODE=live but its secrets RESEND_API_KEY, ENQUIRY_SIGNING_SECRET are missing/.test(e.message));
  assert.deepEqual(api.writes(), []);
  // The same for the preview: staging can only go live with secrets of its own.
  const stagingLive = { ...project, ENVIRONMENTS: { ...project.ENVIRONMENTS, preview: { ...project.ENVIRONMENTS.preview, vars: { ...project.ENVIRONMENTS.preview.vars, ENQUIRY_MODE: 'live' } } } };
  const fresh = mockApi();
  await assert.rejects(exec(['pages', '--apply'], fresh, { cfg: stagingLive }), /preview is set to ENQUIRY_MODE=live but its secrets DATABASE_URL, RESEND_API_KEY, ENQUIRY_SIGNING_SECRET are missing/);
  assert.deepEqual(fresh.writes(), []);
});

/* ---------- the domain: untouched until the owner approves the cutover ---------- */

test('until the owner approves the cutover, domain, email and resend --apply are refused before any call; without --apply they only read', async () => {
  assert.equal(project.DOMAIN.approved, false);
  assert.equal(APEX, 'goodtimesincapetown.co.za');
  for (const argv of [['domain', '--apply'], ['email', '--forward-to', 'owner@example.com', '--apply'], ['resend', '--apply']]) {
    const api = mockApi({ zones: [activeZone], projects: { [NAME]: { name: NAME, production_branch: 'main', deployment_configs: {} } } });
    await assert.rejects(exec(argv, api, { env: { RESEND_API_KEY: 're_full_access' } }), (e) => e instanceof Refusal && new RegExp(`^${argv[0]} --apply changes goodtimesincapetown\\.co\\.za, which serves the current website: the owner has not approved the cutover`).test(e.message), argv.join(' '));
    assert.deepEqual(api.calls, [], `${argv[0]}: not even a read`);
  }
  // Without --apply the same steps only read, and say what they would change.
  const api = mockApi({ zones: [activeZone], projects: { [NAME]: { name: NAME, production_branch: 'main', deployment_configs: {} } } });
  await exec(['domain'], api);
  await exec(['email', '--forward-to', 'owner@example.com'], api);
  assert.deepEqual(api.writes(), []);
  assert.match(out(), /would change/);
});

test('domain --apply (approved): DNS for the apex and www, both custom domains, HTTPS settings and the www → apex redirect; then nothing', async () => {
  const api = mockApi({ zones: [activeZone], projects: { [NAME]: { name: NAME, production_branch: 'main', deployment_configs: {} } } });
  await exec(['domain', '--apply'], api, { cfg: cutover });
  const cnames = api.s.records.filter((r) => r.type === 'CNAME');
  assert.deepEqual(cnames.map((r) => [r.name, r.content, r.proxied]), [
    [APEX, PAGES_DEV, true],
    [WWW, PAGES_DEV, true],
  ]);
  assert.ok(cnames.every((r) => r.comment === 'Good Times: scripts/cloudflare/setup.mjs'), 'each record says where it came from');
  assert.deepEqual(api.s.domains[NAME].map((d) => d.name), [APEX, WWW]);
  assert.deepEqual(api.s.settings, { always_use_https: 'on', min_tls_version: '1.2', email_obfuscation: 'off' }, 'Email Obfuscation off: its script is blocked by the CSP');
  const [rule] = api.s.ruleset.rules;
  assert.equal(rule.ref, 'gt_www_to_apex');
  assert.equal(rule.expression, '(http.host eq "www.goodtimesincapetown.co.za")');
  assert.deepEqual(rule.action_parameters.from_value, { status_code: 301, target_url: { expression: 'concat("https://goodtimesincapetown.co.za", http.request.uri.path)' }, preserve_query_string: true });
  const before = api.writes().length;
  await exec(['domain', '--apply'], api, { cfg: cutover });
  assert.equal(api.writes().length, before, 'idempotent');
});

test('domain --apply never replaces or deletes an existing record: a parked apex is reported and left alone, mail records are kept', async () => {
  const existing = [
    { id: 'r1', type: 'A', name: APEX, content: '192.0.2.10', proxied: false },
    { id: 'r2', type: 'MX', name: APEX, content: 'smtp.google.com', priority: 1 },
    { id: 'r3', type: 'TXT', name: APEX, content: '"v=spf1 include:_spf.google.com ~all"' },
  ];
  const otherRule = { id: 'rule-x', ref: 'someone_elses', expression: '(http.request.uri.path eq "/old")', action: 'redirect', action_parameters: {}, enabled: true };
  const api = mockApi({ zones: [activeZone], records: structuredClone(existing), ruleset: { id: 'rs-1', rules: [otherRule] }, projects: { [NAME]: { name: NAME, production_branch: 'main', deployment_configs: {} } } });
  await exec(['domain', '--apply'], api, { cfg: cutover });
  assert.match(out(), /CNAME goodtimesincapetown\.co\.za: existing A 192\.0\.2\.10 is in the way; left alone/);
  assert.ok(!api.s.records.some((r) => r.type === 'CNAME' && r.name === APEX), 'no apex CNAME beside the A record');
  assert.ok(api.s.records.some((r) => r.type === 'CNAME' && r.name === WWW));
  for (const r of existing) assert.deepEqual(api.s.records.find((x) => x.id === r.id), r, `${r.type} kept as it was`);
  assert.equal(api.calls.filter((c) => c.method === 'DELETE').length, 0);
  assert.deepEqual(api.s.ruleset.rules.map((r) => r.ref), ['someone_elses', 'gt_www_to_apex'], 'other redirect rules are kept');
});

test('without the zone in the account the domain step only reports: registration and nameservers are the owner’s decisions', async () => {
  // Today: goodtimesincapetown.co.za is not in the Good Times Cloudflare account.
  const api = mockApi();
  await exec(['domain', '--apply'], api, { cfg: cutover });
  assert.match(out(), /goodtimesincapetown\.co\.za is not in this Cloudflare account\. Adding a site \(Free plan\) and pointing the registrar's nameservers at Cloudflare are the owner's decisions/);
  assert.deepEqual(api.writes(), []);
  const pending = mockApi({ zones: [{ ...activeZone, status: 'pending' }] });
  await exec(['domain'], pending);
  assert.match(out(), /zone goodtimesincapetown\.co\.za: pending \(set the nameservers at the registrar to ada\.ns\.cloudflare\.com and bob\.ns\.cloudflare\.com\)/);
  assert.deepEqual(pending.writes(), []);
});

/* ---------- mail ---------- */

test('email: an existing mail provider is kept (no change); without a confirmed mailbox it asks for one', async () => {
  const google = mockApi({ zones: [activeZone], records: [{ id: 'mx', type: 'MX', name: APEX, content: 'smtp.google.com', priority: 1 }] });
  await exec(['email', '--forward-to', 'owner@example.com', '--apply'], google, { cfg: cutover });
  assert.match(out(), /already receives mail at smtp\.google\.com\. Those records are kept/);
  assert.deepEqual(google.writes(), []);
  const fresh = mockApi({ zones: [activeZone] });
  await exec(['email', '--apply'], fresh, { cfg: cutover });
  assert.match(out(), /Email Routing needs the mailbox that info@goodtimesincapetown\.co\.za forwards to: pass --forward-to <address> once Good Times has confirmed it/);
  assert.deepEqual(fresh.writes(), []);
});

test('email --forward-to … --apply (approved): routing on, info@ forwarded, DMARC at p=none; then nothing', async () => {
  const api = mockApi({ zones: [activeZone] });
  await exec(['email', '--forward-to', 'owner@example.com', '--apply'], api, { cfg: cutover });
  assert.equal(api.s.routing.enabled, true);
  assert.deepEqual(api.s.addresses.map((a) => a.email), ['owner@example.com']);
  assert.deepEqual(api.s.rules.map((r) => [r.name, r.matchers[0].value, r.actions[0].value]), [['Good Times: info@goodtimesincapetown.co.za', 'info@goodtimesincapetown.co.za', ['owner@example.com']]]);
  assert.deepEqual(api.s.records.filter((r) => r.name === '_dmarc.goodtimesincapetown.co.za').map((r) => r.content), ['"v=DMARC1; p=none"']);
  const before = api.writes().length;
  await exec(['email', '--forward-to', 'owner@example.com', '--apply'], api, { cfg: cutover });
  assert.equal(api.writes().length, before, 'idempotent');
});

test('resend --apply (approved): adds the domain in Resend, its records in Cloudflare (TXT quoted, MX with priority) and asks Resend to verify', async () => {
  const api = mockApi({ zones: [activeZone] });
  await exec(['resend', '--apply'], api, { cfg: cutover, env: { RESEND_API_KEY: 're_full_access' } });
  assert.equal(api.s.resendDomains[0].name, APEX);
  assert.equal(api.s.resendDomains[0].region, 'eu-west-1');
  const added = api.s.records.map((r) => [r.type, r.name, r.content, r.priority]);
  assert.deepEqual(added, [
    ['MX', 'send.goodtimesincapetown.co.za', 'feedback-smtp.eu-west-1.amazonses.com', 10],
    ['TXT', 'send.goodtimesincapetown.co.za', '"v=spf1 include:amazonses.com ~all"', undefined],
    ['TXT', 'resend._domainkey.goodtimesincapetown.co.za', '"p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC"', undefined],
  ]);
  assert.ok(api.calls.some((c) => c.method === 'POST' && c.path === `/domains/${api.s.resendDomains[0].id}/verify`));
  await assert.rejects(exec(['resend', '--apply'], api, { cfg: cutover }), /set RESEND_API_KEY \(a Good Times Resend key/);
});
