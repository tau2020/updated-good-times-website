# 04 · The sweep, the destination, and performance

Gate 4. Files: `scene.js` (strokes, `revealAt`, the CPU reference), `shaders.js` (`reveal()`), `renderer.js`,
`sand-journey.js` (tiers, lazy loading, context loss), `partials/sand-journey.mjs` (the destination's HTML).

## The sweep

The first build's sweep was judged "holes punched in paper" by the independent review (05, B2): strokes radiating
from shared centres opened pinwheel and heart-shaped holes, the leftover sand was flat islands with spray-brush edges,
and from p 0.88 it became a moth-eaten noise dissolve. As rebuilt:

- **Brushing, not punching:** long, gently curved passes (circular arcs, 650–1300 cm in radius, all bowed the same way, so they lie in parallel rows), side by side and back and forth, along the walk. They start with the pass over the last prints and work outwards, 11–13 passes, each from beyond one edge of the held stage to beyond the other. The swept ground is a capsule along the arc, round at both ends, with ragged sides. Together the passes cover the whole stage, so it clears steadily: by about p 0.80 at every size measured. (Until 6 Nov 2026 the radii were 320–900 cm with random bows and ±7° of jitter: neighbouring passes bowed apart and left up to 27 % of a desktop stage for the crumbling, so about 340 px of scrolling at 1440 × 900 changed nothing while a band of sand lay over the woman's hat. Measured with the renderer's coverage at every 0.02 of p.)
- **Pushed sand:** each pass drives a heap ahead of its brush and leaves a lumpy ridge along its sides, lit like the rest of the sand.
- **A layer with thickness:** the remaining sand's edges catch the light (a lit lip and a darker far side), and it casts a soft shadow on the photograph beside it.
- **Grainy edges, a few spilled grains:** the edge thins to loose grains through a grain-sized dither fixed in the world, and a few grains lie on the swept ground right beside remaining sand, only there (an early version scattered them along every pass's edge and dirtied the sky; fixed).
- **Crumbling in order:** from p 0.76, while the last passes go over, what they leave at their edges becomes rounded clumps that shrink away, **those next to swept ground first**, so the clearing spreads outwards instead of holes appearing everywhere at once.
- **The prints go with their sand:** depressions and ridges disappear only where the sand has gone.
- **Exact ends, never back:** nothing is swept before p = 0.605 and everything is gone from p = 0.95 (tested on a grid of points). At every point the swept amount never decreases as p grows (tested; this caught and fixed a 1 % refill at the brush's tapering end). At p = 0.72 between 15 % and 85 % is swept: a sweep, not a wipe (tested).

## The destination

Since 6 Nov 2026 (the owner's replacement brief, 07): the image under the sand is the owner's
`ocean-footprints-reveal`, a woman standing at the water's edge with the walk's last four prints behind her, an
`<img>` sharp and in full colour, fetched at low priority. (It replaced the Camps Bay photograph, which stays in use in
chapter 11 and on the packages page.) Beside it, in HTML: the eyebrow "Cape Peninsula · Coastal Journey", the heading
**Look Where Your Footsteps Led.**, the line "One private journey. Breathtaking coastlines, penguins, and unforgettable
Cape Town moments." and the link **Explore the Cape Peninsula Tour** → `tours/cape-peninsula-private-tour/` (an
existing page). The words are the owner's; no price or claim was added. They are in the accessibility tree throughout
and show at once when focused. Under motion they rise in one after another at p 0.84–0.965, once the sand has gone.

## Tiers

| Tier | When | Output |
|---|---|---|
| Full | WebGL2, motion allowed | Up to 2× pixels (5.4 MP cap), cast shadows, the full grain pool |
| Lite | Measured slow frames (more than 22 of the last 36 gaps over 30 ms while drawing), or `?sand=lite` | 0.62× resolution (1.2 MP cap), no cast shadows, 45 % of the grains |
| Static | Reduced motion, `?nomotion`, `?sand=static`, no WebGL2, a failed shader or import, a lost context (until restored), print | The image, words and link (with the script, the words fade in once as the scene comes into view: opacity only). One screen tall if it happens before the stage is held; inside the held stretch it stays tall, so nothing jumps |

Capability is never guessed from the user agent. The only inputs are reduced motion, WebGL2 availability and measured
frame times.

## Loading and cadence

- **Nothing on the hero's critical path:** the renderer modules (about 61 KB raw, 23 KB gzip) are imported dynamically once the hero's entrance has finished and the browser is idle, or at the first scroll, whichever comes first. The shader compiles and the grain tile bakes then (init about 120–150 ms in WebKit on this Mac).
- **No loop of its own:** the scene is drawn only from the scrubbed ScrollTrigger tween's `onUpdate`, on GSAP's ticker, and on resize or restore. When the scroll rests and the scrub settles, nothing draws.
- **Arriving late:** if the renderer arrives while the scene is on screen (a slow connection, a fast scroll), the sand and the words cross-fade over 0.7 s into the state for that p. In the first build the words vanished and the sand appeared in one frame (05, B3; e2e tested with the renderer held back).
- **Cleanup:** `destroy()` deletes every program, buffer, vertex array and texture and releases the context on `pagehide` (not on a back/forward-cache store). On `webglcontextlost` the static scene shows; on `webglcontextrestored` the renderer is rebuilt and draws the current p (e2e tested with `WEBGL_lose_context`).

## Measured performance (honest scope)

Machine: Apple M3 Pro (18-core GPU), macOS. Engine: WebKit (Playwright), which uses the Apple GPU through Metal.
Chromium headless renders WebGL in software, so it was used only for correctness. No phone, Windows laptop or
Android device was measured. **The phone rows below are a desktop GPU at phone resolutions, not a phone.**

GPU cost per frame (draw, then a one-pixel read-back to wait for the GPU; 40 frames per phase; median / 90th
percentile, ms). WebKit's timer is coarsened to 1 ms.

| Viewport, tier (drawing buffer) | Walk | Sweep | Crumbling |
|---|---|---|---|
| 1440 × 900 @2×, full (2880 × 1800) | 4 / 4 | 5 / 6 | 7 / 8 |
| 1440 × 900 @2×, lite (1339 × 837) | 1 / 1 | 1 / 2 | 2 / 2 |
| 390 × 844 @3×, full (780 × 1688) | 2 / 2 | 2 / 2 | 2 / 3 |
| 390 × 844 @3×, lite (363 × 785) | 1 / 1 | 1 / 1 | 1 / 1 |

Earlier builds: with a 3.7 MP cap (1.69× on desktop, judged "soft" in review), and before two optimisations (a stroke
is skipped when the pixel is provably too far from its circle; one shadow sample instead of two), the desktop sweep was
13 / 19 ms and the crumbling 22 / 23 ms. The full tier now draws at a true 2× (5.4 MP cap).

Frame cadence while scrolling through the whole section in rAF-paced steps: average 59 fps, 95th percentile gap 18 ms,
no downgrade triggered, in all four rows (`qa/perf-webkit.json`).

**Hero LCP and CLS**, home page with motion, the same static server for both (Chromium):

| | Local LCP (median of 5) | Slow 4G + 4× CPU LCP (two rounds of 3) | CLS during the entrance / after scrolling |
|---|---|---|---|
| main, desktop | 56 ms | 3600 / 3580 ms | 0.0006 / 0.0006 |
| branch, desktop | 80 ms | 3416 / 3440 ms | 0.0006 / 0.0006 |
| main, Pixel 7 | 56 ms | 3736 / 3744 ms | 0.0075 / 0.0075 |
| branch, Pixel 7 | 76 ms | 3420 / 3424 ms | 0.0075 / 0.0075 |

CLS is identical to main. Under throttling the branch is not slower; it is a little faster, because the first chapter's
photographs now sit beyond the lazy-load threshold. Locally it is about 20 ms slower (parsing the larger page and the
two aircraft scripts; the local figures are from the build before the review fixes, whose critical-path changes were a
few lines of `brand-plane.js` and `hero.js`). An earlier build was 120–190 ms slower on throttled desktop: that was a
render-blocking `motion.css` in the head and the Camps Bay photo fetched early. Both were fixed (the sheet is linked
inside the section, and the photo is `fetchpriority="low"`). Raw data: `qa/vitals-local.json`, `qa/vitals-throttled.json`.

**Payload:** MotionPathPlugin 22.0 KB (9.7 KB gzip), brand-plane.js 15.3 (5.5), sand-journey.js 9.4 (3.6),
motion.css 10.5 (3.3); the lazy renderer 61.2 KB (23.3 KB gzip); home HTML +1.4 KB gzip in production builds
(+2.4 KB in preview builds, which also carry the propeller alternative).

**Not measured:** real iPhones and Android phones (the package's ≥ 30 fps target remains a goal), Firefox, Safari on
iOS, memory over ten repeated navigations, and long sessions.

## Why no PixiJS

The package proposes PixiJS 8 "only if absent and justified". The scene is one full-stage fragment shader and a point
pass. PixiJS would add about 200–500 KB for a scene graph this page does not use, the site is zero-dependency and
self-hosts its few vendored libraries, and its own API would sit between ScrollTrigger and a shader that needs exact
control of every uniform. The renderer here is about 10 KB of this repository's own WebGL2 code, with the deterministic
`renderAt(p)` the package asks for.
