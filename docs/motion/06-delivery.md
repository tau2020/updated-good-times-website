# 06 · Delivery

## Where it is

- **Repository:** this one (`good-times-site`); see 00 for why not the `08077562` codebase (owner point M0).
- **Branch:** `feature/gtict-cinematic-sand-journey`, from `main` at `d2b30e1`; merged into `main` by pull request at the owner's direction on 6 Nov 2026, before the approval items M0–M5 were settled. Nothing is deployed: staging and production are unchanged.
- **Preview:** a separate Cloudflare Pages branch deployment (`--branch motion-preview`, a preview environment), never the `staging` alias the owner reviews and never production. It is deployed only with the owner's Cloudflare token (it is not in the repository), as `README.md › Deployment` describes, with `motion-preview` in place of `staging`.

## What changed

| Area | Files |
|---|---|
| The brand aircraft | `src/partials/aircraft.mjs` (new), `src/assets/js/brand-plane.js` (new), `src/assets/js/hero.js` (the flight nested in the entrance; header staged with opacity only; preview-only replay), `src/partials/layout.mjs` (the dock anchor and flight layer on the home page; the preview bar's replay button), `src/assets/js/vendor/MotionPathPlugin.min.js` (new, GSAP 3.15.0), `src/assets/motion/gtict-real-aircraft.svg` (the package's aircraft, preview builds) |
| The sand journey | `src/partials/sand-journey.mjs` (new), `src/assets/js/sand-journey.js` (new), `src/assets/js/motion/sand/{random,noise,foot,scene,shaders,renderer}.js` (new), `src/pages/index.mjs` (the section after the hero, the scripts) |
| Its destination (6 Nov 2026, 07) | The owner's image `ocean-footprints-reveal` (`src/data/images.mjs`, `src/assets/img/ocean-footprints-reveal-*`) in place of Camps Bay, the owner's words and link, the walk laid out to end on the image's four prints; `src/pages/privacy.mjs` (credits) |
| Styles | `src/assets/css/motion.css` (new, linked inside the sand section) |
| Tests | `test/motion-sand.test.mjs`, `test/motion-aircraft.test.mjs`, `test/e2e/motion.spec.mjs`, `test/e2e/motion-nowebgl.spec.mjs` (new); `test/e2e/site.spec.mjs` and `test/hero.test.mjs` (updated for the new neighbour and choreography) |
| QA tool | `qa/motion.mjs` (new; `--out` required, writes nothing into `docs/` by itself) |
| Documents | `docs/motion/00–07`, `docs/motion/qa/` (evidence), `docs/APPROVAL_REGISTER.md` (section M), `docs/RIGHTS_REGISTER.md`, `NOTICE.md`, `README.md` |

The logo files, the hero (markup, CSS, film, phone gallery), the navigation, the footer, the routes, the tour data and
the booking paths are unchanged.

## Architecture

```
first paint ──► hero (unchanged) ──────────────► sand journey (static scene in HTML: the owner's image, words, link) ──► chapters (unchanged)
                 │                                 │
 hero.js ── GSAP master timeline                   sand-journey.js (classic script)
   └─ brand-plane.js: MotionPathPlugin flight        ├─ ScrollTrigger: scroll → p (scrubbed), CSS sticky stage
        measured from the logo (dock anchor,         ├─ after the entrance or the first scroll: import()
        route fractions) → lands as the "i"          │     motion/sand/renderer.js (WebGL2)
                                                     │       ├─ scene.js  gait · camera · strokes · grains = f(p)
                                                     │       ├─ foot.js   the anatomical foot (tested CPU model)
                                                     │       └─ shaders.js the sand (constants from foot.js)
                                                     └─ tiers: full · lite (measured) · static (fallback)
```

GSAP is the only clock. The renderer draws only when asked (`renderAt(p)`) and is a pure function of p.

## Checks run (final build)

| Check | Result |
|---|---|
| `npm test` (unit and integration, incl. 14 new) | 292 / 292 |
| `npx playwright test` (desktop and mobile) | 322 passed, 36 skipped (as on `main`); includes 12 new motion tests |
| `npm run check` (static QA) | no problems, 25 pages |
| `npm run guard` (brand guard, after staging) | clean |
| Landing precision, WebKit, 3 sizes | 0.048–0.070 px |
| Determinism, WebKit, 3 sizes × 8 states | the same frame forwards and backwards; 8 distinct frames per size |
| Independent critique | 4 blockers (2 bugs, 2 design rejections; see 05), all fixed or revised, plus a third bug found while fixing them (landing on resize during playback); one claim not reproduced; the fixes not re-reviewed |
| No WebGL, lost context, reduced motion, `?sand=static`, late renderer | static scene or cross-fade, no errors (e2e) |
| CLS | identical to `main` (0.0006 desktop, 0.0075 Pixel 7, pre-existing) |
| LCP, slow 4G + 4× CPU | branch 3416–3440 ms against main 3580–3600 ms (desktop); 3420–3424 against 3736–3744 ms (Pixel 7) |
| GPU cost per frame (M3 Pro, WebKit) | 4–7 ms at a true 2× on 1440 × 900; 2–3 ms on a 3× phone canvas |

After the destination image (6 Nov 2026, 07), on the final build: `npm test` 293 / 293; `npx playwright test` 324
passed, 36 skipped, 0 failed; `npm run check` no problems; `npm run guard` clean; GPU cost 4–8 ms a frame at 2× on
1440 × 900; layout shift 0.0006 on desktop (as on `main`) and 0 on a Pixel 7. The throttled LCP was not measured again:
the destination image is below the fold, lazy and low priority, as the photograph before it was.

## Limitations (also in 02–05)

- Measured on one Mac (M3 Pro) only. No real phone, Windows or Android device; Firefox and iOS Safari were not run.
- The footprints are procedural. Since the review they are one continuous, caving outline, but not yet "photoreal" up close: the lesser toes are too regular, and there are no sole creases and no moisture gradient (M3). The review's fixes were checked by me, not by a second independent pass.
- The camera glides up to about 2.7× the scroll speed on tablets in portrait and phones in landscape (03).
- The destination image is AI-generated (from its look; the brief does not say); its prints match the animated ones in place, heading, foot and size but differ in detail (07, M5).
- The `08077562` deployment could not be opened (login), and its commit was identified from the redesign project's own records, not from Cloudflare build metadata (M0).

## The owner's approval items

M0 the baseline · M1 the aircraft · M2 the flight · M3 imprint realism · M4 the walk, the sweep and the section's length ·
M5 the destination image · M6 merge only after these (`docs/APPROVAL_REGISTER.md`, section M).
