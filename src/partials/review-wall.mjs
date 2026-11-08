/**
 * The review wall (the owner's request of 8 Nov 2026: the review section of the reference screenshots, with
 * Tripadvisor beside Google, in the reviewers' own words; docs/enhancement/03-reputation.md). Three parts:
 *
 *   ratingBar(site)        each platform's own rating and number of reviews, linked to its listing, and its own
 *                          "Write a review"; the figures sit side by side and are never added together
 *   guestReviewCard(r)     one review: the reviewer's own rating, the title they gave their review (in quotation
 *                          marks, word for word), "Read more" to the whole review on the platform, the product they
 *                          reviewed, their initial (or their photo, once supplied), their name, when they wrote it
 *                          and where it was posted
 *   reviewWall({ list })   the cards, a few at a time: the rest wait in a <template> (carried by the page, drawn only
 *                          when asked for) and "Load more" adds them (src/assets/js/review-wall.js). A wall may instead
 *                          name a page to take the rest from (`moreFrom`: the home page carries eight cards and fetches
 *                          the others from the reviews page on the first "Load more", so it stays light). Without the
 *                          script the first cards show with their dates, and the link under them leads to the rest.
 *
 * The cards come from src/data/guest-reviews.mjs (the owner's archive); the figures from site.tripadvisor and
 * site.google. The script turns each date into "2 weeks ago" against the visitor's own clock (a static page cannot);
 * the date itself stays in the <time> element and its tooltip.
 */
import { esc, stars, brandMark } from './ui.mjs';
import { reviewerPhoto } from './reviewer-photo.mjs';
import { tourBySlug } from '../data/tours.mjs';

export const REVIEW_WALL_ASSETS = Object.freeze({ styles: ['assets/css/review-wall.css'], scripts: ['assets/js/review-wall.js'] });

const NEW_TAB = '<span class="visually-hidden"> (opens in a new tab)</span>';
const EXTERNAL = 'target="_blank" rel="noopener noreferrer"';
/** Six avatar tones (review-wall.css), one per name, the same on every page */
const TONES = 6;
export const avatarTone = (name) => [...String(name)].reduce((h, c) => (h * 31 + c.codePointAt(0)) >>> 0, 7) % TONES;
/** The first letter or digit of a name, as the avatar shows it */
export const avatarInitial = (name) => (String(name).match(/[\p{L}\p{N}]/u)?.[0] || '·').toUpperCase();
const shortDate = (iso) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
/** The platform's mark on a card: drawn by review-wall.css (one definition per page, not one per card) */
const MARK = { Tripadvisor: 'tripadvisor', Google: 'google' };

/** The platforms' own ratings, side by side: Tripadvisor's operator listing and, once verified, the Google profile. */
export function ratingBar(site, { cls = '', attrs = '' } = {}) {
  const ta = site.tripadvisor;
  const g = site.google?.verified ? site.google : null;
  const item = ({ key, name, rating, count, url, write }) => `<li class="rating-bar__platform rating-bar__platform--${key}">
      ${brandMark(key, 'rating-bar__mark')}
      <div class="rating-bar__figures">
        <p class="rating-bar__name">${name} rating</p>
        <p class="rating-bar__score"><span class="rating-bar__value">${rating.toFixed(1)}</span><span class="visually-hidden"> out of 5</span>${stars()}<a class="rating-bar__count" href="${esc(url)}" ${EXTERNAL}>${count} reviews<span class="visually-hidden"> on ${name}</span>${NEW_TAB}</a></p>
      </div>
      ${write ? `<a class="btn gt-button gt-button--secondary gt-button--compact rating-bar__write" href="${esc(write)}" ${EXTERNAL}>Write a review<span class="visually-hidden"> on ${name}</span>${NEW_TAB}</a>` : ''}
    </li>`;
  return `<ul class="rating-bar${g ? ' rating-bar--two' : ''}${cls ? ` ${cls}` : ''}" role="list" aria-label="Our ratings, each platform’s own"${attrs ? ` ${attrs}` : ''}>
    ${item({ key: 'tripadvisor', name: 'Tripadvisor', rating: ta.rating, count: ta.reviewCount, url: ta.url, write: ta.writeReviewUrl })}
    ${g ? item({ key: 'google', name: 'Google', rating: g.rating, count: g.reviewCount, url: g.url, write: g.writeReviewUrl }) : ''}
  </ul>`;
}

/** One review card (a list item). `showProduct: false` on a tour's own page, where every card is about that tour. */
export function guestReviewCard(r, { showProduct = true } = {}) {
  const t = r.tour ? tourBySlug(r.tour) : null;
  const href = t ? `tours/${t.slug}/` : r.service ? `transfers/#${esc(r.service)}` : '';
  const product = showProduct ? (href ? `<a href="${href}">${esc(r.product)}</a>` : esc(r.product)) : '';
  const about = [product, r.trip ? esc(r.trip) : ''].filter(Boolean).join(' · ');
  const photo = reviewerPhoto(r.avatar);
  // Kept lean: a page may carry eighty of these (the stars and the mark are drawn by the stylesheet)
  const rating = Math.max(1, Math.min(5, Math.round(r.rating)));
  return `<li class="review-card">
  <figure class="review-card__inner">
    <p class="review-card__rating"><span class="review-card__stars" style="--n:${rating}" aria-hidden="true"></span><span class="visually-hidden">Rated ${rating} out of 5</span></p>
    <blockquote class="review-card__quote"><p>“${esc(r.title)}”</p></blockquote>
    <a class="review-card__more" href="${esc(r.url)}" ${EXTERNAL}>Read more<span class="visually-hidden"> of ${esc(r.name)}’s review on ${esc(r.platform)} (opens in a new tab)</span></a>
    ${about ? `<p class="review-card__about">${about}</p>` : ''}
    <figcaption class="review-card__by">
      <span class="review-card__avatar review-card__avatar--${avatarTone(r.name)}" aria-hidden="true">${esc(avatarInitial(r.name))}${photo ? `<img src="${photo}" alt="" width="80" height="80" loading="lazy" decoding="async">` : ''}</span>
      <span class="review-card__who"><span class="review-card__name">${esc(r.name)}</span><time class="review-card__date" datetime="${esc(r.date)}" data-review-date>${esc(shortDate(r.date))}</time></span>
      <span class="review-card__platform"><span class="review-card__mark review-card__mark--${MARK[r.platform] || 'tripadvisor'}" aria-hidden="true"></span>Posted on ${esc(r.platform)}</span>
    </figcaption>
  </figure>
</li>`;
}

/**
 * The wall: `initial` cards drawn, the rest in a <template> for "Load more" (`step` at a time), or, with `moreFrom`, the
 * rest taken from that page's own wall when first asked for. `all` is the link under the cards ({ href, label,
 * external }): the rest of the reviews for a visitor without the script, and every review for everyone.
 */
export function reviewWall({ list, initial = 8, step = 8, label = 'Guest reviews', all = null, moreFrom = '', showProduct = true, cls = '', attrs = '' }) {
  const card = (r) => guestReviewCard(r, { showProduct });
  const first = list.slice(0, initial);
  const rest = list.slice(initial);
  const link = all ? `<a class="review-wall__all" href="${esc(all.href)}"${all.external ? ` ${EXTERNAL}` : ''}>${esc(all.label)}${all.external ? NEW_TAB : ''}</a>` : '';
  const more = rest.length || moreFrom;
  return `<div class="review-wall${cls ? ` ${cls}` : ''}" data-review-wall data-step="${step}"${moreFrom ? ` data-more-from="${esc(moreFrom)}"` : ''}${attrs ? ` ${attrs}` : ''}>
  <ul class="review-wall__grid" role="list" aria-label="${esc(label)}" data-review-list>
    ${first.map(card).join('\n    ')}
  </ul>
  ${rest.length ? `<template data-review-rest>${rest.map(card).join('')}</template>` : ''}
  ${more || link ? `<div class="review-wall__actions">
    ${more ? `<button class="btn gt-button gt-button--secondary review-wall__more" type="button" data-review-more hidden>Load more<span class="visually-hidden"> reviews</span></button>` : ''}
    ${link}
  </div>` : ''}
  <p class="visually-hidden" role="status" data-review-status></p>
</div>`;
}
