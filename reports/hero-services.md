# The hero's words: report

Three requests of 7 Nov 2026 for the home hero, after the "Cape Town Good Times Banner" reference and a second
reference image:

1. **The services brief**, "Surgical Hero Enhancement — Services, Typography, Graphics & GSAP": the sentence, its
   brush mark and the four services (first previewed as deployment `88c5a509`).
2. "add the “Good Times Start Here!” and remove the “Find Your Good Time” leaf." (deployment `beaf5a1b`).
3. "add the explore our tours and experiences cta buttons, also lower the good times start here so there is some space
   between the logo and the slogan. reduce that dark masking so that the background is clear and visible"
   (deployment `2715d70f`).

The changes are additive, isolated and reversible: the hero section's own markup is unchanged apart from the leaf's
removal. Every check ran on the deployed Cloudflare preview: deployment `2715d70f`, built from `b9d25b7`, served at
https://naturally-preview.good-times-in-cape-town.pages.dev. Later commits touch only the QA scripts, the evidence and
the notes. Production is untouched.

## 0. One point to decide: how light the shade can be

You asked for less dark masking, so the background is clear. The navy behind the words is now 18–42 %, where it was
50–78 %. The words now get their legibility from a tight dark rim and a soft glow around each letter, not from a block
of shade.

The cost is measured contrast. The measure is strict: white against the brightest 10 % of the photograph behind each
line.

| Where | Lowest line | Without the rim | With the rim |
|---|---|---|---|
| Six wide sizes, 1440 × 900 to 2560 × 1440: all the words over the photograph | a service title or line, or the sentence | 2.3–2.4 : 1 | 2.5–2.8 : 1 |
| Shorter laptops, 1366 × 768 and 1280 × 800: the headline and the sentence over the photograph | "Good Times" | 1.9 : 1 | 2.0–2.1 : 1 |
| Tablets and phones: the headline in the hero's foot, the rest on navy | "Good Times" | 5.7–15 : 1 | 6.1–15.5 : 1 |

- **Before this round:** with the earlier shade, every services line over the photograph measured 5.4 : 1 or more
  (deployment `88c5a509`).
- **Not affected by this round:** a phone held sideways (932 × 430), whose headline measures 2.8 : 1, or 3.5 : 1 with
  the rim, as before.
- **The standard:** WCAG AA asks for 4.5 : 1 for small text and 3 : 1 for large text.
- **On screen:** the words read clearly in the screenshots, because the rim sits right around each letter.
- **The weak spot:** the services' small lines over the white apartment blocks.

Two ways forward:
- **Keep it as it is.** This is the look you asked for.
- **A slightly deeper shade behind the four services only.** The headline and the sentence stay on the clear
  photograph, and the small lines get back to AA.

## 1. What is in the hero now

- **The headline, "Good Times Start Here!"**
  - It replaces the Find Your Good Time leaf. The leaf's markup, styles and entrance act are gone.
  - "Good Times" is white; "Start Here!" is leaf green on a hand-painted lime swash (inline SVG).
  - It is set in Caveat 700, the site's handwriting face, tilted by 1.5°.
  - It is on two lines on phones, tablets and tall wide screens (992 px tall or more, as at 1920 × 1080), and on
    one line on laptops (as at 1440 × 900 and 1366 × 768).
- **The sentence**, exactly: "Private tours, airport transfers and authentic Cape Town experiences tailored for you."
  It is set in DM Sans 650, white and left-aligned.
- **The brush mark** under "tailored for you." is a lightweight inline SVG: one loaded stroke, pressed on the left and
  dragged out to a dry, split tail. It is in the brand's lime (`--green-lime-accent`). There are no yellow lines.
- **The four services**, each a forest-green line icon in a warm-white circle, a title and a centred line:

  | Icon | Title | Line |
  |---|---|---|
  | Camera | Private Tours | City, township & cultural experiences |
  | Minibus | Airport Transfers | Reliable, safe & comfortable travel |
  | Mountains | Adventure Add-ons | Wine, wildlife, scenic & outdoor experiences |
  | Small group | Custom Journeys | Personalised tours for individuals, families & groups |

  - **Icons:** from the site's own icon set. The van and the mountain were already there; the camera and the group were
    added in the same 24-unit, 1.5-stroke line style.
  - **Titles:** Bricolage Grotesque's display cut.
  - **Layout:** fine vertical rules separate neighbours. There are no cards, borders or panels.
- **The two calls to action**, the site's pills with their small leaf mark:

  | Button | Look | Goes to |
  |---|---|---|
  | Explore Our Tours | leaf-green pill | `tours/`, the Tours & Experiences page, all tours |
  | Our Experiences | glass pill with a white line | `tours/#adventure`, the same page with its Adventure filter pressed |

  Their labels and links live in `HERO_ACTIONS` (`src/partials/hero-services.mjs`). Pointing "Our Experiences"
  somewhere else is a one-line change.

## 2. Where it sits

The reference stacks the words in the lower left. In this hero the sleeping friend's face is exactly there. Nothing may
cover a face or change the crop, so the words are placed through the photograph's own crop (object-fit: cover, in the
poster's pixels), not by fixed offsets. They follow the frame at every size.

- **Wide screens, tall enough** (3:2 or wider, at least 1200 px wide and 848 px tall, as at 1440 × 900, 1536 × 864,
  1920 × 1080):
  - The headline, the sentence and the services sit together over the photograph's one faceless stretch, left of the
    group and above the sleeping friend's head.
  - The services are four in a row where that stretch is wide enough (large desktops), two by two below that.
  - The calls to action sit in the hero's foot, where the leaf was: the strip below the sleeping friend's chin.
- **Shorter laptops** (736–847 px tall, as at 1366 × 768 and 1280 × 800):
  - The headline and the sentence sit over the photograph, above the sleeping friend's head.
  - The calls to action sit in the hero's foot.
  - The four services sit immediately beneath the hero.
- **Phones, tablets, and narrow, square or very short windows:**
  - The headline sits bottom left in the hero, where the leaf was, below every face.
  - The sentence, the services and the calls to action follow the hero immediately, on the navy of the hero's band.
- **The shade:** a light veil of the hero's navy (18 % at the top, 42 % at the foot), feathered on every side. It sits
  behind the words only and ends before any face.
- **The space under the logo:** the stack is tighter (icons, gaps and line heights), so the headline's top sits lower.
  The gap from the bottom of the logo's line ("Make Unforgettable Experience In The Mother City") to the top of the
  headline:

  | Viewport | Before | Now |
  |---|---|---|
  | 1440 × 900 | 11 px | **39 px** |
  | 1470 × 956 | 35 px | 63 px |
  | 1536 × 864 | 32 px | 57 px |
  | 1512 × 982 | 41 px | 70 px |
  | 1680 × 1050 | 103 px | 131 px |
  | 1920 × 1080 | 127 px | 145 px |
  | 1366 × 768, 1280 × 800 | about 220 px | about 225 px |

## 3. Files changed

| File | What |
|---|---|
| `src/partials/hero-services.mjs` (new) | The headline, the sentence, the services and the calls to action as data; the swash and brush SVGs; the markup |
| `src/assets/css/hero-services.css` (new) | Layout and look: the three placements, the crop-based position, the shade, the rims, separators, `clamp()` sizes, container queries, print and forced colours |
| `src/assets/js/hero.js` | The hero's master timeline: the headline in the leaf's act, then the services and the calls to action (§4); the leaf's act removed |
| `src/pages/index.mjs` | The hero wrapped in `.hero-shell` (the block's positioning frame); the block after the hero section; the leaf removed; the stylesheet listed |
| `src/assets/css/styles.css`, `src/assets/css/buttons.css` | The hero leaf's rules removed |
| `src/partials/ui.mjs` | Two icons added to the icon set: `camera`, `group` |
| `test/hero-services.test.mjs` (new), `test/hero.test.mjs`, `test/cta.test.mjs`, `test/journey.test.mjs`, `test/e2e/site.spec.mjs` | The words, the calls to action and their links, the structure, the timeline; one new browser test for the calls to action |
| `qa/hero-services-shots.mjs`, `qa/hero-services-sheet.mjs`, `qa/hero-services-compare.mjs` (new); `qa/hero.mjs`, `qa/motion-robustness.mjs` | Captures, faces and collisions, contrast, entrance frames, before/after composites |
| `design/motion-bible.md`, `design/typography.md`, `design/font-design.md`, `design/button-design.md`, `design/button-tokens.md` | The entrance, the type and the buttons, recorded |

Against the services round (`d02bd6e`), the built site differs in five files only:
- `index.html`, `assets/js/hero.js` and `assets/css/hero-services.css`;
- `assets/css/styles.css` and `assets/css/buttons.css`, which lost only the hero leaf's rules.

No other page's HTML changed.

## 4. The GSAP timeline

There is no new timeline, ScrollTrigger, library or plug-in. The words are a segment of the hero's one master timeline
in `hero.js`. The headline takes the leaf's old moment (Act III, 2.2 s):

| Step | Starts (desktop) | Motion |
|---|---|---|
| The headline, with the shade behind the words | 2.2 s | Opacity 0 → 1, rising 16 px, 0.6 s. The shade fades in through a CSS variable the timeline tweens |
| Its swash | 2.4 s | Draws left to right: a clip-path inset, 0.5 s, `power2.inOut` |
| The sentence | 2.65 s | Opacity and a 14 px rise, 0.65 s, `power2.out` |
| The brush | 3.1 s | Draws left to right in one stroke, 0.55 s, `power2.inOut` (as the company statement draws) |
| The four services | 3.35 s | Each icon, title and line as one unit: opacity and a 12 px rise, 0.55 s, 0.12 s apart |
| The two calls to action | 3.75 s | Together, opacity and a 12 px rise, 0.55 s |

- **Timing.** Everything is in place by about 4.3 s, as the aircraft lands and the navigation titles follow. The
  entrance keeps its length: 5.8 s on desktop, 4.8 s on tablets, 3.2 s on phones, scaled as before.
- **Staging.** Opacity only, never visibility, so the words stay in the accessibility tree and stay selectable. The
  calls to action are in the tab order throughout, and a focused one shows at once. Everything is in the page from the
  first paint, so there is no layout shift.
- **When it plays.** Once per load. It finishes at once for a visitor already past the hero, on leaving the page, and
  under reduced motion or `?nomotion`, where all of it is simply there. The preview bar's **Replay the intro** replays
  it with the rest.
- **Afterwards.** Nothing moves.

Entrance frames: `qa/hero-services/compare/entrance-1440x900.jpg`, `entrance-1920x1080.jpg`.

## 5. Results (deployment `2715d70f`)

| Check | Result |
|---|---|
| `npm test` | **329 / 329** |
| `npm run check`, `npm run guard` | 25 pages, no problems; brand guard clean |
| Browser tests: the whole suite, desktop and Pixel 7 | **325 passed, 1 failed, 38 skipped**. This includes the new test that the calls to action lead to the tours and to their Adventure experiences. The one failure is the phone gallery's lift-out on a Pixel 7 (175 px against an expected 261), which fails the same way on the approved baseline (`reports/cloud-qa.md` §6) |
| The six viewports of the brief | In every one: no overlap with a face, the header or the phone; the calls to action clear of every face; no horizontal overflow; no console error or failed request; layout shift 0 to 0.004 |
| Eight more sizes: 2560 × 1440, 1680 × 1050, 1536 × 864, 1470 × 956, 1280 × 800, 1024 × 768, 1180 × 820, 932 × 430 | The same everywhere; layout shift 0 to 0.003 |
| Contrast | See §0 |
| Reduced motion | Everything shown at once, nothing moving, the swash and the brush whole |

## 6. Screenshots (`qa/hero-services/`)

| What | Where |
|---|---|
| Before (the hero as approved on 6 Nov) and after, at each of the six viewports | `compare/1920x1080.jpg`, `1440x900.jpg`, `1366x768.jpg`, `768x1024.jpg`, `390x844.jpg`, `360x740.jpg` |
| The entrance, frame by frame | `compare/entrance-1440x900.jpg`, `compare/entrance-1920x1080.jpg` |
| After: settled, the whole hero with the block, reduced motion; metrics | `after/` |
| The eight extra sizes | `extra/` |

Compared with the references:
- **Matched:**
  - the order: headline, sentence, brush, services, calls to action;
  - the handwritten headline with "Start Here!" on a lime swash;
  - the white bold sentence with the lime brush under its last words;
  - the warm-white circles with green line icons, and the separators;
  - the two buttons, filled and outlined;
  - the clear, lightly shaded photograph.
- **Different on purpose:**
  - The words sit higher than in the reference: above the sleeping friend's face, not across it.
  - The services are two by two on laptop screens.
  - The calls to action sit in the hero's foot, below the faces, rather than straight under the services.

## 7. Unchanged

- **The hero section's markup:** byte for byte, apart from the leaf's removal. It now sits inside `.hero-shell`. The
  words are a sibling after it, not inside it, and the tests check this.
- **The rest of the hero:** the photograph and film, their crop, the phone gallery, the logo, the navigation and the
  entrance's other acts, timings and length. The browser tests check that every element settles exactly where the
  static hero draws it.
- **Every other page and section:** no other page's output changed.

One knock-on effect: on phones, tablets and short windows, the block sits between the hero and the sand journey, so
the sand journey starts a little further down the page.
