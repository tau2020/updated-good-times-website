#!/usr/bin/env node
/**
 * Each photograph's own crop, as a visitor sees it, for the subject-safety review (the media audit's Gate B): for every
 * route and width, a screenshot of each visible photograph's frame with the fixed header, the phone's call bar and the
 * concierge hidden, so nothing covers it, and with each tour page's Gallery tab opened, so its wall is reviewed too.
 * Then one strip per photograph across the widths, side by side (ImageMagick), for looking at.
 *
 *   node qa/media-crops.mjs --base=https://<preview>.pages.dev --out=<dir> [--slots=a,b,c] [--widths=…] [--routes=…]
 *
 * --slots limits the review to the named photographs (the changed ones); without it, every photograph.
 * Writes <out>/<width>/<route>--<n>-<slot>.jpg, <out>/strips/<slot>.jpg and <out>/crops.json.
 */
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').slice(k.length + 3) || d;
const BASE = String(arg('base', '')).replace(/\/$/, '');
const OUT = arg('out');
if (!BASE || !OUT) {
  console.error('usage: node qa/media-crops.mjs --base=<url> --out=<dir> [--slots=…] [--widths=…] [--routes=…]');
  process.exit(2);
}
const HEIGHTS = { 375: 812, 390: 844, 768: 1024, 1024: 768, 1440: 900, 1920: 1080 };
const widths = String(arg('widths', '375,390,768,1024,1440,1920')).split(',').map(Number);
const routes = String(
  arg(
    'routes',
    '/,/about/,/tours/,/destinations/,/transfers/,/packages/,/packages/garden-route-private-tour/,/reviews/,/enquire/,/tours/cape-peninsula-private-tour/,/tours/cape-town-city-private-tour/,/tours/cape-winelands-private-tour/,/tours/township-private-tour/,/tours/private-cape-town-experience/,/tours/whale-watching-private-tour/,/tours/cape-agulhas-private-tour/,/tours/shark-cage-diving/,/tours/quad-biking/,/tours/sky-diving/',
  ),
).split(',');
const only = arg('slots') ? new Set(String(arg('slots')).split(',')) : null;

const browser = await chromium.launch(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {});
const found = [];
for (const w of widths) {
  const dir = join(OUT, String(w));
  await mkdir(dir, { recursive: true });
  const ctx = await browser.newContext({ viewport: { width: w, height: HEIGHTS[w] || 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce', hasTouch: w < 1024, isMobile: w < 768 });
  const page = await ctx.newPage();
  page.setDefaultTimeout(45_000);
  for (const route of routes) {
    await page.goto(`${BASE}${route}?nomotion`, { waitUntil: 'load' });
    await page.addStyleTag({ content: '[data-header], .site-header, .mobile-cta, [data-mobile-cta], .gt-concierge-launch, [data-concierge-launch], .consent, [data-consent] { visibility: hidden !important; }' });
    // A tour's gallery wall is in its Gallery tab
    if (await page.locator('#tab-gallery').count()) await page.locator('#tab-gallery').click().catch(() => {});
    // Every lazy photograph loads
    await page.evaluate(async () => {
      for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight * 0.7) {
        scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 60));
      }
      scrollTo(0, 0);
    });
    await page.waitForLoadState('networkidle').catch(() => {});
    const items = await page.evaluate(() => {
      const out = [];
      const slotOf = (src) => {
        const m = /\/([a-z0-9-]+?)-(\d+)\.(?:avif|webp|jpe?g|png)(?:\?|$)/.exec(src || '');
        return m ? m[1] : '';
      };
      document.querySelectorAll('img').forEach((img, i) => {
        const src = img.currentSrc || img.src;
        if (!src || /\.svg|^data:|avatars\/|brand\//.test(src)) return;
        const r = img.getBoundingClientRect();
        if (r.width < 40 || r.height < 30) return;
        for (let n = img; n && n !== document.body; n = n.parentElement) {
          const cs = getComputedStyle(n);
          if (cs.display === 'none' || cs.visibility === 'hidden' || n.hidden) return;
        }
        // The visible crop: the nearest ancestor that clips the photograph, or the photograph itself
        let frame = img;
        for (let n = img.parentElement; n && n !== document.body; n = n.parentElement) {
          const cs = getComputedStyle(n);
          if (cs.overflow !== 'visible' || cs.overflowX !== 'visible') {
            frame = n;
            break;
          }
        }
        const fr = frame.getBoundingClientRect();
        if (fr.width > innerWidth * 1.05 && frame !== img) frame = img; // a page-wide clip: use the photograph
        const id = `crop-${i}`;
        frame.setAttribute('data-crop-id', id);
        out.push({ id, slot: slotOf(src), file: src.split('/').pop(), alt: img.alt, w: Math.round(fr.width), h: Math.round(fr.height) });
      });
      return out;
    });
    const name = route === '/' ? 'home' : route.replace(/^\/|\/$/g, '').replace(/\//g, '__');
    const seen = new Set();
    let n = 0;
    for (const it of items) {
      if (!it.slot || (only && !only.has(it.slot)) || seen.has(it.slot)) continue;
      seen.add(it.slot);
      const loc = page.locator(`[data-crop-id="${it.id}"]`);
      const file = join(dir, `${name}--${String(n++).padStart(2, '0')}-${it.slot}.jpg`);
      try {
        await loc.scrollIntoViewIfNeeded();
        await page.waitForTimeout(120);
        await loc.screenshot({ path: file, type: 'jpeg', quality: 70 });
        found.push({ width: w, route, slot: it.slot, file: file.replace(`${OUT}/`, ''), loaded: it.file, frame: `${it.w}×${it.h}`, alt: it.alt });
      } catch (e) {
        found.push({ width: w, route, slot: it.slot, error: e.message.split('\n')[0] });
      }
    }
    console.log(`${w} ${route}: ${n} photographs`);
  }
  await ctx.close();
}
await browser.close();
await writeFile(join(OUT, 'crops.json'), JSON.stringify(found, null, 1));
// One strip per photograph and placement: its crop at each width, left to right, each labelled
await mkdir(join(OUT, 'strips'), { recursive: true });
const groups = new Map();
for (const f of found.filter((x) => x.file)) {
  const key = `${f.route === '/' ? 'home' : f.route.replace(/^\/|\/$/g, '').replace(/\//g, '__')}--${f.slot}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(f);
}
for (const [key, list] of groups) {
  const args = [];
  for (const f of list.sort((a, b) => a.width - b.width)) args.push('(', join(OUT, f.file), '-resize', 'x220', '-gravity', 'North', '-background', '#222', '-splice', '0x18', '-fill', 'white', '-pointsize', '13', '-annotate', '+0+2', `${f.width}px  ${f.frame}`, ')');
  // Six pixels of white between the crops (gravity West, or the splice would cut each crop down its middle)
  execFileSync('convert', [...args.flatMap((a) => (a === ')' ? ['-gravity', 'West', '-background', 'white', '-splice', '6x0', ')'] : [a])), '-gravity', 'North', '+append', '-quality', '68', join(OUT, 'strips', `${key}.jpg`)]);
}
console.log(`${found.length} crops, ${groups.size} strips`);
