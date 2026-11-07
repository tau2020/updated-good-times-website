/**
 * The Living Cape design system's shared components:
 * the Sun Seal, Travel Note and Quiet Outline actions, the four service invitations and
 * the Travel Concierge (the desktop folio and the service rows of the mobile menu).
 *
 * Everything here is namespaced (`lc-…`, `gt-concierge…`) and styled by
 * assets/css/living-cape-system.css, so nothing restyles the approved hero, the
 * header's default bar or its Book Now coin. Every href is a real route of this site.
 */
import { esc, icon, picture, coinButton, artPanel, leafButton } from './ui.mjs';
import { engraved } from './engraved.mjs';
import { tours } from '../data/tours.mjs';
import { packages } from '../data/packages.mjs';

/**
 * The Living Cape's three actions, members of the site's leaf-green button system (assets/css/buttons.css,
 * design/button-design.md): Sun Seal is the primary (Leaf Green, prominent size), Travel Note the tertiary (words
 * over a fine rule), Quiet Outline the secondary (Soft Leaf on a light ground; over a photograph, `tone: 'light'`,
 * the solid white on-image pill, so it reads on any picture). No arrows; the old class names stay as hooks. The
 * compass medallion is kept for the flagship (coinButton in ui.mjs).
 */
export function sunSeal({ href, label, tone = '', cls = '', attrs = '', owner = '' }) {
  // The home page's closing actions are the signature leaf (the brief of 6 Nov 2026), large; "Plan My Day" carries the
  // signature's one description (ui.mjs). owner: the scene whose timeline plays its entrance (living-cape.js)
  return leafButton({ href, label, size: 'large', cls: ['lc-seal', tone && `lc-seal--${tone}`, cls].filter(Boolean).join(' '), attrs, owner });
}

/** Travel Note: an editorial link, the tertiary action. */
export function travelNote({ href, label, hidden = '', tone = '', cls = '', attrs = '' }) {
  return `<a class="gt-button gt-button--tertiary${tone === 'light' ? ' gt-button--on-dark' : ''} lc-note${tone ? ` lc-note--${tone}` : ''}${cls ? ` ${cls}` : ''}" href="${esc(href)}"${attrs ? ` ${attrs}` : ''}><span class="lc-note__label">${esc(label)}${hidden ? `<span class="visually-hidden"> ${esc(hidden)}</span>` : ''}</span></a>`;
}

/** Quiet Outline: the secondary action beside a primary one; a meaningful icon only (an aircraft, a quote). */
export function quietOutline({ href, label, icon = '', tone = '', cls = '', attrs = '' }) {
  return `<a class="gt-button ${tone === 'light' ? 'gt-button--on-image' : 'gt-button--secondary'} gt-button--large lc-quiet${tone ? ` lc-quiet--${tone}` : ''}${cls ? ` ${cls}` : ''}" href="${esc(href)}"${attrs ? ` ${attrs}` : ''}>${icon ? engraved(icon, { cls: 'lc-quiet__icon' }) : ''}<span>${esc(label)}</span></a>`;
}

/** Chapter marker: "Chapter 03" in small caps beside a fine rule. */
export const chapterMark = (n, label, cls = '') =>
  `<p class="lc-mark${cls ? ` ${cls}` : ''}"><span class="lc-mark__num">${String(n).padStart(2, '0')}</span><span class="lc-mark__rule" aria-hidden="true"></span><span class="lc-mark__label">${esc(label)}</span></p>`;

/**
 * The four ways in, shared by the concierge, the mobile menu and the home page's services chapter.
 * Facts from src/data (the official site): every tour is private and shaped around the group; the
 * airport transfer meets you at arrivals with a name board; the adventure activities are quad biking,
 * tandem skydiving and shark cage diving; a custom day or the multi-day Garden Route tour.
 * Each is shown with a real Good Times photograph.
 * `name` titles the service on the home page; `action` is the invitation under it there
 * and the card's own title in the Travel Concierge and the phone menu, where each card is the action itself.
 */
const NUMBER = ['none', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const ADVENTURES = tours.filter((t) => t.categories.includes('adventure'));
const DAY_TOURS = tours.filter((t) => !t.categories.includes('adventure'));
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export const SERVICES = [
  {
    id: 'tours',
    icon: 'cape-compass',
    name: 'Private Tours',
    line: `${cap(NUMBER[DAY_TOURS.length] || String(DAY_TOURS.length))} private tours from your accommodation, with only your group and your guide.`,
    short: `${DAY_TOURS.length} private tours`,
    href: 'tours/',
    action: 'Explore Tours',
    // One photograph per service, on its home-page card and its Travel Concierge row alike (a scene, a badge), and
    // nowhere else (audit/image-change-register.md)
    image: 'chapmans-peak-wall-trio',
    focus: '58% 62%',
    badge: 'car',
  },
  {
    id: 'airport',
    icon: 'arrival',
    name: 'Airport Transfers',
    line: 'Met at Cape Town International with a name board and driven privately to your door.',
    short: 'Meet and greet at CPT',
    href: 'transfers/#airport',
    action: 'Arrange My Transfer',
    image: 'transfer-driver-selfie',
    focus: '50% 42%',
    badge: 'plane',
  },
  {
    id: 'adventure',
    icon: 'cape-route',
    name: 'Adventure Activities',
    line: `${cap(ADVENTURES.map((t) => t.shortTitle.toLowerCase()).join(', ').replace(/, ([^,]*)$/, ' and $1'))}, arranged for you.`,
    short: 'Quads, skydives and sharks',
    href: 'tours/#adventure',
    action: 'Add an Adventure',
    // Not a Good Times photograph (L, credited): Good Times' few adventure photographs are the activities' own pages
    image: 'shark-cage-gansbaai',
    focus: '60% 40%',
    badge: 'wave',
  },
  {
    id: 'journey',
    icon: 'travel-folio',
    name: 'Custom Journeys',
    line: `A day shaped around you, or ${NUMBER[packages.length] || packages.length} multi-day ${packages.length === 1 ? 'tour' : 'tours'} along the Garden Route.`,
    short: 'A custom day or several',
    href: 'enquire/?type=tour&tour=custom',
    action: 'Tailor Your Journey',
    image: 'cape-point-boardwalk-walk',
    focus: '52% 55%',
    badge: 'map',
  },
];

/**
 * A service invitation card (the Travel Concierge): a photograph filling the card, a
 * round badge with the service's symbol, and the action and one line in ivory over a shade at its foot. The whole card
 * is its link (the name's link reaches over it). The photograph sets a scene beside the words, so it is decorative.
 */
export function serviceInvitation(s, { level = 'h3', variant = '' } = {}) {
  const tag = level;
  return `<article class="lc-invite${variant ? ` lc-invite--${variant}` : ''}" data-service="${s.id}">
  <div class="lc-invite__photo" style="--focus: ${s.menuFocus || s.focus}">${picture({ name: s.menuImage || s.image, alt: '', sizes: '(min-width: 90em) 20rem, (min-width: 64em) 24vw, 46vw' })}</div>
  ${s.badge ? `<span class="lc-invite__badge" aria-hidden="true">${icon(s.badge)}</span>` : ''}
  <${tag} class="lc-invite__name"><a href="${esc(s.href)}">${esc(s.action)}</a></${tag}>
  <p class="lc-invite__line">${esc(s.line)}</p>
</article>`;
}

/**
 * The Travel Concierge: a trigger in the header bar (from 64em, beside the
 * approved navigation, which keeps its five titles) and a folio panel in its own fixed
 * layer below the header, so opening it never moves the hero or the bar. The panel lives
 * outside <header>. Without JavaScript the trigger stays hidden and the navigation, the
 * footer and the mobile menu carry every route.
 */
export function conciergeTrigger() {
  return `<div class="gt-concierge" data-concierge-root>
      <button class="gt-concierge__toggle" type="button" data-concierge-toggle aria-expanded="false" aria-controls="concierge" hidden>
        ${engraved('compass', { cls: 'gt-concierge__glyph' })}<span class="gt-concierge__toggle-label">Concierge</span><span class="visually-hidden"> menu: services, destinations and booking</span>
      </button>
    </div>`;
}

/**
 * The Travel Concierge panel: a sheet that slides in from the right over a dimmed page,
 * a modal dialog with its own close button. The four services as photograph cards; the popular private days with
 * their photographs; the invitation to plan with the signature Plan My Day (the compass medallion); the direct line;
 * and Cape Point's cliffs fading into the corner. `reach` is the direct line (layout.mjs, verified only).
 */
export function conciergePanel({ bookHref = 'enquire/', reach = '' } = {}) {
  return `<div class="gt-concierge-panel lc-scope" id="concierge" data-concierge-panel hidden>
  <div class="gt-concierge-panel__backdrop" data-concierge-backdrop></div>
  <div class="gt-concierge-panel__sheet" data-concierge-clip role="dialog" aria-modal="true" aria-labelledby="concierge-title">
    <div class="gt-concierge-panel__scene" aria-hidden="true">${picture({ name: 'cape-point-coast-view', alt: '', sizes: '28rem' })}</div>
    <button class="gt-concierge-panel__close" type="button" data-concierge-close aria-label="Close the Travel Concierge">${icon('close')}</button>
    <div class="gt-concierge-panel__inner">
      <div class="gt-concierge-panel__head">
        <p class="gt-concierge-panel__eyebrow">Travel Concierge</p>
        <p class="gt-concierge-panel__title" id="concierge-title">Where would you like to <em>begin?</em></p>
      </div>
      <ul class="gt-concierge-panel__services" role="list">
        ${SERVICES.map((s) => `<li>${serviceInvitation(s, { level: 'p', variant: 'menu' })}</li>`).join('\n        ')}
      </ul>
      <nav class="gt-concierge-panel__index" aria-labelledby="concierge-days">
        <p class="gt-concierge-panel__heading" id="concierge-days">Popular private days</p>
        <ul role="list">
          ${tours.filter((t) => t.featured).map((t) => `<li><a class="gt-concierge__day" href="tours/${t.slug}/"><span class="gt-concierge__thumb">${t.images.card ? picture({ name: t.images.card, alt: '', sizes: '56px' }) : artPanel({ cls: 'art-panel--thumb' })}</span><span>${esc(t.shortTitle)}</span></a></li>`).join('\n          ')}
        </ul>
        <a class="gt-button gt-button--tertiary gt-concierge__all" href="tours/">View All Private Tours</a>
      </nav>
      <div class="gt-concierge-panel__book">
        <div>
          <p class="gt-concierge-panel__heading">Tell us what you have in mind</p>
          <p class="gt-concierge-panel__note">We’ll reply with availability and a personalised quote, and nothing is booked until we’ve confirmed it with you.</p>
        </div>
        ${coinButton({ href: bookHref, cls: 'gt-concierge-panel__cta' })}
      </div>
      ${reach}
    </div>
  </div>
</div>`;
}

/**
 * The mobile menu's concierge rows (below 64em, in the existing drawer): the four services
 * as thumb-sized rows, a small photograph left and the action with its line beside it, above the drawer's own list. Plain list
 * markup: the drawer's structure and its focus trap are unchanged.
 */
export function drawerServices() {
  return `<p class="eyebrow drawer__eyebrow">Travel Concierge</p>
  <ul class="gt-concierge-rows" role="list">
    ${SERVICES.map((s) => `<li><a class="gt-concierge-row" href="${esc(s.href)}"><span class="gt-concierge-row__photo" style="--focus: ${s.menuFocus || s.focus}">${picture({ name: s.menuImage || s.image, alt: '', sizes: '64px' })}</span><span class="gt-concierge-row__text"><span class="gt-concierge-row__name">${esc(s.action)}</span><span class="gt-concierge-row__line">${esc(s.short)}</span></span></a></li>`).join('\n    ')}
  </ul>`;
}
