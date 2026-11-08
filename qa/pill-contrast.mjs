#!/usr/bin/env node
/**
 * The white words on every visible green pill (.gt-button--primary), on the pages that carry them, at 1440 and 390 px:
 * each pill's words are made transparent for one screenshot, the pixels behind them sampled, and the contrast of white
 * with their lightest decile reported (the pill's gleam, --btn-sheen, is lightest at the top left). AA asks 4.5:1.
 *
 *   node qa/pill-contrast.mjs --base=<url> [--gleam=0.12,0.1]   (--gleam tries other strengths without a rebuild)
 *
 * A pill must be on top at its own centre and on screen to be measured. Reads screenshots through sharp, as
 * qa/header-contrast.mjs does. Exits 1 if any pill's words are under 4.5:1.
 */
import { chromium } from '@playwright/test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sharp = require('sharp');
const arg = (k, d) => (process.argv.find((x) => x.startsWith(`--${k}=`)) || '').split('=').slice(1).join('=') || d;
const base = arg('base', '').replace(/\/$/, '');
if (!base) {
  console.error('usage: node qa/pill-contrast.mjs --base=<url> [--gleam=0.12]');
  process.exit(2);
}
const alphas = arg('gleam', '') ? arg('gleam', '').split(',').map(Number) : [null];
const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const L = (r, g, b) => 0.2126 * lin(r / 255) + 0.7152 * lin(g / 255) + 0.0722 * lin(b / 255);
const PAGES = ['/', '/tours/', '/tours/cape-peninsula-private-tour/', '/transfers/', '/contact/', '/faq/', '/reviews/', '/enquire/', '/destinations/'];
const browser = await chromium.launch();
for (const a of alphas) {
  let worst = { c: 99 }, n = 0; const all = [];
  for (const w of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width: w, height: 900 }, reducedMotion: 'reduce' });
    for (const path of PAGES) {
      await page.goto(base + path + '?nomotion');
      await page.addStyleTag({ content: `${a === null ? '' : `:root { --btn-sheen: radial-gradient(120% 140% at 16% 0%, rgb(255 255 255 / ${a}) 0%, rgb(255 255 255 / 0) 52%) !important; } `}[data-header] { position: static !important; } .mobile-cta { display: none !important; }` });
      const pills = page.locator('.gt-button--primary:visible');
      const count = await pills.count();
      for (let i = 0; i < count; i++) {
        const el = pills.nth(i);
        await el.scrollIntoViewIfNeeded();
        const boxes = await el.evaluate((e) => {
          const out = [];
          const walk = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
          for (let t = walk.nextNode(); t; t = walk.nextNode()) {
            if (!t.textContent.trim() || t.parentElement.closest('.visually-hidden')) continue;
            const r = document.createRange(); r.selectNodeContents(t);
            for (const b of r.getClientRects()) out.push({ x: b.left, y: b.top, w: b.width, h: b.height });
          }
          const r0 = e.getBoundingClientRect();
          const hit = document.elementFromPoint(r0.left + r0.width / 2, r0.top + r0.height / 2);
          const onTop = !!hit && (hit === e || e.contains(hit)) && r0.top >= 0 && r0.bottom <= innerHeight;
          return { boxes: out, text: e.textContent.trim().slice(0, 30), color: getComputedStyle(e).color, onTop };
        });
        if (!boxes.boxes.length || !boxes.color.startsWith('rgb(255, 255, 255') || !boxes.onTop) continue;
        await el.evaluate((e) => e.setAttribute('data-probe', ''));
        const tag = await page.addStyleTag({ content: '[data-probe], [data-probe] * { color: transparent !important; -webkit-text-fill-color: transparent !important; text-shadow: none !important; transition: none !important; }' });
        await page.waitForTimeout(30);
        const shot = await page.screenshot();
        await tag.evaluate((t) => t.remove());
        await el.evaluate((e) => e.removeAttribute('data-probe'));
        const img = sharp(shot); const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
        const lum = [];
        for (const b of boxes.boxes) for (let y = Math.floor(b.y); y < b.y + b.h; y++) for (let x = Math.floor(b.x); x < b.x + b.w; x++) {
          const k = (y * info.width + x) * info.channels; if (k < 0 || k + 2 >= data.length) continue;
          lum.push(L(data[k], data[k + 1], data[k + 2]));
        }
        lum.sort((p, q) => p - q);
        const light = lum[Math.floor(0.9 * (lum.length - 1))];
        const c = 1.05 / (light + 0.05);
        n++;
        all.push({ c: +c.toFixed(2), text: boxes.text, path, w });
        if (c < worst.c) worst = { c: +c.toFixed(2), text: boxes.text, path, w };
      }
    }
    await page.close();
  }
  all.sort((p, q) => p.c - q.c);
  console.log(`gleam ${a === null ? 'as built' : a}: ${n} pills measured; lowest ${all.slice(0, 3).map((x) => `${x.c} "${x.text}" ${x.path} ${x.w}`).join(' | ')}`);
  if (all.some((x) => x.c < 4.5)) process.exitCode = 1;
}
await browser.close();
