# Asset manifest: the owner's photograph corrections (brief of 6 Nov 2026, §2 and §3)

Every photograph this round placed, moved or retired, with its source, rights basis, renditions and art direction.
The complete library is `src/data/images.mjs` (one entry per photograph, its alt text and focal point) and
`src/data/images.generated.json` (the renditions built). What each placement shows and why is reported in
`reports/client-corrections.md`.

## 1. Pipeline and rules

- **Originals** are kept out of the repository (`media-src/`, git-ignored): the Drive originals in `media-src/drive/`,
  downloaded unmodified, except where noted (a guest's name pixelated on a welcome sign).
- **Renditions**: `node src/tools/build-images.mjs --only=<name>` writes AVIF and WebP at 480, 800, 1200 and 1600 px
  (2000 for full-bleed photographs), never wider than the original, to `src/assets/img/<name>-<width>.{avif,webp}`.
  Pages use `<picture>` with both formats, a `srcset` of those widths and a `sizes` for the width the photograph is
  drawn at; below the fold they load lazily (`loading="lazy"`, `decoding="async"`); a page's banner is eager with
  `fetchpriority="high"` and preloaded.
- **Art direction**: each placement crops with `object-fit: cover` on the photograph's focal point (`focus` in the
  library, overridable per placement), checked at 390, 768, 1024 and 1440 px: no face, sign or subject cut.
- **One photograph, one placement** (§3): `qa/media-duplicates.mjs` over `qa/media-audit.mjs`'s inventory of the
  deployed preview. A service's photograph (its home card, its concierge row, its choice in the booking form) and a
  tour's card wherever it lists that tour count as one placement each (`audit/image-change-register.md`, E1 to E5).
  Result on deployment `ac619f8c`: **118 photographs in 118 placements, none repeated**.
- **Rights basis** (`docs/RIGHTS_REGISTER.md`): **O** owner-approved by name or by this brief for its placement;
  **S** the company's Drive library; **T** the company's own published photographs; **U** the company's original
  website, upscaled; **W** the company's website; **G** generated, supplied by the owner and credited as such;
  **L** openly licensed, credited.

## 2. The corrections

| § | Placement | Before | Now | Source (Drive file) | Basis | Renditions (original) | Focus | Alt text |
|---|---|---|---|---|---|---|---|---|
| 2.1 | Home, the moments collage (frame c, 4:3) | `fairview-goat-tower`, "The goat tower at Fairview, on a Winelands day." | `guide-selfie-peninsula`, "With our guide, high above the Peninsula" | `replace-goats-on-home-page-Cape Peninsula Private Tour - traveller 106.jpg` (`1M3mT3uMm2adGjIXdo0g8HqIn_zwtfRTe`) | O | 480–1600 (2048 × 1536) | 50% 50% here (62% 58% in the library) | Two guests and their guide in a smiling selfie above the coast of the Cape Peninsula, a mountain and the sea behind them |
| 2.2 | Home, the interlude (first backdrop) | `cape-point-cliffs` | `private-guests-arms-raised` | The company's original website (`private-guests-arms-raised.jpg`), the only photograph of two women with raised hands in blue tones in the library or the site's history | U | 480–2000 (2880 × 2160) | 64% 46%; 66% 52% on tall screens (the words above the women on phones, over a top scrim) | Two guests with arms raised on a rock above the ocean, the coastline beyond |
| 2.3 | The airport service: its way on the home page, its row in the concierge and the phone menu, its choice in the booking form | `transfer-driver-selfie` (a selfie of three people outside departures, "Good Times profile page - 19") | `airport-welcome-banner` | `Cape Town Private Airport Transfer - traveller 11.jpg` (`1wQ_FQt8v2YKme6Lvj7kjsKmS_A-56WIU`) | O | 480–1536 (1536 × 2048) | 50% 42% (the banner whole at 3:2 and in the phone's square) | A welcome banner for Cape Town International Airport hanging under the glass roof of its terminal |
| 2.3 | Transfers page, the banner | `airport-departures-wave` | `airport-mother-city-welcome` | `Cape Town Private Airport Transfer - traveller 12.jpg` (`1ymhJ6T9Up8FY23WbC6mLXPFQRH1Cbd7q`) | O | 480–1536 (1536 × 2048) | 50% 32% (backs to the camera: the page title sits over the hall, not over a face) | Two travellers wheeling their suitcases through the arrivals hall at Cape Town International Airport, towards a stone wall that reads Welcome to the Mother City |
| 2.4 | Transfers page, the airport transfer section | `airport-departures-group` (operator 05) | `airport-meet-and-greet` | `Cape Town Private Airport Transfer - traveller 13.jpg`, the arriving guest's name on the welcome sign pixelated (`…traveller 13-name-blurred.jpg`) | S | 480–1536 (1536 × 2048) | 45% 40% | A Good Times driver with a welcome sign giving a thumbs-up beside an arriving guest and his suitcases in the terminal at Cape Town International Airport |
| 2.4 | Transfers page, the Airport departure row | `airport-arrivals-group` (four guests under the All Departures sign) | Unchanged | | T | 480–1600 | 50% 52% | Four smiling guests with their luggage at the airport |
| 2.5 | About, Meet our team (5:4) | `owner-portrait` (since 6 Nov) | `winelands-garden-lunch`, the photograph the section showed from the site's first version (5 Nov) until 6 Nov | The company's original website (`winelands-garden-lunch.jpg`) | U | 480–1600 (2000 × 1600) | 50% 46% | Guests and their guide smiling around a garden lunch table under the trees |
| 2.6 | City tour page, the banner | `castle-cannon-couple` (the unclear couple photograph) | `bokaap-pink-blue-houses` | `Cape Town Private City Tour - traveller 10.jpg` (`1_kTTXimQM3HztDyBY0kJ9n58lZ5-Quju`) | O | 480–2000 (4284 × 5712) | 50% 66% (the tour's own `heroFocus`: the guest whole at banner width) | A guest at the white-railed steps of a bright pink house beside a blue one on a Bo-Kaap street |

## 3. Moves that keep every photograph in one place

| Photograph | Was | Now | Why |
|---|---|---|---|
| `guide-selfie-peninsula` (traveller 106) | The hero phone's sixth photograph | The home page's moments (§2.1) | The brief: "Do not duplicate this image elsewhere on the site" |
| `peninsula-rocks-pair` (`Cape Peninsula Private Tour - traveller 050.jpg`, S) | Not shown | The hero phone's sixth photograph, "The Cape Peninsula" | Takes traveller 106's place in the phone |
| `private-guests-arms-raised` | The Private Cape Town Experience's banner | The interlude (§2.2) | One place only |
| `coast-sunset-couple` (S) | That tour's card | Its card and banner (a tour with one photograph is one placement, E4) | Replaces the banner the interlude took |
| `owner-portrait` (`about-image.jpg`, S) | About, Meet our team | The home page's people chapter, "The owner of Good Times, across the bay from Table Mountain" | Meet our team has its previous photograph back (§2.5); `about-image.jpg` is not assumed to be the Aquila photograph |
| `airport-departures-trolley` (operator 04, T) | The transfers gallery | Unchanged | Assessed for the departure row (§2.4) and kept in the gallery: see the report |

## 4. Retired

| Photograph | State | Why |
|---|---|---|
| `fairview-goat-tower` | Removed from the library with its caption and its eight renditions | §2.1 |
| `transfer-driver-selfie` | Removed from the library with its eight renditions | §2.3: the personal photograph |
| `airport-terminal-arrival` (traveller 04) | Removed | Tried for the transfers banner on 7 Nov: the faces filled the banner and the title sat over them |
| `cape-point-cliffs`, `airport-departures-wave`, `airport-departures-group`, `castle-cannon-couple` | Kept in the library, shown nowhere | Replaced in their placements; kept for the owner's later use (the couple photograph only if the owner wants it back) |

## 5. Candidates assessed and not used

| Candidate | Why not |
|---|---|
| `Cape Town Private City Tour - traveller 17.jpg` | The brief's link (`1syQnHbzKgJKyNKsv6mdYszUD_OgyWNbV`) opens a different photograph (a café table) from the one it describes (a guide with travellers at a Table Mountain model, a separate Drive file whose id begins `1Br9IYlO`). Not needed: traveller 10 leads the City tour |
| `Cape Town Private City Tour - traveller 20.jpg` (`139xEsXPVYNebLEovBP8c6p-6CiOO03HI`) | A market scene for secondary storytelling only (§2.6); the City tour's page has no free secondary placement without a duplicate |
| `Cape Town Private Airport Transfer - operator 04.jpg` for the departure row | Two guests small under the sign with much empty pavement; the row's current photograph (four guests under the same sign) is clearer. Kept in the gallery |
| `Cape Town Private Airport Transfer - operator 03, 06, 07` | 03 is the scene already in the transfers gallery; 06 is the old banner the owner wanted improved; 07 is the same couple as 06, at 1080 × 720 |
| `Cape Town Private Airport Transfer - traveller 03.jpg` | Another selfie, on an apron in front of an airline's aircraft |
| The Drive's "replace-A selfie above the bay" files (a leopard, a cheetah) | Not part of the brief; flagged in the report |

## 6. Other assets this round

No new photograph was generated, upscaled or retouched beyond the name blur. The signature leaf
(`src/partials/ui.mjs`) and the airport route motif (`src/pages/index.mjs` › `ROUTE`) are inline SVG, decorative and
hidden from assistive technology. GSAP's CustomEase and SplitText 3.15.0 joined the vendor folder (`NOTICE.md`).
