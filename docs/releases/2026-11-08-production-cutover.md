# Production cutover and live booking acceptance (8 Nov 2026)

The owner's instruction of 8 Nov 2026 ("Production domain cutover & live booking acceptance") moved
**https://goodtimesincapetown.co.za** from the WordPress site on the cPanel host to the Cloudflare Pages project
`good-times-in-cape-town`, with live enquiries. All times are SAST (Africa/Johannesburg).

**Outcome: GO, live.** The domain serves the new build and takes live enquiries. One controlled production
enquiry was stored and both of its emails were delivered to the receiving mail server. Mail and calendars kept working
throughout. Three checks remain with the owner because they need the staff mailbox (below, "Owner checks"). None
of them is a rollback trigger unless it fails.

| | |
|---|---|
| Release URL | <https://goodtimesincapetown.co.za> (apex canonical; www and http answer one 301 to it) |
| Commit | `201a8db` (main) |
| Cloudflare deployment | `e3a1960f` (`e3a1960f-1088-4035-b4e3-b30635d39da4`), production, 23:17, `ENQUIRY_MODE=live` |
| Previous production | `93527eca` (`a7ce038`, enquiries in preview mode): the rollback target |
| Domain | apex and www: CNAME → `good-times-in-cape-town.pages.dev`, proxied; apex custom domain active |
| Redirect | Single Redirect `gt_www_to_apex`: `www` → `https://goodtimesincapetown.co.za` + path, 301, query kept |
| Old host | WordPress still answers at 129.232.204.50 (checked 23:57); hosting and mail untouched |
| Test enquiry | `GT-E••SC` (masked), stored `NEW`, flexible dates (holds no vehicle), both emails delivered |

## Gates

| Gate | Result | Evidence |
|---|---|---|
| Owner authorisation and approvals | PASS | The owner's cutover instruction (A2 approved) and decisions of 8 Nov 2026: B6 decided (7 days), B7 signed off, R4 approved, A8 ("Test mail confirmed"). `node scripts/release-gate.mjs` at `201a8db`: "Release gate: clear" (no override needed). B7 and R4 rest on the owner's word; no document is on file |
| Final staging tests | PASS (one known failure) | Release candidate `d8dd8af2` (`d492079`) on staging: Playwright (desktop Chrome, Pixel 7, iPhone 13 WebKit, axe) 390 passed, 1 failed, 49 skipped. The failure is `motion.spec.mjs:73`, which also fails on untouched `main` (`docs/enhancement/06-qa.md`). Unit tests at `201a8db`: 400 of 400. Brand guard: 3,305 files clean. `npm run check`: 27 pages under 200 KB |
| Production Pages build | PASS | `setup.mjs pages --apply`: one change, production `ENQUIRY_MODE` → `live`; all three secrets kept (the helper proves it). `build.mjs production`: 26 pages, `data-mode="live"`. Deployment `e3a1960f` from `201a8db`. Smoke on the deployment and on the pages.dev alias: 27/27 each, including the live API (`POST {}` → 400). Historical URLs on the deployment: 420/420. `/admin/` → 303 to the sign-in page. pages.dev answers `X-Robots-Tag: noindex, nofollow` (host-scoped `_headers` rules only) |
| H5 DNS and mail continuity | PASS | Applied 23:21, before the website records. SPF `v=spf1 +a +mx +ip4:129.232.204.50 ~all` → `v=spf1 +mx +ip4:129.232.204.50 ~all`; `+a` named the same single address as the `ip4`, and the apex had no AAAA, so current senders are unaffected. `_caldav`/`_caldavs` → `cpcalendars.`, `_carddav`/`_carddavs` → `cpcontacts.`, same ports 2079/2080. Mail probe before H5, after H5 and after the cutover (authoritative nameservers, identical each time): MX mx1–3.rdsa-mail.com, DMARC `p=reject`, DKIM `default` and `resend`; IMAPS 993, SMTPS 465, submission 587 (STARTTLS) and POP3S 995 verify (certificate to 24 Dec 2026); CalDAV/CardDAV answer 302 on 2079 and 401 on 2080 on `cpcalendars.` and `cpcontacts.`; webmail 200 |
| Zone change set | PASS | Before 38 records, after 38. Deleted: apex A 129.232.204.50 (DNS only, TTL 1800, `86d78e94`), www CNAME apex (DNS only, TTL 1800, `a5b2b58d`). Added: apex CNAME (`427c52ef`) and www CNAME (`38075807`) → `good-times-in-cape-town.pages.dev`, proxied. Changed: SPF (`3fec1b1b`), four SRV (`be29b594`, `8ac4ca10`, `2e21cdc3`, `4c0824e4`). 31 unchanged, every MX, mail host, DKIM, DMARC and verification record among them. Settings: `always_use_https` off → on, `min_tls_version` 1.0 → 1.2, `email_obfuscation` on → off. New ruleset: the www redirect |
| Apex + www SSL and redirects | PASS | The swap was one DNS batch transaction at 23:23:18, so the apex never lacked a record; `domain --apply` finished by 23:23:53. Certificates: apex (Google Trust Services WE1, to 6 Feb 2027), www (Let's Encrypt YE2, `*.` and apex, to 5 Feb 2027); HSTS `max-age=31536000; includeSubDomains`. One hop each: `http://www…/tours/?a=1&b=2` → `https://goodtimesincapetown.co.za/tours/?a=1&b=2`; `https://www…/about/` → `https://…/about/`; `http://…/` → `https://…/` |
| Noindex absent on the domain | PASS | Apex `/`: 200 from Cloudflare, no `X-Robots-Tag`, `<meta name="robots" content="index,follow">`, canonical `https://goodtimesincapetown.co.za/`. `robots.txt` allows all and names the apex sitemap |
| Domain smoke and migration audit | PASS | `smoke.mjs https://goodtimesincapetown.co.za --env production --domain`: 29/29 (pages, legacy redirects, 404, live API, media, http → https, www → apex with query). `qa/legacy-urls.mjs --base=https://goodtimesincapetown.co.za --env=production --domain`: **430 of 430** (the 420 historical-URL checks plus the 10 host checks). `/api/health`: `ok`, enquiries `live`; `/api/availability?month=2026-12`: `ok`, no full or closed days, earliest date 48 hours ahead |
| Booking wizard, desktop and Android | PASS | From `/tours/cape-peninsula-private-tour/` to the wizard on the domain at 1440 px and on a Pixel 7, with the tour preselected. Empty fields are refused (date or "flexible", pickup, name, email, consent, terms). Tomorrow is refused: "Tours need 48 hours’ notice. Choose 2026-11-10 or later." The review lists tour, date, group, pickup, contact, consent and terms. The quote is "We’ll confirm your quote. Not an amount due."; nothing reads as confirmed. Send was not pressed. No console errors apart from the analytics beacon below |
| Production test enquiry | PASS | 23:32:54, through the real form (desktop Chromium on the domain). Identity: the operations team's own (info@, the business's published phone). Dates flexible and no date given, so it holds no vehicle time. One press, one POST: **201**, reference `GT-E••SC` shown on the page with "Enquiry received; your booking is not yet confirmed.", `emailed: true`. Database (Neon console, production branch, one read-only query): exactly one row, type `tour`, status `NEW`, `dates_flexible` true, no date, email log `enquiry-received: sent` and `new-enquiry-internal: sent`, history `created`, `terms`. It was the only enquiry in production |
| Test guest and staff emails | PASS (provider); **owner check** (inbox) | Resend: the team notification (from hello@, reply-to the visitor's address) and the acknowledgement ("…: received, not yet confirmed"), both to info@, sent 23:32 and **Delivered** 23:33, i.e. accepted by the receiving server. Arrival in the inbox (not Spam) and the headers' `dkim`/`spf`/`dmarc` results need a person at info@ |
| Admin booking state and hold | **owner check** | Sign-in links go to info@, which only staff can read. Staff: open `/admin/`, sign in with the emailed link, find `GT-E••SC` ("TEST — CUTOVER QA"), move it through one status and close it. It holds no vehicle (no date), so nothing needs releasing |
| Negative paths (isolated test project) | PASS (earlier on 8 Nov), not re-run | `qa/enquiry-live.mjs` on `good-times-enquiry-test`: invalid fields, honeypot, duplicates, availability and races, email and database failures, admin authorisation (`docs/enquiries/GO_LIVE_READINESS.md`). Not repeated in this window: the test project's access key and database URL are no longer on this machine |
| Contact enquiry | N/A | The contact page has no form of its own; it leads to the same enquiry form, by email, phone and WhatsApp |
| Google Search Console | PASS | Domain property, the owner's Google account. `https://goodtimesincapetown.co.za/sitemap.xml` submitted 8 Nov: **Success, 25 pages discovered**. Live tests at 23:48–23:52: `/`, `/packages/garden-route-private-tour/` (was `/tour/garden-route-private-tour/`) and `/tours/cape-winelands-private-tour/` (was `/tour/winelands-experience/`): available to Google, crawl and indexing allowed, fetch successful, user-declared canonical the apex URL; indexing requested for all three. The WordPress-era sitemap entry (`http://www…/sitemap.xml`, "1 error" since 2024) is left as the baseline. Search figures are kept out of this repository |
| Bing Webmaster Tools | PASS | Sitemap submitted (processing); the 25 sitemap URLs submitted through URL Submission (23:46); a Site Scan (100 pages, subdomains excluded) queued, with a report email to the owner |
| Rollback readiness | PASS | Zone backup at 23:04 (records, BIND export, settings, rulesets, page rules) and a post-cutover snapshot at 23:55, kept off the repository. A rollback script (dry run tested, steps below). The old host still serves WordPress |
| Independent verification | PENDING at the time of this commit | A second, adversarial pass by a separate agent against the live domain (its result is added to this table when it completes) |

## Owner checks (the only open items of the brief)

1. **info@: the two test emails.** Subjects "Tour GT-E••SC · Cape Peninsula Private Tour · flexible dates · 2 adults" and
   "Your Good Times tour enquiry GT-E••SC: received, not yet confirmed". Confirm both are in the inbox (not Spam). If
   possible, look at "show original": `dkim=pass`, `spf=pass`, `dmarc=pass`.
2. **Staff dashboard.** Sign in at <https://goodtimesincapetown.co.za/admin/> with the emailed link, open "TEST — CUTOVER
   QA", move it to Contacted, then Closed.
3. **Rotate the Cloudflare tokens** pasted into the chat on 8 Nov 2026 (My Profile › API Tokens).

## Found during the cutover (not blocking)

- **Cloudflare Web Analytics injection.** On the proxied domain, Cloudflare's automatic Web Analytics setup injects its
  beacon (`static.cloudflareinsights.com/beacon.min.js/v…`) into every page, without the visitor's consent. The site's
  Content Security Policy blocks it, because it allows only the exact `beacon.min.js` that `consent.js` loads after
  Allow. So no analytics run without consent, as the privacy notice says. The cost is one console error and one blocked
  request per page. Fix: in Cloudflare, Analytics & Logs › Web Analytics › the site › turn off automatic setup. It is an
  account setting, left for the owner's go-ahead.
- **www in Pages shows "pending".** The www custom domain is still validating, because the edge redirect answers www
  before Pages does. Visitors are unaffected: www is served by the redirect, with the zone's certificate (to Feb 2027).
- **The mail server's certificate renews by 24 Dec 2026.** It is a Let's Encrypt wildcard issued by DNS validation.
  With DNS at Cloudflare, ask the host how AutoSSL renews it (H5). HSTS now covers the subdomains (`includeSubDomains`),
  so browsers will refuse webmail on an expired certificate.
- **Mail and webmail by the bare domain.** `goodtimesincapetown.co.za/webmail` and `/cpanel` now reach the new site
  (404). Use `webmail.goodtimesincapetown.co.za` and `cpanel.goodtimesincapetown.co.za`. A mail app that names
  `goodtimesincapetown.co.za` as its server must use `mail.goodtimesincapetown.co.za`.
- **Rich results.** Google's index holds the WordPress homepage with product and review rich results. The new homepage
  has none: third-party ratings (Tripadvisor, Google) may not be marked up as the site's own. Expect the stars to drop
  from its search result once the new page is indexed.

## Timeline (SAST, 8 Nov 2026)

| Time | Step |
|---|---|
| 23:04 | Zone backup (38 records, settings, rulesets) |
| 23:05 | Release candidate `d8dd8af2` on staging; the full browser suite on it |
| 23:1x | `setup.mjs pages --apply` (production `ENQUIRY_MODE=live`; secrets kept) |
| 23:17 | Production deployment `e3a1960f` (`201a8db`); smoke 27/27, legacy 420/420 on pages.dev |
| 23:20–23:21 | Mail baseline; H5 applied and verified on the authoritative nameservers |
| 23:23:18 | Website records swapped in one DNS batch transaction |
| 23:23:36–23:23:53 | `setup.mjs domain --apply`: custom domains, HTTPS settings, www redirect |
| 23:24 | Apex answers from Cloudflare where resolvers are fresh (old records had a 30-minute TTL) |
| 23:28–23:30 | Domain smoke 29/29, legacy 430/430; apex custom domain active; mail probe after the cutover |
| 23:32:54 | Production test enquiry `GT-E••SC` (201); 23:33 both emails delivered |
| 23:35 | Database row verified (Neon console) |
| 23:40–23:52 | Search Console sitemap, live tests and indexing requests; Bing sitemap, URLs and Site Scan |
| 23:55 | Post-cutover zone snapshot and diff |

## Rollback (ready, not needed)

In this order, each verified before the next:

1. Stop live enquiries. In the Pages project, roll production back to deployment `93527eca` (enquiries in preview
   mode), or set production `ENQUIRY_MODE` to `preview` and redeploy.
2. Restore the two website records in one DNS batch. Delete the two proxied CNAMEs. Add apex `A 129.232.204.50` and
   www `CNAME goodtimesincapetown.co.za`, both DNS only, TTL 1800.
3. Detach `goodtimesincapetown.co.za` and `www.goodtimesincapetown.co.za` from the Pages project.
4. Remove the redirect rule `gt_www_to_apex`. If wanted, return the settings to `always_use_https` off,
   `min_tls_version` 1.0 and `email_obfuscation` on.
5. Keep H5 (SPF without `+a`, SRV to `cpcalendars.`/`cpcontacts.`): it is correct for either host. Keep all MX and mail
   records. Keep the production database (do not erase real enquiries).
6. Check WordPress on the apex and www, and mail (the probe above). If this happens after about 14 Dec 2026, run AutoSSL
   in cPanel for the apex (`docs/seo/READINESS.md`).

## Commands (tokens from the environment, never printed)

```bash
CLOUDFLARE_ACCOUNT_ID=… node scripts/cloudflare/setup.mjs pages            # read-only, then --apply
node scripts/cloudflare/build.mjs production
npx wrangler pages deploy site --project-name good-times-in-cape-town --branch main --commit-hash "$(git rev-parse HEAD)"
node scripts/cloudflare/smoke.mjs https://e3a1960f.good-times-in-cape-town.pages.dev --env production
node qa/legacy-urls.mjs --base=https://e3a1960f.good-times-in-cape-town.pages.dev --env=production
CLOUDFLARE_ACCOUNT_ID=… node scripts/cloudflare/setup.mjs domain           # read-only, then --apply after the swap
node scripts/cloudflare/smoke.mjs https://goodtimesincapetown.co.za --env production --domain
node qa/legacy-urls.mjs --base=https://goodtimesincapetown.co.za --env=production --domain
```

`setup.mjs` now proves the account from Cloudflare's record of the domain's zone. It needs this when the token cannot
list accounts (no Account Settings: Read). The proof is still by the account's name, never by the id alone (`201a8db`).
