# 03 · The step sequence

Gate 3. Files: `src/assets/js/motion/sand/scene.js` (the gait, the timing, the camera, the sweep, the grains),
`src/assets/js/sand-journey.js` (scroll to progress), `src/assets/css/motion.css` §3.

## Scroll and progress

The section after the hero is one held stage (CSS `position: sticky`) inside a taller section: one screen plus
200 svh on desktop, or 170 svh on phones and portrait screens. ScrollTrigger maps the scroll to one progress value
p ∈ [0, 1], scrubbed 0.45 s, from "the section's top 72 % down the screen" (the hero still in view) to "the section's
bottom at the screen's bottom". The stage is held from p ≈ 0.265 (desktop) or ≈ 0.298 (phones). There is no
ScrollTrigger pin, so no pin spacer and no layout shift.

## Storyboard (as built)

| p | What the visitor sees |
|---|---|
| 0.00–0.04 | The sand rises under the hero, untouched, a soft contact shadow where the hero's edge lies over it |
| 0.04–0.13 | **The first print forms just under the hero's edge** while the hero's call to action and phone are still on screen: the one scene crossing the boundary |
| 0.11–0.18 | On wide screens, a second print, still before the stage is held (the walk is under way as it scrolls in) |
| pin − 0.03 → 0.60 | The other prints, one after another, the camera gliding along the walk. **The last print (8th; 6th on portrait phones) is complete at 0.60**, before the sweep |
| 0.605–0.87 | Long brushing passes sweep the sand off (04) |
| 0.84–0.95 | What is left crumbles away, next to swept ground first |
| 0.89–0.985 | The words and the link rise in; from 0.95 the photograph is clear |

This differs from the package's first-experiment numbers (steps .06–.48, sweep .48–.92). The entry phase
(the stage scrolling in under the hero) takes the first quarter of the scroll, and keeping the walk at a calm pace
needs more of it (see Camera). The order and the hand-overs are the package's.

## The gait (real proportions)

- **Steps:** 8 on wide screens; 6 on portrait phones, where the brief allows tuning the count. The stride stays real rather than shrinking the feet to dots.
- **Step length** 57 cm ±4 % (an unhurried stroll on soft sand), **step width** 13 cm ±10 %, **toe-out** 7°, a gentle meander of ±3.2 cm.
- **Alternation:** left, right, left… For every step the big toe faces the other foot (tested).
- **Overlap:** each press lasts 1.18 × the interval between heel strikes, so the next heel lands while the last foot is still pushing off its toes (a walk's double support; tested on every pair within the entry and within the walk). There is never more than one heel strike at a time. Between the entry prints and the walk the visitor scrolls the stage into place.

Timing at 1440 × 900 (pin 0.265):

| Step | Foot | Phase | Onset | Press | Depth (cm) |
|---|---|---|---|---|---|
| 1 | left | entry | 0.040 | 0.090 | 2.26 |
| 2 | right | entry | 0.112 | 0.072 | 1.99 |
| 3 | left | walk | 0.235 | 0.070 | 2.14 |
| 4 | right | walk | 0.292 | 0.070 | 2.11 |
| 5 | left | walk | 0.353 | 0.070 | 2.25 |
| 6 | right | walk | 0.413 | 0.070 | 2.22 |
| 7 | left | walk | 0.470 | 0.070 | 2.01 |
| 8 | right | walk | 0.530 | 0.070 | 2.09 |

At 390 × 844 (pin 0.298) the six steps start at 0.040 (entry), then 0.268, 0.330, 0.396, 0.459 and 0.524 (walk), each
pressing for 0.076. On a portrait screen a stride is a third of the stage's height, so only the first print is made
before the stage is held: a second would put the walk ahead of where the camera can follow (tested: every print is
made in view).

## Responsive layout

The foot is about 17 % of the stage's height on wide screens and 19 % on portrait screens (never over 165 px): 153 px
at 1440 × 900, 117 px at 390 × 844. On wide screens the walk runs **along the stage's diagonal** (24.7° at
1440 × 900), from just under the hero's edge to the lower right, so four prints are in view at once. On portrait
screens it runs straight down. The trail is laid out in world centimetres, so prints never slide relative to the sand.

**Camera.** It holds still during the entry, then glides along the walk at an even pace, eased only at its ends, and
stops as the last heel strikes. Every print is pressed **inside the stage**: its centre stays within 6–94 % of the width
and 14–88 % of the height (tested at its start and end, on desktop and phone layouts; checked on nine more sizes from
360 × 740 to 2560 × 1440, worst margin 4 %). The sand never moves much faster than the page scrolls:

| Viewport | Peak sand speed ÷ scroll speed |
|---|---|
| 1440 × 900 | 2.12 |
| 390 × 844 | 2.05 |
| 412 × 915 | 1.97 |
| 360 × 740 | 2.19 |
| 1280 × 720 | 1.96 |
| 1920 × 1080 | 1.58 |
| 1024 × 768 | 2.34 |
| 768 × 1024 (tablet portrait) | 2.50 |
| 844 × 390 (phone landscape) | 2.66 |

Below 2.2 is asserted for the desktop and phone layouts. Tablets in portrait and phones in landscape are faster and
listed as known.

## Determinism, reverse and seek

- `stateAt(p)` is pure: the same layout and p give the same state, whatever came before (tested by computing a list of p forwards and backwards).
- The camera is continuous: no jump between any two p 0.0005 apart.
- The frames drawn by the GPU: at every evaluated p, the pixel checksum of the frame drawn going forwards equals the one drawn going backwards. Evaluated at p = 0, .10, .20, .36, .48, .65, .80, 1 on 1440 × 900, 390 × 844 and 360 × 740 (WebKit), and in the e2e suite on both projects.
- Refreshing deep in the section, or jumping there, draws the state for that p directly. Nothing accumulates in any buffer.

## Hero and gallery unaffected

The hero's markup, CSS and film are unchanged. The hero tests (`test/hero.test.mjs`, the e2e "home hero" block, the face
clearance in `qa/hero.mjs`) pass unmodified, except for two slices that ended the hero at the first chapter: they now
end at the sand section, since the hero is unchanged and only its neighbour is new.

## Approval item

**M4:** the 8-step sequence with reversible scrolling (`qa/sand-*-storyboard.jpg`, `qa/motion-1280x800.mp4`), and the
section's length (one screen plus 200 svh on desktop and 170 svh on phones; shorter means a faster walk).
