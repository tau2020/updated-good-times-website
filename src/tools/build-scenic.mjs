#!/usr/bin/env node
/**
 * The scenic backdrops' renditions: media-src/scenic/<file> → src/assets/img/scenic/<name>-<w>.{avif,webp}
 *
 *   node src/tools/build-scenic.mjs            build what is missing (every scene in src/data/scenic.mjs that is placed)
 *   node src/tools/build-scenic.mjs --force    rebuild
 *   node src/tools/build-scenic.mjs --all      also the candidates that are not placed (to try them on a preview)
 *
 * The originals are the owner's (Drive › the assets folder of 8 Nov 2026: Unsplash and Pexels photographs) and stay
 * out of the repository (media-src/ is git-ignored); the renditions are committed and served by the site itself,
 * never hot-linked from Drive. A scene's `crop` ([x, y, w, h] as fractions of the original) cuts it first, so the
 * rows no placement shows are never downloaded. A backdrop is shown faint and washed (3–16% presence), so the
 * encodes are light: AVIF at quality 40 and WebP at 58 (a scene's `quality` lowers them for texture that would cost
 * bytes no one sees), never upscaled; `widths` replaces the standard widths. Writes src/data/scenic.generated.json (the
 * widths produced and the pixel size), which src/partials/scenic.mjs reads. Needs ffmpeg, cwebp and avifenc.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile, rm, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { SCENES, PLACEMENTS } from '../data/scenic.mjs';

const run = promisify(execFile);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = join(ROOT, 'media-src', 'scenic');
const OUT = join(ROOT, 'src', 'assets', 'img', 'scenic');
const MANIFEST = join(ROOT, 'src', 'data', 'scenic.generated.json');
const force = process.argv.includes('--force');
const all = process.argv.includes('--all');

async function size(file) {
  const { stdout } = await run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0:s=x', file]);
  const [w, h] = stdout.trim().split('x').map(Number);
  return { w, h };
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const manifest = existsSync(MANIFEST) ? JSON.parse(await readFile(MANIFEST, 'utf8')) : {};
  const placed = new Set(PLACEMENTS.map((p) => p.scene));
  const tmp = join(tmpdir(), `gt-scenic-${process.pid}`);
  await mkdir(tmp, { recursive: true });
  try {
    for (const s of SCENES.filter((x) => all || placed.has(x.name))) {
      const src = join(SRC, s.file);
      if (!existsSync(src)) {
        console.warn(`missing original: media-src/scenic/${s.file} (${s.name})`);
        continue;
      }
      const o = await size(src);
      const [cx, cy, cw, ch] = s.crop || [0, 0, 1, 1];
      const box = { x: Math.round(o.w * cx), y: Math.round(o.h * cy), w: Math.round(o.w * cw), h: Math.round(o.h * ch) };
      const widths = (s.widths || (box.w >= box.h ? [800, 1280, 1920] : [600, 1000, 1400])).filter((w) => w <= box.w);
      const done = [];
      for (const w of widths) {
        const base = join(OUT, `${s.name}-${w}`);
        if (!force && existsSync(`${base}.avif`) && existsSync(`${base}.webp`)) {
          done.push(w);
          continue;
        }
        const png = join(tmp, `${s.name}-${w}.png`);
        // Crop, then a Lanczos resample to the width (height follows), sRGB, no metadata
        await run('ffmpeg', ['-v', 'error', '-y', '-i', src, '-vf', `crop=${box.w}:${box.h}:${box.x}:${box.y},scale=${w}:-2:flags=lanczos,format=rgb24`, png]);
        await run('cwebp', ['-quiet', '-q', String(s.quality?.webp ?? 58), '-m', '6', '-metadata', 'none', png, '-o', `${base}.webp`]);
        await run('avifenc', ['-q', String(s.quality?.avif ?? 40), '-s', '5', '-j', 'all', png, `${base}.avif`]);
        done.push(w);
      }
      const h = Math.round((box.h / box.w) * 1000) / 1000;
      manifest[s.name] = { widths: done, width: box.w, height: box.h, ratio: h };
      const bytes = await Promise.all(done.map(async (w) => `${w}: ${Math.round((await stat(join(OUT, `${s.name}-${w}.avif`))).size / 1024)}k avif / ${Math.round((await stat(join(OUT, `${s.name}-${w}.webp`))).size / 1024)}k webp`));
      console.log(`${s.name} (${box.w}×${box.h}): ${bytes.join(', ')}`);
    }
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
  const ordered = Object.fromEntries(Object.keys(manifest).sort().map((k) => [k, manifest[k]]));
  await writeFile(MANIFEST, `${JSON.stringify(ordered, null, 2)}\n`);
}

main().catch((e) => {
  console.error(e.stderr || e.message);
  process.exit(1);
});
