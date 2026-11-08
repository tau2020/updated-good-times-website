# Scenic backdrops (8 Nov 2026)

The brief (§ B): a faint landscape kept behind a few chosen bands, the content floating in front, the way a search page
keeps its photograph behind the cards scrolling over it (`00-baseline.md` › 4). One component, opted into by named
sections; no background image anywhere else.

## The system

| Piece | Where |
|---|---|
| Registry: every supplied file, its author, licence, source, subject, place and status | `src/data/scenic.mjs` › `SCENES` |
| Placements: section, scene, variant, presence, focal points, reason | `src/data/scenic.mjs` › `PLACEMENTS` |
| Renditions: crop, resample, AVIF and WebP, never upscaled, from the git-ignored originals | `src/tools/build-scenic.mjs` → `src/assets/img/scenic/`, `src/data/scenic.generated.json` |
| The layer (decorative: `aria-hidden`, empty `alt`, lazy, low priority) | `src/partials/scenic.mjs` › `scenicLayer(id)` |
| Tokens | `tokens.css`: `--gt-scene-opacity`, `--gt-scene-focal-desktop`, `--gt-scene-focal-mobile`, `--gt-scene-fade`, `--gt-scene-paper` (the wash's colour, the band's own ground), `--gt-scene-wash`, `--gt-scene-mask`, `--gt-scenic-card` (and the header's `--gt-glass-*`) |
| Variants | `scenic.css`: `--copy` (behind a text band), `--bleed` (a horizon at the band's foot), `--side` (a tall accent at one edge), `--held` (stays in view while the band scrolls: `position: sticky` inside the layer, never `background-attachment: fixed`), `.gt-scenic-glass` (a white glass card over a band) |

Layers, back to front: the band's own background (unchanged), the photograph at the placement's presence shaped by the
variant's mask, a wash, then the content (`position: relative; z-index: 1`, never given opacity). Nothing animates; the
held plane is static under reduced motion; print and forced colours hide the layer. Each band loads only its own files.

## The three placements (G2: three substantially different ones first)

| Band | Scene (file) | Variant | Presence | Why there |
|---|---|---|---|---|
| Home, `.lc-memory` ("The best bits? They're yours to remember.") | `scene-big-sky`: Birger Strahl, Unsplash `r3l0EazQLR4`, cropped to its sky | copy | 13% | The first quiet editorial band after the hero: open sky and light behind the heading; the guest's photograph sits above it, untouched |
| Home, `.lc-ease` ("All the wonder. None of the worry.") | `scene-sunset-horizon`: Eelco Böhtlingk, Unsplash `W2ddocn162g`, cropped to its dusk cloud only (no horizon, no tree) | copy, behind the heading only | 16% | The journey band: a dusk sky behind its heading, gone before the steps, their drawn route and the button, which stay on the band's clean ground |
| Home, `#reviews` (guest voices), wide screens only | `scene-breaking-wave`: chabraoui el hachemi, Pexels `33677109` ("Beautiful Seascape at Casablanca, Morocco") | side, held | 18% | The trust chapter's surround: the sea at its right edge, held in view as the cards pass, faded out before the ribbon's small print; every card is opaque white glass; none on phones and tablets, where it would sit behind the heading |

Sizes (AVIF / WebP): big sky 800, 1280, 1920 px: 7 / 8, 10 / 14, 15 / 25 kB; dusk cloud 800, 1280, 1920 px: 6 / 5,
8 / 10, 11 / 18 kB; breaking wave 480, 860, 1240 px: 13 / 26, 43 / 87, 90 / 178 kB (texture costs bytes, so it is
encoded lighter and drawn at most 44% of the screen wide). A desktop visit to the home page fetches about 70 kB of backdrops in
AVIF at 1440 px (about 115 kB on a high-density screen), each only as its band nears the screen; a phone fetches only the
two skies (the sea is not shown there).

The words over each band are checked by axe in the browser suite and keep their contrast: the planes stay at 18% or
less, washed toward the band's own ground (`06-qa.md`).

The first version of the steps band showed the sunset's horizon and a line of acacias under the steps; the independent
critique (`07-critique.md`) read it, rightly, as savanna, and it tinted the steps' copy and showed rings around their
icons: the plate is now its cloud alone, behind the heading.

## Why no animal

The supplied set is almost all East African savanna and wildlife (zebra, giraffe, elephant, lion, hippo, gazelle, a
safari vehicle, Kilimanjaro). Good Times sells no safari: its tours are the Peninsula, the city, Langa, the Winelands, the
coast, the Garden Route, activities and transfers. The brief itself says wildlife may sit only beside safari-relevant
content and never where it could suggest a safari, so no animal is placed. The Tripadvisor listing's own description
mentions a "Big 5 Safari", which the website does not offer: if the owner adds one, `scene-zebra-sunbeams` and
`scene-acacia-gold` are ready as candidates (`SCENES`, status `candidate`), and the elephant and lioness plates are
listed with the reason they were left out. The two illustrations stay apart from the photographic system. Three
supplied files are not used for other reasons: thatched huts (could read as a community visit Good Times runs), a baobab
and a green valley (people, and places Good Times does not visit).

## Credits and rights

The photographs are the owner's supplied stock files. The Unsplash and Pexels licences allow free use without
attribution; they are credited anyway, on the Photo credits (`/privacy/#credits`, which also says plainly they are not
from Good Times tours and none shows Cape Town) and in `docs/RIGHTS_REGISTER.md`. The three placed photographs were
checked on their own pages on 8 Nov 2026 (author, title, free licence); the others carry the author as their file name
gives it.

## Adding a placement

Add the file to `media-src/scenic/`, its record to `SCENES`, a placement to `PLACEMENTS`, run
`node src/tools/build-scenic.mjs`, then add `gt-scenic-host` and `${scenicLayer('<id>')}` to the section. Keep to the
brief's ranges (wide bands 6–12%, text decoration 3–8%, more only at an edge away from the words), never behind prices,
forms, legal text, long quotes, the header or a photograph that is the content; at most nine placements in all.
