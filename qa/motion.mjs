#!/usr/bin/env node
/**
 * The cinematic motion layer in a real browser: the brand aircraft's entrance and the sand journey, as screenshots,
 * with the numbers that prove the docking and the determinism.
 *
 *   node qa/motion.mjs --out=<dir> [--base=http://127.0.0.1:8090] [--engine=chromium|webkit] [--sizes=1440x900,390x844,360x740]
 *                      [--progress=0,0.1,0.2,0.36,0.48,0.65,0.8,1] [--dpr=1] [--plane] [--sand] [--video]
 *
 * --out is required (nothing is written into docs/ by default). The server must already be running
 * (`npm start`, or `PORT=8090 node src/tools/serve.mjs` after `npm run build`).
 * Sand states are reached by scrolling the page to the scroll position of each progress value (the scrubbed
 * ScrollTrigger settles before each shot), so each screenshot is what a visitor sees there, hero edge included.
 * Writes <out>/motion-report.json: per size, the aircraft's landing error, the renderer's tier and init time, the
 * frame checksums at each p (drawn twice, forwards then backwards, which must agree), and console errors.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, webkit, devices } from '@playwright/test';

const arg = (name, fallback) => {
  const a = process.argv.find((x) => x.startsWith(`--${name}=`));
  return a ? a.slice(name.length + 3) : process.argv.includes(`--${name}`) ? true : fallback;
};
const out = arg('out');
if (!out || out === true) {
  console.error('qa/motion.mjs: --out=<dir> is required');
  process.exit(2);
}
const base = String(arg('base', 'http://127.0.0.1:8090')).replace(/\/$/, '');
const engine = arg('engine', 'chromium') === 'webkit' ? webkit : chromium;
const sizes = String(arg('sizes', '1440x900,390x844,360x740')).split(',');
const progress = String(arg('progress', '0,0.1,0.2,0.36,0.48,0.65,0.8,1')).split(',').map(Number);
const dpr = Number(arg('dpr', 1));
const doPlane = arg('plane', false) || !arg('sand', false);
const doSand = arg('sand', false) || !arg('plane', false);
mkdirSync(out, { recursive: true });

const report = { base, engine: engine.name(), when: new Date().toISOString(), sizes: {} };
const browser = await engine.launch();
for (const size of sizes) {
  const [w, h] = size.split('x').map(Number);
  const phone = w < 600;
  const ctx = await browser.newContext({
    ...(phone ? devices['Pixel 7'] : {}),
    viewport: { width: w, height: h },
    deviceScaleFactor: dpr,
    reducedMotion: 'no-preference',
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(60_000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  const r = (report.sizes[size] = { errors });

  await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__heroEntrance);

  if (doPlane) {
    // Timeline seconds (desktop pace; tablets and phones play the same timeline 1.2× and 1.65× faster)
    const times = [0, 0.7, 1.4, 2.1, 2.7, 3.3, 3.9, 4.4, 6.0];
    await page.evaluate(() => {
      window.__heroEntrance.pause(0);
    });
    for (const t of times) {
      await page.evaluate((t) => {
        window.__heroEntrance.seek(t, false);
      }, t);
      await page.waitForTimeout(80);
      await page.screenshot({ path: join(out, `plane-${size}-t${t.toFixed(2)}.png`), clip: { x: 0, y: 0, width: w, height: Math.round(h * 0.42) } });
    }
    r.plane = await page.evaluate(() => {
      const p = window.__brandPlane;
      if (!p) return null;
      const tl = window.__heroEntrance;
      tl.seek(0.15 + p.handoverAt - 0.004, false);
      const box = (el) => {
        const b = el.getBoundingClientRect();
        return [b.x, b.y, b.width, b.height];
      };
      const glyph = box(document.querySelector('[data-aircraft-plane] .aircraft-flight__glyph'));
      const dock = box(document.querySelector('[data-aircraft-dock]'));
      // The glyph's box is the dock box less its clear space (2 logo units each side)
      const pad = (dock[2] * 2) / 84;
      const expect = [dock[0] + pad, dock[1] + pad, dock[2] - 2 * pad, dock[3] - 2 * pad];
      const error = Math.max(...glyph.map((v, i) => Math.abs(v - expect[i])));
      tl.seek(tl.duration(), false);
      return { variant: p.variant, landsAt: p.landsAt, handoverAt: p.handoverAt, landingErrorPx: +error.toFixed(3), maskedAfter: document.querySelector('.brand').classList.contains('is-awaiting-aircraft'), layerHiddenAfter: document.querySelector('[data-aircraft-flight]').hidden };
    });
    await page.evaluate(() => {
      window.__heroEntrance.play();
    });
  }

  if (doSand) {
    const geo = await page.evaluate(() => {
      const st = window.__sandJourney.trigger;
      return { start: st.start, end: st.end, mode: window.__sandJourney.mode };
    });
    r.sand = { mode: geo.mode, start: geo.start, end: geo.end, shots: [] };
    // Bring the section near so the renderer loads, then wait for it
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), geo.start);
    const t0 = Date.now();
    await page.waitForFunction(() => window.__sandJourney.ready() || window.__sandJourney.tier === 'static', null, { timeout: 30_000 }).catch(() => {});
    r.sand.readyAfterMs = Date.now() - t0;
    r.sand.tier = await page.evaluate(() => window.__sandJourney.tier);
    for (const p of progress) {
      const y = Math.round(geo.start + p * (geo.end - geo.start));
      await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), y);
      await page.waitForTimeout(900);
      await page.screenshot({ path: join(out, `sand-${size}-p${p.toFixed(2)}.png`) });
      r.sand.shots.push({ p, scrollY: y, settled: await page.evaluate(() => +window.__sandJourney.p.toFixed(4)) });
    }
    // Determinism: each p drawn going forwards and again going backwards gives the same frame
    r.sand.checksums = await page.evaluate((ps) => {
      const api = window.__sandJourney;
      if (!api.ready()) return null;
      const fwd = ps.map((p) => api.checksum(p));
      const back = [...ps].reverse().map((p) => api.checksum(p)).reverse();
      api.renderAt(api.p);
      return ps.map((p, i) => ({ p, forward: fwd[i].hash, backward: back[i].hash, same: fwd[i].hash === back[i].hash, meanAlpha: +fwd[i].meanAlpha.toFixed(4) }));
    }, progress);
  }
  await ctx.close();
}
await browser.close();
writeFileSync(join(out, 'motion-report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 1));
