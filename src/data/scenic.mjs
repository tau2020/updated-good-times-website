/**
 * Scenic backdrops: the source registry and the placements (the owner's brief of 8 Nov 2026, § B;
 * docs/enhancement/02-scenic.md has the mapping table, the sizes and the reasons).
 *
 * A scenic backdrop is a photograph laid behind a section as a faint, washed plane, in the way a search page's
 * landscape stays behind the cards scrolling over it: never content, never a Good Times photograph, never behind
 * prices, forms, legal text, long quotes or the header. The photographs are the owner's supplied stock files
 * (Drive › the assets folder of 8 Nov 2026), from Unsplash and Pexels, used under those sites' licences
 * (free use, attribution not required; credited here and in the photo credits anyway). Most of the supplied
 * set is East African savanna and wildlife; Good Times sells no safari, so no animal is placed anywhere it could
 * suggest one (the brief's own rule): the placements below are skies, a dusk cloud and the sea, never a tree, an animal
 * or a horizon that names a place.
 *
 * SCENES: every supplied file, with its author (as the file name gives it; confirmed on the photo's own page for the
 * placed ones), licence, subject and status. `crop` ([x, y, w, h], fractions of the
 * original) is cut by src/tools/build-scenic.mjs before resampling. `status`: 'placed' (in PLACEMENTS), 'candidate'
 * (suitable, not placed: the owner can choose it), 'not-used' (with `why`).
 *
 * PLACEMENTS: where a scene is shown and how. `variant` (src/assets/css/scenic.css): 'copy' (the plane behind a
 * text column, washed toward the words), 'head' (an inner page's title band: the sky beside the title, washed behind
 * it), 'bleed' (a horizon along the band's foot, fading upward), 'side' (a tall accent at one side, fading toward the
 * content; `held` keeps it in view while the band scrolls past). The presence (`opacity`) began where the brief's
 * ranges start (wide bands 6–12%); the owner asked on 8 Nov 2026 for the backdrops to be more visible, so each is now
 * about half as strong again, measured for contrast behind the words (docs/enhancement/02-scenic.md). The content above
 * a plane is never made transparent; cards over one are white glass.
 */

const UNSPLASH = { platform: 'Unsplash', license: 'Unsplash License', licenseUrl: 'https://unsplash.com/license' };
const PEXELS = { platform: 'Pexels', license: 'Pexels License', licenseUrl: 'https://www.pexels.com/license/' };
const unsplash = (id) => `https://unsplash.com/photos/${id}`;
const pexels = (id) => `https://www.pexels.com/photo/${id}/`;

export const SCENES = [
  {
    name: 'scene-big-sky',
    file: 'birger-strahl-r3l0EazQLR4-unsplash.jpg',
    author: 'Birger Strahl',
    ...UNSPLASH,
    source: unsplash('r3l0EazQLR4'),
    subject: 'A wide sky of cumulus cloud and sun rays breaking through a storm front (the grassland horizon below is cropped away)',
    place: 'East Africa, not Cape Town; only the sky is shown',
    crop: [0, 0, 1, 0.66],
    wildlife: false,
    status: 'placed',
  },
  {
    name: 'scene-sunlit-cloud',
    file: 'birger-strahl-r3l0EazQLR4-unsplash.jpg',
    author: 'Birger Strahl',
    ...UNSPLASH,
    source: unsplash('r3l0EazQLR4'),
    subject: 'Blue sky over sunlit cumulus (the left of the frame only: the storm front above, the dust plume and the grassland below are cropped away)',
    place: 'East Africa, not Cape Town; only the sky is shown',
    crop: [0, 0.2, 0.5, 0.3],
    wildlife: false,
    status: 'placed',
  },
  {
    name: 'scene-blue-sky',
    file: 'pexels-ross-green-2159326053-36048580.jpg',
    author: 'Ross Green',
    ...PEXELS,
    source: pexels('36048580'),
    subject: 'Deep blue sky with wisps of white cloud (the top of the frame only: the acacia, the road and the grassland below are cropped away)',
    place: 'Serengeti National Park, Tanzania (the photograph’s own page): not Cape Town; only the sky is shown',
    crop: [0, 0, 1, 0.28],
    wildlife: false,
    status: 'placed',
  },
  {
    name: 'scene-cloud-bank',
    file: 'pexels-ross-green-2159326053-36048580.jpg',
    author: 'Ross Green',
    ...PEXELS,
    source: pexels('36048580'),
    subject: 'Blue sky over a low bank of white cloud (the sky to the right of the acacia only: the tree, the road, the grassland and the horizon are cropped away)',
    place: 'Serengeti National Park, Tanzania (the photograph’s own page): not Cape Town; only the sky is shown',
    crop: [0.55, 0, 0.45, 0.58],
    widths: [720, 1200, 1720],
    wildlife: false,
    status: 'placed',
  },
  {
    name: 'scene-sunset-horizon',
    file: 'eelco-bohtlingk-W2ddocn162g-unsplash.jpg',
    author: 'Eelco Böhtlingk',
    ...UNSPLASH,
    source: unsplash('W2ddocn162g'),
    subject: 'Violet and orange dusk cloud (only the sky: the horizon and its trees are cropped away)',
    place: 'East Africa, not Cape Town; only cloud is shown',
    crop: [0.18, 0.02, 0.82, 0.36],
    wildlife: false,
    status: 'placed',
  },
  {
    name: 'scene-breaking-wave',
    file: 'pexels-chabraoui-el-hachemi-485483762-33677109.jpg',
    author: 'chabraoui el hachemi',
    ...PEXELS,
    source: pexels('33677109'),
    subject: 'A wave curling white over a rocky shore under a blue sky (portrait)',
    place: 'Casablanca, Morocco (the photograph’s own title on Pexels): not Cape Town; no landmark shows in the crop and wash used',
    crop: [0, 0, 1, 1],
    // A side accent (at most 44% of the screen's width) and at 13% presence: smaller files, a lower quality
    widths: [480, 860, 1240],
    quality: { avif: 32, webp: 48 },
    wildlife: false,
    status: 'placed',
  },
  {
    name: 'scene-acacia-gold',
    file: 'bibhash-polygon-cafe-banerjee-wOauvcluLBY-unsplash.jpg',
    author: 'Bibhash (Polygon.Cafe) Banerjee',
    ...UNSPLASH,
    source: unsplash('wOauvcluLBY'),
    subject: 'A lone acacia with two vultures against a yellow dawn sky over grassland (the brief lists it as "zebras in savanna": it has no zebras)',
    place: 'East Africa',
    wildlife: true,
    status: 'candidate',
    why: 'A strong graphic plate, but an unmistakably East African savanna tree: kept for a safari or Garden Route wildlife context the owner confirms',
  },
  {
    name: 'scene-zebra-sunbeams',
    file: 'hendrik-cornelissen-qs4E9t0hJc0-unsplash.jpg',
    author: 'Hendrik Cornelissen',
    ...UNSPLASH,
    source: unsplash('qs4E9t0hJc0'),
    subject: 'Five plains zebra grazing under sun beams, a crater rim behind',
    place: 'East Africa (a crater rim behind; the place is not recorded)',
    wildlife: true,
    status: 'candidate',
    why: 'The brief’s "nature interlude": not placed, because no Good Times tour includes a safari and plains zebra on savanna would suggest one; suitable only if the owner confirms a wildlife product to set it beside',
  },
  {
    name: 'scene-acacia-road',
    file: 'pexels-ross-green-2159326053-36048580.jpg',
    author: 'Ross Green',
    ...PEXELS,
    source: pexels('36048580'),
    subject: 'A dirt road through green grassland under a tall acacia and a blue sky of cloud',
    place: 'Serengeti National Park, Tanzania ("Serengeti National Park Scenic Landscape" on Pexels)',
    wildlife: false,
    status: 'candidate',
    why: 'The whole frame names East Africa (the acacia on the savanna), so it is never shown whole: two crops of its sky alone are placed (scene-blue-sky, scene-cloud-bank)',
  },
  { name: 'scene-zebra-golden', file: 'jorge-tung--5Betfvtgso-unsplash.jpg', author: 'Jorge Tung', ...UNSPLASH, source: unsplash('5Betfvtgso'), subject: 'Zebra on golden grass under cloud and mountains', place: 'East Africa', wildlife: true, status: 'not-used', why: 'Wildlife on savanna: suggests a safari Good Times does not sell' },
  { name: 'scene-giraffes-bush', file: 'sweder-breet-1-XiM_YWWGU-unsplash.jpg', author: 'Sweder Breet', ...UNSPLASH, source: unsplash('1-XiM_YWWGU'), subject: 'Giraffes among bushes on savanna (the brief lists it as "lone tree")', place: 'East Africa', wildlife: true, status: 'not-used', why: 'Wildlife on savanna: suggests a safari' },
  { name: 'scene-elephant-family', file: 'jonathan-ridley-fGfeJA7IDyA-unsplash.jpg', author: 'Jonathan Ridley', ...UNSPLASH, source: unsplash('fGfeJA7IDyA'), subject: 'An elephant family walking away across a dry plain', place: 'East Africa', wildlife: true, status: 'not-used', why: 'The brief allows it beside safari-relevant tour content only; there is none' },
  { name: 'scene-lioness', file: 'udara-karunarathna-Yb-SHCA98UE-unsplash.jpg', author: 'Udara Karunarathna', ...UNSPLASH, source: unsplash('Yb-SHCA98UE'), subject: 'A lioness in golden grass, close up', place: 'Unrecorded', wildlife: true, status: 'not-used', why: 'As the elephants: no safari-relevant content' },
  { name: 'scene-antelope', file: 'andrew-s-h5vMnGRk7os-unsplash.jpg', author: 'Andrew S', ...UNSPLASH, source: unsplash('h5vMnGRk7os'), subject: 'A kob antelope in tall grass, misty trees behind (portrait)', place: 'East Africa', wildlife: true, status: 'not-used', why: 'Wildlife; and a face that a side crop would cut' },
  { name: 'scene-zebra-mono', file: 'michael-starkie-U74NNl6f7vk-unsplash.jpg', author: 'Michael Starkie', ...UNSPLASH, source: unsplash('U74NNl6f7vk'), subject: 'Two zebra in black and white', place: 'Unrecorded', wildlife: true, status: 'not-used', why: 'Wildlife' },
  { name: 'scene-hippo', file: 'hendrik-cornelissen-ks9Jr6dPfC8-unsplash.jpg', author: 'Hendrik Cornelissen', ...UNSPLASH, source: unsplash('ks9Jr6dPfC8'), subject: 'A hippo in green grassland', place: 'East Africa', wildlife: true, status: 'not-used', why: 'Wildlife' },
  { name: 'scene-gerenuk', file: 'harshil-gudka-mUE4XTLyrFY-unsplash.jpg', author: 'Harshil Gudka', ...UNSPLASH, source: unsplash('mUE4XTLyrFY'), subject: 'A gerenuk among green bush (portrait)', place: 'East Africa', wildlife: true, status: 'not-used', why: 'Wildlife' },
  { name: 'scene-gazelle', file: 'sweder-breet-TskpJI34jAQ-unsplash.jpg', author: 'Sweder Breet', ...UNSPLASH, source: unsplash('TskpJI34jAQ'), subject: 'A Thomson’s gazelle in grass (portrait)', place: 'East Africa', wildlife: true, status: 'not-used', why: 'Wildlife' },
  { name: 'scene-giraffe-pair', file: 'sweder-breet-UNBreN47VsE-unsplash.jpg', author: 'Sweder Breet', ...UNSPLASH, source: unsplash('UNBreN47VsE'), subject: 'Two giraffes (portrait)', place: 'East Africa', wildlife: true, status: 'not-used', why: 'Wildlife' },
  { name: 'scene-zebra-pair', file: 'sweder-breet-fYquhEzLbqI-unsplash.jpg', author: 'Sweder Breet', ...UNSPLASH, source: unsplash('fYquhEzLbqI'), subject: 'Two zebra in green bush', place: 'East Africa', wildlife: true, status: 'not-used', why: 'Wildlife' },
  { name: 'scene-giraffe-walk', file: 'sweder-breet-ytgG5UruTGQ-unsplash.jpg', author: 'Sweder Breet', ...UNSPLASH, source: unsplash('ytgG5UruTGQ'), subject: 'A giraffe walking through bush (portrait)', place: 'East Africa', wildlife: true, status: 'not-used', why: 'Wildlife' },
  { name: 'scene-safari-jeep', file: 'pexels-490714164-28157155.jpg', author: 'Pexels contributor 490714164', ...PEXELS, source: pexels('28157155'), subject: 'A safari vehicle on a plain at sunset, wildebeest grazing', place: 'East Africa', wildlife: true, status: 'not-used', why: 'Shows a game drive: would promise a safari' },
  { name: 'scene-kilimanjaro', file: 'pexels-wladimir-kuhne-670646709-19171291.jpg', author: 'Wladimir Kuhne', ...PEXELS, source: pexels('19171291'), subject: 'Zebra under an acacia with Kilimanjaro behind', place: 'Kilimanjaro behind: a landmark of another country', wildlife: true, status: 'not-used', why: 'A recognisable landmark of another country' },
  { name: 'scene-acacia-sun', file: 'pexels-dsd-143941-1502311.jpg', author: 'DSD', ...PEXELS, source: pexels('1502311'), subject: 'An acacia silhouetted against an orange sun', place: 'Unrecorded', wildlife: false, status: 'not-used', why: 'Too saturated to wash quietly; the sunset horizon above does the same work' },
  { name: 'scene-acacia-zebra', file: 'pexels-g-n-403098-13098956.jpg', author: 'G N', ...PEXELS, source: pexels('13098956'), subject: 'Acacias and fallen trees with zebra', place: 'East Africa', wildlife: true, status: 'not-used', why: 'Wildlife' },
  { name: 'scene-zebra-elephants', file: 'pexels-rachel-claire-4577526.jpg', author: 'Rachel Claire', ...PEXELS, source: pexels('4577526'), subject: 'A zebra close up, elephants behind (portrait)', place: 'East Africa', wildlife: true, status: 'not-used', why: 'Wildlife' },
  { name: 'scene-huts', file: 'pexels-elina-emeleeva-559640524-20427051.jpg', author: 'Elina Emeleeva', ...PEXELS, source: pexels('20427051'), subject: 'Thatched huts below a hill', place: 'Not South Africa (unrecorded)', wildlife: false, status: 'not-used', why: 'Homes of a community elsewhere: could be read as a township or cultural visit Good Times runs' },
  { name: 'scene-baobab', file: 'pexels-lekepov-2044219506-36224098.jpg', author: 'Lekepov', ...PEXELS, source: pexels('36224098'), subject: 'A baobab with people resting beneath it (portrait)', place: 'Not South Africa (unrecorded)', wildlife: false, status: 'not-used', why: 'Identifiable people, and a place Good Times does not visit' },
  { name: 'scene-green-valley', file: 'pexels-proudlyswazi-34120683.jpg', author: 'ProudlySwazi', ...PEXELS, source: pexels('34120683'), subject: 'A green valley of farms and homes, two people on a rock (portrait)', place: 'Eswatini (by the photographer’s name; unconfirmed)', wildlife: false, status: 'not-used', why: 'People, and a landscape Good Times does not visit' },
  { name: 'illustration-elephant', file: 'vonita-buirski-J4MAdPXB8ZY-unsplash.jpg', author: 'Vonita Buirski', ...UNSPLASH, source: unsplash('J4MAdPXB8ZY'), subject: 'An illustrated elephant calf at sunset (artwork, not a photograph)', place: '', wildlife: true, status: 'not-used', why: 'An illustration: kept apart from the photographic system, as the brief asks; only as an approved brand illustration' },
  { name: 'illustration-giraffe', file: 'bayram-bilici-VtgTioFe9uM-unsplash.jpg', author: 'Bayram Bilici', ...UNSPLASH, source: unsplash('VtgTioFe9uM'), subject: 'An illustrated giraffe eating leaves (artwork, not a photograph)', place: '', wildlife: true, status: 'not-used', why: 'An illustration: kept apart from the photographic system' },
];

/**
 * Where the backdrops go: three placements on the home page (G2: three substantially different placements first) and,
 * at the owner's request of 8 Nov 2026, one on each of About, Contact, Destinations and Transfers, each behind a quiet
 * band of words: never behind prices, forms, tab panels, photographs or legal text. Focal points are where the subject
 * of the crop sits: `focal` for wide screens, `focalMobile` for phones (below 48em), where a band is tall and narrow.
 */
export const PLACEMENTS = [
  {
    id: 'memory',
    page: 'index.html',
    section: '.lc-memory ("The best bits? They’re yours to remember.")',
    scene: 'scene-big-sky',
    variant: 'copy',
    opacity: 0.2,
    focal: '30% 38%',
    focalMobile: '24% 30%',
    reason: 'The first quiet editorial band after the hero and the first full-bleed scene: open sky and light behind the heading, never behind the guest photograph’s faces (the frame sits above the plane)',
  },
  {
    id: 'ease',
    page: 'index.html',
    section: '.lc-ease ("All the wonder. None of the worry.": the three steps to a booking)',
    scene: 'scene-sunset-horizon',
    variant: 'copy',
    opacity: 0.24,
    focal: '50% 40%',
    focalMobile: '40% 40%',
    reason: 'The journey band: a dusk sky behind its heading, washed out before the three steps, so the steps, their drawn route and the button stay on the band’s clean ground (the critique of 8 Nov 2026: the horizon and its trees read as a safari and tinted the copy)',
  },
  {
    id: 'voices',
    page: 'index.html',
    section: '#reviews (the guest voices chapter: the rating bar and the review wall)',
    scene: 'scene-breaking-wave',
    variant: 'side',
    held: true,
    opacity: 0.27,
    focal: '62% 52%',
    focalMobile: '62% 40%',
    reason: 'The trust chapter’s surround: the sea at the chapter’s edge on wide screens, held in view as the cards pass (the search page’s landscape plane); the rating bar and the cards are white glass over it',
  },
  {
    id: 'about-approach',
    page: 'about/index.html',
    section: 'About › "Personal, local and safe." (our approach: a heading and three short points)',
    scene: 'scene-sunset-horizon',
    variant: 'copy',
    opacity: 0.24,
    focal: '50% 40%',
    focalMobile: '40% 40%',
    reason: 'A band of words only, between the team’s photograph and the guests’ photographs: the dusk cloud behind the heading, washed white behind the three points',
  },
  {
    id: 'contact-head',
    page: 'contact/index.html',
    section: 'Contact › the title band ("Let’s talk Cape Town.")',
    scene: 'scene-blue-sky',
    variant: 'head',
    opacity: 0.32,
    focal: '62% 50%',
    focalMobile: '30% 50%',
    reason: 'The page’s title band: open sky beside the title, washed behind the words; the contact details and the booking request below stay on their own white panels',
  },
  {
    id: 'destinations-head',
    page: 'destinations/index.html',
    section: 'Destinations › the title band ("Destinations")',
    scene: 'scene-sunlit-cloud',
    variant: 'head',
    opacity: 0.3,
    focal: '50% 72%',
    focalMobile: '62% 70%',
    reason: 'The page’s title band: sunlit cloud beside the title, washed behind the words (the sky’s storm front, which the home page’s wider crop shows, read as grey here); the destination cards and their photographs below are untouched',
  },
  {
    id: 'transfers-how',
    page: 'transfers/index.html',
    section: 'Transfers › "What we need from you" (four short points, a note and the button)',
    scene: 'scene-cloud-bank',
    variant: 'copy',
    opacity: 0.24,
    focal: '50% 62%',
    focalMobile: '50% 55%',
    reason: 'The page’s last band of words, after the prices and the services: sky and cloud for a page about flights and arrivals; the transfer choices, prices and photographs above it have none',
  },
];

export const sceneByName = (name) => SCENES.find((s) => s.name === name);
export const placementById = (id) => PLACEMENTS.find((p) => p.id === id);
