/**
 * Card partials: tours, multi-day packages, transfer rows, reviews, destinations.
 */
import { reviewerPhoto } from './reviewer-photo.mjs';
import { esc, icon, picture, price, fmtDate, showRating, stars, artPanel } from './ui.mjs';
import { routeArt } from './route-art.mjs';
import { tourBySlug, categories, themeLabel } from '../data/tours.mjs';
import { imageByName, creditFor } from '../data/images.mjs';

/**
 * A third party's photograph (origin L, openly licensed) carries its credit on the photograph wherever it is shown larger
 * than a thumbnail: author, licence and source, as the licence asks (the privacy page lists them all). Inside the
 * photograph's own frame, which must be `position: relative`. `tag` is `span` inside phrasing content (a label).
 */
export const licensedCredit = (name, tag = 'p') => (name && imageByName(name)?.origin === 'L' ? `<${tag} class="photo-credit">${esc(creditFor(name))}</${tag}>` : '');

/** A card's crop keeps its photograph's recorded subject (images.mjs `focus`: "a placement may refine it, never ignore it") */
const focusStyle = (name) => {
  const f = name && imageByName(name)?.focus;
  return f ? ` style="--focus: ${f}"` : '';
};

export const tourHref = (t) => `tours/${t.slug}/`;
export const enquireTourHref = (t) => `enquire/?type=tour&tour=${encodeURIComponent(t.slug)}`;
export const packageHref = (p) => `packages/${p.slug}/`;
/** Packages share the tour path of the booking request; the suggested nights travel with the link. */
export const enquirePackageHref = (p) => `enquire/?type=tour&tour=${encodeURIComponent(p.slug)}${p.nights.suggested ? `&nights=${p.nights.suggested}` : ''}`;

/**
 * Multi-day card: the photo (or, without one, the illustrated route), title, a
 * line, duration, and the published rate or "Request a quote". No
 * data-categories, so the tour chips never filter it.
 */
export function packageCard(p, site, { headingLevel = 3, i = 0, sizes = '(min-width: 64em) 30vw, (min-width: 40em) 46vw, 84vw' } = {}) {
  const h = `h${headingLevel}`;
  return `<article class="card card--package" data-reveal style="--reveal-i:${i % 4}">
  <div class="card__media">
    ${p.images.card ? picture({ name: p.images.card, sizes }) : routeArt({ id: `route-card-${p.slug}`, decorative: true })}
    <span class="card__badge">Multi-day</span>
  </div>
  <div class="card__body">
    <${h} class="card__title"><a href="${packageHref(p)}">${esc(p.shortTitle)}</a></${h}>
    <p class="card__text">${esc(p.card)}</p>
    <div class="card__meta">
      <span>${icon('calendar')} ${esc(p.duration)}</span>
      <span>${icon('users')} Private</span>
    </div>
    <div class="card__foot">
      ${price(p, site, { compact: true })}
    </div>
  </div>
</article>`;
}

const catLabel = (id) => categories.find((c) => c.id === id)?.label || '';

/** Tour card: 4:3 photo (the logo artwork where Good Times has none yet), title, two-line description, meta line and price. */
export function tourCard(t, site, { headingLevel = 3, i = 0, badge = '', sizes = '(min-width: 64em) 30vw, (min-width: 40em) 46vw, 84vw' } = {}) {
  const h = `h${headingLevel}`;
  const ta = t.tripadvisor;
  const themes = [...t.categories, ...(t.themes || [])];
  return `<article class="card" data-reveal style="--reveal-i:${i % 4}" data-categories="${esc(themes.join(' '))}">
  <div class="card__media"${focusStyle(t.images.card)}>
    ${t.images.card ? picture({ name: t.images.card, sizes }) : artPanel()}
    ${badge ? `<span class="card__badge">${esc(badge)}</span>` : t.seasonal ? `<span class="card__badge">Seasonal</span>` : ''}
    ${licensedCredit(t.images.card)}
  </div>
  <div class="card__body">
    <${h} class="card__title"><a href="${tourHref(t)}" data-carry-plan>${esc(t.shortTitle)}</a></${h}>
    <p class="card__text">${esc(t.card)}</p>
    <div class="card__meta">
      <span>${icon('clock')} ${esc(t.duration)}</span>
      <span>${icon('users')} Private</span>
      ${showRating(ta) ? `<span>${icon('star')} ${ta.rating.toFixed(1)} · ${ta.reviews} reviews</span>` : ''}
    </div>
    <div class="card__foot">
      ${price(t, site, { compact: true })}
    </div>
  </div>
</article>`;
}

/** Row card (shuttles): thumbnail, title, description, directional arrow. */
export function rowCard({ image, title, text, href, meta = '', i = 0, sizes = '(min-width: 40em) 152px, 92px', external = false }) {
  return `<article class="row-card" data-reveal style="--reveal-i:${i % 4}">
  <div class="row-card__media"${focusStyle(image)}>${picture({ name: image, sizes })}</div>
  <div class="row-card__body">
    <h3 class="row-card__title"><a href="${esc(href)}"${external ? ' rel="noopener" target="_blank"' : ''}>${esc(title)}</a></h3>
    <p class="row-card__text">${esc(text)}</p>
    ${meta ? `<p class="row-card__meta">${meta}</p>` : ''}
  </div>
</article>`;
}

const initials = (name) =>
  name
    .replace(/[^A-Za-z0-9 ]/g, ' ')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || '·';

/**
 * Review card: a verified review's metadata with our labelled summary. The
 * bold line is the tour's name, or the one approved pull-quote when the entry
 * carries verbatim text. Stars appear only when the review's own rating is
 * recorded (none are today), never as decoration.
 */
export function reviewCard(r, { i = 0, showTour = true } = {}) {
  const t = r.tour ? tourBySlug(r.tour) : null;
  const meta = [r.origin, r.visited].filter(Boolean).join(' · ');
  const verbatim = r.quote && r.quoteApproval;
  // The reviewer's own photo over their initials, once its file is supplied (partials/reviewer-photo.mjs)
  const photo = reviewerPhoto(r.avatar);
  const title = verbatim ? `“${esc(r.quote)}”` : t ? esc(t.shortTitle) : esc(r.label || 'A private day with Good Times');
  const body = verbatim
    ? `<p class="review__label">In their words</p>`
    : `<p class="review__label">Review summary</p><p class="review__text">${esc(r.summary)}</p>`;
  const top = r.rating ? `<p class="review__source">${stars({ count: r.rating })}<span class="visually-hidden">Rated ${r.rating} out of 5 on Tripadvisor.</span></p>` : `<p class="review__source">${icon('chat')} Tripadvisor review${r.visited ? ` · ${esc(r.visited)}` : ''}</p>`;
  return `<article class="review" data-reveal style="--reveal-i:${i % 4}">
  ${top}
  <h3 class="review__title">${title}</h3>
  ${body}
  <div class="review__head">
    <span class="review__avatar" aria-hidden="true">${esc(initials(r.author))}${photo ? `<img src="${photo}" alt="" width="80" height="80" loading="lazy" decoding="async">` : ''}</span>
    <div>
      <p class="review__author">${esc(r.author)}</p>
      ${meta ? `<p class="review__meta">${esc(meta)}</p>` : ''}
    </div>
  </div>
  <div class="review__foot">
    ${showTour && t ? `<a href="tours/${t.slug}/">${esc(t.shortTitle)}</a>` : showTour && r.service ? `<a href="transfers/#${esc(r.service)}">${esc(r.label)}</a>` : `<span class="muted">Written ${esc(fmtDate(r.written))}</span>`}
    <a class="external" href="${esc(r.url)}" rel="noopener" target="_blank">Read on Tripadvisor<span class="visually-hidden"> (opens in a new tab)</span></a>
  </div>
</article>`;
}

/** Destination card: photo, name, a factual line and the count of tours that go there. */
export function destinationCard(d, { i = 0 } = {}) {
  const n = d.tours.length;
  return `<article class="card" data-reveal style="--reveal-i:${i % 4}">
  <div class="card__media"${focusStyle(d.image)}>${picture({ name: d.image, sizes: '(min-width: 64em) 30vw, (min-width: 40em) 46vw, 92vw' })}</div>
  <div class="card__body">
    <h2 class="card__title"><a href="${esc(d.href)}">${esc(d.name)}</a></h2>
    <p class="card__text">${esc(d.text)}</p>
    <div class="card__foot">
      <span class="price"><span class="price__amount">${n ? `${n} private ${n === 1 ? 'tour' : 'tours'}` : esc(d.countLabel || '')}</span><span class="price__note">${esc(d.note || '')}</span></span>
    </div>
  </div>
</article>`;
}

export { catLabel, themeLabel };
