/**
 * The sand journey (home page, between the hero and the first chapter): footprints form in the sand one by one as the
 * page scrolls, then the sand is swept away from a real Good Times photograph of Camps Bay and the Cape Peninsula day
 * it belongs to (assets/js/sand-journey.js, assets/js/motion/sand/, assets/css/motion.css).
 *
 * The markup is the complete static scene: the photograph, its words and the link to the existing tour page, all in
 * HTML. That is what a visitor sees with reduced motion, without JavaScript or WebGL, or if the renderer fails; with
 * motion the sand is a decorative canvas laid over the photograph by the script (aria-hidden, never takes a click),
 * and the words rise in as the sand clears. Every word comes from src/data (the tour's own card line, title and route),
 * the photograph from the approved set (camps-bay-twelve-apostles, docs/RIGHTS_REGISTER.md). It sits just below the fold,
 * so it is fetched at low priority: it must never compete with the hero's poster (the page's largest paint).
 */
import { esc, picture } from './ui.mjs';
import { tours } from '../data/tours.mjs';

export const SAND_TOUR = 'cape-peninsula-private-tour';
export const SAND_IMAGE = 'camps-bay-twelve-apostles';

export function sandJourney() {
  const t = tours.find((x) => x.slug === SAND_TOUR);
  if (!t) throw new Error(`sand-journey: no tour ${SAND_TOUR}`);
  if (!t.intro.join(' ').includes('Camps Bay')) throw new Error('sand-journey: the tour no longer passes Camps Bay; choose its photograph again');
  // The motion layer's sheet (the aircraft's dock and mask, the sand journey) is linked here, below the fold, so the hero
  // never waits for it; the scripts that need it come after it in the document, so they do wait for it
  return `<section class="sand-journey" id="sand-journey" aria-labelledby="sand-journey-title" data-sand-journey>
  <link rel="stylesheet" href="assets/css/motion.css">
  <div class="sand-journey__stage" data-sand-stage>
    <div class="sand-journey__beach">${picture({ name: SAND_IMAGE, alt: '', sizes: '(max-aspect-ratio: 3/2) 150vh, 100vw', fetchpriority: 'low' })}</div>
    <div class="sand-journey__scrim" aria-hidden="true"></div>
    <div class="sand-journey__inner">
      <div class="sand-journey__words" data-sand-words>
        <p class="sand-journey__eyebrow"><span class="sand-journey__rule" aria-hidden="true"></span>Camps Bay, Cape Town</p>
        <h2 class="sand-journey__title" id="sand-journey-title">${esc(t.shortTitle)}</h2>
        <p class="sand-journey__line">${esc(t.card)}</p>
        <a class="btn gt-button gt-button--primary sand-journey__cta" href="tours/${t.slug}/"><span>Explore This Experience</span><span class="visually-hidden">: the ${esc(t.shortTitle)}</span></a>
      </div>
    </div>
    <p class="sand-journey__credit">Camps Bay below the Twelve Apostles · A Good Times photograph</p>
  </div>
</section>`;
}
