#!/usr/bin/env node
/**
 * Image pipeline: media-src/<src> → src/assets/img/<name>-<w>.{avif,webp}
 *
 *   node src/tools/build-images.mjs            build missing renditions
 *   node src/tools/build-images.mjs --force    rebuild everything
 *   node src/tools/build-images.mjs --only=a,b rebuild named slots
 *
 * Widths never exceed the original (no upscaling). The widths produced are
 * written to src/data/images.generated.json, which the picture() helper reads
 * so pages only reference files that exist. Needs macOS `sips`, `cwebp` and
 * `avifenc` (brew install webp libavif).
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

import { images } from '../data/images.mjs';
import { tours } from '../data/tours.mjs';
import { services } from '../data/transfers.mjs';

const run = promisify(execFile);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = join(ROOT, 'media-src');
const OUT = join(ROOT, 'src', 'assets', 'img');
const MANIFEST = join(ROOT, 'src', 'data', 'images.generated.json');
const WIDTHS = [480, 800, 1200, 1600, 2000];
// Full-bleed page heroes and the home page's full-bleed scenes (`full`) get a 2000px rendition; everything else stops at 1600.
const HEROES = new Set([...tours, ...services].map((t) => t.images.hero).concat(images.filter((i) => i.full).map((i) => i.name)));
const force = process.argv.includes('--force');
const only = (process.argv.find((a) => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);

async function dims(file) {
  const { stdout } = await run('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', file]);
  const w = Number(/pixelWidth: (\d+)/.exec(stdout)[1]);
  const h = Number(/pixelHeight: (\d+)/.exec(stdout)[1]);
  return { w, h };
}

async function one(img, generated) {
  const file = join(SRC, img.src);
  if (!existsSync(file)) {
    if (generated[img.name]) return `kept ${img.name} (original not in media-src/)`;
    throw new Error(`missing original for ${img.name}: media-src/${img.src}`);
  }
  const { w, h } = await dims(file);
  const cap = HEROES.has(img.name) ? 2000 : 1600;
  const widths = WIDTHS.filter((x) => x <= w && x <= cap);
  if (!widths.length || (widths[widths.length - 1] < w * 0.9 && w < cap)) widths.push(w);
  const uniq = [...new Set(widths)];
  const tmp = join(tmpdir(), `gt-img-${img.name}-${process.pid}`);
  await mkdir(tmp, { recursive: true });
  for (const width of uniq) {
    const avif = join(OUT, `${img.name}-${width}.avif`);
    const webp = join(OUT, `${img.name}-${width}.webp`);
    if (!force && !only.length && existsSync(avif) && existsSync(webp)) continue;
    const scaled = join(tmp, `${width}.jpg`);
    await run('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '95', '--resampleWidth', String(width), file, '--out', scaled]);
    await run('cwebp', ['-quiet', '-q', '78', '-m', '6', '-metadata', 'none', scaled, '-o', webp]);
    await run('avifenc', ['-q', '50', '-s', '6', '-j', '4', '--ignore-exif', '--ignore-xmp', scaled, avif]);
  }
  await rm(tmp, { recursive: true, force: true });
  generated[img.name] = { widths: uniq, width: w, height: h };
  return `${img.name}: ${uniq.join('/')} (${w}×${h})`;
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const generated = existsSync(MANIFEST) ? JSON.parse(await readFile(MANIFEST, 'utf8')) : {};
  const queue = images.filter((i) => !only.length || only.includes(i.name));
  const workers = Array.from({ length: 4 }, async () => {
    while (queue.length) {
      const img = queue.shift();
      console.log(await one(img, generated));
    }
  });
  await Promise.all(workers);
  const sorted = Object.fromEntries(Object.entries(generated).sort(([a], [b]) => a.localeCompare(b)));
  await writeFile(MANIFEST, JSON.stringify(sorted, null, 2) + '\n');
  console.log(`wrote ${Object.keys(sorted).length} entries → src/data/images.generated.json`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
