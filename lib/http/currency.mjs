/**
 * GET /api/currency: the visitor's likely currency and today's display rates,
 * in one small answer the page keeps for the session (assets/js/currency.js).
 *
 * The country is Cloudflare's reading of the connection (request.cf.country,
 * passed in by the Pages adapter, or the CF-IPCountry header). It decides the
 * currency and is not returned, stored or logged. No database: previews and
 * production answer alike. Display only: no amount here is ever payable.
 */
import { json } from './response.mjs';
import { BASE, currencyForCountry } from '../currency/core.mjs';
import { getRates } from '../currency/rates.mjs';

export async function getCurrency(request, ctx = {}) {
  const raw = String(ctx.country || request.headers.get('cf-ipcountry') || '');
  const snap = await getRates(ctx.rateOptions);
  return json(
    200,
    {
      ok: true,
      base: BASE,
      currency: currencyForCountry(/^[A-Za-z]{2}$/.test(raw) ? raw : ''),
      rates: snap ? snap.rates : null,
      date: snap ? snap.date : null,
      stale: Boolean(snap?.stale),
      source: 'European Central Bank reference rates, via Frankfurter',
    },
    // Per visitor (their country), so never shared by a cache; the browser may reuse it for an hour.
    { 'Cache-Control': 'private, max-age=3600' },
  );
}
