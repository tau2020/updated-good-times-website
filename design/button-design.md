# Button design: leaf green

One reusable button system for the whole site ("Good Times, Naturally", 6 Nov 2026): a fresh, rounded leaf sitting
naturally on the page. It keeps the class names, helpers and behaviour of the system it replaces (the "golden
engraved" plates of 10 px corners), so every existing button, link-button and form action picked it up without a
change to its markup or its function.

Implemented in `src/assets/css/buttons.css` (the system and its shape tokens), `src/assets/css/tokens.css` (the
colours), and, reading the same tokens, `.btn-coin` (Make It Yours) and `.btn-champagne` (the home hero's call to
action) in `src/assets/css/styles.css`. The preview-only specimen page `/design-system/` shows every variant and state.
`test/naturally.test.mjs` checks the tokens, the contrast of every pairing, the pill, the lift, the leaf and reduced
motion; `test/e2e/site.spec.mjs` checks every visible primary's fill, words and pill shape, and every control's 44 px
target, on five pages.

## 1. Colour tokens

| Token | Hex | Role |
|---|---|---|
| `--green-primary` | `#147D43` | Primary fill; outline lines and words; links and accents site-wide (`--gold` now points here) |
| `--green-deep` | `#105B35` | Pressed fill; the primary's border and its bottom edge; Soft Leaf words |
| `--green-hover` | `#106638` | Primary under the pointer (`--gold-hover` points here) |
| `--green-leaf-light` | `#DFF3DE` | Soft Leaf fill; reviewer initials; selected states (`--forest-soft`) |
| `--green-soft-background` | `#EFF8F0` | Fresh Air hover; the soft leaf grounds of the photo block and the reviews (`--gold-tint`) |
| `--green-lime-accent` | `#C9E970` | Decoration only: the leaf on green, the focus ring on dark grounds and photographs, glows |
| `--ink-primary` | `#10241D` | Headings (`--ink`), tertiary words, the focus ring on light grounds |
| `--surface-white` | `#FFFFFF` | Primary words; the on-image pill |
| `--green-leaf-line` | `#B5DBB3` | Added: the Soft Leaf border, fine rules on pale-leaf surfaces |
| `--green-leaf-hover` | `#D3ECD1` | Added: the Soft Leaf fill under the pointer |

### Contrast (WCAG 2, measured, and enforced by `test/naturally.test.mjs`)

| Words / ring | Ground | Ratio | Use |
|---|---|---|---|
| white | `--green-primary` | **5.2:1** | Primary at rest (AA for any size) |
| white | `--green-hover` | **7.0:1** | Primary, hover |
| white | `--green-deep` | **8.2:1** | Primary, pressed |
| `--green-deep` | `--green-leaf-light` | **7.0:1** | Soft Leaf words |
| `--green-primary` | white | **5.2:1** | Fresh Air words, links |
| `--green-primary` | `--green-soft-background` | **4.8:1** | Green words on the soft ground |
| `--green-deep` | white | **8.2:1** | On-image pill words |
| `--ink-primary` focus ring | white | **16.3:1** | Focus on light grounds (≥ 3:1 required) |
| `--green-lime-accent` focus ring | `--ink-primary` / navy | **11.9:1 / 10.3:1** | Focus on dark grounds and photographs |
| white | `--green-lime-accent` | 1.4:1 | **Never used**: lime is never a ground for white words |

## 2. Shape and size

| Token | Value | |
|---|---|---|
| `--btn-radius` | `999px` | A pill, every standard call to action |
| `--btn-height` | `48px` | Standard |
| `--btn-height-large` | `52px` | `--large`: the section's main invitation (the brief's ~52 px desktop primary) |
| `--btn-height-compact` | `44px` | `--compact` and utility controls: the minimum interaction target |
| Header "Make It Yours" | 48 px (46 px at 1024–1279, 44 px at 1024–1119) | The brief's 44–48 px for navigation buttons |
| Horizontal padding | 1.4 rem standard, 1.75 rem large, 1.05 rem compact | |
| `--btn-gap` | `0.55rem` | Between words, icon and leaf |

Every button is at least 44 px tall (checked on the preview at 320–1440 px by the browser suite).

### The leaf

A 24 px leaf glyph with its midrib cut out and a short stem, drawn as a CSS mask (`--btn-leaf`) on the button's
`::after`, about 1.05 em, after the words:

- lime (`--green-lime-accent`) on the green primary; `--green-primary` on Soft Leaf, Fresh Air and the white on-image
  pill;
- **not** on compact controls, utility controls, tertiary links or danger buttons, and not beside a meaningful icon
  (a phone, a quote mark): `:has(> .icon)` removes it;
- no markup carries it, so hand-written buttons and helper-made ones are identical;
- with forced colours it takes `ButtonText`.

It is a flourish, never an arrow: no control in the family carries an arrow or chevron.

The brand's primary calls to action (**Plan My Day** and the others listed there; the hero's Find Your Good Time was removed on 7 Nov 2026) are no
longer pills: since the brief of 6 Nov 2026 they are the signature leaf (`design/button-tokens.md`), which replaced the
compass medallion and the hero's pill and reads the same palette. This sheet covers everything else: form
submissions, wizard steps, secondary and tertiary actions, and small controls.

## 3. Variants

| Variant | Class | Look | For |
|---|---|---|---|
| **Primary · Leaf Green** | `.gt-button--primary` (helpers: `sunSeal()`, `button({ variant: 'gold' \| 'primary' })`) | `--green-primary` fill with a soft highlight (a radial sheen from the top left), a 2 px `--green-deep` edge at its foot (a leaf's thickness), a soft green-tinted shadow, white words, a lime leaf | Explore Tours, Plan My Day, Get a Quote, Make It Yours, Request a Quote |
| **Secondary · Soft Leaf** | `.gt-button--secondary` (`quietOutline()`, `button({ variant: 'secondary' \| 'outline' })`) | `--green-leaf-light` fill, `--green-leaf-line` border, `--green-deep` words, a green leaf | View details, Plan a Peninsula Day, Read every review on Tripadvisor, Arrange a Transfer |
| **Outline · Fresh Air** | `.gt-button--outline` | Transparent, a 1.5 px `--green-primary` line, green words and leaf | Secondary actions on light grounds: Show more reviews, Discover More |
| **On-image** | `.gt-button--on-image` (`quietOutline({ tone: 'light' })`) | A solid white pill, `--green-deep` words, a deep shadow: legible on any photograph | The secondary action beside a primary over a photograph (the closing scene's Arrange a Transfer) |
| On dark grounds | `--secondary.gt-button--on-dark`, `--utility.gt-button--on-dark`, `--tertiary.gt-button--on-dark` | Glass pill (white 7%), lime line, white words | Ocean-navy panels (the gallery lightbox, the phone bar) |
| Tertiary | `.gt-button--tertiary` (`travelNote()`) | Words over a 1.5 px green hairline | A link in a sentence's place: Follow the coast road, All destinations |
| Utility | `.gt-button--utility` | Compact white pill, green line and words, **sentence case** (was capitals) | Previous, Next, Back |
| Danger | `.gt-button--danger` | Never green | Remove a traveller |

Sizes combine with any variant: `--compact` (44 px), standard (48 px), `--large` (52 px, set in Bricolage Grotesque
650: "selected buttons" in `design/font-design.md`), `--block` (fills its column).

## 4. States and motion

| State | Behaviour |
|---|---|
| Hover (pointer devices only, `@media (hover: hover)`) | Lifts **2 px** (`--btn-lift`); primary darkens to `--green-hover`, Soft Leaf to `--green-leaf-hover` with a green border, Fresh Air fills with `--green-soft-background`; the shadow grows; the leaf turns −16° about its stem. Make It Yours' rosette turns an eighth |
| Focus (`:focus-visible`) | A 3 px ring, 3 px off the pill: `--ink-primary` on light grounds, `--green-lime-accent` on dark grounds and photographs. The Living Cape's own ring (`--lc-focus`) now uses the same two colours |
| Pressed (`:active`) | Back to the plane, a soft inset shadow; primary to `--green-deep` |
| Disabled (`:disabled`, `aria-disabled="true"`) | Desaturated, a dashed edge, `not-allowed` cursor; still legible (never opacity alone) |
| Loading (`aria-busy="true"`) | The width holds; a 16 px ring turns where the leaf was; a second press does nothing |
| Timing | `--btn-dur` 200 ms (colours, shadow, lift), `--btn-leaf-dur` 240 ms (the leaf), one ease `cubic-bezier(0.22, 1, 0.36, 1)` |
| Reduced motion | No transitions, no lift, no leaf turn; the loading ring stops and shows dotted |

Not used, by design: looping or idle animation (the loading ring is the only animation), glows, pulsing, magnetic or
cursor-following effects (none exists on any device), scale-on-press bounce.

## 5. Where it applies

Through the shared classes and tokens, without markup changes: the header's Make It Yours, the Travel Concierge and the
phone menu, the phone bar (Call, Make It Yours), the hero's call to action, every home chapter's actions, tour and
package pages (Request a Quote, Get a Personalised Quote, Explore Tours), the booking wizard (Continue, Back, Send),
transfers, contact, FAQ, the footer, the destination carousel's Previous and Next, the gallery lightbox, and the
visit-statistics consent card's Allow and Decline (production builds with analytics only). The only markup change is the
`quietOutline()` helper choosing `--on-image` over a photograph.

## 6. Naming and native behaviour

- Classes are semantic: `gt-button` + one variant + optional size + optional `--on-dark`. Helpers in
  `src/partials/ui.mjs` (`button()`, `coinButton()`) and `src/partials/living-cape.mjs` (`sunSeal()`, `travelNote()`,
  `quietOutline()`).
- Links stay `<a href>`, actions stay `<button type="button|submit">`: no role swapping, no click handlers added.
- **Enquiry, not booking.** Every call to action that leads to the booking wizard names an enquiry or a plan (Plan My
  Day, Get a Quote, Request a Quote, Make It Yours); nothing says a booking is confirmed. The lines beside them keep
  "nothing is booked or charged until we’ve confirmed it with you".
