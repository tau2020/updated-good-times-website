/**
 * HeroServices: the home hero's words (the owner's hero-services brief of 7 Nov 2026, after the "Cape Town Good Times
 * Banner" reference). The headline, "Good Times Start Here!" (the owner's choice of 7 Nov 2026, in place of the Find
 * Your Good Time leaf): "Good Times" in white, "Start Here!" in leaf green on a lime brush swash. One sentence, its
 * last words underlined by a hand-painted lime brush mark. Good Times' four services, each an icon in a warm-white
 * circle, a title and a line. Two calls to action, Explore Our Tours and Our Experiences (the site's pills). One data
 * array, the site's own icon set, tokens and fonts; nothing new to load but its stylesheet.
 *
 * Where it sits is hero-services.css: on wide landscape screens the whole stack is over the photograph, in the one
 * stretch of it with no face (left of the group, above the sleeping friend); on every other screen the headline sits
 * bottom left in the hero (where the leaf was, below every face) and the sentence and services immediately beneath
 * the hero, on the band's navy. Its entrance is the hero's own GSAP timeline (assets/js/hero.js): the headline rises
 * and its swash draws, the sentence rises, the brush draws, the four services follow in turn. Everything is in the
 * page from the first paint (no layout shift); without motion it is simply there.
 */
import { esc, icon, button } from './ui.mjs';

export const HERO_HEADLINE = { first: 'Good Times', mark: 'Start Here!' };

export const HERO_LEAD = {
  text: 'Private tours, airport transfers and authentic Cape Town experiences',
  mark: 'tailored for you.',
};

/** The hero's two calls to action (the owner's choice of 7 Nov 2026, after the reference): the site's pills */
export const HERO_ACTIONS = [
  { href: 'tours/', label: 'Explore Our Tours', variant: 'primary' },
  { href: 'tours/#adventure', label: 'Our Experiences', variant: 'ghost' },
];

export const HERO_SERVICES = [
  { icon: 'camera', title: 'Private Tours', text: 'City, township & cultural experiences' },
  { icon: 'van', title: 'Airport Transfers', text: 'Reliable, safe & comfortable travel' },
  { icon: 'mountain', title: 'Adventure Add-ons', text: 'Wine, wildlife, scenic & outdoor experiences' },
  { icon: 'group', title: 'Custom Journeys', text: 'Personalised tours for individuals, families & groups' },
];

/**
 * The brush mark: one loaded stroke, pressed down on the left and dragged out to a dry, split tail on the right (two
 * bristle gaps masked through it, two loose hairs beside it). Decoration only; lime, the brand's accent.
 */
const BRUSH = `<svg class="hero-services__brush" viewBox="0 0 240 28" preserveAspectRatio="none" aria-hidden="true" focusable="false" data-intro>
      <defs><mask id="hero-services-dry" maskUnits="userSpaceOnUse" x="0" y="0" width="240" height="28"><rect width="240" height="28" fill="#fff"/><path d="M118 14.6C158 13.6 196 12.4 233 11.2" fill="none" stroke="#000" stroke-width="0.9"/><path d="M166 12.3C190 11.6 211 10.8 234 10.1" fill="none" stroke="#000" stroke-width="0.6"/></mask></defs>
      <path mask="url(#hero-services-dry)" d="M4.5 13.8C30 11.6 70 11.2 110 10.9C150 10.6 192 9.4 226 8.7C233 8.6 237.5 9.6 236.8 11C236 12.4 230 13 221 13.6C186 15.8 140 17.2 96 18.6C64 19.6 34 21.2 13 21.6C6.5 21.7 2 20.2 2.1 17.4C2.2 15.4 2.9 14.1 4.5 13.8Z"/>
      <path d="M150 9.2C176 8.2 204 7.2 228 6.6C230 6.6 230.4 7.3 228.6 7.5C204 8.4 178 9.4 151 10.2Z"/>
      <path d="M160 18.6C184 17.4 206 16.2 224 15.1C226.2 15 226.4 15.8 224.5 16.1C206 17.3 184 18.5 161 19.6Z"/>
    </svg>`;

/**
 * The swash behind "Start Here!": a broad loaded stroke, its ends ragged where the brush landed and lifted, two bristle
 * gaps masked through its tail and two loose hairs past it. Decoration only; lime, the brand's accent.
 */
const SWASH = `<svg class="hero-headline__swash" viewBox="0 0 300 80" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <defs><mask id="hero-headline-dry" maskUnits="userSpaceOnUse" x="0" y="0" width="300" height="80"><rect width="300" height="80" fill="#fff"/><path d="M150 31C200 29 240 28 292 27" fill="none" stroke="#000" stroke-width="1.3"/><path d="M172 51C212 51 250 50 290 49" fill="none" stroke="#000" stroke-width="0.9"/></mask></defs>
        <path mask="url(#hero-headline-dry)" d="M9 21C46 13 104 9 162 10C214 11 256 8 287 13C294 14 297 19 293 23C298 28 296 35 290 38C297 44 296 53 288 57C293 61 289 67 281 67C236 70 186 67 138 69C92 71 50 74 16 70C8 69 4 63 8 58C3 52 4 44 9 40C4 34 4 26 9 21Z"/>
        <path d="M262 17C276 15 290 14 299 16C300 17 299 18 297 18C288 17 276 18 263 19Z"/>
        <path d="M258 61C272 61 286 60 298 58C300 58 300 59 298 60C286 62 272 63 259 63Z"/>
      </svg>`;

export function heroServices() {
  return `<div class="hero-services" data-hero-services>
  <div class="hero-services__intro">
    <p class="hero-headline" data-intro>
      <span class="hero-headline__line">${esc(HERO_HEADLINE.first)}</span>
      <span class="hero-headline__line hero-headline__mark">${SWASH}<span class="hero-headline__start">${esc(HERO_HEADLINE.mark)}</span></span>
    </p>
    <p class="hero-services__lead" data-intro>${esc(HERO_LEAD.text)} <span class="hero-services__mark">${esc(HERO_LEAD.mark)}${BRUSH}</span></p>
  </div>
  <ul class="hero-services__list" role="list" aria-label="What we do">
    ${HERO_SERVICES.map(
      (s) => `<li class="hero-services__item" data-intro>
      <span class="hero-services__icon">${icon(s.icon)}</span>
      <span class="hero-services__title">${esc(s.title)}</span>
      <span class="hero-services__text">${esc(s.text)}</span>
    </li>`,
    ).join('\n    ')}
  </ul>
  <div class="hero-services__actions" data-intro>
    ${HERO_ACTIONS.map((a) => button({ href: a.href, label: a.label, variant: a.variant, cls: 'hero-services__cta' })).join('\n    ')}
  </div>
</div>`;
}
