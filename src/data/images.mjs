/**
 * Image manifest. One entry per image slot used by the templates.
 *
 * `src` is relative to the local, git-ignored `media-src/` folder, which holds
 * the originals from the Good Times in Cape Town Drive (see README › Media). Run
 * `npm run images` to regenerate `src/assets/img/<name>-<width>.{avif,webp}`
 * and `src/data/images.generated.json` (the widths actually produced, never
 * upscaled).
 *
 * Rights (docs/RIGHTS_REGISTER.md lists every file with its evidence):
 *   T = uploaded by Good Times in Cape Town to its own Tripadvisor listing; the owner
 *       approved their use in writing on 3 Nov 2026 (Drive › Tripadvisor Photo Collection ›
 *       08 - Rights & Permissions)
 *   W = published by Good Times on its own website, goodtimesincapetown.co.za (company-owned)
 *   U = a company website photograph enlarged for the web by the owner (Drive › Upscaled Images)
 *   S = supplied by the owner in Drive › Website Images; provenance to be confirmed by Good Times
 *   G = AI-generated, supplied by the owner on 5 Nov 2026 for the home hero only: the photographs in
 *       its phone gallery (HeroPhoneGallery, src/data/phone-gallery.json) and the café scene behind
 *       it (the film's held frame, `generated` below). Illustrations of five fictional friends, never
 *       presented as guests or as Good Times photographs, and used nowhere else but the hero and, at the owner's
 *       direction of 6 Nov 2026, the sand journey's destination after it (test/hero.test.mjs)
 *   O = a traveller's photograph from a Good Times tour that the owner approved for this site by name in the Drive
 *       library (its file name ends "-approved", or says where to use it: "use-for-…", "replace-…"; media audit,
 *       6 Nov 2026); the photographer's permission is the owner's to confirm (docs/APPROVAL_REGISTER.md)
 *   L = not a Good Times photograph: an openly licensed photograph (Wikimedia Commons), used only where Good Times has
 *       none (Cape Agulhas, skydiving, the adventure card), credited as its licence asks (`credit`, `license`, `source`)
 *       beside it where the layout has a caption and on the photo credits, and never presented as Good Times' guests
 *   E1–E4 in audit/image-change-register.md: a photograph appears in one editorial place only; a tour's card is that
 *       tour wherever it is offered as a link (the tour list, similar days, the concierge), and so are a service's and
 *       a destination's photograph; a tour with a single photograph shows it as its card and its page's hero
 * Guests appear in many photographs: their consent to marketing use is confirmed by Good Times
 * (docs/APPROVAL_REGISTER.md). No traveller photo from Tripadvisor, no reviewer avatar, no stock
 * image and no photograph of a child (or of anyone who may be under 18) is used: four selected
 * photographs were withdrawn on that ground (docs/RIGHTS_REGISTER.md › Withdrawn).
 *
 * `full: true` marks the home page's full-bleed scenes, which get a 2000 px rendition.
 * `ambient: true` adds a tiny blurred rendition (`<name>-ambient.webp`), the colour wash a phone
 * gallery shows above and below a landscape photograph.
 * `focus` is the subject's position (x% y%) for every cover crop of the photograph:
 * a placement may refine it, never ignore it.
 */

/** Where each origin code comes from, as the photo credits list states it (privacy/#credits). */
export const ORIGIN_NOTES = {
  T: 'Uploaded by Good Times in Cape Town to its own Tripadvisor listing',
  W: 'Published by Good Times in Cape Town on goodtimesincapetown.co.za',
  U: 'A Good Times photograph from goodtimesincapetown.co.za, enlarged for the web',
  S: 'Supplied by Good Times in Cape Town',
  G: 'An AI-generated illustration supplied by Good Times in Cape Town, not a photograph of guests',
  O: 'A guest’s photograph from a Good Times tour, approved for this site by Good Times in Cape Town',
  L: 'Not a Good Times photograph: used under its open licence',
};
/** The short credit beside a photograph (the gallery's lightbox). */
export const ORIGIN_CREDITS = {
  T: 'A Good Times photograph',
  W: 'A Good Times photograph',
  U: 'A Good Times photograph, enlarged for the web',
  S: 'A Good Times photograph',
  G: 'An AI-generated illustration',
  O: 'A guest’s photograph from a Good Times tour',
  L: 'Not a Good Times photograph',
};

const T = 'tripadvisor/';
const W = 'website/';
const U = 'upscaled/';
const S = 'library/';
// The media audit of 6 Nov 2026: the Drive library under its own file names (each file's Drive ID is in
// audit/image-asset-manifest.json), and the openly licensed photographs from Wikimedia Commons (1920 px renditions)
const D = 'drive/';
const C = 'commons/';

export const images = [
  // The home hero: Cape Point, people-free (a landscape and its phone crop)
  { name: 'cape-point-headland', src: `${T}cape-point-headland.jpg`, origin: 'T', full: true, focus: '58% 44%', alt: 'The rocky headland of Cape Point rising above the Atlantic, the coast fading south into haze' },
  { name: 'cape-point-headland-portrait', src: `${T}cape-point-headland-portrait.jpg`, origin: 'T', focus: '40% 40%', alt: 'The rocky headland of Cape Point rising above the Atlantic, the coast fading south into haze' },

  // Cape Peninsula
  { name: 'cape-point-cliffs', src: `${T}cape-point-cliffs.jpg`, origin: 'T', full: true, focus: '34% 46%', alt: 'Sheer cliffs above turquoise water at Cape Point, Table Mountain National Park' },
  { name: 'boulders-penguins-boardwalk', src: `${T}boulders-penguins-boardwalk.jpg`, origin: 'T', focus: '70% 70%', alt: 'African penguins on the white sand at Boulders Beach, the boardwalk and granite boulders behind' },
  { name: 'boulders-penguin-colony', src: `${T}boulders-penguin-colony.jpg`, origin: 'T', focus: '46% 62%', alt: 'A colony of African penguins on the sand between granite boulders at Boulders Beach' },
  { name: 'peninsula-bench-view', src: `${T}peninsula-bench-view.jpg`, origin: 'T', focus: '62% 60%', alt: 'Three guests, seen from behind, on a bench above a long white beach and the Atlantic' },
  { name: 'chapmans-viewpoint-couple', src: `${T}chapmans-viewpoint-couple.jpg`, origin: 'T', full: true, focus: '66% 56%', alt: 'A couple seated at a viewpoint high above the Atlantic, cliffs and coastline behind them' },
  { name: 'muizenberg-huts-guests', src: `${T}muizenberg-huts-guests.jpg`, origin: 'T', focus: '50% 58%', alt: 'Three guests in front of the colourful bathing huts at Muizenberg Beach' },
  { name: 'muizenberg-huts', src: `${S}muizenberg-huts.jpg`, origin: 'S', focus: '50% 52%', alt: 'A row of brightly painted bathing huts on the sand at Muizenberg' },
  { name: 'cape-of-good-hope-sign', src: `${T}cape-of-good-hope-sign.jpg`, origin: 'T', focus: '56% 58%', alt: 'Four guests behind the Cape of Good Hope sign, the most south-western point of the African continent' },
  { name: 'hout-bay-flag-frame', src: `${T}hout-bay-flag-frame.jpg`, origin: 'T', focus: '50% 50%', alt: 'Friends posing inside a South African flag photo frame above the coast' },

  // Cape Town: the city and its history
  { name: 'castle-table-mountain', src: `${T}castle-table-mountain.jpg`, origin: 'T', full: true, focus: '50% 40%', alt: 'A couple at the Castle of Good Hope, Table Mountain rising behind' },
  { name: 'castle-cannons-group', src: `${T}castle-cannons-group.jpg`, origin: 'T', focus: '42% 60%', alt: 'A group beside the old cannons at the Castle of Good Hope, Table Mountain behind' },
  { name: 'castle-moat', src: `${W}castle-moat.jpg`, origin: 'W', focus: '50% 46%', alt: 'The reed-lined moat of the Castle of Good Hope reflecting Devil’s Peak and the slopes of Table Mountain' },
  { name: 'district-six-museum', src: `${T}district-six-museum.jpg`, origin: 'T', focus: '60% 40%', alt: 'Newspaper pages and photographs on display at the District Six Museum in Cape Town' },
  { name: 'heritage-building-guests', src: `${T}heritage-building-guests.jpg`, origin: 'T', focus: '44% 56%', alt: 'A couple in front of a historic stone building in central Cape Town' },
  { name: 'company-garden-squirrel', src: `${W}company-garden-squirrel.jpg`, origin: 'W', focus: '50% 50%', alt: 'A white squirrel perched on a rock among the reeds in the Company’s Garden' },
  { name: 'bokaap-street', src: `${U}bokaap-street.jpg`, origin: 'U', focus: '56% 54%', alt: 'Brightly painted houses lining a Bo-Kaap street, Devil’s Peak rising behind under a clear blue sky' },
  // The full frame of this photograph (Good Times' own upload, 1824 px): the website's 1000 px copy cut the third face
  { name: 'bokaap-selfie', src: `${D}Cape Town Private City Tour - operator 02.jpg`, origin: 'T', focus: '50% 62%', alt: 'Three friends taking a selfie on a colourful Bo-Kaap street' },
  { name: 'cape-minstrels', src: `${T}cape-minstrels.jpg`, origin: 'T', focus: '44% 50%', alt: 'Cape Minstrels in pink costumes performing in a Cape Town street' },
  { name: 'private-guests-arms-raised', src: `${U}private-guests-arms-raised.jpg`, origin: 'U', full: true, focus: '62% 42%', alt: 'Two guests with arms raised on a rock above the ocean, the coastline beyond' },
  { name: 'camps-bay-twelve-apostles', src: `${S}camps-bay-twelve-apostles.jpg`, origin: 'S', full: true, focus: '50% 40%', alt: 'Camps Bay below the peaks of the Twelve Apostles, the Atlantic breaking on the rocks in front' },

  // Langa
  { name: 'langa-mural', src: `${W}langa-mural.jpg`, origin: 'W', focus: '50% 50%', alt: 'A colourful mural painted on a building wall in Langa under a bright blue sky' },
  { name: 'langa-mural-guests', src: `${U}langa-mural-guests.jpg`, origin: 'U', full: true, focus: '40% 56%', alt: 'Guests in front of a bright mural spelling out Langa' },
  { name: 'langa-traditional-drink', src: `${T}langa-traditional-drink.jpg`, origin: 'T', focus: '46% 40%', alt: 'A Langa resident sharing a traditional drink with a guest' },

  // The Cape Winelands
  { name: 'winelands-tasting-flight', src: `${U}winelands-tasting-flight.jpg`, origin: 'U', focus: '52% 36%', alt: 'A guest raising a glass of white wine beside a tasting flight, vineyard views through the windows' },
  { name: 'winelands-cape-dutch-group', src: `${U}winelands-cape-dutch-group.jpg`, origin: 'U', full: true, focus: '50% 52%', alt: 'A group of guests in front of a white Cape Dutch manor house on a Winelands estate' },
  { name: 'winelands-host-pouring', src: `${T}winelands-host-pouring.jpg`, origin: 'T', focus: '56% 50%', alt: 'A wine host pouring for guests at an outdoor table on a wine estate' },
  { name: 'winelands-terrace', src: `${T}winelands-terrace.jpg`, origin: 'T', focus: '50% 50%', alt: 'Guests at a terrace table on a wine estate as a host presents a bottle' },
  { name: 'winelands-pergola-lunch', src: `${T}winelands-pergola-lunch.jpg`, origin: 'T', focus: '50% 54%', alt: 'Guests at a long table under a vine-shaded pergola on a Winelands estate' },
  { name: 'winelands-tasting-table', src: `${T}winelands-tasting-table.jpg`, origin: 'T', focus: '50% 50%', alt: 'Five guests around a wine tasting table with glasses and tasting notes' },
  { name: 'winelands-garden-lunch', src: `${U}winelands-garden-lunch.jpg`, origin: 'U', focus: '50% 46%', alt: 'Guests and their guide smiling around a garden lunch table on a Winelands estate' },
  { name: 'table-mountain-sparkling', src: `${T}table-mountain-sparkling.jpg`, origin: 'T', full: true, focus: '36% 40%', alt: 'A glass of sparkling wine in focus, Table Mountain across the bay behind' },
  { name: 'fairview-goat-tower', src: `${S}fairview-goat-tower.jpg`, origin: 'S', focus: '50% 46%', alt: 'Goats resting in the arches of the goat tower at Fairview' },
  { name: 'mandela-statue-drakenstein', src: `${S}mandela-statue-drakenstein.jpg`, origin: 'S', focus: '50% 40%', alt: 'Two guests beside the bronze statue of Nelson Mandela with a raised fist outside Drakenstein Correctional Centre' },

  // The Overberg coast and adventures
  { name: 'hermanus-whale-sculpture', src: `${W}hermanus-whale-sculpture.jpg`, origin: 'W', focus: '50% 50%', alt: 'A couple seated by the whale-tail sculpture on the clifftop in Hermanus' },
  { name: 'hermanus-frame', src: `${S}hermanus-frame.jpg`, origin: 'S', focus: '50% 58%', alt: 'A couple standing in the yellow Hermanus, South Africa photo frame' },
  { name: 'marine-dynamics-boat', src: `${U}marine-dynamics-boat.jpg`, origin: 'U', full: true, focus: '44% 56%', alt: 'A Marine Dynamics shark cage diving boat with guests on deck, gulls circling overhead' },
  { name: 'quad-bikes-dunes', src: `${S}quad-bikes-dunes.jpg`, origin: 'S', full: true, focus: '50% 60%', alt: 'Four riders standing on their quad bikes on white sand dunes, arms outstretched' },
  { name: 'quad-bikes-convoy', src: `${S}quad-bikes-convoy.jpg`, origin: 'S', focus: '52% 56%', alt: 'A group on red quad bikes lined up across white sand dunes' },

  // The Garden Route
  { name: 'rooiberg-red-chair', src: `${U}rooiberg-red-chair.jpg`, origin: 'U', full: true, focus: '42% 40%', alt: 'A visitor sitting on top of the giant red Rooiberg chair against blue sky and mountains on Route 62' },
  { name: 'map-of-africa-viewpoint', src: `${W}map-of-africa-viewpoint.jpg`, origin: 'W', focus: '50% 46%', alt: 'Two visitors beneath the Map of Africa sign above a forested river valley near Wilderness' },
  { name: 'cango-caves', src: `${S}cango-caves.jpg`, origin: 'S', focus: '50% 50%', alt: 'A visitor among lit limestone formations inside the Cango Caves' },

  // Airport transfers
  { name: 'airport-departures-wave', src: `${T}airport-departures-wave.jpg`, origin: 'T', full: true, focus: '40% 56%', alt: 'A couple waving goodbye outside the departures hall at Cape Town International Airport' },
  { name: 'airport-luggage-boot', src: `${T}airport-luggage-boot.jpg`, origin: 'T', focus: '50% 56%', alt: 'A car boot packed neatly with suitcases for an airport transfer' },
  { name: 'airport-arrivals-group', src: `${T}airport-arrivals-group.jpg`, origin: 'T', focus: '50% 52%', alt: 'Four smiling guests with their luggage at the airport' },
  { name: 'airport-guests-luggage', src: `${T}airport-guests-luggage.jpg`, origin: 'T', focus: '50% 54%', alt: 'Guests with their luggage inside Cape Town International Airport' },
  { name: 'airport-pickup-area', src: `${W}airport-pickup-area.jpg`, origin: 'W', focus: '50% 50%', alt: 'The public pick-up area at Cape Town International Airport, with luggage trolleys and signage' },
  // Edited for privacy: the guest's handwritten name on the sign is blurred
  { name: 'airport-welcome-sign', src: `${W}airport-welcome-sign-name-blurred.jpg`, origin: 'W', focus: '48% 40%', alt: 'A Good Times driver in the arrivals hall holding a Good Times in Cape Town welcome sign' },

  // The home hero's phone gallery, "Cape Town Memories" (media audit, 6 Nov 2026): six real days out with Good Times,
  // in place of the AI-generated pictures of the café scene's five friends (549–828 px), at the owner's direction that
  // the memories be authentic. Order, captions and the tour each one belongs to: src/data/phone-gallery.json
  { name: 'boulders-penguin-selfie', src: `${D}good-times-cape-town-120.jpg`, origin: 'S', ambient: true, focus: '38% 45%', alt: 'A couple taking a selfie on the sand at Boulders Beach, African penguins behind them' },
  { name: 'chapmans-peak-couple', src: `${D}Good Times profile page - 07.jpg`, origin: 'T', ambient: true, focus: '50% 62%', alt: 'A couple sitting on a stone wall above Chapman’s Peak Drive, the road winding along the cliffs and the Atlantic behind them' },
  { name: 'cape-point-lighthouse-trio', src: `${D}good-times-cape-town-353.jpg`, origin: 'S', ambient: true, focus: '42% 60%', alt: 'Three guests in front of the old lighthouse at Cape Point under a blue sky' },
  { name: 'bokaap-street-pair', src: `${D}good-times-cape-town-146.jpg`, origin: 'S', ambient: true, focus: '50% 62%', alt: 'Two guests on a Bo-Kaap street of pink, blue and yellow houses' },
  { name: 'vineyard-couple', src: `${D}good-times-cape-town-050.jpg`, origin: 'S', ambient: true, focus: '48% 58%', alt: 'A couple standing in a vineyard on a sunny day, a white farm building and mountains behind them' },
  { name: 'guide-selfie-peninsula', src: `${D}replace-goats-on-home-page-Cape Peninsula Private Tour - traveller 106.jpg`, origin: 'O', ambient: true, focus: '62% 58%', alt: 'Two guests and their guide in a smiling selfie above the coast of the Cape Peninsula, a mountain and the sea behind them' },

  // ── Added in the media audit of 6 Nov 2026 (audit/image-change-register.md): one photograph per editorial place ──
  // The Cape Peninsula
  { name: 'hout-bay-viewpoint-couple', src: `${D}good-times-cape-town-022.jpg`, origin: 'S', full: true, focus: '54% 58%', alt: 'A couple at a viewpoint above Hout Bay, the Sentinel and the mountains across the blue water behind them' },
  { name: 'chapmans-peak-wall-trio', src: `${D}Cape Peninsula Private Tour - operator 10.jpg`, origin: 'T', focus: '58% 62%', alt: 'Three guests sitting on a stone wall on Chapman’s Peak Drive, the cliffs and the Atlantic behind them' },
  { name: 'boulders-shadows', src: `${D}second-scene-after-hero-section.jpg`, origin: 'S', full: true, focus: '50% 48%', alt: 'African penguins gathered on the white sand at Boulders Beach, the long shadows of a group of guests watching them' },
  { name: 'cape-point-ostrich', src: `${D}Good Times profile page - 12.jpg`, origin: 'T', focus: '62% 45%', alt: 'An ostrich among the green fynbos on a hillside under a blue sky' },
  { name: 'boulders-welcome-sign', src: `${D}Cape Peninsula Private Tour - operator 11.jpg`, origin: 'T', focus: '46% 55%', alt: 'Two guests beside the Welcome to Boulders sign, home of the African penguin' },
  { name: 'cape-point-sign-trio', src: `${D}Cape Peninsula Private Tour - operator 09.jpg`, origin: 'T', focus: '50% 58%', alt: 'Three guests behind the Cape Point sign with its latitude and longitude, the hills of the reserve behind' },
  { name: 'cape-point-boardwalk', src: `${D}Good Times profile page - 14.jpg`, origin: 'T', focus: '55% 55%', alt: 'A wooden boardwalk through the fynbos above a white beach and the Atlantic near Cape Point' },
  { name: 'cape-point-boardwalk-walk', src: `${D}good-times-cape-town-024.jpg`, origin: 'S', focus: '52% 55%', alt: 'A guest walking down a wooden boardwalk towards a white beach and the Atlantic near Cape Point' },
  { name: 'boulders-couple-selfie', src: `${D}good-times-cape-town-026.jpg`, origin: 'S', focus: '62% 70%', alt: 'A couple taking a selfie above the sand at Boulders Beach, dozens of African penguins behind them' },
  { name: 'cape-point-aloes', src: `${D}Good Times profile page - 16.jpg`, origin: 'T', focus: '40% 55%', alt: 'Red aloes in flower above the sea and a rocky headland on the Cape Peninsula' },
  { name: 'cape-point-zebra', src: `${D}Good Times profile page - 03.jpg`, origin: 'T', focus: '58% 62%', alt: 'A zebra crossing the road through the fynbos, the sea on the horizon' },
  { name: 'cape-of-good-hope-cove', src: `${D}Good Times profile page - 04.jpg`, origin: 'T', focus: '42% 60%', alt: 'A white beach in a cove below the cliffs near Cape Point, turquoise waves rolling in' },
  { name: 'boulders-beach-penguins', src: `${D}good-times-cape-town-384.jpg`, origin: 'S', focus: '52% 66%', alt: 'African penguins on the white sand at Boulders Beach, granite boulders and the turquoise sea behind' },
  { name: 'above-the-bay-selfie', src: `${D}good-times-cape-town-025.jpg`, origin: 'S', focus: '36% 62%', alt: 'A couple taking a selfie above a wide bay on the Cape Peninsula, the beach and the coast road far below' },
  { name: 'good-hope-walk-couple', src: `${D}Cape Peninsula Private Tour - operator 20.jpg`, origin: 'T', focus: '50% 45%', alt: 'A couple behind the Cape of Good Hope scenic walk sign' },
  { name: 'hout-bay-viewpoint-pair', src: `${D}Cape Peninsula Private Tour - operator 14.jpg`, origin: 'T', focus: '56% 50%', alt: 'A couple at a viewpoint above Hout Bay, the mountains across the bay behind them' },
  { name: 'boulders-two-penguins', src: `${D}Good Times profile page - 15.jpg`, origin: 'T', focus: '50% 75%', alt: 'Two African penguins on the sand at Boulders Beach, the boulders and the sea behind them' },
  { name: 'cape-point-coast-view', src: `${D}good-times-cape-town-107.jpg`, origin: 'S', focus: '50% 55%', alt: 'Green slopes and rocky points along the coast near Cape Point, the Atlantic rolling in under a blue sky' },
  { name: 'cape-coastline', src: `${D}Good Times profile page - 09.jpg`, origin: 'T', focus: '60% 50%', alt: 'Green cliffs falling to a deep blue sea along the Cape Peninsula' },
  { name: 'diaz-beach-cove', src: `${D}Good Times profile page - 13.jpg`, origin: 'T', full: true, focus: '40% 62%', alt: 'A white beach between the cliffs near Cape Point, the surf rolling in from a turquoise sea' },
  { name: 'hout-bay-from-chapmans', src: `${D}Good Times profile page - 08.jpg`, origin: 'T', full: true, focus: '50% 45%', alt: 'Hout Bay seen from Chapman’s Peak, the mountains around it under a blue sky' },

  // Cape Town: the city
  { name: 'table-mountain-garden-couple', src: `${D}good-times-cape-town-246.jpg`, origin: 'S', focus: '48% 62%', alt: 'A couple in a garden in the sun, the cliffs of Table Mountain behind them' },
  { name: 'castle-cannon-couple', src: `${D}Cape Town Private City Tour - operator 05.jpg`, origin: 'T', full: true, focus: '55% 62%', alt: 'A couple beside an old cannon at the Castle of Good Hope, its stone walls and Table Mountain behind' },
  { name: 'castle-cannon-pair', src: `${D}Cape Town Private City Tour - operator 08.jpg`, origin: 'T', focus: '40% 62%', alt: 'Two guests beside an old cannon at the Castle of Good Hope, Table Mountain behind' },
  { name: 'city-heritage-plaque', src: `${D}Cape Town Private City Tour - operator 09.jpg`, origin: 'T', focus: '45% 50%', alt: 'Two guests reading a heritage plaque beside a historic stone building in central Cape Town' },
  { name: 'bokaap-pink-wall', src: `${D}Cape Town Private City Tour - operator 15.jpg`, origin: 'T', focus: '50% 60%', alt: 'A guest in front of a bright pink house with an arched doorway' },

  // Langa: its streets, its museum, its homes and its people
  { name: 'langa-mural-visit', src: `${D}Langa Township Private Tour - operator 01.jpg`, origin: 'T', focus: '50% 60%', alt: 'Four guests in front of a colourful mural that spells out Langa' },
  { name: 'langa-walk-guide', src: `${D}Langa Township Private Tour - operator 04.jpg`, origin: 'T', focus: '40% 55%', alt: 'A local guide talking with two guests between homes on a walk through Langa' },
  { name: 'langa-home-visit', src: `${D}Langa Township Private Tour - operator 07.jpg`, origin: 'T', focus: '50% 55%', alt: 'Two guests welcomed into a family home in Langa, sitting in its living room' },
  { name: 'langa-homes', src: `${D}Langa Township Private Tour - operator 08.jpg`, origin: 'T', focus: '50% 55%', alt: 'A street of homes made from shipping containers in Langa under a cloudy sky' },
  { name: 'langa-blue-home', src: `${D}Langa Township Private Tour - operator 12.jpg`, origin: 'T', focus: '45% 50%', alt: 'A home of blue-painted corrugated iron in Langa, its window and door framed in weathered wood' },
  { name: 'langa-womens-anti-pass', src: `${D}Langa Township Private Tour - traveller 26-approved.jpg`, origin: 'O', focus: '50% 40%', alt: 'A museum panel on the Women’s Anti-Pass Campaign of 1955, with archive photographs of women carrying placards' },
  { name: 'langa-museum-room', src: `${D}Langa Township Private Tour - traveller 35-approved.jpg`, origin: 'O', focus: '50% 45%', alt: 'A room of the museum in Langa, with panels on cultural practices in Langa and archive photographs' },
  { name: 'langa-marches-1960', src: `${D}Langa Township Private Tour - traveller 39-approved.jpg`, origin: 'O', focus: '50% 40%', alt: 'A museum panel on the liberation struggle and the Langa marches of March 1960, with archive photographs' },

  // The Cape Winelands: its tables and tastings
  { name: 'beyerskloof-estate', src: `${D}Good Times profile page - 24.jpg`, origin: 'T', focus: '50% 55%', alt: 'Guests beside the entrance sign of Beyerskloof, the home of Pinotage, on a Stellenbosch wine estate' },
  { name: 'winelands-estate-terrace', src: `${D}Cape Winelands Private Tour - operator 08.jpg`, origin: 'T', focus: '50% 60%', alt: 'Two guests at a table on a wine estate’s restaurant terrace as a waiter serves them' },
  { name: 'winelands-tasting-counter', src: `${D}Cape Winelands Private Tour - operator 14.jpg`, origin: 'T', focus: '50% 55%', alt: 'Two guests at a wooden tasting counter with bottles of wine and tasting sheets' },
  { name: 'winelands-couple-tasting', src: `${D}People 04 - Couple at a tasting [operator].jpg`, origin: 'T', focus: '58% 42%', alt: 'A smiling couple raising their glasses at a wine tasting in an estate’s cellar' },
  { name: 'winelands-tasting-deli', src: `${D}People 07 - Trio at the wine tasting deli [operator].jpg`, origin: 'T', focus: '50% 70%', alt: 'Three guests in front of a white Wine Tasting & Deli with wooden doors' },
  { name: 'winelands-group-tasting', src: `${D}People 02 - Group tasting with bottles lined up [operator].jpg`, origin: 'T', focus: '50% 45%', alt: 'Four guests at a tasting bar, a row of wine bottles lined up in front of them' },
  { name: 'winelands-red-tasting', src: `${D}People 06 - Savouring a red [operator].jpg`, origin: 'T', focus: '55% 40%', alt: 'A guest in sunglasses savouring a glass of red wine' },
  { name: 'winelands-glasses-up', src: `${D}People 01 - Glasses up in the garden [operator].jpg`, origin: 'T', focus: '50% 45%', alt: 'Guests raising their glasses at a table in a garden on a wine estate' },
  { name: 'winelands-terrace-guide', src: `${D}Good Times profile page - 21.jpg`, origin: 'T', focus: '50% 52%', alt: 'Two guests and their guide at a terrace table with bottles of red wine, trees beyond the railings' },

  // Food: meals on Good Times days (lunch is never included in a tour price: paid on the day, wherever you choose)
  { name: 'lunch-spread-guests', src: `${D}Food 01 - Lunch spread with smiling guests [operator].jpg`, origin: 'T', focus: '50% 55%', alt: 'Four guests raising their glasses over plates of pasta and burgers at a sunny terrace restaurant' },
  { name: 'burger-lunch-guide', src: `${D}Good Times profile page - 06.jpg`, origin: 'T', focus: '50% 55%', alt: 'Two guests and their guide at a table outside a burger restaurant, burgers and drinks in front of them' },
  { name: 'pergola-lunch-table', src: `${D}good-times-cape-town-001.jpg`, origin: 'S', focus: '50% 62%', alt: 'A couple at a table under a reed-shaded pergola, vines and mountains beyond' },

  // The airport
  { name: 'transfer-driver-selfie', src: `${D}Good Times profile page - 19.jpg`, origin: 'T', focus: '50% 42%', alt: 'Three smiling people in a selfie outside the departures hall at Cape Town International Airport' },
  { name: 'airport-departures-group', src: `${D}Cape Town Private Airport Transfer - operator 05.jpg`, origin: 'T', focus: '42% 72%', alt: 'Three guests waving goodbye outside the departures hall at Cape Town International Airport' },
  { name: 'airport-departures-trolley', src: `${D}Cape Town Private Airport Transfer - operator 04.jpg`, origin: 'T', focus: '40% 62%', alt: 'Guests with a luggage trolley outside the departures hall at Cape Town International Airport' },

  // The Garden Route and a day built around you
  { name: 'garden-route-garden-path', src: `${D}use-for-garden-route-Scenery 14 - Garden path [traveller].jpg`, origin: 'O', focus: '50% 60%', alt: 'A paved garden path between flowering shrubs and a shady tree, leading to a veranda' },
  { name: 'mountain-road-arch', src: `${D}good-times-cape-town-277.jpg`, origin: 'S', focus: '50% 62%', alt: 'A guest standing on a mountain road where it passes through a natural rock arch' },
  { name: 'coast-sunset-couple', src: `${D}good-times-cape-town-093.jpg`, origin: 'S', focus: '45% 58%', alt: 'A couple on the rocks above the sea at sunset, the waves breaking below' },
  { name: 'beach-thrones', src: `${D}Cape Town Private City Tour - operator 14.jpg`, origin: 'T', focus: '50% 55%', alt: 'Two guests sitting on a pair of ornate golden thrones by the sea' },
  { name: 'chapmans-peak-guide-selfie', src: `${D}Good Times profile page - 22.jpg`, origin: 'T', focus: '50% 55%', alt: 'Three friends sitting on a stone wall above the sea, the cliffs of the coast behind them' },

  // About: the owner (about-image.jpg, supplied and approved by the owner for the About page, 5 Nov 2026)
  { name: 'owner-portrait', src: 'about/about-image.jpg', origin: 'S', focus: '72% 45%', alt: 'The owner of Good Times in Cape Town raising a glass of white wine on a terrace, Table Mountain across the bay behind him' },

  // Not Good Times photographs (L): openly licensed, credited, used only where Good Times has none
  { name: 'agulhas-tip-marker', src: `${C}Southernmost_tip_of_Africa.JPG`, origin: 'L', full: true, focus: '50% 62%', credit: 'Photo: Shaomi72, CC BY-SA 3.0, via Wikimedia Commons', license: 'CC BY-SA 3.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0', source: 'https://commons.wikimedia.org/wiki/File:Southernmost_tip_of_Africa.JPG', alt: 'The stone marker at Cape Agulhas, the southernmost tip of Africa, a sign below it pointing to the Indian Ocean and the Atlantic Ocean' },
  { name: 'agulhas-lighthouse', src: `${C}AGU_-_Cape_Agulhas_Lighthouse,_South_Africa,_2017.jpg`, origin: 'L', focus: '40% 45%', credit: 'Photo: Josep M. Gracia, CC BY-SA 4.0, via Wikimedia Commons', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0', source: 'https://commons.wikimedia.org/wiki/File:AGU_-_Cape_Agulhas_Lighthouse,_South_Africa,_2017.jpg', alt: 'The red and white Cape Agulhas Lighthouse above its keeper’s house under a cloudy sky' },
  { name: 'skydive-tandem', src: `${C}Skydive_Tandem_jump.jpg`, origin: 'L', full: true, focus: '50% 40%', credit: 'Photo: SkydivePhoto, CC0, via Wikimedia Commons (not taken in Cape Town)', license: 'CC0 1.0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', source: 'https://commons.wikimedia.org/wiki/File:Skydive_Tandem_jump.jpg', alt: 'A tandem skydiver and instructor in free fall high above a sea of clouds' },
  { name: 'shark-cage-gansbaai', src: `${C}White_shark_cage_diving,_Gansbaai.jpg`, origin: 'L', focus: '60% 40%', credit: 'Photo: Olga Ernst, CC BY-SA 4.0, via Wikimedia Commons', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0', source: 'https://commons.wikimedia.org/wiki/File:White_shark_cage_diving,_Gansbaai.jpg', alt: 'Divers in a shark cage beside a boat off Gansbaai, a great white shark swimming past in the green water' },
];

/** Renditions made outside the photo pipeline. */
export const generated = [
  // The home hero's café scene: the first frame of its film, held (src/tools/build-video.sh). AI-generated (G).
  {
    name: 'hero-moment-poster',
    origin: 'G',
    focus: '50% 50%',
    alt: 'Four friends laughing at a photo on a phone at a café above the Atlantic, Table Mountain behind them, while the fifth sleeps with his head on the table',
  },
  // The sand journey's destination, after the footprints (home page, second screen): the first frame of the owner's
  // film of a woman standing at the water's edge, her footprints behind her (section-2-video.mp4, 6 Nov 2026; the film
  // and its posters: src/tools/build-beach-film.sh). AI-generated (G): the film brings the owner's earlier still to life
  // and registers on it at zero offset, so the four prints measured on the still (scene.js PHOTO, 1672 × 941) are its own.
  // It replaced that still (ocean-footprints-reveal), whose master stays in media-src/journey/ and in Drive.
  {
    name: 'beach-film-poster',
    origin: 'G',
    focus: '68% 40%',
    alt: 'A woman in a yellow sundress and a straw hat standing at the water’s edge as the surf washes in, looking out to sea, her footprints trailing behind her across the sand',
  },
];

export const imageByName = (name) => images.find((i) => i.name === name) || generated.find((g) => g.name === name);
/** The short credit for an image: a licensed photograph's own attribution, otherwise its recorded origin's ('' when none). */
export const creditFor = (name) => imageByName(name)?.credit || ORIGIN_CREDITS[imageByName(name)?.origin] || '';
