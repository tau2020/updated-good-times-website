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
 * suggest one (the brief's own rule), and the three placements below are sky, a sunset horizon and the sea.
 *
 * SCENES: every supplied file, with its author (as the file name gives it; confirmed on the photo's own page for the
 * placed ones), licence, subject and status. `crop` ([x, y, w, h], fractions of the
 * original) is cut by src/tools/build-scenic.mjs before resampling. `status`: 'placed' (in PLACEMENTS), 'candidate'
 * (suitable, not placed: the owner can choose it), 'not-used' (with `why`).
 *
 * PLACEMENTS: where a scene is shown and how. `variant` (src/assets/css/scenic.css): 'copy' (the plane behind a
 * text column, washed toward the words), 'bleed' (a horizon along the band's foot, fading upward), 'side' (a tall
 * accent at one side, fading toward the content; `held` keeps it in view while the band scrolls past). The
 * presence (`opacity`) is where the brief's ranges start (wide bands 6–12%, text decor 3–8%), tuned by eye on the
 * page; the content above it is never made transparent.
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
    place: 'East Africa',
    wildlife: false,
    status: 'candidate',
    why: 'The road reads as a journey, but the acacia names the place as East Africa: an alternative for the steps band if the owner prefers daylight to sunset',
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
 * Where the backdrops go: three placements on the home page, each behind a quiet band of words (G2: three
 * substantially different placements first). Focal points are where the subject of the crop sits: `focal` for wide
 * screens, `focalMobile` for phones (below 48em), where a band is tall and narrow.
 */
export const PLACEMENTS = [
  {
    id: 'memory',
    page: 'index.html',
    section: '.lc-memory ("The best bits? They’re yours to remember.")',
    scene: 'scene-big-sky',
    variant: 'copy',
    opacity: 0.13,
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
    opacity: 0.16,
    focal: '50% 40%',
    focalMobile: '40% 40%',
    reason: 'The journey band: a dusk sky behind its heading, washed out before the three steps, so the steps, their drawn route and the button stay on the band’s clean ground (the critique of 8 Nov 2026: the horizon and its trees read as a safari and tinted the copy)',
  },
  {
    id: 'voices',
    page: 'index.html',
    section: '#reviews (the guest voices chapter)',
    scene: 'scene-breaking-wave',
    variant: 'side',
    held: true,
    opacity: 0.18,
    focal: '62% 52%',
    focalMobile: '62% 40%',
    reason: 'The trust chapter’s surround: the sea at the chapter’s edge, held in view as the cards pass (the search page’s landscape plane), washed away before the cards so no card text sits on it',
  },
];

export const sceneByName = (name) => SCENES.find((s) => s.name === name);
export const placementById = (id) => PLACEMENTS.find((p) => p.id === id);
