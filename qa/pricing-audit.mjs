#!/usr/bin/env node
/**
 * The pricing update of 7 Nov 2026, checked on a deployed Cloudflare preview (never a local server), in Chromium.
 *
 *   node qa/pricing-audit.mjs --base=<preview url> --out=<dir> [--before=<baseline preview url>]
 *
 * 1. Inventory, on every built page (desktop 1440 × 900 and a 390 px phone): every price a visitor sees (each
 *    [data-money] amount, the package it belongs to and its caption), every rand amount written as text, the meta and
 *    Open Graph descriptions, the structured data's offers and any "per person" wording; each checked against the
 *    owner's table and the amounts it retired.
 * 2. The booking form's estimate for each group size of the three tours, a request for a group beyond the last tier
 *    going through, and the transfer form (which shows no amount).
 * 3. Phones at 320, 360, 390 and 430 px: no horizontal overflow and no price clipped (inside the screen and every
 *    clipping ancestor, no text overflowing its box), with a screenshot of each price area; with --before, the same
 *    area on the baseline beside it. (A tour's phone price bar is not built while a direct line is verified: the
 *    contact bar takes its place, so its markup is checked by test/pricing.test.mjs instead.)
 * Prices are kept in rand (/api/currency answered with ZAR), whatever country this machine appears to be in.
 * Writes <out>/audit.json and <out>/<width>/*.jpg; exits 1 when a check fails.
 */
import { chromium } from '@playwright/test';
import { mkdir, writeFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=').slice(1).join('=') || d;
const BASE = arg('base', '').replace(/\/$/, '');
const BEFORE = arg('before', '').replace(/\/$/, '');
const OUT = arg('out', 'qa/pricing/2026-11-07');
if (!BASE) {
  console.error('usage: node qa/pricing-audit.mjs --base=<deployed preview url> --out=<dir> [--before=<baseline url>]');
  process.exit(2);
}

/** The owner's table: the "From" amount and each tier, by package. */
const APPROVED = {
  'cape-town-city-private-tour': { from: 4500, tiers: { '1–4 guests': 4500, '5–8 guests': 9000 } },
  'township-private-tour': { from: 4500, tiers: { '1–4 guests': 4500, '5–8 guests': 9000 } },
  'private-cape-town-experience': { from: 6000, tiers: { '1–20 guests': 6000 } },
  'airport-private-transfer': { from: 850, tiers: { '1–4 guests': 850, '5–8 guests': 1700 } },
};
/** Left as they were by the update. */
const UNCHANGED = {
  'cape-peninsula-private-tour': { from: 6000, tiers: { '1–4 guests': 6000, '5–8 guests': 12000 } },
  'cape-winelands-private-tour': { from: 6000, tiers: { '1–4 guests': 6000, '5–8 guests': 12000 } },
  'garden-route-private-tour': { from: 8500, tiers: { '1–4 guests': 8500 } },
};
const RATES = { ...APPROVED, ...UNCHANGED };
const RETIRED = [3500, 4000, 8000, 800, 1600];
const rand = (n) => `R${n.toLocaleString('en-GB')}`;

const failures = [];
const fail = (msg) => failures.push(msg);

/** Every page of the build (site/ holds the same commit's build). */
async function routes(dir = 'site', prefix = '/') {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.isDirectory() && e.name !== 'assets') out.push(...(await routes(join(dir, e.name), `${prefix}${e.name}/`)));
    else if (e.name === 'index.html') out.push(prefix);
  }
  return out.sort();
}

async function inRand(page) {
  await page.route('**/api/currency', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, base: 'ZAR', currency: 'ZAR', rates: {}, date: '2026-11-07', stale: false, source: 'qa' }) }));
}
const url = (base, path) => `${base}${path}${path.includes('?') ? '&' : '?'}nomotion`;

/** What a page shows about prices, read in the browser. */
function readPrices() {
  const slugOf = (href = '') => (href.match(/\/(?:tours|packages)\/([^/]+)\//) || [])[1] || null;
  const pageSlug = slugOf(location.pathname) || (location.pathname.startsWith('/transfers/') ? 'airport-private-transfer' : null);
  const text = (el) => (el?.textContent || '').replace(/\s+/g, ' ').trim();
  const money = [...document.querySelectorAll('main [data-money], [data-mobile-cta] [data-money]')].map((el) => {
    const card = el.closest('.card');
    const where = card ? 'card' : el.closest('.price-tiers') ? 'tier' : el.closest('.enquiry-card') ? 'booking card' : el.closest('[data-mobile-cta]') ? 'phone bar' : el.closest('.service-block') ? 'transfer' : el.closest('[data-total-row]') ? 'estimate' : 'other';
    const slug = card ? slugOf(card.querySelector('.card__title a')?.getAttribute('href') || '') || slugOf(card.querySelector('a')?.href) : el.closest('.service-block#airport') ? 'airport-private-transfer' : pageSlug;
    const caption = where === 'tier' ? text(el.closest('li').querySelector('span')) : where === 'transfer' && el.closest('p.small') ? (el.previousSibling?.textContent || '').split('·').pop().replace(':', '').trim() : text(el.closest('.price, .enquiry-card, .mobile-cta__price')?.querySelector('.price__note')) || text(el.closest('.mobile-cta__price'))?.replace(text(el.closest('strong')), '');
    return { where, slug, amount: Number(el.dataset.money), text: text(el), caption, line: text(el.closest('.price, .enquiry-card__amount, li, .mobile-cta__price, p')) };
  });
  // Rand amounts written as text (outside the converted amounts)
  const written = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (n.parentElement.closest('[data-money], script, style, noscript, template')) continue;
    for (const m of n.textContent.matchAll(/R ?\d{1,3}(?:,\d{3})+|R ?\d{3,}/g)) written.push({ amount: m[0], line: text(n.parentElement) });
  }
  const meta = ['meta[name="description"]', 'meta[property="og:description"]', 'meta[name="twitter:description"]'].map((s) => document.querySelector(s)?.content || '').filter(Boolean);
  const offers = [];
  for (const s of document.querySelectorAll('script[type="application/ld+json"]')) {
    const ld = JSON.parse(s.textContent);
    for (const node of ld['@graph'] || [ld]) if (node.offers) offers.push(...[].concat(node.offers).map((o) => ({ type: node['@type'], name: node.name, ...o })));
  }
  const body = document.body.innerText.replace(/not per person|per person or per group/gi, '');
  return { pageSlug, money, written, meta, offers, perPerson: /per person|per adult/i.test(body), upToTen: /up to ten\b|up to 10 guests/i.test(document.body.innerText), upTo20: (document.body.innerText.match(/up to 20\b/g) || []).length };
}

function checkInventory(path, r) {
  for (const m of r.money) {
    if (RETIRED.includes(m.amount)) fail(`${path}: retired amount ${rand(m.amount)} (${m.where})`);
    const rate = RATES[m.slug];
    if (!rate) {
      fail(`${path}: a price with no package (${m.where}, ${m.text})`);
      continue;
    }
    if (m.text !== rand(m.amount)) fail(`${path}: ${m.slug} ${m.where} shows "${m.text}" for ${rand(m.amount)}`);
    if (m.where === 'tier' || (m.where === 'transfer' && m.caption && rate.tiers[m.caption] !== undefined && m.line.includes('·'))) {
      if (rate.tiers[m.caption] !== m.amount) fail(`${path}: ${m.slug} tier "${m.caption}" is ${rand(m.amount)}, approved ${rand(rate.tiers[m.caption] ?? 0)}`);
    } else if (m.amount !== rate.from) fail(`${path}: ${m.slug} ${m.where} "From" ${rand(m.amount)}, approved ${rand(rate.from)}`);
    if (/per (person|adult)/i.test(`${m.caption} ${m.line}`.replace(/not per person/i, ''))) fail(`${path}: ${m.slug} ${m.where} says per person`);
  }
  for (const w of r.written) if (RETIRED.some((n) => w.amount.replace(' ', '') === rand(n))) fail(`${path}: retired amount written as text: ${w.line}`);
  for (const d of r.meta) for (const n of RETIRED) if (d.includes(rand(n))) fail(`${path}: retired amount in a description: ${d}`);
  for (const o of r.offers) {
    const slug = r.pageSlug;
    const rate = RATES[slug];
    const label = o.eligibleQuantity ? `${o.eligibleQuantity.minValue}–${o.eligibleQuantity.maxValue} guests` : Object.keys(rate?.tiers || {})[0];
    if (!rate || rate.tiers[label] !== Number(o.price)) fail(`${path}: structured data offers ${o.price} for ${label}`);
    if (o.priceCurrency !== 'ZAR') fail(`${path}: structured data currency ${o.priceCurrency}`);
  }
  if (r.perPerson) fail(`${path}: "per person" on the page`);
  if (r.upToTen) fail(`${path}: the Experience's old capacity ("up to ten")`);
}

const PHONES = [
  [320, 640],
  [360, 780],
  [390, 844],
  [430, 932],
];
/** The home page's airport way: its facts line shows from 48em (phones show the way without it). */
const DESKTOP_AREAS = [['home-airport-way', '/', '.lc-way:has(a[href*="transfers/"]) .lc-way__body']];
/** The price areas on phones: [name, path, selector, setup]. */
const AREAS = [
  ['tours-city-card', '/tours/', '.card:has(a[href*="tours/cape-town-city-private-tour/"])'],
  ['tours-township-card', '/tours/', '.card:has(a[href*="tours/township-private-tour/"])'],
  ['tours-experience-card', '/tours/', '.card:has(a[href*="tours/private-cape-town-experience/"])'],
  ['city-booking-card', '/tours/cape-town-city-private-tour/', '.enquiry-card > div:first-of-type'],
  ['township-booking-card', '/tours/township-private-tour/', '.enquiry-card > div:first-of-type'],
  ['experience-booking-card', '/tours/private-cape-town-experience/', '.enquiry-card > div:first-of-type'],
  ['transfers-prices', '/transfers/', '#airport .service-block__foot', 'withTiers'],
  ['estimate-city-6', '/enquire/?type=tour&tour=cape-town-city-private-tour&adults=6', '[data-total-row]'],
  ['estimate-experience-12', '/enquire/?type=tour&tour=private-cape-town-experience&adults=12', '[data-total-row]'],
  ['experience-intro', '/tours/private-cape-town-experience/', '.detail__intro .prose'],
  ['experience-highlights', '/tours/private-cape-town-experience/', '#panel-overview .feature-list'],
];

/** Every price element on screen: inside the screen, inside every clipping ancestor, no text overflowing its box. */
function measureClipping() {
  const sel = '.price, .enquiry-card__amount, .enquiry-card .price__note, .price-tiers li, .mobile-cta__price, .service-block .small.muted, [data-total-text], .lc-way__facts li';
  const out = [];
  const tol = 1;
  for (const el of document.querySelectorAll(sel)) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || el.closest('[hidden]')) continue;
    if (!el.closest('[data-mobile-cta]')) el.scrollIntoView({ block: 'center', inline: 'center' });
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const issues = [];
    if (r.left < -tol || r.right > innerWidth + tol) issues.push(`outside the screen (${Math.round(r.left)}–${Math.round(r.right)} of ${innerWidth})`);
    if (el.scrollWidth > el.clientWidth + tol && el.clientWidth > 0) issues.push(`text wider than its box (${el.scrollWidth} > ${el.clientWidth})`);
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      const s = getComputedStyle(a);
      if (s.overflowX === 'visible' && s.overflowY === 'visible' && s.clipPath === 'none') continue;
      const ar = a.getBoundingClientRect();
      if (r.left < ar.left - tol || r.right > ar.right + tol || r.top < ar.top - tol || r.bottom > ar.bottom + tol) issues.push(`clipped by ${a.tagName.toLowerCase()}.${[...a.classList].join('.')}`);
    }
    const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.3;
    out.push({ text: el.textContent.replace(/\s+/g, ' ').trim().slice(0, 90), cls: el.className, lines: Math.round(r.height / lh), issues });
  }
  return { overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, items: out };
}

async function showArea(page, selector, setup) {
  const el = page.locator(selector).filter({ visible: true }).first();
  if (setup === 'bar') {
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight * 0.45));
    await page.waitForSelector('[data-mobile-cta].is-visible', { timeout: 6000 }).catch(() => {});
    await page.waitForTimeout(450);
    return { clip: await el.boundingBox() };
  }
  await el.scrollIntoViewIfNeeded({ timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(250);
  let box = await el.boundingBox();
  if (setup === 'withTiers') {
    const tiers = await page.locator('#airport .service-block__body > p.small.muted').filter({ hasText: 'guests' }).first().boundingBox();
    if (box && tiers) box = { x: Math.min(box.x, tiers.x), y: box.y, width: Math.max(box.x + box.width, tiers.x + tiers.width) - Math.min(box.x, tiers.x), height: tiers.y + tiers.height - box.y };
  }
  return { clip: box };
}

async function capture(browser, base, [w, h], [name, path, selector, setup], { phone = true } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: phone, hasTouch: phone, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await inRand(page);
  await page.goto(url(base, path), { waitUntil: 'networkidle' });
  if (path.startsWith('/enquire/')) await page.waitForSelector('.wizard.is-ready');
  const { clip } = await showArea(page, selector, setup);
  let shot = null;
  if (clip && clip.width && clip.height) {
    const pad = 8;
    const x = Math.max(0, clip.x - pad);
    const y = Math.max(0, clip.y - pad);
    shot = await page.screenshot({ type: 'jpeg', quality: 78, clip: { x, y, width: Math.min(w - x, clip.width + pad * 2), height: Math.min(h - y, clip.height + pad * 2) } });
  }
  await ctx.close();
  return shot;
}

async function composite(browser, after, before, title) {
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  const img = (b, label) => (b ? `<figure><figcaption>${label}</figcaption><img src="data:image/jpeg;base64,${b.toString('base64')}"></figure>` : '');
  await page.setContent(`<style>body{margin:0;font:14px system-ui;background:#f4f1ea;color:#1b2b3a}main{display:flex;gap:16px;padding:16px;align-items:flex-start}figure{margin:0}figcaption{font-weight:600;margin:0 0 6px}img{display:block;max-width:none;border:1px solid #d8d2c4}h1{font-size:15px;margin:16px 16px 0}</style><h1>${title}</h1><main>${img(before, 'Before (baseline)')}${img(after, 'After (approved prices)')}</main>`);
  await page.waitForTimeout(100);
  const buf = await page.locator('body').screenshot({ type: 'jpeg', quality: 78 });
  await page.close();
  return buf;
}

const browser = await chromium.launch();
const report = { base: BASE, before: BEFORE || null, inventory: {}, estimate: [], phones: {}, failures };

// 1. Inventory: every page, desktop and phone
for (const [label, opts] of [
  ['desktop', { viewport: { width: 1440, height: 900 } }],
  ['phone', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }],
]) {
  const ctx = await browser.newContext({ ...opts, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await inRand(page);
  for (const path of await routes()) {
    const res = await page.goto(url(BASE, path), { waitUntil: 'networkidle' });
    if (!res.ok()) fail(`${path}: HTTP ${res.status()}`);
    if (label === 'phone') await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight * 0.45)).then(() => page.waitForTimeout(300));
    const r = await page.evaluate(readPrices);
    checkInventory(`${label} ${path}`, r);
    if (path === '/tours/private-cape-town-experience/' && r.upTo20 < 2) fail(`${label} ${path}: "up to 20" shown ${r.upTo20} times (intro and highlights)`);
    report.inventory[label] ??= {};
    report.inventory[label][path] = r;
  }
  await ctx.close();
}

// 2. The booking form's estimate, group by group
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await inRand(page);
  const expected = (slug, n) => {
    if (slug === 'private-cape-town-experience') return n <= 20 ? `From R6,000 for your private group of ${n} · the rate for 1–20 guests` : 'Groups of more than 20: we’ll confirm your quote';
    if (n <= 4) return `R4,500 for your private group of ${n} · the rate for 1–4 guests`;
    if (n <= 8) return `R9,000 for your private group of ${n} · the rate for 5–8 guests`;
    return 'Groups of more than 8: we’ll confirm your quote';
  };
  const cases = [
    ...['cape-town-city-private-tour', 'township-private-tour'].flatMap((slug) => [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => [slug, n])),
    ...[1, 2, 10, 19, 20, 21].map((n) => ['private-cape-town-experience', n]),
  ];
  for (const [slug, n] of cases) {
    await page.goto(url(BASE, `/enquire/?type=tour&tour=${slug}`), { waitUntil: 'networkidle' });
    await page.waitForSelector('.wizard.is-ready');
    const t = page.locator('[data-wizard-step="details"][data-path="tour"]');
    // Adults and children together make the group: the larger groups include two children.
    const children = n >= 5 ? 2 : 0;
    await t.locator('[name="adults"]').fill(String(n - children));
    await t.locator('[name="children"]').fill(String(children));
    await t.locator('[name="children"]').dispatchEvent('change');
    const shown = (await t.locator('[data-total-text]').textContent()).trim();
    const ok = shown === expected(slug, n);
    if (!ok) fail(`estimate ${slug} × ${n}: "${shown}", expected "${expected(slug, n)}"`);
    const row = { slug, guests: n, adults: n - children, children, shown, ok };
    // A group the rates do not cover still sends its request.
    if (shown.startsWith('Groups of more than')) {
      await t.locator('[name="preferred_date"]').fill(new Date(Date.now() + 40 * 864e5).toISOString().slice(0, 10));
      await t.locator('[name="pickup_area"]').fill('Hotel in Sea Point');
      await t.locator('[data-next]').click();
      row.requestContinues = await page.locator('[data-wizard-step="contact"]').isVisible();
      if (!row.requestContinues) fail(`estimate ${slug} × ${n}: the request does not go on to the traveller details`);
    }
    report.estimate.push(row);
  }
  await page.goto(url(BASE, '/enquire/?type=transfer&transfer=airport-arrival'), { waitUntil: 'networkidle' });
  await page.waitForSelector('.wizard.is-ready');
  const tr = page.locator('[data-wizard-step="details"][data-path="transfer"]');
  const transfer = { shown: (await tr.locator('.booking-total__text').textContent()).trim(), amounts: await tr.locator('[data-money]').count() };
  if (transfer.shown !== 'We’ll confirm your quote' || transfer.amounts) fail(`transfer form: "${transfer.shown}", ${transfer.amounts} amounts`);
  report.transferForm = transfer;
  await ctx.close();
}

// 3. Phones: overflow, clipping, and the price areas
for (const size of PHONES) {
  const [w, h] = size;
  const dir = join(OUT, String(w));
  await mkdir(dir, { recursive: true });
  report.phones[w] = {};
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await inRand(page);
  for (const path of [...new Set(AREAS.map((a) => a[1]))]) {
    await page.goto(url(BASE, path), { waitUntil: 'networkidle' });
    if (path.startsWith('/enquire/')) await page.waitForSelector('.wizard.is-ready');
    const m = await page.evaluate(measureClipping);
    // The phone bar: measured where it shows, part-way down the page.
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight * 0.45));
    await page.waitForTimeout(500);
    const bar = await page.evaluate(() => {
      const el = document.querySelector('[data-mobile-cta].is-visible .mobile-cta__price');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { text: el.textContent.trim(), fits: r.left >= -1 && r.right <= innerWidth + 1 && el.scrollWidth <= el.clientWidth + 1 };
    });
    if (m.overflow > 0) fail(`${w}px ${path}: horizontal overflow ${m.overflow}px`);
    for (const it of m.items) if (it.issues.length) fail(`${w}px ${path}: "${it.text}" ${it.issues.join('; ')}`);
    if (bar && !bar.fits) fail(`${w}px ${path}: the phone bar's price does not fit`);
    report.phones[w][path] = { ...m, bar };
  }
  await ctx.close();
  for (const area of AREAS) {
    const after = await capture(browser, BASE, size, area);
    if (!after) {
      fail(`${w}px ${area[0]}: area not found`);
      continue;
    }
    const before = BEFORE ? await capture(browser, BEFORE, size, area).catch(() => null) : null;
    const img = before ? await composite(browser, after, before, `${area[0]} · ${w} px`) : after;
    await writeFile(join(dir, `${area[0]}.jpg`), img);
  }
}

// The desktop-only area, before and after
{
  const dir = join(OUT, '1440');
  await mkdir(dir, { recursive: true });
  for (const area of DESKTOP_AREAS) {
    const after = await capture(browser, BASE, [1440, 900], area, { phone: false });
    if (!after) fail(`1440px ${area[0]}: area not found`);
    const before = BEFORE ? await capture(browser, BEFORE, [1440, 900], area, { phone: false }).catch(() => null) : null;
    if (after) await writeFile(join(dir, `${area[0]}.jpg`), before ? await composite(browser, after, before, `${area[0]} · 1440 px`) : after);
  }
}

await browser.close();
await mkdir(OUT, { recursive: true });
await writeFile(join(OUT, 'audit.json'), JSON.stringify(report, null, 2));
const priced = Object.values(report.inventory.desktop).reduce((n, r) => n + r.money.length, 0);
console.log(`${Object.keys(report.inventory.desktop).length} pages, ${priced} prices on desktop; ${report.estimate.length} estimates; ${PHONES.length} phone widths × ${AREAS.length} areas`);
console.log(failures.length ? `FAILED (${failures.length}):\n- ${failures.join('\n- ')}` : 'all pricing checks passed');
process.exit(failures.length ? 1 : 0);
