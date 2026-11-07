# The hero's services: report

The owner's brief "Surgical Hero Enhancement — Services, Typography, Graphics & GSAP" (7 Nov 2026), after the "Cape Town
Good Times Banner" reference. Additive, isolated, reversible: the hero itself is unchanged. Every check ran on the
deployed Cloudflare preview: deployment `88c5a509`, built from `b9b21a6`, served at
https://naturally-preview.good-times-in-cape-town.pages.dev. Production is untouched.

## 0. One point to confirm: the headline

The brief asks to keep "the existing **Good Times Start Here!** headline" and to place the sentence beneath it. The
current hero has no such headline. Its only visible element in the lower left is the call to action. That call to
action read "Good Times start Here!" until your brief of 6 Nov 2026 renamed it **Find Your Good Time** and gave it the
signature leaf. The reference image appears to have been made from an earlier screenshot.

So nothing was added and nothing was renamed: the leaf stays as you approved it, and the new content sits with it in
the lower left. If you want the "Good Times Start Here!" lettering back as a headline above the leaf, say so. It would
be one more line in the same stack.

## 1. What was built

- **The sentence**, exactly: "Private tours, airport transfers and authentic Cape Town experiences tailored for you."
  It is set in DM Sans 650, white and left-aligned, at most three lines on wide screens.
- **The brush mark** under "tailored for you." is a lightweight inline SVG: one loaded stroke, pressed on the left and
  dragged to a dry, split tail. It is in the brand's lime (`--green-lime-accent`). There are no yellow lines anywhere.
- **The four services**, each a forest-green line icon in a warm-white circle (40–46 px), a title and a centred line:

  | Icon | Title | Line |
  |---|---|---|
  | Camera | Private Tours | City, township & cultural experiences |
  | Minibus | Airport Transfers | Reliable, safe & comfortable travel |
  | Mountains | Adventure Add-ons | Wine, wildlife, scenic & outdoor experiences |
  | Small group | Custom Journeys | Personalised tours for individuals, families & groups |

  The icons are the site's own icon set (the van and the mountain were already there; the camera and the group were
  added in the same 24-unit, 1.5-stroke line style). Titles use Bricolage Grotesque's display cut, the "slightly
  condensed" look of the reference without a new font. Fine vertical rules separate neighbours. There are no cards,
  borders or panels.

## 2. Where it sits

The reference stacks headline, sentence and services in the lower left. In this hero the sleeping friend's face is
exactly there, the call to action sits under his chin, and the brief forbids covering a face or changing the crop.

- **Wide landscape screens** (3:2 or wider, at least 1200 px wide and 736 px tall):
  - The block sits over the photograph's one stretch with no face: the left of the frame, above the sleeping friend's
    head and left of the curly-haired friend.
  - It is placed through the photograph's own crop (object-fit: cover, in the poster's pixels), not by fixed offsets,
    so it follows the frame at every size.
  - It shows four in a row where that stretch is wide enough (33rem: large desktops, as at 1920 × 1080 and
    2560 × 1440), two by two below that (laptops, as at 1440 × 900 and 1366 × 768).
  - A soft navy shade, feathered on every side, sits behind the words only and ends before any face.
- **Phones, tablets, and narrow, short or square windows**: the block follows the hero immediately, on the navy of the
  hero's band, with the same words and marks. Four in a row on tablets, two by two on phones. The hero above keeps its
  approved one-screen composition: picture, call to action, phone.

## 3. Files changed

| File | What |
|---|---|
| `src/partials/hero-services.mjs` (new) | HeroServices: the sentence, the four services as one data array, the brush SVG, the markup |
| `src/assets/css/hero-services.css` (new) | Layout and look: both placements, the crop-based position, the shade, separators, `clamp()` sizes, container query, print and forced colours |
| `src/assets/js/hero.js` | Three steps added to the hero's existing master timeline (§4) |
| `src/pages/index.mjs` | The hero wrapped in `.hero-shell` (the block's positioning frame); the block after the hero section; its stylesheet listed |
| `src/partials/ui.mjs` | Two icons added to the icon set: `camera`, `group` |
| `test/hero-services.test.mjs` (new), `test/e2e/site.spec.mjs` | Six unit tests; one browser test; one test helper made safe for SVG targets |
| `qa/hero-services-shots.mjs`, `qa/hero-services-sheet.mjs`, `qa/hero-services-compare.mjs` (new) | Captures, faces and collisions, contrast, entrance frames, before/after composites |
| `design/motion-bible.md`, `design/typography.md` | The entrance and the type, recorded |

The built site differs from the previous preview in exactly three files: `index.html`, `assets/js/hero.js` and the new
`assets/css/hero-services.css`. No other page changed.

## 4. The GSAP timeline

There is no new timeline, ScrollTrigger, library or plug-in. The services are a segment of the hero's one master
timeline in `hero.js`, after the call to action (Act III, 2.2 s):

| Step | Starts (desktop) | Motion |
|---|---|---|
| The sentence, with the shade behind it | 2.65 s (`cta+=0.45`) | Opacity 0 → 1, rising 14 px, 0.65 s, `power2.out`. The shade fades in through a CSS variable the timeline tweens |
| The brush | 3.1 s | Draws left to right in one stroke: a clip-path inset, 0.55 s, `power2.inOut` (as the company statement draws) |
| The four services | 3.35 s | Each icon, title and line as one unit: opacity and a 12 px rise, 0.55 s, 0.12 s apart, `power2.out` |

- **Timing.** Everything is in place by about 4.25 s, as the aircraft lands and the navigation titles follow. The
  entrance keeps its length: 5.8 s on desktop, 4.8 s on tablets, 3.2 s on phones, scaled as before.
- **Staging.** The block is staged with opacity only, so its words stay in the accessibility tree and stay
  selectable. It is in the page from the first paint, so there is no layout shift.
- **When it plays.** Once per load. It finishes at once for a visitor already past the hero, on leaving the page, and
  under reduced motion or `?nomotion` (all of it simply there). The preview bar's **Replay the intro** replays it with
  the rest.
- **Afterwards.** Nothing moves.

Entrance frames: `qa/hero-services/compare/entrance-1440x900.jpg`, `entrance-1920x1080.jpg`.

## 5. Results (deployment `88c5a509`)

| Check | Result |
|---|---|
| `npm test` | **329 / 329** (323 before, plus 6) |
| `npm run check`, `npm run guard` | 25 pages, no problems; brand guard clean |
| Smoke check, deployment and alias | **23 / 23** on both |
| Browser tests: the home hero (with the new hero-services test), the entrance, motion; desktop and Pixel 7 | **56 passed, 1 failed, 7 skipped** on `88c5a509` (and the same on `3f778476`). The one failure is the phone gallery's lift-out on a Pixel 7 (175 px against an expected 261), which fails the same way on the approved baseline (`reports/cloud-qa.md` §6) |
| The six viewports of the brief | In every one: no overlap with a face, the header, the call to action or the phone; no horizontal overflow; no console error or failed request; layout shift unchanged (0 to 0.004) |
| Eight more sizes: 2560 × 1440, 1680 × 1050, 1536 × 864, 1470 × 956, 1280 × 800, 1024 × 768, 1180 × 820, 932 × 430 | The same, everywhere |
| Contrast over the photograph | Every line **5.4 : 1 or more**, against the brightest 10% of the background behind it, measured without the words' own shadow (5.4–7.5 : 1 across the eight desktop sizes); beneath the hero, 16 : 1 |
| Reduced motion | Everything shown at once, nothing moving, the brush whole |

## 6. Screenshots (`qa/hero-services/`)

| What | Where |
|---|---|
| Before and after at each of the six viewports | `compare/1920x1080.jpg`, `1440x900.jpg`, `1366x768.jpg`, `768x1024.jpg`, `390x844.jpg`, `360x740.jpg` |
| The entrance, frame by frame | `compare/entrance-1440x900.jpg`, `compare/entrance-1920x1080.jpg` |
| After: settled, the whole hero with the block, reduced motion; metrics | `after/` |
| The eight extra sizes | `extra/` |

Compared with the reference:
- **Matched:** the order (sentence, brush, services), the white bold sentence, the lime brush under its last words,
  the warm-white circles with green line icons, and the separators.
- **Different on purpose:** the services sit higher than in the reference (above the sleeping friend's face, not
  across it), they are two by two on laptop screens, and the call to action stays as it is (§0).

## 7. Unchanged

- **The hero section's markup:** byte for byte, except that it now sits inside `.hero-shell`. The block is a sibling
  after it, not inside it, and the tests check this.
- **The hero itself:** the photograph and film, their crop, the call to action, the phone gallery, the logo, the
  navigation and the existing entrance (its acts, timings and length). The browser tests check that every element
  settles exactly where the static hero draws it.
- **Every other page and section:** no other page's output changed.

One knock-on effect: on phones, tablets and short windows, the block sits between the hero and the sand journey, so
the sand journey starts a little further down the page.
