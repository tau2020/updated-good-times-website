#!/usr/bin/env node
/**
 * The hero film's freeze mask, for src/tools/build-video.sh.
 *
 *   node src/tools/hero-moment-mask.mjs <out.pgm>
 *
 * White where the supplied film may keep moving: the cloud pouring over Table Mountain and the
 * Atlantic beyond the blonde friend's shoulder. Black everywhere else, where every frame is held
 * on the film's first frame: the five friends, the café, the town. The polygons are drawn in the
 * source's own 1280×720 pixels from a motion map of the film (the per-pixel difference from its
 * first frame across all 192 frames) and the first frame itself. Every edge stays at least 12 px
 * clear of a head, a shoulder or a hand, so the feathering (gblur, sigma 3, in build-video.sh)
 * never carries more than 1/255 of the moving film onto a person. Written 4× supersampled as a binary PGM, which ffmpeg reads directly.
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const WIDTH = 1280;
export const HEIGHT = 720;

/** [x, y] vertices, clockwise, in source pixels. */
export const MOVING = [
  // The "tablecloth": the cloud band over Table Mountain, stopping short of the two heads below it
  [[190, 78], [600, 78], [770, 118], [770, 228], [700, 228], [660, 226], [630, 213], [575, 208], [520, 210], [480, 232], [430, 236], [330, 232], [190, 176]],
  // The sea: the surf on the rocks and the open water, following the blonde friend's hair and shirt
  [[1090, 366], [1280, 366], [1280, 628], [1279, 622], [1256, 580], [1234, 540], [1224, 520], [1214, 493], [1194, 470], [1124, 447], [1090, 425]],
];

const inside = (x, y, poly) => {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
};

export function rasterize({ samples = 4 } = {}) {
  const px = Buffer.alloc(WIDTH * HEIGHT);
  const boxes = MOVING.map((poly) => {
    const xs = poly.map((p) => p[0]);
    const ys = poly.map((p) => p[1]);
    return { poly, x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
  });
  const n = samples * samples;
  for (const { poly, x0, x1, y0, y1 } of boxes) {
    for (let y = Math.max(0, Math.floor(y0)); y < Math.min(HEIGHT, Math.ceil(y1) + 1); y++) {
      for (let x = Math.max(0, Math.floor(x0)); x < Math.min(WIDTH, Math.ceil(x1) + 1); x++) {
        let count = 0;
        for (let sy = 0; sy < samples; sy++) {
          for (let sx = 0; sx < samples; sx++) if (inside(x + (sx + 0.5) / samples, y + (sy + 0.5) / samples, poly)) count++;
        }
        if (count) px[y * WIDTH + x] = Math.max(px[y * WIDTH + x], Math.round((255 * count) / n));
      }
    }
  }
  return Buffer.concat([Buffer.from(`P5\n${WIDTH} ${HEIGHT}\n255\n`), px]);
}

// fileURLToPath, not the raw URL: the checkout path has a space, which the URL would percent-encode
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const out = process.argv[2];
  if (!out) {
    console.error('usage: node src/tools/hero-moment-mask.mjs <out.pgm>');
    process.exit(1);
  }
  writeFileSync(out, rasterize());
}
