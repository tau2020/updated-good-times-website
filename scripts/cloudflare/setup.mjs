#!/usr/bin/env node
/**
 * Good Times' Cloudflare (and Resend) set-up, from scripts/cloudflare/project.mjs.
 * Read-only unless --apply: it prints what is in place and what --apply would
 * change, then (with --apply) makes exactly those changes.
 *
 *   CLOUDFLARE_API_TOKEN=… node scripts/cloudflare/setup.mjs [check]                      everything, read-only
 *   CLOUDFLARE_API_TOKEN=… node scripts/cloudflare/setup.mjs pages --apply                 the Pages project and its two environments
 *   CLOUDFLARE_API_TOKEN=… node scripts/cloudflare/setup.mjs domain --apply                custom domains, DNS, HTTPS, www → apex
 *   CLOUDFLARE_API_TOKEN=… node scripts/cloudflare/setup.mjs email --forward-to <mailbox> --apply
 *                                                                                           the site's addresses through Email Routing
 *   CLOUDFLARE_API_TOKEN=… RESEND_API_KEY=… node scripts/cloudflare/setup.mjs resend --apply
 *                                                                                           the sending domain in Resend and its DNS records
 *
 * Safety, whatever the flags:
 *  - Works only in the Good Times account (ACCOUNT.match): an account whose
 *    name contains it, or the token owner's own account when the owner's
 *    address does. CLOUDFLARE_ACCOUNT_ID picks one of the token's accounts, and
 *    the same proof still applies.
 *  - domain, email and resend change nothing (even with --apply) until the
 *    owner has approved the cutover (DOMAIN.approved in project.mjs): the
 *    domain serves the current website.
 *  - Never deletes or overwrites a DNS record. Where an existing record is in
 *    the way it stops for that record and says which, so a person decides.
 *  - Never reads, writes or prints a secret's value: it checks that the secret
 *    names exist, and refuses ENQUIRY_MODE=live for an environment without them.
 *  - Never changes the domain's registration or buys anything.
 *
 * Token permissions: Account › Cloudflare Pages: Edit (pages), Zone › Zone: Read,
 * Zone › DNS: Edit, Zone › Zone Settings: Edit, Zone › Single Redirect: Edit
 * (domain), Zone › Email Routing Rules: Edit and Account › Email Routing
 * Addresses: Edit (email). User › User Details: Read lets it prove the account
 * by its owner's address (needed unless the account's name contains it).
 */
import { pathToFileURL } from 'node:url';
import { crc32 } from 'node:zlib';
import * as defaults from './project.mjs';

const CF_API = 'https://api.cloudflare.com/client/v4';
const RESEND_API = 'https://api.resend.com';
const WWW_RULE_REF = 'gt_www_to_apex';
const COMMANDS = ['check', 'pages', 'domain', 'email', 'resend'];

export class Refusal extends Error {
  constructor(message) {
    super(message);
    this.name = 'Refusal';
  }
}

/* ---------- the token ---------- */

const TOKEN_KINDS = { cfut_: 'a User API Token', cfat_: 'an Account API Token', cfk_: 'a Global API Key, not an API token' };

/**
 * What a credential looks like, without revealing any of it: its kind (from
 * Cloudflare's prefixes), its length, stray characters, and whether the
 * checksum prefixed credentials end with matches (the prefix, 40 characters,
 * then the CRC32 of those 40 as 8 hex digits), so a mis-copied token can be
 * told from one Cloudflare has revoked.
 */
export function tokenShape(value) {
  const t = String(value ?? '');
  const notes = [];
  if (/\s/.test(t)) notes.push('it contains a space or line break (copy the token alone, with nothing before or after it)');
  if (/["'`]/.test(t)) notes.push('it contains quotation marks');
  const prefix = Object.keys(TOKEN_KINDS).find((p) => t.startsWith(p));
  let kind = 'a value without a token prefix';
  if (prefix) {
    kind = `${TOKEN_KINDS[prefix]} (${prefix})`;
    const m = /^([A-Za-z0-9]{40})([0-9a-f]{8})$/.exec(t.slice(prefix.length));
    const intact = m && (crc32(m[1]) >>> 0).toString(16).padStart(8, '0') === m[2];
    notes.push(intact ? 'its checksum matches, so it was copied whole' : 'its checksum does not match, so it was mistyped or cut short');
  } else if (/^[A-Za-z0-9_-]{40}$/.test(t)) kind = 'an older-format API token (no prefix)';
  else if (/^[0-9a-f]{37}$/.test(t)) kind = 'an older-format Global API Key, not an API token';
  return [`${kind}, ${t.length} characters`, ...notes].join('; ');
}

/** Cloudflare's own word on the token: a user token, a token of the given account, or neither (null). */
async function verifyToken(cf, accountId) {
  const user = await cf.get('/user/tokens/verify').catch(() => null);
  if (user) return `${user.status} user token`;
  if (!accountId) return null;
  const account = await cf.get(`/accounts/${accountId}/tokens/verify`).catch(() => null);
  return account ? `${account.status} account token` : null;
}

function tokenRefusal(token, accountId) {
  const id = /^[0-9a-f]{32}$/.test(accountId) ? '' : ' CLOUDFLARE_ACCOUNT_ID does not look like an account ID either (32 hexadecimal characters, shown on the account\'s Workers & Pages overview).';
  return new Refusal(
    `Cloudflare accepts CLOUDFLARE_API_TOKEN neither as a user token nor as a token of the account in CLOUDFLARE_ACCOUNT_ID. The value is ${tokenShape(token)}.${id} ` +
      'A token copied whole is refused like this when it has been revoked, rolled or deleted, has expired, or belongs to another account. ' +
      'Create one in the Good Times account (My Profile › API Tokens › Create Token › Custom token: Account › Cloudflare Pages: Edit and User › User Details: Read), copy only the token, and replace the secret.',
  );
}

/* ---------- API clients ---------- */

export function cloudflareClient({ token, base = CF_API, fetchImpl = fetch }) {
  async function call(method, path, body) {
    const res = await fetchImpl(`${base}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.success === false) {
      const detail = (json.errors || []).map((e) => `${e.code} ${e.message}`).join('; ') || res.statusText;
      const err = new Error(`Cloudflare ${method} ${path}: ${res.status} ${detail}`);
      err.status = res.status;
      throw err;
    }
    return json.result;
  }
  return {
    get: (p) => call('GET', p),
    post: (p, b = {}) => call('POST', p, b),
    patch: (p, b) => call('PATCH', p, b),
    put: (p, b) => call('PUT', p, b),
    /** GET that answers null for a 404 (something that does not exist yet). */
    find: (p) => call('GET', p).catch((e) => (e.status === 404 ? null : Promise.reject(e))),
  };
}

export function resendClient({ apiKey, base = RESEND_API, fetchImpl = fetch }) {
  async function call(method, path, body) {
    const res = await fetchImpl(`${base}${path}`, {
      method,
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`Resend ${method} ${path}: ${res.status} ${json.message || json.name || res.statusText}`);
    return json;
  }
  return { get: (p) => call('GET', p), post: (p, b = {}) => call('POST', p, b) };
}

/* ---------- the account ---------- */

/** The Good Times account among the token's accounts, with how it was proven; refuses anything else. */
export async function resolveAccount(cf, { match, accountId = '' }) {
  const accounts = (await cf.get('/accounts?per_page=50')) || [];
  const user = await cf.get('/user').catch(() => null); // needs User › User Details: Read
  const want = String(match || '').toLowerCase();
  if (!want) throw new Refusal('ACCOUNT.match is empty in scripts/cloudflare/project.mjs, so no account can be confirmed');
  const named = (a) => a.name.toLowerCase().includes(want);
  const owner = Boolean(user?.email?.toLowerCase().includes(want));
  if (!accounts.length) {
    throw new Refusal(`this token reaches no Cloudflare account, so it has no account permission. Edit it (My Profile › API Tokens) to add Account › Cloudflare Pages › Edit with Account Resources › Include › the Good Times account (${match}), then run again.`);
  }
  const listed = accounts.map((a) => `${a.name} [${a.id}]`).join(', ');
  let account = accountId ? accounts.find((a) => a.id === accountId) : accounts.find(named);
  if (!account && owner && accounts.length === 1) account = accounts[0];
  if (!account) throw new Refusal(`none of this token's accounts (${listed}) is the Good Times account (${match}). Use a token created in that account, or set CLOUDFLARE_ACCOUNT_ID to its id.`);
  const proof = named(account) ? `account name "${account.name}"` : owner ? `token owner ${user.email}` : '';
  if (!proof) throw new Refusal(`account ${account.name} [${account.id}] cannot be confirmed as the Good Times account (${match}): its name does not contain it and the token cannot read its owner (grant User › User Details: Read).`);
  return { account, proof };
}

/* ---------- Pages ---------- */

const desired = (project, environments, name) => ({
  compatibility_date: project.compatibilityDate,
  compatibility_flags: [...project.compatibilityFlags],
  env_vars: Object.fromEntries(Object.entries(environments[name].vars).map(([k, value]) => [k, { type: 'plain_text', value }])),
});
const secretNames = (config) => Object.entries(config?.env_vars || {}).filter(([, v]) => v?.type === 'secret_text').map(([k]) => k);

export async function pages(cf, accountId, { cfg, apply, log }) {
  const { PROJECT, ENVIRONMENTS, SECRETS } = cfg;
  const path = `/accounts/${accountId}/pages/projects/${PROJECT.name}`;
  let project = await cf.find(path);
  const plan = [];
  if (!project) plan.push(`create the Pages project "${PROJECT.name}" (direct upload; production branch ${PROJECT.productionBranch})`);
  else {
    log(`  ✓ Pages project ${PROJECT.name} exists (${project.subdomain || `${PROJECT.name}.pages.dev`})`);
    if (project.production_branch !== PROJECT.productionBranch) plan.push(`production branch ${project.production_branch} → ${PROJECT.productionBranch}`);
    if (project.source) log(`  ! the project is connected to Git (${project.source.type}); this pipeline deploys by direct upload (wrangler pages deploy)`);
  }
  const configs = {};
  for (const name of ['production', 'preview']) {
    const want = desired(PROJECT, ENVIRONMENTS, name);
    const have = project?.deployment_configs?.[name] || {};
    configs[name] = want;
    if (have.compatibility_date !== want.compatibility_date) plan.push(`${name}: compatibility date ${have.compatibility_date || 'unset'} → ${want.compatibility_date}`);
    if ([...(have.compatibility_flags || [])].sort().join() !== [...want.compatibility_flags].sort().join()) plan.push(`${name}: compatibility flags [${(have.compatibility_flags || []).join(', ')}] → [${want.compatibility_flags.join(', ')}]`);
    for (const [k, v] of Object.entries(want.env_vars)) {
      const cur = have.env_vars?.[k];
      if (!cur || cur.type !== 'plain_text' || cur.value !== v.value) plan.push(`${name}: ${k} = ${JSON.stringify(v.value)}${cur?.type === 'secret_text' ? ' (replacing a secret of that name)' : ''}`);
    }
    const secrets = secretNames(have);
    const missing = SECRETS.filter((s) => !secrets.includes(s));
    log(`  ${missing.length ? '·' : '✓'} ${name} secrets: ${SECRETS.map((s) => `${s} ${secrets.includes(s) ? 'set' : 'missing'}`).join(', ')}`);
    if (ENVIRONMENTS[name].vars.ENQUIRY_MODE === 'live' && missing.length) {
      throw new Refusal(`${name} is set to ENQUIRY_MODE=live but its secrets ${missing.join(', ')} are missing: add them in the Pages project's settings (Variables and Secrets) first.`);
    }
  }
  report('Pages', plan, apply, log);
  if (!apply || !plan.length) return { project, plan };
  const before = Object.fromEntries(['production', 'preview'].map((n) => [n, secretNames(project?.deployment_configs?.[n])]));
  if (!project) project = await cf.post(`/accounts/${accountId}/pages/projects`, { name: PROJECT.name, production_branch: PROJECT.productionBranch, deployment_configs: configs });
  else project = await cf.patch(path, { production_branch: PROJECT.productionBranch, deployment_configs: configs });
  // The API merges env_vars; prove it kept every secret the project had.
  const after = await cf.get(path);
  for (const n of ['production', 'preview']) {
    const lost = before[n].filter((s) => !secretNames(after.deployment_configs?.[n]).includes(s));
    if (lost.length) throw new Error(`${n} lost the secrets ${lost.join(', ')} during the update: set them again in the dashboard`);
  }
  log(`  ✓ applied ${plan.length} change${plan.length === 1 ? '' : 's'}`);
  return { project: after, plan };
}

/* ---------- DNS helpers ---------- */

const unquote = (s) => String(s ?? '').replace(/^"(.*)"$/s, '$1').replace(/"\s+"/g, '');
const sameContent = (a, b) => unquote(a).toLowerCase() === unquote(b).toLowerCase();

async function zoneOf(cf, accountId, apex, log) {
  const zones = (await cf.get(`/zones?name=${encodeURIComponent(apex)}&account.id=${accountId}`)) || [];
  const zone = zones[0];
  if (!zone) {
    log(`  ✗ ${apex} is not in this Cloudflare account. Adding a site (Free plan) and pointing the registrar's nameservers at Cloudflare are the owner's decisions: confirm the registration, registrar access and current DNS first.`);
    return null;
  }
  log(`  ${zone.status === 'active' ? '✓' : '·'} zone ${apex}: ${zone.status}${zone.status === 'active' ? '' : ` (set the nameservers at the registrar to ${(zone.name_servers || []).join(' and ')})`}`);
  return zone;
}

/**
 * Plan one DNS record: nothing if an equal record exists, a create if the name is
 * free for that type, and a stop (never a replacement) when something else is there.
 * `exclusive` types: any A/AAAA/CNAME at the same name conflicts (an address record).
 */
function planRecord(records, want, { exclusive = false } = {}) {
  const at = records.filter((r) => r.name === want.name);
  const same = at.find((r) => r.type === want.type && sameContent(r.content, want.content) && (want.priority === undefined || r.priority === want.priority));
  if (same) return { ok: same };
  const clash = exclusive ? at.filter((r) => ['A', 'AAAA', 'CNAME'].includes(r.type)) : at.filter((r) => r.type === want.type && (want.type !== 'TXT' || want.match?.test(unquote(r.content))));
  if (clash.length) return { conflict: clash };
  return { create: want };
}

async function applyRecords(cf, zone, steps, { apply, log, label }) {
  const plan = [];
  for (const s of steps) {
    if (s.ok) log(`  ✓ ${s.want.type} ${s.want.name} → ${unquote(s.ok.content)}`);
    else if (s.conflict) log(`  ✗ ${s.want.type} ${s.want.name}: existing ${s.conflict.map((r) => `${r.type} ${unquote(r.content)}`).join(', ')} is in the way; left alone. Repoint or remove it after confirming nothing uses it, then run again.`);
    else plan.push(s);
  }
  report(label, plan.map((s) => `add ${s.want.type} ${s.want.name} → ${unquote(s.want.content)}${s.want.proxied ? ' (proxied)' : ''}`), apply, log);
  if (apply) for (const s of plan) await cf.post(`/zones/${zone.id}/dns_records`, { type: s.want.type, name: s.want.name, content: s.want.content, ttl: 1, proxied: Boolean(s.want.proxied), ...(s.want.priority !== undefined ? { priority: s.want.priority } : {}), comment: 'Good Times: scripts/cloudflare/setup.mjs' });
  return { plan, conflicts: steps.filter((s) => s.conflict) };
}

/* ---------- the domain: DNS, custom domains, HTTPS, www → apex ---------- */

export async function domain(cf, accountId, { cfg, apply, log }) {
  const { PROJECT, DOMAIN } = cfg;
  const zone = await zoneOf(cf, accountId, DOMAIN.apex, log);
  if (!zone) return { zone: null };
  const records = (await cf.get(`/zones/${zone.id}/dns_records?per_page=500`)) || [];
  const target = `${PROJECT.name}.pages.dev`;
  const steps = [DOMAIN.apex, DOMAIN.www].map((name) => {
    const want = { type: 'CNAME', name, content: target, proxied: true };
    return { want, ...planRecord(records, want, { exclusive: true }) };
  });
  const dns = await applyRecords(cf, zone, steps, { apply, log, label: 'DNS (site)' });

  // Pages custom domains (the apex serves the site; www is attached too, and redirected at the edge).
  const project = await cf.find(`/accounts/${accountId}/pages/projects/${PROJECT.name}`);
  const plan = [];
  if (!project) log(`  · the Pages project ${PROJECT.name} does not exist yet: run "pages --apply" first`);
  else {
    const domains = (await cf.get(`/accounts/${accountId}/pages/projects/${PROJECT.name}/domains`)) || [];
    for (const name of [DOMAIN.apex, DOMAIN.www]) {
      const d = domains.find((x) => x.name === name);
      if (d) log(`  ${d.status === 'active' ? '✓' : '·'} custom domain ${name}: ${d.status}`);
      else plan.push({ name });
    }
  }
  // HTTPS everywhere, a modern TLS floor, and no Email Obfuscation: it rewrites every address in the HTML
  // into "[email protected]" plus a script, which the strict CSP blocks, so the dashboard and the status
  // pages would show staff "[email protected]" instead of the customer's address.
  const settings = [];
  for (const [id, value] of [['always_use_https', 'on'], ['min_tls_version', '1.2'], ['email_obfuscation', 'off']]) {
    const cur = await cf.get(`/zones/${zone.id}/settings/${id}`);
    if (cur?.value === value) log(`  ✓ ${id}: ${value}`);
    else settings.push({ id, from: cur?.value, value });
  }
  // www → https://apex, path and query kept: a Single Redirect rule at the edge.
  const phase = `/zones/${zone.id}/rulesets/phases/http_request_dynamic_redirect/entrypoint`;
  const ruleset = await cf.find(phase);
  const rule = {
    ref: WWW_RULE_REF,
    description: `Good Times: ${DOMAIN.www} → ${DOMAIN.apex} (scripts/cloudflare/setup.mjs)`,
    expression: `(http.host eq "${DOMAIN.www}")`,
    action: 'redirect',
    action_parameters: { from_value: { status_code: 301, target_url: { expression: `concat("https://${DOMAIN.apex}", http.request.uri.path)` }, preserve_query_string: true } },
    enabled: true,
  };
  const existing = ruleset?.rules?.find((r) => r.ref === WWW_RULE_REF);
  const sameRule = existing && existing.expression === rule.expression && JSON.stringify(existing.action_parameters) === JSON.stringify(rule.action_parameters) && existing.enabled;
  if (sameRule) log(`  ✓ redirect ${DOMAIN.www} → https://${DOMAIN.apex} (301, path and query kept)`);

  report(
    'Domain',
    [...plan.map((d) => `attach ${d.name} to the Pages project`), ...settings.map((s) => `${s.id}: ${s.from ?? 'unset'} → ${s.value}`), ...(sameRule ? [] : [`${existing ? 'update' : 'add'} the redirect ${DOMAIN.www} → https://${DOMAIN.apex} (301)`])],
    apply,
    log,
  );
  if (apply) {
    for (const d of plan) await cf.post(`/accounts/${accountId}/pages/projects/${PROJECT.name}/domains`, d);
    for (const s of settings) await cf.patch(`/zones/${zone.id}/settings/${s.id}`, { value: s.value });
    if (!ruleset) await cf.put(phase, { rules: [rule] });
    else if (!existing) await cf.post(`/zones/${zone.id}/rulesets/${ruleset.id}/rules`, rule);
    else if (!sameRule) await cf.patch(`/zones/${zone.id}/rulesets/${ruleset.id}/rules/${existing.id}`, rule);
  }
  return { zone, dns, domains: plan, settings, redirect: sameRule ? 'ok' : existing ? 'update' : 'add' };
}

/* ---------- inbound mail: the site's addresses through Email Routing ---------- */

export async function email(cf, accountId, { cfg, apply, log, forwardTo }) {
  const { DOMAIN, MAILBOXES } = cfg;
  const zone = await zoneOf(cf, accountId, DOMAIN.apex, log);
  if (!zone) return { zone: null };
  const records = (await cf.get(`/zones/${zone.id}/dns_records?per_page=500`)) || [];
  const mx = records.filter((r) => r.type === 'MX' && r.name === DOMAIN.apex);
  const foreign = mx.filter((r) => !/\.mx\.cloudflare\.net\.?$/i.test(r.content));
  if (foreign.length) {
    log(`  ✗ ${DOMAIN.apex} already receives mail at ${foreign.map((r) => r.content).join(', ')}. Those records are kept: create ${Object.values(MAILBOXES).join(' and ')} with that provider, or confirm a move before switching to Email Routing.`);
    return { zone, refused: 'existing-mx' };
  }
  if (!forwardTo) {
    log(`  · Email Routing needs the mailbox that ${Object.values(MAILBOXES).join(' and ')} ${Object.values(MAILBOXES).length === 1 ? 'forwards' : 'forward'} to: pass --forward-to <address> once Good Times has confirmed it.`);
    return { zone, refused: 'no-destination' };
  }
  const plan = [];
  const routing = await cf.find(`/zones/${zone.id}/email/routing`);
  if (routing?.enabled) log(`  ✓ Email Routing enabled`);
  else plan.push({ kind: 'enable', text: 'enable Email Routing (Cloudflare adds its MX, SPF and DKIM records)' });
  const addresses = (await cf.get(`/accounts/${accountId}/email/routing/addresses`)) || [];
  const dest = addresses.find((a) => a.email.toLowerCase() === forwardTo.toLowerCase());
  if (dest) log(`  ${dest.verified ? '✓' : '·'} destination ${forwardTo}: ${dest.verified ? 'verified' : 'awaiting the link Cloudflare emailed to it'}`);
  else plan.push({ kind: 'destination', text: `add the destination ${forwardTo} (Cloudflare emails it a verification link)` });
  const rules = (await cf.get(`/zones/${zone.id}/email/routing/rules`)) || [];
  for (const address of Object.values(MAILBOXES)) {
    const r = rules.find((x) => (x.matchers || []).some((m) => m.type === 'literal' && m.field === 'to' && m.value.toLowerCase() === address));
    const fwd = r?.actions?.find((a) => a.type === 'forward');
    if (r && fwd?.value?.map((v) => v.toLowerCase()).includes(forwardTo.toLowerCase())) log(`  ✓ ${address} → ${forwardTo}`);
    else if (r) log(`  ✗ ${address} already has a routing rule (${fwd ? `forward to ${fwd.value.join(', ')}` : r.actions?.map((a) => a.type).join(', ')}); left alone`);
    else plan.push({ kind: 'rule', address, text: `route ${address} → ${forwardTo}` });
  }
  // DMARC: start at p=none (monitor), tighten once reports are clean. An existing policy is Good Times' and stays.
  const dmarcWant = { type: 'TXT', name: `_dmarc.${DOMAIN.apex}`, content: '"v=DMARC1; p=none"', match: /^v=DMARC1/i };
  const dmarc = planRecord(records, dmarcWant);
  if (!dmarc.create) log(`  ✓ DMARC: ${unquote((dmarc.ok || dmarc.conflict[0]).content)} (left as it is)`);
  else plan.push({ kind: 'dmarc', text: `add TXT _dmarc.${DOMAIN.apex} → v=DMARC1; p=none` });
  report('Email', plan.map((p) => p.text), apply, log);
  if (apply) {
    for (const p of plan.filter((x) => x.kind === 'destination')) await cf.post(`/accounts/${accountId}/email/routing/addresses`, { email: forwardTo });
    for (const p of plan.filter((x) => x.kind === 'enable')) await cf.post(`/zones/${zone.id}/email/routing/dns`, {});
    for (const p of plan.filter((x) => x.kind === 'rule')) {
      await cf.post(`/zones/${zone.id}/email/routing/rules`, {
        name: `Good Times: ${p.address}`,
        enabled: true,
        matchers: [{ type: 'literal', field: 'to', value: p.address }],
        actions: [{ type: 'forward', value: [forwardTo] }],
      });
    }
    if (dmarc.create) await cf.post(`/zones/${zone.id}/dns_records`, { type: 'TXT', name: dmarcWant.name, content: dmarcWant.content, ttl: 1, proxied: false, comment: 'Good Times: scripts/cloudflare/setup.mjs' });
  }
  return { zone, plan, dmarc: dmarc.create ? 'add' : 'ok' };
}

/* ---------- outbound mail: the Resend sending domain ---------- */

export async function resend(cf, accountId, rs, { cfg, apply, log, region = 'eu-west-1' }) {
  const { DOMAIN } = cfg;
  const zone = await zoneOf(cf, accountId, DOMAIN.apex, log);
  if (!zone) return { zone: null };
  const list = (await rs.get('/domains'))?.data || [];
  let dom = list.find((d) => d.name === DOMAIN.apex);
  if (!dom) {
    report('Resend', [`add ${DOMAIN.apex} to Resend (${region})`], apply, log);
    if (!apply) return { zone, domain: null };
    dom = await rs.post('/domains', { name: DOMAIN.apex, region });
  }
  const full = await rs.get(`/domains/${dom.id}`);
  log(`  ${full.status === 'verified' ? '✓' : '·'} Resend domain ${DOMAIN.apex}: ${full.status}`);
  const records = (await cf.get(`/zones/${zone.id}/dns_records?per_page=500`)) || [];
  const steps = (full.records || []).map((r) => {
    const name = r.name === '@' || r.name === DOMAIN.apex ? DOMAIN.apex : `${r.name.replace(new RegExp(`\\.${DOMAIN.apex.replace(/\./g, '\\.')}$`), '')}.${DOMAIN.apex}`;
    const want = { type: r.type, name, content: r.type === 'TXT' ? `"${unquote(r.value)}"` : r.value, ...(r.priority !== undefined ? { priority: Number(r.priority) } : {}), match: r.type === 'TXT' ? (r.record === 'DKIM' ? /^p=/ : /^v=spf1/i) : undefined };
    return { want, ...planRecord(records, want) };
  });
  const dns = await applyRecords(cf, zone, steps, { apply, log, label: 'DNS (Resend)' });
  if (apply && (dns.plan.length || full.status !== 'verified')) await rs.post(`/domains/${dom.id}/verify`);
  return { zone, domain: full, dns };
}

/* ---------- output ---------- */

function report(label, plan, apply, log) {
  if (!plan.length) return log(`  ✓ ${label}: nothing to change`);
  log(`  ${apply ? '→' : '·'} ${label}: ${apply ? 'applying' : 'would change'}:`);
  for (const p of plan) log(`      ${p}`);
}

/* ---------- command line ---------- */

export async function run(argv, { env = process.env, fetchImpl = fetch, log = console.log, cfg = defaults } = {}) {
  const flag = (name) => argv.includes(`--${name}`);
  const value = (name) => {
    const i = argv.indexOf(`--${name}`);
    return i > -1 ? argv[i + 1] || '' : '';
  };
  const what = argv.find((a) => COMMANDS.includes(a)) || 'check';
  const apply = flag('apply') && what !== 'check';
  // The domain serves the current website: nothing touches its DNS, mail or redirects before the owner's approval.
  if (apply && ['domain', 'email', 'resend'].includes(what) && !cfg.DOMAIN?.approved) {
    throw new Refusal(`${what} --apply changes ${cfg.DOMAIN?.apex || 'the domain'}, which serves the current website: the owner has not approved the cutover (DOMAIN.approved in scripts/cloudflare/project.mjs). Run it without --apply to see what it would change.`);
  }
  if (!env.CLOUDFLARE_API_TOKEN) throw new Refusal('set CLOUDFLARE_API_TOKEN (a token created in the Good Times account; never commit it)');
  const cf = cloudflareClient({ token: env.CLOUDFLARE_API_TOKEN, base: env.CLOUDFLARE_API_BASE || CF_API, fetchImpl });
  const accountId = env.CLOUDFLARE_ACCOUNT_ID || '';
  const verified = await verifyToken(cf, accountId);
  if (!verified && accountId) throw tokenRefusal(env.CLOUDFLARE_API_TOKEN, accountId);
  log(`Cloudflare token: ${verified || 'not a user token (set CLOUDFLARE_ACCOUNT_ID to verify an account token)'}`);
  const { account, proof } = await resolveAccount(cf, { match: cfg.ACCOUNT.match, accountId });
  log(`Account: ${account.name} [${account.id}], confirmed by ${proof}${apply ? '' : ' (read-only run)'}`);
  const opts = { cfg, apply, log };
  const results = {};
  if (what === 'check' || what === 'pages') {
    log('\nPages');
    results.pages = await pages(cf, account.id, opts);
  }
  if (what === 'check' || what === 'domain') {
    log('\nDomain');
    results.domain = await domain(cf, account.id, opts);
  }
  if (what === 'check' || what === 'email') {
    log('\nEmail (inbound)');
    results.email = await email(cf, account.id, { ...opts, forwardTo: value('forward-to') });
  }
  if (what === 'resend' || (what === 'check' && env.RESEND_API_KEY)) {
    log('\nEmail (sending, Resend)');
    if (!env.RESEND_API_KEY) throw new Refusal('set RESEND_API_KEY (a Good Times Resend key with Full access, for setting up the domain; never commit it)');
    const rs = resendClient({ apiKey: env.RESEND_API_KEY, base: env.RESEND_API_BASE || RESEND_API, fetchImpl });
    results.resend = await resend(cf, account.id, rs, opts);
  }
  return { account, results };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run(process.argv.slice(2)).catch((err) => {
    console.error(`\n${err.name === 'Refusal' ? 'Refused' : 'Failed'}: ${err.message}`);
    process.exitCode = err.name === 'Refusal' ? 2 : 1;
  });
}
