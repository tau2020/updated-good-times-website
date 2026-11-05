/**
 * Site-wide configuration for Good Times in Cape Town.
 *
 * Every business fact lives here or in the other src/data modules, with its
 * source and verification state. Templates render a fact only when it is
 * verified. Facts come from the company's own website, goodtimesincapetown.co.za
 * (read on 5 Nov 2026), its approved logo pack and its own Tripadvisor listing;
 * docs/APPROVAL_REGISTER.md lists what Good Times still has to confirm.
 */
import { loadDotEnv } from '../../lib/config.mjs';

loadDotEnv(); // so a local `npm run build` sees SITE_ENV, ENQUIRY_* etc. from .env

const env = (k, d = '') => (process.env[k] ?? d).trim();
const flag = (k, d) => {
  const v = env(k, d ? 'true' : 'false').toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
};

/** 'preview' (default): noindex everywhere, preview banner, unverified slots shown as pending. */
const SITE_ENV = env('SITE_ENV', 'preview') === 'production' ? 'production' : 'preview';

const OFFICIAL = 'goodtimesincapetown.co.za, read on 5 Nov 2026';

export const site = {
  env: SITE_ENV,
  preview: SITE_ENV === 'preview',

  name: 'Good Times in Cape Town',
  shortName: 'Good Times',
  tagline: 'Private tours in Cape Town since 2014',
  // The approved logo's own two-line tagline (Approved Logo Pack v2)
  logoTagline: 'Make unforgettable memories in the Mother City',
  descriptor: 'Private tours and transfers, Cape Town',
  founded: 2014,
  founder: 'Stuart Matanhire',
  // Canonical origin. The production domain is decided by Good Times at release; a build without
  // PUBLIC_SITE_URL gets this placeholder, so a preview never claims the live domain.
  url: env('PUBLIC_SITE_URL', 'https://preview.goodtimesincapetown.invalid').replace(/\/$/, ''),
  locale: 'en-GB',
  timezone: 'Africa/Johannesburg',
  themeColor: '#102E42',

  /**
   * Public contact channels. Rendered only when `verified` is true; an unverified
   * channel is simply not shown. A verified phone gives every page below 1024 px a bar
   * with Call (WhatsApp, once confirmed) and Make It Yours; the number appears as
   * selectable text with its actions in the footer, the mobile menu, the Travel
   * Concierge, the contact page and the enquiry page; telephone and email in the JSON-LD.
   */
  contact: {
    phone: {
      e164: '+27723768432',
      display: '+27 72 376 8432',
      source: `${OFFICIAL}: header, contact page and footer (tel:+27723768432); also the business's own flyer on Tripadvisor`,
      verified: true,
    },
    // The official site publishes no WhatsApp link. Set verified: true once Good Times confirms the number takes WhatsApp.
    whatsapp: {
      e164: '+27723768432',
      display: '+27 72 376 8432',
      source: 'Not yet confirmed: the official site lists this number for calls only',
      verified: false,
    },
    email: {
      address: 'info@goodtimesincapetown.co.za',
      label: 'Email',
      source: `${OFFICIAL}: contact page, safety page and footer`,
      verified: true,
    },
    emailGeneral: { address: '', label: 'Bookings', source: '', verified: false },
    // The office, exactly as the official site writes it (it matches the Google Business Profile and Tripadvisor).
    office: {
      lines: ['277 Main Road, Adelphi Centre', 'Sea Point, Cape Town, 8005'],
      street: '277 Main Road, Adelphi Centre',
      locality: 'Sea Point, Cape Town',
      postalCode: '8005',
      region: 'Western Cape',
      country: 'ZA',
      mapsUrl: 'https://www.google.com/maps/dir/?api=1&destination=277+Main+Road+Adelphi+Centre+Sea+Point+Cape+Town+8005',
      source: `${OFFICIAL}: "Visit Our Office" and the footer`,
      verified: true,
    },
    hours: { text: '', verified: false },
    responseTime: { text: '', verified: false },
  },

  social: {
    tripadvisor: 'https://www.tripadvisor.co.za/Attraction_Review-g312659-d19611200-Reviews-Good_Times_In_Cape_Town-Cape_Town_Central_Western_Cape.html',
    facebook: 'https://www.facebook.com/goodtimesincapetown',
    instagram: 'https://www.instagram.com/goodtimesincapetown',
    youtube: 'https://www.youtube.com/@GoodTimesInCapetown',
  },

  /**
   * Verified listing facts. The rating and review count were read on the listing on 5 Nov 2026. Tripadvisor
   * draws its rating breakdown in the browser only, so the breakdown is the one recorded for the 263 reviews
   * indexed by Good Times' own research on 3 Nov 2026 (Drive › Tripadvisor Photo Collection › 09).
   */
  tripadvisor: {
    url: 'https://www.tripadvisor.co.za/Attraction_Review-g312659-d19611200-Reviews-Good_Times_In_Cape_Town-Cape_Town_Central_Western_Cape.html',
    rating: 5.0,
    reviewCount: 264,
    checked: '2026-11-05',
    distribution: { excellent: 259, good: 4, average: 0, poor: 0, terrible: 0 },
    distributionTotal: 263,
    distributionChecked: '2026-11-03',
  },

  /** Recognition the company states on its own About and Safety pages (read on 5 Nov 2026). */
  credentials: {
    guides: 'Accredited tourist guides recognised by the National Department of Tourism under the Western Cape Department of Economic Affairs and Tourism',
    association: 'A registered associate of the Cape Tourist Guides Association',
    operator: 'A Western Cape Tourism registered operator',
    source: `${OFFICIAL}: About (Accreditations) and Safety & Trust`,
  },

  /**
   * The facts the privacy notice and the terms rest on (POPIA s.18, ECTA s.43), rendered only when
   * verified. Nothing here may be guessed. Until Good Times approves both texts (`privacyApproved`,
   * `termsApproved`), the production deployment refuses to run (scripts/release-gate.mjs).
   */
  legal: {
    entity: { name: '', registration: '', directors: '', verified: false },
    // The office published on the official site; Good Times to confirm it is also the address for legal notices.
    address: { text: '277 Main Road, Adelphi Centre, Sea Point, Cape Town, 8005', verified: true },
    informationOfficer: { name: '', email: '', verified: false },
    retention: { text: '', verified: false },
    effective: '',
    // The texts are Good Times' own (goodtimesincapetown.co.za/terms and /privacy), adapted to how this website works.
    // They wait for the owner's approval of those adaptations (docs/APPROVAL_REGISTER.md).
    privacyApproved: false,
    termsApproved: false,
    // The version of the Terms & Conditions text on the site, recorded with every booking request that accepts them.
    // Change it whenever the text changes (test/terms.test.mjs fails until you do).
    termsVersion: '2026-11-05',
    releaseOverride: null,
  },

  /** Enquiry intake (lib/, api/). Read at build time; on a host these come from environment variables. */
  enquiry: {
    // false|0|no|off → the API returns 503 and the page shows a notice instead of the form.
    enabled: !['false', '0', 'no', 'off'].includes(env('ENQUIRY_SYSTEM_ENABLED', 'true').toLowerCase()),
    // 'preview' → the wizard works end to end but never sends; it says so plainly. 'live' → posts to the API.
    mode: env('ENQUIRY_MODE', 'preview').toLowerCase() === 'live' ? 'live' : 'preview',
    endpoint: '/api/enquiries',
    referencePrefix: 'GT-',
  },

  /**
   * Visit statistics: Cloudflare Web Analytics, loaded by assets/js/consent.js only after the visitor allows it.
   * Without a token the page carries no analytics config and the choice is never offered.
   */
  analytics: {
    cloudflareToken: env('WEB_ANALYTICS_TOKEN'),
  },

  /**
   * Prices: Good Times' own published rates, in South African rand and per group (not per person), as the
   * official site lists them on 5 Nov 2026. SHOW_INDICATIVE_PRICES=false shows "Request a quote" instead.
   */
  prices: {
    show: flag('SHOW_INDICATIVE_PRICES', true),
    checked: '2026-11-05',
    disclaimer:
      'Prices are per group, in South African rand, as published by Good Times in Cape Town. Other currencies are an indicative conversion; we confirm your price for your date, group and options with your quote.',
  },

  media: {
    // No hero film: Good Times has no authorised footage yet, so the home hero is a photograph.
    heroFilm: null,
  },

  /** Primary navigation. "Transfers" keeps the /transfers/ URL. Reviews and FAQ live in the footer. */
  nav: [
    { label: 'Tours', href: 'tours/' },
    { label: 'Transfers', href: 'transfers/' },
    { label: 'Destinations', href: 'destinations/' },
    { label: 'About', href: 'about/' },
    { label: 'Contact', href: 'contact/' },
  ],
  /** Secondary pages shown in the footer and the mobile menu. */
  navSecondary: [
    { label: 'Reviews', href: 'reviews/' },
    { label: 'FAQ', href: 'faq/' },
  ],

  /** Trust cues, each backed by a statement on the official site. */
  trust: [
    { icon: 'users', title: 'Private by design', text: 'Every tour is private and shaped around your group' },
    { icon: 'compass', title: 'Accredited local guides', text: 'Recognised by the Western Cape tourism authorities' },
    { icon: 'pin', title: 'Pickup included', text: 'Most tours start at your accommodation' },
  ],
};
