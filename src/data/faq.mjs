/**
 * Frequently asked questions. The answers are Good Times' own, from the FAQ on
 * goodtimesincapetown.co.za (read on 5 Nov 2026), adapted only where this website
 * works differently (a booking request instead of an account; no "My Bookings" page),
 * plus two answers drawn from the official tour pages (group prices, the whale season).
 * Each answer notes its `source`.
 */
import { groupMax } from './pricing.mjs';

const FAQ = 'goodtimesincapetown.co.za/faq/, read on 5 Nov 2026';

export const faqs = [
  {
    q: 'How do I book a tour?',
    a: [
      'Choose a tour and send us a booking request from its page, or use the booking form for a transfer. If you would like to check availability or ask questions first, send us a message: every booking is confirmed by one of our team, not by an automated system.',
      'Sending a request does not create a booking. Your tour or transfer is confirmed once we have confirmed it with you.',
    ],
    source: `${FAQ} (adapted: this site sends a booking request)`,
  },
  {
    q: 'Are prices per person or per group?',
    a: [
      `Per group. Our published rates are for a private group of one to four guests, with a second rate for five to eight on most day tours; the Private Cape Town Experience has one rate for a group of up to ${groupMax('private-cape-town-experience')}, and the airport transfer is priced per trip, not per person. Some activities are priced on enquiry, by season or by package.`,
      'We confirm your price for your date, your group and any options with your quote.',
    ],
    source: 'The official tour pages, read on 5 Nov 2026, and the prices approved by Good Times on 7 Nov 2026',
  },
  {
    q: 'What payment methods do you accept?',
    a: [
      'We accept card payments and EFT. Prices are quoted in South African rand (ZAR); the currency selector converts the displayed amount for reference only, and you are always charged in ZAR.',
    ],
    source: FAQ,
  },
  {
    q: 'Can I cancel or reschedule my booking?',
    a: [
      'Yes. Contact us directly by phone or email if your plans change. Our tour pages list free cancellation up to 24 hours before departure; the terms that apply to your booking are confirmed with you when you book, and our Terms & Conditions set out the full policy.',
    ],
    source: `${FAQ} (adapted: no My Bookings page on this site)`,
  },
  {
    q: 'Where do tours depart from?',
    a: [
      'Most tours include pickup from your hotel or accommodation in central Cape Town. Our office is at 277 Main Road, Adelphi Centre, Sea Point. Exact pickup arrangements are confirmed with you once your booking is finalised.',
    ],
    source: FAQ,
  },
  {
    q: 'What should I bring?',
    a: ['Comfortable walking shoes, sun protection, a light jacket (Cape Town weather changes quickly) and a valid photo ID. If a tour needs anything extra, we’ll let you know when you book.'],
    source: FAQ,
  },
  {
    q: 'What happens if the weather is bad?',
    a: ['Cape Town weather, especially on Table Mountain, can change fast. If conditions make a tour unsafe, we’ll contact you to reschedule or adjust the itinerary rather than run it regardless.'],
    source: FAQ,
  },
  {
    q: 'Are your guides accredited?',
    a: ['Yes. Our guides are accredited tourist guides recognised by the National Department of Tourism under the Western Cape Department of Economic Affairs and Tourism, and we are a registered associate of the Cape Tourist Guides Association.'],
    source: `${FAQ}; About › Accreditations`,
  },
  {
    q: 'Do you cater for private and group tours?',
    a: ['Every tour we run is private and shaped around the people on it, from couples and families to larger groups. Let us know your group size when you enquire and we’ll tailor the experience.'],
    source: FAQ,
  },
  {
    q: 'Can you accommodate dietary needs or mobility requirements?',
    a: ['Let us know when you book: mention dietary requirements ahead of any tour with meals or tastings, and any mobility considerations, so we can plan accordingly.'],
    source: FAQ,
  },
  {
    q: 'When is whale watching season?',
    a: ['Whale watching is seasonal, and the best months are June to November. Mention your travel dates in your enquiry and we’ll advise whether the whale watching tour suits them.'],
    source: 'The official whale watching tour page, read on 5 Nov 2026',
  },
];
