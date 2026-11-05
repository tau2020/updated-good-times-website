/**
 * Multi-day tours: private journeys of several days from Cape Town.
 *
 * Good Times publishes one: the Garden Route Private Tour
 * (goodtimesincapetown.co.za/tour/garden-route-private-tour/, read on 5 Nov 2026),
 * "3+ days", priced per day for up to four guests. Its outline, inclusions and
 * exclusions are the official page's own; nothing is added. No other multi-day
 * package is offered, so none is shown.
 *
 * The rate is the published one; accommodation, meals and entrance fees are not
 * included, and the route and the number of days are set with each group, so the
 * outline is called "suggested". Points that need the owner are in `confirm`
 * (not rendered) and docs/APPROVAL_REGISTER.md.
 */

const APPROVAL = 'published by Good Times on goodtimesincapetown.co.za; wording adapted for this site';
const SOURCE = { listing: 'https://www.goodtimesincapetown.co.za/tour/garden-route-private-tour/', checked: '2026-11-05' };

export const packages = [
  {
    slug: 'garden-route-private-tour',
    title: 'Garden Route Private Tour',
    shortTitle: 'Garden Route Private Tour',
    tagline: 'A flexible private journey along South Africa’s Garden Route, over three days or more.',
    heading: 'East along the Garden Route, at your own pace',
    card: 'Three days or more along South Africa’s Garden Route: Knysna, Wilderness, Oudtshoorn and the Tsitsikamma National Park, with your own guide.',
    intro: [
      'Explore South Africa’s Garden Route on a flexible private tour shaped around your group. From Cape Town the scenic drive heads east to the coastal towns of Knysna and Wilderness and inland to Oudtshoorn, before the Tsitsikamma National Park and the journey back.',
      'You choose how many days to take, three or more, and what you most want to see. We confirm the route, the stops and the price with your quote.',
    ],
    duration: '3+ days',
    nights: { min: 2, max: 13, suggested: 0 },
    group: 'Private: up to 4 guests at the published rate',
    season: '',
    where: 'The Garden Route, from Cape Town',
    highlights: ['The scenic drive along the Garden Route', 'Knysna and Wilderness on the coast', 'Oudtshoorn, inland', 'The Tsitsikamma National Park', 'Your own guide and vehicle throughout'],
    places: ['Knysna', 'Wilderness', 'Oudtshoorn', 'Tsitsikamma National Park'],
    outline: [
      { day: 'Day 1', title: 'Cape Town to the Garden Route', text: 'Depart Cape Town and begin the scenic drive along the Garden Route.' },
      { day: 'The days between', title: 'Coastal towns and inland gems', text: 'Knysna, Wilderness and Oudtshoorn, at the pace you choose. More days mean more time in each place.' },
      { day: 'The last day', title: 'Tsitsikamma and home', text: 'The Tsitsikamma National Park, then the return to Cape Town.' },
    ],
    included: ['Private vehicle', 'Driver-guide', 'Fuel', 'Bottled water'],
    notIncluded: ['Accommodation', 'Meals', 'Entrance fees', 'Tips'],
    price: { from: 8500, currency: 'ZAR', unit: 'per day', tiers: [{ label: '1–4 guests', max: 4, amount: 8500 }], note: 'Per day, for 1–4 guests. Groups of 5–8: please enquire.' },
    cancellation: 'Free cancellation up to 24 hours before the scheduled departure time. Cancellations within 24 hours of departure, and no-shows, are non-refundable.',
    images: { hero: 'rooiberg-red-chair', card: 'map-of-africa-viewpoint', gallery: ['rooiberg-red-chair', 'map-of-africa-viewpoint', 'cango-caves'] },
    heroFocus: '40% 18%',
    related: 'cape-winelands-private-tour',
    seo: {
      title: 'Garden Route Private Tour from Cape Town: 3+ Days',
      description: 'A flexible private Garden Route tour from Cape Town over three days or more: Knysna, Wilderness, Oudtshoorn and the Tsitsikamma National Park, with your own guide and vehicle.',
    },
    confirm: [
      'The rate is per day for 1–4 guests; groups of 5–8 are on enquiry.',
      'Accommodation is not included: confirm whether Good Times can arrange it.',
      'The Cango Caves photograph comes from Drive › Website Images: confirm its provenance.',
    ],
    source: SOURCE,
    approval: APPROVAL,
  },
];

export const packageBySlug = (slug) => packages.find((p) => p.slug === slug);
export const PACKAGE_SLUGS = packages.map((p) => p.slug);
