// The reviews in the reviewers' own words (the owner's direction of 8 Nov 2026: "use client original reviews, do not
// summarise reviews"), from the owner's archive: each entry as the archive records it, linked to the review itself on
// the listing of the product it names. Nothing is summarised or reworded. A reviewer's own profile photo appears only
// once the owner has supplied its file (consent pending, docs/APPROVAL_REGISTER.md › R2).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { guestReviews, reviewsOf, PRODUCTS, listingOf, REVIEW_ARCHIVE } from '../src/data/guest-reviews.mjs';
import { reviewerPhoto, REVIEWER_FILE } from '../src/partials/reviewer-photo.mjs';
import { avatarInitial, avatarTone } from '../src/partials/review-wall.mjs';
import { tourBySlug } from '../src/data/tours.mjs';
import { services } from '../src/data/transfers.mjs';
import { site } from '../src/data/site.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

test('every review is the archive’s own record: the reviewer’s title, name, date, rating, product and link; nothing summarised', () => {
  assert.equal(guestReviews.length, 81, 'every review the archive records');
  assert.ok(guestReviews.length <= site.tripadvisor.reviewCount);
  assert.equal(new Set(guestReviews.map((r) => r.id)).size, guestReviews.length, 'no review twice');
  assert.deepEqual(guestReviews.map((r) => r.date), [...guestReviews.map((r) => r.date)].sort().reverse(), 'newest first');
  assert.equal(REVIEW_ARCHIVE.usageRights, 'not requested', 'the archive’s own record of the reviewers’ rights, kept as it is');
  for (const r of guestReviews) {
    const who = `${r.name} (${r.id})`;
    assert.equal(r.platform, 'Tripadvisor', who);
    assert.ok(r.title && r.title === r.title.trim() && r.title.length <= 140, `${who}: the reviewer’s own title`);
    for (const field of ['summary', 'excerpt', 'quote', 'text']) assert.equal(r[field], undefined, `${who}: no ${field} of ours`);
    assert.ok(r.name && r.name === r.name.trim(), `${who}: a name`);
    assert.match(r.date, /^20\d\d-\d\d-\d\d$/, `${who}: when it was written`);
    assert.ok(r.date <= '2026-11-05', `${who}: written before the archive was compiled`);
    assert.ok(Number.isInteger(r.rating) && r.rating >= 1 && r.rating <= 5, `${who}: the reviewer’s own rating`);
    assert.match(r.url, new RegExp(`^https://www\\.tripadvisor\\.co\\.za/ShowUserReviews-g312659-d\\d+-r${r.id}-[A-Za-z_]+-Cape_Town_Central_Western_Cape\\.html$`), `${who}: the review itself`);
    assert.ok(Object.hasOwn(PRODUCTS, listingOf(r.url)), `${who}: a Good Times listing`);
    assert.ok(r.product, `${who}: the product reviewed`);
    // The review sits on the listing of the product it names, and that product is a real Good Times tour or service
    if (r.tour) {
      const t = tourBySlug(r.tour);
      assert.ok(t, `${who}: ${r.tour}`);
      assert.equal(listingOf(t.tripadvisor?.url), listingOf(r.url), `${who}: on ${t.slug}’s listing`);
    } else if (r.service) {
      assert.ok(services.find((s) => s.id === r.service), `${who}: ${r.service}`);
    } else {
      assert.equal(listingOf(r.url), listingOf(site.tripadvisor.url), `${who}: the operator’s own listing`);
    }
  }
});

test('a tour’s reviews are those of its own listing, and every listed tour with reviews in the archive has them', () => {
  for (const [id, where] of Object.entries(PRODUCTS)) {
    const list = where.tour || where.service ? reviewsOf(where) : guestReviews.filter((r) => !r.tour && !r.service);
    assert.ok(list.length > 0, `listing ${id}`);
    for (const r of list) assert.equal(listingOf(r.url), id);
  }
  assert.deepEqual(reviewsOf({}), []);
  assert.equal(reviewsOf({ tour: 'cape-peninsula-private-tour' }).length + reviewsOf({ tour: 'cape-winelands-private-tour' }).length + reviewsOf({ tour: 'township-private-tour' }).length + reviewsOf({ tour: 'cape-town-city-private-tour' }).length + reviewsOf({ service: 'airport' }).length + guestReviews.filter((r) => !r.tour && !r.service).length, guestReviews.length);
});

test('each reviewer has one photo file name, the same on every review of theirs, and a photo shows only once its file exists; the initial and tone are stable', () => {
  const byName = new Map();
  for (const r of guestReviews) {
    assert.match(r.avatar, REVIEWER_FILE, `${r.name}: a plain lower-case file name`);
    if (byName.has(r.name)) assert.equal(r.avatar, byName.get(r.name), `${r.name}: one photo for all their reviews`);
    byName.set(r.name, r.avatar);
    const supplied = existsSync(join(HERE, '..', 'src', 'assets', 'img', 'reviewers', r.avatar));
    assert.equal(reviewerPhoto(r.avatar), supplied ? `assets/img/reviewers/${r.avatar}` : '', `${r.name}: never a broken image`);
    assert.match(avatarInitial(r.name), /^[\p{Lu}\p{N}]$/u, `${r.name}: an initial`);
    assert.equal(avatarTone(r.name), avatarTone(r.name));
    assert.ok(avatarTone(r.name) >= 0 && avatarTone(r.name) < 6);
  }
  // The helper itself: a supplied file is used, a missing one or an unsafe name never is
  assert.equal(reviewerPhoto('dave-f.jpg', { exists: () => true }), 'assets/img/reviewers/dave-f.jpg');
  assert.equal(reviewerPhoto('dave-f.jpg', { exists: () => false }), '');
  for (const bad of ['', undefined, '../x.jpg', 'Dave F.jpg', 'x.svg']) assert.equal(reviewerPhoto(bad, { exists: () => true }), '', String(bad));
  assert.equal(avatarInitial('isaac b'), 'I');
  assert.equal(avatarInitial('…'), '·');
});
