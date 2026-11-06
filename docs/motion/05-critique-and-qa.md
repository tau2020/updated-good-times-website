# 05 · Independent critique and QA

Gate 5. A separate reviewer agent operated the running site (`http://127.0.0.1:8093`, WebKit and Chromium) on 6 Nov
2026. It chose its own viewports (1280 × 720, 1440 × 900, 1920 × 1080, 768 × 1024, 390 × 844) and moments. It was given
the brief's acceptance criteria and the test hooks, not my conclusions, and it did not modify the repository. Its
findings are below as it wrote them (the blockers and the harshest sentence verbatim), each followed by what I checked
and what changed. Everything it reviewed was the build before this report's fixes.

## The harshest sentence (verbatim)

> "You built a detailed little jet and hid it under a flat green emoji, then built a 'real beach' out of footprint icons
> stamped into beige plasticine and punched pinwheel holes through it to a blurry postcard."

## Blockers (verbatim) and disposition

**A1.** "The aircraft is a flat pictogram on every viewport for the whole flight (0.17–1.6s): what flies is the logo
glyph in one flat green, like an airport-sign icon, ~50–70px wide on desktop. A detailed jet (shaded fuselage, nacelles,
cockpit glass, red/green nav lights) is built underneath it and never shows — the timeline sets
`use.aircraft-flight__glyph--final` to opacity 1 at t=0 and it paints after `g.aircraft-flight__detail`."
→ **Confirmed and fixed.** The landed glyph stays hidden until touchdown, so the airliner flies with its detail
(`qa/plane-detail-zoom.jpg`, `qa/plane-1440x900-flight.jpg`).

**B1.** "The footprints read as embossed icons … an oval heel with a hard-edged lighter disc on a dead-flat floor, a
parallel-sided midfoot strip ~⅕ of the forefoot width (a high arch, not shallow), a capsule-shaped ball, and five round
beads for toes with the small toes detached from the ball. Each part appears as its full outline at zero depth and then
deepens, like a cookie cutter; the sand never caves under weight."
→ **Confirmed in substance and revised (02).**
- One continuous outline, with a broad midfoot about half the forefoot's width.
- Oval toes tucked 0.2–0.6 cm from the ball.
- Each part's contact spreading from its middle as it presses (caving).
- Walls roughened at three scales, a push-off heap, texture left on the floor, softer shadows.
- New tests: the midfoot's width, no break in the outline, caving from the middle, toes tucked with a ridge.

What still falls short is listed in 02 (the lesser toes are still too regular; no sole creases). It is owner approval
item M3.

**B2.** "The removal looks like holes punched in paper … curved strokes radiating from shared centres open a four-lobed
pinwheel at p=0.68 on desktop and a heart-shaped hole of sky at p=0.70 on the phone; the leftover sand is flat beige
islands with frosted, spray-brush edges — no thickness, no shadow, no spilled sand, footprints sliced in half; from
p≈0.88 it becomes a moth-eaten noise dissolve."
→ **Confirmed and rebuilt (04):**
- Long, gently curved brushing passes, side by side in one direction, working outwards from the trail.
- Each pass pushes a heap ahead of it and leaves ridges along its sides.
- The layer has a lit lip and casts a shadow on the photograph.
- A few spilled grains lie only beside remaining sand.
- What is left crumbles next to swept ground first.

Prints are still cut where a pass crosses them. That is inherent to sweeping sand that holds prints.

**B3.** "A late-loading renderer wipes the content … with `renderer.js` held back and a fast scroll to p≈0.39, the user
first sees the finished photo, heading and CTA; when the renderer arrives the copy drops from opacity 1 to 0 in a
single frame and sand covers everything."
→ **Confirmed and fixed.** Arriving while the scene is on screen, the sand and the words cross-fade over 0.7 s
(e2e test with the renderer held back).

## Moderate findings and disposition

| Finding (the reviewer's) | Disposition |
|---|---|
| Transition readability, p ≈ 0.88–0.96: the heading about 40 % opaque over busy houses, clumps over the copy, lone 1–2 px white grains in the sky "like dead pixels" | The words now rise from 0.89 to 0.985, once the sand has mostly gone. Spilled grains appear only beside remaining sand (sand-coloured, never across clear sky). |
| Soft phone photo: `sizes="100vw"` with a cover crop serves the 1200w image to a 3× phone | **Fixed:** `sizes="(max-aspect-ratio: 3/2) 150vh, 100vw"`, so a portrait phone gets the 2000w rendition. A 2× desktop still gets the 2000w, the largest available (the original is 2048 px wide). |
| Soft sand canvas: capped at 1.69× on desktop | **Fixed:** true 2× (5.4 MP cap); measured 4–7 ms a frame on this Mac (04) |
| Tablet 768 × 1024: the plane and trail fly across Make It Yours and vanish into it; on the phone across the menu icon | **Fixed:** the turn stays left of the header's controls |
| A scroll at 0.6 s: a ~50 px single-frame jump, then the loop skims the top of the viewport | **Fixed:** a scroll lands the aircraft at once. Fixing it exposed a real bug: landing on resize did not work during real playback (the master timeline re-rendered the nested flight). Both are now tested while the entrance plays. |
| Phone: one or two prints on screen; desktop: ~575 px of scrolling over one print after a hard straight seam | **Desktop:** a second print now forms while the stage scrolls in, plus a soft contact shadow where the hero's edge lies over the sand. **Phones:** unchanged by design. A real stride is a third of the stage's height, so three prints at most are in view; showing more means shrinking the feet. |
| "`__sandJourney.checksum()` returns the same hash ('ad376fc5') at every progress value, so it proves nothing" | **Not reproduced.** In WebKit and Chromium, at the top of the page, inside the held stage and past it, each p gives its own hash: 8 distinct hashes per size in `qa/motion-report.json`, alongside the coverage falling from 1 to 0. The e2e test also asserts the coverage at each p, not only that the hashes match. |
| Copy: "Camps Bay, on the Cape Peninsula day" is clumsy and leaves "DAY" alone on the phone | **Changed** to "Camps Bay, Cape Town" (the photograph's place) |

## What the reviewer found working

The landing ends 0.07 px from the dock and swaps in one frame, with only anti-aliasing differing, and retargets when
the header shrinks; following the logo's dashed route is "a good idea". The plane never crosses a face at five sizes.
The titles start at touchdown (1.45 s) and are in by about 2.1 s, and a focused link shows itself. Reverse scrolling
is pixel-identical. The gait checks out: 8 steps on desktop and 6 on portrait phones, heel → ball → toes, big toes
inside, a stride of about 2.6 foot lengths, 6–7° toe-out, consistent light. Performance: median frame 17 ms, 99th
percentile ≤ 29 ms, no layout shift. Accessibility: the final copy is readable, tabbing to the CTA reveals it with a
focus ring, and reduced motion gives no flight, a whole logo and a static one-screen section.

## Not re-reviewed

The fixes above were verified by me (screenshots in `qa/`, the tests below), **not by a second independent pass**.
One is recommended before the owner signs off M3 and M4.

## QA run on the final build

| Check | Result |
|---|---|
| `npm test` | 292 / 292 |
| `npx playwright test` (desktop and mobile) | 322 passed, 36 skipped (as on `main`: desktop-only or mobile-only cases); includes 12 motion tests (22 runs across the two projects): the landing to 0.5 px, the titles at touchdown, keyboard during the entrance, reduced motion, resize and scroll mid-flight during real playback, the held stage, determinism forwards and backwards, coverage 1 → 0, the static scene and its link, `?sand=static`, lost and restored context, the late renderer's cross-fade, keyboard focus over sand, and no WebGL |
| `npm run check` | no problems, 25 pages |
| `npm run guard` | clean |
| `qa/motion.mjs` (WebKit, 3 sizes) | landing 0.048–0.070 px; 8 states each, the same forwards and backwards; no console errors |
| Keyboard | header in the tab order throughout the entrance; the sand section's link focusable at any p, its words shown on focus |
| Screen readers | section named by its heading; link "Explore This Experience: the Cape Peninsula Private Tour"; canvas and flight layer aria-hidden |
| Reduced motion, `?nomotion`, no JS | no flight, whole logo; static one-screen scene |
| No WebGL | static scene, one screen tall, no error (e2e with WebGL switched off) |
| Lost context | static scene, restored on `webglcontextrestored` (e2e) |
| Slow connection | late renderer cross-fades (e2e); throttled LCP no worse than `main` (04) |
| Scroll backwards, seek | identical frames (tests) |
| Not tested | ten repeated navigations (GPU memory), a tab hidden mid-entrance, back/forward-cache restores, real phones, Firefox, iOS Safari |
