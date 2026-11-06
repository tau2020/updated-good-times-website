# 00 · Discovery and baseline

Gate 0 of the owner's "GoodTimes Cinematic Motion Package" (5 Nov 2026: master prompt, choreography, technical
architecture, aircraft art direction, `gtict-real-aircraft.svg`, `asset-needs.json`). Work done 5–6 Nov 2026.

## 1. Which codebase and which baseline

The package names a "client-liked" Cloudflare deployment, `08077562.gtict-redesign-staging.pages.dev`, and asks for
its exact Git commit before branching. What was found:

| Check | Result |
|---|---|
| `https://08077562.gtict-redesign-staging.pages.dev/` | HTTP 401, `WWW-Authenticate: Basic realm="Good Times staging"`. Not opened: no credentials were used in this session, so the deployment was **not visually inspected**. |
| `https://gtict-redesign-staging.pages.dev/` | "Deployment Not Found" (the project exists; nothing on its production branch) |
| This repository (`good-times-site`, GitHub `tau2020/updated-good-times-website`) | No reference to `gtict-redesign-staging` or `08077562`, no Basic-auth middleware. It deploys to a different Pages project, `good-times-in-cape-town`. |
| `~/GoodTimesInCapeTown Website/goodtimes-redesign` (GitHub `tau2020/googdtimeswebsite`) | Its README deploys to `gtict-redesign-staging` and its `functions/_middleware.js` is the Basic-auth gate. That project's own working notes record `08077562` as the **audit preview of commit `c079427`** (CR-011 Concierge, CR-012 About cover, branch `audit/goodtimes-independent-qa`, 3 Nov 2026). |

So `08077562` belongs to a **different codebase**: a Python-built theme layer over the live Django site, with the
navigation Home · Journey · Experiences · About · Contact and a selfie-film hero with a handwritten "Good Times Start
Here". It has **no frozen hero and no phone gallery**.

The package's description of what must be protected ("the frozen hero", "the phone-gallery collage", "the lower-right
gallery", "Good Times Start Here", the subject's face) matches **this** repository's current home page exactly
(commit `c62b28e`, deployed to `staging.good-times-in-cape-town.pages.dev` on 5 Nov). The package was also opened in
this repository.

**Decision:** implement here, on `feature/gtict-cinematic-sand-journey` from `main` at `d2b30e1` (the deployed
staging state), and report the mismatch instead of building on a commit whose hero the package does not describe.
The `08077562` → `c079427` mapping comes from the redesign project's own records, not from Cloudflare build metadata
(no Cloudflare token was available in this session). **Owner point M0** (`docs/APPROVAL_REGISTER.md`): confirm that this repository is the intended
target. The work is portable: the aircraft is driven by the shared Approved Logo Pack v2, and the sand renderer is
framework-free.

## 2. The repository as it is

- **Stack:** a zero-dependency Node static generator (`src/build.mjs`, pages as modules returning HTML). GSAP 3.15.0
  (core, ScrollTrigger, Flip) is vendored. There is no Svelte, no bundler and no PixiJS. The CSP allows same-origin scripts and one hashed
  inline script. So the package's `*.svelte` components and PixiJS 8 renderer were adapted to idiomatic
  equivalents here (see 04 › Why no PixiJS).
- **Home hero** (`src/pages/index.mjs`, `styles.css` › Home hero, `hero.js`): the frozen café scene (poster, then a film
  in which only the cloud and the sea move), the one call to action "Good Times start *Here!*" at bottom left, and the phone gallery
  "Cape Town Memories" at bottom right. Face boxes are in `src/data/hero-scene.mjs` and checked by `qa/hero.mjs`.
  The entrance is one GSAP master timeline (`window.__heroEntrance`) whose timing is pinned by `test/e2e/site.spec.mjs`.
- **Header and navigation:** the overlay header holds the reversed compact lockup over the hero, then the ink lockup once
  condensed. The titles are **Tours, Transfers, Destinations, About, Contact** (not the package's Home, Journey,
  Experiences, About, Contact; the existing navigation is kept, as the package's rules require).
- **The logo** (`src/assets/brand/gt-logo-compact.svg`, Approved Logo Pack v2, used as supplied): its green path holds
  **a jet airliner seen from above, nose down, forming the "i" of "in"**, at the end of a dotted route (35 dots) that
  starts at a location pin above Table Mountain. Glyph box: x 974–1054, y 452–547 of 2121 × 564. The reversed lockup
  has identical geometry in `#45E375`. **Landing point, with confidence:** the glyph itself. It is read from the file
  at build time, never guessed.
- **First section below the hero:** chapter 01 `lc-sun` ("A private day, shaped around you"), whose water effect begins
  at its own top edge.
- **Tour data:** `src/data/tours.mjs`. The Cape Peninsula Private Tour's route passes Camps Bay ("past Maiden's Cove and
  Camps Bay"; itinerary stop "Camps Bay: a beachside drive").
- **Beach photograph:** `camps-bay-twelve-apostles` (basis S, no people, "In use", `docs/RIGHTS_REGISTER.md`). It is
  already the backdrop of chapter 11's closing scene, so **owner point M5:** accept the repeat, or choose another
  approved beach photograph.

## 3. Is sand physically plausible at the hero's seam?

No, not inside the hero. The hero is a café terrace above the sea, and its bottom band holds the call to action and the
phone. A sand edge laid over it would cover protected content. So the sand is a **new section starting exactly at the
hero's lower edge**. Its first print is pressed just under that edge while the hero is still on screen (scroll
progress 0.04–0.13), which is the "bridge" across the boundary. All later prints are in the same scene and coordinate
space.

## 4. Conflict risks found, and how they were handled

| Risk | Handling |
|---|---|
| The entrance hid the header titles with `visibility: hidden` (autoAlpha) for up to 2.7 s, against "navigation keyboard-accessible at every stage" | Header items are now staged with opacity only; whatever is focused shows at once (`motion.css` §2). The hero's call to action keeps its approved autoAlpha. |
| `test/e2e/site.spec.mjs` pins the entrance timing | Updated for the new choreography: titles start at the landing, everything else unchanged (brand 0, Book Now 0.15, call to action 2.2, sheen 2.82, 3.4–3.8 s). |
| ScrollTrigger pin spacers shift layout | No pin: the stage is held by CSS `position: sticky`; ScrollTrigger only scrubs a progress value. |
| A preview-only button could change the preview bar's height, and with it the hero's | Found by the e2e suite (mobile, +5 px) and fixed: the button is laid over the bar's end and hidden below 64em. |
| A new head stylesheet blocks the hero's first paint | `motion.css` is linked in the body just before the sand section (see 04, LCP). |
| A photo just below the fold competing with the hero's poster | `fetchpriority="low"` on the Camps Bay photo. |

## 5. Assets (`asset-needs.json`)

| Need | Status |
|---|---|
| approved_logo_source | In the repository (Approved Logo Pack v2); the aircraft and route are read from it |
| beach_destination_image | Approved photograph `camps-bay-twelve-apostles`, already rendered (AVIF and WebP, 480–2000 px); owner point M5. Replaced on 6 Nov 2026 by the owner's own image (07) |
| dry_sand_albedo, sand_normal_or_height_map | Procedural and original: a 1024² grain tile baked on the GPU at start (`shaders.js` BAKE) plus analytic ripples and dunes. No textures were downloaded. |
| foot_pressure_left_and_right | Procedural: an anatomical signed-distance foot (`motion/sand/foot.js`), varied per step, with a tested CPU reference; depth map in `qa/footprint-depth-model.png` |
| sand_static_fallback | The static tier is the photograph with its words and link, so no sand poster is needed |
| Aircraft | The logo's own airliner (default) and the package's propeller aircraft (`src/assets/motion/gtict-real-aircraft.svg`, preview builds) |

## 6. Baseline measurements (main @ d2b30e1, same machine and server as the branch)

Apple M3 Pro, Chromium (Playwright), home page with motion, `python3 -m http.server`, 5 runs (3 when throttled):

| | LCP local | CLS (entrance, then scrolling) | LCP slow 4G + 4× CPU |
|---|---|---|---|
| main, desktop 1440 × 900 | 56 ms | 0 / 0 | 3588–3608 ms |
| main, Pixel 7 | 56 ms | 0 / 0 | 3132–3744 ms |

The branch's figures are in 04. The baseline screenshots are the committed `docs/qa/hero/` set (the hero is unchanged)
and the p = 0 frames in `qa/`.
