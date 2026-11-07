#!/usr/bin/env node
/**
 * The brief's animation checks (6 Nov 2026, §15) on a deployed preview, never a local server: nothing the visitor has
 * reached may stay invisible, whatever they do. Playwright, Chromium.
 *
 *   node qa/motion-robustness.mjs --url=<deployment url> [--out=<file.json>]
 *
 * Scenarios, each with motion allowed (the sand in its lite tier, as in the browser tests):
 *   fast-scroll     the whole home page in a few large wheel jumps, then a short rest;
 *   back-up         to the end, then back to the top in large jumps, then down again to the middle;
 *   resize          to the end on a desktop, then to a phone's width and back (crossing 48em both ways);
 *   mid-refresh     scrolled to the four ways, then reloaded (the browser restores the scroll position);
 *   back-forward    to another page and back (the back-forward cache, or a fresh load): no duplicated triggers;
 *   replay          the preview bar's "Replay the intro": the intro plays again and ends whole;
 *   reduced-motion  everything in place at once.
 * After each, every motion-owned element on screen and well into view (its bottom between the top of the screen and
 * 60% down it) must be fully opaque (its own opacity times its ancestors'), visible and unclipped. Elements above the
 * screen that are still waiting (an IntersectionObserver reveal the visitor jumped past) are listed apart: they play
 * when scrolled back to, which the back-up scenario checks. The sand journey's words are checked when its scene has
 * cleared (p ≥ 0.84) or is static. Console errors are collected.
 */
import { chromium, devices } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=').slice(1).join('=') || d;
const URL_ = arg('url', '').replace(/\/$/, '');
const OUT = arg('out', '');
if (!URL_) {
  console.error('usage: node qa/motion-robustness.mjs --url=<deployment url> [--out=<file.json>]');
  process.exit(2);
}
const SEL = [
  '.lc-way__photo', '.lc-way__name', '.lc-way__line', '.lc-way__go', '.lc-way__route',
  '.lc-scene .lc-statement', '.lc-scene__line', '.lc-scene__actions > *', '.lc-invite-seal', '.lc-mark',
  '.site-footer .brand-lockup img', '.footer-main > *',
  '[data-rise]', '[data-unveil]', '[data-taste-main]', '[data-taste-frame]', '[data-taste-words] > *', '[data-reveal]',
  '.lc-ease__stop', '.leaf-btn__shape', '.leaf-btn__label',
].join(', ');

const hidden = (page) =>
  page.evaluate((sel) => {
    const effective = (el) => {
      let o = 1;
      for (let n = el; n && n.nodeType === 1; n = n.parentElement) o *= Number(getComputedStyle(n).opacity);
      return o;
    };
    const sj = window.__sandJourney;
    const sandDone = !sj || sj.mode !== 'live' || sj.p >= 0.84;
    const list = [...document.querySelectorAll(sel)];
    if (sandDone) list.push(...document.querySelectorAll('.sand-journey__eyebrow, .sand-journey__title, .sand-journey__line, .sand-journey__cta'));
    const out = [];
    for (const el of list) {
      if (!el.getClientRects().length) continue; // not rendered at this width
      const r = el.getBoundingClientRect();
      if (r.bottom > innerHeight * 0.6) continue; // not yet scrolled well into view
      const above = r.bottom <= 0;
      const cs = getComputedStyle(el);
      const clip = cs.clipPath;
      const clipped = clip && clip !== 'none' && !/^inset\(0(px|%)?( 0(px|%)?){0,3}( round [^)]*)?\)$/.test(clip.replace(/\s+/g, ' '));
      const o = effective(el);
      const host = el.closest('a, section, footer, li, figure');
      const where = host ? (host.getAttribute('aria-label') || (host.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40)) : '';
      if (o < 0.99 || cs.visibility !== 'visible' || clipped) out.push({ above, text: `${(el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className) || el.tagName} in "${where}" at ${Math.round(r.top)}…${Math.round(r.bottom)} px (opacity ${o.toFixed(2)}, ${cs.visibility}, ${clipped ? clip : 'unclipped'})` });
    }
    return out;
  }, SEL);

const settle = (page, ms = 3500) => page.waitForTimeout(ms);
const wheelTo = async (page, frac, steps = 6) => {
  const h = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  const from = await page.evaluate(() => scrollY);
  const to = Math.round(h * frac);
  for (let i = 1; i <= steps; i++) await page.mouse.wheel(0, Math.round((to - from) / steps));
};

const browser = await chromium.launch();
const results = [];
const run = async (name, profile, fn) => {
  const ctx = await browser.newContext({ ...(profile === 'phone' ? devices['Pixel 7'] : { viewport: { width: 1440, height: 900 } }), reducedMotion: name === 'reduced-motion' ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  let detail = {};
  try {
    await page.goto(`${URL_}/?sand=lite`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => document.documentElement.classList.contains('intro-done'), null, { timeout: 20_000 }).catch(() => {});
    detail = (await fn(page, ctx)) || {};
  } catch (e) {
    detail.error = String(e.message || e).split('\n')[0];
  }
  const found = detail.error ? [{ above: false, text: '(scenario failed)' }] : await hidden(page);
  const left = found.filter((x) => !x.above).map((x) => x.text);
  const pending = found.filter((x) => x.above).map((x) => x.text);
  results.push({ name, profile, hidden: left, pendingAbove: pending, errors, ...detail });
  console.log(`${name} [${profile}]: ${left.length ? `${left.length} hidden on screen: ${left.slice(0, 6).join('; ')}` : 'nothing hidden on screen'}${pending.length ? `; ${pending.length} waiting above the screen: ${pending.slice(0, 3).join('; ')}` : ''}${errors.length ? `; ${errors.length} console errors: ${errors.slice(0, 2).join(' | ')}` : ''}${detail.error ? `; ERROR ${detail.error}` : ''}${detail.note ? `; ${detail.note}` : ''}`);
  await ctx.close();
};

for (const profile of ['desktop', 'phone']) {
  await run('fast-scroll', profile, async (page) => {
    await wheelTo(page, 1, 5);
    await settle(page);
  });
  await run('back-up', profile, async (page) => {
    await wheelTo(page, 1, 4);
    await settle(page, 2500);
    await wheelTo(page, 0, 4);
    await settle(page, 1500);
    await wheelTo(page, 0.55, 4);
    await settle(page);
  });
  await run('mid-refresh', profile, async (page) => {
    await page.evaluate(() => document.querySelector('.lc-ways').scrollIntoView({ block: 'start', behavior: 'instant' }));
    await settle(page, 1500);
    const before = await page.evaluate(() => scrollY);
    await page.reload({ waitUntil: 'networkidle' });
    await settle(page);
    return { note: `scroll ${before} → ${await page.evaluate(() => scrollY)} after reload` };
  });
  await run('back-forward', profile, async (page) => {
    await page.evaluate(() => document.querySelector('.lc-ways').scrollIntoView({ block: 'start', behavior: 'instant' }));
    await settle(page, 2500);
    const count = () => page.evaluate(() => (window.ScrollTrigger ? window.ScrollTrigger.getAll().length : -1));
    const a = await count();
    await page.goto(`${URL_}/about/`, { waitUntil: 'networkidle' });
    await page.goBack({ waitUntil: 'networkidle' });
    await settle(page);
    const b = await count();
    if (a !== b) throw new Error(`ScrollTriggers ${a} before, ${b} after coming back`);
    return { note: `${a} ScrollTriggers before and after` };
  });
}
await run('resize', 'desktop', async (page) => {
  await wheelTo(page, 1, 5);
  await settle(page, 2500);
  await page.setViewportSize({ width: 390, height: 844 });
  await settle(page, 2500);
  await page.setViewportSize({ width: 1440, height: 900 });
  await settle(page);
});
await run('replay', 'desktop', async (page) => {
  const replay = page.locator('[data-intro-replay]');
  if (!(await replay.count())) return { note: 'no replay control on this build' };
  await page.waitForFunction(() => !document.querySelector('[data-intro-replay]').hidden, null, { timeout: 15_000 });
  await replay.click();
  await page.waitForFunction(() => window.__heroEntrance && window.__heroEntrance.isActive(), null, { timeout: 10_000 });
  await page.waitForFunction(() => window.__heroEntrance && !window.__heroEntrance.isActive() && window.__heroEntrance.progress() === 1, null, { timeout: 20_000 });
  const whole = await page.evaluate(() => [!document.querySelector('.brand.is-awaiting-aircraft'), Number(getComputedStyle(document.querySelector('.hero-headline')).opacity), Number(getComputedStyle(document.querySelector('.site-header--overlay .brand-lockup__statement')).opacity)]);
  if (!(whole[0] && whole[1] === 1 && whole[2] === 1)) throw new Error(`after the replay: logo whole ${whole[0]}, CTA ${whole[1]}, statement ${whole[2]}`);
  return { note: 'the intro replayed and ended whole' };
});
for (const profile of ['desktop', 'phone']) {
  await run('reduced-motion', profile, async (page) => {
    for (const f of [0.25, 0.5, 0.75, 1]) {
      await page.evaluate((f) => window.scrollTo({ top: (document.documentElement.scrollHeight - innerHeight) * f, behavior: 'instant' }), f);
      await page.waitForTimeout(300);
      const left = (await hidden(page)).filter((x) => !x.above);
      if (left.length) throw new Error(`at ${f}: ${left.slice(0, 4).map((x) => x.text).join('; ')}`);
    }
  });
}
await browser.close();
if (OUT) await writeFile(OUT, JSON.stringify(results, null, 2));
const bad = results.filter((r) => r.hidden.length || r.errors.length || r.error);
console.log(bad.length ? `${bad.length} scenario(s) with problems` : 'every scenario clean');
process.exit(bad.length ? 1 : 0);
