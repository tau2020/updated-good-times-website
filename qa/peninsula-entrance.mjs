#!/usr/bin/env node
/**
 * Evidence for the Cape Peninsula entrance, "The Coast Reveals Itself" (design/motion-bible.md §4), captured from a
 * deployed Cloudflare preview, never a local server. Playwright, Chromium (WebGL in software, so the sand may draw in
 * its lite tier); ImageMagick (`convert`) for the strips.
 *
 *   node qa/peninsula-entrance.mjs --url=<deployment url> [--out=qa/surgical/peninsula] [--raw=<dir for the frames>]
 *        [--sizes=1440x900,768x1024,390x844] [--query=sand=lite]
 *
 * The sand draws in its lite tier by default (?sand=lite, as in the browser tests): this container renders WebGL in
 * software, where the full tier takes seconds a frame; the words, the leaf and the reveal's scale are the same in both.
 *
 * At each size, with motion: the scroll scene at p 0.50 (the walk), 0.60 (the last step: the view leaning in), 0.70
 * (the sweep, settling back), 0.95 (the coast clear), each reached by scrolling (the held stage, as a visitor sees it);
 * then the words' entrance, its timeline paused at six moments (eyebrow, headline rising through its line masks, the
 * line, the leaf unfurling, at rest); and the static scene with reduced motion. One strip per size and sequence; the
 * frames themselves go to --raw (not committed). Prints the measurements: the reveal's scale at each p, the entrance's
 * plan, console errors.
 */
import { chromium } from '@playwright/test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const run = promisify(execFile);
const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=').slice(1).join('=') || d;
const URL_ = arg('url', '').replace(/\/$/, '');
const OUT = arg('out', 'qa/surgical/peninsula');
const RAW = arg('raw', join(OUT, '.raw'));
const sizes = arg('sizes', '1440x900,768x1024,390x844').split(',').map((s) => s.split('x').map(Number));
const QUERY = arg('query', 'sand=lite');
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
if (!URL_) {
  console.error('usage: node qa/peninsula-entrance.mjs --url=<deployment url> [--out=<dir>] [--raw=<dir>]');
  process.exit(2);
}
await mkdir(OUT, { recursive: true });
await mkdir(RAW, { recursive: true });

const caption = (text) => ['-gravity', 'north', '-background', '#10241d', '-fill', '#ffffff', '-font', 'DejaVu-Sans', '-pointsize', '18', '-splice', '0x30', '-annotate', '+0+6', text];
const strip = async (files, labels, out, scale) => {
  const parts = files.flatMap((f, i) => ['(', f, ...caption(labels[i]), ')']);
  await run('convert', [...parts, '-background', '#ffffff', '-gravity', 'north', '+append', '-resize', `${Math.round(scale * 100)}%`, '-quality', '78', '-strip', out]);
};

const browser = await chromium.launch();
const report = {};
for (const [w, h] of sizes) {
  const tag = `${w}x${h}`;
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, reducedMotion: 'no-preference', isMobile: w < 600, hasTouch: w < 600 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message || e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(`${URL_}/${QUERY ? `?${QUERY}` : ''}`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.documentElement.classList.contains('intro-done'), null, { timeout: 30_000 }).catch(() => {});
  log(tag, 'loaded');
  await page.evaluate(() => window.scrollTo({ top: 40, behavior: 'instant' }));
  await page.waitForFunction(() => window.__sandJourney && window.__sandJourney.ready(), null, { timeout: 90_000 });
  const scrollTo = async (p) => {
    await page.evaluate((p) => {
      const t = window.__sandJourney.trigger;
      window.scrollTo({ top: Math.round(t.start + p * (t.end - t.start)), behavior: 'instant' });
    }, p);
    await page.waitForFunction((p) => Math.abs(window.__sandJourney.p - p) < 0.004, p, { timeout: 60_000 });
    await page.waitForTimeout(250);
  };
  // The scroll scene, as reached by scrolling
  const scene = [];
  const scales = {};
  for (const p of [0.5, 0.6, 0.7, 0.95]) {
    await scrollTo(p);
    if (p === 0.95) await page.waitForFunction(() => !window.__sandJourney.words || window.__sandJourney.words.progress() === 1, null, { timeout: 15_000 });
    scales[p] = await page.evaluate(() => window.__sandJourney.reveal());
    const f = join(RAW, `${tag}-scene-${p}.png`);
    await page.screenshot({ path: f, timeout: 60_000 });
    scene.push(f);
    log(tag, 'scene', p, JSON.stringify(scales[p]));
  }
  await strip(scene, ['p 0.50 · the walk', 'p 0.60 · last step, leaning in', 'p 0.70 · the sweep, settling', 'p 0.95 · the coast clear'], join(OUT, `scene-${tag}.jpg`), w > 1000 ? 0.4 : w > 700 ? 0.5 : 0.8);
  // The words' entrance, paused at six moments
  await scrollTo(0.7);
  await page.waitForFunction(() => window.__sandJourney.words.progress() === 0, null, { timeout: 60_000 });
  await scrollTo(0.9);
  const plan = await page.evaluate(() => {
    const tl = window.__sandJourney.words;
    tl.pause();
    return { duration: tl.duration(), labels: tl.labels };
  });
  const moments = [0.15, 0.45, 0.85, 1.3, 1.75, plan.duration];
  const words = [];
  for (const t of moments) {
    await page.evaluate((t) => window.__sandJourney.words.seek(t), t);
    await page.waitForTimeout(120);
    const f = join(RAW, `${tag}-words-${t.toFixed(2)}.png`);
    await page.screenshot({ path: f, timeout: 60_000 });
    words.push(f);
    log(tag, 'words', t.toFixed(2));
  }
  await page.evaluate(() => window.__sandJourney.words.play());
  await strip(words, moments.map((t) => `t ${t.toFixed(2)} s`), join(OUT, `words-${tag}.jpg`), w > 1000 ? 0.34 : w > 700 ? 0.42 : 0.7);
  report[tag] = { scales, plan, errors };
  await ctx.close();
  // Reduced motion: the static scene
  const still = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const sp = await still.newPage();
  await sp.goto(`${URL_}/`, { waitUntil: 'networkidle' });
  await sp.locator('[data-sand-journey]').scrollIntoViewIfNeeded();
  await sp.waitForTimeout(900);
  await sp.locator('[data-sand-journey]').screenshot({ path: join(RAW, `${tag}-static.png`) });
  await run('convert', [join(RAW, `${tag}-static.png`), ...caption(`reduced motion · ${tag}`), '-resize', w > 1000 ? '50%' : '80%', '-quality', '78', '-strip', join(OUT, `static-${tag}.jpg`)]);
  await still.close();
  console.log(tag, JSON.stringify(report[tag]));
}
await writeFile(join(OUT, 'measurements.json'), JSON.stringify(report, null, 2));
await browser.close();
