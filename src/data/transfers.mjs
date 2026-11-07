/**
 * Good Times transfer services.
 *
 * `services` is the one transfer the company publishes: the Airport Private
 * Transfer (goodtimesincapetown.co.za/tour/airport-private-transfer/, read on
 * 5 Nov 2026), with its own inclusions, exclusions, cancellation terms and
 * per-trip rates. `types` drive the transfer request form. "Something else" is an
 * open request, not an advertised service: the team replies whether it can help.
 */

const SOURCE = { listing: 'https://www.goodtimesincapetown.co.za/tour/airport-private-transfer/', checked: '2026-11-05' };

export const services = [
  {
    id: 'airport',
    slug: 'airport-private-transfer',
    title: 'Airport Private Transfer',
    shortTitle: 'Airport transfers',
    card: 'A private transfer between Cape Town International Airport and your accommodation, with meet and greet and help with your luggage.',
    intro:
      'Start or end your trip with a comfortable private transfer, for individuals, families and small groups. Your driver meets you at the arrivals gate with a name board, helps with your luggage and takes you straight to your accommodation, or from your door to the airport. Share your flight details in advance and delays are tracked at no extra charge.',
    highlights: ['Meet and greet at arrivals, with a name board', 'Help with your luggage', 'Straight to your accommodation or the airport'],
    duration: '45 minutes to 1 hour',
    where: 'Cape Town International Airport (CPT) to or from your accommodation',
    included: ['Private vehicle and driver', 'Fuel'],
    notIncluded: ['Flights', 'Tips', 'Extra stops not arranged in advance'],
    accessibility: 'Tell us about any mobility needs or child seats you need when you request your transfer.',
    cancellation: 'Free cancellation up to 24 hours before your scheduled pickup time.',
    price: { from: 800, currency: 'ZAR', unit: 'per trip', tiers: [{ label: '1–4 guests', max: 4, amount: 800 }, { label: '5–8 guests', max: 8, amount: 1600 }], note: 'Prices per trip, not per person.' },
    // The airport arrival's welcome sign and the car boot are the request rows' own thumbnails (transfers page), so the
    // service shows three other photographs: a sharp 3105 px departures scene first (the 1000 px sign was soft at this size)
    images: { hero: 'airport-meet-and-greet', gallery: ['airport-guests-luggage', 'airport-departures-trolley'] },
    tripadvisor: { url: 'https://www.tripadvisor.co.za/AttractionProductReview-g312659-d19930417-Cape_Town_Private_Airport_Transfer-Cape_Town_Central_Western_Cape.html', rating: 5.0, reviews: 89, checked: '2026-11-05' },
    confirm: ['The official page says “Max 4” and also lists a rate for 5–8 guests: confirm the vehicles and group sizes offered.', 'Child seats are not mentioned on the official page: confirm whether they are available.'],
    source: SOURCE,
    approval: 'published by Good Times on goodtimesincapetown.co.za; wording adapted for this site',
  },
];

/** Options for the transfer request form. `flight: true` makes a flight number required. */
export const types = [
  { id: 'airport-arrival', label: 'Airport arrival', hint: 'Cape Town International (CPT) to your accommodation', flight: true },
  { id: 'airport-departure', label: 'Airport departure', hint: 'Your accommodation to Cape Town International (CPT)', flight: false },
  { id: 'other', label: 'Something else', hint: 'Tell us the route and we will let you know if we can help', flight: false },
];

export const TRANSFER_TYPES = types.map((t) => t.id);
