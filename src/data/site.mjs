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
  // The approved logo's own two-line tagline (Approved Logo Pack v2), part of the full artwork (gt-logo-primary.svg,
  // gt-logo-reversed.svg). The site shows the compact artwork, which has none, with the statement below set under it.
  logoTagline: 'Make unforgettable memories in the Mother City',
  // The company statement, exactly as Good Times supplied it (Addendum, 6 Nov 2026): set beneath the logo wherever the
  // logo lockup appears (the header and the footer; partials/layout.mjs), never inside the artwork.
  statement: 'Make Unforgettable Experience In The Mother City',
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
   * with Call (WhatsApp, once confirmed) and Plan My Day; the number appears as
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
    // The same number takes WhatsApp: Good Times confirmed it on 7 Nov 2026 with a screenshot of the number's WhatsApp
    // profile ("Stuart Tour Guide C…", +27 72 376 8432), asking for it in the contacts (docs/APPROVAL_REGISTER.md › C1).
    whatsapp: {
      e164: '+27723768432',
      display: '+27 72 376 8432',
      source: 'Good Times’ confirmation of 7 Nov 2026: the number’s WhatsApp profile, shown by the owner',
      verified: true,
    },
    // The primary address. hello@ replaces info@ (published on the official site on 5 Nov 2026) wherever the site
    // names an address: Good Times' instruction of 6 Nov 2026 (Addendum, docs/APPROVAL_REGISTER.md › C3).
    email: {
      address: 'hello@goodtimesincapetown.co.za',
      label: 'Email us',
      source: 'Good Times’ instruction of 6 Nov 2026 (Addendum): hello@ is the primary contact and replaces info@',
      verified: true,
    },
    // The additional address from the same instruction: on the contact page only, after the primary one
    // (contactList(site, { additional: true })); the footer, the menu and the enquiry page keep to hello@.
    emailGeneral: {
      address: 'stuart@goodtimesincapetown.co.za',
      label: 'Email Stuart',
      source: 'Good Times’ instruction of 6 Nov 2026 (Addendum): an additional contact option on the contact page',
      verified: true,
    },
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
   * Verified listing facts, read on the listing in a browser on 8 Nov 2026 (Tripadvisor draws its rating breakdown
   * there only): 264 reviews at 5.0, 260 Excellent and 4 Good. The rating and the count are as read on 5 Nov 2026;
   * the breakdown replaces the one recorded for 263 reviews on 3 Nov 2026. The home page's reviews and /reviews/ show
   * the count with this date; the five product listings' counts were read the same day (tours.mjs, transfers.mjs).
   */
  tripadvisor: {
    url: 'https://www.tripadvisor.co.za/Attraction_Review-g312659-d19611200-Reviews-Good_Times_In_Cape_Town-Cape_Town_Central_Western_Cape.html',
    rating: 5.0,
    reviewCount: 264,
    checked: '2026-11-08',
    distribution: { excellent: 260, good: 4, average: 0, poor: 0, terrible: 0 },
    distributionTotal: 264,
    distributionChecked: '2026-11-08',
  },

  /** Recognition the company states on its own About and Safety pages (read on 5 Nov 2026). */
  credentials: {
    guides: 'Accredited tourist guides recognised by the National Department of Tourism under the Western Cape Department of Economic Affairs and Tourism',
    association: 'A registered associate of the Cape Tourist Guides Association',
    operator: 'A Western Cape Tourism registered operator',
    source: `${OFFICIAL}: About (Accreditations) and Safety & Trust`,
    /**
     * The credentials strip on the home page (partials/credentials.mjs): the points each rest on the statements above.
     */
    points: [
      { title: 'Accredited local guides', text: 'Recognised by the Western Cape tourism authorities.' },
      { title: 'A registered operator', text: 'Registered with Western Cape Tourism.' },
      { title: 'Private by design', text: 'Only your group, your guide and a day planned around you.' },
    ],
    /**
     * The Cape Tourist Guides Association (CTGA), a professional association, not an award. Its logo is the
     * association's own vector file, unaltered (tourguides.capetown/images/logo.svg, read 6 Nov 2026, SHA-256
     * 632f01f5…d705; assets/img/credentials/ctga-logo.svg). CTGA lets its associate members place the logo on their
     * websites "advertising that you only employ/promote legal/registered guides" (Becoming an Associate Member,
     * read 6 Nov 2026). Good Times states it is "a registered associate" (above). CTGA's own list of current associate
     * members (tourguides.capetown/our-associates.html, read 6 Nov 2026) did not name it, so the logo and its line
     * first showed in preview builds only, marked "preview only"; the owner confirmed the membership on 7 Nov 2026, so
     * they now show in every build, without the note: docs/APPROVAL_REGISTER.md › T1.
     */
    ctga: {
      name: 'Cape Tourist Guides Association',
      short: 'CTGA',
      url: 'https://tourguides.capetown/',
      logo: 'assets/img/credentials/ctga-logo.svg',
      line: 'Connected to the Cape’s professional guiding community.',
      source: 'tourguides.capetown: logo, Our Associates and Becoming an Associate Member, read 6 Nov 2026; the membership confirmed by the owner on 7 Nov 2026',
      checked: '2026-11-06',
      confirmed: '2026-11-07',
      verified: true,
    },
  },

  /**
   * Safety statements from Good Times' own Safety & Trust page (the WordPress site of 5–7 Nov 2026), which the site
   * could not verify until the owner confirmed them on 8 Nov 2026 (docs/APPROVAL_REGISTER.md › H4). Shown on /safety/
   * only while `verified` is true.
   */
  safety: {
    vehicles: 'Our vehicles are regularly serviced and insured',
    firstAid: 'Our guides are trained in first aid and carry first-aid supplies',
    certificate: 'A Tripadvisor Certificate of Excellence',
    guests: 'Thousands of guests hosted safely',
    source: 'Good Times’ Safety & Trust page (goodtimesincapetown.co.za, 5–7 Nov 2026), confirmed by the owner on 8 Nov 2026 (H4)',
    verified: true,
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
    // The day the approved texts took effect: the owner's approval (B1, B2). Change it if they should start at go-live.
    effective: '2026-11-08',
    // The texts are Good Times' own (goodtimesincapetown.co.za/terms and /privacy), adapted to how this website works.
    // Approved by the owner on 8 Nov 2026 ("booking and legal approved"; docs/APPROVAL_REGISTER.md, B1 and B2). The
    // approval covers the texts: the facts still empty above (entity, informationOfficer, retention) and the terms'
    // OPEN_POINTS need Good Times' own values, and the release gate keeps naming them until they are set.
    privacyApproved: true,
    termsApproved: true,
    // The version of the Terms & Conditions text on the site, recorded with every booking request that accepts them.
    // Change it whenever the text changes (test/terms.test.mjs fails until you do).
    termsVersion: '2026-11-05',
    // Recorded 7 Nov 2026 by tau2020, the repository's owner, for the production deployment at
    // good-times-in-cape-town.pages.dev only (not the domain): these open items are accepted for that release and stay
    // open (docs/APPROVAL_REGISTER.md, A1 and B1–B5). Kept as given; the texts themselves were approved on 8 Nov 2026.
    releaseOverride: {
      date: '2026-11-07',
      by: 'tau2020 (repository owner)',
      scope: 'https://good-times-in-cape-town.pages.dev only; not goodtimesincapetown.co.za',
      accepted: ['site.legal.privacyApproved', 'site.legal.termsApproved', 'site.legal.effective', 'site.legal.entity', 'site.legal.informationOfficer', 'site.legal.retention', 'OPEN_POINTS'],
    },
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
    // The home hero's film: the owner's supplied café scene (5 Nov 2026), held still except for the cloud over Table Mountain
    // and the sea (src/tools/build-video.sh), a 7 s loop. One 16:9 file for every screen: portrait screens crop it in CSS.
    // AI-generated (docs/RIGHTS_REGISTER.md, G). null keeps the still poster only.
    heroFilm: { mp4: 'assets/video/hero-moment-1280.mp4', webm: 'assets/video/hero-moment-1280.webm' },
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
