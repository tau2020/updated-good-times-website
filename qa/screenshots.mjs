#!/usr/bin/env node
/**
 * Responsive screenshot matrix (Playwright, Chromium).
 *
 *   node qa/screenshots.mjs [--base=http://127.0.0.1:8090] [--out=docs/qa/screens]
 *                           [--pages=home,tours] [--widths=1440,390] [--full] [--motion] [--jpeg]
 *
 * Captures each page at each width, above the fold (and full page with --full),
 * and reports horizontal overflow (scrollWidth > clientWidth) and undersized
 * tap targets for every capture. Uses ?nomotion unless --motion is passed.
 * --jpeg writes JPEG (quality 72) instead of PNG, for committed evidence.
 * PW_CHROMIUM_PATH points at a pre-installed Chromium where `playwright install` is unavailable.
 */
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=').slice(1).join('=') || d;
const BASE = arg('base', 'http://127.0.0.1:8090');
const OUT = arg('out', 'docs/qa/screens');
const FULL = process.argv.includes('--full');
const MOTION = process.argv.includes('--motion');
const JPEG = process.argv.includes('--jpeg');
const EXT = JPEG ? 'jpg' : 'png';
const shot = (path, extra = {}) => (JPEG ? { path, type: 'jpeg', quality: 72, ...extra } : { path, ...extra });

export const PAGES = {
  home: '/',
  tours: '/tours/',
  'tour-detail': '/tours/cape-peninsula-private-tour/',
  'tour-detail-single': '/tours/cape-agulhas-private-tour/',
  transfers: '/transfers/',
  about: '/about/',
  reviews: '/reviews/',
  faq: '/faq/',
  enquire: '/enquire/',
  'enquire-tour': '/enquire/?type=tour&tour=cape-town-city-private-tour',
  'enquire-transfer': '/enquire/?type=transfer',
  destinations: '/destinations/',
  contact: '/contact/',
  privacy: '/privacy/',
  terms: '/terms/',
  '404': '/no-such-page/',
};
const WIDTHS = { 2560: 1440, 1920: 1080, 1440: 900, 1280: 800, 1024: 768, 768: 1024, 430: 932, 390: 844, 375: 812, 360: 780, 320: 640 };
// Default matrix: the brief's widths (the 2560 pass is opt-in via --widths=2560)
const DEFAULT_WIDTHS = [1920, 1440, 1280, 1024, 768, 430, 390, 375, 360, 320];

const pages = arg('pages', Object.keys(PAGES).join(',')).split(',');
const widths = arg('widths', DEFAULT_WIDTHS.join(',')).split(',').map(Number);

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {});
const report = [];
for (const w of widths) {
  const ctx = await browser.newContext({
    viewport: { width: w, height: WIDTHS[w] || 900 },
    deviceScaleFactor: w < 600 ? 2 : 1,
    reducedMotion: MOTION ? 'no-preference' : 'reduce',
  });
  const page = await ctx.newPage();
  for (const key of pages) {
    const url = BASE + PAGES[key] + (MOTION ? '' : (PAGES[key].includes('?') ? '&' : '?') + 'nomotion');
    const res = await page.goto(url, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    // Scroll through once so lazy images load and reveals trigger, then return to the top.
    await page.evaluate(async () => {
      for (let y = 0; y < document.documentElement.scrollHeight; y += window.innerHeight * 0.8) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 60));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(300);
    const metrics = await page.evaluate(() => {
      const de = document.documentElement;
      const small = [...document.querySelectorAll('a[href], button, input, select, textarea, summary')]
        .filter((el) => {
          const r = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          if (!r.width || !r.height || cs.visibility === 'hidden') return false;
          const inline = cs.display === 'inline' && el.closest('p, li, figcaption, dd, .callout, .notice');
          return !inline && (r.height < 24 || r.width < 24);
        })
        .map((el) => (el.getAttribute('aria-label') || el.textContent || el.name || el.tagName).trim().slice(0, 40));
      return { overflow: de.scrollWidth - de.clientWidth, h1: document.querySelectorAll('h1').length, small };
    });
    const name = `${key}-${w}`;
    await page.screenshot(shot(join(OUT, `${name}-fold.${EXT}`)));
    if (FULL) await page.screenshot(shot(join(OUT, `${name}-full.${EXT}`), { fullPage: true }));
    report.push({ page: key, width: w, status: res?.status(), overflowPx: metrics.overflow, h1: metrics.h1, smallTargets: metrics.small });
  }
  await ctx.close();
}
await browser.close();
await writeFile(join(OUT, 'report.json'), JSON.stringify(report, null, 2));
const bad = report.filter((r) => r.overflowPx > 0 || r.h1 !== 1);
console.log(`captured ${report.length} views → ${OUT}`);
console.log(bad.length ? `issues:\n${bad.map((b) => `  ${b.page}@${b.width}: overflow ${b.overflowPx}px, h1=${b.h1}`).join('\n')}` : 'no horizontal overflow; one h1 per page');
const small = report.filter((r) => r.smallTargets.length);
if (small.length) console.log(`small targets (<24px):\n${small.map((s) => `  ${s.page}@${s.width}: ${s.smallTargets.join(' | ')}`).join('\n')}`);
