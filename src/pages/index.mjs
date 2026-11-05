import { esc, picture, preloadFor, stars } from '../partials/ui.mjs';
import { engraved } from '../partials/engraved.mjs';
import { sunSeal, travelNote, quietOutline, chapterMark, SERVICES } from '../partials/living-cape.mjs';
import { destinationCarousel, photoExhibition, mediaLightbox } from '../partials/media.mjs';
import { culinaryReveal, tasteRule } from '../partials/culinary.mjs';
import { heroPhoneGallery } from '../partials/phone-gallery.mjs';
import { imageByName } from '../data/images.mjs';
import { tours, destinations } from '../data/tours.mjs';
import { services } from '../data/transfers.mjs';
import { reviews } from '../data/reviews.mjs';
import { reviewerPhoto } from '../partials/reviewer-photo.mjs';

const initials = (name) => name.replace(/[^A-Za-z ]/g, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || name.slice(0, 1).toUpperCase();
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

/** 03 · The moments between destinations: four stops along Good Times days (captions by place, nobody named). */
const MOMENTS = [
  { key: 'a', name: 'muizenberg-huts-guests', focus: '50% 56%', caption: 'Muizenberg’s bathing huts', sizes: '(min-width: 64em) min(52vw, 46rem), 100vw', depth: 0 },
  { key: 'b', name: 'guide-selfie-bay', focus: '56% 40%', caption: 'A selfie above the bay', sizes: '(min-width: 64em) min(26vw, 23rem), 60vw', depth: -1 },
  { key: 'c', name: 'fairview-goat-tower', focus: '50% 46%', caption: 'The goat tower at Fairview, on a Winelands day', sizes: '(min-width: 64em) min(30vw, 27rem), 100vw', depth: 1 },
  { key: 'd', name: 'cape-of-good-hope-sign', focus: '56% 58%', caption: 'At the Cape of Good Hope', sizes: '(min-width: 64em) min(22vw, 19rem), 48vw', depth: -1 },
];

/**
 * 04 · The destination carousel: the six destinations (names, lines and links from tours.mjs) as
 * DestinationSlide records, each framed by its own photograph (focal points in images.mjs).
 * The label counts private tours to choose from, never a duration.
 */
const FILM = [
  { id: 'peninsula', image: 'boulders-penguins-boardwalk' },
  { id: 'city', image: 'bokaap-street' },
  { id: 'langa', image: 'langa-mural-guests' },
  { id: 'winelands', image: 'winelands-tasting-flight' },
  { id: 'overberg', image: 'hermanus-whale-sculpture' },
  { id: 'garden-route', image: 'rooiberg-red-chair' },
];
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
    image: f.image,
    metaLabel: count ? `${count} private ${count === 1 ? 'tour' : 'tours'}` : d.countLabel || 'Private tour',
    metaSpoken: count ? `${count} private ${count === 1 ? 'tour' : 'tours'} to choose from` : '',
    linkLabel: count > 1 ? `Explore the private tours to ${inText}` : count === 1 ? `Explore the private tour to ${inText}` : `Explore the ${d.name.replace(/^The /, '')} multi-day tour`,
    icon: count ? 'compass' : 'directions',
  };
});

/** 05 · Your journey, your way: the practical facts under each service's photograph (all from the official site). */
const WAYS = {
  tours: ['Pickup from your accommodation', 'Only your group and your guide'],
  airport: ['Meet and greet with a name board', `From R${airport.price.from.toLocaleString('en-GB')} per trip for 1–4 guests`],
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
  { name: 'boulders-penguin-colony', role: 'wide', tile: { lg: [8, '3 / 2'], md: [2, '16 / 10'], sm: [2, '4 / 3'] }, title: 'African penguins at Boulders Beach', place: 'Boulders Beach, Simon’s Town', story: 'The colony lives among granite boulders on False Bay, one of the last stops of a Peninsula day.', href: tourHref(PENINSULA), link: 'Cape Peninsula Private Tour' },
  { name: 'muizenberg-huts', role: 'wide', tile: { lg: [4, 'auto'], md: [1, '1'], sm: [1, '4 / 5'] }, title: 'The bathing huts at Muizenberg', place: 'Muizenberg Beach', story: 'Colourful huts and surfers on the way home along False Bay.', href: tourHref(PENINSULA), link: 'Cape Peninsula Private Tour' },
  { name: 'castle-moat', role: 'wide', tile: { lg: [5, 'auto'], md: [1, '1'], sm: [1, '4 / 5'] }, title: 'The Castle of Good Hope', place: 'Cape Town', story: 'The 17th-century fortress, Devil’s Peak in its moat: where the city tour begins.', href: tourHref(CITY), link: 'Cape Town City Private Tour' },
  { name: 'mandela-statue-drakenstein', tile: { lg: [3, '3 / 4'], md: [1, '1'], sm: [1, '4 / 5'] }, title: 'The statue of Nelson Mandela', place: 'Drakenstein Correctional Centre', story: 'On the road to the Winelands, outside the prison from which he walked free in 1990.', href: tourHref(WINELANDS), link: 'Cape Winelands Private Tour' },
  { name: 'district-six-museum', tile: { lg: [4, 'auto'], md: [1, '1'], sm: [1, '4 / 5'] }, title: 'The District Six Museum', place: 'Cape Town', story: 'The story of a neighbourhood and the people forced from it, told on the city tour.', href: tourHref(CITY), link: 'Cape Town City Private Tour' },
  { name: 'marine-dynamics-boat', role: 'wide', tile: { lg: [7, '2 / 1'], md: [2, '2 / 1'], sm: [2, '2 / 1'] }, title: 'Heading out to shark territory', place: 'Gansbaai', story: 'The boat out of Gansbaai on a shark cage diving day, gulls overhead.', href: 'tours/shark-cage-diving/', link: 'Shark Cage Diving' },
  { name: 'winelands-terrace', role: 'food', tile: { lg: [5, 'auto'], md: [1, '4 / 3'], sm: [1, '1'] }, title: 'A terrace tasting', place: 'A Winelands estate', story: 'Wine poured at the table; tasting fees are paid on the day, so you choose what to try.', href: tourHref(WINELANDS), link: 'Cape Winelands Private Tour' },
  { name: 'company-garden-squirrel', role: 'wide', tile: { lg: [3, 'auto'], md: [1, '4 / 3'], sm: [1, '1'] }, title: 'A white squirrel', place: 'The Company’s Garden', story: 'Spotted in Cape Town’s oldest garden. Sightings like this are luck, never a promise.', href: tourHref(CITY), link: 'Cape Town City Private Tour' },
  { name: 'langa-mural', role: 'wide', tile: { lg: [6, '3 / 2'], md: [1, '4 / 3'], sm: [1, '1'] }, title: 'A mural in Langa', place: 'Langa, Cape Town', story: 'Part of a half day in Langa, alongside the arts centre, the museum and the old beer hall.', href: tourHref(TOWNSHIP), link: 'Township Private Tour' },
  { name: 'bokaap-selfie', tile: { lg: [3, 'auto'], md: [1, '1'], sm: [1, '1'] }, title: 'A selfie in the Bo-Kaap', place: 'Bo-Kaap, Cape Town', story: 'The colourful Cape Malay streets, the last walk of the city tour.', href: tourHref(CITY), link: 'Cape Town City Private Tour' },
  { name: 'langa-traditional-drink', role: 'table', tile: { lg: [7, '3 / 2'], md: [1, '1'], sm: [1, '1'] }, title: 'A traditional drink, shared', place: 'Langa, Cape Town', story: 'The optional traditional beer tasting on the township tour.', href: tourHref(TOWNSHIP), link: 'Township Private Tour' },
  { name: 'map-of-africa-viewpoint', role: 'wine', tile: { lg: [5, 'auto'], md: [1, '1'], sm: [1, '1'] }, title: 'The Map of Africa viewpoint', place: 'Near Wilderness', story: 'A forested river valley on the Garden Route, three days or more from Cape Town.', href: 'packages/garden-route-private-tour/', link: 'Garden Route Private Tour' },
];

/** 10 · Words from the road: every chosen review as a compact card in the carousel. */
const LANGUAGES = { fr: 'French', de: 'German' };
/** Ten original illustrated avatars (src/assets/img/avatars, drawn for this site, nobody's likeness): the stand-in on a
    card until the reviewer's own photo is supplied (partials/reviewer-photo.mjs) */
const AVATARS = 10;
const avatarFor = (i) => `assets/img/avatars/guest-${String((i % AVATARS) + 1).padStart(2, '0')}.svg`;

/**
 * A review card: the reviewer's photo (or an illustrated avatar until it is supplied), the reviewer's name and place, their own rating where it is
 * recorded, our labelled summary of the review (a verbatim passage only with the reviewer's permission,
 * `quoteApproval`, none recorded yet) and the link to the original.
 */
function storyCard(r, i) {
  const lang = r.quoteLang && r.quoteLang !== 'en' ? r.quoteLang : '';
  const real = reviewerPhoto(r.avatar);
  const quoted = Boolean(r.excerpt && r.quote && r.quoteApproval);
  const text = quoted ? r.excerpt : r.summary;
  const goesOn = quoted && r.quote.trim() !== r.excerpt.trim();
  // Where the review goes on, an ellipsis says so: in place of a closing full stop, after any other closing mark
  const passage = !goesOn ? text : /\.$/.test(text) ? `${text.slice(0, -1)}…` : /[!?]$/.test(text) ? `${text} …` : `${text}…`;
  const rated = Number.isFinite(r.rating) && r.rating >= 1 && r.rating <= 5;
  const avatar = `<span class="story-card__avatar"><span class="story-card__initials" aria-hidden="true">${esc(initials(r.author))}</span>${
    real
      ? `<img src="${real}" alt="${esc(r.author)}’s Tripadvisor profile photo" width="84" height="84" loading="lazy" decoding="async">`
      : `<img src="${avatarFor(i)}" alt="" width="84" height="84" loading="lazy" decoding="async">`
  }</span>`;
  const t = r.tour ? tour(r.tour) : null;
  const about = t ? t.shortTitle : r.label || '';
  return `<li class="story-card" data-story-card>
        <article class="story-card__inner">
          <div class="story-card__head">
            ${avatar}
            <div class="story-card__who">
              <p class="story-card__name">${esc(r.author)}</p>
              ${r.origin ? `<p class="story-card__place">${esc(r.origin)}</p>` : ''}
              ${rated ? `<p class="story-card__stars">${stars({ count: r.rating })}<span class="visually-hidden">Rated ${r.rating} out of 5</span></p>` : ''}
            </div>
          </div>
          ${
            quoted
              ? `<blockquote class="story-card__quote" cite="${esc(r.url)}"${lang ? ` lang="${lang}"` : ''}><p>“${esc(passage)}”</p></blockquote>`
              : `<div class="story-card__quote story-card__quote--summary"><p class="story-card__label">Review summary${about ? ` · ${esc(about)}` : ''}</p><p>${esc(text)}</p></div>`
          }
          <p class="story-card__source"><a href="${esc(r.url)}" rel="noopener" target="_blank">Read the full review<span class="visually-hidden"> on Tripadvisor (opens in a new tab)</span></a>${lang ? ` · Written in ${LANGUAGES[lang] || lang}` : ''}</p>
        </article>
      </li>`;
}

/**
 * 10 · Words from the road: the heading beside the listing's two verified figures (counted up once in
 * view, reviews.js), the chosen reviews as cards in the carousel (one GSAP move at a time with
 * motion, a native snapping scroller without), and the one link to the listing.
 */
function storiesSection(site) {
  const ta = site.tripadvisor;
  return `<section class="stories lc-dark" id="reviews" aria-labelledby="stories-title">
  <div class="container stories__inner">
    <div class="stories__head">
      <div class="stories__intro">
        ${chapterMark(10, 'Words from the road', 'lc-mark--light stories__eyebrow')}
        <h2 class="stories__title" id="stories-title">Beautiful places. <br><em>Beautifully remembered.</em></h2>
      </div>
      <ul class="stories__stats" role="list" aria-label="Verified Tripadvisor figures" data-story-stats>
        <li class="stories__stat">${engraved('binoculars', { cls: 'stories__stat-icon' })}<strong class="stories__stat-value" data-count="${ta.reviewCount}">${ta.reviewCount}</strong><span class="stories__stat-label">Tripadvisor reviews</span></li>
        <li class="stories__stat">${engraved('star', { cls: 'stories__stat-icon' })}<strong class="stories__stat-value" data-count="${ta.rating.toFixed(1)}" data-decimals="1">${ta.rating.toFixed(1)}</strong><span class="stories__stat-label">Average rating</span><span class="stories__stat-sub">out of 5</span></li>
      </ul>
    </div>
    <div class="stories__carousel" data-stories role="region" aria-roledescription="carousel" aria-label="Guest reviews">
      <button class="gt-button gt-button--utility gt-button--on-dark stories__arrow stories__arrow--prev" type="button" data-stories-prev>Previous<span class="visually-hidden"> review</span></button>
      <div class="stories__viewport" data-stories-viewport role="group" aria-label="Review cards" tabindex="0">
        <ul class="stories__track" data-stories-track role="list">
      ${reviews.map((r, i) => storyCard(r, i)).join('\n      ')}
        </ul>
      </div>
      <button class="gt-button gt-button--utility gt-button--on-dark stories__arrow stories__arrow--next" type="button" data-stories-next>Next<span class="visually-hidden"> review</span></button>
      <button class="stories__toggle" type="button" data-stories-toggle aria-label="Pause the reviews" hidden>${engraved('pause', { cls: 'stories__toggle-pause' })}${engraved('play', { cls: 'stories__toggle-play' })}</button>
    </div>
    <div class="stories__foot">
      <a class="gt-button gt-button--secondary gt-button--on-dark stories__cta lc-quiet lc-quiet--light" href="${esc(ta.url)}" rel="noopener" target="_blank">${engraved('quote', { cls: 'lc-quiet__icon' })}<span>Read All Our Reviews on Tripadvisor</span><span class="visually-hidden"> (opens in a new tab)</span></a>
    </div>
  </div>
</section>`;
}

/** A full-bleed scene (ScenicBackdrop): the photograph moves a little slower than the page; the words sit where the picture leaves room. */
function scene({ id, cls, image, focus, focusTall, mark, title, line, action, credit, eager = false }) {
  return `<section class="lc-scene ${cls} lc-dark" aria-labelledby="${id}" style="--focus: ${focus}; --focus-tall: ${focusTall}" data-scene>
  <div class="lc-scene__media" aria-hidden="true"><div class="lc-scene__drift" data-scene-drift>${picture({ name: image, alt: '', sizes: '100vw', eager })}</div></div>
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

export const page = {
  path: 'index.html',
  nav: null,
  title: 'Good Times in Cape Town',
  description:
    'Private, guide-led tours of Cape Town since 2014: the Cape Peninsula and Cape Point, the city and Langa, the Winelands, whale watching, adventures, the Garden Route and airport transfers. Send a booking request for a quote.',
  priority: 1,
  changefreq: 'weekly',
  overlayHeader: true,
  bodyClass: 'home',
  // The hero's held frame is the first paint (one 16:9 rendition set for every screen; the crop is CSS).
  preload: [preloadFor('hero-moment-poster')],
  // The Living Cape chapters have their own sheet, loaded after styles.css and the system sheet, scoped to .living-cape.
  // The hero's phone gallery has its own sheet and script (HeroPhoneGallery, partials/phone-gallery.mjs).
  styles: ['assets/css/phone-gallery.css', 'assets/css/living-cape.css', 'assets/css/media.css', 'assets/css/culinary.css'],
  // GSAP core comes with every page (the concierge, layout.mjs). Here: ScrollTrigger and Flip (GSAP 3.15, self-hosted;
  // the policy allows same-origin scripts only), the hero's entrance, its phone gallery, the guest stories carousel,
  // the chapters and the media system: the destination carousel, the exhibition and its lightbox.
  scripts: ['assets/js/vendor/ScrollTrigger.min.js', 'assets/js/vendor/Flip.min.js', 'assets/js/hero.js', 'assets/js/phone-gallery.js', 'assets/js/reviews.js', 'assets/js/living-cape.js', 'assets/js/media.js', 'assets/js/culinary.js'],
  /*
   * The hero, "the world has stopped, the memories haven't": five friends in a café above the Atlantic, Table Mountain
   * behind, held still in one moment of laughter (the film moves only the cloud and the sea, src/tools/build-video.sh).
   * Three independent layers: the scene (poster, then film), the one call to action bottom left (in the strip below the
   * sleeping friend's face, never over it) and the phone bottom right, the only thing that keeps moving. The scene and
   * the gallery are AI-generated illustrations supplied by the owner (docs/RIGHTS_REGISTER.md, G). The h1 names the
   * business for search and screen readers; on screen the picture and the call to action say it.
   */
  body: ({ site }) => `
<section class="hero" aria-labelledby="hero-title">
  <div class="hero__media" data-hero-film>
    ${picture({ name: 'hero-moment-poster', cls: 'hero__poster', eager: true, fetchpriority: 'high' })}
    ${site.media.heroFilm ? `<video class="hero__video" aria-hidden="true" muted playsinline loop preload="none" disablepictureinpicture disableremoteplayback tabindex="-1" data-mp4="${esc(site.media.heroFilm.mp4)}" data-webm="${esc(site.media.heroFilm.webm)}"></video>` : ''}
  </div>
  <div class="hero__scrim" aria-hidden="true"></div>
  <div class="hero__content">
    <h1 class="visually-hidden" id="hero-title">Good Times in Cape Town: private tours of Cape Town and the Western Cape with local guides, since 2014</h1>
    <a class="btn-champagne hero__cta" href="tours/" data-intro><span class="hero__cta-label">Good Times start <em>Here!</em></span><span class="hero__cta-sheen" aria-hidden="true"></span></a>
  </div>
  <div class="hero__phone">
    ${heroPhoneGallery()}
  </div>
</section>

<div class="living-cape" data-living-cape>

<section class="lc-sun" aria-labelledby="sun-title" data-sun>
  <div class="container lc-sun__inner">
    <svg class="lc-sun__water" aria-hidden="true" focusable="false" data-sun-water></svg>
    <div class="lc-sun__words">
      ${chapterMark(1, 'Good Times Since 2014')}
      <h2 class="lc-statement" id="sun-title">A private day, <span class="lc-statement__turn">shaped <em>around you.</em></span></h2>
      <p class="lc-lead" data-reveal>Every Good Times tour is private: only your group, a guide who knows the Cape, and a route planned around what you most want to see. We have been showing visitors the Mother City since 2014.</p>
    </div>
    <figure class="lc-sun__plate">
      <div class="lc-sun__frame" data-sun-frame style="--focus: 62% 60%; --focus-tall: 66% 62%">
        ${picture({ name: 'peninsula-bench-view', alt: imageByName('peninsula-bench-view').alt, sizes: '(min-width: 90em) 88rem, calc(100vw - 2 * clamp(1rem, 0.25rem + 3.5vw, 4rem))' })}
      </div>
      <figcaption class="lc-sun__caption">
        <span>A pause above a long white beach on a Cape Peninsula day. A Good Times photograph.</span>
        ${travelNote({ href: tourHref(PENINSULA), label: 'The Cape Peninsula day' })}
      </figcaption>
    </figure>
  </div>
</section>

${scene({
  id: 'road-title',
  cls: 'lc-scene--road',
  image: 'chapmans-viewpoint-couple',
  focus: '66% 46%',
  focusTall: '72% 50%',
  mark: chapterMark(2, 'Where the Road Meets the Ocean', 'lc-mark--light'),
  title: 'The coast road <br>is half the <em>adventure.</em>',
  line: 'Chapman’s Peak Drive, the Cape of Good Hope and Cape Point, then the penguins at Boulders Beach: the Peninsula in one private day.',
  action: travelNote({ href: tourHref(PENINSULA), label: 'Follow the coast road', tone: 'light' }),
  credit: 'A viewpoint above the Atlantic, Cape Peninsula · A Good Times photograph',
})}

<section class="lc-moments" aria-labelledby="moments-title">
  <div class="container lc-moments__grid">
    <div class="lc-moments__head">
      ${chapterMark(3, 'The Moments Between Destinations')}
      <h2 class="lc-title" id="moments-title">It’s not only where you go. <span class="lc-title__turn">It’s everything <em>along the way.</em></span></h2>
      <p class="lc-lead" data-reveal>Between the famous stops are the moments people keep: a row of beach huts, a selfie above the bay, the goats at Fairview, a sign at the edge of a continent. Photographs from our own days out.</p>
    </div>
    ${MOMENTS.map(
      (m) => `<figure class="lc-moments__item lc-moments__item--${m.key}" data-depth="${m.depth}" data-rise="moments">
      <div class="lc-print-frame" style="--focus: ${m.focus}">${picture({ name: m.name, sizes: m.sizes })}</div>
      <figcaption>${esc(m.caption)}</figcaption>
    </figure>`,
    ).join('\n    ')}
  </div>
</section>

<section class="lc-film" aria-labelledby="film-title" data-film>
  ${destinationCarousel({
    heading: `${chapterMark(4, 'The Cape Is Yours to Discover')}
      <h2 class="lc-title lc-title--compact" id="film-title">Which side of the Cape will you <em>fall in love with?</em></h2>`,
    slides: SLIDES,
    // Cape Town leads at first: the clearest photograph of the six at the featured width
    initial: 1,
    foot: `<p class="lc-film__note">Six directions from Cape Town, each a private day or more with us.</p>
      ${travelNote({ href: 'destinations/', label: 'All destinations' })}`,
  })}
</section>

<section class="lc-wild lc-dark" aria-labelledby="wild-title" data-wild>
  <div class="lc-wild__panel lc-wild__panel--one" data-wild-panel>
    <figure class="lc-wild__media">
      <div class="lc-wild__art" style="--focus: 34% 46%; --focus-tall: 30% 46%" data-wild-art>${picture({ name: 'cape-point-cliffs', sizes: '100vw' })}</div>
      <div class="lc-wild__scrim" aria-hidden="true"></div>
      <div class="lc-wild__shade" aria-hidden="true" data-wild-shade></div>
    </figure>
    <div class="container lc-wild__beat" data-wild-beat>
      <div class="lc-wild__words">
        <p class="lc-mark lc-mark--light"><span class="lc-mark__rule" aria-hidden="true"></span><span class="lc-mark__label">An interlude</span></p>
        <h2 class="lc-statement lc-statement--scene lc-wild__title" id="wild-title">The best journeys leave room for the <em>unexpected.</em></h2>
      </div>
    </div>
  </div>
  <div class="lc-wild__panel lc-wild__panel--two" data-wild-panel>
    <figure class="lc-wild__media">
      <div class="lc-wild__art" style="--focus: 50% 60%; --focus-tall: 52% 60%" data-wild-art>${picture({ name: 'quad-bikes-dunes', sizes: '100vw' })}</div>
      <div class="lc-wild__scrim" aria-hidden="true"></div>
    </figure>
    <div class="container lc-wild__beat" data-wild-beat>
      <div class="lc-wild__words">
        <p class="lc-scene__line">Quad bikes on the dunes, a tandem skydive with the Cape below you, a cage dive with great white sharks off Gansbaai: add an adventure to your days with us.</p>
        ${travelNote({ href: 'tours/#adventure', label: 'Adventure activities', tone: 'light' })}
      </div>
    </div>
  </div>
</section>

<section class="lc-ways" aria-labelledby="ways-title">
  <div class="container lc-ways__grid">
    <div class="lc-ways__head">
      ${chapterMark(5, 'Your Journey, Your Way')}
      <h2 class="lc-title" id="ways-title">Four ways to see the Cape <em>with us.</em></h2>
      <p class="lc-lead" data-reveal>Each one private, and confirmed with you before anything is booked.</p>
    </div>
    <ul class="lc-ways__list" role="list">
      ${SERVICES.map(
        (s, i) => `<li class="lc-way" data-service="${s.id}" data-reveal style="--reveal-i:${i % 2}">
        <div class="lc-way__photo" style="--focus: ${s.focus}">${picture({ name: s.image, sizes: '(min-width: 64em) min(44vw, 40rem), (min-width: 48em) 46vw, 7rem' })}</div>
        <div class="lc-way__body">
          <h3 class="lc-way__name"><a href="${esc(s.href)}">${esc(s.name)}</a></h3>
          <p class="lc-way__line">${esc(s.line)}</p>
          <ul class="lc-way__facts" role="list">${WAYS[s.id].map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
          <p class="lc-way__go"><span>${esc(s.action)}</span></p>
          ${s.id === 'journey' ? `<a class="lc-way__extra" href="packages/">The Garden Route Tour</a>` : ''}
        </div>
      </li>`,
      ).join('\n      ')}
    </ul>
    <div class="lc-ways__book">
      ${sunSeal({ href: 'enquire/', label: 'Get a Quote' })}
      <p>Nothing is booked or charged until we’ve confirmed the arrangements with you.</p>
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
      ${chapterMark(6, 'The People Make the Journey')}
      <h2 class="lc-title" id="people-title">The beautiful places are only <em>part of the story.</em></h2>
      <ul class="lc-people__ways" role="list">
        <li data-reveal style="--reveal-i:1">${engraved('group')}<span><strong>Personal service.</strong> Every tour is private and shaped around the people on it, with pickup from your accommodation.</span></li>
        <li data-reveal style="--reveal-i:2">${engraved('guide')}<span><strong>Accredited local guides.</strong> The stories behind the famous places, and the hidden gems between them.</span></li>
        <li data-reveal style="--reveal-i:3">${engraved('check')}<span><strong>Safety first.</strong> Weather-aware plans, and a team you can reach before, during and after your tour.</span></li>
      </ul>
      ${travelNote({ href: 'about/', label: 'Meet Good Times' })}
    </div>
    <figure class="lc-people__pair lc-people__pair--a" data-depth="1" data-rise="people">
      <div class="lc-print-frame" style="--focus: 42% 60%">${picture({ name: 'castle-cannons-group', sizes: '(min-width: 64em) min(30vw, 26rem), 100vw' })}</div>
      <figcaption>A city day at the Castle of Good Hope</figcaption>
    </figure>
    <figure class="lc-people__pair lc-people__pair--b" data-depth="-1" data-rise="people">
      <div class="lc-print-frame" style="--focus: 50% 46%">${picture({ name: 'winelands-garden-lunch', sizes: '(min-width: 64em) min(26vw, 23rem), 100vw' })}</div>
      <figcaption>Lunch in a Winelands garden</figcaption>
    </figure>
  </div>
</section>

${culinaryReveal({
  id: 'taste-title',
  words: `<p class="lc-mark"><span class="lc-mark__rule" aria-hidden="true"></span><span class="lc-mark__label">Beyond the scenery</span></p>
      <h2 class="lc-title lc-title--compact" id="taste-title">The Cape is also something <em>you taste.</em></h2>
      ${tasteRule}
      <p class="lc-lead">On the Winelands day there is wine and cheese at Fairview, then La Motte, Franschhoek and Lanzerac. Tasting fees and lunch are paid on the day, so you choose what to taste and where to eat.</p>
      ${travelNote({ href: tourHref(WINELANDS), label: 'The Winelands day' })}`,
  main: { name: 'winelands-host-pouring', focus: '56% 50%' },
  layer: { name: 'winelands-tasting-table', focus: '50% 50%' },
  caption: 'A tasting outdoors on a Winelands estate · Around the tasting table',
})}

<section class="lc-gallery" id="gallery" aria-labelledby="gallery-title">
  <div class="container">
    <div class="lc-gallery__head">
      ${chapterMark(7, 'The Living Travel Exhibition')}
      <h2 class="lc-title" id="gallery-title">Some memories never <em>leave the frame.</em></h2>
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
  mark: chapterMark(8, 'The Golden Cape', 'lc-mark--light'),
  title: 'Some days you wish could last <em>a little longer.</em>',
  line: 'Table Mountain across the bay, and a glass raised to the day.',
  action: travelNote({ href: 'tours/', label: 'Choose your day', tone: 'light' }),
  credit: 'Table Mountain across the bay · A Good Times photograph',
})}

<section class="lc-ease" aria-labelledby="ease-title">
  <div class="container">
    <div class="lc-ease__head">
      ${chapterMark(9, 'The Art of Making It Easy')}
      <h2 class="lc-title" id="ease-title">All the wonder. <em>None of the worry.</em></h2>
    </div>
    <div class="lc-ease__journey" data-journey>
      <svg class="lc-ease__line lc-ease__line--wide" viewBox="0 0 1200 120" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path class="lc-ease__trace" d="M30 60C120 60 196 20 296 24S404 60 440 60C522 60 600 102 700 96S810 60 850 60C934 60 1040 30 1170 42"/><path class="lc-ease__ink" pathLength="1" data-journey-ink d="M30 60C120 60 196 20 296 24S404 60 440 60C522 60 600 102 700 96S810 60 850 60C934 60 1040 30 1170 42"/></svg>
      <svg class="lc-ease__line lc-ease__line--tall" viewBox="0 0 60 900" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path class="lc-ease__trace" d="M30 20C8 160 52 300 30 450S8 740 30 880"/><path class="lc-ease__ink" pathLength="1" data-journey-ink d="M30 20C8 160 52 300 30 450S8 740 30 880"/></svg>
      <ol class="lc-ease__steps" role="list">
        <li class="lc-ease__step">
          <span class="lc-ease__stop" aria-hidden="true">${engraved('travel-folio')}</span>
          <p class="lc-ease__num">Step 1</p>
          <h3>Tell us your plans.</h3>
          <p>Share the places you’d love to see or the transfer you need: one of our ${tours.length} private tours and activities, a day built around you, or the Garden Route.</p>
        </li>
        <li class="lc-ease__step">
          <span class="lc-ease__stop" aria-hidden="true">${engraved('contact', { size: 30 })}</span>
          <p class="lc-ease__num">Step 2</p>
          <h3>Receive your personalised quote.</h3>
          <p>One of our team checks availability and replies with the details and your price, through your preferred contact method.</p>
        </li>
        <li class="lc-ease__step">
          <span class="lc-ease__stop" aria-hidden="true">${engraved('sun-seal')}</span>
          <p class="lc-ease__num">Step 3</p>
          <h3>Confirm your experience.</h3>
          <p>Once you’re happy with the arrangements, we confirm your booking, and on the day your guide collects you.</p>
        </li>
      </ol>
    </div>
    <div class="lc-ease__foot">
      ${sunSeal({ href: 'enquire/', label: 'Get a Quote' })}
      ${travelNote({ href: 'faq/', label: 'Questions first? Read the FAQ' })}
    </div>
  </div>
</section>

${storiesSection(site)}

<section class="lc-scene lc-scene--invite lc-dark" aria-labelledby="invite-title" style="--focus: 50% 34%; --focus-tall: 42% 30%" data-scene>
  <div class="lc-scene__media" aria-hidden="true"><div class="lc-scene__drift" data-scene-drift>${picture({ name: 'camps-bay-twelve-apostles', alt: '', sizes: '100vw' })}</div></div>
  <div class="lc-scene__scrim" aria-hidden="true"></div>
  <div class="container lc-scene__inner">
    <div class="lc-scene__words" data-scene-words>
      <span class="lc-invite-seal" aria-hidden="true">${engraved('sun-seal')}<svg class="lc-invite-seal__thread" viewBox="0 0 240 8" preserveAspectRatio="none" focusable="false"><path pathLength="1" data-thread d="M0 4C40 1 80 7 120 4S200 1 240 4"/></svg></span>
      ${chapterMark(11, 'Your Story Begins Here', 'lc-mark--light')}
      <h2 class="lc-statement lc-statement--scene" id="invite-title">The Cape is waiting. <span class="lc-statement__turn">Make the journey <em>yours.</em></span></h2>
    </div>
    <div class="lc-scene__close" data-scene-words>
      <p class="lc-scene__line">Tell us where you’d like to go. You’ll receive availability and a personalised quote, and nothing is booked or charged until we’ve confirmed it with you.</p>
      <div class="lc-scene__actions">
        ${sunSeal({ href: 'enquire/?type=tour', label: 'Request Your Tour', tone: 'light' })}
        ${quietOutline({ href: 'enquire/?type=transfer&transfer=airport-arrival', label: 'Arrange a Transfer', tone: 'light' })}
      </div>
    </div>
  </div>
  <p class="lc-scene__credit">Camps Bay below the Twelve Apostles · A Good Times photograph</p>
</section>

</div>`,
};
