# 01 · The brand aircraft: validation

Gate 1. Files: `src/partials/aircraft.mjs` (geometry and markup), `src/assets/js/brand-plane.js` (the flight),
`src/assets/js/hero.js` (the entrance it is nested in), `src/assets/css/motion.css` §1–2,
`src/assets/js/vendor/MotionPathPlugin.min.js` (GSAP 3.15.0, byte-identical to `gsap@3.15.0/dist`).

## What it does

1. From the first frame the logo's own airliner (the "i" of "in") is held back by a mask hole the size of its box. Nothing else in either lockup falls inside that hole (tested).
2. At 0.15 s a flying copy enters from the left, already at speed, about 55 px wide on desktop and 41 px on phones. It crosses the hero's sky (above every face), with a short dotted trail like the logo's own dots, a soft shadow that shrinks as it descends, and a bank of up to about 15° drawn from its turn rate.
3. It makes a climbing turn to the right of the logo, reaches the location pin and then **follows the logo's dotted route, dot by dot** (MotionPathPlugin along a path measured from the page), shrinking to the glyph's size.
4. It touches down nose-down on the glyph at 4.02 s, squares up and settles 1.5 px past and back, while its flight detail (fuselage highlight, wing shading, cockpit glass, engine nacelles, red and green navigation lights) fades away. In the first build that detail never showed: the flat landed glyph was drawn on top of it for the whole flight. The independent review caught this (05, A1); now the landed glyph stays hidden until touchdown (`qa/plane-detail-zoom.jpg`).
5. At 4.82 s it hands over to the logo in one frame. The copy is the glyph's exact outline at the glyph's measured box, so the swap is invisible.
6. The navigation titles start at the landing (4.10 s) at 85 ms intervals and are all in by 4.75 s. The call to action keeps its own moment: it rises at 2.2 s, while the aircraft is still in the air, and the sheen crosses it at 2.82 s.

Times are on desktop; tablets run 1.2× faster and phones 1.65× faster (the existing entrance's rule). On a phone it
touches down at 2.44 s and the entrance ends at 2.92 s.

**Pace:** the owner asked for the flight 65 % slower, then 10 % slower again (6 Nov 2026). The aircraft now flies at
31.5 % of the first build's speed (0.35 × 0.9), the package's 0.55–1.28 s flight window included: every time in the
flight is stretched by 1 / 0.315 (`PACE` in `brand-plane.js`). The bank gain follows the pace, so the turns bank as much as before.

## The aircraft: an owner approval item (M1)

The package supplies a **single-engine propeller** aircraft and asks for a "real aircraft, not a paper plane". The
approved logo's aircraft is a **twin-engine jet airliner** (swept wings, under-wing engines, tailplane). The package's
own art direction resolves this: "If approved logo art uses a different aircraft or angle, redraw the supplied SVG to
match", and, where shape and typography cannot coexist, "document two faithful alternatives". Both are built:

| | Jet (default, production) | Propeller (preview builds, `?aircraft=prop`) |
|---|---|---|
| Shape in flight | The logo's own airliner outline plus flight detail | The package's original SVG, turned nose-down, recoloured to the logo's greens |
| At the landing | Identical to the logo: no change of shape | Crossfades into the logo's airliner glyph |
| Brand fidelity | Exact | A different aircraft that becomes the logo's at the last moment |

Recommendation: the jet. It is a real aircraft (wings, tail, engines, cockpit) and the one the brand already draws.

## Precision (measured in a real browser, WebKit, `qa/motion.mjs`)

The flying glyph's bounding box at the last frame before the handover, compared with the logo glyph's box (the dock
anchor less its 2-unit clear space):

| Viewport | Landing error | After the handover |
|---|---|---|
| 1440 × 900 | 0.070 px | mask removed, layer hidden |
| 390 × 844 | 0.063 px | mask removed, layer hidden |
| 360 × 740 | 0.048 px | mask removed, layer hidden |

The browser test (`test/e2e/motion.spec.mjs`) asserts an error under 0.5 px on desktop and mobile.

## States checked

| Situation | Behaviour | Evidence |
|---|---|---|
| Reduced motion, `?nomotion`, no JavaScript | No mask, no layer: the logo is whole and nothing moves | e2e "without motion…", unit "the logo is whole in the markup" |
| Resize or rotation mid-flight | Lands at once (its path was measured for the old layout), during real playback: the nested flight is taken out of the master timeline before it is completed, or the master would put it back in the air (a bug found in review, now tested without pausing) | e2e "a resize mid-flight…" |
| Scrolling mid-flight | Lands at once rather than chase a moving header (review finding) | e2e "scrolling while it is in the air…" |
| The header's controls | The turn stays left of Book Now, the concierge and the menu button (review finding: it crossed them on a tablet and a phone) | brand-plane.js `limit` |
| Leaving mid-flight, back/forward cache | `pagehide` settles the entrance; it never replays on restore | hero.js |
| Fonts late | The dock depends only on the logo's box (sized by CSS, width and height attributes reserved), not on fonts | — |
| Scrolling during the flight | The layer lives in the sticky header, so the plane and the logo move together; over the film the copy takes the reversed lockup's green | motion.css §1 |
| Keyboard during the entrance | The logo link, the titles and Book Now are in the tab order throughout; focus shows at once | e2e "the header stays in the tab order…" |
| Seeking or replaying | Mask and layer follow the playhead, so any seek is exact | `sync()` in brand-plane.js |
| Other pages | Plain logo link, no layer, no script | unit "only the home page carries the aircraft" |
| CLS | 0 during the entrance (Chromium, 5 runs) | 04 |
| Dev replay | "Replay the intro" in the preview bar: preview builds, desktop widths, never in production | unit test |

## Screenshots

- `qa/plane-1440x900-flight.jpg`: timeline t = 0.7, 1.4, 2.1, 2.7, 3.3, 3.9 s, desktop
- `qa/plane-390x844-flight.jpg`: timeline t = 0.7, 1.4, 2.1, 2.7, 3.3, 4.4 s on a phone (played 1.65× faster)
- `qa/plane-1440x900-landed-zoom.jpg`: the lockup after the landing, magnified
- `qa/plane-detail-zoom.jpg`: the airliner in flight at 2× (captured at the first build's pace; the drawing is the same)
- `qa/motion-1280x800.mp4`: the whole entrance, then the sand journey

## Owner approval items

- **M1** the aircraft (above);
- **M2** the flight: the final leg follows the logo's own dotted route from the pin, at the slower pace the owner asked for, and the titles are 85 ms apart, as the package specifies (it was 280 ms).
