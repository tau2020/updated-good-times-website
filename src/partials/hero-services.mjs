/**
 * HeroServices: the home hero's services (the owner's hero-services brief of 7 Nov 2026, after the "Cape Town Good
 * Times Banner" reference). One sentence, its last words underlined by a hand-painted lime brush mark, and Good Times'
 * four services, each an icon in a warm-white circle, a title and a line. One data array, the site's own icon set,
 * tokens and fonts; nothing new to load but its stylesheet.
 *
 * Where it sits is hero-services.css: over the photograph on wide landscape screens, in the one stretch of it with no
 * face (left of the group, above the sleeping friend), and on every other screen immediately beneath the hero, on
 * the band's navy, so the approved one-screen hero above is never crowded. Its entrance is a segment of the hero's
 * own GSAP timeline (assets/js/hero.js): the sentence rises, the brush draws, the four services follow in turn.
 * Everything is in the page from the first paint (no layout shift); without motion it is simply there.
 */
import { esc, icon } from './ui.mjs';

export const HERO_LEAD = {
  text: 'Private tours, airport transfers and authentic Cape Town experiences',
  mark: 'tailored for you.',
};

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

export function heroServices() {
  return `<div class="hero-services" data-hero-services>
  <p class="hero-services__lead" data-intro>${esc(HERO_LEAD.text)} <span class="hero-services__mark">${esc(HERO_LEAD.mark)}${BRUSH}</span></p>
  <ul class="hero-services__list" role="list" aria-label="What we do">
    ${HERO_SERVICES.map(
      (s) => `<li class="hero-services__item" data-intro>
      <span class="hero-services__icon">${icon(s.icon)}</span>
      <span class="hero-services__title">${esc(s.title)}</span>
      <span class="hero-services__text">${esc(s.text)}</span>
    </li>`,
    ).join('\n    ')}
  </ul>
</div>`;
}
