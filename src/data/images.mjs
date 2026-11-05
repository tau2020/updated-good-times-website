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
 *       presented as guests or as Good Times photographs, and used nowhere else (test/hero.test.mjs)
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
};
/** The short credit beside a photograph (the gallery's lightbox). */
export const ORIGIN_CREDITS = {
  T: 'A Good Times photograph',
  W: 'A Good Times photograph',
  U: 'A Good Times photograph, enlarged for the web',
  S: 'A Good Times photograph',
  G: 'An AI-generated illustration',
};

const T = 'tripadvisor/';
const W = 'website/';
const U = 'upscaled/';
const S = 'library/';
const G = 'phone-gallery/';

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
  { name: 'guide-selfie-bay', src: `${T}guide-selfie-bay.jpg`, origin: 'T', focus: '56% 40%', alt: 'A close-up selfie of four smiling people above a white-sand bay' },

  // Cape Town: the city and its history
  { name: 'castle-table-mountain', src: `${T}castle-table-mountain.jpg`, origin: 'T', full: true, focus: '50% 40%', alt: 'A couple at the Castle of Good Hope, Table Mountain rising behind' },
  { name: 'castle-cannons-group', src: `${T}castle-cannons-group.jpg`, origin: 'T', focus: '42% 60%', alt: 'A group beside the old cannons at the Castle of Good Hope, Table Mountain behind' },
  { name: 'castle-moat', src: `${W}castle-moat.jpg`, origin: 'W', focus: '50% 46%', alt: 'The reed-lined moat of the Castle of Good Hope reflecting Devil’s Peak and the slopes of Table Mountain' },
  { name: 'district-six-museum', src: `${T}district-six-museum.jpg`, origin: 'T', focus: '60% 40%', alt: 'Newspaper pages and photographs on display at the District Six Museum in Cape Town' },
  { name: 'heritage-building-guests', src: `${T}heritage-building-guests.jpg`, origin: 'T', focus: '44% 56%', alt: 'A couple in front of a historic stone building in central Cape Town' },
  { name: 'company-garden-squirrel', src: `${W}company-garden-squirrel.jpg`, origin: 'W', focus: '50% 50%', alt: 'A white squirrel perched on a rock among the reeds in the Company’s Garden' },
  { name: 'bokaap-street', src: `${U}bokaap-street.jpg`, origin: 'U', focus: '56% 54%', alt: 'Brightly painted houses lining a Bo-Kaap street, Devil’s Peak rising behind under a clear blue sky' },
  { name: 'bokaap-selfie', src: `${W}bokaap-selfie.jpg`, origin: 'W', focus: '50% 40%', alt: 'Three friends taking a selfie on a colourful Bo-Kaap street' },
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

  // The home hero's phone gallery, "Cape Town Memories": the five friends of the café scene on their days out
  // (AI-generated, G; the supplied gallery package's originals, goodtimes_phone_gallery_assets.zip, 5 Nov 2026).
  // Order, captions and the tour each one belongs to: src/data/phone-gallery.json
  { name: 'memories-table-mountain', src: `${G}01_table_mountain_selfie.webp`, origin: 'G', ambient: true, focus: '50% 50%', alt: 'The five friends squeezed into one laughing selfie, Table Mountain and the city behind them' },
  { name: 'memories-boulders', src: `${G}02_boulders_penguins.webp`, origin: 'G', ambient: true, focus: '50% 50%', alt: 'The friends laughing in a selfie on the sand at Boulders Beach, an African penguin in front of them and the colony behind' },
  { name: 'memories-bokaap', src: `${G}03_bo_kaap_street.webp`, origin: 'G', ambient: true, focus: '50% 50%', alt: 'The friends pulling faces on a Bo-Kaap street of bright green, yellow and pink houses, Table Mountain behind' },
  { name: 'memories-camps-bay', src: `${G}04_beach_jump.webp`, origin: 'G', ambient: true, focus: '50% 50%', alt: 'The five friends jumping in the air together on the beach at Camps Bay, Lion’s Head behind' },
  { name: 'memories-cape-of-good-hope', src: `${G}05_cape_of_good_hope.webp`, origin: 'G', ambient: true, focus: '50% 50%', alt: 'The friends cheering behind the Cape of Good Hope sign, the most south-western point of the African continent' },
  { name: 'memories-sunset', src: `${G}06_sunset_lookout.webp`, origin: 'G', ambient: true, focus: '50% 50%', alt: 'The five friends seen from behind on a rock, arms round each other, watching the sun set beyond Lion’s Head with Table Mountain and the city below' },
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
];

export const imageByName = (name) => images.find((i) => i.name === name) || generated.find((g) => g.name === name);
/** The short credit for an image, from its recorded origin ('' when none is recorded). */
export const creditFor = (name) => ORIGIN_CREDITS[imageByName(name)?.origin] || '';
