import { esc, icon, breadcrumb, button } from '../partials/ui.mjs';
import { faqs } from '../data/faq.mjs';

const crumbs = [{ label: 'Home', href: './' }, { label: 'FAQ', href: 'faq/' }];

export const page = {
  path: 'faq/index.html',
  nav: 'faq/',
  title: 'Frequently asked questions',
  description: 'How to book a Good Times private tour or transfer, group prices, payment, cancellations, where tours start, what to bring, the weather and accredited guides.',
  priority: 0.6,
  breadcrumbs: crumbs,
  schema: [
    {
      '@type': 'FAQPage',
      mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a.join(' ') } })),
    },
  ],
  body: () => `
<section class="page-head">
  <div class="container">
    ${breadcrumb(crumbs)}
    <p class="eyebrow">Good to know</p>
    <h1>Frequently asked questions</h1>
    <p class="lead">Quick answers about booking, prices, pickups and what to expect. Anything else, ask us before you book.</p>
  </div>
</section>

<section class="section" aria-label="Questions and answers">
  <div class="container container--narrow">
    <div class="faq">
      ${faqs
        .map(
          (f, i) => `<details${i === 0 ? ' open' : ''}>
        <summary>${esc(f.q)}</summary>
        <div class="faq__answer">${f.a.map((p) => `<p>${esc(p)}</p>`).join('')}</div>
      </details>`,
        )
        .join('\n      ')}
    </div>
    <p class="callout">${icon('chat')}<span>Still have a question? <a href="enquire/">Send an enquiry</a> and we’ll answer it with your quote.</span></p>
    <div class="center-x mt-6">${button({ href: 'tours/', label: 'Explore Tours', variant: 'gold' })}</div>
  </div>
</section>`,
};
