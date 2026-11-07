# Button tokens: the signature leaf

The owner's brief of 6 Nov 2026 asks for primary buttons that are themselves leaf-shaped: "a real reusable branded
component, not merely a rounded rectangle with a leaf icon". This is that component. It sits on top of the leaf-green pill
system of `design/button-design.md`, which stays for forms, steps and small controls.

| | |
|---|---|
| Markup | `src/partials/ui.mjs` › `leafButton()` (and `coinButton()`, `sunSeal()`, `button()` for "Plan My Day", which return it) |
| Styles | `src/assets/css/buttons.css` › "The signature leaf" |
| Motion | `src/assets/js/leaf.js` (GSAP), with the home intro (`hero.js`) and the Cape Peninsula scene (`sand-journey.js`) |
| Tests | `test/hero.test.mjs`, `test/cta.test.mjs`, `test/contact.test.mjs`, `test/journey.test.mjs`, `test/e2e/site.spec.mjs` › the button system |

## 1. Where the leaf is used, and where it is not

| Leaf (the brand's primary calls to action) | Pill (`.gt-button`, `design/button-design.md`) |
|---|---|
| ~~Find Your Good Time~~ (the hero): removed on 7 Nov 2026 at the owner's request; the hero's headline, **Good Times Start Here!**, took its place (`hero-services.css`) | Form submissions and wizard steps (Send my request, Next, Back); the hero's **Explore Our Tours** (primary pill) and **Our Experiences** (glass pill with a white line), added on 7 Nov 2026 after the owner's reference, in the hero's foot where the leaf was |
| **Plan My Day** (header, Travel Concierge, phone menu, phone bar, reviews page, the home page's closing seal) | Secondary actions beside a leaf (Arrange My Transfer over the closing photograph is the on-image pill) |
| **Explore the Cape Peninsula Tour** (the end of the footprints) | Carousel and gallery controls, filters, Show more reviews |
| **Get a Quote** (the home page's booking steps) | Tertiary links in sentences (travel notes) |
| **Arrange My Transfer** (the transfers page), **Request Your Tour** (contact) | Call, WhatsApp, and every control under 44 px of content |

One leaf per view is the norm; a second action beside it is a pill. Small controls are never leaves.

## 2. Geometry

The leaf is one inline SVG laid behind the words (`.leaf-btn__shape`, `aria-hidden`, `focusable="false"`), drawn in a
240 × 64 box and stretched to the button (`preserveAspectRatio="none"`). Its strokes use `vector-effect:
non-scaling-stroke`, so the vein and the stem keep their width at any size.

| Part | Path (`ui.mjs`) | Notes |
|---|---|---|
| Body | `LEAF_PATH` `M7 34C7 14 40 4.5 112 4C172 3.6 214 14 237 31.5C214 48 172 60.4 112 60C42 59.6 7 53 7 34Z` | Rounded, slightly blunt base at the left; the tip at the right; the upper edge a little fuller than the lower (asymmetric, organic) |
| Stem | `LEAF_STEM` `M7.5 36Q4 39.2 1.2 44` | 2.2 px, `#0F6236`, round caps: it reads as a leaf at 44 px tall |
| Midrib | `LEAF_VEIN` `M13 34C70 30.5 158 28.5 229 31.4` | 1.4 px; a gradient clear near the base (78 %) and tip (82 %), faint under the words (16 %), so the words stay clean |
| Side veins | `LEAF_VEINLETS` (two pairs, near the base and near the tip, branching towards the tip) | 1.1 px at 42 %; hidden at rest, drawn on hover |
| Focus ring | `LEAF_PATH` again, scaled 1.055 × 1.2 about its centre | 3 px; transparent until `:focus-visible` |

The colours are three gradients defined once per page (`leafDefs()`, an SVG of no size placed after the skip link, never
`display: none`, so every leaf can reference it): `#gt-leaf-fill`, `#gt-leaf-fill-hover`, `#gt-leaf-vein`.

## 3. Colour and contrast

| Token | Value | Use |
|---|---|---|
| Leaf fill | `#168447` → `#147D43` (`--green-primary`) → `#0F6236`, top-left to bottom-right | The body at rest |
| Leaf fill, hover and focus | `#127A40` → `#106638` (`--green-hover`) → `#0B4F2C` | A shade deeper |
| Words | `#FFFFFF` in every state | 4.7:1 on the lightest stop, 5.2:1 on `--green-primary`, 7:1 on hover |
| Midrib and side veins | `#DFF3DE` (`--green-leaf-light`) at 16–82 % | Decoration only |
| Stem | `#0F6236` | |
| Focus ring | `--btn-focus` (ink `#10241D`) on light grounds; `--btn-focus-on-dark` (lime `#C9E970`) on the hero, the overlay header, dark scenes, the footer and the concierge | Both over 3:1 against the ground |
| Disabled | Body `#8FA99A`, words at 86 % white, no shadow, no pointer | `aria-disabled="true"` or `.is-disabled` |
| Shadow | `drop-shadow(0 1px 1px rgb(16 91 53 / .18)) drop-shadow(0 6px 9px rgb(16 91 53 / .22))`; hover a little deeper | It follows the leaf's outline, not a box. No glow |

Forced colours (`forced-colors: active`): the drawing is hidden and the link gets a plain `ButtonText` border, so the system
colours always show it.

## 4. Size, padding and type

| Size | Class | Height (minimum) | Type | Padding (base / tip) |
|---|---|---|---|---|
| Standard | `.leaf-btn` | 52 px (`--leaf-h`) | DM Sans 650, 1 rem | 1.55 em / 2.45 em |
| Large | `.leaf-btn--large` | 58 px (`--leaf-h-large`) | Bricolage Grotesque 700, 1.0625 rem | as standard |
| Hero | `.leaf-btn.hero__cta` | clamp(54 px, 2.2 rem + 2 vh, 68 px) | Bricolage Grotesque 800, clamp(1.0625 rem … 1.375 rem) | +0.1 em / +0.2 em |
| Header | `.header-cta.leaf-btn` | 48 px (46 px from 1024 to 1119 px) | DM Sans 650, 1 rem (0.9375 rem) | 1.45 em / 1.95 em |
| Compact | `.leaf-btn--compact` | 46 px | 0.9375 rem | 1.35 em / 1.85 em |
| Phone bar | `.mobile-cta .leaf-btn` | 48 px, sharing the bar with Call | 1 rem | 1.2 em / 1.9 em |
| Block | `.leaf-btn--block` | fills its column (the phone menu) | as standard | as standard |

- The tip narrows sooner than the base, so the padding is wider at the tip and the words sit a little left of centre:
  they never reach either narrow end.
- The link is the whole rectangle, so the narrow ends cost nothing: every leaf is at least 44 px tall and as wide as its
  words plus padding.
- Below 384 px a long label wraps in balanced lines inside the leaf, which grows taller with it (the hero's two-line
  "Find Your / Good Time" on phones).

## 5. States

| State | Without JavaScript or with reduced motion | With motion (`leaf.js`) |
|---|---|---|
| Rest | The leaf, the stem, the midrib; words white | The same |
| Hover (mouse only) | Fill a shade deeper, shadow a little deeper, side veins appear | The same, plus a sway from the stem: 1.3° turn, ×1.025 wide, ×1.07 tall, 420 ms `sine.out`; the side veins draw in (450 ms) |
| Focus-visible | Leaf-shaped ring (ink, or lime on dark grounds), fill a shade deeper | The same; a leaf still entering is shown whole at once |
| Pressed | The drawing squeezes to 97 % × 94 % (no transition under reduced motion) | 90 ms squeeze, released with `elastic.out(1, .55)` over 550 ms (on release, cancel or the pointer leaving) |
| Disabled | Grey-green body, no pointer, no shadow | No motion |
| Loading | `aria-busy="true"`: a small white ring turns near the tip (`gt-button-turn`, 0.8 s); still under reduced motion | The same |

Touch never needs hover: the sway and the side veins run for a mouse (`pointerType === 'mouse'` and `(hover: hover) and
(pointer: fine)`) only; a tap gets the squeeze. Navigation is never delayed: there is no exit animation.

## 6. Motion tokens

| Movement | Properties | Duration | Ease |
|---|---|---|---|
| Unfurl (entrance) | drawing: `scaleX` 0.16 → 1, `scaleY` 0.72 → 1, `rotation` −8° → 0, `opacity` 0 → 1, from the base (`transform-origin: 4% 52%`); midrib `stroke-dashoffset` 1 → 0 from 0.2 s; words `opacity` 0 → 1 and `x` −8 → 0 px from 0.36 s | 0.8 s in all | `leafUnfurl` (CustomEase `M0,0 C0.12,0.58 0.26,1.04 0.5,1.03 0.72,1.02 0.84,1 1,1`, a gentle settle with the slightest overshoot); `back.out(1.35)` where CustomEase is not loaded |
| Sway (hover) | `rotation` 1.3°, `scaleX` 1.025, `scaleY` 1.07; side veins `stroke-dashoffset` 1 → 0 | 0.42 s; back 0.45 s | `sine.out` |
| Squeeze (press) | `scaleX` 0.965, `scaleY` 0.92 | 0.09 s; release 0.55 s | `power2.out`; `elastic.out(1, 0.55)` |

Only the drawing moves (transform and opacity, plus the strokes' dash offsets); the link, its words' box and its target
never move or shrink, so it stays clickable throughout, even mid-entrance. All transforms are cleared when a movement ends.

Who plays the entrance (`data-leaf-owner`):

- `hero`: no longer used (the hero's Find Your Good Time leaf was removed on 7 Nov 2026);
- `intro`: the header's Plan My Day on the home page, last in the intro (after the company statement, about 4.9 s);
- `sand`: Explore the Cape Peninsula Tour, after the scene's words are readable (`design/motion-bible.md` §4);
- no owner: any other leaf that starts below the fold unfolds once as it comes into view (an IntersectionObserver with
  the bottom 8% of the screen excluded, the equivalent of `top 92%`: no scroll plug-in needed, so it works on every page).
  Leaves in the header, footer, phone bar, phone menu and concierge never wait: they are whole from the first paint.

Hover and press wait while an entrance is playing (whoever plays it): they would otherwise take over its transform for
good. The CustomEase `leafUnfurl` is made at the first entrance, on pages that load CustomEase (the home page, where it
loads after `leaf.js`); elsewhere the entrance uses `back.out(1.35)`.

## 7. Component API

```js
import { leafButton } from '../partials/ui.mjs';

leafButton({
  href: 'enquire/?type=tour',     // required
  label: 'Plan My Day',           // required: the words and the accessible name
  html: '',                       // optional: the words with markup (the hero's <em>Good Time</em>)
  size: '',                       // '' | 'large' | 'compact' | 'block' (space-separated to combine)
  cls: '',                        // extra classes (placement: hero__cta, header-cta, sand-journey__cta …)
  attrs: '',                      // extra attributes (data-intro …)
  owner: '',                      // '' | 'hero' | 'intro' | 'sand': which timeline plays its entrance
});
```

- "Plan My Day" is the signature wherever it appears: the component adds `aria-describedby="signature-cta-desc"` (one
  hidden line per page saying it opens the enquiry form and that nothing is booked until confirmed).
- `window.GTLeaf.unfurl(element, vars)` returns the entrance as a GSAP timeline for a scene to nest (`null` without
  motion); `window.GTLeaf.ready` says the controller has run.
- Always a link (`<a>`) to its destination: the leaf never submits a form.

## 8. Accessibility

- Accessible name = the visible words (WCAG 2.5.3); the drawing is `aria-hidden` and not focusable.
- Focus is a visible 3 px leaf-shaped ring, never removed without replacement.
- Targets at least 44 × 44 px; contrast as in §3.
- Reduced motion, `?nomotion` and no JavaScript: no movement at all, every leaf whole from the first paint.
