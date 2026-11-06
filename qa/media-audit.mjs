#!/usr/bin/env node
/**
 * The site's photographs and films as a browser sees them: an inventory of every rendered <img>, <video> and CSS
 * background image, per route and per screen width, and screenshots of the sections that hold them. Used for the
 * media audit (audit/): the BEFORE pass runs against the approved baseline's Cloudflare preview, the AFTER pass
 * against the feature branch's, with the same arguments.
 *
 *   node qa/media-audit.mjs --base=https://<preview>.pages.dev --out=<dir> [--widths=375,390,768,1024,1440,1920]
 *                           [--routes=/,/about/] [--shots] [--motion]
 *
 * Writes <out>/inventory-<width>.json: for each route, each media element with its slot (the image's name in
 * src/data/images.mjs, read from the file it loaded), the section and heading it sits under, its caption and alt
 * text, its box on the page, the size of the file it loaded and how much of the photograph the frame shows (for
 * object-fit: cover, the fraction of width and height left after the crop) and the pixels it has per device pixel.
 * --shots also saves a JPEG of every section that holds a photograph (<out>/shots/<route>/<width>-<section>.jpg).
 * Uses ?nomotion (the finished, static composition) unless --motion is passed. Nothing is written into docs/ or
 * audit/ unless --out says so.
 */
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const arg = (k, d) => {
  const a = process.argv.find((x) => x.startsWith(`--${k}=`));
  return a ? a.slice(k.length + 3) : process.argv.includes(`--${k}`) ? true : d;
};
const BASE = String(arg('base', '')).replace(/\/$/, '');
const OUT = arg('out');
if (!BASE || !OUT || OUT === true) {
  console.error('usage: node qa/media-audit.mjs --base=<url> --out=<dir> [--widths=…] [--routes=…] [--shots] [--motion]');
  process.exit(2);
}
const HEIGHTS = { 375: 812, 390: 844, 768: 1024, 1024: 768, 1280: 800, 1440: 900, 1920: 1080 };
const widths = String(arg('widths', '375,390,768,1024,1440,1920')).split(',').map(Number);
const ROUTES = [
  '/', '/about/', '/tours/', '/destinations/', '/transfers/', '/packages/', '/packages/garden-route-private-tour/', '/reviews/',
  '/contact/', '/faq/', '/enquire/', '/privacy/', '/terms/',
  '/tours/cape-peninsula-private-tour/', '/tours/cape-town-city-private-tour/', '/tours/cape-winelands-private-tour/',
  '/tours/township-private-tour/', '/tours/private-cape-town-experience/', '/tours/whale-watching-private-tour/',
  '/tours/cape-agulhas-private-tour/', '/tours/shark-cage-diving/', '/tours/quad-biking/', '/tours/sky-diving/',
];
const routes = arg('routes') && arg('routes') !== true ? String(arg('routes')).split(',') : ROUTES;
const SHOTS = !!arg('shots', false);
const MOTION = !!arg('motion', false);

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {});
const summary = { base: BASE, when: new Date().toISOString(), motion: MOTION, widths, routes, errors: {} };

for (const w of widths) {
  const ctx = await browser.newContext({
    viewport: { width: w, height: HEIGHTS[w] || 900 },
    deviceScaleFactor: w < 1024 ? 2 : 1,
    reducedMotion: MOTION ? 'no-preference' : 'reduce',
    hasTouch: w < 1024,
    isMobile: w < 768,
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(45_000);
  const inv = {};
  for (const route of routes) {
    const errors = [];
    const failed = [];
    page.removeAllListeners('pageerror');
    page.removeAllListeners('console');
    page.removeAllListeners('requestfailed');
    page.removeAllListeners('response');
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('response', (r) => r.status() >= 400 && /\/assets\/(img|video)\//.test(r.url()) && failed.push(`${r.status()} ${r.url()}`));
    const url = BASE + route + (MOTION ? '' : '?nomotion');
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => document.fonts.ready);
    // Scroll through so every lazy image loads, then wait for the network to settle
    await page.evaluate(async () => {
      const step = Math.max(200, window.innerHeight * 0.6);
      for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 70));
      }
    });
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForFunction(() => [...document.images].every((i) => i.complete), null, { timeout: 15_000 }).catch(() => {});
    const items = await page.evaluate(() => {
      const slotOf = (src) => {
        if (!src) return '';
        const f = src.split('?')[0].split('/').pop();
        const m = /^(.*?)-(\d+)\.(avif|webp|jpg|png)$/.exec(f);
        return m ? m[1] : f;
      };
      const textOf = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');
      const sectionOf = (el) => {
        const s = el.closest('section, header, footer, nav, dialog, aside, [data-concierge], .gt-concierge-panel') || document.body;
        const h = s.querySelector('h1, h2, h3');
        return { tag: s.tagName.toLowerCase(), id: s.id || s.getAttribute('aria-labelledby') || '', cls: (s.className && String(s.className).split(/\s+/).slice(0, 2).join(' ')) || '', heading: textOf(h).slice(0, 90) };
      };
      const captionOf = (el) => {
        const fig = el.closest('figure');
        if (fig && fig.querySelector('figcaption')) return textOf(fig.querySelector('figcaption')).slice(0, 140);
        const card = el.closest('article, li, a');
        const t = card && card.querySelector('h2, h3, .lc-print__label, figcaption');
        return t ? textOf(t).slice(0, 140) : '';
      };
      const chain = (el) => {
        const out = [];
        let n = el.parentElement;
        for (let i = 0; n && i < 3; i++, n = n.parentElement) out.push((n.className && String(n.className).split(/\s+/)[0]) || n.tagName.toLowerCase());
        return out.join(' < ');
      };
      const hidden = (el) => {
        for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
          const cs = getComputedStyle(n);
          if (cs.display === 'none' || cs.visibility === 'hidden' || n.hidden) return true;
        }
        return false;
      };
      const crop = (el, nw, nh, r) => {
        const cs = getComputedStyle(el);
        if (!nw || !nh || !r.width || !r.height) return null;
        const fit = cs.objectFit;
        if (fit === 'cover') {
          const k = Math.max(r.width / nw, r.height / nh);
          return { fit, shownW: +Math.min(1, r.width / (nw * k)).toFixed(3), shownH: +Math.min(1, r.height / (nh * k)).toFixed(3), pos: cs.objectPosition };
        }
        if (fit === 'contain') return { fit, shownW: 1, shownH: 1, pos: cs.objectPosition };
        const distort = Math.abs(r.width / r.height - nw / nh) / (nw / nh);
        return { fit, shownW: 1, shownH: 1, pos: cs.objectPosition, aspectError: +distort.toFixed(4) };
      };
      const dpr = window.devicePixelRatio || 1;
      const out = [];
      document.querySelectorAll('img, video').forEach((el) => {
        const r = el.getBoundingClientRect();
        const isVideo = el.tagName === 'VIDEO';
        // A photograph a script fills in later (the phone gallery's next slides) shows a placeholder until then: name it
        // by the file it is waiting for
        const lazy = () => el.getAttribute('data-src') || (el.closest('picture')?.querySelector('source[data-srcset]')?.getAttribute('data-srcset') || '').split(' ')[0];
        const src = isVideo ? el.currentSrc || el.getAttribute('poster') || '' : /^data:/.test(el.currentSrc || el.src) && lazy() ? lazy() : el.currentSrc || el.src;
        const nw = isVideo ? el.videoWidth : el.naturalWidth;
        const nh = isVideo ? el.videoHeight : el.naturalHeight;
        out.push({
          kind: isVideo ? 'video' : 'img',
          slot: isVideo ? slotOf(el.getAttribute('poster') || src) : slotOf(src),
          file: (src || '').split('/').slice(-2).join('/'),
          section: sectionOf(el),
          component: chain(el),
          caption: captionOf(el),
          alt: el.getAttribute('alt'),
          hidden: hidden(el) || r.width < 2 || r.height < 2,
          box: { x: Math.round(r.left + window.scrollX), y: Math.round(r.top + window.scrollY), w: Math.round(r.width), h: Math.round(r.height) },
          natural: { w: nw, h: nh },
          density: nw && r.width ? +(nw / (r.width * dpr)).toFixed(2) : null,
          crop: crop(el, nw, nh, r),
          loading: el.getAttribute('loading') || '',
          complete: isVideo ? el.readyState >= 2 : el.complete && nw > 0,
        });
      });
      // CSS background photographs (gradients and SVG art excluded)
      document.querySelectorAll('body *').forEach((el) => {
        const bg = getComputedStyle(el).backgroundImage;
        if (!bg || bg === 'none' || !/url\(/.test(bg)) return;
        const urls = [...bg.matchAll(/url\("?([^")]+)"?\)/g)].map((m) => m[1]).filter((u) => /\.(avif|webp|jpe?g|png)(\?|$)/i.test(u));
        urls.forEach((u) => {
          const r = el.getBoundingClientRect();
          out.push({ kind: 'css-background', slot: slotOf(u), file: u.split('/').slice(-2).join('/'), section: sectionOf(el), component: chain(el), caption: '', alt: null, hidden: hidden(el), box: { x: Math.round(r.left + window.scrollX), y: Math.round(r.top + window.scrollY), w: Math.round(r.width), h: Math.round(r.height) } });
        });
      });
      return out;
    });
    inv[route] = { errors, failed, items };
    if (errors.length || failed.length) summary.errors[`${w}${route}`] = { errors, failed };

    if (SHOTS) {
      const dir = join(OUT, 'shots', route === '/' ? 'home' : route.replace(/^\/|\/$/g, '').replace(/\//g, '__'));
      await mkdir(dir, { recursive: true });
      const sections = await page.evaluate(() => {
        const list = [];
        document.querySelectorAll('main section, main > div > section, .hero').forEach((s, i) => {
          if (!s.querySelector('img, video')) return;
          const r = s.getBoundingClientRect();
          if (r.height < 40) return;
          const key = (s.id || s.getAttribute('aria-labelledby') || String(s.className).split(/\s+/)[0] || `section-${i}`).replace(/[^a-z0-9_-]/gi, '');
          list.push({ key: `${String(i).padStart(2, '0')}-${key}`, y: Math.round(r.top + window.scrollY), h: Math.round(r.height) });
        });
        return list;
      });
      for (const s of sections) {
        // A section taller than two screens (the sand journey's held stretch) is shot one screen high from its top
        const h = Math.min(s.h, (HEIGHTS[w] || 900) * 2);
        await page.evaluate((y) => window.scrollTo(0, Math.max(0, y - 60)), s.y);
        await page.waitForTimeout(250);
        await page.screenshot({ path: join(dir, `${w}-${s.key}.jpg`), type: 'jpeg', quality: 60, fullPage: true, clip: { x: 0, y: s.y, width: w, height: h } }).catch((e) => errors.push(`shot ${s.key}: ${e.message}`));
      }
    }
    process.stdout.write(`${w} ${route}: ${inv[route].items.length} media${errors.length ? `, ${errors.length} errors` : ''}${failed.length ? `, ${failed.length} failed` : ''}\n`);
  }
  await writeFile(join(OUT, `inventory-${w}.json`), JSON.stringify(inv, null, 1));
  await ctx.close();
}
await writeFile(join(OUT, 'summary.json'), JSON.stringify(summary, null, 2));
await browser.close();
