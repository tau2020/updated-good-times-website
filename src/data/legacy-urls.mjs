/**
 * The historical URL registry: every address goodtimesincapetown.co.za is known to have served, on each of the sites
 * that have answered there, with where it goes now, why, on what evidence, and who owns the decision. It replaces the
 * separate lists of Step 4B (the 190-URL audit of 7 Nov 2026, its 70-rule _redirects, the Search Console additions and
 * the 56-row preservation register of 8 Nov 2026) with one authoritative list, and it is the single source for:
 *
 *  - site/_redirects (src/data/redirects.mjs builds it from the redirect and prefix entries, every build);
 *  - the pages restored at their old addresses (/services/, /safety/) and the original files kept at theirs;
 *  - the tests (test/legacy-registry.test.mjs, test/legacy-urls.test.mjs) and the suite for any deployment
 *    (qa/legacy-urls.mjs);
 *  - the registry tables in docs/seo/ (npm run seo:registry).
 *
 * Search Console figures are private and stay out of this public repository: an entry names its evidence (SOURCES), and
 * the figures are in the owner's Drive (Good Times Web Migration › SEO Preservation Register and the exports beside it).
 *
 * Entry fields: path (the old address; a prefix ends in *, a query keeps its ?), era, sources, priority, action, to (the
 * destination, for redirect and prefix), owner, topic (a word the destination's title or main heading must contain, so
 * the suite proves the visitor lands on related content), samples (concrete addresses a prefix or pattern covers),
 * decision (the approval-register item an entry waits on), asset (a preserved file's checksum), note (the reason).
 */
import { WP_ATTACHMENTS, WP_UPLOADS, WP_IDS, DJANGO_STATIC, ARCHIVED_2022_IMAGES } from './legacy-inventory.mjs';

export const REGISTRY_DATE = '2026-11-08';

/** The sites that have answered on the domain. */
export const ERAS = {
  'static-2022': 'A static site, 2021–2022 (Internet Archive captures)',
  'static-2025': 'Static pages of May 2025, still in the hosting account but 404 on the live site',
  django: 'The booking site (Django on DigitalOcean) until 5 Nov 2026',
  wordpress: 'The WordPress site of 5–7 Nov 2026 on the cPanel hosting account',
};

/** The evidence an entry rests on. Those marked private stay in the owner's Drive. */
export const SOURCES = {
  gsc: { label: 'Search Console performance, 16 months to 8 Nov 2026: clicks or impressions', private: true },
  'gsc-crawl': { label: 'Search Console crawl stats, 28 Oct–7 Nov 2026: Googlebot requested it', private: true },
  'gsc-links': { label: 'Search Console links report: other sites link to it', private: true },
  register: { label: 'SEO preservation register, 8 Nov 2026 (56 rows)' },
  audit: { label: 'SEO migration audit, 7 Nov 2026: its 190-URL map and proposed 70-rule _redirects' },
  additions: { label: '_redirects-gsc-additions, 8 Nov 2026 (32 rules, 16 addresses)' },
  repo: { label: 'This repository before Step 4B: src/data/redirects.mjs (26 rules), each offering’s page read 5 Nov 2026' },
  'wp-backup': { label: 'The hosting account’s backup of 7 Nov 2026: the WordPress database and theme' },
  'django-export': { label: 'The booking site’s own export, kept in the WordPress theme (migration-data/export.json)' },
  'media-store': { label: 'The booking site’s media store, still online: each file read and checked against its MD5, 8 Nov 2026' },
  wayback: { label: 'Internet Archive index (CDX), read 8 Nov 2026' },
  'static-2025': { label: 'The May 2025 static pages in the hosting account’s backup' },
  pattern: { label: 'Follows a documented address pattern; no direct record of this one address' },
};

export const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];

export const ACTIONS = {
  keep: 'The same address answers on the new site',
  redirect: '301 to the new address: a static rule, with and without the trailing slash',
  prefix: '301 for every address under it: a dynamic rule, after every static rule',
  page: 'A page of the new site answers at the old address (restored)',
  asset: 'The original file, unaltered, answers at its old address',
  platform: 'Cloudflare Pages redirects it by itself',
  host: 'A host-level redirect, set at the domain cutover (not possible in _redirects)',
  query: 'A query string on the home page: the new home page answers, canonical /',
  retire: '404 by design',
  hold: '404 until the owner decides (the decision named)',
};

export const OWNERS = {
  engineering: 'Done in this repository (the registry and the build)',
  owner: 'Good Times decides (docs/APPROVAL_REGISTER.md)',
  cutover: 'Done at the domain cutover (docs/seo/READINESS.md)',
  platform: 'Cloudflare Pages behaviour; nothing to configure',
};

/** Where each offering lives now, with the word its page's title carries. */
const PEN = { to: '/tours/cape-peninsula-private-tour/', topic: 'Cape Peninsula' };
const CITY = { to: '/tours/cape-town-city-private-tour/', topic: 'Cape Town City' };
const WINE = { to: '/tours/cape-winelands-private-tour/', topic: 'Winelands' };
const TOWNSHIP = { to: '/tours/township-private-tour/', topic: 'Township' };
const EXPERIENCE = { to: '/tours/private-cape-town-experience/', topic: 'Private Cape Town Experience' };
const WHALE = { to: '/tours/whale-watching-private-tour/', topic: 'Whale Watching' };
const AGULHAS = { to: '/tours/cape-agulhas-private-tour/', topic: 'Cape Agulhas' };
const SHARK = { to: '/tours/shark-cage-diving/', topic: 'Shark Cage Diving' };
const QUAD = { to: '/tours/quad-biking/', topic: 'Quad Biking' };
const SKY = { to: '/tours/sky-diving/', topic: 'Sky Diving' };
const GARDEN = { to: '/packages/garden-route-private-tour/', topic: 'Garden Route' };
const TRANSFER = { to: '/transfers/', topic: 'Airport Transfer' };
const TOURS = { to: '/tours/', topic: 'Tours' };

const R = 'redirect';
const ENG = 'engineering';

/**
 * The tour pages of the two booking-era sites. The booking site's slugs (the repository's records of each offering's
 * page, read 5 Nov 2026, and Search Console) and WordPress's (its database: four were renamed on import) both
 * resolve, each with a static rule of its own: none falls through to the /tour/* catch-all.
 */
const TOUR_PAGES = [
  // The four booking-site addresses WordPress renamed: kept explicitly (they hold the impressions).
  { path: '/tour/cape-peninsula-private-tour/', ...PEN, era: ['django'], sources: ['gsc', 'gsc-crawl', 'register', 'repo'], priority: 'High' },
  { path: '/tour/cape-town-city-private-tour/', ...CITY, era: ['django'], sources: ['gsc', 'gsc-crawl', 'register', 'repo'], priority: 'High' },
  { path: '/tour/township-private-tour/', ...TOWNSHIP, era: ['django'], sources: ['gsc', 'gsc-crawl', 'register', 'repo'], priority: 'High' },
  { path: '/tour/cape-winelands-private-tour/', ...WINE, era: ['django'], sources: ['gsc', 'gsc-crawl', 'register', 'repo'], priority: 'High' },
  // WordPress's renamed slugs (the booking site's export carried them; the audit found them returning 404 here).
  { path: '/tour/cape-peninsula-adventure/', ...PEN, era: ['wordpress'], sources: ['gsc-crawl', 'audit', 'wp-backup', 'django-export'], priority: 'High' },
  { path: '/tour/cape-town-city-tour/', ...CITY, era: ['wordpress'], sources: ['gsc', 'gsc-crawl', 'register', 'audit', 'wp-backup', 'django-export'], priority: 'High' },
  { path: '/tour/township-cultural-tour/', ...TOWNSHIP, era: ['wordpress'], sources: ['gsc-crawl', 'audit', 'wp-backup', 'django-export'], priority: 'High' },
  { path: '/tour/winelands-experience/', ...WINE, era: ['wordpress'], sources: ['gsc', 'register', 'audit', 'wp-backup', 'django-export'], priority: 'High' },
  // The same slug on both sites.
  { path: '/tour/airport-private-transfer/', ...TRANSFER, era: ['django', 'wordpress'], sources: ['gsc', 'gsc-crawl', 'register', 'audit', 'repo', 'wp-backup'], priority: 'Critical' },
  { path: '/tour/shark-cage-diving/', ...SHARK, era: ['django', 'wordpress'], sources: ['gsc', 'gsc-crawl', 'register', 'audit', 'repo', 'wp-backup'], priority: 'High' },
  { path: '/tour/garden-route-private-tour/', ...GARDEN, era: ['django', 'wordpress'], sources: ['gsc', 'gsc-crawl', 'register', 'audit', 'repo', 'wp-backup'], priority: 'High' },
  { path: '/tour/whale-watching-private-tour/', ...WHALE, era: ['django', 'wordpress'], sources: ['gsc', 'gsc-crawl', 'register', 'audit', 'repo', 'wp-backup'], priority: 'High' },
  { path: '/tour/sky-diving/', ...SKY, era: ['django', 'wordpress'], sources: ['gsc', 'gsc-crawl', 'register', 'audit', 'repo', 'wp-backup'], priority: 'High' },
  { path: '/tour/cape-agulhas-private-tour/', ...AGULHAS, era: ['django', 'wordpress'], sources: ['gsc', 'gsc-crawl', 'register', 'audit', 'repo', 'wp-backup'], priority: 'High' },
  { path: '/tour/private-cape-town-experience/', ...EXPERIENCE, era: ['django', 'wordpress'], sources: ['gsc', 'gsc-crawl', 'register', 'audit', 'repo', 'wp-backup'], priority: 'High' },
  { path: '/tour/quad-biking/', ...QUAD, era: ['django', 'wordpress'], sources: ['gsc', 'gsc-crawl', 'register', 'audit', 'repo', 'wp-backup'], priority: 'High' },
].map((t) => ({
  action: R,
  owner: ENG,
  ...(t.era.length === 1 && t.era[0] === 'django'
    ? { note: 'The booking site’s address, with search impressions. Missing from the audit’s 70-rule file (it crawled WordPress, which had renamed the slug): its own static rule, so it never falls through to /tour/*.' }
    : t.era.length === 1
      ? { note: 'WordPress’s slug for the same tour (the booking site’s export carried it); answered 404 on the deployed site before Step 4B.' }
      : {}),
  ...t,
}));

/** Everything under a tour's old address (WordPress attachment pages, feeds, pages): its page here. */
const slugOf = (p) => p.split('/')[2];
const TOUR_PREFIXES = TOUR_PAGES.map((t) => {
  const slug = slugOf(t.path);
  const attachments = (WP_ATTACHMENTS[slug] || []).map((a) => `/tour/${slug}/${a}/`);
  return {
    path: `/tour/${slug}/*`,
    action: 'prefix',
    to: t.to,
    topic: t.topic,
    era: t.era,
    sources: attachments.length ? ['audit', 'wp-backup'] : ['pattern'],
    priority: 'Low',
    owner: ENG,
    samples: attachments.length ? attachments : [`/tour/${slug}/feed/`],
    note: attachments.length ? `${attachments.length} WordPress attachment page(s), plus feeds` : 'Any page under the booking site’s tour address',
  };
});

/** The booking site's booking pages: the booking form with the same tour chosen (src/assets/js/enquiry.js › prefill). */
const book = (slug, to, sources, extra = {}) => ({
  path: `/users/book/${slug}/`,
  action: R,
  to,
  era: ['django'],
  sources,
  priority: 'High',
  owner: ENG,
  topic: 'Book',
  ...extra,
});
const enquireTour = (slug) => `/enquire/?type=tour&tour=${slug}`;
const BOOKING_PAGES = [
  book('cape-peninsula-private-tour', enquireTour('cape-peninsula-private-tour'), ['gsc', 'gsc-crawl', 'register', 'additions']),
  book('cape-town-city-private-tour', enquireTour('cape-town-city-private-tour'), ['gsc', 'gsc-crawl', 'register', 'additions']),
  book('cape-winelands-private-tour', enquireTour('cape-winelands-private-tour'), ['gsc', 'gsc-crawl', 'register', 'additions']),
  book('township-private-tour', enquireTour('township-private-tour'), ['additions', 'pattern'], {
    note: 'The one booking page the preservation register lacks: no Search Console record, but every other tour’s booking page is evidenced, and the additions file includes it. Kept, High like its siblings.',
  }),
  book('private-cape-town-experience', enquireTour('private-cape-town-experience'), ['gsc', 'register', 'additions']),
  book('whale-watching-private-tour', enquireTour('whale-watching-private-tour'), ['gsc', 'gsc-crawl', 'register', 'additions']),
  book('cape-agulhas-private-tour', enquireTour('cape-agulhas-private-tour'), ['gsc-crawl', 'register', 'additions']),
  book('shark-cage-diving', enquireTour('shark-cage-diving'), ['gsc', 'gsc-crawl', 'register', 'additions']),
  book('quad-biking', enquireTour('quad-biking'), ['gsc', 'gsc-crawl', 'register', 'additions']),
  book('sky-diving', enquireTour('sky-diving'), ['gsc-crawl', 'register', 'additions']),
  book('garden-route-private-tour', enquireTour('garden-route-private-tour'), ['gsc-crawl', 'register', 'additions'], {
    note: 'The multi-day tour travels the tour path of the form; its nights stay “not sure yet” (no old link carried them).',
  }),
  book('airport-private-transfer', '/enquire/?type=transfer', ['gsc-crawl', 'register', 'additions'], {
    note: 'The old booking page did not say arrival or departure, so the transfer path opens with neither chosen.',
  }),
];

/**
 * The WordPress tour categories (11, all in the 190-URL map). Targets follow the audit's map, two refined to the
 * matching filter of the tours page (the fragment selects it; search engines see /tours/). A category whose page
 * here is not /tours/ also carries its sub-addresses (feeds, pagination) with a prefix rule of its own.
 */
const CATEGORY = [
  ['private-tours', TOURS],
  ['day-tours', TOURS],
  ['nature-tours', { to: '/tours/#nature', topic: 'Tours' }, 'Refined from /tours/ to its Nature filter: the category held the whale watching tour.'],
  ['adventure-activities', { to: '/tours/#adventure', topic: 'Tours' }, 'Refined from /tours/ to its Adventure filter: the category held shark cage diving, quad biking and sky diving.'],
  ['multi-day-tours', { to: '/packages/', topic: 'Multi-day' }],
  ['airport-pickups', TRANSFER],
  ['cultural-tours', TOWNSHIP],
  ['cultural-experiences', TOWNSHIP],
  ['city-tours', CITY],
  ['peninsula-tours', PEN],
  ['winelands', WINE],
];
const CRAWLED_CATEGORIES = new Set(['adventure-activities', 'airport-pickups', 'cultural-tours', 'nature-tours']);
const CATEGORIES = CATEGORY.map(([slug, t, note]) => ({
  path: `/tour-category/${slug}/`,
  action: R,
  ...t,
  era: ['wordpress'],
  sources: CRAWLED_CATEGORIES.has(slug) ? ['gsc-crawl', 'register', 'audit', 'wp-backup'] : ['register', 'audit', 'wp-backup'],
  priority: 'Low',
  owner: ENG,
  ...(note ? { note } : {}),
}));
const CATEGORY_PREFIXES = CATEGORY.filter(([, t]) => t.to !== '/tours/' && !t.to.startsWith('/tours/#')).map(([slug, t]) => ({
  path: `/tour-category/${slug}/*`,
  action: 'prefix',
  ...t,
  era: ['wordpress'],
  sources: slug === 'airport-pickups' ? ['gsc-crawl', 'wp-backup'] : ['pattern', 'wp-backup'],
  priority: 'Low',
  owner: ENG,
  samples: [`/tour-category/${slug}/feed/`],
}));

/** The pages restored at their old addresses (src/pages/services.mjs, src/pages/safety.mjs): no redirect at all. */
const RESTORED = [
  {
    path: '/services/',
    action: 'page',
    era: ['django'],
    sources: ['gsc', 'gsc-links', 'gsc-crawl', 'register', 'additions'],
    priority: 'Critical',
    owner: 'owner',
    decision: 'H1',
    topic: 'Services',
    note: 'The booking site’s “Our offer” page (every service). The additions file sent it to /tours/, which covers neither transfers nor the overview it was linked for: it is now an overview of the four services at its own address. If the owner prefers the redirect, change action to redirect, to /tours/.',
  },
  {
    path: '/safety/',
    action: 'page',
    era: ['wordpress'],
    sources: ['gsc-crawl', 'register', 'audit', 'wp-backup'],
    priority: 'Medium',
    owner: 'owner',
    decision: 'H1',
    topic: 'Safety',
    note: 'WordPress’s Safety & Trust page. The audit sent it to /about/; the register prefers keeping the page. Restored with the verified statements only (the accreditations, the association, private groups, since 2014); its unverified claims wait for H4.',
  },
];

/** Search Console additions: the booking site's own pages. Reviewed before treating as final (docs/seo/READINESS.md). */
const APP_PAGES = [
  {
    path: '/bookings/',
    action: R,
    to: '/enquire/',
    topic: 'Book',
    era: ['django'],
    sources: ['gsc', 'gsc-crawl', 'register', 'additions'],
    priority: 'High',
    owner: ENG,
    note: 'The booking site’s bookings page. There are no customer accounts here; booking is a request through the form.',
  },
  {
    path: '/accounts/login/',
    action: R,
    to: '/enquire/',
    topic: 'Book',
    era: ['django'],
    sources: ['gsc', 'gsc-crawl', 'register', 'additions'],
    priority: 'Critical',
    owner: ENG,
    samples: ['/accounts/login/?next=/users/book/quad-biking/'],
    note: 'Reviewed: the booking site asked visitors to sign in before booking (Googlebot followed /accounts/login/?next=/users/book/quad-biking/). The form is that step’s successor; the query passes through, and the form chooses the tour named in next=. Never /admin/ (staff only, and a Functions route).',
  },
  {
    path: '/accounts/signup/',
    action: R,
    to: '/enquire/',
    topic: 'Book',
    era: ['django'],
    sources: ['gsc', 'gsc-crawl', 'register', 'additions'],
    priority: 'Low',
    owner: ENG,
    note: 'Reviewed with /accounts/login/: account creation before booking. No accounts here; the form needs none.',
  },
];

/** The other addresses of the 190-URL map and the register. */
const SITE_PAGES = [
  { path: '/', action: 'keep', era: ['django', 'wordpress', 'static-2022'], sources: ['gsc', 'gsc-links', 'gsc-crawl', 'register', 'audit', 'wayback'], priority: 'Critical', owner: ENG, topic: 'since 2014' },
  { path: '/contact/', action: 'keep', era: ['django', 'wordpress'], sources: ['gsc', 'gsc-crawl', 'register', 'audit'], priority: 'Critical', owner: ENG, topic: 'Contact' },
  { path: '/about/', action: 'keep', era: ['django', 'wordpress'], sources: ['gsc', 'gsc-crawl', 'register', 'audit'], priority: 'High', owner: ENG, topic: 'about' },
  { path: '/faq/', action: 'keep', era: ['wordpress'], sources: ['gsc-crawl', 'register', 'audit'], priority: 'Medium', owner: ENG, topic: 'questions' },
  { path: '/privacy/', action: 'keep', era: ['django', 'wordpress'], sources: ['gsc-crawl', 'register', 'audit'], priority: 'Medium', owner: ENG, topic: 'Privacy' },
  {
    path: '/terms/',
    action: 'keep',
    era: ['django', 'wordpress'],
    sources: ['gsc-crawl', 'register', 'audit'],
    priority: 'Medium',
    owner: 'owner',
    decision: 'B2',
    topic: 'Terms',
    note: 'Answers, as a marked draft kept out of search (noindex) until the owner approves the terms (B2); the old page was indexable.',
  },
  { path: '/tours/', action: 'keep', era: ['wordpress'], sources: ['audit', 'wp-backup'], priority: 'Medium', owner: ENG, topic: 'Tours', note: 'WordPress’s tour archive (has_archive: tours).' },
  { path: '/sitemap.xml', action: 'keep', era: ['wordpress'], sources: ['audit'], priority: 'Low', owner: ENG, env: 'production', note: 'Production builds only (a preview publishes no sitemap).' },
  { path: '/robots.txt', action: 'keep', era: ['wordpress', 'static-2022'], sources: ['audit', 'wayback'], priority: 'Low', owner: ENG },
  {
    path: '/gallery/',
    action: R,
    ...TOURS,
    era: ['django', 'wordpress'],
    sources: ['gsc', 'gsc-crawl', 'register', 'audit'],
    priority: 'Medium',
    owner: 'owner',
    decision: 'H2',
    note: 'WordPress gathered every tour’s photographs here; the booking site had a gallery list of its own. Each photograph now sits on its tour’s page, all reached from /tours/ (the audit’s target, and the register’s fallback). A gallery page of its own needs photographs not already placed elsewhere (H2).',
  },
  { path: '/tour/', action: R, ...TOURS, era: ['django', 'wordpress'], sources: ['repo', 'audit'], priority: 'Low', owner: ENG },
  { path: '/index.php', action: R, to: '/', topic: 'since 2014', era: ['wordpress'], sources: ['audit'], priority: 'Low', owner: ENG },
  {
    path: '/favicon.ico',
    action: R,
    to: '/assets/brand/favicon.ico',
    era: ['wordpress', 'django', 'static-2022'],
    sources: ['gsc-crawl', 'register', 'audit', 'wayback'],
    priority: 'Low',
    owner: ENG,
    note: 'The approved logo pack’s icon (src/assets/brand/favicon.ico).',
  },
  { path: '/wp-sitemap.xml', action: R, to: '/sitemap.xml', era: ['wordpress'], sources: ['audit'], priority: 'Low', owner: ENG, env: 'production' },
  {
    path: '/index.html',
    action: 'platform',
    to: '/',
    era: ['static-2022', 'django'],
    sources: ['gsc', 'gsc-crawl', 'register', 'wayback'],
    priority: 'Low',
    owner: 'platform',
    note: 'Pages answers 308 to / for any index.html.',
  },
];

/** The two older static sites' pages (none answers on the live site today). */
const STATIC_PAGES = [
  { path: '/contact.html', to: '/contact/', topic: 'Contact', era: ['static-2022', 'static-2025'], sources: ['wayback', 'static-2025'] },
  { path: '/tours.html', ...TOURS, era: ['static-2022'], sources: ['wayback'] },
  { path: '/gallery.html', ...TOURS, era: ['static-2022'], sources: ['wayback'], decision: 'H2' },
  { path: '/about-us.html', to: '/about/', topic: 'about', era: ['static-2025'], sources: ['static-2025'] },
  { path: '/our-offer.html', to: '/services/', topic: 'Services', era: ['static-2025'], sources: ['static-2025'], note: '“Our Tour Services”' },
  { path: '/customer-protection.html', to: '/safety/', topic: 'Safety', era: ['static-2025'], sources: ['static-2025'], note: '“Your Safety is Our Priority”' },
].map((p) => ({ action: R, priority: 'Low', owner: ENG, ...p }));

/** Catch-alls, after every specific rule. */
const CATCH_ALLS = [
  { path: '/users/book/*', action: 'prefix', to: '/enquire/', topic: 'Book', era: ['django'], sources: ['pattern'], priority: 'Low', owner: ENG, samples: ['/users/book/retired-tour/'], note: 'A booking page for any other (retired) offering: the form, nothing chosen.' },
  { path: '/tour/*', action: 'prefix', ...TOURS, era: ['django', 'wordpress'], sources: ['audit'], priority: 'Low', owner: ENG, samples: ['/tour/feed/', '/tour/retired-tour/'] },
  { path: '/tour-category/*', action: 'prefix', ...TOURS, era: ['wordpress'], sources: ['audit'], priority: 'Low', owner: ENG, samples: ['/tour-category/day-tours/feed/', '/tour-category/private-tours/page/2/'] },
  {
    path: '/wp-sitemap-*',
    action: 'prefix',
    to: '/sitemap.xml',
    era: ['wordpress'],
    sources: ['audit'],
    priority: 'Low',
    owner: ENG,
    env: 'production',
    samples: ['/wp-sitemap-posts-tour-1.xml', '/wp-sitemap-posts-page-1.xml', '/wp-sitemap-taxonomies-tour_category-1.xml'],
  },
];

/**
 * The 14 images Googlebot-Image still asked for at the booking site's /media/ addresses. All 14 originals were found
 * in the booking site's media store (each checked against its MD5) and 10 also in the WordPress backup, byte for byte.
 * A file is served here only when the rights register already covers that photograph for this site; the others wait
 * for the owner or stay retired by the register's own rules (docs/seo/HISTORICAL_MEDIA.md).
 */
const media = (path, action, fields) => ({
  path,
  action,
  era: ['django'],
  sources: ['gsc-crawl', 'register', 'media-store', ...(fields.wp ? ['wp-backup'] : []), ...(fields.exported ? ['django-export'] : [])],
  priority: 'Medium',
  owner: action === 'asset' ? ENG : action === 'hold' ? 'owner' : ENG,
  ...(action === 'hold' ? { decision: 'H3' } : {}),
  asset: { sha256: fields.sha256, bytes: fields.bytes, type: fields.type },
  note: fields.note,
});
const LEGACY_MEDIA = [
  media('/media/tours/gallery/Cape_Town_City_Private_Tour0.webp', 'asset', { sha256: '94c0354c668150d0373d9f8cf5e1f422676a1bd24c07d242b9a46511c50c5f5c', bytes: 169632, type: 'image/webp', wp: true, exported: true, note: 'Bo-Kaap and Devil’s Peak; people far. The same photograph is on the site already (bokaap-street, U, the owner’s enlargement): served unaltered.' }),
  media('/media/tours/gallery/Gardern_Route_3_1.webp', 'asset', { sha256: '55da00ddf963a7ea6b17bd11d6a4c5f4aa25e76ef356866c24e8317725b03419', bytes: 117634, type: 'image/webp', wp: true, exported: true, note: 'Hermanus whale sculpture, two guests. On the site already (hermanus-whale-sculpture, W, consent P1): served unaltered.' }),
  media('/media/tours/gallery/Gardern_Route_4_1.webp', 'asset', { sha256: 'db25be6fa4e96815b127b4fcfdbb5ba83e67938ab3507628f345a9ca04f12cc6', bytes: 148944, type: 'image/webp', wp: true, exported: true, note: 'Rooiberg’s red chair; one person, far. On the site already (rooiberg-red-chair, U): served unaltered.' }),
  media('/media/tours/gallery/Gardern_Route_5_1.webp', 'asset', { sha256: '38755ffc9da2f48057231ee943681efe22161e8a02287a8d583abba522465538', bytes: 110812, type: 'image/webp', wp: true, exported: true, note: 'The Map of Africa viewpoint, two guests. On the site already (map-of-africa-viewpoint, W, consent P1): served unaltered.' }),
  media('/media/tours/gallery/38.webp', 'hold', { sha256: '4820bce49d2cbead09425041a1f108294a68f316100f76ea7665fd6952b0d72b', bytes: 236484, type: 'image/webp', note: 'Airport arrivals: a guest and a driver from behind, a bystander’s face in view. Not yet approved for this site.' }),
  media('/media/tours/gallery/Gardern_Route_1_2.webp', 'hold', { sha256: '9f10419506f261162dabe0ccbae1778cbb2f76fe57f916c722605f0b4facf6ae', bytes: 38216, type: 'image/webp', wp: true, exported: true, note: 'Cango Caves sign, an identifiable guest (the same guest is in the approved cango-caves, P2). Not yet approved for this site.' }),
  media('/media/tours/gallery/wine_tasting.webp', 'hold', { sha256: '260fac95ae3f4356be5a5f08f2a9f83590a5f66832030092a17557b6f46b8dfb', bytes: 237634, type: 'image/webp', wp: true, exported: true, note: 'A guest at a wine estate’s fireside, identifiable. Not yet approved for this site.' }),
  media('/media/tours/citytour_L6J9iiN.png', 'hold', { sha256: 'aaa8df18cefaed058240206d15111308e964cf01087de05d8362f80db00dc3bc', bytes: 1069547, type: 'image/png', wp: true, note: 'The old site’s “Cape Town City Tour” card: lettering over a photograph of two identifiable guests.' }),
  media('/media/tours/shark-cage-diving.png', 'hold', { sha256: 'ea3f3f127e9edc7bee660b7b54518476b4197dd6ce7c1261a942f95883ded4fe', bytes: 728708, type: 'image/png', wp: true, exported: true, note: 'The old site’s “Shark Cage Diving” card: no people; who took the underwater photograph in it is not recorded (D3).' }),
  media('/media/gallery/19.png', 'hold', { sha256: 'c74a03adc8e7099f6a4d7f8b8983e2db580d92c9df749e7efc292cbc51faf0bf', bytes: 1197893, type: 'image/png', note: 'The old gallery’s framed photograph of two identifiable guests at Groot Constantia.' }),
  media('/media/tours/gallery/Cape_Town_City_Private_Tour7_2.webp', 'retire', { sha256: '1e3b1f451826e3ad07e2fbf2fcd532f916d31424d23094a934d15ab1410a37c3', bytes: 212180, type: 'image/webp', wp: true, exported: true, note: 'Two children with their family: byte for byte the photograph the rights register withdrew (company-garden-guide, P4). Never served.' }),
  media('/media/gallery/33.png', 'retire', { sha256: '4fda87b0e0c3f94a7a48bdae5d9146d9ed2defc961b92f936612781f37c02ea2', bytes: 1168148, type: 'image/png', note: 'Children in the frame (P4). Never served.' }),
  media('/media/tours/peninsula_WsHDY45.png', 'retire', { sha256: '1da60c7f9d09d0737616be66c12e4f14f12a9e557d1ae9edb89d14cf9e8d5f6a', bytes: 1032208, type: 'image/png', wp: true, note: 'The old “Cape Peninsula Adventure” card: two young people who may be under 18 (the rule that withdrew peninsula-granite-bay, P4). Never served.' }),
  media('/media/tours/gallery/36.webp', 'retire', { sha256: '6d8d4fd883d69708492c79612e3cc85394db84d73f1bc3ccf30c82654f8e2fe6', bytes: 76366, type: 'image/webp', note: 'An arrivals welcome sign with a guest’s full name handwritten on it: personal information. The site’s own copy is blurred; the original cannot be altered at this address. Never served.' }),
];

/** Retired on purpose: system files and theme assets with nothing to pass on. */
const RETIRED = [
  {
    path: '/wp-content/uploads/*',
    action: 'retire',
    era: ['wordpress'],
    sources: ['gsc-crawl', 'register', 'audit', 'wp-backup'],
    priority: 'Low',
    owner: ENG,
    samples: WP_UPLOADS.map((f) => `/wp-content/uploads/${f}`),
    note: 'WordPress’s two-day-old copies of the booking site’s photographs. An image redirected to a page passes nothing to image search (the audit); the originals that may be kept are at their /media/ addresses.',
  },
  {
    path: '/static/*',
    action: 'retire',
    era: ['django'],
    sources: ['gsc-crawl', 'register'],
    priority: 'Low',
    owner: ENG,
    samples: DJANGO_STATIC,
    note: 'The booking site’s theme files: slides, logos, favicons, the accreditation badge, styles and scripts.',
  },
  {
    path: '/image/*',
    action: 'retire',
    era: ['static-2022'],
    sources: ['wayback'],
    priority: 'Low',
    owner: ENG,
    samples: ARCHIVED_2022_IMAGES,
    note: 'The 2021–2022 static site’s images; none has answered since 2022.',
  },
  {
    path: '/wp-*',
    action: 'retire',
    era: ['wordpress'],
    sources: ['gsc-crawl', 'register', 'audit'],
    priority: 'Low',
    owner: ENG,
    samples: ['/wp-login.php', '/wp-admin/', '/wp-json/', '/wp-json/wp/v2/tour', '/wp-includes/js/dist/hooks.min.js', '/wp-content/themes/gtict/style.css', '/wp-content/plugins/contact-form-7/includes/js/index.js', '/wp-cron.php'],
    note: 'WordPress system files (the sitemaps excepted, above).',
  },
  {
    path: '/xmlrpc.php',
    action: 'retire',
    era: ['wordpress'],
    sources: ['audit', 'wp-backup'],
    priority: 'Low',
    owner: ENG,
  },
  {
    path: '/hello-world/',
    action: 'retire',
    era: ['wordpress'],
    sources: ['audit', 'wp-backup'],
    priority: 'Low',
    owner: ENG,
    samples: ['/hello-world/', '/hello-world/feed/'],
    note: 'WordPress’s sample post.',
  },
  {
    path: 'WordPress archives and feeds',
    action: 'retire',
    era: ['wordpress'],
    sources: ['audit', 'wp-backup'],
    priority: 'Low',
    owner: ENG,
    samples: ['/feed/', '/comments/feed/', '/category/uncategorized/', '/2026/11/', '/2026/', '/author/admin/', '/tours/feed/', '/search/tour/'],
    note: 'Feeds, the category, date, author and search archives (the author archive’s real name is not recorded here).',
  },
  {
    path: 'Apple app-site association',
    action: 'retire',
    era: ['django'],
    sources: ['gsc-crawl', 'register'],
    priority: 'Low',
    owner: ENG,
    samples: ['/apple-app-site-association', '/.well-known/apple-app-site-association'],
  },
  {
    path: '/images/*',
    action: 'retire',
    era: ['static-2025'],
    sources: ['static-2025'],
    priority: 'Low',
    owner: ENG,
    samples: ['/images/logo.png', '/images/banner.png', '/images/social/penguin.jpg'],
    note: 'The May 2025 static pages’ images.',
  },
  {
    path: '/cdn-cgi/*',
    action: 'retire',
    era: ['django'],
    sources: ['gsc-crawl', 'register'],
    priority: 'Low',
    owner: 'platform',
    samples: ['/cdn-cgi/l/email-protection', '/cdn-cgi/scripts/5c5dd728/cloudflare-static/email-decode.min.js'],
    untestable: 'Cloudflare reserves /cdn-cgi/ on every zone; neither _redirects nor a local server answers it.',
    note: 'Cloudflare’s email obfuscation on the booking site (the page and its script). Email Obfuscation stays off on the new zone (setup.mjs domain): its rewriting is blocked by the site’s security policy.',
  },
];

/** WordPress's ID links (?p= for posts and tours, ?page_id= for pages), a search and the AMP flag: the 22 of the map. */
const QUERIES = [
  ...WP_IDS.p.map((id) => `/?p=${id}`),
  ...WP_IDS.page_id.map((id) => `/?page_id=${id}`),
  '/?s=tour',
  '/?amp=1',
].map((path) => ({
  path,
  action: 'query',
  era: ['wordpress'],
  sources: ['audit', 'wp-backup'],
  priority: 'Low',
  owner: ENG,
  topic: 'since 2014',
  note: '_redirects cannot match a query string (Pages drops it from a rule’s source, so such a rule would redirect the home page itself): the home page answers, canonical /. Never publicly linked (the audit).',
}));

/** Host-level redirects at the cutover. */
const HOSTS = [
  {
    path: 'www.goodtimesincapetown.co.za/*',
    action: 'host',
    to: 'https://goodtimesincapetown.co.za/:path',
    era: ['django', 'wordpress'],
    sources: ['gsc', 'gsc-links', 'gsc-crawl', 'register'],
    priority: 'Critical',
    owner: 'cutover',
    decision: 'A2',
    note: 'www holds much of the home page’s search traffic and most of its external links. A zone redirect rule, path and query kept (setup.mjs domain). Which host is canonical is A2: whichever it is, the other answers 301 to it.',
  },
  {
    path: 'http://goodtimesincapetown.co.za/*',
    action: 'host',
    to: 'https://goodtimesincapetown.co.za/:path',
    era: ['django', 'wordpress', 'static-2022'],
    sources: ['audit', 'wayback'],
    priority: 'High',
    owner: 'cutover',
    note: 'Always Use HTTPS on the zone (Pages also forces HTTPS on its custom domains). The WordPress site served inner pages over http without a redirect (the audit).',
  },
];

/** The registry, in groups (the order _redirects and the docs follow). */
const group = (name, entries) => entries.map((e) => ({ group: name, ...e }));
export const legacyUrls = [
  ...group('Tour pages, booking site and WordPress slugs', TOUR_PAGES),
  ...group('Booking pages → the booking form, the tour chosen', BOOKING_PAGES),
  ...group('The booking site’s account pages (reviewed)', APP_PAGES),
  ...group('Pages kept, restored or redirected', [...SITE_PAGES, ...RESTORED]),
  ...group('WordPress tour categories', CATEGORIES),
  ...group('The older static sites’ pages', STATIC_PAGES),
  ...group('Images at the booking site’s /media/ addresses', LEGACY_MEDIA),
  ...group('Everything under each tour’s old address', TOUR_PREFIXES),
  ...group('Everything under a category whose page is not /tours/', CATEGORY_PREFIXES),
  ...group('Catch-alls', CATCH_ALLS),
  ...group('Retired on purpose', RETIRED),
  ...group('WordPress query links', QUERIES),
  ...group('Host redirects at the cutover', HOSTS),
];

/** The entries _redirects is generated from: static rules first (redirect), then the dynamic ones (prefix). */
export const staticRedirects = () => legacyUrls.filter((e) => e.action === 'redirect');
export const dynamicRedirects = () => legacyUrls.filter((e) => e.action === 'prefix');

/** Original files served at their old addresses: src/legacy-media/<path under /media/>. */
export const preservedMedia = () => legacyUrls.filter((e) => e.action === 'asset');

/** Every concrete address the registry covers (patterns expanded through their samples). */
export function concreteUrls(entry) {
  if (entry.action === 'host') return [];
  const own = entry.path.startsWith('/') && !entry.path.includes('*') ? [entry.path] : [];
  return [...new Set([...own, ...(entry.samples || [])])];
}
