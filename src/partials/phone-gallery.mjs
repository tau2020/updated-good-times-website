import { readFileSync } from 'node:fs';
import { esc, renditionsOf } from './ui.mjs';
import { imageByName, creditFor } from '../data/images.mjs';
import { tours } from '../data/tours.mjs';

/**
 * HeroPhoneGallery: an enlarged view of the phone the friends are laughing at in the home hero. Its photo
 * viewer, "Cape Town Memories", swipes through their days out on its own, as if an unseen finger were
 * flicking through them (assets/js/phone-gallery.js, one GSAP timeline). Self-contained: this markup,
 * assets/css/phone-gallery.css and that script, sized from one custom property (--pw, the phone's
 * width) set by whoever places it. It reads and moves nothing outside itself.
 *
 * Data: src/data/phone-gallery.json, the supplied gallery.json (order, caption, the tour each moment
 * belongs to); alt text and renditions come from the image pipeline (src/data/images.mjs).
 *
 * The first photograph is in the HTML with its real sources, so it shows at first paint, before any
 * script. The others carry theirs in data- attributes, attached by the script only when it is about to
 * swipe (motion allowed), so a visitor without JavaScript or with reduced motion loads one photograph.
 * A copy of the first slide closes the track so the loop can reset where nobody can see it. Only the
 * track moves (a transform), clipped by the screen; the phone never moves. The play/pause button stays
 * hidden until the gallery actually moves (WCAG 2.2.2).
 *
 * A click (or tap, or Enter on the phone's Enlarge button) lifts the photograph showing out of the phone
 * and onto the hero, larger, with its place, its tour and its credit (each slide carries them in data-
 * attributes); a click anywhere, Escape or Close puts it back where it came from (GSAP Flip, in the script).
 * The Enlarge button, like the play/pause one, stays hidden until the script that runs it is there.
 */
export const PHONE_GALLERY = JSON.parse(readFileSync(new URL('../data/phone-gallery.json', import.meta.url), 'utf8'));

// A transparent pixel: a valid src for the photographs the script fills in later (img-src allows data:)
const BLANK = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
// The photograph spans the screen: about 0.92 of the phone (--pw in styles.css: 14vw up to 224 px on
// landscape screens, 30vw up to 172 px on portrait ones)
const SIZES = '(max-aspect-ratio: 13/10) min(28vw, 160px), min(13vw, 206px)';

const PIN = '<svg class="phone-gallery__pin" viewBox="0 0 12 16" aria-hidden="true" focusable="false"><path d="M6 15.2s-4.8-4.6-4.8-8.4a4.8 4.8 0 0 1 9.6 0c0 3.8-4.8 8.4-4.8 8.4z" fill="currentColor"/><circle cx="6" cy="6.6" r="1.7" fill="#0b1620" fill-opacity=".55"/></svg>';
// The status bar's signal, Wi-Fi and battery, drawn small and quiet (no notifications, no badges)
const SIGNALS = `<svg class="phone-gallery__signals" viewBox="0 0 52 12" aria-hidden="true" focusable="false" fill="currentColor"><rect x="0" y="8" width="2.6" height="3.6" rx=".7"/><rect x="4" y="6" width="2.6" height="5.6" rx=".7"/><rect x="8" y="3.8" width="2.6" height="7.8" rx=".7"/><rect x="12" y="1.6" width="2.6" height="10" rx=".7"/><path d="M24.5 3.2a8.6 8.6 0 0 1 6 2.4l1.1-1.2a10.2 10.2 0 0 0-14.2 0l1.1 1.2a8.6 8.6 0 0 1 6-2.4zm0 3.3a5.3 5.3 0 0 1 3.7 1.5l1.1-1.2a7 7 0 0 0-9.6 0l1.1 1.2a5.3 5.3 0 0 1 3.7-1.5zm0 3.2a2 2 0 0 0-1.4.6l1.4 1.5 1.4-1.5a2 2 0 0 0-1.4-.6z"/><rect x="34.6" y="1.4" width="15" height="9.4" rx="2.6" fill="none" stroke="currentColor" stroke-opacity=".45" stroke-width="1.1"/><rect x="36.3" y="3.1" width="11.6" height="6" rx="1.4"/><path d="M50.6 4.6v3a1.6 1.6 0 0 0 0-3z" fill-opacity=".45"/></svg>`;
const PAUSE = '<svg class="phone-gallery__icon phone-gallery__icon--pause" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><rect x="4.2" y="3.4" width="2.6" height="9.2" rx=".9" fill="currentColor"/><rect x="9.2" y="3.4" width="2.6" height="9.2" rx=".9" fill="currentColor"/></svg>';
const PLAY = '<svg class="phone-gallery__icon phone-gallery__icon--play" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M5.4 3.6c0-.7.8-1.2 1.4-.8l6 4.4c.5.4.5 1.2 0 1.6l-6 4.4c-.6.4-1.4 0-1.4-.8z" fill="currentColor"/></svg>';

function check(item) {
  const meta = imageByName(item.image);
  const r = renditionsOf(item.image);
  if (!meta || !r) throw new Error(`Phone gallery: no image "${item.image}" (src/data/images.mjs; run npm run images)`);
  if (!r.ambient) throw new Error(`Phone gallery: "${item.image}" has no ambient rendition (set ambient: true and run npm run images)`);
  const tour = tours.find((t) => t.slug === item.tour);
  if (!tour) throw new Error(`Phone gallery: "${item.image}" names an unknown tour "${item.tour}"`);
  return { ...item, alt: meta.alt, r, tourName: tour.shortTitle, tourHref: `tours/${tour.slug}/`, credit: creditFor(item.image) };
}

function photo({ image, alt, r }, defer) {
  const set = (ext) => r.widths.map((w) => `assets/img/${image}-${w}.${ext} ${w}w`).join(', ');
  const attr = defer ? 'data-srcset' : 'srcset';
  const file = `assets/img/${image}-${r.widths[0]}.webp`;
  return `<picture class="phone-gallery__picture">
            <source type="image/avif" ${attr}="${set('avif')}" sizes="${SIZES}">
            <source type="image/webp" ${attr}="${set('webp')}" sizes="${SIZES}">
            <img class="phone-gallery__img" ${defer ? `src="${BLANK}" data-src="${file}"` : `src="${file}"`} alt="${esc(alt)}" width="${r.width}" height="${r.height}" decoding="async">
          </picture>`;
}

function slide(item, i, n, clone = false) {
  const washH = Math.round((72 * item.r.height) / item.r.width);
  const label = `${i + 1} of ${n}: ${item.caption}`;
  const defer = clone || i > 0;
  const wash = `assets/img/${item.image}-ambient.webp`;
  // What the enlarged photograph shows beside it (phone-gallery.js): its place, the tour it belongs to, its credit
  const about = `data-place="${esc(item.caption)}" data-tour="${esc(item.tourName)}" data-tour-href="${esc(item.tourHref)}" data-credit="${esc(item.credit)}"`;
  return `<div class="phone-gallery__slide"${clone ? ' aria-hidden="true" data-phone-clone' : ` role="group" aria-roledescription="slide" aria-label="${esc(label)}"`} ${about} data-phone-slide>
        <img class="phone-gallery__wash" ${defer ? `src="${BLANK}" data-src="${wash}"` : `src="${wash}"`} alt="" width="72" height="${washH}" decoding="async">
        <figure class="phone-gallery__photo">
          ${photo(clone ? { ...item, alt: '' } : item, defer)}
          <figcaption class="phone-gallery__place">${PIN}<span>${esc(item.caption)}</span></figcaption>
        </figure>
      </div>`;
}

export function heroPhoneGallery({ data = PHONE_GALLERY, id = 'phone-gallery' } = {}) {
  const items = data.items.map(check);
  const n = items.length;
  if (n < 2) throw new Error('Phone gallery: needs at least two photographs');
  return `<section class="phone-gallery" id="${id}" data-phone-gallery aria-roledescription="carousel" aria-labelledby="${id}-title" style="--slides: ${n + 1}">
  <div class="phone-gallery__device">
    <span class="phone-gallery__key phone-gallery__key--action" aria-hidden="true"></span>
    <span class="phone-gallery__key phone-gallery__key--up" aria-hidden="true"></span>
    <span class="phone-gallery__key phone-gallery__key--down" aria-hidden="true"></span>
    <span class="phone-gallery__key phone-gallery__key--side" aria-hidden="true"></span>
    <div class="phone-gallery__screen">
      <div class="phone-gallery__status" aria-hidden="true">
        <span class="phone-gallery__clock">9:41</span>
        <span class="phone-gallery__island"></span>
        ${SIGNALS}
      </div>
      <div class="phone-gallery__bar">
        <p class="phone-gallery__title" id="${id}-title">${esc(data.title)}</p>
        <p class="phone-gallery__count" aria-hidden="true"><span data-phone-count>1</span>/${n}</p>
      </div>
      <div class="phone-gallery__viewport">
        <div class="phone-gallery__track" data-phone-track>
      ${items.map((item, i) => slide(item, i, n)).join('\n      ')}
      ${slide(items[0], 0, n, true)}
        </div>
      </div>
      <button class="phone-gallery__open" type="button" data-phone-open aria-haspopup="dialog" aria-label="Enlarge photo 1 of ${n}: ${esc(items[0].caption)}" hidden></button>
      <div class="phone-gallery__foot">
        <span class="phone-gallery__dots" aria-hidden="true">${items.map((_, i) => `<span class="phone-gallery__dot${i ? '' : ' is-active'}" data-phone-dot></span>`).join('')}</span>
        <button class="phone-gallery__toggle" type="button" data-phone-toggle aria-label="Pause the photo gallery" hidden>${PAUSE}${PLAY}</button>
      </div>
      <span class="phone-gallery__home" aria-hidden="true"></span>
    </div>
  </div>
</section>`;
}
