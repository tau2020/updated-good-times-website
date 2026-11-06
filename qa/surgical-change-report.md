# Surgical change report: "Good Times, Naturally"

Typography, leaf-green buttons, the removal of the dripping-water section, copy, the owner's Cape Peninsula
photograph, the CTGA credentials strip and the review section, on 6 Nov 2026. Everything below was built from the code
behind the target preview and checked on Cloudflare Pages preview deployments, never on a local server.

| | |
|---|---|
| Target preview (baseline, untouched) | <https://media-preview.good-times-in-cape-town.pages.dev>, deployment `b017d12f`, built from `4d7f93f` |
| Starting commit | `58cace8` on `main` (the merge of the media audit, PR #2). Its site sources are byte-identical to `4d7f93f`: the two commits between them add audit documents only (`git diff --name-only 4d7f93f 58cace8` lists `audit/`, `README.md`, `docs/APPROVAL_REGISTER.md` and `qa/media-fixes.mjs`) |
| Branch | `ultraxen/kind-hopper-4usue2` |
| Final site commit | `cd1668d` (the report and its evidence are committed after it and change nothing on the site) |
| Feature preview | <https://naturally-preview.good-times-in-cape-town.pages.dev>, deployment `89a1dcf6` from `cd1668d` (built with `node scripts/cloudflare/build.mjs preview`, deployed with `wrangler pages deploy site --project-name good-times-in-cape-town --branch naturally-preview`) |
| Not touched | Production (never deployed), `main`, the `staging` alias (`7e19bd48`), `media-preview` (`b017d12f`) and `media-baseline` (`9d9bc87a`); no project setting, domain or DNS changed. Merging and release wait for the owner |

## 1. What changed

| Brief | Change | Where |
|---|---|---|
| §1 Typography | **Bricolage Grotesque** (display, weight and optical size), **DM Sans** (body and interface), **Caveat** (a few hand-written notes), self-hosted unmodified OFL WOFF2 latin subsets with metric-matched fallbacks and `font-display: swap`; Plus Jakarta Sans and Inter removed. One set of type tokens (the brief's scale, plus `--text-h4` for cards); the duplicate font tokens in `styles.css` removed; no sheet names a family; chapter marks and eyebrows calmer (sentence case, gentle tracking); headings never fake an italic | `src/assets/css/tokens.css`, `styles.css` §1 and §4, `living-cape.css`, `living-cape-system.css`, `src/partials/layout.mjs` (preloads), `design/font-design.md` |
| §2 Buttons | One **leaf-green pill** system: Primary · Leaf Green, Secondary · Soft Leaf, Outline · Fresh Air, On-image, plus tertiary, utility and danger; a CSS-mask leaf after the words; 44/48/52 px; a 2 px lift, 200–240 ms, ink and lime focus rings, pressed, disabled, loading, reduced motion, forced colours. Make It Yours keeps its compass medallion and the hero its pill, on the same tokens. `--gold`, `--ink`, `--gold-tint`, `--forest-soft`, `--gt-em` and the Living Cape's green and focus tokens now point at the leaf palette | `src/assets/css/buttons.css`, `tokens.css`, `styles.css` (`.btn-coin`, `.btn-champagne`), `living-cape.mjs` (`quietOutline` over photographs), `design/button-design.md` |
| §3 Water section | **Removed** (§3 below); the sand journey now hands over to a slim credentials strip and the coast-road chapter | `index.mjs`, `living-cape.js`, `living-cape.css` |
| §4 Copy | One voice across the home page, tours, the four flagship tour overviews, transfers, about, destinations, reviews, contact, FAQ, multi-day tours and the booking form's next steps; every fact kept; "Good Times start Here!" unchanged | `content/copy-audit.md` (every line, before and after, and why) |
| §5 Photograph | The owner's `Cape Peninsula Private Tour - traveller 077.jpg` as the second half of the home page's Cape Peninsula chapter | §5 below |
| §6 CTGA | A credentials strip right after the sand journey; the association's logo shown in preview builds only until the membership is confirmed | §6 below |
| §7 Reviews | "The people behind the good times": a light grid of the ten real reviews with initials, ratings, tours, labelled summaries, dates and links, the dated listing rating, no hard-coded count | §7 below, `content/reviews-source-audit.md` |
| §8 Synergy | Warm sand and soft-leaf grounds beside the ocean photography; the leaf repeated as button flourish, strip bullet and photo frame; one focus ring everywhere; the booking form's Back button opts out of the leaf (`--plain`) and its Send keeps a single spinner | `buttons.css`, `styles.css`, `living-cape.css` |

## 2. Deliberately left untouched

The home hero (its film, the café scene, the phone gallery, its layout and animations; only the call to action's typeface
and green changed), the logo and every logo file, the brand aircraft, **the footprints-in-sand journey and the woman at
the water's edge** (scene, film, timing, trail and pinning unchanged; only its words' case and one line), navigation
structure and behaviour, the Travel Concierge, the footer, every tour, package and transfer fact and price, the booking
and enquiry logic and its validation, the enquiry API and the bookings dashboard, every URL and redirect, page titles,
meta descriptions (except the reviews page's) and structured data, the photography (one photograph added, one retired
with its section), the media system, GSAP (one engine; no second scroll controller), and the legal pages.

## 3. The dripping-water section: what was removed

The section after the sand journey, chapter 01 "A private day, shaped around you" (`<section class="lc-sun"
data-sun>`): a fine SVG stream that left the sand journey's lower edge, trickled down beside the words and spread over a
photograph. At 1440 px it was 1,472 px tall, most of it empty paper (screens in `compare/1440/after-the-sand-journey.jpg`
and `compare/*/motion-sand-journey-exit.jpg`).

| Removed | Detail |
|---|---|
| Markup | The section (19 lines in `src/pages/index.mjs`): its SVG layer `[data-sun-water]`, the words, the framed photograph `[data-sun-frame]` and its caption link |
| Script | The whole `water()` routine in `src/assets/js/living-cape.js` (530 lines): the SVG builders, the course measurement, the scrubbed GSAP timeline and its ScrollTrigger (`api.sun`), the on-screen ScrollTrigger that added and removed a `gsap.ticker` callback, the per-frame renderer and its state (`api.water`) |
| Styles | 146 lines of `living-cape.css`: `.lc-sun*`, `.lc-water__*` and their responsive rules |
| Tests and hooks | The browser test of the water's motion, and the `__livingCape.sun`/`.water` hooks it read |
| Photograph | `peninsula-bench-view` is no longer placed anywhere (its renditions stay in the repository, unused, as other retired photographs' did until deleted) |
| Kept from it | Its facts: "since 2014" and "private" now open the credentials strip; the private-day promise is in the tours page banner and the new Peninsula block |

**Re-joined:** the scroll triggers that remain are measured on load and refreshed once lazy images land (the existing
`ScrollTrigger.refresh()` on `load`); none points at a removed element (checked in the browser on the preview). The
coast-road chapter now begins **1,166 px sooner at 1440 px** (5,072 → 3,906), 736 px sooner at 1024, 605 px at 768, 477
px at 390 and 451 px at 360; the slim strip that joins them is 306 px tall at 1440 and continues the beach's sand tone.

## 4. Before and after

`qa/surgical/compare/<width>/<section>.jpg`: the baseline on the left, the feature on the right, at **360, 390, 768,
1024 and 1440 px** (130 composites, `qa/surgical/compare/index.json`), captured from the two deployments with
`qa/surgical-shots.mjs` (static composition: `?nomotion` and reduced motion, as the media audit captured; plus the
sand journey's exit with motion on) and assembled with `qa/surgical-compare.mjs`. The most telling:

| Composite | Shows |
|---|---|
| `motion-sand-journey-exit.jpg` (each width) | The scroll from the sand journey onwards with motion: the water and the empty screen before, the strip and the coast road after |
| `after-the-sand-journey.jpg` | The removed chapter beside the credentials strip |
| `peninsula-photograph.jpg` | The new photograph block (nothing in its place before) |
| `ch01-coast-road.jpg`, `ch10-final-call.jpg` | Statements in Bricolage Grotesque over photographs, faces clear; the on-image button |
| `ch04-ways-and-buttons.jpg`, `booking-form.jpg`, `header-and-hero.jpg` | The leaf-green buttons, Make It Yours, the hero's call to action |
| `ch09-reviews.jpg`, `reviews-page.jpg` | The dark carousel with illustrated avatars before; the light grid with initials after |
| `tours-banner.jpg`, `transfers-banner.jpg`, `peninsula-overview.jpg`, `winelands-overview.jpg` | The new headlines on inner pages |

## 5. The Cape Peninsula photograph

| | |
|---|---|
| Source | Drive file `1emxrC_RVorRLgK_0OsCvCfv2ctSBSWXu`, `Cape Peninsula Private Tour - traveller 077.jpg`, 2268 × 4032, SHA-256 `ee94541f…f6cd1` (kept, unaltered, in the git-ignored `media-src/drive/`) |
| Renditions | 480, 800, 1200 and 1600 px wide, AVIF and WebP, from the project's own pipeline (`node src/tools/build-images.mjs --only=chapmans-lookout-travellers`; never upscaled); the original stays the master |
| Location | Home page, the second half of chapter 01 (the Cape Peninsula), straight after the coast-road scene: "The best bits? They’re yours to remember." |
| Treatment | Shown **whole** in its own 9:16 shape (`object-fit: contain` in a frame of the photograph's proportions), in a leaf-shaped frame (two wide corners, two tight) on a soft leaf ground; the corners take sky and stone, never a head or a foot (checked at the five widths); rises once as it is reached, like the other prints (`data-rise`), nothing with reduced motion |
| Caption and credit | Hand-written "Chapman’s Peak Drive, above Hout Bay"; "A guest’s photograph from a Good Times tour" (basis O) |
| Alt text | "Two travellers standing together at a stone-walled viewpoint on Chapman’s Peak Drive, with Hout Bay, its harbour and the mountains across the water behind them" (the place confirmed against the library's own Hout Bay photograph: the Sentinel and Little Lion's Head) |
| Placement | One place on the whole site (`test/naturally.test.mjs`); named nobody, tied to no review |
| Rights | `docs/RIGHTS_REGISTER.md` (basis O); the photographer's permission and the consent of the two travellers are the owner's to confirm (P7, as for the other guest photographs the owner chose) |

## 6. The Cape Tourist Guides Association

| | |
|---|---|
| Wording shown | Eyebrow "Good Times since 2014"; heading **"Local knowledge. Professional guiding."**; three points: "Accredited local guides — Recognised by the Western Cape tourism authorities.", "A registered operator — Registered with Western Cape Tourism.", "Private by design — Only your group, your guide and a day planned around you."; beside them the CTGA logo and **"Connected to the Cape’s professional guiding community."** |
| Evidence for the points | Good Times' own site (About › Accreditations, Safety & Trust, read 5 Nov 2026): accredited tourist guides recognised by the National Department of Tourism under the Western Cape Department of Economic Affairs and Tourism; a Western Cape Tourism registered operator; "a registered associate of the Cape Tourist Guides Association" |
| Evidence for CTGA | **Not independently verified.** CTGA's own list of current associate members (<https://tourguides.capetown/our-associates.html>, read 6 Nov 2026) does not name Good Times in Cape Town. CTGA offers its logo to associates "to place on your website advertising that you only employ/promote legal/registered guides" (Becoming an Associate Member) |
| Logo | The association's own vector file, unaltered (`tourguides.capetown/images/logo.svg`, SHA-256 `632f01f5…d705`), not redrawn; no script or external reference in it. The owner's phone screenshot was not attached to the brief and was not used |
| What a visitor sees | **Preview builds:** the logo and its line, with "Preview only: shown for review until the CTGA membership is confirmed". **Production builds:** the strip without the logo and line, until `site.credentials.ctga.verified` is set (T1 in `docs/APPROVAL_REGISTER.md`). The About page and the FAQ keep the company's existing sentence about the association, as the brief allows. No award, endorsement or certification is claimed; the Tripadvisor rating is kept apart, beside the reviews |

## 7. Reviews and headphotos

- **Reviews published with an authorised headphoto: 0 of 10.** The review archive indexes the photographs attached to
  reviews, not profile photos ("avatars … were not collected"); its approved folders are empty; the live sheet records
  all 70 reviewers' permission as "Not requested"; nothing was supplied in `src/assets/img/reviewers/`. No Tripadvisor
  image was downloaded and no one's photo was substituted. Every card shows the reviewer's **initials**; an approved
  photo, once supplied as a file, covers them with no code change.
- **Ten reviews published**, each matched to the archive's verified record (same review ID, date, 5.0 rating and
  product): names, places, ratings, tours, months and links are the reviews' own; the one-line texts are labelled
  "The review in short, in our words" (no quotation permission is recorded).
- **Excluded:** headphotos (none available), verbatim excerpts (no permission), the archive's 343 review photographs
  (rights unverified), business partners' reviews, the illustrated stand-in avatars.
- Full mapping, checks and the steps to publish a headphoto: `content/reviews-source-audit.md`.

## 8. Checks

| Check | Where | Result |
|---|---|---|
| Build (`node scripts/cloudflare/build.mjs preview`) | Cloud container | 25 pages |
| Static QA (`npm run check`: links, images, alt text, headings, page size) | The build | 25 pages, no problems |
| Brand guard (`npm run guard`) | Repository and build | 2,685 files clean |
| Unit and integration tests (`npm test`) | Cloud container | **300 / 300 pass** (294 before; six new in `test/naturally.test.mjs`: tokens and faces, button contrast and states, the water's removal, the CTGA gate, the photograph's single placement and whole frame, the reviews' honesty rules) |
| Deployed smoke check (`scripts/cloudflare/smoke.mjs --env preview`) | Feature preview | **23 / 23**: every page, noindex, CSP/HSTS/nosniff/DENY, the preview-only enquiry API (503), the film's byte ranges, the redirects |
| Browser suite (Playwright: desktop 1440 × 900 and Pixel 7; 16 routes' axe WCAG 2.2 AA scan, keyboard, focus, reduced motion, the booking wizard end to end, currency, motion) | Feature preview | **313 passed, 3 failed, 36 skipped** (352; skips are tests for the other device). Re-run one at a time against *both* deployments: the desktop aircraft-resize test passes on both (a timing failure under two workers); the Pixel 7 phone-gallery lift-out (the enlarged photograph 183 px wide against an expected 273 px) and the Pixel 7 taste compositions' motion test **fail identically on the untouched baseline**: pre-existing, in components this work did not change. Every new or changed test passes, including the 16 routes' axe scan |
| Five-width capture (`qa/surgical-shots.mjs`, 13 routes × 360/390/768/1024/1440 + motion) | Both deployments | **0** horizontal overflow, **0** console errors, **0** failed requests on 70 captures each side; Bricolage Grotesque and DM Sans loaded on every route, Caveat only on the home page |
| Font swap (`qa/surgical-fontswap.mjs`: each page's first block with the fonts blocked, then loaded) | Feature preview, 11 routes × 360/390/412/768/1024/1440 | **0 of 66** first blocks change height when the fonts arrive (the first deployments had three pages jumping 16–45 px at 412 px: fixed, see below) |
| Performance (`qa/media-perf.mjs`) | Both deployments, interleaved | Layout shift **unchanged** on every route and profile; desktop LCP within noise; phone LCP (Slow 4G, 4× CPU) **+44 to +108 ms**, from 11–72 KB more font data at load (§8.1); 0 failed media. `qa/surgical/perf-before.json`, `perf-after.json` |

### 8.1 Performance

`qa/media-perf.mjs` (the media audit's tool) on the baseline and the final deployment, three cold runs each, medians:
desktop 1440 × 900 unthrottled, and Pixel 7 on "Slow 4G" (150 ms, 1.6 Mbit/s, 4× CPU) while loading. The baseline was
measured at 20:06 and the final deployment at 20:48 UTC; single-digit differences in milliseconds are noise.

| Route | Profile | LCP ms (median of 3) | LCP element (after) | CLS at load | CLS over the visit | All bytes at load, KB | Images at load, KB | Images over the visit, KB | Failed media |
|---|---|---|---|---|---|---|---|---|---|
| `/` | desktop | 720 → 656 | img hero-moment-poster-1280.avif | 0.0006 → 0.0006 | 0.0007 → 0.0006 | 1193 → 1198 | 634 → 563 | 2152 → 2080 | 0 / 0 |
| `/tours/` | desktop | 564 → 648 | img cape-point-headland-1600.avif | 0.0008 → 0.0008 | 0.0008 → 0.0008 | 611 → 623 | 398 → 398 | 410 → 410 | 0 / 0 |
| `/tours/cape-peninsula-private-tour/` | desktop | 724 → 620 | img hout-bay-viewpoint-couple-1600.avif | 0.0006 → 0.0006 | 0.0006 → 0.0006 | 882 → 893 | 620 → 620 | 620 → 620 | 0 / 0 |
| `/about/` | desktop | 628 → 616 | img cape-coastline-1600.avif | 0.0006 → 0.0006 | 0.0006 → 0.0006 | 535 → 589 | 337 → 349 | 349 → 349 | 0 / 0 |
| `/` | mobile | 2920 → 3004 | img hero-moment-poster-1280.avif | 0.0075 → 0.008 | 0.0076 → 0.008 | 1006 → 1078 | 413 → 409 | 3048 → 3168 | 0 / 0 |
| `/tours/` | mobile | 2552 → 2660 | img cape-point-headland-1200.avif | 0 → 0 | 0 → 0 | 601 → 613 | 388 → 388 | 1156 → 1156 | 0 / 0 |
| `/tours/cape-peninsula-private-tour/` | mobile | 2376 → 2420 | img hout-bay-viewpoint-couple-1200.avif | 0 → 0 | 0 → 0 | 387 → 398 | 125 → 125 | 431 → 431 | 0 / 0 |
| `/about/` | mobile | 2272 → 2368 | img cape-coastline-1200.avif | 0 → 0 | 0 → 0 | 524 → 566 | 326 → 326 | 525 → 525 | 0 / 0 |

- **Layout shift is unchanged**, at load and over the whole visit. The first deployment of this work had added a
  0.025 shift on `/tours/` on phones (fonts arriving and re-wrapping a heading); the weight-split fallbacks removed it
  (0 → 0 now), and `qa/surgical-fontswap.mjs` finds no page whose first screen moves when the fonts arrive.
- **Desktop LCP** is within noise (−104 to +84 ms). The LCP element is the same photograph on every route.
- **Phone LCP** is 44–108 ms slower, in proportion to the extra bytes at load: Bricolage Grotesque and DM Sans weigh
  114 KB together, against 105 KB for Plus Jakarta Sans, its italic and Inter on pages that used the italic (home,
  tours, the tour pages: +11–12 KB) and 75 KB on pages that did not (`/about/`: +42 KB); the home page also fetches
  Caveat (75 KB) for its hand-written notes (+72 KB in all). Caveat was taken off `/tours/` for this reason. Lighter
  options, if the owner wants them: drop Caveat from the home page (−75 KB), or Bricolage's optical-size axis (−36 KB,
  losing the display cut's character).
- **Images:** the home page loads 71 KB less image data on desktop (the removed chapter's photograph is gone); over a
  whole phone visit it fetches 120 KB more (the new Peninsula photograph). No media request failed.

### Fonts and buttons are global tokens (confirmation)

- Every `font-family` in every stylesheet is `var(--font-display|body|accent)` or the Living Cape's aliases of them,
  outside the `@font-face` rules (`test/naturally.test.mjs` fails otherwise). On the preview the computed families are
  "Bricolage Grotesque" for headings, "DM Sans" for body and navigation, on all 13 routes at all 5 widths
  (`qa/surgical-shots.mjs` reports).
- Every button is a `.gt-button` variant, `.btn-coin` or `.btn-champagne`, all reading the shape tokens of `buttons.css`
  and the colours of `tokens.css`. Computed on the preview: primary fill `rgb(20, 125, 67)` (`--green-primary`), Soft
  Leaf `rgb(223, 243, 222)`, radius `999px` on every pill (header, hero, wizard, cards' actions, footer, lightbox,
  calendar), white words on every primary (browser suite, five pages), 44 px minimum on every control.

### Responsive and functional review, by width

Each width was looked at section by section on the preview (`compare/<width>/`), with these findings fixed and
re-deployed before the final run:

| Found (on the preview) | Fix |
|---|---|
| 768 and 1024 px: the coast-road line, longer in the first draft, ran over the couple's faces (at 1024 the baseline's line already touched one face) | Shorter line (the brief's own wording) and a narrower measure between 48 and 80 em, so it stays in the sky and sea to the left of the faces |
| 1024 px: the credentials strip's three columns were cramped | Three columns from 1280 px; below, the heading and the badge share a row over the three points |
| 320 px: "Explore the Cape Peninsula Tour" ran past the screen (DM Sans is a little wider, and the leaf adds about 1 em) | Below 384 px a long label wraps inside its pill in balanced lines (`buttons.css`) |
| The review cards' link names were checked while collapsed | The test opens the grid first (a hidden card's link has no accessible name to check) |
| The booking form's Back carried a trailing leaf; Send showed two spinners when busy (the second pre-existing) | `--plain` on Back; a control with its own spinner shows only that one |
| The performance comparison showed a new layout shift on `/tours/` on phones (CLS 0 → 0.025 at 2.4 s); blocking the fonts showed the tours, contact and reviews pages' first blocks 16–45 px shorter in the fallback: bold headings fell back to Arial *Regular* (headings never synthesise bold), narrower than Bricolage Bold | Regular and bold fallback faces for each family, the bold one sized from the site's own headings measured in both faces at phone sizes (`design/font-design.md` §2); 0 of 66 first blocks now move |
| The same comparison: Caveat (75 KB) loaded on `/tours/` only for the route collage's four decorative, hidden labels | Those labels use the display face; Caveat now loads on the home page only |

- **360 / 390:** the hero's call to action and phone unchanged; the strip stacks; the photograph is whole at about 330–350 px wide;
  three reviews then "Show 7 more reviews"; headings 44 px (h1) and 33.6 px (h2), no word broken; the phone bar's Call
  and Make It Yours fit.
- **768:** strip in two rows; photograph and words side by side; four reviews; faces clear in every scene.
- **1024:** header Make It Yours at its compact 44 px (46 px from 1120 px); strip in two rows; photograph block side by side; six reviews.
- **1440:** strip in three columns; statements at 72 px, as before; six reviews and the dated rating beside the heading.
- **Navigation and booking:** every page renders with its header, drawer and footer; the booking wizard's tour and
  transfer paths work end to end in the browser suite (preview mode: validates, reviews, sends nothing and says so);
  every call to action keeps its destination and parameters (`test/cta.test.mjs`).
- **Accessibility:** no serious or critical axe violation on the 16 audited routes; one `h1` per page; every new image
  has factual alt text (the CTGA logo "Cape Tourist Guides Association"); initials are decorative beside the visible
  name; the reviews toggle is a `button` with `aria-expanded`/`aria-controls` and moves focus to the first revealed
  review; focus rings 3 px with offset; with reduced motion nothing lifts, turns or rises.
- **Layout stability:** the photograph and the logo reserve their size (`width`/`height`, the frame's aspect ratio);
  the fonts swap onto metric-matched fallbacks.

## 9. Known limitations and what is left for the owner

1. **CTGA membership (T1).** Confirm it (a current certificate, or ask CTGA to list Good Times), then set
   `site.credentials.ctga.verified`; until then production shows the strip without the logo.
2. **Reviewer headphotos and quotes (R3).** None exists or is approved; supply files with the reviewers' written
   permission (and any approved excerpt) and they appear without code changes.
3. **Photograph consent (P7).** The traveller photograph is a guest's own: confirm the photographer's permission and
   the two travellers' consent.
4. **Browser suite.** Two browser tests fail on the untouched baseline as well as here, both on Pixel 7 and both in components this work did not touch: the hero phone gallery's lift-out (GSAP Flip) and the taste compositions' motion. They are reported, not fixed, to keep the change surgical; the suite's other 313 pass.
5. **The home page is longer overall** (19,282 px against 18,892 at 1440; 20,183 against 18,563 at 390), although the
   blank screen after the sand journey is gone: the new photograph block and a review grid that shows several reviews
   at once (instead of one slide) are content. Showing two reviews on phones instead of three would save about 330 px.
6. **The `/reviews/` page** still states the listing's review count with the date it was read (R1), as before; the
   home section and the reviews page's meta description no longer hard-code it.
7. **Retired files kept:** `peninsula-bench-view` renditions and the illustrated avatars (`assets/img/avatars/`) are no
   longer used by any page; they can be deleted in a follow-up if the owner agrees.
8. **Not deployed to production, not merged.** The work is on `ultraxen/kind-hopper-4usue2` and its preview only.
