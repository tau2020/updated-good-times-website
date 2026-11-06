/**
 * The sand journey (home page, between the hero and the first chapter): footprints form in the sand one by one as the
 * page scrolls, then the sand is swept away from the destination of that same walk: the owner's image of a woman
 * standing at the water's edge, the last four of those footprints behind her (assets/js/sand-journey.js,
 * assets/js/motion/sand/, assets/css/motion.css). The animated trail ends exactly on the image's own prints.
 *
 * The markup is the complete static scene: the image, the words and the link to the existing Cape Peninsula tour page,
 * all in HTML. That is what a visitor sees with reduced motion, without JavaScript or WebGL, or if the renderer fails;
 * with motion the sand is a decorative canvas laid over the image by the script (aria-hidden, never takes a click), and
 * the words rise in, one after another, as the sand clears. On wide screens the headline sits in the sand above the
 * trail (upper left) and the line and the link in the sand below it (lower left), so neither covers a footprint, the
 * woman or the sea; portrait screens put them under the image, phones on their side beside it (motion.css). The words are the owner's (6 Nov 2026); the image is an
 * AI-generated illustration the owner supplied (basis G in docs/RIGHTS_REGISTER.md), credited as such beside it. It
 * sits just below the fold, so it is fetched at low priority: it must never compete with the hero's poster.
 */
import { esc, picture } from './ui.mjs';
import { tours } from '../data/tours.mjs';
import { creditFor } from '../data/images.mjs';

export const SAND_TOUR = 'cape-peninsula-private-tour';
export const SAND_IMAGE = 'ocean-footprints-reveal';
export const SAND_WORDS = {
  eyebrow: 'Cape Peninsula · Coastal Journey',
  title: 'Look Where Your Footsteps Led.',
  line: 'One private journey. Breathtaking coastlines, penguins, and unforgettable Cape Town moments.',
  cta: 'Explore the Cape Peninsula Tour',
};

export function sandJourney() {
  const t = tours.find((x) => x.slug === SAND_TOUR);
  if (!t) throw new Error(`sand-journey: no tour ${SAND_TOUR}`);
  const w = SAND_WORDS;
  // Wide screens: the image covers the stage (as wide as the screen, or as wide as 1.78 × its height); portrait: a
  // frame whose image is 1.78 × as wide as the screen
  const sizes = '(max-aspect-ratio: 1/1) 178vw, (max-aspect-ratio: 16/9) 178vh, 100vw';
  // The motion layer's sheet (the aircraft's dock and mask, the sand journey) is linked here, below the fold, so the hero
  // never waits for it; the scripts that need it come after it in the document, so they do wait for it
  return `<section class="sand-journey" id="sand-journey" aria-labelledby="sand-journey-title" data-sand-journey>
  <link rel="stylesheet" href="assets/css/motion.css">
  <div class="sand-journey__stage" data-sand-stage>
    <div class="sand-journey__beach" data-sand-photo>${picture({ name: SAND_IMAGE, sizes, fetchpriority: 'low' })}</div>
    <div class="sand-journey__words" data-sand-words>
      <div class="sand-journey__head">
        <p class="sand-journey__eyebrow">${esc(w.eyebrow)}</p>
        <h2 class="sand-journey__title" id="sand-journey-title">${esc(w.title)}</h2>
      </div>
      <div class="sand-journey__foot">
        <p class="sand-journey__line">${esc(w.line)}</p>
        <a class="btn gt-button gt-button--primary sand-journey__cta" href="tours/${t.slug}/"><span>${esc(w.cta)}</span></a>
      </div>
    </div>
    <p class="sand-journey__credit">${esc(creditFor(SAND_IMAGE))}</p>
  </div>
</section>`;
}
