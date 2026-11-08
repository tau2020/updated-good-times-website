import { esc, breadcrumb, button, picture, preloadFor, stars, SIGNATURE_CTA, SIGNATURE_ATTRS } from '../partials/ui.mjs';
import { ratingBar, reviewWall, REVIEW_WALL_ASSETS } from '../partials/review-wall.mjs';
import { guestReviews } from '../data/guest-reviews.mjs';

const crumbs = [{ label: 'Home', href: './' }, { label: 'Reviews', href: 'reviews/' }];
const LABELS = { excellent: 'Excellent', good: 'Very good', average: 'Average', poor: 'Poor', terrible: 'Terrible' };

/**
 * The reviews page (the owner's request of 8 Nov 2026: the reviewers' own words, never our summaries;
 * docs/enhancement/03-reputation.md). Each platform's own rating with its own "Write a review", the reviews in the
 * owner's archive (src/data/guest-reviews.mjs) newest first, twelve at a time, and Tripadvisor's own breakdown.
 */
export const page = {
  path: 'reviews/index.html',
  nav: 'reviews/',
  title: 'What Our Guests Say: Tripadvisor and Google reviews',
  description: 'Good Times in Cape Town is rated 5.0 on Tripadvisor and on Google. Read travellers’ reviews in their own words, each linking to the whole review.',
  breadcrumbs: crumbs,
  preload: [preloadFor('diaz-beach-cove')],
  styles: REVIEW_WALL_ASSETS.styles,
  scripts: REVIEW_WALL_ASSETS.scripts,
  body: ({ site }) => {
    const ta = site.tripadvisor;
    const total = Object.values(ta.distribution).reduce((a, b) => a + b, 0);
    const day = (iso, month = 'short') => new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month, year: 'numeric', timeZone: 'UTC' });
    const checked = day(ta.checked);
    const breakdown = day(ta.distributionChecked || ta.checked);
    return `
<section class="reviews-photo reviews-photo--page" aria-labelledby="reviews-title" style="--focus: 40% 62%">
  <div class="reviews-photo__media">${picture({ name: 'diaz-beach-cove', alt: '', sizes: '100vw', eager: true, fetchpriority: 'high' })}</div>
  <div class="container">
    <div class="section-head section-head--center" data-reveal>
      <div>
        ${breadcrumb(crumbs)}
        <p class="eyebrow">Reviews</p>
        <h1 id="reviews-title">What our guests say</h1>
        <p class="lead">Travellers’ own reviews of their days with us. Each platform’s rating is its own, never added together.</p>
      </div>
    </div>
    ${ratingBar(site)}
  </div>
</section>

<section class="section" aria-labelledby="wall-title">
  <div class="container">
    <div class="section-head section-head--center">
      <div>
        <p class="eyebrow">In their own words</p>
        <h2 id="wall-title">Reviews, newest first</h2>
      </div>
    </div>
    ${reviewWall({ list: guestReviews, initial: 12, step: 12, label: 'Reviews from Tripadvisor, newest first', all: { href: ta.url, label: `All ${ta.reviewCount} reviews on Tripadvisor`, external: true } })}
    <p class="source-note mt-6">Reviews are the opinions of Tripadvisor members, shown as they wrote them: each card is the title the reviewer gave their review, with their rating, their name and the date they wrote it. These are the ${guestReviews.length} reviews in our own records; all ${ta.reviewCount}, in full, are on Tripadvisor. Our Google reviews are read on Google.</p>
  </div>
</section>

<section class="section section--paper" aria-labelledby="summary-title">
  <div class="container container--narrow">
    <div class="score" data-reveal>
      <h2 class="visually-hidden" id="summary-title">Tripadvisor rating summary</h2>
      <p class="score__number">${ta.rating.toFixed(1)}<small> / 5</small></p>
      ${stars({ large: true })}
      <p class="score__meta">${ta.reviewCount} Tripadvisor reviews, checked ${esc(checked)}</p>
      <p class="score__meta small">Breakdown of the ${total} reviews recorded on ${esc(breakdown)}</p>
      <ul class="bars" role="list" aria-label="Rating breakdown">
        ${Object.entries(ta.distribution)
          .map(([k, v]) => `<li><span>${LABELS[k]}</span><span class="bars__track" aria-hidden="true"><span class="bars__fill" style="width:${((v / total) * 100).toFixed(1)}%"></span></span><span>${v}<span class="visually-hidden"> reviews</span></span></li>`)
          .join('\n        ')}
      </ul>
    </div>
  </div>
</section>

<section class="section cta" aria-labelledby="reviews-cta">
  <div class="container">
    <h2 id="reviews-cta">Plan a day guests write home about.</h2>
    <div class="cta__actions">${button({ href: 'tours/', label: 'Explore Tours', variant: 'gold' })}${button({ href: 'enquire/', label: SIGNATURE_CTA, variant: 'ghost', attrs: SIGNATURE_ATTRS })}</div>
  </div>
</section>`;
  },
};
