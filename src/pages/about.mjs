import { esc, icon, button, picture, preloadFor, breadcrumb, sectionHead } from '../partials/ui.mjs';
import { focusOf } from '../partials/media.mjs';
import { frameSizes } from '../partials/culinary.mjs';


const crumbs = [{ label: 'Home', href: './' }, { label: 'About', href: 'about/' }];

/**
 * About: the company and its people, from the official About and Safety pages (read on 5 Nov 2026).
 * The services and destinations, the booking steps, the review themes and the guest gallery tell
 * the story on the home page; this page keeps who we are, how a journey is made personal and a few faces.
 *
 * Beside "Good journeys begin with good people": the penguins at Boulders Beach as the dominant
 * photograph and the Langa mural laid over its corner. They reveal in turn as they scroll into view
 * (culinary.js, the layered reveal); without motion they are simply in place.
 *
 * "Meet our team" shows again the photograph it showed until 6 Nov 2026, at the owner's request (brief of 6 Nov 2026, §2.5:
 * the team photograph taken at Aquila Game Reserve): guests and their guide at lunch, whole in a frame of its own 5:4. The
 * owner's portrait it replaced is now on the home page's people chapter. Every photograph on this page appears nowhere else
 * on the site (design/asset-manifest.md).
 */
const frame = (name, sizes, focus, ratio) =>
  `<div class="taste__frame" style="--focus: ${focusOf(name, focus)}${ratio ? `; --ratio: ${ratio}` : ''}" data-taste-frame>${picture({ name, sizes })}</div>`;

/** Real faces, real journeys: Good Times photographs (origins in the rights register), small placements only. */
const FACES = [
  { name: 'castle-cannon-pair', caption: 'At the Castle of Good Hope', focus: '40% 62%' },
  { name: 'good-hope-walk-couple', caption: 'On the Cape of Good Hope walk', focus: '50% 45%' },
  { name: 'winelands-tasting-deli', caption: 'A Winelands tasting stop', focus: '50% 70%' },
  { name: 'hout-bay-viewpoint-pair', caption: 'Above Hout Bay', focus: '56% 50%' },
];

export const page = {
  path: 'about/index.html',
  nav: 'about/',
  title: 'Our Story: about Good Times in Cape Town',
  description: 'Good Times in Cape Town was founded in 2014 by Stuart Matanhire: private, tailored tours of Cape Town and the Western Cape with accredited local guides.',
  priority: 0.7,
  breadcrumbs: crumbs,
  preload: [preloadFor('cape-coastline')],
  styles: ['assets/css/culinary.css'],
  scripts: ['assets/js/vendor/ScrollTrigger.min.js', 'assets/js/culinary.js'],
  body: ({ site }) => `
<section class="banner" style="--focus: 60% 50%; --focus-mobile: 66% 50%; --banner-h: clamp(26rem, 18rem + 22vw, 42rem)">
  <div class="banner__media">${picture({ name: 'cape-coastline', eager: true, fetchpriority: 'high', alt: '' })}</div>
  <div class="container">
    <div class="banner__content">
      ${breadcrumb(crumbs)}
      <h1>Our Story</h1>
      <p class="banner__sub">Showing people the Cape we love, since ${site.founded}.</p>
    </div>
  </div>
</section>

<section class="section" aria-labelledby="story-title">
  <div class="container intro-grid intro-grid--photo">
    <div class="intro" data-reveal>
      <p class="eyebrow">Who we are</p>
      <h2 id="story-title">We really like showing people around.</h2>
      <p>${esc(site.founder)} founded Good Times in Cape Town in ${site.founded} with a simple idea: share the beauty and diversity of the Mother City the way a friend would, in person and unhurried, with professional, accredited guides.</p>
      <p>Every tour we run is private and shaped around the people on it: the Cape Peninsula and its penguins, the city and its history, Langa, the Winelands, the coast and the Garden Route, with pickup from your accommodation on most days.</p>
    </div>
    <figure class="about-pair lc-scope" data-taste="reveal">
      <div class="about-pair__main" data-taste-main>${frame('boulders-beach-penguins', frameSizes('boulders-beach-penguins', [['(min-width: 64em)', 'min(44vw, 38rem)', 5 / 4], ['', '100vw', 5 / 4]]))}</div>
      <!-- Square, not the pair's usual 4:5: the four people in front of the mural span 54% of the photograph's width, more
           than a 4:5 inset shows (48%); a square shows 61% -->
      <div class="about-pair__layer" data-taste-layer>${frame('langa-mural-visit', frameSizes('langa-mural-visit', [['(min-width: 64em)', '13rem', 1], ['', '38vw', 1]]), undefined, '1')}</div>
      <figcaption class="about-pair__caption" data-taste-caption><span>Boulders Beach penguins</span><span class="about-pair__sep" aria-hidden="true"> · </span><span>A mural in Langa</span></figcaption>
    </figure>
  </div>
</section>

<section class="section section--paper" aria-labelledby="people-title">
  <div class="container people">
    <figure class="people__photo" data-reveal>
      <div class="media-frame" style="--ratio: 5 / 4; --focus: ${focusOf('winelands-garden-lunch')}">${picture({ name: 'winelands-garden-lunch', sizes: '(min-width: 64em) min(40vw, 34rem), 100vw' })}</div>
      <figcaption>Guests and their guide at lunch, on a day out with Good Times</figcaption>
    </figure>
    <div class="people__body" data-reveal style="--reveal-i:1">
      <p class="eyebrow">Meet our team</p>
      <h2 id="people-title">Founded by ${esc(site.founder)}.</h2>
      <p>Our team is a registered associate of the Cape Tourist Guides Association, and our guides are accredited tourist guides recognised by the National Department of Tourism under the Western Cape Department of Economic Affairs and Tourism. We are a Western Cape Tourism registered operator.</p>
      <p>Reviewers often mention Stuart by name: the calm, careful driving, the history shared along the way, and plans that change when the day needs them to.</p>
    </div>
  </div>
</section>

<section class="section" aria-labelledby="approach-title">
  <div class="container">
    ${sectionHead({ eyebrow: 'Our approach', title: 'Personal, local and safe.', id: 'approach-title', lead: 'Three things we never skip.' })}
    <ul class="themes" role="list">
      <li data-reveal><strong>A personal start</strong><span>We begin with your interests and preferences, then plan a private day, or several, around them.</span></li>
      <li data-reveal style="--reveal-i:1"><strong>Local insight</strong><span>Carefully planned routes and accredited guides who bring the places to life, from the famous sights to the good bits in between.</span></li>
      <li data-reveal style="--reveal-i:2"><strong>Support throughout</strong><span>A team you can reach before, during and after your tour, and nothing booked or charged until we have confirmed the arrangements with you.</span></li>
    </ul>
  </div>
</section>

<section class="section section--paper" aria-labelledby="faces-title">
  <div class="container">
    ${sectionHead({ eyebrow: 'On the road', title: 'Real faces, real journeys.', id: 'faces-title', lead: 'Photographs from our own days out with guests.' })}
    <div class="photo-grid photo-grid--4">
      ${FACES.map((p, i) => `<figure data-reveal style="--reveal-i:${i % 4}"><div class="media-frame"${p.focus ? ` style="--focus: ${p.focus}"` : ''}>${picture({ name: p.name, sizes: '(min-width: 48em) 23vw, 46vw' })}</div><figcaption>${esc(p.caption)}</figcaption></figure>`).join('\n      ')}
    </div>
  </div>
</section>

<section class="section cta" aria-labelledby="about-cta-title">
  <div class="container">
    <h2 id="about-cta-title">Come and see the Cape with us.</h2>
    <p class="lead">Private tours and transfers from Cape Town, confirmed with you before anything is booked.</p>
    <div class="cta__actions">
      ${button({ href: 'tours/', label: 'Explore Tours', variant: 'gold' })}
      ${button({ href: 'contact/', label: 'Contact Us', variant: 'ghost', icon: '' })}
    </div>
  </div>
</section>`,
};

export { icon };
