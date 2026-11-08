#!/usr/bin/env node
/**
 * The header's scroll morph, measured in a real browser: what the header is at each scroll position, what moves,
 * who owns it, and how it looks (the white-to-glass brief of 8 Nov 2026, docs/enhancement/).
 *
 *   node qa/header-morph.mjs --base=<deployed url> --out=<dir> [--engine=chromium|webkit] [--widths=1440,768,390,360]
 *                            [--routes=home,tours] [--video] [--interactions]
 *
 * For every width and route, at scrollY 0, 1, 12, 24, 50, the threshold and its neighbours, just before and just after
 * the hero's end, in the first body section and back up again (the reverse scroll), it records the header's box,
 * computed paint (background, backdrop-filter, border, shadow, opacity, transform, z-index), its classes, which logo
 * shows, the Web Animations and GSAP tweens running on it, and a PNG of the header band. Once per page it records the
 * scroll listeners on window (Chromium, through the DevTools protocol: the owner's script and line), the scroll engine
 * (CSS scroll-behavior, any Lenis or Locomotive instance, ScrollTrigger instances), and the header's ancestors (anything
 * opaque, transformed or filtered between it and the page). --interactions adds the mobile drawer, the concierge panel,
 * the keyboard order through the header, a deep link's offset under the header and a back/forward (bfcache) return.
 * --video records the scroll sequence at the first width as a WebM per route.
 * Positions are set with behavior 'instant' (the site scrolls smoothly), and each is read after the header's
 * transitions have finished.
 */
import { chromium, webkit } from '@playwright/test';
import { mkdir, writeFile, rename, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=').slice(1).join('=') || d;
const BASE = arg('base', '').replace(/\/$/, '');
const OUT = arg('out', '');
const ENGINE = arg('engine', 'chromium');
const VIDEO = process.argv.includes('--video');
const INTERACT = process.argv.includes('--interactions');
if (!BASE || !OUT) {
  console.error('usage: node qa/header-morph.mjs --base=<url> --out=<dir> [--engine=chromium|webkit] [--video] [--interactions]');
  process.exit(2);
}
const ROUTES = { home: '/', tours: '/tours/', privacy: '/privacy/', peninsula: '/tours/cape-peninsula-private-tour/', enquire: '/enquire/' };
const HEIGHTS = { 360: 740, 390: 844, 430: 932, 768: 1024, 1024: 768, 1280: 800, 1440: 900 };
const widths = arg('widths', '1440,768,390,360').split(',').map(Number);
const routes = arg('routes', 'home,tours').split(',');
const SETTLE = Number(arg('settle', '520')); // longer than the header's slowest transition

const instant = (page, y) => page.evaluate((top) => window.scrollTo({ top, left: 0, behavior: 'instant' }), y);

/** The header at this moment. */
const readHeader = (page) =>
  page.evaluate(() => {
    const h = document.querySelector('[data-header]');
    if (!h) return null;
    const cs = getComputedStyle(h);
    const r = h.getBoundingClientRect();
    const vis = (sel) => {
      const el = h.querySelector(sel);
      return !!el && el.getClientRects().length > 0 && getComputedStyle(el).display !== 'none';
    };
    const within = [h, ...h.querySelectorAll('*')];
    const anims = document.getAnimations().filter((a) => within.includes(a.effect?.target));
    const tweens = window.gsap ? window.gsap.getTweensOf(within).filter((t) => t.isActive()) : [];
    const nav = h.querySelector('.primary-nav a');
    return {
      scrollY: Math.round(window.scrollY),
      classes: h.className,
      bodyClasses: document.body.className,
      top: Math.round(r.top * 10) / 10,
      height: Math.round(r.height * 10) / 10,
      bottom: Math.round(r.bottom * 10) / 10,
      position: cs.position,
      cssTop: cs.top,
      background: cs.backgroundColor,
      backdrop: cs.backdropFilter || cs.webkitBackdropFilter || 'none',
      webkitBackdrop: cs.webkitBackdropFilter || '',
      border: `${cs.borderBottomWidth} ${cs.borderBottomStyle} ${cs.borderBottomColor}`,
      shadow: cs.boxShadow,
      opacity: cs.opacity,
      transform: cs.transform,
      zIndex: cs.zIndex,
      color: cs.color,
      navColor: nav ? getComputedStyle(nav).color : '',
      transition: cs.transition,
      logo: vis('.brand__logo--gold') ? 'reversed (gold/green on dark)' : vis('.brand__logo--ink') ? 'ink' : 'none',
      condenseAt: h.dataset.condenseAt || '(default 8)',
      webAnimations: anims.map((a) => `${a.effect?.target?.className || a.effect?.target?.tagName}: ${a.animationName || a.constructor.name} ${a.playState}`),
      gsapActive: tweens.length,
    };
  });

/** Page-level facts: the scroll engine, ScrollTrigger, the hero's end, the header's ancestors. */
const readPage = (page) =>
  page.evaluate(() => {
    const h = document.querySelector('[data-header]');
    const de = document.documentElement;
    const hero = document.querySelector('.hero-shell') || document.querySelector('.hero') || document.querySelector('main > :first-child');
    const ancestors = [];
    for (let el = h?.parentElement; el; el = el.parentElement) {
      const s = getComputedStyle(el);
      ancestors.push({ el: el.tagName.toLowerCase() + (el.className ? `.${String(el.className).trim().split(/\s+/).join('.')}` : ''), background: s.backgroundColor, transform: s.transform, filter: s.filter, overflow: `${s.overflowX}/${s.overflowY}`, contain: s.contain, isolation: s.isolation, position: s.position });
    }
    const st = window.ScrollTrigger ? window.ScrollTrigger.getAll() : [];
    return {
      url: location.href,
      htmlClasses: de.className,
      scrollBehavior: getComputedStyle(de).scrollBehavior,
      scrollPaddingTop: getComputedStyle(de).scrollPaddingTop,
      smoothScrollLibs: { lenis: !!(window.lenis || window.Lenis || de.classList.contains('lenis')), locomotive: !!(window.LocomotiveScroll || de.classList.contains('has-scroll-smooth')) },
      gsap: window.gsap ? window.gsap.version : null,
      scrollTriggers: st.map((s) => ({ trigger: s.trigger ? (s.trigger.id ? `#${s.trigger.id}` : `.${String(s.trigger.className).trim().split(/\s+/)[0]}`) : '(none)', pin: !!s.pin, scrub: !!s.vars?.scrub, start: Math.round(s.start), end: Math.round(s.end) })),
      heroEnd: hero ? Math.round(hero.getBoundingClientRect().bottom + window.scrollY) : null,
      headerTag: h ? h.outerHTML.slice(0, 160) : null,
      ancestors,
      docHeight: de.scrollHeight,
      backdropSupported: CSS.supports('backdrop-filter', 'blur(2px)') || CSS.supports('-webkit-backdrop-filter', 'blur(2px)'),
    };
  });

/** Scroll listeners on window and document, with the script and line that added each (Chromium only). */
async function scrollListeners(page) {
  if (ENGINE !== 'chromium') return null;
  const client = await page.context().newCDPSession(page);
  // Enabling the debugger replays scriptParsed for every script already loaded: their URLs by id
  const urls = new Map();
  client.on('Debugger.scriptParsed', (e) => urls.set(e.scriptId, e.url));
  await client.send('Debugger.enable');
  await page.waitForTimeout(200);
  const out = [];
  for (const expr of ['window', 'document']) {
    const { result } = await client.send('Runtime.evaluate', { expression: expr });
    const { listeners } = await client.send('DOMDebugger.getEventListeners', { objectId: result.objectId });
    for (const l of listeners.filter((x) => ['scroll', 'resize', 'pageshow', 'wheel', 'touchmove'].includes(x.type))) {
      out.push({ on: expr, type: l.type, passive: l.passive, script: (urls.get(l.scriptId) || '').replace(/^https?:\/\/[^/]+/, ''), line: l.lineNumber + 1, column: l.columnNumber + 1 });
    }
  }
  await client.send('Debugger.disable');
  await client.detach();
  return out;
}

async function waitForIntro(page) {
  await page.waitForFunction(() => !document.documentElement.classList.contains('cine') || document.documentElement.classList.contains('intro-done'), null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(300);
}

async function headerShot(page, file, extra = 56) {
  const box = await page.evaluate(() => {
    const h = document.querySelector('[data-header]').getBoundingClientRect();
    return { x: 0, y: Math.max(0, h.top), width: window.innerWidth, height: Math.max(40, Math.min(window.innerHeight, h.bottom) - Math.max(0, h.top)) };
  });
  await page.screenshot({ path: file, clip: { ...box, height: Math.min(box.height + extra, (await page.viewportSize()).height - box.y) } });
}

async function run() {
  await mkdir(OUT, { recursive: true });
  const browserType = ENGINE === 'webkit' ? webkit : chromium;
  const browser = await browserType.launch();
  const report = { base: BASE, engine: ENGINE, at: new Date().toISOString(), pages: [] };
  for (const [wi, w] of widths.entries()) {
    for (const route of routes) {
      const vh = HEIGHTS[w] || 900;
      const recording = VIDEO && wi === 0;
      const context = await browser.newContext({
        viewport: { width: w, height: vh },
        deviceScaleFactor: 1,
        ...(recording ? { recordVideo: { dir: join(OUT, '_video'), size: { width: w, height: vh } } } : {}),
      });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
      page.on('console', (m) => m.type() === 'error' && errors.push(`console: ${m.text()}`));
      await page.goto(BASE + ROUTES[route], { waitUntil: 'load' });
      await waitForIntro(page);
      const info = await readPage(page);
      const listeners = await scrollListeners(page).catch((e) => `unavailable: ${e.message}`);
      const at = Number((await page.evaluate(() => document.querySelector('[data-header]')?.dataset.condenseAt)) || 8);
      const headerH = (await readHeader(page))?.height || 96;
      const heroEnd = info.heroEnd || 600;
      const nearEnd = Math.max(at + 30, heroEnd - headerH - 24);
      const positions = [
        ['top', 0], ['y1', 1], ['y12', 12], ['y24', 24], ['threshold-1', at - 1], ['threshold', at], ['threshold+1', at + 1], ['y50', 50],
        ['near-hero-end', nearEnd], ['crossing-hero-end', heroEnd - headerH + 16], ['first-body', heroEnd + 240],
        ['reverse-y50', 50], ['reverse-threshold+1', at + 1], ['reverse-threshold', at], ['reverse-y12', 12], ['reverse-top', 0],
      ];
      const states = [];
      const dir = join(OUT, `${route}-${w}`);
      await mkdir(dir, { recursive: true });
      for (const [i, [name, y]] of positions.entries()) {
        await instant(page, y);
        await page.waitForTimeout(SETTLE);
        const s = await readHeader(page);
        s.name = name;
        s.requested = y;
        const file = join(dir, `${String(i).padStart(2, '0')}-${name}.png`);
        await headerShot(page, file);
        if (['top', 'y50', 'near-hero-end', 'crossing-hero-end', 'first-body', 'reverse-top'].includes(name)) await page.screenshot({ path: join(dir, `${String(i).padStart(2, '0')}-${name}-viewport.jpg`), type: 'jpeg', quality: 70 });
        states.push(s);
      }
      let interactions = null;
      if (INTERACT) interactions = await interactionsFor(page, { w, route, dir });
      report.pages.push({ route, width: w, height: vh, info, listeners, threshold: at, states, interactions, errors });
      if (recording) {
        // A smooth pass for the recording: down through the hero's end and back
        await instant(page, 0);
        await page.waitForTimeout(600);
        await page.evaluate(async (end) => {
          const step = (from, to, ms) => new Promise((res) => {
            const t0 = performance.now();
            const f = (t) => {
              const k = Math.min(1, (t - t0) / ms);
              window.scrollTo({ top: from + (to - from) * k, behavior: 'instant' });
              k < 1 ? requestAnimationFrame(f) : res();
            };
            requestAnimationFrame(f);
          });
          await step(0, 120, 1800);
          await new Promise((r) => setTimeout(r, 700));
          await step(120, end, 2600);
          await new Promise((r) => setTimeout(r, 700));
          await step(end, 0, 2600);
          await new Promise((r) => setTimeout(r, 900));
        }, heroEnd + 240);
      }
      await context.close();
      if (recording) {
        const files = await readdir(join(OUT, '_video'));
        const last = files.filter((f) => f.endsWith('.webm')).sort().pop();
        if (last) await rename(join(OUT, '_video', last), join(OUT, `${route}-${w}-scroll.webm`));
      }
      console.log(`${route} @ ${w}: ${states.map((s) => `${s.name}=${/is-condensed/.test(s.classes) ? 'C' : '-'}`).join(' ')}${errors.length ? ` · ${errors.length} errors` : ''}`);
    }
  }
  await browser.close();
  await writeFile(join(OUT, 'header-morph.json'), JSON.stringify(report, null, 2));
  console.log(`wrote ${join(OUT, 'header-morph.json')}`);
}

/** The drawer (phones/tablets), the concierge panel (desktop), keyboard order, a deep link and a bfcache return. */
async function interactionsFor(page, { w, route, dir }) {
  const out = {};
  await instant(page, 0);
  await page.waitForTimeout(SETTLE);
  // Keyboard order through the header
  await page.keyboard.press('Tab');
  const order = [];
  for (let i = 0; i < 9; i++) {
    order.push(await page.evaluate(() => {
      const a = document.activeElement;
      const r = a.getBoundingClientRect();
      const s = getComputedStyle(a);
      return `${a.tagName.toLowerCase()}${a.className ? '.' + String(a.className).split(' ')[0] : ''} "${(a.getAttribute('aria-label') || a.textContent || '').trim().slice(0, 40)}" visible=${r.width > 0 && s.visibility !== 'hidden' && Number(s.opacity) > 0.1} outline=${s.outlineStyle}/${s.outlineWidth}`;
    }));
    await page.keyboard.press('Tab');
  }
  out.tabOrder = order;
  await page.keyboard.press('Escape');
  // Drawer (below 64em)
  const toggle = page.locator('[data-nav-toggle]');
  if (await toggle.isVisible().catch(() => false)) {
    await instant(page, 600);
    await page.waitForTimeout(SETTLE);
    await toggle.click();
    await page.waitForTimeout(500);
    out.drawerOpen = await readHeader(page);
    out.drawerTop = await page.evaluate(() => getComputedStyle(document.querySelector('[data-drawer]')).top);
    await page.screenshot({ path: join(dir, 'x-drawer-open.jpg'), type: 'jpeg', quality: 70 });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    out.drawerClosed = await readHeader(page);
  }
  // Concierge (desktop)
  const concierge = page.locator('.site-header [data-concierge-toggle], .site-header .gt-concierge__toggle').first();
  if (await concierge.isVisible().catch(() => false)) {
    await instant(page, 900);
    await page.waitForTimeout(SETTLE);
    await concierge.click().catch(() => {});
    await page.waitForTimeout(600);
    out.concierge = await page.evaluate(() => {
      const p = document.querySelector('.gt-concierge-panel');
      const h = document.querySelector('[data-header]');
      return p ? { panelZ: getComputedStyle(p).zIndex, panelTop: Math.round(p.getBoundingClientRect().top), headerZ: getComputedStyle(h).zIndex, headerBottom: Math.round(h.getBoundingClientRect().bottom), hidden: p.hidden } : null;
    });
    await page.screenshot({ path: join(dir, 'x-concierge-open.jpg'), type: 'jpeg', quality: 70 });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
  }
  // A deep link: where its target lands relative to the header's bottom
  const hash = route === 'home' ? '#reviews' : route === 'tours' ? '#adventure' : '';
  if (hash) {
    await page.goto(BASE + ROUTES[route] + hash, { waitUntil: 'load' });
    await waitForIntro(page);
    await page.waitForTimeout(1200);
    out.deepLink = await page.evaluate((id) => {
      const t = document.querySelector(id);
      const h = document.querySelector('[data-header]');
      return t ? { hash: id, targetTop: Math.round(t.getBoundingClientRect().top), headerBottom: Math.round(h.getBoundingClientRect().bottom), condensed: h.classList.contains('is-condensed'), scrollY: Math.round(scrollY) } : null;
    }, hash);
    await page.screenshot({ path: join(dir, 'x-deeplink.jpg'), type: 'jpeg', quality: 70 });
  }
  // bfcache: scroll, leave, come back
  await instant(page, 700);
  await page.waitForTimeout(SETTLE);
  const before = await readHeader(page);
  await page.goto(BASE + '/faq/', { waitUntil: 'load' });
  await page.goBack({ waitUntil: 'load' });
  await page.waitForTimeout(900);
  const after = await readHeader(page);
  out.bfcache = { before: { scrollY: before.scrollY, condensed: /is-condensed/.test(before.classes) }, after: { scrollY: after.scrollY, condensed: /is-condensed/.test(after.classes), background: after.background, backdrop: after.backdrop } };
  return out;
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
