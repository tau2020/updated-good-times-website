#!/usr/bin/env node
/**
 * Before/after evidence for the Addendum of 6 Nov 2026 (contact emails and the company statement under the logo),
 * captured from two deployed Cloudflare previews, never a local server. Playwright, Chromium; ImageMagick (`convert`)
 * for the side-by-side composites.
 *
 *   node qa/addendum-shots.mjs --before=<deployment url> --after=<deployment url> --out=qa/surgical/addendum
 *        [--widths=360,390,768,1024,1440] [--before-label=…] [--after-label=…]
 *
 * At each width, both deployments, in their finished static composition (?nomotion):
 *   - header-home: the home page's header over the hero; header-tours: the white header of an inner page;
 *   - footer: the footer's brand column; contact: the contact page's "Phone, email and our office" panel;
 *   - menu (below 1024 px): the phone and tablet menu open, to show the header does not crowd it.
 * and the metrics: the header's height, horizontal overflow, console errors and failed requests, the email links.
 * Then, on the after deployment with motion: the statement's reveal in four frames (the master timeline paused), on a
 * desktop and a phone. Composites put before left and after right, captioned, at one width.
 */
import { chromium, devices } from '@playwright/test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';

const run = promisify(execFile);
const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=').slice(1).join('=') || d;
const BEFORE = arg('before', '').replace(/\/$/, '');
const AFTER = arg('after', '').replace(/\/$/, '');
const OUT = arg('out', 'qa/surgical/addendum');
const BL = arg('before-label', 'BEFORE');
const AL = arg('after-label', 'AFTER');
const widths = arg('widths', '360,390,768,1024,1440').split(',').map(Number);
const HEIGHTS = { 360: 780, 390: 844, 768: 1024, 1024: 768, 1440: 900 };
if (!BEFORE || !AFTER) {
  console.error('usage: node qa/addendum-shots.mjs --before=<url> --after=<url> [--out=<dir>]');
  process.exit(2);
}

const caption = (text) => ['-gravity', 'north', '-background', '#10241d', '-fill', '#ffffff', '-font', 'DejaVu-Sans', '-pointsize', '20', '-splice', '0x36', '-annotate', '+0+7', text];
const pair = async (b, a, w, out, scale = 1) => {
  const left = b ? ['(', b, ...caption(`${BL} · ${w}px`), ')'] : ['(', '-size', `${w}x120`, 'xc:#f3f7f5', ...caption(`${BL} · ${w}px`), ')'];
  await run('convert', [...left, '(', a, ...caption(`${AL} · ${w}px`), ')', '-background', '#ffffff', '-gravity', 'north', '+append', '-resize', `${Math.round(100 * scale)}%`, '-quality', '78', '-strip', out]);
};

const browser = await chromium.launch();
const metrics = [];
const tmp = join(OUT, '.tmp');
await mkdir(tmp, { recursive: true });

async function capture(base, side, w) {
  const ctx = await browser.newContext({ viewport: { width: w, height: HEIGHTS[w] || 900 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('requestfailed', (r) => errors.push(`failed ${r.url()}`));
  page.on('response', (r) => r.status() >= 400 && errors.push(`${r.status()} ${r.url()}`));
  const files = {};
  const shot = async (name, locator, pad = 0) => {
    const box = await locator.boundingBox();
    if (!box) return;
    const file = join(tmp, `${side}-${w}-${name}.png`);
    await page.screenshot({ path: file, clip: { x: 0, y: Math.max(0, box.y - pad), width: w, height: Math.min(box.height + 2 * pad, 1400) } });
    files[name] = file;
  };
  const m = { side, width: w };
  for (const [route, path] of [['home', '/'], ['tours', '/tours/'], ['contact', '/contact/']]) {
    await page.goto(`${base}${path}?nomotion`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(200);
    const r = await page.evaluate(() => {
      const h = document.querySelector('.site-header').getBoundingClientRect();
      const st = document.querySelector('.site-header .brand-lockup__statement');
      return {
        headerHeight: Math.round(h.height * 10) / 10,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        statement: st && getComputedStyle(st).display !== 'none' ? st.textContent : null,
        statementSize: st ? getComputedStyle(st).fontSize : null,
        mailto: [...new Set([...document.querySelectorAll('a[href^="mailto:"]')].map((a) => a.getAttribute('href')))],
        ldEmail: JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent)['@graph'][0].email,
      };
    });
    m[route] = r;
    if (route === 'home') await shot('header-home', page.locator('.site-header'), 0);
    if (route === 'tours') {
      await shot('header-tours', page.locator('.site-header'), 0);
      await page.locator('.footer-brand').scrollIntoViewIfNeeded();
      await page.evaluate(() => Promise.all([...document.querySelectorAll('.footer-brand img')].map((i) => (i.complete ? 0 : new Promise((r) => (i.onload = i.onerror = r))))));
      await page.waitForTimeout(150);
      const fb = await page.locator('.footer-brand').boundingBox();
      const file = join(tmp, `${side}-${w}-footer.png`);
      await page.locator('.footer-brand').screenshot({ path: file });
      files.footer = file;
      m.footerBrand = { width: Math.round(fb.width), height: Math.round(fb.height) };
      if (w < 1024) {
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.locator('[data-nav-toggle]').click();
        await page.waitForTimeout(450);
        const file2 = join(tmp, `${side}-${w}-menu.png`);
        await page.screenshot({ path: file2 });
        files.menu = file2;
      }
    }
    if (route === 'contact') {
      const panel = page.locator('.panel', { has: page.locator('h2', { hasText: 'Phone, email and our office' }) });
      await panel.scrollIntoViewIfNeeded();
      const file = join(tmp, `${side}-${w}-contact.png`);
      await panel.screenshot({ path: file });
      files.contact = file;
    }
  }
  m.errors = errors;
  await ctx.close();
  return { files, m };
}

const made = [];
for (const w of widths) {
  const dir = join(OUT, String(w));
  await mkdir(dir, { recursive: true });
  const b = await capture(BEFORE, 'before', w);
  const a = await capture(AFTER, 'after', w);
  metrics.push(b.m, a.m);
  for (const name of ['header-home', 'header-tours', 'footer', 'contact', 'menu']) {
    if (!a.files[name]) continue;
    const out = join(dir, `${name}.jpg`);
    await pair(b.files[name], a.files[name], w, out, w >= 1024 && name.startsWith('header') ? 0.5 : 0.75);
    made.push(out);
  }
}

// The reveal on the after deployment: four frames around the statement's draw, desktop and phone
for (const [name, opts] of [['desktop', { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 }], ['phone', { ...devices['Pixel 7'] }]]) {
  const ctx = await browser.newContext({ ...opts, reducedMotion: 'no-preference' });
  const page = await ctx.newPage();
  await page.goto(`${AFTER}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__heroEntrance && window.__heroEntrance.labels.statement !== undefined, null, { timeout: 20_000 });
  const plan = await page.evaluate(() => ({ at: window.__heroEntrance.labels.statement, landing: window.__heroEntrance.labels.titles, handover: window.__brandPlane && 0.15 + window.__brandPlane.handoverAt, duration: window.__heroEntrance.duration(), scale: window.__heroEntrance.timeScale() }));
  const frames = [];
  for (const [i, dt] of [[0, -0.05], [1, 0.1], [2, 0.25], [3, 0.6]]) {
    await page.evaluate((t) => { window.__heroEntrance.pause(); window.__heroEntrance.seek(t); }, plan.at + dt);
    await page.waitForTimeout(150);
    const box = await page.locator('.site-header .brand-lockup').boundingBox();
    const file = join(tmp, `reveal-${name}-${i}.png`);
    await page.screenshot({ path: file, clip: { x: Math.max(0, box.x - 12), y: Math.max(0, box.y - 12), width: box.width + 24, height: box.height + 24 } });
    frames.push(['(', file, ...caption(`${(dt >= 0 ? '+' : '') + dt.toFixed(2)} s from the statement's start`), ')']);
  }
  const out = join(OUT, `reveal-${name}.jpg`);
  await run('convert', [...frames.flat(), '-background', '#ffffff', '-append', '-quality', '80', '-strip', out]);
  made.push(out);
  metrics.push({ side: 'after', reveal: name, statementAt: plan.at, landingLabel: plan.landing, handover: plan.handover, entrance: plan.duration, timeScale: plan.scale, seconds: plan.duration / plan.scale });
  await ctx.close();
}

await browser.close();
await rm(tmp, { recursive: true, force: true });
await writeFile(join(OUT, 'metrics.json'), JSON.stringify(metrics, null, 1));
console.log(`${made.length} composites → ${OUT}`);
