#!/usr/bin/env node
/**
 * The glass header's legibility over what scrolls beneath it (docs/enhancement/01-header.md): at chosen scroll
 * positions, with the header in its scrolled (glass) state, every text box in it (the navigation, Concierge, the
 * company statement) is measured against the pixels actually behind it. The header's words are made transparent for
 * one screenshot (nothing else changes), the backdrop under each box is sampled (its darkest decile, its median and its
 * lightest decile), and the WCAG contrast of the text's own colour with each is reported.
 *
 *   node qa/header-contrast.mjs --base=<url> [--out=<file.json>] [--widths=1440,390]
 *
 * It reads the screenshot through sharp, which ships with the repository's dev tools (wrangler's dependency).
 */
import { chromium } from '@playwright/test';
import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';

const require = createRequire(import.meta.url);
const sharp = require('sharp');
const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=').slice(1).join('=') || d;
const BASE = arg('base', '').replace(/\/$/, '');
const OUT = arg('out', '');
const widths = arg('widths', '1440,390').split(',').map(Number);
if (!BASE) {
  console.error('usage: node qa/header-contrast.mjs --base=<url> [--out=<file.json>]');
  process.exit(2);
}
const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const L = ([r, g, b]) => 0.2126 * lin(r / 255) + 0.7152 * lin(g / 255) + 0.0722 * lin(b / 255);
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
const rgb = (s) => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number);

// Where to stop on the home page: over the hero's film, the dark scenes, white bands and the footer
const STOPS = {
  home: ['.hero', '.lc-scene--road', '.lc-memory', '.lc-wild', '.lc-gallery', '.lc-scene--golden', '#reviews', '.lc-scene--invite', '.site-footer'],
  tours: ['.banner', 'main .section', '.site-footer'],
};

const browser = await chromium.launch();
const report = [];
for (const w of widths) {
  for (const [route, stops] of Object.entries(STOPS)) {
    const page = await browser.newPage({ viewport: { width: w, height: w < 600 ? 844 : 900 }, reducedMotion: 'reduce' });
    await page.goto(`${BASE}${route === 'home' ? '/' : `/${route}/`}?nomotion`, { waitUntil: 'load' });
    await page.evaluate(async () => {
      for (let y = 0; y < document.documentElement.scrollHeight; y += 700) {
        window.scrollTo({ top: y, behavior: 'instant' });
        await new Promise((r) => setTimeout(r, 30));
      }
    });
    for (const sel of stops) {
      const y = await page.evaluate((s) => {
        const el = document.querySelector(s);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        // The header over the band's upper part (a little inside it)
        return Math.max(60, Math.round(r.top + scrollY + Math.min(160, r.height / 3)));
      }, sel);
      if (y === null) continue;
      await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
      await page.waitForTimeout(450);
      const boxes = await page.evaluate(() => {
        const h = document.querySelector('[data-header]');
        const out = [];
        for (const el of h.querySelectorAll('.primary-nav a, .gt-concierge__toggle-label, .brand-lockup__statement')) {
          const r = el.getBoundingClientRect();
          if (!r.width || getComputedStyle(el).display === 'none') continue;
          out.push({ name: (el.textContent || '').trim().slice(0, 28), x: r.left, y: r.top, w: r.width, h: r.height, color: getComputedStyle(el).color, size: parseFloat(getComputedStyle(el).fontSize), weight: getComputedStyle(el).fontWeight });
        }
        return { condensed: h.classList.contains('is-condensed'), bg: getComputedStyle(h).backgroundColor, out };
      });
      // Hide the header's words for one frame: only the glass and what is behind it remain
      // Everything drawn in the header goes for that frame (words, logo artwork, icons, the leaf button): only the glass and what it shows remain
      await page.addStyleTag({ content: '[data-header] *, [data-header] *::before, [data-header] *::after { color: transparent !important; text-shadow: none !important; border-color: transparent !important; transition: none !important; } [data-header] img, [data-header] svg, [data-header] .leaf-btn, [data-header] .primary-nav a::after { visibility: hidden !important; }' });
      await page.waitForTimeout(80);
      const shot = await page.screenshot();
      await page.evaluate(() => document.querySelectorAll('style').forEach((s) => s.textContent.includes('only the glass') || (s.textContent.includes('color: transparent !important') && s.remove())));
      const img = sharp(shot);
      const { width: iw } = await img.metadata();
      const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
      const scale = info.width / iw;
      for (const b of boxes.out) {
        const lum = [];
        for (let yy = Math.floor(b.y); yy < b.y + b.h; yy += 1) {
          for (let xx = Math.floor(b.x); xx < b.x + b.w; xx += 1) {
            const i = (Math.round(yy * scale) * info.width + Math.round(xx * scale)) * info.channels;
            if (i < 0 || i + 2 >= data.length) continue;
            lum.push(L([data[i], data[i + 1], data[i + 2]]));
          }
        }
        lum.sort((a, c) => a - c);
        const q = (p) => lum[Math.min(lum.length - 1, Math.floor(p * lum.length))];
        const text = L(rgb(b.color));
        const large = b.size >= 24 || (b.size >= 18.66 && Number(b.weight) >= 700);
        const worst = ratio(text, q(0.1));
        report.push({ width: w, route, over: sel, condensed: boxes.condensed, headerBg: boxes.bg, text: b.name, color: b.color, size: b.size, darkest10: +ratio(text, q(0.1)).toFixed(2), median: +ratio(text, q(0.5)).toFixed(2), lightest10: +ratio(text, q(0.9)).toFixed(2), needs: large ? 3 : 4.5, pass: worst >= (large ? 3 : 4.5) });
      }
    }
    await page.close();
  }
}
await browser.close();
const fails = report.filter((r) => !r.pass);
for (const r of report.filter((r, i, a) => a.findIndex((x) => x.width === r.width && x.route === r.route && x.over === r.over) === i)) {
  const rows = report.filter((x) => x.width === r.width && x.route === r.route && x.over === r.over);
  console.log(`${r.width} ${r.route} over ${r.over} (${r.condensed ? 'glass' : 'top'}): worst ${Math.min(...rows.map((x) => x.darkest10)).toFixed(2)} · ${rows.map((x) => `${x.text.slice(0, 12)} ${x.darkest10}`).join(', ')}`);
}
console.log(fails.length ? `${fails.length} text boxes under AA:\n${fails.map((f) => `  ${f.width} ${f.route} ${f.over}: "${f.text}" ${f.darkest10} < ${f.needs}`).join('\n')}` : 'every text box meets AA over its darkest decile');
if (OUT) await writeFile(OUT, JSON.stringify(report, null, 2));
