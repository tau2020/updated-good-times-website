# The Search Console audit of 8 Nov 2026, implemented

8 Nov 2026 · branch `optimisation/gsc-audit-seo-enhancements`, from the head of PR #4 (`remediation/historical-seo-preservation` at `d0cb62c`, unmerged) · a stacked pull request into that branch.

**Scope kept.** Repository only, nothing deployed. Nothing was changed on the live domain, its DNS, WordPress, cPanel, email, the Pages project's domains, the enquiry configuration (`ENQUIRY_MODE` stays `preview` in every environment) or Search Console. The only requests to a live system were reads: GET requests to the WordPress site's public addresses, to record what it answers today (section 6). No GA4, no Tag Manager, and no new script, stylesheet, font or image.

## Executive summary

The Search Console audit of 8 Nov 2026 found the site's non-branded tour searches earning impressions but almost no clicks. Its figures stay in the owner's private files, as the historical URL work's own figures do: the repository is public, and `test/legacy-registry.test.mjs` keeps such figures out of `docs/seo/`. This branch makes the pages those searches land on say plainly what the searcher asked for. It also corrects the one page that could mislead a visitor, and tidies the technical signals. The historical URL work, the design, the animation and the prices are untouched.

- **Shark cage diving** is the largest group among the audit's priority searches, and its old landing page is among the audit's pages too.
  - The page no longer implies a great white sighting is certain. It now says sharks are wild and no sighting can be promised.
  - The contradiction between "after pickup you drive to Gansbaai" and "transport not included" is gone. Transport is described consistently as the optional add-on the official page says it is.
  - The page says the activity is run by an accredited specialist operator, as the official page does.
  - Five visitor questions are answered from the official page; the page's own Pickup, Booking and Cancellation blocks answer three more. What that page does not say (the operator's name, what the gear includes, the launch point) is recorded for the owner, not published.
  - The great white promises also went from the home and services pages.
- **Cape Town City Private Tour**: led by "cape town central private tours", its searches rank closest to the first results page. The page now opens with "Explore central Cape Town on a private guided tour…". The title is kept and the description now differs from it.
- **Township Private Tour** ("township tour cape town" and its variants): "private township tour in Cape Town" appears once, in the opening sentence. Langa, its history and the itinerary are unchanged.
- **Airport transfers** ("cape town airport transfers private"): the title is now "Private Airport Transfers in Cape Town | Good Times" and the H1 "Private Airport Transfers".
- **Cape Agulhas**: the opening now says what its metadata already did, "a private day trip from Cape Town".
- **The adventure activities** (shark cage diving, quad biking, skydiving) are no longer called private on their pages, cards or booking cards. Their official pages say they are "operated by accredited third-party specialists", for up to 10 people, and never call them private. Their pages now say "Run by an accredited specialist" instead, and the owner is asked whether they are private (section 12).
- **Garden Route**:
  - Its per-day rate is marked up as a per-day price, so R8,500 cannot be read as the price of the whole journey.
  - The page now says "Departure from Cape Town and your return are flexible, by arrangement", in the official page's own words.
- **Structured data**: each tour and package names its page's address. Nothing else needed correcting: there are no ratings, reviews or availability claims.
- **Sitemap**: `<loc>` only. The `changefreq` and `priority` fields, which Google ignores, are removed. `lastmod` is left out on purpose because no reliable per-page date exists.
- **Images**: each tour's and package's main photograph now carries the description it already had. The full-width hero had blanked it.
- **Tests**: a new suite, `test/seo-gsc.test.mjs` (12 tests), checks all of this on a production build and a preview build. Every existing gate passes as before.
- **An independent review** of the patch found ten points. Section 11 records each one and what was done about it.

No ranking change is promised or claimed. The aim is that someone who lands on these pages from a search finds what they searched for, stated accurately, and can ask for a quote.

## 1. What Search Console shows (Phase 1)

The audit covers 16 months. Its headline finding: the non-branded tour searches were seen in results but almost never clicked. Its figures (clicks, impressions, positions, per query and per page) are in the owner's private files with the Search Console exports, and are not repeated in this public repository.

The window spans two website generations, which are not one month-on-month series:

- the old booking site, which produced most of the older impressions at its `/tour/<slug>/` addresses;
- the WordPress site, which produced the recent activity under renamed slugs.

| The audit's priority searches | Their page | Done |
|---|---|---|
| cape town central private tours · private city tour cape town · cape town city private tours | `/tours/cape-town-city-private-tour/` | The opening sentence and the description name central Cape Town and the private guided tour |
| shark cage diving cape town · shark diving cape town · cage diving cape town (and the old landing page) | `/tours/shark-cage-diving/` | The accuracy repair (sightings, transport); visitors' questions answered; the terms used where they describe the activity |
| cape point private tour · cape peninsula tour · cape peninsula private tour | `/tours/cape-peninsula-private-tour/` | Nothing needed: the title, H1 and opening already name Cape Point, the Cape Peninsula, Chapman's Peak and Boulders Beach |
| township tour cape town · cape town township tours · township tours cape town · langa township tour | `/tours/township-private-tour/` | "private township tour in Cape Town" in the opening, once |
| garden route tours · garden route private tours · garden route private tour | `/packages/garden-route-private-tour/` | The per-day price in structured data; departure "by arrangement" stated |
| cape town airport transfers private | `/transfers/` | The title and H1 say "Private Airport Transfers" |

The searches that have nothing to do with the business (`good times paarl`, `cape times`, `time in south africa`) were left alone. The Search Console exports stay in the owner's private files, not in this public repository.

## 2. Before and after

| Page or component | Audit evidence | Before | After | Why | For the visitor | Risk |
|---|---|---|---|---|---|---|
| City tour: first sentence (`src/data/tours.mjs`) | "cape town central private tours" and two similar searches: seen, not clicked | "Experience Cape Town's history, neighbourhoods and landmarks on a private guided day." | "Explore central Cape Town on a private guided tour of the city's history, heritage and neighbourhoods, with your own guide and vehicle." | The search's own words (central, private, tour) in the first sentence that searchers and Google read | Says at once what the day is and that it is private | Low: copy only. The guide and vehicle are in the tour's inclusions (private vehicle, driver-guide). The title, itinerary and prices are unchanged |
| City tour: meta description | The same searches | "A private guided Cape Town city tour: … with pickup." | "A private guided tour of central Cape Town: … with pickup." | Differs from the title and leads with "central"; kept to its earlier length, so a result shows it whole | A clearer snippet | Low |
| Shark cage diving: the opening, subtitle, card, highlights, overview heading and description | The largest group of the audit's priority searches (shark cage diving, shark diving, cage diving), and its old landing page | "Dive with great white sharks … see one of South Africa's marine predators up close. After pickup you drive to Gansbaai…". The subtitle was "Great White Sharks off Gansbaai", the heading "Face to face with great white sharks", and the description began "Shark cage diving with great white sharks" | "Go shark cage diving off Gansbaai, on the Overberg coast, where the activity begins…", "hoping to see sharks up close. Sharks are wild animals, so no sighting can be promised." Then "The activity is run by an accredited specialist operator." The subtitle is now "Out to Sea on the Overberg Coast" and the heading "Out to sea, into the cage". The description is the earlier one without the species | No wildlife encounter is promised; the searches are about the activity, not one species. Each search term is used where it describes the activity, never repeated for its own sake (the review measured it; section 11) | Honest expectations, so no disappointment on the day | Low. The SEO title "Shark Cage Diving in Gansbaai from Cape Town" and the H1 "Shark Cage Diving" are unchanged |
| Shark cage diving: itinerary, pickup and transport | The page said "after pickup" and listed "Pickup and a drive to Gansbaai" as a stop, then "Transport to Gansbaai, unless booked as an add-on" as not included | Four stops, two of them the drive | Two stops: the official page's boat trip and cage dive, worded as before. Transport is stated in three places, each saying it is not included or is the add-on: the opening, the Not-included list, and the Pickup answer, which is unchanged ("Pickup can be added: transport to Gansbaai is booked as an add-on.") | The official page's own exclusion, stated consistently | No surprise about getting there | Low. Tested: every sentence about transport says it is the add-on. The booking form's card still says "Transport as an add-on" |
| Shark cage diving: visitors' questions | The brief's eight questions | None answered | Five answered from the official page: what it is, where, equipment, sightings, and participation ("The operator sets age, health and weight requirements, which we confirm with your quote"). The page's own blocks answer the other three: Pickup (transport), Cancellation (the weather) and Booking (how it is confirmed) | Answers to real questions, nothing invented. The operator's specific limits, the gear's contents and the launch point wait for the owner | Answers before enquiring | Low. Not marked up as FAQPage (no new FAQ framework; see section 4) |
| Home and services: the adventure lines | Same accuracy issue | "a cage dive with great white sharks (off Gansbaai)" | "a shark cage dive off Gansbaai" | No sighting promised anywhere on the site | Consistent | None |
| Township: first sentence | Four township searches, Langa among them | "…on a private half day in Langa." | "…on a private township tour in Cape Town: half a day in Langa with your own guide." | The search's phrase, once, and still about Langa's history and culture | Clear and accurate | Low. The itinerary and photographs are unchanged (no withdrawn image; the kindergarten visit stays as it was) |
| Transfers: title and H1 (`src/pages/transfers.mjs`) | "cape town airport transfers private" | "Airport Transfers in Cape Town \| Good Times"; H1 "Airport Transfers" | "Private Airport Transfers in Cape Town \| Good Times"; H1 "Private Airport Transfers" | The service is private, and the search says so | The result says what it is | None. Prices R850/R1,700 per trip and the enquiry links are unchanged and tested |
| Cape Agulhas: first sentence | Its metadata already said "from Cape Town"; the page did not | "…on a private day full of history and coastal beauty. After pickup, a scenic drive…" | "…on a private day trip from Cape Town, full of history and coastal beauty. After pickup from your accommodation, a scenic drive…" | Page and snippet agree | Clear where it starts | None |
| Garden Route: offer (`src/partials/ui.mjs`, `src/pages/packages.mjs`) | The visible price is "From R8,500 per day, for 1–4 guests" | One Offer of R8,500, with the basis only in words | The same builder as the day tours: the group size it prices (1–4 guests), and a `UnitPriceSpecification` of 1 DAY | A machine reading cannot take R8,500 as the whole journey's price | Correct prices in any rich display | Low; tested |
| Garden Route: departure | Brief: "pickup arrangements"; the official page: "Departure: Flexible, by arrangement" | Not stated | "Departure from Cape Town and your return are flexible, by arrangement." | The source's own words, without inventing a hotel pickup (recorded for the owner to confirm) | Knows the start is arranged with them | None |
| Adventure activities: who the day is for (`src/data/tours.mjs`, `src/pages/tours.mjs`, `src/pages/enquire.mjs`, `src/partials/cards.mjs`) | Found by the review. The official pages of all three say "operated by accredited third-party specialists", "Max 10 people", and never "private". The shark photograph shows a boat with about twenty guests | Several places on each page said "Private: only your group", as did the booking card; also the eyebrow and phone bar "Private activity", a card chip "Private", and the itinerary note "Every tour is private, so the route can be shaped around you" | The page and booking card say "Run by an accredited specialist". The eyebrow drops "Private activity", the phone bar says "Adventure activity", the card shows no privacy line, and the itinerary note is "The activity as the operator runs it. Timings depend on the weather and the season, and are confirmed with your quote." | The pages stop claiming what their sources never say, and say what they do | No one expects a private boat and finds a shared one | Low. The tours are unchanged. If the owner confirms the activities are private, the old line returns in one place (`groupLine`) |
| Every tour and package: TouristTrip | The brief's check 3 (structured data matches the canonical) | No `url` | `url` = the page's canonical | Ties the entity to its page | — | None; tested for all 11 |
| Every tour and package: main photograph | The brief's check of descriptive alt text | Full-width heroes had `alt=""` (framed heroes already used the description) | The photograph's existing description from `src/data/images.mjs` | The page's main image of the product is content, not decoration: it has no text over it, and the title sits below it | Screen-reader users hear what the page shows | None visual; tested |
| The shark cage diving boat's photograph: alt text (`src/data/images.mjs`) | Found by the review. The operator is not to be named until confirmed | "A Marine Dynamics shark cage diving boat with guests on deck…" | "A shark cage diving boat with guests on deck, gulls circling overhead" | Describes the photograph without naming an operator the data says is unconfirmed | — | None |
| Sitemap (`src/build.mjs`) | Google ignores `changefreq` and `priority` | `<loc>`, `<changefreq>`, `<priority>` | `<loc>` only; no `lastmod` (section 5) | Removes signals that carry no information | — | None; tested |

## 3. Technical changes

| File | Change |
|---|---|
| `src/data/tours.mjs` | The city, township and Cape Agulhas openings, and the city description. Shark cage diving: title subtitle, card, opening, highlights, itinerary wording, description, `faq` (5) and its `confirm` items. `operatorRun()` and `groupLine()` (who the day is for). The three activities' `itineraryStatus: 'activity'`, and the owner's question in each `confirm` |
| `src/data/packages.mjs` | The Garden Route's departure sentence; one `confirm` item |
| `src/pages/tours.mjs` | The shark overview heading; the tour's own questions in the FAQ panel, above its standard blocks; `groupLine()` in the feature list and meta row; the activities' eyebrow, phone bar and itinerary note; TouristTrip `url`; the full-width hero uses its alt text; `priority` removed |
| `src/pages/enquire.mjs` | The booking card's group line from `groupLine()`; `priority` removed |
| `src/partials/cards.mjs` | An activity's card carries no privacy line |
| `src/data/images.mjs` | The shark cage diving boat's alt text no longer names an operator |
| `src/pages/packages.mjs` | Offers from `priceOffers()` (shared with the day tours); TouristTrip `url`; the hero uses its alt text; `priority` removed |
| `src/partials/ui.mjs` | `priceOffers()`: a per-day rate is a `UnitPriceSpecification` of 1 DAY. A starting price and a per-day unit now share one specification, so neither can overwrite the other |
| `src/pages/transfers.mjs` | Title and H1 |
| `src/pages/index.mjs`, `src/pages/services.mjs` | The adventure lines; `priority`/`changefreq` removed |
| `src/build.mjs` | The sitemap writes `<loc>` only |
| 8 more page modules | Their unused `priority` field removed (about, contact, destinations, faq, privacy, reviews, safety, terms) |
| `test/seo-gsc.test.mjs` | New: the 12 tests below |
| `docs/seo/GSC_AUDIT_IMPLEMENTATION.md` | This report |

Nothing in `src/data/legacy-urls.mjs`, `src/data/redirects.mjs`, `src/partials/layout.mjs`, `src/partials/security.mjs`, `functions/` or `lib/` changed, and no stylesheet, script or image file did.

## 4. The audits that needed no change, or only the changes above

**Internal links (Phase 8).**

- Every commercial page is reachable through plain HTML links, and none is orphaned. Each tour has between 5 and 14 other pages linking to it from their main content, besides the navigation.
- `/services/` is linked from every page's footer and links to every offering.
- The brief's example pairs already exist: City → Township, Peninsula → Winelands, Shark cage diving → Cape Agulhas, whale watching and quad biking, Garden Route → Winelands, and Tours → Private Cape Town Experience.
- Every internal link points at its final address: the test finds no link that answers with a redirect, and no historical address is used as a link.
- Booking links keep their service. A tour's header action and its booking card carry the tour (`enquire/?type=tour&tour=<slug>`), and the transfer actions carry `type=transfer&transfer=airport-arrival|airport-departure|other`.
- No link was added. In particular, the home page's "Four ways to see the Cape with us" already links each of the four services directly, so a link to a page listing the same four would only repeat it for the visitor.

**Structured data (Phase 9).** One system, unchanged in shape: `TravelAgency` (`/#organization`), `WebSite`, `WebPage` and `BreadcrumbList` on every page, plus each page's own nodes.

- Every block parses. There is one organisation, and every provider refers to it.
- Each `WebPage` `url` is the page's canonical. Every breadcrumb resolves to a built page.
- Each `TouristTrip`'s itinerary is the visible itinerary, in order. Its offers are the visible approved prices in ZAR, with the group sizes they price.
- No availability, `validThrough` or stock is asserted.
- Ratings are shown visibly as Tripadvisor's, with a link and the review dates, and are never marked up. There is no `aggregateRating` and no `review`, which the tests enforce.
- Schema.org validity and Google's rich results are separate questions. These types and properties are valid Schema.org (`TouristTrip`, `Offer`, `UnitPriceSpecification` with UN/CEFACT `DAY`, `QuantitativeValue`). Google has no rich result for `TouristTrip`, and since August 2023 it shows FAQ rich results only for well-known government and health sites.
- The `FAQPage` on `/faq/` is therefore kept as it is. It is valid and matches the visible questions, but no rich result is expected from it.
- The tour FAQs are not marked up (no new FAQ framework).
- The transfers page shows its prices without `Offer` markup. Adding a `Service` node would be an enhancement, not a correction, so it is left for later.

**Cape Peninsula (Phase 6).** The visible page already explains:

- Cape Point, the Cape Peninsula and the private tour;
- Chapman's Peak and Boulders Beach;
- pickup from your accommodation;
- what is included, and what is not (the Cape of Good Hope and Boulders entrance fees, lunch, tips).

It promises no wildlife. Nothing changed.

**Garden Route (Phase 6).** It is private, three days or more, a route planned with you, and priced per day for 1–4 guests (5–8 on enquiry). Accommodation is listed as not included, and the test checks it is never said to be included. The two changes above are the only ones.

**Transfers (Phase 5).** The page states:

- private transfers between Cape Town International (CPT) and your accommodation, as arrivals and departures;
- 1–4 and 5–8 guests, at R850 and R1,700 per trip;
- the meet and greet with a name board, and help with luggage;
- what it needs from you;
- "A transfer request is not a confirmed booking: one of our team confirms it with you".

"Flight delays tracked … at no extra charge" comes from the official listing ("Please share your flight details in advance so we can track delays at no extra charge"), read again on 8 Nov 2026. It is not invented. Nothing about waiting periods, child seats, vehicles or hours was added.

**The other tours (Phase 7).** Reviewed for accuracy, pickup, inclusion/exclusion contradictions, availability, prices and enquiry links:

- Shark cage diving's transport contradiction was the only contradiction found.
- No other page promises a sighting. The home page's own words already say "Sightings like this are luck, never a promise".
- The review found one more unsupported claim: the three adventure activities called private (section 2). That is corrected on their own pages, cards and booking cards. Some site-wide lines still describe every offering as private, and they cover the activities too:
  - the home page's "Four ways… Each one private";
  - the booking form's hint "Everything is private: only your group";
  - the wizard's summary label "Private tour";
  - the destinations' "N private tours" counts.

  They are brand positioning, so they wait for the owner's answer (section 12) rather than being rewritten here.

**Images (Phase 12).** Every `<img>` has an alt attribute.

- Images with an empty alt are decorative: logos beside the name, concierge thumbnails beside their label, and list-page banners behind their headings.
- No alt text is generic or a file name.
- Every image has its width and height.
- Responsive AVIF/WebP sources come with `sizes`.
- Below the fold, images are lazy, and each page has one high-priority (LCP) image.
- No withdrawn photograph appears (the browser suite's content-honesty test). The four retired historic images answer 404 (the registry suite).
- The only changes are the product heroes' alt text and the shark cage diving boat's neutral description (section 2).

## 5. The sitemap (Phase 10)

The established generator stays, with no new dependency. Each URL is now just `<loc>`.

**`lastmod` was evaluated and left out.** A page is assembled from shared data files: tour data, prices, images, the layout and partials. So no file, commit or build date says when one page's content last changed:

- a price change alters several pages without touching their modules;
- a header tweak alters every page's HTML but none of their content;
- the build date would be the same false date on every URL, which the brief forbids.

A future, deterministic option, if the owner wants it after launch:

- a committed manifest of `path → { hash, date }`, where the hash covers the page's main content and its JSON-LD;
- a script that changes a page's date only when its hash changes;
- a test that unchanged pages keep their dates.

Until then, leaving it out is accurate.

**What the production sitemap contains.**

- **Included:** every indexable canonical page once, on `https://goodtimesincapetown.co.za/`: 25 since this branch was merged with PR #5 on 8 Nov 2026, whose approval of the terms made `/terms/` indexable (24 on this branch alone).
- **Excluded:**
  - preview hosts;
  - redirect sources;
  - 404s and retired files;
  - the admin and API routes;
  - noindex pages: the 404 page (and, until PR #5's approval of the terms was merged, `/terms/`).

The test compares it with the set of indexable canonicals.

**Preview builds are unchanged:**

- `robots.txt` disallows everything;
- no sitemap is written;
- every page is `noindex,nofollow`;
- the headers send `X-Robots-Tag: noindex`;
- production builds served on a `pages.dev` address stay noindex too.

## 6. Historical URLs (Phase 11): unchanged, and what WordPress answers today

**Non-regression.** The registry was not touched: 140 entries covering 325 concrete addresses, generating 124 `_redirects` rules (the same count before and after). Kept intact:

- the four booking-site tour addresses with their own rules;
- `/services/` and `/safety/` as real pages;
- `/gallery/` → `/tours/` and `/bookings/` → `/contact/`;
- the account pages;
- the 12 service-specific booking addresses with their preselection;
- the 10 kept and 4 retired images.

The full historical URL suite passes on the Pages runtime for both builds (section 11). The H1–H9 decisions stand, and the Smart Pulse Africa script stays out.

**The live WordPress site today.** Read on 8 Nov 2026: one GET per address, no redirect followed.

| Address | WordPress answers | The new site answers (registry) |
|---|---|---|
| `/tour/cape-peninsula-private-tour/`, `/tour/cape-town-city-private-tour/`, `/tour/township-private-tour/`, `/tour/cape-winelands-private-tour/` (the booking site's tour addresses, with search impressions) | **404** | 301 to each tour's own page |
| `/services/` | **404** | 200, the restored page |
| `/bookings/` | **404** | 301 → `/contact/` |
| `/accounts/login/` | **404** | 301 → `/enquire/` |
| `/users/book/<slug>/` (the booking pages; 3 of the 12 sampled) | **404** | 301 → `/enquire/?type=…` with the service chosen |
| `/media/…` (the old images; 3 sampled) | **404** | 200 for the 10 kept, 404 for the 4 retired |
| `/transfers/` | **404** | 200 |
| `/tour/<WordPress slug>/` (the renamed tours and the other eight) | 200 | 301 to each page |
| `/tours/shark-cage-diving/` | 301 → `/tour/shark-cage-diving/` | 200 (the reverse rule; only one site answers at a time, so no loop) |
| `/tours/cape-town-city-private-tour/` | 301 → an image in `/wp-content/uploads/2026/11/` | 200 |
| `/`, `/about/`, `/contact/`, `/faq/`, `/privacy/`, `/terms/`, `/tours/`, `/safety/`, `/gallery/` | 200 | 200 (`/gallery/` 301 → `/tours/`) |

**An urgent migration dependency.** Several valuable historical addresses already fail on the live site and keep failing until the cutover: the four booking-site tour addresses, `/services/` and the booking links. This branch neither edits WordPress nor adds temporary redirects there. Whether to add temporary redirects to WordPress before the cutover is the owner's decision, listed under section 12.

## 7. Performance, mobile and crawlability (Phase 13)

**No change in what loads.** The production build's `assets/` (scripts, styles, fonts, images and video) is byte for byte the same at `d0cb62c` and now: 1,008 files, none changed. Gzipped HTML barely moves:

| Page | Before | After |
|---|---:|---:|
| `/` | 32,204 | 32,195 |
| `/tours/cape-town-city-private-tour/` | 18,633 | 18,724 |
| `/tours/shark-cage-diving/` | 13,993 | 14,587 (+594, the answers) |
| `/tours/township-private-tour/` | 18,949 | 19,023 |
| `/tours/cape-peninsula-private-tour/` | 19,488 | 19,543 |
| `/packages/garden-route-private-tour/` | 16,521 | 16,851 |
| `/transfers/` | 13,172 | 13,174 |
| `/services/` | 11,385 | 11,381 |
| `/enquire/` | 20,687 | 20,670 |

**Lab measurements.** Taken on 8 Nov 2026 in Chromium with phone emulation (Pixel 7), with 4× CPU and network throttling, on a local server. They are indicative only: lab timings vary between runs.

| Page | LCP | CLS | TBT |
|---|---:|---:|---:|
| `/` | 2,988 ms | 0.01 | 1,150 ms |
| `/tours/cape-town-city-private-tour/` | 2,032 ms | 0 | 0 ms |
| `/tours/shark-cage-diving/` | 1,736 ms | 0 | 0 ms |
| `/tours/township-private-tour/` | 2,212 ms | 0 | 0 ms |
| `/tours/cape-peninsula-private-tour/` | 2,216 ms | 0 | 0 ms |
| `/transfers/` | 1,976 ms | 0 | 0 ms |
| `/services/` | 932 ms | 0 | 0 ms |
| `/enquire/` | 2,432 ms | 0 | 0 ms |

The home page's blocking time is the approved motion layer (GSAP, the aircraft and the sand journey). It is unchanged here, and choreography was out of scope. Interaction to Next Paint needs field data, which only exists after launch: watch Search Console's Core Web Vitals report and CrUX.

**Crawlability.** The test covered the ten priority pages (home, City, Shark, Township, Peninsula, Garden Route, Cape Agulhas, Transfers, Services and Enquire) in three conditions: with JavaScript off, with the GSAP files blocked, and with reduced motion. In every condition:

- the H1 and the opening text are visible;
- the essential routes are real `<a href>` anchors in the HTML (tours, transfers, services, enquire, contact, about);
- the booking links carry their service.

On phones the enquiry page hides its one-line lead by design, so the first step leads. The text is still in the HTML, and on desktop it is shown. With JavaScript off, the form says sending needs JavaScript and offers phone, WhatsApp and email. The mobile screenshots of the changed pages show no overflow.

## 8. From search to enquiry (Phase 14)

| Check | Result |
|---|---|
| The main action is visible and says what it does | Each tour page has "Plan My Day" in the header and "Request a Quote" on its booking card. Transfers has "Arrange My Transfer" |
| The tour information comes before the action | Overview, itinerary, inclusions and FAQs are on the page, crawlable without JavaScript |
| The service is kept when the form opens | The tour's slug, or the transfer type, travels in the link and the booking card's hidden field. This is tested here, in `test/cta.test.mjs` and in the browser suite (`legacy-booking`) |
| Prices agree | Every visible price and every marked-up price equals `src/data/pricing.mjs` (tested) |
| Nobody is told a booking is confirmed | "Every booking is confirmed by one of our team"; "A transfer request is not a confirmed booking". The acknowledgement email says "received, not yet confirmed" |
| The form reflects `ENQUIRY_MODE` | `preview` in every environment. The form makes no network request and says so plainly. Live mode is A4/A8, not this branch |
| A success is distinguishable | A `GT-` reference is shown only after a real 201. Anything else, including the anti-spam decoy, is never shown as success. Each stored request records the page it was sent from, with its `type` and `tour` |
| Contact links | The browser suite checks call, WhatsApp, email and the office address on every page |

**Future conversion events: recommended, not implemented.**

1. **The primary measure needs no tracking in the browser:** stored requests (201 with a `GT-` reference) per day, by type, tour or transfer, and `page_url`. They come from the bookings database or dashboard once live enquiries are approved. This is the most privacy-preserving count, and it is the real number.
2. **Browser events, only with separate approval:** these would sit inside the existing consent choice, and the privacy notice would need updating first.
   - `enquiry_start`: the first field changed;
   - `enquiry_step`: step *n* reached;
   - `enquiry_submitted`: 201 with a reference;
   - `enquiry_error`: validation versus server;
   - `contact_click`: `tel:`, `wa.me` or `mailto:`.

   Cloudflare Web Analytics counts page views only, with no custom events, so these would need a separately approved tool. Search Console's GA4 association is needed for none of this.
3. **Verification after launch:**
   - one controlled real enquiry (A8) is counted once, with the right type and tour;
   - a declined or unanswered consent sends nothing;
   - failed validations are never counted as submissions.

## 9. The promotional film: the future integration point (Phase 12)

The film is being made separately and is not embedded. When the final version is published:

- **Where it goes:** the home page or About. A dedicated page (for example `/film/`) only if video search visibility becomes an objective. It should be added to the sitemap only if that page is indexable.
- **The markup:** `<video controls preload="none" poster="…">`, with no autoplay with sound, and captions (`<track kind="captions">`). The title and the written description sit beside it on the page. The poster is a real still at the player's size, with its width and height.
- **Hosting:**
  - Self-hosted (the site's own `npm run video` pipeline) or on Cloudflare keeps the site cookie-free.
  - A YouTube or Vimeo embed should load only when the visitor presses play (a facade), so nothing is requested from them before that. The privacy notice then needs a line about it.
- **Structured data:** a `VideoObject` in that page's own `schema` array (the existing system), with `name`, `description`, `thumbnailUrl`, `uploadDate`, `duration`, and `contentUrl` or `embedUrl`.
- **Performance:** keep it off the LCP path (`preload="none"`, poster lazy below the fold), and check that the page's LCP and CLS hold.

## 10. Search Console readiness (Phase 15)

**The priority pages in the production build.** Every page in the table:

- answers 200 (the file exists);
- has no `noindex`;
- is in the sitemap.

| Page | Title | H1 | Canonical | Structured data |
|---|---|---|---|---|
| `/` | Good Times in Cape Town \| Private tours in Cape Town since 2014 | Good Times in Cape Town: private tours of Cape Town and the Western Cape with local guides, since 2014 | its own address | TravelAgency, WebSite, WebPage |
| `/tours/cape-town-city-private-tour/` | Cape Town City Private Tour: Castle, District Six & Bo-Kaap \| Good Times | Cape Town City Private Tour | its own address | + BreadcrumbList, TouristTrip |
| `/tours/shark-cage-diving/` | Shark Cage Diving in Gansbaai from Cape Town \| Good Times | Shark Cage Diving | its own address | + BreadcrumbList, TouristTrip |
| `/tours/township-private-tour/` | Township Private Tour: Langa, Cape Town \| Good Times | Township Private Tour | its own address | + BreadcrumbList, TouristTrip |
| `/tours/cape-peninsula-private-tour/` | Cape Peninsula Private Tour: Cape Point & Boulders Penguins \| Good Times | Cape Peninsula Private Tour | its own address | + BreadcrumbList, TouristTrip |
| `/packages/garden-route-private-tour/` | Garden Route Private Tour from Cape Town: 3+ Days \| Good Times | Garden Route Private Tour | its own address | + BreadcrumbList, TouristTrip |
| `/tours/cape-agulhas-private-tour/` | Cape Agulhas Private Tour from Cape Town \| Good Times | Cape Agulhas Private Tour | its own address | + BreadcrumbList, TouristTrip |
| `/tours/cape-winelands-private-tour/` | Cape Winelands Private Tour: Stellenbosch & Franschhoek \| Good Times | Cape Winelands Private Tour | its own address | + BreadcrumbList, TouristTrip |
| `/transfers/` | Private Airport Transfers in Cape Town \| Good Times | Private Airport Transfers | its own address | + BreadcrumbList |
| `/services/` | Our services: tours, transfers and adventures \| Good Times | Our services | its own address | + BreadcrumbList, ItemList |

Every one has its enquiry action, and the browser suite runs the main journeys at phone and desktop sizes.

**The critical historical addresses on the new site's runtime.** The registry suite checks these on `wrangler pages dev` for both builds (status, `Location`, hops and relevance):

| Old address | New site |
|---|---|
| `/tour/shark-cage-diving/` | 301 → `/tours/shark-cage-diving/` |
| `/tour/cape-peninsula-private-tour/`, `/tour/cape-peninsula-adventure/` | 301 → `/tours/cape-peninsula-private-tour/` |
| `/tour/cape-town-city-private-tour/`, `/tour/cape-town-city-tour/` | 301 → `/tours/cape-town-city-private-tour/` |
| `/tour/township-private-tour/`, `/tour/township-cultural-tour/` | 301 → `/tours/township-private-tour/` |
| `/tour/garden-route-private-tour/` | 301 → `/packages/garden-route-private-tour/` |
| `/tour/cape-winelands-private-tour/`, `/tour/winelands-experience/` | 301 → `/tours/cape-winelands-private-tour/` |
| `/services/` | 200, a real page |
| `/bookings/` | 301 → `/contact/` |
| `/users/book/<slug>/` (12) | 301 → `/enquire/?type=tour&tour=<slug>` (`?type=transfer` for the airport) |
| `/media/…` | The 10 kept images 200, checksum-verified; the 4 retired ones 404 |

**Launch-day checklist: prepared, not executed.** This complements `docs/seo/READINESS.md` section 6, the cutover with its rollback triggers. It does not replace it.

| # | Step | How |
|---|---|---|
| 1 | The owner's approval (A2) | The approval register |
| 2 | The commit being deployed | Its SHA in the deploy log equals the approved PR head; the suite passed on a preview of that commit |
| 3 | The production domain is live on Pages | The Pages project shows the domain active; `curl -sI https://goodtimesincapetown.co.za/` answers from Cloudflare |
| 4 | The root and www | `www` and `http` each answer one 301 to the same path on `https://goodtimesincapetown.co.za` (`--domain` checks it) |
| 5 | HTTPS | A valid certificate on both hosts |
| 6 | No unintended noindex | No `noindex` meta or `X-Robots-Tag` on the domain (the suite fails on it) |
| 7 | Canonicals | Each priority page names its own `https://goodtimesincapetown.co.za/…` address (the table above) |
| 8 | `/robots.txt` | Allows crawling and names the sitemap |
| 9 | `/sitemap.xml` | 25 URLs (every indexable page, `/terms/` included), `<loc>` only, all on the domain |
| 10 | The historical suite against the domain | `node qa/legacy-urls.mjs --base=https://goodtimesincapetown.co.za --env=production --domain` |
| 11 | Submit the sitemap | In the existing `sc-domain:goodtimesincapetown.co.za` property: Sitemaps, then `https://goodtimesincapetown.co.za/sitemap.xml` |
| 12 | Inspect | URL Inspection: the home page, the four renamed tours, shark cage diving and transfers. The live test should be 200, indexable, with Google's canonical the user's |
| 13 | Request indexing selectively | Only the pages in step 12, on the domain; never a preview or `pages.dev` page |
| 14 | Monitor | The Pages report (404s, "Page with redirect" for the old addresses, as expected), sitemap status, and the Core Web Vitals report, daily for two weeks, then weekly |
| 15 | Compare | Clicks, impressions and positions for the priority searches against the baseline exported just before the cutover (H7) |

The Google property stays as it is. No Change of Address (the domain does not change), no removal of the property, and no indexing request for preview pages.

## 11. Test evidence (Phase 16)

**Baseline at `d0cb62c`, before any change:**

- a production build of 26 pages (a preview build adds the design-system page: 27), 24 of them in the sitemap (the 404 page and `/terms/` are noindex), and 124 redirect rules;
- `npm test`: 354 of 354;
- browser suite: 333 passed, 38 skipped, 1 failed. The one failure was `motion.spec.mjs:73`, the brand aircraft for a visitor arriving past the hero, and it predates this work.

**After, on this branch:**

| Command | Result |
|---|---|
| `npm ci` | Installed |
| `npm run build` | 27 pages (the default preview build) |
| `npm run check` | 27 pages checked, no problems |
| `npm run guard` (after `git add -A`) | Every file clean |
| `npm test` | **366 of 366**: the 354 above plus the 12 new ones, after the review's fixes. This includes the historical URL suite on the Pages runtime for the preview and production builds (`test/legacy-urls.test.mjs`) and the registry tests (`test/legacy-registry.test.mjs`) |
| `npm run test:e2e` | **333 passed, 38 skipped, 1 failed**, after the review's fixes: the same as the baseline. The one failure is the pre-existing `motion.spec.mjs:73`, not this work. The first run on this branch also caught "guarantee" in the new shark wording (the content-honesty test bans the word), so the page now says a sighting "can't be promised" |

**The new suite.** `test/seo-gsc.test.mjs` builds production and preview in temporary copies. It leaves out what `test/seo.test.mjs` and `test/production-build.test.mjs` already check: unique titles and descriptions, canonicals, parsing JSON-LD, the `WebPage` url, and links that land without a redirect. It checks:

1. **Titles:** the priority titles, and the transfers title and H1.
2. **Openings:** each priority page answers its search in its opening. Each target phrase, and "Gansbaai", is used, at under one use per hundred words of the page.
3. **Shark cage diving:**
   - no "great white", here or on `/`, `/services/` and `/tours/`;
   - "no sighting can be promised", and no "guarantee" (the browser suite's content-honesty test keeps that word off every page);
   - every sentence about transport says it is not included or is the add-on, and no stop is a pickup or a drive;
   - the booking form's card says "Transport as an add-on";
   - the five questions and the Pickup, Booking and Cancellation blocks are there, and the participation answer gives the operator's age, health and weight requirements;
   - no passage of eight words appears twice in the page's own copy.
4. **The adventure activities:**
   - each page and booking card says "Run by an accredited specialist" and never calls the activity private;
   - their itinerary note is the operator's;
   - their cards on `/tours/` carry no privacy line, while the tours' cards and pages keep theirs;
   - the owner's question is in each `confirm`.
5. **Garden Route:** three days or more, per day, departure and return "flexible, by arrangement", accommodation never said to be included.
6. **Prices:** every visible price (`data-money`) and every marked-up offer is a tier of the pricing data. `test/pricing.test.mjs` pins the approved amounts themselves.
7. **Structured data:** one organisation; every breadcrumb, not only the last, a built page; no rating, review, availability, `validThrough` or stock.
8. **TouristTrip:**
   - its url, the provider, and the visible itinerary in order;
   - the Garden Route offer is per day, a per-group offer carries no specification, and a starting price keeps its `minPrice`.
9. **Sitemap:**
   - the whole document matches the exact shape of `<url><loc>…</loc></url>` entries, with URL-safe characters only, so it is well formed by construction and nothing else can hide in it;
   - exactly the indexable canonical pages;
   - no redirect source or excluded route.
10. **Preview:** never indexable; `robots.txt` shuts everything; no sitemap.
11. **Booking links:** every tour's booking card and header button carry the tour, and the transfer actions carry their type.
12. **Images:**
    - alt present and specific, with width and height;
    - lazy below the fold;
    - at most one high-priority image;
    - each product's main photograph described.

**The independent review.** An agent reviewed the patch from the brief and the diff, without this report. Its ten findings and what was done:

| # | Finding | Outcome |
|---|---|---|
| 1 | The rewritten shark pickup answer silently changed the booking form's card from "Transport as an add-on" to "At the operator's site": `pages/enquire.mjs` reads its first words | **Fixed:** the pickup answer is the original, accurate one again, and a test checks the card |
| 2 | The participation answer left out what the official page states ("age, health, or weight requirements set by the operator"), and the owner's note said "swimming" for "weight" | **Fixed** in both |
| 3 | The shark page repeated itself enough to read as stuffing: "Gansbaai" 7 → 15 times, "for a chance to see sharks up close" three times word for word, and transport in five places | **Fixed:** new subtitle and heading, a varied opening, two FAQ answers reworded, and the transport question and the itinerary note removed (the Pickup block beside them answers it). "Gansbaai" is now used 6 times in 679 words, and the test caps target phrases and forbids repeated passages |
| 4 | The activities were called private, with no support from their official pages ("operated by accredited third-party specialists", "Max 10 people") | **Fixed** on the activities' pages, cards and booking cards. The site-wide lines are left for the owner (section 4) |
| 5 | Some test titles claimed more than they checked: "stated once", a pickup check that could never fail, limits set to the current counts, "well formed" by regex, a package found by position, duplicates of existing tests, and pages parsed on every call | **Fixed:** each test checks what its title says (above). The duplicates are gone, and pages are parsed once per build |
| 6 | The Garden Route sentence read as if the visitor chose the departure | **Fixed:** "Departure from Cape Town and your return are flexible, by arrangement." |
| 7 | The equipment answer named no equipment; "included in your quote" could read as free transport | **Fixed:** "Full gear for the dive: gear rental is included"; the transport answer is gone |
| 8 | The new descriptions ran past what a result shows, and the shark snippet lost "Seasonal rates" | **Fixed:** the city description is back to its earlier length, and the shark description is the earlier one without the species |
| 9 | Schema details: `eligibleQuantity` in guests beside a per-day `referenceQuantity`; `Offer.price` a string, the specification's a number; per-day detection by the data's `unit` value | **Kept, deliberately:** all valid Schema.org and the existing pattern of every offer on the site. The units answer different questions (for how many guests; per what). Google has no rich result for `TouristTrip` |
| 10 | The boat photograph's alt named an operator the data says is unconfirmed | **Fixed:** a neutral description |

The review also confirmed:

- `_redirects` and `_headers` are byte-identical to `d0cb62c` for both builds;
- the sitemap is valid by `xmllint`, with the same 24 URLs;
- the preview has no sitemap and its robots shut everything;
- the starting-price offer is unchanged;
- `confirm` is never rendered;
- the copy of the city, township, Cape Agulhas and Garden Route pages is supported by their official pages;
- no link was needed;
- the hero alt text is appropriate;
- the patch adds no script, third-party request or personal data.

## 12. Deferred, and not done here

None of these is done by this branch:

| Item | Owner or next step |
|---|---|
| The Search Console baseline export, again just before the cutover (H7) | The owner, on the day |
| Temporary redirects on the live WordPress site for the addresses that 404 today (section 6) | The owner's decision; this task does not touch WordPress |
| GA4 association, Tag Manager, browser conversion events | A separate privacy and configuration approval (section 8) |
| A second Search Console owner | The owner |
| The domain cutover (A2) and the H5 DNS fixes | `docs/seo/READINESS.md`, sections 5 and 6 |
| Submitting the production sitemap | Launch day, step 11 |
| Final indexing checks | Launch day, steps 12–15 |
| The promotional film and its indexing | Section 9, once it is published |
| Refreshing the `seo-preview` deployment with this branch | Needs the Good Times Cloudflare token (never pasted in chat) |
| `lastmod` | Only with the manifest approach in section 5 |

**Business facts not yet confirmed.** They are recorded in each item's `confirm` list in the data, never published as fact:

- **Shark cage diving:**
  - the dive operator to name (the boat in Good Times' photograph is Marine Dynamics);
  - the operator's age, health and weight limits;
  - what the gear includes;
  - the launch point in Gansbaai.

  Until then the page says the operator sets those requirements and they are confirmed with the quote.
- **Shark cage diving, quad biking and skydiving:** whether the activity itself is private (only the guest's group) or shared with the operator's other guests. Their official pages say "Max 10 people" and "operated by accredited third-party specialists", and never "private". Two things wait on this answer:
  - the site-wide lines in section 4, if the activities are shared;
  - the old "Private: only your group", restored through `groupLine()`, if they are private.
- **Garden Route:**
  - whether the journey starts with pickup from the guests' accommodation (the official page says "flexible, by arrangement");
  - whether Good Times can arrange accommodation.
- **Airport transfers:** the vehicle for 5–8 guests; whether child seats are available.
- **Legal:** the 24-hour free cancellation shown on the tour pages against the terms' "confirmed when you book" (the legal checklist's item 4, B2–B5). This is unchanged here.
