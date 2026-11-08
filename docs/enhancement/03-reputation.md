# Reputation: the ratings, the reviewers' own words and the evidence (8 Nov 2026)

The brief (§§ C–E) and its addendum: show Tripadvisor's 5.0 and 264 reviews without a date, in an elegant, clickable,
original panel; build one social-proof chapter that is not a carousel; use only permitted first-party words or official
embeds; check Google and every trust claim against primary sources; never overstate or add unlike counts together.

Later the same day the owner replaced the chapter: "implement this review section … combine it with trip advisor as
well", with two screenshots of a Google reviews section (a rating bar with "Write a review", a grid of review cards,
"Load more"); then "use client original reviews, do not summarise reviews", pointing to the review archive on Drive.
Sections 3 and 4 describe what was built; the first version (three themes in our words, a postcard, a ribbon) is
retired with the summaries.

## 1. Evidence, read on 8 Nov 2026

| Claim | Source | Primary? | Read | Figure or wording | Verdict |
|---|---|---|---|---|---|
| Tripadvisor operator listing | tripadvisor.com.sg, location d19611200, viewed in a browser | Yes | 8 Nov 2026 | JSON-LD `aggregateRating` 5.0 / 264; "All reviews (264)"; 260 Excellent, 4 Good, 0, 0, 0; "#10 of 692 Transportation in Cape Town Central" | **Verified** (`evidence/2026-11-08-tripadvisor-listing.jpg`) |
| Product listings | the same page | Yes | 8 Nov 2026 | Peninsula 87, Airport transfer 89, Winelands 39, Township 22, City 16 | Verified; separate products, never added to 264 |
| Other Tripadvisor domains | search snippets (.co.za, .co.uk, .com) | No (cached) | 8 Nov 2026 | 263, 261, 254, 222 | Stale caches; not used |
| Google Business Profile | Google Maps place page, "Good Times In Cape Town", tour operator | Yes | 8 Nov 2026 | 5.0 from 10 reviews; address "Adeldhi Centre, 277 Main Rd, Sea Point, Cape Town, 8001" | **Verified** in a signed-in view (`evidence/2026-11-08-google-maps-5.0-10.png`); a signed-out view shows "5.0" without the count |
| Google via ShuttleScout | shuttlescout.co.za operator page | No | 8 Nov 2026 | 5.0 from 9 (snippet; the page refused automated reading) | Secondary, superseded by the primary 10 |
| Registered company | CIPC's own published list (Customer Notice 4 of 2025, 10 Jan 2025, beneficial-ownership non-compliance list "G") | Yes | 8 Nov 2026 | "2022/878500/07, GOOD TIMES IN CAPE TOWN"; not on the September 2026 lists | Name and number **verified**; status, date and registered address not publicly readable |
| Accredited guides | CTGA's Find-a-Guide directory | Yes (for CTGA) | 8 Nov 2026 | "Stuart Matanhire · Western Cape · WC Badge no WC 9175" | Verified for the founder; the national register search (incomplete) returns no match |
| CTGA associate | CTGA's Our Associates list (51 associates) | Yes | 8 Nov 2026 | Good Times in Cape Town not listed | **Contradicted**; the owner confirmed it on 7 Nov 2026 (T1): kept, flagged (T1 reopened, `APPROVAL_REGISTER.md`) |
| Fair Trade Tourism | fairtradetourism.org certified list and CSV; archived lists 2020, 2022, 2025 | Yes | 8 Nov 2026 | No match; the old website claimed "Fair Trade certification" (2020) | Not certified; the site makes no such claim |
| Tripadvisor Certificate of Excellence | Tripadvisor's award widget for d19611200, 2019–2026 | Yes | 8 Nov 2026 | No award for any year; the award was retired in July 2020 (replaced by Travellers' Choice) | **Not corroborated**; `/safety/` states it (owner-confirmed, H4): flagged (T2) |

Screenshots of the three primary readings are in `docs/enhancement/evidence/`, cropped to the figures.

## 2. Tripadvisor's rules, and the decision they leave to the owner

Read on 8 Nov 2026 (the pages themselves refuse automated reading; wording from Tripadvisor's Terms of Use of 15 Jul 2025,
its 2025 Brand Guidelines for Partners, and search excerpts of its widget terms):

- The widget terms: no modification or separation of a widget, and "you will not display any TripAdvisor ratings or
  reviews on your website outside of the TripAdvisor Widgets".
- The Terms of Use: Tripadvisor's name, owl logo and rating bubbles "may not be copied, imitated or used … without the
  prior written permission of Tripadvisor"; copying content needs written permission.
- The brand guidelines: marketing that uses Tripadvisor content needs Tripadvisor's approval, and a rating is shown as
  "Tripadvisor Traveler Rating" with the number of reviews and a date ("as of …").

The owner asked for "5.0 / 264 traveller reviews" and no date. Only Tripadvisor's own widget shows a live 5.0 and 264
without a date and within its terms, and it loads scripts, styles and images from Tripadvisor (www.jscache.com,
www.tripadvisor.com, static.tacdn.com) with inline handlers that this site's Content-Security-Policy refuses; loading it
for every visitor would also send each visitor's address to Tripadvisor before they have chosen anything, which the
privacy notice does not allow today. So:

- **Built, as the owner asked**: first the proof panel in the site's own type, then (the owner's follow-up) the rating
  bar of section 3: Tripadvisor's 5.0 and 264 with its five stars and its mark (the owl the site already uses for its
  Tripadvisor links), linked to the listing (new tab, `noopener noreferrer`), and the reviewers' own titles. No date.
- **Release gate**: `site.tripadvisor.permission` (`scripts/release-gate.mjs`) holds production until the owner records
  Tripadvisor's written permission for the rating and the reviewers' titles as shown, or chooses the widgets instead (R4
  in the approval register). The archive's own usage-rights report (5 Nov 2026) says the same of the reviews: copying
  Tripadvisor's content needs its prior written permission, and every reviewer's rights are "Not requested".
- **The widget route, if chosen**: Tripadvisor's Rating widget (`cdsratingsonlynarrow`, location 19611200) works for this
  listing; it would be loaded only when the visitor asks ("Show Tripadvisor's live rating"), inside a sandboxed frame on
  its own page with its own policy, and the plain-text figures would then be removed everywhere (the widget terms).

The owner's mock-up badge is not used as an image: it redraws Tripadvisor's owl and wordmark.

## 3. The review section (the owner's request of 8 Nov 2026)

One component in three places (`src/partials/review-wall.mjs`, `review-wall.css`, `review-wall.js`): the home page's
chapter 09, `/reviews/` and the Reviews tab of each tour with reviews.

| Part | Content | Rules |
|---|---|---|
| The rating bar | "Tripadvisor rating 5.0 ★★★★★ 264 reviews [Write a review]" beside "Google rating 5.0 ★★★★★ 10 reviews [Write a review]" | Each figure from its one constant (`site.tripadvisor`, `site.google`), never added together, no date; the counts link to the listing and the profile; each "Write a review" opens that platform's own form (both opened in a browser on 8 Nov 2026: Tripadvisor's `UserReviewEdit` page for the listing, and Google's form by the profile's Place ID, `ChIJ21BcDeVnzB0R8eeEloFUvnQ`, the profile's feature id in Google's encoding, which landed on the profile with its CID and its 5.0 from 10) |
| The cards | The reviewer's own rating (stars), the title they gave their review in quotation marks, word for word, "Read more" (the whole review on Tripadvisor, new tab), the product they reviewed (linked to our tour page) and their trip type, their initial in a coloured circle, their name, when they wrote it ("2 weeks ago", from the visitor's clock; the date itself in the element and its tooltip), "Posted on Tripadvisor" | Nothing summarised, shortened or reworded; only spaces around a title trimmed. Four across on wide walls, two in narrower ones, one on phones (container queries, so a tour's tab and the home page use one set of rules) |
| Load more | Eight more each press on the home page, twelve on `/reviews/` | Focus moves to the first new card; a status line says how many are showing; the button leaves once every card is in. Without the script the first cards show with their dates and the link under them leads to the rest |

The cards come from `src/data/guest-reviews.mjs`: the owner's archive (Drive › the reviews archive, the index workbook's
Reviews tab, compiled 5 Nov 2026), the 81 reviews it records of the 264 on the listing (it indexed the reviews that
carry photographs; every one is listed, newest first, from 20 Oct 2026 back to 17 Dec 2019, all rated 5). Each entry is
the archive's record: id, title, name, date, rating, product, trip type and the review's address, from which its tour or
service follows. The archive holds no review bodies, so a card shows the title and "Read more" leads to the rest; it
holds no Google reviews, so none is shown and Google's figure stands in the bar alone. A Google review would join the
list with `platform: 'Google'` and its own address, and the card's mark and "Posted on Google" follow.

Where each page carries them: `/reviews/` all 81 (12 drawn, the rest in a `<template>`, drawn only when asked for); a tour
page its own listing's (the Peninsula 41, the Winelands 11, Langa 10, the city 4); the home page the newest eight, and its
"Load more" reads the rest from `/reviews/` once, on the first press (its links resolved against that page, the cards
already shown left out), so the home page stays under the site's 200 KB page budget (186 KB; it was 177 KB before the
change). The stars and the platform's mark are drawn by the stylesheet, not repeated in every card, which keeps a card
near 1.3 kB.

Design: the screenshots' structure in the site's own type and greens. The bar is one white card with a cell per
platform; the cards are light (`--ivory-soft`) with a hairline, and on the home page white glass over the sea plane (72%
white, blurred where the sea is drawn: `voices.css`). The avatar tones are six of the palette's, each with white initials
at 5:1 or more. The chapter's heading is centred, as in the screenshots.

Accessibility: the stars are decoration with "Rated 5 out of 5" for screen readers; each link's name says where it goes
("Read more of Hannah C's review on Tripadvisor (opens in a new tab)", "264 reviews on Tripadvisor (opens in a new
tab)"); every control is at least 44 px tall and every link at least 24 px; the cards are a list with a label; a focused
card shows a ring. Motion: `living-cape.js` rises the head, the bar and the wall once (opacity and 16 px); cards added by
"Load more" fade in once, not under reduced motion.

Removed with it: the three themes in our words, the postcard and the ribbon (`reputation.mjs`), the ten summaries on
`/reviews/` and the tour pages (`reviews.mjs`), and the summary card (`reviewCard` in `cards.mjs`).

## 4. The testimonial registry: retired

The brief's registry (`TESTIMONIALS`, `isEligible`) admitted a guest's own words only with an approved, written
permission or an official embed, so it showed nothing. The owner's direction of 8 Nov 2026 replaces it: the reviewers'
own titles are shown, attributed and linked, with their permission still "Not requested" in the archive. The decision
and its risk are recorded where the owner can act on them: R1, R3, R4 and R5 in `docs/APPROVAL_REGISTER.md`, and the
release gate, which refuses production until Tripadvisor's permission is recorded (`site.tripadvisor.permission`).

## 5. Keeping the figures true

The operator listing's figures live in one place, `site.tripadvisor` (rating, reviewCount, checked, checkedHow,
distribution); Google's in `site.google`. Before each release, and monthly:

1. Open the listing in a normal browser; read "All reviews (N)" and the rating (or the page's JSON-LD
   `aggregateRating`), and the five product counts. Do not script around its bot protection.
2. Open the Google Maps place page; read the rating and the count beside it.
3. Change `reviewCount`, `rating`, `checked` (and `google`) together; a screenshot of each into `evidence/`.
4. `npm test`: the reputation tests read the same constants, so a page and its test can never disagree.
5. New reviews: add the archive's new rows to `src/data/guest-reviews.mjs` in the same shape, newest first, word for word;
   `test/reviews-data.test.mjs` checks every entry against its listing.

A count that has grown since it was read understates; it never overstates, which is why the date can stay off the panel.
