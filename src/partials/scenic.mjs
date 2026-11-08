/**
 * ScenicBackdrop: a section's faint photographic plane (src/data/scenic.mjs, src/assets/css/scenic.css).
 *
 *   <section class="lc-memory gt-scenic-host"> ${scenicLayer('memory')} …content… </section>
 *
 * The layer is decoration: aria-hidden, no alt text, never focusable or clickable, lazy-loaded below the fold and
 * fetched at low priority. The host section keeps its own background colour; the plane sits on it at the placement's
 * presence, and the content above it is untouched (never given opacity). A placement whose renditions were not built
 * renders nothing, so a page never points at a missing file.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sceneByName, placementById } from '../data/scenic.mjs';

const GENERATED = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'scenic.generated.json');
const generated = existsSync(GENERATED) ? JSON.parse(readFileSync(GENERATED, 'utf8')) : {};

/**
 * What each variant's image is drawn at, for the browser's choice of file. On phones the side accent spans the screen,
 * but at its presence (18% or less, washed) a file half that width looks the same and weighs half as much.
 */
const SIZES = {
  copy: '100vw',
  bleed: '100vw',
  side: '(min-width: 64em) 44vw, 50vw',
};

export function scenicLayer(id) {
  const p = placementById(id);
  if (!p) throw new Error(`scenicLayer: no placement "${id}" in src/data/scenic.mjs`);
  const s = sceneByName(p.scene);
  const g = generated[s?.name];
  if (!s || !g?.widths?.length) return '';
  const file = (w, ext) => `assets/img/scenic/${s.name}-${w}.${ext}`;
  const set = (ext) => g.widths.map((w) => `${file(w, ext)} ${w}w`).join(', ');
  const sizes = SIZES[p.variant] || '100vw';
  const largest = g.widths[g.widths.length - 1];
  const h = Math.round(largest * (g.height / g.width));
  const style = [`--gt-scene-opacity: ${p.opacity}`, `--gt-scene-focal-desktop: ${p.focal}`, `--gt-scene-focal-mobile: ${p.focalMobile || p.focal}`].join('; ');
  const cls = ['gt-scenic', `gt-scenic--${p.variant}`, p.held ? 'gt-scenic--held' : ''].filter(Boolean).join(' ');
  return `<div class="${cls}" aria-hidden="true" data-scenic="${p.id}" style="${style}">
    <div class="gt-scenic__plane"><picture>
      <source type="image/avif" srcset="${set('avif')}" sizes="${sizes}">
      <source type="image/webp" srcset="${set('webp')}" sizes="${sizes}">
      <img src="${file(g.widths[Math.min(1, g.widths.length - 1)], 'webp')}" alt="" width="${largest}" height="${h}" loading="lazy" decoding="async" fetchpriority="low">
    </picture></div>
    <div class="gt-scenic__wash"></div>
  </div>`;
}
