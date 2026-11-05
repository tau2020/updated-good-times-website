/* Good Times in Cape Town — currencies: which one a visitor sees, and exact conversion.
   One file, two consumers:
     · the browser, as an ES module imported by assets/js/currency.js
     · Node, re-exported by lib/currency/core.mjs for the API (/api/currency)
   so the page and the server can never disagree about a currency or a rate.

   The authoritative prices are Good Times' own published rates in South
   African rand (src/data/tours.mjs, packages.mjs, transfers.mjs), the currency
   every booking is charged in. Every other currency is a display conversion of
   those ZAR amounts, made once, never from an amount that was itself converted.
   Nothing here is a price anyone pays. */

/** The currency every price on the site is written in. */
export const BASE = 'ZAR';

/**
 * The currencies a visitor can choose, in the selector's order, with the
 * symbol shown before an amount. Symbols are fixed here rather than taken
 * from Intl, which writes the rand as "ZAR" and differs between browsers.
 */
export const CURRENCIES = Object.freeze({
  ZAR: { symbol: 'R', name: 'South African rand' },
  GBP: { symbol: '£', name: 'British pounds' },
  USD: { symbol: 'US$', name: 'US dollars' },
  EUR: { symbol: '€', name: 'euros' },
  AUD: { symbol: 'A$', name: 'Australian dollars' },
  CAD: { symbol: 'CA$', name: 'Canadian dollars' },
});
export const CURRENCY_CODES = Object.freeze(Object.keys(CURRENCIES));

/** "ZAR (R)": how a currency is named in the selector. */
export const currencyLabel = (code) => `${code} (${CURRENCIES[code]?.symbol ?? code})`;

/**
 * A visitor's likely currency from their country (ISO 3166-1 alpha-2, as
 * Cloudflare reports it). Extend here. The euro: the 21 euro-area members
 * (Bulgaria from 1 Jan 2026) and the states that use it by agreement.
 */
const EURO = ['AT', 'BE', 'BG', 'CY', 'DE', 'EE', 'ES', 'FI', 'FR', 'GR', 'HR', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PT', 'SI', 'SK', 'AD', 'MC', 'SM', 'VA'];
export const COUNTRY_CURRENCY = Object.freeze({
  ZA: 'ZAR',
  GB: 'GBP',
  US: 'USD',
  ZW: 'USD',
  AU: 'AUD',
  CA: 'CAD',
  ...Object.fromEntries(EURO.map((c) => [c, 'EUR'])),
});

/** The currency for a country code; the base currency for anything unknown, missing or malformed (XX, T1, ''). */
export function currencyForCountry(country) {
  const cc = typeof country === 'string' ? country.trim().toUpperCase() : '';
  return COUNTRY_CURRENCY[cc] || BASE;
}

export const isCurrency = (code) => typeof code === 'string' && Object.prototype.hasOwnProperty.call(CURRENCIES, code);

/* ---------- exact arithmetic ----------
   Rates are carried as integers scaled by 10^8 (BigInt), amounts as integers,
   so 47 × 22.188 is 1042.836 exactly, never 1042.8359999. */
const SCALE = 10n ** 8n;
const RATE_RE = /^(\d{1,9})(?:\.(\d{1,8}))?$/;

/**
 * A rate as a scaled BigInt, or null unless it is a plain positive decimal
 * (a number or its string form, at most 8 decimals). Zero, negatives,
 * exponents, NaN, Infinity and anything else are refused.
 */
export function parseRate(value) {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'number' && !Number.isFinite(value)) return null;
  const m = RATE_RE.exec(String(value).trim());
  if (!m) return null;
  const scaled = BigInt(m[1]) * SCALE + BigInt((m[2] || '').padEnd(8, '0'));
  return scaled > 0n ? scaled : null;
}

/**
 * Validated rates from the base currency: { CODE: scaledBigInt } for each
 * supported currency with a usable rate, the base always 1. A currency without
 * one is left out, so it shows in rand rather than with an invented amount.
 */
export function readRates(raw) {
  const out = { [BASE]: SCALE };
  if (!raw || typeof raw !== 'object') return out;
  for (const code of CURRENCY_CODES) {
    if (code === BASE) continue;
    const r = parseRate(raw[code]);
    if (r !== null) out[code] = r;
  }
  return out;
}

/**
 * A whole-unit base (ZAR) amount in `currency`, rounded half up to whole units
 * (prices here are shown without decimals). null when the
 * amount is not a non-negative whole number or there is no rate for it.
 */
export function convertWhole(amount, currency, rates) {
  if (!Number.isSafeInteger(amount) || amount < 0) return null;
  if (currency === BASE) return amount;
  const rate = rates?.[currency];
  if (typeof rate !== 'bigint') return null;
  const exact = BigInt(amount) * rate; // in units × 10^8
  return Number((exact + SCALE / 2n) / SCALE);
}

/** "R6,000", "US$330", "€300": a whole amount with its fixed symbol and en-GB grouping. */
export function formatWhole(amount, currency) {
  return `${CURRENCIES[currency]?.symbol ?? `${currency} `}${new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 }).format(amount)}`;
}

/** "23 Oct 2026" (non-breaking) from YYYY-MM-DD, for the note under the selector. */
export function formatRateDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return '';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${Number(m[3])}\u00a0${months[Number(m[2]) - 1]}\u00a0${m[1]}`; // kept on one line
}
