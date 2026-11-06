#!/usr/bin/env node
/**
 * The sand journey's destination film in a real browser, against a deployed site: the reveal from the footprints to the
 * next chapter, the film playing over its own poster, and every way it must not play.
 *
 *   node qa/beach-film.mjs --base=https://<preview>.pages.dev --out=<dir> [--record]
 *
 * Scenarios (each a fresh, cold browser context):
 *   reveal-<size>   motion allowed: scroll from the hero through the sand journey to the next chapter, reading the
 *                   scroll progress p, whether the film is buried, attached, playing and visible, at each stop; a
 *                   screenshot per stop; then the film's clock is seen to advance and wrap at the loop; poster and
 *                   film frame 0 compared in the page (mean colour difference); scrolling back up rests it again
 *   reduced         prefers-reduced-motion: no film request, the poster shown, the film element hidden
 *   blocked         the film's requests fail: the poster stays, the element is removed, no page error
 *   savedata        navigator.connection.saveData: no film request
 *   slow3g          throttled network and a 4× slower CPU: the poster first, the film only once a frame is ready,
 *                   never an empty box
 * --record also films each reveal (Playwright video, WebM) into <out>/recordings.
 * Writes <out>/beach-film-report.json; nothing is written into docs/ or audit/ unless --out says so.
 */
import { chromium, devices } from '@playwright/test';
import { mkdir, writeFile, rename, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const arg = (k, d) => {
  const a = process.argv.find((x) => x.startsWith(`--${k}=`));
  return a ? a.slice(k.length + 3) : process.argv.includes(`--${k}`) ? true : d;
};
const BASE = String(arg('base', '')).replace(/\/$/, '');
const OUT = arg('out');
const RECORD = !!arg('record', false);
if (!BASE || !OUT || OUT === true) {
  console.error('usage: node qa/beach-film.mjs --base=<url> --out=<dir> [--record]');
  process.exit(2);
}
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {});
const report = { base: BASE, when: new Date().toISOString(), scenarios: {} };
const FILM = /\/assets\/video\/beach-film-1280\.mp4/;

const state = (page) =>
  page.evaluate(() => {
    const api = window.__sandJourney || {};
    const s = document.querySelector('[data-sand-journey]');
    const beach = s?.querySelector('[data-sand-photo]');
    const v = beach?.querySelector('video');
    const r = beach?.getBoundingClientRect();
    return {
      scrollY: Math.round(window.scrollY),
      p: Number((api.p || 0).toFixed(3)),
      tier: api.tier,
      ready: s?.classList.contains('is-ready') || false,
      playingClass: beach?.classList.contains('is-playing') || false,
      film: v ? { attached: !!v.currentSrc, src: (v.currentSrc || '').split('/').pop(), paused: v.paused, readyState: v.readyState, t: Number(v.currentTime.toFixed(2)), opacity: getComputedStyle(v).opacity, display: getComputedStyle(v).display } : api.film === 'failed' ? 'removed' : null,
      beachOnScreen: r ? r.bottom > 0 && r.top < innerHeight : false,
    };
  });

async function reveal(name, ctxOpts) {
  const dir = join(OUT, name);
  await mkdir(dir, { recursive: true });
  const ctx = await browser.newContext({ ...ctxOpts, reducedMotion: 'no-preference', ...(RECORD ? { recordVideo: { dir, size: ctxOpts.viewport } } : {}) });
  const page = await ctx.newPage();
  const errors = [];
  const filmRequests = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('request', (r) => FILM.test(r.url()) && filmRequests.push({ at: Date.now(), range: r.headers().range || '' }));
  const t0 = Date.now();
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__sandJourney, null, { timeout: 30_000 });
  await page.waitForTimeout(3500); // the hero's entrance; the renderer loads when it ends
  const stops = [];
  const top = await page.evaluate(() => document.querySelector('[data-sand-journey]').getBoundingClientRect().top + scrollY);
  const span = await page.evaluate(() => {
    const t = window.__sandJourney.trigger;
    return t ? [t.start, t.end] : null;
  });
  // From the footprints (p 0.15) through the sweep (0.605 to about 0.84) to the words and the end of the section
  const targets = [0.15, 0.35, 0.42, 0.5, 0.6, 0.66, 0.72, 0.8, 0.9, 1];
  for (const p of targets) {
    const y = span ? span[0] + (span[1] - span[0]) * p : top + innerHeightGuess(ctxOpts) * p;
    await page.evaluate((y) => window.scrollTo(0, y), Math.round(y));
    await page.waitForTimeout(1300); // the scrub settles (0.45 s) and the film has time to react
    const st = await state(page);
    st.target = p;
    st.atMs = Date.now() - t0;
    stops.push(st);
    await page.screenshot({ path: join(dir, `p${String(Math.round(p * 100)).padStart(3, '0')}.jpg`), type: 'jpeg', quality: 62 });
  }
  // Held at the end: the film's own clock advances and wraps at its 7 s loop
  const clock = [];
  for (let i = 0; i < 9; i++) {
    clock.push(await page.evaluate(() => Number(document.querySelector('[data-sand-film]')?.currentTime.toFixed(2) ?? -1)));
    await page.waitForTimeout(1000);
  }
  // Poster and frame 0: the first frame drawn from the film itself against the poster image, mean RGB difference
  const posterVsFrame0 = await page.evaluate(async () => {
    const v = document.querySelector('[data-sand-film]');
    const img = document.querySelector('[data-sand-photo] img');
    if (!v || !img) return null;
    const c = document.createElement('canvas');
    c.width = 320;
    c.height = 180;
    const g = c.getContext('2d', { willReadFrequently: true });
    const mean = () => {
      const d = g.getImageData(0, 0, 320, 180).data;
      const m = [0, 0, 0];
      for (let i = 0; i < d.length; i += 4) for (let k = 0; k < 3; k++) m[k] += d[i + k];
      return m.map((x) => x / (d.length / 4));
    };
    const copy = v.cloneNode(true); // a second element, so the visible film is never disturbed
    copy.removeAttribute('data-sand-film');
    copy.preload = 'auto'; // the page's film is preload="none": a detached copy would otherwise never load
    copy.src = v.currentSrc;
    copy.muted = true;
    const within = (promise, ms) => Promise.race([promise, new Promise((_, no) => setTimeout(() => no(new Error(`no frame within ${ms} ms`)), ms))]);
    try {
      await within(
        new Promise((r) => {
          copy.addEventListener('loadeddata', r, { once: true });
          copy.load();
        }),
        20_000,
      );
      copy.currentTime = 0;
      await within(new Promise((r) => (copy.readyState >= 2 && copy.currentTime === 0 ? r() : copy.addEventListener('seeked', r, { once: true }))), 10_000);
    } catch (e) {
      return { error: e.message };
    }
    g.drawImage(copy, 0, 0, 320, 180);
    const film = mean();
    const pic = new Image();
    pic.src = img.currentSrc;
    await pic.decode();
    g.drawImage(pic, 0, 0, 320, 180);
    const poster = mean();
    // per-pixel too: the mean absolute difference between the two 320 × 180 renderings
    g.drawImage(copy, 0, 0, 320, 180);
    const a = g.getImageData(0, 0, 320, 180).data;
    g.drawImage(pic, 0, 0, 320, 180);
    const b = g.getImageData(0, 0, 320, 180).data;
    let sum = 0;
    for (let i = 0; i < a.length; i += 4) for (let k = 0; k < 3; k++) sum += Math.abs(a[i + k] - b[i + k]);
    return { film: film.map((x) => +x.toFixed(1)), poster: poster.map((x) => +x.toFixed(1)), meanAbsDiff: +(sum / ((a.length / 4) * 3)).toFixed(2), posterFile: img.currentSrc.split('/').pop() };
  });
  // Back up into the sand: the film rests (paused) while it is buried again
  const at = (p) => Math.round(span ? span[0] + (span[1] - span[0]) * p : top);
  await page.evaluate((y) => window.scrollTo(0, y), at(0.3));
  await page.waitForTimeout(1300);
  const reburied = await state(page);
  // Down into the scene again: it plays again from where it rested
  await page.evaluate((y) => window.scrollTo(0, y), at(0.9));
  await page.waitForTimeout(1800);
  const reentered = await state(page);
  // On to the following section: the film's section leaves the screen and the film rests too
  await page.evaluate(() => window.scrollTo(0, document.querySelector('[data-sand-journey]').getBoundingClientRect().bottom + scrollY + innerHeight * 0.1));
  await page.waitForTimeout(1300);
  await page.screenshot({ path: join(dir, 'next-section.jpg'), type: 'jpeg', quality: 62 });
  await page.evaluate(() => window.scrollTo(0, document.querySelector('[data-sand-journey]').getBoundingClientRect().bottom + scrollY + innerHeight * 1.5));
  await page.waitForTimeout(1300);
  const below = await state(page);
  report.scenarios[name] = { viewport: ctxOpts.viewport, stops, clock, posterVsFrame0, reburied, reentered, below, filmRequests: filmRequests.length, firstFilmRequestMs: filmRequests[0] ? filmRequests[0].at - t0 : null, errors };
  await ctx.close();
  if (RECORD) {
    const files = (await readdir(dir)).filter((f) => f.endsWith('.webm'));
    if (files[0]) await rename(join(dir, files[0]), join(dir, `${name}.webm`));
  }
  console.log(`${name}: ${stops.map((s) => `p${s.p}${s.film && s.film.attached ? (s.film.paused ? '·paused' : '·playing') : '·idle'}`).join(' ')} | clock ${clock.join(',')} | poster/frame0 Δ ${posterVsFrame0?.meanAbsDiff} | errors ${errors.length}`);
}
const innerHeightGuess = (o) => o.viewport.height;

async function variant(name, { init, route, network, reduced } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  if (init) await ctx.addInitScript(init);
  const page = await ctx.newPage();
  const errors = [];
  const film = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errors.push(m.text()));
  page.on('request', (r) => FILM.test(r.url()) && film.push(r.url()));
  if (route) await page.route(FILM, (r) => r.abort('failed'));
  if (network) {
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 400, downloadThroughput: (400 * 1024) / 8, uploadThroughput: (400 * 1024) / 8 });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  }
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__sandJourney, null, { timeout: 60_000 });
  await page.waitForTimeout(reduced ? 1500 : 4000);
  const end = await page.evaluate(() => {
    const t = window.__sandJourney.trigger;
    return t ? t.start + (t.end - t.start) * 0.9 : document.querySelector('[data-sand-journey]').getBoundingClientRect().top + scrollY;
  });
  await page.evaluate((y) => window.scrollTo(0, y), Math.round(end));
  // Watch the film element through the wait: never visible (opacity > 0) before a frame is ready
  const samples = [];
  for (let i = 0; i < (network ? 40 : 8); i++) {
    samples.push(await state(page));
    await page.waitForTimeout(500);
  }
  const shot = join(OUT, `${name}.jpg`);
  await page.screenshot({ path: shot, type: 'jpeg', quality: 62 });
  const emptyBox = samples.some((s) => s.film && typeof s.film === 'object' && Number(s.film.opacity) > 0 && s.film.readyState < 2);
  report.scenarios[name] = { filmRequests: film.length, last: samples.at(-1), playedAfterSamples: samples.findIndex((s) => s.playingClass), emptyBox, errors };
  console.log(`${name}: film requests ${film.length}, last ${JSON.stringify(samples.at(-1).film)}, playing after ${samples.findIndex((s) => s.playingClass)} samples, empty box ${emptyBox}, errors ${errors.length}`);
  await ctx.close();
}

await reveal('reveal-1440x900', { viewport: { width: 1440, height: 900 } });
await reveal('reveal-390x844', { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } });
await variant('reduced', { reduced: true });
await variant('blocked', { route: true });
await variant('savedata', { init: () => Object.defineProperty(navigator, 'connection', { value: { saveData: true, effectiveType: '4g', addEventListener() {} }, configurable: true }) });
await variant('slow3g', { network: true });
await writeFile(join(OUT, 'beach-film-report.json'), JSON.stringify(report, null, 1));
await browser.close();
