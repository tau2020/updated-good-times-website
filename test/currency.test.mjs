/**
 * Display currencies (D75): the country → currency map, exact conversion and
 * formatting (src/assets/js/currency-core.js), the exchange-rate service with
 * its caches and fallbacks (lib/currency/rates.mjs), and GET /api/currency.
 * Frankfurter is never reached: every fetch here is a stand-in.
 */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Stop lib/config.mjs from reading a developer's local .env; preview mode, no database.
process.env.VERCEL = '1';
for (const k of ['ENQUIRY_MODE', 'SITE_ENV', 'EXCHANGE_RATES_URL', 'NODE_ENV', 'VERCEL_ENV']) delete process.env[k];

const core = await import('../lib/currency/core.mjs');
const { getRates, resetRates, snapshotFrom, FRESH_MS, USABLE_MS } = await import('../lib/currency/rates.mjs');
const { resetConfig } = await import('../lib/config.mjs');
const { handle } = await import('../lib/http/app.mjs');
const { currencyForCountry, parseRate, readRates, convertWhole, formatWhole, formatRateDate, BASE, CURRENCY_CODES } = core;

// A stand-in answer in Frankfurter's shape: the rand as the base (illustrative rates, never shown to anyone).
const FRANKFURTER = { amount: 1.0, base: 'ZAR', date: '2026-10-23', rates: { AUD: 0.0858, CAD: 0.08432, EUR: 0.05383, GBP: 0.04507, USD: 0.06025 } };
const ok = (body) => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
/** A stand-in for fetch that counts its calls and answers `reply()`. */
function upstream(reply = () => ok(FRANKFURTER)) {
  const f = async (url) => {
    f.calls.push(String(url));
    return reply();
  };
  f.calls = [];
  return f;
}
/** A stand-in for Cloudflare's Cache API (one entry is all the service uses). */
function fakeCache() {
  const store = new Map();
  return {
    store,
    async match(k) {
      const v = store.get(k);
      return v ? new Response(v) : undefined;
    },
    async put(k, res) {
      store.set(k, await res.text());
    },
  };
}

beforeEach(() => {
  resetRates();
  resetConfig();
  delete process.env.EXCHANGE_RATES_URL;
});

/* ---------- which currency ---------- */

test('country → currency: ZA, GB, US, the euro area, AU, CA, ZW; anything unknown, missing or malformed is the rand (the base)', () => {
  assert.equal(BASE, 'ZAR', 'Good Times prices in rand');
  const want = { ZA: 'ZAR', GB: 'GBP', US: 'USD', DE: 'EUR', FR: 'EUR', IE: 'EUR', HR: 'EUR', BG: 'EUR', AU: 'AUD', CA: 'CAD', ZW: 'USD' };
  for (const [cc, cur] of Object.entries(want)) assert.equal(currencyForCountry(cc), cur, cc);
  assert.equal(currencyForCountry(' za '), 'ZAR', 'trimmed and upper-cased');
  for (const unknown of ['XX', 'T1', 'JP', '', '  ', null, undefined, 42, {}]) assert.equal(currencyForCountry(unknown), BASE, String(unknown));
  assert.deepEqual(CURRENCY_CODES, ['ZAR', 'GBP', 'USD', 'EUR', 'AUD', 'CAD']);
});

/* ---------- exact arithmetic ---------- */

test('rates must be plain positive decimals: zero, negatives, exponents, NaN, Infinity and junk are refused', () => {
  assert.equal(parseRate('22.188'), 2218800000n);
  assert.equal(parseRate(1.3368), 133680000n);
  assert.equal(parseRate(1), 100000000n);
  for (const bad of [0, '0', '0.0', -1, '-1.2', '1e3', 1e21, NaN, Infinity, 'abc', '', null, undefined, {}, [], '1.123456789', ' 1 2 ']) assert.equal(parseRate(bad), null, String(bad));
  const r = readRates({ GBP: '0.04507', USD: 0, EUR: 'x', AUD: -2, CAD: 0.08432, XYZ: 5, ZAR: 99 });
  assert.deepEqual(Object.keys(r).sort(), ['CAD', 'GBP', 'ZAR'], 'only usable, supported rates; the rand always');
  assert.equal(r.ZAR, 100000000n, 'the base is always exactly 1, whatever an answer says');
});

test('conversion is exact and rounds half up to whole units, from the rand amount only', () => {
  const rates = readRates(FRANKFURTER.rates);
  assert.equal(convertWhole(6000, 'GBP', rates), 270, '6000 × 0.04507 = 270.42');
  assert.equal(convertWhole(4000, 'USD', rates), 241, '4000 × 0.06025 = 241');
  assert.equal(convertWhole(8500, 'EUR', rates), 458, '8500 × 0.05383 = 457.555');
  assert.equal(convertWhole(800, 'AUD', rates), 69, '800 × 0.0858 = 68.64');
  assert.equal(convertWhole(6000, 'ZAR', rates), 6000, 'the rand is never converted');
  // Where floating point fails: 25 × 1.14 is 28.499999999999996 as a float, exactly 28.5.
  assert.equal(Math.round(25 * 1.14), 28, 'the float trap is real');
  assert.equal(convertWhole(25, 'EUR', readRates({ EUR: 1.14 })), 29);
  assert.equal(convertWhole(50, 'USD', readRates({ USD: '1.15' })), 58, '57.5 exactly, not 57.49999999999999');
  assert.equal(convertWhole(2, 'EUR', readRates({ EUR: '1.25' })), 3, 'exactly .5 rounds up');
  assert.equal(convertWhole(1, 'EUR', readRates({ EUR: '2.4999' })), 2);
  for (const bad of [-1, 1.5, NaN, '47', null]) assert.equal(convertWhole(bad, 'GBP', rates), null, String(bad));
  assert.equal(convertWhole(6000, 'CAD', readRates({ GBP: '0.04507' })), null, 'no rate, no amount: never an invented conversion');
});

test('formatting: fixed symbols (the rand as R, not ZAR), en-GB grouping, no decimals; the rate date stays on one line', () => {
  assert.equal(formatWhole(1043, 'ZAR'), 'R1,043');
  assert.equal(formatWhole(10000, 'ZAR'), 'R10,000');
  assert.equal(formatWhole(63, 'USD'), 'US$63');
  assert.equal(formatWhole(56, 'EUR'), '€56');
  assert.equal(formatWhole(47, 'GBP'), '£47');
  assert.equal(formatWhole(90, 'AUD'), 'A$90');
  assert.equal(formatWhole(88, 'CAD'), 'CA$88');
  assert.equal(formatRateDate('2026-10-23'), '23 Oct 2026');
  assert.equal(formatRateDate('23/10/2026'), '');
});

/* ---------- the rate service ---------- */

test('Frankfurter is asked once; the snapshot is reused while fresh, and asked again after 12 hours', async () => {
  const f = upstream();
  const t0 = Date.parse('2026-10-25T08:00:00Z');
  const a = await getRates({ now: t0, fetchImpl: f, cache: null });
  assert.equal(a.date, '2026-10-23');
  assert.equal(a.rates.GBP, '0.04507');
  assert.equal(a.rates.ZAR, undefined, 'the base is not a rate');
  assert.equal(a.stale, false);
  assert.match(f.calls[0], /^https:\/\/api\.frankfurter\.dev\/v1\/latest\?base=ZAR&symbols=GBP,USD,EUR,AUD,CAD$/);
  for (let i = 0; i < 25; i++) await getRates({ now: t0 + 60_000 * i, fetchImpl: f, cache: null });
  assert.equal(f.calls.length, 1, 'never once per visitor or per product card');
  await getRates({ now: t0 + FRESH_MS + 1, fetchImpl: f, cache: null });
  assert.equal(f.calls.length, 2);
});

test('visitors arriving together while the rates are renewed share one call to Frankfurter', async () => {
  let release;
  const gate = new Promise((ok) => (release = ok));
  const f = upstream(() => gate.then(() => ok(FRANKFURTER)));
  const t0 = Date.parse('2026-10-25T08:00:00Z');
  const all = Promise.all(Array.from({ length: 20 }, () => getRates({ now: t0, fetchImpl: f, cache: null })));
  release();
  const results = await all;
  assert.equal(f.calls.length, 1);
  assert.ok(results.every((r) => r.rates.GBP === '0.04507'));
});

test('Frankfurter down: the last good snapshot (up to 7 days old) is used and marked stale; older than that, no rates at all', async () => {
  const t0 = Date.parse('2026-10-25T08:00:00Z');
  await getRates({ now: t0, fetchImpl: upstream(), cache: null });
  const down = upstream(() => {
    throw new TypeError('network down');
  });
  const stale = await getRates({ now: t0 + FRESH_MS + 1, fetchImpl: down, cache: null });
  assert.equal(stale.stale, true);
  assert.equal(stale.rates.GBP, '0.04507');
  assert.equal(await getRates({ now: t0 + USABLE_MS + 1, fetchImpl: down, cache: null }), null, 'too old: rand rather than a stale guess');
  resetRates();
  assert.equal(await getRates({ now: t0, fetchImpl: down, cache: null }), null, 'nothing ever fetched: no rates');
});

test('a malformed, zero or partial answer is never used as it stands', async () => {
  const t0 = Date.parse('2026-10-25T08:00:00Z');
  for (const body of [{ base: 'GBP', date: '2026-10-23', rates: { ZAR: 22.188 } }, { base: 'ZAR', rates: { GBP: 0.045 } }, { base: 'ZAR', date: '2026-10-23', rates: { GBP: 0, USD: -1 } }, 'nonsense', null]) {
    resetRates();
    assert.equal(await getRates({ now: t0, fetchImpl: upstream(() => ok(body)), cache: null }), null, JSON.stringify(body));
  }
  resetRates();
  assert.equal(await getRates({ now: t0, fetchImpl: upstream(() => new Response('busy', { status: 503 })), cache: null }), null);
  resetRates();
  const partial = await getRates({ now: t0, fetchImpl: upstream(() => ok({ base: 'ZAR', date: '2026-10-23', rates: { GBP: 0.04507, CAD: 0 } })), cache: null });
  assert.deepEqual(Object.keys(partial.rates), ['GBP'], 'a currency without a usable rate is left out, not guessed');
  assert.deepEqual(snapshotFrom({ base: 'ZAR', date: '2026-10-23', rates: { USD: 0.06025 } }, 5), { date: '2026-10-23', rates: { USD: '0.06025' }, fetchedAt: 5 });
});

test('the Cache API shares a snapshot between isolates; a cache that fails is ignored', async () => {
  const t0 = Date.parse('2026-10-25T08:00:00Z');
  const cache = fakeCache();
  const f = upstream();
  await getRates({ now: t0, fetchImpl: f, cache });
  assert.equal(cache.store.size, 1);
  resetRates(); // a new isolate: empty memory
  const again = await getRates({ now: t0 + 3600_000, fetchImpl: f, cache });
  assert.equal(again.rates.USD, '0.06025');
  assert.equal(f.calls.length, 1, 'the second isolate read the shared cache instead of Frankfurter');
  resetRates();
  const broken = { match: async () => { throw new Error('cache down'); }, put: async () => { throw new Error('cache down'); } };
  assert.equal((await getRates({ now: t0, fetchImpl: upstream(), cache: broken })).rates.GBP, '0.04507');
});

test('EXCHANGE_RATES_URL=off shows every price in rand without asking anyone; production allows only the default or off', async () => {
  process.env.EXCHANGE_RATES_URL = 'off';
  resetConfig();
  const f = upstream();
  assert.equal(await getRates({ fetchImpl: f, cache: null }), null);
  assert.equal(f.calls.length, 0);
  const { config } = await import('../lib/config.mjs');
  process.env.SITE_ENV = 'production';
  process.env.EXCHANGE_RATES_URL = 'https://rates.example.com/latest';
  resetConfig();
  assert.throws(() => config.enabled, /EXCHANGE_RATES_URL may only be "off" in production/);
  delete process.env.SITE_ENV;
});

/* ---------- GET /api/currency ---------- */

const ask = async (ctx = {}, headers = {}) => {
  const res = await handle(new Request('http://test.local/api/currency', { headers }), { rateOptions: { fetchImpl: upstream(), cache: null }, ...ctx });
  return { res, body: await res.json() };
};

test('GET /api/currency: the visitor’s currency from Cloudflare’s country, the rates, and nothing about the visitor', async () => {
  const cases = { ZA: 'ZAR', GB: 'GBP', US: 'USD', DE: 'EUR', AU: 'AUD', ZW: 'USD', CA: 'CAD', XX: 'ZAR', T1: 'ZAR' };
  for (const [country, currency] of Object.entries(cases)) {
    const { res, body } = await ask({ country });
    assert.equal(res.status, 200);
    assert.equal(body.currency, currency, country);
  }
  const { res, body } = await ask({ country: 'GB' });
  assert.deepEqual(Object.keys(body).sort(), ['base', 'currency', 'date', 'ok', 'rates', 'source', 'stale']);
  assert.equal(body.base, 'ZAR');
  assert.equal(body.rates.GBP, '0.04507');
  assert.equal(JSON.stringify(body).includes('GB"'), false, 'the country itself is not returned');
  assert.equal(res.headers.get('cache-control'), 'private, max-age=3600', 'never shared between visitors by a cache');
});

test('missing Cloudflare metadata: the CF-IPCountry header, else the rand; never an error', async () => {
  assert.equal((await ask({}, { 'cf-ipcountry': 'AU' })).body.currency, 'AUD');
  assert.equal((await ask({})).body.currency, 'ZAR');
  assert.equal((await ask({ country: undefined }, { 'cf-ipcountry': '<script>' })).body.currency, 'ZAR');
});

test('no rates available: still 200, the detected currency, and rates null (the page shows rand)', async () => {
  const down = upstream(() => {
    throw new TypeError('offline');
  });
  const res = await handle(new Request('http://test.local/api/currency'), { country: 'US', rateOptions: { fetchImpl: down, cache: null } });
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.currency, 'USD');
  assert.equal(body.rates, null);
});

test('the Pages adapter passes Cloudflare’s request.cf.country to the API', async () => {
  const { onRequest } = await import('../functions/api/[[path]].js');
  process.env.EXCHANGE_RATES_URL = 'off';
  resetConfig();
  const request = new Request('https://staging.good-times-in-cape-town.pages.dev/api/currency');
  Object.defineProperty(request, 'cf', { value: { country: 'GB' } });
  const body = await (await onRequest({ request, env: {} })).json();
  assert.equal(body.currency, 'GBP');
  assert.equal(body.rates, null);
});
