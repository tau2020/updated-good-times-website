# The hero's words: report

Four requests of 7 Nov 2026 for the home hero, after the "Cape Town Good Times Banner" reference and a second
reference image:

1. **The services brief**, "Surgical Hero Enhancement — Services, Typography, Graphics & GSAP": the sentence, its
   brush mark and the four services (first previewed as deployment `88c5a509`).
2. "add the “Good Times Start Here!” and remove the “Find Your Good Time” leaf." (deployment `beaf5a1b`).
3. "add the explore our tours and experiences cta buttons, also lower the good times start here so there is some space
   between the logo and the slogan. reduce that dark masking so that the background is clear and visible"
   (deployment `2715d70f`).
4. "push this block … down … bottom … so it sits just above explore our services and our experiences buttons, also do
   it proffesionally, increase font size … research on how to make that block look very nice and fit seamlessly into
   that hero view. also make sure everything looks nice and proper on the mobile" (deployment `750f6564`).

The changes are additive, isolated and reversible: the hero section's own markup is unchanged apart from the leaf's
removal. Every check ran on the deployed Cloudflare preview: deployment `750f6564`, built from `ee1e055`, served at
https://naturally-preview.good-times-in-cape-town.pages.dev. Later commits touch only the evidence and the notes.
Production is untouched.

## 0. Two points for the owner

- **The sleeping friend.** The words now sit just above the buttons, as asked. On laptops and desktops that is where the
  sleeping friend lies at the table, so the sentence and the services sit over his head. The four friends above him
  stay clear at every size. Keeping his face clear as well would mean leaving the gap you asked to close.
- **Contrast.** The corner shade and the headline's own glow carry the words, and much more strongly than last round.
  The measure is strict: white against the brightest tenth of the photograph behind each line.
  - The headline reaches 3.1:1 or more counting its rim, which is the bar for large text.
  - The titles reach 5.4:1 or more.
  - The small service lines reach 4.0–6.5:1. Four of the eight wide sizes fall just short of the 4.5:1 bar for small
    text, at 4.0–4.4:1. A slightly deeper corner shade would lift them over it, at the cost of a darker bottom-left
    corner.
  - Last round the weakest line measured 1.9–2.4:1.

## 1. What the research says, and how it is applied

- **A gradient, not a flat overlay.** Guidance on text over photographs favours a scrim that is darkest where the words
  sit and fades to clear, rather than an even overlay that drains the picture. For a hero, that means dark at the
  bottom and clear at the top.
  - Applied: navy rising from the hero's bottom-left corner (62 % at the corner, about 45 % under the services) and
    fading to nothing at its top and right edges, before any of the four faces. The sky, the mountain and the town
    stay clear, as you asked earlier.
- **Glass panels suit large text only.** Blur and frosted panels help large display text more than small lines.
  - Applied: no panel. The words carry a tight dark rim and a soft glow of their own.
- **Contrast targets.** WCAG asks for 4.5 : 1 for small text and 3 : 1 for large text, over images too.
  - Applied: every deployment is measured (§6).
- **A short hero.** A hero should hold a headline, a line of text, the picture and the calls to action. A four-up icon
  strip is a recognised extra.
  - Applied: one left-aligned group, in reading order (headline, sentence, services, buttons). It is aligned with the
    logo and sits on the hero's own bottom gap, level with the phone.

Sources: [readable text on images](https://nidwolf-com.pages.dev/articles/tip-22-text-on-image.html),
[text over images](https://www.digitalthriveai.com/en-us/resources/web-design/design-considerations-text-images/),
[contrast over images](https://docs.acquia.com/md/web-governance/does-text-over-images-or-background-have-minimum-contrast),
[a 40 % scrim](https://generatepress.com/forums/topic/using-a-scrim-to-get-readable-white-text-over-background-image/),
[a four-up feature strip](https://www.shadcnblocks.com/block/hero290),
[a minimal hero](https://webservices.courts.ca.gov/design-system/component-library/hero).

## 2. What is in the hero now

- **The headline, "Good Times Start Here!"**
  - It replaces the Find Your Good Time leaf. The leaf's markup, styles and entrance act are gone.
  - "Good Times" is white; "Start Here!" is leaf green on a hand-painted lime swash (inline SVG).
  - It is set in Caveat 700, the site's handwriting face, tilted by 1.5°, on two lines wherever it heads the words.
- **The sentence**, exactly: "Private tours, airport transfers and authentic Cape Town experiences tailored for you."
  It is set in DM Sans 650, white and left-aligned, with a lime brush mark under "tailored for you.".
- **The four services**, each a forest-green line icon in a warm-white circle, a title and a centred line:

  | Icon | Title | Line |
  |---|---|---|
  | Camera | Private Tours | City, township & cultural experiences |
  | Minibus | Airport Transfers | Reliable, safe & comfortable travel |
  | Mountains | Adventure Add-ons | Wine, wildlife, scenic & outdoor experiences |
  | Small group | Custom Journeys | Personalised tours for individuals, families & groups |

- **The two calls to action**, the site's large pills with their small leaf mark:

  | Button | Look | Goes to |
  |---|---|---|
  | Explore Our Tours | leaf-green pill | `tours/`, the Tours & Experiences page, all tours |
  | Our Experiences | glass pill with a white line | `tours/#adventure`, the same page with its Adventure filter pressed |

- **Larger type** (this round). "Before" is at 1440 × 900, and the figures in brackets are at the same size. Sizes on
  wide screens follow the screen's height, so the group always fits under the header:

  | | Before | Now, wide screens | Now, phones and tablets |
  |---|---|---|---|
  | Headline | 41 px | 46–80 px (63 px) | 29–38 px on phones, 56 px on a tablet |
  | Sentence | 18 px | 17–26 px (22 px) | 18–22 px |
  | Service titles | 15.7 px | 14.5–21 px (16.4 px) | 16–18 px |
  | Service lines | 13.4 px | 13.5–18 px (14.9 px) | 14–15 px |
  | Buttons | 15 px | 17–21 px | 17 px, full width on phones |

## 3. Where it sits

- **Laptops and desktops** (wide enough for the faces to leave the group its room: 3:2 or wider from 1440 px, 8:5 from
  1280 px, 5:3 from 1200 px; 576 px tall or more):
  - The whole group sits at the photograph's bottom left: the headline, the sentence, the four services in one row,
    then the two buttons.
  - It sits on the hero's own bottom gap, level with the phone, and is aligned with the logo.
  - It is placed in the photograph's own pixels through its crop. The headline and the sentence keep left of the
    curly-haired friend, and the services and the buttons left of the brunette, below every chin.
- **Phones and tablets:**
  - The headline sits bottom left in the hero, below every face.
  - The sentence, the services (two by two on phones, four in a row on tablets) and the two buttons follow it on the
    navy. On phones the buttons are full width, one above the other.
- **Other shapes** (1200 × 800, tablets held sideways, and other near-square or very short windows): the headline sits
  in the strip under the sleeping friend's chin, and the rest follows beneath the hero.

## 4. Files changed

| File | What |
|---|---|
| `src/partials/hero-services.mjs` | The headline, sentence, services and calls to action as data; the swash and brush SVGs; the markup. The buttons are now the large pills |
| `src/assets/css/hero-services.css` | Layout and look: the group at the bottom left on wide screens, the corner shade, the headline's own glow, the larger type, full-width buttons on phones |
| `src/assets/js/hero.js` | Unchanged this round: the entrance (§5) |
| `src/pages/index.mjs`, `src/assets/css/styles.css`, `src/assets/css/buttons.css`, `src/partials/ui.mjs` | Unchanged this round (the hero shell, the leaf's removal, the icons) |
| `test/hero-services.test.mjs`, `test/e2e/site.spec.mjs` | The new placement and the large buttons |
| `qa/hero-services-shots.mjs`, `qa/hero.mjs` | The sleeping friend may lie under the words on wide screens (recorded); any of the four faces still fails |
| `design/typography.md`, `design/button-tokens.md`, `design/motion-bible.md` | The sizes, the buttons and the timing, recorded |

Against the previous round (`b9d25b7`), the built site differs in two files only: `index.html` (the buttons' size
class) and `assets/css/hero-services.css`. No other page changed.

## 5. The GSAP timeline

Unchanged. There is no new timeline, ScrollTrigger, library or plug-in; the words are a segment of the hero's one
master timeline in `hero.js`, in reading order, which is now also top to bottom on the screen:

| Step | Starts (desktop) | Motion |
|---|---|---|
| The headline, with the shade | 2.2 s | Opacity 0 → 1, rising 16 px, 0.6 s. The shade fades in through a CSS variable the timeline tweens |
| Its swash | 2.4 s | Draws left to right: a clip-path inset, 0.5 s |
| The sentence | 2.65 s | Opacity and a 14 px rise, 0.65 s |
| The brush | 3.1 s | Draws left to right in one stroke, 0.55 s |
| The four services | 3.35 s | Each icon, title and line as one unit: opacity and a 12 px rise, 0.55 s, 0.12 s apart |
| The two calls to action | 3.75 s | Together, opacity and a 12 px rise, 0.55 s |

Everything is in place by about 4.3 s. Opacity only, so the words stay in the accessibility tree and the buttons in
the tab order; a focused button shows at once. Reduced motion and `?nomotion` show everything at once.

## 6. Results (deployment `750f6564`)

| Check | Result |
|---|---|
| `npm test` | **329 / 329** |
| `npm run check`, `npm run guard` | 25 pages, no problems; brand guard clean |
| Smoke check | **23 / 23** |
| Browser tests: the whole suite, desktop and Pixel 7 | **325 passed, 1 failed, 38 skipped**, including the updated hero tests on both. The one failure is the phone gallery's lift-out on a Pixel 7 (175 px against an expected 261), which fails the same way on the approved baseline (`reports/cloud-qa.md` §6) |
| The six viewports of the brief and eight more sizes | Nothing over any of the four friends' faces, the header or the phone; on wide screens the sleeping friend lies under the words, as placed. No horizontal overflow, console error or failed request; layout shift 0 to 0.005 |
| Contrast | See the table below |
| Reduced motion | Everything shown at once, nothing moving, the swash and the brush whole |

Contrast on the eight wide sizes (1280 × 800 to 2560 × 1440), against the brightest tenth of the photograph behind
each line:

| Line | Without the rim | With the rim | WCAG AA bar |
|---|---|---|---|
| Headline, "Good Times" | 2.9–4.4 : 1 | 3.1–5.4 : 1 | 3 : 1 (large text) |
| Sentence | 3.3–4.1 : 1 | 3.9–5.4 : 1 | 4.5 : 1 |
| Service titles | 3.3–4.7 : 1 | 5.4–6.7 : 1 | 4.5 : 1 |
| Service lines | 3.4–5.4 : 1 | 4.0–6.5 : 1 | 4.5 : 1 |

On phones and tablets, the headline in the hero's foot measures 5.7:1 or more and the rest sits on navy (12:1 and more).
A phone held sideways (932 × 430) is unchanged at 2.8:1, or 3.5:1 with the rim.

## 7. Screenshots (`qa/hero-services/`)

| What | Where |
|---|---|
| Before (the hero as approved on 6 Nov) and after, at each of the six viewports | `compare/1920x1080.jpg`, `1440x900.jpg`, `1366x768.jpg`, `768x1024.jpg`, `390x844.jpg`, `360x740.jpg` |
| The entrance, frame by frame | `compare/entrance-1440x900.jpg`, `compare/entrance-1920x1080.jpg` |
| After: settled, the whole hero with the block, reduced motion; metrics | `after/` |
| The eight extra sizes | `extra/` |

## 8. Unchanged

- **The hero section's markup:** byte for byte, apart from the leaf's removal. It sits inside `.hero-shell`, and the
  words are a sibling after it, not inside it; the tests check this.
- **The rest of the hero:** the photograph and film, their crop, the phone gallery, the logo, the navigation and the
  entrance's other acts, timings and length.
- **Every other page and section:** no other page's output changed.

One knock-on effect: on phones, tablets and the other shapes, the block sits between the hero and the sand journey, so
the sand journey starts a little further down the page.
