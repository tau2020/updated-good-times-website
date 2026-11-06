import { esc, icon, button, picture, preloadFor, coverSizes, breadcrumb, sectionHead, imageWidth, imageSize, showRating, ratingRow, stars, sfield, travellersField, moneyTag, currencyPicker, priceBasis, artPanel } from '../partials/ui.mjs';
import { tourCard, reviewCard, enquireTourHref, packageCard } from '../partials/cards.mjs';
import { photoExhibition, mediaLightbox, galleryItems, gallerySizes, GALLERY_ASSETS, focusOf } from '../partials/media.mjs';
import { diningDiptych } from '../partials/culinary.mjs';
import { tours, categories, themes } from '../data/tours.mjs';
import { packages } from '../data/packages.mjs';
import { reviews } from '../data/reviews.mjs';
import { imageByName, creditFor } from '../data/images.mjs';

/** The photo band's height (styles.css .photo-band), for the width its photograph is drawn at: a phone's band crops a
    landscape photograph wider than the screen (coverSizes). The banner and the hero are the pages' LCP and keep 100vw:
    the larger file cost up to 0.8 s of LCP on a throttled phone (the media audit, Gate E). */
const BAND_H = 'clamp(16rem, 12rem + 18vw, 30rem)';

const ITINERARY_NOTE = {
  listed: 'The stops as we list them. Every tour is private, so the route can be shaped around you; we confirm it with your quote.',
  'unconfirmed-order': 'The stops as we list them. The order is planned with you and confirmed with your quote.',
  'names-only': 'Places on this tour. Timings depend on the day and are confirmed with your quote.',
};

/** Heroes narrower than this get the framed variant: the photo is never stretched. */
const FULL_BLEED_MIN = 1600;

const crumbsList = [{ label: 'Home', href: './' }, { label: 'Tours', href: 'tours/' }];

/**
 * The custom-day card's collage: three parts of the Cape its words offer to mix, as three Good Times
 * photographs pinned like prints in a travel journal, a dashed route running between them. Decorative
 * (the card's words say the same), so hidden from assistive technology. The prints fan out from a stack as the
 * card is revealed and spread a little on hover (styles.css, .route-collage); without motion they are simply in place.
 */
const COLLAGE = [
  { name: 'boulders-two-penguins', label: 'Peninsula' },
  { name: 'bokaap-pink-wall', label: 'City' },
  { name: 'winelands-glasses-up', label: 'Winelands' },
];
const routeCollage = () => `<div class="route-collage" aria-hidden="true">
          <div class="route-collage__stage">
            <svg class="route-collage__route" viewBox="0 0 400 300" preserveAspectRatio="none" focusable="false"><path d="M58,44 C120,8 196,6 262,30 S338,70 330,128 S238,214 186,170 S96,150 70,222 S150,300 236,276" /></svg>
            ${COLLAGE.map((c, i) => `<figure class="route-collage__print route-collage__print--${i + 1}">${picture({ name: c.name, sizes: '240px', alt: '' })}<figcaption>${esc(c.label)}</figcaption></figure>`).join('\n            ')}
          </div>
        </div>`;

/** Editorial first lines for the overview: scene-setting, no facts beyond the official tour page. */
const OVERVIEW_HEADING = {
  // The four flagship days take the "Good Times, Naturally" headlines (content/copy-audit.md); the lead under each is
  // OVERVIEW_LEAD below, and the facts stay in the tour's own intro (src/data/tours.mjs)
  'cape-peninsula-private-tour': 'Follow the coast. Forget the clock.',
  'cape-town-city-private-tour': 'Meet the city, not just its landmarks.',
  'cape-winelands-private-tour': 'Good views. Better pours.',
  'township-private-tour': 'Real places. Real people. Real stories.',
  'private-cape-town-experience': 'Your day, your way',
  'whale-watching-private-tour': 'Whales off the Cape coast, in season',
  'cape-agulhas-private-tour': 'To the very tip of Africa',
  'shark-cage-diving': 'Face to face with great white sharks',
  'quad-biking': 'Dunes, trails and a little adrenaline',
  'sky-diving': 'The Cape from above',
};

/**
 * One line under the overview heading, in the site's voice, before the tour's own facts. Nothing here adds a stop, an
 * inclusion or a promise the tour's page does not already make: tastings and lunch stay optional and paid on the day,
 * and Langa is a neighbourhood people live in, visited with a guide who knows it, never a show.
 */
const OVERVIEW_LEAD = {
  'cape-peninsula-private-tour': 'Ocean roads, dramatic cliffs and plenty of reasons to stop for a photo. Discover the Cape Peninsula with a guide who knows the route, and the stories behind it.',
  'cape-town-city-private-tour': 'From familiar landmarks to the neighbourhoods that give Cape Town its character, get to know the stories behind the sights.',
  'cape-winelands-private-tour': 'Take the scenic route through the Cape Winelands, where mountain views, beautiful estates and long lunches are all part of the appeal. Tastings and lunch are optional and paid on the day.',
  'township-private-tour': 'Langa is a living neighbourhood, and you visit it as a guest: its history, its art and its everyday life, with a guide who knows it well.',
};

/**
 * The Dining Diptych: the Winelands day's table and a lunch, between the details and the photo band.
 * The words keep to the official page: tasting fees and lunch are not included.
 */
const CULINARY = {
  'cape-winelands-private-tour': {
    id: 'pleasures-title',
    eyebrow: 'A taste of the Cape',
    title: 'The pleasures along the way',
    text: 'Wine and cheese at Fairview, then the tasting rooms of La Motte and Lanzerac. Tasting fees and lunch aren’t included, so what you taste and where you stop to eat are entirely up to you.',
    left: { name: 'winelands-pergola-lunch', caption: 'Lunch under the vines on a Winelands estate' },
    // The garden lunch is the home page's (one photograph, one place): here, another real Winelands table, captioned
    // for what it shows (wine served at the table; no food is in the frame)
    right: { name: 'winelands-estate-terrace', caption: 'Wine served at the table on an estate terrace, on a Winelands day' },
  },
};

function listPage() {
  return {
    path: 'tours/index.html',
    nav: 'tours/',
    title: 'Tours & Experiences: private tours in Cape Town',
    description: `${tours.length} private tours and activities from Cape Town: the Cape Peninsula, the city and Langa, the Winelands, whale watching, Cape Agulhas, shark cage diving, quad biking and skydiving.`,
    priority: 0.9,
    breadcrumbs: crumbsList,
    preload: [preloadFor('cape-point-headland')],
    body: ({ site }) => `
<section class="banner" style="--focus: 58% 44%; --banner-h: clamp(24rem, 18rem + 18vw, 36rem)">
  <div class="banner__media">${picture({ name: 'cape-point-headland', eager: true, fetchpriority: 'high', alt: '' })}</div>
  <div class="container">
    <div class="banner__content">
      ${breadcrumb(crumbsList)}
      <h1>Tours &amp; Experiences</h1>
      <p class="banner__sub">Same Cape. Your own kind of day.</p>
      <p class="banner__text">Big views, good stories, unexpected stops. Explore Cape Town at your own pace, with a local guide and a day planned around your people. Every tour is private, and most start with pickup from your accommodation.</p>
    </div>
  </div>
</section>

<section class="section section--paper" aria-labelledby="catalogue-title">
  <div class="container">
    <h2 class="visually-hidden" id="catalogue-title">All tours</h2>
    <p class="plan-bar" data-plan-bar hidden>${icon('calendar')}<span data-plan-text></span><a href="./#search">Change</a></p>
    <div class="priced-head">
      <div class="chips" role="group" aria-label="Filter tours by theme" data-filter hidden>
        <button class="chip" type="button" data-filter-value="all" aria-pressed="true">All tours</button>
        ${themes.map((c) => `<button class="chip" type="button" data-filter-value="${c.id}" aria-pressed="false">${esc(c.label)}</button>`).join('\n        ')}
      </div>
      ${site.prices.show ? currencyPicker({ id: 'currency-tours' }) : ''}
    </div>
    <p class="filter-status" role="status" data-filter-status></p>
    <div class="grid grid--3">
      ${tours.map((t, i) => tourCard(t, site, { i, headingLevel: 3 })).join('\n      ')}
      <article class="card card--custom card--collage" data-reveal style="--reveal-i:3" data-categories="${[...categories.map((c) => c.id), ...themes.map((c) => c.id)].join(' ')}">
        ${routeCollage()}
        <p class="eyebrow mt-0">Your own route</p>
        <h3 class="card__title"><a href="enquire/?type=tour&amp;tour=custom" data-carry-plan>Plan a custom private day</a></h3>
        <p class="card__text">Mix the Peninsula, the city and the Winelands, or ask for somewhere else entirely. Tell us what you’d like to see and we’ll come back with a plan and a quote.</p>
      </article>
    </div>
    ${site.prices.show ? `<p class="source-note mt-6">${esc(site.prices.disclaimer)}</p>` : ''}
  </div>
</section>

<section class="section" aria-labelledby="packages-title">
  <div class="container">
    ${sectionHead({ eyebrow: 'More than a day', title: 'Multi-day tours', id: 'packages-title', lead: 'One day not enough? Take a few, with your own guide. We plan the route with you and confirm what’s included and the price with your quote.', aside: `<a class="gt-button gt-button--tertiary link-arrow" href="packages/">Explore Multi-day Tours</a>` })}
    <div class="grid grid--3">
      ${packages.map((p, i) => packageCard(p, site, { i })).join('\n      ')}
    </div>
  </div>
</section>`,
  };
}

/** "Cape Peninsula Private Tour: Chapman’s Peak, …" → h1 "Cape Peninsula Private Tour" and a subtitle; otherwise the title and the card line. */
function splitTitle(t) {
  const i = t.title.indexOf(':');
  return i > -1 ? { h1: t.title.slice(0, i).trim(), sub: t.title.slice(i + 1).trim() } : { h1: t.title, sub: t.card };
}

const FEATURE_ICON = [
  [/guide|instructor/i, 'user'],
  [/water/i, 'drop'],
  [/pickup|drop-off/i, 'pin'],
  [/vehicle|transport|fuel|toll|boat/i, 'car'],
  [/gear|safety/i, 'shield'],
];

/** Verified facts as a feature list: duration, the usual times, private, the official inclusions, listed stops. */
function features(t) {
  const items = [
    { icon: 'clock', text: t.duration },
    t.times ? { icon: 'calendar', text: `Usually departs ${t.times.departure} and returns about ${t.times.return}` } : null,
    { icon: 'users', text: 'Private: only your group' },
    ...t.included.map((inc) => ({ icon: FEATURE_ICON.find(([re]) => re.test(inc))?.[1] || 'check', text: inc })),
  ].filter(Boolean);
  if (t.itinerary.length) items.push({ icon: 'route', text: `${t.itinerary.length} listed ${t.itinerary.length === 1 ? 'stop' : 'stops'}` });
  return items;
}

/**
 * This tour's gallery: its own photographs, never its hero (the top of the same page) or its card (the tour's photograph
 * in the tour list and similar days): one photograph, one place (audit/image-change-register.md). The photo band shows
 * one of them as the gallery's cover and opens the lightbox on it.
 */
const photosOf = (t) => [...new Set(t.images.gallery)].filter((n) => n && n !== t.images.hero && n !== t.images.card);
const landscape = (name) => {
  const { width, height } = imageSize(name);
  return width > height;
};
/** Wide-band photo: a landscape image with a ≥1600 px rendition, so the band never upscales at 1440. */
const bandPhoto = (t, exclude) => photosOf(t).find((n) => n !== exclude && imageWidth(n) >= FULL_BLEED_MIN && landscape(n)) || null;

/** The booking card's price: Good Times' published rate and its group tiers, or "Price on enquiry" with the official note. */
function priceBlock(t, site) {
  const p = t.price;
  if (!site.prices.show || !p) {
    return `<div>
        <p class="enquiry-card__from">Price</p>
        <p class="enquiry-card__amount">${site.prices.show && t.priceNote ? 'Price on enquiry' : 'Request a quote'}</p>
        <p class="price__note">${esc(site.prices.show && t.priceNote ? `${t.priceNote} We confirm your price with your quote.` : 'We confirm your price with your quote; it depends on date, group size and options.')}</p>
      </div>`;
  }
  const tiers = p.tiers.length > 1 ? `<ul class="price-tiers" role="list">${p.tiers.map((x) => `<li><span>${esc(x.label)}</span> ${moneyTag(x.amount, p.currency)}</li>`).join('')}</ul>` : '';
  return `<div>
        <p class="enquiry-card__amount">From ${moneyTag(p.from, p.currency)}</p>
        <p class="price__note">${esc(priceBasis(p))}${p.note ? `. ${esc(p.note)}` : ''}</p>
        ${tiers}
        <div class="currency-area currency-area--card">${currencyPicker({ id: 'currency-tour' })}</div>
      </div>`;
}

function metaRow(t) {
  const ta = t.tripadvisor;
  return `<div class="tour-title__meta">
      ${showRating(ta) ? ratingRow({ rating: ta.rating, reviews: ta.reviews, url: ta.url, large: true }) : ''}
      <span>${icon('clock')} ${esc(t.duration)}</span>
      <span>${icon('users')} Private: only your group</span>
      <span>${icon('pin')} ${esc(t.where)}</span>
    </div>`;
}

function detailPage(t) {
  const tourReviews = reviews.filter((r) => r.tour === t.slug);
  // Similar days share a region; where fewer than three do, other featured tours fill the row, so the section is always offered
  const related = tours.filter((x) => x.slug !== t.slug && x.categories.some((c) => t.categories.includes(c)));
  const similar = [...related, ...tours.filter((x) => x.slug !== t.slug && x.featured && !related.includes(x))].slice(0, 3);
  const photos = photosOf(t);
  const hasGallery = photos.length > 1;
  const gallery = hasGallery ? galleryItems(photos) : [];
  const framed = !t.images.hero || imageWidth(t.images.hero) < FULL_BLEED_MIN;
  const band = hasGallery ? bandPhoto(t, t.images.hero) : null;
  const ta = t.tripadvisor;
  const href = enquireTourHref(t);
  const { h1, sub } = splitTitle(t);
  const crumbs = [...crumbsList, { label: t.shortTitle, href: `tours/${t.slug}/` }];
  const catLine = `${categories.filter((c) => t.categories.includes(c.id)).map((c) => c.label).join(' · ')} · Private ${t.categories.includes('adventure') ? 'activity' : 'tour'}`;
  const panels = [
    { id: 'overview', label: 'Overview' },
    t.itinerary.length ? { id: 'itinerary', label: 'Itinerary' } : null,
    { id: 'included', label: 'What’s Included' },
    hasGallery ? { id: 'gallery', label: 'Gallery' } : null,
    tourReviews.length ? { id: 'reviews', label: 'Reviews' } : null,
    { id: 'faqs', label: 'FAQs' },
  ].filter(Boolean);
  const heroSize = t.images.hero ? imageSize(t.images.hero) : { width: 2121, height: 456 };
  // A licensed photograph (origin L: not Good Times') carries its credit on itself, as its licence asks
  const heroCredit = t.images.hero && imageByName(t.images.hero)?.origin === 'L' ? `<p class="tour-hero__credit">${esc(creditFor(t.images.hero))}</p>` : '';

  const hero = framed
    ? `<section class="tour-hero tour-hero--framed on-dark" data-mobile-cta-after>
  <div class="container tour-hero__grid">
    <div data-reveal>
      <a class="back-link" href="tours/">Back to all tours</a>
      <p class="eyebrow mt-5">${esc(catLine)}</p>
      <h1>${esc(h1)}</h1>
      <p class="lead">${esc(sub)}</p>
      ${metaRow(t)}
    </div>
    ${
      t.images.hero
        ? `<div class="tour-hero__frame" data-reveal style="--reveal-i:1; --frame-max: ${heroSize.width}px; --ratio: ${heroSize.width} / ${heroSize.height}">
      ${picture({ name: t.images.hero, sizes: `(min-width: 56em) min(50vw, ${heroSize.width}px), 100vw`, eager: true, fetchpriority: 'high' })}
      ${heroCredit}
    </div>`
        : `<figure class="tour-hero__figure" data-reveal style="--reveal-i:1">
      <div class="tour-hero__frame tour-hero__frame--art">${artPanel({ cls: 'art-panel--hero' })}</div>
    </figure>`
    }
  </div>
</section>`
    : `<section class="tour-hero" data-mobile-cta-after style="--focus: ${esc(t.heroFocus || '50% 50%')}">
  <div class="tour-hero__media">${picture({ name: t.images.hero, eager: true, fetchpriority: 'high', alt: '' })}</div>
  <div class="container banner__back"><a class="back-link" href="tours/">Back to all tours</a></div>
  ${heroCredit}
</section>

<section class="tour-title">
  <div class="container">
    <p class="eyebrow">${esc(catLine)}</p>
    <h1>${esc(h1)}</h1>
    <p class="tour-title__sub">${esc(sub)}</p>
    ${metaRow(t)}
  </div>
</section>`;

  return {
    path: `tours/${t.slug}/index.html`,
    nav: 'tours/',
    title: t.seo.title,
    description: t.seo.description,
    priority: 0.8,
    breadcrumbs: crumbs,
    preload: t.images.hero ? [preloadFor(t.images.hero, { sizes: framed ? '(min-width: 56em) 50vw, 100vw' : '100vw' })] : [],
    enquireHref: href,
    // The gallery's exhibition and lightbox (media.css, media.js) and, on the Winelands day, the dining diptych (culinary)
    styles: [...(hasGallery ? GALLERY_ASSETS.styles : []), ...(CULINARY[t.slug] ? ['assets/css/culinary.css'] : [])],
    scripts: [...new Set([...(hasGallery ? GALLERY_ASSETS.scripts : []), ...(CULINARY[t.slug] ? ['assets/js/vendor/ScrollTrigger.min.js', 'assets/js/culinary.js'] : [])])],
    schema: [
      {
        '@type': 'TouristTrip',
        name: t.title,
        description: t.intro.join(' '),
        touristType: t.categories.includes('adventure') ? 'Adventure activity' : 'Private tour',
        provider: { '@id': `__SITE__/#organization` },
        ...(t.itinerary.length
          ? { itinerary: { '@type': 'ItemList', itemListElement: t.itinerary.map((s, i) => ({ '@type': 'ListItem', position: i + 1, item: { '@type': 'TouristAttraction', name: s.stop } })) } }
          : {}),
        ...(t.price ? { offers: { '@type': 'Offer', price: String(t.price.from), priceCurrency: t.price.currency, description: priceBasis(t.price), url: `__SITE__/tours/${t.slug}/` } } : {}),
      },
    ],
    mobileCta: ({ site }) => `<div class="mobile-cta" data-mobile-cta>
  <div class="mobile-cta__price">${t.price && site.prices.show ? `<strong>From ${moneyTag(t.price.from, t.price.currency)}</strong>${esc(priceBasis(t.price, { compact: true }))}` : `<strong>${esc(t.duration)}</strong>${t.categories.includes('adventure') ? 'Private activity' : 'Private tour'}`}</div>
  ${button({ href, label: 'Request a Quote', variant: 'gold', attrs: 'data-carry-plan' })}
</div>`,
    body: ({ site }) => `
${hero}

<div class="tabs" data-tabs>
  <div class="container">
    <div class="tabbar" role="tablist" aria-label="Tour information" hidden>
      ${panels.map((p, i) => `<button class="tabbar__tab" type="button" role="tab" id="tab-${p.id}" aria-controls="panel-${p.id}" aria-selected="${i === 0}"${i ? ' tabindex="-1"' : ''}>${esc(p.label)}</button>`).join('\n      ')}
    </div>
  </div>
  <div class="container detail">
    <div class="detail__main">
      <section class="tab-panel" id="panel-overview" role="tabpanel" aria-labelledby="tab-overview" tabindex="0">
        <div class="detail__intro">
          <h2>${esc(OVERVIEW_HEADING[t.slug] || t.shortTitle)}</h2>
          ${OVERVIEW_LEAD[t.slug] ? `<p class="lead detail__lead">${esc(OVERVIEW_LEAD[t.slug])}</p>` : ''}
          <div class="prose">
            ${t.intro.map((p) => `<p>${esc(p)}</p>`).join('\n            ')}
          </div>
        </div>
        ${t.seasonal ? `<p class="callout">${icon('calendar')}<span>${esc(t.seasonal)}</span></p>` : ''}
        <ul class="feature-list" role="list">
          ${features(t).map((f) => `<li>${icon(f.icon)}<span>${esc(f.text)}</span></li>`).join('\n          ')}
        </ul>
        <h3 class="mt-6">Highlights</h3>
        <ul class="ticks mt-3" role="list">
          ${t.highlights.map((h) => `<li>${icon('check')} ${esc(h)}</li>`).join('\n          ')}
        </ul>
      </section>

      ${
        t.itinerary.length
          ? `<section class="tab-panel" id="panel-itinerary" role="tabpanel" aria-labelledby="tab-itinerary" tabindex="0">
        <h2 class="tab-panel__title">Itinerary</h2>
        <ol class="itinerary" role="list">
          ${t.itinerary.map((s) => `<li><span class="itinerary__stop">${esc(s.stop)}</span>${s.time ? `<span class="itinerary__time">${esc(s.time)}</span>` : ''}</li>`).join('\n          ')}
        </ol>
        ${t.drivePast.length ? `<p class="muted mt-4">Driving past: ${esc(t.drivePast.join(', '))}.</p>` : ''}
        <p class="source-note mt-4">${esc(ITINERARY_NOTE[t.itineraryStatus] || '')}</p>
      </section>`
          : ''
      }

      <section class="tab-panel" id="panel-included" role="tabpanel" aria-labelledby="tab-included" tabindex="0">
        <h2 class="tab-panel__title">What’s included</h2>
        <div class="cols-2">
          <div>
            <h3>Included</h3>
            ${t.included.length ? `<ul class="ticks" role="list">${t.included.map((x) => `<li>${icon('check')} ${esc(x)}</li>`).join('')}</ul>` : `<p class="muted">Ask us what is included for your date and group.</p>`}
          </div>
          <div>
            <h3>Not included</h3>
            ${t.notIncluded.length ? `<ul class="ticks ticks--cross" role="list">${t.notIncluded.map((x) => `<li>${icon('x')} ${esc(x)}</li>`).join('')}</ul>` : `<p class="muted">Ask us what is excluded for your date and group.</p>`}
          </div>
        </div>
        <p class="source-note mt-5">As listed on our tour page. Anything not shown here, ask in your booking request and we’ll confirm the details with you in your quote.</p>
      </section>

      ${
        hasGallery
          ? `<section class="tab-panel" id="panel-gallery" role="tabpanel" aria-labelledby="tab-gallery" tabindex="0">
        <h2 class="tab-panel__title">Gallery</h2>
        ${photoExhibition({ items: gallery, sizes: gallerySizes, cls: 'lc-scope lc-gallery__wall--panel' })}
        <p class="source-note mt-4">Photographs from our own days out with guests.</p>
      </section>`
          : ''
      }

      ${
        tourReviews.length
          ? `<section class="tab-panel" id="panel-reviews" role="tabpanel" aria-labelledby="tab-reviews" tabindex="0">
        <h2 class="tab-panel__title">Reviews</h2>
        <p class="lead">What guests said about this day on Tripadvisor, summed up by us in a line; each links to the full review.</p>
        <div class="review-grid mt-5">${tourReviews.map((r, i) => reviewCard(r, { i, showTour: false })).join('')}</div>
      </section>`
          : ''
      }

      <section class="tab-panel" id="panel-faqs" role="tabpanel" aria-labelledby="tab-faqs" tabindex="0">
        <h2 class="tab-panel__title">FAQs</h2>
        <div class="cols-2">
          <div><h3>Pickup</h3><p>${esc(t.pickup)}</p></div>
          <div><h3>Accessibility and health</h3><p>${esc(t.accessibility)}</p></div>
        </div>
        <div class="cols-2 mt-5">
          <div><h3>Booking</h3><p>Send a booking request and we’ll reply with availability and a quote. Every booking is confirmed by one of our team.</p></div>
          ${
            t.cancellation
              ? `<div><h3>Cancellation</h3><p>${esc(t.cancellation)} The terms for your booking are confirmed with you when you book.</p></div>`
              : `<div><h3>Cancellation</h3><p>The cancellation terms for your day are confirmed with you when you book.</p></div>`
          }
        </div>
        ${
          ta
            ? `<div class="cols-2 mt-5"><div><h3>Prefer to book on Tripadvisor?</h3><p>This tour is also listed on Tripadvisor, where that platform’s booking terms apply. <a class="external" href="${esc(ta.url)}" rel="noopener" target="_blank">View the listing<span class="visually-hidden"> (opens in a new tab)</span></a></p></div></div>`
            : ''
        }
        <p class="mt-5"><a class="gt-button gt-button--tertiary link-arrow" href="faq/">More questions answered in the FAQ</a></p>
      </section>
    </div>

    <aside class="detail__aside" aria-label="Book this tour">
      <form class="enquiry-card" action="enquire/" method="get" data-plan-form>
        <input type="hidden" name="type" value="tour">
        <input type="hidden" name="tour" value="${esc(t.slug)}">
        ${priceBlock(t, site)}
        ${showRating(ta) ? `<p class="enquiry-card__rating">${stars()}<strong>${ta.rating.toFixed(1)}</strong> from ${ta.reviews} reviews on Tripadvisor</p>` : ''}
        <div class="enquiry-card__fields">
          ${sfield({ label: 'Date', control: `<input class="sfield__control" type="date" name="date" id="book-date" aria-label="Date" data-date-limits data-plan-field>`, chevron: true })}
          ${travellersField({ id: 'book' })}
        </div>
        <button type="submit" class="btn gt-button gt-button--primary gt-button--block">Request a Quote</button>
        <ul class="enquiry-card__notes" role="list">
          <li>${icon('chat')}<span>We’ll confirm availability and your price by email, WhatsApp or phone, as you prefer.</span></li>
        </ul>
      </form>
    </aside>
  </div>
</div>

${CULINARY[t.slug] ? diningDiptych(CULINARY[t.slug]) : ''}

${
  band
    ? `<section class="photo-band" aria-label="Photos of this tour" style="--focus: ${focusOf(band)}">
  ${picture({ name: band, sizes: coverSizes(band, [['', '100vw', BAND_H]]), alt: '' })}
  <div class="photo-band__action">
    <button type="button" class="gt-button gt-button--secondary gt-button--on-dark photo-band__btn" data-lc-show="${gallery.findIndex((g) => g.name === band)}" aria-haspopup="dialog" hidden>View Gallery<span class="photo-band__count">${photos.length} photos</span></button>
  </div>
</section>`
    : ''
}

${
  similar.length
    ? `<section class="section section--paper" aria-labelledby="similar-title">
  <div class="container">
    ${sectionHead({ eyebrow: 'You might also like', title: 'Similar private days', id: 'similar-title', aside: `<a class="gt-button gt-button--tertiary link-arrow" href="tours/">Explore Tours</a>` })}
    <div class="grid grid--3 grid--rail" tabindex="0" role="region" aria-label="Similar tours (scroll sideways for more)">${similar.map((s, i) => tourCard(s, site, { i })).join('')}</div>
  </div>
</section>`
    : ''
}
${hasGallery ? mediaLightbox({ items: gallery }) : ''}`,
  };
}

export const pages = [listPage(), ...tours.map(detailPage)];
