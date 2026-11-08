import { esc, picture, preloadFor, coverSizes, stars } from '../partials/ui.mjs';
import { engraved } from '../partials/engraved.mjs';
import { sunSeal, travelNote, quietOutline, chapterMark, SERVICES } from '../partials/living-cape.mjs';
import { destinationCarousel, photoExhibition, mediaLightbox, focusOf } from '../partials/media.mjs';
import { culinaryReveal, tasteRule } from '../partials/culinary.mjs';
import { licensedCredit } from '../partials/cards.mjs';
import { heroPhoneGallery } from '../partials/phone-gallery.mjs';
import { heroServices } from '../partials/hero-services.mjs';
import { sandJourney } from '../partials/sand-journey.mjs';
import { imageByName, creditFor } from '../data/images.mjs';
import { tours, destinations } from '../data/tours.mjs';
import { services } from '../data/transfers.mjs';
import { fromLine } from '../data/pricing.mjs';
import { THEMES, proof, eligibleTestimonials } from '../data/reputation.mjs';
import { scenicLayer } from '../partials/scenic.mjs';
import { credentialsStrip } from '../partials/credentials.mjs';

const tour = (slug) => tours.find((t) => t.slug === slug);
const tourHref = (slug) => `tours/${tour(slug).slug}/`;
const PENINSULA = 'cape-peninsula-private-tour';
const CITY = 'cape-town-city-private-tour';
const WINELANDS = 'cape-winelands-private-tour';
const TOWNSHIP = 'township-private-tour';
const airport = services.find((s) => s.id === 'airport');

/**
 * The home page: "The Cape, A Living Story". The hero, then eleven chapters and one interlude:
 * wonder → discovery → adventure → human connection → trust → desire → booking.
 * Every fact comes from src/data (the official tour pages, the company's own About and Safety
 * pages, the review research); people in photographs are never named.
 */

/** 01 · The Cape Peninsula, continued: the owner's guest photograph from the lookout above Hout Bay (images.mjs), shown
    whole in its own 9:16 shape. Its caption names the place, never the people (nobody is named or tied to a review). */
const MEMORY = { name: 'chapmans-lookout-travellers', place: 'Chapman’s Peak Drive, above Hout Bay' };

/** 02 · The moments between destinations: four stops along Good Times days (captions by place, nobody named). */
const MOMENTS = [
  { key: 'a', name: 'muizenberg-huts-guests', focus: '50% 56%', caption: 'Muizenberg’s bathing huts', sizes: '(min-width: 64em) min(52vw, 46rem), 100vw', depth: 0 },
  { key: 'b', name: 'above-the-bay-selfie', focus: '36% 62%', caption: 'A selfie above the bay', sizes: '(min-width: 64em) min(26vw, 23rem), 60vw', depth: -1 },
  // The goats at Fairview left at the owner's request (brief of 6 Nov 2026, §2.1): the owner's own replacement, a guide and
  // two guests at a Peninsula lookout ("replace-goats-on-home-page", traveller 106), whole in the same 4:3 frame
  { key: 'c', name: 'guide-selfie-peninsula', focus: '50% 50%', ratio: '4 / 3', caption: 'With our guide, high above the Peninsula', sizes: '(min-width: 64em) min(30vw, 27rem), 100vw', depth: 1 },
  { key: 'd', name: 'cape-of-good-hope-sign', focus: '56% 58%', caption: 'At the Cape of Good Hope', sizes: '(min-width: 64em) min(22vw, 19rem), 48vw', depth: -1 },
];

/**
 * 04 · The destination carousel: the six destinations (names, lines, links and photographs from tours.mjs) as
 * DestinationSlide records, each framed by the destination's own photograph (focal points in images.mjs), the one
 * its destinations-page card shows. The label counts private tours to choose from, never a duration.
 */
const FILM = [{ id: 'peninsula' }, { id: 'city' }, { id: 'langa' }, { id: 'winelands' }, { id: 'overberg' }, { id: 'garden-route' }];
const SLIDES = FILM.map((f) => {
  const d = destinations.find((x) => x.id === f.id);
  const count = d.tours.length;
  // In running text a leading "The" reads lower case ("the private tours to the Cape Peninsula").
  const inText = d.name.replace(/^The /, 'the ');
  return {
    id: d.id,
    title: d.name,
    description: d.text,
    href: d.href,
    image: d.image,
    metaLabel: count ? `${count} private ${count === 1 ? 'tour' : 'tours'}` : d.countLabel || 'Private tour',
    metaSpoken: count ? `${count} private ${count === 1 ? 'tour' : 'tours'} to choose from` : '',
    linkLabel: count > 1 ? `Explore the private tours to ${inText}` : count === 1 ? `Explore the private tour to ${inText}` : `Explore the ${d.name.replace(/^The /, '')} multi-day tour`,
    icon: count ? 'compass' : 'directions',
  };
});

/** 05 · Your journey, your way: the practical facts under each service's photograph (all from the official site). */
const WAYS = {
  tours: ['Pickup from your accommodation', 'Only your group and your guide'],
  airport: ['Meet and greet with a name board', fromLine(airport.price)],
  adventure: ['Quad biking, skydiving, shark cage diving', 'Priced on enquiry, by season and package'],
  journey: ['A day planned around you', 'Or the Garden Route over three days or more'],
};

/**
 * 07 · The living travel exhibition: twelve Good Times photographs, each with its place, a line and the
 * day it belongs to, hung as an editorial mosaic in reading order. `tile` places each print (photoExhibition in
 * media.mjs): from 64em five rows of a 12-column grid, two columns below. `role` sets how each print enters
 * (media.js). Every crop keeps its subject (focal points in images.mjs); the lightbox shows each photograph whole.
 */
const GALLERY = [
  { name: 'boulders-shadows', role: 'wide', tile: { lg: [8, '3 / 2'], md: [2, '16 / 10'], sm: [2, '4 / 3'] }, title: 'Watching the penguins', place: 'Boulders Beach, Simon’s Town', story: 'Shadows from the boardwalk fall across the sand at the edge of the colony, one of the last stops of a Peninsula day.', href: tourHref(PENINSULA), link: 'Cape Peninsula Private Tour' },
  { name: 'muizenberg-huts', role: 'wide', tile: { lg: [4, 'auto'], md: [1, '1'], sm: [1, '4 / 5'] }, title: 'The bathing huts at Muizenberg', place: 'Muizenberg Beach', story: 'Colourful huts and surfers on the way home along False Bay.', href: tourHref(PENINSULA), link: 'Cape Peninsula Private Tour' },
  { name: 'cape-minstrels', role: 'wide', tile: { lg: [5, 'auto'], md: [1, '1'], sm: [1, '4 / 5'] }, title: 'The Cape Minstrels', place: 'Cape Town', story: 'Music and colour in the streets, met by chance on a city day. The minstrels parade when they choose: a sight like this is luck, never a promise.', href: tourHref(CITY), link: 'Cape Town City Private Tour' },
  { name: 'mandela-statue-drakenstein', tile: { lg: [3, '3 / 4'], md: [1, '1'], sm: [1, '4 / 5'] }, title: 'The statue of Nelson Mandela', place: 'Drakenstein Correctional Centre', story: 'On the road to the Winelands, outside the prison from which he walked free in 1990.', href: tourHref(WINELANDS), link: 'Cape Winelands Private Tour' },
  { name: 'city-heritage-plaque', tile: { lg: [4, 'auto'], md: [1, '1'], sm: [1, '4 / 5'] }, title: 'Reading the city’s history', place: 'Central Cape Town', story: 'Parliament, the Company’s Garden and Greenmarket Square: the city’s story, read on its own streets.', href: tourHref(CITY), link: 'Cape Town City Private Tour' },
  { name: 'cape-point-aloes', role: 'wide', tile: { lg: [7, '2 / 1'], md: [2, '2 / 1'], sm: [2, '2 / 1'] }, title: 'Aloes above the sea', place: 'The Cape Peninsula', story: 'Fynbos and aloes on the cliffs on the way to Cape Point.', href: tourHref(PENINSULA), link: 'Cape Peninsula Private Tour' },
  { name: 'burger-lunch-guide', role: 'food', tile: { lg: [5, 'auto'], md: [1, '4 / 3'], sm: [1, '1'] }, title: 'Lunch with our guide', place: '', story: 'Lunch is never part of a tour’s price: we stop wherever you would like to eat, and you pay on the day.', href: 'tours/', link: 'All private tours' },
  { name: 'cape-point-zebra', role: 'wide', tile: { lg: [3, 'auto'], md: [1, '4 / 3'], sm: [1, '1'] }, title: 'A zebra on the road', place: 'The Cape Peninsula', story: 'Zebra, eland and ostriches live in the reserve around Cape Point. Sightings like this are luck, never a promise.', href: tourHref(PENINSULA), link: 'Cape Peninsula Private Tour' },
  { name: 'lunch-spread-guests', role: 'wide', tile: { lg: [6, '3 / 2'], md: [1, '4 / 3'], sm: [1, '4 / 3'] }, title: 'Lunch in the sun', place: '', story: 'A long lunch on a terrace between the sights, wherever you choose to stop.', href: 'tours/', link: 'All private tours' },
  { name: 'winelands-couple-tasting', tile: { lg: [3, 'auto'], md: [1, '4 / 3'], sm: [1, '4 / 3'] }, title: 'A tasting for two', place: 'The Cape Winelands', story: 'A tasting in an estate’s tasting room; tasting fees are paid on the day, so you choose what to try.', href: tourHref(WINELANDS), link: 'Cape Winelands Private Tour' },
  { name: 'langa-home-visit', role: 'table', tile: { lg: [7, '3 / 2'], md: [1, '4 / 3'], sm: [1, '4 / 3'] }, title: 'Welcomed into a home', place: 'Langa, Cape Town', story: 'Guests welcomed into a family’s home on a day in Langa. A visit like this depends on who is home: it is never part of the plan we promise.', href: tourHref(TOWNSHIP), link: 'Township Private Tour' },
  { name: 'winelands-red-tasting', role: 'wine', tile: { lg: [5, 'auto'], md: [1, '4 / 3'], sm: [1, '4 / 3'] }, title: 'A glass of red', place: 'The Cape Winelands', story: 'Red wine at a tasting on a Winelands day.', href: tourHref(WINELANDS), link: 'Cape Winelands Private Tour' },
];

/**
 * 09 · Guest voices (the owner's brief of 8 Nov 2026, §§ C–E; docs/enhancement/03-reputation.md): one social-proof
 * chapter in three registers. The listing's proof beside the heading (Tripadvisor's rating and number of reviews, from
 * the one place they are kept, site.tripadvisor; no date; linked to the listing), then a feature postcard and two
 * staggered notes: the three things reviewers write about most, in our own words (data/reputation.mjs THEMES, labelled
 * as such, never as reviews: no names, stars or quotation marks), and last a quiet ribbon with the Google profile's own
 * figure, kept apart. A guest's own words appear only from the testimonial registry, approved and permitted
 * (eligibleTestimonials, none today). The postcard's photograph is a Good Times one, shown whole and captioned as what
 * it is; nobody in it is presented as a reviewer. The sea behind the chapter's edge is a scenic plane (scenic.mjs).
 */
const VOICE_ICONS = { stories: 'cape-route', flexible: 'cape-compass' };
const external = '<svg class="voices-ext" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M13.6 4.4h6v6M19.6 4.4L11 13"/><path d="M17.4 13.6v4.9a1.1 1.1 0 0 1-1.1 1.1H5.5a1.1 1.1 0 0 1-1.1-1.1V7.7a1.1 1.1 0 0 1 1.1-1.1h4.9"/></svg>';
const NEW_TAB = '<span class="visually-hidden"> (opens in a new tab)</span>';

function voicesSection(site) {
  const { tripadvisor: ta, google } = proof();
  const [feature, ...notes] = THEMES;
  const listing = esc(ta.url);
  const quotes = eligibleTestimonials();
  return `<section class="voices gt-scenic-host" id="reviews" aria-labelledby="voices-title">
  ${scenicLayer('voices')}
  <div class="container voices__inner">
    <div class="voices__head">
      <div class="voices__intro">
        ${chapterMark(9, 'The people behind the good times', 'voices__eyebrow')}
        <h2 class="lc-title voices__title" id="voices-title">Good times, <em>by the people who had them.</em></h2>
        <p class="lc-lead voices__lead">Don’t just take our word for it. Travellers have written hundreds of reviews of their days with us; these are the three things they mention most, in our own words, and every review is a tap away.</p>
      </div>
      <aside class="voices-proof gt-scenic-glass" aria-labelledby="voices-proof-title" data-voice>
        <div class="voices-proof__score">
          <p class="voices-proof__platform">Tripadvisor</p>
          <p class="voices-proof__numeral" aria-hidden="true">${ta.rating.toFixed(1)}</p>
          ${stars()}
        </div>
        <div class="voices-proof__story">
          <h3 class="voices-proof__title" id="voices-proof-title">The reviews speak for themselves.</h3>
          <p class="voices-proof__fact"><strong>${ta.rating.toFixed(1)}</strong> out of 5 on Tripadvisor</p>
          <p class="voices-proof__fact voices-proof__fact--count"><strong>${ta.reviewCount}</strong> traveller reviews</p>
          <a class="btn gt-button gt-button--primary voices-proof__cta" href="${listing}" target="_blank" rel="noopener noreferrer"><span>Read our reviews</span><span class="visually-hidden"> on Tripadvisor</span>${NEW_TAB}</a>
        </div>
      </aside>
    </div>
    <div class="voices__chapter">
      <article class="voices-postcard gt-scenic-glass" aria-labelledby="voice-${feature.id}" data-voice>
        <div class="voices-postcard__inner">
        <figure class="voices-postcard__photo">
          <div class="voices-postcard__frame">${picture({ name: 'airport-departures-wave', sizes: '(min-width: 64em) min(30vw, 27rem), (min-width: 48em) 46vw, 92vw' })}</div>
          <figcaption>Waving goodbye at Cape Town International · A Good Times photograph</figcaption>
        </figure>
        <div class="voices-postcard__words">
          <span class="voices-postcard__stamp" aria-hidden="true">${engraved('sun-seal')}</span>
          <p class="voices-label">In our words</p>
          <h3 class="voices-postcard__title" id="voice-${feature.id}">${esc(feature.title)}</h3>
          <p class="voices-postcard__text">${esc(feature.text)}</p>
        </div>
        </div>
      </article>
      <div class="voices__notes">
        ${notes
          .map(
            (t, i) => `<article class="voices-note voices-note--${i ? 'b' : 'a'} gt-scenic-glass" aria-labelledby="voice-${t.id}" data-voice>
          <span class="voices-note__mark" aria-hidden="true">${engraved(VOICE_ICONS[t.id] || 'sun-seal')}</span>
          <p class="voices-label">In our words</p>
          <h3 class="voices-note__title" id="voice-${t.id}">${esc(t.title)}</h3>
          <p class="voices-note__text">${esc(t.text)}</p>
        </article>`,
          )
          .join('\n        ')}
      </div>
    </div>
    ${
      quotes.length
        ? `<ul class="voices__quotes" role="list">${quotes
            .map((q) => `<li><figure class="voices-quote gt-scenic-glass" data-voice><blockquote cite="${esc(q.source_url)}"><p>“${esc(q.actual_verbatim_excerpt)}”</p></blockquote><figcaption>${esc(q.reviewer_display_name)} · <a href="${esc(q.source_url)}" target="_blank" rel="noopener noreferrer">on ${esc(q.platform)}<span class="visually-hidden">, written ${esc(q.date)}</span>${NEW_TAB}</a></figcaption></figure></li>`)
            .join('')}</ul>`
        : ''
    }
    <div class="voices-ribbon" data-voice>
      ${google ? `<a class="voices-ribbon__proof" href="${esc(google.url)}" target="_blank" rel="noopener noreferrer">Google: ${google.rating.toFixed(1)} out of 5 from ${google.reviewCount} reviews${NEW_TAB}${external}</a>` : ''}
      <p class="voices-ribbon__note">The three themes are our own summary of what reviewers write most often, not their words. The ratings are each platform’s own, never added together.</p>
    </div>
  </div>
</section>`;
}

/** The width a full-bleed scene's photograph is drawn at: the scene's height (living-cape.css .lc-scene) and the drift's
    7% each way, so a phone's tall scene gets a file wide enough for its crop (coverSizes) */
const sceneSizes = (name) =>
  coverSizes(name, [
    ['(max-width: 47.99em)', '100vw', 'calc(1.14 * clamp(32rem, 88vh, 46rem))'],
    ['', '100vw', 'calc(1.14 * clamp(34rem, 94vh, 60rem))'],
  ]);
/** The adventure chapter's photographs fill a sticky screen (living-cape.css .lc-wild__media) */
const wildSizes = (name) => coverSizes(name, [['', '100vw', '100vh']]);

/** A full-bleed scene (ScenicBackdrop): the photograph moves a little slower than the page; the words sit where the picture leaves room. */
function scene({ id, cls, image, focus, focusTall, mark, title, line, action, credit, eager = false }) {
  return `<section class="lc-scene ${cls} lc-dark" aria-labelledby="${id}" style="--focus: ${focus}; --focus-tall: ${focusTall}" data-scene>
  <div class="lc-scene__media" aria-hidden="true"><div class="lc-scene__drift" data-scene-drift>${picture({ name: image, alt: '', sizes: sceneSizes(image), eager })}</div></div>
  <div class="lc-scene__scrim" aria-hidden="true"></div>
  <div class="container lc-scene__inner">
    <div class="lc-scene__words" data-scene-words>
      ${mark}
      <h2 class="lc-statement lc-statement--scene" id="${id}">${title}</h2>
      ${line ? `<p class="lc-scene__line">${line}</p>` : ''}
      ${action || ''}
    </div>
  </div>
  <p class="lc-scene__credit">${credit}</p>
</section>`;
}

/* The airport way's journey motif ("from arrival to adventure", design/motion-bible.md §6): a fine route from the
   airport (an open point) to the stay (a closed one), drawn as the card arrives; decoration only */
const ROUTE = `<svg class="lc-way__route" viewBox="0 0 160 14" aria-hidden="true" focusable="false"><circle class="lc-way__route-from" cx="6" cy="7" r="3.4"/><path class="lc-way__route-line" pathLength="1" d="M12 7C42 1.5 76 12.5 110 7S144 3.5 148 7"/><circle class="lc-way__route-to" cx="154" cy="7" r="3.4"/></svg>`;

export const page = {
  path: 'index.html',
  nav: null,
  title: 'Good Times in Cape Town',
  description:
    'Private, guide-led tours of Cape Town since 2014: the Cape Peninsula and Cape Point, the city and Langa, the Winelands, whale watching, adventures, the Garden Route and airport transfers. Send a booking request for a quote.',
  overlayHeader: true,
  // The logo's airliner flies in and lands as the "i" of "in" (partials/aircraft.mjs, assets/js/brand-plane.js)
  brandFlight: true,
  bodyClass: 'home',
  // The hero's held frame is the first paint (one 16:9 rendition set for every screen; the crop is CSS).
  preload: [preloadFor('hero-moment-poster')],
  // The Living Cape chapters have their own sheet, loaded after styles.css and the system sheet, scoped to .living-cape.
  // The hero's phone gallery has its own sheet and script (HeroPhoneGallery, partials/phone-gallery.mjs), and so do its
  // services (HeroServices, partials/hero-services.mjs; their entrance is part of hero.js).
  styles: ['assets/css/phone-gallery.css', 'assets/css/hero-services.css', 'assets/css/living-cape.css', 'assets/css/media.css', 'assets/css/culinary.css', 'assets/css/scenic.css', 'assets/css/voices.css'],
  // GSAP core comes with every page (the concierge, layout.mjs). Here: ScrollTrigger, Flip and MotionPathPlugin, and
  // CustomEase and SplitText for the Cape Peninsula entrance and the leaf's unfurl (GSAP 3.15, self-hosted; the policy
  // allows same-origin scripts only), the hero's entrance, its phone gallery, the chapters (the guest voices' reveal
  // among them, living-cape.js)
  // and the media system: the destination carousel, the exhibition and its lightbox.
  scripts: ['assets/js/vendor/ScrollTrigger.min.js', 'assets/js/vendor/Flip.min.js', 'assets/js/vendor/MotionPathPlugin.min.js', 'assets/js/vendor/CustomEase.min.js', 'assets/js/vendor/SplitText.min.js', 'assets/js/brand-plane.js', 'assets/js/hero.js', 'assets/js/phone-gallery.js', 'assets/js/sand-journey.js', 'assets/js/living-cape.js', 'assets/js/media.js', 'assets/js/culinary.js'],
  /*
   * The hero, "the world has stopped, the memories haven't": five friends in a café above the Atlantic, Table Mountain
   * behind, held still in one moment of laughter (the film moves only the cloud and the sea, src/tools/build-video.sh).
   * Independent layers: the scene (poster, then film) and the phone bottom right, the only thing that keeps moving. The
   * scene and the gallery are AI-generated illustrations supplied by the owner (docs/RIGHTS_REGISTER.md, G). The h1
   * names the business for search and screen readers; on screen the headline says it.
   * The headline, "Good Times Start Here!", and the services (partials/hero-services.mjs; the owner's choice of 7 Nov
   * 2026, in place of the Find Your Good Time leaf) follow the hero in the page: over the photograph's faceless left on
   * wide screens; elsewhere the headline sits bottom left (where the leaf was, below every face) and the services
   * beneath the hero. .hero-shell is their positioning frame and changes nothing else.
   */
  body: ({ site }) => `
<div class="hero-shell">
<section class="hero" aria-labelledby="hero-title">
  <div class="hero__media" data-hero-film>
    ${picture({ name: 'hero-moment-poster', cls: 'hero__poster', eager: true, fetchpriority: 'high' })}
    ${site.media.heroFilm ? `<video class="hero__video" aria-hidden="true" muted playsinline loop preload="none" disablepictureinpicture disableremoteplayback tabindex="-1" data-mp4="${esc(site.media.heroFilm.mp4)}" data-webm="${esc(site.media.heroFilm.webm)}"></video>` : ''}
  </div>
  <div class="hero__scrim" aria-hidden="true"></div>
  <div class="hero__content">
    <h1 class="visually-hidden" id="hero-title">Good Times in Cape Town: private tours of Cape Town and the Western Cape with local guides, since 2014</h1>
  </div>
  <div class="hero__phone">
    ${heroPhoneGallery()}
  </div>
</section>
${heroServices()}
</div>

${sandJourney()}

${credentialsStrip(site)}

<div class="living-cape" data-living-cape>


${scene({
  id: 'road-title',
  cls: 'lc-scene--road',
  image: 'chapmans-viewpoint-couple',
  focus: '66% 46%',
  // On a phone the scene shows about a quarter of the photograph's width, under the words: the coast and the headland,
  // not the couple's faces behind the heading (the media audit, 6.B); wider screens show the couple beside the words
  focusTall: '30% 50%',
  mark: chapterMark(1, 'Where the road meets the ocean', 'lc-mark--light'),
  title: 'Follow the coast. <br><em>Forget the clock.</em>',
  line: 'Ocean roads, dramatic cliffs and plenty of reasons to stop for a photo, with a guide who knows the route and the stories behind it.',
  action: travelNote({ href: tourHref(PENINSULA), label: 'Follow the coast road', tone: 'light' }),
  credit: 'A viewpoint above the Atlantic, Cape Peninsula · A Good Times photograph',
})}

<section class="lc-memory gt-scenic-host" aria-labelledby="memory-title">
  ${scenicLayer('memory')}
  <div class="container lc-memory__grid">
    <figure class="lc-memory__photo" data-rise="memory">
      <div class="lc-memory__frame">${picture({ name: MEMORY.name, sizes: '(min-width: 64em) 27rem, (min-width: 48em) 40vw, min(78vw, 22rem)' })}</div>
      <figcaption class="lc-memory__caption"><span class="lc-memory__place">${esc(MEMORY.place)}</span><span class="lc-memory__credit">${esc(creditFor(MEMORY.name))}</span></figcaption>
    </figure>
    <div class="lc-memory__words">
      <p class="lc-mark"><span class="lc-mark__rule" aria-hidden="true"></span><span class="lc-mark__label">On the Cape Peninsula day</span></p>
      <h2 class="lc-title" id="memory-title">The best bits? <span class="lc-title__turn">They’re yours <em>to remember.</em></span></h2>
      <p class="lc-lead" data-reveal>Two travellers at a lookout on Chapman’s Peak Drive, with Hout Bay, its harbour and the Sentinel behind them. On a private day your group sets the pace, so there’s time for the photo stops, and your guide knows which lookouts are worth pulling over for.</p>
      <div class="lc-memory__actions">
        ${quietOutline({ href: `enquire/?type=tour&tour=${PENINSULA}`, label: 'Plan a Peninsula Day' })}
      </div>
    </div>
  </div>
</section>

<section class="lc-moments" aria-labelledby="moments-title">
  <div class="container lc-moments__grid">
    <div class="lc-moments__head">
      ${chapterMark(2, 'The bits between the big sights')}
      <h2 class="lc-title" id="moments-title">The big sights are great. <span class="lc-title__turn">The bits in between? <em>Even better.</em></span></h2>
      <p class="lc-lead" data-reveal>Between the famous stops are the moments people keep: a row of beach huts, a selfie above the bay, a thumbs-up from the guide on a mountain lookout, a sign at the edge of a continent. All of them photographed on our own days out.</p>
    </div>
    ${MOMENTS.map(
      (m) => `<figure class="lc-moments__item lc-moments__item--${m.key}" data-depth="${m.depth}" data-rise="moments">
      <div class="lc-print-frame" style="--focus: ${m.focus}${m.ratio ? `; --ratio: ${m.ratio}` : ''}">${picture({ name: m.name, sizes: m.sizes })}</div>
      <figcaption>${esc(m.caption)}</figcaption>
    </figure>`,
    ).join('\n    ')}
  </div>
</section>

<section class="lc-film" aria-labelledby="film-title" data-film>
  ${destinationCarousel({
    heading: `${chapterMark(3, 'Pick a direction')}
      <h2 class="lc-title lc-title--compact" id="film-title">Which side of the Cape will you <em>fall for first?</em></h2>`,
    slides: SLIDES,
    // Cape Town leads at first: the clearest photograph of the six at the featured width
    initial: 1,
    foot: `<p class="lc-film__note">Six directions from Cape Town, each one a private day (or more) with us.</p>
      ${travelNote({ href: 'destinations/', label: 'All destinations' })}`,
  })}
</section>

<section class="lc-wild lc-dark" aria-labelledby="wild-title" data-wild>
  <div class="lc-wild__panel lc-wild__panel--one" data-wild-panel>
    <figure class="lc-wild__media">
      <div class="lc-wild__art" style="--focus: 64% 46%; --focus-tall: 66% 52%" data-wild-art>${picture({ name: 'private-guests-arms-raised', sizes: wildSizes('private-guests-arms-raised') })}</div>
      <div class="lc-wild__scrim" aria-hidden="true"></div>
      <div class="lc-wild__shade" aria-hidden="true" data-wild-shade></div>
    </figure>
    <div class="container lc-wild__beat" data-wild-beat>
      <div class="lc-wild__words">
        <p class="lc-mark lc-mark--light"><span class="lc-mark__rule" aria-hidden="true"></span><span class="lc-mark__label">An interlude, with adrenaline</span></p>
        <h2 class="lc-statement lc-statement--scene lc-wild__title" id="wild-title">For the stories you’ll <em>tell twice.</em></h2>
      </div>
    </div>
  </div>
  <div class="lc-wild__panel lc-wild__panel--two" data-wild-panel>
    <figure class="lc-wild__media">
      <div class="lc-wild__art" style="--focus: 50% 60%; --focus-tall: 52% 60%" data-wild-art>${picture({ name: 'quad-bikes-dunes', sizes: wildSizes('quad-bikes-dunes') })}</div>
      <div class="lc-wild__scrim" aria-hidden="true"></div>
    </figure>
    <div class="container lc-wild__beat" data-wild-beat>
      <div class="lc-wild__words">
        <p class="lc-scene__line">Fancy something with a little more adrenaline? Quad bikes on the dunes, a tandem skydive with the Cape below you, a shark cage dive off Gansbaai. Each runs with a safety briefing and depends on the weather and the season, so tell us your dates and we’ll help you work out what fits your Cape Town days.</p>
        ${travelNote({ href: 'tours/#adventure', label: 'See the Adventures', tone: 'light' })}
      </div>
    </div>
  </div>
</section>

<section class="lc-ways" aria-labelledby="ways-title">
  <div class="container lc-ways__grid">
    <div class="lc-ways__head">
      ${chapterMark(4, 'Your day, your way')}
      <h2 class="lc-title" id="ways-title">Four ways to see the Cape <em>with us.</em></h2>
      <p class="lc-lead" data-reveal>Each one private, and confirmed with you before anything is booked.</p>
    </div>
    <ul class="lc-ways__list" role="list">
      ${SERVICES.map(
        (s) => `<li class="lc-way" data-service="${s.id}" data-way>
        <div class="lc-way__photo" style="--focus: ${s.focus}" data-way-photo>${picture({ name: s.image, sizes: '(min-width: 64em) min(44vw, 40rem), (min-width: 48em) 46vw, 7rem' })}${licensedCredit(s.image)}</div>
        <div class="lc-way__body">
          ${s.id === 'airport' ? ROUTE : ''}<h3 class="lc-way__name"><a href="${esc(s.href)}">${esc(s.name)}</a></h3>
          <p class="lc-way__line">${esc(s.line)}</p>
          <ul class="lc-way__facts" role="list">${WAYS[s.id].map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
          <p class="lc-way__go"><span>${esc(s.action)}</span></p>
          ${s.id === 'journey' ? `<a class="lc-way__extra" href="packages/">The Garden Route Tour</a>` : ''}
        </div>
      </li>`,
      ).join('\n      ')}
    </ul>
    <div class="lc-ways__book">
      ${sunSeal({ href: 'enquire/', label: 'Plan My Day' })}
      <p>Tell us what you have in mind and we’ll reply with a quote. Nothing is booked or charged until we’ve confirmed the arrangements with you.</p>
    </div>
  </div>
</section>

<section class="lc-people" aria-labelledby="people-title">
  <div class="container lc-people__grid">
    <figure class="lc-people__portrait">
      <div class="lc-print-frame" style="--focus: 50% 50%" data-unveil>${picture({ name: 'hout-bay-flag-frame', sizes: '(min-width: 64em) min(54vw, 48rem), 100vw' })}</div>
      <figcaption>Friends in a South African flag frame above the coast</figcaption>
    </figure>
    <div class="lc-people__words">
      ${chapterMark(5, 'The people make it')}
      <h2 class="lc-title" id="people-title">The views do half the work. <em>We do the rest.</em></h2>
      <ul class="lc-people__ways" role="list">
        <li data-reveal style="--reveal-i:1">${engraved('group')}<span><strong>Personal service.</strong> Every tour is private and shaped around the people on it, and most start with pickup from your accommodation.</span></li>
        <li data-reveal style="--reveal-i:2">${engraved('guide')}<span><strong>Accredited local guides.</strong> The stories behind the famous places, and the good bits in between.</span></li>
        <li data-reveal style="--reveal-i:3">${engraved('check')}<span><strong>Safety first.</strong> Weather-aware plans, and a team you can reach before, during and after your tour.</span></li>
      </ul>
      ${travelNote({ href: 'about/', label: 'Meet the Good Times team' })}
    </div>
    <figure class="lc-people__pair lc-people__pair--a" data-depth="1" data-rise="people">
      <div class="lc-print-frame" style="--focus: 40% 50%">${picture({ name: 'castle-table-mountain', sizes: '(min-width: 64em) min(30vw, 26rem), 100vw' })}</div>
      <figcaption>A city day at the Castle of Good Hope</figcaption>
    </figure>
    <figure class="lc-people__pair lc-people__pair--b" data-depth="-1" data-rise="people">
      <div class="lc-print-frame" style="--focus: ${focusOf('owner-portrait')}; --ratio: 3 / 2">${picture({ name: 'owner-portrait', sizes: '(min-width: 64em) min(26vw, 23rem), 100vw' })}</div>
      <figcaption>The owner of Good Times, across the bay from Table Mountain</figcaption>
    </figure>
  </div>
</section>

${culinaryReveal({
  id: 'taste-title',
  words: `<p class="lc-mark"><span class="lc-mark__rule" aria-hidden="true"></span><span class="lc-mark__label">Beyond the scenery</span></p>
      <h2 class="lc-title lc-title--compact" id="taste-title">Good views. <em>Better pours.</em></h2>
      ${tasteRule}
      <p class="lc-lead">Take the scenic route through the Cape Winelands, where mountain views, beautiful estates and long lunches are all part of the appeal: wine and cheese at Fairview, then La Motte, Franschhoek and Lanzerac. Tastings and lunch are optional and paid on the day, so you choose what to taste and where to eat.</p>
      ${travelNote({ href: tourHref(WINELANDS), label: 'Explore the Winelands' })}`,
  // The wide table of five fills the large frame whole; the compact pour at Waterford fits the square inset, framed on
  // the guest and the host (the media audit: the inset cut the table's guests at both edges)
  main: { name: 'winelands-tasting-table', focus: '50% 50%' },
  layer: { name: 'winelands-host-pouring', focus: '71% 50%' },
  caption: 'Around the tasting table · A tasting outdoors on a Winelands estate',
})}

<section class="lc-gallery" id="gallery" aria-labelledby="gallery-title">
  <div class="container">
    <div class="lc-gallery__head">
      ${chapterMark(6, 'From our camera roll')}
      <h2 class="lc-title" id="gallery-title">Snapshots from <em>real days out.</em></h2>
      <p class="lc-body" data-reveal>Twelve photographs from our days out with guests. Open one to see where it was taken and which day it belongs to.</p>
    </div>
    ${photoExhibition({ items: GALLERY })}
  </div>
  ${mediaLightbox({ items: GALLERY })}
</section>

${scene({
  id: 'golden-title',
  cls: 'lc-scene--golden',
  image: 'table-mountain-sparkling',
  focus: '36% 40%',
  focusTall: '40% 38%',
  mark: chapterMark(7, 'Golden hour', 'lc-mark--light'),
  title: 'Some days you wish could last <em>a little longer.</em>',
  line: 'Table Mountain across the bay, and a glass raised to the day.',
  action: travelNote({ href: 'tours/', label: 'Choose your day', tone: 'light' }),
  credit: 'Table Mountain across the bay · A Good Times photograph',
})}

<section class="lc-ease gt-scenic-host" aria-labelledby="ease-title">
  ${scenicLayer('ease')}
  <div class="container">
    <div class="lc-ease__head">
      ${chapterMark(8, 'Easy does it')}
      <h2 class="lc-title" id="ease-title">All the wonder. <em>None of the worry.</em></h2>
    </div>
    <div class="lc-ease__journey" data-journey>
      <svg class="lc-ease__line lc-ease__line--wide" viewBox="0 0 1200 120" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path class="lc-ease__trace" d="M30 60C120 60 196 20 296 24S404 60 440 60C522 60 600 102 700 96S810 60 850 60C934 60 1040 30 1170 42"/><path class="lc-ease__ink" pathLength="1" data-journey-ink d="M30 60C120 60 196 20 296 24S404 60 440 60C522 60 600 102 700 96S810 60 850 60C934 60 1040 30 1170 42"/></svg>
      <svg class="lc-ease__line lc-ease__line--tall" viewBox="0 0 60 900" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path class="lc-ease__trace" d="M30 20C8 160 52 300 30 450S8 740 30 880"/><path class="lc-ease__ink" pathLength="1" data-journey-ink d="M30 20C8 160 52 300 30 450S8 740 30 880"/></svg>
      <ol class="lc-ease__steps" role="list">
        <li class="lc-ease__step">
          <span class="lc-ease__stop" aria-hidden="true">${engraved('travel-folio')}</span>
          <p class="lc-ease__num">Step 1</p>
          <h3>Tell us what you’re after.</h3>
          <p>The places you’d love to see or the transfer you need: one of our ${tours.length} private tours and activities, a day built around you, or the Garden Route.</p>
        </li>
        <li class="lc-ease__step">
          <span class="lc-ease__stop" aria-hidden="true">${engraved('contact', { size: 30 })}</span>
          <p class="lc-ease__num">Step 2</p>
          <h3>Get your personalised quote.</h3>
          <p>One of our team checks availability and replies with the details and your price, however you prefer to be contacted.</p>
        </li>
        <li class="lc-ease__step">
          <span class="lc-ease__stop" aria-hidden="true">${engraved('sun-seal')}</span>
          <p class="lc-ease__num">Step 3</p>
          <h3>Say yes, and we confirm.</h3>
          <p>Once you’re happy with the arrangements, we confirm your booking. On the day, your guide collects you.</p>
        </li>
      </ol>
    </div>
    <div class="lc-ease__foot">
      ${sunSeal({ href: 'enquire/', label: 'Get a Quote' })}
      ${travelNote({ href: 'faq/', label: 'Questions first? Read the FAQ' })}
    </div>
  </div>
</section>

${voicesSection(site)}

<section class="lc-scene lc-scene--invite lc-dark" aria-labelledby="invite-title" style="--focus: 50% 34%; --focus-tall: 42% 30%" data-scene data-invite>
  <div class="lc-scene__media" aria-hidden="true"><div class="lc-scene__drift" data-scene-drift>${picture({ name: 'camps-bay-twelve-apostles', alt: '', sizes: sceneSizes('camps-bay-twelve-apostles') })}</div></div>
  <div class="lc-scene__scrim" aria-hidden="true"></div>
  <div class="container lc-scene__inner">
    <div class="lc-scene__words" data-scene-words>
      <span class="lc-invite-seal" aria-hidden="true">${engraved('sun-seal')}<svg class="lc-invite-seal__thread" viewBox="0 0 240 8" preserveAspectRatio="none" focusable="false"><path pathLength="1" data-thread d="M0 4C40 1 80 7 120 4S200 1 240 4"/></svg></span>
      ${chapterMark(10, 'Good Times start here', 'lc-mark--light')}
      <h2 class="lc-statement lc-statement--scene" id="invite-title">Your Cape Town story <span class="lc-statement__turn"><em>starts here.</em></span></h2>
    </div>
    <div class="lc-scene__close" data-scene-words>
      <p class="lc-scene__line">Tell us what you’d love to see. We’ll help you make a day of it, and reply with availability and a personalised quote; nothing is booked or charged until we’ve confirmed it with you.</p>
      <div class="lc-scene__actions">
        ${sunSeal({ href: 'enquire/?type=tour', label: 'Plan My Day', tone: 'light', owner: 'invite' })}
        ${quietOutline({ href: 'enquire/?type=transfer&transfer=airport-arrival', label: 'Arrange My Transfer', tone: 'light' })}
      </div>
    </div>
  </div>
  <p class="lc-scene__credit">Camps Bay below the Twelve Apostles · A Good Times photograph</p>
</section>

</div>`,
};
