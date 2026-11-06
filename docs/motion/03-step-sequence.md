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
| 0.605–0.80 | Long, gently curved brushing passes in parallel rows sweep the sand off, first along the trail, then outwards; the stage is clear by about 0.80 at every size measured (04) |
| 0.76–0.95 | What the passes leave at their edges crumbles away, next to swept ground first |
| 0.84–0.97 | The eyebrow, the headline, the line and the link rise in, one after another (07) |

This differs from the package's first-experiment numbers (steps .06–.48, sweep .48–.92). The entry phase
(the stage scrolling in under the hero) takes the first quarter of the scroll, and keeping the walk at a calm pace
needs more of it (see Camera). The order and the hand-overs are the package's.

## The gait (real proportions)

Since 6 Nov 2026 the walk ends on the destination image's own trail (07): **its last four steps are the image's four
prints**, in their places, headings and feet (right, left, right, left) and at their size. The steps before them
continue the image's walk backwards.

- **Steps:** 8 on wide screens; 6 on portrait phones, where the brief allows tuning the count. The stride stays real rather than shrinking the feet to dots.
- **Step length** the image's own: about 48 cm (46–52 cm, 1.95 foot lengths, an unhurried walk on soft sand). **Step width** the image's: about 9 cm between the two feet's tracks. **Toe-out** 4° plus each step's own variation. Before the image's prints the walking line turns away from the image's direction gradually (4.5° a step on average, the turn growing with distance), so the walker comes in more level from the left.
- **Alternation:** right, left, right… (the walk starts on the right foot so that it ends on the image's left foot). For every step the big toe faces the other foot (tested).
- **Overlap:** each press lasts 1.18 × the interval between heel strikes, so the next heel lands while the last foot is still pushing off its toes (a walk's double support; tested on every pair within the entry and within the walk). There is never more than one heel strike at a time. Between the entry prints and the walk the visitor scrolls the stage into place.

Timing at 1440 × 900 (pin 0.265, the header 113 px):

| Step | Foot | Phase | Onset | Press | Depth (cm) | |
|---|---|---|---|---|---|---|
| 1 | right | entry | 0.040 | 0.090 | 2.26 | |
| 2 | left | entry | 0.105 | 0.072 | 1.99 | |
| 3 | right | walk | 0.235 | 0.070 | 2.14 | |
| 4 | left | walk | 0.292 | 0.070 | 2.11 | |
| 5 | right | walk | 0.352 | 0.070 | 2.25 | the image's print 1 |
| 6 | left | walk | 0.414 | 0.070 | 2.22 | the image's print 2 |
| 7 | right | walk | 0.469 | 0.070 | 2.01 | the image's print 3 |
| 8 | left | walk | 0.530 | 0.070 | 2.09 | the image's print 4 |

At 390 × 844 (pin 0.298) the six steps start at 0.040 and 0.105 (entry), then 0.268, 0.346, 0.427 and 0.506 (walk,
the image's four prints), each pressing for 0.094. The first two prints are placed so both clear the sticky header by
8 px once the stage is held, measured by each print's real height on screen (tested: every print is made in view).

## Responsive layout

The foot is the image's print at the image's scale where the page places it (07): 114 px at 1440 × 900, 152 px at
1920 × 1080, 82 px at 768 × 1024, 55 px at 390 × 844, 32 px on a phone held sideways (844 × 390). The walk runs
**along the image's own trail** (about 23° below the horizontal) on every layout, from just under the hero's edge to
the lower right, so four prints are in view at once. The trail is laid out in world centimetres, so prints never slide
relative to the sand.

**Camera.** It holds still during the entry, then glides along the walk at an even pace, eased only at its ends, and
stops as the last heel strikes, **in the image's own framing**: from then on the animated prints lie exactly over the
image's (07). Every print is pressed **inside the stage**: its centre within 4–96 % of the width, clear of the header by
30 % of a foot, and above 88 % of the height (tested at its start and end on the desktop and phone layouts). The sand
never moves much faster than the page scrolls (the walk is now the image's, shorter on screen than the first build's):

| Viewport | Peak sand speed ÷ scroll speed |
|---|---|
| 1440 × 900 | 1.33 |
| 1366 × 657 | 1.73 |
| 1280 × 720 | 1.47 |
| 1920 × 1080 | 1.48 |
| 2560 × 1440 | 1.49 |
| 1024 × 768 | 1.23 |
| 768 × 1024 (tablet portrait) | 0.67 |
| 412 × 915 | 0.76 |
| 390 × 844 | 0.78 |
| 360 × 740 | 0.56 |
| 844 × 390 (phone landscape) | 0.84 |

Below 2.2 is asserted for the desktop and phone layouts; every size measured is now below 1.8.

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

**M4:** the 8-step sequence with reversible scrolling (`qa/sand-*-storyboard.jpg`, `qa/motion-1280x800.mp4`, both
re-made with the destination image on 6 Nov 2026), and the
section's length (one screen plus 200 svh on desktop and 170 svh on phones; shorter means a faster walk).
