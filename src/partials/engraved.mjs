/**
 * Engraved travel symbols: one family of fine-line marks for the home page's
 * chapters and the Travel Concierge. Original drawings, no third-party paths.
 *
 *   engraved('cape-compass')                    decorative (aria-hidden), 24 px by default
 *   engraved('arrival', { cls: 'x', size: 32 }) a class and a rendered size
 *
 * Construction: utilities on a 24 × 24 grid at a 1.5 stroke, signature service emblems on a
 * 48 × 48 grid at a 1.6 stroke (a finer line once drawn at 28–44 px), round caps and joins,
 * no fills except the few dots that mark a point, all in currentColor, and a 2-unit optical
 * margin. Every mark carries the namespaced class `gt-engraved-icon`, so nothing here
 * restyles the site's existing `svg.icon` set, which the approved hero and header use.
 * The SVG is always decorative: an icon-only control takes its name from the button.
 */

/** Dots on a ring, drawn as zero-length round-capped strokes (they scale with the stroke). */
const dots = (cx, cy, r, n, offset = 0) =>
  Array.from({ length: n }, (_, i) => {
    const a = ((i * 360) / n + offset) * (Math.PI / 180);
    const x = (cx + r * Math.cos(a)).toFixed(2);
    const y = (cy + r * Math.sin(a)).toFixed(2);
    return `M${x} ${y}h.01`;
  }).join('');

/** Rays between two radii, every `step` degrees from `offset`. */
const rays = (cx, cy, r1, r2, n, offset = 0) =>
  Array.from({ length: n }, (_, i) => {
    const a = ((i * 360) / n + offset) * (Math.PI / 180);
    const p = (r) => `${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`;
    return `M${p(r1)}L${p(r2)}`;
  }).join('');

/** Signature service emblems, 48 × 48. */
const EMBLEMS = {
  // Compass rose over Table Mountain's flat-topped ridge: the private tour
  'cape-compass': `<circle cx="24" cy="24" r="18"/><path d="M24 3.5v4.2M24 40.3v4.2M3.5 24h4.2M40.3 24h4.2"/><path d="M24 9.4l2.2 8.6L24 20l-2.2-2z"/><path d="M7.1 30.2l6.6-6.4 2.6 2.4 2-3.4h12.2l1.4 2.6c1.4-1.6 3.8-1.6 5 .2l4.2 4.6"/>`,
  // An aircraft on its approach, the descent traced to the horizon: the airport arrival
  arrival: `<g transform="translate(16.4 15.6) rotate(31)"><path d="M8.5-1.3H2.5L-2.6-9H-5l2.8 7.7h-4.6l-2.4-3H-10.8l1.2 4.3-1.2 4.3h1.6l2.4-3h4.6L-5 9h2.4l5.1-7.7h6c1.3 0 2.3-.6 2.3-1.3s-1-1.3-2.3-1.3z"/></g><path d="M28.4 23.7c3.6 2.6 6.5 6 8.4 10.2" stroke-dasharray=".01 3.1"/><path d="M6 38.6h36"/>`,
  // A touring van on the road out, hills and a flat-crowned acacia on the horizon: the safari reserve transfer
  'safari-route': `<path d="M4.5 21.4c5.4-4.6 11.2-5.3 16.4-2.6 3.8 2 7.6 1.6 11-1.3 3.6-3.1 8-3.4 11.6-.9"/><path d="M31.8 11.2c2.2-1.6 9.6-1.6 11.8 0"/><path d="M37.7 16.2v-3.4l-2.6-1.6M37.7 12.8l2.4-1.6"/><path d="M8.6 34.2v-8.4c0-1.1.9-2 2-2h18.6c.7 0 1.3.3 1.7.8l4.4 5.1h2.1c1.1 0 2 .9 2 2v2.5"/><path d="M8.6 29.6h26.6M17 23.8v5.8M24.6 23.8v5.8"/><circle cx="14.4" cy="34.4" r="2.6"/><circle cx="32.4" cy="34.4" r="2.6"/><path d="M4.8 38.9h38.4"/>`,
  // A folded travel map with its route and a small sun seal: plan my journey
  'travel-folio': `<path d="M7.5 12.4l10-3 13 3 10-3v26.2l-10 3-13-3-10 3z"/><path d="M17.5 9.4v26.2M30.5 12.4v26.2"/><path d="M10.6 31.2c2.8-3.9 5.6-1 8.4-4.6 2.2-2.8 5.4-4.9 9.7-5.6" stroke-dasharray=".01 2.7"/><circle cx="35.4" cy="18.6" r="2.5"/><path d="${rays(35.4, 18.6, 3.9, 5.4, 8)}"/>`,
  // Two places joined by one easy line: destinations
  'cape-route': `<circle cx="10.8" cy="35.6" r="2.6"/><path d="M13.5 35c9.1-1.7 3.3-12.6 12.4-14.5 3.4-.7 6.4.4 8.6-.8"/><path d="M37 20.4s-5-4.6-5-8a5 5 0 0 1 10 0c0 3.4-5 8-5 8z"/><path d="M37 12.3h.01"/>`,
  // An eight-ray rosette, the sun's mark: a seal for chapters and actions (never the hero's coin)
  'sun-seal': `<circle cx="24" cy="24" r="5.2"/><path d="${rays(24, 24, 8.4, 14.2, 4, -90)}"/><path d="${rays(24, 24, 8.8, 12, 4, -45)}"/><path d="${dots(24, 24, 18, 24, 7.5)}" stroke-width="1.9"/>`,
};

/** Utility family, 24 × 24. */
const UTILITIES = {
  chevron: '<path d="M9.5 6.5L15 12l-5.5 5.5"/>',
  'chevron-left': '<path d="M14.5 6.5L9 12l5.5 5.5"/>',
  'chevron-down': '<path d="M6.5 9.5L12 15l5.5-5.5"/>',
  arrow: '<path d="M3.8 12h15.6"/><path d="M14.2 7.2l5.2 4.8-5.2 4.8"/>',
  back: '<path d="M20.2 12H4.6"/><path d="M9.8 7.2L4.6 12l5.2 4.8"/>',
  close: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  expand: '<path d="M14 4.5h5.5V10M19.5 4.5l-6 6M10 19.5H4.5V14M4.5 19.5l6-6"/>',
  location: '<path d="M12 20.6s-5.8-5.4-5.8-10.3a5.8 5.8 0 0 1 11.6 0c0 4.9-5.8 10.3-5.8 10.3z"/><circle cx="12" cy="10.3" r="2.1"/>',
  clock: '<circle cx="12" cy="12" r="8.4"/><path d="M12 7.4V12l2.9 1.8"/>',
  calendar: '<rect x="4.4" y="5.8" width="15.2" height="13.8" rx="1.6"/><path d="M4.4 10.2h15.2M8.6 3.8v3.6M15.4 3.8v3.6"/><path d="M12 13.2l1.7 1.7-1.7 1.7-1.7-1.7z"/>',
  group: '<circle cx="9" cy="8.8" r="2.8"/><path d="M3.8 19c.6-3.1 2.6-4.8 5.2-4.8s4.6 1.7 5.2 4.8"/><circle cx="16.4" cy="9.6" r="2.2"/><path d="M15.7 14.3c2.3.1 4 1.7 4.6 4.7"/>',
  gallery: '<rect x="3.6" y="5.4" width="16.8" height="13.2" rx="1.6"/><path d="M3.9 16.6l5-4.8 3.3 3 2.6-2.2 5.3 4.4"/><circle cx="15.8" cy="9.4" r="1.4"/>',
  guide: '<circle cx="9.6" cy="7.6" r="2.6"/><path d="M4.6 20c.6-3.8 2.6-5.9 5-5.9s4.4 2.1 5 5.9"/><path d="M17.8 20.2V4.4"/><path d="M17.8 4.8l3.4 1.9-3.4 1.9"/>',
  phone: '<path d="M6 4.4h2.9l1.6 4-2 1.6a10.6 10.6 0 0 0 5.6 5.6l1.6-2 4 1.6v2.9a1.4 1.4 0 0 1-1.5 1.4C10.6 18.9 5.1 13.4 4.6 5.9A1.4 1.4 0 0 1 6 4.4z"/>',
  whatsapp: '<path d="M4.6 19.4l1.2-3.5a7.9 7.9 0 1 1 2.9 2.5z"/><path d="M9.3 8.7c.2-.5.5-.5.8-.5h.5c.2 0 .4.1.5.4l.7 1.5c.1.2 0 .5-.1.6l-.5.6c-.1.1-.1.3 0 .5a5.6 5.6 0 0 0 2.5 2.3c.2.1.4.1.5-.1l.6-.7c.2-.2.4-.2.6-.1l1.5.7c.3.1.4.3.4.5 0 .6-.3 1.2-.9 1.5-.6.3-1.4.4-2.9-.2a7.8 7.8 0 0 1-3.7-3.5c-.8-1.3-.6-2.4-.5-2.8z"/>',
  contact: '<rect x="3.6" y="5.8" width="16.8" height="12.4" rx="1.6"/><path d="M4.2 7l7.8 5.9L19.8 7"/>',
  quote: '<path d="M10 7.2c-2.6.8-4.2 2.8-4.2 5.6v3.6h4.4v-4.3H7.9c.1-1.6.9-2.6 2.4-3.2zM18.2 7.2c-2.6.8-4.2 2.8-4.2 5.6v3.6h4.4v-4.3h-2.3c.1-1.6.9-2.6 2.4-3.2z"/>',
  check: '<path d="M5.4 12.6l4.4 4.4 8.8-9.6"/>',
  'external-link': '<path d="M13.6 4.4h6v6M19.6 4.4L11 13"/><path d="M17.4 13.6v4.9a1.1 1.1 0 0 1-1.1 1.1H5.5a1.1 1.1 0 0 1-1.1-1.1V7.7a1.1 1.1 0 0 1 1.1-1.1h4.9"/>',
  directions: '<path d="M12 20.6V3.6"/><path d="M12 5.6h6.4l2 2-2 2H12M12 11.6H5.6l-2 2 2 2H12"/>',
  star: '<path d="M12 4.2l2.3 5 5.5.6-4.1 3.7 1.2 5.4L12 16.1l-4.9 2.8 1.2-5.4-4.1-3.7 5.5-.6z"/>',
  binoculars: '<circle cx="7" cy="15.4" r="3.4"/><circle cx="17" cy="15.4" r="3.4"/><path d="M10.4 15.4h3.2M5.2 12.4l1.9-6.8h2.4l.5 6.8M18.8 12.4l-1.9-6.8h-2.4l-.5 6.8"/>',
  pause: '<path d="M9 6.6v10.8M15 6.6v10.8" stroke-width="2"/>',
  play: '<path d="M8.6 6.2L18 12l-9.4 5.8z"/>',
  // Small versions of the emblems, for rows and inline use
  compass: '<circle cx="12" cy="12" r="8.6"/><path d="M12 6.2l1.7 5.8-1.7 5.8-1.7-5.8z"/><path d="M10.3 12h3.4"/>',
  folio: '<path d="M3.8 6.4l5-1.5 6.4 1.5 5-1.5v12.8l-5 1.5-6.4-1.5-5 1.5z"/><path d="M8.8 4.9v12.8M15.2 6.4v12.8"/>',
};

export const ENGRAVED_EMBLEMS = Object.keys(EMBLEMS);
export const ENGRAVED_UTILITIES = Object.keys(UTILITIES);

export function engraved(name, { cls = '', size } = {}) {
  const emblem = EMBLEMS[name];
  const body = emblem || UTILITIES[name];
  if (!body) throw new Error(`Unknown engraved icon: ${name}`);
  const box = emblem ? 48 : 24;
  const stroke = emblem ? 1.6 : 1.5;
  // The rendered size is the --jei-size token (the stylesheet sizes every mark through it); width and height keep the box before CSS loads
  const dims = size ? ` width="${size}" height="${size}" style="--jei-size: ${size}px"` : '';
  return `<svg class="gt-engraved-icon jei--${name}${cls ? ` ${cls}` : ''}" viewBox="0 0 ${box} ${box}"${dims} fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
}
