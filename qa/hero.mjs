#!/usr/bin/env node
/**
 * The home hero at the brief's widths and more: screenshots, and a measured check that nothing covers a face.
 *
 *   node qa/hero.mjs [--base=http://127.0.0.1:8090] [--out=docs/qa/hero] [--motion] [--video] [--jpeg] [--debug] [--only=390x844,1440x900]
 *
 * For every viewport: the call to action's and the phone's boxes against the five faces of the café scene
 * (src/data/hero-scene.mjs: boxes in the film's own 1280×720 frame, mapped through the poster's object-fit and
 * object-position, so they move with the crop), each face's share inside the visible picture, the phone inside the viewport,
 * and horizontal overflow. Writes report.json and one PNG (or JPEG, --jpeg) per viewport; --debug outlines the faces.
 * --motion waits for the entrance to finish with motion allowed (the film playing, the gallery swiping);
 * otherwise ?nomotion. --video records a short clip of the hero at 1440×900 and 390×844.
 * Exits 1 if anything overlaps a face, the two overlap each other, or the page scrolls sideways.
 * PW_CHROMIUM_PATH points at a pre-installed Chromium where `playwright install` is unavailable.
 */
import { chromium } from '@playwright/test';
import { mkdir, writeFile, rename, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { FACES } from '../src/data/hero-scene.mjs';

const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=').slice(1).join('=') || d;
const has = (k) => process.argv.includes(`--${k}`);
const BASE = arg('base', 'http://127.0.0.1:8090');
const OUT = arg('out', 'docs/qa/hero');
const MOTION = has('motion');
const DEBUG = has('debug');
const JPEG = has('jpeg');

const VIEWPORTS = [
  [320, 568], [360, 780], [390, 844], [412, 915], [430, 932], [768, 1024], [820, 1180], [1024, 1366],
  [844, 390], [1024, 768], [1280, 720], [1280, 800], [1366, 768], [1440, 900], [1536, 864], [1680, 1050], [1920, 1080], [2560, 1440],
];
const only = arg('only', '').split(',').filter(Boolean);
const list = only.length ? VIEWPORTS.filter(([w, h]) => only.includes(`${w}x${h}`)) : VIEWPORTS;

const measure = (faces) => {
  const box = (el) => {
    const r = el.getBoundingClientRect();
    return { x0: r.left, y0: r.top, x1: r.right, y1: r.bottom };
  };
  const img = document.querySelector('.hero__poster img');
  const media = box(document.querySelector('.hero__media'));
  const r = img.getBoundingClientRect();
  const [px, py] = getComputedStyle(img).objectPosition.split(' ').map((v) => parseFloat(v) / 100);
  const scale = Math.max(r.width / img.naturalWidth, r.height / img.naturalHeight);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const ox = r.left + (r.width - dw) * px;
  const oy = r.top + (r.height - dh) * py;
  const map = ([x0, y0, x1, y1]) => ({ x0: ox + (x0 / 1280) * dw, y0: oy + (y0 / 720) * dh, x1: ox + (x1 / 1280) * dw, y1: oy + (y1 / 720) * dh });
  const area = (a) => Math.max(0, a.x1 - a.x0) * Math.max(0, a.y1 - a.y0);
  const cut = (a, b) => ({ x0: Math.max(a.x0, b.x0), y0: Math.max(a.y0, b.y0), x1: Math.min(a.x1, b.x1), y1: Math.min(a.y1, b.y1) });
  const gap = (a, b) => {
    const dx = Math.max(b.x0 - a.x1, a.x0 - b.x1, 0);
    const dy = Math.max(b.y0 - a.y1, a.y0 - b.y1, 0);
    return Math.round(Math.hypot(dx, dy));
  };
  const cta = box(document.querySelector('.hero__cta'));
  const phone = box(document.querySelector('.phone-gallery'));
  const header = box(document.querySelector('.site-header'));
  const hero = box(document.querySelector('.hero'));
  const out = { faces: {}, cta, phone, media, hero };
  for (const [name, f] of Object.entries(faces)) {
    const m = map(f);
    out.faces[name] = {
      box: m,
      visible: +(area(cut(m, media)) / area(m)).toFixed(3),
      cta: { overlap: Math.round(area(cut(m, cta))), gap: gap(m, cta) },
      phone: { overlap: Math.round(area(cut(m, phone))), gap: gap(m, phone) },
      header: Math.round(area(cut(m, header))),
    };
  }
  out.ctaPhone = { overlap: Math.round(area(cut(cta, phone))), gap: gap(cta, phone) };
  out.phoneInside = phone.x0 >= 0 && phone.x1 <= innerWidth + 0.5 && phone.y1 <= hero.y1 + 0.5;
  out.overflowX = document.documentElement.scrollWidth > document.documentElement.clientWidth;
  out.phoneWidth = Math.round(phone.x1 - phone.x0);
  out.ctaText = document.querySelector('.hero__cta').textContent.trim();
  out.ctaLines = Math.round((cta.y1 - cta.y0) / parseFloat(getComputedStyle(document.querySelector('.hero__cta')).lineHeight || 20)) > 1 ? 2 : 1;
  return out;
};

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {});
const report = [];
let failed = false;
for (const [w, h] of list) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: w < 600 ? 2 : 1, reducedMotion: MOTION ? 'no-preference' : 'reduce', isMobile: w < 600 && h > w, hasTouch: w < 600 });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/${MOTION ? '' : '?nomotion'}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  if (MOTION) await page.waitForFunction(() => document.documentElement.classList.contains('intro-done'), null, { timeout: 15_000 });
  await page.waitForTimeout(MOTION ? 600 : 200);
  const m = await page.evaluate(measure, FACES);
  if (DEBUG) {
    await page.evaluate((faces) => {
      for (const [name, f] of Object.entries(faces)) {
        const d = document.createElement('div');
        Object.assign(d.style, { position: 'fixed', left: `${f.box.x0}px`, top: `${f.box.y0}px`, width: `${f.box.x1 - f.box.x0}px`, height: `${f.box.y1 - f.box.y0}px`, outline: '2px dashed #ff3b30', zIndex: 9999, pointerEvents: 'none' });
        d.title = name;
        document.body.appendChild(d);
      }
    }, m.faces);
  }
  const file = join(OUT, `hero-${w}x${h}${MOTION ? '-motion' : ''}.${JPEG ? 'jpg' : 'png'}`);
  await page.screenshot(JPEG ? { path: file, type: 'jpeg', quality: 82 } : { path: file });
  const bad = Object.entries(m.faces).filter(([, f]) => f.cta.overlap > 0 || f.phone.overlap > 0).map(([n]) => n);
  const problems = [
    ...bad.map((n) => `covers the ${n} face`),
    m.ctaPhone.overlap > 0 && 'call to action under the phone',
    !m.phoneInside && 'phone outside the viewport',
    m.overflowX && 'horizontal overflow',
  ].filter(Boolean);
  if (problems.length) failed = true;
  report.push({ viewport: `${w}x${h}`, problems, ...m });
  const faceLine = Object.entries(m.faces).map(([n, f]) => `${n} ${Math.round(f.visible * 100)}% cta↔${f.cta.gap} phone↔${f.phone.gap}`).join(' · ');
  console.log(`${`${w}×${h}`.padEnd(10)} phone ${String(m.phoneWidth).padStart(3)}px  ${problems.length ? `✗ ${problems.join(', ')}` : '✓'}  | ${faceLine}`);
  await ctx.close();
}

if (has('video')) {
  for (const [w, h, secs] of [[1440, 900, 14], [390, 844, 12]]) {
    const dir = join(OUT, 'video-tmp');
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: 'no-preference', recordVideo: { dir, size: { width: w, height: h } }, deviceScaleFactor: 1, isMobile: w < 600, hasTouch: w < 600 });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(secs * 1000);
    await ctx.close();
    const [webm] = (await readdir(dir)).filter((f) => f.endsWith('.webm'));
    await rename(join(dir, webm), join(OUT, `hero-${w}x${h}.webm`));
    console.log(`recorded ${join(OUT, `hero-${w}x${h}.webm`)} (${secs} s)`);
  }
}
await browser.close();
await writeFile(join(OUT, `report${MOTION ? '-motion' : ''}.json`), JSON.stringify(report, null, 2) + '\n');
console.log(failed ? 'problems found' : 'every face clear');
process.exitCode = failed ? 1 : 0;
