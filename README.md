# Good Times in Cape Town: website

Marketing site and enquiry system for **Good Times in Cape Town**, a private tour company in Cape Town (since 2014). A zero-dependency Node static generator, self-hosted fonts (Plus Jakarta Sans and Inter), an AVIF/WebP image pipeline, and a two-path booking-request system (tour enquiry and airport transfer request).

> **Status: staging only.** The site deploys to a separate Cloudflare Pages project, `good-times-in-cape-town`, at <https://staging.good-times-in-cape-town.pages.dev>. It is `noindex`, shows a preview banner, and the enquiry form validates and reviews but sends nothing (`ENQUIRY_MODE=preview`). The current website at goodtimesincapetown.co.za is untouched: no domain is attached and no DNS has changed. A production release needs the owner's approval (`docs/APPROVAL_REGISTER.md`).

```
src/
  build.mjs          static site generator (pages → site/)
  data/              all content and business facts, with sources and verification flags
  pages/             one module per route (home, tours, packages, transfers, destinations, about, reviews, contact, faq, enquire, privacy, terms, 404)
  partials/          layout shell, UI helpers, cards, media system
  assets/            css (tokens.css, styles.css, buttons.css, enquiry.css, living-cape*.css, media.css), js, fonts, brand (the approved logo pack), img (generated renditions)
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
node scripts/cloudflare/setup.mjs [check|pages|domain|email|resend] [--apply]  # the Cloudflare and Resend set-up (read-only by default)
npm run qa:screens        # screenshot matrix → docs/qa/screens (server must be running on :8090)
node qa/hero.mjs [--motion] [--video]   # the home hero at 18 sizes: screenshots, and proof nothing covers a face (server on :8090)
node qa/motion.mjs --out=<dir> [--engine=webkit]   # the aircraft's landing and the sand journey's states, with checksums (server on :8090)
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
| Reviews (Tripadvisor metadata and our own summaries; no reviewer's words are copied). Each review's `avatar` names its reviewer's profile photo, used once the file is in `src/assets/img/reviewers/` (square, 168 px or larger); until then the cards draw an illustrated avatar or initials | `src/data/reviews.mjs`, `src/partials/reviewer-photo.mjs` |
| FAQ (each answer with its source) | `src/data/faq.mjs` |
| Image slots, alt text, focal points and origins | `src/data/images.mjs`, gallery captions in `src/data/photo-captions.mjs` |
| The home hero: the scene, the one call to action, the phone gallery ("Cape Town Memories": order, captions, the tour each picture belongs to) | `src/pages/index.mjs`, `src/data/phone-gallery.json`; the component is `src/partials/phone-gallery.mjs`, `src/assets/css/phone-gallery.css`, `src/assets/js/phone-gallery.js`; where the faces are, `src/data/hero-scene.mjs` |
| The brand aircraft (the logo's airliner flies in and lands as the "i" of "in") and the sand journey after the hero (footprints, then the sweep onto the owner's destination image, a woman at the water's edge at the end of the same trail, and the Cape Peninsula tour) | `src/partials/aircraft.mjs`, `src/assets/js/brand-plane.js`, `src/partials/sand-journey.mjs`, `src/assets/js/sand-journey.js`, `src/assets/js/motion/sand/` (the foot, the scene, the shaders), `src/assets/css/motion.css`; reports and evidence in `docs/motion/` |
| Home page story below the hero | `src/pages/index.mjs` |
| Design tokens (the Good Times palette and type scale) | `src/assets/css/tokens.css` |
| Display currencies: base ZAR; the country → currency map and symbols (`currency-core.js`, shared with the API); the rate source (`lib/currency/rates.mjs`, `EXCHANGE_RATES_URL`, `off` shows ZAR everywhere) | `src/assets/js/currency-core.js` |
| Buttons (primary, secondary, tertiary, utility, danger) and the `button()`/`coinButton()` helpers | `src/assets/css/buttons.css`, `src/partials/ui.mjs` |
| Booking rules (vehicles, notice, pickup hours, holds) | `BOOKING_RULES`, `src/assets/js/enquiry-schema.js` (working defaults until Good Times confirms them) |

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

The logo files in `src/assets/brand/` are the approved Good Times Logo Pack v2, used as supplied (no redraws).

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

Safety rails in code: `setup.mjs` works only in the Good Times account (`ACCOUNT.match`); `domain`, `email` and `resend` change nothing, even with `--apply`, until the owner approves the cutover (`DOMAIN.approved`); it never deletes or overwrites a DNS record, and never reads or prints a secret. `scripts/release-gate.mjs` lists what must be approved before production (privacy notice, terms, legal facts).

The build writes `site/_headers`: the Content-Security-Policy with the inline script's hash, security headers (HSTS included), cache rules and, in preview builds, `X-Robots-Tag: noindex`; production builds add `noindex` only for Cloudflare's own `pages.dev` addresses, so only the domain would ever be indexed.

## Documentation

- `docs/APPROVAL_REGISTER.md`: every decision and fact still waiting for the owner, and what each one unlocks
- `docs/motion/`: the cinematic motion layer (brand aircraft, sand journey): discovery, validation, performance, critique, delivery, and the evidence in `docs/motion/qa/`
- `docs/RIGHTS_REGISTER.md`: origin and status of every photograph, the logo, reviews, prices and facts
- `docs/CONVERSION_REPORT.md`: what changed from the template, and how each Good Times offering was mapped
- `docs/TEST_REPORT.md`: build, static QA, unit, browser and deployment checks
- `docs/RESIDUE_AUDIT.md`: the final check that no identifier of the template's earlier operator remains
- `NOTICE.md`: framework provenance and third-party licences
