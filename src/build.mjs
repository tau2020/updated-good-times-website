#!/usr/bin/env node
/**
 * Good Times in Cape Town — static site builder
 * ------------------------------------------
 * Zero-dependency. Reads page modules from src/pages, wraps them in the
 * shared layout, copies assets, and writes sitemap.xml + robots.txt, _headers
 * and _redirects (Cloudflare Pages).
 *
 *   node src/build.mjs          build once into ./site
 *   node src/build.mjs --watch  rebuild on change (dev)
 *
 * SITE_ENV=preview (default) builds a noindex client preview: robots.txt
 * disallows everything and no sitemap is published. SITE_ENV=production
 * builds the indexable site.
 */
import { readdir, mkdir, writeFile, cp, rm } from 'node:fs/promises';
import { watch } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { site } from './data/site.mjs';
import { layout } from './partials/layout.mjs';
import { headersFile } from './partials/security.mjs';
import { redirectsFile } from './data/redirects.mjs';

const SRC = dirname(fileURLToPath(import.meta.url));
const ROOT = join(SRC, '..');
const OUT = join(ROOT, 'site');
const PAGES = join(SRC, 'pages');

async function build() {
  const started = Date.now();
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  await cp(join(SRC, 'assets'), join(OUT, 'assets'), { recursive: true });

  const files = (await readdir(PAGES)).filter((f) => f.endsWith('.mjs')).sort();
  const urls = [];
  const seen = new Set();
  for (const file of files) {
    const mod = await import(pathToFileURL(join(PAGES, file)).href + `?t=${Date.now()}`);
    const pages = (Array.isArray(mod.pages) ? mod.pages : [mod.page]).filter(Boolean);
    for (const page of pages) {
      if (seen.has(page.path)) throw new Error(`Duplicate page path ${page.path} (${file})`);
      seen.add(page.path);
      const html = layout(page, site);
      const outPath = join(OUT, page.path);
      await mkdir(dirname(outPath), { recursive: true });
      await writeFile(outPath, html, 'utf8');
      if (!page.noindex) urls.push({ loc: page.path, priority: page.priority ?? 0.6, changefreq: page.changefreq ?? 'monthly' });
    }
  }

  await writeFile(join(OUT, '_headers'), headersFile({ preview: site.preview }), 'utf8');
  // The current website's addresses, redirected to their pages here (used once the domain moves).
  await writeFile(join(OUT, '_redirects'), redirectsFile(), 'utf8');

  const pretty = (p) => (p === 'index.html' ? '' : p.replace(/index\.html$/, ''));
  if (site.preview) {
    await writeFile(join(OUT, 'robots.txt'), 'User-agent: *\nDisallow: /\n', 'utf8');
  } else {
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${site.url}/${pretty(u.loc)}</loc><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`).join('\n')}
</urlset>
`;
    await writeFile(join(OUT, 'sitemap.xml'), sitemap, 'utf8');
    await writeFile(join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${site.url}/sitemap.xml\n`, 'utf8');
  }

  console.log(`built ${seen.size} pages (${site.env}) → ${relative(ROOT, OUT)}/ in ${Date.now() - started}ms`);
}

await build();

if (process.argv.includes('--watch')) {
  let timer;
  watch(SRC, { recursive: true }, () => {
    clearTimeout(timer);
    timer = setTimeout(() => build().catch((e) => console.error(e)), 120);
  });
  console.log('watching src/ …');
}
