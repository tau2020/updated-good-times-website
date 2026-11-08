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
import { readdir, mkdir, writeFile, readFile, cp, rm } from 'node:fs/promises';
import { watch, existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { site } from './data/site.mjs';
import { layout } from './partials/layout.mjs';
import { headersFile } from './partials/security.mjs';
import { redirectsFile, checkRedirects } from './data/redirects.mjs';
import { preservedMedia } from './data/legacy-urls.mjs';

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
      if (!page.noindex) urls.push(page.path);
    }
  }

  await writeFile(join(OUT, '_headers'), headersFile({ preview: site.preview }), 'utf8');

  const pretty = (p) => (p === 'index.html' ? '' : p.replace(/index\.html$/, ''));
  if (site.preview) {
    await writeFile(join(OUT, 'robots.txt'), 'User-agent: *\nDisallow: /\n', 'utf8');
  } else {
    // <loc> only: Google ignores <changefreq> and <priority>, and no page has a last-modified date that can be derived
    // reliably (a page is assembled from shared data files), so <lastmod> is left out rather than invented
    // (docs/seo/GSC_AUDIT_IMPLEMENTATION.md › Sitemap).
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((loc) => `  <url><loc>${site.url}/${pretty(loc)}</loc></url>`).join('\n')}
</urlset>
`;
    await writeFile(join(OUT, 'sitemap.xml'), sitemap, 'utf8');
    await writeFile(join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${site.url}/sitemap.xml\n`, 'utf8');
  }

  // The booking site's original images that may be kept at their old addresses, byte for byte (docs/seo/HISTORICAL_MEDIA.md).
  for (const m of preservedMedia()) {
    const from = join(SRC, 'legacy-media', m.path.replace(/^\/media\//, ''));
    const bytes = await readFile(from);
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    if (sha256 !== m.asset.sha256 || bytes.length !== m.asset.bytes) throw new Error(`${relative(ROOT, from)} is not the original recorded for ${m.path}`);
    await mkdir(dirname(join(OUT, m.path)), { recursive: true });
    await writeFile(join(OUT, m.path), bytes);
  }

  // The domain's earlier addresses, each sent once to its page here (src/data/legacy-urls.mjs; used once the domain
  // moves). Last, so every destination can be checked against what this build wrote: the build refuses rules that
  // would shadow a page, chain, or point at something that does not exist here.
  const redirects = redirectsFile({ env: site.env });
  const problems = checkRedirects({ pages: [...seen], env: site.env, text: redirects, fileExists: (p) => existsSync(join(OUT, p)) && statSync(join(OUT, p)).isFile() });
  if (problems.length) throw new Error(`_redirects:\n  ${problems.join('\n  ')}`);
  await writeFile(join(OUT, '_redirects'), redirects, 'utf8');

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
