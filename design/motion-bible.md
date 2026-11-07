# Motion bible: the home page

The owner's brief of 6 Nov 2026 (§8 to §10) asks for a home page that feels like a living Cape Town travel journal: each
major section with its own motion identity, the strongest effects at the story's turns, nothing random. This is the
record of what moves, when, why and who owns it. The signature leaf has its own sheet: `design/button-tokens.md`.

## 1. The rhythm

**Energetic introduction → playful hero → tactile footsteps → cinematic coastal reveal → lively experiences → human
connection → calm final invitation.**

| Beat | Section | Energy | Its gesture |
|---|---|---|---|
| Energetic introduction | The flying brand (§3) | High, brief | The logo's own aircraft flies a measured route and lands; the titles follow it |
| Playful hero | The hero and its phone (§3) | Lively but small | The people stay frozen in their moment; only the phone's gallery swipes |
| Tactile footsteps | The sand journey (§4) | Slow, scroll-held | Prints pressed one by one into real-looking sand, in walking order |
| Cinematic coastal reveal | The Cape Peninsula entrance (§4) | The strongest | The sand swept away, the coast settling into view, an editorial title sequence |
| Lively experiences | Ways, transfers, destinations, food (§5 to §9) | Varied, quick | Editorial wipes, arrival doors and a route, a carousel, a layered reveal |
| Human connection | People, the team, the reviews (§10 to §12) | Warm, restrained | A portrait opening from a mask; words in readable blocks; nothing moving while read |
| Calm final invitation | The invitation and the footer (§13, §15) | The calmest | A photograph rising out of the dusk; a gentle landing |

Contrast is deliberate: the two scroll-held scenes (the sand journey and the interlude) and the introduction carry the
big moves; everything between them plays once, briefly, and gets out of the way. Nothing loops but the hero phone's
gallery (which pauses off screen and on request) and the loading ring of a busy button.

## 2. Architecture (brief §9)

**Engine.** GSAP 3.15.0, self-hosted (`src/assets/js/vendor`, byte-identical to the npm package, standard licence:
`NOTICE.md`). No other animation engine. CSS keeps only state transitions (hover colours, the leaf's fill, a fade on
`[data-reveal]` leads, the sand canvas's 0.7 s arrival) that no timeline touches.

**Plug-ins, and why each is here.** Home page only unless noted.

| Plug-in | Used for | Why not without it |
|---|---|---|
| ScrollTrigger | Every scroll-linked or scroll-triggered moment (home, About, destinations and the tours with a culinary composition) | One scroll source, measured once, refreshed on load |
| MotionPathPlugin | The brand aircraft's route (§3) | The route is measured from the page; a path tween keeps the bank and the trail in step |
| Flip | The hero phone's photograph lifting into its dialog, the exhibition's prints | Morphing an element between two layouts |
| SplitText | The Cape Peninsula headline (lines and words, masked, re-split on resize) and the invitation's headline (words) | Splitting live text accessibly (one `aria-label`, the pieces hidden) and re-splitting when the width changes |
| CustomEase | `peninsulaRise` (the Peninsula headline) and `leafUnfurl` (the leaf, on the home page) | Two hand-drawn settles a stock ease cannot match |

Not used, and why: **ScrollSmoother** (a second scroll controller over native scroll; the sticky stages and the native
carousel need the real scroll), **Observer** and **Draggable/InertiaPlugin** (the carousel is a native scroller, swiped
natively), **DrawSVGPlugin** (`stroke-dashoffset` with `pathLength="1"` draws the leaf's midrib, the airport route and the
journey line as well), **MorphSVGPlugin** (no shape needs to morph).

**One scroll source.** Native scrolling. The two held scenes are CSS `position: sticky`, not ScrollTrigger pins, so
there is no pin spacer and nothing shifts. No smooth-scroll library.

**One clock.** GSAP's ticker. The sand renderer draws in the scrubbed tween's `onUpdate`; there is no other
`requestAnimationFrame` loop.

**The gate.** An inline script adds `html.cine` only when motion is allowed (no `prefers-reduced-motion: reduce`, no
`?nomotion`). Every controller checks it before creating anything. Without it, or without JavaScript, every page is
complete in its markup: photographs in place, words visible, leaves whole.

**Ownership.** One owner per property per element (the table in §16). Where two systems meet an element they take
different elements: the CSS hover zooms a way's `img`, GSAP settles its `picture`; the scene drift moves the drift
layer and the words block, the invitation's entrance moves what is inside them.

**Lifecycle.** The site is a static, multi-page build (no framework, no client-side routing), so a page's motion lives
as long as the page. New responsive work runs inside `gsap.matchMedia()` (the four ways, the invitation, the footer,
`culinary.js`), which reverts every tween and trigger it made when its conditions change, including reduced motion
switched on mid-visit. Entrances that play once kill their trigger (`once: true`) and clear their inline styles when
done (`clearProps`). `pagehide` frees the WebGL context and the phone gallery's listeners.

**Refreshes.** `ScrollTrigger.refresh()` once, on `load`, after lazy images have set their heights; SplitText re-splits
only when the split element's width changes (its own ResizeObserver) or a font finishes loading. No refresh loops.

**Nothing invisible.** Focus inside any staged section shows it whole at once (keyboard users never meet invisible
content). The home controller has a safety net: 2.5 s after `load`, any entrance that has not started for something
already in or above the view is shown whole. `main.js` has the same for `[data-reveal]`.

## 3. The introduction and the hero (brief §8.1, §8.2)

| | |
|---|---|
| Narrative purpose | Energy and identity: the brand arrives, the people stay frozen in their good time |
| Trigger | Page load (once per load). The **Replay the intro** control in the preview bar replays it |
| ScrollTrigger | None. Scrolling during the flight lands the aircraft at once |
| Sequence | The wordmark and Book Now; the logo's green airliner flies in from the left along the logo's dotted route and lands as the "i" of "in" (`brand-plane.js`, MotionPathPlugin); its landing starts the navigation titles one by one; the hero's **Find Your Good Time** rises into its corner and unfurls as a leaf (2.2 s); the company statement is drawn in under the logo once the logo is whole (0.5 s); last, the header's **Plan My Day** leaf unfurls |
| Duration | About 5.8 s on desktop, 4.8 s on tablets, 3.2 s on phones (no header leaf below 40em) |
| Easing | `power2.out` for the arrivals; the leaf's `leafUnfurl`; the flight's own derived curve |
| Stagger | The titles, one after another from the landing |
| Scrub or playback | Played (a master timeline, `hero.js`) |
| Pinning | None |
| Properties | Opacity and small transforms (y, a touch of scale); the aircraft's transform along its path; the statement's clip |
| Responsive | Only what is rendered takes part (no desktop titles on phones, no Book Now below 640 px) |
| Reduced motion | Nothing hidden, nothing moves; the logo is whole |
| Cleanup owner | `hero.js` (the timeline completes once; resize or scroll mid-flight lands it) |
| Performance | The renderer of §4 waits until the intro is done (or the first scroll), so no shader compiles under the flight |

**The phone gallery** (`phone-gallery.js`): one repeating swipe timeline (hold, push, flick, glide, settle; holds vary),
the track's `xPercent` only; pauses off screen, when the tab is hidden, while a photograph is lifted and on its play or
pause key (WCAG 2.2.2). A tap lifts the photograph into a dialog (Flip). The hero photograph itself never moves.

## 4. The Cape Peninsula: footprints and "The Coast Reveals Itself" (brief §7, §8.3, §8.5)

The home page's signature scene (`sand-journey.mjs`, `sand-journey.js`, `motion/sand/`). One section, one held stage,
one scrubbed progress value `p`, and one triggered title sequence.

| | |
|---|---|
| Narrative purpose | The visitor walks out of the hero and arrives somewhere unforgettable: footprints, then the coast, then the invitation to that day |
| Trigger | One ScrollTrigger, scrubbed (`scrub: 0.45`), for phases 1 to 3; phases 4 to 7 are a separate, time-based entrance the scroll triggers |
| ScrollTrigger start | `top 72%` (the section's top 72% down the screen, the hero still in view) |
| ScrollTrigger end | `bottom bottom` |
| Pinning | CSS sticky, no pin: the section is `100svh` plus 200svh of travel (170svh on phones and portrait screens) |
| Reduced motion, `?nomotion`, no WebGL, `?sand=static` | The revealed photograph with its words and link, one screen tall; the words fade in once (opacity). Nothing split, nothing scaled |
| Cleanup owner | `sand-journey.js` (the renderer is destroyed on `pagehide` and on any failure, falling back to the static scene in place) |

Phases (p is the scrubbed progress):

| Phase | p or time | What happens | Properties | Easing |
|---|---|---|---|---|
| 1. Final footstep | 0.04 to 0.60 | The first print forms under the hero's edge; the others are pressed one after another as the camera glides along the walk; the last lands at 0.60, its rim and shadow deepening as the sand is displaced | WebGL (the renderer draws p; nothing on the DOM) | The walk's own envelopes |
| 2. Sand transition | 0.605 to 0.95 | Curved brushing passes sweep the sand away from the last prints outwards, heaps and spilled grains at their edges; what remains crumbles; the photograph's own prints are where the animated ones were | WebGL alpha | Linear in p |
| 3. Coastal reveal | 0.44 to 0.93 | The view leans in towards where the footsteps lead (the last print and her feet) over the last steps, then settles back to the photograph's own framing as the sand clears, so the coast opens out. Sand and photograph scale together about the same point, so the trail stays registered. No horizon to keep: the photograph looks straight down at the beach | `transform: scale()` on the canvas, the photograph and its film | Smoothstep in p |
| 4. Eyebrow | +0 s (from p 0.84) | "Cape Peninsula · Coastal journey" rises 14 px and fades in | opacity, y | `power2.out`, 0.5 s |
| 5. Headline | +0.22 s | "Look where your footsteps led." Its words rise through a mask per line (SplitText `lines,words`, `mask: 'lines'`, re-split when its width changes), staggered | yPercent 118 → 0 | `peninsulaRise` (CustomEase: a quick lift, a long settle, a 1.5% overshoot inside the mask), 1.0 s each, 0.06 s apart: 1.24 s in all |
| 6. Supporting copy | +0.95 s | The line rises 18 px and fades in | opacity, y | `power2.out`, 0.7 s |
| 7. Leaf CTA | +1.55 s | **Explore the Cape Peninsula Tour** unfurls from its stem, its midrib drawing (leaf.js); clickable at every moment | the leaf's drawing only | `leafUnfurl`, 0.8 s |
| 8. Handoff | after p 1 | The sticky stage releases and the page simply scrolls on; nothing else is held | none | |

The entrance plays once the sand has cleared (p 0.84; the sand is all but gone by 0.80) and runs back at twice the
speed if the visitor scrolls back above p 0.80. A renderer arriving while the scene is on screen runs it back in 0.7 s,
never in one frame. A lost WebGL context shows the static scene at once. Focus anywhere in the words shows them at once;
while they wait they take no clicks, but can still be focused.

| Responsive | Desktop | Tablets (to 63.99em, or portrait) | Phones (to 47.99em) |
|---|---|---|---|
| Phase 3 scale | 4% | 2.5% | 1.5% |
| Phases 4 to 7 | 2.4 s in all | × 0.88 | × 0.8 (2.1 s) |
| Words | In the sand above and below the trail | Under the photograph's frame | Under the frame |
| Travel | 200svh | 170svh | 170svh |

Performance: the renderer (WebGL2) loads after the intro or at the first scroll, never on the hero's critical path;
it draws only when p changes; it drops to a lite tier (fewer pixels and grains, no cast shadows) when frames are
measured slow. The scale is a compositor-only transform. The film plays only when the scene is on screen and the
sweep is near, never with the data saver on.

## 5. Between the coast and the ways

| Section | Purpose | Trigger and timing | Properties | Responsive and reduced motion | Owner |
|---|---|---|---|---|---|
| Credentials strip | Trust, quietly | Its lead fades once (`[data-reveal]`, CSS, 0.7 s) | opacity, 12 px | Static without motion | `main.js` |
| 01 · The coast road (scene) | The day opens out | Words: `top 66%`, played and reversed (0.9 s, `power2.out`, 0.09 s apart). Drift from 48em: `top bottom` to `bottom top`, scrubbed | opacity, y; the photograph's yPercent ±5, the headline's y ±36 | Phones: a still, correctly cropped photograph | `living-cape.js` |
| The best bits (memory) | One personal moment | The photograph rises once (`top 85%`, 0.7 s) | autoAlpha, y 28 | | `living-cape.js` |
| The moments | The bits in between | The collage rises once as one stagger (`top 85%`, 0.7 s, 0.1 s apart); from 64em some prints travel faster or slower (scrubbed) | autoAlpha, y; yPercent ±7 | No depth below 64em | `living-cape.js` |
| The interlude | A breath between chapters | Two backdrops held by CSS sticky; each settles from 1.10 or 1.14 to 1 (scrubbed); the second darkens the first (shade 0 → 0.55, scrubbed); each beat's words rise (`top 82%`, played and reversed) | scale, opacity | The layering is plain scrolling without motion | `living-cape.js` |

## 6. Tour discovery: the four ways (brief §8.4)

| | |
|---|---|
| Narrative purpose | Choosing the day: the photographs are the attraction, presented like an editorial spread |
| Trigger | One ScrollTrigger per card, `top 84%`, once |
| Sequence | The photograph opens from the side it sits on (left column from the left, right column from the right, a beat later); its picture settles from depth; then the name, the line, the facts and the action, the action last |
| Duration | About 1.2 s a card (1.0 s wipe, 1.3 s settle overlapping, words from 0.38 s) |
| Easing | `power3.out` (the wipe), `power2.out` (the settle and the words) |
| Stagger | 0.08 s between the words; 0.12 s between the two columns |
| Scrub or playback | Played once |
| Pinning | None |
| Properties | `clip-path: inset()` with the frame's rounded corners (removed when done); the `picture`'s scale 1.08 → 1; the words' opacity and y 18 |
| Responsive | Phones: the thumbnail opens upward (0.7 s), the picture from 1.04, the words travel 10 px |
| Reduced motion | Nothing hidden or moved (no `[data-reveal]` on the cards any more: GSAP owns them, so they are visible without it) |
| Cleanup owner | `living-cape.js` (`gsap.matchMedia`: reverted and rebuilt across 48em) |
| Performance | Clip-path and transforms only; the card is a link throughout and focus inside shows it whole. The CSS hover zoom stays on the `img` |

## 7. Transfers: from arrival to adventure (brief §8.6)

The airport way among the four is the home page's transfer moment, with its own identity.

| | |
|---|---|
| Narrative purpose | Arrival: the doors open, the road from the airport to the stay, then the service |
| Trigger | As §6 (`top 84%`, once) |
| Sequence | The photograph (the terminal's welcome banner, traveller 11) opens from the middle outwards, like an arrivals hall's doors (1.15 s); the route's open point appears, the route draws from the airport to the stay, its closed point lands; then the name, line, facts and **Arrange My Transfer**, last |
| Duration | About 2 s |
| Easing | `power3.inOut` (the doors), `power1.inOut` (the route), `back.out(2)` (the two points) |
| Properties | `clip-path` (inset from the middle); `stroke-dashoffset` 1 → 0 on a `pathLength="1"` path; the points' scale |
| Responsive | The route is 7.5 rem on wide screens, 5.5 rem on phones |
| Reduced motion | The route is drawn in full; nothing moves |
| Cleanup owner | `living-cape.js` |
| Notes | No vehicle or aircraft crosses the photograph; the route is a decorative SVG (`aria-hidden`), not a map |

## 8. Destinations: the carousel and the scenes (brief §8.7)

| | |
|---|---|
| Narrative purpose | Which side of the Cape first: real destination photography, chosen by the visitor |
| Trigger | Interaction (arrows, keys, a click, a drag, a swipe), never autoplay |
| Sequence | From 48em the active card widens; a change of destination is one timeline: widths and scroll position settle together, the new photograph settles from 1.045 and its words rise out of their mask |
| Duration | 550 to 750 ms |
| Easing | `power3.inOut` |
| Pinning | None |
| Properties | width, scrollLeft, scale, the words' y within a mask |
| Responsive | Below 48em every card is the same width and the swipe is native |
| Reduced motion | Every change immediate |
| Cleanup owner | `media.js` (an interruption kills the timeline where it stands) |

The full-bleed scenes (01, 07 and the invitation) drift a little slower than the page from 48em (§5); their photographs
are the site's own.

## 9. Food and culture: the culinary reveal (brief §8.8)

`culinary.js`, "Good views. Better pours.": the landscape opens from a soft inset and settles from 1.06 (1.1 s); once it
is established the food photograph rises 40 px out of its mask (0.9 s, `power3.out`, at 0.75 s); then the brass rule
draws and the words and caption follow (0.08 s apart). Once, at `top 72%`. On the scroll the landscape and the plate
drift at different speeds (scrubbed, wide screens). Phones: less travel, no landscape drift. `gsap.matchMedia` reverts it
all. Its Winelands and destinations variants (the diptych, the quiet moment) follow the same rules.

## 10. People: the people chapter (brief §8.9, home)

The guide's portrait opens once from a mask (`clip-path` inset 12% → 0 with the frame's corners, 0.9 s, `power3.out`;
the photograph from 1.02, 0.8 s; `top 88%`); the two smaller prints rise as a group and, from 64em, travel at slightly
different speeds. The three promises fade once (`[data-reveal]`, CSS). Faces are never animated.

## 11. About › Meet our team (brief §8.9)

| | |
|---|---|
| Narrative purpose | Trust and warmth: the people behind the days out |
| Trigger | ScrollTrigger `top 72%`, once (`culinary.js`, the **portrait** choreography) |
| Sequence | The team photograph opens from a clean, rounded inset, its corners easing from soft to the frame's own, and settles from 1.06; then the eyebrow, the name ("Founded by Stuart Matanhire.") and the words in a restrained stagger; then the caption |
| Duration | About 1.5 s |
| Easing | `power3.out` (the mask), `power2.out` |
| Stagger | 0.1 s |
| Properties | clip-path (removed when done), the `picture`'s scale, the words' opacity and y |
| Responsive | Phones: 12 px of travel, no drift; wide screens: a slight scrubbed drift of the photograph |
| Reduced motion | In place; nothing moves |
| Cleanup owner | `culinary.js` (`gsap.matchMedia`) |
| Notes | Opacity, not visibility: the words stay in the accessibility tree. The photograph shown is the one the page had before 6 Nov; whether it is the Aquila Game Reserve photograph is for the owner to confirm (`reports/client-corrections.md`) |

## 12. Testimonials (brief §8.10)

A grid of real reviews, several in view at once, nothing moving by itself (`reviews.js`): the earlier auto-advancing
carousel was removed so nothing moves while someone reads. **Show more reviews** opens the rest (a real button with
`aria-expanded`). The lead fades once (`[data-reveal]`). No review text, rating or date is generated or altered.

## 13. The invitation (brief §8.11)

| | |
|---|---|
| Narrative purpose | The emotional close: "Your Cape Town story starts here." An invitation to enquire, not an effect |
| Trigger | ScrollTrigger `top 62%`, once: it never hides again |
| Sequence | The photograph (Camps Bay below the Twelve Apostles) comes up out of the dusk (its layer 0.3 → 1, 1.5 s) and settles from 1.08 (2 s); the seal and the chapter mark; the headline's words rise and clear one after another (SplitText words: softer than the Peninsula's line masks); the line; **Plan My Day** unfurls (the scene owns its leaf) and **Arrange My Transfer** appears beside it |
| Duration | About 2.7 s on wide screens, × 0.8 on phones |
| Easing | `power1.out` (the light), `power2.out`, `power3.out` (the words), `leafUnfurl` |
| Stagger | 0.07 s between the headline's words |
| Properties | opacity and scale (the photograph), opacity and y / yPercent (the words) |
| Responsive | × 0.8 timings on phones; the shared scene drift from 48em |
| Reduced motion | The scene as it is; nothing hidden |
| Cleanup owner | `living-cape.js` (`gsap.matchMedia`); the golden thread under the seal keeps its own short draw (1.4 s) |

## 14. The gallery, golden hour and "easy does it"

- **The exhibition** (`media.js`): each tile rises once as it enters (only tiles entering together are staggered); a
  print opens in a modal dialog, lifting into it with Flip on wide screens with a fine pointer.
- **07 · Golden hour** (scene): as §5's scenes.
- **08 · Easy does it**: the route between the three steps draws as they scroll into view (scrubbed, `top 82%` to
  `bottom 60%`, `scrub: 0.6`); each stop pops in (`back.out(2)`) as the line reaches it. The **Get a Quote** leaf
  unfurls once as it comes into view (`leaf.js`).

## 15. The footer (brief §8.12)

| | |
|---|---|
| Narrative purpose | A gentle landing after the journey: the calmest moment on the page |
| Trigger | ScrollTrigger `top 90%`, once (home page only) |
| Sequence | The logo comes up (8 px, 0.7 s), the company statement fades in after it (0.5 s), then the groups (the brand column's text, contact and social links, then each list) in a short stagger |
| Duration | About 1.2 s |
| Easing | `power2.out` |
| Stagger | 0.07 s |
| Properties | opacity, y |
| Pinning | None, and nothing over the contact details |
| Hover | Links fade their colour and underline in 0.2 s (CSS; instant with reduced motion) |
| Reduced motion | In place |
| Cleanup owner | `living-cape.js` (`gsap.matchMedia`) |

## 16. Ownership: who moves what

| Element | Property | Owner |
|---|---|---|
| The aircraft, the logo mask | transform, visibility | `brand-plane.js` (nested in `hero.js`) |
| Header titles, Book Now, the hero CTA, the statement | opacity, y, clip | `hero.js` |
| Every leaf's drawing (`.leaf-btn__shape`, its veins, its label) | transform, opacity, dash offsets | `leaf.js` (entrance played by the scene that owns the leaf: `hero`, `intro`, `sand`, `invite`; otherwise as it comes into view); hover and press wait while an entrance plays |
| The phone gallery's track | xPercent | `phone-gallery.js` |
| The sand canvas, the beach photograph and its film | WebGL; transform (scale) | `sand-journey.js` |
| The Peninsula's words | opacity, transforms (SplitText pieces) | `sand-journey.js` |
| The scenes' drift layer and headline block | yPercent, y (scrubbed) | `living-cape.js` |
| The scenes' words (not the invitation's) | opacity, y | `living-cape.js` |
| The invitation's photograph layer, picture and words | opacity, scale, y | `living-cape.js` (invitation) |
| The ways' photo frames, pictures and words | clip-path, scale, opacity, y | `living-cape.js` (ways) |
| A way's `img` on hover | transform | CSS |
| Culinary compositions, About's pair and portrait | clip-path, scale, opacity, y | `culinary.js` |
| Carousel and exhibition | width, scroll, scale, Flip | `media.js` |
| `[data-reveal]` (leads, About's other sections, inner pages) | opacity, transform | CSS, toggled by `main.js` |

## 17. Performance

Transforms and opacity first; clip-path only during one-off entrances, removed afterwards; no continuous filters (the
leaf's drop shadow is static); no DOM particles (the sand's grains are WebGL points). Every photograph below the fold is
lazy and responsive (AVIF and WebP); the hero's poster is eager and the only image preloaded. SplitText and CustomEase
(15 KB, about 7 KB compressed) load on the home page only. The measured effect is in `reports/performance-review.md`.

## 18. QA hooks

`window.__heroEntrance` (the intro), `window.__brandPlane`, `window.__sandJourney` (`p`, `renderAt`, `checksum`,
`words`, `split`, `reveal()`, `placement()`), `window.__livingCape` (`invite`, `journey`), `window.GTLeaf`. Tests:
`test/e2e/motion.spec.mjs`, `test/e2e/site.spec.mjs`, `test/journey.test.mjs`; captures: `qa/peninsula-entrance.mjs`.
