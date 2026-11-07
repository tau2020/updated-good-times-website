/**
 * Safety & Trust, at the address WordPress gave it (/safety/, restored in Step 4B rather than redirected to About:
 * src/data/legacy-urls.mjs). Only what the site already holds as verified is said: the accreditations, the
 * association and the registration Good Times states (site.credentials), private tours since 2014, the published
 * answers on weather, pickups and personal needs (src/data/faq.mjs), and the Tripadvisor rating with the date it was
 * read. The old page's other claims (vehicles serviced and insured, first aid, a certificate, a number of guests) are
 * not repeated until Good Times confirms them (docs/APPROVAL_REGISTER.md › H4).
 */
import { esc, icon, button, breadcrumb, sectionHead, ratingRow } from '../partials/ui.mjs';
import { faqs } from '../data/faq.mjs';
import { tours } from '../data/tours.mjs';

const crumbs = [{ label: 'Home', href: './' }, { label: 'Safety & Trust', href: 'safety/' }];
const answer = (q) => faqs.find((f) => f.q === q)?.a.join(' ') || '';
/** Each adventure activity's own safety inclusion, as its tour page lists it (src/data/tours.mjs › included). */
const activitySafety = tours
  .filter((t) => t.categories.includes('adventure'))
  .map((t) => ({ t, item: t.included.find((x) => /safety/i.test(x)) }))
  .filter((x) => x.item);

export const page = {
  path: 'safety/index.html',
  title: 'Safety & Trust: accredited local guides',
  description: 'How Good Times in Cape Town looks after you: accredited local guides, a registered associate of the Cape Tourist Guides Association, private tours only since 2014, and plans that change with the weather.',
  priority: 0.6,
  breadcrumbs: crumbs,
  body: ({ site }) => {
    const c = site.credentials;
    const ta = site.tripadvisor;
    const read = new Date(`${ta.checked}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
    return `
<section class="page-head">
  <div class="container">
    ${breadcrumb(crumbs)}
    <p class="eyebrow">Your trip, in safe hands</p>
    <h1>Safety &amp; Trust</h1>
    <p class="lead">Who looks after you on a Good Times tour, and what happens when the day needs to change.</p>
  </div>
</section>

<section class="section" aria-labelledby="who-title">
  <div class="container">
    ${sectionHead({ eyebrow: 'Who you travel with', title: 'Accredited, registered and local.', id: 'who-title' })}
    <ul class="themes" role="list">
      <li data-reveal><strong>Accredited guides</strong><span>${esc(c.guides)}.</span></li>
      <li data-reveal style="--reveal-i:1"><strong>A registered associate</strong><span>${esc(c.association)}${c.ctga?.verified ? ` (${esc(c.ctga.short)})` : ''}.</span></li>
      <li data-reveal style="--reveal-i:2"><strong>A registered operator</strong><span>${esc(c.operator)}.</span></li>
    </ul>
  </div>
</section>

<section class="section section--paper" aria-labelledby="day-title">
  <div class="container cols-2">
    <div class="panel" data-reveal>
      <p class="eyebrow">${icon('users')} Private by design</p>
      <h2 id="day-title">Only your group, since ${site.founded}</h2>
      <p>${esc(answer('Do you cater for private and group tours?'))}</p>
      <ul class="ticks" role="list">
        <li>${icon('check')} <span>On our day tours, your own guide and vehicle</span></li>
        <li>${icon('check')} <span>${esc(site.trust.find((x) => x.icon === 'pin')?.text || 'Most tours start at your accommodation')}</span></li>
        <li>${icon('check')} <span>Nothing is booked or charged until we have confirmed the arrangements with you</span></li>
      </ul>
    </div>
    <div class="panel" data-reveal style="--reveal-i:1">
      <p class="eyebrow">${icon('compass')} On the day</p>
      <h2>Plans that follow the conditions</h2>
      <p>${esc(answer('What happens if the weather is bad?'))}</p>
      <h3>Tell us what you need</h3>
      <p>${esc(answer('Can you accommodate dietary needs or mobility requirements?'))}</p>
      ${
        activitySafety.length
          ? `<h3>Adventure activities</h3>
      <ul class="ticks" role="list">
        ${activitySafety.map(({ t, item }) => `<li>${icon('check')} <span><a href="tours/${t.slug}/">${esc(t.shortTitle)}</a>: ${esc(item.toLowerCase())} included</span></li>`).join('\n        ')}
      </ul>`
          : ''
      }
    </div>
  </div>
</section>

<section class="section" aria-labelledby="trust-title">
  <div class="container container--narrow center">
    ${sectionHead({ eyebrow: 'What travellers say', title: 'Trusted by our guests.', id: 'trust-title', center: true })}
    ${ratingRow({ rating: ta.rating, reviews: ta.reviewCount, url: ta.url, large: true })}
    <p class="small muted mt-3">Our Tripadvisor rating and number of reviews, as read on ${esc(read)}.</p>
    <div class="cta__actions">
      ${button({ href: 'reviews/', label: 'Read Our Reviews', variant: 'outline' })}
      ${button({ href: 'about/', label: 'Our Story', variant: 'outline' })}
    </div>
  </div>
</section>

<section class="section cta" aria-labelledby="safety-cta-title">
  <div class="container">
    <h2 id="safety-cta-title">Questions about safety on your tour?</h2>
    <p class="lead">We’re glad to talk anything through before you book.</p>
    <div class="cta__actions">
      ${button({ href: 'contact/', label: 'Contact Us', variant: 'gold' })}
      ${button({ href: 'faq/', label: 'Read Our FAQ', variant: 'ghost', icon: '' })}
    </div>
  </div>
</section>`;
  },
};
