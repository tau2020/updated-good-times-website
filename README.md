# Good Times in Cape Town: website

Marketing site and enquiry system for **Good Times in Cape Town**, a private tour company in Cape Town (since 2014). A zero-dependency Node static generator, self-hosted fonts (Bricolage Grotesque, DM Sans and Caveat: `design/font-design.md`), an AVIF/WebP image pipeline, and a two-path booking-request system (tour enquiry and airport transfer request).

> **Status: staging only.** The site deploys to a separate Cloudflare Pages project, `good-times-in-cape-town`, at <https://staging.good-times-in-cape-town.pages.dev>. It is `noindex`, shows a preview banner, and the enquiry form validates and reviews but sends nothing (`ENQUIRY_MODE=preview`). The current website at goodtimesincapetown.co.za is untouched: no domain is attached and no DNS has changed. A production release needs the owner's approval (`docs/APPROVAL_REGISTER.md`).

```
src/
  build.mjs          static site generator (pages → site/)
  data/              all content and business facts, with sources and verification flags
  pages/             one module per route (home, tours, packages, transfers, destinations, about, reviews, contact, faq, enquire, privacy, terms, services, safety, 404)
  partials/          layout shell, UI helpers, cards, media system
  assets/            css (tokens.css, styles.css, buttons.css, enquiry.css, living-cape*.css, media.css), js, fonts, brand (the approved logo pack), img (generated renditions; credentials/ holds the CTGA logo, shown only once verified)
  tools/             image pipeline, static QA, brand guard, local server
lib/                 enquiry system (validation, storage, email, availability, dashboard), host-agnostic
functions/           Cloudflare Pages Functions: /api/* (the enquiry API), /admin/* (the bookings dashboard), /assets/video/* (byte ranges, for the home hero's film)
api/                 the same API as Vercel functions (not the deployment host)
scripts/cloudflare/  the Pages project as code (project.mjs), setup.mjs, build.mjs, smoke.mjs, env.mjs, target.mjs, local-pages.mjs
test/                node:test unit and integration tests (incl. the Functions in workerd); test/e2e = Playwright browser tests
qa/                  responsive screenshot matrix; the home hero's face-clearance check (hero.mjs)
docs/                approval register, rights register, conversion report, test report, residue audit
```

## Run

Requires Node 20+ (`.node-version`: 24).

```bash
npm ci
npm start                 # build + serve at http://127.0.0.1:8080
npm run build             # rebuild site/ from src/
npm run watch             # rebuild on change
npm run check             # static QA: links, images, alt text, headings, page size
npm run guard             # fails if another business's identifiers appear in the code or the build
npm test                  # unit and integration tests (node:test), incl. the Pages Functions in workerd
npm run test:e2e          # browser tests (Playwright + axe), builds and serves on :8091
node scripts/cloudflare/smoke.mjs <url> --env preview|production [--domain]   # check a deployed site from outside
node qa/legacy-urls.mjs --base=<url> --env=preview|production [--domain] [--md=<file>]   # every historical address of the domain against a running site (npm run seo:legacy)
npm run seo:registry      # write docs/seo/HISTORICAL_URL_REGISTRY.md and the CSV from src/data/legacy-urls.mjs
node qa/header-morph.mjs --base=<url> --out=<dir> [--video] [--interactions]   # the header at every scroll position: state, owners, frames
node qa/header-contrast.mjs --base=<url>   # the glass header's words against what passes beneath them (WCAG AA)
node scripts/erase-personal-data.mjs --retention [--apply]   # the retention periods: unconverted after a month, bookings five years after the trip
node scripts/cloudflare/setup.mjs [check|pages|domain|email|resend] [--apply]  # the Cloudflare and Resend set-up (read-only by default)
npm run qa:screens        # screenshot matrix → docs/qa/screens (server must be running on :8090)
node qa/hero.mjs [--motion] [--video]   # the home hero at 18 sizes: screenshots, and proof nothing covers a face (server on :8090)
node qa/motion.mjs --out=<dir> [--engine=webkit]   # the aircraft's landing and the sand journey's states, with checksums (server on :8090)
npm run video:beach       # the sand journey's film: the owner's section-2-video as a 7 s web loop and its poster (media-src/video/)
# The media audit's checks, run against a deployed preview (see audit/):
node qa/media-audit.mjs --base=<url> --out=<dir> [--shots]   # every photograph and film per route and width: slot, crop, source pixels
node qa/media-duplicates.mjs <inventory.json>               # one photograph, one placement (exit 1 on a repeat)
node qa/beach-film.mjs --base=<url> --out=<dir> [--record]  # the reveal, the film's playback and its fallbacks
node qa/media-crops.mjs --base=<url> --out=<dir>            # each photograph's own crop at six widths
node qa/media-spot.mjs --base=<url>                         # #adventure, the credited heroes, the owner's photograph
node qa/media-fixes.mjs --base=<url> --out=<dir>            # the elements the independent review flagged, after their fixes
node qa/media-perf.mjs --base=<url> --out=<file>            # LCP, layout shift and media bytes
node qa/layout-compare.mjs --before=<url> --after=<url> --out=<file>   # layout geometry between two deployments
# "Good Times, Naturally" (qa/surgical-change-report.md), against deployed previews:
node qa/surgical-shots.mjs --base=<url> --out=<dir> --sections --motion   # every route at 360/390/768/1024/1440: sections, type, buttons, overflow, errors
node qa/surgical-compare.mjs --before=<dir> --after=<dir> --out=qa/surgical/compare   # before/after composites per section and width
```

## Build switches

| Variable | Default | Effect |
|---|---|---|
| `SITE_ENV` | `preview` | `preview`: noindex everywhere, `robots.txt` disallows all, preview banner. `production`: indexable, sitemap, banner off. In both, an unverified contact channel is simply not shown |
| `ENQUIRY_MODE` | `preview` | `preview`: the wizard validates and reviews but sends nothing and says so. `live`: posts to `/api/enquiries` and shows the `GT-` reference only after a real 201 |
| `ENQUIRY_SYSTEM_ENABLED` | `true` | `false`: API returns 503 and the page shows a notice instead of the form |
| `SHOW_INDICATIVE_PRICES` | `true` | Shows the prices Good Times publishes (ZAR, per group or per trip, dated). `false` shows "Request a quote" |
| `LINK_STYLE` | `pretty` | `files` writes explicit `index.html` links for hosts without directory indexes |
| `PUBLIC_SITE_URL` | placeholder | Canonical origin for metadata and emails |

## Editing content

| What | Where |
|---|---|
| Business name, contacts (with `verified` flags), office, social links, Tripadvisor figures, legal facts, trust cues, nav | `src/data/site.mjs` |
| Tours and activities (copy, times, inclusions, cancellation, group-tier prices, sources, points to confirm) | `src/data/tours.mjs` |
| The multi-day Garden Route tour (copy, outline, days, rate, the points to confirm) | `src/data/packages.mjs` (the slug also in `PACKAGE_SLUGS`, `src/assets/js/enquiry-schema.js`) |
| The airport transfer and its request types | `src/data/transfers.mjs` |
| Reviews (Tripadvisor metadata and our own summaries for `/reviews/`; no reviewer's words are copied). Each review's `avatar` names its reviewer's profile photo, used once the file is in `src/assets/img/reviewers/` (square, 168 px or larger); until then the cards draw initials | `src/data/reviews.mjs`, `src/partials/reviewer-photo.mjs` |
| The home page's guest voices: the three themes in our words, the testimonial registry (a guest's own words only when approved and permitted) and the proof (Tripadvisor's and Google's figures, each from one constant, `site.tripadvisor`, `site.google`) | `src/data/reputation.mjs`, `src/assets/css/voices.css`; `docs/enhancement/03-reputation.md` |
| Scenic backdrops: the registry of the owner's supplied stock photographs, the placements, the component | `src/data/scenic.mjs`, `src/partials/scenic.mjs`, `src/assets/css/scenic.css`; renditions with `node src/tools/build-scenic.mjs` (originals in `media-src/scenic/`) |
| Cancellation and payment terms (one source for the terms, every tour, package and transfer page and the FAQ) | `site.legal.cancellation`, `site.legal.payment` in `src/data/site.mjs`; `src/data/cancellation.mjs` |
| FAQ (each answer with its source) | `src/data/faq.mjs` |
| Image slots, alt text, focal points and origins | `src/data/images.mjs`, gallery captions in `src/data/photo-captions.mjs` |
| The home hero: the scene, the one call to action, the phone gallery ("Cape Town Memories": order, captions, the tour each picture belongs to) | `src/pages/index.mjs`, `src/data/phone-gallery.json`; the component is `src/partials/phone-gallery.mjs`, `src/assets/css/phone-gallery.css`, `src/assets/js/phone-gallery.js`; where the faces are, `src/data/hero-scene.mjs` |
| The brand aircraft (the logo's airliner flies in and lands as the "i" of "in") and the sand journey after the hero (footprints, then the sweep onto the owner's destination film, a woman at the water's edge at the end of the same trail, playing over its own first frame, and the Cape Peninsula tour) | `src/partials/aircraft.mjs`, `src/assets/js/brand-plane.js`, `src/partials/sand-journey.mjs`, `src/assets/js/sand-journey.js`, `src/assets/js/motion/sand/` (the foot, the scene, the shaders), `src/assets/css/motion.css`; reports and evidence in `docs/motion/` |
| Home page story below the hero | `src/pages/index.mjs` |
| Design tokens (the Good Times palette, the leaf-green action colours and the type scale) | `src/assets/css/tokens.css`; the rules in `design/font-design.md` and `design/button-design.md` |
| Display currencies: base ZAR; the country → currency map and symbols (`currency-core.js`, shared with the API); the rate source (`lib/currency/rates.mjs`, `EXCHANGE_RATES_URL`, `off` shows ZAR everywhere) | `src/assets/js/currency-core.js` |
| Buttons (the leaf-green pills: primary, secondary, outline, on-image, tertiary, utility, danger) and the `button()`/`coinButton()` helpers | `src/assets/css/buttons.css`, `src/partials/ui.mjs`, `design/button-design.md` |
| Booking rules (vehicles, 48 hours' notice, pickup hours, holds; approved by the owner on 8 Nov 2026) | `BOOKING_RULES`, `src/assets/js/enquiry-schema.js` |
| The domain's earlier addresses (the booking site, WordPress, the old static sites): where each goes, why, on what evidence and who decides. The build writes `site/_redirects` from it (static rules first, then the dynamic ones) and refuses rules that would shadow a page, chain or point nowhere; the original images kept at their old addresses are in `src/legacy-media/`. `npm start` applies the same redirects | `src/data/legacy-urls.mjs` (raw lists in `legacy-inventory.mjs`); `docs/seo/` |

Only verified facts are rendered. To publish the WhatsApp link, for example, set `verified: true` on `site.contact.whatsapp` once Good Times confirms the number.

## Media

Photographs come from the Good Times Google Drive folder supplied by the owner and are **not committed** as originals: put them in `media-src/` (git-ignored) at the paths in `src/data/images.mjs`, then

```bash
npm run images            # AVIF + WebP renditions (never upscaled) + src/data/images.generated.json
```

`npm run images` needs macOS `sips`, `cwebp` and `avifenc` (and `ffmpeg` for the phone gallery's colour washes). The processed renditions in `src/assets/img/` are committed and served by the site itself: Drive is never used as an image host. Every photograph's origin, consent position and status is in `docs/RIGHTS_REGISTER.md`; a new photograph is added there before it is used. Photographs of children, identifiable travellers without recorded consent, and stock or third-party images are not used.

The home hero's film is the owner's supplied café scene (`media-src/video/hero-moment-src.mp4`, git-ignored):

```bash
npm run video             # freeze the people, keep the cloud and the sea moving, loop, encode, posters (needs ffmpeg, cwebp, avifenc)
```

It holds every frame on the first one except inside a feathered mask (`src/tools/hero-moment-mask.mjs`) around the cloud over Table Mountain and the sea, kept clear of every face, then crossfades the loop and encodes H.264 and VP9 with one keyframe per loop (`src/assets/video/`, about 350 KB and 210 KB). The scene and the six pictures in the hero's phone are AI-generated, supplied by the owner for the home hero only (basis G in `docs/RIGHTS_REGISTER.md`, approval P5).

The logo files in `src/assets/brand/` are the approved Good Times Logo Pack v2, used as supplied (no redraws). The company statement under the logo (`site.statement`) is text set beside the artwork, in the header, the footer and the emails; the share image (`src/assets/img/og-default.jpg`) is drawn from the same lockup by `node src/tools/build-og.mjs`.

## Enquiries

The booking page (`/enquire/`) is a wizard for two paths, tour enquiry and transfer request, sharing one validation module in the browser and on the server: a service choice (skipped by prefilled links), then Date & Details, Traveller Info and Review & Send. The Garden Route tour travels the tour path with its number of nights. Links prefill it: `enquire/?type=tour&tour=<slug>`, `enquire/?type=tour&tour=garden-route-private-tour[&nights=<n>]`, `enquire/?type=tour&tour=custom`, `enquire/?type=transfer[&transfer=<type>]`, plus `date`, `adults`, `children` and `pickup` (tour) or `pickup_location`, `destination`, `transfer_date`, `adults`, `children` (transfer).

In live mode the API validates, rate-limits, de-duplicates (idempotency key) and stores the enquiry with a `GT-XXXXXX` reference **before** emailing the Good Times inbox (with signed status links: Contacted, Quoted, Confirmed, Closed) and the visitor (an acknowledgement stating the booking is not yet confirmed). Every request holds vehicle time, and the API refuses a request that would put more bookings on the road at once than there are vehicles. Staff manage requests at `/admin/` (an emailed single-use sign-in link for the addresses in `ADMIN_EMAILS`).

`ENQUIRY_MODE` is enforced twice: at build time (the page never sends in preview) and at runtime (the API answers `503 preview` unless `ENQUIRY_MODE=live`), so a preview deployment needs no database, email account or secrets. **No environment is live.** Going live needs Good Times' own database, a sending domain verified in Resend (DNS on goodtimesincapetown.co.za), the three secrets, a controlled test, and the owner's approval: see `docs/APPROVAL_REGISTER.md`.

Locally, everything stays on your machine. Either PGlite and the file email provider (`data/outbox/*.eml`):

```bash
cp .env.example .env      # set ENQUIRY_MODE=live, DATABASE_URL=pglite://data/dev.pglite, EMAIL_PROVIDER=file
npm run db:migrate
ENQUIRY_MODE=live npm start
```

or the site on the Workers runtime with stand-ins for Neon and Resend (emails kept as JSON in `data/outbox-pages/`):

```bash
node scripts/cloudflare/local-pages.mjs
E2E_ENQUIRY_MODE=live E2E_BASE_URL=http://127.0.0.1:8788 npx playwright test test/e2e/enquiry.spec.mjs
```

## Deployment (staging)

One Cloudflare Pages project, `good-times-in-cape-town`, in the Good Times Cloudflare account, separate from every other project. Its settings live in `scripts/cloudflare/project.mjs`. Credentials come from the environment only, never from a file in the repository:

```bash
export CLOUDFLARE_API_TOKEN=…        # a token with Account › Cloudflare Pages: Edit (nothing else is needed for staging)
export CLOUDFLARE_ACCOUNT_ID=…
node scripts/cloudflare/setup.mjs pages            # read-only: what would change
node scripts/cloudflare/setup.mjs pages --apply    # create/update the project: compatibility date, nodejs_compat, plain variables
node scripts/cloudflare/build.mjs preview          # the build, with the preview environment's variables
npx wrangler pages deploy site --project-name good-times-in-cape-town --branch staging
node scripts/cloudflare/smoke.mjs https://staging.good-times-in-cape-town.pages.dev --env preview
```

| Branch | Environment | Address |
|---|---|---|
| `staging` (and any branch not listed below) | preview | <https://staging.good-times-in-cape-town.pages.dev> |
| `preview` | preview | <https://preview.good-times-in-cape-town.pages.dev> |
| `main` | production | not deployed: `deployTarget('main')` refuses until `RELEASE.approved` |

Safety rails in code: `setup.mjs` works only in the Good Times account (`ACCOUNT.match`); `domain` and `email` change nothing, even with `--apply`, until the owner approves the cutover (`DOMAIN.approved`); `resend` has its own approval (`SENDING_DOMAIN.approved`, given 8 Nov 2026) and adds only the sending domain's subdomain records, never the apex's (where the token cannot edit DNS it prints them for a person to add); it never deletes or overwrites a DNS record, and never reads or prints a secret. `scripts/release-gate.mjs` lists what must be approved before production (privacy notice, terms, legal facts).

The build writes `site/_headers`: the Content-Security-Policy with the inline script's hash, security headers (HSTS included), cache rules and, in preview builds, `X-Robots-Tag: noindex`; production builds add `noindex` only for Cloudflare's own `pages.dev` addresses, so only the domain would ever be indexed.

### Encrypted secrets

Secret names are declared in `project.mjs` (`SECRETS`, `TEST_SECRETS`); their values go in from files, never the command line, and are read back by name only:

```bash
node scripts/cloudflare/secrets.mjs main production DATABASE_URL=@<file> RESEND_API_KEY=@<file> --generate ENQUIRY_SIGNING_SECRET=@<new file>          # read-only
node scripts/cloudflare/secrets.mjs main production DATABASE_URL=@<file> RESEND_API_KEY=@<file> --generate ENQUIRY_SIGNING_SECRET=@<new file> --apply
```

It refuses names the project does not declare, a database URL for the owner role or without TLS, a value that is not a Resend key, and keys shorter than 32 characters; the main project's preview environment (staging and every preview branch) gets no secrets at all. After setting, it proves every other variable and secret is unchanged. The application's database role is `gt_app` (`scripts/db/app-role.mjs`: data access only, no DDL); migrations run as the owner (`DATABASE_URL=<owner URL> npm run db:migrate`).

### The enquiry test deployment

A Pages project of its own, `good-times-enquiry-test` (`TEST_PROJECT`), so its live settings can never reach staging. Its `test` branch (<https://test.good-times-enquiry-test.pages.dev>) takes live enquiries into the Neon branch `enquiry-test`, answers only requests that carry its access key (the `X-GT-Access` header or the `gt_access` cookie; `/api/health` stays open), sends every email to Resend's test inbox except the owned inboxes in `EMAIL_TEST_RECIPIENTS`, and is a preview build (noindex). Its production address is never deployed.

```bash
node scripts/cloudflare/setup.mjs test --apply          # its variables (the secrets first, with secrets.mjs test preview … --create)
node scripts/cloudflare/build.mjs test
npx wrangler pages deploy site --project-name good-times-enquiry-test --branch test
# the scenarios, checked in the database and in Resend (see the script's header for the variables):
node qa/enquiry-live.mjs --base=https://test.good-times-enquiry-test.pages.dev [--fault-email=… --fault-db=… --owner-db] --cleanup
E2E_ENQUIRY_MODE=live E2E_BASE_URL=https://test.good-times-enquiry-test.pages.dev E2E_ACCESS_KEY=… npx playwright test test/e2e/enquiry.spec.mjs --grep "live build"
```

The go-live evidence and the remaining approvals are in `docs/enquiries/GO_LIVE_READINESS.md`.

## Documentation

- `docs/APPROVAL_REGISTER.md`: every decision and fact still waiting for the owner, and what each one unlocks
- `docs/enhancement/`: the brief of 8 Nov 2026 (the glass header, the scenic backdrops, the guest voices and Tripadvisor proof, the legal reconciliation, the booking rules at 48 hours): the baseline, each part's report, the evidence, the QA and the critique
- `docs/enquiries/GO_LIVE_READINESS.md`: the live enquiry pipeline (8 Nov 2026): Neon, Resend and Cloudflare as configured, the cloud test matrix with its evidence (`docs/enquiries/evidence/`), the security and reliability findings, how staff operate it, and what still blocks going live
- `docs/seo/`: the historical URLs (Step 4B): the readiness report with the cutover dependencies and the rollback (`READINESS.md`), the registry's tables (`HISTORICAL_URL_REGISTRY.md`, `historical-url-registry.csv`), a copy of the production build's `_redirects` for review, and the decisions on the old site's images (`HISTORICAL_MEDIA.md`)
- `docs/motion/`: the cinematic motion layer (brand aircraft, sand journey): discovery, validation, performance, critique, delivery, and the evidence in `docs/motion/qa/`
- `docs/RIGHTS_REGISTER.md`: origin and status of every photograph, the logo, reviews, prices and facts
- `audit/`: the media audit of 6 Nov 2026 (the beach film, the owner's photograph, one photograph per placement): baseline, change register, asset manifest, quality, regression and final verification reports, with the screenshots and recordings
- `docs/CONVERSION_REPORT.md`: what changed from the template, and how each Good Times offering was mapped
- `docs/TEST_REPORT.md`: build, static QA, unit, browser and deployment checks
- `docs/RESIDUE_AUDIT.md`: the final check that no identifier of the template's earlier operator remains
- `NOTICE.md`: framework provenance and third-party licences
- `design/font-design.md`, `design/button-design.md`: the type system and the leaf-green button system ("Good Times, Naturally", 6 Nov 2026)
- `content/copy-audit.md`, `content/reviews-source-audit.md`: every copy change with its reason, and the reviews' sources, mapping and permissions
- `qa/surgical-change-report.md`: the "Good Times, Naturally" change log, the checks run on the Cloudflare preview, before/after evidence and known limitations
