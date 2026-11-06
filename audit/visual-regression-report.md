# Media audit — visual and functional regression report (Gates C and D)

BEFORE: the approved site, `main` at `9e9b201`, on https://media-baseline.good-times-in-cape-town.pages.dev.
AFTER: the feature branch on https://media-preview.good-times-in-cape-town.pages.dev (commit and deployment in
`final-image-verification.md`). Everything was run in a cloud browser (Chromium via Playwright) against these two
deployments.

## What was compared, and how

| Comparison | Tool | Scope |
|---|---|---|
| Section screenshots, before and after | `qa/media-audit.mjs --shots` | Every section holding a photograph, 18 routes (+5 text routes), at 375, 390, 768, 1024, 1440, 1920 px, in the finished static composition (`?nomotion`, reduced motion). Their inventories are in `screenshots/before/` and `screenshots/after/`. The raw section shots (86 MB) are kept out of the repository and can be taken again with the same command; every changed section is in `screenshots/compare/`. |
| Changed sections side by side | `screenshots/compare/` | Every section whose photographs changed, BEFORE beside AFTER, at 390 and 1440 px |
| Each photograph's own crop | `qa/media-crops.mjs` | Every changed photograph at the six widths, with the fixed header hidden so nothing covers it, and each tour's Gallery tab opened (`screenshots/crops/`). This is the subject-safety review (Gate B) in `image-quality-report.md`. |
| Layout geometry | `qa/layout-compare.mjs` | 23 routes: the header and navigation boxes, every section's top and height, every heading's text, type and box, the footer and the page height. Differences over 2 px are reported. Run at 390 and 1440 px on the final deployment. |
| Function and motion | The project's Playwright suite (`test/e2e/`, desktop 1440 × 900 and Pixel 7) | Navigation, anchors, cards, galleries, lightboxes, the phone gallery's swipe and Flip, keyboard, booking and enquiry flows, motion sequences, accessibility (axe), console and network errors |
| The beach reveal | `qa/beach-film.mjs` | Footsteps → sand → film → next section at 1440 × 900 and 390 × 844, plus reduced motion, a blocked film, the data saver and a throttled network (`recordings/beach-film/`) |
| Spot checks | `qa/media-spot.mjs` | `/tours/#adventure`, the Agulhas and Sky Diving heroes and credits, About's owner photograph (`media-spot.json`) |

## Layout geometry

The final deployment (`b017d12f`) against the baseline, at 390 and 1440 px (`layout-compare.json`):

- **Identical layout** on 14 of 23 routes at 390 px and 15 at 1440 px. That covers the header, navigation, every
  section's position and height, every heading and the footer. The routes are /tours/, /destinations/, /transfers/,
  /packages/, the Garden Route package, /contact/, /faq/, /enquire/, /terms/, and the Peninsula, City, Township, Whale
  Watching and Shark Cage Diving pages, plus /about/ at 1440 px.
- **Each difference** comes from a photograph's frame or from a component that a photograph leads:

| Route | What differs | Why |
|---|---|---|
| `/` | The moments, people, taste and gallery sections' heights at 390 px, the people section at 1440 px, and the sections below them, which move down | The goat tower's 4:3 and the garden lunch's 5:4 frames (critic m1); at 390 px also the taste frame's 3:2 and the gallery's 4:3 tiles |
| `/about/` (390 px) | The team section's height | The owner's photograph in its own 3:2 frame |
| `/privacy/` | The page height | The photo credits now list the licensed photographs and say where each is credited (M5) |
| Cape Winelands | The pleasures section's height | The terrace photograph's new caption is a line longer |
| Private Experience, Quad Biking | Section order and page height | No photo band: neither has a landscape photograph of 1600 px or more (M4) |
| Cape Agulhas, Sky Diving | The hero's type and height, and the sections below | A photograph replaced the placeholder artwork, so these pages use the full-bleed hero of the other tours (critic m2) |
| `/reviews/` | Three headings' boxes | Not a layout change. The page height and every section are identical; the tool paired a tour-name heading that repeats across the reviews carousel's cards with another card. |

The header, navigation and footer are identical on every route. Text changed only in photo captions and credits, and in
the privacy page's photo credits.

## Functional and motion regression

The project's own browser suite has 360 tests in two projects, desktop 1440 × 900 and Pixel 7. It was run against the
preview at commit `b529be0`: **311 passed, 13 failed, 36 skipped** (the skips are tests for WebKit or a local server).
The machine was heavily loaded at the time: an independent visual audit was running a second browser, at a load
average of 12 on 4 CPUs. The run on the final deployment is under "The final deployment" below.

**Tests that also fail on the approved baseline (8 failures, 5 tests).** Run against the baseline preview with the
same tests, they fail at the same assertions with the same messages:

| Test | Projects | Failure, identical before and after |
|---|---|---|
| guest stories › the two figures count up once (`site.spec.mjs` "the two figures") | desktop, mobile | `page.goto: net::ERR_ABORTED` on the reduced-motion reload |
| guest stories › the carousel … rests … off screen | desktop, mobile | `__stories.state.offscreen` stays false after scrolling to the top |
| home story › water trickles … and reverses | desktop, mobile | `sun.progress()` at the top of the page is 0.18–0.26, not 0 |
| home hero › the phone gallery swipes on its own … its key pauses and plays | mobile | times out in the toggle step |
| home hero › a click on the phone lifts its photograph out (GSAP Flip) | mobile | the lift is measured mid-flight (181 px wide before, 187 after). In isolation it lands at 317 px within 0.75 s. |

None of them concerns a photograph. They are left as they are and reported (`final-image-verification.md` § Blockers).

**Timing failures under that load (5).** These tests passed in the earlier full run on the preview, and each failed
only on an animation not settling within its timeout:

| Test | Project | Failure |
|---|---|---|
| the sand journey › a held stage, one frame per progress value | desktop | after a jump to the end, `p` reached 0.84 within 10 s, not 0.99 |
| the sand journey › the words appear one after another | desktop | the same |
| the living gallery opens a print … | mobile | `gallery.busy()` still true after 5 s |
| phones: a native swipe moves the strip a card at a time | mobile | the snap not reached in 5 s |
| taste compositions › with motion each composition plays once … | mobile | not settled in 6 s |

**The same tests, in isolation, on the final code.** The photograph-related tests and those that had failed were run
again one at a time (`--workers=1`). That is 42 tests: the sand journey, the home hero, the living gallery, the native
swipe and the taste compositions. They ran on deployment `49bc02ab` (commit `77e426a`). The final deployment differs
from it only in the destinations frame's focus. **37 passed, 2 skipped, 3 failed.**
- The desktop sand-journey tests, the living gallery and the native swipe passed. Their earlier failures were load timing.
- The phone gallery's toggle and lift-out failed on mobile, as they do on the baseline (above).
- The taste compositions' settling failed on mobile. Run the same way against the approved baseline, it fails at the
  same assertion (`expect.poll(settled)`, 6 s). It passed in the first full run on the preview, so it depends on the
  machine's timing, not on the photographs.

**The final deployment.** The full suite was run against the final deployment (`b017d12f`) while the performance runs were loading the machine:
**312 passed, 12 failed, 36 skipped.**
- Eight failures come from the five tests above that fail on the approved baseline too: the counters, the carousel and
  the water reveal in both projects, and the phone gallery's toggle and lift-out on mobile.
- The other four were motion timings under that load: the sand journey's held stage and its words (desktop), the brand
  aircraft's resize mid-flight (desktop), and the living gallery's dialog (mobile). Run again one at a time on the same
  deployment, all four pass (7 passed, 1 skipped).
- The taste compositions' settling test passed in this run.

No test fails because of this change.

**Expectations brought up to date for the intended change (none weakened):** the Peninsula gallery's six prints (the
hero and the card no longer repeated in it); the phone gallery's first place; the services' four photographs; the home
gallery's twelve prints and their captions; the About banner (`cape-coastline`); Cape Agulhas and Sky Diving leading
with a credited photograph instead of the placeholder artwork; and the sand journey's poster exempted from "no
photograph drawn wider than its largest rendition", because it is the film's own 1280 px frame (`image-quality-report.md`).

### The beach reveal: footsteps → sand → film → next section

From `recordings/beach-film/beach-film-report.json`, on the deployed preview, motion allowed, cold browser:

| Scroll progress p | 1440 × 900 | 390 × 844 |
|---|---|---|
| 0.15, 0.35 (footsteps) | film not requested | film not requested |
| 0.42, 0.50 (the sand still whole) | film loading, paused, invisible | same |
| 0.60 (the sweep about to start at 0.605) | playing under the sand | same |
| 0.66–1.00 (sweep, words, end) | playing, visible (opacity 1) | same |
| Clock held at the end | 3.36 → 4.96 → 6.54 → 0 → 1.63 … (advances, wraps at the 7 s loop) | 4.02 → 5.50 → 6.74 → 0 → 1.21 … |
| Poster vs the film's frame 0 | mean difference 1.38 / 255 | same |
| Back into the sand | p 0.555: still playing (above 0.5, by design) | p 0.39: paused |
| Down again | playing | playing |
| Past the section | paused, off screen | paused, off screen |
| Errors | 0 | 0 |

| Scenario | Result |
|---|---|
| Reduced motion | No film request. The film element is `display: none`; the poster shows. |
| Film request blocked | One request (refused). The element is removed and the poster stays. No error, no empty box. |
| Data saver on | No film request |
| Slow network (400 kbit/s, 400 ms, 4× slower CPU) | Poster first. The film fades in only once a frame is presented, after about 10 s. Never an empty box. |

The scroll scene itself is unchanged: the same ScrollTrigger, the same renderer and the same print positions. The
film's first frame registers on the old still at zero offset, so the trail lands on the same prints. Screenshots at
every stop and the screen recordings are in `recordings/beach-film/reveal-*/`, ending with `next-section.jpg` (the
section after the reveal).

## Changed sections, before and after

Every section whose photographs changed, with its BEFORE and AFTER side by side at each width. These sheets come from
the six-width capture of the preview (09:50–10:30 UTC). The fixes made after it (the independent critique and the final
crop check) are shown on the final deployment in `screenshots/critic-fixes/`. "Before" and "After"
list only the photographs that left or arrived. The phone gallery's "Before" shows only the first of its six
pictures: the baseline capture was taken before the tool learnt to name a slide that is still loading.

| Route | Section | Before | After | Sheets (`screenshots/compare/<width>/`) |
|---|---|---|---|---|
| `/` | phone-gallery | `memories-table-mountain` | `chapmans-peak-couple`, `bokaap-street-pair`, `boulders-penguin-selfie`, `vineyard-couple`, `cape-point-lighthouse-trio`, `guide-selfie-peninsula` | `home--phone-gallery.jpg` at 375, 390, 768, 1024, 1440, 1920 |
| `/` | sand-journey | `ocean-footprints-reveal` | `beach-film-poster` | `home--sand-journey.jpg` at 375, 390, 768, 1024, 1440, 1920 |
| `/` | moments-title | `guide-selfie-bay` | `above-the-bay-selfie` | `home--moments-title.jpg` at 375, 390, 768, 1024, 1440, 1920 |
| `/` | film-title | `boulders-penguins-boardwalk`, `bokaap-street`, `langa-mural-guests`, `winelands-tasting-flight`, `rooiberg-red-chair` | `cape-of-good-hope-cove`, `table-mountain-garden-couple`, `langa-walk-guide`, `beyerskloof-estate`, `map-of-africa-viewpoint` | `home--film-title.jpg` at 375, 390, 768, 1024, 1440, 1920 |
| `/` | ways-title | `cape-of-good-hope-sign`, `airport-departures-wave`, `quad-bikes-dunes`, `rooiberg-red-chair` | `chapmans-peak-wall-trio`, `transfer-driver-selfie`, `shark-cage-gansbaai`, `cape-point-boardwalk-walk` | `home--ways-title.jpg` at 375, 390, 768, 1024, 1440, 1920 |
| `/` | people-title | `castle-cannons-group` | `castle-table-mountain` | `home--people-title.jpg` at 375, 390, 768, 1024, 1440, 1920 |
| `/` | gallery | `boulders-penguin-colony`, `castle-moat`, `district-six-museum`, `marine-dynamics-boat`, `winelands-terrace`, `company-garden-squirrel`, `langa-mural`, `bokaap-selfie`, `langa-traditional-drink`, `map-of-africa-viewpoint` | `boulders-shadows`, `cape-minstrels`, `city-heritage-plaque`, `cape-point-aloes`, `burger-lunch-guide`, `cape-point-zebra`, `winelands-couple-tasting`, `lunch-spread-guests`, `langa-home-visit`, `winelands-red-tasting` | `home--gallery.jpg` at 375, 390, 768, 1024, 1440, 1920 |
| `/about/` | banner | `peninsula-bench-view` | `cape-coastline` | `about--banner.jpg` at 375, 390, 768, 1024, 1440, 1920 |
| `/about/` | story-title | `boulders-penguins-boardwalk`, `langa-mural` | `boulders-beach-penguins`, `langa-mural-visit` | `about--story-title.jpg` at 375, 390, 768, 1024, 1440, 1920 |
| `/about/` | people-title | `winelands-garden-lunch` | `owner-portrait` | `about--people-title.jpg` at 375, 390, 768, 1024, 1440, 1920 |
| `/about/` | faces-title | `castle-cannons-group`, `cape-of-good-hope-sign`, `langa-mural-guests`, `winelands-cape-dutch-group` | `castle-cannon-pair`, `good-hope-walk-couple`, `winelands-tasting-deli`, `hout-bay-viewpoint-pair` | `about--faces-title.jpg` at 375, 390, 768, 1024, 1440, 1920 |
| `/tours/` | banner | `cape-point-cliffs` | `cape-point-headland` | `tours--banner.jpg` at 375, 390, 768, 1024, 1440, 1920 |
| `/tours/` | catalogue-title | `guide-selfie-bay`, `hermanus-whale-sculpture`, `boulders-penguin-colony` | `coast-sunset-couple`, `hermanus-frame`, `agulhas-lighthouse`, `skydive-tandem`, `boulders-two-penguins`, `bokaap-pink-wall`, `winelands-glasses-up` | `tours--catalogue-title.jpg` at 375, 390, 768, 1024, 1440, 1920 |
| `/destinations/` | section | `boulders-penguins-boardwalk`, `bokaap-street`, `langa-mural`, `winelands-tasting-flight`, `rooiberg-red-chair` | `cape-of-good-hope-cove`, `table-mountain-garden-couple`, `langa-walk-guide`, `beyerskloof-estate`, `map-of-africa-viewpoint` | `destinations--section.jpg` at 375, 390, 768, 1024, 1440, 1920 |
| `/destinations/` | flavours-title | `winelands-pergola-lunch` | `pergola-lunch-table` | `destinations--flavours-title.jpg` at 375, 390, 768, 1024, 1440, 1920 |
| `/transfers/` | section | `airport-welcome-sign`, `airport-luggage-boot` | `airport-departures-group`, `airport-departures-trolley` | `transfers--section.jpg` at 375, 390, 768, 1024, 1440, 1920 |
| `/packages/` | banner | `camps-bay-twelve-apostles` | `hout-bay-from-chapmans` | `packages--banner.jpg` at 375, 390, 768, 1024, 1440, 1920 |
| `/reviews/` | reviews-title | `table-mountain-sparkling` | `diaz-beach-cove` | `reviews--reviews-title.jpg` at 375, 390, 768, 1024, 1440, 1920 |
| `/tours/cape-peninsula-private-tour/` | tour-hero | `chapmans-viewpoint-couple` | `hout-bay-viewpoint-couple` | `tours__cape-peninsula-private-tour--tour-hero.jpg` at 375, 390, 768, 1024, 1440, 1920 |
| `/tours/cape-peninsula-private-tour/` | photo-band | `muizenberg-huts-guests` | `boulders-welcome-sign` | `tours__cape-peninsula-private-tour--photo-band.jpg` at 375, 390, 768, 1024, 1440, 1920 |
| `/tours/cape-town-city-private-tour/` | tour-hero | `castle-table-mountain` | `castle-cannon-couple` | `tours__cape-town-city-private-tour--tour-hero.jpg` at 375, 390, 768, 1024, 1440, 1920 |
| `/tours/cape-town-city-private-tour/` | photo-band | `district-six-museum` | `heritage-building-guests` | `tours__cape-town-city-private-tour--photo-band.jpg` at 375, 390, 768, 1024, 1440, 1920 |
| `/tours/cape-town-city-private-tour/` | similar-title | `guide-selfie-bay` | `coast-sunset-couple` | `tours__cape-town-city-private-tour--similar-title.jpg` at 375, 390, 768, 1024, 1440, 1920 |
| `/tours/cape-winelands-private-tour/` | tour-hero | `winelands-host-pouring` | `winelands-cape-dutch-group` | `tours__cape-winelands-private-tour--tour-hero.jpg` at 375, 390, 768, 1024, 1440, 1920 |
| `/tours/cape-winelands-private-tour/` | pleasures-title | `winelands-garden-lunch` | `winelands-estate-terrace` | `tours__cape-winelands-private-tour--pleasures-title.jpg` at 375, 390, 768, 1024, 1440, 1920 |
| `/tours/cape-winelands-private-tour/` | photo-band | `fairview-goat-tower` | `winelands-terrace` | `tours__cape-winelands-private-tour--photo-band.jpg` at 375, 390, 768, 1024, 1440, 1920 |
| `/tours/township-private-tour/` | similar-title | `guide-selfie-bay` | `coast-sunset-couple` | `tours__township-private-tour--similar-title.jpg` at 375, 390, 768, 1024, 1440, 1920 |
| `/tours/whale-watching-private-tour/` | similar-title | — | `agulhas-lighthouse` | `tours__whale-watching-private-tour--similar-title.jpg` at 375, 390, 768, 1024, 1440, 1920 |
| `/tours/cape-agulhas-private-tour/` | tour-hero | — | `agulhas-tip-marker` | `tours__cape-agulhas-private-tour--tour-hero.jpg` at 375, 390, 768, 1024, 1440, 1920 |
| `/tours/cape-agulhas-private-tour/` | similar-title | `hermanus-whale-sculpture` | `hermanus-frame` | `tours__cape-agulhas-private-tour--similar-title.jpg` at 375, 390, 768, 1024, 1440, 1920 |
| `/tours/shark-cage-diving/` | similar-title | `hermanus-whale-sculpture` | `hermanus-frame`, `agulhas-lighthouse` | `tours__shark-cage-diving--similar-title.jpg` at 375, 390, 768, 1024, 1440, 1920 |
| `/tours/quad-biking/` | tour-hero | `quad-bikes-dunes` | `quad-bikes-convoy` | `tours__quad-biking--tour-hero.jpg` at 375, 390, 768, 1024, 1440, 1920 |
| `/tours/quad-biking/` | similar-title | — | `skydive-tandem` | `tours__quad-biking--similar-title.jpg` at 375, 390, 768, 1024, 1440, 1920 |
| `/tours/sky-diving/` | tour-hero | — | `skydive-tandem` | `tours__sky-diving--tour-hero.jpg` at 375, 390, 768, 1024, 1440, 1920 |

Crop-only changes (same photograph, new framing) do not appear in this table, because their photographs did not change:
the road chapter on phones, the four tour photo bands and the Beyerskloof destination frames. They are in
`screenshots/bands/`, `screenshots/crops/strips/` and `image-change-register.md`.

## Not changed, and checked

The header, navigation and logo; the hero's composition, film and phone frame; the typography (every heading's font,
size and line height compared, above); the section order on every page; the booking and enquiry flows; the footer; the
SEO metadata (titles, descriptions and canonical URLs come from the same page data, and only the preload hints of
changed banners changed). The motion code was not touched except for the film's own controller in
`sand-journey.js`, which owns no property that another animation owns.
