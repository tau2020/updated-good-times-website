import { esc, button, coinButton } from '../partials/ui.mjs';
import { engraved, ENGRAVED_EMBLEMS, ENGRAVED_UTILITIES } from '../partials/engraved.mjs';
import { sunSeal, travelNote, quietOutline, chapterMark, serviceInvitation, SERVICES } from '../partials/living-cape.mjs';

/**
 * The Living Cape design system specimen: the engraved symbols side by side, the three
 * actions in every state and the scoped colour tokens, for review. Preview builds only: a
 * production build publishes no such page (`pages` is empty), so it never reaches the domain.
 */
const SWATCHES = [
  ['--lc-paper', '#F3F7F5', 'Primary editorial ground: sea-glass white'],
  ['--lc-paper-light', '#FFFFFF', 'Cards, captions, review panels'],
  ['--lc-ivory', '#E2EAE8', 'Soft neutral planes'],
  ['--lc-forest', '#102E42', 'Brand grounding: the logo’s ocean navy'],
  ['--lc-forest-deep', '#0B2233', 'Deep panels: the interlude, reviews, footer'],
  ['--lc-ink', '#0B1620', 'Headings: the logo’s near-black'],
  ['--lc-body', '#283037', 'Paragraphs'],
  ['--lc-muted', '#5B6670', 'Captions, metadata'],
  ['--lc-brass', '#3FA862', 'Fine rules and borders'],
  ['--lc-functional-gold', '#056A2B', 'Good Times green that carries text, icons and actions'],
  ['--gt-em', '#078A36', 'The logo’s green for emphasised words'],
  ['--lc-sun', '#F2C94C', 'Artwork only: the sunshine'],
  ['--lc-champagne', '#6FED8F', 'The reversed logo’s green: accents on navy'],
  ['--lc-atlantic', '#3C6B86', 'Cool counterpoint'],
  ['--lc-stone-line', '#D3DFDB', 'Hairlines on light surfaces'],
  ['--lc-focus', '#174F86', 'Focus ring on light grounds'],
];

const body = () => `
<div class="living-cape lc-specimen">
  <section class="lc-specimen__band">
    <div class="container">
      ${chapterMark(0, 'Design system')}
      <h1 class="lc-title">The Cape, <em>A Living Story</em></h1>
      <p class="lc-lead">The engraved travel symbols, the three actions and the scoped tokens of the Good Times in Cape Town website. A review page for preview builds only.</p>
    </div>
  </section>

  <section class="lc-specimen__band" aria-labelledby="ds-emblems">
    <div class="container">
      <h2 class="lc-specimen__h" id="ds-emblems">Signature emblems · 48 grid · 1.6 stroke</h2>
      <ul class="lc-specimen__icons lc-specimen__icons--emblems" role="list">
        ${ENGRAVED_EMBLEMS.map((n) => `<li><span>${engraved(n, { size: 64 })}${engraved(n, { size: 36 })}${engraved(n, { size: 28 })}</span><code>${n}</code></li>`).join('\n        ')}
      </ul>
      <ul class="lc-specimen__icons lc-specimen__icons--emblems lc-specimen__icons--dark lc-dark" role="list">
        ${ENGRAVED_EMBLEMS.map((n) => `<li><span>${engraved(n, { size: 36 })}</span><code>${n}</code></li>`).join('\n        ')}
      </ul>
      <h2 class="lc-specimen__h">Utility family · 24 grid · 1.5 stroke</h2>
      <ul class="lc-specimen__icons" role="list">
        ${ENGRAVED_UTILITIES.map((n) => `<li><span>${engraved(n, { size: 32 })}${engraved(n, { size: 24 })}${engraved(n, { size: 18 })}</span><code>${n}</code></li>`).join('\n        ')}
      </ul>
    </div>
  </section>

  <section class="lc-specimen__band" aria-labelledby="ds-actions">
    <div class="container">
      <h2 class="lc-specimen__h" id="ds-actions">The button system (assets/css/buttons.css)</h2>
      <p class="lc-body">The flagship, with the medallion, for the header and the Travel Concierge:</p>
      <div class="lc-specimen__row">${coinButton({ href: 'enquire/' })}</div>
      <p class="lc-body">Primary, the Good Times green plate: default, hover, pressed, keyboard focus, loading, disabled; prominent; compact.</p>
      <div class="lc-specimen__row">
        ${sunSeal({ href: 'enquire/', label: 'Get a Quote' })}
        ${sunSeal({ href: 'enquire/', label: 'Hover', cls: 'is-hover' })}
        ${button({ href: 'enquire/', label: 'Pressed', variant: 'gold', cls: 'is-pressed' })}
        ${button({ href: 'enquire/', label: 'Keyboard focus', variant: 'gold', cls: 'is-focus' })}
        ${sunSeal({ href: 'enquire/', label: 'Sending your request', cls: 'is-loading', attrs: 'aria-busy="true"' })}
        ${sunSeal({ href: 'enquire/', label: 'Fully booked that day', attrs: 'aria-disabled="true" tabindex="-1"' })}
        ${button({ href: 'enquire/', label: 'Request a Quote', variant: 'gold', size: 'compact' })}
      </div>
      <p class="lc-body">Secondary, tertiary, utility and danger:</p>
      <div class="lc-specimen__row">
        ${quietOutline({ href: 'enquire/?type=transfer&transfer=airport-arrival', label: 'Arrange a Transfer' })}
        ${button({ href: 'contact/', label: 'Contact Us', variant: 'outline' })}
        ${button({ href: 'contact/', label: 'Hover', variant: 'outline', cls: 'is-hover' })}
        ${travelNote({ href: 'destinations/', label: 'All destinations' })}
        <button class="gt-button gt-button--utility" type="button">Previous</button>
        <button class="gt-button gt-button--utility" type="button" aria-disabled="true">Next</button>
        <button class="gt-button gt-button--danger" type="button">Remove this traveller</button>
      </div>
      <div class="lc-specimen__row lc-specimen__row--dark lc-dark">
        ${sunSeal({ href: 'enquire/', label: 'Request Your Tour', tone: 'light' })}
        ${quietOutline({ href: 'enquire/', label: 'Arrange a Transfer', tone: 'light' })}
        ${travelNote({ href: 'transfers/#safari', label: 'Safari reserve transfers', tone: 'light' })}
        <button class="gt-button gt-button--utility gt-button--on-dark" type="button">Previous</button>
        <button class="gt-button gt-button--utility gt-button--on-dark" type="button">Next</button>
      </div>
      <p class="lc-body">No control carries an arrow. Tab through this page to see the focus ring: 3 px, offset 3 px, ocean blue on light grounds and champagne on deep ones.</p>
    </div>
  </section>

  <section class="lc-specimen__band" aria-labelledby="ds-invites">
    <div class="container">
      <h2 class="lc-specimen__h" id="ds-invites">Service invitations (the concierge cards)</h2>
      <ul class="lc-specimen__invites" role="list">
        ${SERVICES.map((s) => `<li>${serviceInvitation(s, { level: 'p', variant: 'menu' })}</li>`).join('\n        ')}
      </ul>
    </div>
  </section>

  <section class="lc-specimen__band" aria-labelledby="ds-tokens">
    <div class="container">
      <h2 class="lc-specimen__h" id="ds-tokens">Tokens, scoped to .living-cape and the concierge</h2>
      <ul class="lc-specimen__swatches" role="list">
        ${SWATCHES.map(([t, v, use]) => `<li><span style="background: var(${t})"></span><code>${t}</code><small>${v} · ${esc(use)}</small></li>`).join('\n        ')}
      </ul>
    </div>
  </section>
</div>`;

export const page = {
  path: 'design-system/index.html',
  nav: null,
  title: 'Design system (preview)',
  description: 'The Living Cape design system for Good Times in Cape Town: engraved travel symbols, the button system in every state, and the scoped colour tokens.',
  noindex: true,
  styles: ['assets/css/living-cape.css'],
  body,
};

const { site } = await import('../data/site.mjs');
/** Preview builds only: production publishes no specimen page. */
export const pages = site.preview ? [page] : [];
