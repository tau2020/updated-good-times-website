import { esc, icon, breadcrumb } from '../partials/ui.mjs';
import { site } from '../data/site.mjs';

/**
 * The Terms & Conditions for bookings with Good Times in Cape Town: the company's own text from
 * goodtimesincapetown.co.za/terms/ (read on 5 Nov 2026), reproduced section for section with two
 * adaptations to this website, both listed in docs/APPROVAL_REGISTER.md: section 3 no longer points
 * to a "My Bookings" page and section 6 no longer to a "Safety & Trust" page (this site has neither).
 * test/terms.test.mjs compares the page with that source (test/fixtures/terms-source.md), so a word
 * changed here without the source fails; a change to the text also needs a new site.legal.termsVersion,
 * the version recorded with every booking request that accepts it. Until Good Times approves the text
 * (site.legal.termsApproved) the page exists only in preview builds (noindex), and the production
 * deployment refuses to run while it is unapproved or a point is open (scripts/release-gate.mjs).
 */
const crumbs = [{ label: 'Home', href: './' }, { label: 'Terms & Conditions', href: 'terms/' }];

/** What only Good Times can confirm. Each becomes part of the terms, and leaves this list, once confirmed. */
export const OPEN_POINTS = [
  'the cancellation notice and any charges for each kind of booking (the tour pages list free cancellation up to 24 hours before departure)',
  'payment methods, any deposit and when payment is due',
];

const list = (items) => items.join('; ');

/**
 * The text, as written. A clause is a paragraph with an optional bold label,
 * or a label over a list of points.
 */
export const TERMS = {
  intro:
    'These terms apply to every booking made with Good Times In Cape Town, a Western Cape registered tour operator. If anything here is unclear, get in touch before you book and we’ll talk it through.',
  sections: [
    {
      id: 'bookings',
      title: '1. Bookings',
      clauses: [
        { text: 'A booking is only confirmed once you’ve received confirmation from our team — submitting a booking request or enquiry through the site does not by itself guarantee a place on a tour. We’ll always follow up directly to confirm dates, pricing and any special requirements.' },
      ],
    },
    {
      id: 'pricing',
      title: '2. Pricing & payment',
      clauses: [
        { text: 'Prices are quoted in South African Rand (ZAR) and are confirmed at the time of booking. Amounts shown in other currencies via the site’s currency selector are indicative conversions for reference only — the amount actually charged is always in ZAR. Payment terms will be confirmed with you when your booking is arranged.' },
      ],
    },
    {
      id: 'cancellations',
      title: '3. Cancellations & changes',
      clauses: [
        { text: 'If you need to cancel or change a confirmed booking, contact us as soon as possible, directly by phone or email. How much notice is needed and whether any amount is refundable depends on the specific tour and how close to the departure date the change is requested; we’ll confirm the applicable terms with you when you book.' },
        { text: 'We reserve the right to cancel or reschedule a tour where weather, safety, or circumstances beyond our control make it necessary. In that case we’ll offer an alternative date or a full refund.' },
      ],
    },
    {
      id: 'on-tour',
      title: '4. On tour',
      clauses: [
        { text: 'Guests are expected to follow the reasonable instructions of their guide, particularly around safety. We reserve the right to end a tour early, without refund, in cases of behaviour that endangers the guest, other guests, or guide.' },
        { text: 'Some activities included in certain tours (hiking, water-based activities, township visits) carry inherent risks. Please tell us about any medical conditions, mobility limitations, or other factors that might affect your participation before you book.' },
      ],
    },
    {
      id: 'photography',
      title: '5. Photography',
      clauses: [{ text: 'We may take photographs during tours for marketing purposes. Let your guide know if you’d prefer not to be photographed, or contact us afterwards if you’d like an image removed.' }],
    },
    {
      id: 'liability',
      title: '6. Liability',
      clauses: [
        { text: 'We carry out our tours with due care and take reasonable steps to keep guests safe. We are not liable for loss, injury, or delay arising from circumstances outside our reasonable control, including weather, road conditions, and acts of third parties.' },
      ],
    },
    {
      id: 'governing-law',
      title: '7. Governing law',
      clauses: [{ text: 'These terms are governed by the laws of South Africa. Any disputes will be subject to the jurisdiction of the South African courts.' }],
    },
  ],
};

function clause(c) {
  const label = c.label ? `<strong>${esc(c.label)}:</strong>` : '';
  if (c.items) return `<p>${label}</p>\n    <ul>\n      ${c.items.map((i) => `<li>${esc(i)}</li>`).join('\n      ')}\n    </ul>`;
  return `<p>${label ? `${label} ` : ''}${esc(c.text)}</p>`;
}

export const termsPage = {
  path: 'terms/index.html',
  nav: null,
  title: 'Terms & Conditions',
  description: 'The Terms & Conditions for bookings with Good Times in Cape Town: bookings, pricing and payment in rand, cancellations and changes, conduct on tour, photography, liability and governing law.',
  noindex: !site.legal.termsApproved,
  priority: 0.3,
  breadcrumbs: crumbs,
  body: ({ site: s }) => {
    const { legal, contact } = s;
    return `
<section class="page-head">
  <div class="container">
    ${breadcrumb(crumbs)}
    <p class="eyebrow">${esc(s.name)}</p>
    <h1>Terms &amp; Conditions</h1>
  </div>
</section>
<section class="section">
  <div class="container prose">
    ${legal.termsApproved ? '' : `<p class="notice notice--warning">${icon('alert')}<span><strong>Draft for Good Times’ approval.</strong> These are Good Times’ own terms, adapted where this website works differently. Still to confirm: ${esc(list(OPEN_POINTS))}; and the registered business details. Then a legal review, before these terms are published. Nothing here is invented in the meantime.</span></p>`}
    ${legal.effective ? `<p class="small muted">Effective ${esc(legal.effective)}.</p>` : ''}
    <p>${esc(TERMS.intro)}</p>
    ${legal.entity.verified || legal.address.verified ? `<p>${legal.entity.verified ? `${esc(s.name)} is the trading name of ${esc(legal.entity.name)}${legal.entity.registration ? `, registration number ${esc(legal.entity.registration)}` : ''}${legal.entity.directors ? `; directors: ${esc(legal.entity.directors)}` : ''}.` : ''} ${legal.address.verified ? `Address: ${esc(legal.address.text)}.` : ''}</p>` : ''}
    ${TERMS.sections
      .map(
        (sec) => `
    <h2 id="${sec.id}">${esc(sec.title)}</h2>
    ${sec.clauses.map(clause).join('\n    ')}`,
      )
      .join('\n')}
    ${contact.email.verified || contact.phone.verified ? `<p class="mt-6">Questions about these terms? Contact us at ${[contact.email.verified ? `<a href="mailto:${esc(contact.email.address)}">${esc(contact.email.address)}</a>` : '', contact.phone.verified ? `<a href="tel:${esc(contact.phone.e164)}">${esc(contact.phone.display)}</a>` : ''].filter(Boolean).join(' or ')}.</p>` : ''}
  </div>
</section>`;
  },
};

export const pages = site.preview || site.legal.termsApproved ? [termsPage] : [];
