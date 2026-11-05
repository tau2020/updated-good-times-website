/**
 * The media system (D66; the specification is design.md at the repository root): the site's photographs as a
 * few components sharing one radius, one overlay and one motion grammar. The carousel is the home page's; the
 * exhibition and its lightbox hang on the home page and in every tour's and package's Gallery tab (D71).
 *
 *   responsiveMedia(...)       a picture() in a frame, cropped on the photograph's recorded focal point
 *   destinationCarousel(...)   04 · one destination featured at a time (behaviour: assets/js/media.js)
 *   photoExhibition(...)       07 · an editorial mosaic of real photographs, each opened in mediaLightbox()
 *   galleryItems(names)        a tour's or package's photographs laid out for photoExhibition(), with their captions
 *   mediaLightbox()            the native <dialog> that shows a photograph whole, with its place, story and credit
 *
 * Styled by assets/css/living-cape.css (section 5, the carousel) and assets/css/media.css (the exhibition and
 * the lightbox), tokens in living-cape-system.css. Every link
 * is a real route. Without JavaScript the carousel is a snapping row of linked cards, already composed
 * with its featured destination, and every print is a plain link to the full photograph.
 */
import { esc, picture, imageFile, imageSize } from './ui.mjs';
import { engraved } from './engraved.mjs';
import { imageByName, creditFor } from '../data/images.mjs';
import { CAPTIONS } from '../data/photo-captions.mjs';

const pad2 = (n) => String(n).padStart(2, '0');
export const focusOf = (name, focus) => focus || imageByName(name)?.focus || '50% 50%';

/** ResponsiveMedia: a picture() inside a frame element, on the image's focal point unless the placement refines it. */
export function responsiveMedia({ name, alt, sizes, focus, cls = '', tag = 'span', attrs = '' }) {
  return `<${tag} class="${cls}" style="--focus: ${focusOf(name, focus)}"${attrs ? ` ${attrs}` : ''}>${picture({ name, alt, sizes })}</${tag}>`;
}

/** Any card can become the featured one, so every card asks for the featured size. */
const CARD_SIZES = '(min-width: 75em) 38.75rem, (min-width: 48em) 55vw, 84vw';

/**
 * DestinationCarousel (design.md §04). `slides` are DestinationSlide records: { id, title, description,
 * metaLabel, metaSpoken, href, linkLabel, icon, image, focus }. `initial` is the featured card in the
 * markup, so the composition is finished before any script runs (no layout shift when it does).
 *
 * Each card is an <article> with one link, its name (named in full for assistive technology, e.g.
 * "Explore Cape Peninsula private tours"); the round arrow belongs to that link. A click elsewhere on a
 * card only selects it (media.js), so a card is never a clickable <div> standing in for a link.
 */
export function destinationCarousel({ heading, slides, initial = 0, foot = '', label = 'Destinations' }) {
  const n = slides.length;
  const card = (s, i) => {
    const on = i === initial;
    const spoken = s.metaSpoken ? `<span aria-hidden="true">${esc(s.metaLabel)}</span><span class="visually-hidden">${esc(s.metaSpoken)}</span>` : `<span>${esc(s.metaLabel)}</span>`;
    return `<li class="lc-film__item${on ? ' is-active' : ''}" data-film-item data-film-label="${esc(`${s.title}, ${s.metaSpoken || s.metaLabel}`)}"${on ? ' aria-current="true"' : ''}>
        <article class="lc-film__card">
          <div class="lc-film__media"><div class="lc-film__drift" data-film-drift style="--focus: ${focusOf(s.image, s.focus)}">${picture({ name: s.image, sizes: CARD_SIZES })}</div></div>
          <div class="lc-film__shade" aria-hidden="true"></div>
          <p class="lc-film__num" aria-hidden="true">${pad2(i + 1)}</p>
          <div class="lc-film__copy">
            <h3 class="lc-film__name"><a href="${esc(s.href)}" aria-label="${esc(s.linkLabel)}" draggable="false"><span class="lc-film__mask"><span class="lc-film__title" data-film-reveal>${esc(s.title)}</span></span></a></h3>
            <p class="lc-film__line" data-film-reveal>${esc(s.description)}</p>
            <p class="lc-film__meta" data-film-reveal>${engraved(s.icon)}${spoken}</p>
          </div>
        </article>
      </li>`;
  };
  return `<div class="container lc-film__head">
    <div class="lc-film__intro">${heading}</div>
    <div class="lc-film__nav" data-film-controls hidden>
      <p class="lc-film__count" aria-hidden="true"><span data-film-current>${pad2(initial + 1)}</span><span class="lc-film__count-rule"></span><span>${pad2(n)}</span></p>
      <span class="lc-film__progress" aria-hidden="true"><span data-film-progress style="transform: scaleX(${((initial + 1) / n).toFixed(4)})"></span></span>
      <button class="gt-button gt-button--utility lc-film__arrow" type="button" data-film-prev aria-controls="film-track">Previous<span class="visually-hidden"> destination</span></button>
      <button class="gt-button gt-button--utility lc-film__arrow" type="button" data-film-next aria-controls="film-track">Next<span class="visually-hidden"> destination</span></button>
    </div>
  </div>
  <div class="lc-film__viewport" data-film-viewport role="region" aria-roledescription="carousel" aria-label="${esc(label)}">
    <ol class="lc-film__track" id="film-track" role="list" data-film-track>
      ${slides.map(card).join('\n      ')}
    </ol>
  </div>
  <div class="container lc-film__rail">
    <p class="lc-film__hint" data-film-hint hidden><span class="lc-film__hint-drag">Drag to explore</span><span class="lc-film__hint-swipe">Swipe to explore</span></p>
    <span class="lc-film__scroll" aria-hidden="true" data-film-scrollbar hidden><span data-film-thumb></span></span>
    <div class="lc-film__foot">${foot}</div>
  </div>
  <span class="lc-film__probe" aria-hidden="true" data-film-probe><span></span><span></span></span>
  <p class="visually-hidden" aria-live="polite" data-film-status></p>`;
}

/**
 * PhotoExhibition (design.md §05): the prints in reading order on an explicit grid. Each item's `tile`
 * places it at three widths, `{ lg: [span of 12, ratio], md: [span of 2, ratio], sm: [span of 2, ratio] }`.
 * From 64em a ratio of 'auto' stretches the print to its row, whose height the row's one stated ratio
 * sets, so every row is flush however the gutters fall. The label names the photograph's place on hover
 * and focus; the link's accessible name carries it always. `sizes` (a print's tile to its sizes attribute)
 * suits a wall narrower than the page's container; `cls` adds classes to the wall.
 */
export function photoExhibition({ items, sizes: sizesOf, cls = '' }) {
  const n = items.length;
  const vars = ({ lg, md, sm }) =>
    `--lg-span: ${lg[0]}; --lg-ratio: ${lg[1]}; --md-span: ${md[0]}; --md-ratio: ${md[1]}; --sm-span: ${sm[0]}; --sm-ratio: ${sm[1]}`;
  // The rendition the browser picks follows the print's width at each layout
  const sizes =
    sizesOf ||
    (({ lg, md, sm }) =>
      `(min-width: 90em) ${Math.round((lg[0] / 12) * 1320)}px, (min-width: 64em) ${Math.round((lg[0] / 12) * 92)}vw, (min-width: 40em) ${md[0] === 2 ? 92 : 46}vw, ${sm[0] === 2 ? 92 : 46}vw`);
  return `<ol class="lc-gallery__wall${cls ? ` ${cls}` : ''}" role="list" data-lc-gallery>
      ${items
        .map(
          (g, i) => `<li class="lc-gallery__item"${g.role ? ` data-role="${g.role}"` : ''} style="${vars(g.tile)}">
        <a class="lc-print" href="${imageFile(g.name)}" data-lc-open="${i}" aria-haspopup="dialog" aria-label="${esc(`View photograph ${i + 1} of ${n}: ${g.title}`)}">
          <span class="lc-print__frame" data-flip-id="lc-print-${i}" style="--focus: ${focusOf(g.name, g.focus)}">${picture({ name: g.name, sizes: sizes(g.tile) })}</span>
          <span class="lc-print__shade" aria-hidden="true"></span>
          <span class="lc-print__label" aria-hidden="true"><span class="lc-print__index">${pad2(i + 1)}</span>${esc(g.title)}</span>
          <span class="lc-print__open" aria-hidden="true">${engraved('expand')}</span>
        </a>
      </li>`,
        )
        .join('\n      ')}
    </ol>`;
}

/**
 * A tour's or package's photographs as an exhibition (D71, design.md §05): two to six prints in reading order, the
 * first (the tour's own photograph) the feature. From 64em an odd count opens with the feature across the wall;
 * the rest hang in pairs on the 12-column grid, one print stating the row's ratio and the other stretching to it,
 * so a portrait always takes the narrow place (3:4 beside a 3:2 landscape), two portraits share a row at 4:5 and
 * two landscapes alternate 7 + 5 and 5 + 7. A portrait sits right in one row and left in the next (the pair is
 * read, and stepped through in the lightbox, in that order); the feature always comes first. Below 64em the feature spans both columns and each pair sits side by
 * side at one shared ratio. Each print carries its caption (photo-captions.mjs); a photograph without one stops
 * the build, so no gallery photograph is ever shown unnamed.
 */
export function galleryItems(names) {
  const tall = (name) => {
    const { width, height } = imageSize(name);
    return height > width;
  };
  const items = [];
  let rest = names;
  if (names.length % 2) {
    const { width, height } = imageSize(names[0]);
    const wide = width / height >= 1.8 ? '2 / 1' : '16 / 9';
    items.push({ name: names[0], tile: { lg: [12, wide], md: [2, wide], sm: [2, '3 / 2'] } });
    rest = names.slice(1);
  }
  for (let i = 0; i < rest.length; i += 2) {
    const row = i / 2;
    let [a, b] = [rest[i], rest[i + 1]];
    // A mixed pair turns round on every other row, unless it holds the feature (an even count's first row)
    if (tall(a) !== tall(b) && (tall(a) ? row % 2 === 0 : row % 2 === 1) && !(row === 0 && rest === names)) [a, b] = [b, a];
    const [ta, tb] = [tall(a), tall(b)];
    let lg;
    if (ta && tb) lg = [[6, '4 / 5'], [6, 'auto']];
    else if (ta) lg = [[4, 'auto'], [8, '3 / 2']];
    else if (tb) lg = [[8, '3 / 2'], [4, 'auto']];
    else lg = row % 2 ? [[5, 'auto'], [7, '3 / 2']] : [[7, '3 / 2'], [5, 'auto']];
    const md = ta && tb ? '4 / 5' : ta || tb ? '1' : '4 / 3';
    const sm = ta && tb ? '4 / 5' : '1';
    items.push({ name: a, tile: { lg: lg[0], md: [1, md], sm: [1, sm] } }, { name: b, tile: { lg: lg[1], md: [1, md], sm: [1, sm] } });
  }
  return items.map((it) => {
    const caption = CAPTIONS[it.name];
    if (!caption) throw new Error(`No gallery caption for the photograph "${it.name}" (src/data/photo-captions.mjs)`);
    return { ...it, title: caption.title, place: caption.place };
  });
}

/** A print's sizes in a tour's or package's Gallery tab: the panel is about 7/11 of the container from 64em (.detail) */
export const gallerySizes = ({ lg, md, sm }) =>
  `(min-width: 90em) ${Math.round((lg[0] / 12) * 800)}px, (min-width: 64em) ${Math.round((lg[0] / 12) * 58)}vw, (min-width: 40em) ${md[0] === 2 ? 92 : 46}vw, ${sm[0] === 2 ? 92 : 46}vw`;

/** What a page with an exhibition loads besides the shared sheets: the wall and lightbox styles and their behaviour */
export const GALLERY_ASSETS = {
  styles: ['assets/css/media.css'],
  scripts: ['assets/js/vendor/ScrollTrigger.min.js', 'assets/js/vendor/Flip.min.js', 'assets/js/media.js'],
};

/**
 * MediaLightbox (design.md §05): a native modal <dialog> (focus held inside, Escape, the page inert
 * behind it). media.js fills it from the JSON beside it: the photograph whole (its own proportions,
 * never cropped), "03 / 10", the title, place and story, the credit from the photograph's recorded
 * origin with the site's photo credits, and the private day it belongs to. The story and the day are left out
 * where an item has none (a tour's own gallery needs no link back to itself).
 */
export function mediaLightbox({ items }) {
  const data = items.map((g) => ({ title: g.title, place: g.place, story: g.story, href: g.href, link: g.link, alt: imageByName(g.name).alt, credit: creditFor(g.name) }));
  return `<dialog class="lc-lightbox lc-scope lc-dark" data-lc-lightbox aria-labelledby="lc-lightbox-title">
    <div class="lc-lightbox__inner">
      <div class="lc-lightbox__stage" data-lc-stage>
        <span class="lc-lightbox__frame" data-lc-frame></span>
      </div>
      <div class="lc-lightbox__info" data-lc-info>
        <p class="lc-lightbox__count" data-lc-count></p>
        <h2 class="lc-lightbox__title" id="lc-lightbox-title" data-lc-title></h2>
        <p class="lc-lightbox__place" data-lc-place></p>
        <p class="lc-lightbox__story" data-lc-story></p>
        <p class="lc-lightbox__credit"><span data-lc-credit></span> · <a href="privacy/#credits">Photo credits</a></p>
        <a class="gt-button gt-button--tertiary gt-button--on-dark lc-note lc-note--light lc-lightbox__link" data-lc-link href="tours/"><span class="lc-note__label" data-lc-link-label></span></a>
      </div>
      <div class="lc-lightbox__controls">
        <button class="gt-button gt-button--utility gt-button--on-dark lc-lightbox__step" type="button" data-lc-prev>Previous<span class="visually-hidden"> photograph</span></button>
        <button class="gt-button gt-button--utility gt-button--on-dark lc-lightbox__step" type="button" data-lc-next>Next<span class="visually-hidden"> photograph</span></button>
        <button class="lc-round lc-round--light lc-lightbox__close" type="button" data-lc-close aria-label="Close the photograph">${engraved('close')}</button>
      </div>
    </div>
  </dialog>
  <script type="application/json" data-lc-gallery-data>${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
}
