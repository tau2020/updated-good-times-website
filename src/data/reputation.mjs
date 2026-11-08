/**
 * The guest voices chapter (the home page's chapter 09; the owner's brief of 8 Nov 2026, §§ C–E;
 * docs/enhancement/03-reputation.md).
 *
 * THEMES: three things reviewers write about again and again, in our own words. They are site copy, labelled as our
 * summary, never presented as a review: no name, no star, no quotation marks, and each links to where the reviews
 * themselves are read. They rest on the review research behind src/data/reviews.mjs (summaries of the listing's
 * reviews, each with its own link) and on the listing as read on 8 Nov 2026.
 *
 * TESTIMONIALS: the typed registry the brief asks for. A testimonial is shown only when it is the guest's own words
 * with their express permission to publish them, or comes through a platform's official embed: `approved` must be
 * true, `permission_or_embed_method` one of ELIGIBLE_METHODS, and every field it shows must be filled. Anything else
 * renders nothing (no placeholder, no lorem ipsum). The Tripadvisor reviews summarised on /reviews/ are listed for the
 * record, with no permission recorded, so none is shown here (docs/APPROVAL_REGISTER.md › R1–R3).
 */
import { reviews } from './reviews.mjs';
import { site } from './site.mjs';

export const THEMES = [
  {
    id: 'seamless',
    title: 'Calm days, from the first hello to the last wave',
    text: 'Reviewers write about feeling safe and unhurried, solo travellers too: clear messages before the day, careful driving, a name board at arrivals and a hand with the luggage at departures.',
    tours: ['airport', 'cape-peninsula-private-tour'],
  },
  {
    id: 'stories',
    title: 'Stories that stay with you',
    text: 'Guests come back with the stories behind the places: Langa with guides who grew up there, District Six, the city’s history told in the order it happened.',
    tours: ['township-private-tour', 'cape-town-city-private-tour'],
  },
  {
    id: 'flexible',
    title: 'A day that bends to the group',
    text: 'A flexible start, a new route when a road closes, an extra stop on request: reviewers describe a private day that follows them, with a guide who takes the time to get to know them.',
    tours: ['cape-peninsula-private-tour', 'cape-winelands-private-tour'],
  },
];

/** The ways a testimonial may reach the page (the brief § D). */
export const ELIGIBLE_METHODS = Object.freeze(['written-permission', 'official-embed']);

/**
 * @typedef {object} Testimonial
 * @property {string} platform                       'Tripadvisor' | 'Google' | 'Direct' …
 * @property {string} source_url                     where the review itself is read
 * @property {string} permission_or_embed_method     'written-permission' | 'official-embed' | 'none recorded'
 * @property {string} reviewer_display_name          as the platform shows it
 * @property {string} date                           YYYY-MM-DD the review was written
 * @property {number|null} rating                    the reviewer's own, from the source
 * @property {string|null} actual_verbatim_excerpt   only with the permission recorded
 * @property {string} tour_tag                       a tour slug, 'airport', or ''
 * @property {string|null} photo_asset_and_rights    an approved file and its rights record, or null
 * @property {boolean} approved                      the owner's approval to show it
 */

/** The listing's reviews summarised on /reviews/, for the record: no permission is recorded, so none qualifies. */
export const TESTIMONIALS = reviews.map((r) => ({
  platform: 'Tripadvisor',
  source_url: r.url,
  permission_or_embed_method: r.quoteApproval ? 'written-permission' : 'none recorded',
  reviewer_display_name: r.author,
  date: r.written,
  rating: Number.isFinite(r.rating) ? r.rating : null,
  actual_verbatim_excerpt: r.quoteApproval && r.excerpt ? r.excerpt : null,
  tour_tag: r.tour || r.service || '',
  photo_asset_and_rights: null,
  approved: false,
}));

/** A testimonial the page may show: approved, permitted or embedded, and complete. */
export function isEligible(t) {
  return Boolean(
    t &&
      t.approved === true &&
      ELIGIBLE_METHODS.includes(t.permission_or_embed_method) &&
      /^https:\/\//.test(t.source_url || '') &&
      String(t.reviewer_display_name || '').trim() &&
      /^\d{4}-\d{2}-\d{2}$/.test(t.date || '') &&
      String(t.actual_verbatim_excerpt || '').trim(),
  );
}

export const eligibleTestimonials = (list = TESTIMONIALS) => list.filter(isEligible);

/**
 * The proof the chapter states, each from its own source and never added together: the Tripadvisor operator
 * listing (site.tripadvisor) and the Google Business Profile (site.google). Product listings' counts stay on their
 * own tour pages.
 */
export const proof = () => ({ tripadvisor: site.tripadvisor, google: site.google?.verified ? site.google : null });
