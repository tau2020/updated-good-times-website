/**
 * Good Times' prices: the one place a rate is set. Every price on the site is read from here: the tour, transfer
 * and multi-day cards, each page's booking card and its group tiers, the phone's price bar, the booking form's
 * indicative total (assets/js/enquiry.js), the structured data (JSON-LD offers) and the text that names a price
 * (the transfers page's description, the home page's airport line, the FAQ).
 *
 * Rules (the owner's pricing update of 7 Nov 2026):
 *  - In rand (ZAR), per private group or per trip: never per person. Children count towards a group's size.
 *  - Only the group sizes listed are priced. A larger group is never given an amount: the booking form says we
 *    confirm a quote, and the request goes through as before.
 *  - `startingFrom: true` marks a tier whose amount is a starting price ("From R6,000"): the booking form's total
 *    and the structured data keep the "From".
 *  - A rate's `from` is its lowest tier: the "From R…" on cards and booking cards.
 *
 * Where each rate comes from: the four marked APPROVED are the owner's approved prices of 7 Nov 2026 (the surgical
 * pricing update); the others are the rates published on goodtimesincapetown.co.za (read on 5 Nov 2026), which that
 * update left as they were. A package with no rate here is priced on enquiry (`price: null` in its data).
 */

import { formatWhole } from '../assets/js/currency-core.js';

/** A tier for `min`–`max` guests ("1–4 guests"). Tiers run on from one another, the first from one guest. */
const guests = (min, max, amount, extra = {}) => ({ label: `${min}–${max} guests`, max, amount, ...extra });

export const RATES = {
  // APPROVED, 7 Nov 2026
  'cape-town-city-private-tour': { unit: 'per group', tiers: [guests(1, 4, 4500), guests(5, 8, 9000)] },
  'township-private-tour': { unit: 'per group', tiers: [guests(1, 4, 4500), guests(5, 8, 9000)] },
  'private-cape-town-experience': { unit: 'per group', tiers: [guests(1, 20, 6000, { startingFrom: true })] },
  'airport-private-transfer': { unit: 'per trip', tiers: [guests(1, 4, 850), guests(5, 8, 1700)] },
  // As published on goodtimesincapetown.co.za (5 Nov 2026), unchanged
  'cape-peninsula-private-tour': { unit: 'per group', tiers: [guests(1, 4, 6000), guests(5, 8, 12000)] },
  'cape-winelands-private-tour': { unit: 'per group', tiers: [guests(1, 4, 6000), guests(5, 8, 12000)] },
  'garden-route-private-tour': { unit: 'per day', tiers: [guests(1, 4, 8500)] },
};

/** The `price` a tour, transfer or package carries: its rate in rand, its lowest amount (`from`) and its own note. */
export function priceFor(slug, note = '') {
  const rate = RATES[slug];
  if (!rate) throw new Error(`pricing.mjs has no rate for "${slug}"`);
  const tiers = rate.tiers.map((t) => ({ ...t }));
  return { from: Math.min(...tiers.map((t) => t.amount)), currency: 'ZAR', unit: rate.unit, tiers, note };
}

/** The largest group a rate prices (20 for the Private Cape Town Experience), for the copy that states it. */
export const groupMax = (slug) => RATES[slug].tiers.at(-1).max;

/**
 * "From R850 per trip for 1–4 guests": a price's lowest tier in words, in rand, for text that is never converted
 * (a meta description, the home page's line under the airport transfer).
 */
export const fromLine = (p) => `From ${formatWhole(p.from, p.currency)} ${p.unit} for ${p.tiers[0].label}`;
