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
| Variants | `scenic.css`: `--copy` (behind a text band), `--head` (an inner page's title band: the sky beside the title, washed behind the words), `--bleed` (a horizon at the band's foot), `--side` (a tall accent at one edge), `--held` (stays in view while the band scrolls: `position: sticky` inside the layer, never `background-attachment: fixed`), `.gt-scenic-glass` (a white glass card over a band) |
| Measurement | `qa/scenic-contrast.mjs`: every line of words over every placement against the pixels behind it, at 1440 and 390 px |

Layers, back to front: the band's own background (unchanged), the photograph at the placement's presence shaped by the
variant's mask, a wash, then the content (`position: relative; z-index: 1`, never given opacity). Nothing animates; the
held plane is static under reduced motion; print and forced colours hide the layer. Each band loads only its own files.

## The placements

Three on the home page first (G2: three substantially different ones), then, at the owner's request of 8 Nov 2026 ("make
the added backdrop images a bit more visible, make the white foreground a bit translucent, add also to about and contact
sections, destinations and transfers"), one on each of those four pages.

| Band | Scene (file) | Variant | Presence | Why there |
|---|---|---|---|---|
| Home, `.lc-memory` ("The best bits? They're yours to remember.") | `scene-big-sky`: Birger Strahl, Unsplash `r3l0EazQLR4`, cropped to its sky | copy | 20% | The first quiet editorial band after the hero: open sky and light behind the heading; the guest's photograph sits above it, untouched |
| Home, `.lc-ease` ("All the wonder. None of the worry.") | `scene-sunset-horizon`: Eelco Böhtlingk, Unsplash `W2ddocn162g`, cropped to its dusk cloud only (no horizon, no tree) | copy, behind the heading only | 24% | The journey band: a dusk sky behind its heading, gone before the steps, their drawn route and the button, which stay on the band's clean ground |
| Home, `#reviews` (the review wall), wide screens only | `scene-breaking-wave`: chabraoui el hachemi, Pexels `33677109` ("Beautiful Seascape at Casablanca, Morocco") | side, held | 27% | The trust chapter's surround: the sea at its right edge, held in view as the cards pass; the rating bar and the cards are white glass over it; none on phones and tablets, where it would sit behind the heading |
| About, "Personal, local and safe." (our approach) | `scene-sunset-horizon`, as above | copy | 24% | A band of words only, between the team's photograph and the guests' photographs |
| Contact, the title band ("Let's talk Cape Town.") | `scene-blue-sky`: Ross Green, Pexels `36048580` ("Serengeti National Park Scenic Landscape"), cropped to the sky above the acacia | head | 32% | The page's title band; the contact details and the booking request below stay on their own white panels |
| Destinations, the title band | `scene-sunlit-cloud`: Birger Strahl, as above, cropped to the sunlit cloud on its left | head | 30% | The page's title band; the destination cards and their photographs below are untouched |
| Transfers, "What we need from you" | `scene-cloud-bank`: Ross Green, as above, cropped to the sky right of the acacia | copy | 24% | The page's last band of words, after the transfer choices, prices and photographs, which have none |

Sizes (AVIF / WebP): big sky 800, 1280, 1920 px: 7 / 8, 10 / 14, 15 / 25 kB; dusk cloud 800, 1280, 1920 px: 6 / 5,
8 / 10, 11 / 18 kB; breaking wave 480, 860, 1240 px: 13 / 26, 43 / 87, 90 / 178 kB (texture costs bytes, so it is
encoded lighter and drawn at most 44% of the screen wide); sunlit cloud 800, 1280, 1920 px: 7 / 6, 9 / 12, 13 / 21 kB;
blue sky 800, 1280, 1920 px: 2 / 3, 3 / 6, 4 / 10 kB; cloud bank 720, 1200, 1720 px: 4 / 8, 6 / 16, 9 / 28 kB. A desktop
visit to the home page fetches about 70 kB of backdrops in AVIF at 1440 px (about 115 kB on a high-density screen), each
only as its band nears the screen; a phone fetches only the two skies (the sea is not shown there). An inner page fetches
one file of 3 to 13 kB.

### The owner's request of 8 Nov 2026, and what it changed

- **More visible.** Each plane is about half as strong again: 13, 16 and 18% became 20, 24 and 27% on the home page, and
  the new bands sit at 24 to 32%. The `--copy` wash starts lower (at half the band, not 38%) and is lighter (the band's
  ground at 72%, not 90%).
- **A translucent foreground.** The glass over a plane (`--gt-scenic-card`) is 60% white instead of 88% (72% at first; the
  independent check of the preview measured that as 2 to 6 levels from a plain card, too little to see), with a 14 px
  blur (it was 10 px) so the words stay clear of the photograph; under reduced transparency, or without blur, it is the
  near-opaque white it was. The review wall's bar and cards on the home page take the same glass (`voices.css`).
- **Four more pages**, each in its quietest band of words (the table above), never behind prices, forms, tab panels,
  photographs or legal text. Two candidates were turned down: a wide crop of the Casablanca sea shows the city's skyline
  and a tall tower on its horizon (a possible landmark of another country), and the home page's big sky, in a short title
  band, shows its storm front as a grey mass, so Destinations has its own crop of the same photograph's sunlit cloud.
- **The words over the planes.** With the planes stronger, the small secondary words measured 3.7 to 4.4:1 over the
  darkest clouds (the accent green of eyebrows and chapter marks, the grey of leads, captions and breadcrumbs): over a
  plane they now take their stronger tones, deep green and the body ink (the header's own fix for its statement on
  glass). `qa/scenic-contrast.mjs` hides the band's words for one frame per screenful (and anything floating over the page,
  the header and the phone bar), samples the pixels behind each line and compares the text's colour with their worst
  decile: every line over every placement meets AA at 1440 and 390 px (the tightest, the steps band's large green
  "None of the worry.", 3.05:1 against the 3:1 large text needs). The same tool, pointed at `/reviews/`' title band
  (`--band=/reviews/@.reviews-photo`), found its white title at about 1.3:1 and its lead at 2.8:1 over the photograph, as
  they were on staging: the title is now ink and the small words their stronger tones (5.1:1 or more).

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
from Good Times tours and none shows Cape Town) and in `docs/RIGHTS_REGISTER.md`. The four placed photographs were
checked on their own pages on 8 Nov 2026 (author, title, free licence; the Ross Green photograph's page also names its
place, Serengeti National Park in Tanzania); the others carry the author as their file name gives it.

## Adding a placement

Add the file to `media-src/scenic/`, its record to `SCENES`, a placement to `PLACEMENTS`, run
`node src/tools/build-scenic.mjs`, then add `gt-scenic-host` and `${scenicLayer('<id>')}` to the section and
`assets/css/scenic.css` to the page's styles. The brief's ranges were 6–12% for wide bands; the owner asked for more on
8 Nov 2026, so the presence is set by eye and then measured: run `node qa/scenic-contrast.mjs --base=<url>
--only=<id>` and keep every line at AA. Never behind prices, forms, legal text, long quotes, the header or a photograph
that is the content; at most nine placements in all.
