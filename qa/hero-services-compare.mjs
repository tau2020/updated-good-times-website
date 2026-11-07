#!/usr/bin/env node
/**
 * Before and after, side by side, for each viewport qa/hero-services-shots.mjs captured in two directories (the hero
 * once its entrance has finished; on phones and tablets the hero and the block beneath it):
 *
 *   node qa/hero-services-compare.mjs --before=<dir> --after=<dir> --out=<dir>
 */
import { chromium } from '@playwright/test';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
// The brief's six viewports (as in qa/hero-services-shots.mjs)
const VIEWPORTS = [
  [1920, 1080, 'wide desktop'],
  [1440, 900, 'desktop'],
  [1366, 768, 'short laptop'],
  [768, 1024, 'tablet'],
  [390, 844, 'mobile'],
  [360, 740, 'small mobile'],
];

const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=').slice(1).join('=') || d;
const BEFORE = arg('before', 'qa/hero-services/before');
const AFTER = arg('after', 'qa/hero-services/after');
const OUT = arg('out', 'qa/hero-services/compare');
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 2400, height: 1200 } });
for (const [w, h, label] of VIEWPORTS) {
  const key = `${w}x${h}`;
  const pick = (dir) => [`${key}-motion-full-hero.jpg`, `${key}-motion.jpg`].map((f) => join(dir, f)).find((f) => existsSync(f));
  const [b, a] = [pick(BEFORE), pick(AFTER)];
  if (!b || !a) continue;
  const src = (f) => `data:image/jpeg;base64,${readFileSync(f).toString('base64')}`;
  const width = w < 600 ? 520 : w < 1000 ? 700 : 1100;
  await page.setContent(`<style>body{margin:0;background:#0b2233;color:#fff;font:600 18px system-ui}main{display:flex;gap:20px;padding:20px;align-items:flex-start}figure{margin:0;width:${width}px}img{width:100%;display:block;border:1px solid #2a4458}figcaption{margin:0 0 8px}h1{font-size:20px;margin:20px 20px 0}</style><h1>${key} · ${label}</h1><main><figure><figcaption>Before</figcaption><img src="${src(b)}"></figure><figure><figcaption>After: the hero's services</figcaption><img src="${src(a)}"></figure></main>`);
  await page.waitForFunction(() => [...document.images].every((i) => i.complete));
  writeFileSync(join(OUT, `${key}.jpg`), await page.locator('body').screenshot({ type: 'jpeg', quality: 72 }));
  console.log(`${key} → ${join(OUT, `${key}.jpg`)}`);
}
await browser.close();
