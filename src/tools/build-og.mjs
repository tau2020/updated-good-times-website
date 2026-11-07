#!/usr/bin/env node
/**
 * The share image (src/assets/img/og-default.jpg, 1200 × 630): the brand lockup as the site sets it (Addendum,
 * 6 Nov 2026) on the card's own ground. The card's paper, its two sunshine corners and its white panel are kept from
 * the existing image; inside the panel, the approved compact logo (src/assets/brand/gt-logo-compact.svg, drawn as
 * supplied, never edited) and the company statement beneath it, in DM Sans (src/assets/fonts), on one line spanning
 * the artwork, as in the header. The previous card showed the logo pack's full artwork, whose own older tagline the
 * statement replaces. Chromium (Playwright) draws it, so the SVG renders exactly as in a browser. Re-running it is
 * safe: the panel is cleared to white before the lockup is drawn.
 *
 *   node src/tools/build-og.mjs
 */
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { site } from '../data/site.mjs';

const src = (p) => fileURLToPath(new URL(`../${p}`, import.meta.url));
const OUT = src('assets/img/og-default.jpg');
const data = (p, type) => `data:${type};base64,${readFileSync(src(p)).toString('base64')}`;
const card = data('assets/img/og-default.jpg', 'image/jpeg');
const logo = data('assets/brand/gt-logo-compact.svg', 'image/svg+xml');
const font = data('assets/fonts/DMSans.woff2', 'font/woff2');

// The white panel spans 50–1150 × 50–580; the lockup is centred in it at 940 px wide (the old artwork was 995 px wide
// with its two-line tagline). The statement's size follows the site's rule: the artwork's width / 25.
const W = 940;
const html = `<!doctype html><meta charset="utf-8"><style>
@font-face { font-family: 'DM Sans'; src: url(${font}) format('woff2'); font-weight: 100 1000; }
html, body { margin: 0; width: 1200px; height: 630px; overflow: hidden; }
body { background: url(${card}) 0 0 / 1200px 630px no-repeat; position: relative; }
.clear { position: absolute; left: 70px; top: 70px; width: 1060px; height: 490px; background: #fff; }
.lockup { position: absolute; left: 50%; top: 315px; transform: translate(-50%, -50%); width: ${W}px; }
.lockup img { display: block; width: ${W}px; height: auto; }
.lockup p { margin: ${(W / 25) * 0.25}px 0 0; padding-left: ${W * 0.012}px; font: 600 ${W / 25}px/1.2 'DM Sans', sans-serif; letter-spacing: 0.01em; white-space: nowrap; color: #147d43; }
</style><div class="clear"></div><div class="lockup"><img src="${logo}" alt=""><p>${site.statement}</p></div>`;

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  const fits = await page.evaluate(() => { const p = document.querySelector('.lockup p'); return p.scrollWidth <= p.parentElement.clientWidth + 2; });
  if (!fits) throw new Error('the statement is wider than the artwork');
  writeFileSync(OUT, await page.screenshot({ type: 'jpeg', quality: 90 }));
  console.log(`share image → ${OUT}`);
} finally {
  await browser.close();
}
