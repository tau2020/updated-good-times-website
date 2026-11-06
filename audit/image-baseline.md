# Media audit — baseline (Gate 0)

Recorded 6 Nov 2026, before any media change. Everything here was measured on the cloud, against the approved site
deployed unchanged to an isolated Cloudflare Pages preview. Nothing ran on a local server.

## What the baseline is

| | |
|---|---|
| Repository | `tau2020/updated-good-times-website` |
| Approved commit | `main` at `9e9b201` (6 Nov 2026 09:26 +02:00, "Merge pull request #1 from tau2020/feature/gtict-cinematic-sand-journey") |
| Baseline preview | https://media-baseline.good-times-in-cape-town.pages.dev (Pages project `good-times-in-cape-town`, deployment `9d9bc87a`, built from `9e9b201` with `node scripts/cloudflare/build.mjs preview`) |
| Feature branch | `ultraxen/adoring-feynman-csxwl3`, branched from `9e9b201` (the rollback point) |
| Feature preview | https://media-preview.good-times-in-cape-town.pages.dev (alias of the latest feature deployment) |
| Left alone | Production (never deployed) and the `staging` alias (still at `c62b28e`). No merge, no production configuration change. |

## Baseline checks (approved commit)

| Check | Result |
|---|---|
| `npm run build` | 25 pages built |
| `npm run check` (site QA) | 25 pages, no problems |
| `npm run guard` (brand guard) | 1,303 files clean |
| `npm test` (unit) | 293 / 293 pass |
| Browser tests (Playwright, the approved commit's own suite, against the baseline preview) | See `visual-regression-report.md` § Baseline failures: five tests already fail against a deployed preview. They fail the same way before and after this work. |

## The media inventory

`qa/media-audit.mjs` on the baseline preview, 18 routes × 6 widths (375, 390, 768, 1024, 1440, 1920). It used
`?nomotion` and reduced motion, so each page was captured in its finished, static composition:

```
node qa/media-audit.mjs --base=https://media-baseline.good-times-in-cape-town.pages.dev \
  --out=audit/screenshots/before --routes=<the 18 routes> --shots
```

| Per width (all six identical) | |
|---|---|
| Media elements in the DOM | 458 |
| Visible | 189 (123 photographs, 1 film, the rest logos, icons and artwork) |
| Distinct photographs visible | 48 |
| Page errors / failed media requests | 0 / 0 |

The five text routes (contact, FAQ, booking form, privacy, terms) were captured later with the same tool into
`screenshots/before-extra/`. The booking form was the only one of the five showing photographs.

Raw data: `screenshots/before/inventory-<width>.json` and `summary.json`. The baseline's section screenshots, about 42 MB,
are kept out of the repository. They can be taken again at any time from the baseline preview
(`node qa/media-audit.mjs --base=https://media-baseline.good-times-in-cape-town.pages.dev --out=<dir> --shots`). Every
section whose photographs changed is in `screenshots/compare/`, before beside after, at the six widths.

## Repeated photographs in the baseline

`qa/media-duplicates.mjs` applied the brief's exceptions (§5.1) and the documented identity exemptions E1–E5
(`image-change-register.md`). It used the approved commit's own data files.

**50 photographs in 117 placements: 41 photographs appeared in more than one placement.** The worst repeats:

| Photograph | Placements |
|---|---|
| `boulders-penguins-boardwalk` | About story pair · Peninsula tour card · a service card · the Peninsula gallery |
| `langa-mural` | Home gallery · About story pair · Township card · Township gallery |
| `cape-of-good-hope-sign` | Home "moments" · About faces · a service card · Peninsula gallery |
| `langa-mural-guests` | About faces · Township hero · Langa destination · Township gallery |
| `rooiberg-red-chair` | Garden Route hero · a service card · Garden Route destination · its gallery |
| `quad-bikes-dunes` | Home adventure chapter · Quad hero · a service card · Quad gallery |
| `winelands-garden-lunch` | Home people ("Lunch in a Winelands garden") · About ("Guests and their guide at lunch on a Winelands day") · Winelands pleasures ("A garden lunch on a Winelands day") |
| `castle-cannons-group` | Home people · About faces (same caption, "A city day at the Castle of Good Hope") |
| `guide-selfie-bay` | Home "moments" ("A selfie above the bay") · the Private Experience card · its gallery |
| `cape-point-cliffs` | Home adventure chapter · Tours banner · the concierge panel |

There were 31 more. Each tour's hero and card also appeared again in its own gallery. The full list is in
`dups-before.json` beside this file (generated). Each repeat's resolution is in `image-change-register.md`.

## Section 6 items as found

| Item | Baseline state |
|---|---|
| Beach reveal (§3) | The sand journey's destination was the still `ocean-footprints-reveal` (the owner's AI still `Golden Shoreline Footprints.png`, 1672 × 941). Its 1600 px rendition was enlarged at 768 px wide (0.77 source pixels per device pixel). |
| About photo (§4) | "Meet our team" showed `winelands-garden-lunch` captioned "Guests and their guide at lunch on a Winelands day". The same photograph was used twice more (see 6.F and 6.M). |
| 6.A Cape Town Memories | The hero's phone gallery: six `memories-*` crops 549–828 px wide (`memories-table-mountain` 552 × 462). They were saved from an old site at thumbnail size, so the lift-out view enlarged them. |
| 6.B "Image Optimised" | No element, caption or file on the site or in the source carries that label (`grep -ri optimis src/` finds only a CSS `text-rendering` value). The item was treated as its second half: every poorly cropped or enlarged placement. In the baseline, 29 photographs were drawn below 0.9 source pixels per device pixel somewhere (`image-quality-report.md` § Resolution). |
| 6.C "A selfie above the bay" | `guide-selfie-bay` (a 315 px-class crop) in the home moments, as the Private Experience card and in its gallery: three placements. |
| 6.D Fairview goat tower | `fairview-goat-tower`, a detail of the tower's arch, in the home moments and the Winelands gallery. |
| 6.E Adventure | `/tours/#adventure` lists quad biking, tandem skydiving and shark-cage diving. Only quad biking had photographs, and they repeated in four placements. Shark diving had one photograph of the boat (also in the home gallery and a service card). Skydiving had none. No tour lists a lion or cheetah encounter. |
| 6.F Winelands garden lunch | `winelands-garden-lunch` in three placements under three captions (see above). |
| 6.G Castle of Good Hope | `castle-cannons-group`: the Castle small and soft behind a group, in two placements. |
| 6.H Tasting outdoors / tasting table | `winelands-host-pouring` and `winelands-tasting-table` in the home taste section. Each also appeared on the Winelands page (hero and gallery). |
| 6.I Cape Agulhas | No photograph. Hero and card showed the logo artwork (`gt-mountain-trail.svg`), with the note "No Good Times photograph of Cape Agulhas exists yet". |
| 6.J Skydiving | No photograph: the same logo artwork as a placeholder. |
| 6.K Transfers | `airport-welcome-sign` (0.35 px per device pixel at 768 px in the airport panel; 0.71 in the section) and `airport-arrivals-group` (0.35). Both were small, soft sources. |
| 6.L Langa gallery | Three photographs (`langa-mural-guests`, `langa-traditional-drink`, `langa-mural`). Each also appeared elsewhere. |
| 6.M Guests and their guide at lunch | The About caption on `winelands-garden-lunch`, the same photograph as 6.F. |
| 6.N Food | Two distinct meal photographs (`winelands-garden-lunch`, `winelands-pergola-lunch`), each used twice, plus wine-tasting photographs. |

## Motion map (protected, not changed)

- Hero: GSAP entrance plus the hero film (`hero-moment-1280`) and the phone gallery (GSAP timeline, Flip lift-out).
- Sand journey: one ScrollTrigger scrubbing `p` 0→1 over a sticky stage, no pin. The WebGL2 renderer (full or lite
  tier, or a static fallback) draws the footprints and the sand sweep over the destination picture.
- Living Cape chapters: water reveal (`sun`), the adventure, road, golden and invite chapters, and the gallery
  lightbox (`media.js`).
- Tour pages: gallery wall plus lightbox. The phone gallery's lift-out is a modal dialog.

The film replacing the still sits inside the sand journey's destination element. It is the only motion change, and
it adds no animation owner: the film plays on its own clock, and its opacity is a CSS transition on its own element.
