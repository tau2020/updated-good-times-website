# Legal reconciliation: the owner's checklist, the approved texts and the site (8 Nov 2026)

Sources, in the brief's order of authority: the owner's completed **Legal details checklist** (signed Stuart Matanhire,
8 Nov 2026), the **Privacy Notice** and **Terms and Conditions** approved on 8 Nov 2026 (both carrying highlighted
editor notes in square brackets), the **Booking rules** (approved 8 Nov 2026) and the internal **Privacy requests and data
retention procedure**. The Drive folder is link-shared and is not linked from this public repository.

Nothing here is legal advice, and nothing is published to production by this work: the release gate holds production
until a South African legal practitioner has signed the texts off (`site.legal.counselReview`, § 5).

## 1. The checklist, line by line

| # | The owner's answer | The approved document said | The site before (`main` `45e972f`) | The site now (this branch) | State |
|---|---|---|---|---|---|
| 1 | Good Times In Cape Town (Pty) Ltd; a company; CIPC 2022/878500/07 | Privacy: the name only. Terms: "Good Times In Cape Town (Pty) Ltd +27 72 3768432" pasted into the introduction (an editor's note) | Not shown (B3) | Privacy: "Registered name and number: Good Times In Cape Town (Pty) Ltd, 2022/878500/07". Terms, after the introduction: "Good Times in Cape Town is the trading name of Good Times In Cape Town (Pty) Ltd, registration number 2022/878500/07. Address: …" | Done. CIPC's own published list pairs the name and number (`03-reputation.md` › 1); the site states them as the company's details, never as a registry's verification |
| 2 | Information Officer Stuart Matanhire, stuart@goodtimesincapetown.co.za; registered with the Information Regulator | Privacy: the Information Officer and stuart@ in "Who we are", but "Your rights" still sent requests to hello@ | Not shown (B4); requests to hello@ | The Information Officer and stuart@ for "anything about your personal information"; hello@ for general enquiries; "Your rights" and the closing line send privacy requests to the Information Officer | Done; the two addresses are distinguished |
| 3 | Unconverted enquiries 1 month; confirmed bookings 5 years after the trip | Privacy: "[retention periods to add: checklist item 3]" | A general sentence (B5) | "If your request does not become a booking, we delete it one month after our last contact about it, or once the date you asked about has passed, whichever is later. If it does become a booking, we keep it for five years after your trip … unless the law requires us to keep it longer, for example for a tax query or a dispute." | Done, and applied: `node scripts/erase-personal-data.mjs --retention` selects exactly this (dry run first; never a request still holding a vehicle). The internal procedure still says "once Good Times decides the periods": the owner updates it to a monthly run (§ 4) |
| 4 | A rule per type: day tours 24 h, the Garden Route 48 h, airport and other transfers 24 h, partner activities 24 h; 100% after that; no-shows 100% | Terms: "depends on the specific tour … we'll confirm the applicable terms" plus the note "[the tour, transfer and activity pages currently promise free cancellation up to 24 hours before" (its bracket never closed) | Terms as approved; every page "free cancellation up to 24 hours", the Garden Route included; "non-refundable" | Terms § 3: the four notice periods, counted back from the scheduled departure or pickup in Cape Town, and "If you cancel later than that, or do not arrive (a no-show), 100% of the price is charged". Every tour, activity, package and transfer page and the FAQ say the same, from one source (`src/data/cancellation.mjs` reads `site.legal.cancellation`); the **Garden Route now says 48 hours**; the Private Cape Town Experience, which had no line, takes the day-tour rule; "non-refundable" is gone | Done; counsel to check § 5 (a) |
| 5 | EFT, card or cash; deposit 50% seven days before; balance on the day | Terms: "Payment terms will be confirmed …" plus the note "Bank Transfer and Card Payment" (no cash) | Terms as approved; FAQ "card payments and EFT" | Terms § 2 and the FAQ: "You can pay by bank transfer (EFT), card or cash. A deposit of 50% of the price is due 7 days before your excursion, and the balance on the day." | Done, **except the late booking** (§ 2) |
| 6 | (neither box ticked) | "Effective 2026-11-08" | 2026-11-08 | Unchanged | Kept: no instruction to change it |

The Terms' version is now `2026-11-08` (`site.legal.termsVersion`); every request that accepts the terms records it.

## 2. The conflict that needs the owner: a deposit due before the booking exists

Requests are accepted with 48 hours' notice (the booking rules), but the deposit is due 7 days before the excursion. A
booking made between 48 hours and 7 days ahead cannot meet that. Not decided here (no "immediately", no refusal): the
Terms carry one interim sentence, the approved text's own answer for that case only: "For a booking made less than 7
days before the excursion, we tell you when the deposit is due when we confirm your booking." The release gate names
the point (`OPEN_POINTS`, B6) until the owner chooses, for example: the deposit on confirmation, the full price on
confirmation, payment on the day, or no requests under 7 days.

## 3. The privacy notice's other corrections

| Point | Was | Is | Evidence |
|---|---|---|---|
| Where requests are stored | "Neon … Amazon Web Services in Frankfurt, Germany" + the note "[to correct before go-live: … us-east-2, Ohio …]" | "Neon stores booking requests in a database hosted by Amazon Web Services in Ohio, in the United States." | The Neon console, 8 Nov 2026: project goodtimes-enquiries (`soft-hat-33616906`), region AWS US East 2 (Ohio) (`evidence/2026-11-08-neon-region-us-east-2.png`). The database was not moved (A10 keeps that choice open) |
| Cross-border | "Your details may therefore leave South Africa." | "Your details are therefore stored outside South Africa, in the United States, and may pass through other countries on the way." | Follows from the region; counsel to confirm the POPIA s.72 basis (§ 5 (b)) |
| Analytics, opt-in and revocable | as written | unchanged | `consent.js`: the beacon is inserted only after Allow; "Analytics settings" in every footer reopens the choice; the browser suite's consent tests pass (`06-qa.md`). No analytics token is configured anywhere (A6), so nothing is loaded today |
| Browser storage | as written | unchanged | The form's draft and the currency in `sessionStorage` (`enquiry.js`, `currency.js`); the analytics answer in `localStorage` (`consent.js`); no cookie for visitors (the only cookie is the staff dashboard's session, `lib/http/admin.mjs`) |
| IP address | "a keyed one-way code made from your internet (IP) address" | unchanged | `lib/security/hash.mjs` › `hashIp` (HMAC-SHA-256, the signing secret) |
| Country for currency | "Cloudflare tells our website which country … We use it for that alone" | unchanged | `lib/http/currency.mjs` reads `CF-IPCountry` per request and stores nothing |
| Photo credits | "Nearly every photograph … is Good Times' own …" | adds the three scenic backdrops: stock photographs, credited, "not taken on our tours, and none of them shows Cape Town" | `02-scenic.md` |
| Marketing | "Booking with us never signs you up for promotional messages." | unchanged | No marketing list exists in the code |

No bracketed note, TODO, internal procedure, dashboard path or erasure step is on the public pages (tests assert it).

## 4. The internal procedure stays internal

The "Privacy requests and data retention procedure" is for the team and is not published. What the code does for it:
the dashboard's search by reference, name, email or phone (`/admin/`); `scripts/erase-personal-data.mjs` by reference,
email, date or, now, `--retention` (it lists first and changes nothing without `--apply`; it never erases a request that
still holds a vehicle; it re-checks each row as it deletes); the email log and history go with the request (cascade).
What it does not do, and the procedure must not claim: no scheduled deletion (Pages has no cron, A11), no deletion from
the team's mailbox, Resend's log or WhatsApp, no breach-notification automation. "Last contact" in the tool is the
request's last change in the dashboard (a status or a note): the team records contact there. For the owner to update in
the Drive procedure: the retention schedule (run `--retention` monthly), and that line.

## 5. For the legal practitioner (the release gate's `site.legal.counselReview`)

(a) **Cancellation charges**: a 100% charge after the notice period and for a no-show, against the Consumer Protection
Act s.17 (a "reasonable" cancellation charge, judged by the notice given and the chance to resell the day; no charge at
all where the cancellation is caused by the death or hospitalisation of the person booked for). The Terms avoid
"non-refundable" and state the owner's rule plainly; whether a savings sentence is needed is the practitioner's call.
(b) **Cross-border transfer**: the database in the United States; the notice relies on the transfer being needed to
answer the request (POPIA s.72(1)); Neon's and Resend's processing terms.
(c) **The staff cookie**: the notice says "This website sets no cookies": true for visitors; the dashboard's session
cookie is for staff only.
(d) **The deposit for late bookings** (§ 2), once the owner decides.
(e) **Effective date**: 8 Nov 2026 as approved, although these corrections are later; the owner may prefer the date of
publication.

## 6. What stops production today

`node scripts/release-gate.mjs` on this branch (the 7 Nov override still covers what it named):

- no South African legal practitioner has signed off the privacy notice and the terms (`site.legal.counselReview`);
- Tripadvisor's permission to show its rating and review count outside its widgets is not recorded
  (`site.tripadvisor.permission`, `03-reputation.md` › 2).

The late-booking deposit point is listed too, and is accepted only under the owner's override of 7 Nov 2026, which named
the open commercial points in general; the owner should decide it rather than rely on that.
