#!/usr/bin/env node
/**
 * Layout geometry compared between two deployments (the approved baseline and the feature preview), for the media
 * audit's Gate D: for each route and width, the header and its navigation, every section's position and height, every
 * heading's text, type and box, the footer and the page's height. Reports each difference larger than 2 px (or any
 * change of text or type), so a change outside the media can be seen at once.
 *
 *   node qa/layout-compare.mjs --before=<url> --after=<url> --out=<file.json> [--widths=375,390,768,1024,1440,1920]
 *                              [--routes=/,/about/]
 *
 * Uses ?nomotion and reduced motion (the finished composition, nothing moving), the same as qa/media-audit.mjs.
 */
import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

const arg = (k, d) => {
  const a = process.argv.find((x) => x.startsWith(`--${k}=`));
  return a ? a.slice(k.length + 3) : d;
};
const BEFORE = String(arg('before', '')).replace(/\/$/, '');
const AFTER = String(arg('after', '')).replace(/\/$/, '');
const OUT = arg('out');
if (!BEFORE || !AFTER || !OUT) {
  console.error('usage: node qa/layout-compare.mjs --before=<url> --after=<url> --out=<file.json> [--widths=…] [--routes=…]');
  process.exit(2);
}
const HEIGHTS = { 375: 812, 390: 844, 768: 1024, 1024: 768, 1440: 900, 1920: 1080 };
const widths = String(arg('widths', '375,390,768,1024,1440,1920')).split(',').map(Number);
const routes = String(
  arg(
    'routes',
    '/,/about/,/tours/,/destinations/,/transfers/,/packages/,/packages/garden-route-private-tour/,/reviews/,/contact/,/faq/,/enquire/,/privacy/,/terms/,/tours/cape-peninsula-private-tour/,/tours/cape-town-city-private-tour/,/tours/cape-winelands-private-tour/,/tours/township-private-tour/,/tours/private-cape-town-experience/,/tours/whale-watching-private-tour/,/tours/cape-agulhas-private-tour/,/tours/shark-cage-diving/,/tours/quad-biking/,/tours/sky-diving/',
  ),
).split(',');

const measure = (page) =>
  page.evaluate(() => {
    const box = (el) => {
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.left + scrollX), y: Math.round(r.top + scrollY), w: Math.round(r.width), h: Math.round(r.height) };
    };
    const text = (el) => el.textContent.replace(/\s+/g, ' ').trim();
    const header = document.querySelector('[data-header]') || document.querySelector('header');
    const sections = [];
    const seen = new Map();
    document.querySelectorAll('main > *, main > div > section, main section').forEach((el) => {
      if (el.closest('dialog')) return;
      const r = el.getBoundingClientRect();
      if (r.height < 1) return;
      const base = el.id || el.getAttribute('aria-labelledby') || `${el.tagName.toLowerCase()}.${String(el.className).split(/\s+/)[0] || ''}`;
      const n = (seen.get(base) || 0) + 1;
      seen.set(base, n);
      sections.push({ key: n > 1 ? `${base}#${n}` : base, ...box(el) });
    });
    const headings = [...document.querySelectorAll('h1, h2, h3')]
      .filter((h) => h.getBoundingClientRect().height > 0 && !h.closest('dialog'))
      .map((h) => {
        const cs = getComputedStyle(h);
        return { tag: h.tagName.toLowerCase(), text: text(h).slice(0, 60), font: `${cs.fontWeight} ${cs.fontSize}/${cs.lineHeight} ${cs.fontFamily.split(',')[0]}`, ...box(h) };
      });
    const nav = [...document.querySelectorAll('.primary-nav a, [data-header] nav a')].map((a) => ({ text: text(a), ...box(a) }));
    const footer = document.querySelector('footer');
    return { pageH: document.documentElement.scrollHeight, header: header ? box(header) : null, nav, sections, headings, footer: footer ? box(footer) : null };
  });

const browser = await chromium.launch(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {});
const result = { before: BEFORE, after: AFTER, when: new Date().toISOString(), widths, routes, pages: {} };
const near = (a, b) => Math.abs(a - b) <= 2;
for (const w of widths) {
  const ctx = await browser.newContext({ viewport: { width: w, height: HEIGHTS[w] || 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce', hasTouch: w < 1024, isMobile: w < 768 });
  const page = await ctx.newPage();
  page.setDefaultTimeout(60_000);
  for (const route of routes) {
    const shots = {};
    for (const [label, base] of [['before', BEFORE], ['after', AFTER]]) {
      await page.goto(`${base}${route}?nomotion`, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(300);
      shots[label] = await measure(page);
    }
    const a = shots.before;
    const b = shots.after;
    const diffs = [];
    if (!near(a.pageH, b.pageH)) diffs.push({ what: 'page height', before: a.pageH, after: b.pageH, delta: b.pageH - a.pageH });
    if (a.header && b.header && ['x', 'y', 'w', 'h'].some((k) => !near(a.header[k], b.header[k]))) diffs.push({ what: 'header', before: a.header, after: b.header });
    const navA = a.nav.map((n) => `${n.text}@${n.x},${n.y},${n.w}`).join(' ');
    const navB = b.nav.map((n) => `${n.text}@${n.x},${n.y},${n.w}`).join(' ');
    if (navA !== navB) diffs.push({ what: 'navigation', before: navA, after: navB });
    // Sections: by key, in order; the first one whose top moves, and every one whose height changes
    const keysA = a.sections.map((s) => s.key);
    const keysB = b.sections.map((s) => s.key);
    if (keysA.join('|') !== keysB.join('|')) diffs.push({ what: 'section order', before: keysA, after: keysB });
    for (const s of b.sections) {
      const o = a.sections.find((x) => x.key === s.key);
      if (!o) continue;
      if (!near(o.h, s.h)) diffs.push({ what: `section ${s.key} height`, before: o.h, after: s.h, delta: s.h - o.h });
      else if (!near(o.y, s.y)) diffs.push({ what: `section ${s.key} top (moved by a change above it)`, before: o.y, after: s.y, delta: s.y - o.y });
    }
    // Headings: text and type must not change; position follows the sections
    const ha = a.headings.map((h) => `${h.tag} ${h.text} | ${h.font}`);
    const hb = b.headings.map((h) => `${h.tag} ${h.text} | ${h.font}`);
    const goneH = ha.filter((x) => !hb.includes(x));
    const newH = hb.filter((x) => !ha.includes(x));
    if (goneH.length || newH.length) diffs.push({ what: 'headings (text or type)', before: goneH, after: newH });
    for (const h of b.headings) {
      const o = a.headings.find((x) => x.tag === h.tag && x.text === h.text);
      if (o && (!near(o.w, h.w) || !near(o.h, h.h) || !near(o.x, h.x))) diffs.push({ what: `heading "${h.text}" box`, before: o, after: h });
    }
    if (a.footer && b.footer && (!near(a.footer.h, b.footer.h) || !near(a.footer.w, b.footer.w))) diffs.push({ what: 'footer size', before: a.footer, after: b.footer });
    (result.pages[route] ||= {})[w] = { diffs, before: a, after: b };
    console.log(`${w} ${route}: ${diffs.length ? diffs.map((d) => d.what).join('; ') : 'identical layout'}`);
  }
  await ctx.close();
}
await writeFile(OUT, JSON.stringify(result, null, 1));
await browser.close();
