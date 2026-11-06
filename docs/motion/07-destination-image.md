# 07 · The destination image (the owner's replacement brief, 6 Nov 2026)

On 6 Nov 2026 the owner sent the brief "Footprint reveal image replacement" with their own image. It shows a woman in a
yellow sundress and a straw hat standing at the water's edge, her footprints behind her. The brief asks for it in place
of the Camps Bay photograph at the end of the sand journey, as the destination of the same walk ("one continuous
cinematic sequence"), with new words and a link to the Cape Peninsula tour. This report answers the brief's
deliverables. It was merged into `main` by pull request at the owner's direction on 6 Nov 2026; nothing is deployed.

## Files changed

| Area | Files |
|---|---|
| The image | `src/data/images.mjs` (the `ocean-footprints-reveal` slot, basis G); `src/assets/img/ocean-footprints-reveal-{480,800,1200,1600}.{avif,webp}` (new); `src/data/images.generated.json`. The master is in `media-src/journey/`, which, like every master, is not committed |
| The section | `src/partials/sand-journey.mjs` (the image, the owner's words, the headline group and the line-and-link group); `src/assets/css/motion.css` §3 (three layouts, the words' places and stagger, the reduced-motion fade) |
| The continuity | `src/assets/js/motion/sand/scene.js`: `PHOTO` (the image's four prints), `photoPlacement`, the walk laid out to end on those prints, the sweep's passes in parallel rows, the timing. `src/assets/js/sand-journey.js`: measures where the image is and passes it to the renderer, staggers the words, the reduced-motion fade. `src/assets/js/motion/sand/renderer.js`: passes the placement on. `src/assets/js/motion/sand/shaders.js`: the sand's colour matched to the image's |
| Credits and registers | `src/pages/privacy.mjs` (photo credits); `docs/RIGHTS_REGISTER.md`; `docs/APPROVAL_REGISTER.md` (M5, P5) |
| Tests | `test/motion-sand.test.mjs`: the walk; "one trail, one walker" at 13 layouts; the section's markup. `test/hero.test.mjs`: where AI-generated pictures may appear. `test/e2e/motion.spec.mjs`: the new words and link; the stagger; no word over a print or the woman; the reduced-motion fade. `test/e2e/motion-nowebgl.spec.mjs` |
| QA and docs | `qa/motion.mjs` (now waits for the renderer itself, not its initial "static" label); `docs/motion/00` (a note), `03`, `04`, `06`, this report; `README.md`; new evidence in `docs/motion/qa/` |

## The image

- **New asset:** `src/assets/img/ocean-footprints-reveal-{480,800,1200,1600}.{avif,webp}`, served through `<picture>` (AVIF first, then WebP). The 1600 px rendition is 70 KB as AVIF and 140 KB as WebP.
- **Source:** the supplied `Golden Shoreline Footprints.png` (1672 × 941), kept unchanged as `media-src/journey/goodtimes-ocean-footprints-reveal.png` (byte-identical, SHA-256 `36cfda64…`). The supplied WebP is kept beside it. The pipeline (`npm run images`: sips, cwebp, avifenc) only resizes and encodes. It has no colour, sharpening or upscaling step, and the largest rendition (1600 px) is smaller than the original. The renditions' average colour matches the master's within 1/255 per channel; the master has no colour profile.
- **Previous reference replaced:** in the section, `picture({ name: 'camps-bay-twelve-apostles' })` is now `picture({ name: 'ocean-footprints-reveal' })` (`SAND_IMAGE` in the partial). The Camps Bay photograph is not deleted: chapter 11's closing scene on the home page and the packages page's banner still use it.
- **Alt text:** "A woman in a yellow sundress and a straw hat standing at the water's edge, looking out to sea, her footprints trailing behind her across the sand".
- **Basis:** AI-generated (G). The brief does not say so, but the image's look does, like the owner's hero scenes. It is credited beside the image ("An AI-generated illustration") and on the privacy page. The owner is asked to confirm and approve it (M5, P5).

## One trail, one walker

| The brief asks for continuity in | As built |
|---|---|
| Footprint direction and alignment | The image's four prints were measured: centre, heading, length and which foot. The walk's last four steps **are** those prints, with the same places, headings and feet (right, left, right, left). The page measures where the image sits (its box and its `object-position`) and the renderer lays the trail out from that, so the match holds at every size. Tested to 0.01 px at 13 layouts, and checked in WebKit at 13 sizes |
| Apparent foot size and perspective | The animated foot is scaled to the image's prints (132 image px from heel to toe). The light comes from the upper left, as on the image's prints |
| The last animated print and the first photographed one | The steps before the image's prints continue its walking line backwards, with its own stride (about 48 cm) and step width (about 9 cm), turning away gently: each foot's track turns less than 10° from one print to the next (tested). The animated prints that are not the image's end off the image, so no print is ever shown twice. The walker is not animated, and nothing is drawn over the image's prints |
| Sand tone, texture and lighting | The shader's sand was retuned to the image's. The image's open sand averages sRGB 221, 181, 149; the shader's frames now average 221–222, 180–182, 148–149 (before: 222–224, 178–179, 141). The flat sand around the words is the same colour (#dcb594) |
| Scroll progression and timing | The walk ends at p 0.60 in the image's own framing. The camera then holds still, and the sweep uncovers the image's prints exactly where the animated ones were |

## The transition

The brief suggests GSAP with a CSS or SVG mask, and warns against unnecessary canvas or WebGL. The sand being removed is
the same WebGL surface the footprints are pressed into (built for the motion package, 02–04), so the reveal is that
surface being brushed away. It adds no second canvas, no extra draw and no extra download. A CSS or SVG mask would need a
second, flat copy of the sand over the image, without the prints, the heaps, the lit edges and the shadow, and the
hand-over between the two would show. Without WebGL2, or with reduced motion, the section is the static scene.

- **A, footprints:** unchanged, p 0.04–0.60 (03).
- **B, discovery:** long, gently curved brushing passes in parallel rows, back and forth: the first along the trail from p 0.605, then outwards to either side. Each pass pushes a heap and leaves ridges, and the edges are irregular, never a straight wipe. What the passes leave crumbles from p 0.76.
  - **Changed in this pass:** the passes now all bow the same way. Before, random bows left up to 27 % of a desktop stage unswept: at 1440 × 900, about 340 px of scrolling changed nothing while a band of sand lay over the woman's hat.
  - **Result:** the stage now clears steadily and is clear by about p 0.80 at every size measured (the renderer's coverage, read at every 0.02 of p in WebKit; `qa/motion-report.json`).
- **C, the destination:** the woman, the sea and the four prints, still. The image never moves or zooms: it lies in place from the start, and only the sand over it changes.
- **D, copy and link:** after the sand has gone, the eyebrow, the headline, the line and the link rise 16 px into place one after another, at p 0.84–0.965.
  - They are driven by the same scroll value, through CSS custom properties set by `sand-journey.js`.
  - No second animation library is used, and no property is animated twice.

## The words and the link

- **Verbatim from the brief:**
  - the eyebrow "Cape Peninsula · Coastal Journey", set in capitals by CSS so screen readers read words, not letters;
  - the headline **Look Where Your Footsteps Led.**, the section's `h2`, which names the section;
  - the line "One private journey. Breathtaking coastlines, penguins, and unforgettable Cape Town moments.";
  - the link **Explore the Cape Peninsula Tour**.
- **The link** is an ordinary HTML link, styled as the site's green button, to `tours/cape-peninsula-private-tour/`: the site's own page for the tour. The address in the brief is the old website's, and the brief asks for the internal route where one exists. No price, inclusion or tour was added.
- **Placement on wide screens:**
  - The headline sits in the upper left, in the sand between the header, the surf and the first print.
  - The line and the link sit in the lower left, below the second print and left of the third.
  - Why the split: the brief prefers the upper left, but there the sand is a narrow diagonal band between the surf and the trail, about 130–250 px tall at common desktop sizes. The four lines together need 250–330 px. The first version, one block in the lower left, covered prints 1 and 2 at 1280 × 720 and 1024 × 768. Splitting puts the headline where the brief prefers it and keeps every print clear.
  - The words' places and the headline's size are computed in the image's own pixels, so the gaps hold at every wide size. An e2e test checks that no word overlaps a print or the woman.
- **Contrast, with no overlay:** the eyebrow (#0a4a24) is 5.5 : 1 on the sand, the line (#2b221a) 8.2 : 1, and the headline darker still. axe (WCAG 2.2 AA) passes on desktop and mobile.

## Responsive behaviour

| Layout | When | The image | The words |
|---|---|---|---|
| Wide | Landscape and taller than 640 px (desktops, laptops, tablets on their side) | Covers the stage below the header, anchored left and 25 % from the top. The crop takes the far right (sea), or a little sky and more of the lower sand. The woman, her hat and all four prints are whole at every size measured | Headline upper left; line and link lower left, above the call bar where there is one |
| Portrait | Taller than wide (phones, upright tablets) | A frame below the header, as tall as the screen is wide, less the 17.5rem the words need and the call bar. The image is height-fitted with its x = 1340 (just past her hat) at the right edge, so the woman and the trail's end are always whole. Prints 1–2 slide off the left edge on narrow phones, where the animated walk goes off-screen too. The frame's lower edge melts into the sand | Below the frame, on the same sand. The link clears the call bar (checked at 360 × 740 and 375 × 667, where it had been under it) |
| Short landscape | Landscape and 640 px tall or less (a phone on its side, a low window) | Whole between the header and the call bar: height-fitted at the right, x = 1340 at the right edge, its left edge melting into the sand | In the sand to its left, with the credit under them |

Measured in WebKit at 1920 × 1080, 1440 × 900, 1366 × 657, 1280 × 720, 1280 × 600, 1024 × 768, 900 × 700, 768 × 1024,
390 × 844, 375 × 667, 360 × 740, 844 × 390 and 667 × 375. At every size: no horizontal overflow, the woman whole, the
words clear of the prints and the woman, and the link visible.

## Accessibility and performance

- **No layout shift:** the image's box is reserved (`width` and `height` 1672 × 941, and its CSS box).
- **Loading:** the image is lazy and low priority (`fetchpriority="low"`), so it never competes with the hero.
- **Reduced motion, `?nomotion` and no WebGL:** the final scene, at once. With the script, its words fade in once as it comes into view (opacity only; nothing moves). Without the script, everything is shown.
- **Keyboard:** the link is in the tab order at any p, and focusing it shows the words at once.
- **No new triggers:** the scroll timeline is the ScrollTrigger the section already had, with no new triggers or listeners. On a failure it is killed and the section collapses (04).

## Checks (final build)

| Check | Result |
|---|---|
| `npm test` | 293 / 293 |
| `npx playwright test` (desktop and mobile) | 324 passed, 36 skipped (desktop-only or mobile-only cases, as before), 0 failed. In an earlier full run on the same build, a timing check on `/destinations/` (a page none of this touches) failed once; it passed 8 times out of 8 when rerun alone, and in the final full run |
| `npm run check` | no problems, 25 pages |
| `npm run guard` | clean |
| One trail (unit, 13 layouts) | the last four animated prints within 0.01 px of the image's, the same headings, feet and size; no other animated print on the image at the end |
| Determinism (WebKit, 3 sizes × 8 states) | 8 distinct frames per size, forwards equal to backwards |
| axe, home page | no serious or critical violations, desktop and mobile. The first run of the reduced-motion fade failed here: its transition also ran when the words were first hidden, so axe read them half faded. Now they hide at once and only fade in |
| Console | no errors at any size measured |
| GPU cost per sand frame (M3 Pro, WebKit) | full tier at 2× on 1440 × 900: walk 4–5 ms, sweep 5–8 ms, crumbling 7–8 ms; phone canvas 2–3 ms; scrolling through the section at about 59 fps |
| Layout shift (Chromium, entrance and a scroll through the section) | 0.0006 on desktop (the pre-existing navigation shift, as on `main`), 0 on a Pixel 7 |

## Desktop and mobile screenshots

All in `docs/motion/qa/`:

- **Desktop and laptop:** `destination-1920x1080.jpg`, `destination-1440x900.jpg`, `destination-1366x657.jpg`, `destination-1280x720.jpg`, `destination-1024x768.jpg`.
- **Tablet and phone:** `destination-768x1024.jpg`, `destination-390x844.jpg`, `destination-360x740.jpg`, `destination-844x390.jpg`.
- **Mid-reveal**, the image's prints where the animated ones were: `destination-1440x900-reveal-p0.68.jpg`, `destination-390x844-reveal-p0.70.jpg`.
- **The whole sequence:** `sand-*-storyboard.jpg` (8 moments each) and `motion-1280x800.mp4` (the entrance and the whole scroll).

## Remaining limitations

- **The image's prints and the animated ones differ in detail.** They match in place, heading, foot and size. But the image's are painted in a slight perspective, with their own toe shapes and depth, so as each is uncovered the print changes in detail, not in position. The image's sand is also softer in texture than the shader's.
- **The image is AI-generated.** That comes from its look; the brief does not say. It is credited as such. A real photograph with the same composition would need its prints measured again (`PHOTO` in `scene.js`).
- **On narrow phones** prints 1–2 lie beyond the frame's left edge; the woman and the trail's end stay whole. On a phone on its side the woman is about 140 px tall.
- **The words' layout is three fixed layouts, not fluid.** A window resized across 640 px in height switches between the wide and the short-landscape layouts.
- **Measured on one Mac** (M3 Pro, WebKit and Chromium). No real phone, Firefox or iOS Safari was run.
- **Merged, not deployed.** Staging and production are unchanged; a staging or `motion-preview` deployment needs the owner's Cloudflare token (06).
