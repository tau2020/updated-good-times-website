/**
 * The owner's pricing update of 7 Nov 2026: the seven approved entries are set once (src/data/pricing.mjs) and are
 * the same wherever a price is shown: the cards, each tour's booking card and its tiers, the phone's price bar, the
 * transfers page, the home page's airport line, the meta descriptions, the structured data and the booking form's
 * rates. Never per person; no price for a group size the owner did not price; "From" kept for the Private Cape Town
 * Experience; every other package's rate as it was.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { site } from '../src/data/site.mjs';
import { layout } from '../src/partials/layout.mjs';
import { RATES, groupMax, fromLine } from '../src/data/pricing.mjs';
import { tours, tourBySlug } from '../src/data/tours.mjs';
import { services } from '../src/data/transfers.mjs';
import { packages } from '../src/data/packages.mjs';
import { faqs } from '../src/data/faq.mjs';

/** The owner's table, exactly as approved: [slug, package, guests from, guests to, ZAR, "From" price]. */
const APPROVED = [
  ['cape-town-city-private-tour', 'City Tour', 1, 4, 4500],
  ['cape-town-city-private-tour', 'City Tour', 5, 8, 9000],
  ['township-private-tour', 'Township Tour', 1, 4, 4500],
  ['township-private-tour', 'Township Tour', 5, 8, 9000],
  ['private-cape-town-experience', 'Private Cape Town Experience', 1, 20, 6000, true],
  ['airport-private-transfer', 'Airport Transfer', 1, 4, 850],
  ['airport-private-transfer', 'Airport Transfer', 5, 8, 1700],
];
const UPDATED = [...new Set(APPROVED.map(([slug]) => slug))];
/** The amounts the update replaced: none may be shown for these packages again. */
const RETIRED = [3500, 4000, 8000, 800, 1600];

const dir = new URL('../src/pages/', import.meta.url);
const pages = [];
for (const f of readdirSync(dir).filter((f) => f.endsWith('.mjs')).sort()) {
  const mod = await import(new URL(f, dir));
  pages.push(...(Array.isArray(mod.pages) ? mod.pages : [mod.page]).filter(Boolean));
}
const render = (path) => layout(pages.find((p) => p.path === path), site);
const rand = (n) => `R${n.toLocaleString('en-GB')}`;
const money = (n) => `<span data-money="${n}">${rand(n)}</span>`;
const ldOffers = (html) => {
  const ld = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  return [].concat(ld['@graph'].find((n) => n['@type'] === 'TouristTrip')?.offers ?? []);
};
const metaDescription = (html) => html.match(/<meta name="description" content="([^"]*)">/)[1];
/** A tour's card on a list page (the layout makes its link relative to the page: "../tours/…"). */
const card = (html, slug) => {
  const at = html.search(new RegExp(`<a href="(?:\\.\\./)*tours/${slug}/"`));
  assert.ok(at > 0, `a card for ${slug}`);
  return html.slice(at, html.indexOf('</article>', at));
};

test('the seven approved entries, exactly, set in one place', () => {
  for (const slug of UPDATED) {
    const rows = APPROVED.filter(([s]) => s === slug);
    const expected = rows.map(([, , min, max, amount, from]) => ({ label: `${min}–${max} guests`, max, amount, ...(from ? { startingFrom: true } : {}) }));
    assert.deepEqual(RATES[slug].tiers, expected, slug);
    assert.equal(RATES[slug].unit, slug === 'airport-private-transfer' ? 'per trip' : 'per group', `${slug}: never per person`);
  }
  // Each package carries its central rate, in rand, "From" its lowest tier.
  for (const [slug, item] of [...UPDATED.filter((s) => s !== 'airport-private-transfer').map((s) => [s, tourBySlug(s)]), ['airport-private-transfer', services[0]]]) {
    assert.equal(item.slug, slug);
    assert.deepEqual(item.price.tiers, RATES[slug].tiers, slug);
    assert.equal(item.price.currency, 'ZAR', slug);
    assert.equal(item.price.from, RATES[slug].tiers[0].amount, slug);
  }
});

test('every other rate is as it was before the update', () => {
  const amounts = (slug) => RATES[slug].tiers.map((t) => [t.label, t.amount]);
  assert.deepEqual(amounts('cape-peninsula-private-tour'), [['1–4 guests', 6000], ['5–8 guests', 12000]]);
  assert.deepEqual(amounts('cape-winelands-private-tour'), [['1–4 guests', 6000], ['5–8 guests', 12000]]);
  assert.deepEqual(amounts('garden-route-private-tour'), [['1–4 guests', 8500]]);
  assert.equal(RATES['garden-route-private-tour'].unit, 'per day');
  // Every priced tour, transfer and package takes its rate from pricing.mjs; the rest stay on enquiry.
  const priced = [...tours, ...services, ...packages].filter((x) => x.price);
  assert.deepEqual(priced.map((x) => x.slug).sort(), Object.keys(RATES).sort());
  for (const x of priced) assert.deepEqual(x.price.tiers, RATES[x.slug].tiers, x.slug);
  for (const slug of ['whale-watching-private-tour', 'cape-agulhas-private-tour', 'shark-cage-diving', 'quad-biking', 'sky-diving']) assert.equal(tourBySlug(slug).price, null, slug);
});

test('the tiers run on from one guest with no gap, and no larger group is ever priced', () => {
  for (const [slug, rate] of Object.entries(RATES)) {
    let next = 1;
    for (const t of rate.tiers) {
      const [, min, max] = t.label.match(/^(\d+)–(\d+) guests$/).map(Number);
      assert.equal(min, next, `${slug}: ${t.label} starts where the last tier ended`);
      assert.equal(max, t.max, `${slug}: ${t.label} is the range it prices`);
      next = max + 1;
    }
  }
  assert.equal(groupMax('private-cape-town-experience'), 20);
});

test('no page shows a retired amount, a capacity of ten, or a price per person', () => {
  for (const p of pages) {
    const html = layout(p, site);
    for (const n of RETIRED) {
      assert.doesNotMatch(html, new RegExp(`data-money="${n}"`), `${p.path}: data-money ${n}`);
      assert.ok(!html.includes(rand(n)), `${p.path}: ${rand(n)}`);
    }
    assert.doesNotMatch(html, /up to ten|up to 10 guests/i, `${p.path}: the Experience's old capacity`);
    // "per person" only to say a price is not per person (and in the FAQ's question).
    const perPerson = html.replace(/not per person|per person or per group/g, '');
    assert.doesNotMatch(perPerson, /per person|per adult/i, `${p.path}: per person`);
  }
});

test('the City and Township tours: cards, booking card, both tiers, the phone bar and the structured data', () => {
  const list = render('tours/index.html');
  for (const slug of ['cape-town-city-private-tour', 'township-private-tour']) {
    assert.match(card(list, slug), new RegExp(`<span class="price__amount">From ${money(4500)}</span><span class="price__note">per group</span>`), slug);
    const html = render(`tours/${slug}/index.html`);
    assert.match(html, new RegExp(`<p class="enquiry-card__amount">From ${money(4500)}</p>`), slug);
    assert.match(html, new RegExp(`<p class="price__note">per group of 1–4 guests`), slug);
    assert.match(html, new RegExp(`<li><span>1–4 guests</span> ${money(4500)}</li><li><span>5–8 guests</span> ${money(9000)}</li>`), slug);
    assert.match(pages.find((p) => p.path === `tours/${slug}/index.html`).mobileCta({ site }), new RegExp(`<strong>From ${money(4500)}</strong>per group`), slug);
    assert.deepEqual(
      ldOffers(html).map((o) => [o.price, o.priceCurrency, o.description, o.eligibleQuantity.minValue, o.eligibleQuantity.maxValue]),
      [['4500', 'ZAR', 'per group of 1–4 guests', 1, 4], ['9000', 'ZAR', 'per group of 5–8 guests', 5, 8]],
      slug,
    );
  }
});

test('the Private Cape Town Experience: From R6,000 for 1–20 guests, everywhere it is priced or its size is stated', () => {
  const slug = 'private-cape-town-experience';
  assert.match(card(render('tours/index.html'), slug), new RegExp(`<span class="price__amount">From ${money(6000)}</span><span class="price__note">per group</span>`));
  const html = render(`tours/${slug}/index.html`);
  assert.match(html, new RegExp(`<p class="enquiry-card__amount">From ${money(6000)}</p>\\s*<p class="price__note">per group of 1–20 guests</p>`));
  assert.doesNotMatch(html.slice(html.indexOf('enquiry-card__amount'), html.indexOf('</aside>', html.indexOf('enquiry-card__amount'))), /price-tiers/, 'one rate: no tier list');
  assert.match(pages.find((p) => p.path === `tours/${slug}/index.html`).mobileCta({ site }), new RegExp(`<strong>From ${money(6000)}</strong>per group`));
  const [offer, more] = ldOffers(html);
  assert.equal(more, undefined, 'one offer');
  assert.equal(offer.price, '6000');
  assert.equal(offer.description, 'From R6,000 per group of 1–20 guests', 'the structured data keeps the "From"');
  assert.deepEqual(offer.priceSpecification, { '@type': 'PriceSpecification', minPrice: 6000, priceCurrency: 'ZAR' });
  assert.deepEqual([offer.eligibleQuantity.minValue, offer.eligibleQuantity.maxValue], [1, 20]);
  // Its group size, as approved: the introduction, the highlights and the description search engines show.
  const t = tourBySlug(slug);
  assert.match(t.intro[0], /for groups of up to 20\./);
  assert.ok(t.highlights.includes('Groups of up to 20'));
  assert.match(metaDescription(html), /For groups of up to 20\.$/);
});

test('the airport transfer: R850 for 1–4 guests and R1,700 for 5–8, per trip, on the transfers page, the home page and in the description', () => {
  const html = render('transfers/index.html');
  assert.match(html, new RegExp(`<span class="price__amount">From ${money(850)}</span><span class="price__note">per trip, 1–4 guests</span>`));
  assert.match(html, new RegExp(`1–4 guests: ${money(850)} · 5–8 guests: ${money(1700)}\\. Prices per trip, not per person\\.`));
  assert.match(metaDescription(html), /From R850 per trip for 1–4 guests\.$/);
  assert.equal(fromLine(services[0].price), 'From R850 per trip for 1–4 guests');
  assert.ok(render('index.html').includes('<li>From R850 per trip for 1–4 guests</li>'), 'the home page’s airport way');
});

test('the booking form prices each group by the same tiers, and the FAQ states the Experience’s group size', () => {
  const html = render('enquire/index.html');
  const cfg = JSON.parse(html.match(/<script type="application\/json" id="enquiry-config">([\s\S]*?)<\/script>/)[1]);
  for (const slug of ['cape-town-city-private-tour', 'township-private-tour', 'private-cape-town-experience']) assert.deepEqual(cfg.prices[slug], { unit: 'per group', tiers: RATES[slug].tiers }, slug);
  assert.equal(cfg.prices['private-cape-town-experience'].tiers[0].startingFrom, true, 'the estimate keeps the "From"');
  const faq = faqs.find((f) => /per person or per group/i.test(f.q));
  assert.match(faq.a[0], /^Per group\./);
  assert.match(faq.a[0], /the Private Cape Town Experience has one rate for a group of up to 20/);
});
