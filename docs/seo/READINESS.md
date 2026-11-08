# Step 4B readiness: historical SEO preservation and source remediation

8 Nov 2026 · branch `remediation/historical-seo-preservation` (from `main` at `188d362`).

**Scope kept.** Nothing on the live domain, its DNS, the WordPress hosting or the Pages project's settings was changed. The work is in the repository, tested on the Pages runtime locally (`wrangler pages dev`) and, at the owner's instruction, on a preview deployment of its own (`seo-preview`); staging and production were not deployed. Every request to a live system was a read: public DNS, GET requests to the deployed pages.dev sites, the old booking site's media store and the Internet Archive. **This stops before the domain cutover.**

## Verdict

| Area | State |
|---|---|
| Historical URL inventory (Phase A) | **Done.** One registry of 140 entries covering 325 addresses, every input reconciled with its provenance, priority, action, destination and owner |
| Source implementation (Phase B) | **Done.** `npm run build` generates `_redirects` from the registry every time (124 rules) and refuses an unsound file |
| Historic media and pages (Phase C) | **Done in source**; six images and the two restored pages wait for owner decisions (H1, H3) |
| Tests (Phase D) | **Done**: every check passes on the Pages runtime locally for both builds, and on a deployed Cloudflare preview (420 of 420, smoke 27 of 27, browser 334 passed with none failing) |
| Production dependencies (Phase E) | **Identified.** Two DNS fixes (SPF, CalDAV/CardDAV) and the live-enquiry prerequisites are open; a rollback procedure with the current values is below |
| Domain cutover | **Not ready, and not attempted.** It needs the owner's approval (A2), the H5 DNS fixes and the cutover checks below |

## 1. The inventory (Phase A)

### What was reconciled

| Input | What it holds | In the registry |
|---|---|---|
| The audit of 7 Nov 2026 and its 190-URL map | 8 same-URL pages, 28 pages to redirect, 56 attachment pages, 22 query-string addresses, 76 retired (56 uploads, 20 system URLs) | All five groups. The map's CSV was not in the evidence folder, so its rows were rebuilt from the WordPress database in the hosting backup (posts, the 56 attachments and their files, the 11 categories, the 20 post and page IDs): the counts match the audit's |
| The audit's proposed `_redirects` | 70 declarations: 55 static (29 addresses), 15 dynamic | All, same destinations, except four departures and the refinements below, each recorded and tested in `test/legacy-registry.test.mjs` |
| `_redirects-gsc-additions` | 32 declarations for 16 addresses | All 16; `/services/` is restored as a page instead of redirected |
| The preservation register | 56 rows: **6 Critical, 26 High, 19 Medium, 5 Low** | Every row, at its priority; its grouped rows (www, `/static/images/*`, the system files, the archives) map to the matching pattern entries |
| This repository's generator before 4B (`188d362`) | 26 declarations for 13 addresses | All, unchanged |
| Added from the evidence | The booking site's own export (in the WordPress theme), the Search Console crawl stats (feeds, the sign-in page's `?next=` link, theme files), the 2021–2022 static site (Internet Archive), the May 2025 static pages left in the hosting account | 6 old `.html` pages redirected; old image folders, theme files and WordPress system URLs retired on purpose |

**The four booking-site tour addresses.** The 70 + 32 = 102 declarations leave out `/tour/cape-peninsula-private-tour/`, `/tour/cape-town-city-private-tour/`, `/tour/township-private-tour/` and `/tour/cape-winelands-private-tour/`: the audit crawled the WordPress site, which had renamed them (to `/tour/cape-peninsula-adventure/`, `/tour/cape-town-city-tour/`, `/tour/township-cultural-tour/` and `/tour/winelands-experience/`). Under the 70-rule file they would have fallen through to the `/tour/*` catch-all and landed on `/tours/`, although Search Console records substantial search impressions for them. Both generations now have their own static rules, with and without the trailing slash, each ahead of every dynamic rule, and each with its own prefix rule for anything beneath it. The test proves a static rule (never `/tour/*`) answers all eight.

**The Township booking page.** The register has booking pages for 11 offerings; `/users/book/township-private-tour/` is only in the additions file and has no Search Console record. It is kept, High like its siblings, with its evidence marked `additions, pattern`.

**Departures from the inputs**, each tested:

| Address | Input said | Now | Why |
|---|---|---|---|
| `/services/` | 301 → `/tours/` (additions) | The restored overview page (H1) | Critical in the register (search traffic, and linked from outside the site); `/tours/` covers neither transfers nor the overview |
| `/safety/` | 301 → `/about/` (audit) | The restored Safety & Trust page (H1) | The register prefers keeping it; its verified content is useful on its own |
| `/tour-category/adventure-activities/` | `/tours/` | `/tours/#adventure` | The same page, opened on its Adventure filter |
| `/tour-category/nature-tours/` | `/tours/` | `/tours/#nature` | The same page, opened on its Nature filter |

**Refinements**, also tested: where an input left an address to a catch-all, the registry gives it a rule of its own (the four booking-site tour addresses) or sends it where its parent address goes, through 11 prefix rules: under each of those four tours, and under the seven categories whose page is not `/tours/` (so `/tour-category/multi-day-tours/feed/` now reaches `/packages/` rather than `/tours/`). The test probes every input catch-all with every registry address it covers and accepts nothing else.

### The registry

`src/data/legacy-urls.mjs` is the authority; `docs/seo/HISTORICAL_URL_REGISTRY.md` and `docs/seo/historical-url-registry.csv` are generated from it (`npm run seo:registry`) and a test keeps them current.

| | Entries |
|---|---|
| Actions | keep 9 · page 2 · redirect 53 · prefix 27 · asset 4 · platform 1 · host 2 · query 22 · retire 14 · hold 6 |
| Priority | Critical 6 · High 30 · Medium 20 · Low 84 |
| Owner | engineering 126 · owner 10 · cutover 2 · platform 2 |

Each entry names its evidence by source; **no Search Console figure is in the public repository** (a test fails on click or impression counts, positions, the linking sites or personal details). The figures, and the Search Console exports themselves, stay in the owner's Drive.

## 2. The source (Phase B)

- `src/data/redirects.mjs` builds `site/_redirects` from the registry on every build: in the production build **97 static rules, then 27 dynamic** (limits 2,000 and 100; longest line 117 characters of 1,000), all 301. A preview build publishes no sitemap, so it leaves out the two rules that point there (`/wp-sitemap.xml`, `/wp-sitemap-*`): 96 and 26. A copy of the production build's file is in `docs/seo/_redirects.production.txt` for review (generated with the tables; never deployed).
- `src/tools/pages-redirects.mjs` mirrors Pages' own parser and matcher (wrangler 4, workers-shared). Three of its rules shaped the design:
  - once the first rule with a splat appears, **every later rule counts as dynamic**: static rules must all come first, or they would be matched late and use up the 100 dynamic rules;
  - a rule's source **keeps only its path**: a rule for `/?p=13` would be a rule for `/` and redirect the home page. The 22 WordPress query links are therefore not rules (the home page answers them, canonical `/`), and the build refuses any source with a query;
  - the Location keeps the destination's own query when it has one (the booking links), and otherwise passes on the visitor's (`?utm_…` survives on the tour redirects).
- The build refuses a file that would redirect an existing page (Pages applies `_redirects` before its files), chain two redirects, point at a page or file the build did not write, a tour the form does not offer or a tours-page filter that does not exist, reach into a Functions route (`/api/`, `/admin/`, `/assets/video/`), place a static rule after a dynamic one, or exceed the limits. It also verifies the preserved images byte for byte.
- **`/services/` evaluated:** kept as a meaningful overview rather than redirected. It was the booking site's "Our offer" page, listing every offering; the new site had no page doing that (`/tours/` has no transfers). The page gathers the home hero's four services and links every tour, activity, the multi-day tour and the transfer, from data already published (no photographs, so the one-photograph-one-placement rule holds). One line in the registry turns it back into a redirect if the owner prefers (H1).
- **The account pages reviewed** before treating their mappings as final: the booking site asked visitors to sign in before booking (Googlebot followed `/accounts/login/?next=/users/book/quad-biking/`). `/accounts/login/`, `/accounts/signup/` and `/bookings/` go to the booking form, the successor of that step: the site has no customer accounts, and `/admin/` (staff only) is never a destination. The query passes through, and the form now reads the old `next=/users/book/<slug>/` and chooses that tour (`src/assets/js/enquiry.js`), so a signed-out booking link still lands on its tour (H6).
- **Booking deep links tested** against the form's real preselection: all 12 `/users/book/<slug>/` addresses open the form with the same tour chosen (the Garden Route as the multi-day tour; the airport transfer on the transfer path), in Chromium on desktop and mobile; every tour value is one the form offers (`TOUR_SLUGS`, `PACKAGE_SLUGS`), which the build checks too.
- The local server (`src/tools/serve.mjs`) applies the same `_redirects`, so `npm start` shows the redirects as Pages would.

## 3. Historic media and search content (Phase C)

**The 14 images** (`docs/seo/HISTORICAL_MEDIA.md`): every original was found in the old booking site's media store (each checked against its MD5) and 10 in the WordPress backup, byte for byte. **4 are served again** unaltered at their old addresses (the same photographs are approved and in use here); **6 are held** for the owner's consent or licence decision (H3; not in the repository); **4 are retired for good**: one is byte for byte the photograph the rights register withdrew for showing children, one shows children, one two young people who may be under 18, and one a guest's full name.

**Gallery and Safety:** `/safety/` is restored with the verified statements only (the accreditations, the association, the registration, private tours since 2014, the published answers on weather and personal needs, the activities' safety inclusions, the dated Tripadvisor rating); its four unverifiable claims wait for H4. `/gallery/` stays a 301 to `/tours/`: a page of its own would repeat photographs placed elsewhere (H2).

**Search signals of the production build** (`test/seo.test.mjs`, with `test/production-build.test.mjs`):

| Check | Result |
|---|---|
| Unique titles and descriptions on every indexable page (24) | Pass |
| One main heading per page; content in the HTML without scripts; navigation in plain links | Pass |
| Canonical: each page's own `https://goodtimesincapetown.co.za/…` address | Pass. **Fixed:** the 404 page named `/404.html`, which itself redirects (the audit's F5): it now names none |
| Structured data parses on every page; WebPage names the page; BreadcrumbList below the home page; the services page's ItemList links every offering | Pass |
| Internal links land directly on a page or file, never on an address `_redirects` bounces | Pass |
| Every sitemap page reachable by links from the home page; the restored pages in the sitemap and the footer | Pass |
| Titles longer than 60 characters (the audit's F4, owner's copy, H8) | 8, listed below; not changed |

The eight titles: the home page (63), the Garden Route tour (62), multi-day tours (61), Cape Peninsula (79), Cape Town City (72), Cape Winelands (75), Private Cape Town Experience (77), Whale Watching (65).

## 4. Tests (Phase D)

| Run | Result |
|---|---|
| `npm test` (unit and integration, incl. the Functions in workerd) | **352 of 352 pass** (329 before this work, 23 added) |
| The historical URL suite on the Pages runtime (`test/legacy-urls.test.mjs`), **preview build** | **420 of 420 checks pass** |
| The same, **production build** | **420 of 420 checks pass** |
| Negative control: the same build with the 26-rule `_redirects` of `188d362` | 186 of 420 fail, as they should |
| Negative control: a production build judged as preview | Fails on the robots signals, as it should |
| Post-deploy smoke suite on the Pages runtime, both builds (now with the restored pages and three earlier addresses) | Pass |
| Browser: `test/e2e/legacy-booking.spec.mjs` (desktop and mobile) | 8 of 8 pass |
| Browser: the full suite (Chromium, desktop and mobile), locally | 333 pass, 38 skipped (live-mode tests), **1 fails**: `test/e2e/motion.spec.mjs:73` (the aircraft's entrance when a visitor lands on `/#gallery`), which fails the same way on `main` at `188d362` (3 of 3 runs) and passes on the deployed preview: a local timing issue that predates this work |
| `npm run check` (static QA) | 27 pages, no problems |
| `npm run guard` (brand guard) | Clean (one exemption: the old address `/tour/cape-town-city-tour/`, Good Times' own WordPress URL, whose slug a template operator also used; the slug anywhere else still fails) |
| Independent review of the diff (a separate agent, 8 Nov 2026) | Ten findings, all addressed before the push: the privacy test now holds its denylist as hashes, worded figures removed, the guard's exemption narrowed, loops reported with their address, preview builds without the sitemap rules, the mirror aligned with Pages' own matcher, refinements recorded, stronger topic and host checks |

**What the suite checks for each address** (`qa/legacy-urls.mjs`, the same code for a local runtime, a preview or the domain): the first response's status and Location (exactly the registry's destination, with Pages' query rule; both slash forms; a `?utm_…` probe on every redirect), every hop to the final response (at most five; a URL seen twice is a loop; exactly one redirect for a redirected address), the final status, and relevance: the final page's canonical path, a topic word in its title (without the " | Good Times" every title ends with) or main heading (Township, Winelands, Book, Services, "since 2014" for the home page…), that the tour a booking link names is one the form offers (the browser test checks it is chosen), and the robots signals. With `--domain`, after the cutover, it also checks that the other host and http answer one redirect to the same path on the canonical host, and that an old address asked of the other host reaches its page in two at most. Kept images must match their checksum; retired and held addresses must answer 404 without a redirect.

**noindex is kept where it belongs and proven absent where it must be.** On the preview build every final page carries `noindex` in both the header and the meta tag. The production build, served on a host that is not pages.dev, carries **no** `X-Robots-Tag` and `index,follow` on every indexable page: the same files on the domain would be indexed. Cloudflare's own pages.dev addresses stay `noindex` through host-scoped `_headers` rules (`https://:project.pages.dev/*` and `https://:version.:project.pages.dev/*`), which also answers the audit's B1. Nothing removed `noindex` globally.

**On a deployed Cloudflare preview (8 Nov 2026).** At the owner's instruction, with a token they supplied (kept in a private file for the run, never printed or committed, and deleted afterwards; rotate it, A5), this branch's commit `e9f91c4` was built with the preview environment's variables (`node scripts/cloudflare/build.mjs preview`) and deployed to a branch of its own, **https://seo-preview.good-times-in-cape-town.pages.dev** (deployment `0ac6e22d`, preview environment). Staging and production were left alone: production's latest deployment is still `1fe1f8ff` of 7 Nov.

| Run against the deployed preview | Result |
|---|---|
| The historical URL suite (`node qa/legacy-urls.mjs … --env=preview`) | **420 of 420 checks pass** ([`docs/seo/preview-run.md`](preview-run.md), every address and every response) |
| Post-deploy smoke suite | **27 of 27** (the restored pages and three earlier addresses included; `/api/health` answers `"enquiries":"preview"`) |
| Browser: `test/e2e/legacy-booking.spec.mjs` | **8 of 8** (desktop, mobile) |
| Browser: the full suite | **334 pass**, 38 skipped (live-mode tests), **none fail**: the motion test that fails locally (on `main` too) passes on the deployment |
| Read-only `setup.mjs check` | The account and the Pages project confirmed; project settings as in `project.mjs` ("nothing to change"); the live-enquiry secrets absent in both environments, as expected (A4); the zone goodtimesincapetown.co.za **active in this account** |
| robots | `X-Robots-Tag: noindex, nofollow` on the preview, meta `noindex,nofollow` on every page |

To repeat the run on a later commit, with a token kept in a secret manager and loaded into the command's environment without being printed:

```bash
git checkout remediation/historical-seo-preservation && npm ci && npm test
node scripts/cloudflare/build.mjs preview
npx wrangler pages deploy site --project-name good-times-in-cape-town --branch seo-preview   # never main (production)
node qa/legacy-urls.mjs --base=https://seo-preview.good-times-in-cape-town.pages.dev --env=preview --md=docs/seo/preview-run.md
node scripts/cloudflare/smoke.mjs https://seo-preview.good-times-in-cape-town.pages.dev --env preview
E2E_BASE_URL=https://seo-preview.good-times-in-cape-town.pages.dev npx playwright test
```

Production (pages.dev) and staging still serve the 26 rules of 5 Nov until they are next deployed (`/tour/winelands-experience/`, `/users/book/quad-biking/` and `/services/` answer 404 there).

## 5. Production dependencies (Phase E)

### DNS as it is (public DNS and the zone's own nameserver, 8 Nov 2026)

The zone is on Cloudflare's nameservers (`joan`, `shane`). The website records point at the WordPress hosting, DNS only:

| Record | Value | TTL |
|---|---|---|
| `goodtimesincapetown.co.za` A | 129.232.204.50 (no AAAA, no CAA) | 1800 |
| `www` CNAME | goodtimesincapetown.co.za | 1800 |
| `goodtimesincapetown.co.za` TXT (SPF) | `v=spf1 +a +mx +ip4:129.232.204.50 ~all` | 1800 |
| `_dmarc` TXT | `v=DMARC1;p=reject;sp=reject;adkim=r;aspf=r` | |
| MX | 10 mx1, 20 mx2, 30 mx3 `.rdsa-mail.com` | 3600 |
| `_caldav._tcp`, `_carddav._tcp` SRV | 0 0 2079 goodtimesincapetown.co.za. | 1800 |
| `_caldavs._tcp`, `_carddavs._tcp` SRV | 0 0 2080 goodtimesincapetown.co.za. | 1800 |
| `mail`, `imap`, `smtp`, `pop`, `webmail`, `cpanel`, `cpcalendars`, `cpcontacts`, `autodiscover`, `autoconfig`, `ftp` | A 129.232.204.50 | 1800 |

These are public answers anyone can query; the full zone export (with the DKIM key and verification tokens) belongs in the owner's private files, not here.

### What must change before the apex moves (H5)

1. **SPF.** `+a` authorises the apex's own address. After the cutover the apex resolves to Cloudflare's shared Pages addresses, so `+a` would authorise those and no longer the mail server. The explicit `ip4:129.232.204.50` already covers the mail server: remove `+a`, giving `v=spf1 +mx +ip4:129.232.204.50 ~all`. Resend, when it comes (A4), uses its own `send.` subdomain for SPF and needs no change here.
2. **CalDAV/CardDAV.** The four SRV records target the apex on ports 2079/2080 (cPanel's calendar and contacts service). After the cutover they would send calendar and contacts clients to Pages. Retarget them to hosts that stay on the mail server, DNS only: `_caldav`/`_caldavs` → `cpcalendars.goodtimesincapetown.co.za`, `_carddav`/`_carddavs` → `cpcontacts.goodtimesincapetown.co.za` (both already A 129.232.204.50), same ports, keeping the `path=/` TXT records; confirm with the host that their certificate covers those names.
3. **Mail hostnames: no change needed.** `mail`, `imap`, `smtp` and `pop` are A records (the 29 Oct zone had them as CNAMEs to the apex, which the cutover would have broken).
4. **The zone's account.** An apex custom domain on Pages needs the zone in the same Cloudflare account as the project ([Cloudflare Pages: custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/)). **Met:** the zone is active in the Good Times account, the same account as the Pages project (`setup.mjs check`, read-only, 8 Nov 2026). The token used for the preview could not read DNS records, so the cutover needs a token with Zone › DNS: Edit for that step only. `setup.mjs domain` never overwrites the existing apex A record: the cutover replaces it through the Pages custom-domain flow, which records the old value.

### Live enquiries (A4), not required for the cutover

| Requirement | State |
|---|---|
| Mode | Production is `ENQUIRY_MODE=preview` in source (`scripts/cloudflare/project.mjs`) and at runtime (`/api/health` on pages.dev: `"enquiries":"preview"`): nothing can be sent |
| Database | Good Times' own Neon Postgres (`DATABASE_URL`), migrated with `npm run db:migrate` (5 migrations) |
| Mail delivery | A Resend account with goodtimesincapetown.co.za verified (`setup.mjs resend --apply` adds its DKIM and `send.` records after A2; none exist yet). With DMARC at `p=reject`, mail from hello@ before Resend's DKIM is verified would be rejected: verify first, then go live. hello@ must exist as a mailbox (C3); delivery stays with info@ until hello@ is confirmed |
| Secrets | `DATABASE_URL`, `RESEND_API_KEY`, `ENQUIRY_SIGNING_SECRET`; `setup.mjs` refuses `live` while any is missing |
| Test | A controlled live test sending only to test inboxes, then the owner's approval |

### Privacy and booking terms

The privacy notice and the terms are published as marked drafts under the owner's recorded release override for pages.dev (A1): the terms stay `noindex` until approved (B2), and B1, B3–B5 and the effective date remain open. The old site's terms page was indexable, so `/terms/` keeps its address but will not be indexed until B2 (the audit's F3). `scripts/release-gate.mjs` runs before any production deployment and lets only the overridden items through.

### Rollback (prepared, not executed)

The cutover changes only the apex and `www`, plus a redirect rule; WordPress hosting and mail stay as they are. To roll back (within minutes for proxied records; up to the 30-minute TTL for cached DNS-only answers):

1. Pages project → Custom domains: remove `www.goodtimesincapetown.co.za` and `goodtimesincapetown.co.za`.
2. DNS: delete the two records pointing at `good-times-in-cape-town.pages.dev`; restore **`goodtimesincapetown.co.za` A 129.232.204.50, DNS only, TTL 1800** and **`www` CNAME goodtimesincapetown.co.za, DNS only, TTL 1800**.
3. Rules → Redirect Rules: delete "Good Times: www.goodtimesincapetown.co.za → goodtimesincapetown.co.za" (`gt_www_to_apex`). Restore the zone settings `setup.mjs domain` changed (`always_use_https`, `min_tls_version`, `email_obfuscation`) to the values its plan printed beforehand; they affect only proxied records.
4. Leave the SPF and SRV fixes in place: they work for either target.
5. Verify: `dig +short goodtimesincapetown.co.za A` answers 129.232.204.50; `curl -sI https://goodtimesincapetown.co.za/` answers from Apache with the WordPress site; IMAP 993 and SMTP 465/587 on `mail.goodtimesincapetown.co.za` connect; a test email arrives.
6. If the rollback comes after about 14 Dec 2026, run AutoSSL in cPanel: the WordPress certificate (expiring 24 Dec 2026, per the audit) cannot renew while the apex points elsewhere.

Keep the WordPress hosting for at least 60 days after the cutover (mail runs there), and keep the old booking site's media store until H3 is decided: two of the held originals exist nowhere else.

## 6. The cutover, when approved (not executed)

The audit's section 6 stands, with these changes: the gates now include the H5 DNS fixes, the suite on a deployed preview passing, and Search Console's baseline exported again (H7). After the DNS change: `node qa/legacy-urls.mjs --base=https://goodtimesincapetown.co.za --env=production --domain` (every historical address, plus www → apex and http → https in one hop each, and no `noindex` on the domain), then the smoke suite with `--domain`. Roll back if `noindex` appears on the domain, more than 5% of the suite fails, mail fails, or certificates fail.

## Completed and pending, side by side

| Completed in this branch | Waiting for the owner |
|---|---|
| The registry, its generated tables and `_redirects` | H1: the restored /services/ and /safety/ |
| The four booking-site tour addresses as static rules | H2: a gallery page, or the redirect to /tours/ |
| The 12 booking pages, the account pages and `next=` links | H3: six held images |
| 6 old static pages; feeds and attachments under each old tour | H4: the Safety page's unverified claims |
| 4 originals kept at their addresses; 4 retired for good | H5: the SPF and CalDAV/CardDAV DNS fixes (cutover) |
| /services/ and /safety/ restored; footer links; sitemap | H6: the account pages' destination |
| 404 canonical fixed (F5) | H7: Search Console at the cutover |
| Build-time validation; local server redirects | H8: the eight long titles |
| 23 tests, the suite for any deployment, three smoke checks | H9: the Smart Pulse Africa script |
| This report, the media decisions, the registers updated | A2 (cutover and canonical host), A4 (live enquiries), A5 (rotate the pasted tokens), B1–B5 (legal) |
| The deployed preview verified (`seo-preview`, `0ac6e22d`): 420 of 420 | |

## Evidence

In the repository: `src/data/legacy-urls.mjs`, `src/data/legacy-inventory.mjs`, `test/fixtures/legacy/` (the audit's 70-rule file and the additions file as supplied, the 26 rules of `188d362`, and the preservation register without its Search Console column). Kept out of it, in the owner's private files: the Search Console exports (Drive › Good Times Web Migration), the hosting backup (it holds mail, keys and personal data), the DNS zone export, and the 14 original images.
