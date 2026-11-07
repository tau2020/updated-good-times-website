# Pricing update: the owner's approved prices of 7 Nov 2026

A pricing-only change. No design, motion, photograph or other package was changed. Every check here ran on the
deployed Cloudflare preview: deployment `2ae718d8`, built from `53bb315`, served at
https://naturally-preview.good-times-in-cape-town.pages.dev. Production is untouched.

## 1. The seven approved entries, as the site now shows them

| Package | Guests | Approved | Where the site shows it | Match |
|---|---|---|---|---|
| City Tour | 1–4 | R4,500 | Tours list and related-tour cards ("From R4,500 per group"), the tour's booking card and its tier list, the booking form's estimate (1 to 4 guests), structured data | ✓ |
| City Tour | 5–8 | R9,000 | The tour's tier list, the booking form's estimate (5 to 8 guests), structured data | ✓ |
| Township Tour | 1–4 | R4,500 | The same places as the City Tour | ✓ |
| Township Tour | 5–8 | R9,000 | The same places as the City Tour | ✓ |
| Private Cape Town Experience | 1–20 | From R6,000 | Cards ("From R6,000 per group"), its booking card ("From R6,000, per group of 1–20 guests"), the estimate ("From R6,000 for your private group of 12 · the rate for 1–20 guests"), structured data ("From R6,000 per group of 1–20 guests", minimum price 6000), and its group size: "up to 20" in its introduction, highlights, meta description and the FAQ | ✓ |
| Airport Transfer | 1–4 | R850 | The transfers page ("From R850, per trip, 1–4 guests" and "1–4 guests: R850"), its meta description, the home page's airport line ("From R850 per trip for 1–4 guests") | ✓ |
| Airport Transfer | 5–8 | R1,700 | The transfers page ("5–8 guests: R1,700. Prices per trip, not per person.") | ✓ |

Every price is per private group or per trip, never per person. A group larger than the last priced size gets no
amount: the booking form says "Groups of more than 8 (or 20): we'll confirm your quote", and the request goes on as
before (checked for 9 and 21 guests).

## 2. Changed files and the exact corrections

| File | Change |
|---|---|
| `src/data/pricing.mjs` (new) | The one place a rate is set: the four approved rates, and the three others moved here unchanged. A starting price is marked `startingFrom` |
| `src/data/tours.mjs` | City and Township: R4,000 / R8,000 → **R4,500 / R9,000**. Private Cape Town Experience: "From R3,500, up to 10 guests" → **"From R6,000, 1–20 guests"**, and "for groups of up to ten" → **"up to 20"** in its introduction, highlights and meta description. The Peninsula and Winelands rates read from `pricing.mjs`, unchanged |
| `src/data/transfers.mjs` | Airport Transfer: R800 / R1,600 → **R850 / R1,700** per trip |
| `src/data/packages.mjs` | The Garden Route rate reads from `pricing.mjs` (R8,500 per day, unchanged) |
| `src/pages/transfers.mjs` | Meta description "From R800 per trip for 1–4 guests." → **"From R850 per trip for 1–4 guests."**, now taken from the rate |
| `src/pages/index.mjs` | The airport way's line, **"From R850 per trip for 1–4 guests"**: its amount and group size now both come from the rate (the size was typed in) |
| `src/data/faq.mjs` | "Are prices per person or per group?": adds **"the Private Cape Town Experience has one rate for a group of up to 20"** |
| `src/partials/ui.mjs`, `src/pages/tours.mjs` | Structured data: **one Offer per group tier** (with the group sizes it prices) instead of the lowest tier alone; the Experience's offer keeps its "From" |
| `src/assets/js/enquiry.js` | The booking estimate keeps **"From"** for a starting price (the Experience) |
| `test/pricing.test.mjs` (new) | The owner's table, exactly, and every place it is shown (8 tests) |
| `test/legal-approved.test.mjs`, `test/e2e/enquiry.spec.mjs`, `test/e2e/currency.spec.mjs` | The new amounts; a new browser test of the estimate for every group size |
| `docs/APPROVAL_REGISTER.md` | D11 records the approval; D1 narrowed to what is still open |
| `qa/pricing-audit.mjs` (new), `qa/pricing/2026-11-07/` | The cloud audit and its evidence (§4) |

The built site differs from the previous preview in exactly 10 pages and `enquiry.js`: the tours list, the five tour
pages that show these prices (the City, Township, Experience, Peninsula and Winelands pages, which carry related-tour
cards), the transfers page, the home page, the FAQ and the booking page.

## 3. Conflicting or ambiguous references found

1. **The Experience's group size.** The site said "for groups of up to ten" (three times) and priced "up to 10 guests";
   the approved range is 1–20. Corrected to "up to 20".
2. **The FAQ** said "Our published rates are for a private group of one to four guests, with a second rate for five to
   eight on most day tours", which does not describe the Experience's single rate. One clause added.
3. **Two copies of the airport price typed into pages**: the transfers page's description ("From R800") and the home
   page's "1–4 guests". Both are now read from the rate, so they cannot drift again.
4. **Structured data** showed only the lowest tier, and gave the Experience's R3,500 as a fixed price. It now lists
   each tier and marks the Experience's as a starting price. This template change also lists the Peninsula's and
   Winelands' published 5–8 rates in their structured data; their prices are unchanged.
5. **"Max 4" against a 5–8 rate** on the official tour pages: settled for the City and Township tours and the airport
   transfer by the approval. Still open (register D1): the vehicle for a 5–8 transfer, and the Peninsula and Winelands
   group sizes.
6. **The phone price bar on tour pages** ("From R4,500 per group") is not shown on this build: while a direct line is
   verified, the contact bar (Call / Plan My Day) takes its place on phones, as before. Its text is correct and tested.
7. **The transfer request form shows no amount** ("We'll confirm your quote"), as before. It was left as it is; an
   estimate could be added if you want one.
8. If prices were ever switched off (`SHOW_INDICATIVE_PRICES=false`), the tour pages' structured data would still
   carry them. This was already the case and was not changed; prices are shown on this build.
9. **Not changed** (outside the update): the Cape Peninsula and Winelands tours (R6,000 for 1–4, R12,000 for 5–8), the
   Garden Route (R8,500 per day for 1–4) and every activity priced on enquiry.

## 4. Tests and build (on the deployed preview unless stated)

| Check | Result |
|---|---|
| `npm test` (repository) | **323 / 323** (315 before, plus the 8 pricing tests) |
| `npm run check`, `npm run guard` | 25 pages, no problems; brand guard clean |
| Smoke check, `2ae718d8` and the alias | **23 / 23** on both (the first run on the deployment, seconds after it went up, had one failure; three runs since: 23 / 23) |
| Browser suites `currency.spec` and `enquiry.spec` (desktop and Pixel 7) | **64 passed, 0 failed**, 18 skipped (they need a live build, as before) |
| `qa/pricing-audit.mjs` | **All checks passed.** 24 pages at desktop and phone width, 44 prices on desktop, each matched to its package and the approved table; no retired amount anywhere (cards, text, meta descriptions, structured data); no "per person"; 24 booking estimates (City and Township 1–9 guests, Experience 1, 2, 10, 19, 20 and 21), each correct, and the 9- and 21-guest requests go on; the transfer form shows no amount |
| Phones at 320, 360, 390 and 430 px | No horizontal overflow and **no price clipped** on the tours list, the three tour pages, the transfers page and the booking estimates; before/after captures of every price area in `qa/pricing/2026-11-07/<width>/` (the home page's airport line shows from 48em, so it is captured at 1440) |

## 5. Preview

https://naturally-preview.good-times-in-cape-town.pages.dev (deployment `2ae718d8`). Nothing was merged or released.
