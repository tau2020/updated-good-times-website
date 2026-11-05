// The review cards (D57) show our own short summary of each Tripadvisor review, labelled as a summary and linked to
// the original: a guest's own words are quoted only with their permission, and none is on record, so no entry
// carries quoted text. Each rating is the reviewer's own. A reviewer's own profile photo appears only once the owner
// has supplied its file (shown at the owner's request; consent pending, docs/APPROVAL_REGISTER.md › R2).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { reviews, pullQuote, reviewSource } from '../src/data/reviews.mjs';
import { reviewerPhoto, REVIEWER_FILE } from '../src/partials/reviewer-photo.mjs';
import { tourBySlug } from '../src/data/tours.mjs';
import { services } from '../src/data/transfers.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
/** A Tripadvisor address's listing id (d19714975). */
const listingOf = (url) => /-d(\d+)-/.exec(url || '')?.[1];

test('every review is our own short summary, linked to the original review on the matching listing; no guest’s words are quoted', () => {
  assert.ok(reviews.length >= 2);
  assert.equal(pullQuote, null, 'no verbatim pull-quote without the reviewer’s permission');
  assert.match(reviewSource.url, /^https:\/\/www\.tripadvisor\.co\.za\/Attraction_Review-g312659-d19611200-/, 'Good Times’ own listing');
  for (const r of reviews) {
    assert.equal(r.quote, undefined, `${r.author}: no quoted review text`);
    assert.equal(r.excerpt, undefined, `${r.author}: no excerpt`);
    assert.ok(r.summary && r.summary.trim().length > 20, `${r.author}: has a summary`);
    assert.ok(r.summary.length <= 220, `${r.author}: the summary fits a card (${r.summary.length} characters)`);
    assert.ok(!/\n/.test(r.summary), `${r.author}: one passage, no paragraph breaks`);
    assert.doesNotMatch(r.summary, /[“”"]/, `${r.author}: a paraphrase, with no quoted words`);
    assert.match(r.url, /^https:\/\/www\.tripadvisor\.co\.za\/ShowUserReviews-g312659-d\d+-r\d+-/, `${r.author}: the original review`);
    assert.match(r.written, /^\d{4}-\d{2}-\d{2}$/, `${r.author}: when it was written`);
    // The review sits on the listing of the product it names
    const product = r.tour ? tourBySlug(r.tour) : services.find((s) => s.id === r.service);
    assert.ok(product, `${r.author}: names a real Good Times tour or service`);
    if (product.tripadvisor) assert.equal(listingOf(r.url), listingOf(product.tripadvisor.url), `${r.author}: on ${product.slug || product.id}’s listing`);
  }
});

test('a rating is only ever a whole number from 1 to 5, and none is invented', () => {
  for (const r of reviews) {
    if (r.rating === undefined) continue;
    assert.ok(Number.isInteger(r.rating) && r.rating >= 1 && r.rating <= 5, `${r.author}: rating ${r.rating}`);
    assert.ok(r.url, `${r.author}: a recorded rating links the review it comes from`);
  }
});

test('each reviewer has one photo file name, the same on every review of theirs, and a photo shows only once its file exists', () => {
  const byAuthor = new Map();
  for (const r of reviews) {
    assert.match(r.avatar, REVIEWER_FILE, `${r.author}: a plain lower-case file name`);
    if (byAuthor.has(r.author)) assert.equal(r.avatar, byAuthor.get(r.author), `${r.author}: one photo for all their reviews`);
    byAuthor.set(r.author, r.avatar);
    const supplied = existsSync(join(HERE, '..', 'src', 'assets', 'img', 'reviewers', r.avatar));
    assert.equal(reviewerPhoto(r.avatar), supplied ? `assets/img/reviewers/${r.avatar}` : '', `${r.author}: never a broken image`);
  }
  // Two people never share a file
  assert.equal(new Set(byAuthor.values()).size, byAuthor.size);
  // The helper itself: a supplied file is used, a missing one or an unsafe name never is
  assert.equal(reviewerPhoto('dave-f.jpg', { exists: () => true }), 'assets/img/reviewers/dave-f.jpg');
  assert.equal(reviewerPhoto('dave-f.jpg', { exists: () => false }), '');
  for (const bad of ['', undefined, '../x.jpg', 'Dave F.jpg', 'x.svg']) assert.equal(reviewerPhoto(bad, { exists: () => true }), '', String(bad));
});
