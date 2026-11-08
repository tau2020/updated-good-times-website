#!/usr/bin/env node
/**
 * The live enquiry pipeline, tested where it runs: a deployment of the isolated test project
 * (scripts/cloudflare/project.mjs › TEST_PROJECT), so the real Pages Functions, the Neon branch enquiry-test and
 * Resend, never mocks. Each scenario of the go-live brief is driven through the real form (Chromium, desktop and
 * Android-sized) or the real API, then checked in the database and, for every email, in Resend: accepted, to whom,
 * from whom, with which reply-to, what it says, and Resend's delivery event.
 *
 *   ENQUIRY_ACCESS_KEY=… ENQUIRY_SIGNING_SECRET=… TEST_DATABASE_URL=… RESEND_ADMIN_KEY=… \
 *   node qa/enquiry-live.mjs --base=https://test.good-times-enquiry-test.pages.dev \
 *     [--only=P,V,A,…] [--fault-email=<deployment with a broken Resend key>] [--fault-db=<deployment with a broken database URL>]
 *     [--owner-db] [--cleanup] [--commit=<sha>] [--evidence=<file.json>]
 *
 *   TEST_DATABASE_URL         the test branch, as the application's role (reads, and --cleanup)
 *   TEST_OWNER_DATABASE_URL   with --owner-db: the query-failure scenario revokes and restores gt_app's grants there
 *   RESEND_ADMIN_KEY          a key that can read emails back (Full access); used here only, never by the site
 *
 * Refuses any host but the test project's (https://*.good-times-enquiry-test.pages.dev): it creates enquiries and
 * sends email. Customers are synthetic (delivered+gt-<run>-…@resend.dev, Resend's test inbox). Nothing secret is
 * printed or written to the evidence file: references, statuses, counts and shortened ids only.
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { neon } from '@neondatabase/serverless';
import { chromium, devices } from '@playwright/test';

/* ---------- options and safety ---------- */

const argv = process.argv.slice(2);
const opt = (name, fallback = '') => {
  const hit = argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return fallback;
  return hit.includes('=') ? hit.slice(hit.indexOf('=') + 1) : 'true';
};
const refuse = (msg) => {
  console.error(`Refused: ${msg}`);
  process.exit(2);
};
const TEST_HOST = /^https:\/\/([a-z0-9-]+\.)?good-times-enquiry-test\.pages\.dev$/;
const BASE = opt('base', process.env.BASE || '').replace(/\/+$/, '');
const FAULT_EMAIL = opt('fault-email').replace(/\/+$/, '');
const FAULT_DB = opt('fault-db').replace(/\/+$/, '');
for (const [label, url] of [['--base', BASE], ['--fault-email', FAULT_EMAIL], ['--fault-db', FAULT_DB]]) {
  if (url && !TEST_HOST.test(url)) refuse(`${label} must be a deployment of the test project (https://*.good-times-enquiry-test.pages.dev): this suite creates enquiries and sends email`);
}
if (!BASE) refuse('give --base=https://test.good-times-enquiry-test.pages.dev');
const { ENQUIRY_ACCESS_KEY: KEY = '', ENQUIRY_SIGNING_SECRET: SECRET = '', TEST_DATABASE_URL: DB_URL = '', TEST_OWNER_DATABASE_URL: OWNER_URL = '', RESEND_ADMIN_KEY: RESEND_KEY = '' } = process.env;
const missing = Object.entries({ ENQUIRY_ACCESS_KEY: KEY, ENQUIRY_SIGNING_SECRET: SECRET, TEST_DATABASE_URL: DB_URL, RESEND_ADMIN_KEY: RESEND_KEY }).filter(([, v]) => !v).map(([k]) => k);
if (missing.length) refuse(`set ${missing.join(', ')}`);
if (opt('owner-db') === 'true' && !OWNER_URL) refuse('--owner-db needs TEST_OWNER_DATABASE_URL');
const ONLY = opt('only') ? new Set(opt('only').split(',').map((s) => s.trim().toUpperCase())) : null;
const RUN = Date.now().toString(36);
const EVIDENCE = opt('evidence', join(tmpdir(), `gt-enquiry-live-${RUN}.json`));
const COMMIT = opt('commit') || (() => { try { return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim(); } catch { return 'unknown'; } })();
const STAFF = 'info@goodtimesincapetown.co.za';
const SINK = 'delivered@resend.dev';
const ORIGIN = new URL(BASE).origin;
const ENV_LABEL = `cloud: ${new URL(BASE).host} (Pages Functions, Neon enquiry-test, Resend)`;

// Tokens are minted by the deployment's own code (lib/admin/auth.mjs, lib/security/signing.mjs) with its secret,
// for the checks that need one (an expired link, an old session); the sign-in itself goes through the real email.
Object.assign(process.env, { ENQUIRY_MODE: 'preview', ENQUIRY_SIGNING_SECRET: SECRET, PUBLIC_SITE_URL: BASE, ADMIN_EMAILS: STAFF });
const auth = await import('../lib/admin/auth.mjs');
const signing = await import('../lib/security/signing.mjs');

const SECRETS = [KEY, SECRET, DB_URL, OWNER_URL, RESEND_KEY].filter(Boolean);
const clean = (v) => {
  let s = typeof v === 'string' ? v : JSON.stringify(v);
  for (const x of SECRETS) s = s.split(x).join('[redacted]');
  return s.replace(/postgres(ql)?:\/\/\S+/g, '[redacted]').replace(/\bre_[A-Za-z0-9_]{6,}/g, 're_[redacted]').replace(/token=[A-Za-z0-9_.-]{20,}/g, 'token=[redacted]');
};
const short = (id) => (id ? `${String(id).slice(0, 8)}…` : '');
const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));

/* ---------- evidence ---------- */

const results = [];
const refs = {};
function record(id, scenario, expected, pass, actual, evidence = {}) {
  // pass null: only a person can settle it (an approval): reported as BLOCKED, never as a pass.
  results.push({ id, scenario, environment: ENV_LABEL, expected, actual: clean(actual), pass, evidence: JSON.parse(clean(evidence)), commit: COMMIT, at: new Date().toISOString() });
  console.log(`${pass === null ? '•' : pass ? '✓' : '✗'} ${id} ${scenario}: ${clean(actual)}`);
}
async function check(id, scenario, expected, fn) {
  try {
    const r = await fn();
    record(id, scenario, expected, Boolean(r.pass), r.actual, r.evidence);
    return r;
  } catch (err) {
    record(id, scenario, expected, false, `error: ${err.message}`);
    return { pass: false };
  }
}
const want = (s) => !ONLY || ONLY.has(s);

/* ---------- HTTP ---------- */

async function api(base, path, { method = 'GET', json, form, cookie = '', headers = {}, access = true, origin } = {}) {
  const h = { ...(access ? { 'x-gt-access': KEY } : {}), ...(cookie ? { cookie } : {}), ...headers };
  let body;
  if (json !== undefined) {
    h['content-type'] = 'application/json';
    body = typeof json === 'string' ? json : JSON.stringify(json);
  }
  if (form) {
    h['content-type'] = 'application/x-www-form-urlencoded';
    body = new URLSearchParams(form).toString();
  }
  if (method === 'POST' && origin !== null) h.origin = origin || new URL(base).origin;
  const t0 = performance.now();
  const res = await fetch(`${base}${path}`, { method, headers: h, body, redirect: 'manual' });
  const ms = Math.round(performance.now() - t0);
  const text = await res.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    /* html */
  }
  return { status: res.status, headers: res.headers, text, data, ms };
}

/**
 * The deployment allows RATE_LIMIT_PER_MINUTE (10) enquiry posts a minute from one address, and this machine is one
 * address: every post (API or browser) waits for a slot, keeping at most 9 in any minute, except the rate-limit test.
 */
const posts = [];
async function slot() {
  for (;;) {
    const now = Date.now();
    while (posts.length && now - posts[0] > 61_000) posts.shift();
    if (posts.length < 9) {
      posts.push(now);
      return;
    }
    await sleep(61_000 - (now - posts[0]) + 250);
  }
}
async function postEnquiry(base, payload, { key = idem(), headers = {} } = {}) {
  await slot();
  return api(base, '/api/enquiries', { method: 'POST', json: payload, headers: { 'idempotency-key': key, ...headers } });
}
let idemN = 0;
const idem = () => `gt-live-${RUN}-${idemN++}-${Math.random().toString(36).slice(2, 10)}`;

/* ---------- database (the test branch) ---------- */

const sql = neon(DB_URL);
const q = (text, params = []) => sql.query(text, params);
// Dates as text (the driver would turn a date into a local-midnight Date), times as instants.
const ROW = `id, reference_number, enquiry_type, status, name, email, phone, preferred_contact_method, tour_slug, preferred_date::text AS preferred_date,
  nights, adults, children, travellers, pickup_area, special_requirements, transfer_type, pickup_location, destination, pickup_date_sast,
  pickup_time_sast, return_trip, return_date_sast, return_time_sast, flight_number, suitcases, child_seats, oversized_items,
  slot_start, slot_end, return_slot_start, return_slot_end`;
const byRef = async (ref) => (await q(`SELECT ${ROW} FROM enquiries WHERE reference_number = $1`, [ref]))[0] || null;
const logsOf = (id) => q(`SELECT template, recipient, status, provider_message_id, attempts, error FROM email_log WHERE enquiry_id = $1 ORDER BY created_at, template`, [id]);
const eventsOf = (id) => q(`SELECT actor, kind, detail FROM enquiry_events WHERE enquiry_id = $1 ORDER BY at`, [id]);
async function settledLogs(id, n, timeoutMs = 20_000) {
  const until = Date.now() + timeoutMs;
  let rows = [];
  while (Date.now() < until) {
    rows = await logsOf(id);
    if (rows.length >= n && rows.every((r) => r.status !== 'queued')) return rows;
    await sleep(1000);
  }
  return rows;
}

/* ---------- Resend (reading back what the site sent) ---------- */

let lastResend = 0;
async function rs(path) {
  for (let tries = 0; tries < 5; tries++) {
    const wait = lastResend + 250 - Date.now();
    if (wait > 0) await sleep(wait);
    lastResend = Date.now();
    const res = await fetch(`https://api.resend.com${path}`, { headers: { Authorization: `Bearer ${RESEND_KEY}` } });
    if (res.status === 429) {
      await sleep(1500);
      continue;
    }
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`Resend GET ${path.replace(/[0-9a-f-]{36}/, '…')}: ${res.status} ${j.message || ''}`);
    return j;
  }
  throw new Error('Resend kept answering 429');
}
/** The email as Resend has it, once its delivery event is final (or after the timeout). */
async function resendEmail(id, { timeoutMs = 45_000 } = {}) {
  const until = Date.now() + timeoutMs;
  let e;
  for (;;) {
    e = await rs(`/emails/${id}`);
    if (['delivered', 'bounced', 'complained', 'failed', 'suppressed'].includes(e.last_event) || Date.now() > until) return e;
    await sleep(2500);
  }
}
const asList = (v) => (Array.isArray(v) ? v : v ? [v] : []);
const linksIn = (html) => [...new Set([...String(html).matchAll(/href="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, '&')))];
const leaks = (s) => SECRETS.some((x) => String(s).includes(x)) || /\bre_[A-Za-z0-9_]{12,}|postgres(ql)?:\/\/|neon\.tech/.test(String(s));

/** Check one logged email in Resend: recipient, sender, reply-to, subject, both bodies, no secrets, delivery. */
async function verifyEmail(row, { to, replyTo, subject, contains = [], notContains = [] }) {
  const e = await resendEmail(row.provider_message_id);
  const html = String(e.html || '');
  const text = String(e.text || '');
  const problems = [];
  if (!asList(e.to).map((a) => a.toLowerCase()).includes(to.toLowerCase())) problems.push(`to ${JSON.stringify(e.to)}`);
  if (replyTo && !asList(e.reply_to).map((a) => a.toLowerCase()).includes(replyTo.toLowerCase())) problems.push(`reply_to ${JSON.stringify(e.reply_to)}`);
  if (subject && !subject.test(e.subject || '')) problems.push(`subject "${e.subject}"`);
  for (const c of contains) if (!html.includes(c) || !text.includes(c)) problems.push(`missing "${c}" in ${html.includes(c) ? 'text' : 'html'}`);
  for (const c of notContains) if (html.includes(c) || text.includes(c)) problems.push(`contains "${c}"`);
  if (leaks(html + text + e.subject)) problems.push('a secret or connection string in the email');
  if (e.last_event !== 'delivered') problems.push(`last_event ${e.last_event}`);
  return { ok: !problems.length, problems, e, html, text, summary: { id: short(e.id), to: asList(e.to), from: e.from, reply_to: asList(e.reply_to), subject: e.subject, last_event: e.last_event, html_bytes: html.length, text_bytes: text.length } };
}

/* ---------- staff ---------- */

/** A staff session minted with the deployment's secret (the real sign-in is scenario G). */
function mintedStaff(email = STAFF, { now = Date.now() } = {}) {
  const token = auth.sessionToken(email, { now });
  return { cookie: `${auth.SESSION_COOKIE}=${token}`, form: auth.formToken({ token }) };
}
const adminGet = (base, path, s) => api(base, path, { cookie: s.cookie });
const adminPost = (base, path, form, s, opts = {}) => api(base, path, { method: 'POST', cookie: s.cookie, form: { form: s.form, ...form }, ...opts });

/* ---------- synthetic requests ---------- */

const customer = (tag) => ({ email: `delivered+gt-${RUN}-${tag}@resend.dev`, name: `Synthetic Tester ${tag.toUpperCase()} (${RUN})` });
const contact = (tag, extra = {}) => ({
  ...customer(tag),
  phone: '+27 82 555 0100',
  preferred_contact_method: 'email',
  country: 'South Africa',
  consent: true,
  terms: true,
  elapsed_ms: 45_000,
  gt_hp_check: '',
  page_url: `${BASE}/enquire/`,
  ...extra,
});
const tour = (tag, date, extra = {}) => ({ enquiry_type: 'tour', tour_slug: 'cape-peninsula-private-tour', preferred_date: date, dates_flexible: false, flexible_dates: '', adults: 2, children: 0, children_ages: '', pickup_area: 'Synthetic test hotel, Sea Point', special_requests: `Synthetic test enquiry ${RUN}; please ignore.`, ...contact(tag), ...extra });
const transfer = (tag, date, time, extra = {}) => ({
  enquiry_type: 'transfer',
  transfer_type: 'airport-arrival',
  pickup_location: 'Cape Town International Airport (CPT)',
  destination: 'Synthetic test address, Camps Bay',
  transfer_date: date,
  transfer_time: time,
  flight_number: 'BA59',
  adults: 2,
  children: 0,
  child_seats: '',
  suitcases: 2,
  oversized_items: '',
  return_trip: false,
  notes: `Synthetic test transfer ${RUN}; please ignore.`,
  ...contact(tag, { preferred_contact_method: 'whatsapp' }),
  ...extra,
});

/** Free Cape Town dates (no day full), far enough ahead to stay clear of anything real, never reused in a run. */
const taken = new Set();
const monthCache = new Map();
const dayAfter = (iso, n) => new Date(Date.parse(`${iso}T12:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
async function freeDate(days = 1, from = dayAfter(new Date().toISOString().slice(0, 10), 150 + (parseInt(RUN.slice(-3), 36) % 60))) {
  const full = async (date) => {
    const month = date.slice(0, 7);
    if (!monthCache.has(month)) {
      const r = await api(BASE, `/api/availability?month=${month}`);
      monthCache.set(month, new Set([...(r.data?.full || []), ...(r.data?.closed || [])]));
    }
    return monthCache.get(month).has(date) || taken.has(date);
  };
  let start = from;
  for (let i = 0; i < 400; i++) {
    let clash = -1;
    for (let k = 0; k < days && clash < 0; k++) if (await full(dayAfter(start, k))) clash = k;
    if (clash < 0) {
      for (let k = 0; k < days; k++) taken.add(dayAfter(start, k));
      return start;
    }
    start = dayAfter(start, clash + 1);
  }
  throw new Error('no free dates');
}

/* ---------- the browser ---------- */

let browser;
async function context(device = 'desktop') {
  browser ??= await chromium.launch();
  const use = device === 'android' ? { ...devices['Pixel 7'] } : { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } };
  const ctx = await browser.newContext({ ...use, baseURL: BASE });
  // The test deployment's door, for its own host only (never sent to another site).
  await ctx.addCookies([{ name: 'gt_access', value: KEY, domain: new URL(BASE).hostname, path: '/', secure: true, httpOnly: true, sameSite: 'Strict' }]);
  return ctx;
}
const step = (page, id, path) => page.locator(`[data-wizard-step="${id}"]${path ? `[data-path="${path}"]` : ''}`);
async function openForm(page, query) {
  await page.goto(`/enquire/${query}${query.includes('?') ? '&' : '?'}nomotion`);
  await page.waitForSelector('.wizard.is-ready');
  return Date.now();
}
async function fillContact(page, tag, method = 'email') {
  const c = step(page, 'contact');
  await c.waitFor({ state: 'visible' });
  const { name, email } = customer(tag);
  await c.locator('[name="name"]').fill(name);
  await c.locator('[name="email"]').fill(email);
  await c.locator('[name="phone"]').fill('+27 82 555 0100');
  await c.locator('[name="country"]').fill('South Africa').catch(() => {});
  await c.locator(`[name="preferred_contact_method"][value="${method}"]`).check();
  await c.locator('[name="consent"]').check();
  await c.locator('[name="terms"]').check();
  await c.locator('[data-next]').click();
  await step(page, 'review').waitFor({ state: 'visible' });
}
/** Press Send on the review step (after the form's 3-second human pause) and read the API's answer and the page's. */
async function send(page, openedAt, { tap = false, presses = 1 } = {}) {
  const wait = openedAt + 3500 - Date.now();
  if (wait > 0) await page.waitForTimeout(wait);
  await slot();
  const submit = step(page, 'review').locator('[data-submit]');
  const requests = [];
  page.on('request', (r) => r.url().endsWith('/api/enquiries') && r.method() === 'POST' && requests.push(r));
  const response = page.waitForResponse((r) => r.url().endsWith('/api/enquiries') && r.request().method() === 'POST');
  for (let i = 0; i < presses; i++) await (tap ? submit.tap({ force: i > 0 }) : submit.click({ force: i > 0 })).catch(() => {});
  const res = await response;
  const body = await res.json().catch(() => ({}));
  const ok = page.locator('[data-result="success"]');
  await ok.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
  const shown = (await ok.locator('[data-ref]').textContent().catch(() => '')).trim();
  const sentence = await ok.textContent().catch(() => '');
  await page.waitForTimeout(1500);
  return { status: res.status(), body, shown, notConfirmed: sentence.includes('Enquiry received; your booking is not yet confirmed.'), posts: requests.length };
}

/* ---------- shared verification of a stored enquiry and its two emails ---------- */

async function verifyNew(id, scenario, ref, tag, { expect: fields = {}, teamContains = [], ackContains = [] }) {
  const row = await byRef(ref);
  await check(`${id}-db`, scenario, 'exactly one enquiry with this reference, every field as sent, status NEW', async () => {
    const rows = await q(`SELECT count(*)::int AS n FROM enquiries WHERE email = $1`, [customer(tag).email]);
    const wrong = Object.entries(fields).filter(([k, v]) => String(row?.[k] ?? '') !== String(v)).map(([k, v]) => `${k}=${JSON.stringify(row?.[k])} (sent ${JSON.stringify(v)})`);
    return { pass: row && rows[0].n === 1 && row.status === 'NEW' && !wrong.length, actual: row ? `${rows[0].n} row, ${row.status}${wrong.length ? `; ${wrong.join(', ')}` : ', fields match'}` : 'not stored', evidence: { reference: ref, id: short(row?.id), checked: Object.keys(fields) } };
  });
  if (!row) return null;
  await check(`${id}-events`, scenario, 'history: created by the website, terms acceptance recorded', async () => {
    const ev = await eventsOf(row.id);
    const kinds = ev.map((e) => e.kind);
    return { pass: kinds.includes('created') && kinds.includes('terms'), actual: kinds.join(', '), evidence: { events: ev.map((e) => `${e.actor}: ${e.kind}`) } };
  });
  const logs = await settledLogs(row.id, 2);
  await check(`${id}-log`, scenario, 'email_log: the team notification and the acknowledgement, both sent, each with a provider message id', async () => {
    const ok = logs.length === 2 && logs.every((l) => l.status === 'sent' && l.provider_message_id && l.attempts === 1);
    return { pass: ok, actual: logs.map((l) => `${l.template} ${l.status} → ${l.recipient} (${short(l.provider_message_id)})`).join('; '), evidence: { rows: logs.map((l) => ({ template: l.template, status: l.status, recipient: l.recipient, attempts: l.attempts, provider_message_id: short(l.provider_message_id) })) } };
  });
  const team = logs.find((l) => l.template === 'new-enquiry-internal');
  const ack = logs.find((l) => l.template === 'enquiry-received');
  if (team?.provider_message_id) {
    await check(`${id}-team-email`, scenario, `Email A in Resend: to the team inbox (routed to ${SINK} until the domain verifies), reply-to the customer, reference, details, dashboard and signed status links; delivered`, async () => {
      const v = await verifyEmail(team, { to: SINK, replyTo: customer(tag).email, subject: new RegExp(ref), contains: [ref, customer(tag).name, ...teamContains] });
      const links = linksIn(v.html);
      const dash = links.some((l) => l === `${BASE}/admin/bookings/${row.id}`);
      const status = links.filter((l) => l.startsWith(`${BASE}/api/enquiries/${row.id}/status?token=`)).length;
      if (!dash) v.problems.push('no dashboard link');
      if (status < 3) v.problems.push(`${status} status links`);
      return { pass: v.problems.length === 0, actual: v.problems.length ? v.problems.join('; ') : `${v.summary.subject} · ${v.summary.last_event} · dashboard link, ${status} status links`, evidence: v.summary };
    });
  }
  if (ack?.provider_message_id) {
    await check(`${id}-ack-email`, scenario, 'Email B in Resend: to the customer, reply-to the team inbox, reference, summary, plainly not yet confirmed; delivered', async () => {
      const v = await verifyEmail(ack, { to: customer(tag).email, replyTo: STAFF, subject: /received, not yet confirmed/, contains: [ref, ...ackContains] });
      // The template's own sentence (lib/email/templates/enquiry-received.mjs), in both bodies.
      if (!/This is not yet a confirmed booking\./.test(v.text) || !/This is not yet a confirmed booking\./.test(v.html)) v.problems.push('no “This is not yet a confirmed booking.”');
      if (/payment (received|taken)|booking is confirmed/i.test(v.text)) v.problems.push('implies payment or confirmation');
      return { pass: v.problems.length === 0, actual: v.problems.length ? v.problems.join('; ') : `${v.summary.subject} · ${v.summary.last_event}`, evidence: v.summary };
    });
  }
  return row;
}

/* ======================================================================== */

console.log(`Live enquiry pipeline · ${BASE} · run ${RUN} · commit ${COMMIT}`);
const staff = mintedStaff();

/* ---------- P: the deployment and its door ---------- */
if (want('P')) {
  await check('P1', 'Preflight', 'health answers live; the database check passes from the Functions runtime', async () => {
    const h = await api(BASE, '/api/health', { access: false });
    const d = await api(BASE, '/api/health?check=db', { access: false });
    return { pass: h.data?.enquiries === 'live' && d.data?.database === 'ok', actual: `health ${h.status} ${h.data?.enquiries}; db ${d.status} ${d.data?.database} (${d.ms} ms)` };
  });
  await check('P2', 'Preflight: access restriction', 'without the access key (or with a wrong one) the enquiry, availability and dashboard routes answer 403 and store nothing', async () => {
    const before = (await q('SELECT count(*)::int AS n FROM enquiries'))[0].n;
    const a = await api(BASE, '/api/enquiries', { method: 'POST', json: tour('p2', '2030-01-01'), access: false });
    const b = await api(BASE, '/api/enquiries', { method: 'POST', json: {}, headers: { 'x-gt-access': 'wrong-key-wrong-key-wrong-key-wrong' }, access: false });
    const c = await api(BASE, '/admin/', { access: false });
    const d = await api(BASE, '/api/availability?month=2027-01', { access: false });
    const after = (await q('SELECT count(*)::int AS n FROM enquiries'))[0].n;
    return { pass: [a, b, c, d].every((r) => r.status === 403) && a.data?.code === 'restricted' && before === after, actual: `${a.status}, ${b.status}, ${c.status}, ${d.status}; rows ${before} → ${after}` };
  });
  await check('P3', 'Preflight: not indexable, not production', 'pages carry noindex (header and meta); the project’s production address has no deployment', async () => {
    const page = await api(BASE, '/enquire/', { access: false });
    const prod = await fetch('https://good-times-enquiry-test.pages.dev/', { redirect: 'manual' });
    const meta = /<meta name="robots" content="noindex,nofollow">/.test(page.text);
    return { pass: /noindex/.test(page.headers.get('x-robots-tag') || '') && meta && prod.status === 404, actual: `X-Robots-Tag "${page.headers.get('x-robots-tag')}", meta ${meta}, production address ${prod.status}` };
  });
}

/* ---------- V: the API refuses what it must (Phase Six) ---------- */
if (want('V')) {
  const date = await freeDate();
  const bad = [
    ['V1', 'missing required fields', { enquiry_type: 'tour', ...contact('v1'), name: '', email: '' }, 400, (r) => r.data?.errors?.name && r.data?.errors?.email],
    ['V2', 'invalid email', tour('v2', date, { email: 'not-an-address' }), 400, (r) => r.data?.errors?.email],
    ['V3', 'invalid service choice', { ...tour('v3', date), enquiry_type: 'helicopter' }, 400, (r) => r.data?.errors?.enquiry_type],
    ['V4', 'malformed date', tour('v4', '2027-13-45'), 400, (r) => r.data?.errors?.preferred_date],
    ['V5', 'unsupported tour', tour('v5', date, { tour_slug: 'moon-landing-tour' }), 400, (r) => r.data?.errors?.tour_slug],
    ['V6', 'date inside the 48 hours’ notice', tour('v6', new Date().toISOString().slice(0, 10)), 400, (r) => r.data?.errors?.preferred_date],
    ['V7', 'invalid JSON', '{"enquiry_type": "tour", ', 400, () => true],
    ['V8', 'oversized payload (40 KB)', tour('v8', date, { special_requests: 'x'.repeat(40_000) }), 413, () => true],
  ];
  for (const [id, what, payload, status, extra] of bad) {
    await check(id, `API: ${what}`, `HTTP ${status}, a clear error, nothing stored, nothing emailed`, async () => {
      const r = await postEnquiry(BASE, payload);
      const stored = (await q(`SELECT count(*)::int AS n FROM enquiries WHERE email = $1`, [customer(id.toLowerCase()).email]))[0].n;
      return { pass: r.status === status && extra(r) && stored === 0 && !r.data?.reference, actual: `${r.status} ${clean(r.data?.error || r.text.slice(0, 80))}${r.data?.errors ? ` [${Object.keys(r.data.errors).join(', ')}]` : ''}; stored ${stored}` };
    });
  }
  for (const [id, what, payload] of [
    ['V9', 'honeypot filled', tour('v9', date, { gt_hp_check: 'https://spam.example' })],
    ['V10', 'sent faster than a person could (1 s)', tour('v10', date, { elapsed_ms: 1000 })],
  ]) {
    await check(id, `API: ${what}`, 'a bland 200 with no reference (bots learn nothing); nothing stored or emailed', async () => {
      const r = await postEnquiry(BASE, payload);
      const stored = (await q(`SELECT count(*)::int AS n FROM enquiries WHERE email = $1`, [customer(id.toLowerCase()).email]))[0].n;
      return { pass: r.status === 200 && r.data?.ok === true && !r.data?.reference && stored === 0, actual: `${r.status} ${JSON.stringify(r.data)}; stored ${stored}` };
    });
  }
  await check('V11', 'API: methods and routes', 'GET on the intake is 405 with Allow; an unknown API route is 404; responses carry no stack trace', async () => {
    const g = await api(BASE, '/api/enquiries');
    const n = await api(BASE, '/api/nothing-here');
    return { pass: g.status === 405 && /POST/.test(g.headers.get('allow') || '') && n.status === 404 && !/at .*\.m?js:\d+/.test(g.text + n.text), actual: `${g.status} Allow: ${g.headers.get('allow')}; ${n.status}` };
  });
}

/* ---------- A, B, C: the three journeys through the real form (desktop browser) ---------- */
if (want('A')) {
  const date = await freeDate();
  const ctx = await context('desktop');
  const page = await ctx.newPage();
  const opened = await openForm(page, '?type=tour&tour=cape-peninsula-private-tour');
  const t = step(page, 'details', 'tour');
  await t.locator('[name="preferred_date"]').fill(date);
  await t.locator('[name="adults"]').fill('2');
  await t.locator('[name="pickup_area"]').fill('Synthetic test hotel, Sea Point');
  await t.locator('[name="special_requests"]').fill(`Synthetic test enquiry ${RUN}; please ignore.`);
  await t.locator('[data-next]').click();
  await fillContact(page, 'a');
  const r = await send(page, opened);
  refs.A = r.body.reference;
  await check('A1', 'A Private tour (browser)', '201 from the real form; the page shows the same GT reference and says it is not yet confirmed', async () => ({
    pass: r.status === 201 && /^GT-[A-Z0-9]{6}$/.test(r.body.reference || '') && r.shown === r.body.reference && r.notConfirmed && r.body.emailed === true,
    actual: `${r.status} ${r.body.reference} shown "${r.shown}" emailed ${r.body.emailed}`,
  }));
  if (refs.A) {
    await verifyNew('A', 'A Private tour', refs.A, 'a', { expect: { enquiry_type: 'tour', tour_slug: 'cape-peninsula-private-tour', preferred_date: date, adults: 2, children: 0, travellers: 2, pickup_area: 'Synthetic test hotel, Sea Point' }, teamContains: ['Cape Peninsula'], ackContains: ['Cape Peninsula'] });
    await check('A2', 'A Private tour: availability applied', 'the request holds its whole date (a vehicle) in Cape Town time', async () => {
      const row = await byRef(refs.A);
      const s = new Date(row.slot_start).toISOString();
      const hours = (new Date(row.slot_end) - new Date(row.slot_start)) / 3600e3;
      return { pass: hours === 24 && s === new Date(`${date}T00:00:00+02:00`).toISOString(), actual: `${s} + ${hours} h` };
    });
  }
  await ctx.close();
}

if (want('B')) {
  const date = await freeDate();
  const back = dayAfter(date, 7);
  taken.add(back);
  const ctx = await context('desktop');
  const page = await ctx.newPage();
  const opened = await openForm(page, '?type=transfer&transfer=airport-arrival');
  const t = step(page, 'details', 'transfer');
  await t.locator('[name="destination"]').fill('Synthetic test address, Camps Bay');
  await t.locator('[name="transfer_date"]').fill(date);
  await t.locator('[name="transfer_time"]').fill('14:30');
  await t.locator('[name="flight_number"]').fill('ba 59');
  await t.locator('[name="adults"]').fill('2');
  await t.locator('[name="children"]').fill('1');
  await t.locator('[name="child_seats"]').fill('One booster seat, age 5');
  await t.locator('[name="suitcases"]').fill('3');
  await t.locator('[name="oversized_items"]').fill('1 golf bag');
  await t.locator('[name="return_trip"]').check();
  await t.locator('[name="return_date"]').fill(back);
  await t.locator('[name="return_time"]').fill('09:00');
  await t.locator('[name="notes"]').fill(`Synthetic test transfer ${RUN}; please ignore.`);
  await t.locator('[data-next]').click();
  await fillContact(page, 'b', 'whatsapp');
  const r = await send(page, opened);
  refs.B = r.body.reference;
  await check('B1', 'B Airport transfer (browser)', '201 from the real form, reference shown', async () => ({ pass: r.status === 201 && r.shown === r.body.reference && r.notConfirmed, actual: `${r.status} ${r.body.reference} (${r.body.enquiry_type})` }));
  if (refs.B) {
    const row = await verifyNew('B', 'B Airport transfer', refs.B, 'b', {
      expect: { enquiry_type: 'transfer', transfer_type: 'airport-arrival', destination: 'Synthetic test address, Camps Bay', pickup_date_sast: date, pickup_time_sast: '14:30', return_trip: true, return_date_sast: back, return_time_sast: '09:00', adults: 2, children: 1, travellers: 3, suitcases: 3, child_seats: 'One booster seat, age 5', oversized_items: '1 golf bag', preferred_contact_method: 'whatsapp' },
      teamContains: ['14:30'],
    });
    await check('B2', 'B Airport transfer: transfer-specific fields', 'arrival type, the flight number normalised, pickup and return held for 2 hours each', async () => {
      const holds = [(new Date(row.slot_end) - new Date(row.slot_start)) / 60e3, (new Date(row.return_slot_end) - new Date(row.return_slot_start)) / 60e3];
      return { pass: /^BA ?59$/.test(row.flight_number) && holds.every((m) => m === 120), actual: `flight ${row.flight_number}, holds ${holds.join(' + ')} min, pickup ${row.pickup_location}` };
    });
    await check('B3', 'B Airport transfer: dashboard', 'the dashboard detail shows the type, date and time, flight, travellers, luggage and return', async () => {
      const d = await adminGet(BASE, `/admin/bookings/${row.id}`, staff);
      const need = [refs.B, '14:30', '09:00', row.flight_number, 'golf bag', 'booster'];
      const miss = need.filter((x) => !d.text.includes(x));
      return { pass: d.status === 200 && !miss.length, actual: `${d.status}${miss.length ? `; missing ${miss.join(', ')}` : '; all shown'}` };
    });
  }
  await ctx.close();
}

if (want('C')) {
  const nights = 4;
  const date = await freeDate(nights + 1);
  const ctx = await context('desktop');
  const page = await ctx.newPage();
  const opened = await openForm(page, `?type=tour&tour=garden-route-private-tour&nights=${nights}`);
  const t = step(page, 'details', 'tour');
  await t.locator('[name="preferred_date"]').fill(date);
  await t.locator('[name="pickup_area"]').fill('Synthetic test hotel, Cape Town CBD');
  await t.locator('[data-next]').click();
  await fillContact(page, 'c');
  const r = await send(page, opened);
  refs.C = r.body.reference;
  await check('C1', 'C Garden Route multi-day (browser)', '201 from the real form for the package with its nights', async () => ({ pass: r.status === 201 && r.shown === r.body.reference, actual: `${r.status} ${r.body.reference}` }));
  if (refs.C) {
    const row = await verifyNew('C', 'C Garden Route', refs.C, 'c', { expect: { tour_slug: 'garden-route-private-tour', preferred_date: date, nights }, ackContains: ['Garden Route'] });
    await check('C2', 'C Garden Route: duration', `the package holds a vehicle for its ${nights} nights plus one day`, async () => {
      const days = (new Date(row.slot_end) - new Date(row.slot_start)) / 864e5;
      return { pass: days === nights + 1, actual: `${days} days from ${date}` };
    });
  }
  await ctx.close();
}

/* ---------- D: the same request twice ---------- */
if (want('D')) {
  const date = await freeDate();
  const payload = tour('d', date, { tour_slug: 'cape-town-city-private-tour' });
  const key = idem();
  const first = await postEnquiry(BASE, payload, { key });
  const again = await postEnquiry(BASE, payload, { key });
  const sameContent = await postEnquiry(BASE, payload, { key: idem() });
  refs.D = first.data?.reference;
  await check('D1', 'D Duplicate submission', 'a browser retry (same idempotency key) answers 409 with the first reference; the same request under a new key within 10 minutes answers 409 too; one enquiry, one pair of emails', async () => {
    const row = await byRef(refs.D);
    const n = (await q(`SELECT count(*)::int AS n FROM enquiries WHERE email = $1`, [customer('d').email]))[0].n;
    const logs = row ? await settledLogs(row.id, 2) : [];
    await sleep(3000);
    const logsLater = row ? await logsOf(row.id) : [];
    return {
      pass: first.status === 201 && again.status === 409 && again.data?.code === 'duplicate_submission' && again.data?.reference === refs.D && sameContent.status === 409 && sameContent.data?.code === 'duplicate_content' && n === 1 && logsLater.length === 2 && logs.every((l) => l.status === 'sent'),
      actual: `${first.status} ${refs.D} in ${first.ms} ms; retry ${again.status} ${again.data?.code} ${again.data?.reference} in ${again.ms} ms; same content ${sameContent.status} ${sameContent.data?.code}; rows ${n}; emails ${logsLater.length}`,
    };
  });
}

/* ---------- E: an email outage, then the retry ---------- */
if (want('E')) {
  if (!FAULT_EMAIL) record('E0', 'E Email failure', 'a deployment with a broken Resend key (--fault-email)', false, 'skipped: no --fault-email deployment given');
  else {
    const date = await freeDate();
    const r = await postEnquiry(FAULT_EMAIL, tour('e', date, { tour_slug: 'cape-winelands-private-tour' }));
    refs.E = r.data?.reference;
    const row = refs.E ? await byRef(refs.E) : null;
    await check('E1', 'E Email failure: the request is kept', 'with Resend refusing the key: 201 with emailed:false and a reference; the enquiry is stored; both emails logged as failed with the provider’s error', async () => {
      const logs = row ? await settledLogs(row.id, 2) : [];
      return { pass: r.status === 201 && r.data?.emailed === false && row && logs.length === 2 && logs.every((l) => l.status === 'failed' && /Resend responded 4\d\d/.test(l.error || '')), actual: `${r.status} ${refs.E} emailed ${r.data?.emailed}; logs ${logs.map((l) => `${l.template} ${l.status}: ${clean(l.error || '').slice(0, 60)}`).join('; ')}` };
    });
    await check('E1b', 'E Email failure: visible to staff', 'the bookings list says how many emails failed and marks the request “Email failed”', async () => {
      const list = await adminGet(BASE, '/admin/?view=all', staff);
      const at = list.text.indexOf(refs.E);
      const rowHtml = at >= 0 ? list.text.slice(at, list.text.indexOf('</tr>', at)) : '';
      const line = (/(\d+ emails? failed to send[^<]*)/.exec(list.text) || [])[1] || '';
      return { pass: /Email failed/.test(rowHtml) && Boolean(line), actual: `row mark ${/Email failed/.test(rowHtml)}; “${line}”` };
    });
    // A booking confirmed and then cancelled while email was down: the late confirmation must never go out.
    const date2 = await freeDate();
    const r2 = await postEnquiry(FAULT_EMAIL, tour('e2', date2, { tour_slug: 'township-private-tour' }));
    const row2 = r2.data?.reference ? await byRef(r2.data.reference) : null;
    if (row2) {
      const fs = mintedStaff();
      await adminPost(FAULT_EMAIL, `/admin/bookings/${row2.id}/status`, { status: 'CONFIRMED', notify: 'on' }, fs, { origin: new URL(FAULT_EMAIL).origin });
      await adminPost(FAULT_EMAIL, `/admin/bookings/${row2.id}/status`, { status: 'CANCELLED', notify: 'on' }, fs, { origin: new URL(FAULT_EMAIL).origin });
    }
    await check('E2', 'E Email failure: the retry', 'after the provider is restored, the dashboard’s “Retry emails that failed” sends them: same rows, now sent with message ids, attempts 2; no new enquiry; the obsolete confirmation is superseded, the cancellation sent', async () => {
      const retry = await adminPost(BASE, '/admin/emails/retry', {}, staff);
      const logs = row ? await logsOf(row.id) : [];
      const logs2 = row2 ? await logsOf(row2.id) : [];
      const n = (await q(`SELECT count(*)::int AS n FROM enquiries WHERE email IN ($1, $2)`, [customer('e').email, customer('e2').email]))[0].n;
      const confirmed = logs2.find((l) => l.template === 'booking-confirmed');
      const cancelled = logs2.find((l) => l.template === 'booking-cancelled');
      const ok = retry.status === 303 && /m=retried\.\d+\.\d+/.test(retry.headers.get('location') || '') && logs.length === 2 && logs.every((l) => l.status === 'sent' && l.attempts === 2 && l.provider_message_id) && n === 2 && confirmed?.status === 'failed' && /superseded/.test(confirmed?.error || '') && cancelled?.status === 'sent';
      return { pass: ok, actual: `retry → ${retry.headers.get('location')}; first: ${logs.map((l) => `${l.template} ${l.status} ×${l.attempts}`).join(', ')}; second: ${logs2.map((l) => `${l.template} ${l.status}${l.error ? ` (${clean(l.error).slice(0, 50)})` : ''}`).join(', ')}; enquiries ${n}` };
    });
    await check('E2b', 'E Email failure: cleared after the retry', 'once resent, the request loses its “Email failed” mark', async () => {
      const list = await adminGet(BASE, '/admin/?view=all', staff);
      const at = list.text.indexOf(refs.E);
      const rowHtml = at >= 0 ? list.text.slice(at, list.text.indexOf('</tr>', at)) : '';
      return { pass: at >= 0 && !/Email failed/.test(rowHtml), actual: `mark ${/Email failed/.test(rowHtml) ? 'still shown' : 'gone'}` };
    });
    if (row) {
      const logs = await logsOf(row.id);
      const ack = logs.find((l) => l.template === 'enquiry-received');
      if (ack?.provider_message_id) {
        await check('E3', 'E Email failure: the retried email', 'the retried acknowledgement reaches Resend’s inbox with the original reference', async () => {
          const v = await verifyEmail(ack, { to: customer('e').email, contains: [refs.E] });
          return { pass: v.ok, actual: v.ok ? `${v.summary.subject} · ${v.summary.last_event}` : v.problems.join('; '), evidence: v.summary };
        });
      }
    }
  }
}

/* ---------- F: the database fails ---------- */
if (want('F')) {
  const checkNothingStored = async (tag) => (await q(`SELECT count(*)::int AS n FROM enquiries WHERE email = $1`, [customer(tag).email]))[0].n;
  const safe = (r) => !r.data?.reference && !/postgres|neon|password|stack|at .*\.m?js:\d+|SELECT|INSERT/i.test(r.text);
  if (!FAULT_DB) record('F0', 'F Database failure (connection)', 'a deployment whose database credentials are wrong (--fault-db)', false, 'skipped: no --fault-db deployment given');
  else {
    const date = await freeDate();
    await check('F1', 'F Database failure: cannot connect', 'the API answers an error (no false success, no invented reference, no diagnostics); health reports the database; nothing is stored', async () => {
      const r = await postEnquiry(FAULT_DB, tour('f1', date));
      const h = await api(FAULT_DB, '/api/health?check=db', { access: false });
      const stored = await checkNothingStored('f1');
      return { pass: r.status >= 500 && r.data?.ok === false && safe(r) && h.status === 503 && h.data?.database === 'error' && stored === 0, actual: `${r.status} "${r.data?.error}"; health ${h.status} ${h.data?.database}; stored ${stored}` };
    });
    await check('F2', 'F Database failure: the dashboard', 'the dashboard shows a plain error page, not a stack trace or a false empty list', async () => {
      const fs = mintedStaff();
      const r = await adminGet(FAULT_DB, '/admin/', fs);
      return { pass: r.status >= 500 && safe(r), actual: `${r.status} ${clean(r.data?.error || r.text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 90))}` };
    });
  }
  if (opt('owner-db') === 'true') {
    const owner = neon(OWNER_URL);
    const date = await freeDate();
    // Mid-pipeline: the rate limit and the duplicate checks still work, the insert is refused.
    await owner.query('REVOKE INSERT ON enquiries FROM gt_app');
    let r;
    try {
      r = await postEnquiry(BASE, tour('f3', date));
    } finally {
      await owner.query('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO gt_app');
    }
    await check('F3', 'F Database failure: the insert is refused', 'an error answer with no reference; no row, no email; the next request works again', async () => {
      const stored = await checkNothingStored('f3');
      const emails = (await q(`SELECT count(*)::int AS n FROM email_log WHERE recipient = $1`, [customer('f3').email]))[0].n;
      const h = await api(BASE, '/api/health?check=db', { access: false });
      return { pass: r.status >= 500 && safe(r) && stored === 0 && emails === 0 && h.data?.database === 'ok', actual: `${r.status} "${r.data?.error}"; stored ${stored}; emails ${emails}; afterwards ${h.data?.database}` };
    });
    // After the insert: the email log cannot be written. The enquiry must survive and the failure must be visible.
    const date2 = await freeDate();
    await owner.query('REVOKE INSERT ON email_log FROM gt_app');
    let r2;
    try {
      r2 = await postEnquiry(BASE, tour('f4', date2));
    } finally {
      await owner.query('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO gt_app');
    }
    await check('F4', 'F Database failure: the email log cannot be written', 'the stored enquiry is kept and the answer says the emails were not sent (emailed:false), never a false “emailed”', async () => {
      const row = r2.data?.reference ? await byRef(r2.data.reference) : null;
      const emails = row ? (await logsOf(row.id)).length : -1;
      return { pass: r2.status === 201 && r2.data?.emailed === false && Boolean(row), actual: `${r2.status} ${r2.data?.reference} emailed ${r2.data?.emailed}; stored ${Boolean(row)}; email_log rows ${emails}` };
    });
    await check('F5', 'F Database failure: the unannounced request is visible', 'the bookings list marks it “No email sent” and its page tells staff to contact the customer', async () => {
      const row = r2.data?.reference ? await byRef(r2.data.reference) : null;
      if (!row) return { pass: false, actual: 'no request' };
      const list = await adminGet(BASE, '/admin/?view=all', staff);
      const at = list.text.indexOf(r2.data.reference);
      const rowHtml = at >= 0 ? list.text.slice(at, list.text.indexOf('</tr>', at)) : '';
      const page = await adminGet(BASE, `/admin/bookings/${row.id}`, staff);
      return { pass: /No email sent/.test(rowHtml) && /No email was sent for this request/.test(page.text), actual: `list mark ${/No email sent/.test(rowHtml)}; page warning ${/No email was sent for this request/.test(page.text)}` };
    });
  }
}

/* ---------- X + G: the acceptance journey with a real staff sign-in, then the dashboard's defences ---------- */
let signInToken = '';
if (want('X') || want('G')) {
  const date = await freeDate();
  const cust = await context('desktop');
  const page = await cust.newPage();
  const opened = await openForm(page, '?type=tour&tour=cape-winelands-private-tour');
  const t = step(page, 'details', 'tour');
  await t.locator('[name="preferred_date"]').fill(date);
  await t.locator('[name="pickup_area"]').fill('Synthetic test guest house, Gardens');
  await t.locator('[data-next]').click();
  await fillContact(page, 'x');
  const r = await send(page, opened);
  refs.X = r.body.reference;
  await check('X1', 'Acceptance: the customer submits', 'the real enquiry page takes the request and shows a unique reference', async () => ({ pass: r.status === 201 && r.shown === refs.X, actual: `${r.status} ${refs.X}` }));
  await cust.close();
  const row = refs.X ? await verifyNew('X', 'Acceptance', refs.X, 'x', { expect: { tour_slug: 'cape-winelands-private-tour', preferred_date: date }, ackContains: ['Winelands'] }) : null;

  // The staff member asks for a link in a browser and opens it from the email Resend holds.
  const sctx = await context('desktop');
  const sp = await sctx.newPage();
  await sp.goto('/admin/');
  const seen = new Set(((await rs('/emails?limit=20')).data || []).map((e) => e.id));
  const asked = Date.now();
  await sp.locator('#email').fill(STAFF);
  await sp.locator('button[type="submit"]').click();
  await sp.waitForLoadState('domcontentloaded');
  let link = '';
  let mail;
  for (let i = 0; i < 20 && !link; i++) {
    await sleep(2000);
    const list = (await rs('/emails?limit=20')).data || [];
    const hit = list.find((e) => !seen.has(e.id) && /sign-in link/.test(e.subject || ''));
    if (hit) {
      mail = await resendEmail(hit.id, { timeoutMs: 20_000 });
      link = (/(https:\/\/\S+\/admin\/sign-in\/confirm\?token=[A-Za-z0-9_.-]+)/.exec(mail.text || '') || [])[1] || '';
    }
  }
  signInToken = link ? new URL(link).searchParams.get('token') : '';
  await check('G1', 'G Admin: the sign-in link by email (Email E)', 'asking for a link sends one email through Resend, routed to the test inbox, from the site’s sender, with a single-use link to this deployment; never stored in email_log', async () => {
    const stored = (await q(`SELECT count(*)::int AS n FROM email_log WHERE template = 'admin-sign-in'`))[0].n;
    return { pass: Boolean(link) && link.startsWith(`${BASE}/admin/sign-in/confirm?token=`) && asList(mail?.to).includes(SINK) && stored === 0 && !leaks(`${mail?.html}${mail?.text}`.replace(signInToken, '')), actual: link ? `received in ${Math.round((Date.now() - asked) / 1000)} s · to ${asList(mail.to)} · ${mail.last_event} · link to ${new URL(link).host} · email_log rows ${stored}` : 'no sign-in email found in Resend', evidence: { id: short(mail?.id), subject: mail?.subject, from: mail?.from } };
  });
  if (link) {
    await sp.goto(link);
    const before = await sctx.cookies();
    await check('G2', 'G Admin: opening the link changes nothing', 'the link opens a page with a Sign in button and sets no session (mail scanners open links)', async () => ({ pass: (await sp.locator('form[action="/admin/sign-in/confirm"] button').count()) === 1 && !before.some((c) => c.name === auth.SESSION_COOKIE), actual: `button shown, session cookie ${before.some((c) => c.name === auth.SESSION_COOKIE)}` }));
    await sp.locator('form[action="/admin/sign-in/confirm"] button').click();
    await sp.waitForURL(/\/admin\/\?m=signedin/);
    const cookie = (await sctx.cookies()).find((c) => c.name === auth.SESSION_COOKIE);
    await check('G3', 'G Admin: signed in', 'the button starts a 12-hour session in a __Host- cookie (Secure, HttpOnly, SameSite=Lax) and lands on the bookings list', async () => {
      const hours = cookie ? Math.round((cookie.expires * 1000 - Date.now()) / 3600e3) : 0;
      return { pass: Boolean(cookie) && cookie.secure && cookie.httpOnly && cookie.sameSite === 'Lax' && hours === 12 && (await sp.locator('h1').textContent()).length > 0, actual: cookie ? `secure ${cookie.secure}, httpOnly ${cookie.httpOnly}, sameSite ${cookie.sameSite}, ~${hours} h` : 'no session cookie' };
    });
    if (row) {
      await sp.locator('input[name="q"]').fill(refs.X);
      await sp.locator('form.search button').click();
      await sp.waitForLoadState('domcontentloaded');
      const found = await sp.locator(`a[href="/admin/bookings/${row.id}"]`).count();
      await check('X2', 'Acceptance: staff find the enquiry', 'searching the reference in the dashboard finds it', async () => ({ pass: found >= 1, actual: `${found} result link(s) for ${refs.X}` }));
      await sp.goto(`/admin/bookings/${row.id}`);
      const detail = await sp.content();
      await check('X3', 'Acceptance: the details', 'the detail page shows the reference, customer, tour, date and pickup, history and the two emails sent', async () => {
        const need = [refs.X, customer('x').name, 'Winelands', 'Synthetic test guest house, Gardens'];
        const miss = need.filter((x) => !detail.includes(x));
        return { pass: !miss.length && /sent/i.test(detail), actual: miss.length ? `missing ${miss.join(', ')}` : 'reference, customer, tour, pickup, history and emails shown' };
      });
      await sp.locator('select#status').selectOption('CONFIRMED');
      await sp.locator('input[name="notify"]').check();
      await sp.locator('form[action$="/status"] button[type="submit"]').click();
      await sp.waitForURL(/m=status\.CONFIRMED/);
      const msg = await sp.locator('body').textContent();
      await check('X4', 'Acceptance: staff confirm the booking', 'the dashboard says the status is Confirmed and the customer has been emailed', async () => ({ pass: /Status set to Confirmed\. The customer has been emailed\./.test(msg), actual: (/(Status set to[^.]*\.[^.]*\.)/.exec(msg) || [])[1] || 'no message' }));
      const logs = await settledLogs(row.id, 3);
      const conf = logs.find((l) => l.template === 'booking-confirmed');
      await check('X5', 'Acceptance: the follow-up email (Email C)', 'the booking confirmation reaches Resend for the customer: reference, Confirmed, the booking terms line, the site’s sender; delivered', async () => {
        if (!conf?.provider_message_id) return { pass: false, actual: `email_log: ${logs.map((l) => `${l.template} ${l.status}`).join(', ')}` };
        const v = await verifyEmail(conf, { to: customer('x').email, replyTo: STAFF, subject: new RegExp(`booking ${refs.X} is confirmed`), contains: [refs.X] });
        if (!/Terms/i.test(v.text)) v.problems.push('no terms line');
        return { pass: v.problems.length === 0, actual: v.problems.length ? v.problems.join('; ') : `${v.summary.subject} · from ${v.summary.from} · ${v.summary.last_event}`, evidence: v.summary };
      });
      await check('X7', 'Acceptance: the links in the emails', 'every link in the three emails answers: this deployment’s pages, the dashboard and the status links (opening one changes nothing), and the outside links; none is plain http', async () => {
        const ids = (await logsOf(row.id)).map((l) => l.provider_message_id).filter(Boolean);
        const links = new Set();
        for (const id of ids) for (const l of linksIn((await rs(`/emails/${id}`)).html)) if (/^https?:/i.test(l)) links.add(l);
        const broken = [];
        const outside = [];
        for (const l of links) {
          if (/^http:/i.test(l)) broken.push(`${l} (plain http)`);
          if (l.startsWith(`${BASE}/`) || l === BASE) {
            const u = new URL(l);
            const r = await api(BASE, u.pathname + u.search);
            // A status link the booking has moved past answers 409 with a page saying nothing changed: it works.
            const movedPast = /\/status$/.test(u.pathname) && r.status === 409 && /No change/.test(r.text);
            if (!(r.status >= 200 && r.status < 400) && !movedPast) broken.push(`${u.pathname} → ${r.status}`);
          } else {
            const r = await fetch(l, { redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0 (Good Times link check)' } }).catch(() => ({ status: 0 }));
            outside.push(`${new URL(l).host} ${r.status}`);
            if (!(r.status >= 200 && r.status < 400) && r.status !== 403) broken.push(`${new URL(l).host} → ${r.status}`);
          }
        }
        const statusAfter = (await byRef(refs.X)).status;
        return { pass: links.size > 0 && broken.length === 0 && statusAfter === 'CONFIRMED', actual: `${links.size} links; ${broken.length ? `broken: ${broken.join(', ')}` : 'all answer'}; outside: ${outside.join(', ') || 'none'}; status still ${statusAfter}` };
      });
      await check('X6', 'Acceptance: the journey in the database', 'status CONFIRMED; history: created, terms, NEW → Confirmed by the staff address; email_log: three emails, all sent', async () => {
        const now = await byRef(refs.X);
        const ev = await eventsOf(row.id);
        const logs2 = await logsOf(row.id);
        const staffEvent = ev.find((e) => e.kind === 'status' && e.actor === STAFF);
        return { pass: now.status === 'CONFIRMED' && Boolean(staffEvent) && logs2.length === 3 && logs2.every((l) => l.status === 'sent'), actual: `${now.status}; events ${ev.map((e) => `${e.kind}${e.kind === 'status' ? ` (${e.detail} by ${e.actor})` : ''}`).join(', ')}; emails ${logs2.map((l) => `${l.template} ${l.status}`).join(', ')}` };
      });
    }
    // The used link again, from the API: refused.
    await check('G4', 'G Admin: replayed sign-in link', 'the same link a second time is refused (single use)', async () => {
      const again = await api(BASE, '/admin/sign-in/confirm', { method: 'POST', form: { token: signInToken } });
      return { pass: again.status === 400 && /already been used/.test(again.text), actual: `${again.status} ${/already been used/.test(again.text) ? '“already been used”' : again.text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 80)}` };
    });
    await sp.locator('form[action="/admin/sign-out"] button').click();
    await sp.waitForURL(/\/admin\/sign-in/);
    await check('G5', 'G Admin: sign out', 'signing out clears the session; the dashboard then asks to sign in again', async () => {
      const left = (await sctx.cookies()).find((c) => c.name === auth.SESSION_COOKIE);
      await sp.goto('/admin/');
      return { pass: !left?.value && /\/admin\/sign-in/.test(sp.url()), actual: `cookie ${left?.value ? 'kept' : 'cleared'}, then ${new URL(sp.url()).pathname}` };
    });
  }
  await sctx.close();
}

if (want('G')) {
  const bounce = (r) => r.status === 303 && /\/admin\/sign-in/.test(r.headers.get('location') || '');
  await check('G6', 'G Admin: refusals', 'no session → sign-in page; an invalid, forged or expired link → refused; an expired or forged session → signed out; a non-staff address gets the same answer and no email', async () => {
    const none = await api(BASE, '/admin/');
    const invalid = await api(BASE, '/admin/sign-in/confirm', { method: 'POST', form: { token: 'not-a-token' } });
    const forged = await api(BASE, '/admin/sign-in/confirm', { method: 'POST', form: { token: `${auth.signInToken(STAFF).split('.')[0]}.AAAA` } });
    const expired = await api(BASE, '/admin/sign-in/confirm', { method: 'POST', form: { token: auth.signInToken(STAFF, { now: Date.now() - 3600e3 }) } });
    const oldSession = await adminGet(BASE, '/admin/', mintedStaff(STAFF, { now: Date.now() - 13 * 3600e3 }));
    const forgedSession = await api(BASE, '/admin/', { cookie: `${auth.SESSION_COOKIE}=${mintedStaff().cookie.split('=')[1].split('.')[0]}.AAAA` });
    const outsider = mintedStaff('someone@example.com');
    const outsiderSession = await adminGet(BASE, '/admin/', outsider);
    const seen = new Set(((await rs('/emails?limit=10')).data || []).map((e) => e.id));
    const stranger = await api(BASE, '/admin/sign-in', { method: 'POST', form: { email: 'stranger@example.com' } });
    await sleep(6000);
    const newer = ((await rs('/emails?limit=10')).data || []).filter((e) => !seen.has(e.id) && /sign-in link/.test(e.subject || ''));
    const ok = bounce(none) && invalid.status === 400 && forged.status === 400 && expired.status === 400 && /expired/.test(expired.text) && bounce(oldSession) && bounce(forgedSession) && bounce(outsiderSession) && stranger.status === 200 && newer.length === 0;
    return { pass: ok, actual: `none ${none.status}→${none.headers.get('location')}; invalid ${invalid.status}; forged ${forged.status}; expired ${expired.status}; old session ${oldSession.status}; forged session ${forgedSession.status}; non-staff session ${outsiderSession.status}; stranger ${stranger.status}, new emails ${newer.length}` };
  });
  await check('G7', 'G Admin: forged requests (CSRF)', 'a change posted from another origin, or without the page’s form token, is refused and changes nothing', async () => {
    const ref = [refs.A, refs.D, refs.X].find(Boolean);
    const target = ref ? await byRef(ref) : null;
    if (!target) return { pass: false, actual: 'no enquiry to aim at (run A, D or X first)' };
    const evil = await adminPost(BASE, `/admin/bookings/${target.id}/status`, { status: 'CANCELLED' }, staff, { origin: 'https://evil.example' });
    const noToken = await api(BASE, `/admin/bookings/${target.id}/status`, { method: 'POST', cookie: staff.cookie, form: { status: 'CANCELLED' } });
    const after = await byRef(target.reference_number);
    return { pass: evil.status === 403 && noToken.status === 403 && after.status === target.status, actual: `other origin ${evil.status}; no form token ${noToken.status}; status still ${after.status}` };
  });
  await check('G8', 'G Admin: the lists', 'New, Upcoming, Past, Closed & cancelled and All answer; search finds by reference and by name; a non-match finds nothing', async () => {
    const views = {};
    for (const v of ['new', 'upcoming', 'past', 'cancelled', 'all']) views[v] = (await adminGet(BASE, `/admin/?view=${v}`, staff)).status;
    const ref = refs.A || refs.D || refs.X;
    const byRefQ = await adminGet(BASE, `/admin/?view=all&q=${encodeURIComponent(ref || 'GT-')}`, staff);
    const byName = await adminGet(BASE, `/admin/?view=all&q=${encodeURIComponent(`Synthetic Tester`)}`, staff);
    const none = await adminGet(BASE, `/admin/?view=all&q=zzzz-no-such-${RUN}`, staff);
    const ok = Object.values(views).every((s) => s === 200) && ref && byRefQ.text.includes(ref) && byName.text.includes(RUN) && !none.text.includes('/admin/bookings/');
    return { pass: Boolean(ok), actual: `${Object.entries(views).map(([k, v]) => `${k} ${v}`).join(', ')}; by reference ${byRefQ.text.includes(ref)}, by name ${byName.text.includes(RUN)}, non-match empty ${!none.text.includes('/admin/bookings/')}` };
  });
  await check('G9', 'G Admin: page defences', 'dashboard pages forbid scripts, framing and indexing (CSP default-src none, X-Robots-Tag), keep sign-in tokens from other sites (Referrer-Policy)', async () => {
    const r = await api(BASE, '/admin/sign-in');
    const csp = r.headers.get('content-security-policy') || '';
    return { pass: /default-src 'none'/.test(csp) && /frame-ancestors 'none'/.test(csp) && /noindex/.test(r.headers.get('x-robots-tag') || '') && r.headers.get('referrer-policy') === 'same-origin', actual: `CSP ${csp.slice(0, 40)}…; ${r.headers.get('x-robots-tag')}; ${r.headers.get('referrer-policy')}` };
  });
}

/* ---------- H: the status lifecycle and the signed links of Email A ---------- */
if (want('H')) {
  const date = await freeDate();
  const r = await postEnquiry(BASE, tour('h', date, { tour_slug: 'whale-watching-private-tour' }));
  refs.H = r.data?.reference;
  const row = refs.H ? await byRef(refs.H) : null;
  if (row) {
    const logs = await settledLogs(row.id, 2);
    const team = logs.find((l) => l.template === 'new-enquiry-internal');
    const mail = team?.provider_message_id ? await resendEmail(team.provider_message_id) : null;
    const links = mail ? linksIn(mail.html).filter((l) => l.includes(`/api/enquiries/${row.id}/status?token=`)) : [];
    const linkFor = (status) => links.find((l) => signing.verifyAction(new URL(l).searchParams.get('token')).status === status);
    const contacted = linkFor('CONTACTED');
    await check('H1', 'H Lifecycle: a status link from Email A', 'opening “Mark contacted” only shows a confirmation; pressing it moves NEW → CONTACTED (by “email link”); pressing again changes nothing', async () => {
      if (!contacted) return { pass: false, actual: `${links.length} status links in the team email` };
      const token = new URL(contacted).searchParams.get('token');
      const view = await api(BASE, new URL(contacted).pathname + new URL(contacted).search);
      const still = (await byRef(refs.H)).status;
      const apply = await api(BASE, `/api/enquiries/${row.id}/status`, { method: 'POST', form: { token } });
      const now = (await byRef(refs.H)).status;
      const again = await api(BASE, `/api/enquiries/${row.id}/status`, { method: 'POST', form: { token } });
      return { pass: view.status === 200 && still === 'NEW' && apply.status === 200 && now === 'CONTACTED' && again.status === 200 && /Already done/.test(again.text), actual: `GET ${view.status} (still ${still}); POST ${apply.status} → ${now}; again ${again.status} ${/Already done/.test(again.text) ? '“Already done”' : ''}` };
    });
    await check('H2', 'H Lifecycle: tampered and misused links', 'a link with a changed signature, another enquiry’s id or an expired date is refused; a link backwards is refused', async () => {
      const token = new URL(contacted).searchParams.get('token');
      const flipped = `${token.slice(0, -2)}${token.endsWith('A') ? 'B' : 'A'}${token.slice(-1)}`;
      const t1 = await api(BASE, `/api/enquiries/${row.id}/status`, { method: 'POST', form: { token: flipped } });
      const other = refs.A ? (await byRef(refs.A))?.id : '00000000-0000-4000-8000-000000000000';
      const t2 = await api(BASE, `/api/enquiries/${other}/status`, { method: 'POST', form: { token } });
      const old = signing.signAction({ enquiryId: row.id, status: 'QUOTED', expiresAt: Date.now() - 1000 });
      const t3 = await api(BASE, `/api/enquiries/${row.id}/status`, { method: 'POST', form: { token: old } });
      return { pass: t1.status === 403 && t2.status === 403 && t3.status === 410, actual: `changed signature ${t1.status}; other enquiry ${t2.status}; expired ${t3.status}` };
    });
    for (const to of ['QUOTED', 'CONFIRMED']) await adminPost(BASE, `/admin/bookings/${row.id}/status`, { status: to, notify: 'on' }, staff);
    await check('H3', 'H Lifecycle: NEW → CONTACTED → QUOTED → CONFIRMED', 'each step recorded in the history with who made it; confirming emails the customer (Email C)', async () => {
      const now = await byRef(refs.H);
      const ev = (await eventsOf(row.id)).filter((e) => e.kind === 'status').map((e) => `${e.detail} (${e.actor})`);
      const l2 = await settledLogs(row.id, 3);
      const conf = l2.find((l) => l.template === 'booking-confirmed');
      return { pass: now.status === 'CONFIRMED' && ev.length === 3 && conf?.status === 'sent', actual: `${now.status}; ${ev.join('; ')}; booking-confirmed ${conf?.status}` };
    });
    const back = linkFor('QUOTED');
    if (back) {
      await check('H4', 'H Lifecycle: an old link after confirmation', '“Mark quoted” from the team email cannot move a confirmed booking back', async () => {
        const r2 = await api(BASE, `/api/enquiries/${row.id}/status`, { method: 'POST', form: { token: new URL(back).searchParams.get('token') } });
        return { pass: r2.status === 409 && (await byRef(refs.H)).status === 'CONFIRMED', actual: `${r2.status}, still ${(await byRef(refs.H)).status}` };
      });
    }
  }
  // Cancellation on its own request: Email D, worded without promises.
  const date2 = await freeDate();
  const r2 = await postEnquiry(BASE, tour('h2', date2, { tour_slug: 'quad-biking' }));
  const row2 = r2.data?.reference ? await byRef(r2.data.reference) : null;
  if (row2) {
    await settledLogs(row2.id, 2);
    const res = await adminPost(BASE, `/admin/bookings/${row2.id}/status`, { status: 'CANCELLED', notify: 'on' }, staff);
    await check('H5', 'H Lifecycle: cancellation (Email D)', 'CANCELLED frees the vehicle, is recorded, and emails a neutral notice with the reference and no refund promise; delivered', async () => {
      const l = await settledLogs(row2.id, 3);
      const c = l.find((x) => x.template === 'booking-cancelled');
      if (!c?.provider_message_id) return { pass: false, actual: `${res.status}; ${l.map((x) => `${x.template} ${x.status}`).join(', ')}` };
      const v = await verifyEmail(c, { to: customer('h2').email, replyTo: STAFF, subject: /has been cancelled/, contains: [r2.data.reference], notContains: ['refund'] });
      const now = await byRef(r2.data.reference);
      return { pass: v.problems.length === 0 && now.status === 'CANCELLED', actual: v.problems.length ? v.problems.join('; ') : `${now.status}; ${v.summary.subject} · ${v.summary.last_event}`, evidence: v.summary };
    });
  }
}

/* ---------- I: racing for the last vehicle ---------- */
if (want('I')) {
  const date = await freeDate();
  const set = await adminPost(BASE, '/admin/availability', { day: date, vehicles: '1', note: `synthetic concurrency test ${RUN}` }, staff);
  const tags = ['i1', 'i2', 'i3', 'i4', 'i5'];
  for (let i = 0; i < tags.length; i++) await slot();
  const t0 = Date.now();
  const answers = await Promise.all(tags.map((tag) => api(BASE, '/api/enquiries', { method: 'POST', json: tour(tag, date, { tour_slug: 'sky-diving' }), headers: { 'idempotency-key': idem() } })));
  const spread = Date.now() - t0;
  await check('I1', 'I Concurrency: five requests for one vehicle', 'with the day set to 1 vehicle in the dashboard, five simultaneous requests store at most one; the rest answer 409 “fully booked” (at worst all are asked to choose again); the vehicle is never overbooked', async () => {
    const holding = (await q(`SELECT count(*)::int AS n FROM enquiries WHERE preferred_date = $1::date AND status IN ('NEW','CONTACTED','QUOTED','CONFIRMED')`, [date]))[0].n;
    const codes = answers.map((a) => a.status);
    const created = codes.filter((c) => c === 201).length;
    return { pass: set.status === 303 && holding <= 1 && holding === created && codes.every((c) => c === 201 || (c === 409)), actual: `day set ${set.status}; answers ${codes.join(', ')} in ${spread} ms; holding the date: ${holding}` };
  });
  const winner = answers.find((a) => a.status === 201);
  if (winner) {
    const row = await byRef(winner.data.reference);
    await check('I2', 'I Concurrency: the accepted request’s emails', 'the one accepted request still sends both emails (no provider rate-limit failure)', async () => {
      const l = await settledLogs(row.id, 2);
      return { pass: l.length === 2 && l.every((x) => x.status === 'sent'), actual: l.map((x) => `${x.template} ${x.status}${x.error ? ` (${clean(x.error).slice(0, 60)})` : ''}`).join('; ') };
    });
  }
  // Transfers: two at the same time compete for the vehicle; one three hours later does not.
  const tdate = await freeDate();
  await adminPost(BASE, '/admin/availability', { day: tdate, vehicles: '1', note: `synthetic concurrency test ${RUN}` }, staff);
  for (let i = 0; i < 3; i++) await slot();
  const pair = await Promise.all(['i6', 'i7'].map((tag, k) => api(BASE, '/api/enquiries', { method: 'POST', json: transfer(tag, tdate, k ? '10:30' : '10:00'), headers: { 'idempotency-key': idem() } })));
  const later = await api(BASE, '/api/enquiries', { method: 'POST', json: transfer('i8', tdate, '13:30'), headers: { 'idempotency-key': idem() } });
  await check('I3', 'I Concurrency: overlapping transfers', 'two transfers 30 minutes apart (each holds 2 hours) on a 1-vehicle day: at most one stored; a transfer after the hold ends is accepted', async () => {
    const codes = pair.map((a) => a.status);
    return { pass: codes.filter((c) => c === 201).length <= 1 && codes.every((c) => c === 201 || c === 409) && later.status === 201, actual: `pair ${codes.join(', ')}; three hours later ${later.status}` };
  });
  for (const d of [date, tdate]) await adminPost(BASE, '/admin/availability', { day: d, vehicles: '', note: '' }, staff);
  record('I4', 'I Concurrency: business rules', 'vehicle numbers approved by Good Times', null, `not verifiable here: the default of ${2} vehicles a day, the 2-hour airport and 3-hour other transfer holds and the 48 hours’ notice are the owner’s approved booking rules of 8 Nov 2026 (D9; src/assets/js/enquiry-schema.js › BOOKING_RULES); this suite checks the code applies them, not the fleet itself`);
}

/* ---------- J: an Android-sized phone ---------- */
if (want('J')) {
  const date = await freeDate();
  const ctx = await context('android');
  const page = await ctx.newPage();
  const opened = await openForm(page, '?type=tour&tour=cape-town-city-private-tour');
  const vw = page.viewportSize();
  const t = step(page, 'details', 'tour');
  await t.locator('[data-next]').tap();
  const firstErrors = await step(page, 'details', 'tour').locator('[data-error-summary]').textContent().catch(() => '');
  await check('J1', 'J Mobile: validation', 'an empty step answers with plain messages at the top of the step, on a 412 px wide screen', async () => ({ pass: /Tell us where to collect you/.test(firstErrors), actual: `${vw.width}×${vw.height}: “${firstErrors.replace(/\s+/g, ' ').trim().slice(0, 90)}”` }));
  await t.locator('[name="preferred_date"]').fill(date);
  await t.locator('[name="pickup_area"]').tap();
  await t.locator('[name="pickup_area"]').fill('Synthetic test hotel, Green Point');
  // A soft keyboard covers roughly the lower 40% of the screen: with the visible area shrunk, the focused field and
  // the step's button must still be reachable and not covered by anything fixed.
  await page.setViewportSize({ width: vw.width, height: Math.round(vw.height * 0.58) });
  const reach = await page.evaluate(async () => {
    const step = document.querySelector('[data-wizard-step="details"][data-path="tour"]');
    const field = step.querySelector('[name="pickup_area"]');
    const next = step.querySelector('[data-next]');
    const frame = () => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)));
    // The site scrolls smoothly (scroll-behavior): jump instead, and measure once the frame is drawn.
    const free = async (el) => {
      el.scrollIntoView({ block: 'center', behavior: 'instant' });
      await frame();
      const r = el.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { inView: r.top >= 0 && r.bottom <= innerHeight, covered: !(hit === el || el.contains(hit)), h: Math.round(r.height), w: Math.round(r.width) };
    };
    return { field: await free(field), next: await free(next), overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  });
  await page.setViewportSize(vw);
  await check('J2', 'J Mobile: keyboard and tap targets', 'with the lower 42% of the screen taken by a keyboard, the field and the Next button stay reachable, uncovered and at least 44 px tall; no sideways scroll', async () => ({
    pass: !reach.field.covered && !reach.next.covered && reach.next.inView && reach.next.h >= 44 && reach.overflow <= 0,
    actual: `field covered ${reach.field.covered}, Next in view ${reach.next.inView} covered ${reach.next.covered} (${reach.next.w}×${reach.next.h}); overflow ${reach.overflow}`,
  }));
  await t.locator('[data-next]').tap();
  await fillContact(page, 'j');
  const r = await send(page, opened, { tap: true, presses: 3 });
  refs.J = r.body.reference;
  await check('J3', 'J Mobile: repeated taps', 'three quick taps on Send make one request and one enquiry; the confirmation is shown', async () => {
    await page.waitForTimeout(2000);
    const n = (await q(`SELECT count(*)::int AS n FROM enquiries WHERE email = $1`, [customer('j').email]))[0].n;
    return { pass: r.status === 201 && r.posts === 1 && n === 1 && r.shown === refs.J && r.notConfirmed, actual: `${r.posts} request(s), ${n} enquiry, shown ${r.shown}` };
  });
  await ctx.close();
}

/* ---------- S: injection and what the public API gives away ---------- */
if (want('S')) {
  const date = await freeDate();
  const nasty = { name: `Zoë <script>alert(1)</script> "O'Brien" (${RUN})`, special_requests: `<img src=x onerror=alert(1)> '); DROP TABLE enquiries;-- ‮evil` };
  const r = await postEnquiry(BASE, { ...tour('s', date), ...nasty, email: customer('s').email });
  const row = r.data?.reference ? await byRef(r.data.reference) : null;
  await check('S1', 'Security: SQL injection', 'hostile text is stored as text; every table is intact', async () => {
    const tables = (await q(`SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema = 'public'`))[0].n;
    return { pass: r.status === 201 && row?.special_requirements.includes('DROP TABLE enquiries') && (await q('SELECT count(*)::int AS n FROM enquiries'))[0].n > 0 && tables >= 6, actual: `${r.status}; stored literally ${row?.special_requirements.includes('DROP TABLE')}; ${tables} tables` };
  });
  await check('S2', 'Security: script injection', 'the name and request are escaped in the team email and in the dashboard: no live <script> or onerror attribute', async () => {
    if (!row) return { pass: false, actual: `${r.status}` };
    const l = await settledLogs(row.id, 2);
    const team = l.find((x) => x.template === 'new-enquiry-internal');
    const mail = team?.provider_message_id ? await resendEmail(team.provider_message_id) : { html: '' };
    const d = await adminGet(BASE, `/admin/bookings/${row.id}`, staff);
    const live = (h) => /<script>alert|<img src=x onerror/i.test(h);
    return { pass: !live(mail.html) && /&lt;script&gt;/.test(mail.html) && !live(d.text) && d.status === 200 && !/[\r\n]/.test(mail.subject || ''), actual: `email live markup ${live(mail.html)}, escaped ${/&lt;script&gt;/.test(mail.html)}; dashboard live markup ${live(d.text)}` };
  });
  await check('S3', 'Security: header injection', 'a line break in the name never reaches an email header (rejected or flattened)', async () => {
    const x = await postEnquiry(BASE, { ...tour('s2', await freeDate()), name: `Synthetic\r\nBcc: someone@example.com (${RUN})` });
    const row2 = x.data?.reference ? await byRef(x.data.reference) : null;
    const flat = row2 ? !/[\r\n]/.test(row2.name) : true;
    return { pass: (x.status === 400 || (x.status === 201 && flat)), actual: `${x.status}${row2 ? `, stored name has a line break: ${!flat}` : ''}` };
  });
  await check('S4', 'Security: data minimisation', 'the public answers give away no personal data: the intake returns only ok, reference, type and emailed; availability returns only dates', async () => {
    const keys = Object.keys(r.data || {}).sort().join(',');
    const av = await api(BASE, `/api/availability?month=${date.slice(0, 7)}`);
    return { pass: keys === 'emailed,enquiry_type,ok,reference' && !/@|Synthetic|phone/i.test(av.text), actual: `intake keys ${keys}; availability keys ${Object.keys(av.data || {}).join(',')}` };
  });
}

/* ---------- T: how long the critical routes take (no enquiry, no email) ---------- */
if (want('T')) {
  const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
  const time = async (n, fn) => {
    const ms = [];
    for (let i = 0; i < n; i++) ms.push((await fn()).ms);
    return { median: median(ms), max: Math.max(...ms) };
  };
  await check('T1', 'Reliability: response times', 'the database check, the availability month and the dashboard answer within a few seconds from the Functions runtime', async () => {
    const health = await time(5, () => api(BASE, '/api/health?check=db', { access: false }));
    const avail = await time(3, () => api(BASE, `/api/availability?month=${dayAfter(new Date().toISOString().slice(0, 10), 200).slice(0, 7)}`));
    const list = await time(3, () => adminGet(BASE, '/admin/?view=all', staff));
    return { pass: health.max < 5000 && avail.max < 5000 && list.max < 8000, actual: `health+db median ${health.median} ms (max ${health.max}); availability ${avail.median} ms (max ${avail.max}); dashboard list ${list.median} ms (max ${list.max})` };
  });
}

/* ---------- R: the rate limit (last: it spends this machine's minute) ---------- */
if (want('R')) {
  await sleep(62_000);
  posts.length = 0;
  const codes = [];
  let retryAfter = '';
  for (let i = 0; i < 11; i++) {
    const r = await api(BASE, '/api/enquiries', { method: 'POST', json: { enquiry_type: 'tour' }, headers: { 'idempotency-key': idem() } });
    codes.push(r.status);
    if (r.status === 429) retryAfter = r.headers.get('retry-after');
  }
  await check('R1', 'Security: rate limiting', 'ten posts a minute from one address are answered; the eleventh gets 429 with Retry-After', async () => ({ pass: codes.slice(0, 10).every((c) => c === 400) && codes[10] === 429 && Number(retryAfter) > 0, actual: `${codes.join(' ')}; Retry-After ${retryAfter}` }));
}

/* ---------- the run's leakage check and clean-up ---------- */
await check('L1', 'Email: no unintended recipients', 'every email of this run went to Resend’s test inbox or a synthetic resend.dev address, never to a real mailbox', async () => {
  const rows = await q(`SELECT l.recipient FROM email_log l JOIN enquiries e ON e.id = l.enquiry_id WHERE e.email LIKE $1`, [`delivered+gt-${RUN}-%@resend.dev`]);
  const real = rows.filter((x) => !/@resend\.dev$/i.test(x.recipient));
  return { pass: rows.length > 0 && real.length === 0, actual: `${rows.length} emails, ${real.length} to a non-test address` };
});
if (browser) await browser.close();
if (opt('cleanup') === 'true') {
  const del = await q(`DELETE FROM enquiries WHERE email LIKE $1 RETURNING id`, [`delivered+gt-${RUN}-%@resend.dev`]);
  const days = await q(`DELETE FROM day_capacity WHERE note LIKE $1 RETURNING day`, [`%${RUN}%`]);
  console.log(`clean-up: ${del.length} synthetic enquiries (with their history and email log), ${days.length} day settings removed`);
}
writeFileSync(EVIDENCE, JSON.stringify({ base: BASE, run: RUN, commit: COMMIT, at: new Date().toISOString(), references: refs, results }, null, 1));
const failed = results.filter((r) => r.pass === false);
const blocked = results.filter((r) => r.pass === null);
console.log(`\n${results.length - failed.length - blocked.length} passed, ${failed.length} failed, ${blocked.length} waiting for an approval · evidence: ${EVIDENCE}`);
process.exitCode = failed.length ? 1 : 0;
