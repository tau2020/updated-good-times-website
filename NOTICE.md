# Notices and provenance

## Framework provenance

The static-site generator, page shell, components, motion setup, enquiry
system and deployment tooling in this repository come from a website template
supplied by the owner for this conversion (5 Nov 2026). Only the framework was
kept: its structure, layouts, components, interactions and code. None of the
template's earlier operators' content, photography, video, logos, contact
details, prices, terms, reviews, backends, documentation, history or
credentials were carried over; `npm run guard` (`src/tools/brand-guard.mjs`)
fails the build if any of their identifiers comes back. This repository has its
own history, configuration and infrastructure.

## Good Times material

| Material | Location | Status |
|---|---|---|
| Approved Logo Pack v2 (logos, symbol, favicons, social avatar), used as supplied | `src/assets/brand/` | Good Times' own; supplied by the owner |
| Photographs | `src/assets/img/` (renditions only) | Good Times' own, from the Drive folder supplied by the owner; each one's status in `docs/RIGHTS_REGISTER.md` |
| The home hero's café film and the pictures in its phone gallery | `src/assets/video/`, `src/assets/img/hero-moment-poster-*`, `src/assets/img/memories-*` | AI-generated, supplied by the owner on 5 Nov 2026 for the home hero only; credited as such on the site (`docs/RIGHTS_REGISTER.md`, basis G) |
| The single-engine propeller aircraft (the owner's alternative to the logo's own airliner for the home entrance) | `src/assets/motion/gtict-real-aircraft.svg` | An original vector from the owner's motion package ("GoodTimes Cinematic Motion Package", 5 Nov 2026), used inline recoloured to the logo's greens; not a claim about any aircraft Good Times operates |
| Business facts, tours, prices, terms | `src/data/`, `src/pages/` | From goodtimesincapetown.co.za and Tripadvisor, read on 5 Nov 2026, with sources in the data files; open points in `docs/APPROVAL_REGISTER.md` |

## Third-party software and fonts

| Component | Location | Licence |
|---|---|---|
| Bricolage Grotesque (variable: weight 200–800 and optical size 12–96, latin subset, from `@fontsource-variable/bricolage-grotesque` 5.3.0, file `bricolage-grotesque-latin-opsz-normal.woff2`, unmodified) | `src/assets/fonts/BricolageGrotesque.woff2` | SIL Open Font Licence 1.1, `licenses/OFL-bricolage-grotesque.txt` |
| DM Sans (variable weight 100–1000 at optical size 14, roman and italic, latin subsets, from `@fontsource-variable/dm-sans` 5.3.0, files `dm-sans-latin-wght-normal.woff2` and `-italic.woff2`, unmodified) | `src/assets/fonts/DMSans.woff2`, `src/assets/fonts/DMSans-Italic.woff2` | SIL Open Font Licence 1.1, `licenses/OFL-dm-sans.txt` |
| Caveat (variable weight 400–700, latin subset, from `@fontsource-variable/caveat` 5.3.0, file `caveat-latin-wght-normal.woff2`, unmodified) | `src/assets/fonts/Caveat.woff2` | SIL Open Font Licence 1.1, `licenses/OFL-caveat.txt` |
| Brand marks for WhatsApp, Instagram, Facebook and Tripadvisor (path data from Simple Icons 16.33.0; the Facebook mark reduced to its "f") | `src/partials/ui.mjs` (`BRAND_MARKS`) | CC0 1.0, <https://github.com/simple-icons/simple-icons>. The marks themselves remain the networks' trademarks, used only to link to Good Times' own profiles |
| GSAP 3.15.0 core and its ScrollTrigger, Flip, MotionPathPlugin, CustomEase and SplitText plugins (from the `gsap` npm package, each byte-identical to `gsap@3.15.0/dist`; MotionPathPlugin added 5 Nov 2026 for the brand aircraft; CustomEase and SplitText added 7 Nov 2026 for the Cape Peninsula entrance and the signature leaf, home page only) | `src/assets/js/vendor/gsap.min.js`, `src/assets/js/vendor/ScrollTrigger.min.js`, `src/assets/js/vendor/Flip.min.js`, `src/assets/js/vendor/MotionPathPlugin.min.js`, `src/assets/js/vendor/CustomEase.min.js`, `src/assets/js/vendor/SplitText.min.js` | GreenSock Standard "no charge" licence, <https://gsap.com/standard-license> (free for commercial use since 3.13; the licence header is kept in the file) |

No other animation library is used. The sand journey's renderer is this repository's own WebGL2 code (`src/assets/js/motion/sand/`), with no third-party rendering library.
