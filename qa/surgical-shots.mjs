#!/usr/bin/env node
/**
 * Before/after evidence for the "Good Times, Naturally" surgical enhancement, captured from a deployed Cloudflare
 * preview (never a local server). Playwright, Chromium.
 *
 *   node qa/surgical-shots.mjs --base=<preview url> --out=<dir> [--widths=360,390,768,1024,1440] [--routes=home,tours]
 *                              [--motion] [--sections] [--quality=62]
 *
 * For every width and route, the page in its finished static composition (?nomotion and reduced motion, as the
 * media audit captured it), and its metrics:
 *   - horizontal overflow (scrollWidth > clientWidth) and the elements that cause it;
 *   - console errors, page errors and failed or 4xx/5xx requests;
 *   - the fonts the page actually loaded, and the computed type of the headings, body text and buttons;
 *   - every button-like control's computed shape (radius, height, colours), so the token system can be checked.
 * --sections writes one JPEG per top-level section (the home page's chapters, the header and the footer); without it,
 * one JPEG per screen-height band of the page.
 * --motion adds the home page with motion on: frames from the end of the footprints scene to the next chapter, so the
 * removed water section (before) and the joined transition (after) can be compared at each width.
 * PW_CHROMIUM_PATH points at a pre-installed Chromium where `playwright install` is unavailable.
 */
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=').slice(1).join('=') || d;
const BASE = arg('base', '').replace(/\/$/, '');
const OUT = arg('out', 'qa/surgical/shots');
const MOTION = process.argv.includes('--motion');
const SECTIONS = process.argv.includes('--sections');
const QUALITY = Number(arg('quality', '62'));
if (!BASE) {
  console.error('usage: node qa/surgical-shots.mjs --base=<deployed preview url> --out=<dir>');
  process.exit(2);
}

export const ROUTES = {
  home: '/',
  tours: '/tours/',
  peninsula: '/tours/cape-peninsula-private-tour/',
  winelands: '/tours/cape-winelands-private-tour/',
  transfers: '/transfers/',
  destinations: '/destinations/',
  packages: '/packages/',
  about: '/about/',
  reviews: '/reviews/',
  faq: '/faq/',
  contact: '/contact/',
  enquire: '/enquire/',
  'enquire-tour': '/enquire/?type=tour&tour=cape-peninsula-private-tour',
};
const HEIGHTS = { 360: 780, 390: 844, 768: 1024, 1024: 768, 1440: 900 };
const widths = arg('widths', '360,390,768,1024,1440').split(',').map(Number);
const routes = arg('routes', Object.keys(ROUTES).join(',')).split(',');

const slug = (s) => s.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 48);
const settle = (page, ms = 250) => page.waitForTimeout(ms);

/** Scroll once through the page so lazy images load and reveals finish, then back to the top. */
async function warm(page) {
  await page.evaluate(async () => {
    const step = Math.max(200, Math.round(window.innerHeight * 0.75));
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 70));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForLoadState('networkidle').catch(() => {});
  await settle(page, 400);
}

/** Type, fonts, buttons and overflow, read from the rendered page. */
const metrics = (page) =>
  page.evaluate(() => {
    const de = document.documentElement;
    const css = (el, props) => {
      if (!el) return null;
      const s = getComputedStyle(el);
      return Object.fromEntries(props.map((p) => [p, s.getPropertyValue(p)]));
    };
    const TYPE = ['font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'text-transform'];
    const first = (sel) => [...document.querySelectorAll(sel)].find((e) => e.offsetParent !== null || getComputedStyle(e).position === 'fixed');
    const overflowers = [];
    if (de.scrollWidth > de.clientWidth) {
      for (const el of document.querySelectorAll('body *')) {
        const r = el.getBoundingClientRect();
        if (r.width && (r.right > de.clientWidth + 1 || r.left < -1) && getComputedStyle(el).position !== 'fixed') {
          overflowers.push(`${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}.${[...el.classList].slice(0, 2).join('.')} (${Math.round(r.left)}–${Math.round(r.right)})`);
          if (overflowers.length > 12) break;
        }
      }
    }
    const BTN = 'a.gt-button, button.gt-button, a.leaf-btn, a.btn-coin, a.btn-champagne, .gt-btn, a.btn, button.btn';
    const buttons = [...document.querySelectorAll(BTN)]
      .filter((b) => b.offsetParent !== null)
      .slice(0, 40)
      .map((b) => {
        const s = getComputedStyle(b);
        const r = b.getBoundingClientRect();
        return {
          cls: [...b.classList].join(' '),
          text: (b.innerText || b.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 48),
          h: Math.round(r.height),
          w: Math.round(r.width),
          radius: s.borderTopLeftRadius,
          bg: s.backgroundColor,
          bgImage: s.backgroundImage === 'none' ? '' : s.backgroundImage.slice(0, 80),
          color: s.color,
          font: s.fontFamily.split(',')[0].replace(/['"]/g, ''),
          weight: s.fontWeight,
        };
      });
    return {
      title: document.title,
      height: de.scrollHeight,
      overflow: de.scrollWidth - de.clientWidth,
      overflowers,
      fonts: [...document.fonts].filter((f) => f.status === 'loaded').map((f) => `${f.family.replace(/['"]/g, '')} ${f.style} ${f.weight}`),
      type: {
        body: css(document.body, TYPE),
        h1: css(first('h1:not(.visually-hidden)'), TYPE),
        h2: css(first('h2'), TYPE),
        h3: css(first('h3'), TYPE),
        lead: css(first('.lc-lead, .lead, .page-hero__lead'), TYPE),
        nav: css(first('.primary-nav a'), TYPE),
      },
      buttons,
      images: { total: document.images.length, broken: [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && i.loading !== 'lazy').map((i) => i.currentSrc || i.src).slice(0, 10) },
    };
  });

/** The page's top-level blocks: the header, each section of <main> (and of the home page's chapters), the footer. */
const blocks = (page) =>
  page.evaluate(() => {
    const out = [];
    const add = (el, name) => {
      const r = el.getBoundingClientRect();
      if (r.height < 8 || r.width < 8) return;
      out.push({ name, y: Math.round(r.top + window.scrollY), h: Math.round(r.height) });
    };
    const header = document.querySelector('.site-header');
    if (header) add(header, 'header');
    const main = document.querySelector('main') || document.body;
    for (const el of main.children) {
      if (el.matches('[data-living-cape], .living-cape')) {
        for (const c of el.children) add(c, `${c.tagName.toLowerCase()}.${[...c.classList].slice(0, 2).join('.')}${c.id ? `#${c.id}` : ''}`);
      } else add(el, `${el.tagName.toLowerCase()}.${[...el.classList].slice(0, 2).join('.')}${el.id ? `#${el.id}` : ''}`);
    }
    const footer = document.querySelector('.site-footer');
    if (footer) add(footer, 'footer');
    return out;
  });

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {});
const report = { base: BASE, captured: new Date().toISOString(), widths, routes, pages: [] };

for (const w of widths) {
  const h = HEIGHTS[w] || 900;
  const dir = join(OUT, String(w));
  await mkdir(dir, { recursive: true });
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  for (const key of routes) {
    const path = ROUTES[key];
    if (!path) continue;
    const page = await ctx.newPage();
    const errors = [];
    const failed = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 240)));
    page.on('pageerror', (e) => errors.push(`pageerror: ${String(e.message || e).slice(0, 240)}`));
    const aborted = [];
    // A lazy image the browser cancels while the capture scrolls past it is not a failure: kept apart, reported
    page.on('requestfailed', (r) => ((r.failure()?.errorText || '').includes('ERR_ABORTED') ? aborted : failed).push(`${r.failure()?.errorText || 'failed'} ${r.url()}`));
    page.on('response', (r) => r.status() >= 400 && failed.push(`${r.status()} ${r.url()}`));
    const url = `${BASE}${path}${path.includes('?') ? '&' : '?'}nomotion`;
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60_000 });
    await page.evaluate(() => document.fonts.ready);
    await warm(page);
    const m = await metrics(page);
    const shots = [];
    if (SECTIONS) {
      for (const [i, b] of (await blocks(page)).entries()) {
        const file = join(dir, `${key}--${String(i).padStart(2, '0')}-${slug(b.name)}.jpg`);
        // Element-by-element: clip each block from the full page (Chromium caps one capture at 16384 px)
        const clipH = Math.min(b.h, 16000);
        await page.screenshot({ path: file, type: 'jpeg', quality: QUALITY, fullPage: true, clip: { x: 0, y: b.y, width: w, height: clipH } }).catch(async () => {
          await page.evaluate((y) => window.scrollTo(0, y), b.y);
          await settle(page);
          await page.screenshot({ path: file, type: 'jpeg', quality: QUALITY });
        });
        shots.push({ ...b, file });
      }
    } else {
      for (let y = 0, i = 0; y < m.height; y += h, i++) {
        const file = join(dir, `${key}--band-${String(i).padStart(2, '0')}.jpg`);
        await page.screenshot({ path: file, type: 'jpeg', quality: QUALITY, fullPage: true, clip: { x: 0, y, width: w, height: Math.min(h, m.height - y) } });
        shots.push({ y, file });
      }
    }
    report.pages.push({ width: w, route: key, url, ...m, errors, failed: [...new Set(failed)], aborted: [...new Set(aborted)], shots });
    console.log(`${w} ${key}: ${m.height}px, overflow ${m.overflow}, ${errors.length} errors, ${failed.length} failed, fonts: ${[...new Set(m.fonts.map((f) => f.split(' ')[0]))].join(', ')}`);
    await page.close();
  }
  await ctx.close();

  if (MOTION && routes.includes('home')) {
    // The home page with motion: from the last screen of the footprints scene to the next chapter's first screen
    const mctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, reducedMotion: 'no-preference' });
    const page = await mctx.newPage();
    const errors = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 240)));
    page.on('pageerror', (e) => errors.push(`pageerror: ${String(e.message || e).slice(0, 240)}`));
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 60_000 });
    await page.evaluate(() => document.fonts.ready);
    const geo = await page.evaluate(() => {
      const r = (s) => {
        const e = document.querySelector(s);
        if (!e) return null;
        const b = e.getBoundingClientRect();
        return { top: Math.round(b.top + scrollY), h: Math.round(b.height) };
      };
      const lc = document.querySelector('[data-living-cape]');
      const firstChapter = lc && lc.firstElementChild;
      const after = firstChapter && firstChapter.matches('[data-sun]') ? firstChapter.nextElementSibling : firstChapter;
      const fb = after && after.getBoundingClientRect();
      return { sand: r('.sand-journey'), sun: r('[data-sun]'), next: after ? { name: [...after.classList].slice(0, 2).join('.'), top: Math.round(fb.top + scrollY), h: Math.round(fb.height) } : null };
    });
    const frames = [];
    const start = geo.sand.top + geo.sand.h - h;
    const end = geo.next.top + Math.round(h * 0.6);
    const step = Math.max(Math.round(h * 0.5), Math.round((end - start) / 10));
    let i = 0;
    for (let y = start; y <= end; y += step, i++) {
      await page.evaluate((y) => window.scrollTo(0, y), y);
      await settle(page, 900);
      const file = join(dir, `home-motion--${String(i).padStart(2, '0')}-y${y}.jpg`);
      await page.screenshot({ path: file, type: 'jpeg', quality: QUALITY });
      frames.push({ y, file });
    }
    report.pages.push({ width: w, route: 'home-motion', geo, errors, frames });
    console.log(`${w} home-motion: sand ${geo.sand.top}+${geo.sand.h}, water ${geo.sun ? `${geo.sun.top}+${geo.sun.h}` : 'none'}, next ${geo.next.name} at ${geo.next.top}; ${frames.length} frames, ${errors.length} errors`);
    await mctx.close();
  }
}
await browser.close();
await writeFile(join(OUT, 'report.json'), JSON.stringify(report, null, 1));
const problems = report.pages.filter((p) => p.overflow > 0 || p.errors?.length || p.failed?.length);
console.log(`\n${report.pages.length} captures; ${problems.length} with overflow, errors or failed requests`);
for (const p of problems) console.log(` - ${p.width} ${p.route}: overflow ${p.overflow ?? 0} ${p.overflowers?.slice(0, 3).join('; ') || ''} | errors ${p.errors?.length || 0} | failed ${p.failed?.length || 0} ${p.failed?.slice(0, 2).join('; ') || ''}`);
