import { esc, button, ctaButton, SIGNATURE_CTA } from '../partials/ui.mjs';
import { engraved, ENGRAVED_EMBLEMS, ENGRAVED_UTILITIES } from '../partials/engraved.mjs';
import { sunSeal, travelNote, quietOutline, chapterMark, serviceInvitation, SERVICES } from '../partials/living-cape.mjs';

/**
 * The Living Cape design system specimen: the engraved symbols side by side, the three
 * actions in every state and the scoped colour tokens, for review. Preview builds only: a
 * production build publishes no such page (`pages` is empty), so it never reaches the domain.
 */
const SWATCHES = [
  // The leaf-green action palette and its neutrals ("Good Times, Naturally", design/button-design.md)
  ['--green-primary', '#147D43', 'Leaf Green: primary buttons, links and accents (white on it 5.2:1)'],
  ['--green-hover', '#106638', 'The primary under the pointer (white on it 7.0:1)'],
  ['--green-deep', '#105B35', 'Pressed, Soft Leaf words, the primary’s edge (white on it 8.2:1)'],
  ['--green-leaf-light', '#DFF3DE', 'Soft Leaf buttons, avatars, selected states'],
  ['--green-soft-background', '#EFF8F0', 'Soft leaf grounds: the Peninsula photograph, the reviews'],
  ['--green-lime-accent', '#C9E970', 'Decoration only: the focus ring on dark grounds'],
  ['--ink-primary', '#10241D', 'Headings and the focus ring on light grounds'],
  ['--surface-sand', '#F7F2EA', 'Warm sand: the credentials strip, tour chips'],
  // The Living Cape's own tokens, mapped onto the palette above
  ['--lc-paper', '#F3F7F5', 'Primary editorial ground: sea-glass white'],
  ['--lc-paper-light', '#FFFFFF', 'Cards, captions, review panels'],
  ['--lc-ivory', '#E2EAE8', 'Soft neutral planes'],
  ['--lc-forest', '#102E42', 'Brand grounding: the logo’s ocean navy'],
  ['--lc-forest-deep', '#0B2233', 'Deep panels: the interlude, footer'],
  ['--lc-ink', '#10241D', 'Headings: --ink-primary'],
  ['--lc-body', '#283037', 'Paragraphs'],
  ['--lc-muted', '#5B6670', 'Captions, metadata'],
  ['--lc-brass', '#3FA862', 'Fine rules and borders'],
  ['--lc-functional-gold', '#147D43', 'Green that carries text, icons and actions: --green-primary'],
  ['--gt-em', '#147D43', 'Emphasised words in headings: --green-primary'],
  ['--lc-sun', '#F2C94C', 'Artwork only: the sunshine'],
  ['--lc-champagne', '#6FED8F', 'The reversed logo’s green: accents on navy'],
  ['--lc-atlantic', '#3C6B86', 'Cool counterpoint'],
  ['--lc-stone-line', '#D3DFDB', 'Hairlines on light surfaces'],
  ['--lc-focus', '#10241D', 'Focus ring on light grounds (lime #C9E970 on dark ones)'],
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
      <h2 class="lc-specimen__h" id="ds-actions">The leaf-green button system (assets/css/buttons.css, design/button-design.md)</h2>
      <p class="lc-body">The flagship, with the compass medallion, for the header and the Travel Concierge:</p>
      <div class="lc-specimen__row">${ctaButton({ href: 'enquire/', label: SIGNATURE_CTA })}</div>
      <p class="lc-body">Primary · Leaf Green: default, hover, pressed, keyboard focus, loading, disabled; prominent; compact.</p>
      <div class="lc-specimen__row">
        ${sunSeal({ href: 'enquire/', label: 'Get a Quote' })}
        ${sunSeal({ href: 'enquire/', label: 'Hover', cls: 'is-hover' })}
        ${button({ href: 'enquire/', label: 'Pressed', variant: 'gold', cls: 'is-pressed' })}
        ${button({ href: 'enquire/', label: 'Keyboard focus', variant: 'gold', cls: 'is-focus' })}
        ${sunSeal({ href: 'enquire/', label: 'Sending your request', cls: 'is-loading', attrs: 'aria-busy="true"' })}
        ${sunSeal({ href: 'enquire/', label: 'Fully booked that day', attrs: 'aria-disabled="true" tabindex="-1"' })}
        ${button({ href: 'enquire/', label: 'Request a Quote', variant: 'gold', size: 'compact' })}
      </div>
      <p class="lc-body">Secondary · Soft Leaf, Outline · Fresh Air, tertiary, utility and danger:</p>
      <div class="lc-specimen__row">
        ${quietOutline({ href: 'enquire/?type=transfer&transfer=airport-arrival', label: 'Arrange a Transfer' })}
        ${button({ href: 'contact/', label: 'View Details', variant: 'secondary' })}
        ${button({ href: 'contact/', label: 'Hover', variant: 'secondary', cls: 'is-hover' })}
        <a class="gt-button gt-button--outline" href="destinations/">Discover More</a>
        <a class="gt-button gt-button--outline is-hover" href="destinations/">Hover</a>
        ${travelNote({ href: 'destinations/', label: 'All destinations' })}
        <button class="gt-button gt-button--utility" type="button">Previous</button>
        <button class="gt-button gt-button--utility" type="button" aria-disabled="true">Next</button>
        <button class="gt-button gt-button--danger" type="button">Remove this traveller</button>
      </div>
      <div class="lc-specimen__row lc-specimen__row--dark lc-dark">
        ${sunSeal({ href: 'enquire/', label: 'Plan My Day', tone: 'light' })}
        ${quietOutline({ href: 'enquire/', label: 'Arrange a Transfer', tone: 'light' })}
        ${travelNote({ href: 'transfers/#safari', label: 'Safari reserve transfers', tone: 'light' })}
        <button class="gt-button gt-button--utility gt-button--on-dark" type="button">Previous</button>
        <button class="gt-button gt-button--utility gt-button--on-dark" type="button">Next</button>
      </div>
      <p class="lc-body">No control carries an arrow or a leaf: the pill lifts 2 px under the pointer. Tab through this page to see the focus ring: 3 px, offset 3 px, ink on light grounds and lime on deep ones and photographs (the white on-image pill, Arrange a Transfer above).</p>
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
