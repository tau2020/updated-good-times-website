#!/usr/bin/env node
/**
 * Before/after composites for qa/surgical-change-report.md, from two runs of qa/surgical-shots.mjs (the baseline
 * deployment and the feature deployment). Each composite puts the baseline's section left and the feature's right,
 * captioned, at one width; sections are matched by their class, so a removed section pairs with what replaced it.
 * Needs ImageMagick (`convert`), as the image pipeline does.
 *
 *   node qa/surgical-compare.mjs --before=<dir> --after=<dir> --out=qa/surgical/compare
 *        [--widths=360,390,768,1024,1440] [--before-label=…] [--after-label=…] [--max=1800]
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const run = promisify(execFile);
const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=').slice(1).join('=') || d;
const BEFORE = arg('before');
const AFTER = arg('after');
const OUT = arg('out', 'qa/surgical/compare');
const MAX = Number(arg('max', '1800'));
const widths = arg('widths', '360,390,768,1024,1440').split(',').map(Number);
const BL = arg('before-label', 'BEFORE');
const AL = arg('after-label', 'AFTER');
if (!BEFORE || !AFTER) {
  console.error('usage: node qa/surgical-compare.mjs --before=<dir> --after=<dir> [--out=<dir>]');
  process.exit(2);
}

/**
 * What to compare: [route, label, the before section's key, the after section's key]. A key is matched against the
 * capture's file name (route--NN-<key>.jpg); null on one side means the section exists only on the other.
 */
const PAIRS = [
  ['home', 'header-and-hero', 'section-hero', 'section-hero'],
  ['home', 'sand-journey', 'sand-journey', 'sand-journey'],
  ['home', 'after-the-sand-journey', 'lc-sun', 'gt-credentials'],
  ['home', 'peninsula-photograph', null, 'lc-memory'],
  ['home', 'ch01-coast-road', 'lc-scene-road', 'lc-scene-road'],
  ['home', 'ch02-moments', 'lc-moments', 'lc-moments'],
  ['home', 'ch03-destinations', 'lc-film', 'lc-film'],
  ['home', 'interlude-adventure', 'lc-wild', 'lc-wild'],
  ['home', 'ch04-ways-and-buttons', 'lc-ways', 'lc-ways'],
  ['home', 'ch05-people', 'lc-people', 'lc-people'],
  ['home', 'interlude-taste', 'taste', 'taste'],
  ['home', 'ch08-easy', 'lc-ease', 'lc-ease'],
  ['home', 'ch09-reviews', 'stories', 'stories'],
  ['home', 'ch10-final-call', 'invite', 'invite'],
  ['home', 'footer', 'footer', 'footer'],
  ['tours', 'tours-banner', 'banner', 'banner'],
  ['tours', 'tours-catalogue', 'section-paper', 'section-paper'],
  ['peninsula', 'peninsula-title', 'tour-title', 'tour-title'],
  ['peninsula', 'peninsula-overview', 'tabs', 'tabs'],
  ['winelands', 'winelands-overview', 'tabs', 'tabs'],
  ['transfers', 'transfers-banner', 'banner', 'banner'],
  ['about', 'about-story', 'section-section', 'section-section'],
  ['reviews', 'reviews-page', 'reviews-photo', 'reviews-photo'],
  ['contact', 'contact', 'page-head', 'page-head'],
  ['enquire-tour', 'booking-form', 'enquiry-section', 'enquiry-section'],
];

const find = async (dir, route, key) => {
  if (!key || !existsSync(dir)) return '';
  const files = (await readdir(dir)).filter((f) => f.startsWith(`${route}--`) && !f.startsWith(`${route}-motion`) && f.includes(key)).sort();
  return files.length ? join(dir, files[0]) : '';
};

const caption = (text) => ['-gravity', 'north', '-background', '#10241d', '-fill', '#ffffff', '-font', 'DejaVu-Sans', '-pointsize', '22', '-splice', '0x40', '-annotate', '+0+8', text];

await mkdir(OUT, { recursive: true });
const made = [];
for (const w of widths) {
  const dir = join(OUT, String(w));
  await mkdir(dir, { recursive: true });
  for (const [route, label, bKey, aKey] of PAIRS) {
    const b = await find(join(BEFORE, String(w)), route, bKey);
    const a = await find(join(AFTER, String(w)), route, aKey);
    if (!b && !a) continue;
    const out = join(dir, `${label}.jpg`);
    const blank = ['-size', `${w}x200`, 'xc:#f3f7f5', '-gravity', 'center', '-pointsize', '20', '-fill', '#5b6670', '-annotate', '+0+0'];
    const left = b ? ['(', b, ...caption(`${BL} · ${w}px`), ')'] : ['(', ...blank, 'Not on the page before', ...caption(`${BL} · ${w}px`), ')'];
    const right = a ? ['(', a, ...caption(`${AL} · ${w}px`), ')'] : ['(', ...blank, 'Removed', ...caption(`${AL} · ${w}px`), ')'];
    await run('convert', [...left, ...right, '-background', '#ffffff', '-gravity', 'north', '-splice', '0x0', '+append', '-resize', `${MAX}x6000>`, '-quality', '68', '-strip', out]);
    made.push({ width: w, label, before: b, after: a, file: out });
  }
  // The join after the sand journey with motion on: the last frames of the scene and what follows, before and after
  const frames = async (d) => (existsSync(d) ? (await readdir(d)).filter((f) => f.startsWith('home-motion--')).sort().map((f) => join(d, f)) : []);
  const fb = await frames(join(BEFORE, String(w)));
  const fa = await frames(join(AFTER, String(w)));
  if (fb.length && fa.length) {
    const out = join(dir, 'motion-sand-journey-exit.jpg');
    const col = (list, text) => ['(', ...list.slice(1, 5), '-append', ...caption(text), ')'];
    await run('convert', [...col(fb, `${BL} · motion · ${w}px`), ...col(fa, `${AL} · motion · ${w}px`), '+append', '-resize', `${MAX}x9000>`, '-quality', '66', '-strip', out]);
    made.push({ width: w, label: 'motion-sand-journey-exit', file: out });
  }
}
await writeFile(join(OUT, 'index.json'), JSON.stringify(made.map((m) => ({ ...m, before: m.before?.split('/').slice(-2).join('/'), after: m.after?.split('/').slice(-2).join('/') })), null, 1));
console.log(`${made.length} composites → ${OUT}`);
