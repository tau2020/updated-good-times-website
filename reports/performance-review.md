# Performance review: the brief of 6 Nov 2026

Measured, not assumed (brief §12). The baseline is the approved preview before this round: deployment `ab1a914c`
(commit `67cea72`). "After" is this round's site: deployment `860a978d` for the browser measurements (the transfers
page re-measured on `92c573ed` after its fix, §3; the later fixes change the home page's script by a few hundred
bytes and the transfers page's markup by its second banner source) and the final deployment, `1ee29be7`, for the
weights and the frame timings. Everything was measured on the deployed Cloudflare previews, never a local server.

## 1. Method

- **Core Web Vitals and media bytes**: `qa/media-perf.mjs`, the media audit's tool, with the same arguments on both
  deployments: 5 routes (`/`, `/about/`, `/transfers/`, `/tours/cape-town-city-private-tour/`, `/contact/`), 3 cold runs
  each, on a desktop (1440 × 900, unthrottled) and a phone (Pixel 7, "Slow 4G": 150 ms round trip, 1.6 Mbit/s down,
  and a 4× slower CPU while the page loads). LCP and its element, layout shift at load and over a full scroll-through,
  image and video bytes at load and over the whole visit, failed requests. Medians below.
- **Page weight**: each page's HTML, stylesheets and scripts as transferred (Brotli), fetched with curl.
- **Smoothness**: frame intervals while the new DOM entrances play (`requestAnimationFrame`), on a desktop and a
  Pixel 7, in the test browser. It draws WebGL in software, so the sand scene's own frame rate here says nothing about
  a phone's GPU; the sand renderer keeps its measured fallback (§4).
- Interaction latency (INP) is not measured: the entrances never block input (no long tasks of their own, nothing
  disabled while they play), and the only new input handlers are the leaf's pointer events.

## 2. Page weight (as transferred)

| Page | HTML | CSS | JavaScript | Scripts |
|---|---|---|---|---|
| Home, before → after | 28.0 → 28.5 KB | 66.4 → 67.9 KB | 117.9 → 135.3 KB | 15 → 18 |
| About | 10.9 → 11.0 KB | 41.8 → 42.8 KB | 59.9 → 63.5 KB | 6 → 7 |
| Transfers | 11.7 → 12.1 KB | 39.1 → 40.1 KB | 42.0 → 45.0 KB | 5 → 6 |

- **JavaScript** (all deferred, none render-blocking): every page gains `leaf.js` (2.9 KB); the home page also gains
  CustomEase (3.8 KB) and SplitText (3.7 KB), the Cape Peninsula entrance (`sand-journey.js` +3.2 KB), the sections'
  choreography (`living-cape.js` +3.0 KB, `culinary.js` +0.5 KB) and the intro's leaf and scroll handling (`hero.js`
  +0.3 KB). Total on the home page: +17.4 KB.
- **CSS** (render-blocking): +1.0 to +1.5 KB. The leaf's styles (+8.4 KB raw) less the medallion and pill styles the
  leaf replaced (−4.8 KB raw).
- **Images**: no photograph got heavier. The corrected placements use the same AVIF and WebP pipeline and `sizes`; the
  goats' and the selfie's 16 renditions left the deployment; traveller 11 (the airport service) is 1536 px wide at most.

## 3. Core Web Vitals and media (medians of 3 cold runs)

| Profile | Page | LCP before | LCP after | Layout shift at load, before → after | Media at load, before → after | Media over a full visit, before → after |
|---|---|---|---|---|---|---|
| Desktop | Home | 640 ms | 732 ms | 0.0006 → 0.0006 | 767 → 792 KB | 4664 → 4653 KB |
| Desktop | About | 580 ms | 576 ms | 0.0006 → 0.0006 | 345 → 354 KB | 345 → 362 KB |
| Desktop | Transfers | 456 ms | 628 ms ¹ | 0.0058 → 0.0006 | 154 → 255 KB ¹ | 154 → 255 KB ¹ |
| Desktop | City tour | 516 ms | 636 ms | 0.0006 → 0.0006 | 464 → 454 KB | 464 → 454 KB |
| Desktop | Contact | 544 ms | 484 ms | 0.0006 → 0.0006 | 16 → 16 KB | 16 → 16 KB |
| Phone (Slow 4G, 4× CPU) | Home | 3044 ms | 3068 ms | 0.0106 → 0.0105 | 613 → 638 KB | 5753 → 5637 KB |
| Phone | About | 2388 ms | 2312 ms | 0.0006 → 0 | 326 → 346 KB | 521 → 541 KB |
| Phone | Transfers | 1372 ms | **2208 ms** ¹ | 0 → 0 | 74 → 128 KB ¹ | 193 → 224 KB ¹ |
| Phone | City tour | 2284 ms | 2276 ms | 0 → 0 | 103 → 91 KB | 444 → 432 KB |
| Phone | Contact | 1024 ms | 1000 ms | 0 → 0 | 8 → 8 KB | 16 → 16 KB |

Media is images plus video (the home page's films: 204 KB at load, 2597 KB over a visit, unchanged). No request failed
in any run. Desktop LCPs between 450 and 750 ms move by about ±100 ms from run to run (the home page's three runs
before: 1036, 580, 640 ms); the phone profile is steadier.

¹ **The one regression, and what was done.** The transfers page's new banner (traveller 12, the owner's photograph for
§2.3) is a portrait original; the banner is a wide strip from 48em and about square on phones, so each screen
downloaded a whole tall file. First measured: phones 1372 → **2640 ms** LCP and 74 → 208 KB at load; desktops 154 → 360
KB. Fixed in `296150d` by art direction: the image pipeline now cuts an original to a shape at the frame's own
object-position (so each layout shows exactly what it showed), and the banner has a 1.6 : 1 cut from 48em (154 KB at
1536 px, from 255) and a 0.85 : 1 cut for phones with a 1000 px rendition at AVIF 40 (86 KB, from 164). Phones are now
at **2208 ms**, inside the 2.5 s "good" threshold on this deliberately slow profile, and 836 ms above the old banner,
which was a lighter landscape photograph the owner asked to replace. The table's "after" for Transfers is this
deployment (`92c573ed`); the rest is `860a978d`.

Layout shift is unchanged or lower everywhere (the transfers page on desktop: 0.0058 before, 0.0006 after). The home
page's 0.0105 on phones is the preview build's own bar being measured, as in the earlier rounds; production has no
preview bar.

## 4. Smoothness

Frame intervals while each new entrance plays (`requestAnimationFrame`, final deployment `1ee29be7`):

| Entrance | Desktop: frames, median, 95th percentile, over 50 ms | Pixel 7 |
|---|---|---|
| The Cape Peninsula's words (the sand at rest) | 146 frames, 16.7 ms, 16.7 ms, 1 | 106, 16.7 ms, 16.7 ms, 1 |
| The four ways (all four cards) | 120, 16.7 ms, 16.7 ms, 0 | 71, 16.7 ms, 16.8 ms, 3 |
| The invitation | 160, 16.7 ms, 16.8 ms, 0 | 140, 16.7 ms, 16.8 ms, 0 |

60 frames a second throughout, with at most a handful of single long frames (the four ways on the phone start four
image decodes at once). The phone figures are the test browser emulating a Pixel 7's screen, not its CPU.

The sand scene: unchanged in cost. Its renderer draws only when the scroll moves it, loads after the intro, and drops
to its lite tier when frames are measured slow; the coastal reveal adds one compositor-only `transform: scale()` on
three layers, set once a frame from the same scroll update (no layout, no paint of the DOM). The film still plays only
on screen. In this test browser WebGL runs in software, so the sand's frame rate here says nothing about a device's; the
renderer itself is unchanged by this round.

## 5. Decisions

| Decision | Why |
|---|---|
| No ScrollSmoother, no Observer, no DrawSVG or MorphSVG | Native scroll stays the one scroll source; `stroke-dashoffset` draws every line; nothing morphs |
| CustomEase and SplitText on the home page only | The only page that uses them (7.5 KB); every other page loads neither |
| The headline split only once the sand renderer is ready | No forced layout during the hero's entrance; until then the words are plain text |
| Text entrances triggered, not scrubbed | Readability, and no per-frame text work while scrolling |
| The coastal reveal as one scale on composited layers, from the same scroll update as the sand | No second ScrollTrigger, no layout, no paint |
| Clip-path masks removed when an entrance ends; entrances play once and drop their trigger | Nothing left to recompute or hit-test afterwards |
| Below-the-fold leaves unfold with an IntersectionObserver | No scroll plug-in needed on inner pages |
| The medallion and hero pill styles removed (−4.8 KB of render-blocking CSS); the goats' and the selfie's renditions removed | Dead weight once replaced |
| The transfers banner art-directed and cut (§3) | The one measured regression |
| The City tour banner (also a portrait original) left whole | Its bytes are unchanged (454 against 464 KB) and its phone LCP equal; a cut would save about 70–80 KB on desktops only, for a change in the tour template: left for the next round |

## 6. Limitations

- Field data (real visitors' Core Web Vitals) does not exist for a preview behind `noindex`; these are lab numbers
  from one machine, three runs each.
- The phone profile emulates a slow network and CPU in a desktop browser; it is a stress test, not a real phone.
- The sand renderer's own frame rate needs a GPU; it is unchanged by this round and its measured fallback remains.
