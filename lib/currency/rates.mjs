/**
 * Exchange rates from the rand (ZAR), for display only: the European Central Bank's
 * reference rates through Frankfurter (https://frankfurter.dev: free, no key,
 * caching encouraged). The ECB publishes once each working day, so a snapshot
 * is fresh for 12 hours, and the last good one stays usable for 7 days if
 * Frankfurter cannot be reached. Older than that, there are no rates and the
 * site shows its rand prices, never an invented conversion.
 *
 * Two caches, so Frankfurter is asked at most about twice a day however many
 * visitors arrive: this isolate's memory, and Cloudflare's Cache API where the
 * runtime has one (Pages Functions), which other isolates in the same data
 * centre share. Neither ever holds anything about a visitor.
 */
import { config } from '../config.mjs';
import { BASE, CURRENCY_CODES, readRates } from './core.mjs';

export const FRESH_MS = 12 * 3600 * 1000;
export const USABLE_MS = 7 * 24 * 3600 * 1000;
const TIMEOUT_MS = 4000;
const CACHE_KEY = 'https://rates.cache.goodtimesincapetown.invalid/zar';

let memo = null;
let inflight = null;

/** Test helper: forget the in-memory snapshot. */
export function resetRates() {
  memo = null;
  inflight = null;
}

/** Frankfurter's URL for today's ZAR rates to every supported currency. */
export function ratesUrl() {
  const quotes = CURRENCY_CODES.filter((c) => c !== BASE).join(',');
  return `${config.ratesUrl}?base=${BASE}&symbols=${quotes}`;
}

/**
 * A snapshot { date, rates: { CODE: "decimal" }, fetchedAt } from Frankfurter's
 * JSON, or null unless it is ZAR-based, dated and has at least one usable rate.
 * Rates stay decimal strings: readRates() turns them into exact integers.
 */
export function snapshotFrom(body, fetchedAt) {
  if (!body || body.base !== BASE || !/^\d{4}-\d{2}-\d{2}$/.test(body.date || '')) return null;
  const usable = readRates(body.rates);
  const rates = {};
  for (const code of Object.keys(usable)) if (code !== BASE) rates[code] = String(body.rates[code]);
  return Object.keys(rates).length ? { date: body.date, rates, fetchedAt } : null;
}

async function fromCache(cache) {
  try {
    const hit = await cache?.match(CACHE_KEY);
    return hit ? await hit.json() : null;
  } catch {
    return null;
  }
}

async function toCache(cache, snap) {
  try {
    await cache?.put(CACHE_KEY, new Response(JSON.stringify(snap), { headers: { 'content-type': 'application/json', 'cache-control': `max-age=${USABLE_MS / 1000}` } }));
  } catch {
    /* no Cache API here (local, or a pages.dev address): memory alone */
  }
}

async function fromFrankfurter(fetchImpl, now) {
  const res = await fetchImpl(ratesUrl(), { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`Frankfurter answered ${res.status}`);
  const snap = snapshotFrom(await res.json(), now);
  if (!snap) throw new Error('Frankfurter sent no usable rates');
  return snap;
}

/**
 * The rates to show now: { date, rates, fetchedAt, stale } or null.
 * `stale` means Frankfurter could not be reached and an older (≤ 7 days)
 * snapshot is in use. Never throws.
 */
export async function getRates({ now = Date.now(), fetchImpl = fetch, cache = globalThis.caches?.default } = {}) {
  if (config.ratesUrl === 'off') return null;
  const age = (s) => now - Number(s?.fetchedAt || 0);
  if (memo && age(memo) < FRESH_MS) return { ...memo, stale: false };
  const cached = await fromCache(cache);
  if (cached && age(cached) < FRESH_MS && (!memo || cached.fetchedAt > memo.fetchedAt)) {
    memo = cached;
    return { ...memo, stale: false };
  }
  try {
    // Requests that arrive together while the snapshot is being renewed share one call to Frankfurter.
    inflight ??= fromFrankfurter(fetchImpl, now).finally(() => {
      inflight = null;
    });
    memo = await inflight;
    await toCache(cache, memo);
    return { ...memo, stale: false };
  } catch (err) {
    const last = [memo, cached].filter((s) => s && age(s) < USABLE_MS).sort((a, b) => b.fetchedAt - a.fetchedAt)[0];
    console.error(`[rates] ${err.message}${last ? `; using the snapshot of ${last.date}` : '; showing rand'}`);
    if (!last) return null;
    memo = last;
    return { ...last, stale: true };
  }
}
