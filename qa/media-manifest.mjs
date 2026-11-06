#!/usr/bin/env node
/**
 * The media audit's asset manifest (audit/image-asset-manifest.json): one record per photograph and film on the site,
 * with its source, rights, renditions, hashes and every place a browser saw it.
 *
 *   node qa/media-manifest.mjs --inventory=<inventory-1440.json> --drive=<drive.tsv> --phash=<phash.json> --out=<file>
 *
 *   --inventory  qa/media-audit.mjs's inventory of the deployed site (where each photograph is shown)
 *   --drive      the Drive library listing, "<file id>\t<bytes>\t<file name>" per line (provenance)
 *   --phash      {"<slot>": {"dhash": "…", "phash": "…"}} for the largest rendition of each slot (perceptual IDs)
 *   --match      optional "<slot>\t<Drive file name>" lines: the library file an older slot's master was matched to by
 *                perceptual hash (pHash distance ≤ 2), for slots whose master predates the library's names
 * Hashes are SHA-256 of the master in media-src/ where it is present (it is git-ignored) and of every rendition.
 */
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { images, generated, ORIGIN_NOTES } from '../src/data/images.mjs';
import { CAPTIONS } from '../src/data/photo-captions.mjs';

const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').slice(k.length + 3);
const inv = JSON.parse(readFileSync(arg('inventory'), 'utf8'));
const drive = Object.fromEntries(
  readFileSync(arg('drive'), 'utf8')
    .trim()
    .split('\n')
    .map((l) => l.split('\t'))
    .map(([id, bytes, name]) => [name, { id, bytes: Number(bytes) }]),
);
const phash = arg('phash') && existsSync(arg('phash')) ? JSON.parse(readFileSync(arg('phash'), 'utf8')) : {};
const match = arg('match') && existsSync(arg('match')) ? Object.fromEntries(readFileSync(arg('match'), 'utf8').trim().split('\n').map((l) => l.split('\t'))) : {};
const renditions = JSON.parse(readFileSync(new URL('../src/data/images.generated.json', import.meta.url), 'utf8'));
const sha = (f) => createHash('sha256').update(readFileSync(f)).digest('hex');
const LABEL = { T: 'editorial photograph (Good Times upload)', W: 'editorial photograph (Good Times website)', U: 'editorial photograph (Good Times website, enlarged by the owner)', S: 'editorial photograph (supplied by the owner)', O: 'editorial photograph (a guest’s, approved by the owner)', L: 'editorial photograph (third party, openly licensed: not Good Times’)', G: 'AI-generated illustration (not a photograph)' };

// Where a browser saw each slot (the inventory at 1440 px, every route)
const seen = {};
for (const [route, { items }] of Object.entries(inv)) {
  for (const it of items) {
    if (!it.slot || /svg$|^data:/.test(it.slot)) continue;
    (seen[it.slot] ||= []).push({ route, section: it.section.id || it.section.cls, heading: it.section.heading, component: it.component.split(' < ').slice(0, 2).join(' < '), caption: it.caption, hidden: it.hidden, rendered: it.box && `${it.box.w}×${it.box.h}`, loaded: it.file, density: it.density, crop: it.crop });
  }
}

const records = [...images, ...generated].map((i) => {
  const r = renditions[i.name] || {};
  const file = i.src ? i.src.split('/').pop() : null;
  const master = i.src ? new URL(`../media-src/${i.src}`, import.meta.url) : null;
  const d = file && drive[file];
  const formats = ['avif', 'webp'];
  const files = (r.widths || []).flatMap((w) => formats.map((ext) => `src/assets/img/${i.name}-${w}.${ext}`)).filter((f) => existsSync(f));
  const places = seen[i.name] || [];
  const visible = places.filter((p) => !p.hidden);
  return {
    slot: i.name,
    source: i.origin === 'L' ? { url: i.source, file, license: i.license, licenseUrl: i.licenseUrl, credit: i.credit } : d ? { drive: { id: d.id, url: `https://drive.google.com/file/d/${d.id}/view`, file, bytes: d.bytes } } : { file: i.src || '(made by a pipeline: see the rights register)', ...(match[i.name] && drive[match[i.name]] ? { driveMatch: { id: drive[match[i.name]].id, file: match[i.name], method: 'perceptual hash, pHash distance ≤ 2' } } : {}) },
    masterSha256: master && existsSync(master) ? sha(master) : null,
    origin: i.origin,
    rights: ORIGIN_NOTES[i.origin],
    label: LABEL[i.origin],
    alt: i.alt,
    caption: CAPTIONS[i.name] || null,
    focus: i.focus,
    width: r.width || null,
    height: r.height || null,
    renditionWidths: r.widths || [],
    formats: files.length ? formats : [],
    bytes: Object.fromEntries(files.map((f) => [f.split('/').pop(), statSync(f).size])),
    renditionSha256: Object.fromEntries(files.map((f) => [f.split('/').pop(), sha(f)])),
    perceptual: phash[i.name] ? { dhash: phash[i.name].dhash, phash: phash[i.name].phash } : null,
    placements: places.map(({ route, section, heading, component, caption, hidden, rendered, loaded, density, crop }) => ({ route, section, heading, component, caption, hidden, rendered, loaded, density, crop })),
    usageCount: places.length,
    visiblePlacements: visible.length,
    approved: { T: 'business upload, approved 3 Nov 2026 (P1 consent open)', W: 'business website photograph (P1 consent open)', U: 'business website photograph (P1 consent open)', S: 'supplied by the owner (P2 provenance open)', O: 'approved by the owner in the Drive file name (P7 photographer permission open)', L: 'open licence (P8: keep until Good Times has its own?)', G: 'the owner’s direction (P5, M5)' }[i.origin],
    verification: places.length ? 'rendered on the deployed preview (qa/media-audit.mjs); unique placement checked (qa/media-duplicates.mjs)' : 'not used on any page (kept in the manifest)',
  };
});
records.push({
  slot: 'beach-film-1280.mp4',
  source: { drive: { id: '1hfka3frMV2pH8Hk1UGYdRvfDSuuiUSKC', url: 'https://drive.google.com/file/d/1hfka3frMV2pH8Hk1UGYdRvfDSuuiUSKC/view', file: 'section-2-video.mp4', bytes: 7942174 } },
  masterSha256: existsSync(new URL('../media-src/video/section-2-video.mp4', import.meta.url)) ? sha(new URL('../media-src/video/section-2-video.mp4', import.meta.url)) : null,
  origin: 'G',
  rights: ORIGIN_NOTES.G,
  label: 'AI-generated film (not a recording of a tour): the owner’s',
  alt: 'decorative (aria-hidden); its poster beach-film-poster carries the description',
  width: 1280,
  height: 720,
  format: 'video/mp4 (H.264 High, 24 fps, 168 frames, 7.0 s loop, no audio, fast start)',
  bytes: { 'beach-film-1280.mp4': statSync('src/assets/video/beach-film-1280.mp4').size },
  renditionSha256: { 'beach-film-1280.mp4': sha('src/assets/video/beach-film-1280.mp4') },
  placements: [{ route: '/', section: 'sand-journey', component: 'sand-journey__film < sand-journey__beach' }],
  usageCount: 1,
  approved: 'the owner’s direction (6 Nov 2026 brief; M5: confirm it is AI-generated)',
  verification: 'qa/beach-film.mjs on the deployed preview',
});
const out = arg('out');
writeFileSync(out, JSON.stringify({ generated: new Date().toISOString(), inventory: arg('inventory'), count: records.length, records }, null, 1) + '\n');
console.log(`${records.length} records → ${out}`);
