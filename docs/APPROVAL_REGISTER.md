# Approval register

Everything that is still waiting for the owner of Good Times in Cape Town, as of 5 Nov 2026. Until each item is settled, the site does the safe thing shown in the last column. Nothing here blocks staging. Only the items marked **release** must be settled before a production release, and the release itself needs the owner's explicit approval (A1).

`npm run` commands and file paths refer to this repository. `scripts/release-gate.mjs` checks the items it can (B1–B5).

## A. Release and infrastructure

| # | Decision | What it unlocks | Until then |
|---|---|---|---|
| A1 **release** | Approve the production release after reviewing staging (<https://staging.good-times-in-cape-town.pages.dev>). Recorded as `RELEASE` in `scripts/cloudflare/project.mjs` (date, name) | `deployTarget('main')` and `scripts/cloudflare/build.mjs production` | Production refuses to deploy; only staging exists |
| A2 **release** | Approve the domain cutover: point goodtimesincapetown.co.za at the Pages project. The domain serves the current website and is not in this Cloudflare account. Decide where DNS is managed, and which host is canonical: the current site uses **www**; the project defaults to the apex with www redirected to it (`DOMAIN` in `project.mjs`) | `setup.mjs domain --apply` (custom domains, HTTPS, redirect) | `domain`, `email` and `resend` refuse `--apply`; no DNS changes |
| A3 **release** | Check the current website's full list of addresses before the cutover. The ten tour pages, the Garden Route tour and the airport transfer (`/tour/<slug>/`) already redirect to their new pages (`src/data/redirects.mjs`, 26 rules); any other page with traffic or links (about, contact, blog, …) should be added | No broken links or lost search ranking after the move | Those 26 redirects only |
| A4 | Go live with the enquiry system: create Good Times' own database (Neon), a Resend account with goodtimesincapetown.co.za verified as a sending domain (DNS records, so part of A2), and the three secrets (`DATABASE_URL`, `RESEND_API_KEY`, `ENQUIRY_SIGNING_SECRET`) in the Pages project. Confirm the inbox for new requests (planned: info@goodtimesincapetown.co.za) and the staff who may use the bookings dashboard (`ADMIN_EMAILS`). Then a controlled live test on staging, sending only to test inboxes | Bookings arrive in the inbox with a GT- reference; the visitor gets an acknowledgement | `ENQUIRY_MODE=preview` everywhere: the form validates and reviews, then says plainly that nothing was sent |
| A5 | Rotate the Cloudflare API token that was pasted in chat for this work, and use a new one scoped to Account › Cloudflare Pages: Edit for this account only | Least-privilege access | The pasted token stays valid; it was never written to the repository |
| A6 | Optional: visit statistics (Cloudflare Web Analytics, loaded only after a visitor allows it). Needs a site token | Visitor numbers | No analytics; the consent card is not shown |

## B. Legal (release gate)

| # | Decision | Until then |
|---|---|---|
| B1 **release** | Approve the Privacy Notice (`src/pages/privacy.mjs`) and set its effective date (`site.legal.privacyApproved`, `site.legal.effective`) | The page carries a draft notice |
| B2 **release** | Approve the Terms & Conditions (`src/pages/terms.mjs`, Good Times' published text with two adaptations) and settle their open points: the cancellation notice and any charges for each kind of booking; payment methods, any deposit and when payment is due (`OPEN_POINTS`) | Terms are noindex, preview-only, marked draft |
| B3 **release** | Registered business name and registration number (`site.legal.entity`) | Not shown |
| B4 **release** | The Information Officer's name and email under POPIA (`site.legal.informationOfficer`) | Not shown |
| B5 **release** | How long enquiries are kept (`site.legal.retention`) | Not shown |

## C. Contacts

| # | Decision | Until then |
|---|---|---|
| C1 | Is +27 72 376 8432 on WhatsApp? The current site lists it for calls only (`site.contact.whatsapp`) | Call and email only; the phone bar offers Call |
| C2 | Office hours and a response time to publish (`site.contact.hours`, `responseTime`) | Not shown |
| C3 | A second public email, if any (`site.contact.emailGeneral`) | info@ only |
| C4 | Show the YouTube channel too? It is recorded in `site.social`, but the footer shows only the networks the template has a brand mark for (Instagram, Facebook, Tripadvisor) | Not shown |

## D. Tours, prices and booking rules

Every product, price and rule shown comes from Good Times' own pages (read 5 Nov 2026). These points could not be settled from them.

| # | Point | Where it shows |
|---|---|---|
| D1 | The Peninsula, City, Winelands and Township tours and the airport transfer say "Max 4" yet also list a 5–8 guest rate. Confirm the group sizes and vehicles | Both tiers are shown as published |
| D2 | Private Cape Town Experience: its itinerary, inclusions and usual length ("Itinerary details coming soon" on the current site) | Price and group size only |
| D3 | Shark Cage Diving: the operator to name (the boat in Good Times' photograph is Marine Dynamics) | Operator not named; price on enquiry |
| D4 | Quad Biking: where rides take place | "Dunes or off-road trails"; price on enquiry |
| D5 | Sky Diving: the drop zone and operator, and licensed media | Artwork panel; price on enquiry |
| D6 | Garden Route Private Tour: the rate for 5–8 guests; whether Good Times arranges accommodation | R8,500 per day for 1–4; 5–8 on enquiry; accommodation not included |
| D7 | Airport transfer: are child seats available? | Not mentioned |
| D8 | Whale Watching and Cape Agulhas: prices | "Price on enquiry" |
| D9 | Booking rules used by the availability check: 2 vehicles, 24 hours' notice, transfers 04:00–23:00, holds of 2 h (airport) and 3 h (other) (`BOOKING_RULES`) | Working defaults; they only matter once A4 is live |
| D10 | Approximate prices in other currencies beside the rand price (European Central Bank rates via Frankfurter, labelled as approximate) | Shown; set `EXCHANGE_RATES_URL=off` to show rand only |

## P. Photographs (details: `docs/RIGHTS_REGISTER.md`)

| # | Point | Until then |
|---|---|---|
| P1 | Confirm that the identifiable guests in the business's own photographs (Tripadvisor uploads and website photographs) agreed to marketing use, as the Drive rights log asks; or name any to swap for a scenery shot | Used, as approved in the Drive rights log of 3 Nov 2026 |
| P2 | Who took the eight photographs from Drive › Website Images, and the guests' consent where people appear | Used as supplied by the owner |
| P3 | Photographs for Cape Agulhas and Sky Diving, and an actual whale photograph | The approved mountain-trail artwork; Hermanus photographs for whale watching |
| P4 | Photographs with children or possible minors are not used: four were withdrawn on 5 Nov 2026. They can return only with written parental consent | Not used |
| P5 **release** | The home hero is AI-generated (basis G): the café scene of five friends and the six pictures in its phone. Nothing presents them as guests, reviews or Good Times photographs, and the photo credits say they are AI-generated illustrations; consumer and advertising rules still expect an operator not to suggest real customers where there are none. Approve AI-generated people on the home page, or supply real client photographs (with their consent) to replace them, as the supplied package itself advises before launch | On staging for review only (5 Nov 2026), not in production; credited as AI-generated |
| P6 | Three of the phone's pictures need a look against how the tours really run: Boulders Beach shows a penguin within arm's reach of the group (visitors are asked to keep their distance and never touch or feed them); Camps Bay is a drive-by on the Peninsula day, so a beach stop is on request; no itinerary lists a sunset lookout (shown as a Private Cape Town Experience). Keep, swap or re-caption | Captioned by place, each tied to the tour it fits (`src/data/phone-gallery.json`) |

## R. Reviews

| # | Point | Until then |
|---|---|---|
| R1 | Recheck the Tripadvisor rating (5.0), review count (264) and breakdown before release, and approve the ten review cards: short summaries in our own words, each linked to the review, with the reviewer's public Tripadvisor name. No reviewer's text is copied | Shown with the date they were read |
| R2 | Reviewers' profile photos, added at the owner's request (5 Nov 2026). Supply each reviewer's own Tripadvisor profile photo as a square file (168 px or larger) in `src/assets/img/reviewers/`, named: `seamus0314.jpg`, `travelangeldani.jpg`, `lydia-w.jpg`, `thea-h.jpg`, `meena301.jpg`, `dave-f.jpg`, `kashou106.jpg`, `andyjanec.jpg`. They cannot be collected automatically: Tripadvisor loads them with scripts and blocks automated browsing. These are personal images of private individuals; the Drive research notes advised against using them, and the reviewers' consent is not recorded. Confirm you accept that, or ask the reviewers | Each card keeps its illustrated avatar (home) or initials (reviews page) until its file is there |

## S. Design and copy

| # | Point | Until then |
|---|---|---|
| S1 | The typeface: Plus Jakarta Sans for headings, Inter for text (the logo pack names no font) | In use |
| S2 | The palette, taken from the approved logo: navy `#102E42`, Good Times green (`#059A35` in the logo, `#056A2B` for text and buttons, for contrast), a sunshine accent | In use |
| S3 | The rewritten copy on every page, in Good Times' voice, from its own published facts | In use; corrections welcome |
| S4 | The home hero, "frozen moment" (5 Nov 2026, replacing the Cape Point headland photograph): the supplied café film held still except for the cloud over Table Mountain and the sea; one call to action bottom left, **Good Times start Here!** (to the tours, worded and capitalised as in the brief); the phone gallery "Cape Town Memories" bottom right, swiping on its own. The earlier static-photo brief's headline, supporting line and Explore Tours button give way to the later brief, which asks for one call to action and no paragraph. Nothing covers a face at any size (`node qa/hero.mjs`) | On staging for review (5 Nov 2026); not in production |
