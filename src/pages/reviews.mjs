import { esc, icon, breadcrumb, button, picture, preloadFor, stars } from '../partials/ui.mjs';
import { reviewCard } from '../partials/cards.mjs';
import { reviews, themes, pullQuote, reviewSource } from '../data/reviews.mjs';

const crumbs = [{ label: 'Home', href: './' }, { label: 'Reviews', href: 'reviews/' }];
const LABELS = { excellent: 'Excellent', good: 'Very good', average: 'Average', poor: 'Poor', terrible: 'Terrible' };
const FEATURED = 4;

export const page = {
  path: 'reviews/index.html',
  nav: 'reviews/',
  title: 'What Our Guests Say: Tripadvisor reviews',
  description: 'Good Times in Cape Town is rated 5.0 from 264 Tripadvisor reviews. Read summaries of guests’ reviews, each linking to the original.',
  priority: 0.7,
  breadcrumbs: crumbs,
  preload: [preloadFor('table-mountain-sparkling')],
  body: ({ site }) => {
    const ta = site.tripadvisor;
    const total = Object.values(ta.distribution).reduce((a, b) => a + b, 0);
    const day = (iso, month = 'short') => new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month, year: 'numeric', timeZone: 'UTC' });
    const checked = day(ta.checked);
    const breakdown = day(ta.distributionChecked || ta.checked);
    const checkedLong = day(reviewSource.checked, 'long');
    return `
<section class="reviews-photo reviews-photo--page" aria-labelledby="reviews-title" style="--focus: 36% 40%">
  <div class="reviews-photo__media">${picture({ name: 'table-mountain-sparkling', alt: '', sizes: '100vw', eager: true, fetchpriority: 'high' })}</div>
  <div class="container">
    <div class="section-head" data-reveal>
      <div>
        ${breadcrumb(crumbs)}
        <p class="eyebrow">Reviews on Tripadvisor</p>
        <h1 id="reviews-title">What Our Guests Say</h1>
        <p class="lead">Real stories from real travellers on Tripadvisor: ${ta.rating.toFixed(1)} from ${ta.reviewCount} reviews, checked ${esc(checked)}.</p>
      </div>
    </div>
    <div class="review-grid review-grid--4 review-grid--rail">
      ${reviews.slice(0, FEATURED).map((r, i) => reviewCard(r, { i })).join('\n      ')}
    </div>
    <div class="reviews-photo__action">
      <a class="btn gt-button gt-button--primary" href="${esc(ta.url)}" rel="noopener" target="_blank"><span>Read More Reviews on Tripadvisor</span><span class="visually-hidden"> (opens in a new tab)</span></a>
    </div>
  </div>
</section>

<section class="section" aria-labelledby="summary-title">
  <div class="container reviews">
    <div class="score" data-reveal>
      <h2 class="visually-hidden" id="summary-title">Rating summary</h2>
      <p class="score__number">${ta.rating.toFixed(1)}<small> / 5</small></p>
      ${stars({ large: true })}
      <p class="score__meta">${ta.reviewCount} Tripadvisor reviews, checked ${esc(checked)}</p>
      <p class="score__meta small">Breakdown of the ${total} reviews recorded on ${esc(breakdown)}</p>
      <ul class="bars" role="list" aria-label="Rating breakdown">
        ${Object.entries(ta.distribution)
          .map(([k, v]) => `<li><span>${LABELS[k]}</span><span class="bars__track" aria-hidden="true"><span class="bars__fill" style="width:${((v / total) * 100).toFixed(1)}%"></span></span><span>${v}<span class="visually-hidden"> reviews</span></span></li>`)
          .join('\n        ')}
      </ul>
      ${
        pullQuote
          ? `<figure class="pull-quote">
        <blockquote><p>${esc(pullQuote.text)}</p></blockquote>
        <figcaption>${esc(pullQuote.author)}, ${esc(pullQuote.origin)} · ${esc(pullQuote.date)} · <a class="external" href="${esc(pullQuote.url)}" rel="noopener" target="_blank">Read on Tripadvisor<span class="visually-hidden"> (opens in a new tab)</span></a></figcaption>
      </figure>`
          : ''
      }
      <p class="mt-5"><a class="btn gt-button gt-button--secondary gt-button--compact" href="${esc(ta.url)}" rel="noopener" target="_blank">All Reviews on Tripadvisor<span class="visually-hidden"> (opens in a new tab)</span></a></p>
    </div>
    <div>
      <ul class="themes" role="list">
        ${themes.map((t) => `<li><strong>${esc(t.title)}</strong><span>${esc(t.text)}</span></li>`).join('\n        ')}
      </ul>
      <h2 class="mt-7" id="more-reviews-title">More guest reviews</h2>
      <div class="review-grid mt-5">
        ${reviews.slice(FEATURED).map((r, i) => reviewCard(r, { i })).join('\n        ')}
      </div>
      <p class="source-note mt-6">Reviews are the opinions of Tripadvisor members. Names, places and dates are as recorded from Tripadvisor on ${esc(checkedLong)}. The summaries are written by us and are not the reviewers’ own words: each card links to the review itself.</p>
    </div>
  </div>
</section>

<section class="section cta" aria-labelledby="reviews-cta">
  <div class="container">
    <h2 id="reviews-cta">Plan a day guests write home about.</h2>
    <div class="cta__actions">${button({ href: 'tours/', label: 'Explore Tours', variant: 'gold' })}${button({ href: 'enquire/', label: 'Get a Quote', variant: 'ghost' })}</div>
  </div>
</section>`;
  },
};
