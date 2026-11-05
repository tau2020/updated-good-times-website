import { icon, button, breadcrumb } from '../partials/ui.mjs';
import { destinationCard } from '../partials/cards.mjs';
import { quietMoment } from '../partials/culinary.mjs';
import { destinations } from '../data/tours.mjs';

const crumbs = [{ label: 'Home', href: './' }, { label: 'Destinations', href: 'destinations/' }];

export const page = {
  path: 'destinations/index.html',
  nav: 'destinations/',
  title: 'Destinations',
  description: 'Where Good Times’ private tours go: the Cape Peninsula, Cape Town and Langa, the Cape Winelands, the Overberg coast from Hermanus to Cape Agulhas, and the Garden Route.',
  priority: 0.7,
  breadcrumbs: crumbs,
  // The Quiet Culinary Moment: one table between the places and the call to plan a day
  styles: ['assets/css/culinary.css'],
  scripts: ['assets/js/vendor/ScrollTrigger.min.js', 'assets/js/culinary.js'],
  body: () => `
<section class="page-head">
  <div class="container">
    ${breadcrumb(crumbs)}
    <p class="eyebrow">Where we go</p>
    <h1>Destinations</h1>
    <p class="lead">Every place below is on one of our private tours from Cape Town. Pick a destination to see the days that go there.</p>
  </div>
</section>

<section class="section section--paper" aria-label="Destinations">
  <div class="container">
    <div class="grid grid--3">
      ${destinations.map((d, i) => destinationCard(d, { i })).join('\n      ')}
    </div>
    <p class="source-note mt-6">Descriptions are drawn from our own tour pages. Quad biking and skydiving take place at the operators’ own sites near Cape Town, so they are not listed by destination.</p>
  </div>
</section>

${quietMoment({
  id: 'flavours-title',
  eyebrow: 'Beyond the scenery',
  title: 'Discover the Cape’s flavours',
  text: 'Between the views come the tables: wine and cheese at Fairview, a long lunch under the vines wherever you choose to stop. Tell us what you’d love to taste, and we’ll plan a private day around it.',
  image: { name: 'winelands-pergola-lunch', focus: '50% 54%' },
})}

<section class="section cta" aria-labelledby="destinations-cta">
  <div class="container">
    <p class="eyebrow">Somewhere else in mind?</p>
    <h2 id="destinations-cta">Tell us where you’d like to go.</h2>
    <p class="lead">Ask for a custom private day or a transfer on another route, and we’ll let you know how we can help, with availability and a quote.</p>
    <div class="cta__actions">
      ${button({ href: 'enquire/?type=tour&tour=custom', label: 'Tailor Your Journey', variant: 'gold' })}
      ${button({ href: 'enquire/?type=transfer&transfer=other', label: 'Arrange a Transfer', variant: 'ghost', icon: 'car' })}
    </div>
  </div>
</section>`,
};

export { icon };
