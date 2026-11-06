# Reviews: source audit

What the site's review section shows, where every item comes from, what was checked, what is approved and what is not.
Checked on 6 Nov 2026 for the "Good Times, Naturally" refresh (brief §7). The section is the home page's chapter 09,
"The people behind the good times" (`src/pages/index.mjs`, `src/assets/css/living-cape.css` §11,
`src/assets/js/reviews.js`); the same records feed the `/reviews/` page and the tour pages' Reviews tabs.

## 1. The sources

| Source | What it holds | Checked |
|---|---|---|
| **The review archive**, Drive › `TripAdvisor Review Photos` (`1ewKajce8G7_vfMf3Q9b1gDiuh5drt2V_`), compiled 5 Nov 2026 | `01_Review_Photo_Database`: the "Reviewer Photo Index" Google Sheet (`1YHCSU5wflvMQo9lT2UiAuPa7K_YvqcvDCg06ifMe9wU`), its Excel copy (`1JO05Ms-BMVq-rn-IUqv1XkqZK2QDxAuy`), `review_photo_manifest.json` (`1lnZAMbBbkzkmNDvmmFbY8LPv13mTt8WG`) and `.csv` (`1dPW8k2MGNLeHOioEc0rz8owkxmN54Q6Z`). `02_Reviewer_Collections` (`1D1hWIplqUvKk13LKrGBRp1SwKQ7-VL1x`): **empty**. `03_Approved_Photos` (`1c8LxzpSZAzsK7EOSlpVxXIl09fLRD1sR`): **empty**. `04_Research_Reports`: `extraction_report.json` (`1VV3jN-0TmSqNmqlBQoxxevqtSJq4auyY`), `unresolved_photo_mappings.json` (`1umzxSxHoQkM2q3E9-eNl07tgWZBlfEwM`), `usage_rights_report.json` (`1rn38aVihBnLl-rT2TPnC2wPFNHnBe3Gr`) | Every folder listed and every file downloaded and read on 6 Nov 2026 |
| **The live Google Sheet** (exported as `.xlsx` on 6 Nov 2026) | Tabs: All Photos, Reviewers (70), Reviews (81), Unresolved, Usage Rights (70), Extraction Summary | Compared with the Excel copy of 5 Nov: Reviewers, Reviews, Unresolved, Usage Rights and Extraction Summary identical; All Photos one row shorter (343 against 344 rows). **No newer approval was recorded** |
| **The site's review data**, `src/data/reviews.mjs` | Ten reviews chosen from Good Times' own research of 3 Nov 2026 (Drive › Tripadvisor Photo Collection › 09: `tripadvisor-review-index.csv`, `testimonial-candidates.csv`): display name, place, tour, date written, the reviewer's rating, the review's link, our own one-line summary, and the file name the reviewer's photo would have | Each cross-checked against the archive (§3) |
| **Reviewer photo folder**, `src/assets/img/reviewers/` | Where an approved reviewer headphoto is placed to appear on its card (`src/partials/reviewer-photo.mjs`) | **Empty**: no file has been supplied |
| **The listing**, Tripadvisor `d19611200` | Rating 5.0, 264 reviews, read on the listing on 5 Nov 2026 (`site.tripadvisor`); the archive's extraction of the same day counted the same 264 reviews | Not fetched again: Tripadvisor's terms prohibit automated access and copying (the archive's `terms_notice`), so the site keeps the figures with the date they were read |
| **The brief** (6 Nov 2026) | "The owner has now stated the review content and headphotos have been approved and verified" | Reconciled below |

## 2. Reconciliation: what the owner's statement and the archive say

| Question (brief §7) | Finding |
|---|---|
| 1. Newer approved assets or permissions supplied by the owner? | **None found.** `03_Approved_Photos` and `02_Reviewer_Collections` are empty; the live sheet's Usage Rights tab is unchanged since 5 Nov: all 70 reviewers "Not requested", no dates, scopes or evidence links. Nothing new was supplied with the brief (no headphoto files, no permission records) and nothing is in `src/assets/img/reviewers/` |
| 2. Are reviewer headphotos actually available? | **No.** The archive indexes the 343 photographs reviewers attached *to their reviews* (travel photos), not their profile pictures: its `extraction_report.json` records "Review text was not stored. Reviewer hometowns, avatars and owner responses were not collected." Its `usage_rights_report.json` records 0 approved, 343 unverified, 0 downloaded, 0 uploaded |
| 3. Which quotations and photographs are approved for display here? | **Quotations: none** (no reviewer's permission to quote is recorded anywhere; the archive did not store review text). **Reviewer photographs: none.** The review *facts* (name, rating, date, tour, link) are public on Tripadvisor and verified against the archive (§3), and the site's one-line summaries are Good Times' own words |
| 4. Source and permission status | Recorded per review in §3 and in `docs/RIGHTS_REGISTER.md` › Reviews and ratings; the open request is R3 in `docs/APPROVAL_REGISTER.md` |
| 5. Downloading or republishing Tripadvisor imagery | **Not done.** No profile picture or review photograph was fetched from Tripadvisor or its CDN (the archive's `photo_direct_url`s were not opened) |
| 6. Substituting another person's headphoto | **Not done.** The illustrated stand-in avatars the home page used until 6 Nov (`assets/img/avatars/guest-*.svg`, "nobody's likeness") were removed from the cards as well: the brief asks for real portraits or initials, never generated faces |
| 7. Inventing text, ratings, identities or dates | **None.** Every name, place, rating, date, tour and link is the review's own (§3); every summary is labelled "The review in short, in our words" |
| 8. A review without an authorised headphoto | Shown with an accessible **initials** treatment (the initials are decoration beside the visible name, `aria-hidden`). An approved photo, once supplied, covers them automatically |

**Conclusion.** The owner's statement could not be matched to any approved file or permission record: as of 6 Nov 2026,
**0 reviews are published with an authorised headphoto**; all 10 are published with initials. The section is built to
take the photos the moment they exist (§5), and nothing else in the refresh waited for them.

## 3. The ten published reviews: mapping and checks

"Archive" is the live sheet's Reviews tab (TripAdvisor review ID, date, rating and product, each linked to its review by
ID). "Headphoto file" is the name `src/data/reviews.mjs` expects in `src/assets/img/reviewers/`.

| # on page | Reviewer (as on Tripadvisor) | Place | Tour on the card | Written | Rating | Review ID | Archive agrees? | Headphoto file | Headphoto status | Words on the card |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | seamus0314 | Arlington, Virginia | Cape Peninsula Private Tour | Mar 2026 (2026-03-08) | 5 | 1052347335 | Yes: 2026-03-08, 5.0, Cape Peninsula Private Tour | `seamus0314.jpg` | Not supplied; permission "Not requested" → initials **S** | Our summary |
| 2 | TravelAngelDani | Garbsen, Germany | Cape Winelands Private Tour | Feb 2026 (2026-02-27) | 5 | 1051281574 | Yes: 2026-02-27, 5.0, Cape Winelands Private Tour | `travelangeldani.jpg` | Not supplied; "Not requested" → **T** | Our summary |
| 3 | Thea H | Kerkrade, The Netherlands | Township Private Tour | Mar 2025 (2025-03-11) | 5 | 997530936 | Yes: 2025-03-11, 5.0, Langa Township Private Tour | `thea-h.jpg` | Not supplied; "Not requested" → **TH** | Our summary |
| 4 | Kashou106 | Houston, Texas | Cape Peninsula Private Tour | Oct 2023 (2023-10-13) | 5 | 921143619 | Yes: 2023-10-13, 5.0, Cape Peninsula Private Tour | `kashou106.jpg` | Not supplied; "Not requested" → **K** | Our summary |
| 5 | andyjanec | Soham, United Kingdom | Cape Town City Private Tour | Sep 2023 (2023-09-02) | 5 | 914461434 | Yes: 2023-09-02, 5.0, Cape Town Private City Tour | `andyjanec.jpg` | Not supplied; "Not requested" → **A** | Our summary |
| 6 | TravelAngelDani | Garbsen, Germany | Airport Private Transfer | Feb 2026 (2026-02-27) | 5 | 1051276181 | Yes: 2026-02-27, 5.0, Cape Town Private Airport Transfer | `travelangeldani.jpg` | As #2 → **T** | Our summary |
| 7 | Lydia W | Singapore | Cape Peninsula Private Tour | Feb 2025 (2025-02-25) | 5 | 995395596 | Yes: 2025-02-25, 5.0, Cape Peninsula Private Tour | `lydia-w.jpg` | Not supplied; "Not requested" → **LW** | Our summary |
| 8 | Meena301 | London, United Kingdom | Cape Peninsula Private Tour | Oct 2024 (2024-10-02) | 5 | 972224570 | Yes: 2024-10-02, 5.0, Cape Peninsula Private Tour | `meena301.jpg` | Not supplied; "Not requested" → **M** | Our summary |
| 9 | Dave F | Yonkers, New York | Township Private Tour | Jul 2024 (2024-07-10) | 5 | 958891925 | Yes: 2024-07-10, 5.0, Langa Township Private Tour | `dave-f.jpg` | Not supplied; "Not requested" → **DF** | Our summary |
| 10 | Lydia W | Singapore | Township Private Tour | Feb 2025 (2025-02-26) | 5 | 995470531 | Yes: 2025-02-26, 5.0, Langa Township Private Tour | `lydia-w.jpg` | As #7 → **LW** | Our summary |

All ten reviews appear in the archive's verified records (the 81 reviews that carry photographs), with the same ID,
date, rating and product: the names, ratings, dates and tours on the cards are verified. The order on the page puts a
different tour in each of the first six places (`STORY_ORDER` in `index.mjs`), so the first row never shows one
reviewer twice. The tour names on the cards are Good Times' own product names (the archive uses Tripadvisor's, e.g.
"Langa Township Private Tour" for the Township Private Tour).

## 4. What the section shows, and the platform's attribution

- **Several reviews at once:** six cards on wide screens, four on tablets, three on phones, the rest behind a real
  "Show *n* more reviews" button (`aria-expanded`, `aria-controls`); without JavaScript all ten show. No autoplay, no
  carousel, nothing hidden behind a slide.
- **Each card:** initials (or an approved photo), the reviewer's Tripadvisor display name and place, their own star
  rating (with "Rated 5 out of 5." for screen readers), the tour, our summary labelled "The review in short, in our
  words", the month written (`<time>`), and "Read the full review on Tripadvisor", linking to the review itself (new
  tab, `rel="noopener"`).
- **The rating summary** beside the heading: "5.0 · Rated 5.0 out of 5 on Tripadvisor · As listed on 5 November 2026",
  linking to the listing, kept apart from the cards and from the credentials strip. **No review count** is shown in the
  section (counts change; the brief asks for none to be hard-coded). The `/reviews/` page keeps its dated figures and
  breakdown (R1).
- **Tripadvisor attribution:** the platform is named in text ("Tripadvisor", its own spelling) on every card, the
  rating and the button "Read every review on Tripadvisor"; every link goes to Good Times' own listing or to the
  review on it. No Tripadvisor logo, badge, widget, review text, photograph or rating graphic is reproduced, and no
  `AggregateRating`/`Review` structured data is emitted for these third-party reviews (as before).

## 5. Included and omitted

| Item | Status | Why |
|---|---|---|
| The ten reviews above | **Published** with initials and our summaries, on the home page; the same records on `/reviews/` and the tour pages' Reviews tabs | Verified facts; our own words, labelled |
| Reviewer headphotos | **Omitted** (0 of 10) | None exists in the archive or the repository; none is approved (R2, R3) |
| Verbatim review excerpts | **Omitted** | No reviewer's permission recorded; the archive did not store review text (R3) |
| The archive's 343 review photographs | **Not used** | They are travel photographs, not headphotos, and their rights are "unverified" / "Not requested" for all 70 photographers; Tripadvisor's terms prohibit copying them |
| Reviews from the company's business partners (index #254, #255) | **Omitted** | As before: not independent guests |
| The illustrated stand-in avatars | **Removed from the cards** | The brief asks for real portraits or initials, not generated faces (the files remain in the repository, unused) |

## 6. How to publish an approved headphoto

1. Obtain the reviewer's written permission (where it will be shown, for how long, how it is credited) and record it
   in the sheet's Usage Rights tab (permission status, dates, scope, evidence link), as the archive's
   `recommended_process` describes.
2. Get the original file from the reviewer (not from Tripadvisor), square, 168 px or larger.
3. Save it as `src/assets/img/reviewers/<the name in §3>` and rebuild: the card shows it over the initials (alt
   "*name*’s Tripadvisor profile photo"); if it ever fails to load, the initials show again (`reviews.js`).
4. For an approved verbatim excerpt, add `quote`, `excerpt` and `quoteApproval` to the review in
   `src/data/reviews.mjs`: the card then shows the excerpt as a quotation linked to the review.
