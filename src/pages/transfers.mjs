import { esc, icon, button, picture, preloadFor, breadcrumb, sectionHead, price, showRating, currencyPicker, moneyTag } from '../partials/ui.mjs';
import { rowCard } from '../partials/cards.mjs';
import { services, types } from '../data/transfers.mjs';

const crumbs = [{ label: 'Home', href: './' }, { label: 'Transfers', href: 'transfers/' }];
const requestHref = (id) => `enquire/?type=transfer&transfer=${id}`;
const byId = (id) => types.find((t) => t.id === id);
const [airport] = services;

/** Thumbnails: Good Times' own airport photographs (the guest's name on the welcome sign is blurred). */
const ROW_IMAGE = { 'airport-arrival': 'airport-welcome-sign', 'airport-departure': 'airport-arrivals-group', other: 'airport-luggage-boot' };

function row(id, i, extra = {}) {
  const t = byId(id);
  return rowCard({
    image: ROW_IMAGE[id],
    title: t.label,
    text: `${t.hint}${t.flight ? '. Flight number needed' : ''}.`,
    href: requestHref(id),
    i,
    ...extra,
  });
}

function serviceBlock(s, site, i) {
  const ta = s.tripadvisor;
  const media = [s.images.hero, ...s.images.gallery];
  const request = requestHref('airport-arrival');
  const tiers = site.prices.show && s.price?.tiers?.length > 1 ? `<p class="small muted">${s.price.tiers.map((x) => `${esc(x.label)}: ${moneyTag(x.amount, s.price.currency)}`).join(' · ')}. ${esc(s.price.note)}</p>` : '';
  return `<article class="service-block${i % 2 ? ' service-block--media-first' : ''}" id="${s.id}" aria-labelledby="${s.id}-title">
  <div class="service-block__body" data-reveal>
    <p class="eyebrow">${esc(s.shortTitle)}</p>
    <h2 id="${s.id}-title">${esc(s.title)}</h2>
    <p class="lead">${esc(s.card)}</p>
    <p>${esc(s.intro)}</p>
    <ul class="ticks" role="list">${[...s.highlights, ...s.included].map((h) => `<li>${icon('check')} ${esc(h)}</li>`).join('')}</ul>
    <div class="meta-row">
      <span>${icon('clock')} ${esc(s.duration)}</span>
      <span>${icon('users')} Private: only your group</span>
      ${showRating(ta) ? `<span>${icon('star')} ${ta.rating.toFixed(1)} from ${ta.reviews} reviews on Tripadvisor</span>` : ''}
    </div>
    <p class="small muted">Not included: ${esc(s.notIncluded.join(', ').toLowerCase())}. ${esc(s.cancellation)}</p>
    <div class="service-block__foot">
      ${price(s, site)}
      ${button({ href: request, label: 'Arrange a Transfer', variant: 'gold' })}
    </div>
    ${tiers}
    ${i === 0 && site.prices.show && s.price ? `<div class="currency-area currency-area--inline">${currencyPicker({ id: 'currency-transfers' })}</div>` : ''}
  </div>
  <div class="service-block__media" data-reveal style="--reveal-i:1">
    ${media.map((m, j) => `<div class="media-frame"${j === 0 ? ' style="--focus: 48% 40%"' : ''}>${picture({ name: m, sizes: j === 0 ? '(min-width: 56em) 44vw, 92vw' : '(min-width: 56em) 22vw, 46vw' })}</div>`).join('\n    ')}
  </div>
</article>`;
}

export const page = {
  path: 'transfers/index.html',
  nav: 'transfers/',
  title: 'Airport Transfers in Cape Town',
  description: 'Private transfers between Cape Town International Airport and your accommodation, with meet and greet at arrivals and help with your luggage. From R800 per trip for 1–4 guests.',
  priority: 0.9,
  breadcrumbs: crumbs,
  preload: [preloadFor('airport-departures-wave')],
  body: ({ site }) => `
<section class="banner" style="--focus: 40% 56%; --focus-mobile: 36% 56%; --banner-h: clamp(26rem, 18rem + 22vw, 42rem)">
  <div class="banner__media">${picture({ name: 'airport-departures-wave', eager: true, fetchpriority: 'high', alt: '' })}</div>
  <div class="container">
    <div class="banner__content">
      ${breadcrumb(crumbs)}
      <h1>Airport Transfers</h1>
      <p class="banner__sub">Met at arrivals. Driven to your door.</p>
      <p class="banner__text">Private transfers between Cape Town International Airport and your accommodation, for individuals, families and small groups, with a name board at arrivals and a hand with your luggage.</p>
    </div>
  </div>
</section>

<section class="section section--paper" aria-labelledby="choose-title">
  <div class="container">
    ${sectionHead({ eyebrow: 'Choose your transfer', title: 'Where are you going?', id: 'choose-title', lead: 'Pick the journey you need. You give the details in the next step, and we’ll reply with availability and a quote.' })}
    <div class="tabs" data-tabs>
      <div class="segmented" role="tablist" aria-label="Transfer type" hidden>
        <button class="segmented__tab" type="button" role="tab" id="tab-airport" aria-controls="panel-airport" aria-selected="true">Airport</button>
        <button class="segmented__tab" type="button" role="tab" id="tab-other" aria-controls="panel-other" aria-selected="false" tabindex="-1">Other routes</button>
      </div>
      <section class="tab-panel" id="panel-airport" role="tabpanel" aria-labelledby="tab-airport" tabindex="0">
        <h3 class="tab-panel__title">Airport</h3>
        <div class="rows">
          ${row('airport-arrival', 0, { meta: `${icon('clock')} ${esc(airport.duration)}` })}
          ${row('airport-departure', 1, { meta: `${icon('clock')} ${esc(airport.duration)}` })}
        </div>
      </section>
      <section class="tab-panel" id="panel-other" role="tabpanel" aria-labelledby="tab-other" tabindex="0">
        <h3 class="tab-panel__title">Other routes</h3>
        <div class="rows">
          ${row('other', 0, { meta: `${icon('info')} An open request, not an advertised service: we’ll tell you whether we can help` })}
        </div>
      </section>
    </div>
  </div>
</section>

<section class="section" aria-label="Transfer services">
  <div class="container">
    ${services.map((s, i) => serviceBlock(s, site, i)).join('\n')}
  </div>
</section>

<section class="band" aria-label="What every airport transfer includes">
  <div class="container">
    <ul class="band__list" role="list">
      <li class="band__item"><span class="band__icon">${icon('user')}</span><span><span class="band__title">Meet and greet</span><span class="band__text">Your driver waits at the arrivals gate with a name board</span></span></li>
      <li class="band__item"><span class="band__icon">${icon('luggage')}</span><span><span class="band__title">Help with your luggage</span><span class="band__text">From the arrivals hall to the vehicle</span></span></li>
      <li class="band__item"><span class="band__icon">${icon('route')}</span><span><span class="band__title">Straight to your door</span><span class="band__text">A direct private transfer, only your group on board</span></span></li>
      <li class="band__item"><span class="band__icon">${icon('plane')}</span><span><span class="band__title">Flight delays tracked</span><span class="band__text">Share your flight details and we follow your arrival at no extra charge</span></span></li>
    </ul>
  </div>
</section>

<section class="section" aria-labelledby="transfer-how-title">
  <div class="container container--narrow">
    ${sectionHead({ eyebrow: 'Requesting a transfer', title: 'What we need from you', id: 'transfer-how-title', center: true })}
    <ul class="ticks" role="list">
      <li>${icon('calendar')} <span><strong>Date and time</strong> in South African time (SAST), and a return journey if you need one.</span></li>
      <li>${icon('plane')} <span><strong>Flight number</strong> for airport arrivals, so we can track delays at no extra charge.</span></li>
      <li>${icon('users')} <span><strong>Passengers</strong>, including any children, so the right vehicle is arranged.</span></li>
      <li>${icon('luggage')} <span><strong>Luggage</strong>, including anything oversized such as golf bags or surfboards.</span></li>
    </ul>
    <p class="callout">${icon('info')}<span>A transfer request is not a confirmed booking: one of our team confirms it with you.</span></p>
    <div class="center-x mt-6">${button({ href: 'enquire/?type=transfer', label: 'Get a Quote', variant: 'gold' })}</div>
  </div>
</section>`,
};
