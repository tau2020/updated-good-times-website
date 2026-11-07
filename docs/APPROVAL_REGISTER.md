# Approval register

Everything that is still waiting for the owner of Good Times in Cape Town, as of 5 Nov 2026. Until each item is settled, the site does the safe thing shown in the last column. Nothing here blocks staging. Only the items marked **release** must be settled before a production release, and the release itself needs the owner's explicit approval (A1).

`npm run` commands and file paths refer to this repository. `scripts/release-gate.mjs` checks the items it can (B1–B5).

## A. Release and infrastructure

| # | Decision | What it unlocks | Until then |
|---|---|---|---|
| A1 **release** | Approve the production release after reviewing staging (<https://staging.good-times-in-cape-town.pages.dev>). Recorded as `RELEASE` in `scripts/cloudflare/project.mjs` (date, name) | `deployTarget('main')` and `scripts/cloudflare/build.mjs production` | Production refuses to deploy; only staging exists |
| A2 **release** | Approve the domain cutover: point goodtimesincapetown.co.za at the Pages project. The domain serves the current website and is not in this Cloudflare account. Decide where DNS is managed, and which host is canonical: the current site uses **www**; the project defaults to the apex with www redirected to it (`DOMAIN` in `project.mjs`) | `setup.mjs domain --apply` (custom domains, HTTPS, redirect) | `domain`, `email` and `resend` refuse `--apply`; no DNS changes |
| A3 **release** | Check the current website's full list of addresses before the cutover. The ten tour pages, the Garden Route tour and the airport transfer (`/tour/<slug>/`) already redirect to their new pages (`src/data/redirects.mjs`, 26 rules); any other page with traffic or links (about, contact, blog, …) should be added | No broken links or lost search ranking after the move | Those 26 redirects only |
| A4 | Go live with the enquiry system: create Good Times' own database (Neon), a Resend account with goodtimesincapetown.co.za verified as a sending domain (DNS records, so part of A2), and the three secrets (`DATABASE_URL`, `RESEND_API_KEY`, `ENQUIRY_SIGNING_SECRET`) in the Pages project. Confirm the inbox for new requests: delivery is planned to info@goodtimesincapetown.co.za, the mailbox that receives mail today, and moves to hello@ (the public address since 6 Nov 2026, already the sender) once Good Times confirms hello@ receives mail and the staff who may use the bookings dashboard (`ADMIN_EMAILS`). Then a controlled live test on staging, sending only to test inboxes | Bookings arrive in the inbox with a GT- reference; the visitor gets an acknowledgement | `ENQUIRY_MODE=preview` everywhere: the form validates and reviews, then says plainly that nothing was sent |
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
| C3 | ~~A second public email, if any (`site.contact.emailGeneral`)~~ | Resolved 6 Nov 2026 (Addendum): hello@goodtimesincapetown.co.za is the primary address and replaces info@ in every public place (footer, menu, Travel Concierge, contact, enquiry, privacy and terms pages, the emails' footer and the JSON-LD); stuart@goodtimesincapetown.co.za is the additional contact, on the contact page's contact section. Both mailboxes must exist with Good Times' mail provider before the cutover (A2). Form delivery, replies and sign-in links stay with info@ until hello@ is confirmed (A4); stuart@ is a personal mailbox and is not routed |
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
| P3 | Photographs for Cape Agulhas and Sky Diving, and an actual whale photograph | Since the media audit (6 Nov 2026): openly licensed photographs of the southernmost tip and lighthouse at Cape Agulhas and of a tandem skydive (not taken in Cape Town), credited on the photograph (P8); Hermanus photographs for whale watching |
| P4 | Photographs with children or possible minors are not used: four were withdrawn on 5 Nov 2026. They can return only with written parental consent | Not used |
| P5 **release** | Two AI-generated pictures remain on the home page (basis G): the hero's café scene of five friends, and the sand journey's destination, now the owner's film `section-2-video.mp4` (M5). The phone's six AI pictures were replaced with real Good Times photographs on 6 Nov 2026 (media audit). Nothing presents the AI pictures as guests, reviews or Good Times photographs, and the photo credits say they are AI-generated; consumer and advertising rules still expect an operator not to suggest real customers where there are none. Approve them, or supply real photographs to replace them | Feature preview only (`media-preview`), not staging or production; credited as AI-generated |
| P6 | ~~Three of the phone's AI pictures needed a look against how the tours run (a penguin within arm's reach, a Camps Bay beach stop, a sunset lookout)~~ | Resolved 6 Nov 2026: the phone shows six real Good Times photographs instead (`src/data/phone-gallery.json`) |
| P7 | Five travellers' photographs the owner marked for use by name in the Drive library (basis O): three from the Langa museum (`…traveller 26/35/39-approved`), the guide-and-guests selfie in the phone (`replace-goats-on-home-page-…traveller 106`) and the garden path in the Garden Route gallery (`use-for-garden-route-Scenery 14 … [traveller]`). They are the travellers' own: confirm each photographer's permission and the consent of anyone pictured | Used, credited "A guest's photograph from a Good Times tour" |
| P8 | Four openly licensed photographs (basis L, Wikimedia Commons), used only where Good Times has none: Cape Agulhas's southernmost-tip marker (Shaomi72, CC BY-SA 3.0) and lighthouse (Josep M. Gracia, CC BY-SA 4.0), a tandem skydive (CC0, not in Cape Town) and shark cage diving off Gansbaai (Olga Ernst, CC BY-SA 4.0, the home page's adventure card). Keep them until Good Times has its own, or supply its own | Used and credited (on the photograph where it is a tour's hero, and on the photo credits) |
| P9 | The About page's owner photograph (`about-image.jpg`): its caption and alt text say "the owner of Good Times in Cape Town" and give no name. Confirm whether to name the owner there (the section's heading names the founder, Stuart Matanhire) | Unnamed |
| P10 | Library file names that did not match what the photographs show (each was checked by eye): `replace-goats-on-home-page-…traveller 106` is a selfie of a guide and two guests (used in the phone, not as the goat tower); `replace-A selfie above the bay-…traveller 087` is a cheetah and `replace-A selfie above the bay.jpg` a leopard (neither used: no tour lists a cheetah, lion or leopard encounter, and their places are unknown); `second-scene-after-hero-section.jpg` is Boulders Beach (used in the home exhibition; the second scene is now the film). Say what each was meant for. A photograph showing the whole Fairview goat tower would replace the only one the library has (a detail of its arch, now shown uncropped) | As described |
| P11 | The skydiving image the brief asks to generate with AI (6.J) was not made: no image-generation tool was available, and the reference photograph the brief mentions ("Use the photo below") was not attached. Supply the reference (and the means), or keep the licensed photograph (P8) | Blocked; the licensed photograph stands in |
| P12 | The library's plated-food close-ups (`Food 02 - Plated lunch dish [traveller]`, `Food 03 - Tasting board and wine pour [traveller]`) and other travellers' photographs were not used (travellers' own, permission required). With their photographers' permission they would add the food close-ups the site lacks | Not used; the food photographs added are Good Times' own (guests at meals and tastings) |
| P13 | Galleries for three days: their photographs were repeats of other placements and were removed with the duplicates (media audit, finding M4). Whale Watching and Quad Biking now show their one photograph as card and hero, with no Gallery tab. Quad Biking and the Private Cape Town Experience have no photo band, which needs a landscape photograph of at least 1600 px. More photographs of Langa itself (the arts centre, the drumming, residents) would also help (the unused ones show children, P4). Supply photographs of these days | No gallery or band for these days until photographs are supplied |

## M. The cinematic motion layer (on `main` since 6 Nov 2026, merged at the owner's direction before M0–M5 were settled; not deployed; details in `docs/motion/`)

| # | Decision | Until then |
|---|---|---|
| M0 | The baseline: the motion package names deployment `08077562` (the other redesign project's audit preview, commit `c079427`, behind a login), but describes this site's home page (the frozen hero and the phone gallery). Confirm this repository is the target (`docs/motion/00-discovery.md`) | Built here, on its own branch from `main` at `d2b30e1`, then merged into `main` |
| M1 | The flying aircraft: the logo's own airliner (built as the default) or the package's propeller aircraft (preview builds, `?aircraft=prop`) | The logo's airliner |
| M2 | Its flight: in from the left over the hero's sky, then along the logo's own dotted route into the "i" of "in"; the titles follow 85 ms apart | As built |
| M3 | Footprint realism: approve the close-ups in `docs/motion/qa/footprint-*.jpg`, or ask for the next pass (messier toes, sole texture, damp sand) | As built, on `main`, not deployed |
| M4 | The 8-step walk (6 on phones), the sweep onto the destination image and the section's length (one screen plus 2 screens of scrolling on desktop, 1.7 on phones) | As built, on `main`, not deployed |
| M5 | The sand journey's destination. The owner replaced the Camps Bay photograph with their own image of a woman at the water's edge (6 Nov 2026), then the same day with the film of it, `section-2-video.mp4`: the surf and the wind move, she, the camera and her four prints do not, and the animated trail lands on those prints as before (`docs/motion/07-destination-image.md`, `audit/`). Its encoder tag ("produced by Google") and form (8 s, 24 fps, 720p, like the hero's Gemini film) say it is AI-generated, like the still (basis G, credited beside it and on the privacy page): confirm, and approve it with the hero's under P5. The film is 1280 × 720: on screens wider than 1280 px it is enlarged by the browser, as the 1672 px still was above 1672 | The film, a 7 s loop over its own first frame, on the feature preview (`media-preview`) |
| M6 **deploy** | Deploy the motion layer to staging, and later to production, once M0–M5 are settled | Merged into `main` on 6 Nov 2026 at the owner's direction, with M0–M5 still open; staging and production unchanged |

## R. Reviews

| # | Point | Until then |
|---|---|---|
| R1 | Recheck the Tripadvisor rating (5.0), review count (264) and breakdown before release, and approve the ten review cards: short summaries in our own words, each linked to the review, with the reviewer's public Tripadvisor name. No reviewer's text is copied | Shown with the date they were read |
| R2 | Reviewers' profile photos, added at the owner's request (5 Nov 2026). Supply each reviewer's own Tripadvisor profile photo as a square file (168 px or larger) in `src/assets/img/reviewers/`, named: `seamus0314.jpg`, `travelangeldani.jpg`, `lydia-w.jpg`, `thea-h.jpg`, `meena301.jpg`, `dave-f.jpg`, `kashou106.jpg`, `andyjanec.jpg`. They cannot be collected automatically: Tripadvisor loads them with scripts and blocks automated browsing. These are personal images of private individuals; the Drive research notes advised against using them, and the reviewers' consent is not recorded. Confirm you accept that, or ask the reviewers | Each card keeps its illustrated avatar (home) or initials (reviews page) until its file is there |
| R3 | The brief of 6 Nov 2026 says the review content and the reviewers' headphotos are approved and verified. The review archive holds no headphoto (it indexed the photographs attached to reviews, not profile photos), records 0 approved photographs, and every reviewer's permission as "Not requested" (`content/reviews-source-audit.md`). Supply each approved headphoto as a file (R2's names) with a record of the reviewer's permission, and any approved verbatim excerpt with its permission (`quote`, `excerpt`, `quoteApproval` in `src/data/reviews.mjs`) | Initials on every card; our labelled one-line summaries; no headphoto, no verbatim text |

## T. Trust marks

| # | Point | Until then |
|---|---|---|
| T1 | The Cape Tourist Guides Association (CTGA). Good Times' own site says it is "a registered associate of the Cape Tourist Guides Association", but CTGA's list of current associate members (tourguides.capetown/our-associates.html, read 6 Nov 2026) does not name Good Times in Cape Town. Confirm the membership (a current CTGA certificate, or ask CTGA, associates@tourguides.capetown, to list Good Times), then set `site.credentials.ctga.verified` to `true`. CTGA lets associates show its logo "advertising that you only employ/promote legal/registered guides": the line beside it says only "Connected to the Cape’s professional guiding community." | The home page's credentials strip shows the CTGA logo and line in preview builds only, marked "Preview only"; production builds leave them out. The About page and the FAQ keep the company's existing sentence about the association |

## S. Design and copy

| # | Point | Until then |
|---|---|---|
| S1 | The typeface: Bricolage Grotesque for headings, DM Sans for text and interface, Caveat for the occasional handwritten note ("Good Times, Naturally", 6 Nov 2026; `design/font-design.md`). Replaced Plus Jakarta Sans and Inter. The logo is artwork and is not set in any of them | In use on the feature preview |
| S2 | The palette, taken from the approved logo: navy `#102E42`, the leaf-green action palette of the brief of 6 Nov 2026 (`#147D43` primary, `#105B35` deep, `#106638` hover, `#DFF3DE` leaf light, `#EFF8F0` soft ground, `#C9E970` lime accent, ink `#10241D`; `design/button-design.md`), warm sand neutrals, a sunshine accent | In use on the feature preview |
| S3 | The rewritten copy on every page, in Good Times' voice, from its own published facts | In use; corrections welcome |
| S4 | The home hero, "frozen moment" (5 Nov 2026, replacing the Cape Point headland photograph): the supplied café film held still except for the cloud over Table Mountain and the sea; one call to action bottom left, **Good Times start Here!** (to the tours, worded and capitalised as in the brief); the phone gallery "Cape Town Memories" bottom right, swiping on its own. The earlier static-photo brief's headline, supporting line and Explore Tours button give way to the later brief, which asks for one call to action and no paragraph. Nothing covers a face at any size (`node qa/hero.mjs`) | On staging for review (5 Nov 2026); not in production |
| S5 | The company statement under the logo, **"Make Unforgettable Experience In The Mother City"**, shown exactly as supplied on 6 Nov 2026 (Addendum) in every page's header (not on phones narrower than 360 px), the footer, the share image and the emails' header, revealed by the home entrance once the logo is whole (when the aircraft hands it back after landing). The wording is kept as written, including the singular "Experience"; should "Experiences" have been meant, it is one word in `site.statement` (`src/data/site.mjs`) and `node src/tools/build-og.mjs` for the share image. The logo files are untouched (`test/lockup.test.mjs` checks them byte for byte) | In use on the feature preview |
