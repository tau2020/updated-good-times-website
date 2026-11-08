#!/usr/bin/env node
/**
 * The words over the scenic backdrops (src/data/scenic.mjs, docs/enhancement/02-scenic.md): for every placement, at each
 * width, every line of text inside the band is measured against the pixels actually behind it. The band's words are
 * made transparent for one screenshot per screenful (nothing else changes: the plane, its wash, the glass cards stay),
 * the backdrop under each line is sampled, and the WCAG contrast of the text's own colour with its worst decile (the
 * darkest for dark words, the lightest for light ones) is reported against AA (4.5:1, or 3:1 for large text).
 *
 *   node qa/scenic-contrast.mjs --base=<url> [--out=<file.json>] [--widths=1440,390] [--only=memory,contact-head]
 *                                [--band=/reviews/@.reviews-photo]   any other band over a photograph, measured the same way
 *
 * It reads the screenshots through sharp, which ships with the repository's dev tools (wrangler's dependency), as
 * qa/header-contrast.mjs does.
 */
import { chromium } from '@playwright/test';
import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import { PLACEMENTS } from '../src/data/scenic.mjs';

const require = createRequire(import.meta.url);
const sharp = require('sharp');
const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=').slice(1).join('=') || d;
const BASE = arg('base', '').replace(/\/$/, '');
const OUT = arg('out', '');
const widths = arg('widths', '1440,390').split(',').map(Number);
const only = arg('only', '') ? arg('only', '').split(',') : null;
// Other bands over a photograph: "<route>@<selector>", each measured like a placement
const bands = arg('band', '') ? arg('band', '').split(',').map((b) => ({ id: b, page: b.split('@')[0].replace(/^\//, '') + 'index.html', selector: b.split('@')[1] })) : [];
if (!BASE) {
  console.error('usage: node qa/scenic-contrast.mjs --base=<url> [--out=<file.json>] [--widths=1440,390] [--only=<ids>]');
  process.exit(2);
}
const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const L = ([r, g, b]) => 0.2126 * lin(r / 255) + 0.7152 * lin(g / 255) + 0.0722 * lin(b / 255);
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
const route = (page) => `/${page.replace(/index\.html$/, '')}`;

const HIDE = 'data-scenic-measure';
const browser = await chromium.launch();
const report = [];
for (const w of widths) {
  for (const p of [...PLACEMENTS.filter((x) => !only || only.includes(x.id)), ...bands]) {
    const page = await browser.newPage({ viewport: { width: w, height: w < 600 ? 844 : 900 }, reducedMotion: 'reduce' });
    await page.goto(`${BASE}${route(p.page)}?nomotion`, { waitUntil: 'load' });
    // The band, its plane loaded (lazy) and on screen
    const found = await page.evaluate(async ({ id, selector }) => {
      const layer = selector ? document.querySelector(selector) : document.querySelector(`[data-scenic="${id}"]`);
      if (!layer) return false;
      const host = selector ? layer : layer.parentElement;
      host.setAttribute('data-scenic-host-measured', '');
      host.scrollIntoView({ block: 'start', behavior: 'instant' });
      const img = layer.querySelector('img');
      if (img) {
        img.loading = 'eager';
        if (!img.complete) await new Promise((r) => { img.onload = img.onerror = r; setTimeout(r, 5000); });
      }
      if (selector) for (const im of host.querySelectorAll('img')) if (!im.complete) await new Promise((r) => { im.onload = im.onerror = r; setTimeout(r, 5000); });
      return getComputedStyle(layer).display !== 'none';
    }, { id: p.id, selector: p.selector || '' });
    if (!found) {
      report.push({ width: w, placement: p.id, drawn: false });
      await page.close();
      continue;
    }
    // Every line of words in the band (a range per text node, a box per line), with its colour and size
    const lines = await page.evaluate(() => {
      const host = document.querySelector('[data-scenic-host-measured]');
      const out = [];
      const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.textContent.trim() && !n.parentElement.closest('.gt-scenic, .visually-hidden, [hidden], template, script, style') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT) });
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const el = n.parentElement;
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || Number(cs.opacity) === 0) continue;
        const range = document.createRange();
        range.selectNodeContents(n);
        for (const r of range.getClientRects()) {
          if (r.width < 4 || r.height < 4) continue;
          out.push({ text: n.textContent.trim().slice(0, 40), x: r.left, y: r.top + scrollY, w: r.width, h: r.height, color: cs.color, size: parseFloat(cs.fontSize), weight: Number(cs.fontWeight) });
        }
      }
      return out;
    });
    // One screenful at a time: the words hidden, a screenshot, each line sampled
    const vh = page.viewportSize().height;
    const top = Math.min(...lines.map((l) => l.y));
    const bottom = Math.max(...lines.map((l) => l.y + l.h));
    for (let y = Math.max(0, top - 40); y < bottom; y += vh - 80) {
      await page.evaluate((t) => window.scrollTo({ top: t, behavior: 'instant' }), y);
      await page.waitForTimeout(250);
      const scrolled = await page.evaluate(() => scrollY);
      const here = lines.filter((l) => !l.done && l.y - scrolled >= 0 && l.y + l.h - scrolled <= vh);
      if (!here.length) continue;
      await page.addStyleTag({ content: `[data-scenic-host-measured] *:not(.gt-scenic):not(.gt-scenic *) { color: transparent !important; -webkit-text-fill-color: transparent !important; text-shadow: none !important; text-decoration-color: transparent !important; caret-color: transparent !important; } [data-scenic-overlay] { visibility: hidden !important; } /* ${HIDE} */` });
      // What floats over the page and is not the band (the sticky header, the phone bar, the concierge) is hidden for
      // the frame, so a line under it is measured against the band, not against the header's own words
      await page.evaluate(() => {
        const host = document.querySelector('[data-scenic-host-measured]');
        for (const el of document.body.querySelectorAll('*')) {
          if (host.contains(el) || el.contains(host)) continue;
          const pos = getComputedStyle(el).position;
          if (pos === 'fixed' || pos === 'sticky') el.setAttribute('data-scenic-overlay', '');
        }
      });
      await page.waitForTimeout(60);
      const shot = await page.screenshot();
      await page.evaluate((tag) => {
        document.querySelectorAll('style').forEach((s) => s.textContent.includes(tag) && s.remove());
        document.querySelectorAll('[data-scenic-overlay]').forEach((el) => el.removeAttribute('data-scenic-overlay'));
      }, HIDE);
      const img = sharp(shot);
      const { width: iw } = await img.metadata();
      const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
      const scale = info.width / iw;
      for (const l of here) {
        l.done = true;
        const lum = [];
        for (let yy = Math.floor(l.y - scrolled); yy < l.y - scrolled + l.h; yy += 1) {
          for (let xx = Math.floor(l.x); xx < l.x + l.w; xx += 1) {
            const i = (Math.round(yy * scale) * info.width + Math.round(xx * scale)) * info.channels;
            if (i < 0 || i + 2 >= data.length) continue;
            lum.push(L([data[i], data[i + 1], data[i + 2]]));
          }
        }
        if (!lum.length) continue;
        lum.sort((a, b) => a - b);
        const q = (f) => lum[Math.min(lum.length - 1, Math.floor(f * lum.length))];
        const rgba = (l.color.match(/[\d.]+/g) || []).map(Number);
        const alpha = rgba.length > 3 ? rgba[3] : 1;
        // A translucent colour is drawn over the backdrop's median
        const bgMid = q(0.5);
        const text = alpha < 1 ? L(rgba.slice(0, 3)) * alpha + bgMid * (1 - alpha) : L(rgba);
        const dark = text < bgMid;
        const worst = ratio(text, dark ? q(0.1) : q(0.9));
        const large = l.size >= 24 || (l.size >= 18.66 && l.weight >= 700);
        report.push({ width: w, placement: p.id, drawn: true, text: l.text, color: l.color, size: l.size, worst: +worst.toFixed(2), median: +ratio(text, bgMid).toFixed(2), needs: large ? 3 : 4.5, pass: worst >= (large ? 3 : 4.5) });
      }
    }
    await page.close();
  }
}
await browser.close();
const fails = report.filter((r) => r.drawn && !r.pass);
for (const w of widths) {
  for (const p of [...PLACEMENTS.filter((x) => !only || only.includes(x.id)), ...bands]) {
    const rows = report.filter((r) => r.width === w && r.placement === p.id);
    if (!rows.length) continue;
    if (!rows[0].drawn) {
      console.log(`${w} ${p.id}: not drawn at this width`);
      continue;
    }
    const worst = rows.reduce((a, b) => (b.worst / b.needs < a.worst / a.needs ? b : a));
    console.log(`${w} ${p.id}: ${rows.length} lines, worst ${worst.worst} (needs ${worst.needs}) "${worst.text}"`);
  }
}
console.log(fails.length ? `${fails.length} lines under AA:\n${fails.map((f) => `  ${f.width} ${f.placement}: "${f.text}" ${f.worst} < ${f.needs} (${f.color}, ${f.size}px)`).join('\n')}` : 'every line over a scenic plane meets AA against its worst decile');
if (OUT) await writeFile(OUT, JSON.stringify(report, null, 2));
process.exitCode = fails.length ? 1 : 0;
