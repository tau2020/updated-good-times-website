#!/usr/bin/env node
/**
 * Spot checks of the media audit's specific requirements on a deployed site, at a phone and a desktop width:
 * /tours/#adventure filters the tour list to the adventure activities, each showing a loaded photograph; Cape Agulhas
 * and Sky Diving lead with a photograph credited on the hero (no placeholder artwork); About's owner photograph is
 * shown whole (frame and photograph the same shape); every image request on these pages succeeds.
 *
 *   node qa/media-spot.mjs --base=https://<preview>.pages.dev [--out=<file.json>]
 */
import { chromium, devices } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').slice(k.length + 3) || d;
const BASE = String(arg('base', '')).replace(/\/$/, '');
if (!BASE) {
  console.error('usage: node qa/media-spot.mjs --base=<url> [--out=<file.json>]');
  process.exit(2);
}
const browser = await chromium.launch(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {});
const results = [];
const check = (name, ok, detail) => {
  results.push({ name, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${typeof detail === 'string' ? detail : JSON.stringify(detail)})` : ''}`);
};
for (const [label, opts] of [['phone 390', { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } }], ['desktop 1440', { viewport: { width: 1440, height: 900 } }]]) {
  const ctx = await browser.newContext({ ...opts, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  page.setDefaultTimeout(60_000);
  const bad = [];
  page.on('response', (r) => r.status() >= 400 && bad.push(`${r.status()} ${r.url()}`));
  page.on('pageerror', (e) => bad.push(`pageerror ${e.message}`));
  // The adventure link: /tours/#adventure filters the tour list to the adventure activities (main.js reads the hash)
  await page.goto(`${BASE}/tours/#adventure`, { waitUntil: 'load' });
  await page.waitForTimeout(800);
  const adv = await page.evaluate(() => {
    const chip = document.querySelector('[data-filter-value="adventure"]');
    const cards = [...document.querySelectorAll('[data-categories]')].filter((c) => !c.hidden);
    return { pressed: chip && chip.getAttribute('aria-pressed'), cards: cards.map((c) => ({ adventure: c.dataset.categories.split(' ').includes('adventure'), title: (c.querySelector('h2, h3') || c).textContent.replace(/\s+/g, ' ').trim().slice(0, 40) })) };
  });
  check(`${label}: /tours/#adventure filters the list to the adventure activities`, adv.pressed === 'true' && adv.cards.length > 0 && adv.cards.every((c) => c.adventure), adv.cards.map((c) => c.title).join(' · '));
  for (const want of ['quad-bikes-convoy', 'skydive-tandem', 'marine-dynamics-boat']) {
    await page.evaluate((w) => [...document.querySelectorAll('[data-categories]:not([hidden]) img')].find((i) => (i.currentSrc || i.src || '').includes(w) || (i.closest('picture')?.innerHTML || '').includes(w))?.scrollIntoView({ block: 'center' }), want);
    await page.waitForTimeout(700);
    const got = await page.evaluate((w) => {
      const i = [...document.querySelectorAll('[data-categories]:not([hidden]) img')].find((x) => (x.currentSrc || x.src).includes(w));
      return i ? { file: (i.currentSrc || i.src).split('/').pop(), loaded: i.complete && i.naturalWidth > 0 } : null;
    }, want);
    check(`${label}: an adventure card shows ${want}`, got && got.loaded, got);
  }
  // Agulhas and Sky Diving: a photograph, credited on the hero, no placeholder
  for (const [path, slot] of [['/tours/cape-agulhas-private-tour/', 'agulhas-tip-marker'], ['/tours/sky-diving/', 'skydive-tandem']]) {
    await page.goto(`${BASE}${path}`, { waitUntil: 'load' });
    const h = await page.evaluate((slot) => {
      const img = [...document.querySelectorAll('.tour-hero img')].find((i) => (i.currentSrc || i.src).includes(slot));
      const credit = document.querySelector('.tour-hero__credit');
      const cr = credit && credit.getBoundingClientRect();
      return { photo: img ? { file: (img.currentSrc || img.src).split('/').pop(), loaded: img.complete && img.naturalWidth > 0 } : null, credit: credit ? credit.textContent.trim() : null, creditVisible: !!(cr && cr.width > 0 && cr.bottom <= innerHeight + 2), placeholder: document.querySelectorAll('img[src$="gt-mountain-trail.svg"]').length };
    }, slot);
    check(`${label}: ${path} hero photograph loaded`, h.photo && h.photo.loaded, h.photo);
    check(`${label}: ${path} credit on the hero`, h.credit && /Wikimedia Commons/.test(h.credit) && h.creditVisible, h.credit);
    check(`${label}: ${path} no placeholder artwork`, h.placeholder === 0, `${h.placeholder} placeholder images`);
  }
  // About: the owner's photograph whole
  await page.goto(`${BASE}/about/`, { waitUntil: 'load' });
  await page.evaluate(() => document.querySelector('img[src*="owner-portrait"], picture img[alt*="owner"]')?.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(800);
  const own = await page.evaluate(() => {
    const img = [...document.images].find((i) => (i.currentSrc || i.src).includes('owner-portrait'));
    if (!img) return null;
    const f = img.closest('.media-frame').getBoundingClientRect();
    const nat = Number(img.getAttribute('width')) / Number(img.getAttribute('height'));
    return { file: (img.currentSrc || img.src).split('/').pop(), loaded: img.complete && img.naturalWidth > 0, frame: +(f.width / f.height).toFixed(3), photo: +nat.toFixed(3), cssW: Math.round(f.width), caption: img.closest('figure')?.querySelector('figcaption')?.textContent.trim() };
  });
  check(`${label}: About shows the owner's photograph`, own && own.loaded, own && own.file);
  check(`${label}: About owner photograph uncropped (frame shape = photograph shape)`, own && Math.abs(own.frame - own.photo) < 0.02, own && `frame ${own.frame}, photograph ${own.photo}, ${own.cssW}px wide`);
  check(`${label}: no failed request or page error on these pages`, bad.length === 0, bad.slice(0, 5));
  await ctx.close();
}
await browser.close();
const out = arg('out');
if (out) await writeFile(out, JSON.stringify({ base: BASE, when: new Date().toISOString(), results }, null, 1));
process.exit(results.every((r) => r.ok) ? 0 : 1);
