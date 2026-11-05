/**
 * Where the currency selector may appear (D75), checked on every page as the
 * layout renders it: only beside a page's own prices (the tours list, a tour's
 * or the multi-day tour's booking card, the transfers, the booking estimate),
 * one per page; never on the home page, in the header, the footer, the menu or
 * a page without prices. Every marked price carries its authoritative rand
 * amount, as Good Times publishes it, from the data.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { site } from '../src/data/site.mjs';
import { layout } from '../src/partials/layout.mjs';
import { tours } from '../src/data/tours.mjs';
import { services } from '../src/data/transfers.mjs';
import { packages } from '../src/data/packages.mjs';
import { moneyTag } from '../src/partials/ui.mjs';

const dir = new URL('../src/pages/', import.meta.url);
const pages = [];
for (const f of readdirSync(dir).filter((f) => f.endsWith('.mjs')).sort()) {
  const mod = await import(new URL(f, dir));
  pages.push(...(Array.isArray(mod.pages) ? mod.pages : [mod.page]).filter(Boolean));
}
const render = (p, s = site) => layout(p, s);
const byPath = (path) => pages.find((p) => p.path === path);
const count = (html, re) => (html.match(re) || []).length;
const PICKER = /data-currency-picker/g;
const section = (html, start, end) => html.slice(html.indexOf(start), html.indexOf(end, html.indexOf(start)) + end.length);

/** A whole rand amount as the site writes it before any conversion: R6,000. */
const rand = (n) => `R${n.toLocaleString('en-GB')}`;
const priced = tours.filter((t) => t.price);
const withPrices = new Set([
  'tours/index.html',
  'transfers/index.html',
  'enquire/index.html',
  ...priced.map((t) => `tours/${t.slug}/index.html`),
  ...packages.filter((p) => p.price).map((p) => `packages/${p.slug}/index.html`),
]);

test('one selector on each page that shows prices; none anywhere else', () => {
  assert.equal(site.prices.show, true, 'this build shows prices');
  for (const p of pages) {
    const html = render(p);
    assert.equal(count(html, PICKER), withPrices.has(p.path) ? 1 : 0, p.path);
  }
});

test('never on the home page, and never in the header, the menu or the footer of any page', () => {
  const home = render(byPath('index.html'));
  assert.equal(count(home, PICKER), 0);
  assert.doesNotMatch(home, /currency\.js/, 'the home page does not even load the currency script');
  for (const p of pages) {
    const html = render(p);
    for (const [start, end] of [['<header', '</header>'], ['<footer', '</footer>'], ['id="drawer"', '</nav>']]) {
      if (html.includes(start)) assert.doesNotMatch(section(html, start, end), PICKER, `${p.path}: ${start}`);
    }
  }
});

test('the currency script loads where a price is marked or a selector shown, and nowhere else', () => {
  for (const p of pages) {
    const html = render(p);
    const needs = /data-money=|data-currency-picker/.test(html);
    assert.equal(/<script type="module" src="(\.\.\/)*assets\/js\/currency\.js"><\/script>/.test(html), needs, p.path);
  }
  // A page that shows only other products' prices (a tour without a published rate, beside its similar tours;
  // the multi-day list) has no selector, but still follows the visitor's currency.
  for (const path of ['tours/whale-watching-private-tour/index.html', 'packages/index.html']) {
    const html = render(byPath(path));
    assert.ok(/data-money=/.test(html) && count(html, PICKER) === 0, path);
  }
});

test('every marked price is the rand amount from the data, a whole number, never a converted figure', () => {
  assert.ok(priced.length >= 5, 'the published rates');
  for (const t of priced) {
    const html = render(byPath(`tours/${t.slug}/index.html`));
    const card = section(html, 'class="enquiry-card', '</aside>');
    assert.equal(t.price.currency, 'ZAR', t.slug);
    assert.match(card, new RegExp(`From <span data-money="${t.price.from}">${rand(t.price.from)}<`), t.slug);
    // Each group rate as published (1–4 and 5–8 guests), marked the same way
    if (t.price.tiers.length > 1) for (const x of t.price.tiers) assert.match(card, new RegExp(`<li><span>${x.label}</span> <span data-money="${x.amount}">${rand(x.amount)}</span></li>`), `${t.slug}: ${x.label}`);
    // The phone price bar (shown when no contact bar replaces it) is marked the same way.
    assert.match(byPath(`tours/${t.slug}/index.html`).mobileCta({ site }), new RegExp(`data-money="${t.price.from}"`), `${t.slug}: the phone bar too`);
  }
  // A tour without a published rate shows none, and invents none
  for (const t of tours.filter((x) => !x.price)) {
    const card = section(render(byPath(`tours/${t.slug}/index.html`)), 'class="enquiry-card', '</aside>');
    assert.doesNotMatch(card, /data-money=/, `${t.slug}: no price`);
  }
  const transfers = render(byPath('transfers/index.html'));
  for (const s of services.filter((x) => x.price)) for (const x of s.price.tiers) assert.match(transfers, new RegExp(`data-money="${x.amount}">${rand(x.amount)}<`), `${s.slug}: ${x.label}`);
  for (const p of packages.filter((x) => x.price)) {
    const card = section(render(byPath(`packages/${p.slug}/index.html`)), 'class="enquiry-card', '</aside>');
    assert.match(card, new RegExp(`From <span data-money="${p.price.from}">${rand(p.price.from)}</span>`), p.slug);
  }
  for (const p of pages) for (const [, v] of render(p).matchAll(/data-money="([^"]*)"/g)) assert.match(v, /^\d+$/, p.path);
  // Good Times publishes no struck-through earlier price; the label support stays in step should one ever be marked.
  for (const p of pages) assert.doesNotMatch(render(p), /<s data-money/, p.path);
  assert.equal(moneyTag(106, 'ZAR', { tag: 's', label: 'previously' }), '<s data-money="106" data-money-label="previously" aria-label="previously R106">R106</s>');
});

test('with prices switched off (SHOW_INDICATIVE_PRICES=false), no selector on the tours or transfers pages', () => {
  const off = { ...site, prices: { ...site.prices, show: false } };
  for (const path of ['tours/index.html', 'transfers/index.html', 'tours/cape-town-city-private-tour/index.html']) assert.equal(count(render(byPath(path), off), PICKER), 0, path);
});
