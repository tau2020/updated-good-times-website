#!/usr/bin/env node
/**
 * Media performance on a deployed site, as a visitor's browser measures it. For each route and each run, in a cold
 * browser: the Largest Contentful Paint (and the element it was), the layout shift until the page settles, and the
 * image and video bytes fetched by then; then, after scrolling through the whole page with motion allowed, every
 * image and video byte the visit asked for, the layout shift over the whole visit, and any media request that failed.
 * Used for the media audit's Gate E: run it with the same arguments against the approved baseline and the preview.
 *
 *   node qa/media-perf.mjs --base=https://<preview>.pages.dev --out=<file.json> [--routes=/,/about/] [--runs=3]
 *                          [--profiles=desktop,mobile]
 *
 * Profiles: desktop (1440 × 900, no throttling) and mobile (Pixel 7, "Slow 4G": 150 ms round trip, 1.6 Mbit/s down,
 * 750 kbit/s up and a 4× slower CPU while the page loads; the throttling is lifted for the scroll-through, so the
 * byte totals do not depend on how long the scroll took). Bytes are the response bodies as transferred (compressed)
 * plus headers, from the browser's own accounting (Playwright request.sizes()).
 */
import { chromium, devices } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

const arg = (k, d) => {
  const a = process.argv.find((x) => x.startsWith(`--${k}=`));
  return a ? a.slice(k.length + 3) : d;
};
const BASE = String(arg('base', '')).replace(/\/$/, '');
const OUT = arg('out');
if (!BASE || !OUT) {
  console.error('usage: node qa/media-perf.mjs --base=<url> --out=<file.json> [--routes=…] [--runs=3] [--profiles=desktop,mobile]');
  process.exit(2);
}
const ROUTES = String(arg('routes', '/,/about/,/tours/,/destinations/,/transfers/,/tours/cape-peninsula-private-tour/,/tours/township-private-tour/,/tours/cape-agulhas-private-tour/')).split(',');
const RUNS = Number(arg('runs', 3));
const PROFILES = {
  desktop: { context: { viewport: { width: 1440, height: 900 } }, throttle: null },
  mobile: { context: { ...devices['Pixel 7'] }, throttle: { latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8, cpu: 4 } },
};
const profiles = String(arg('profiles', 'desktop,mobile')).split(',');

const median = (xs) => {
  const v = xs.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
};
const kindOf = (req) => {
  const t = req.resourceType();
  const u = req.url().split('?')[0];
  if (t === 'media' || /\.(mp4|webm)$/i.test(u)) return 'video';
  if (t === 'image' || /\.(avif|webp|jpe?g|png|svg|gif)$/i.test(u)) return 'image';
  return 'other';
};

const browser = await chromium.launch(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {});
const report = { base: BASE, when: new Date().toISOString(), runs: RUNS, profiles: {}, };

for (const name of profiles) {
  const prof = PROFILES[name];
  report.profiles[name] = {};
  for (const route of ROUTES) {
    const runs = [];
    for (let i = 0; i < RUNS; i++) {
      const ctx = await browser.newContext({ ...prof.context, reducedMotion: 'no-preference' });
      await ctx.addInitScript(() => {
        const perf = (window.__perf = { lcp: null, lcpEl: '', lcpSize: 0, cls: 0, shifts: [] });
        try {
          new PerformanceObserver((list) => {
            for (const e of list.getEntries()) {
              perf.lcp = e.startTime;
              perf.lcpSize = e.size;
              const el = e.element;
              perf.lcpEl = el ? `${el.tagName.toLowerCase()}${el.currentSrc ? ' ' + el.currentSrc.split('/').pop() : el.className ? '.' + String(el.className).split(/\s+/)[0] : ''}` : e.url ? e.url.split('/').pop() : '';
            }
          }).observe({ type: 'largest-contentful-paint', buffered: true });
          new PerformanceObserver((list) => {
            for (const e of list.getEntries()) {
              if (e.hadRecentInput) continue;
              perf.cls += e.value;
              if (e.value > 0.001) perf.shifts.push({ at: Math.round(e.startTime), value: +e.value.toFixed(4), nodes: (e.sources || []).map((s) => (s.node && s.node.nodeType === 1 ? `${s.node.tagName.toLowerCase()}.${String(s.node.className).split(/\s+/)[0]}` : '')).filter(Boolean).slice(0, 3) });
            }
          }).observe({ type: 'layout-shift', buffered: true });
        } catch (e) {
          perf.error = e.message;
        }
      });
      const page = await ctx.newPage();
      page.setDefaultTimeout(120_000);
      let phase = 'load';
      const reqs = [];
      const failed = [];
      page.on('requestfinished', async (req) => {
        const kind = kindOf(req);
        let bytes = 0;
        try {
          const s = await req.sizes();
          bytes = s.responseBodySize + s.responseHeadersSize;
        } catch {
          /* gone with the page */
        }
        const res = await req.response().catch(() => null);
        reqs.push({ phase, kind, bytes, status: res ? res.status() : 0, file: req.url().split('?')[0].split('/').slice(-2).join('/') });
      });
      page.on('requestfailed', (req) => {
        const kind = kindOf(req);
        const why = req.failure()?.errorText || '';
        // A video range request the browser cancels itself (it had enough) is not a failure
        if (kind !== 'other' && !/ERR_ABORTED/.test(why)) failed.push(`${why} ${req.url()}`);
      });
      page.on('response', (r) => {
        if (r.status() >= 400 && /\/assets\/(img|video)\//.test(r.url())) failed.push(`${r.status()} ${r.url()}`);
      });
      let cdp = null;
      if (prof.throttle) {
        cdp = await ctx.newCDPSession(page);
        await cdp.send('Network.enable');
        await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: prof.throttle.latency, downloadThroughput: prof.throttle.downloadThroughput, uploadThroughput: prof.throttle.uploadThroughput });
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: prof.throttle.cpu });
      }
      const t0 = Date.now();
      await page.goto(BASE + route, { waitUntil: 'load' });
      const loadMs = Date.now() - t0;
      await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
      await page.waitForTimeout(1500);
      const atLoad = await page.evaluate(() => ({ ...window.__perf, shifts: window.__perf.shifts.slice() }));
      const sum = (ph, kind) => reqs.filter((r) => (!ph || r.phase === ph) && (!kind || r.kind === kind)).reduce((n, r) => n + r.bytes, 0);
      const loadBytes = { image: sum('load', 'image'), video: sum('load', 'video'), all: sum('load') };
      const loadMedia = reqs.filter((r) => r.phase === 'load' && r.kind !== 'other').length;
      if (cdp) {
        await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      }
      // The whole page, as a visitor scrolls it: a screen at a time, pausing so scroll-driven scenes (the sand journey
      // and its film) run as they would
      phase = 'scroll';
      await page.evaluate(async () => {
        const step = Math.round(window.innerHeight * 0.5);
        for (let y = 0; y < document.documentElement.scrollHeight - window.innerHeight; y += step) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 260));
        }
        window.scrollTo(0, document.documentElement.scrollHeight);
      });
      await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
      await page.waitForTimeout(2500);
      const end = await page.evaluate(() => ({ cls: window.__perf.cls, shifts: window.__perf.shifts.slice(-8) }));
      const film = reqs.filter((r) => r.kind === 'video').map((r) => `${r.phase}:${r.file}:${r.status}:${r.bytes}`);
      runs.push({
        lcpMs: atLoad.lcp == null ? null : Math.round(atLoad.lcp),
        lcpElement: atLoad.lcpEl,
        clsAtLoad: +atLoad.cls.toFixed(4),
        clsVisit: +end.cls.toFixed(4),
        loadEventMs: loadMs,
        loadBytes,
        loadMediaRequests: loadMedia,
        visitBytes: { image: sum(null, 'image'), video: sum(null, 'video'), all: sum(null) },
        visitMediaRequests: reqs.filter((r) => r.kind !== 'other').length,
        videoRequests: film,
        failed,
        shiftsAtLoad: atLoad.shifts,
      });
      await ctx.close();
      const r = runs.at(-1);
      console.log(`${name} ${route} run ${i + 1}: LCP ${r.lcpMs} ms (${r.lcpElement}) CLS ${r.clsAtLoad}/${r.clsVisit} load media ${(r.loadBytes.image / 1024).toFixed(0)}+${(r.loadBytes.video / 1024).toFixed(0)} KB visit media ${(r.visitBytes.image / 1024).toFixed(0)}+${(r.visitBytes.video / 1024).toFixed(0)} KB failed ${r.failed.length}`);
    }
    report.profiles[name][route] = {
      median: {
        lcpMs: median(runs.map((r) => r.lcpMs)),
        clsAtLoad: median(runs.map((r) => r.clsAtLoad)),
        clsVisit: median(runs.map((r) => r.clsVisit)),
        loadImageKB: Math.round(median(runs.map((r) => r.loadBytes.image)) / 1024),
        loadVideoKB: Math.round(median(runs.map((r) => r.loadBytes.video)) / 1024),
        visitImageKB: Math.round(median(runs.map((r) => r.visitBytes.image)) / 1024),
        visitVideoKB: Math.round(median(runs.map((r) => r.visitBytes.video)) / 1024),
        failed: Math.max(...runs.map((r) => r.failed.length)),
      },
      runs,
    };
  }
}
await writeFile(OUT, JSON.stringify(report, null, 1));
await browser.close();
