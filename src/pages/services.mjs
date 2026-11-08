/**
 * Services: everything Good Times offers, at the address the booking site's "Our offer" page had (/services/,
 * restored in Step 4B: it had search traffic and is linked from outside the site; src/data/legacy-urls.mjs).
 * It gathers the four services of the home hero (HERO_SERVICES) and names every tour, activity and transfer with a
 * link to its own page; the facts and prices stay on those pages. Words and icons only: every photograph of the site
 * has one place already (the media audit), so none is repeated here.
 */
import { esc, icon, button, breadcrumb, sectionHead, SIGNATURE_CTA, SIGNATURE_ATTRS } from '../partials/ui.mjs';
import { HERO_SERVICES, HERO_LEAD } from '../partials/hero-services.mjs';
import { tours } from '../data/tours.mjs';
import { packages } from '../data/packages.mjs';
import { services as transfers } from '../data/transfers.mjs';

const crumbs = [{ label: 'Home', href: './' }, { label: 'Services', href: 'services/' }];

const dayTours = tours.filter((t) => !t.categories.includes('adventure') && t.slug !== 'private-cape-town-experience');
const activities = tours.filter((t) => t.categories.includes('adventure'));
const experience = tours.find((t) => t.slug === 'private-cape-town-experience');
const byTitle = Object.fromEntries(HERO_SERVICES.map((s) => [s.title, s]));

/** The hero's four services, each with the pages that carry it (title, line and icon as the hero has them). */
const SERVICES = [
  {
    ...byTitle['Private Tours'],
    id: 'private-tours',
    intro: `${dayTours.length} private day tours from Cape Town, and multi-day journeys along the Garden Route, each with your own guide and vehicle.`,
    items: [
      ...dayTours.map((t) => ({ href: `tours/${t.slug}/`, label: t.shortTitle })),
      ...packages.map((p) => ({ href: `packages/${p.slug}/`, label: p.shortTitle, note: 'three days or more' })),
    ],
    actions: [{ href: 'tours/', label: 'Explore Our Tours' }],
  },
  {
    ...byTitle['Airport Transfers'],
    id: 'airport-transfers',
    intro: transfers[0].card,
    items: transfers.map((s) => ({ href: `transfers/#${s.id}`, label: s.title })),
    actions: [{ href: 'transfers/', label: 'Airport Transfers' }, { href: 'enquire/?type=transfer', label: 'Request a Transfer', variant: 'outline' }],
  },
  {
    ...byTitle['Adventure Add-ons'],
    id: 'adventure',
    intro: 'Add a little adrenaline to your stay: a shark cage dive off Gansbaai, a quad bike ride or a tandem skydive.',
    items: activities.map((t) => ({ href: `tours/${t.slug}/`, label: t.shortTitle })),
    actions: [{ href: 'tours/#adventure', label: 'Our Experiences' }],
  },
  {
    ...byTitle['Custom Journeys'],
    id: 'custom-journeys',
    intro: experience.card,
    items: [{ href: `tours/${experience.slug}/`, label: experience.shortTitle }, { href: 'packages/', label: 'Multi-day tours' }],
    actions: [{ href: 'enquire/?type=tour&tour=custom', label: SIGNATURE_CTA, attrs: SIGNATURE_ATTRS }],
  },
];

export const page = {
  path: 'services/index.html',
  title: 'Our services: tours, transfers and adventures',
  description: 'Everything Good Times in Cape Town offers in one place: private day tours, adventure activities, multi-day Garden Route journeys and airport transfers, each planned around your group.',
  breadcrumbs: crumbs,
  schema: [
    {
      '@type': 'ItemList',
      name: 'Good Times in Cape Town services',
      itemListElement: SERVICES.flatMap((s) => s.items).map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.label, url: `__SITE__/${it.href}` })),
    },
  ],
  body: ({ site }) => `
<section class="page-head">
  <div class="container">
    ${breadcrumb(crumbs)}
    <p class="eyebrow">What we do</p>
    <h1>Our services</h1>
    <p class="lead">${esc(HERO_LEAD.text)}, ${esc(HERO_LEAD.mark)} Every tour, activity and transfer we offer, in one place.</p>
  </div>
</section>

<section class="section" aria-label="Our four services">
  <div class="container cols-2">
    ${SERVICES.map(
      (s, i) => `<section class="panel" aria-labelledby="svc-${s.id}" data-reveal${i ? ` style="--reveal-i:${i % 2}"` : ''}>
      <p class="eyebrow">${icon(s.icon)} ${esc(s.text)}</p>
      <h2 id="svc-${s.id}">${esc(s.title)}</h2>
      <p>${esc(s.intro)}</p>
      <ul class="ticks" role="list">
        ${s.items.map((it) => `<li>${icon('check')} <span><a href="${it.href}">${esc(it.label)}</a>${it.note ? `, ${esc(it.note)}` : ''}</span></li>`).join('\n        ')}
      </ul>
      <div class="cluster mt-5">${s.actions.map((a, j) => button({ href: a.href, label: a.label, variant: a.variant || (j ? 'outline' : 'gold'), attrs: a.attrs || '' })).join(' ')}</div>
    </section>`,
    ).join('\n    ')}
  </div>
</section>

<section class="section section--paper" aria-labelledby="how-title">
  <div class="container">
    ${sectionHead({ eyebrow: 'How it works', title: 'Private, and planned with you.', id: 'how-title', lead: `${site.trust.find((t) => t.icon === 'users')?.text || 'Every tour is private and shaped around your group'}.` })}
    <ol class="steps" role="list">
      <li class="step" data-reveal><h3>Tell us what you’d like</h3><p>Pick a tour, describe your own day, or choose a transfer, and add your dates, your group and your pickup area.</p></li>
      <li class="step" data-reveal style="--reveal-i:1"><h3>We reply with a quote</h3><p>Availability and your price, through your preferred contact method: email, WhatsApp or phone.</p></li>
      <li class="step" data-reveal style="--reveal-i:2"><h3>Nothing until it’s confirmed</h3><p>Nothing is booked or charged until we have confirmed the arrangements with you.</p></li>
    </ol>
  </div>
</section>

<section class="section cta" aria-labelledby="services-cta-title">
  <div class="container">
    <h2 id="services-cta-title">Not sure which to choose?</h2>
    <p class="lead">Tell us what you’d like to see and do, and we’ll suggest the day.</p>
    <div class="cta__actions">
      ${button({ href: 'enquire/?type=tour&tour=custom', label: SIGNATURE_CTA, variant: 'gold', attrs: SIGNATURE_ATTRS })}
      ${button({ href: 'contact/', label: 'Ask Us Anything', variant: 'ghost', icon: '' })}
    </div>
  </div>
</section>`,
};
