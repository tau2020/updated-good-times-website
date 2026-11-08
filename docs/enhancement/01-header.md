# The header: white at the top, glass once the page moves (8 Nov 2026)

The brief (§ A): the same header, the same DOM, turned to clear white glass when scrolling begins, so the page moving
beneath shows through; nothing about its size, position, type, logo, titles, Concierge or Plan My Day changes, and the
top of the page keeps the header exactly as it was.

## What changed

| | Before (staging, measured) | After (this branch, measured locally) |
|---|---|---|
| Owner | `main.js`: one passive scroll listener, `requestAnimationFrame`, toggles `.is-condensed` | the same listener and the same thresholds; plus a `pageshow` re-read (back/forward cache) |
| Threshold | `scrollY > 8` (home `> 40`, `data-condense-at`) | unchanged |
| Top of the page | home: transparent overlay, reversed logo; elsewhere: white, `#e1e7ea` hairline, no shadow | unchanged, byte for byte (computed styles identical at scrollY 0, 1, 12, 24 and at the threshold) |
| Scrolled | `#fff`, `#e1e7ea` hairline, `--shadow-s` | `rgb(255 255 255 / .8)`, `backdrop-filter: blur(18px) saturate(125%) brightness(1.06)`, hairline `rgb(16 36 29 / .09)`, shadow `0 1px 2px rgb(6 35 20 / .05), 0 10px 28px -16px rgb(6 35 20 / .32)` |
| Company statement, scrolled | `#147d43` | `#105b35` (the deep leaf green), on the glass only |
| Transition | 400 ms on background, shadow, border, colour | 280 ms `cubic-bezier(0.22, 1, 0.36, 1)` on the same, plus backdrop-filter |
| Height | 113 / 97 / 105.3 / 97 px (home at 1440 / 768 / 390 / 360) | identical at every width and every scroll position |

Tokens (`tokens.css`): `--gt-glass-surface`, `--gt-glass-fallback`, `--gt-glass-filter`, `--gt-glass-line`,
`--gt-glass-shadow`, `--dur-glass`. Rules: `styles.css` › 6. Nothing animates `top`, `height`, padding, font size or the
scroll position; GSAP, ScrollTrigger and the hero's entrance are untouched (the entrance still owns the header's children
during the intro, and the glass applies only after the threshold, when the overlay header's flight layer is hidden).

Where glass would not help, the header is solid white: browsers without `backdrop-filter` (`@supports`), phones that report
2 GB of memory or less or ask to save data (`.is-lite`, set by `main.js`), a reduced-transparency preference, forced
colours (`Canvas`), and while the menu drawer, itself opaque white, hangs from it. Reduced motion removes the transition.

## Two defects fixed on the way

1. **Anchors under the header** (phones, tablets): `main.js` now writes the header's measured height to `--header-live`
   on the root (a ResizeObserver), and `scroll-padding-top` uses it. At 390 a link to `#reviews` now lands 19 px below the
   header (it was 24 px under it); at 1440, when the browser's fragment scroll lands, 16 px below it (it was 1 px under).
2. **The drawer and the sticky header**: the scroll lock moved from `body` to the root (`html.drawer-open`), so body is
   never a scroll container. With the drawer open on a scrolled page the header now stays at the top (top 0, bottom
   105.3 px at 390; it was at −193 px), its close button visible.

## Legibility, measured (`qa/header-contrast.mjs`)

The header's words are made transparent for one frame, the backdrop behind each text box is sampled, and each text's own
colour is checked against the darkest tenth of those pixels: home at 1440 and 390 over the hero, the road scene, the
memory band, the adventure interlude, the gallery, the golden scene, the guest voices, the invitation and the footer;
`/tours/` over its banner, its list and the footer. 96 measurements, all meeting AA:

| Text | Worst contrast over the darkest tenth of its backdrop |
|---|---|
| The company statement (11–13 px), on the glass in `#105b35` | 5.41:1 |
| "Tours" (the current page's green on `/tours/`) | 5.02:1 |
| Transfers, Destinations, About, Contact, Concierge | 10.84:1 or more |

In its first colour (`#147d43`) the statement measured 3.28–4.21:1 over the darker bands, which is why it takes the deep
green on the glass. The first glass (78% white, `saturate(135%)`) also took on strong colour from what passed beneath
(the critique, `07-critique.md`); the final one is a touch whiter and less saturated, with a slight brightening, and
measures higher on every line above. The measurement first under-read: the header's own colour transitions were still running in the
sampled frame; transitions are now off for that frame, and the figures above are from the corrected run.

## Evidence and checks

- `evidence/header-frames-home-1440.jpg`, `…-tours-1440.jpg`, `…-home-390.jpg`: before | after at the top, scrolled
  50 px, near the hero's end, in the first body section and back at the top. The top and the return are identical; once
  scrolled, the white bar becomes glass tinted by what passes beneath (the sky, the café scene, the sand).
- `evidence/header-scroll-home-1440-before.mp4` / `-after.mp4` and the same for `/tours/`: the scroll recorded down
  through the hero's end and back (staging before; the branch's build after).
- `qa/header-morph.mjs`: the state table at every position, the listeners, the ancestors, the drawer, Concierge, a deep
  link and a back/forward return; `--video` records the scroll (WebM). Before: staging, 8 Nov 2026. After: the branch's
  build on a local server (`06-qa.md` has the files). The same command against a Cloudflare preview is the sign-off run;
  it waits for a provisioned token (`06-qa.md`, G8).
- Interaction checks: keyboard order unchanged (skip link, logo, titles, Concierge, Plan My Day); Concierge's panel still
  above the header (z-index 60 over 50); the drawer's top meets the header's bottom.
