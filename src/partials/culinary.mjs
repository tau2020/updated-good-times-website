/**
 * The culinary compositions (owner's food photography brief, 24 Oct 2026; design.md §02, §06):
 * three ways a food photograph joins the travel story, each used once on the site.
 *
 *   culinaryReveal  a landscape with a food photograph laid over its corner (home page)
 *   diningDiptych   two photographs side by side, a moment at the table and a plate (Winelands tour)
 *   quietMoment     one plate with room around it (destinations)
 *
 * Every composition is complete without JavaScript: the photographs, words and captions are in
 * place and nothing is hidden by CSS. culinary.js adds the movement (styles: culinary.css).
 * Captions name a place only where the photograph shows it; no wording implies that a meal,
 * a tasting or a restaurant is included in a tour.
 */
import { esc, picture, coverSizes } from './ui.mjs';
import { focusOf } from './media.mjs';

/**
 * The width a frame's photograph is drawn at, for its `sizes` (coverSizes): the picture is 10% taller than its frame (the
 * scroll drift, culinary.css) and it covers the frame, so a landscape photograph in a square or portrait frame is drawn
 * much wider than the frame.
 *   frames: [media condition or '', frame width, frame shape (width / height)] per breakpoint, as in culinary.css
 */
export const frameSizes = (name, frames) => coverSizes(name, frames.map(([media, w, shape]) => [media, w, shape / 1.1]));

const frame = (name, { sizes, focus, ratio, cls = '' }) =>
  `<div class="taste__frame${cls ? ` ${cls}` : ''}" style="--focus: ${focusOf(name, focus)}${ratio ? `; --ratio: ${ratio}` : ''}" data-taste-frame>${picture({ name, sizes })}</div>`;

/** The fine brass line drawn beneath a heading (gold detailing, design.md §02). */
const rule = '<span class="taste__rule" aria-hidden="true" data-taste-rule></span>';

/**
 * The Culinary Reveal: `words` (the caller's mark, heading, line and link) beside a landscape,
 * with a smaller food photograph laid over the landscape's lower corner, and one caption for both.
 */
export function culinaryReveal({ id, words, main, layer, caption }) {
  return `<section class="taste taste--reveal" aria-labelledby="${id}" data-taste="reveal">
  <div class="container taste__grid">
    <div class="taste__words" data-taste-words>
      ${words}
    </div>
    <figure class="taste__stage">
      <div class="taste__main" data-taste-main>${frame(main.name, { sizes: frameSizes(main.name, [['(min-width: 64em)', 'min(58vw, 57rem)', 3 / 2], ['', '100vw', 3 / 2]]), focus: main.focus })}</div>
      <div class="taste__layer" data-taste-layer>${frame(layer.name, { sizes: frameSizes(layer.name, [['(min-width: 64em)', 'min(24vw, 21rem)', 1], ['', '52vw', 1]]), focus: layer.focus })}</div>
      <figcaption class="taste__caption" data-taste-caption>${caption}</figcaption>
    </figure>
  </div>
</section>`;
}

/**
 * The Dining Diptych: a spread. The moment at the table fills the left page; the words and the plate share the
 * right, the plate below the words, so the two photographs settle side by side. Phones stack them in reading order.
 */
export function diningDiptych({ id, eyebrow, title, text, left, right }) {
  return `<section class="section taste taste--diptych lc-scope" aria-labelledby="${id}" data-taste="diptych">
  <div class="container taste__spread">
    <div class="taste__head" data-taste-words>
      <p class="eyebrow">${esc(eyebrow)}</p>
      <h2 id="${id}">${esc(title)}</h2>
      ${rule}
      <p class="taste__text">${text}</p>
    </div>
    <figure class="taste__pane taste__pane--a" data-taste-pane>
      ${frame(left.name, { sizes: frameSizes(left.name, [['(min-width: 64em)', 'min(56vw, 46rem)', 4 / 3], ['', '100vw', 4 / 3]]), focus: left.focus })}
      <figcaption>${esc(left.caption)}</figcaption>
    </figure>
    <figure class="taste__pane taste__pane--b" data-taste-pane>
      ${frame(right.name, { sizes: frameSizes(right.name, [['(min-width: 64em)', '20rem', 4 / 5], ['(min-width: 40em)', '36vw', 4 / 5], ['', '62vw', 4 / 5]]), focus: right.focus })}
      <figcaption>${esc(right.caption)}</figcaption>
    </figure>
  </div>
</section>`;
}

/** The Quiet Culinary Moment: one plate in generous space, a short heading and a line. */
export function quietMoment({ id, eyebrow, title, text, image }) {
  return `<section class="section taste taste--quiet lc-scope" aria-labelledby="${id}" data-taste="quiet">
  <div class="container taste__quiet">
    <figure class="taste__solo" data-taste-main>
      ${frame(image.name, { sizes: frameSizes(image.name, [['(min-width: 48em)', '22rem', 4 / 5], ['', '72vw', 4 / 5]]), focus: image.focus })}
    </figure>
    <div class="taste__words" data-taste-words>
      <p class="eyebrow">${esc(eyebrow)}</p>
      <h2 id="${id}">${esc(title)}</h2>
      ${rule}
      <p class="taste__text">${text}</p>
    </div>
  </div>
</section>`;
}

export { rule as tasteRule };
