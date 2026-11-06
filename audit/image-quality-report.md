# Media audit — image quality report

Resolution, compression, crop and subject checks, food coverage and the duplicate scan for the photographs and the
film on the feature preview (https://media-preview.good-times-in-cape-town.pages.dev). Every measurement below
was taken from the deployed preview in a cloud browser, or from the committed files. The per-slot details (hashes,
renditions, placements) are in `image-asset-manifest.json`.

## How the photographs are prepared

The site's own pipeline (`npm run images`, `src/tools/build-images.mjs`) was used, with no new service or framework.
The only addition is an ImageMagick fallback for Linux, so it runs in the cloud container, not only on macOS.

| | |
|---|---|
| Masters | Kept separately and never served: `media-src/` (git-ignored), with their Drive file IDs in `docs/RIGHTS_REGISTER.md` |
| Renditions | AVIF (`avifenc -q 50 -s 6`) and WebP (`cwebp -q 78 -m 6`) at 480, 800, 1200, 1600 and, for full-bleed slots, 2000 px. Never wider than the master: a 1080 px master stops at 1080. |
| Markup | `<picture>` with AVIF, then WebP, then a WebP `<img>` fallback. Intrinsic `width` and `height` on every `<img>`, so there is no layout shift. `loading="lazy"` below the fold, `eager` + `fetchpriority="high"` + a matching preload for banners and heroes. |
| Metadata | Stripped (EXIF, XMP), orientation applied first |

### The film (beach reveal)

| | Source `section-2-video.mp4` | Served `beach-film-1280.mp4` |
|---|---|---|
| Codec | H.264 + AAC | H.264 High, yuv420p, no audio track |
| Size | 1280 × 720, 24 fps, 192 frames (8.0 s) | 1280 × 720, 24 fps, 168 frames (7.0 s) |
| Bytes | 7,942,174 (6.78 Mbit/s) | 2,449,603 (2.80 Mbit/s): −69% |
| Loop | Hard cut, last frame to first: 5.2× the median frame-to-frame change | Crossfade of the last 24 frames into the first (`xfade`), keyframe interval = the loop: 1.28× the median change, no visible seam |
| Fast start | — | `moov` before `mdat` (verified) |
| Colour | Untagged | Tagged BT.709 primaries, sRGB transfer, SMPTE 170M matrix, so browsers do not shift its colours against the poster |
| Poster | — | Frame 0 as `beach-film-poster` AVIF/WebP at 640, 960 and 1280 px (26.7 / 51.6 / 80.7 KB AVIF). In the browser its mean colour differs from the film's first frame by 1.38 / 255. |

The film's own resolution is 1280 × 720. Drawn full bleed, it is enlarged 1.125× at 1440 px wide and 1.5× at 1920 px,
and so is its poster, which must match the film frame for frame. A 1920 × 1080 master from the owner would remove
this (approval item M5). It cannot be fixed without upscaling, which the brief forbids.

### The owner's photograph (About)

`about-image.jpg` (Drive `1vDuC670_JcIgLo1Z9MKRoe5EYk1rJaHg`, 946,953 bytes, 3240 × 2160).
Renditions: 480 / 800 / 1200 / 1600 px, AVIF 17.5 / 41.0 / 80.3 / 129.9 KB. It is shown whole in a 3:2 frame, the
photograph's own shape, at every width, so nothing is cropped. `object-position: 72% 45%` only matters if the frame's
shape ever changes. The tone was not retouched or smoothed.

## Resolution: source pixels per device pixel

Measured on the deployed pages: the width of the file the browser chose, divided by the width the photograph is drawn
at (after any cover crop) times the device-pixel ratio (2 below 1024 px, 1 above). 1.0 means one source pixel per screen
pixel; below about 0.75 a photograph looks soft; below 0.5 it looks enlarged.

The measuring tool had a flaw that was found and fixed during the audit. Chromium reports `naturalWidth` divided by
the srcset density, so the first inventory overstated the problem. The figures below use the file's own width
(`qa/media-audit.mjs`, `fileW`). The baseline figures were recomputed the same way from its inventory.

Placements of photographs at least 120 px wide, every route. "Below 0.75" looks soft; "below 0.5" looks enlarged.

| Width | Baseline (approved `9e9b201`) | Feature, six-width capture (09:50–10:30 UTC) | Final deployment (`b017d12f`) |
|---|---|---|---|
| 390 px (2×) | 115 placements: 17 below 0.75, **5 below 0.5**, lowest 0.31, median 1.13 | 128: 19 below 0.75, 5 below 0.5, lowest 0.31, median 1.13 | 128: 14 below 0.75, **0 below 0.5**, lowest 0.59, median 1.13 |
| 1440 px (1×) | 122: 4 below 0.75, 0 below 0.5, lowest 0.66, median 1.24 | 135: 7 below 0.75, 0 below 0.5, lowest 0.70, median 1.15 | Not measured again |

The six-width capture was taken before the cover-aware `sizes` reached every placement. On the final deployment, the
lowest at 390 px are:
- the eager banners and tour heroes (0.59–0.72), which keep `sizes="100vw"` so the first paint is not delayed
  (§ Performance in `final-image-verification.md`);
- the home carousel's slides (0.73).

Nothing is enlarged below 0.5. The phone figures for each Section 6 item are in the final verification table.

### What was changed for resolution

1. **Better sources.** Each replaced placement now uses a master of 1080–4608 px. The old memories were 549–828 px, the
   Transfers hero was 1000 px and the "selfie above the bay" was a thumbnail-class crop.
2. **Cover-aware `sizes`** (`coverSizes()` in `src/partials/ui.mjs`). Banners, tour heroes, photo bands, the home
   chapters and the taste and About frames crop their photograph to a frame of another shape. On a phone the
   photograph is drawn up to three times wider than the screen, but `sizes="100vw"` made the browser pick a file for
   the screen's width. Each now asks for 85% of the width it is really drawn at. The preload hints carry the same
   value, so a banner never loads twice. Only the chosen file changes, and the layout is identical (`visual-regression-report.md`).
3. The one placement still enlarged by design is the film and its poster (above).

## Crops: subject safety (Gate B)

Every changed placement was looked at in the AFTER screenshots at 375, 390, 768, 1024, 1440 and 1920 px: a six-width
capture of the preview taken between 09:50 and 10:30 UTC. Each changed section is in `screenshots/compare/`, and each
changed photograph's own crop across the six widths is in `screenshots/crops/strips/` (taken at 10:23 UTC). The crop
fraction of each placement was read from the inventory (`crop.shownW`, `crop.shownH`). Placements changed after that
capture were checked again on the final deployment, at the widths given in the table
(`screenshots/critic-fixes/`, `media-spot.json`).

| Placement | What was checked | Result |
|---|---|---|
| Phone gallery, six photographs (home hero) | The phone's portrait screen (cover) and the lift-out (the whole photograph), six widths | Faces whole in the phone; the lift-out shows each photograph whole |
| Home moments: `muizenberg-huts-guests`, `above-the-bay-selfie`, `cape-of-good-hope-sign`, `fairview-goat-tower` | Six widths | The four guests at the huts; both faces and the bay; the group behind the sign; the tower's arch, goats and ramp (now 4:3) |
| Destination carousel and destinations cards, six photographs | Portrait slides (375–1920 px) and landscape cards | **Found:** the slides' centre crop cut Beyerskloof's couple in half. **Fixed:** focus 94% 55%, now whole in slides and card. The other five were whole. |
| Services, four photographs | Home cards, concierge rows, booking-form choices | Whole. The shark in `shark-cage-gansbaai` is faint at 104 px; the cage and divers read. |
| Home people: `castle-table-mountain`, `winelands-garden-lunch` | Six widths | The Castle's walls and Table Mountain; the guests, plates and garden (now 5:4) |
| Home taste (6.H) | Six widths, final deployment | **Found:** the main frame hid the right 8% of its photograph (a rule written for an earlier vineyard photograph) and was 4:3 on phones, so the table's outer guests were cut. **Fixed** (`77e426a`): the photograph's whole width in its own 3:2 shape. The inset is framed on the host and the guest. |
| Home gallery, twelve prints | Mosaic tiles at six widths; the lightbox (whole, contained) | **Found:** on phones and tablets the last two rows were squares. They cut the lunch photograph's two outer guests and one of the home visit's two. **Fixed** (`77e426a`): those four prints are 4:3 there, so every guest is whole. The other tiles were whole. |
| Home chapters on phones | 375 and 390 px | **Found:** the road chapter put its heading over the couple's faces. **Fixed:** phones are framed on the coast (`--focus-tall` 30% 50%). The other chapters are landscapes and read under their words. |
| About: banner, story pair, owner, four faces | Six widths | The owner whole (frame = the photograph's 3:2); heads whole on all four faces. The Langa inset is square and framed on its four guests (`647a264`). |
| Tour heroes, nine | Six widths (full bleed, 1440 × 541 at 1440 px) | Heads whole in every hero; the credits are legible on Cape Agulhas and Sky Diving |
| Photo bands, four tours | 390, 1440, 1920 px (`screenshots/bands/`) | **Found:** the middle crop cut heads: the Winelands server's and the Langa resident's (in the baseline also the Peninsula guests'). **Fixed:** each band uses its photograph's measured focus; every head whole. |
| Tour galleries (wall tiles; Gallery tab opened) | Six widths | Heads whole, except the edge of one three-person selfie (`bokaap-selfie`) in a square tile. The lightbox shows it whole. |
| Winelands diptych (M6) | 390 and 1440 px, final deployment | The terrace photograph is framed on the waiter serving a guest. The third person, at the landscape's far left, stays outside the portrait frame. |
| Destinations quiet moment | 390 and 1440 px, final deployment | **Found:** the page set its own focus, which overrode the photograph's recorded one, so the floor filled the lower 40%. **Fixed** (`4d7f93f`). |
| Transfers, packages, reviews, booking-form choices | Six widths | Whole |

## Compression

AVIF q50 and WebP q78 show no visible blocking, banding or halos at 100% on the checked placements: skin, food, ocean
and foliage were each checked on one photograph at 1:1. AVIF is chosen by every current browser. Rendition bytes per
slot are in the manifest.

Repository cost: 497 rendition files added (50.3 MB across all sizes and both formats) and 54 removed (2.2 MB). A
visitor downloads only the one file each placement needs. Page-level transfer is measured in
`final-image-verification.md` § Performance.

## Food coverage (6.N)

| Photograph | Shows | Where | New? |
|---|---|---|---|
| `lunch-spread-guests` | Four guests at a sunny terrace table with plated pasta and fish, wine | Home gallery, "Lunch in the sun" | New |
| `burger-lunch-guide` | The guide (lanyard) with two guests at an outdoor table, burgers served | Home gallery, "Lunch with our guide" | New |
| `pergola-lunch-table` | A couple at a table under a reed pergola, vines and mountains beyond (a dining scene; the food is not in close-up) | Destinations, quiet moment | New |
| `winelands-garden-lunch` | Guests at a garden table with plated lunch | Home people, "Lunch in a Winelands garden" | Existing, now in one place |
| `winelands-pergola-lunch` | Guests at a long table under a vine pergola, a host presenting wine | Winelands, pleasures (left) | Existing, now in one place |

Wine and tasting (not food): `winelands-host-pouring`, `winelands-tasting-table` (home taste); `winelands-couple-tasting`,
`winelands-red-tasting` (home gallery); `winelands-terrace`, `winelands-tasting-counter`, `winelands-group-tasting`,
`winelands-terrace-guide` (Winelands gallery); `winelands-estate-terrace` (wine served, Winelands pleasures, right);
`winelands-glasses-up` (tours collage); `winelands-tasting-deli` (About faces).

**Shortage, reported:** the brief asked for about 4–6 new food or dining photographs. **Three** genuine new ones exist
and are used. The Drive library has three food files in all: `Food 01` (an operator photograph, used as
`lunch-spread-guests`), `Food 02 - Plated lunch dish [traveller]` and `Food 03 - Tasting board and wine pour
[traveller]`. The last two are guests' photographs without the owner's approval in their names, so by the rights rule
they are not used (approval item P12). Approving them would bring the count to five. No meal photograph is captioned as
something it does not show. Every food caption says lunch and tastings are paid on the day, never part of a tour's
price, and the meal prints link to all tours rather than one.

## Duplicate scan

| Check | Method | Result |
|---|---|---|
| Same photograph in two placements | `qa/media-duplicates.mjs` with the brief's exceptions and E1–E5: on the final deployment (every route, 390 px; `dups-after.json`), and on the six-width capture at 390, 1024 and 1440 px | **0 repeats**: 119 photographs in 119 placements (baseline: 41 photographs repeated, `dups-before.json`) |
| Same file | SHA-256 of every master present (66) and every rendition (878) | No two slots share a master or a rendition |
| Same picture, recompressed or re-toned | dHash and DCT pHash of the largest rendition of all 113 photographs in use, all 6,328 pairs; 16 × 16 thumbnail correlation | No pair within 14 bits (pHash) or 12 bits (dHash), and no correlation above 0.85 |
| Same picture, cropped or reframed | SIFT keypoints plus a RANSAC homography for all 6,328 pairs. A crop of one photograph fits with hundreds of agreeing points; tested on two deliberate crops (555 and 453 inliers) | No crop or copy. The closest pairs were looked at by eye (below). |

The pHash-only and fixed-crop scans were tested on deliberate crops first. They missed both, so they are not relied on
for reframes. Only the SIFT scan is.

Pairs above 40 agreeing points, reviewed by eye:

| Pair | Agreeing points | What they are |
|---|---|---|
| `langa-mural-guests` (Township hero) · `langa-mural-visit` (About story pair) | 181 | Two different visits in front of the same painted "Langa" mural: three guests in one, five people in the other. Distinct photographs of one flat landmark. |
| `airport-departures-trolley` · `airport-guests-luggage` (both in the airport service's own gallery) | 100 | Two different groups under the same "All Departures" sign |
| `cape-coastline` (About banner) · `chapmans-viewpoint-couple` (home road chapter) | 62 | The same headland from nearly the same viewpoint: a people-free seascape, and a couple on a bench. Distinct photographs. |
| `airport-departures-group` · `castle-moat`, `langa-walk-guide` · `winelands-red-tasting`, `cango-caves` · `good-hope-walk-couple`, and others below 55 | 44–63 | Unrelated photographs matched on repeated texture (cladding, foliage, paving): spurious. Re-run at 640 px, `langa-walk-guide` · `winelands-red-tasting` keeps 6 points. |

Distinct photographs of the same place are allowed by the brief (§5.2: "do not call truly distinct shots duplicates
solely because subjects recur"). The two that could still read as "the same view twice" are the Langa mural and the
coastline pair. Both are left in place and listed for the owner's eye. The library's alternatives were weaker: every
unused Langa photograph shows children, whom the site does not show, and the unused landscapes repeat subjects
already shown.
