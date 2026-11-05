/**
 * The enquiry API as Cloudflare runs it: the Pages Function
 * (functions/api/[[path]].js) in workerd under `wrangler pages dev`, with the
 * production drivers, Neon over HTTP and Resend over HTTP, answering from
 * local stand-ins (test/helpers/neon-standin.mjs, resend-standin.mjs: real
 * Postgres in PGlite, an in-memory mail log). Nothing reaches the network.
 *
 * The Node-level suites (enquiries-endpoint, notifications, status-links) pin
 * the rules; this one proves the deployed shape keeps them: configuration from
 * bindings, the trusted client address, the database and email round trips,
 * outages, and the hero film's range Function beside the API.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startNeonStandIn } from './helpers/neon-standin.mjs';
import { startResendStandIn } from './helpers/resend-standin.mjs';
import { startPagesDev, freePort } from './helpers/pages-dev.mjs';

const DB = 'postgres://gt:pw@ep-gt-test-123456.eu-central-1.aws.neon.tech/gt?sslmode=require';
const SECRET = 'functions-test-signing-secret-0123456789abcdef';
const FROM = 'Good Times in Cape Town <info@goodtimesincapetown.co.za>';
const TEAM = 'team@example.com';
const REPLY = 'info@goodtimesincapetown.co.za';
const LIMIT = 4;

let neon;
let resend;
let live;
let staticDir;
let siteUrl;

/** A Cape Town date `n` days ahead, as YYYY-MM-DD. */
const inDays = (n) => new Date(Date.now() + n * 86400000 + 2 * 3600000).toISOString().slice(0, 10);
let ipCounter = 0;
const nextIp = () => `198.51.100.${++ipCounter}`;

const contact = (email) => ({ name: 'Thandi Mokoena', email, phone: '+27 82 123 4567', preferred_contact_method: 'email', country: 'South Africa', consent: true, terms: true, elapsed_ms: 45_000, gt_hp_check: '' });
const tour = (email) => ({ enquiry_type: 'tour', tour_slug: 'cape-town-city-private-tour', preferred_date: inDays(40), adults: 2, children: 0, pickup_area: 'Hotel in Green Point', special_requests: 'A late start, please.', ...contact(email) });
const transfer = (email) => ({ enquiry_type: 'transfer', transfer_type: 'airport-arrival', pickup_location: 'Cape Town International Airport (CPT)', destination: 'Camps Bay', transfer_date: inDays(25), transfer_time: '09:45', flight_number: 'SA 345', adults: 3, children: 0, suitcases: 4, ...contact(email) });

async function postEnquiry(body, { ip = nextIp(), key, headers = {} } = {}) {
  const res = await fetch(`${live.url}/api/enquiries`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip, ...(key ? { 'idempotency-key': key } : {}), ...headers },
    body: JSON.stringify(body),
  });
  return { status: res.status, headers: res.headers, body: await res.json() };
}
const rows = async (sql, params = []) => (await neon.db.query(sql, params)).rows;
const enquiryByRef = async (ref) => (await rows('SELECT *, preferred_date::text AS preferred_date FROM enquiries WHERE reference_number = $1', [ref]))[0];
const mailsTo = (addr) => resend.messages.filter((m) => m.to.includes(addr));
const uniqueKey = () => `fn-test-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

before(async () => {
  neon = await startNeonStandIn();
  resend = await startResendStandIn();

  // Migrate through the real Neon driver, exactly as `DATABASE_URL=… npm run db:migrate` does in production.
  Object.assign(process.env, { DATABASE_URL: DB, DATABASE_HTTP_ENDPOINT: neon.url, VERCEL: '1' });
  delete process.env.ENQUIRY_MODE;
  const { migrate } = await import('../lib/db/migrate.mjs');
  await migrate({ log: () => {} });
  // Requests here share a few dates: give every date 50 vehicles (the limit is tested in test/availability.test.mjs).
  await (await import('../lib/db/index.mjs')).query(`INSERT INTO day_capacity (day, vehicles, note) SELECT d::date, 50, 'test' FROM generate_series(current_date - 1, current_date + 1200, interval '1 day') d`);
  await (await import('../lib/db/index.mjs')).closeDb();

  // A small static tree: a page and a film-sized file for the range Function.
  staticDir = mkdtempSync(join(tmpdir(), 'gt-pages-'));
  writeFileSync(join(staticDir, 'index.html'), '<!doctype html><title>Good Times</title><p>home</p>');
  mkdirSync(join(staticDir, 'assets', 'video'), { recursive: true });
  writeFileSync(join(staticDir, 'assets', 'video', 'clip.mp4'), Buffer.from(Array.from({ length: 4096 }, (_, i) => i % 251)));

  const port = await freePort();
  siteUrl = `http://127.0.0.1:${port}`;
  live = await startPagesDev({
    dir: staticDir,
    port,
    bindings: {
      ENQUIRY_MODE: 'live',
      ENQUIRY_SYSTEM_ENABLED: 'true',
      SITE_ENV: 'preview',
      DATABASE_URL: DB,
      DATABASE_HTTP_ENDPOINT: neon.url,
      EMAIL_PROVIDER: 'resend',
      RESEND_API_KEY: resend.apiKey,
      RESEND_API_URL: resend.url,
      FROM_EMAIL: FROM,
      ENQUIRY_TEAM_EMAIL: TEAM,
      REPLY_TO_EMAIL: REPLY,
      ENQUIRY_SIGNING_SECRET: SECRET,
      PUBLIC_SITE_URL: siteUrl,
      RATE_LIMIT_PER_MINUTE: String(LIMIT),
    },
  });
});

after(async () => {
  await live?.stop();
  await neon?.close();
  await resend?.close();
});

test('health reports live; the static site and the hero film’s range Function still answer beside the API', async () => {
  const health = await fetch(`${live.url}/api/health`);
  assert.equal(health.status, 200);
  assert.equal(health.headers.get('cache-control'), 'no-store');
  assert.equal((await health.json()).enquiries, 'live');

  const home = await fetch(`${live.url}/`);
  assert.equal(home.status, 200);
  assert.match(await home.text(), /<p>home<\/p>/);

  const range = await fetch(`${live.url}/assets/video/clip.mp4`, { headers: { Range: 'bytes=100-199' } });
  assert.equal(range.status, 206);
  assert.equal(range.headers.get('content-range'), 'bytes 100-199/4096');
  const bytes = new Uint8Array(await range.arrayBuffer());
  assert.equal(bytes.length, 100);
  assert.equal(bytes[0], 100 % 251);

  const unknown = await fetch(`${live.url}/api/unknown`);
  assert.equal(unknown.status, 404);
  const wrong = await fetch(`${live.url}/api/enquiries`);
  assert.equal(wrong.status, 405);
});

test('a tour enquiry is stored through Neon and both emails leave through Resend', async () => {
  const email = 'tour.fn@example.com';
  const r = await postEnquiry(tour(email), { key: uniqueKey() });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.match(r.body.reference, /^GT-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/);
  assert.equal(r.body.emailed, true);

  const row = await enquiryByRef(r.body.reference);
  assert.equal(row.status, 'NEW');
  assert.equal(row.enquiry_type, 'tour');
  assert.equal(row.tour_slug, 'cape-town-city-private-tour');
  assert.equal(row.preferred_date, inDays(40));
  assert.equal(row.pickup_area, 'Hotel in Green Point');
  assert.equal(row.special_requirements, 'A late start, please.');
  assert.equal(row.ip_hash.length, 32);

  const [team] = mailsTo(TEAM).filter((m) => m.subject.includes(r.body.reference));
  assert.ok(team, 'team notification sent');
  assert.equal(team.from, FROM);
  assert.equal(team.reply_to, email, 'the team replies straight to the visitor');
  assert.match(team.subject, new RegExp(`^Tour ${r.body.reference} · Cape Town City Private Tour · `));
  assert.match(team.text, new RegExp(`${siteUrl}/api/enquiries/[0-9a-f-]{36}/status\\?token=`), 'signed status links on PUBLIC_SITE_URL');

  const [ack] = mailsTo(email);
  assert.ok(ack, 'visitor acknowledgement sent');
  assert.equal(ack.reply_to, REPLY);
  assert.match(ack.subject, /received, not yet confirmed/);
  assert.ok(ack.text.includes(r.body.reference));
  assert.match(ack.text, /not (yet )?a confirmed booking|not yet confirmed/i);

  const log = await rows('SELECT template, status FROM email_log WHERE enquiry_id = $1 ORDER BY template', [row.id]);
  assert.deepEqual(log.map((l) => [l.template, l.status]), [['enquiry-received', 'sent'], ['new-enquiry-internal', 'sent']]);
});

test('a transfer request is stored with its Cape Town time as an instant', async () => {
  const r = await postEnquiry(transfer('transfer.fn@example.com'), { key: uniqueKey() });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal(r.body.enquiry_type, 'transfer');
  const row = await enquiryByRef(r.body.reference);
  assert.equal(row.transfer_type, 'airport-arrival');
  assert.equal(row.flight_number, 'SA 345');
  assert.equal(row.pickup_time_sast, '09:45');
  assert.equal(new Date(row.pickup_at).toISOString(), new Date(`${inDays(25)}T07:45:00Z`).toISOString());
  const [team] = mailsTo(TEAM).filter((m) => m.subject.includes(r.body.reference));
  assert.match(team.subject, /^Transfer GT-\w{6} · .+ · CPT airport → Camps Bay · 3 pax$/);
});

test('a multi-day package request travels the tour path with its nights (migration 004 applied through Neon)', async () => {
  const email = 'package.fn@example.com';
  const r = await postEnquiry({ ...tour(email), tour_slug: 'garden-route-private-tour', nights: 7 }, { key: uniqueKey() });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const row = await enquiryByRef(r.body.reference);
  assert.equal(row.tour_slug, 'garden-route-private-tour');
  assert.equal(row.nights, 7);
  const [team] = mailsTo(TEAM).filter((m) => m.subject.includes(r.body.reference));
  assert.match(team.subject, /^Multi-day GT-\w{6} · Garden Route Private Tour · .+ · 7 nights · 2 adults$/);
  const [ack] = mailsTo(email);
  assert.match(ack.subject, /^Your Good Times multi-day tour enquiry GT-\w{6}: received, not yet confirmed$/);
});

test('duplicates: the same submission again returns the same reference; the same request under a new key is refused; nothing new is stored or sent', async () => {
  const body = tour('duplicate.fn@example.com');
  const key = uniqueKey();
  const first = await postEnquiry(body, { key });
  assert.equal(first.status, 201);
  const before = (await rows('SELECT count(*)::int AS n FROM enquiries'))[0].n;
  const sent = resend.messages.length;

  const again = await postEnquiry(body, { key });
  assert.equal(again.status, 409);
  assert.equal(again.body.code, 'duplicate_submission');
  assert.equal(again.body.reference, first.body.reference);

  const sameContent = await postEnquiry(body, { key: uniqueKey() });
  assert.equal(sameContent.status, 409);
  assert.equal(sameContent.body.code, 'duplicate_content');

  assert.equal((await rows('SELECT count(*)::int AS n FROM enquiries'))[0].n, before);
  assert.equal(resend.messages.length, sent);
});

test('invalid input is refused field by field; a filled honeypot or a too-fast form gets a silent decoy; nothing is stored or sent', async () => {
  const before = (await rows('SELECT count(*)::int AS n FROM enquiries'))[0].n;
  const sent = resend.messages.length;

  const bad = await postEnquiry({ ...tour('not-an-email'), pickup_area: '', consent: false, preferred_date: '2020-01-01' });
  assert.equal(bad.status, 400);
  assert.deepEqual(Object.keys(bad.body.errors), ['preferred_date', 'pickup_area', 'email', 'consent']);

  const wrongType = await fetch(`${live.url}/api/enquiries`, { method: 'POST', headers: { 'content-type': 'text/plain', 'cf-connecting-ip': nextIp() }, body: 'hello' });
  assert.equal(wrongType.status, 415);

  const honeypot = await postEnquiry({ ...tour('bot@example.com'), gt_hp_check: 'http://spam.example' });
  assert.equal(honeypot.status, 200);
  assert.deepEqual(honeypot.body, { ok: true });

  const tooFast = await postEnquiry({ ...tour('fast@example.com'), elapsed_ms: 900 });
  assert.equal(tooFast.status, 200);
  assert.deepEqual(tooFast.body, { ok: true });

  assert.equal((await rows('SELECT count(*)::int AS n FROM enquiries'))[0].n, before);
  assert.equal(resend.messages.length, sent);
});

test('the rate limit keys on CF-Connecting-IP: changing X-Forwarded-For cannot get round it', async () => {
  const ip = nextIp();
  for (let i = 0; i < LIMIT; i++) {
    const r = await postEnquiry({}, { ip, headers: { 'x-forwarded-for': `203.0.113.${i + 1}` } });
    assert.equal(r.status, 400, `request ${i + 1} is within the limit`);
  }
  const blocked = await postEnquiry({}, { ip, headers: { 'x-forwarded-for': '203.0.113.200' } });
  assert.equal(blocked.status, 429);
  assert.ok(Number(blocked.headers.get('retry-after')) > 0);
  const other = await postEnquiry({}, { ip: nextIp() });
  assert.equal(other.status, 400, 'another visitor is unaffected');
});

test('an email provider outage still stores the enquiry (201, emailed:false) and logs both sends as failed for the retry job', async () => {
  resend.fail(500, 500);
  const r = await postEnquiry(tour('outage.fn@example.com'), { key: uniqueKey() });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal(r.body.emailed, false);
  const row = await enquiryByRef(r.body.reference);
  const log = await rows('SELECT status, error FROM email_log WHERE enquiry_id = $1', [row.id]);
  assert.equal(log.length, 2);
  for (const l of log) {
    assert.equal(l.status, 'failed');
    assert.match(l.error, /Resend responded 500/);
  }
});

test('a database outage answers a plain 500 that leaks nothing, and stores nothing', async () => {
  const before = (await rows('SELECT count(*)::int AS n FROM enquiries'))[0].n;
  neon.fail(1);
  const r = await postEnquiry(tour('db-outage.fn@example.com'), { key: uniqueKey() });
  assert.equal(r.status, 500);
  assert.deepEqual(Object.keys(r.body).sort(), ['error', 'ok']);
  assert.doesNotMatch(r.body.error, /neon|sql|stand-in|postgres/i);
  assert.equal((await rows('SELECT count(*)::int AS n FROM enquiries'))[0].n, before);
});

test('status links from the team email: GET only asks, POST applies, a replay changes nothing, a forged token is refused', async () => {
  const r = await postEnquiry(transfer('links.fn@example.com'), { key: uniqueKey() });
  assert.equal(r.status, 201);
  const [team] = mailsTo(TEAM).filter((m) => m.subject.includes(r.body.reference));
  const links = [...team.text.matchAll(/(http:\/\/127\.0\.0\.1:\d+\/api\/enquiries\/([0-9a-f-]{36})\/status\?token=([A-Za-z0-9_.-]+))/g)];
  assert.equal(links.length, 4, 'contacted, quoted, confirmed, closed');
  const contacted = links.find(([, , , token]) => Buffer.from(token.split('.')[0], 'base64url').toString().includes('|CONTACTED|'));
  const [url, id, token] = contacted.slice(1);

  const ask = await fetch(url);
  assert.equal(ask.status, 200);
  assert.match(await ask.text(), /Mark GT-\w{6} as “Contacted”\?/);
  assert.equal((await rows('SELECT status FROM enquiries WHERE id = $1', [id]))[0].status, 'NEW', 'GET changes nothing');

  const form = (t) => ({ method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token: t }) });
  const apply = await fetch(`${live.url}/api/enquiries/${id}/status`, form(token));
  assert.equal(apply.status, 200);
  assert.match(await apply.text(), /is now “Contacted”/);
  assert.equal((await rows('SELECT status FROM enquiries WHERE id = $1', [id]))[0].status, 'CONTACTED');

  const replay = await fetch(`${live.url}/api/enquiries/${id}/status`, form(token));
  assert.match(await replay.text(), /already “Contacted”/);

  const [payload] = token.split('.');
  const forged = await fetch(`${live.url}/api/enquiries/${id}/status`, form(`${payload}.${Buffer.from('x'.repeat(32)).toString('base64url')}`));
  assert.equal(forged.status, 403);
});

test('a deployment misconfigured for Cloudflare (pglite:// database, file email) refuses with 503 and names the problem in its log', async () => {
  const bad = await startPagesDev({
    dir: staticDir,
    bindings: {
      ENQUIRY_MODE: 'live',
      DATABASE_URL: 'pglite://memory',
      EMAIL_PROVIDER: 'file',
      FROM_EMAIL: FROM,
      ENQUIRY_TEAM_EMAIL: TEAM,
      REPLY_TO_EMAIL: REPLY,
      ENQUIRY_SIGNING_SECRET: SECRET,
      PUBLIC_SITE_URL: 'http://127.0.0.1',
    },
  });
  try {
    const health = await fetch(`${bad.url}/api/health`);
    assert.equal(health.status, 503);
    assert.equal((await health.json()).code, 'misconfigured');
    const r = await fetch(`${bad.url}/api/enquiries`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(tour('x@example.com')) });
    assert.equal(r.status, 503);
    await new Promise((resolve) => setTimeout(resolve, 300));
    assert.match(bad.output(), /DATABASE_URL must be a postgres:\/\/ connection string on Cloudflare/);
    assert.match(bad.output(), /EMAIL_PROVIDER must be "resend" on Cloudflare/);
  } finally {
    await bad.stop();
  }
});

test('a preview deployment needs no secrets: health says preview and enquiries are refused', async () => {
  const preview = await startPagesDev({ dir: staticDir, bindings: { ENQUIRY_MODE: 'preview', SITE_ENV: 'preview' } });
  try {
    assert.equal((await (await fetch(`${preview.url}/api/health`)).json()).enquiries, 'preview');
    const r = await fetch(`${preview.url}/api/enquiries`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    assert.equal(r.status, 503);
    assert.equal((await r.json()).code, 'preview');
  } finally {
    await preview.stop();
  }
});
