#!/usr/bin/env node
/**
 * One photograph, one place: reads an inventory written by qa/media-audit.mjs and reports every photograph that
 * appears in more than one editorial placement across the site.
 *
 *   node qa/media-duplicates.mjs <inventory-1440.json> [--json=<out.json>]
 *
 * A placement is where a photograph is shown for its own sake. These are one placement each, wherever they repeat
 * (audit/image-change-register.md, E1–E5):
 *   E1 a tour's card: the tour list, similar days, the package list, the concierge's featured days, the booking form's
 *      summary of the chosen tour, and a destination card that links to that same tour or package page;
 *   E2 a service's photograph: its home-page card, its concierge row and card, and its choice in the booking form;
 *   E3 a destination's photograph: its home-page carousel card and its destinations-page card;
 *   E4 a tour with one photograph: its card and its page's hero;
 *   E5 a tour's gallery: its wall, its photo band (the gallery's cover, which opens the lightbox on it) and its lightbox.
 * The concierge panel and the site header and footer are each one placement, however many pages carry them.
 * Exit code 1 when any photograph appears in two placements.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { tours, destinations } from '../src/data/tours.mjs';
import { packages } from '../src/data/packages.mjs';

const file = process.argv[2];
if (!file) {
  console.error('usage: node qa/media-duplicates.mjs <inventory.json> [--json=<out>]');
  process.exit(2);
}
const out = (process.argv.find((a) => a.startsWith('--json=')) || '').slice(7);
const inv = JSON.parse(readFileSync(file, 'utf8'));
const NOT_PHOTO = /\.svg$|^data:|avatars\/|brand\//;
const LISTINGS = new Set(['catalogue-title', 'similar-title', 'more-title', 'packages-title', 'packages-list-title']);

// E1 and E4 from the data: which slot is which tour's card, and which tours show one photograph as both
const cardOf = new Map([...tours, ...packages].filter((t) => t.images.card).map((t) => [t.images.card, t]));
const singlePhoto = new Set(tours.filter((t) => t.images.hero && t.images.hero === t.images.card).map((t) => t.images.hero));
// A destination card that links to a tour or package page may show that page's card (E1)
const destToCard = new Set(destinations.filter((d) => [...tours, ...packages].some((t) => d.href.includes(t.slug) && t.images.card === d.image)).map((d) => d.image));

const placementOf = (route, it) => {
  const sec = it.section.id || it.section.cls || it.section.tag;
  const comp = it.component;
  if (/gt-concierge__thumb|booking-summary__media/.test(comp)) return 'E1 tour card';
  if (/service-choice__media/.test(comp)) return 'E2 service';
  if (/gt-concierge-row__photo|lc-invite__photo/.test(comp) || (route === '/' && sec === 'ways-title')) return 'E2 service';
  if (/gt-concierge/.test(comp + ' ' + it.section.cls) || ['header', 'footer', 'nav'].includes(it.section.tag)) return `chrome ${comp.split(' < ')[0]}`;
  if (LISTINGS.has(sec) && /card__media/.test(comp)) return 'E1 tour card';
  if ((route === '/' && sec === 'film-title') || (route === '/destinations/' && /card__media/.test(comp))) return destToCard.has(it.slot) ? 'E1 tour card' : 'E3 destination';
  if (sec === 'panel-gallery' || /photo-band/.test(it.section.cls + ' ' + comp)) return `E5 gallery ${route}`;
  if (/tour-hero/.test(sec + ' ' + it.section.cls + ' ' + comp) && singlePhoto.has(it.slot)) return 'E1 tour card';
  return `${route} › ${sec} › ${(it.caption || '').slice(0, 50)}`;
};

const bySlot = new Map();
for (const [route, { items }] of Object.entries(inv)) {
  for (const it of items) {
    if (!it.slot || NOT_PHOTO.test(it.file || '') || NOT_PHOTO.test(it.slot) || it.kind === 'css-background') continue;
    const key = placementOf(route, it);
    if (!bySlot.has(it.slot)) bySlot.set(it.slot, new Set());
    bySlot.get(it.slot).add(key);
  }
}
const rows = [...bySlot.entries()].map(([slot, keys]) => ({ slot, placements: [...keys].sort(), card: cardOf.has(slot) ? cardOf.get(slot).slug : null }));
const repeated = rows.filter((r) => r.placements.length > 1);
console.log(`${rows.length} photographs in ${rows.reduce((n, r) => n + r.placements.length, 0)} placements`);
if (repeated.length) {
  console.log(`\n${repeated.length} photograph(s) in more than one placement:`);
  for (const r of repeated) console.log(`  ${r.slot}\n    - ${r.placements.join('\n    - ')}`);
} else console.log('every photograph appears in one placement');
if (out) writeFileSync(out, JSON.stringify({ file, photographs: rows.length, repeated, rows }, null, 1));
process.exit(repeated.length ? 1 : 0);
