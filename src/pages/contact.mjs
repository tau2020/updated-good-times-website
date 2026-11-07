import { esc, icon, brandMark, button, breadcrumb, sectionHead, contactList } from '../partials/ui.mjs';

const crumbs = [{ label: 'Home', href: './' }, { label: 'Contact', href: 'contact/' }];

export const page = {
  path: 'contact/index.html',
  nav: 'contact/',
  title: 'Contact Good Times in Cape Town',
  description: 'Contact Good Times in Cape Town by phone or email, visit our office in Sea Point, or send a booking request for a private tour or airport transfer.',
  priority: 0.7,
  breadcrumbs: crumbs,
  body: ({ site }) => {
    // The contact section also lists the additional address (Stuart's, 6 Nov 2026) after the primary one
    const direct = contactList(site, { additional: true });
    return `
<section class="page-head">
  <div class="container">
    ${breadcrumb(crumbs)}
    <p class="eyebrow">Contact</p>
    <h1>Let’s talk Cape Town.</h1>
    <p class="lead">Call us, send an email, drop by our office in Sea Point, or start a booking request: tell us the tour or transfer, your dates and your group, and we’ll reply with availability and a quote.</p>
  </div>
</section>

<section class="section" aria-label="Ways to reach us">
  <div class="container cols-2">
    <div class="panel" data-reveal>
      <p class="eyebrow">Book</p>
      <h2>Send a booking request</h2>
      <p>We’ll confirm availability and your price by email, WhatsApp or phone before anything is booked.</p>
      <div class="cluster">
        ${button({ href: 'enquire/?type=tour', label: 'Request Your Tour', variant: 'gold' })}
        ${button({ href: 'enquire/?type=transfer', label: 'Arrange My Transfer', variant: 'outline', icon: 'car' })}
      </div>
      <ul class="ticks" role="list">
        <li>${icon('check')} <span>Pick a tour, describe your own day, or choose a transfer</span></li>
        <li>${icon('check')} <span>Add your dates, your group and your pickup area</span></li>
        <li>${icon('check')} <span>We’ll reply through your preferred contact method with availability and a quote</span></li>
      </ul>
    </div>
    <div class="panel" data-reveal style="--reveal-i:1">
      <p class="eyebrow">Direct</p>
      <h2>Phone, email and our office</h2>
      ${direct || '<p>A booking request is the quickest way to reach us.</p>'}
      <h3>Follow our journey</h3>
      <ul class="contact-links" role="list">
        <li><a href="${esc(site.social.instagram)}" rel="noopener" target="_blank">${brandMark('instagram')} Instagram<span class="visually-hidden"> (opens in a new tab)</span></a></li>
        <li><a href="${esc(site.social.facebook)}" rel="noopener" target="_blank">${brandMark('facebook')} Facebook<span class="visually-hidden"> (opens in a new tab)</span></a></li>
        <li><a href="${esc(site.social.tripadvisor)}" rel="noopener" target="_blank">${brandMark('tripadvisor')} Tripadvisor<span class="visually-hidden"> (opens in a new tab)</span></a></li>
      </ul>
      ${
        site.contact.office?.verified
          ? `<h3>Visit our office</h3>
      <address class="contact-office">${site.contact.office.lines.map(esc).join('<br>')}</address>
      <p class="mt-3"><a class="external" href="${esc(site.contact.office.mapsUrl)}" rel="noopener" target="_blank">Get directions<span class="visually-hidden"> (opens Google Maps in a new tab)</span></a></p>`
          : `<p class="small muted"><span class="meta-inline">${icon('pin')} Cape Town, South Africa</span></p>`
      }
    </div>
  </div>
</section>

<section class="section section--paper" aria-labelledby="before-title">
  <div class="container">
    ${sectionHead({ eyebrow: 'Before you ask', title: 'Answers and experiences', id: 'before-title', lead: 'Most questions about pickups, prices and what is included are answered already.' })}
    <div class="cols-2">
      <div>
        <h3>Frequently asked questions</h3>
        <p class="mt-3">How booking works, group prices, payment, cancellations, where tours start and what to bring.</p>
        <div class="mt-4">${button({ href: 'faq/', label: 'Read Our FAQ', variant: 'outline' })}</div>
      </div>
      <div>
        <h3>Guest reviews</h3>
        <p class="mt-3">Short summaries of guests’ reviews on Tripadvisor, each linking to the original.</p>
        <div class="mt-4">${button({ href: 'reviews/', label: 'Read Reviews', variant: 'outline' })}</div>
      </div>
    </div>
  </div>
</section>`;
  },
};
