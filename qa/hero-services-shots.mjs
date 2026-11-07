#!/usr/bin/env node
/**
 * The home hero at the hero-services brief's six viewports, captured from a deployed Cloudflare preview (never a
 * local server), in Chromium:
 *
 *   node qa/hero-services-shots.mjs --base=<preview url> --out=<dir> [--frames] [--label=after]
 *
 * For each viewport: the hero once its entrance has finished (motion allowed), the static composition (?nomotion) and
 * the reduced-motion composition; with --frames, the entrance at fixed moments of its timeline (window.__heroEntrance,
 * paused and sought, so the frames are exact). Also measured: console errors, failed requests, layout shift during the
 * entrance, horizontal overflow, and (when the hero services exist) whether any of them overlaps the header, the call to
 * action, the phone or a face (the faces' boxes in the poster's own pixels, mapped through the hero's object-fit crop),
 * and the contrast of the services' words against what lies behind them: the block's text is made transparent (its
 * shade stays), the page is captured, and behind each line the brighter end of the background (its 90th-percentile
 * luminance) is set against white. Conservative: the words' own shadow halo, which helps, is left out.
 * Writes <out>/<w>x<h>-<state>.jpg and <out>/metrics.json.
 */
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=').slice(1).join('=') || d;
const BASE = arg('base', '').replace(/\/$/, '');
const OUT = arg('out', 'qa/hero-services/shots');
const FRAMES = process.argv.includes('--frames');
if (!BASE) {
  console.error('usage: node qa/hero-services-shots.mjs --base=<deployed preview url> --out=<dir> [--frames]');
  process.exit(2);
}

export const VIEWPORTS = [
  [1920, 1080, 'wide desktop'],
  [1440, 900, 'desktop'],
  [1366, 768, 'short laptop'],
  [768, 1024, 'tablet'],
  [390, 844, 'mobile'],
  [360, 740, 'small mobile'],
];
const PHONE = (w) => w < 600;
// --viewports=1280x800,2560x1440 measures other sizes instead (no frames)
const EXTRA = arg('viewports', '')
  .split(',')
  .filter(Boolean)
  .map((v) => [...v.split('x').map(Number), 'extra']);

/**
 * The faces in the hero poster (1280 × 720, hero-moment-poster), generous boxes from forehead to chin: the sleeping
 * friend (his sunglasses on the table), the curly-haired friend, the brunette, the tall friend and the blonde.
 */
const FACES = [
  ['sleeping friend', 262, 440, 550, 640],
  ['curly-haired friend', 470, 225, 670, 470],
  ['brunette', 660, 300, 840, 520],
  ['tall friend', 780, 125, 945, 340],
  ['blonde friend', 870, 265, 1050, 515],
];

function measure(faces) {
  const r = (el) => {
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return b.width && b.height ? { x: b.left, y: b.top + scrollY, w: b.width, h: b.height } : null;
  };
  const img = document.querySelector('.hero__media img');
  const media = document.querySelector('.hero__media');
  const box = media.getBoundingClientRect();
  // object-fit: cover with object-position from the computed style
  const [px, py] = getComputedStyle(img).objectPosition.split(' ').map((v) => parseFloat(v) / 100);
  const scale = Math.max(box.width / 1280, box.height / 720);
  const iw = 1280 * scale;
  const ih = 720 * scale;
  const ox = box.left + (box.width - iw) * px;
  const oy = box.top + scrollY + (box.height - ih) * py;
  const faceBoxes = faces.map(([name, x0, y0, x1, y1]) => ({ name, x: ox + x0 * scale, y: oy + y0 * scale, w: (x1 - x0) * scale, h: (y1 - y0) * scale }))
    // only what the hero's frame actually shows
    .filter((f) => f.x + f.w > box.left && f.x < box.right && f.y + f.h > box.top + scrollY && f.y < box.bottom + scrollY);
  const services = document.querySelector('.hero-services');
  const parts = services ? [...services.querySelectorAll('.hero-headline, .hero-services__lead, .hero-services__item')].map((el) => ({ el: el.className.split(' ')[0], ...r(el) })).filter((p) => p.w) : [];
  const headline = r(document.querySelector('.hero-headline'));
  const hero = document.querySelector('.hero');
  const header = document.querySelector('.site-header');
  const out = {
    viewport: { w: innerWidth, h: innerHeight },
    hero: r(hero),
    header: r(header),
    headline,
    phone: r(document.querySelector('.hero__phone')),
    services: r(services),
    parts,
    faces: faceBoxes,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
  const hit = (a, b) => a && b && a.x < b.x + b.w - 1 && b.x < a.x + a.w - 1 && a.y < b.y + b.h - 1 && b.y < a.y + a.h - 1;
  out.collisions = [];
  // Where the block sits: over the photograph (absolute in the hero's frame) or beneath the hero (in the flow)
  out.placement = services ? (getComputedStyle(services).position === 'absolute' ? 'over the photograph' : 'beneath the hero') : 'none';
  if (out.placement === 'beneath the hero') {
    if (out.services.y < out.hero.y + out.hero.h - 1) out.collisions.push('the block overlaps the hero');
    // The headline sits in the hero's foot, where the leaf was: clear of every face, the phone and the header
    if (headline) {
      for (const f of faceBoxes) if (hit(headline, f)) out.collisions.push(`the headline over the ${f.name}'s face`);
      if (hit(headline, out.header)) out.collisions.push('the headline under the header');
      if (hit(headline, out.phone)) out.collisions.push('the headline over the phone');
      if (headline.y + headline.h > out.hero.y + out.hero.h + 1) out.collisions.push('the headline runs past the hero');
    }
  } else for (const p of parts) {
    for (const f of faceBoxes) if (hit(p, f)) out.collisions.push(`${p.el} over the ${f.name}'s face`);
    if (hit(p, out.header)) out.collisions.push(`${p.el} under the header`);
    if (hit(p, out.phone)) out.collisions.push(`${p.el} over the phone`);
  }
  if (out.placement === 'over the photograph' && out.services.y + out.services.h > out.hero.y + out.hero.h + 1) out.collisions.push('services run past the hero');
  // clipped text: any service text wider or taller than its box
  out.clipped = services ? [...services.querySelectorAll('p, h2, h3, span')].filter((el) => el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflow !== 'visible').map((el) => el.textContent.trim()) : [];
  return out;
}

/**
 * White text against the background behind each services line, measured on a capture with the words hidden. With
 * `halo`, the words' own shadow stays (their glyphs transparent): the background as a reader sees it behind the
 * letters; without it, the conservative figure.
 */
async function contrast(browser, page, { halo = false, skip = [] } = {}) {
  const boxes = await page.evaluate(
    (skip) => {
      const top = document.querySelector('.site-header').getBoundingClientRect().bottom;
      return [...document.querySelectorAll('.hero-headline__line:not(.hero-headline__mark), .hero-services__lead, .hero-services__title, .hero-services__text')]
        .map((el, i) => {
          const r = el.getBoundingClientRect();
          return { i, kind: el.className.replace('hero-services__', ''), text: el.textContent.trim().slice(0, 40), x: r.left, y: r.top, w: r.width, h: r.height };
        })
        .filter((b) => !skip.includes(b.i) && b.w && b.y >= top && b.y + b.h <= innerHeight);
    },
    skip,
  );
  if (!boxes.length) return null;
  const tag = await page.addStyleTag({ content: `.hero-services, .hero-services * { color: transparent !important;${halo ? '' : ' text-shadow: none !important;'} } .hero-services__icon, .hero-services__brush, .hero-headline__mark { visibility: hidden !important; } .hero-services__lead::after { opacity: 0 !important; }` });
  await page.waitForTimeout(100);
  const png = await page.screenshot({ type: 'png' });
  const dpr = await page.evaluate(() => devicePixelRatio);
  const probe = await browser.newPage();
  const result = await probe.evaluate(
    async ({ src, boxes, dpr }) => {
      const img = new Image();
      img.src = src;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const g = c.getContext('2d');
      g.drawImage(img, 0, 0);
      const lin = (v) => ((v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
      return boxes.map((b) => {
        const d = g.getImageData(Math.round(b.x * dpr), Math.round(b.y * dpr), Math.max(1, Math.round(b.w * dpr)), Math.max(1, Math.round(b.h * dpr))).data;
        const L = [];
        for (let i = 0; i < d.length; i += 4) L.push(0.2126 * lin(d[i]) + 0.7152 * lin(d[i + 1]) + 0.0722 * lin(d[i + 2]));
        L.sort((a, b) => a - b);
        const p90 = L[Math.floor(L.length * 0.9)];
        const med = L[Math.floor(L.length * 0.5)];
        return { ...b, contrastP90: Math.round((1.05 / (p90 + 0.05)) * 10) / 10, contrastMedian: Math.round((1.05 / (med + 0.05)) * 10) / 10 };
      });
    },
    { src: `data:image/png;base64,${png.toString('base64')}`, boxes, dpr },
  );
  await probe.close();
  await tag.evaluate((el) => el.remove());
  return result.map(({ i, kind, text, contrastP90, contrastMedian }) => ({ i, kind, text, contrastP90, contrastMedian }));
}

async function shoot(browser, [w, h], state, out) {
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    deviceScaleFactor: 2,
    ...(PHONE(w) ? { isMobile: true, hasTouch: true } : {}),
    reducedMotion: state === 'reduced' ? 'reduce' : 'no-preference',
  });
  const page = await ctx.newPage();
  const errors = [];
  const failed = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('requestfailed', (r) => failed.push(r.url()));
  page.on('response', (r) => r.status() >= 400 && failed.push(`${r.status()} ${r.url()}`));
  await page.addInitScript(() => {
    window.__cls = 0;
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value;
    }).observe({ type: 'layout-shift', buffered: true });
  });
  await page.goto(`${BASE}/${state === 'static' ? '?nomotion' : ''}`, { waitUntil: 'load' });
  const result = { state, errors, failed };
  if (state === 'motion' && FRAMES) {
    await page.waitForFunction(() => window.__heroEntrance, null, { timeout: 15000 });
    const total = await page.evaluate(() => window.__heroEntrance.duration() / window.__heroEntrance.timeScale());
    result.entranceSeconds = Math.round(total * 100) / 100;
    for (const t of [0.5, 2.0, 2.6, 3.0, 3.4, 3.8, 4.4, 5.2, 6.4]) {
      const at = await page.evaluate((t) => {
        const tl = window.__heroEntrance;
        tl.pause();
        const local = Math.min(t * tl.timeScale(), tl.duration());
        tl.seek(local, false);
        return local / tl.timeScale();
      }, t);
      await page.waitForTimeout(120);
      await page.screenshot({ path: join(out, `${w}x${h}-frame-${String(t.toFixed(1)).replace('.', '_')}s.jpg`), type: 'jpeg', quality: 70 });
      if (at >= total) break;
    }
    await page.evaluate(() => window.__heroEntrance.play());
  }
  // The entrance ends by about 6 s on desktop; then a settled frame
  await page.waitForTimeout(state === 'motion' ? 7500 : 1200);
  result.cls = await page.evaluate(() => Math.round(window.__cls * 10000) / 10000);
  Object.assign(result, await page.evaluate(measure, FACES));
  await page.screenshot({ path: join(out, `${w}x${h}-${state}.jpg`), type: 'jpeg', quality: 78 });
  if (state === 'motion') {
    // The whole hero, and the block beneath it when it sits there
    const bottom = Math.ceil(Math.max(result.hero.y + result.hero.h, result.services ? result.services.y + result.services.h : 0));
    await page.screenshot({ path: join(out, `${w}x${h}-${state}-full-hero.jpg`), type: 'jpeg', quality: 70, fullPage: true, clip: { x: 0, y: 0, width: w, height: Math.max(h, bottom) } });
    // Then the contrast (last: it hides the words): the lines on screen first, then the rest with the block in view
    result.contrast = await contrast(browser, page);
    result.contrastWithHalo = await contrast(browser, page, { halo: true });
    const seen = result.contrast.map((c) => c.i);
    const below = await page.evaluate(() => {
      const el = document.querySelector('.hero-services__list');
      if (el && el.getBoundingClientRect().bottom > innerHeight) {
        el.scrollIntoView({ block: 'center', behavior: 'instant' });
        return true;
      }
      return false;
    });
    if (below) {
      await page.waitForTimeout(600);
      result.contrast.push(...(await contrast(browser, page, { skip: seen })));
      result.contrastWithHalo.push(...(await contrast(browser, page, { halo: true, skip: seen })));
    }
  }
  await ctx.close();
  return result;
}

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const metrics = {};
for (const vp of EXTRA.length ? EXTRA : VIEWPORTS) {
  const key = `${vp[0]}x${vp[1]}`;
  metrics[key] = { label: vp[2] };
  for (const state of EXTRA.length ? ['motion'] : ['motion', 'static', 'reduced']) metrics[key][state] = await shoot(browser, vp, state, OUT);
  const m = metrics[key].motion;
  const low = (list) => (list || []).reduce((a, c) => (!a || c.contrastP90 < a.contrastP90 ? c : a), null);
  const worst = low(m.contrast);
  const seen = low(m.contrastWithHalo);
  console.log(`${key} ${vp[2].padEnd(12)} ${m.placement.padEnd(19)} cls ${m.cls} overflow ${m.overflow} errors ${m.errors.length} failed ${m.failed.length} collisions ${m.collisions.length ? m.collisions.join('; ') : 'none'}; lowest contrast ${worst ? `${worst.contrastP90}:1 (${worst.kind}: ${worst.text}), with its shadow ${seen.contrastP90}:1` : 'n/a'}`);
}
await browser.close();
await writeFile(join(OUT, 'metrics.json'), JSON.stringify(metrics, null, 2));
