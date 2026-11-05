/**
 * Multi-day tours (D60): Good Times publishes one, the Garden Route Private
 * Tour. Its data stays honest and consistent with the official page (the
 * published rate, inclusions and exclusions, nothing added), the pages present
 * the outline as suggested and say who confirms what, and a multi-day request
 * is stored and emailed through the existing enquiry path.
 */
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { OUTBOX, query, one, closeDb, post, validTour, key, decodeEml, emlSubject, inDays } from './helpers/env.mjs';
import { handle } from '../lib/http/app.mjs';
import { formatShortDate } from '../lib/email/layout.mjs';
import { packages } from '../src/data/packages.mjs';
import { tourBySlug } from '../src/data/tours.mjs';
import { services } from '../src/data/transfers.mjs';
import { imageByName, ORIGIN_NOTES } from '../src/data/images.mjs';
import { site } from '../src/data/site.mjs';
import { layout } from '../src/partials/layout.mjs';
import { packageCard } from '../src/partials/cards.mjs';
import { pages } from '../src/pages/packages.mjs';
import { ROUTE_STOPS, routeArt } from '../src/partials/route-art.mjs';
import { PACKAGE_SLUGS } from '../src/assets/js/enquiry-schema.js';

after(() => closeDb());

const preview = { ...site, preview: true, env: 'preview' };
const render = (path, s = preview) => layout(pages.find((p) => p.path === path), s);
const text = (html) => html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const garden = packages.find((p) => p.slug === 'garden-route-private-tour');
const GARDEN = 'packages/garden-route-private-tour/index.html';

/* ---------- data ---------- */

test('every multi-day tour is complete, sourced, and links only to real Good Times tours or transfers', () => {
  assert.deepEqual(packages.map((p) => p.slug), ['garden-route-private-tour'], 'the one multi-day tour Good Times publishes');
  assert.deepEqual(PACKAGE_SLUGS, packages.map((p) => p.slug), 'the request form offers exactly these');
  for (const p of packages) {
    for (const k of ['slug', 'title', 'shortTitle', 'tagline', 'heading', 'card', 'duration', 'group', 'where', 'seo', 'approval']) assert.ok(p[k], `${p.slug}: ${k}`);
    assert.ok(p.intro.length >= 2 && p.highlights.length >= 4 && p.outline.length >= 3, p.slug);
    assert.ok(p.nights.min >= 1 && p.nights.max >= p.nights.min && p.nights.max <= 30, `${p.slug}: nights`);
    assert.ok(p.confirm.length >= 3, `${p.slug}: open points recorded`);
    assert.match(p.approval, /published by Good Times on goodtimesincapetown\.co\.za/);
    assert.match(p.source.listing, /^https:\/\/www\.goodtimesincapetown\.co\.za\//, `${p.slug}: its official page`);
    assert.match(p.source.checked, /^\d{4}-\d{2}-\d{2}$/, `${p.slug}: when it was read`);
    for (const d of p.outline) {
      if (d.tour) assert.ok(tourBySlug(d.tour), `${p.slug}: tour ${d.tour}`);
      if (d.transfer) assert.ok(services.find((s) => s.id === d.transfer), `${p.slug}: transfer ${d.transfer}`);
    }
    if (p.related) assert.ok(tourBySlug(p.related), `${p.slug}: related ${p.related}`);
    assert.ok(p.included.length && p.notIncluded.length, `${p.slug}: inclusions and exclusions, as published`);
    // A published rate only: whole rand, the lowest tier as the "from" figure
    if (p.price) {
      assert.equal(p.price.currency, 'ZAR', p.slug);
      assert.ok(Number.isSafeInteger(p.price.from) && p.price.from > 0, p.slug);
      assert.equal(p.price.from, Math.min(...p.price.tiers.map((x) => x.amount)), `${p.slug}: "from" is the lowest published tier`);
    }
  }
  // The official page's own figures: three days or more, R8,500 per day for 1–4 guests
  assert.equal(garden.duration, '3+ days');
  assert.deepEqual([garden.nights.min, garden.nights.max, garden.nights.suggested], [2, 13, 0], 'two nights or more, the length chosen by the traveller');
  assert.deepEqual(garden.price.tiers, [{ label: '1–4 guests', max: 4, amount: 8500 }]);
  assert.equal(garden.price.unit, 'per day');
  assert.deepEqual(garden.included, ['Private vehicle', 'Driver-guide', 'Fuel', 'Bottled water']);
  assert.ok(garden.notIncluded.includes('Accommodation'), 'accommodation is not included');
});

test('photographs are Good Times’ own, each in the image register; the Garden Route has its own, so no sketch stands in', () => {
  for (const p of packages) {
    for (const name of [p.images.hero, p.images.card, ...p.images.gallery].filter(Boolean)) {
      const img = imageByName(name);
      assert.ok(img, `${p.slug}: ${name} is in the image register`);
      assert.ok(Object.hasOwn(ORIGIN_NOTES, img.origin), `${p.slug}: ${name} has a Good Times origin (${img.origin})`);
      assert.ok(img.alt, `${p.slug}: ${name} has alt text`);
    }
  }
  assert.equal(garden.images.hero, 'rooiberg-red-chair');
  assert.equal(garden.images.card, 'map-of-africa-viewpoint');
  assert.ok(garden.images.gallery.length >= 3, 'a gallery of its own');
  // The sketch (a fallback for a multi-day tour without photographs) runs west to east along the coast.
  assert.equal(ROUTE_STOPS[0], 'Cape Town');
  assert.equal(ROUTE_STOPS.at(-1), 'Tsitsikamma');
  for (const place of ['Wilderness', 'Knysna']) assert.ok(ROUTE_STOPS.includes(place), place);
});

/* ---------- pages ---------- */

test('the pages show only the published rate, present the outline as suggested, and say who confirms what', () => {
  for (const path of ['packages/index.html', GARDEN]) {
    const html = render(path);
    // The related day tour's card keeps its own price, and the currency selector lists other currencies; the rest is the multi-day tour's.
    const own = html.replace(/<article class="card" data-reveal[\s\S]*?<\/article>/g, '').replace(/<div class="currency-area[\s\S]*?<\/div><\/div>/g, '');
    const t = text(own);
    const amounts = [...t.matchAll(/R\s?\d[\d,]*/g)].map((m) => m[0]);
    assert.ok(amounts.length >= 1, `${path}: the published rate is shown`);
    for (const a of amounts) assert.equal(a, 'R8,500', `${path}: no amount but the published rate`);
    assert.doesNotMatch(t, /£|\$\s?\d|per person|all[- ]inclusive|guarantee|includes accommodation/i, `${path}: no other price or blanket claim`);
    assert.match(t, /we confirm the route, the days and the price for your dates and group with your quote/i, `${path}: who confirms what`);
    assert.equal((html.match(/<h1\b/g) || []).length, 1, `${path}: one h1`);
  }
  const [listLd] = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(render('packages/index.html')).slice(1);
  assert.doesNotMatch(listLd, /"offers"|"price"/, 'the list carries no offer of its own');
  const [ld] = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(render(GARDEN)).slice(1);
  assert.match(ld, /"offers":\{"@type":"Offer","price":"8500","priceCurrency":"ZAR","description":"per day, 1–4 guests"/, 'the published rate, in rand');

  const page = text(render(GARDEN));
  assert.match(page, /Suggested outline/);
  assert.match(page, /order of the days, the stops and the timings are planned with you/);
  assert.match(page, /Private: up to 4 guests at the published rate/);
  assert.match(page, /Per day, for 1–4 guests\. Groups of 5–8: please enquire\./);
  for (const x of [...garden.included, ...garden.notIncluded]) assert.ok(page.includes(x), `as published: ${x}`);
  assert.ok(page.includes(garden.cancellation), 'the cancellation terms, as published');
  assert.match(page, /Nothing is booked or charged until we’ve agreed the details together\./);
  assert.match(page, /Get a Personalised Quote/);
  // Prices switched off: the card asks for a quote and marks no amount
  const off = render(GARDEN, { ...preview, prices: { ...preview.prices, show: false } });
  const card = off.slice(off.indexOf('class="enquiry-card'), off.indexOf('</form>', off.indexOf('class="enquiry-card')));
  assert.match(card, /<p class="enquiry-card__amount">Request a quote<\/p>/);
  assert.doesNotMatch(card, /data-money=/);
});

test('the booking card opens the request on the multi-day tour, the nights left to the traveller; the related tour is linked', () => {
  const html = render(GARDEN);
  for (const d of garden.outline) {
    if (d.tour) assert.match(html, new RegExp(`href="\\.\\./\\.\\./tours/${d.tour}/"`), d.tour);
    if (d.transfer) assert.match(html, new RegExp(`href="\\.\\./\\.\\./transfers/#${d.transfer}"`), d.transfer);
  }
  assert.equal((html.match(/<li class="outline__day">/g) || []).length, garden.outline.length, 'every suggested day');
  assert.match(html, /href="\.\.\/\.\.\/tours\/cape-winelands-private-tour\/"/, 'the related day tour');
  assert.match(html, /<form class="enquiry-card" action="\.\.\/\.\.\/enquire\/" method="get" data-plan-form>/);
  assert.match(html, /<input type="hidden" name="tour" value="garden-route-private-tour">/);
  assert.doesNotMatch(html, /<input type="hidden" name="nights"/, 'no fixed length');
  const select = /<select class="sfield__control" name="nights"[\s\S]*?<\/select>/.exec(html)?.[0] || '';
  assert.deepEqual([...select.matchAll(/<option value="(\d*)">/g)].map((m) => m[1]), ['', ...Array.from({ length: 12 }, (_, i) => String(i + 2))], 'two to thirteen nights, or not sure');
  assert.match(html, /href="\.\.\/\.\.\/enquire\/\?type=tour&amp;tour=garden-route-private-tour"/, 'the Make It Yours link');
  assert.doesNotMatch(html, /tour=garden-route-private-tour&amp;nights=/, 'no length is suggested for the traveller');
});

test('the Garden Route page uses its own photographs; the route sketch stays a labelled image, decorative on cards', () => {
  const html = render(GARDEN);
  assert.match(html, /assets\/img\/rooiberg-red-chair-\d+\.(avif|webp|jpg)/, 'its own hero photograph');
  assert.doesNotMatch(html, /<svg class="route-art"/, 'no sketch where a photograph exists');
  const sketch = routeArt({ id: 'route-test' });
  assert.match(sketch, /<svg class="route-art"[^>]*role="img" aria-labelledby="route-test-title route-test-desc"/);
  assert.match(sketch, /<desc id="route-test-desc">An illustrated route, not to scale: from Cape Town east/);
  // The sketch names Good Times' tour, never another operator's product
  assert.doesNotMatch(sketch, /Garden Route Explorer/); // brand-guard-allow: the template's earlier product name must not return
  const card = packageCard({ ...garden, images: { ...garden.images, card: null } }, preview);
  assert.match(card, /<svg class="route-art"[^>]*aria-hidden="true"/);
  assert.doesNotMatch(card, /role="img" aria-labelledby="route-card/);
});

test('catalogue links: the tours page lists the multi-day tours, the footer links them, and every page is in the sitemap order of pages', async () => {
  const { pages: tourPages } = await import('../src/pages/tours.mjs');
  const tours = layout(tourPages.find((p) => p.path === 'tours/index.html'), preview);
  for (const p of packages) assert.match(tours, new RegExp(`href="\\.\\./packages/${p.slug}/"`), p.slug);
  assert.match(tours, /href="\.\.\/packages\/">Explore Multi-day Tours/);
  // Multi-day cards carry no data-categories, so the tour chips never hide them.
  assert.doesNotMatch(/<article class="card card--package"[^>]*>/.exec(tours)[0], /data-categories/);
  assert.match(render('packages/index.html'), /<li><a href="\.\.\/packages\/">Multi-day: the Garden Route<\/a><\/li>/);
  assert.deepEqual(pages.map((p) => p.path), ['packages/index.html', GARDEN]);
  for (const p of pages) assert.notEqual(p.noindex, true, `${p.path} is indexable in production`);
});

/* ---------- requests ---------- */

async function submit(body) {
  const res = await handle(...post('/api/enquiries', body, { headers: { 'idempotency-key': key() } }));
  const json = await res.json();
  assert.equal(res.status, 201, JSON.stringify(json));
  const row = await one('SELECT * FROM enquiries WHERE reference_number = $1', [json.reference]);
  const logs = (await query(`SELECT template, recipient, status, provider_message_id FROM email_log WHERE enquiry_id = $1 ORDER BY template DESC`, [row.id])).rows;
  const read = async (l) => readFile(join(OUTBOX, `${l.provider_message_id}.eml`), 'utf8');
  return { json, row, logs, read };
}

test('a multi-day request is stored on the tour path with its nights, and both emails name the tour', async () => {
  const body = { ...validTour(), tour_slug: 'garden-route-private-tour', nights: 6, preferred_date: inDays(60), email: 'package@example.com', name: 'Pat Package', children: 0, children_ages: '' };
  const { json, row, logs, read } = await submit(body);
  assert.equal(json.enquiry_type, 'tour');
  assert.equal(row.tour_slug, 'garden-route-private-tour');
  assert.equal(row.nights, 6);
  assert.equal(row.status, 'NEW');
  assert.equal(json.emailed, true);

  const team = await read(logs[0]);
  assert.equal(emlSubject(team), `Multi-day ${json.reference} · Garden Route Private Tour · ${formatShortDate(body.preferred_date, { weekday: false })} · 6 nights · 2 adults`);
  const [tText, tHtml] = decodeEml(team);
  assert.ok(tHtml.includes('New multi-day tour enquiry'), 'team html eyebrow');
  for (const needle of ['Multi-day tour enquiry', 'Garden Route Private Tour', 'Start date', '6 nights', 'Hotel in Sea Point']) {
    assert.ok(tText.includes(needle), `team text: ${needle}`);
    assert.ok(tHtml.includes(needle), `team html: ${needle}`);
  }

  const ack = await read(logs[1]);
  assert.equal(emlSubject(ack), `Your Good Times multi-day tour enquiry ${json.reference}: received, not yet confirmed`);
  const [aText] = decodeEml(ack);
  assert.match(aText, /This is not yet a confirmed booking\./);
  assert.match(aText, /Multi-day tour: Garden Route Private Tour/);
  assert.match(aText, /Nights: 6 nights/);
});

test('without nights the request says "not sure yet"; nights for a day tour are dropped; another length is a different request', async () => {
  const base = { ...validTour(), tour_slug: 'garden-route-private-tour', preferred_date: inDays(70), email: 'nights@example.com', children: 0, children_ages: '' };
  const unsure = await submit({ ...base, nights: '' });
  assert.equal(unsure.row.nights, 0);
  const [uText] = decodeEml(await unsure.read(unsure.logs[0]));
  assert.match(uText, /Nights: Not sure yet/);
  assert.doesNotMatch(emlSubject(await unsure.read(unsure.logs[0])), /nights/);

  // Same person, same tour, a different length within the duplicate window: a new request, not a duplicate.
  const longer = await submit({ ...base, nights: 5 });
  assert.equal(longer.row.nights, 5);

  const day = await submit({ ...validTour(), email: 'day-nights@example.com', nights: 9 });
  assert.equal(day.row.nights, 0);
  assert.match(emlSubject(await day.read(day.logs[0])), /^Tour GT-/);
});
