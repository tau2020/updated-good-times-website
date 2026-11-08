# Go-live readiness: the live enquiry pipeline

**8 November 2026 · branch `integration/live-enquiry-pipeline` (stacked on PR #4) · tested code `95831eb` · decision: BLOCKED (G)**

The owner's brief of 8 Nov 2026 ("Master agentic execution prompt") asked for the enquiry system to be connected to real infrastructure and proven end to end, without switching the public website: Neon for the database, Resend for email, Cloudflare Pages for the site and its Functions, a controlled test with real delivery only to owned inboxes, and this report. What was done:

- **Neon:** a production database (migrated, restricted application role) and an isolated test branch.
- **Resend:** the sending domain added (eu-west-1, sending only), separate production and test sending keys; its four DNS records printed, **not yet added** (C).
- **Cloudflare:** the production environment's three secrets set, encrypted, with production still in **preview mode**; a separate, access-restricted test project (`good-times-enquiry-test`) whose `test` branch runs the real pipeline against the test branch and Resend's test inbox.
- **Code** (this branch): the Resend step's own approval, separate from the website cutover (`setup.mjs`); secrets as code (`secrets.mjs`); the test deployment's access key and allowlist; the restricted database role (`app-role.mjs`); two fixes the cloud tests found (the sign-in email bypassed the test inbox; failed emails were invisible in the dashboard); the cloud test suite (`qa/enquiry-live.mjs`).
- **Tests:** every scenario of the brief (A–J), the API's refusals, the security and reliability audit and the acceptance journey, **run in the cloud**, each checked in the database and in Resend (D).

What was **not** changed: the nameservers, MX records, the apex SPF, DMARC, the website's DNS records, WordPress, Cloudflare Email Routing (still off), PR #4 (not merged), the production deployment (still `1fe1f8ff`, preview mode). No paid service was activated. No credential, connection string or personal data is in this repository or this report; the test customers are synthetic.

Throughout, "delivered" means what Resend reports. Every test email went to Resend's test inbox (`delivered@resend.dev` and `delivered+…@resend.dev`), which **proves acceptance and content, not delivery to a Good Times mailbox**. Real delivery waits for the DNS records (G, blocker 1).

## A. Configuration inventory

Read back on 8 Nov 2026 through each service's API. Secrets appear by name only; no value was printed, logged or committed.

| Service | Environment | Configuration | Secrets present (names) | Verification |
|---|---|---|---|---|
| Cloudflare Pages `good-times-in-cape-town` | **production** (branch `main`, https://good-times-in-cape-town.pages.dev; the domain is not attached) | As code in `scripts/cloudflare/project.mjs`: `SITE_ENV=production`, `PUBLIC_SITE_URL=https://goodtimesincapetown.co.za`, `ENQUIRY_SYSTEM_ENABLED=true`, **`ENQUIRY_MODE=preview`**, `EMAIL_PROVIDER=resend`, `FROM_EMAIL=Good Times in Cape Town <hello@goodtimesincapetown.co.za>`, `ENQUIRY_TEAM_EMAIL`, `REPLY_TO_EMAIL` and `ADMIN_EMAILS` = info@goodtimesincapetown.co.za, `RATE_LIMIT_PER_MINUTE=10`, `SHOW_INDICATIVE_PRICES=true`; compatibility date 2026-10-01, `nodejs_compat` | `DATABASE_URL` (the `gt_app` role on the Neon production branch), `RESEND_API_KEY` (the production sending key), `ENQUIRY_SIGNING_SECRET` (64 random characters, generated for production only), all `secret_text`, set 8 Nov 2026 with `scripts/cloudflare/secrets.mjs` | `setup.mjs pages`: "nothing to change", three secrets set; the read-back proved every other variable unchanged. The live deployment (`1fe1f8ff`, 7 Nov 2026) predates the secrets and still answers `enquiries: preview`; they take effect only at the next production deployment, still in preview mode |
| Cloudflare Pages `good-times-in-cape-town` | preview (staging, `seo-preview` and every other preview branch) | `ENQUIRY_MODE=preview`, no email provider | **none, by design** (`secrets.mjs` refuses this environment) | Staging `de716d83` unchanged |
| Cloudflare Pages `good-times-enquiry-test` (new, isolated) | preview, branch `test` → https://test.good-times-enquiry-test.pages.dev | `SITE_ENV=preview` (noindex, preview bar), `ENQUIRY_MODE=live`, `FROM_EMAIL=Good Times in Cape Town (test) <onboarding@resend.dev>` until the domain verifies, team/reply-to/admin = info@, no `EMAIL_TEST_RECIPIENTS` yet (every email goes to Resend's test inbox) | `DATABASE_URL` (`gt_app` on the Neon branch `enquiry-test`), `RESEND_API_KEY` (the test sending key), `ENQUIRY_SIGNING_SECRET` (its own), `ENQUIRY_ACCESS_KEY` | `setup.mjs test`: "nothing to change", four secrets set; deployment `ad633a6c` from `95831eb` (the first, `bc6565a1` from `01715bb`, was replaced and deleted); without the key every route but `/api/health` answers 403 |
| Cloudflare Pages `good-times-enquiry-test` | production (`main`) | Preview mode, never deployed | none | `https://good-times-enquiry-test.pages.dev` answers 404 |
| Neon project `goodtimes-enquiries` (`soft-hat-33616906`) | production branch `production` (`br-bold-smoke-bdpneffk`, default) | PostgreSQL 18, aws-us-east-2, free plan (0.25–2 CU autoscaling, scale to zero), 6 hours of point-in-time history | Owner role (migrations only) and `gt_app` (the application: data access, no DDL) | 5 of 5 migrations applied; a second run: "database is up to date"; `gt_app` reads and cannot create tables; 0 rows in every data table |
| Neon | test branch `enquiry-test` (`br-cool-cell-bd0mr0us`, child of production) | Same schema, own endpoint and credentials | Its own owner and `gt_app` URLs | Synthetic data only; emptied after the tests |
| Resend | domain goodtimesincapetown.co.za (`6c688c77…`) | eu-west-1, sending enabled, receiving disabled, open and click tracking off | — | Status **not_started**: its four DNS records are not yet in the zone (C) |
| Resend | API keys | `good-times-production-sending` (`6c6064b4…`): sending only, restricted to the domain; `good-times-enquiry-test-sending` (`c6d1014c…`): sending only (any domain, so it can use Resend's test sender until the domain verifies). The full-access key `claude-updated` (`1e15e585…`) configured the domain and reads emails back for the tests: never a runtime key. `Onboarding` (`ad5f4397…`), the first key pasted in chat, is unused | — | Both runtime keys created through the API; their values went straight to private files and into Cloudflare |
| DNS (Cloudflare zone goodtimesincapetown.co.za, nameservers joan/shane.ns.cloudflare.com) | — | MX 10/20/30 mx1–3.rdsa-mail.com, apex SPF `v=spf1 +a +mx +ip4:129.232.204.50 ~all`, DMARC `p=reject; sp=reject; adkim=r; aspf=r`, the website's records: **all unchanged** | — | Read from 1.1.1.1 on 8 Nov 2026. The four Resend records are **not added**: the available token cannot read or edit DNS (403) |
| Inbound mail (rdsa-mail, Exim) | — | Unchanged | — | SMTP check without sending (C): info@, hello@ and stuart@ accepted (250), an unknown mailbox refused (550); STARTTLS offered |

## B. Database

**Project.** Neon `goodtimes-enquiries` (`soft-hat-33616906`), organisation `org-snowy-waterfall-09068001`, PostgreSQL 18 in aws-us-east-2, on the free plan (no paid service activated). Two branches: **production** (`br-bold-smoke-bdpneffk`, the default, endpoint `ep-lingering-glade-…`) and **enquiry-test** (`br-cool-cell-bd0mr0us`, endpoint `ep-hidden-union-…`), each with its own connection strings. The application uses the existing abstraction (`lib/db/index.mjs`, Neon's HTTP driver on Cloudflare) unchanged.

**Credentials.** Two roles per branch: the owner (`neondb_owner`), used only for migrations, and **`gt_app`**, the application's role, created in SQL by `scripts/db/app-role.mjs` (so it is not a member of Neon's `neon_superuser`): `LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT`, CONNECT on the database, USAGE (not CREATE) on `public`, SELECT/INSERT/UPDATE/DELETE on the tables and USAGE/SELECT on the sequences, with default privileges for tables the owner adds later. The script proves the role connects, reads `schema_migrations` and **cannot create a table**. `scripts/cloudflare/secrets.mjs` refuses to put an owner URL, or one without `sslmode=require`, into Cloudflare. Connections are TLS with channel binding. Neon's IP allowlist is not used (Cloudflare's egress addresses are not fixed); access rests on the credentials.

**Migrations.** `npm run db:migrate` (`lib/db/migrate.mjs`) applied the five reviewed migrations to production on 8 Nov 2026 (`001_init` … `005_booking_system`); the test branch inherited them. A second run on each branch: "database is up to date" (applied migrations are never re-run; the runner records each in `schema_migrations`).

**Schema checks** (against the brief's list):

| Required structure | Where |
|---|---|
| Enquiries, customer contact information | `enquiries` (name, email, phone, country, preferred contact method; the tour or transfer fields; travellers; requests) |
| Reference numbers | `enquiries.reference_number`, unique (`GT-` + 6 characters without look-alikes; collisions retried) |
| Booking status | `enquiries.status` (NEW, CONTACTED, QUOTED, CONFIRMED, CLOSED, CANCELLED; check constraint) |
| Availability | `enquiries.slot_start/slot_end`, `return_slot_*` (the vehicle time each request holds); `day_capacity` (vehicles per day set in the dashboard) |
| Email send logs, failed message handling | `email_log` (template, recipient, status queued/sent/failed, provider message id, error, attempts, the payload to re-render; `ON DELETE CASCADE`) |
| Administrative authentication, signed-link replay protection | `admin_sign_ins` (each sign-in link's id, unique: a second use is refused); status links are single-use through the state machine |
| Audit events | `enquiry_events` (actor, kind, detail, time; `ON DELETE CASCADE`) |
| Duplicate prevention | `enquiries.idempotency_key` (unique) and `dedupe_hash` (same person, same request, 10 minutes) |
| Rate limiting | `rate_limits` (keyed hashes, never raw IP addresses) |
| Migration history | `schema_migrations` |

**Persistence tests** (all on the real test branch through the deployed API, section D): connection (P1, `/api/health?check=db` from the Functions runtime, 0.6 s); create (A–C, X); read (dashboard lists and details, G8, X3); update status (H1–H5, X4); upcoming query (G8); duplicate handling (D1); availability validation (A2, B2, C2); concurrent submissions (I1, I3); email-log persistence (every `-log` check; E1–E2); database unavailable or failing (F1–F4: never a false success, never a reference, nothing stored); recovery and retry (E2, F3's next request).

**Customer data in responses and logs.** The intake answers only `ok`, `reference`, `enquiry_type` and `emailed`; availability answers only dates (S4). Error responses are generic (F1–F3). The server logs the recipient of an email that fails (finding L1), never a secret.

**Backup and recovery.** Neon's free plan keeps **6 hours** of history: the production branch can be restored to any moment in that window (point-in-time restore), and branches can be created from it. There is no longer backup: see finding M2 (a scheduled logical backup to Good Times' own storage, or a paid plan with 7+ days, before real data is collected).

**Synthetic data.** Production holds no test record (0 rows in every data table, checked before and after). The test branch held only synthetic records (names "Synthetic Tester …", addresses `delivered+gt-<run>-…@resend.dev`), removed after the tests (section D, clean-up).

## C. Email

### Sending domain: added to Resend, **not yet verified**

goodtimesincapetown.co.za was added to Resend on 8 Nov 2026 (07:06 UTC) with `setup.mjs resend --apply` and the configuration-only key: region **eu-west-1** (Ireland, the closest to Cape Town), sending enabled, **receiving disabled** (Resend asks for no inbound MX), open and click tracking off. Resend returned four records, all on subdomains. None of these names exists in the zone today, so none conflicts; the apex MX, the apex SPF and DMARC stay exactly as they are:

| Type | Name | Value | Priority | Cloudflare proxy |
|---|---|---|---|---|
| TXT | `resend._domainkey` | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDnoDicyV1NnVVRBP2gtzcR1aQftzAZHJJCC0pGIdbDGZ4uvMNXyyOxgpvNNZiMlxgzhGkk7SYv0zCpTWuxe3ZKmsUPc3Ug4sZY4Z9ieOEFhZhEzijdCf+2h7bk9YJmw8Ctk1tJc0bMolnQHFrcheoxeK84le2kr7izrdpnhk0l0QIDAQAB` | | DNS only |
| MX | `send` | `feedback-smtp.eu-west-1.amazonses.com` | 10 | DNS only |
| TXT | `send` | `v=spf1 include:amazonses.com ~all` | | DNS only |
| CNAME | `rsend` | `send.forge.rmta.net` | | DNS only |

(The DKIM value is a public key: it is published in DNS by design.)

**Why they were not added.** The only Cloudflare token available can deploy Pages but cannot read or edit the zone's DNS (403), and the brief forbids asking for tokens in chat. The script therefore stopped and printed the records instead of writing them. **To finish:** in the Cloudflare dashboard (goodtimesincapetown.co.za › DNS › Records › Add record), add the four records as above, or provide a token with *Zone › DNS: Edit* for this zone in the environment and run `node scripts/cloudflare/setup.mjs resend --apply` (it adds exactly these, never the apex's, then asks Resend to verify). Then record `verified: true` in `SENDING_DOMAIN` (`scripts/cloudflare/project.mjs`): the test deployment then sends as hello@ and lets info@ (its `EMAIL_TEST_RECIPIENTS`) receive real mail.

**Alignment once added.** Mail from hello@goodtimesincapetown.co.za is signed with DKIM `d=goodtimesincapetown.co.za` and returns to `send.goodtimesincapetown.co.za`; both align (relaxed) with the From domain, so the existing `p=reject` DMARC policy passes without being weakened. No second SPF record is created at the apex. The apex SPF's `+a` is a separate cutover item (H5) and is untouched.

### Authentication results

Not yet measurable: no message has been sent as hello@ (Resend refuses it until the domain verifies). Every test email in this report was sent as Resend's own test sender (`onboarding@resend.dev`), which proves the pipeline, the content and the provider's acceptance, but **not** Good Times' DKIM, SPF or DMARC. After verification, check one delivered message's headers in the info@ mailbox: `Authentication-Results: … dkim=pass header.d=goodtimesincapetown.co.za; spf=pass smtp.mailfrom=send.goodtimesincapetown.co.za; dmarc=pass`.

### Test recipients and delivery

| Email | Trigger | Sent to (test) | Reply-To | Verified in Resend | Result |
|---|---|---|---|---|---|
| A. Team notification | a new enquiry | `delivered@resend.dev` (info@ is routed there until the domain verifies) | the customer | subject with reference, customer, tour/transfer, date, travellers, pickup, the customer's message, the dashboard link and 4 signed status links (A, B, C, X `-team-email`) | accepted, **delivered to Resend's test inbox** |
| B. Acknowledgement | a new enquiry | the synthetic customer, `delivered+gt-…@resend.dev` | info@ | reference, summary, "This is not yet a confirmed booking." in text and HTML, no payment or confirmation implied (`-ack-email`, re-checked) | accepted, delivered (test inbox) |
| C. Booking confirmation | staff confirm in the dashboard or by the email link | the customer | info@ | reference, "is confirmed", the booking terms line (X5, H3) | accepted, delivered (test inbox) |
| D. Cancellation | staff cancel | the customer | info@ | reference, neutral wording, **no refund promise** (H5) | accepted, delivered (test inbox) |
| E. Staff sign-in link | `/admin/sign-in` | `delivered@resend.dev` | info@ | single-use link to the deployment, 20 minutes, never stored in the database (G1) | accepted, delivered (test inbox) |

Every email of the runs went to a `resend.dev` test address: none to a real mailbox (test L1). `delivered` here means Resend's own test inbox accepted it. **Real delivery to a Good Times mailbox is not demonstrated** and cannot be until the domain is verified.

### Failed-email behaviour (cloud)

With a deployment whose Resend key is wrong (E): the enquiry is stored, the customer's answer says `emailed: false`, both emails are logged `failed` with Resend's error (401). Staff now see "N emails failed to send" and the request marked "Email failed" (E1b). After **Retry emails that failed** on a healthy deployment, the same rows are sent (attempts 2, provider ids), no enquiry is duplicated, and a confirmation that the booking had since outgrown (confirmed, then cancelled) is marked superseded and never sent, while the cancellation goes (E2, E2b, E3). If the email log itself cannot be written (F4), the request is kept, `emailed: false` is answered, and the request is marked "No email sent" with a warning on its page (F5).

### Inbound mail (Phase Two)

| Check | Result |
|---|---|
| MX records | 10 mx1, 20 mx2, 30 mx3.rdsa-mail.com: **unchanged**; they resolve to the mail host's filtering cluster (129.232.220.130/178, 41.203.7.82) |
| SMTP (port 25, mx1, 8 Nov 2026): EHLO, MAIL FROM, RCPT TO, then RSET/QUIT, **no DATA, so nothing was delivered** | Exim answers, offers STARTTLS; RCPT **accepted (250)** for info@, hello@ and stuart@; a made-up mailbox **refused (550 No Such User Here)**, so the server checks recipients and the three addresses exist there |
| Cloudflare Email Routing | not enabled; the `email` step stays locked (cutover approval) |
| Mailbox-level delivery | **unverified**: no mailbox access was available. A person should confirm that a test message to info@ (and hello@, which now accepts mail) arrives in the inbox used by staff |

## D. End-to-end test matrix

**Environment.** The isolated test project on Cloudflare (`https://test.good-times-enquiry-test.pages.dev`: a preview build in live mode behind its access key), the Neon branch `enquiry-test`, and Resend with the test sending key (every email to Resend's test inbox). For E and F, two fault deployments were built from the same code with one secret broken on purpose: `fault-email` (a wrong Resend key) and `fault-db` (a wrong database password). Each was used once and then deleted. Customers are synthetic, and every record was removed afterwards. All of it ran in the cloud: nothing in this table is a local simulation.

| Run | Deployment | Code | What |
|---|---|---|---|
| `mw7ijti1` | `bc6565a1` | `01715bb` | The whole suite: P, V, A–J, X, G, H, I, S, R |
| `mw7ijti1` re-check | (Resend copies) | `01715bb` | The four acknowledgements, re-read from Resend: the suite had looked for "not yet confirmed", and the email says "This is not yet a confirmed booking." No new email was sent |
| `mw7ixaop` | `ad633a6c` | `95831eb` | After the dashboard fix: P, D, E, F, J, T |
| `mw7j5prq`, `mw7j7bjf` | `ad633a6c` | `95831eb` | The final acceptance (X, G). The first of the two failed three checks of the suite itself, not the site: X7 counted a status link the booking had moved past (409, "No change") as broken, and G7/G8 needed a reference from a scenario not run. Both were fixed and the run repeated |

A later run's result replaces an earlier one for the same check (the evidence files keep every run: `docs/enquiries/evidence/`). Between `01715bb` and `95831eb` the code changed only the dashboard's list and detail pages and added one read-only query. The intake, the emails and the status changes are unchanged, and they were exercised again on `95831eb` (D1, E, F, J, X, and the browser suite below). I4 was recorded as a failure by the first run; the suite now records an approval it cannot settle as BLOCKED.

| ID | Scenario | Expected | Actual (sanitised) | Result | Commit |
|---|---|---|---|---|---|
| P1 | Preflight | health answers live; the database check passes from the Functions runtime | health 200 live; db 200 ok (673 ms) | PASS | `95831eb` |
| P2 | Preflight: access restriction | without the access key (or with a wrong one) the enquiry, availability and dashboard routes answer 403 and store nothing | 403, 403, 403, 403; rows 14 → 14 | PASS | `95831eb` |
| P3 | Preflight: not indexable, not production | pages carry noindex (header and meta); the project’s production address has no deployment | X-Robots-Tag "noindex, nofollow", meta true, production address 404 | PASS | `95831eb` |
| V1 | API: missing required fields | HTTP 400, a clear error, nothing stored, nothing emailed | 400 Please check the highlighted fields. [tour_slug, preferred_date, adults, pickup_area, name, email]; stored 0 | PASS | `01715bb` |
| V2 | API: invalid email | HTTP 400, a clear error, nothing stored, nothing emailed | 400 Please check the highlighted fields. [email]; stored 0 | PASS | `01715bb` |
| V3 | API: invalid service choice | HTTP 400, a clear error, nothing stored, nothing emailed | 400 Please check the highlighted fields. [enquiry_type]; stored 0 | PASS | `01715bb` |
| V4 | API: malformed date | HTTP 400, a clear error, nothing stored, nothing emailed | 400 Please check the highlighted fields. [preferred_date]; stored 0 | PASS | `01715bb` |
| V5 | API: unsupported tour | HTTP 400, a clear error, nothing stored, nothing emailed | 400 Please check the highlighted fields. [tour_slug]; stored 0 | PASS | `01715bb` |
| V6 | API: date inside the 24 hours’ notice | HTTP 400, a clear error, nothing stored, nothing emailed | 400 Please check the highlighted fields. [preferred_date]; stored 0 | PASS | `01715bb` |
| V7 | API: invalid JSON | HTTP 400, a clear error, nothing stored, nothing emailed | 400 Invalid JSON; stored 0 | PASS | `01715bb` |
| V8 | API: oversized payload (40 KB) | HTTP 413, a clear error, nothing stored, nothing emailed | 413 Request too large; stored 0 | PASS | `01715bb` |
| V9 | API: honeypot filled | a bland 200 with no reference (bots learn nothing); nothing stored or emailed | 200 {"ok":true}; stored 0 | PASS | `01715bb` |
| V10 | API: sent faster than a person could (1 s) | a bland 200 with no reference (bots learn nothing); nothing stored or emailed | 200 {"ok":true}; stored 0 | PASS | `01715bb` |
| V11 | API: methods and routes | GET on the intake is 405 with Allow; an unknown API route is 404; responses carry no stack trace | 405 Allow: POST, OPTIONS; 404 | PASS | `01715bb` |
| A1 | A Private tour (browser) | 201 from the real form; the page shows the same GT reference and says it is not yet confirmed | 201 GT-GPAK78 shown "GT-GPAK78" emailed true | PASS | `01715bb` |
| A2 | A Private tour: availability applied | the request holds its whole date (a vehicle) in Cape Town time | 2027-04-20T22:00:00.000Z + 24 h | PASS | `01715bb` |
| A-ack-email | A Private tour | Email B in Resend: to the customer, reply-to the team inbox, reference, summary, “This is not yet a confirmed booking.” in text and HTML; delivered (re-checked from Resend after the suite’s own check looked for different words; no new email) | Your Good Times tour enquiry GT-GPAK78: received, not yet confirmed · “This is not yet a confirmed booking.” in text and HTML · reply-to info@ · delivered | PASS | `01715bb` |
| A-db | A Private tour | exactly one enquiry with this reference, every field as sent, status NEW | 1 row, NEW, fields match | PASS | `01715bb` |
| A-events | A Private tour | history: created by the website, terms acceptance recorded | created, terms | PASS | `01715bb` |
| A-log | A Private tour | email_log: the team notification and the acknowledgement, both sent, each with a provider message id | enquiry-received sent → delivered+gt-mw7ijti1-a@resend.dev (01a1ba12…); new-enquiry-internal sent → delivered@resend.dev (01a1ba12…) | PASS | `01715bb` |
| A-team-email | A Private tour | Email A in Resend: to the team inbox (routed to delivered@resend.dev until the domain verifies), reply-to the customer, reference, details, dashboard and signed status links; delivered | Tour GT-GPAK78 · Cape Peninsula Private Tour · 21 Apr · 2 adults · delivered · dashboard link, 4 status links | PASS | `01715bb` |
| B1 | B Airport transfer (browser) | 201 from the real form, reference shown | 201 GT-Z8SV9Y (transfer) | PASS | `01715bb` |
| B2 | B Airport transfer: transfer-specific fields | arrival type, the flight number normalised, pickup and return held for 2 hours each | flight BA 59, holds 120 + 120 min, pickup Cape Town International Airport (CPT) | PASS | `01715bb` |
| B3 | B Airport transfer: dashboard | the dashboard detail shows the type, date and time, flight, travellers, luggage and return | 200; all shown | PASS | `01715bb` |
| B-ack-email | B Airport transfer | Email B in Resend: to the customer, reply-to the team inbox, reference, summary, “This is not yet a confirmed booking.” in text and HTML; delivered (re-checked from Resend after the suite’s own check looked for different words; no new email) | Your Good Times transfer request GT-Z8SV9Y: received, not yet confirmed · “This is not yet a confirmed booking.” in text and HTML · reply-to info@ · delivered | PASS | `01715bb` |
| B-db | B Airport transfer | exactly one enquiry with this reference, every field as sent, status NEW | 1 row, NEW, fields match | PASS | `01715bb` |
| B-events | B Airport transfer | history: created by the website, terms acceptance recorded | created, terms | PASS | `01715bb` |
| B-log | B Airport transfer | email_log: the team notification and the acknowledgement, both sent, each with a provider message id | enquiry-received sent → delivered+gt-mw7ijti1-b@resend.dev (01a1ba12…); new-enquiry-internal sent → delivered@resend.dev (01a1ba12…) | PASS | `01715bb` |
| B-team-email | B Airport transfer | Email A in Resend: to the team inbox (routed to delivered@resend.dev until the domain verifies), reply-to the customer, reference, details, dashboard and signed status links; delivered | Transfer GT-Z8SV9Y · Thu 22 Apr 14:30 · CPT airport → Synthetic test address · 3 pax · + return · delivered · dashboard link, 4 status links | PASS | `01715bb` |
| C1 | C Garden Route multi-day (browser) | 201 from the real form for the package with its nights | 201 GT-HZP2TV | PASS | `01715bb` |
| C2 | C Garden Route: duration | the package holds a vehicle for its 4 nights plus one day | 5 days from 2027-04-23 | PASS | `01715bb` |
| C-ack-email | C Garden Route | Email B in Resend: to the customer, reply-to the team inbox, reference, summary, “This is not yet a confirmed booking.” in text and HTML; delivered (re-checked from Resend after the suite’s own check looked for different words; no new email) | Your Good Times multi-day tour enquiry GT-HZP2TV: received, not yet confirmed · “This is not yet a confirmed booking.” in text and HTML · reply-to info@ · delivered | PASS | `01715bb` |
| C-db | C Garden Route | exactly one enquiry with this reference, every field as sent, status NEW | 1 row, NEW, fields match | PASS | `01715bb` |
| C-events | C Garden Route | history: created by the website, terms acceptance recorded | created, terms | PASS | `01715bb` |
| C-log | C Garden Route | email_log: the team notification and the acknowledgement, both sent, each with a provider message id | enquiry-received sent → delivered+gt-mw7ijti1-c@resend.dev (01a1ba13…); new-enquiry-internal sent → delivered@resend.dev (01a1ba13…) | PASS | `01715bb` |
| C-team-email | C Garden Route | Email A in Resend: to the team inbox (routed to delivered@resend.dev until the domain verifies), reply-to the customer, reference, details, dashboard and signed status links; delivered | Multi-day GT-HZP2TV · Garden Route Private Tour · 23 Apr · 4 nights · 2 adults · delivered · dashboard link, 4 status links | PASS | `01715bb` |
| D1 | D Duplicate submission | a browser retry (same idempotency key) answers 409 with the first reference; the same request under a new key within 10 minutes answers 409 too; one enquiry, one pair of emails | 201 GT-ZNJ8PS in 4311 ms; retry 409 duplicate_submission GT-ZNJ8PS in 991 ms; same content 409 duplicate_content; rows 1; emails 2 | PASS | `95831eb` |
| E1 | E Email failure: the request is kept | with Resend refusing the key: 201 with emailed:false and a reference; the enquiry is stored; both emails logged as failed with the provider’s error | 201 GT-UPC6GA emailed false; logs enquiry-received failed: Resend responded 401: API key is invalid; new-enquiry-internal failed: Resend responded 401: API key is invalid | PASS | `95831eb` |
| E1b | E Email failure: visible to staff | the bookings list says how many emails failed and marks the request “Email failed” | row mark true; “2 emails failed to send and will go again when you press Retry.” | PASS | `95831eb` |
| E2 | E Email failure: the retry | after the provider is restored, the dashboard’s “Retry emails that failed” sends them: same rows, now sent with message ids, attempts 2; no new enquiry; the obsolete confirmation is superseded, the cancellation sent | retry → /admin/?m=retried.5.0; first: enquiry-received sent ×2, new-enquiry-internal sent ×2; second: new-enquiry-internal sent, enquiry-received sent, booking-confirmed failed (superseded: the booking is now CANCELLED), booking-cancelled sent; enquiries 2 | PASS | `95831eb` |
| E2b | E Email failure: cleared after the retry | once resent, the request loses its “Email failed” mark | mark gone | PASS | `95831eb` |
| E3 | E Email failure: the retried email | the retried acknowledgement reaches Resend’s inbox with the original reference | Your Good Times tour enquiry GT-UPC6GA: received, not yet confirmed · delivered | PASS | `95831eb` |
| F1 | F Database failure: cannot connect | the API answers an error (no false success, no invented reference, no diagnostics); health reports the database; nothing is stored | 500 "Something went wrong on our side. Please try again in a moment."; health 503 error; stored 0 | PASS | `95831eb` |
| F2 | F Database failure: the dashboard | the dashboard shows a plain error page, not a stack trace or a false empty list | 500 Something went wrong on our side. Please try again in a moment. | PASS | `95831eb` |
| F3 | F Database failure: the insert is refused | an error answer with no reference; no row, no email; the next request works again | 500 "Something went wrong on our side. Please try again in a moment."; stored 0; emails 0; afterwards ok | PASS | `95831eb` |
| F4 | F Database failure: the email log cannot be written | the stored enquiry is kept and the answer says the emails were not sent (emailed:false), never a false “emailed” | 201 GT-54YXAJ emailed false; stored true; email_log rows 0 | PASS | `95831eb` |
| F5 | F Database failure: the unannounced request is visible | the bookings list marks it “No email sent” and its page tells staff to contact the customer | list mark true; page warning true | PASS | `95831eb` |
| X1 | Acceptance: the customer submits | the real enquiry page takes the request and shows a unique reference | 201 GT-UDQ33K | PASS | `95831eb` |
| X2 | Acceptance: staff find the enquiry | searching the reference in the dashboard finds it | 1 result link(s) for GT-UDQ33K | PASS | `95831eb` |
| X3 | Acceptance: the details | the detail page shows the reference, customer, tour, date and pickup, history and the two emails sent | reference, customer, tour, pickup, history and emails shown | PASS | `95831eb` |
| X4 | Acceptance: staff confirm the booking | the dashboard says the status is Confirmed and the customer has been emailed | Status set to Confirmed. The customer has been emailed. | PASS | `95831eb` |
| X5 | Acceptance: the follow-up email (Email C) | the booking confirmation reaches Resend for the customer: reference, Confirmed, the booking terms line, the site’s sender; delivered | Your Good Times booking GT-UDQ33K is confirmed · from Good Times in Cape Town (test) <onboarding@resend.dev> · delivered | PASS | `95831eb` |
| X6 | Acceptance: the journey in the database | status CONFIRMED; history: created, terms, NEW → Confirmed by the staff address; email_log: three emails, all sent | CONFIRMED; events created, terms, status (New → Confirmed by info@goodtimesincapetown.co.za); emails enquiry-received sent, new-enquiry-internal sent, booking-confirmed sent | PASS | `95831eb` |
| X7 | Acceptance: the links in the emails | every link in the three emails answers: this deployment’s pages, the dashboard and the status links (opening one changes nothing), and the outside links; none is plain http | 8 links; all answer; outside: none; status still CONFIRMED | PASS | `95831eb` |
| X-ack-email | Acceptance | Email B in Resend: to the customer, reply-to the team inbox, reference, summary, plainly not yet confirmed; delivered | Your Good Times tour enquiry GT-UDQ33K: received, not yet confirmed · delivered | PASS | `95831eb` |
| X-db | Acceptance | exactly one enquiry with this reference, every field as sent, status NEW | 1 row, NEW, fields match | PASS | `95831eb` |
| X-events | Acceptance | history: created by the website, terms acceptance recorded | created, terms | PASS | `95831eb` |
| X-log | Acceptance | email_log: the team notification and the acknowledgement, both sent, each with a provider message id | enquiry-received sent → delivered+gt-mw7j7bjf-x@resend.dev (01a1ba22…); new-enquiry-internal sent → delivered@resend.dev (01a1ba22…) | PASS | `95831eb` |
| X-team-email | Acceptance | Email A in Resend: to the team inbox (routed to delivered@resend.dev until the domain verifies), reply-to the customer, reference, details, dashboard and signed status links; delivered | Tour GT-UDQ33K · Cape Winelands Private Tour · 22 Apr · 2 adults · delivered · dashboard link, 4 status links | PASS | `95831eb` |
| G1 | G Admin: the sign-in link by email (Email E) | asking for a link sends one email through Resend, routed to the test inbox, from the site’s sender, with a single-use link to this deployment; never stored in email_log | received in 5 s · to delivered@resend.dev · delivered · link to test.good-times-enquiry-test.pages.dev · email_log rows 0 | PASS | `95831eb` |
| G2 | G Admin: opening the link changes nothing | the link opens a page with a Sign in button and sets no session (mail scanners open links) | button shown, session cookie false | PASS | `95831eb` |
| G3 | G Admin: signed in | the button starts a 12-hour session in a __Host- cookie (Secure, HttpOnly, SameSite=Lax) and lands on the bookings list | secure true, httpOnly true, sameSite Lax, ~12 h | PASS | `95831eb` |
| G4 | G Admin: replayed sign-in link | the same link a second time is refused (single use) | 400 “already been used” | PASS | `95831eb` |
| G5 | G Admin: sign out | signing out clears the session; the dashboard then asks to sign in again | cookie cleared, then /admin/sign-in | PASS | `95831eb` |
| G6 | G Admin: refusals | no session → sign-in page; an invalid, forged or expired link → refused; an expired or forged session → signed out; a non-staff address gets the same answer and no email | none 303→/admin/sign-in; invalid 400; forged 400; expired 400; old session 303; forged session 303; non-staff session 303; stranger 200, new emails 0 | PASS | `95831eb` |
| G7 | G Admin: forged requests (CSRF) | a change posted from another origin, or without the page’s form token, is refused and changes nothing | other origin 403; no form token 403; status still CONFIRMED | PASS | `95831eb` |
| G8 | G Admin: the lists | New, Upcoming, Past, Closed & cancelled and All answer; search finds by reference and by name; a non-match finds nothing | new 200, upcoming 200, past 200, cancelled 200, all 200; by reference true, by name true, non-match empty true | PASS | `95831eb` |
| G9 | G Admin: page defences | dashboard pages forbid scripts, framing and indexing (CSP default-src none, X-Robots-Tag), keep sign-in tokens from other sites (Referrer-Policy) | CSP default-src 'none'; style-src 'unsafe-in…; noindex, nofollow; same-origin | PASS | `95831eb` |
| H1 | H Lifecycle: a status link from Email A | opening “Mark contacted” only shows a confirmation; pressing it moves NEW → CONTACTED (by “email link”); pressing again changes nothing | GET 200 (still NEW); POST 200 → CONTACTED; again 200 “Already done” | PASS | `01715bb` |
| H2 | H Lifecycle: tampered and misused links | a link with a changed signature, another enquiry’s id or an expired date is refused; a link backwards is refused | changed signature 403; other enquiry 403; expired 410 | PASS | `01715bb` |
| H3 | H Lifecycle: NEW → CONTACTED → QUOTED → CONFIRMED | each step recorded in the history with who made it; confirming emails the customer (Email C) | CONFIRMED; New → Contacted (email link); Contacted → Quoted (info@goodtimesincapetown.co.za); Quoted → Confirmed (info@goodtimesincapetown.co.za); booking-confirmed sent | PASS | `01715bb` |
| H4 | H Lifecycle: an old link after confirmation | “Mark quoted” from the team email cannot move a confirmed booking back | 409, still CONFIRMED | PASS | `01715bb` |
| H5 | H Lifecycle: cancellation (Email D) | CANCELLED frees the vehicle, is recorded, and emails a neutral notice with the reference and no refund promise; delivered | CANCELLED; Your Good Times tour GT-SSXZ8G has been cancelled · delivered | PASS | `01715bb` |
| I1 | I Concurrency: five requests for one vehicle | with the day set to 1 vehicle in the dashboard, five simultaneous requests store at most one; the rest answer 409 “fully booked” (at worst all are asked to choose again); the vehicle is never overbooked | day set 303; answers 409, 409, 409, 409, 409 in 3033 ms; holding the date: 0 | PASS | `01715bb` |
| I3 | I Concurrency: overlapping transfers | two transfers 30 minutes apart (each holds 2 hours) on a 1-vehicle day: at most one stored; a transfer after the hold ends is accepted | pair 409, 409; three hours later 201 | PASS | `01715bb` |
| I4 | I Concurrency: business rules | vehicle numbers approved by Good Times | not verifiable here: the default of 2 vehicles a day, the 2-hour airport and 3-hour other transfer holds, and the 24 hours’ notice are the site’s assumptions (src/assets/js/enquiry-schema.js › BOOKING_RULES), not confirmed by Good Times: a business-approval blocker (D9) | **BLOCKED** (approval) | `01715bb` |
| J1 | J Mobile: validation | an empty step answers with plain messages at the top of the step, on a 412 px wide screen | 412×839: “Some information needs attention Choose a preferred date, or tick “My dates are flexible”.” | PASS | `95831eb` |
| J2 | J Mobile: keyboard and tap targets | with the lower 42% of the screen taken by a keyboard, the field and the Next button stay reachable, uncovered and at least 44 px tall; no sideways scroll | field covered false, Next in view true covered false (334×48); overflow 0 | PASS | `95831eb` |
| J3 | J Mobile: repeated taps | three quick taps on Send make one request and one enquiry; the confirmation is shown | 1 request(s), 1 enquiry, shown GT-79UFJD | PASS | `95831eb` |
| S1 | Security: SQL injection | hostile text is stored as text; every table is intact | 201; stored literally true; 7 tables | PASS | `01715bb` |
| S2 | Security: script injection | the name and request are escaped in the team email and in the dashboard: no live <script> or onerror attribute | email live markup false, escaped true; dashboard live markup false | PASS | `01715bb` |
| S3 | Security: header injection | a line break in the name never reaches an email header (rejected or flattened) | 201, stored name has a line break: false | PASS | `01715bb` |
| S4 | Security: data minimisation | the public answers give away no personal data: the intake returns only ok, reference, type and emailed; availability returns only dates | intake keys emailed,enquiry_type,ok,reference; availability keys ok,month,earliest,full,closed | PASS | `01715bb` |
| T1 | Reliability: response times | the database check, the availability month and the dashboard answer within a few seconds from the Functions runtime | health+db median 633 ms (max 772); availability 837 ms (max 841); dashboard list 567 ms (max 629) | PASS | `95831eb` |
| R1 | Security: rate limiting | ten posts a minute from one address are answered; the eleventh gets 429 with Retry-After | 400 400 400 400 400 400 400 400 400 400 429; Retry-After 57 | PASS | `01715bb` |
| L1 | Email: no unintended recipients | every email of this run went to Resend’s test inbox or a synthetic resend.dev address, never to a real mailbox | 3 emails, 0 to a non-test address | PASS | `95831eb` |

85 of 86 pass; 0 fail; 1 wait for an approval.

**Also run in the cloud**

| Suite | Where | Result |
|---|---|---|
| `test/e2e/enquiry.spec.mjs` › live build, desktop: a tour, a transfer, the multi-day tour at 2 and 6 nights, a lost response retried with the same key, the busy state and honest failure messages, a 409 duplicate, booked days in the calendar, keyboard focus, a date taken while typing | `ad633a6c` (`95831eb`) | 9 of 9 pass |
| `test/e2e/legacy-booking.spec.mjs`, desktop and mobile: the twelve historical booking links open the form on their tour or the transfer; sign-in `?next=`; the account pages; `/bookings/` → Contact; old tour addresses (PR #4 not regressed) | `ad633a6c` | 8 of 8 pass |
| `scripts/erase-personal-data.mjs` on the test branch | `enquiry-test` | A dry run lists matches (address masked); an open booking is refused without `--include-active`; a cancelled request is erased with its 3 email rows and 3 history events |
| `npm run db:migrate`, a second time | production and `enquiry-test` | "database is up to date" |
| SMTP recipient check, no DATA (inbound) | mx1.rdsa-mail.com | 250 for info@, hello@, stuart@; 550 for an unknown address |

**Local quality gates** (code `95831eb`)

| Command | Result |
|---|---|
| `npm ci` | Clean install |
| `npm run build` | 27 pages |
| `npm run check` | No problems found |
| `npm run guard` | Every file clean |
| `npm test` | 370 of 370 pass (including the new tests of `setup.mjs`, `secrets.mjs`, the access key, the allowlist, the sign-in routing and the dashboard's email marks) |
| `npm run test:e2e` | 333 pass, 38 skipped (live-mode and WebKit tests), 1 fails: `motion.spec.mjs:73` (the aircraft entrance when arriving at `/#gallery`). It fails on `main` too and passed on PR #4's deployed preview: local-server timing, not this work |

**Clean-up.** The test branch was emptied: 25 synthetic enquiries with their 54 email rows and 60 events, the sign-in records and the rate-limit windows. Production held 0 rows before, during and after. The fault deployments and the superseded test deployment were deleted. The test project's `test` deployment, its access key and the test sending key are kept for the real-delivery test (A8): delete them afterwards (G › plan, step 5).

## E. Security and reliability findings

Phase Nine was run against the deployed test project (section D: P2, V1–V11, G4–G9, H1–H2, S1–S4, R1, F1–F5, E1–E3, I1–I3, T1, test L1), plus a review of the code and logs.

### Critical

None.

### High

None in the code. The release blockers (the unverified sending domain, the unapproved booking rules and legal texts) are in G.

### Medium

| ID | Finding | Status |
|---|---|---|
| M1 | **The staff sign-in email bypassed the test inbox.** `sendSignInLink` called the provider directly, so on a live non-production deployment the link went to the real staff address while every other email went to Resend's test inbox (and, with Resend's test sender, would simply have failed). | **Fixed** in `01715bb` (routed like every other email; `test/preview-sink.test.mjs`); verified in the cloud (G1: to the test inbox). |
| M2 | **Backups.** Neon's free plan keeps 6 hours of history; there is no longer backup. A mistake noticed the next day could not be undone. | **Open: owner decision** before real data: a paid Neon plan (7 days or more; a paid service, so not activated) or a scheduled `pg_dump` to Good Times' own private storage. |
| M3 | **Database region.** The project is in aws-us-east-2 (Ohio); the Functions run near the visitor. Each enquiry makes about fifteen sequential queries across the Atlantic: one took 4.3 s to answer (D1), a health check with one query 0.6 s (T1). | **Open: owner decision.** A project's region is fixed: if the times matter, create the production database in aws-eu-central-1 or aws-eu-west-2 now, while it is empty (migrations and `app-role.mjs` take minutes). |
| M4 | **Failed emails were easy to miss, and are never retried automatically.** The dashboard offered "Retry emails that failed" without saying whether any had failed; a failure showed only inside each request. Pages has no scheduled jobs, so nothing retries on its own. | **Visibility fixed** in `95831eb` (a count beside Retry, "Email failed" and "No email sent" marks, a warning on the request; `test/admin.test.mjs`; E1b, E2b, F5 in the cloud). **Automatic retry open**: a small Worker with a cron trigger calling a protected retry route, or a daily check by staff. |

### Low

| ID | Finding | Status |
|---|---|---|
| L1 | The server log line for a failed email includes the recipient's address (`lib/email/send.mjs`). Cloudflare's function logs are private to the account, not public. | Open (minor): log the email-log id instead. |
| L2 | If the email log cannot be written after the enquiry is stored (F4), there is no row to retry. | Mitigated: the answer says `emailed: false`, and since `95831eb` the request is marked "No email sent" with a warning (F5). |
| L3 | Simultaneous requests for the last vehicle can all be refused (I1: five at once on a 1-vehicle day, all 409; I3 likewise). Never overbooked, as designed ("at worst both racers are asked to choose again"), but under a true race nobody wins. | Accepted for Good Times' volume; an advisory lock or serializable transaction (Neon's WebSocket driver) would let exactly one win. |
| L4 | The test project's static pages are publicly reachable (noindex, not linked anywhere); only the API and the dashboard need the access key, so a visitor who finds the address sees a live-looking form that answers 403. | Accepted for a test deployment; delete its deployments (or the project) after acceptance. |
| L5 | Neon has no IP allowlist and the production branch is not protected (free plan; Cloudflare's egress addresses are not fixed). | Accepted: TLS with channel binding, a restricted role and secrets only in Cloudflare are the controls. |
| L6 | `scripts/erase-personal-data.mjs` pointed to a missing `docs/OPERATIONS.md`. | Fixed: it points to F below. |
| L7 | Credentials were pasted in chat for this work: a Cloudflare user token, a Neon API key and two Resend keys (one full access). None was written to the repository, a log or this report. | **Open: rotate or revoke all four** (A5 and the new A7 in the approval register). |

### Checks that passed (no finding)

- **Input validation**, client and server (V1–V6, J1); **body size** 413 above 32 KB (V8); **invalid JSON** (V7); **methods** (V11).
- **Injection:** SQL text stored literally, every table intact (S1); markup escaped in the team email and the dashboard (S2); a line break cannot reach an email header (S3).
- **Authorisation:** without the access key every route but health answers 403 (P2); without a session the dashboard redirects to sign-in, an expired, forged or non-staff session is refused (G6); cross-origin posts and posts without the form token are refused (G7).
- **Signed URLs:** a changed signature, another request's id or an expired link is refused; a link cannot move a booking backwards (H2, H4).
- **Replay:** a used sign-in link is refused (G4); a used status link changes nothing (H1); a repeated submission returns the first reference (D1, J3).
- **Sessions:** `__Host-` cookie, Secure, HttpOnly, SameSite=Lax, 12 hours; sign-out clears it (G3, G5).
- **Rate limiting:** the 11th post in a minute gets 429 with Retry-After (R1); sign-in links are limited per connection and per address.
- **Spam protection:** the honeypot and the too-fast check answer a bland 200 and store nothing (V9, V10).
- **Data minimisation:** the intake answers only `ok`, `reference`, `enquiry_type`, `emailed`; availability only dates (S4); rate limits store keyed hashes, not addresses.
- **Error responses:** generic, no stack trace, no SQL, no connection details (F1–F3, V11).
- **Secret exposure:** no secret in the static build, the Functions bundle, the emails (checked in every Resend copy) or the repository; secrets are encrypted in Cloudflare and were never printed.
- **Database credentials:** the application cannot create or alter tables (`gt_app`); `secrets.mjs` refuses an owner URL.
- **Retention and erasure:** `scripts/erase-personal-data.mjs` deletes a request with its email log and history (cascade), refuses an open one unless told, and applies a retention date once B5 is decided.
- **Legal gate:** not bypassed. The test deployment is a preview build with synthetic data only; production stays in preview mode, and the release override covers good-times-in-cape-town.pages.dev only.

### Reliability (measured in the cloud)

| Measure | Result |
|---|---|
| Persistence of accepted requests | every 201 had exactly one row (A–C, D, X, J, S) |
| Notification delivery | every email to a healthy provider accepted and delivered to the test inbox; with the provider failing, none lost (E) |
| Failed-email visibility | count and marks in the dashboard (E1b, F5) |
| Retry correctness | same rows resent, no duplicate enquiry, superseded status emails withheld (E2) |
| Database failure | no false success, no reference, nothing stored, health says so (F1–F3) |
| Concurrency | never overbooked (I1, I3) |
| Idempotency | retries return the first reference (D1, J3) |
| Response times (from the Functions runtime, measured from outside) | an enquiry, from the press of Send to the answer: **4.3 s** (D1; it stores the request, then sends both emails); a repeated submission 1.0 s; health with the database check: median 633 ms; an availability month: 837 ms; the dashboard list: 567 ms (T1) |
| Error recovery | the next request after a database failure works (F3) |

## F. Operational instructions

### How staff reach `/admin/`

1. Open `https://goodtimesincapetown.co.za/admin/` (after the cutover; until then the production address is `https://good-times-in-cape-town.pages.dev/admin/`, which answers only once the site is live).
2. Enter a staff address. Only the addresses in `ADMIN_EMAILS` receive a link (today: info@goodtimesincapetown.co.za); anyone else sees the same page and gets nothing.
3. Open the email "Your Good Times bookings dashboard sign-in link" within **20 minutes** and press **Sign in**. Opening the link signs nobody in: only the button does, so a mail scanner that opens links does no harm. Each link works once.
4. The session lasts **12 hours** in that browser. **Sign out** ends it. Removing an address from `ADMIN_EMAILS` (`scripts/cloudflare/project.mjs`, then `setup.mjs pages --apply` and a deployment) ends its sessions at the next request.

Rate limits: 5 link requests a minute per connection, 3 per address per connection in 10 minutes.

### How an enquiry is processed

1. The customer sends the form. The API validates it, checks the vehicles for its date and time, and stores it with a `GT-XXXXXX` reference **before** any email.
2. Two emails go out: the **team notification** to `ENQUIRY_TEAM_EMAIL` (reply-to = the customer, so **Reply** answers them; with **Mark contacted / quoted / confirmed / Close** links valid for 14 days) and the **acknowledgement** to the customer (from hello@, reply-to info@), which says plainly the booking is not yet confirmed.
3. Staff work from the dashboard: **New** (not yet handled), **Upcoming** (open requests whose trip is ahead), **Past**, **Closed & cancelled**, **All**, and search by reference, name, email or phone. Each request shows its details, its history (who changed what, when) and every email sent for it.
4. Status: NEW → CONTACTED → QUOTED → CONFIRMED, or CLOSED / CANCELLED. Setting **Confirmed** or **Cancelled** with "Email the customer" ticked sends the booking confirmation or the cancellation notice. CLOSED and CANCELLED free the vehicle; reopening checks the vehicles again.
5. **Availability**: the next six weeks, vehicles per day. Set a day's vehicles (0 closes it; empty returns to the default of 2).

### How failed notifications are retried

- An email that fails (provider down, key revoked, quota reached) is logged as `failed` with the provider's error; the enquiry is never lost, and the customer's answer says `emailed: false`.
- **Dashboard › Retry emails that failed to send** replays every failed email with attempts left (5 at most), and any stuck `queued` for more than 10 minutes. It reports "N sent, M still failing".
- From a terminal with the production `DATABASE_URL` and `RESEND_API_KEY`: `npm run email:retry`.
- A confirmation or cancellation is never sent late if the booking has changed since (it is marked "superseded").
- There is **no automatic retry**: Pages has no scheduled jobs. Someone must press Retry (see E, finding M4).

### How support investigates a missing email

1. Dashboard › the request › **Emails**: each email's template, recipient, status, attempts and error.
2. `sent` with a message id means Resend accepted it. In the Resend dashboard (Emails), search the recipient: the event shows **delivered** (the receiving server took it), **bounced**, **complained** or **suppressed**.
3. Delivered but not seen: the recipient's spam folder or mail rules; for info@, the mail host's filtering (rdsa-mail).
4. `failed`: read the error (401/403 = the API key; 422 = an address Resend refuses; 429 = rate or quota), fix the cause, then **Retry**.
5. No email rows at all: the email log itself could not be written (finding L2). The request is still in **New**; contact the customer from the dashboard details.

### How to verify database and email health

- `GET /api/health?check=db` answers `{"status":"ok","database":"ok"}` when the live site reaches the database and it is migrated (`503` otherwise). It reveals nothing else and needs no key.
- `DATABASE_URL=<owner URL> npm run db:migrate` reports "database is up to date" when no migration is pending (it never changes applied ones).
- Resend dashboard › Domains: goodtimesincapetown.co.za **Verified**; › Emails: recent deliveries; › API keys: only the production sending key in use.
- `node scripts/cloudflare/setup.mjs check`: the Pages variables match `project.mjs` and the three secrets are present (names only).

### Privacy requests and retention

- `node scripts/erase-personal-data.mjs --email <address>` (or `--reference GT-…`) lists what would be erased; add `--apply` to delete the enquiry with its email log and history. Open requests need `--include-active`. `--before YYYY-MM-DD --apply` applies a retention period once Good Times decides one (B5).
- Copies outside the database: the emails in the team mailbox and Resend's email log (kept by Resend for its retention period), and Cloudflare's function logs, which hold the recipient of an email that failed (finding L1).

### How to roll back an unsafe activation

1. **Stop new enquiries at once**: set `ENQUIRY_MODE=preview` (or `ENQUIRY_SYSTEM_ENABLED=false`) in `scripts/cloudflare/project.mjs`, run `setup.mjs pages --apply`, then `node scripts/cloudflare/build.mjs production` and `wrangler pages deploy site --project-name good-times-in-cape-town --branch main`. The form then says nothing is sent and the API answers 503; stored enquiries stay in the database.
2. **Faster, without a build**: in the Cloudflare dashboard › the project › Deployments, **Rollback** to the last preview-mode production deployment (every deployment keeps the variables it was built with).
3. **Suspected key leak**: revoke the key in Resend (API keys) or reset the `gt_app` password (`scripts/db/app-role.mjs` with a new `APP_ROLE_PASSWORD`), put the new value with `scripts/cloudflare/secrets.mjs … --apply`, and redeploy. Rotating `ENQUIRY_SIGNING_SECRET` signs every member of staff out and voids the open status links.
4. **Bad data**: Neon restores the production branch to any moment in the last 6 hours (free plan); beyond that, only a backup taken by Good Times (finding M2).
5. The domain cutover has its own rollback (`docs/seo/READINESS.md`): this pipeline never changes DNS, MX or the website records.

## G. Final go-live decision

# BLOCKED

The enquiry system works end to end on Cloudflare, Neon and Resend. A synthetic customer submits through the real form, the request is validated, checked for vehicles, stored in Neon with a GT reference, both emails go through Resend, a member of staff signs in with the emailed link, finds the request, confirms it, and the customer's confirmation follows. Every event is in the database and in Resend (section D: X1–X6, G1–G5). Failures behave honestly: no false success, no invented reference, no lost request, a visible and retryable email failure. Production stays in preview mode, and nothing changed in DNS, MX or the website records.

It is **not ready for production approval** because these remain:

| # | Blocker | Kind | Who | Unblocks |
|---|---|---|---|---|
| 1 | The sending domain is **not verified**: Resend's four DNS records are not in the zone (C; A7). Production cannot send as hello@ until they are | DNS change (approved, not yet made) | Whoever holds DNS access for goodtimesincapetown.co.za: four records in the Cloudflare dashboard, or a token with Zone › DNS: Edit | Authenticated sending |
| 2 | **Real delivery and authentication not demonstrated.** Every test email went to Resend's test inbox; no message has reached info@, and no DKIM/SPF/DMARC result exists for hello@ (C; A8) | Test, after 1 | Run the test project as hello@ with `EMAIL_TEST_RECIPIENTS=info@`; a person confirms the inbox and the headers | Real inbox delivery |
| 3 | **Booking rules not approved** (D9): 2 vehicles a day, 24 hours' notice, the transfer hours and holds decide which real requests are refused (I4) | Business approval | The owner | Availability decisions customers will see |
| 4 | **Legal texts not approved** (B1–B5): the privacy notice, the terms and their open points, the registered entity, the Information Officer, the retention period. The production override covers good-times-in-cape-town.pages.dev only, not real data collection on the domain | Legal approval | The owner | Collecting real customers' data |
| 5 | **Recommended before activation:** backups beyond 6 hours (A9), the database region (A10), automatic email retry (A11) | Owner decisions | The owner | Recovery, speed, unattended retries |
| 6 | **Credentials pasted in chat** (Cloudflare token, Neon API key, two Resend keys): rotate or revoke (A5) | Hygiene | The owner | Least privilege |

Public activation also needs the owner's explicit go-ahead for `ENQUIRY_MODE=live`, and the domain still serves WordPress (the cutover, A2, is separate and not part of this work).

### Production activation checklist

| Requirement | Status | Evidence, or what remains |
|---|---|---|
| Domain verified for transactional sending | ✗ | A7: the four records |
| Existing inbound email operational | ✓ at the SMTP level / ✗ mailbox level | MX unchanged; RCPT accepted for info@, hello@, stuart@ (C). A person to confirm the inbox (A8) |
| Database production-ready | ✓ | Migrated, restricted role, empty (B); backups and region are owner decisions (A9, A10) |
| Migrations applied | ✓ | 5 of 5; a second run changes nothing |
| Encrypted secrets configured | ✓ | `DATABASE_URL`, `RESEND_API_KEY`, `ENQUIRY_SIGNING_SECRET` in production (A) |
| Admin users verified | ✓ flow / ✗ real inbox | `ADMIN_EMAILS=info@`; sign-in, replay refusal, sessions and sign-out passed in the cloud (G1–G9); the link reaching info@ waits for A7 |
| Live email delivery tested | ✗ | Resend's test inbox only (C) |
| Booking rules approved | ✗ | D9 |
| Privacy notice approved | ✗ | B1 |
| Terms and booking policies approved | ✗ | B2–B5 |
| Failed-email monitoring available | ✓ | The dashboard's count and marks (E1b, F5); automatic retry optional (A11) |
| Restore and rollback procedure documented | ✓ | F |
| SEO migration PR tests still passing | ✓ | `npm test` (the registry and redirect tests), the twelve historical booking links on the deployed test project (8 of 8) |
| No unapproved changes to DNS or domain routing | ✓ | None made |

### Reversible deployment plan

1. **Verify the domain (A7).** Add the four records; `node scripts/cloudflare/setup.mjs resend` shows them in place and asks Resend to verify. Set `SENDING_DOMAIN.verified: true` in `scripts/cloudflare/project.mjs`: the test project then sends as hello@ and lets info@ receive. `setup.mjs test --apply`, `build.mjs test`, deploy to `--branch test`. *Undo:* delete the four records; nothing else uses them.
2. **Prove real delivery (A8).** `node qa/enquiry-live.mjs --base=https://test.good-times-enquiry-test.pages.dev --only=X,G,H` (the team notification and the sign-in link now reach info@). A person confirms the inbox and the `Authentication-Results` header. *Undo:* nothing to undo (test data only, removed by `--cleanup`).
3. **Approvals.** D9, B1–B5 (or a recorded override for the domain), A9–A11 decisions, and the owner's written go-ahead for live enquiries.
4. **Activate.** In `project.mjs` set production `ENQUIRY_MODE: 'live'`; `setup.mjs pages --apply` (it refuses while a secret is missing); `build.mjs production` (the static form and the runtime read the same variables, so they agree); `wrangler pages deploy site --project-name good-times-in-cape-town --branch main`; `smoke.mjs … --env production`; `/api/health?check=db`; one controlled enquiry from staff. *Undo:* set `ENQUIRY_MODE: 'preview'` and redeploy, or roll back to the previous deployment in the Cloudflare dashboard (seconds); stored enquiries are kept (F › rollback).
5. **Afterwards.** Revoke the full-access Resend key; when the test project is no longer needed, delete it (its deployments, secrets and the test sending key) and the Neon branch `enquiry-test`.
