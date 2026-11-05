#!/usr/bin/env node
/**
 * Static QA for the built site: broken internal links, missing images,
 * missing alt text, duplicate ids, heading order, and page sizes.
 *   node src/tools/check-site.mjs
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, dirname, resolve, relative } from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// fileURLToPath, not URL.pathname: a checkout path with a space would otherwise stay percent-encoded.
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SITE = join(ROOT, 'site');

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

const problems = [];
const pages = await walk(SITE);
for (const file of pages) {
  const html = await readFile(file, 'utf8');
  const rel = relative(SITE, file);
  const dir = dirname(file);
  const check = (url, kind) => {
    if (!url || /^(https?:|mailto:|tel:|data:|#|\/\/)/i.test(url)) return;
    const clean = url.split('#')[0].split('?')[0];
    if (!clean) return;
    const target = clean.startsWith('/') ? join(SITE, clean) : join(dir, clean);
    if (!existsSync(target)) problems.push(`${rel}: missing ${kind} → ${url}`);
  };
  for (const m of html.matchAll(/\b(href|src)="([^"]*)"/g)) check(m[2], m[1]);
  for (const m of html.matchAll(/\b(srcset|imagesrcset)="([^"]*)"/g))
    m[2].split(',').forEach((p) => check(p.trim().split(/\s+/)[0], 'srcset'));
  for (const m of html.matchAll(/<img\b[^>]*>/g)) if (!/\balt=/.test(m[0])) problems.push(`${rel}: <img> without alt`);
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
  const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dup.length) problems.push(`${rel}: duplicate ids ${[...new Set(dup)].join(', ')}`);
  const h1 = (html.match(/<h1\b/g) || []).length;
  if (h1 !== 1) problems.push(`${rel}: ${h1} <h1> elements`);
  if (!/<title>[^<]+<\/title>/.test(html)) problems.push(`${rel}: no title`);
  if (!/name="description" content="[^"]{40,}"/.test(html)) problems.push(`${rel}: weak/missing description`);
  if (/\b(lorem ipsum|TODO|placeholder text|undefined|\[object Object\])\b/i.test(html)) problems.push(`${rel}: placeholder-ish text`);
  const size = (await stat(file)).size;
  if (size > 200_000) problems.push(`${rel}: page is ${(size / 1024).toFixed(0)} KB`);
}

console.log(`checked ${pages.length} pages`);
if (problems.length) {
  console.log(problems.join('\n'));
  process.exitCode = 1;
} else console.log('no problems found');
