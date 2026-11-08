# Gate 0: the baseline, measured before any change (8 Nov 2026)

The owner's brief of 8 Nov 2026 (the master enhancement prompt and its legal and reputation addendum) asks for the site
to be inspected in a real browser before anything changes. This is what was found, how, and what it meant for the work.
Every figure here was read on 8 Nov 2026.

## 1. Which code, which deployment

| | Deployment | Commit | What it serves |
|---|---|---|---|
| Staging (`--branch staging`), the brief's "live visual target" | `f8ca738d`, 7 Nov 2026 | `289273f` | The site as reviewed on 7 Nov: no `/services/` or `/safety/` (404), the terms marked "Draft", the reviews dated "As listed on 5 November 2026" |
| Production, `good-times-in-cape-town.pages.dev` | `b9f742d0`, 8 Nov 2026 | `main` `45e972f` | Everything since: the historical URLs (#4), the live enquiry pipeline in preview mode (#5), the Search Console fixes and the 264 count (#6) |

Fingerprinted from outside (the pages' own text and status codes), since no Cloudflare token is provisioned in this
environment to read the deployment list. Staging is 20 commits behind `main`. The header, its stylesheet and `main.js` are
identical in both (`git diff 289273f main` touches only the footer's links and the canonical tag in `layout.mjs`), so the
header was measured on staging, as the brief asks, and the work starts from `main` `45e972f` (branch
`enhancement/glass-scenic-reputation-legal`), not from the stale preview.

Build: the zero-dependency generator (`src/build.mjs`), preview flavour 27 pages; Pages project `good-times-in-cape-town`
(`scripts/cloudflare/project.mjs`). Pages Functions serve `/api/*`, `/admin/*` and the video byte ranges.

## 2. The header, measured (`qa/header-morph.mjs`, Chromium, staging)

Widths 1440, 768, 390 and 360; home (the overlay header) and `/tours/` (the standard one); scrollY 0, 1, 12, 24, the
threshold and its neighbours, 50, just before and just after the hero's end, the first body section, and back up again.

| | Home | Inner pages |
|---|---|---|
| Node | `<header class="site-header site-header--overlay" data-header data-condense-at="40">` | `<header class="site-header" data-header>` |
| Position | `position: sticky; top: 0; z-index: 50`, below the preview bar (32 px; 44.7 px on phones), which scrolls away | same |
| Height | 113 px (1440), 97 (768), 105.3 (390), 97 (360) | 97 (1440, 768), 108.9 (390), 100.1 (360) |
| At the top | transparent, transparent hairline, no shadow, the reversed logo, white titles over the hero film | white, 1 px `#e1e7ea` hairline, no shadow, the ink logo |
| Threshold | `is-condensed` when `scrollY > 40` (41 on, 40 off) | `scrollY > 8` (9 on, 8 off) |
| Scrolled | white `#fff`, `#e1e7ea` hairline, `--shadow-s`, the ink logo, ink titles | the same, with the shadow |
| What moves | nothing: no height, padding, transform or top change; only paint | same |
| Transition | background-color, box-shadow, border-color, color: 400 ms `cubic-bezier(0.22, 1, 0.36, 1)` | same |
| Reverse scroll | restores exactly at and below the threshold | same |

Owners (the DevTools protocol's listener list): one passive scroll listener owns the header (`main.js` line 34, a
requestAnimationFrame toggle of `.is-condensed`); its paint is CSS. GSAP touches the header's children only during the
home page's entrance (`hero.js`: opacity and small transforms on the logo, statement, titles and Plan My Day). The scroll
engine is native: CSS `scroll-behavior: smooth`, no Lenis or Locomotive; ScrollTrigger runs 48 triggers on the home
page, none pinned. No ancestor of the header is opaque, transformed or filtered (body is white, `overflow-x: clip`).

Two existing defects found by the same run, both fixed on the branch (`01-header.md`):

1. **Anchors land under the header on phones and tablets.** `html { scroll-padding-top: calc(var(--header-h) + 1rem) }`
   reads the root's 64 px, but phones and tablets set their taller header height on `body`. A link to `#reviews` put the
   heading 16–24 px under the header at 768, 390 and 360.
2. **Opening the menu on a scrolled page sends the header off screen.** `body.drawer-open { overflow: hidden }` made body
   a scroll container, so the sticky header stuck to body and scrolled away (top −193 px at 390): the drawer opened with a
   strip of page above it and no visible close button.

Also observed, not changed: on the home page at 1440, loading `/#reviews` lands on the chapter only some of the time, in
production as on staging (2 of 4 and 3 of 4 tries): a race between the browser's fragment scroll and the page's late
layout. It predates this work (`06-qa.md`).

## 3. The sections, and where a backdrop may go

Captured with `qa/surgical-shots.mjs --sections` at 1440 and 390 on staging (home, tours, destinations, about, reviews,
transfers, packages, FAQ, contact, enquire). The home page's light bands:

| Section | Ground | Content | Backdrop? |
|---|---|---|---|
| Credentials strip | sand | three short points, the CTGA mark | No: a thin strip, and an accreditation |
| 01 continued, `.lc-memory` "The best bits?" | soft leaf | a guest's portrait photograph, a heading, a paragraph, a button | **Yes**: open space beside the words |
| 02 `.lc-moments` | white | four guest photographs | No: the photographs are the content |
| 03 `.lc-film` | white | the destination carousel | No |
| 04 `.lc-ways` | white | four service cards with prices | No: prices |
| 05 `.lc-people` | pale | photographs and three points | No |
| Taste | white | Winelands photographs | No: wine (the brief) |
| 06 `.lc-gallery` | white | twelve photographs | No |
| 08 `.lc-ease` "All the wonder." | paper | three steps on a drawn route, a button | **Yes**: a journey band |
| 09 `.stories` (reviews) | soft leaf | ten review summaries | **Yes**, as the chapter's surround, never under a card |

Inner pages: tour lists and tour pages carry prices and booking cards, the enquiry and contact pages forms, the legal
pages long copy, the FAQ long answers: none takes a backdrop. Three placements are the brief's first step (G2).

## 4. The search page's backdrop, as the screenshots show it

Five screenshots, 17.00.11 to 17.00.28: one landscape photograph (flamingos at dawn) fills the window behind the search
box; as the page scrolls, the news cards slide up over it while the photograph stays put; a white-grey wash grows over it
until, below the first rows of cards, the birds and the horizon are only a faint presence in the gaps. The principle
taken: one stable, distant image plane behind the content, washed progressively, the cards in front and opaque. Nothing
else (no layout, no type, no content) is taken from it.

## 5. The owner's files (Drive, the three folders the brief names)

The folders are link-shared, so they are named here without their addresses.

- **Legal**: `01 Legal details checklist (to complete).docx` (completed by the owner, signed Stuart Matanhire,
  8 Nov 2026), `02 Privacy Notice (approved 8 Nov 2026).docx`, `03 Terms and Conditions (approved 8 Nov 2026).docx`,
  `04 Booking rules (approved 8 Nov 2026)` (a Google Doc; it now says **48 hours' notice**, where the repository and the
  approval register's D9 still said 24), `05 Privacy requests and data retention procedure` (internal; not published).
- **Assets**: 29 files (16 Unsplash photographs and 2 Unsplash illustrations, 10 Pexels photographs, and the owner's
  Tripadvisor badge mock-up) plus the screenshots folder. The brief's "18 files" are the Unsplash set: the Pexels ten
  were added after it was written. Two of its descriptions are wrong: `sweder-breet-1-XiM_YWWGU` is giraffes, not a lone tree, and
  `bibhash-polygon-cafe-banerjee-wOauvcluLBY` is a lone acacia with vultures, not zebras. Almost every photograph is East
  African savanna or wildlife (one shows Kilimanjaro); the sea is Casablanca. None is Cape Town.
- **The badge** (`Tripadvisor Review Badge with 5.0 Rating (2).png`): an AI-made mock-up that redraws Tripadvisor's owl
  and wordmark, with "As of 8 November 2026". Used for its hierarchy only, never as an asset (`03-reputation.md`).

Downloaded once, outside the repository; the originals used are in the git-ignored `media-src/scenic/`, and only the
site's own renditions are committed. Nothing is served from Drive.

## 6. What already existed

- Tokens: `tokens.css` (the leaf greens, sand, navy, type scale, shadows, motion); no glass or scenic tokens.
- Reviews: the home page's chapter 09 showed ten Tripadvisor reviews as our one-line summaries with each reviewer's
  public name, place, rating and month, beside "Rated 5.0 … Number of reviews on Tripadvisor: 264 … As listed on
  8 November 2026". `/reviews/` shows the same summaries, the rating breakdown (260 Excellent, 4 Good) and the themes.
  No permission from any reviewer is recorded (R1–R3).
- Analytics: Cloudflare Web Analytics only after the visitor allows it (`consent.js`); no token is configured in any
  environment (A6), so nothing loads anywhere today.
- Legal: `/privacy/` and `/terms/` from the approved texts of 8 Nov, without the registered company, the Information
  Officer or the retention periods (B3–B5), and the terms' two open points (cancellation, payment).
- Booking: `BOOKING_RULES` shared by the form and the API (2 vehicles, 24 hours, 04:00–23:00, holds), per-day
  overrides, statuses, the check-insert-recheck guard against overbooking (`lib/enquiries/store.mjs`).

## 7. The proposal that followed

Header: the same node and controller, a glass paint for `.is-condensed` only; the two defects fixed. Scenic: one
component, three placements (sky, sunset horizon, sea), no animal. Reputation: the review summaries leave the home page
for an editorial chapter of three themes in our words, the Tripadvisor proof as the owner drew it (no date, no
Tripadvisor artwork), and Google's own figure apart. Legal and booking: the owner's answers into the texts, the pages
and the rules; what conflicts or needs a lawyer goes to the approval register and the release gate. Where the brief and
the existing site disagreed, the existing feature was kept and the trade-off written down (the review summaries stay on
`/reviews/`; the owner-confirmed claims the issuing bodies do not list stay, flagged).
