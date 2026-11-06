/**
 * The Good Times tour catalogue: one entry per tour or activity the company
 * publishes on goodtimesincapetown.co.za (the multi-day Garden Route tour is in
 * packages.mjs and the airport transfer in transfers.mjs).
 *
 * Content source: each tour's own page on the official site, read on 5 Nov 2026
 * (`source`), rewritten for readability with no new facts. Rules the templates follow:
 *  - `included` / `notIncluded`, `itinerary`, the usual `times` and `cancellation`
 *    are the official page's own lists. Its stock line "Instant confirmation, with mobile
 *    tickets available" is not used: the official FAQ says every booking is confirmed by
 *    the team, and this site sends a request, not a booking.
 *  - `price` is the company's published rate in ZAR, per group, with its group tiers;
 *    `price: null` is "on enquiry", with the official note in `priceNote`.
 *  - `tripadvisor` holds the product's own listing figures, read on 5 Nov 2026; only the
 *    five tours the listing sells have one.
 *  - A tour with no Good Times photograph (`images.hero: null`) shows the approved
 *    logo artwork instead, never another place's photo. Since the media audit of
 *    6 Nov 2026 none does: Cape Agulhas and Sky Diving show openly licensed
 *    photographs of their own subject (origin L in images.mjs, credited).
 *  - Each photograph appears in one place only (audit/image-change-register.md): the
 *    gallery never repeats the tour's hero or card, and a tour with one photograph
 *    (whale watching, shark cage diving, quad biking, skydiving) shows it as both.
 *  - Points that need the owner are in `confirm` (not rendered) and docs/APPROVAL_REGISTER.md.
 */

const OFFICIAL = 'https://www.goodtimesincapetown.co.za/tour/';
const TA = 'https://www.tripadvisor.co.za/AttractionProductReview-g312659-';
const CHECKED = '2026-11-05';
const APPROVAL = 'published by Good Times on goodtimesincapetown.co.za; wording adapted for this site';
const source = (slug) => ({ listing: `${OFFICIAL}${slug}/`, checked: CHECKED });
/** The usual cancellation terms on the official tour pages. */
const CANCEL_DAY = 'Free cancellation up to 24 hours before the scheduled departure time. Cancellations within 24 hours of departure, and no-shows, are non-refundable.';
const CANCEL_ACTIVITY =
  'Free cancellation up to 24 hours before your scheduled activity. Adventure activities depend on the weather and the season: if the operator cancels for safety reasons, you are offered a full refund or a new date.';
/** Good Times' published group rates: up to four guests, and five to eight. */
const tiers = (small, large) => [
  { label: '1–4 guests', max: 4, amount: small },
  ...(large ? [{ label: '5–8 guests', max: 8, amount: large }] : []),
];
const MOBILITY = 'Tell us about any mobility needs when you book, so we can plan the day around them.';

export const categories = [
  { id: 'peninsula', label: 'Cape Peninsula' },
  { id: 'city', label: 'Cape Town' },
  { id: 'winelands', label: 'Cape Winelands' },
  { id: 'coast', label: 'The Overberg coast' },
  { id: 'adventure', label: 'Adventure' },
];

/**
 * Themes behind the catalogue's filter chips. Every label fits at least one tour honestly:
 * "Most reviewed" is computed from the Tripadvisor review counts (the three highest),
 * the rest are tagged per tour in `themes`.
 */
export const themes = [
  { id: 'most-reviewed', label: 'Most reviewed' },
  { id: 'nature', label: 'Nature & wildlife' },
  { id: 'wine', label: 'Wine & food' },
  { id: 'culture', label: 'Culture & history' },
  { id: 'adventure', label: 'Adventure' },
];
export const themeLabel = (id) => themes.find((t) => t.id === id)?.label || categories.find((c) => c.id === id)?.label || '';

export const tours = [
  {
    slug: 'cape-peninsula-private-tour',
    title: 'Cape Peninsula Private Tour: Chapman’s Peak, Cape Point & the Penguins',
    shortTitle: 'Cape Peninsula Private Tour',
    categories: ['peninsula'],
    themes: ['nature'],
    destination: 'peninsula',
    featured: true,
    card: 'A full private day down the Peninsula: Chapman’s Peak Drive, the Cape of Good Hope, Cape Point and the penguins at Boulders Beach.',
    intro: [
      'A scenic full day around the Cape Peninsula with your own guide and vehicle. From your accommodation the road follows the Atlantic past Maiden’s Cove and Camps Bay, climbs onto Chapman’s Peak Drive, and stops in Ocean View, a historic fishing community, and at the Cape Point Ostrich Farm.',
      'At the Cape of Good Hope and Cape Point you can hike up to the lighthouse or ride the funicular. Coming home along False Bay you meet the African penguins at Boulders Beach in Simon’s Town and pass the colourful bathing huts of Muizenberg.',
    ],
    highlights: ['Chapman’s Peak Drive', 'The Cape of Good Hope', 'Cape Point lighthouse, on foot or by funicular', 'African penguins at Boulders Beach', 'Muizenberg’s bathing huts', 'Camps Bay and Maiden’s Cove'],
    itinerary: [
      { stop: 'Maiden’s Cove: a scenic photo stop', time: '' },
      { stop: 'Camps Bay: a beachside drive', time: '' },
      { stop: 'Chapman’s Peak Drive', time: '' },
      { stop: 'Ocean View: a historic fishing community', time: '' },
      { stop: 'Cape Point Ostrich Farm', time: '' },
      { stop: 'Cape of Good Hope: the rocky headland', time: '' },
      { stop: 'Cape Point: the lighthouse, with an optional hike or the funicular', time: '' },
      { stop: 'Boulders Beach Penguin Colony, Simon’s Town', time: '' },
      { stop: 'Muizenberg Beach: colourful bathing huts and surfers', time: '' },
    ],
    drivePast: [],
    itineraryStatus: 'listed',
    duration: 'Full day',
    times: { departure: '09:00', return: '17:00' },
    where: 'The Cape Peninsula, from Cape Town',
    included: ['Private vehicle', 'Driver-guide', 'Fuel', 'Toll fees', 'Bottled water'],
    notIncluded: ['Cape of Good Hope entrance fee', 'Boulders Beach entrance fee', 'Lunch', 'Tips'],
    pickup: 'Pickup from your accommodation, and back there at the end of the day.',
    accessibility: MOBILITY,
    cancellation: CANCEL_DAY,
    price: { from: 6000, currency: 'ZAR', unit: 'per group', tiers: tiers(6000, 12000), note: 'Excludes the Cape of Good Hope and Boulders Beach entrance fees, and lunch.' },
    images: { hero: 'hout-bay-viewpoint-couple', card: 'boulders-penguins-boardwalk', gallery: ['boulders-welcome-sign', 'boulders-penguin-colony', 'cape-point-sign-trio', 'cape-point-ostrich', 'cape-point-boardwalk', 'boulders-couple-selfie'] },
    heroFocus: '66% 52%',
    seo: {
      title: 'Cape Peninsula Private Tour: Chapman’s Peak, Cape Point & Penguins',
      description: 'A full-day private Cape Peninsula tour from Cape Town: Chapman’s Peak Drive, the Cape of Good Hope, Cape Point and the Boulders Beach penguins, with pickup from your accommodation.',
    },
    tripadvisor: { url: `${TA}d19714975-Cape_Peninsula_Private_Tour-Cape_Town_Central_Western_Cape.html`, rating: 5.0, reviews: 87, checked: CHECKED },
    confirm: ['The official page says “Max 4 people” and also lists a rate for 5–8 guests: confirm the group sizes offered.'],
    source: source('cape-peninsula-private-tour'),
    approval: APPROVAL,
  },
  {
    slug: 'cape-town-city-private-tour',
    title: 'Cape Town City Private Tour: History, Heritage & the Bo-Kaap',
    shortTitle: 'Cape Town City Private Tour',
    categories: ['city'],
    themes: ['culture'],
    destination: 'city',
    featured: true,
    card: 'Cape Town’s story told on its own streets: the Castle of Good Hope, District Six, Parliament, the Company’s Garden and the Bo-Kaap.',
    intro: [
      'Experience Cape Town’s history, neighbourhoods and landmarks on a private guided day. Begin at the Castle of Good Hope, the 17th-century fortress, and City Hall, where Nelson Mandela spoke after his release, then visit the District Six Museum and drive through the former neighbourhood.',
      'Continue past Parliament to the Company’s Garden, Cape Town’s oldest garden, browse the arts and crafts of Greenmarket Square and walk the colourful Cape Malay streets of the Bo-Kaap. The day also takes in the Noon Day Gun and the Afrogem jewellery studio.',
    ],
    highlights: ['The Castle of Good Hope', 'Cape Town City Hall', 'The District Six Museum', 'The Company’s Garden', 'Greenmarket Square', 'The Bo-Kaap'],
    itinerary: [
      { stop: 'Castle of Good Hope: the 17th-century fortress', time: '' },
      { stop: 'Cape Town City Hall: where Nelson Mandela spoke after his release', time: '' },
      { stop: 'District Six Museum', time: '' },
      { stop: 'District Six: a drive through the former neighbourhood', time: '' },
      { stop: 'Parliament of South Africa', time: '' },
      { stop: 'Company’s Garden: Cape Town’s oldest garden', time: '' },
      { stop: 'Greenmarket Square: local arts and crafts', time: '' },
      { stop: 'Bo-Kaap: the colourful Cape Malay neighbourhood', time: '' },
      { stop: 'Noon Day Gun: the historic daily cannon', time: '' },
      { stop: 'Afrogem: a jewellery studio and showroom', time: '' },
    ],
    drivePast: [],
    itineraryStatus: 'listed',
    duration: 'Full day',
    times: { departure: '09:00', return: '17:00' },
    where: 'Central Cape Town',
    included: ['Private vehicle', 'Driver-guide', 'Fuel', 'Bottled water'],
    notIncluded: ['Museum entrance fees', 'Lunch', 'Personal expenses'],
    pickup: 'Pickup from your accommodation, and back there at the end of the day.',
    accessibility: MOBILITY,
    cancellation: CANCEL_DAY,
    price: { from: 4000, currency: 'ZAR', unit: 'per group', tiers: tiers(4000, 8000), note: 'Excludes museum entrance fees.' },
    images: { hero: 'castle-cannon-couple', card: 'bokaap-street', gallery: ['heritage-building-guests', 'district-six-museum', 'castle-moat', 'bokaap-selfie', 'company-garden-squirrel'] },
    heroFocus: '50% 36%',
    seo: {
      title: 'Cape Town City Private Tour: Castle, District Six & Bo-Kaap',
      description: 'A private guided Cape Town city tour: the Castle of Good Hope, City Hall, the District Six Museum, Parliament, the Company’s Garden and the Bo-Kaap, with pickup.',
    },
    tripadvisor: { url: `${TA}d19907537-Cape_Town_Private_City_Tour-Cape_Town_Central_Western_Cape.html`, rating: 5.0, reviews: 16, checked: CHECKED },
    confirm: ['The official page says “Max 4 people” and also lists a rate for 5–8 guests: confirm the group sizes offered.'],
    source: source('cape-town-city-private-tour'),
    approval: APPROVAL,
  },
  {
    slug: 'cape-winelands-private-tour',
    title: 'Cape Winelands Private Tour: Stellenbosch, Franschhoek & Paarl',
    shortTitle: 'Cape Winelands Private Tour',
    categories: ['winelands'],
    themes: ['wine'],
    destination: 'winelands',
    featured: true,
    card: 'A private day among the vineyards: wine and cheese at Fairview, La Motte, Franschhoek village and Lanzerac, with the Mandela statue on the way.',
    intro: [
      'Discover the Cape Winelands on a private guided day through Stellenbosch, Franschhoek and Paarl. It starts with a tasting and farm visit at Fairview Wine & Cheese, then passes the statue of Nelson Mandela outside Drakenstein Correctional Centre, the prison from which he walked free in 1990.',
      'In the Franschhoek valley you visit La Motte Wine Estate and the village itself, before Lanzerac Wine Estate near Stellenbosch. Tasting fees and lunch are paid on the day, so you choose what to taste and where to eat.',
    ],
    highlights: ['Fairview Wine & Cheese', 'The Mandela statue at Drakenstein', 'La Motte Wine Estate', 'Franschhoek village', 'Lanzerac Wine Estate'],
    itinerary: [
      { stop: 'Fairview Wine & Cheese: a tasting and farm visit', time: '' },
      { stop: 'Drakenstein Correctional Centre: a drive past the Mandela statue', time: '' },
      { stop: 'La Motte Wine Estate', time: '' },
      { stop: 'Franschhoek village', time: '' },
      { stop: 'Lanzerac Wine Estate', time: '' },
    ],
    drivePast: [],
    itineraryStatus: 'listed',
    duration: 'Full day',
    times: { departure: '08:30', return: '17:30' },
    where: 'Stellenbosch, Franschhoek and Paarl',
    included: ['Private transport', 'Driver-guide', 'Fuel', 'Bottled water'],
    notIncluded: ['Tasting fees', 'Lunch', 'Tips'],
    pickup: 'Pickup from your accommodation, or start at the V&A Waterfront.',
    accessibility: MOBILITY,
    cancellation: CANCEL_DAY,
    price: { from: 6000, currency: 'ZAR', unit: 'per group', tiers: tiers(6000, 12000), note: 'Excludes tasting fees and lunch.' },
    images: { hero: 'winelands-cape-dutch-group', card: 'winelands-tasting-flight', gallery: ['winelands-terrace', 'winelands-tasting-counter', 'winelands-group-tasting', 'winelands-terrace-guide'] },
    heroFocus: '56% 46%',
    seo: {
      title: 'Cape Winelands Private Tour: Stellenbosch, Franschhoek & Paarl',
      description: 'A private Cape Winelands day from Cape Town: Fairview Wine & Cheese, La Motte, Franschhoek village and Lanzerac, with pickup from your accommodation.',
    },
    tripadvisor: { url: `${TA}d19685038-Cape_Winelands_Private_Tour-Cape_Town_Central_Western_Cape.html`, rating: 5.0, reviews: 39, checked: CHECKED },
    confirm: ['The official page says “Max 4 people” and also lists a rate for 5–8 guests: confirm the group sizes offered.'],
    source: source('cape-winelands-private-tour'),
    approval: APPROVAL,
  },
  {
    slug: 'township-private-tour',
    title: 'Township Private Tour: Langa, Its People and Its History',
    shortTitle: 'Township Private Tour',
    footerLabel: 'Langa Township',
    categories: ['city'],
    themes: ['culture'],
    destination: 'langa',
    featured: true,
    card: 'A half day in Langa: the Guga S’Thebe arts centre, a walk through the neighbourhood, a drumming session and an optional traditional beer tasting.',
    intro: [
      'Gain a deeper understanding of South African history and culture on a private half day in Langa. The tour begins at the Guga S’Thebe Arts & Culture Centre, then continues on foot through the neighbourhood.',
      'Along the way you visit the museum and the gallery, see informal homes and the old beer hall, call in at a kindergarten and local businesses, join a drumming session and, if you would like to, taste traditional beer.',
    ],
    highlights: ['Guga S’Thebe Arts & Culture Centre', 'A walk through Langa', 'The museum, the gallery and the old beer hall', 'A drumming session', 'An optional traditional beer tasting'],
    itinerary: [
      { stop: 'Guga S’Thebe Arts & Culture Centre, Langa', time: '' },
      { stop: 'A walk through Langa: the museum, the gallery, informal homes, the old beer hall, a kindergarten, local businesses, a drumming session and an optional traditional beer tasting', time: '' },
    ],
    drivePast: [],
    itineraryStatus: 'listed',
    duration: 'Half day',
    times: { departure: '09:00', return: '13:00' },
    where: 'Langa, Cape Town',
    included: ['Private transport', 'Tour guide', 'Bottled water'],
    notIncluded: ['Lunch', 'Tips', 'Optional donations'],
    pickup: 'Pickup from your accommodation, and back there at the end of the tour.',
    accessibility: 'Much of the tour is on foot through Langa. Tell us about any mobility needs when you book.',
    cancellation: CANCEL_DAY,
    price: { from: 4000, currency: 'ZAR', unit: 'per group', tiers: tiers(4000, 8000), note: '' },
    images: { hero: 'langa-mural-guests', card: 'langa-mural', gallery: ['langa-traditional-drink', 'langa-homes', 'langa-womens-anti-pass', 'langa-blue-home', 'langa-museum-room', 'langa-marches-1960'] },
    heroFocus: '40% 50%',
    seo: {
      title: 'Township Private Tour: Langa, Cape Town',
      description: 'A private half-day tour of Langa in Cape Town: the Guga S’Thebe Arts & Culture Centre, a walk through the neighbourhood, a drumming session and an optional traditional beer tasting.',
    },
    tripadvisor: { url: `${TA}d20311065-Langa_Township_Private_Tour-Cape_Town_Central_Western_Cape.html`, rating: 5.0, reviews: 22, checked: CHECKED },
    confirm: ['The official page says “Max 4 people” and also lists a rate for 5–8 guests: confirm the group sizes offered.', 'Langa photographs showing children, or teenagers who may be under 18, are not used (the rights log’s four, and two withdrawn on 5 Nov 2026): parental consent would be needed.'],
    source: source('township-private-tour'),
    approval: APPROVAL,
  },
  {
    slug: 'private-cape-town-experience',
    title: 'Private Cape Town Experience',
    shortTitle: 'Private Cape Town Experience',
    footerLabel: 'Private Experience',
    categories: ['city'],
    themes: [],
    destination: 'city',
    featured: false,
    card: 'Your own guide and vehicle for a tailored day: tell us what you would love to see, and we plan the day around it.',
    intro: [
      'A tailored full day with your own private guide and vehicle, for groups of up to ten. There is no fixed route: tell us what you would love to see and do, and we plan the day around your interests and your pace.',
      'We confirm the route, the timings and what is included with your quote.',
    ],
    highlights: ['Your own private guide', 'A private vehicle for the day', 'A route planned around you', 'Groups of up to ten'],
    itinerary: [],
    drivePast: [],
    itineraryStatus: 'not-listed',
    duration: 'Flexible',
    where: 'Cape Town and beyond, as you choose',
    included: ['Your own private guide', 'Private vehicle'],
    notIncluded: [],
    pickup: 'Pickup and drop-off are arranged with you.',
    accessibility: MOBILITY,
    cancellation: '',
    price: { from: 3500, currency: 'ZAR', unit: 'per group', tiers: [{ label: 'up to 10 guests', max: 10, amount: 3500 }], note: '' },
    images: { hero: 'private-guests-arms-raised', card: 'coast-sunset-couple', gallery: ['beach-thrones', 'chapmans-peak-guide-selfie'] },
    heroFocus: '62% 40%',
    seo: {
      title: 'Private Cape Town Experience: a Tailored Day with Your Own Guide',
      description: 'A tailored full day in and around Cape Town with your own private guide and vehicle, planned around what you would love to see. For groups of up to ten.',
    },
    tripadvisor: null,
    confirm: ['The official page lists no itinerary, inclusions or times (“Itinerary details coming soon”): confirm what the day includes and its usual length.'],
    source: source('private-cape-town-experience'),
    approval: APPROVAL,
  },
  {
    slug: 'whale-watching-private-tour',
    title: 'Whale Watching Private Tour: Hermanus and the Cape Coast',
    shortTitle: 'Whale Watching Private Tour',
    categories: ['coast'],
    themes: ['nature'],
    destination: 'overberg',
    featured: false,
    seasonal: 'Whale watching is seasonal: the best months are June to November. Tell us your dates and we’ll advise.',
    card: 'A seasonal day on the coast at Hermanus or another vantage point, watching whales from the cliffs or from a boat. Best from June to November.',
    intro: [
      'A seasonal whale watching day from Hermanus or along the Cape coast, at its best from June to November. After pickup you drive to Hermanus, or to another coastal vantage point, to watch from land or from a boat, depending on the weather and the season.',
      'A full day is recommended. We confirm the plan and the price for your dates with your quote.',
    ],
    highlights: ['Hermanus and the Cape coast', 'Whales from the cliffs or from a boat', 'Best months: June to November'],
    itinerary: [
      { stop: 'A scenic drive to Hermanus, or another coastal vantage point', time: '' },
      { stop: 'Whale watching from land or by boat, depending on the weather and the season', time: '' },
    ],
    drivePast: [],
    itineraryStatus: 'listed',
    duration: 'Flexible: a full day is recommended',
    where: 'Hermanus and the Cape coast',
    included: ['Private transport', 'Driver-guide'],
    notIncluded: ['A boat ticket, if you choose a boat trip', 'Lunch', 'Tips'],
    pickup: 'Pickup from your accommodation, and back there at the end of the day.',
    accessibility: MOBILITY,
    cancellation: CANCEL_DAY,
    price: null,
    priceNote: 'Contact us for seasonal pricing.',
    images: { hero: 'hermanus-frame', card: 'hermanus-frame', gallery: [] },
    seo: {
      title: 'Whale Watching Private Tour from Cape Town: Hermanus',
      description: 'A seasonal private whale watching day from Cape Town to Hermanus or along the Cape coast, from land or by boat. Best from June to November.',
    },
    tripadvisor: null,
    confirm: ['No whale photograph of Good Times’ own exists: the page shows Hermanus photographs only.'],
    source: source('whale-watching-private-tour'),
    approval: APPROVAL,
  },
  {
    slug: 'cape-agulhas-private-tour',
    title: 'Cape Agulhas Private Tour: The Southernmost Tip of Africa',
    shortTitle: 'Cape Agulhas Private Tour',
    categories: ['coast'],
    themes: ['nature'],
    destination: 'overberg',
    featured: false,
    card: 'A private day trip to Cape Agulhas, the southernmost tip of Africa, with its lighthouse and a long scenic drive along the way.',
    intro: [
      'Visit the southernmost tip of Africa on a private day full of history and coastal beauty. After pickup, a scenic drive takes you to Cape Agulhas.',
      'There you see the Cape Agulhas Lighthouse and stand at the official southernmost tip of the continent, before the drive home to your accommodation.',
    ],
    highlights: ['The official southernmost tip of Africa', 'Cape Agulhas Lighthouse', 'A scenic drive along the way'],
    itinerary: [
      { stop: 'A scenic drive to Cape Agulhas', time: '' },
      { stop: 'Cape Agulhas Lighthouse and the official southernmost tip of Africa', time: '' },
    ],
    drivePast: [],
    itineraryStatus: 'listed',
    duration: 'Full day',
    where: 'Cape Agulhas, the southernmost tip of Africa',
    included: ['Private transport', 'Driver-guide', 'Fuel'],
    notIncluded: ['Entrance fees', 'Lunch'],
    pickup: 'Pickup from your accommodation, and back there at the end of the day.',
    accessibility: MOBILITY,
    cancellation: CANCEL_DAY,
    price: null,
    priceNote: 'Contact us for group-based pricing.',
    images: { hero: 'agulhas-tip-marker', card: 'agulhas-lighthouse', gallery: [] },
    seo: {
      title: 'Cape Agulhas Private Tour from Cape Town',
      description: 'A private day trip from Cape Town to Cape Agulhas, the southernmost tip of Africa: the lighthouse, the official southernmost point and a scenic drive.',
    },
    tripadvisor: null,
    confirm: ['No Good Times photograph of Cape Agulhas exists: the page shows two openly licensed photographs of the southernmost tip and the lighthouse (Wikimedia Commons, credited); a Good Times photograph would replace them.'],
    source: source('cape-agulhas-private-tour'),
    approval: APPROVAL,
  },
  {
    slug: 'shark-cage-diving',
    title: 'Shark Cage Diving: Great White Sharks off Gansbaai',
    shortTitle: 'Shark Cage Diving',
    categories: ['coast', 'adventure'],
    themes: ['adventure', 'nature'],
    destination: 'overberg',
    featured: false,
    card: 'A boat trip out of Gansbaai and a dive in a secure cage to see great white sharks up close, with a safety briefing and full gear.',
    intro: [
      'Dive with great white sharks in a secure cage and see one of South Africa’s marine predators up close. After pickup you drive to Gansbaai, head out by boat to shark territory and, after a safety briefing, dive in the cage in full gear.',
      'Rates are seasonal, so tell us your dates for a quote. Adventure activities depend on the weather and the season.',
    ],
    highlights: ['A boat trip out of Gansbaai', 'A cage dive with great white sharks', 'A safety briefing and full gear'],
    itinerary: [
      { stop: 'Pickup and a drive to Gansbaai', time: '' },
      { stop: 'A boat trip out to shark territory', time: '' },
      { stop: 'The cage dive, with a safety briefing and full gear', time: '' },
      { stop: 'The drive back to Cape Town', time: '' },
    ],
    drivePast: [],
    itineraryStatus: 'listed',
    duration: 'Flexible: seasonal availability',
    where: 'Gansbaai, on the Overberg coast',
    included: ['Boat ride', 'Cage dive', 'Gear rental', 'Safety briefing'],
    notIncluded: ['Transport to Gansbaai, unless booked as an add-on', 'Meals'],
    pickup: 'Pickup can be added: transport to Gansbaai is booked as an add-on.',
    accessibility: 'Tell us about any medical conditions or mobility needs when you book.',
    cancellation: CANCEL_ACTIVITY,
    price: null,
    priceNote: 'Seasonal rates apply.',
    images: { hero: 'marine-dynamics-boat', card: 'marine-dynamics-boat', gallery: [] },
    heroFocus: '44% 52%',
    seo: {
      title: 'Shark Cage Diving in Gansbaai from Cape Town',
      description: 'Shark cage diving with great white sharks off Gansbaai: a boat trip, a safety briefing, full gear and a dive in a secure cage. Seasonal rates; transport from Cape Town as an add-on.',
    },
    tripadvisor: null,
    confirm: ['The dive operator is not named on the official page (the boat in Good Times’ photo is Marine Dynamics): confirm the operator to name.'],
    source: source('shark-cage-diving'),
    approval: APPROVAL,
  },
  {
    slug: 'quad-biking',
    title: 'Quad Biking: A Guided Ride on the Dunes',
    shortTitle: 'Quad Biking',
    categories: ['adventure'],
    themes: ['adventure'],
    destination: null,
    featured: false,
    card: 'A guided quad biking adventure on sand dunes or off-road trails, with a safety briefing and all the gear.',
    intro: [
      'Feel the adrenaline on a guided quad biking adventure on dunes or off-road trails. You meet at the quad biking location for a safety briefing and equipment fitting, then set off with your guide.',
      'The price depends on your group size and the location, so tell us who is riding and we’ll send a quote. Adventure activities depend on the weather and the season.',
    ],
    highlights: ['A guided ride on dunes or off-road trails', 'A safety briefing and equipment fitting', 'Your bike, guide and safety gear'],
    itinerary: [
      { stop: 'Meet at the quad biking location', time: '' },
      { stop: 'A safety briefing and equipment fitting', time: '' },
      { stop: 'A guided ride on dunes or off-road trails', time: '' },
    ],
    drivePast: [],
    itineraryStatus: 'listed',
    duration: 'Flexible',
    where: 'Dunes or off-road trails near Cape Town',
    included: ['Guide', 'Safety gear', 'Bike rental'],
    notIncluded: ['Transport to the location', 'Lunch'],
    pickup: 'You meet at the quad biking location; transport there is not included.',
    accessibility: 'Tell us about any medical conditions or mobility needs when you book.',
    cancellation: CANCEL_ACTIVITY,
    price: null,
    priceNote: 'The price depends on group size and location.',
    images: { hero: 'quad-bikes-convoy', card: 'quad-bikes-convoy', gallery: [] },
    heroFocus: '50% 62%',
    seo: {
      title: 'Quad Biking near Cape Town: a Guided Dune Ride',
      description: 'A guided quad biking adventure on dunes or off-road trails near Cape Town, with a safety briefing, safety gear and bike rental included.',
    },
    tripadvisor: null,
    confirm: ['The location is not named on the official page (“dunes or off-road trails”): confirm where rides take place.', 'The two quad biking photographs come from Drive › Website Images: confirm their provenance and the riders’ consent.'],
    source: source('quad-biking'),
    approval: APPROVAL,
  },
  {
    slug: 'sky-diving',
    title: 'Sky Diving: A Tandem Jump over Cape Town',
    shortTitle: 'Sky Diving',
    categories: ['adventure'],
    themes: ['adventure'],
    destination: null,
    featured: false,
    card: 'A tandem skydive with a qualified instructor and wide aerial views of Cape Town, for anyone after a real adrenaline rush.',
    intro: [
      'Tandem skydiving with wide aerial views of Cape Town. At the drop zone you take your safety training, then jump with a qualified instructor and see the Cape from above on the way down.',
      'The price depends on the package you choose, and photographs or a video of your jump are an optional extra. Skydiving depends on the weather.',
    ],
    highlights: ['A tandem jump with a qualified instructor', 'Aerial views of Cape Town', 'Safety training at the drop zone'],
    itinerary: [
      { stop: 'Arrival at the drop zone and safety training', time: '' },
      { stop: 'A tandem jump with a qualified instructor', time: '' },
      { stop: 'Aerial views of Cape Town on the way down', time: '' },
    ],
    drivePast: [],
    itineraryStatus: 'listed',
    duration: 'Flexible: weather dependent',
    where: 'A drop zone near Cape Town',
    included: ['Instructor', 'Parachute gear', 'Safety training'],
    notIncluded: ['Photographs and video (an optional extra)', 'Transport', 'Meals'],
    pickup: 'Transport to the drop zone is not included.',
    accessibility: 'Tell us about any medical conditions when you book.',
    cancellation: CANCEL_ACTIVITY,
    price: null,
    priceNote: 'The price depends on the package you choose.',
    images: { hero: 'skydive-tandem', card: 'skydive-tandem', gallery: [] },
    seo: {
      title: 'Tandem Sky Diving over Cape Town',
      description: 'A tandem skydive near Cape Town with a qualified instructor, safety training and parachute gear included, and aerial views of the Cape on the way down.',
    },
    tripadvisor: null,
    confirm: ['No Good Times skydiving photograph exists: the page shows an openly licensed (CC0) tandem skydive, not taken in Cape Town and credited as such; a photograph from the skydiving operator, or the owner\'s AI-generated image (blocked: no image generator here), would replace it.', 'The drop zone and operator are not named on the official page.'],
    source: source('sky-diving'),
    approval: APPROVAL,
  },
];

export const tourBySlug = (slug) => tours.find((t) => t.slug === slug);
export const TOUR_SLUGS = tours.map((t) => t.slug);

/** The three tours with the most Tripadvisor reviews, tagged `most-reviewed` for the chips. */
export const mostReviewed = [...tours].filter((t) => t.tripadvisor).sort((a, b) => (b.tripadvisor?.reviews || 0) - (a.tripadvisor?.reviews || 0)).slice(0, 3).map((t) => t.slug);
for (const t of tours) if (mostReviewed.includes(t.slug) && !t.themes.includes('most-reviewed')) t.themes.push('most-reviewed');

/**
 * Destinations: where Good Times' tours go. Each links to the catalogue filtered by region, or to the
 * tour itself. Descriptions use only facts from the official tour pages. `image` is the destination's own photograph,
 * the same on its home-page carousel card and its destinations-page card (one destination, one photograph), and used
 * nowhere else (audit/image-change-register.md); the crop keeps the subject recorded in images.mjs.
 */
export const destinations = [
  { id: 'peninsula', name: 'The Cape Peninsula', image: 'cape-of-good-hope-cove', text: 'Chapman’s Peak Drive, the Cape of Good Hope, Cape Point and the penguins at Boulders Beach, south of the city.', href: 'tours/cape-peninsula-private-tour/', tours: tours.filter((t) => t.categories.includes('peninsula')).map((t) => t.slug) },
  { id: 'city', name: 'Cape Town', image: 'table-mountain-garden-couple', text: 'The Castle of Good Hope, District Six, the Company’s Garden and the colourful streets of the Bo-Kaap.', href: 'tours/cape-town-city-private-tour/', tours: ['cape-town-city-private-tour', 'private-cape-town-experience'] },
  { id: 'langa', name: 'Langa', image: 'langa-walk-guide', text: 'A half day in Langa: the Guga S’Thebe arts centre, a walk through the neighbourhood and a drumming session.', href: 'tours/township-private-tour/', tours: ['township-private-tour'] },
  { id: 'winelands', name: 'The Cape Winelands', image: 'beyerskloof-estate', text: 'Stellenbosch, Franschhoek and Paarl: Fairview, La Motte, Lanzerac and the Franschhoek valley.', href: 'tours/cape-winelands-private-tour/', tours: tours.filter((t) => t.categories.includes('winelands')).map((t) => t.slug) },
  { id: 'overberg', name: 'The Overberg coast', image: 'hermanus-whale-sculpture', text: 'Whale watching at Hermanus in season, shark cage diving off Gansbaai and the southernmost tip of Africa at Cape Agulhas.', href: 'tours/#coast', tours: tours.filter((t) => t.destination === 'overberg').map((t) => t.slug) },
  { id: 'garden-route', name: 'The Garden Route', image: 'map-of-africa-viewpoint', text: 'A private journey of three days or more: Knysna, Wilderness, Oudtshoorn and the Tsitsikamma National Park.', href: 'packages/garden-route-private-tour/', tours: [], countLabel: 'Multi-day tour', note: '3+ days, private' },
];
