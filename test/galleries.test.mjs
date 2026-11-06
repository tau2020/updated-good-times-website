/**
 * The tour and package galleries (D71, design.md §05): every Gallery tab hangs the media system's exhibition
 * and its lightbox, not the old gallery dialog; each photograph is named, every row of the wall is full,
 * a portrait never takes a wide place, and the photo band opens the lightbox on its own photograph. A gallery shows the
 * tour's own photographs only: never its hero or its card, which the page and the tour list already show
 * (audit/image-change-register.md: one photograph, one place).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tours } from '../src/data/tours.mjs';
import { packages } from '../src/data/packages.mjs';
import { CAPTIONS } from '../src/data/photo-captions.mjs';
import { imageByName } from '../src/data/images.mjs';
import { site } from '../src/data/site.mjs';
import { layout } from '../src/partials/layout.mjs';
import { galleryItems } from '../src/partials/media.mjs';
import { imageSize } from '../src/partials/ui.mjs';
import { pages as tourPages } from '../src/pages/tours.mjs';
import { pages as packagePages } from '../src/pages/packages.mjs';

const preview = { ...site, preview: true, env: 'preview' };
const sets = [
  ...tours.map((t) => ({ path: `tours/${t.slug}/index.html`, names: [...new Set(t.images.gallery)].filter((n) => n !== t.images.hero && n !== t.images.card) })),
  ...packages.map((p) => ({ path: `packages/${p.slug}/index.html`, names: p.images.gallery || [] })),
].filter((s) => s.names.length > 1);

test('a gallery never repeats its tour’s hero or card, nor its package’s', () => {
  for (const t of [...tours, ...packages]) {
    assert.ok(!t.images.gallery.includes(t.images.hero), `${t.slug}: the hero is not in the gallery`);
    assert.ok(!t.images.gallery.includes(t.images.card), `${t.slug}: the card is not in the gallery`);
    assert.equal(new Set(t.images.gallery).size, t.images.gallery.length, `${t.slug}: no photograph twice`);
  }
});

test('every gallery photograph has a short title, and a place only where one is recorded', () => {
  for (const { names } of sets) {
    for (const name of names) {
      assert.ok(imageByName(name), `${name} is in the image manifest`);
      assert.ok(CAPTIONS[name]?.title, `${name} has a gallery title`);
      assert.equal(typeof CAPTIONS[name].place, 'string', `${name} has a place (possibly empty)`);
    }
  }
});

test('each row of a gallery wall fills the 12 columns, with one stated ratio, and a portrait never takes a wide place', () => {
  for (const { path, names } of sets) {
    const items = galleryItems(names);
    assert.deepEqual(items.map((i) => i.name).sort(), [...names].sort(), `${path}: every photograph is hung once`);
    assert.equal(items[0].name, names[0], `${path}: the tour's own photograph comes first`);
    let row = [];
    for (const it of items) {
      row.push(it);
      const used = row.reduce((sum, r) => sum + r.tile.lg[0], 0);
      if (used < 12) continue;
      assert.equal(used, 12, `${path}: a row fills 12 columns`);
      assert.equal(row.filter((r) => r.tile.lg[1] !== 'auto').length, 1, `${path}: a row states one ratio`);
      row = [];
    }
    assert.equal(row.length, 0, `${path}: no print is left on a short row`);
    for (const it of items) {
      const { width, height } = imageSize(it.name);
      if (height > width) assert.ok(it.tile.lg[0] <= 6, `${path}: the portrait ${it.name} takes a narrow place`);
    }
  }
});

test('tour and package pages hang the exhibition and its lightbox, and the photo band opens it on its own photograph', () => {
  const all = [...tourPages, ...packagePages];
  for (const { path, names } of sets) {
    const page = all.find((p) => p.path === path);
    const html = layout(page, preview);
    assert.match(html, /<ol class="lc-gallery__wall lc-scope lc-gallery__wall--panel" role="list" data-lc-gallery>/, `${path}: the wall`);
    assert.equal((html.match(/data-lc-open="/g) || []).length, names.length, `${path}: one print per photograph`);
    assert.match(html, /<dialog class="lc-lightbox lc-scope lc-dark" data-lc-lightbox/, `${path}: the lightbox`);
    assert.match(html, /assets\/css\/media\.css/, `${path}: the shared sheet`);
    assert.match(html, /assets\/js\/media\.js/, `${path}: its behaviour`);
    assert.doesNotMatch(html, /data-gallery|gallery-dialog|gallery-grid/, `${path}: nothing of the old dialog`);
    const band = /data-lc-show="(\d+)"/.exec(html);
    if (band) {
      const data = JSON.parse(/<script type="application\/json" data-lc-gallery-data>([\s\S]*?)<\/script>/.exec(html)[1]);
      const bandName = /<section class="photo-band"[\s\S]*?srcset="(?:\.\.\/)*assets\/img\/([a-z-]+?)-\d+\./.exec(html)[1];
      assert.equal(data[Number(band[1])].title, CAPTIONS[bandName].title, `${path}: the band opens on its own photograph`);
      assert.doesNotMatch(/<button[^>]*photo-band__btn[\s\S]*?<\/button>/.exec(html)[0], /<svg|→|›/, `${path}: no icon or arrow in the band's button`);
    }
  }
});
