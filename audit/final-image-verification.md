# Media audit — final verification

| | |
|---|---|
| Branch | `ultraxen/adoring-feynman-csxwl3` (from approved `main` `9e9b201`, the rollback point) |
| Commit | `4d7f93f` (the site as deployed). The audit documents are committed after it and change nothing on the site. |
| Preview | https://media-preview.good-times-in-cape-town.pages.dev (deployment `b017d12f`) |
| Baseline for comparison | https://media-baseline.good-times-in-cape-town.pages.dev (`9e9b201`, deployment `9d9bc87a`) |
| Production, `staging`, `main` | Not touched: not deployed, not merged, no configuration changed. Awaiting the owner's approval. |

## Final verification table

"Resolution" is the master's size and the lowest number of source pixels per device pixel measured for that placement
on the final deployment at 390 px, a phone at 2×, where enlargement is greatest. The 375–1920 px figures from the
six-width capture are in `image-quality-report.md`. "Crop verified" means each photograph was looked at in its own crop
at 375, 390, 768, 1024, 1440 and 1920 px (`screenshots/crops/`, and `screenshots/critic-fixes/` for the fixes made
later). "Duplicate-free" is the placement analysis plus the byte and perceptual scans.

| Image / Section | Original Issue | Replacement Source | Resolution | Crop Verified | Duplicate-Free | Cloud Preview Verified | Status |
|---|---|---|---|---|---|---|---|
| Beach reveal (home, sand journey) | A static AI still after the footprints | The owner's film `section-2-video.mp4` (Drive `1hfka3frMV2pH8Hk1UGYdRvfDSuuiUSKC`) → `beach-film-1280.mp4` (7.0 s loop, 2.45 MB) over its own first frame `beach-film-poster` | 1280 × 720 (the film's own). Enlarged 1.125× at 1440 px and 1.5× at 1920 px: the source's limit, M5. | The woman whole, feet included, at 1440 × 900 and 390 × 844 (`recordings/beach-film/`). All six widths in `screenshots/compare/*/home--sand-journey.jpg`. | Yes: one placement, and the poster is the film's own frame | `qa/beach-film.mjs` (the film's code is unchanged since): reveal at desktop and phone, re-entry, next section, reduced motion, blocked, data saver, slow network, 0 errors. The sand journey's browser tests pass on the final code. | Done (M5: confirm the film is AI-generated) |
| About, "Meet our team" (§4) | The lunch photograph, also used twice elsewhere | The owner's `about-image.jpg` (Drive `1vDuC670_JcIgLo1Z9MKRoe5EYk1rJaHg`) → `owner-portrait` | 3240 × 2160 master. At 390 px (2×), final deployment: 1.12 | Whole: the frame is the photograph's 3:2 at every width. Face, glass and Table Mountain in frame. | Yes | `media-spot.json` on the final deployment (shown, uncropped, at 390 and 1440), crops | Done (P9: name the owner?) |
| 6.A Cape Town Memories (hero phone) | Six 549–828 px crops from an old site; generic views | Six Good Times photographs from Drive: Chapman's Peak, Bo-Kaap, Boulders, the Winelands, Cape Point, the Peninsula with the guide | 1080–4032 px masters. At 390 px (2×): lowest 1.45 | Phone frame and lift-out at the six widths. The lift-out shows each photograph whole. | Yes | e2e phone gallery and lift-out tests (see Tests), crops | Done. The first slide's caption clears the dots (critic M1). P7 covers the one guest photograph. |
| 6.B "Image Optimised" and poor crops | The label is on no element, caption or file. 29 photographs were enlarged below 0.9 somewhere. Heads were cut in bands, the road chapter and a destination slide. | Better sources (each replaced placement); `coverSizes()` for cover frames; refocused road chapter on phones, photo bands and Beyerskloof | At 390 px (2×), final deployment: 0 placements below 0.5 source pixels per device pixel (baseline 5), lowest 0.59 (baseline 0.31), median 1.13 (§ Resolution in `image-quality-report.md`) | Six widths, every changed photograph (`screenshots/crops/strips/`) and the bands (`screenshots/bands/`) | — | Final inventory (`screenshots/after/`) | Done; the label itself was not found (reported) |
| 6.C "A selfie above the bay" | A cramped 315 px-class crop, also the Private Experience card and gallery | `above-the-bay-selfie` (Drive `good-times-cape-town-025.jpg`) | 2048 × 1536. At 390 px (2×): 0.85 | Both faces and the bay at the six widths | Yes | Crops | Done |
| 6.D Fairview goat tower | The 3:2 crop cut the tower's arch and ramp; the tower is not recognisable | **None available.** The library's only goat-tower photograph is a detail of two goats in one arch, now shown whole in a 4:3 frame. The file named for the goats shows a guide and guests (P10). | 2048 × 1536. At 390 px (2×): 1.13 | The detail is whole at the six widths. The tower itself is not shown. | Yes (left the Winelands gallery) | Crops | **Blocked** (P10): a photograph of the whole tower is needed (critic M2) |
| 6.E Adventure, lion and cheetah | Only quad biking had photographs, repeated four times. Skydiving had none. | Quad biking `quad-bikes-convoy` (hero = card); shark diving `marine-dynamics-boat`; skydiving `skydive-tandem` (CC0, credited "not taken in Cape Town"); the service card `shark-cage-gansbaai` (CC BY-SA 4.0, credited) | At 390 px (2×): lowest 0.59 (the quad-biking hero on a phone; § Resolution) | Six widths | Yes | `media-spot.json`: `/tours/#adventure` filters to the three activities, each with its photograph | Done. No lion or cheetah: no tour offers an encounter (reported). |
| 6.F "Lunch in a Winelands garden" | Three placements under three captions | `winelands-garden-lunch`, now in one place (home), in a 5:4 frame | 2000 × 1600. At 390 px (2×): 1.13 | Guests, plates and the garden in frame at the six widths | Yes | Crops | Done |
| 6.G Castle of Good Hope | The Castle small and soft behind a group | `castle-table-mountain`: the Castle's walls and bastion, Table Mountain behind | 3240 × 2160. At 390 px (2×): 1.12 | Walls readable at the six widths | Yes | Crops | Done within the library. The couple stands in front of the walls; a photograph of the Castle alone would be better (critic m4). |
| 6.H Tasting outdoors / tasting table | Both photographs were also on the Winelands page. The square inset cut the table's guests at both edges, and the main photograph was soft. | The same two genuine tastings, recomposed. The table of five fills the main frame in its own 3:2 shape, its whole width shown. The outdoor pour fills the square inset, on the host and the guest. Both are now only on home, and their `sizes` are corrected. A third outdoor tasting in the library was the same moment (847 matching points), so it was not used. | 1080 and 1600 px masters. At 390 px (2×): 1.02 | All five guests, and the host and guest in the inset, whole at the six widths (checked on the preview) | Yes | Crops, `screenshots/critic-fixes/home-taste-*.jpg` | Done; no new photograph (none in the library) |
| 6.I Cape Agulhas | Logo-artwork placeholder | `agulhas-tip-marker` (hero, Shaomi72, CC BY-SA 3.0) and `agulhas-lighthouse` (card, Josep M. Gracia, CC BY-SA 4.0), credited on the hero and the privacy page | At 390 px (2×): lowest 0.86 | Marker and lighthouse whole | Yes | `media-spot.json`: hero photograph, credit, no placeholder. No placeholder on any page (build). | Done (P8: licensed stand-ins until Good Times has its own) |
| 6.J Skydiving (AI-generated image) | Logo-artwork placeholder | **Not generated.** No image-generation tool was available and the reference photograph ("Use the photo below") was not attached. Stand-in: `skydive-tandem` (CC0), credited on the hero as not taken in Cape Town. | At 390 px (2×): 0.61 (hero on a phone) | Whole | Yes | `media-spot.json` | **Blocked** (P11) |
| 6.K Transfers | `airport-welcome-sign`, a 1000 px source drawn at 0.71 source pixels per device pixel | `airport-departures-group` (3105 px) with `airport-guests-luggage` and `airport-departures-trolley` | At 390 px (2×): 1.13 | Six widths | Yes | Crops | Done |
| 6.L Langa gallery | Three photographs, each also used elsewhere | Six: the traditional drink, two of the homes, the women's anti-pass history, the museum room, the 1960 marches (operator and three owner-approved guest photographs) | At 390 px (2×): 1.01 (the gallery wall is measured in the six-width capture; the tab is closed in this one) | Gallery wall and lightbox at the six widths. No children. | Yes | Crops (Gallery tab opened) | Done (P7 for the guest photographs) |
| 6.M "Guests and their guide at lunch" | The caption sat on the repeated lunch photograph | The caption went with the photograph. The one photograph that shows exactly that, `burger-lunch-guide` (the guide with two guests at lunch), is captioned "Lunch with our guide". | At 390 px (2×): 0.78 | Faces and food in frame | Yes | Crops | Done |
| 6.N Food photography | Two meal photographs, each used twice | Three new: `lunch-spread-guests`, `burger-lunch-guide`, `pergola-lunch-table`. Plus two existing, now in one place each. All captions say meals are paid on the day. | At 390 px (2×): lowest 0.78 | Six widths. On phones and tablets the lunch print is 4:3, with all four guests whole. | Yes | Crops, `screenshots/critic-fixes/home-gallery-lunch-*.jpg` | **Partly done: three of the 4–6 asked.** The library holds no more approved food photographs (P12: two guests' close-ups await their photographers' permission). |
| One photograph, one place (§5) | 41 photographs in more than one placement: 117 placements of 50 photographs on the 18 audited routes | Each repeat replaced in all but one placement, from the Drive library | — | — | **0 repeats** with the brief's exceptions and E1–E5. No byte, perceptual or crop copies among the photographs in use. | `qa/media-duplicates.mjs` on the final deployment (390 px, every route): 119 photographs in 119 placements | Done. Three tour days lost their gallery or band for want of photographs (P13, critic M4). |

## Gates

| Gate | Result | Evidence |
|---|---|---|
| 0 Baseline and branch | Pass: approved commit identified, baseline deployed to its own preview, baseline checks run before any change | `image-baseline.md` |
| A Asset correctness | **Pass.** Every photograph has a rights basis and its Drive file or licence. The owner's film and photograph are the exact files (SHA-256 recorded). Spot checks 26 / 26 and 0 failed media requests on the final deployment. | `image-asset-manifest.json`, `media-spot.json`, `screenshots/after/summary.json` |
| B Subject safety (6 widths) | **Pass, after fixes.** Every changed placement was checked at the six widths. The final crop check found three more placements and fixed them (`77e426a`, `4d7f93f`). The goat tower (6.D) is shown whole but is only a detail of the tower (blocked, P10). | `screenshots/crops/strips/`, `screenshots/bands/`, `image-quality-report.md` § Crops |
| C Function and motion | **Pass.** The beach film behaves as specified (`qa/beach-film.mjs`). No browser test fails because of this change: each failure on the final deployment either fails identically on the approved baseline or passes when run one at a time. | `visual-regression-report.md`, `recordings/beach-film/` |
| D Visual comparison | **Pass.** Every layout difference comes from a photograph's frame or from a component a photograph leads (`visual-regression-report.md` § Layout geometry). The header, navigation, footer and body copy are unchanged, apart from photo captions and credits. | `screenshots/compare/`, `layout-compare.json`, `visual-regression-report.md` |
| E Performance | **Pass, with one cost to note.** Layout shift and desktop LCP are unchanged. Mobile LCP on Slow 4G is 0.28 s (home) and 0.33 s (Peninsula) slower, from the new photographs' bytes. The film never loads with the page. | § Performance below, `perf-comparison.json` |
| F Independent critique | **Done.** 0 critical, 6 major, 11 minor. Major: 4 fixed, 1 blocked (M2, P10), 1 open (M4, P13). Minor: 4 fixed (m2, m7, m9's frame, m10), 1 copy fix (m6), 2 accepted (m1, m5), 4 open for the owner (m3, m4, m8, m11). | § Independent critique below |
| G Correction loop | **Done.** Each finding below was fixed on the branch, redeployed and checked again on the preview. | § What the checks changed below |

## Tests

| Check | Where | Result |
|---|---|---|
| Build (`node scripts/cloudflare/build.mjs preview`) | Cloud container | 25 pages |
| Site QA (`npm run check`) | Built site | 25 pages, no problems |
| Brand guard (`npm run guard`) | Repository and build | Clean |
| Unit and integration tests (`npm test`) | Cloud container | 294 / 294 pass (baseline 293 / 293; one new test: a gallery never repeats its tour's hero or card) |
| Browser suite (Playwright, desktop 1440 × 900 and Pixel 7) | Final deployment | 312 passed, 12 failed, 36 skipped. Eight failures also fail on the approved baseline: five tests, none about a photograph. The other four were timings under load and pass when run one at a time (7 / 7). Details in `visual-regression-report.md`. |
| The same suite's photograph-related tests, after the expectations were brought up to the intended change | `media-preview` | All pass (the eleven listed in § Gate G) |
| Beach film (`qa/beach-film.mjs`) | `media-preview` at `daccb97` (the film's code is unchanged since) | Reveal at 1440 × 900 and 390 × 844, re-entry, next section, reduced motion, blocked film, data saver, throttled network: all as specified, 0 errors |
| Spot checks (`qa/media-spot.mjs`) | Final deployment | 26 / 26 pass (`media-spot.json`) |
| One photograph per placement (`qa/media-duplicates.mjs`) | Every route: the final deployment at 390 px, and the six-width capture | 0 repeats: 119 photographs in 119 placements on the final deployment; 0 at 390, 1024 and 1440 px in the six-width capture |
| Perceptual scans | All 113 photographs in use | No copy, recompression or crop of one photograph in another placement |
| Media requests | Every route: the final deployment at 390 px, and the six-width capture | 0 failed, 0 page errors |

## Performance (Gate E)

`qa/media-perf.mjs` on the final deployment and the baseline, interleaved route by route: desktop 1440 × 900
unthrottled, and Pixel 7 on "Slow 4G" (150 ms, 1.6 Mbit/s, 4× CPU). There was one run per side, taken while the
browser suite was running, so the absolute times are inflated. Both sides ran under the same load. The data is in
`perf-comparison.json`.

| Route | Profile | LCP ms (before → after) | LCP element after | CLS at load | CLS whole visit | Media KB at load (img+video) | Media KB whole visit (img+video) | Failed media |
|---|---|---|---|---|---|---|---|---|
| `/` | desktop | 820 → 656 | img hero-moment-poster-1280.avif | 0.001 → 0.001 | 0.001 → 0.001 | 535+204 → 634+204 | 2061+204 → 2152+2597 | 0 / 0 |
| `/` | mobile | 2576 → 2860 | img hero-moment-poster-1280.avif | 0.007 → 0.007 | 0.008 → 0.008 | 314+204 → 413+204 | 2388+204 → 3048+2597 | 0 / 0 |
| `/about/` | desktop | 840 → 620 | img cape-coastline-1600.avif | 0.001 → 0.001 | 0.001 → 0.001 | 336+0 → 337+0 | 348+0 → 349+0 | 0 / 0 |
| `/about/` | mobile | 2212 → 2332 | img cape-coastline-1200.avif | 0.000 → 0.000 | 0.000 → 0.000 | 315+0 → 326+0 | 550+0 → 525+0 | 0 / 0 |
| `/tours/` | desktop | 620 → 644 | img cape-point-headland-1600.avif | 0.001 → 0.001 | 0.001 → 0.001 | 315+0 → 398+0 | 327+0 → 410+0 | 0 / 0 |
| `/tours/` | mobile | 2616 → 2528 | img cape-point-headland-1200.avif | 0.000 → 0.000 | 0.000 → 0.000 | 383+0 → 388+0 | 836+0 → 1156+0 | 0 / 0 |
| `/tours/cape-peninsula-private-tour/` | desktop | 656 → 620 | img hout-bay-viewpoint-couple-1600.avif | 0.001 → 0.001 | 0.001 → 0.001 | 402+0 → 620+0 | 402+0 → 620+0 | 0 / 0 |
| `/tours/cape-peninsula-private-tour/` | mobile | 2196 → 2528 | img hout-bay-viewpoint-couple-1200.avif | 0.000 → 0.000 | 0.000 → 0.000 | 76+0 → 125+0 | 338+0 → 431+0 | 0 / 0 |
| `/transfers/` | desktop | 632 → 716 | img airport-departures-wave-1600.avif | 0.001 → 0.001 | 0.001 → 0.001 | 129+0 → 158+0 | 129+0 → 158+0 | 0 / 0 |
| `/transfers/` | mobile | 1328 → 1352 | img airport-departures-wave-1200.avif | 0.000 → 0.000 | 0.000 → 0.000 | 74+0 → 74+0 | 159+0 → 197+0 | 0 / 0 |

- **Layout shift is unchanged** on every route and profile, at load and over the whole visit.
- **Desktop LCP is unchanged** within noise (−220 to +84 ms).
- **Mobile LCP is 0.28 s and 0.33 s slower on two routes**, each with a cause in bytes:
  - The Peninsula page's new hero is its LCP element, and its 1200 px file is 49 KB heavier than the old hero's: about
    0.25 s at 1.6 Mbit/s.
  - The home page's LCP element (the hero poster) is unchanged, but the phone gallery's six real photographs add 99 KB
    at load, and those compete with it.
  - Lighter phone renditions, or loading the phone's five hidden slides after the page, would recover most of this.
    That would be a follow-up, because it changes how the gallery loads.
- **The film is never part of page load.** Its 2.45 MB is fetched only when the sand journey reaches it (p 0.4). It
  shows in "whole visit" on the home page, and not at all with reduced motion or the data saver.
- **Image bytes over a whole visit**, desktop and phone (larger, sharper photographs):

  | Page | Desktop | Phone |
  |---|---|---|
  | Home | +4% | +28% |
  | Tours list | +25% | +38% |
  | Peninsula | +54% | +28% |
  | About, Transfers | within 40 KB | within 40 KB |
- No media request failed.

## Independent critique (Gate F)

An independent reviewer audited the preview against the approved baseline. Its report is in `critic-report.md`,
unedited, with its evidence in `critic/`. It found **no critical defect, six major and eleven minor**. It confirmed:
- the film's behaviour: muted, looping, no controls, hidden from screen readers, frame 0 aligned with the poster, a
  smooth loop seam, paused off screen, and correct with reduced motion and `?nomotion`;
- the owner's portrait, at every width;
- that no placeholder and no lion or cheetah remain;
- that no photograph repeats outside the allowed exceptions;
- that there are no console errors, failed requests or broken images.

Each finding, what was done, and its state on the final deployment:

| # | Finding (the critic's severity) | What was done | State on the final preview |
|---|---|---|---|
| M1 | Phone gallery: the first slide's caption sat on the pager dots (major) | The phone's photograph is capped at the screen's height, framed on its recorded focus (`647a264`) | **Fixed**: the caption clears the dots at all six widths (`screenshots/critic-fixes/phone-slide1-*.jpg`) |
| M2 | Fairview goat tower: still a detail of two goats in one arch (major) | The library has no photograph of the whole tower. The file named for the goats shows a guide and two guests (P10). The detail is shown whole. | **Not delivered: blocked on a photograph (P10)** |
| M3 | Home taste: the same two photographs, the main one soft, the inset cutting guests (major) | Recomposed from the same two tastings (`46c4070`): the table of five in the main frame, the outdoor pour in the square inset, framed on host and guest. Each frame asks for a rendition big enough for its crop (`bb3dea6`). The main frame no longer hides its right edge, and it keeps the photograph's 3:2 shape on phones (`77e426a`). A third outdoor tasting tried for the inset was the same moment as the main photograph (847 matching points) and was withdrawn. | **Fixed**: all five guests and both people in the inset are whole at the six widths. No new photograph: the library has no other outdoor tasting. |
| M4 | Whale Watching and Quad Biking lost their Gallery tab. Quad Biking and Private Experience lost the photo band. The whale and quad heroes are their card photographs. (major) | The removed photographs were repeats of other placements, and the library holds no other photograph of these days. An empty tab is hidden rather than filled with a repeat. A one-photograph tour shows that photograph as card and hero (E4). The band needs a landscape photograph of 1600 px or more (a rule from the baseline), and Private Experience's two photographs do not qualify. | **Open: needs photographs (P13)** |
| M5 | Licensed photographs shown without their credit; the skydive card beside "aerial views of Cape Town" (major) | Each licensed photograph carries its credit on the photograph wherever it is shown larger than a small thumbnail: tour cards, the home adventure card, the booking form's choices and the heroes. The concierge's small row thumbnails are credited on the privacy page. The skydive's credit says "not taken in Cape Town". The privacy page now says exactly this (`647a264`). | **Fixed** (`critic-fixes/card-*.jpg`, `critic-fixes/home-adventure-card-*.jpg`, `media-spot.json`) |
| M6 | Winelands pleasures: the terrace photograph in a portrait frame showed a woman, a hand and a camera; captioned "Lunch" with no food; enlarged (major) | Framed on the waiter serving a guest (focus 97% 30%), captioned "Wine served at the table on an estate terrace, on a Winelands day", with a rendition sized for the frame | **Fixed** (`critic-fixes/winelands-pleasures-*.jpg`). The third person, seated at the landscape's far left, stays outside the portrait frame. |
| m1 | Home: the goat tower (4:3) and garden lunch (5:4) frames move the content below by 29–77 px | The frames take their photographs' shapes, so nothing is cut. This is page geometry, not a shift while loading: CLS is unchanged (§ Performance). | Accepted: photograph frames (`visual-regression-report.md` § Layout geometry) |
| m2 | Agulhas and Sky Diving: the hero layout changed; the Agulhas sign was cropped; the credit covered "Atlantic Ocean" at 768 px | Both pages now lead with a photograph, so they use the full-bleed hero the other tours use. The Agulhas hero is framed low (50% 80%), and the credit sits top right. | **Fixed**: the sign is whole and uncovered at 768–1920 px (`critic-fixes/agulhas-hero-*.jpg`) |
| m3 | The film is soft at 1920 px | The film's master is 1280 × 720, and upscaling is not allowed | **Open** (M5: a 1920 × 1080 master) |
| m4 | The Castle is a dark wall behind reeds; the couple is the subject | The library's clearest photograph of the Castle | **Open**: a photograph of the Castle itself |
| m5 | Little variety, and near-twins: the Chapman's Peak wall, one couple three times, four wine tables, Cape Point twice, two coves | Distinct photographs of places that recur, which the brief allows (§5.2) | Listed for the owner (`image-quality-report.md` § Duplicate scan) |
| m6 | Langa: the new photographs are museum panels and empty homes; the home visit is not listed on the tour | The unused Langa photographs show children, whom the site does not show. The home-visit print now says a visit depends on who is home and is never promised. | Copy fixed. More Langa photographs need the owner (P7, P13). |
| m7 | The Cape Minstrels print links to a tour that does not list them, with no "luck" note | Its story now says they were met by chance: "luck, never a promise" | **Fixed** |
| m8 | Garden Route, "A garden path": generic | The owner marked this photograph for the Garden Route in its file name, and the caption claims no place | Open for the owner (P7) |
| m9 | Food coverage partial; the destinations table frame mostly floor; "under the vines" beside a reed pergola | The destinations frame now uses the photograph's recorded focus (`4d7f93f`): a focus set on the page itself had overridden it. Vines are visible beyond the pergola. | Frame **fixed**. Food: **partly done**, three new of the 4–6 asked (P12). |
| m10 | About's Langa inset cut the four guests and the lettering; the lunch print cut the guests to two and a half | The inset is square, framed on the guests (`647a264`). The lunch print is a wide 3:2 tile on desktop and 4:3 on phones and tablets (`647a264`, `77e426a`). | **Fixed**: the four guests whole in both (`critic-fixes/about-pair-*.jpg`, `critic-fixes/home-gallery-lunch-*.jpg`) |
| m11 | The soft `airport-welcome-sign` is still on /transfers/; photo bands repeat gallery photograph 1 | The sign is the "Airport arrival" row's small thumbnail, and the library has no other arrivals photograph. The band is its gallery's cover (E5), as in the baseline. | Open for the owner: an arrivals photograph, and whether E5 counts as a repeat |

## What the checks changed (Gate G)

Each finding was fixed on the branch, redeployed and checked again on the preview:

| Found by | Finding | Fix (commit) | Re-checked |
|---|---|---|---|
| Browser tests on the preview | The beach film was fetched with the page (it lies within one screen of the hero and the controller did not wait for the scroll scene) | The film loads at p 0.4 and plays from p 0.5 in the scroll scene, at a quarter in view without it (`daccb97`) | The test passes; `qa/beach-film.mjs`: no request before p 0.4 at both sizes |
| Browser tests | Eleven expectations named the old photographs (the gallery's prints, the services, the About banner, the phone's first place, the Agulhas placeholder, the poster's size) | Tests brought up to date for the intended change, no assertion weakened (`daccb97`, `bb3dea6`) | Re-run on the preview |
| Caption review, photograph by photograph | The Winelands terrace caption said "Lunch", but no food is in the frame. A tasting was placed "in a cellar", in what is a tasting room. Another caption named a guide nobody can identify in the photograph. The Boulders caption said whose shadows they are. The owner's alt text assumed a pronoun. | Each caption now says only what the photograph shows (`daccb97`, `bb3dea6`, `b529be0`) | Rebuilt and redeployed |
| The inventory tool itself | Its density figure divided by Chromium's srcset density, so it overstated enlargement | Measures the file's own width (`bb3dea6`); baseline figures recomputed | Re-measured |
| Resolution review | Banners, heroes, bands, chapters and taste frames picked an 800 px file for a crop drawn up to 3× wider on phones | `coverSizes()` and matching preload hints (`bb3dea6`) | Chromium picks the 1200–2000 px files on phones and the same files on desktop as before (probe and final inventory) |
| Crop review, six widths | Road chapter: heading over the couple's faces on phones. Photo bands: heads cut. Beyerskloof slides: a couple cut in half. | Refocused (`5506860`, `84cc21e`, `0ece659`) | `screenshots/bands/`, final crops |
| Perceptual-scan validation | The pHash and fixed-crop scans missed two deliberate crops | SIFT and RANSAC added and validated (555 and 453 agreeing points on the crops) | 6,328 pairs: no crop or copy |
| Film QA tool | Its frame comparison hung on the film's `preload="none"` | A detached copy with `preload="auto"` and timeouts | Poster vs frame 0: 1.38 / 255 |
| Independent critic | Six major and eleven minor findings (§ Independent critique) | `647a264`, `46c4070`, `77e426a`, `4d7f93f` | `screenshots/critic-fixes/` on the final deployment |
| Final crop check on the preview | The home taste frame hid the right 8% of its photograph (a rule written for a vineyard photograph no longer there), so the fifth guest at the tasting table was cut. On phones and tablets the gallery's last two rows were squares: they cut the lunch photograph's outer guests and one of the home visit's two. | The frame shows the photograph's whole width in its 3:2 shape; the four prints and their row partners are 4:3 on phones and tablets (`77e426a`) | Six widths, on the preview |
| The same check | The destinations page set its own focus, which overrode the one recorded for the pergola photograph, so the earlier refocus never applied | The page uses the recorded focus (`4d7f93f`) | 390 and 1440 px (`critic-fixes/destinations-table-*.jpg`) |
| Caption review | The tasting couple's alt text still said "cellar", where its caption says tasting room | Alt text corrected (`77e426a`) | Rebuilt and redeployed |

## Blockers and owner decisions

Nothing here stops the preview from being reviewed. Each item needs the owner's decision or material, and is tracked
in `docs/APPROVAL_REGISTER.md`.

| Item | What is blocked or open | What unblocks it |
|---|---|---|
| 6.J skydiving image (P11) | **Blocked.** No image-generation tool was available in this environment, and the reference photograph the brief points to ("Use the photo below") was not attached. A credited CC0 photograph of a tandem skydive stands in, labelled on the hero as not taken in Cape Town. | The reference photograph and a generation tool, or Good Times' own skydiving photograph |
| 6.N food: three of the 4–6 asked (P12) | The library's only other food photographs are two guests' close-ups (`Food 02`, `Food 03`) without the owner's approval in their names | The photographers' permission (or the owner's approval in the file names) |
| The film's resolution and origin (M5, P5) | The film is 1280 × 720, so screens wider than 1280 px enlarge it (1.5× at 1920). Its encoder tag says it is AI-generated: it is credited so. | A 1920 × 1080 master, if one exists; confirmation that it is AI-generated |
| Guests' photographs used by name (P7) | Five photographs the owner marked for use in the Drive file names (three Langa museum, the phone's guide selfie, a Garden Route path) | Confirmation of each photographer's permission |
| Openly licensed photographs (P8) | Cape Agulhas (2), the skydive (1), the shark-cage service card (1), credited under their licences | Keep until Good Times has its own, or supply them |
| The owner's name (P9) | The About photograph's caption and alt text say "the owner" | Whether to name the owner there |
| The Fairview goat tower (P10) | The library has only a detail of the tower (now shown whole in its own 4:3 frame). The file named for the goats shows a guide and guests. | A photograph of the whole tower |
| "Image Optimised" (6.B) | No element, caption or file carries this label, so it could not be located | Say which gallery or section was meant, if any remains |
| Lion or cheetah (6.E) | None added: no tour or package offers an encounter. The library's cheetah and leopard photographs (file names for other uses) are not used. | A tour that includes one |
| Browser tests that fail on the approved baseline too | Six tests fail identically against the approved baseline: the counters, the carousel's off-screen state and the water reveal's progress at the top (both projects), and on mobile the phone gallery's toggle, its lift-out timing and the taste compositions' settling. They concern no photograph. | A separate fix; they are not part of this change |
| Tour galleries without photographs (P13) | Whale Watching and Quad Biking have no Gallery tab, and Quad Biking and Private Experience no photo band: their photographs were repeats, and the library holds no others of these days | Photographs of these days |
