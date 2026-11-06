#!/usr/bin/env node
/**
 * Screenshots of the elements the independent visual review flagged, after their fixes, at the widths it named, with
 * the fixed header hidden: the phone's first caption, the licensed photographs' credits, the Winelands and About insets,
 * the Agulhas hero, the destinations table, the home taste section and the gallery's lunch spread.
 *
 *   node qa/media-fixes.mjs --base=https://<preview>.pages.dev --out=<dir>
 */
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').slice(k.length + 3);
const BASE = arg('base').replace(/\/$/, '');
const OUT = arg('out');
if (!BASE || !OUT) {
  console.error('usage: node qa/media-fixes.mjs --base=<url> --out=<dir>');
  process.exit(2);
}
await mkdir(OUT, { recursive: true });
const HEIGHTS = { 375: 812, 390: 844, 768: 1024, 1024: 768, 1440: 900, 1920: 1080 };
const SHOTS = [
  ['/', '.phone-gallery', [375, 390, 768, 1024, 1440, 1920], 'phone-slide1'],
  ['/', '.lc-way[data-service="adventure"]', [390, 1440], 'home-adventure-card'],
  ['/', '[data-taste="reveal"]', [390, 1440], 'home-taste'],
  ['/', '.lc-gallery__item:has(img[src*="lunch-spread-guests"]), .lc-gallery__item:has(source[srcset*="lunch-spread-guests"])', [390, 1440], 'home-gallery-lunch'],
  ['/tours/', '.card:has(source[srcset*="agulhas-lighthouse"])', [390, 1440], 'card-agulhas'],
  ['/tours/', '.card:has(source[srcset*="skydive-tandem"])', [390, 1440], 'card-skydive'],
  ['/tours/cape-agulhas-private-tour/', '.tour-hero', [768, 1024, 1440, 1920], 'agulhas-hero'],
  ['/tours/cape-winelands-private-tour/', '[data-taste="diptych"]', [390, 1440], 'winelands-pleasures'],
  ['/about/', '[data-taste="reveal"]', [390, 1440], 'about-pair'],
  ['/destinations/', '[data-taste="quiet"]', [390, 1440], 'destinations-table'],
];
const browser = await chromium.launch(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {});
for (const w of [375, 390, 768, 1024, 1440, 1920]) {
  const todo = SHOTS.filter((s) => s[2].includes(w));
  if (!todo.length) continue;
  const ctx = await browser.newContext({ viewport: { width: w, height: HEIGHTS[w] }, deviceScaleFactor: 1, reducedMotion: 'reduce', isMobile: w < 768, hasTouch: w < 1024 });
  const page = await ctx.newPage();
  page.setDefaultTimeout(45_000);
  for (const [route, sel, , name] of todo) {
    await page.goto(`${BASE}${route}?nomotion`, { waitUntil: 'load' });
    await page.addStyleTag({ content: '[data-header], .site-header, .mobile-cta, [data-mobile-cta] { visibility: hidden !important; }' });
    const el = page.locator(sel).first();
    if (!(await el.count())) {
      console.log(`${w} ${name}: not found`);
      continue;
    }
    await el.scrollIntoViewIfNeeded();
    await page.evaluate(async () => {
      await Promise.all([...document.images].filter((i) => i.getBoundingClientRect().top < innerHeight * 2).map((i) => (i.complete ? null : new Promise((r) => i.addEventListener('load', r, { once: true }) || setTimeout(r, 4000)))));
    });
    await page.waitForTimeout(900);
    await el.screenshot({ path: join(OUT, `${name}-${w}.jpg`), type: 'jpeg', quality: 70 });
    console.log(`${w} ${name}`);
  }
  await ctx.close();
}
await browser.close();
