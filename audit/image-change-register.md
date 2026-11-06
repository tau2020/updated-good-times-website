# Media audit — image change register

Every photograph that changed place, by route and section: what was there, the issue, what replaced it, the source,
the reason and where the photograph is used now. Baseline: approved `main` at `9e9b201`. Branch:
`ultraxen/adoring-feynman-csxwl3`. There are no undocumented swaps. The rights basis of every new photograph is in
`docs/RIGHTS_REGISTER.md` § "Added in the media audit (6 Nov 2026)", with its Drive file and ID. Hashes,
renditions and every placement are in `image-asset-manifest.json`.

## How "one photograph, one place" was applied

The brief's exceptions (§5.1): responsive derivatives of the same placement, a photograph in its own linked
lightbox, a video's poster in the same placement, and logos and icons.

The site's components also repeat by design. These are counted as one placement each (`qa/media-duplicates.mjs`):

| | One placement | Why it is one |
|---|---|---|
| E1 | A tour's (or package's) **card**: the tour list, similar days, the package list, the concierge's featured days, the booking form's summary of the chosen tour, and a destination card linking to that same page | The card is the tour's identity. Every one of these links to the tour it shows. |
| E2 | A service's photograph: its home-page card, its concierge row and its choice on the booking form | The same service, offered in three places. |
| E3 | A destination's photograph: its home-carousel slide and its destinations-page card | The same destination, in two lists. |
| E4 | A tour with one photograph: its card and its page's hero | A single-photo tour (whale watching, shark diving, quad biking, skydiving) has nothing else to show. |
| E5 | A tour's gallery: its wall, its photo band (the gallery's cover, which opens the lightbox on itself) and its lightbox | The band is the gallery's cover. `media.js` couples it to the wall. |

The concierge panel and the header and footer are one placement each, however many pages carry them.

Outside E1–E5, a photograph appears once. A tour's gallery no longer repeats its own hero or card
(`photosOf()` in `src/pages/tours.mjs`). The unit test "a gallery never repeats its tour's hero or card, nor its
package's" guards this.

Source codes: **T** Good Times upload (operator photographs in the Drive library) · **S** supplied by the owner ·
**O** a guest's photograph the owner approved in the Drive file name (`-approved`, `use-for-`, `replace-`) · **L**
openly licensed, third party, credited (only where Good Times has no photograph) · **G** AI-generated (the owner's).

## Result

| | Before (approved `main`) | After (feature preview) |
|---|---|---|
| Distinct photographs on the 18 audited routes (1440 px, every element, shown or in a closed tab or lightbox) | 50 | 119 |
| Placements | 117 | 119 |
| Photographs in more than one placement | 41 | **0** (also 0 at 390 and 1024 px, and on all 23 routes) |
| Photographs on screen (18 routes, 1440 px) | 123, of 48 distinct | 140, of 95 distinct |

Sources: `audit/dups-before.json`, from the baseline's inventory in `screenshots/before/`, and `audit/dups-after.json`,
from the final deployment's inventory in `screenshots/final/` (390 px, every route). Both were written by
`qa/media-duplicates.mjs`. The six-width capture in `screenshots/after/` gives the same result at 390, 1024 and
1440 px.

## Home `/`

| Section | Before | After | Original issue | Source | Reason · resulting usage |
|---|---|---|---|---|---|
| Hero phone gallery, "Cape Town Memories" (6.A) | `memories-table-mountain`, `memories-boulders`, `memories-bokaap`, `memories-camps-bay`, `memories-cape-of-good-hope`, `memories-sunset` | `chapmans-peak-couple` (Chapman's Peak Drive), `bokaap-street-pair` (Bo-Kaap), `boulders-penguin-selfie` (Boulders Beach), `vineyard-couple` (The Winelands), `cape-point-lighthouse-trio` (Cape Point), `guide-selfie-peninsula` (The Cape Peninsula) | Six 549–828 px crops saved from an old website, enlarged in the lift-out view. Generic views (a sunset, Camps Bay) rather than days on tour. | Drive: `Good Times profile page - 07.jpg` (T), `good-times-cape-town-146/120/050/353.jpg` (S), `replace-goats-on-home-page-…traveller 106.jpg` (O) | Real guests on the stops of the Peninsula, City and Winelands days, 1080–4032 px. The gallery's controls, timeline, swipe, lift-out and order logic are unchanged. Each photograph appears only here. The `memories-*` renditions are deleted. |
| Sand journey destination (§3) | `ocean-footprints-reveal`, a still | Film `beach-film-1280.mp4` over its poster `beach-film-poster` (the film's first frame) | The owner replaced the still with a film of the same picture | Drive `section-2-video.mp4` (ID `1hfka3frMV2pH8Hk1UGYdRvfDSuuiUSKC`), G | Plays muted, inline, looping and without controls once the sand sweep nears. The footprints, the sweep and the ScrollTrigger are unchanged. The still's renditions are deleted. |
| Moments b (6.C) | `guide-selfie-bay` | `above-the-bay-selfie` | A cramped 315 px-class crop, also the Private Experience card and in its gallery (3 placements) | Drive `good-times-cape-town-025.jpg` (S) | Everyone's head and face in frame, with the bay behind, 2048 px. Focus 36% 62% keeps the group whole at every width. Only here. |
| Moments c (6.D) | `fairview-goat-tower`, 3:2 frame | `fairview-goat-tower`, 4:3 frame | The 3:2 crop cut the tower's arch and ramp. Also in the Winelands gallery. | Unchanged (T) | The library's only photograph of the tower, now whole in a frame of its own proportions. Removed from the Winelands gallery, so it appears only here. A photograph of the whole tower is requested (P10). |
| Destination carousel | Tour cards: `boulders-penguins-boardwalk`, `bokaap-street`, `langa-mural-guests`, `winelands-tasting-flight`, `hermanus-whale-sculpture`, `rooiberg-red-chair` | Each destination's own photograph (E3): `cape-of-good-hope-cove`, `table-mountain-garden-couple`, `langa-walk-guide`, `beyerskloof-estate`, `hermanus-whale-sculpture`, `map-of-africa-viewpoint` | Each slide repeated a tour card or hero | Drive (T/S). Overberg unchanged. | Slides now take their image from `destinations` in `tours.mjs`, the same one their destinations-page card shows (E3). The Garden Route shows the package's card (E1: it links to that package). |
| People, a (6.G) | `castle-cannons-group` | `castle-table-mountain` | The Castle small and soft behind a group. Also on About with the same caption. | Unchanged library photograph (T), moved here from the City tour's hero | The Castle's walls, cannons and Table Mountain are the subject, 3240 px. Only here. The old group photograph is retired. |
| People, b (6.F) | `winelands-garden-lunch`, 3:2 | `winelands-garden-lunch`, 5:4 | Three placements under three captions (here, About, the Winelands page) | Unchanged (T) | The guests, the food and the garden stay in the frame. Only here, captioned "Lunch in a Winelands garden". |
| Taste (6.H) | `winelands-host-pouring` (main) + `winelands-tasting-table` (inset) | `winelands-tasting-table` (main) + `winelands-host-pouring` (inset) | Both also on the Winelands page (hero, gallery). The square inset cut the table's guests at both edges, and the main photograph was soft. | Unchanged (T) | Recomposed (`46c4070`, `77e426a`). The table of five fills the main frame at its own 3:2 shape, with its whole width shown. The outdoor pour fills the square inset on the host and the guest. Both are now only here, and the Winelands page has its own. |
| Ways, the four services (E2) | `cape-of-good-hope-sign`, `airport-departures-wave`, `quad-bikes-dunes`, `rooiberg-red-chair`, plus separate concierge thumbnails | `chapmans-peak-wall-trio`, `transfer-driver-selfie`, `shark-cage-gansbaai` (L), `cape-point-boardwalk-walk` | Every card repeated a photograph from elsewhere (a gallery, a hero, a banner) | Drive (T/S). Commons, Olga Ernst, CC BY-SA 4.0 (adventure) | One photograph per service, on its card, its concierge row and its booking-form choice (E2). The adventure card is a credited third-party photograph of the shark-cage diving the tours offer. Good Times' own adventure photographs lead the quad-biking page and the home adventure chapter. |
| Gallery, 12 prints | `boulders-penguin-colony`, `muizenberg-huts`, `castle-moat`, `mandela-statue-drakenstein`, `district-six-museum`, `marine-dynamics-boat`, `winelands-terrace`, `company-garden-squirrel`, `langa-mural`, `bokaap-selfie`, `langa-traditional-drink`, `map-of-africa-viewpoint` | `boulders-shadows`, `muizenberg-huts`, `cape-minstrels`, `mandela-statue-drakenstein`, `city-heritage-plaque`, `cape-point-aloes`, `burger-lunch-guide` (food), `cape-point-zebra`, `winelands-couple-tasting`, `lunch-spread-guests` (food), `langa-home-visit` (food), `winelands-red-tasting` | 10 of 12 prints were also a tour's photograph somewhere else | Drive (T/S), the earlier library (`cape-minstrels`, T) | Twelve photographs shown only here (the Mandela statue left the Winelands gallery). Two show food: a guide's lunch with guests and a lunch spread with guests. Their captions say lunch is a stop on the day, paid on the day and never part of a tour's price, and they link to all tours, not to one. `langa-home-visit` shows a home visit, not a meal, and is captioned as one. |
| Gallery tiles, phones and tablets | Squares in the last two rows | 4:3 for `lunch-spread-guests`, `winelands-couple-tasting`, `langa-home-visit`, `winelands-red-tasting` (`77e426a`) | The squares cut the lunch photograph's outer guests and one of the home visit's two | — | A crop change only. The rows stay flush, and the tablet row that set a 4:3 print beside a square, inherited from the baseline, now lines up. |
| Road chapter, phones (6.B) | `chapmans-viewpoint-couple`, phone crop at 72% | Same photograph, phone crop at 30% (`--focus-tall`) | On a phone the scene shows about a quarter of the photograph's width: the couple's faces sat under the heading and line, enlarged about 3× | Unchanged (T) | Phones now see the coast and the headland under the words. Wider screens keep the couple beside the words. A crop change only. |
| Concierge panel scene | `cape-point-cliffs` | `cape-point-coast-view` | Also the home adventure chapter and the tours banner | Drive `good-times-cape-town-107.jpg` (S) | Only here. |
| Chapters (water reveal, adventure, road, golden, invite) | `peninsula-bench-view`, `cape-point-cliffs` + `quad-bikes-dunes`, `chapmans-viewpoint-couple`, `table-mountain-sparkling`, `camps-bay-twelve-apostles` | Unchanged | Each was also used elsewhere | — | Kept here as the strongest placement (full-bleed scroll chapters), and removed from the banners, heroes and galleries that repeated them. |

## About `/about/`

| Section | Before | After | Original issue | Source | Reason · resulting usage |
|---|---|---|---|---|---|
| Banner | `peninsula-bench-view` | `cape-coastline` | Also the home water-reveal chapter and the Peninsula gallery | Drive `Good Times profile page - 09.jpg` (T) | A people-free coastline, so no face sits under the heading. Focus 60% 50% (66% on phones). Only here. |
| Story pair | `boulders-penguins-boardwalk` + `langa-mural` | `boulders-beach-penguins` + `langa-mural-visit` | Both were tour cards and in galleries (4 placements each) | Drive `good-times-cape-town-384.jpg` (S), `Langa Township Private Tour - operator 01.jpg` (T) | The same two subjects, in photographs used only here. |
| Meet our team (§4, 6.M) | `winelands-garden-lunch`, "Guests and their guide at lunch on a Winelands day" | `owner-portrait`, "The owner of Good Times in Cape Town, across the bay from Table Mountain" | The owner's photograph was requested here. The lunch photograph was used three times. | Drive `about-image.jpg` (ID `1vDuC670_JcIgLo1Z9MKRoe5EYk1rJaHg`), S | The exact file (SHA-256 recorded in the manifest), whole in a 3:2 frame of its own proportions at every width (`object-position` 72% 45%), served from the site's own renditions (480–1600 px AVIF/WebP). The lunch caption went with the lunch photograph, which is now only on the home page. |
| Faces (4) | `castle-cannons-group`, `cape-of-good-hope-sign`, `langa-mural-guests`, `winelands-cape-dutch-group` | `castle-cannon-pair`, `good-hope-walk-couple`, `winelands-tasting-deli`, `hout-bay-viewpoint-pair` | All four were used elsewhere (home, heroes, galleries) | Drive (T) | Four guest photographs used only here. The captions describe what each shows. |

## Tours `/tours/` and the tour pages

| Route · section | Before | After | Original issue | Source | Reason · resulting usage |
|---|---|---|---|---|---|
| `/tours/` banner | `cape-point-cliffs` | `cape-point-headland` | Also on home and in the concierge | Earlier library (T) | Only here. Focus 58% 44%, preload updated. |
| `/tours/` collage | `boulders-penguin-colony`, `bokaap-street`, `winelands-tasting-flight` | `boulders-two-penguins`, `bokaap-pink-wall`, `winelands-glasses-up` | All three were tour cards or gallery prints | Drive (T) | Only here. |
| `/tours/#adventure` (6.E) | Quad biking: `quad-bikes-dunes` (hero, repeated four times). Shark diving: `marine-dynamics-boat`. Skydiving: logo artwork. | Quad biking: `quad-bikes-convoy` (hero = card, E4). Shark diving: `marine-dynamics-boat` (hero = card). Skydiving: `skydive-tandem` (L). | Repeats. One activity had no photograph. | Library (S/U). Commons CC0 (skydive). | Each activity shows what it is. The skydiving photograph is credited on the hero as "not taken in Cape Town" and is not presented as a Good Times jump (6.J). No lion or cheetah photograph was added: no tour or package offers one. The library's cheetah and leopard photographs (file names for other uses, P10) are not used. |
| Cape Peninsula: hero, gallery | Hero `chapmans-viewpoint-couple`. Gallery `boulders-penguin-colony`, `cape-of-good-hope-sign`, `muizenberg-huts-guests`, `hout-bay-flag-frame`, `peninsula-bench-view`. | Hero `hout-bay-viewpoint-couple`. Gallery `boulders-welcome-sign`, `boulders-penguin-colony`, `cape-point-sign-trio`, `cape-point-ostrich`, `cape-point-boardwalk`, `boulders-couple-selfie`. | The hero was a home chapter. Four gallery prints were used elsewhere. | Drive (T/S) | Six stops of the day, in itinerary order, shown only here. The card `boulders-penguins-boardwalk` is unchanged (E1). |
| City: hero, gallery | Hero `castle-table-mountain` (also in its gallery) | Hero `castle-cannon-couple`. Gallery `heritage-building-guests`, `district-six-museum`, `castle-moat`, `bokaap-selfie`, `company-garden-squirrel`. | Hero repeated in its gallery. Three prints were also in the home gallery. | Drive `Cape Town Private City Tour - operator 05.jpg` (T) | The Castle photograph moved to the home page (6.G). The gallery keeps its five, now only here. `bokaap-selfie` was re-sourced to the library's sharper original. |
| Winelands: hero, gallery, pleasures | Hero `winelands-host-pouring`. Gallery `fairview-goat-tower`, `mandela-statue-drakenstein`, `winelands-terrace`, `winelands-cape-dutch-group`, `winelands-tasting-table`. Pleasures right `winelands-garden-lunch`. | Hero `winelands-cape-dutch-group`. Gallery `winelands-terrace`, `winelands-tasting-counter`, `winelands-group-tasting`, `winelands-terrace-guide`. Pleasures right `winelands-estate-terrace`, "Wine served at the table on an estate terrace, on a Winelands day". | Every one of these was used elsewhere too | Drive (T) | The Winelands page keeps its own tastings and another real estate table (6.F, 6.M). The new caption says what the photograph shows: wine served at the table, with no food in the frame. The goat tower and the taste photographs are only on home. |
| Township (Langa) gallery (6.L) | `langa-mural-guests`, `langa-traditional-drink`, `langa-mural` (3, all repeated) | `langa-traditional-drink`, `langa-homes`, `langa-womens-anti-pass`, `langa-blue-home`, `langa-museum-room`, `langa-marches-1960` (6) | Three photographs, each also used elsewhere | Drive: `Langa Township Private Tour - operator 08/12.jpg` (T); `…traveller 26/35/39-approved.jpg` (O) | Six photographs of Langa itself (homes, the museum and its 1960 marches, the women's anti-pass history) from Langa tours. Only here. Hero `langa-mural-guests` and card `langa-mural` are unchanged and no longer repeated. |
| Private experience: card, gallery | Card `guide-selfie-bay`. Gallery `private-guests-arms-raised`, `guide-selfie-bay`. | Card `coast-sunset-couple`. Gallery `beach-thrones`, `chapmans-peak-guide-selfie`. | Card and gallery repeated each other and the home moments | Drive (S/T) | Three photographs of private days, only here. |
| Whale watching | Card `hermanus-whale-sculpture`. Gallery `hermanus-frame` + the sculpture. | Hero = card `hermanus-frame` (E4). No gallery. | The sculpture repeated as card, destination and gallery | Unchanged (T) | The sculpture is the Overberg destination's photograph (E3). The whale page leads with its framed Hermanus photograph. |
| Cape Agulhas (6.I) | Logo artwork placeholder (hero and card) | Hero `agulhas-tip-marker`, card `agulhas-lighthouse` (both L) | A placeholder | Commons: Shaomi72 CC BY-SA 3.0; Josep M. Gracia CC BY-SA 4.0 | The southernmost-tip marker and the lighthouse, the two sights the tour lists. Credited on the hero and on the privacy page. No placeholder remains anywhere on the site. |
| Quad biking | Hero `quad-bikes-dunes`. Gallery `quad-bikes-dunes`, `quad-bikes-convoy`. | Hero = card `quad-bikes-convoy` (E4) | Its hero repeated in the home chapter, a service card and its gallery | Unchanged (S) | `quad-bikes-dunes` is only the home adventure chapter. |

## Other pages

| Route · section | Before | After | Original issue | Source | Reason · resulting usage |
|---|---|---|---|---|---|
| `/destinations/` cards (E3) | Tour cards (see the carousel) | The destinations' own photographs | Repeats | Drive | As the home carousel (E3). |
| `/destinations/` flavours | `winelands-pergola-lunch` | `pergola-lunch-table` | Also on the Winelands page | Drive `good-times-cape-town-001.jpg` (S) | A couple at a table under a pergola. Only here. Framed on the photograph's recorded focus (`4d7f93f`), so the floor no longer fills the frame. |
| `/transfers/` airport service (6.K) | Hero `airport-welcome-sign` (a 1000 px source drawn at 706 px: 0.71 source pixels per device pixel). Gallery `airport-luggage-boot`, `airport-guests-luggage`. | Hero `airport-departures-group` (3105 px). Gallery `airport-guests-luggage`, `airport-departures-trolley`. | Soft, enlarged. The sign and the car boot are also the request rows' thumbnails. | Drive `Cape Town Private Airport Transfer - operator 05/04.jpg` (T) | Sharp departures scenes. The service text, prices, rows and booking flow are unchanged. |
| `/packages/` banner | `camps-bay-twelve-apostles` | `hout-bay-from-chapmans` | Also the home invite chapter | Drive `Good Times profile page - 08.jpg` (T) | Only here. Preload updated. |
| Garden Route package gallery | `rooiberg-red-chair`, `map-of-africa-viewpoint`, `cango-caves` | `cango-caves`, `garden-route-garden-path`, `mountain-road-arch` | It repeated the package's hero and card | Library, plus Drive `use-for-garden-route-…Garden path [traveller].jpg` (O) and `good-times-cape-town-277.jpg` (S) | Three photographs of the route, only here. |
| `/reviews/` photograph | `table-mountain-sparkling` | `diaz-beach-cove` | Also the home golden chapter | Drive `Good Times profile page - 13.jpg` (T) | A people-free view behind the heading. Only here. |
| `/enquire/` service choices | Photographs reused from tour cards | The services' own photographs (E2) | Repeats | As the services | The same photograph as the service card (E2). |
| Openly licensed photographs (M5) | Credited only on the privacy page | Credited on the photograph wherever it is shown larger than a small thumbnail: tour cards, the home adventure card, booking-form choices, heroes (`647a264`) | The independent critic found them uncredited beside their use | — | No photograph change. The skydive's credit says "not taken in Cape Town". |
| Phone gallery caption (M1) | The 9:16 first photograph pushed its caption onto the pager dots | The phone's photograph is capped at the screen's height, framed on its recorded focus (`647a264`) | The caption sat on the dots at every width | — | No photograph change |
| Cards everywhere (`cards.mjs`) | Default crop | Each card uses its photograph's recorded focus (`--focus`) | Cards cropped heads and subjects at narrow widths (6.B) | — | No photograph change. The crop keeps the recorded subject. |
| Winelands destination (home carousel, destinations card) (6.B) | `beyerskloof-estate` at 50% | Same photograph at 94% | The sign is wide, with guests at both ends: the portrait slides cut the couple on the right in half | — | A crop change only. The couple is whole in the slides and in the card. |
| Tour pages' photo band (6.B) | Always cropped from the middle (`--focus: 50% 50%`) | The band photograph's recorded focus, measured to keep heads: `boulders-welcome-sign` 46% 30%, `winelands-terrace` 50% 12%, `langa-traditional-drink` 46% 6% | The band shows under half the photograph's height at 1440 px and wider. In the baseline the Peninsula band cut three guests' heads and the Township band the Langa resident's. | — | A crop change only (the band photographs' gallery tiles show their full height). |
| Banners, tour heroes, photo bands, home chapters, taste and About frames (6.B) | `sizes="100vw"` (or the frame's width) | `coverSizes()`: 85% of the width the photograph is really drawn at | On phones these photographs were drawn up to 3× wider than the screen from an 800 px file (0.31–0.64 source pixels per device pixel) | — | The browser chooses a larger rendition where the crop needs it. The preload hints match. Nothing moves. |

## Retired

| Asset | Was | Why |
|---|---|---|
| `ocean-footprints-reveal` | The sand journey's still | Replaced by the owner's film. Master kept in `media-src/journey/` and Drive. |
| `memories-*` (6) and their ambient washes | The phone gallery | Thumbnail-size and generic (6.A) |
| `guide-selfie-bay` | Home moments, Private Experience card and gallery | Cramped (6.C), replaced in each placement |
| `castle-cannons-group` | Home people, About faces | Unclear Castle (6.G) |

The baseline's other repeated photographs stay on the site in one placement each. The one kept is named in the
tables above.

## Not found

6.B "Image Optimised": no element, caption or file carries this label (`grep -ri optimis src/`). The item's second
half (all poorly cropped or enlarged placements) is covered by the crop and resolution changes above and by
`image-quality-report.md`.
