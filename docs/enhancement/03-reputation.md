# Reputation: the proof, the guest voices and the evidence (8 Nov 2026)

The brief (§§ C–E) and its addendum: show Tripadvisor's 5.0 and 264 reviews without a date, in an elegant, clickable,
original panel; build one social-proof chapter that is not a carousel; use only permitted first-party words or official
embeds; check Google and every trust claim against primary sources; never overstate or add unlike counts together.

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

- **Built, as the owner asked**: the proof panel in the site's own type: "Tripadvisor" in plain letters (no owl, no
  bubbles), the numeral, five stars as decoration, "The reviews speak for themselves.", "5.0 out of 5 on Tripadvisor",
  "264 traveller reviews", and the green "Read our reviews" to the listing (new tab, `noopener noreferrer`). No date.
- **Release gate**: `site.tripadvisor.permission` (`scripts/release-gate.mjs`) holds production until the owner records
  Tripadvisor's written permission for that panel, or chooses the widget instead (R4 in the approval register).
- **The widget route, if chosen**: Tripadvisor's Rating widget (`cdsratingsonlynarrow`, location 19611200) works for this
  listing; it would be loaded only when the visitor asks ("Show Tripadvisor's live rating"), inside a sandboxed frame on
  its own page with its own policy, and the plain-text figures would then be removed everywhere (the widget terms).

The owner's mock-up badge is not used as an image: it redraws Tripadvisor's owl and wordmark.

## 3. The guest voices chapter

| Register | Content | Rules |
|---|---|---|
| The proof (beside the heading) | above | one constant (`site.tripadvisor`); no date; linked |
| A feature postcard | "Calm days, from the first hello to the last wave": the first theme, beside a Good Times photograph (guests waving at Cape Town International's departures, shown whole in a white print edge, captioned "A Good Times photograph"), a small dashed stamp in its corner | the photograph is used nowhere else; nobody in it is presented as a reviewer |
| Two staggered notes | "Stories that stay with you"; "A day that bends to the group" | labelled "In our words" |
| A quiet ribbon | "Google: 5.0 out of 5 from 10 reviews" (linked to the profile); "The three themes are our own summary of what reviewers write most often, not their words. The ratings are each platform's own, never added together." | Google apart from Tripadvisor; no total; the listing's link is the proof's own button, not repeated |

The three themes (`src/data/reputation.mjs` › `THEMES`) answer the brief's three: safe, relaxed and seamless planning;
expert local storytelling; private flexibility and a personal touch. Every phrase traces to the review research behind
`src/data/reviews.mjs` (a solo traveller who felt safe, clear contact before an airport pickup, the name sign at
arrivals, help with luggage; Langa with guides who grew up there, District Six, the city's history in order; a flexible
start, a new route when a rockslide closed Chapman's Peak, a guide who got to know the group). They carry no names,
stars or quotation marks.

Motion (`living-cape.js`, the home chapters' GSAP owner): each card rises once, opacity and 16 px, 0.1 s apart, from 85%
of the screen; no pin, scrub or loop; opacity only, so the cards stay in the accessibility tree and a focused one shows at
once; without motion they are simply in place.

Design (`voices.css`): white glass cards (`.gt-scenic-glass`) with a leaf-line border and a soft green-black shadow; the
display face for the numeral and the titles; one 7/5 column system for the head and the cards, so the proof and the first
note share an edge and the second note steps in by a gutter and a half; the postcard side by side only when the card
itself is 36rem wide (a container query: stacked on phones and at 1024 px); every theme labelled "In our words"; one
column on phones. After the critique the postcard lost its tilt and its wave postmark, and the notes their edge rule (it
read as a quotation mark-up on words that are not quotes).

## 4. The testimonial registry

`src/data/reputation.mjs` › `TESTIMONIALS`, the brief's model: `platform`, `source_url`, `permission_or_embed_method`,
`reviewer_display_name`, `date`, `rating`, `actual_verbatim_excerpt`, `tour_tag`, `photo_asset_and_rights`, `approved`.
`isEligible()` admits only an approved entry with written permission or an official embed, an https source, a name, a
date and the words themselves; anything else renders nothing. Today the ten Tripadvisor reviews summarised on `/reviews/`
are listed with "none recorded", so the home page shows none of them. `/reviews/` keeps its summaries for now (the
existing feature, kept as the brief asks when a direction conflicts with it): they are our own words, not quotes, but
Tripadvisor's terms ask for permission for that too (R1–R3, R4).

## 5. Keeping the figures true

The operator listing's figures live in one place, `site.tripadvisor` (rating, reviewCount, checked, checkedHow,
distribution); Google's in `site.google`. Before each release, and monthly:

1. Open the listing in a normal browser; read "All reviews (N)" and the rating (or the page's JSON-LD
   `aggregateRating`), and the five product counts. Do not script around its bot protection.
2. Open the Google Maps place page; read the rating and the count beside it.
3. Change `reviewCount`, `rating`, `checked` (and `google`) together; a screenshot of each into `evidence/`.
4. `npm test`: the reputation tests read the same constants, so a page and its test can never disagree.

A count that has grown since it was read understates; it never overstates, which is why the date can stay off the panel.
