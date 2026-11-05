# Test report

Results on 5 Nov 2026 for the build deployed to <https://staging.good-times-in-cape-town.pages.dev>. Every suite was run on the final code; the browser suites were also run against the deployed staging site.

## Summary

| Check | Command | Result |
|---|---|---|
| Build | `npm run build` | 25 pages, preview mode |
| Static QA: internal links, images, alt text, duplicate ids, heading order, page size | `npm run check` | 25 pages, no problems |
| Brand guard: no identifier of the template's earlier operator in tracked files or the build | `npm run guard` | 1,101 files clean |
| Unit and integration, including the Pages Functions on the Workers runtime (workerd) | `npm test` | **272 / 272 passed** |
| Browser suite, local preview build: desktop (1440 × 900) and mobile (Pixel 7), with axe accessibility checks | `npm run test:e2e` | **294 passed, 0 failed**, 34 skipped (live-only and device-specific tests) |
| Browser suite against staging | `E2E_BASE_URL=https://staging.good-times-in-cape-town.pages.dev npm run test:e2e` | **294 passed, 0 failed**, 34 skipped |
| Mobile Safari (WebKit, iPhone 13) against staging: wizard, launch, currency and consent | `PW_WEBKIT=1 … --project=mobile-safari` | **53 passed, 0 failed**, 10 skipped |
| Live enquiry pipeline, local Workers stack (`scripts/cloudflare/local-pages.mjs`) | `E2E_ENQUIRY_MODE=live E2E_BASE_URL=… playwright test enquiry launch` | **50 passed, 0 failed**, 30 skipped (preview-only tests) |
| Post-deploy smoke checks on staging | `node scripts/cloudflare/smoke.mjs https://staging.good-times-in-cape-town.pages.dev --env preview` | **22 / 22 passed** |
| Responsive matrix on staging: 320, 375, 390, 768, 1024, 1440 px | 19 pages at each width (114 views) | **114 / 114 clean** |

## Forms and the enquiry pipeline

**Staging (what visitors see).** The form is in preview mode. It validates every field, shows the review step and then says plainly that nothing was sent; the API answers `503 preview` and stores nothing. No database, email account or secret is connected to staging, so no test can reach Good Times or a real traveller.

**Controlled live test (5 Nov 2026).** The same Functions ran in live mode on this machine. The database was a PGlite stand-in reached through the Neon driver and migrated by the same code as `npm run db:migrate`. Email went to a stand-in for Resend that only keeps each message as a file. Every address used was on `example.com` or `resend.dev`, and nothing left the machine.

| Step | Result |
|---|---|
| Tour enquiry (Cape Peninsula Private Tour) | 201, reference `GT-…`, stored as NEW |
| Multi-day tour enquiry (Garden Route, 4 nights) | 201, stored with its nights |
| Airport transfer with a return | 201 |
| The same submission again (same idempotency key) | 409 with the same reference; nothing new stored or sent |
| An empty submission | 400, refused field by field |
| Honeypot filled | 200 decoy, no reference, nothing stored |
| Availability for a month | 200 with the full and closed dates |
| Emails | Two per request: the team notification (reply-to the visitor, 4 signed status links, a dashboard link) and the visitor's acknowledgement ("This is not yet a confirmed booking", reply-to the Good Times inbox). All Good Times branded, with the GT logo; none names any other business |
| A status link from the team email | GET shows "Mark GT-… as “Contacted”?" and a button that POSTs; a forged token is refused (403) |

The browser suite's live tests then submitted tour, multi-day and transfer requests through the real wizard. They covered: retries with the same key, duplicates, busy and failure states, fully booked dates crossed out in the calendar, and a date taken while the visitor was typing. All passed.

**Not yet tested, because it does not exist yet:** delivery by Good Times' own Resend account and sending domain, and storage in Good Times' own database (`docs/APPROVAL_REGISTER.md` A4). The live switch stays off until those exist and a controlled test on staging passes, sending only to test inboxes.

## Indexing and safety on staging

- `<meta name="robots" content="noindex,nofollow">` on every page, `X-Robots-Tag: noindex, nofollow` on every response, `robots.txt` disallows everything, and there is no sitemap.
- Canonical URLs point at the staging address itself, never at goodtimesincapetown.co.za, so staging cannot compete with the current website.
- Security headers: Content-Security-Policy (with the inline script's hash), HSTS, `nosniff`, `X-Frame-Options: DENY`.
- The production address of the project (good-times-in-cape-town.pages.dev) has no deployment and answers 404.
- The current website's addresses (`/tour/<slug>/`) answer `301` to their new pages, which only matters after a cutover.

## Responsive matrix

Nineteen pages were loaded from staging at 320, 375, 390, 768, 1024 and 1440 px (114 views): home, tours, three tour pages (with photographs, with the artwork panel, and the framed hero), multi-day tours and the Garden Route, transfers, destinations, about, reviews, contact, FAQ, the booking page on each path, privacy, terms and the 404 page. Each was checked for HTTP status, horizontal overflow, exactly one `h1`, console errors, failed requests and broken images. All 114 were clean; the only console message was the 404 page's own expected 404.

Screenshots taken from outside South Africa show prices converted and marked ≈ (for example "Prices displayed in USD"): the site converts for visitors abroad, and a South African visitor sees rand.

## Defects found and fixed during testing

| Defect | Fix |
|---|---|
| The "ghost" buttons on the dark bands of About, Destinations and Reviews got a doubled class after the rename, so they lost their on-dark styling | `button()` in `src/partials/ui.mjs` |
| The Garden Route sketch's title used the template's product name, and its stops were not Good Times' route | `src/partials/route-art.mjs` |
| The team email's "Open in the bookings dashboard" button had dark text on green (about 2:1) | White text (6.3:1), `lib/email/layout.mjs` |
| Home: "Explore the The Garden Route multi-day tour", and "The" capitalised mid-sentence | `src/pages/index.mjs` |
| Home header at 1024 px: Make It Yours overflowed the bar by 2 px | Logo height 64 px in that range, `styles.css` |
| The wizard offered 1–14 nights; the Garden Route is 2–13 | Built from the tour's own range, `src/pages/enquire.mjs` |
| Visitor-facing "package" wording where the site says "multi-day tour" | Wizard, emails and subjects |
| `npm run check` failed in a folder whose path contains a space | `fileURLToPath`, `src/tools/check-site.mjs` |
| Four photographs showed children or people who may be under 18 | Withdrawn and replaced (`docs/RIGHTS_REGISTER.md`) |
| Three browser tests depended on the runner's country or on reading `_headers` as a file, so they failed only on the deployed site | Tests pin a South African visitor and read the deployed CSP from the response |

## Home hero: frozen moment (5 Nov 2026, local build, not deployed)

The hero now shows the supplied café film held still (only the cloud over Table Mountain and the sea move), one call to action bottom left and the phone gallery bottom right (`docs/APPROVAL_REGISTER.md` S4, P5, P6). Checked on this machine; nothing was deployed.

| Check | Command | Result |
|---|---|---|
| Build, static QA, brand guard | `npm run build`, `npm run check`, `npm run guard` | 25 pages; no problems; 1,220 files clean (the hero's new files included) |
| Unit and integration | `npm test` | 264 / 278 passed. The 14 failures are the Pages Functions tests: workerd cannot start in this checkout (`node_modules/@cloudflare/workerd-darwin-arm64/bin` is empty, before and apart from this change; `npm ci` restores it). The smoke script's two new hero checks pass against the local server (poster as AVIF; film answers 206 with `bytes 0-1023/354756`) |
| Browser suite: desktop (1440 × 900) and mobile (Pixel 7), with axe | `npm run test:e2e` | **300 passed, 0 failed**, 34 skipped (with the lift's tests) |
| Axe on the moving hero (gallery playing, its key shown) | ad hoc, `@axe-core/playwright` on `.hero` | 0 violations; the key is 26 × 26 px (desktop), 24 × 24 px (mobile), reached by Tab after the call to action, Space pauses |
| No face covered, 18 viewports from 320 × 568 to 2560 × 1440, portrait and landscape | `node qa/hero.mjs` (and `--motion`) | Every face clear of the call to action and the phone; the tightest gap is 15 px (1280 × 720 with the staging bar; 30 px without it); no sideways scroll; the phone always inside the screen |
| The people held still | ffmpeg: every frame of the finished film against its first | Outside the cloud and the sea, 99.3% of pixels never change and the rest by at most 3 levels, but for 51 single-frame encoder blips (at most 15 levels); the loop seam differs by 0.25 levels on average |
| The lift: a click on the phone's photograph (GSAP Flip) | Playwright, desktop and mobile, with and without motion | The photograph flies from its box in the phone (187 × 157 px at 1440 × 900) to one centred on the hero (670 × 563 px), tilting on the way, and swaps to its largest rendition; the swipe pauses, the page holds still, focus moves to Close. A click away, Escape or Close flies it back onto the same box; the swipe resumes from that photograph (clicked mid-swipe three times: each time the photograph filling the screen was lifted and the track came back exactly to it). Without motion it opens and closes at once; axe finds nothing in the open dialog |
| Swipe motion and the phone frame | Playwright, track transform sampled through a swipe | 0 → −67 → −144 → −171 → −187 → −190 → −188 → −187 px (a 1.6% glide past the edge, then the settle); the phone's box identical throughout; every photograph decoded before the first swipe |

Screenshots (static and with motion) and short recordings of the hero (`hero-1440x900.mp4`, `hero-390x844.mp4`) and of the lift (`hero-lift-1440x900.mp4`, `hero-lift-390x844.mp4`): `docs/qa/hero/`, with `report.json` and `report-motion.json`.
