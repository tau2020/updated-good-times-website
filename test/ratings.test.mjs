/**
 * Per-product rating stats: shown only from five reviews; below that, or for a
 * product without a Tripadvisor listing of its own, the stat is left out of
 * cards, tour facts, the tour enquiry card and transfer facts. Site-wide
 * figures (264 reviews) are not affected.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { site } from '../src/data/site.mjs';
import { layout } from '../src/partials/layout.mjs';
import { showRating, MIN_REVIEWS } from '../src/partials/ui.mjs';
import { tours } from '../src/data/tours.mjs';
import { services } from '../src/data/transfers.mjs';
import { tourCard } from '../src/partials/cards.mjs';

const dir = new URL('../src/pages/', import.meta.url);
const html = {};
for (const f of readdirSync(dir).filter((f) => f.endsWith('.mjs'))) {
  const mod = await import(new URL(f, dir));
  for (const p of (Array.isArray(mod.pages) ? mod.pages : [mod.page]).filter(Boolean)) html[p.path] = layout(p, site);
}
const STAT = /(\d\.\d)(?:<\/strong>)? (?:from|·) (\d+) (?:Tripadvisor )?reviews?\b/g;
const plain = (html) => html.replace(/<[^>]+>/g, '');

test('the threshold is five reviews', () => {
  assert.equal(MIN_REVIEWS, 5);
  assert.equal(showRating({ rating: 5, reviews: 4 }), false);
  assert.equal(showRating({ rating: 5, reviews: 5 }), true);
  assert.equal(showRating(undefined), false);
});

test('no page shows a per-product rating from fewer than five reviews', () => {
  for (const [path, page] of Object.entries(html)) {
    for (const m of page.matchAll(STAT)) assert.ok(Number(m[2]) >= MIN_REVIEWS, `${path}: "${m[0]}"`);
  }
  // Every listed product has five or more today, so the rule is proved on a card with fewer.
  const listed = tours.find((t) => t.tripadvisor);
  const few = tourCard({ ...listed, tripadvisor: { ...listed.tripadvisor, reviews: MIN_REVIEWS - 1 } }, site);
  const enough = tourCard({ ...listed, tripadvisor: { ...listed.tripadvisor, reviews: MIN_REVIEWS } }, site);
  assert.doesNotMatch(plain(few), STAT, 'four reviews: no stat');
  assert.match(plain(enough), new RegExp(`5\\.0 · ${MIN_REVIEWS} reviews`), 'five reviews: the stat');
  // Products without a listing of their own never borrow a rating.
  assert.ok(tours.some((t) => !t.tripadvisor), 'some products have no listing');
});

test('products with five or more reviews keep their stat; those below lose it everywhere', () => {
  for (const t of tours) {
    const page = html[`tours/${t.slug}/index.html`];
    const ta = t.tripadvisor;
    if (!ta) {
      assert.doesNotMatch(page, /class="rating"/, `${t.slug}: no rating row without a listing`);
      assert.doesNotMatch(page, /class="enquiry-card__rating"/, `${t.slug}: no enquiry-card rating without a listing`);
      const card = /<article class="card"[\s\S]*?<\/article>/.exec(tourCard(t, site))[0];
      assert.doesNotMatch(plain(card), STAT, `${t.slug}: no card stat without a listing`);
      continue;
    }
    const fact = `${ta.rating.toFixed(1)} from ${ta.reviews} reviews`;
    const row = `${ta.rating.toFixed(1)} (${ta.reviews} Tripadvisor reviews`;
    const card = `${ta.rating.toFixed(1)} · ${ta.reviews} reviews`;
    if (ta.reviews >= MIN_REVIEWS) {
      assert.ok(plain(page).includes(fact), `${t.slug}: booking card fact`);
      assert.ok(plain(page).includes(row), `${t.slug}: rating row`);
      assert.match(page, /class="enquiry-card__rating"/, `${t.slug}: enquiry card`);
      assert.ok(html['tours/index.html'].includes(card), `${t.slug}: card`);
    } else {
      assert.doesNotMatch(page, /class="rating"/, `${t.slug}: no rating row`);
      assert.doesNotMatch(page, /class="enquiry-card__rating"/, `${t.slug}: no enquiry-card rating`);
      assert.equal(html['tours/index.html'].includes(card), false, `${t.slug}: no card stat`);
    }
  }
  for (const s of services.filter((x) => x.tripadvisor)) {
    const stat = `${s.tripadvisor.rating.toFixed(1)} from ${s.tripadvisor.reviews} reviews`;
    assert.equal(html['transfers/index.html'].includes(stat), s.tripadvisor.reviews >= MIN_REVIEWS, s.id);
  }
  // The listed figures as checked on Tripadvisor
  assert.deepEqual(tours.filter((t) => t.tripadvisor).map((t) => [t.slug, t.tripadvisor.reviews]), [
    ['cape-peninsula-private-tour', 87],
    ['cape-town-city-private-tour', 16],
    ['cape-winelands-private-tour', 39],
    ['township-private-tour', 22],
  ]);
});
