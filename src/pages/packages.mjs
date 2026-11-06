/**
 * Multi-day tours: /packages/ and one page per multi-day tour.
 *
 * Built like the tour pages (hero, title, tabs, booking card) from
 * src/data/packages.mjs. The rate, inclusions and exclusions are the official
 * page's own; the outline is "suggested", because the days are set with each
 * group, and the booking card opens the booking request on the tour path with
 * the tour and the nights.
 */
import { esc, icon, button, picture, preloadFor, coverSizes, breadcrumb, sectionHead, sfield, travellersField, moneyTag, currencyPicker, priceBasis } from '../partials/ui.mjs';
import { packageCard, packageHref, enquirePackageHref, tourCard } from '../partials/cards.mjs';
import { photoExhibition, mediaLightbox, galleryItems, gallerySizes, GALLERY_ASSETS } from '../partials/media.mjs';
import { routeArt } from '../partials/route-art.mjs';
import { packages } from '../data/packages.mjs';
import { tourBySlug } from '../data/tours.mjs';
import { services } from '../data/transfers.mjs';

/** Heights of the full-bleed photographs on these pages (styles.css), for the width each photograph is drawn at: a
    phone's tall frame crops a landscape photograph wider than the screen (coverSizes) */
const BANNER_H = 'clamp(22rem, 16rem + 16vw, 32rem)';
const BANNER_SIZES = coverSizes('hout-bay-from-chapmans', [['', '100vw', BANNER_H]]);
const heroSizes = (name) => coverSizes(name, [['', '100vw', 'clamp(18rem, 14rem + 22vw, 34rem)']]); // .tour-hero

const crumbsList = [
  { label: 'Home', href: './' },
  { label: 'Multi-day tours', href: 'packages/' },
];

const INDICATIVE = 'A suggested plan: we confirm the route, the days and the price for your dates and group with your quote.';

/** The Good Times product a suggested day follows, as a link. */
function basedOn(day) {
  if (day.tour) {
    const t = tourBySlug(day.tour);
    return t ? `<p class="outline__based">${icon('route')}<span>Follows our private tour, <a href="tours/${t.slug}/">${esc(t.shortTitle)}</a></span></p>` : '';
  }
  if (day.transfer) {
    const s = services.find((x) => x.id === day.transfer);
    return s ? `<p class="outline__based">${icon('car')}<span>With our <a href="transfers/#${s.id}">${esc(s.shortTitle.toLowerCase())}</a></span></p>` : '';
  }
  return '';
}

function metaRow(p) {
  return `<div class="tour-title__meta">
      <span>${icon('calendar')} ${esc(p.duration)}</span>
      <span>${icon('users')} ${esc(p.group)}</span>
      ${p.season ? `<span>${icon('clock')} ${esc(p.season)}</span>` : ''}
      <span>${icon('pin')} ${esc(p.where)}</span>
    </div>`;
}

function features(p) {
  return [
    { icon: 'calendar', text: p.nights.min === p.nights.max ? `${p.duration}, suggested` : `${p.duration}, your choice` },
    { icon: 'users', text: 'Private: only your group and your guide' },
    p.season ? { icon: 'clock', text: `${p.season} (suggested)` } : null,
    ...(p.included || []).map((x) => ({ icon: /vehicle|fuel/i.test(x) ? 'car' : /guide/i.test(x) ? 'user' : /water/i.test(x) ? 'drop' : 'check', text: x })),
    { icon: 'chat', text: 'A plan and a quote from us' },
  ].filter(Boolean);
}

/** The booking card's price: the published rate, or "Request a quote" when prices are off. */
function priceBlock(p, site) {
  if (!site.prices.show || !p.price) {
    return `<div>
          <p class="enquiry-card__from">Price</p>
          <p class="enquiry-card__amount">Request a quote</p>
          <p class="price__note">We confirm the plan and your price; it depends on dates, group size and where you stay.</p>
        </div>`;
  }
  return `<div>
          <p class="enquiry-card__amount">From ${moneyTag(p.price.from, p.price.currency)}</p>
          <p class="price__note">${esc(p.price.note || priceBasis(p.price))}</p>
          <div class="currency-area currency-area--card">${currencyPicker({ id: 'currency-package' })}</div>
        </div>`;
}

function nightsControl(p) {
  if (p.nights.min === p.nights.max) return `<input type="hidden" name="nights" value="${p.nights.min}">`;
  const options = [];
  for (let n = p.nights.min; n <= p.nights.max; n++) options.push(`<option value="${n}">${n} nights</option>`);
  return sfield({
    label: 'Nights',
    control: `<select class="sfield__control" name="nights" id="book-nights" aria-label="Nights"><option value="">Not sure yet</option>${options.join('')}</select>`,
    chevron: true,
  });
}

function listPage() {
  return {
    path: 'packages/index.html',
    nav: 'tours/',
    title: 'Multi-day tours: private journeys from Cape Town',
    description: 'Private multi-day tours from Cape Town with Good Times: the Garden Route over three days or more, planned with you, with the route and price confirmed in your quote.',
    priority: 0.8,
    breadcrumbs: crumbsList,
    preload: [preloadFor('hout-bay-from-chapmans', { sizes: BANNER_SIZES })],
    body: ({ site }) => `
<section class="banner" style="--focus: 50% 45%; --banner-h: ${BANNER_H}">
  <div class="banner__media">${picture({ name: 'hout-bay-from-chapmans', sizes: BANNER_SIZES, eager: true, fetchpriority: 'high', alt: '' })}</div>
  <div class="container">
    <div class="banner__content">
      ${breadcrumb(crumbsList)}
      <h1>Multi-day tours</h1>
      <p class="banner__sub">Private journeys from Cape Town, planned with you.</p>
      <p class="banner__text">Several days with your own guide, east along the Garden Route. Tell us your dates and group, and you’ll receive a plan and a quote.</p>
    </div>
  </div>
</section>

<section class="section section--paper" aria-labelledby="packages-list-title">
  <div class="container">
    <h2 class="visually-hidden" id="packages-list-title">All multi-day tours</h2>
    <div class="grid grid--3">
      ${packages.map((p, i) => packageCard(p, site, { i })).join('\n      ')}
      <article class="card card--custom" data-reveal style="--reveal-i:2">
        <p class="eyebrow mt-0">Your own journey</p>
        <h3 class="card__title"><a href="enquire/?type=tour&amp;tour=custom">Plan a custom multi-day trip</a></h3>
        <p class="card__text">Mix the days you like, or ask for somewhere else. Tell us what you would like to see and how long you have, and you’ll receive a plan and a quote.</p>
      </article>
    </div>
    <p class="source-note mt-6">${esc(INDICATIVE)} Prefer a single day? <a href="tours/">See the private tours</a>.</p>
  </div>
</section>`,
  };
}

function detailPage(p) {
  const photos = p.images.gallery || [];
  const hasGallery = photos.length > 1;
  const gallery = hasGallery ? galleryItems(photos) : [];
  const href = enquirePackageHref(p);
  const crumbs = [...crumbsList, { label: p.shortTitle, href: packageHref(p) }];
  const others = packages.filter((x) => x.slug !== p.slug);
  const related = p.related ? tourBySlug(p.related) : null;
  const panels = [
    { id: 'overview', label: 'Overview' },
    { id: 'outline', label: 'Suggested Outline' },
    { id: 'quote', label: 'Your Quote' },
    hasGallery ? { id: 'gallery', label: 'Gallery' } : null,
    { id: 'faqs', label: 'FAQs' },
  ].filter(Boolean);

  const hero = p.images.hero
    ? `<section class="tour-hero" data-mobile-cta-after style="--focus: ${esc(p.heroFocus || '50% 45%')}">
  <div class="tour-hero__media">${picture({ name: p.images.hero, sizes: heroSizes(p.images.hero), eager: true, fetchpriority: 'high', alt: '' })}</div>
  <div class="container banner__back"><a class="back-link" href="packages/">Back to all multi-day tours</a></div>
</section>

<section class="tour-title">
  <div class="container">
    <p class="eyebrow">Multi-day tour · Private</p>
    <h1>${esc(p.title)}</h1>
    <p class="tour-title__sub">${esc(p.tagline)}</p>
    ${metaRow(p)}
  </div>
</section>`
    : `<section class="tour-hero tour-hero--framed on-dark" data-mobile-cta-after>
  <div class="container tour-hero__grid">
    <div data-reveal>
      <a class="back-link" href="packages/">Back to all multi-day tours</a>
      <p class="eyebrow mt-5">Multi-day tour · Private</p>
      <h1>${esc(p.title)}</h1>
      <p class="lead">${esc(p.tagline)}</p>
      ${metaRow(p)}
    </div>
    <figure class="tour-hero__figure" data-reveal style="--reveal-i:1">
      <div class="tour-hero__frame tour-hero__frame--art">${routeArt({ id: `route-${p.slug}` })}</div>
      <figcaption class="tour-hero__frame-note">Route sketch, not to scale.</figcaption>
    </figure>
  </div>
</section>`;

  return {
    path: `packages/${p.slug}/index.html`,
    nav: 'tours/',
    title: p.seo.title,
    description: p.seo.description,
    priority: 0.8,
    breadcrumbs: crumbs,
    preload: p.images.hero ? [preloadFor(p.images.hero, { sizes: heroSizes(p.images.hero) })] : [],
    enquireHref: href,
    ...(hasGallery ? GALLERY_ASSETS : {}),
    schema: [
      {
        '@type': 'TouristTrip',
        name: p.title,
        description: p.intro.join(' '),
        touristType: 'Private multi-day tour',
        provider: { '@id': `__SITE__/#organization` },
        ...(p.price ? { offers: { '@type': 'Offer', price: String(p.price.from), priceCurrency: p.price.currency, description: priceBasis(p.price), url: `__SITE__/packages/${p.slug}/` } } : {}),
      },
    ],
    mobileCta: ({ site }) => `<div class="mobile-cta" data-mobile-cta>
  <div class="mobile-cta__price">${p.price && site.prices.show ? `<strong>From ${moneyTag(p.price.from, p.price.currency)}</strong>${esc(priceBasis(p.price, { compact: true }))}` : `<strong>${esc(p.duration)}</strong>Multi-day tour`}</div>
  ${button({ href, label: 'Get a Quote', variant: 'gold' })}
</div>`,
    body: ({ site }) => `
${hero}

<div class="tabs" data-tabs>
  <div class="container">
    <div class="tabbar" role="tablist" aria-label="Multi-day tour information" hidden>
      ${panels.map((x, i) => `<button class="tabbar__tab" type="button" role="tab" id="tab-${x.id}" aria-controls="panel-${x.id}" aria-selected="${i === 0}"${i ? ' tabindex="-1"' : ''}>${esc(x.label)}</button>`).join('\n      ')}
    </div>
  </div>
  <div class="container detail">
    <div class="detail__main">
      <section class="tab-panel" id="panel-overview" role="tabpanel" aria-labelledby="tab-overview" tabindex="0">
        <div class="detail__intro">
          <h2>${esc(p.heading)}</h2>
          <div class="prose">
            ${p.intro.map((x) => `<p>${esc(x)}</p>`).join('\n            ')}
          </div>
        </div>
        <p class="callout">${icon('info')}<span>${esc(INDICATIVE)}</span></p>
        <ul class="feature-list" role="list">
          ${features(p).map((f) => `<li>${icon(f.icon)}<span>${esc(f.text)}</span></li>`).join('\n          ')}
        </ul>
        <h3 class="mt-6">Highlights</h3>
        <ul class="ticks mt-3" role="list">
          ${p.highlights.map((h) => `<li>${icon('check')} ${esc(h)}</li>`).join('\n          ')}
        </ul>
      </section>

      <section class="tab-panel" id="panel-outline" role="tabpanel" aria-labelledby="tab-outline" tabindex="0">
        <h2 class="tab-panel__title">Suggested outline</h2>
        <ol class="outline" role="list">
          ${p.outline
            .map(
              (d) => `<li class="outline__day">
            <p class="outline__label">${esc(d.day)}</p>
            <h3 class="outline__title">${esc(d.title)}</h3>
            <p class="outline__text">${esc(d.text)}</p>
            ${basedOn(d)}
          </li>`,
            )
            .join('\n          ')}
        </ol>
        ${p.places ? `<p class="muted mt-4">Places on the route: ${esc(p.places.join(' · '))}.</p>` : ''}
        <p class="source-note mt-4">A suggested outline. The order of the days, the stops and the timings are planned with you and confirmed with your quote.</p>
      </section>

      <section class="tab-panel" id="panel-quote" role="tabpanel" aria-labelledby="tab-quote" tabindex="0">
        <h2 class="tab-panel__title">Confirmed with your quote</h2>
        <p>Send a booking request with your dates and group, and we’ll reply with a plan and a quote that set out:</p>
        <ul class="ticks mt-4" role="list">
          <li>${icon('check')} The route and the number of days</li>
          <li>${icon('check')} Where you stay each night, and who arranges it</li>
          <li>${icon('check')} The price for your dates and your group</li>
        </ul>
        <div class="cols-2 mt-6">
          <div>
            <h3>Included</h3>
            <ul class="ticks" role="list">${(p.included || []).map((x) => `<li>${icon('check')} ${esc(x)}</li>`).join('')}</ul>
          </div>
          <div>
            <h3>Not included</h3>
            <ul class="ticks ticks--cross" role="list">${(p.notIncluded || []).map((x) => `<li>${icon('x')} ${esc(x)}</li>`).join('')}</ul>
          </div>
        </div>
        <p class="source-note mt-5">Nothing is booked or charged until we’ve agreed the details together.</p>
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

      <section class="tab-panel" id="panel-faqs" role="tabpanel" aria-labelledby="tab-faqs" tabindex="0">
        <h2 class="tab-panel__title">FAQs</h2>
        <div class="cols-2">
          <div><h3>Booking</h3><p>Send a booking request and we’ll reply with availability, a plan and a quote.</p></div>
          <div><h3>Changing the plan</h3><p>Every multi-day tour is private. Tell us in your booking request what you would like to add, skip or change, and the plan and the quote will follow it.</p></div>
        </div>
        <div class="cols-2 mt-5">
          <div><h3>Accessibility and health</h3><p>Tell us about any mobility or medical needs when you enquire, so we can plan the days around them.</p></div>
          <div><h3>Cancellation</h3><p>${esc(p.cancellation || 'The cancellation terms are confirmed with you when you book.')}</p></div>
        </div>
        <p class="mt-5"><a class="gt-button gt-button--tertiary link-arrow" href="faq/">More questions answered in the FAQ</a></p>
      </section>
    </div>

    <aside class="detail__aside" aria-label="Request this multi-day tour">
      <form class="enquiry-card" action="enquire/" method="get" data-plan-form>
        <input type="hidden" name="type" value="tour">
        <input type="hidden" name="tour" value="${esc(p.slug)}">
        ${priceBlock(p, site)}
        <div class="enquiry-card__fields">
          ${sfield({ label: 'Start date', control: `<input class="sfield__control" type="date" name="date" id="book-date" aria-label="Start date" data-date-limits data-plan-field>`, chevron: true })}
          ${nightsControl(p)}
          ${travellersField({ id: 'book' })}
        </div>
        <button type="submit" class="btn gt-button gt-button--primary gt-button--block">Get a Personalised Quote</button>
        <ul class="enquiry-card__notes" role="list">
          <li>${icon('chat')}<span>We’ll confirm availability, the plan and your price by email, WhatsApp or phone.</span></li>
        </ul>
      </form>
    </aside>
  </div>
</div>

<section class="section section--paper" aria-labelledby="more-title">
  <div class="container">
    ${sectionHead({ eyebrow: 'More journeys', title: 'Other ways to see the Cape', id: 'more-title', aside: `<a class="gt-button gt-button--tertiary link-arrow" href="tours/">Explore Tours</a>` })}
    <div class="grid grid--3">
      ${others.map((x, i) => packageCard(x, site, { i })).join('\n      ')}
      ${related ? tourCard(related, site, { i: others.length }) : ''}
      <article class="card card--custom" data-reveal style="--reveal-i:2">
        <p class="eyebrow mt-0">Your own journey</p>
        <h3 class="card__title"><a href="enquire/?type=tour&amp;tour=custom">Plan a custom multi-day trip</a></h3>
        <p class="card__text">Tell us what you would like to see and how long you have, and you’ll receive a plan and a quote.</p>
      </article>
    </div>
  </div>
</section>
${hasGallery ? mediaLightbox({ items: gallery }) : ''}`,
  };
}

export const pages = [listPage(), ...packages.map(detailPage)];
