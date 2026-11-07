# Cloud QA: the brief of 6 Nov 2026

Every check here ran against a deployed Cloudflare preview (project `good-times-in-cape-town`, alias
`naturally-preview`), through its public URL, in a real browser where a browser is needed. Nothing was tested on a local
server, and nothing was deployed to production.

## 1. Deployments

| Deployment | Built from | Role |
|---|---|---|
| `ab1a914c` | `67cea72` | The approved preview before this round: the baseline for every before/after |
| **`1ee29be7`** | **`f48fe85`** | **The final deployment**, served at https://naturally-preview.good-times-in-cape-town.pages.dev |
| `e13bfd73` | the tree committed as `f48fe85` | The robustness scenarios (§3); the same site as the final |
| `92c573ed`, `860a978d` | the trees committed as `296150d` and `76e989c` | The performance measurements (`reports/performance-review.md`) |

## 2. Results at a glance

| Check | Where | Result |
|---|---|---|
| Unit and build tests (`npm test`) | the repository | **315 / 315** |
| Static checks (`npm run check`, `npm run guard`) | the built site | 25 pages, no problems; the brand guard clean |
| Smoke check (`scripts/cloudflare/smoke.mjs --env preview`) | `1ee29be7` and the alias | **23 / 23** on both: every page, security headers, `noindex`, redirects, the enquiry API in preview mode, the hero's media |
| Browser suite (Playwright: desktop 1440 × 900 and Pixel 7) | `1ee29be7` | **321 passed, 1 failed, 38 skipped** (9.1 min). The one failure is the Pixel 7 phone-gallery lift-out, which fails the same way on the baseline (§6) |
| Motion robustness (`qa/motion-robustness.mjs`) | `e13bfd73` | **Every scenario clean** (§3) |
| One photograph, one placement (`qa/media-duplicates.mjs` over `qa/media-audit.mjs`'s inventory of every route) | `1ee29be7` | **118 photographs in 118 placements**: none repeated |
| Before/after at five widths (`qa/surgical-shots.mjs`, `qa/surgical-compare.mjs`) | `ab1a914c` → `1ee29be7` | 8 routes × 360, 390, 768, 1024, 1440 px: **40 captures, none with horizontal overflow, a console error or a failed request** (the baseline's: the same). 13 composites a width (65) in `qa/surgical/brief-2026-11-06/compare/` |
| The Cape Peninsula entrance and the section entrances, frame by frame | `1ee29be7` | `qa/surgical/brief-2026-11-06/motion/` (§7) |

## 3. The brief's animation checks (§15)

`qa/motion-robustness.mjs` on a desktop and a Pixel 7, motion allowed. After each scenario, every motion-owned element
on screen and well into view must be fully opaque (its own opacity times its ancestors'), visible and unclipped.

| Scenario | Desktop | Phone |
|---|---|---|
| Fast scrolling: the whole home page in five large jumps | Clean (9 reveals jumped past wait above the screen and play when scrolled back to) | Clean (10 likewise) |
| Scrolling backwards: to the end, back to the top, down to the middle | Clean | Clean |
| Refreshing in the middle of the page (the scroll restored at the four ways) | Clean (was not: see below) | Clean |
| Away and back (another page, then back) | Clean; 44 ScrollTriggers before and after, none duplicated | Clean; 32 and 32 |
| Resizing: desktop to 390 px and back, across 48em | Clean | |
| Replay the intro (preview bar) | The intro replays and ends whole: the logo, the call to action, the statement | |
| Reduced motion, at four depths of the page | Clean (was not: see below) | Clean |

Two defects were found this way and fixed in `f48fe85`:
- after a reload or a return to the middle of the home page, the whole 5.8 s brand entrance still played, so the
  header's **Plan My Day** was invisible for about five seconds; a visitor past the hero now gets the header whole at
  once (a browser test covers it);
- with reduced motion, the Cape Peninsula's words waited for a fade as the scene came into view; they are now simply
  there.
A third, found while building this check: an entrance rebuilt by `gsap.matchMedia` after a resize, for a section the
visitor had already passed, could wait for a trigger that would not come (fixed in `200a43b`).

The browser suite adds, on both devices: the aircraft lands to the pixel and its landing starts the titles; the header
stays in the tab order during the entrance; a resize or a scroll mid-flight lands it; the sand scene's frames are the
same forwards and backwards; a lost WebGL context shows the static scene and comes back; a renderer arriving on
screen runs the words back over 0.7 s; the Cape Peninsula's words follow their plan (eyebrow, masked headline, line,
leaf) and run back when scrolled back; the coastal reveal leans in and settles, sand and photograph together; the
words never cover a print or the woman; focus shows them at once; the call to action reaches the tour page.

## 4. The client corrections and the brand, in the browser

| §15 item | Checked by | Result |
|---|---|---|
| Goat photograph and caption removed | `test/journey.test.mjs` (every built page), the media inventory | No page mentions goats; the photograph is out of the library |
| Two women, interlude | captures; `site.spec` composition tests | In place, once; words clear of the women on phones (owner to confirm the photograph: `reports/client-corrections.md`) |
| Airport Transfer photograph removed | `journey.test`, `site.spec` | The selfie is in no page, panel or form step; traveller 11 everywhere the airport service is shown |
| Transfers photograph improved | `journey.test`, captures | Traveller 12 banner (art-directed), traveller 13 airport section, the departure row different |
| Aquila team photograph | captures | The previous photograph restored; Aquila unconfirmed (owner) |
| City tour photograph replaced | `journey.test`, captures | Traveller 10, the guest whole at banner width |
| No duplicate photography | `qa/media-duplicates.mjs` | 118 photographs in 118 placements |
| The logo statement | `site.spec`, `journey.test` | "Make Unforgettable Experience In The Mother City", exactly, on every page |
| `info@` replaced by `hello@` in public content | `site.spec` (every page's mailto), `contact.test` | Every public address is hello@; stuart@ on the contact page |
| `stuart@` visible and clickable on Contact | `site.spec` | A `mailto:` link, labelled "Email Stuart", after hello@ |
| Hero reads "Find Your Good Time" | `site.spec`, `cta.test`, `journey.test` | To `tours/` |
| Navbar reads "Plan My Day" | `site.spec`, `cta.test` | Every page, from 40em; the menu and the call bar on phones |
| Leaf buttons display and work | `site.spec` (button system), `journey.test`, captures | Leaf-shaped, white words, a 3 px leaf ring on keyboard focus, 44 px minimum, links that go where they say |

## 5. Mobile and accessibility (§13)

- **Viewports**: 360, 390, 768, 1024 and 1440 px for the composites; a Pixel 7 for the browser suite, the robustness
  scenarios and the captures; 1024 × 768 and 768 × 1024 for the photograph crops.
- **Mobile**: navigation compact (the header's Plan My Day leaves the bar below 40em; a regression where the leaf
  showed there, squeezed, was found in the captures and fixed in `2d1b7bd`); the phone gallery stays in the hero's band
  below the faces; no horizontal overflow on any page at any width (`site.spec`); the Cape Peninsula scene is held for
  170svh on phones (200svh on desktops), its entrance shorter (× 0.8); the ways' photographs open upward as small
  thumbnails; no scroll-jacking (native scroll, CSS sticky); photographs sized per screen (art-directed where a portrait
  original met a wide frame).
- **Accessibility**: reduced motion shows everything at once (§3); keyboard order unchanged and visible focus on every
  control (the leaf's ring; the pills' 3 px outline); split headlines keep one accessible name; animated text never
  leaves the accessibility tree (opacity, never visibility); every leaf's drawing is `aria-hidden`; nothing flashes;
  nothing communicated by motion alone; with JavaScript off, every page is complete.

## 6. Known issues and limits

- **The phone gallery's lift-out on a Pixel 7** (`site.spec`, "a click on the phone lifts its photograph…"): the lifted
  photograph lands about 175 px wide where the test expects more than 261. The approved baseline `ab1a914c` fails it the
  same way (175 px), so it predates this round; the lift itself works.
- **The test browser draws WebGL in software**, so the sand scene runs in its lite tier in the tests and its frame rate
  here is not a phone's. Its behaviour (frames forward and backward, the reveal, the words) is tested; its speed on
  devices is the renderer's own, unchanged.
- **Three corrections need the owner's confirmation** (the interlude's photograph, Aquila, the reading of "the Airport
  Transfer photograph"): `reports/client-corrections.md`.

## 7. Evidence (all from the final deployment `1ee29be7` unless stated)

| What | Where |
|---|---|
| Every corrected photograph, before and after, with its source file | `qa/surgical/brief-2026-11-06/image-decisions.jpg` |
| Before/after composites, 13 sections and pages × 5 widths: the header and hero (the leaf calls to action), the sand journey's static scene, the moments (traveller 106), the interlude (the two women), the four ways (traveller 11), the people chapter, the invitation, the transfers banner (traveller 12), About (Meet our team), contact, the footer, the City tour banner (traveller 10) and the Private Cape Town Experience (its own photograph, now in the template's framed hero for a portrait photograph) | `qa/surgical/brief-2026-11-06/compare/<width>/` |
| The Cape Peninsula scene by scroll position (p 0.50, 0.60, 0.70, 0.95) and its words' entrance at six moments, desktop and phone; the reduced-motion scene | `qa/surgical/brief-2026-11-06/motion/scene-*.jpg`, `words-*.jpg`, `static-*.jpg`, `measurements.json` |
| The four ways, the invitation and the footer entering, desktop and phone; About's team photograph | `qa/surgical/brief-2026-11-06/motion/sections-*.jpg` |

The captures were taken in a headless Chromium: the sand draws in its lite tier, and an element screenshot on a phone
can catch the fixed call bar over the section (it stays at the screen's foot while the page scrolls).

