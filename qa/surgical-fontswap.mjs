#!/usr/bin/env node
/**
 * Does any page move when the web fonts arrive? For each route and width, the page's first block is measured twice in
 * a fresh browser: with every .woff2 request blocked (the metric-matched fallbacks only) and with the fonts loaded. A
 * different height means the first screen jumps when the fonts swap in. Run against a deployed preview.
 *
 *   node qa/surgical-fontswap.mjs --base=<url> [--widths=360,390,412,768,1024,1440]
 */
import { chromium } from '@playwright/test';

const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=').slice(1).join('=') || d;
const BASE = arg('base', '').replace(/\/$/, '');
const widths = arg('widths', '360,390,412,768,1024,1440').split(',').map(Number);
const ROUTES = ['/', '/tours/', '/tours/cape-peninsula-private-tour/', '/transfers/', '/destinations/', '/packages/', '/about/', '/reviews/', '/faq/', '/contact/', '/enquire/'];
const browser = await chromium.launch();
let moved = 0;
for (const w of widths) {
  for (const path of ROUTES) {
    const out = [];
    for (const block of [true, false]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, reducedMotion: 'reduce' });
      const page = await ctx.newPage();
      if (block) await page.route('**/*.woff2', (r) => r.abort());
      await page.goto(`${BASE}${path}?nomotion`, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      out.push(await page.evaluate(() => {
        const first = document.querySelector('main > *');
        const r = first.getBoundingClientRect();
        return { block: `${first.tagName.toLowerCase()}.${first.className.split(' ')[0]}`, h: Math.round(r.height) };
      }));
      await ctx.close();
    }
    const d = out[1].h - out[0].h;
    if (d) moved++;
    console.log(`${w} ${path} ${out[0].block}: fallback ${out[0].h}px, web fonts ${out[1].h}px${d ? ` → MOVES ${d}px` : ''}`);
  }
}
await browser.close();
console.log(`\n${moved} first blocks change height when the fonts arrive`);
process.exit(moved ? 1 : 0);
