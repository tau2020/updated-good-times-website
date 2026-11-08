/**
 * Small HTML helpers and inline SVG icons shared by all templates.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { imageByName } from '../data/images.mjs';
import { BASE, CURRENCY_CODES, currencyLabel, formatWhole } from '../assets/js/currency-core.js';

const GENERATED = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'images.generated.json');
const renditions = existsSync(GENERATED) ? JSON.parse(readFileSync(GENERATED, 'utf8')) : {};

export const esc = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const ICONS = {
  arrow: '<path d="M4 12h15"/><path d="M13 6l6 6-6 6"/>',
  'arrow-left': '<path d="M20 12H5"/><path d="M11 6l-6 6 6 6"/>',
  menu: '<path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/>',
  close: '<path d="M6 6l12 12"/><path d="M18 6L6 18"/>',
  chevron: '<path d="M9 6l6 6-6 6"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  x: '<path d="M7 7l10 10"/><path d="M17 7L7 17"/>',
  mail: '<rect x="3.5" y="5.5" width="17" height="13" rx="1.5"/><path d="M4 7l8 6 8-6"/>',
  phone:
    '<path d="M5.5 4h3l1.7 4.2-2.1 1.6a11 11 0 0 0 6.1 6.1l1.6-2.1L20 15.5v3a1.5 1.5 0 0 1-1.6 1.5C10.6 19.6 4.4 13.4 4 5.6A1.5 1.5 0 0 1 5.5 4z"/>',
  whatsapp:
    '<path d="M4.5 19.5l1.2-3.6A8 8 0 1 1 8.6 18.4z"/><path d="M9.2 8.6c.2-.5.6-.5.9-.5h.5c.2 0 .4.1.5.4l.7 1.6c.1.2 0 .5-.1.6l-.5.6c-.1.1-.1.3 0 .5a5.8 5.8 0 0 0 2.6 2.4c.2.1.4.1.5-.1l.6-.7c.2-.2.4-.2.6-.1l1.5.7c.3.1.4.3.4.5 0 .6-.3 1.3-.9 1.6-.6.3-1.5.4-3-.2a8 8 0 0 1-3.8-3.6c-.8-1.4-.6-2.5-.5-2.9z"/>',
  pin: '<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  users:
    '<circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5"/><circle cx="17" cy="9.5" r="2.4"/><path d="M15.8 14.2c2.3.2 4 1.8 4.6 4.8"/>',
  user: '<circle cx="12" cy="8.5" r="3.6"/><path d="M5 20c.8-3.9 3.6-6.2 7-6.2s6.2 2.3 7 6.2"/>',
  // A small group: one friend in front, two behind (the hero's Custom Journeys)
  group:
    '<circle cx="12" cy="8.4" r="2.9"/><path d="M6.7 19.5c.5-3.1 2.6-5 5.3-5s4.8 1.9 5.3 5"/><circle cx="5.7" cy="9.9" r="2.1"/><path d="M2.6 17.4c.3-2.2 1.6-3.5 3.4-3.6"/><circle cx="18.3" cy="9.9" r="2.1"/><path d="M21.4 17.4c-.3-2.2-1.6-3.5-3.4-3.6"/>',
  camera:
    '<path d="M3.5 9a1.5 1.5 0 0 1 1.5-1.5h2.6l1.5-2h5.8l1.5 2H19A1.5 1.5 0 0 1 20.5 9v8a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 17z"/><circle cx="12" cy="12.8" r="3.3"/><path d="M17.3 10.3h.01"/>',
  compass:
    '<circle cx="12" cy="12" r="8.5"/><path d="M15.2 8.8l-1.9 5-5 1.9 1.9-5z"/>',
  chat: '<path d="M4.5 18.5V7a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H8z"/><path d="M8.5 9.5h7M8.5 12.5h4.5"/>',
  quote: '<path d="M9.5 7.5C7 8.4 5.5 10.4 5.5 13v3.5H10V12H7.6c.2-1.5 1-2.5 2.4-3.1zM18 7.5c-2.5.9-4 2.9-4 5.5v3.5h4.5V12h-2.4c.2-1.5 1-2.5 2.4-3.1z"/>',
  car: '<path d="M4 15.5V12l2-5h12l2 5v3.5"/><path d="M3.5 15.5h17v2.5h-17z"/><circle cx="7.5" cy="18" r="1.6"/><circle cx="16.5" cy="18" r="1.6"/><path d="M6 12h12"/>',
  plane: '<path d="M10.5 13.5L3.5 11l1-1.5 7.5.8 4.5-5.1a1.5 1.5 0 0 1 2.2 2.1l-5 4.6.8 7.6L13 20.5l-2.5-7"/>',
  // A paw (four toes over a pad) and a folded map, for the Travel Concierge's service badges (25 Oct 2026)
  paw: '<ellipse cx="5.9" cy="10.4" rx="1.55" ry="2.05"/><ellipse cx="9.6" cy="6.9" rx="1.6" ry="2.2"/><ellipse cx="14.4" cy="6.9" rx="1.6" ry="2.2"/><ellipse cx="18.1" cy="10.4" rx="1.55" ry="2.05"/><path d="M12 12.4c-2.7 0-5.4 3.2-5.4 5.5 0 1.5 1.1 2.3 2.4 2.3.9 0 1.8-.5 3-.5s2.1.5 3 .5c1.3 0 2.4-.8 2.4-2.3 0-2.3-2.7-5.5-5.4-5.5z"/>',
  map: '<path d="M3.5 6.5L9 4.5l6 2 5.5-2v13l-5.5 2-6-2-5.5 2z"/><path d="M9 4.5v13M15 6.5v13"/>',
  luggage: '<rect x="6.5" y="7.5" width="11" height="12" rx="1.5"/><path d="M9.5 7.5V5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2.5M9.5 11v5M14.5 11v5"/>',
  calendar: '<rect x="4" y="5.5" width="16" height="14" rx="1.5"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.6v.1"/>',
  alert: '<path d="M12 4l9 16H3z"/><path d="M12 10v4.5M12 17.2v.1"/>',
  wine: '<path d="M8 3.5h8l-.6 5.3a3.4 3.4 0 0 1-6.8 0z"/><path d="M12 12.2v7.3M8.5 19.5h7"/>',
  wave: '<path d="M3 14c2.2 0 2.2-2 4.5-2s2.2 2 4.5 2 2.2-2 4.5-2 2.2 2 4.5 2"/><path d="M3 18c2.2 0 2.2-2 4.5-2s2.2 2 4.5 2 2.2-2 4.5-2 2.2 2 4.5 2"/><path d="M8 9.5a4 4 0 0 1 8 0"/>',
  mountain: '<path d="M3 19l6-10 3.5 5.5L15 11l6 8z"/><path d="M7.6 11.3l1.4 1.2 1.3-1.2"/>',
  route: '<circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18h6.5a3.5 3.5 0 0 0 0-7h-5a3.5 3.5 0 0 1 0-7H16"/>',
  sparkle: '<path d="M12 3.5l1.8 5.2 5.2 1.8-5.2 1.8L12 17.5l-1.8-5.2L5 10.5l5.2-1.8z"/>',
  play: '<path d="M8 5.5v13l10.5-6.5z" fill="currentColor" stroke="none"/>',
  pause: '<path d="M8 5.5v13M16 5.5v13" stroke-width="3"/>',
  external: '<path d="M14 4.5h5.5V10"/><path d="M19.5 4.5L11 13"/><path d="M17 13.5v5a1 1 0 0 1-1 1H5.5a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h5"/>',
  instagram:
    '<rect x="3.5" y="3.5" width="17" height="17" rx="4.5"/><circle cx="12" cy="12" r="3.8"/><circle cx="17" cy="7" r=".7" fill="currentColor" stroke="none"/>',
  facebook: '<path d="M14 8.5V6.8c0-.8.5-1.3 1.3-1.3H17V2.5h-2.6C11.8 2.5 11 4.3 11 6.3v2.2H9v3h2v9.5h3v-9.5h2.4l.4-3z"/>',
  binoculars: '<circle cx="7" cy="15.5" r="3.5"/><circle cx="17" cy="15.5" r="3.5"/><path d="M10.5 15.5h3M5 12.5l2-7h2.5l.5 7M19 12.5l-2-7h-2.5l-.5 7"/>',
  star: '<path d="M12 3.8l2.5 5.3 5.8.7-4.3 4 1.1 5.8L12 16.8l-5.1 2.8 1.1-5.8-4.3-4 5.8-.7z"/>',
  gallery: '<rect x="3.5" y="5.5" width="17" height="13" rx="1.5"/><circle cx="9" cy="10" r="1.6"/><path d="M4 17l4.5-4.5 3 3 3.5-3.5L20 16.5"/>',
  wifi: '<path d="M3.5 9.5a13 13 0 0 1 17 0M6.5 12.8a8.5 8.5 0 0 1 11 0M9.5 16a4 4 0 0 1 5 0"/><path d="M12 19.2v.1"/>',
  drop: '<path d="M12 3.5s-6 6.6-6 11a6 6 0 0 0 12 0c0-4.4-6-11-6-11z"/>',
  shield: '<path d="M12 3.5l7 2.8v5.4c0 4.3-2.9 7.4-7 8.8-4.1-1.4-7-4.5-7-8.8V6.3z"/><path d="M9 12.2l2.1 2.1 3.9-4"/>',
  minus: '<path d="M6 12h12"/>',
  plus: '<path d="M12 6v12M6 12h12"/>',
  'chevron-down': '<path d="M6 9l6 6 6-6"/>',
  'chevron-left': '<path d="M15 6l-6 6 6 6"/>',
  van: '<path d="M3.5 8.5A1.5 1.5 0 0 1 5 7h9l4.5 4.5H20a1 1 0 0 1 1 1V16h-1.5M3.5 16v-7.5"/><path d="M3.5 16h2M9.5 16h5"/><circle cx="7.5" cy="16.5" r="1.8"/><circle cx="16.5" cy="16.5" r="1.8"/><path d="M14 7v4.5h4.5"/>',
};

/**
 * The networks' own marks, in their own colours (owner's request, 25 Oct 2026): the glyphs are Simple Icons 16.33.0
 * (CC0 1.0, simpleicons.org); each sits on a disc of its brand colour (styles.css, .brand-mark), as people know them:
 * WhatsApp green, Instagram's gradient, Facebook blue with the f running off the disc, Tripadvisor's black owl on green.
 * `phone` is the call mark beside them: this site's own handset (ICONS.phone) filled white on the familiar call green.
 */
const BRAND_MARKS = {
  whatsapp: 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z',
  instagram: 'M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077',
  facebook: 'M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245Z',
  phone: 'M5.5 4h3l1.7 4.2-2.1 1.6a11 11 0 0 0 6.1 6.1l1.6-2.1L20 15.5v3a1.5 1.5 0 0 1-1.6 1.5C10.6 19.6 4.4 13.4 4 5.6A1.5 1.5 0 0 1 5.5 4z',
  tripadvisor: 'M12.006 4.295c-2.67 0-5.338.784-7.645 2.353H0l1.963 2.135a5.997 5.997 0 0 0 4.04 10.43 5.976 5.976 0 0 0 4.075-1.6L12 19.705l1.922-2.09a5.972 5.972 0 0 0 4.072 1.598 6 6 0 0 0 6-5.998 5.982 5.982 0 0 0-1.957-4.432L24 6.648h-4.35a13.573 13.573 0 0 0-7.644-2.353zM12 6.255c1.531 0 3.063.303 4.504.903C13.943 8.138 12 10.43 12 13.1c0-2.671-1.942-4.962-4.504-5.942A11.72 11.72 0 0 1 12 6.256zM6.002 9.157a4.059 4.059 0 1 1 0 8.118 4.059 4.059 0 0 1 0-8.118zm11.992.002a4.057 4.057 0 1 1 .003 8.115 4.057 4.057 0 0 1-.003-8.115zm-11.992 1.93a2.128 2.128 0 0 0 0 4.256 2.128 2.128 0 0 0 0-4.256zm11.992 0a2.128 2.128 0 0 0 0 4.256 2.128 2.128 0 0 0 0-4.256z',
};

/** Marks drawn in their own colours, not as one glyph on a disc: Google's four-colour G, on white (the review wall) */
const BRAND_ART = {
  google: {
    viewBox: '0 0 48 48',
    paths: [
      ['#EA4335', 'M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z'],
      ['#4285F4', 'M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z'],
      ['#FBBC05', 'M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z'],
      ['#34A853', 'M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z'],
    ],
  },
};

export function brandMark(name, cls = '') {
  const art = BRAND_ART[name];
  const d = BRAND_MARKS[name];
  if (!art && !d) throw new Error(`Unknown brand mark: ${name}`);
  const svg = art
    ? `<svg viewBox="${art.viewBox}" focusable="false">${art.paths.map(([fill, path]) => `<path fill="${fill}" d="${path}"/>`).join('')}</svg>`
    : `<svg viewBox="0 0 24 24" focusable="false"><path d="${d}"/></svg>`;
  return `<span class="brand-mark brand-mark--${name}${cls ? ` ${cls}` : ''}" aria-hidden="true">${svg}</span>`;
}

export function icon(name, cls = '') {
  const body = ICONS[name];
  if (!body) throw new Error(`Unknown icon: ${name}`);
  return `<svg class="icon icon--${name} ${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${body}</svg>`;
}

const STAR = '<path d="M12 3.2l2.7 5.6 6.1.8-4.5 4.2 1.2 6.1L12 17l-5.5 2.9 1.2-6.1-4.5-4.2 6.1-.8z"/>';

/** Decorative stars, five unless a review's own rating gives fewer. The numeric rating or hidden text beside them carries the meaning. */
export function stars({ large = false, count = 5 } = {}) {
  const n = Math.max(1, Math.min(5, Math.round(Number(count) || 5)));
  return `<span class="stars${large ? ' stars--large' : ''}" aria-hidden="true">${Array.from({ length: n }, () => `<svg viewBox="0 0 24 24" focusable="false">${STAR}</svg>`).join('')}</span>`;
}

/**
 * Rating row: stars, the verified rating and the review count, optionally
 * linking to the listing. Callers gate it with showRating() for per-product
 * figures (MIN_REVIEWS).
 */
export function ratingRow({ rating, reviews, url = '', label = 'Tripadvisor reviews', large = false }) {
  const count = `${reviews} ${label}`;
  const linked = url ? `<a class="external" href="${esc(url)}" rel="noopener" target="_blank">${count}<span class="visually-hidden"> (opens in a new tab)</span></a>` : count;
  return `<p class="rating">${stars({ large })}<span class="rating__score">${rating.toFixed(1)}</span> <span class="rating__count">(${linked})</span></p>`;
}

/** Buttons. variant: '' | 'gold' | 'ghost' | 'outline' | 'light'. */
/**
 * A CTA-styled link in the Golden Engraved Button System (design/buttons/design.md; buttons.css).
 * `variant`: 'gold' or 'primary' (the solid Good Times green button), 'outline' or 'secondary' (outlined),
 * 'ghost' (the secondary for dark grounds), 'tertiary' (words over a hairline). `size`: 'compact' | 'large'.
 * No arrow: an icon is added only when it carries meaning (a car, WhatsApp), never a direction.
 * `btn` stays on the element as a hook for layout rules (the mobile bars, the booking card).
 */
const VARIANT = { gold: 'primary', primary: 'primary', outline: 'secondary', secondary: 'secondary', ghost: 'secondary gt-button--on-dark', tertiary: 'tertiary', '': 'secondary' };
export function button({ href, label, variant = '', icon: ic = '', cls = '', size = '', attrs = '' }) {
  if (label === SIGNATURE_CTA) {
    const block = /gt-button--block/.test(cls);
    return leafButton({ href, label, size: [block && 'block', size].filter(Boolean).join(' '), cls: cls.replace(/\bgt-button--block\b/, '').trim(), attrs: attrs.replace(SIGNATURE_ATTRS, '').trim() });
  }
  const v = VARIANT[variant] ?? 'secondary';
  const classes = ['btn', 'gt-button', ...v.split(' ').map((x) => (x.startsWith('gt-') ? x : `gt-button--${x}`)), size && `gt-button--${size}`, cls].filter(Boolean).join(' ');
  return `<a class="${classes}" href="${esc(href)}"${attrs ? ` ${attrs}` : ''}>${ic ? icon(ic) : ''}<span>${esc(label)}</span></a>`;
}

/**
 * The brand's signature call to action: "Plan My Day" (the owner's brief of 6 Nov 2026, which retires "Make It Yours", itself
 * the 25 Oct 2026 replacement of "Start Planning") on the global booking action only (the header, the concierge, the phone
 * menu and bar, the footer). Every other button names what it does. Each signature link is described by one hidden line (layout.mjs) saying where it leads, since the words alone
 * don't; the visible label stays the accessible name.
 */
export const SIGNATURE_CTA = 'Plan My Day';
export const SIGNATURE_DESC_ID = 'signature-cta-desc';
export const signatureDesc = () =>
  `<p id="${SIGNATURE_DESC_ID}" hidden>Opens our enquiry form. We reply with availability and a personalised quote; nothing is booked until we confirm it with you.</p>`;
export const SIGNATURE_ATTRS = `aria-describedby="${SIGNATURE_DESC_ID}"`;

/**
 * The signature leaf (the owner's brief of 6 Nov 2026; design/button-tokens.md): the brand's primary calls to action are
 * leaf-shaped. One inline SVG per button draws the leaf (a rounded base with a short stem at the left, the tip at the right,
 * the upper edge a little fuller than the lower), its midrib (clear near the base and the tip, faint under the words), two
 * pairs of side veins that open on hover, and a leaf-shaped focus ring. The drawing stretches with the label
 * (preserveAspectRatio none) while its lines keep their width (non-scaling strokes); the colours are gradients defined once
 * per page (leafDefs, layout.mjs). The link itself is the target: a rectangle at least 44 px tall. Motion: leaf.js.
 */
export const LEAF_PATH = 'M7 34C7 14 40 4.5 112 4C172 3.6 214 14 237 31.5C214 48 172 60.4 112 60C42 59.6 7 53 7 34Z';
export const LEAF_VEIN = 'M13 34C70 30.5 158 28.5 229 31.4';
export const LEAF_VEINLETS = 'M203 30.4L216 24.2M209 30.8L221 37.2M24 33.2L35 26.6M30 33.1L41 39.6';
export const LEAF_STEM = 'M7.5 36Q4 39.2 1.2 44';
export const leafShape = () =>
  `<svg class="leaf-btn__shape" viewBox="0 0 240 64" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path class="leaf-btn__ring" d="${LEAF_PATH}"/><path class="leaf-btn__body" d="${LEAF_PATH}"/><path class="leaf-btn__stem" d="${LEAF_STEM}"/><path class="leaf-btn__vein" d="${LEAF_VEIN}" pathLength="1"/><path class="leaf-btn__veinlets" d="${LEAF_VEINLETS}" pathLength="1"/></svg>`;
/** The leaf's colours, once per page (an SVG with no size, never display:none, so every leaf can reference them). */
export const leafDefs = () =>
  `<svg class="leaf-defs" width="0" height="0" aria-hidden="true" focusable="false"><defs><linearGradient id="gt-leaf-fill" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#168447"/><stop offset=".5" stop-color="#147d43"/><stop offset="1" stop-color="#0f6236"/></linearGradient><linearGradient id="gt-leaf-fill-hover" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#127a40"/><stop offset=".5" stop-color="#106638"/><stop offset="1" stop-color="#0b4f2c"/></linearGradient><linearGradient id="gt-leaf-vein" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#dff3de" stop-opacity=".78"/><stop offset=".3" stop-color="#dff3de" stop-opacity=".16"/><stop offset=".72" stop-color="#dff3de" stop-opacity=".16"/><stop offset="1" stop-color="#dff3de" stop-opacity=".82"/></linearGradient></defs></svg>`;
/**
 * A leaf button. `label` is the accessible name and the words (`html` may set them with emphasis); `size`: '' (48 px),
 * 'large' (54 px), 'compact' (44 px) or 'block' (fills its column); `owner` names the timeline that plays its entrance
 * (hero, intro, sand), otherwise leaf.js unfurls it as it scrolls into view. "Plan My Day" is the signature wherever it
 * appears, so it carries the signature's one description.
 */
export function leafButton({ href, label, html = '', size = '', cls = '', attrs = '', owner = '' }) {
  const extra = [label === SIGNATURE_CTA && SIGNATURE_ATTRS, attrs, owner && `data-leaf-owner="${owner}"`].filter(Boolean).join(' ');
  const classes = ['leaf-btn', ...String(size).split(' ').filter(Boolean).map((x) => `leaf-btn--${x}`), cls].filter(Boolean).join(' ');
  return `<a class="${classes}" href="${esc(href)}" data-leaf${extra ? ` ${extra}` : ''}>${leafShape()}<span class="leaf-btn__label">${html || esc(label)}</span></a>`;
}

/** The signature champagne-gold call to action: a rounded button with the ornamental coin on its left edge (header, concierge). */
export function coinButton({ href, label = SIGNATURE_CTA, cls = '', attrs = '', owner = '' }) {
  // Since the brief of 6 Nov 2026 the header's and the concierge's signature is the leaf (the compass medallion retired)
  return leafButton({ href, label, cls, attrs, owner });
}

/**
 * Responsive picture from the image pipeline. Only widths that were actually
 * generated (src/data/images.generated.json) are referenced.
 */
export function picture({ name, alt, sizes = '100vw', cls = '', eager = false, fetchpriority, portrait, style = '' }) {
  const r = renditions[name];
  if (!r) throw new Error(`No renditions for image "${name}". Run npm run images.`);
  const meta = imageByName(name);
  const text = alt ?? meta?.alt;
  if (text === undefined) throw new Error(`No alt text for image "${name}"`);
  const set = (ext, n, ws) => ws.map((w) => `assets/img/${n}-${w}.${ext} ${w}w`).join(', ');
  const fallbackW = r.widths.find((w) => w >= 800) || r.widths[r.widths.length - 1];
  let art = '';
  if (portrait) {
    const p = renditions[portrait.name];
    if (!p) throw new Error(`No renditions for portrait image "${portrait.name}"`);
    art = `
  <source media="${portrait.media}" type="image/avif" srcset="${set('avif', portrait.name, p.widths)}" sizes="${portrait.sizes || sizes}">
  <source media="${portrait.media}" type="image/webp" srcset="${set('webp', portrait.name, p.widths)}" sizes="${portrait.sizes || sizes}">`;
  }
  return `<picture class="${cls}">${art}
  <source type="image/avif" srcset="${set('avif', name, r.widths)}" sizes="${sizes}">
  <source type="image/webp" srcset="${set('webp', name, r.widths)}" sizes="${sizes}">
  <img src="assets/img/${name}-${fallbackW}.webp" alt="${esc(text)}" width="${r.width}" height="${r.height}" loading="${eager ? 'eager' : 'lazy'}" decoding="async"${fetchpriority ? ` fetchpriority="${fetchpriority}"` : ''}${style ? ` style="${esc(style)}"` : ''}>
</picture>`;
}

/**
 * The `sizes` for a photograph that covers its frame (object-fit: cover): about the width it is really drawn at. A frame
 * of another shape than the photograph crops it, and where the frame is narrower in shape (a phone's tall banner, a
 * portrait frame for a landscape photograph) the photograph is drawn wider than the frame: sized for the frame alone,
 * the browser would pick a file too small and enlarge it (the media audit, image-quality-report.md).
 *   frames: [media condition or '', frame width (a CSS length), frame height (a CSS length) or frame shape (width / height)]
 * The drawn width is asked at 85% (COVER_ASK): the renditions step in large jumps (800, 1200, 1600, 2000), and asking
 * for all of it would often take the next file up for a few pixels; at 85% a phone gets at least about 0.85 source
 * pixels per device pixel, without the larger file's bytes. Only the file the browser chooses changes; nothing moves.
 */
const COVER_ASK = 0.85;
export function coverSizes(name, frames) {
  const { width, height } = imageSize(name);
  const a = width && height ? width / height : 0;
  const k = (n) => +n.toFixed(3);
  return frames
    .map(([media, w, h]) => {
      let v = w;
      if (a && typeof h === 'number') v = (a / h) * COVER_ASK > 1 ? `calc(${w} * ${k((a / h) * COVER_ASK)})` : w;
      else if (a && h) v = `max(${w}, calc(${h} * ${k(a * COVER_ASK)}))`;
      return media ? `${media} ${v}` : v;
    })
    .join(', ');
}

/** The pipeline's record for an image ({ widths, width, height, ambient? }), or null before `npm run images`. */
export const renditionsOf = (name) => renditions[name] || null;
/** Intrinsic width of an image's original (0 if unknown). */
export const imageWidth = (name) => renditions[name]?.width || 0;
/** Intrinsic size of an image's original ({ width, height }, zeros if unknown). */
export const imageSize = (name) => ({ width: renditions[name]?.width || 0, height: renditions[name]?.height || 0 });
/** The widest rendition as a plain file path: the gallery's no-JavaScript link target. */
export function imageFile(name, ext = 'webp') {
  const r = renditions[name];
  if (!r) throw new Error(`No renditions for image "${name}". Run npm run images.`);
  return `assets/img/${name}-${r.widths[r.widths.length - 1]}.${ext}`;
}

/** Preload hints for a picture()'s AVIF set (used for LCP images). */
export function preloadFor(name, { sizes = '100vw', media } = {}) {
  const r = renditions[name];
  if (!r) return null;
  return {
    href: `assets/img/${name}-${r.widths.find((w) => w >= 800) || r.widths[0]}.avif`,
    type: 'image/avif',
    srcset: r.widths.map((w) => `assets/img/${name}-${w}.avif ${w}w`).join(', '),
    sizes,
    media,
  };
}

export function sectionHead({ eyebrow, title, lead, center = false, tag = 'h2', id, aside = '' }) {
  return `<div class="section-head${center ? ' section-head--center' : ''}" data-reveal>
  <div>
    ${eyebrow ? `<p class="eyebrow">${esc(eyebrow)}</p>` : ''}
    <${tag}${id ? ` id="${id}"` : ''}>${title}</${tag}>
    ${lead ? [].concat(lead).map((p) => `<p class="lead">${esc(p)}</p>`).join('\n    ') : ''}
  </div>
  ${aside ? `<div class="section-head__aside">${aside}</div>` : ''}
</div>`;
}

export function breadcrumb(items) {
  return `<nav class="breadcrumb" aria-label="Breadcrumb"><ol>${items
    .map((it, i) =>
      i === items.length - 1
        ? `<li aria-current="page">${esc(it.label)}</li>`
        : `<li><a href="${esc(it.href)}">${esc(it.label)}</a></li>`,
    )
    .join('')}</ol></nav>`;
}

const fmtDate = (iso) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
export { fmtDate };

const money = (n, cur) => (Number.isSafeInteger(n) ? formatWhole(n, cur) : `${cur} ${n}`);

/**
 * A price in its authoritative currency, the rand (BASE), marked for assets/js/currency.js,
 * which shows it in the visitor's currency (converted once, from this amount). Other
 * currencies are written as they are and never converted. `label` keeps an
 * accessible label (e.g. "previously") in step with the amount.
 */
export function moneyTag(amount, currency = BASE, { tag = 'span', label = '' } = {}) {
  const text = money(amount, currency);
  if (currency !== BASE || !Number.isSafeInteger(amount)) return `<${tag}${label ? ` aria-label="${esc(`${label} ${text}`)}"` : ''}>${text}</${tag}>`;
  return `<${tag} data-money="${amount}"${label ? ` data-money-label="${esc(label)}" aria-label="${esc(`${label} ${text}`)}"` : ''}>${text}</${tag}>`;
}

/**
 * The currency selector, for an area that shows prices (never the home page,
 * the header, the footer or a page without prices). Without the script it is
 * never shown and every price stays in rand. One per page or pricing area.
 * The native select keeps the system picker on phones and the keyboard
 * everywhere; it lies invisibly over its face ("ZAR (R)" with a chevron on
 * wide screens, "ZAR (R) · Change" on narrow ones).
 */
export function currencyPicker({ id, cls = '' }) {
  return `<div class="currency-picker${cls ? ` ${cls}` : ''}" data-currency-picker>
      <label class="currency-picker__label" for="${id}"><span class="currency-picker__wide">Prices displayed in</span><span class="currency-picker__narrow">Prices in</span></label>
      <span class="currency-picker__control">
        <select class="currency-picker__select" id="${id}" data-currency-select>
          ${CURRENCY_CODES.map((c) => `<option value="${c}"${c === BASE ? ' selected' : ''}>${esc(currencyLabel(c))}</option>`).join('')}
        </select>
        <span class="currency-picker__face" aria-hidden="true"><span data-currency-face>${esc(currencyLabel(BASE))}</span><span class="currency-picker__change">Change</span>${icon('chevron-down', 'currency-picker__chevron')}</span>
      </span>
    </div>`;
}

/** "per group of 5–8 guests", "per trip, 1–4 guests": one tier of a rate, in words. */
const tierBasis = (p, t) => (p.unit === 'per group' ? `per group of ${t.label}` : `${p.unit}, ${t.label}`);

/** "per group of 1–4 guests", "per trip", "per day": the basis of a published rate, in words. */
export function priceBasis(p, { compact = false } = {}) {
  if (!p) return '';
  const first = p.tiers?.[0];
  if (compact || !first) return p.unit;
  return tierBasis(p, first);
}

/**
 * A rate in structured data: one Offer per group tier (data/pricing.mjs), in rand, with the group sizes it prices
 * (eligibleQuantity) and its basis in words. A starting price ("From R6,000") says so: "From" in its description
 * and a minimum price (priceSpecification.minPrice). A rate per day (the Garden Route) says so in machine-readable
 * form too: a unit price for one day (UnitPriceSpecification, referenceQuantity 1 DAY), so R8,500 is never read as
 * the price of the whole journey. One tier is one Offer, as before; several are a list.
 */
export function priceOffers(p, url) {
  let min = 1;
  const offers = p.tiers.map((t) => {
    // One specification carries both facts: a starting price (minPrice) and, for a rate per day, the unit it prices
    const spec = {
      ...(p.unit === 'per day' ? { '@type': 'UnitPriceSpecification', referenceQuantity: { '@type': 'QuantitativeValue', value: 1, unitCode: 'DAY' } } : { '@type': 'PriceSpecification' }),
      ...(t.startingFrom ? { minPrice: t.amount } : { price: t.amount }),
      priceCurrency: p.currency,
    };
    const offer = {
      '@type': 'Offer',
      price: String(t.amount),
      priceCurrency: p.currency,
      description: `${t.startingFrom ? `From ${money(t.amount, p.currency)} ` : ''}${tierBasis(p, t)}`,
      ...(t.startingFrom || p.unit === 'per day' ? { priceSpecification: spec } : {}),
      eligibleQuantity: { '@type': 'QuantitativeValue', minValue: min, maxValue: t.max, unitText: 'guests' },
      url,
    };
    min = t.max + 1;
    return offer;
  });
  return offers.length === 1 ? offers[0] : offers;
}

/**
 * Good Times' own published rate ("From R6,000 per group"), in rand and converted for display by
 * assets/js/currency.js. "Price on enquiry" where the company publishes none (the official
 * "On enquiry"), or "Request a quote" when prices are switched off.
 */
export function price(item, site, { compact = false } = {}) {
  const p = item.price;
  if (!site.prices.show || !p) {
    return `<div class="price price--quote"><span class="price__amount">${site.prices.show && item.priceNote ? 'Price on enquiry' : 'Request a quote'}</span></div>`;
  }
  return `<div class="price"><span class="price__amount">From ${moneyTag(p.from, p.currency)}</span><span class="price__note">${esc(priceBasis(p, { compact }))}</span></div>`;
}

/**
 * The approved logo artwork (Table Mountain and the travel trail, Approved Logo Pack v2) on a brand panel, in place
 * of a photograph where Good Times has none of a tour yet: honest, on brand, and never another place's photo.
 * Decorative: the card or page around it names the tour.
 */
export function artPanel({ cls = '' } = {}) {
  return `<div class="art-panel${cls ? ` ${cls}` : ''}" aria-hidden="true"><img src="assets/brand/gt-mountain-trail.svg" alt="" width="2121" height="456" loading="lazy" decoding="async"></div>`;
}

/**
 * Per-product rating stats ("5.0 from 23 reviews") render only from MIN_REVIEWS
 * reviews: a perfect score from one or two reviews reads as noise. Below the
 * threshold the stat is left out entirely.
 */
export const MIN_REVIEWS = 5;
export const showRating = (ta) => Boolean(ta && ta.reviews >= MIN_REVIEWS);

/* Direct contact: only channels marked `verified` in site.contact are ever rendered. */
export const waHref = (c) => `https://wa.me/${c.e164.replace(/\D/g, '')}`;
export const telHref = (c) => `tel:${c.e164}`;

/** Verified numbers, as one entry when phone and WhatsApp are the same number. */
export function contactNumbers(site) {
  const { phone, whatsapp } = site.contact;
  if (whatsapp.verified && phone.verified && whatsapp.e164 === phone.e164) return [{ label: 'Phone and WhatsApp', display: phone.display, wa: whatsapp, tel: phone }];
  return [
    whatsapp.verified && { label: 'WhatsApp', display: whatsapp.display, wa: whatsapp },
    phone.verified && { label: 'Phone', display: phone.display, tel: phone },
  ].filter(Boolean);
}

/**
 * Verified channels as a list: each number as plain, selectable text with its
 * WhatsApp and call links beside it, then the email address. Empty when nothing
 * is verified; callers decide whether a preview build shows a pending note.
 * `additional` adds the second address (site.contact.emailGeneral) after the
 * primary one: the contact page asks for it (6 Nov 2026); elsewhere it shows
 * only if the primary address is not verified.
 */
export function contactList(site, { additional = false } = {}) {
  // Each number with its two actions in their familiar colours: WhatsApp and Call (25 Oct 2026, from the header)
  const rows = contactNumbers(site).map(
    (n) => `<li class="contact-list__item">${icon(n.tel ? 'phone' : 'whatsapp', 'contact-list__icon')}<span class="contact-list__body">
      <span class="contact-list__label">${n.label}</span>
      <span class="contact-list__value">${esc(n.display)}</span>
      <span class="contact-list__actions">${n.wa ? `<a class="contact-action" href="${waHref(n.wa)}" rel="noopener" target="_blank">${brandMark('whatsapp')}<span>WhatsApp</span><span class="visually-hidden"> (opens in a new tab)</span></a>` : ''}${n.tel ? `<a class="contact-action" href="${telHref(n.tel)}">${brandMark('phone')}<span>Call</span></a>` : ''}</span>
    </span></li>`,
  );
  // The primary address, then the additional one where asked for: each with its own label when both show, plain "Email" for one.
  const { email, emailGeneral } = site.contact;
  const second = Boolean(emailGeneral?.verified) && (additional || !email.verified);
  const both = email.verified && second;
  const mail = (address, label) => `<li class="contact-list__item">${icon('mail', 'contact-list__icon')}<span class="contact-list__body">
      <span class="contact-list__label">${esc(label)}</span>
      <a class="contact-list__value" href="mailto:${esc(address)}">${esc(address).replace('@', '@<wbr>')}</a>
    </span></li>`;
  if (email.verified) rows.push(mail(email.address, both ? email.label || 'Email' : 'Email'));
  if (second) rows.push(mail(emailGeneral.address, both ? emailGeneral.label || 'Email' : 'Email'));
  return rows.length ? `<ul class="contact-list" role="list">${rows.join('')}</ul>` : '';
}

/** Shows a verified value, or in preview builds a clearly marked pending slot. */
export function pending(label, site) {
  return site.preview ? `<span class="pending">${icon('info')} ${esc(label)}: awaiting confirmation</span>` : '';
}

/**
 * Compact search-card field: a small label over the value. `control` is the
 * inner control markup (input, select or button); `chevron` adds the chevron.
 */
export function sfield({ label, control, chevron = false, cls = '' }) {
  return `<div class="sfield${cls ? ` ${cls}` : ''}">
      <span class="sfield__label">${esc(label)}</span>
      ${control}
      ${chevron ? icon('chevron-down', 'sfield__chevron') : ''}
    </div>`;
}

/**
 * Travellers field: adults and children counters in a popover (JavaScript),
 * or two plain number inputs without it. The inputs are the form controls, so
 * a GET form carries `adults` and `children` either way.
 */
export function travellersField({ id, adults = 2, children = 0, max = { adults: 30, children: 20 } }) {
  const row = (name, title, hint, value, min, mx) => `<div class="sfield-pop__row" data-counter-row>
          <span><strong><label for="${id}-${name}">${title}</label></strong><small>${hint}</small></span>
          <span class="counter">
            <button type="button" class="counter__btn" data-counter="-1" aria-controls="${id}-${name}" aria-label="Fewer ${name}" data-requires-js>${icon('minus')}</button>
            <input class="input counter__input" id="${id}-${name}" name="${name}" type="number" inputmode="numeric" min="${min}" max="${mx}" value="${value}" data-counter-input data-plan-field aria-describedby="${id}-${name}-hint" autocomplete="off">
            <button type="button" class="counter__btn" data-counter="1" aria-controls="${id}-${name}" aria-label="More ${name}" data-requires-js>${icon('plus')}</button>
          </span>
          <span class="visually-hidden" id="${id}-${name}-hint">${hint}</span>
        </div>`;
  const summary = children ? `${adults} adult${adults === 1 ? '' : 's'} · ${children} child${children === 1 ? '' : 'ren'}` : `${adults} adult${adults === 1 ? '' : 's'}`;
  return `<div class="sfield sfield--pop" data-travellers>
      <button type="button" class="sfield__inner sfield--button" data-travellers-toggle aria-expanded="false" aria-controls="${id}-pop" hidden>
        <span class="sfield__label">Travellers</span>
        <span class="sfield__control" data-travellers-label>${summary}</span>
        ${icon('chevron-down', 'sfield__chevron sfield__chevron--pop')}
      </button>
      <span class="sfield__label no-js-only">Travellers</span>
      <div class="sfield-pop" id="${id}-pop" data-travellers-pop>
        ${row('adults', 'Adults', 'Ages 12 and up', adults, 1, max.adults)}
        ${row('children', 'Children', 'Ages 0 to 11', children, 0, max.children)}
        <button type="button" class="btn gt-button gt-button--utility sfield-pop__done" data-travellers-done data-requires-js>Done</button>
      </div>
      <span class="visually-hidden" aria-live="polite" data-travellers-live></span>
    </div>`;
}
