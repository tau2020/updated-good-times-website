#!/usr/bin/env node
/**
 * A contact sheet of the hero entrance frames that qa/hero-services-shots.mjs --frames wrote, cropped to the hero's
 * left (where the call to action, the sentence and the services are), for the report:
 *
 *   node qa/hero-services-sheet.mjs --dir=<shots dir> --viewport=1440x900 [--crop=0.62] [--out=<file>]
 */
import { chromium } from '@playwright/test';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=').slice(1).join('=') || d;
const DIR = arg('dir', '');
const VP = arg('viewport', '1440x900');
const CROP = Number(arg('crop', '0.62'));
const OUT = arg('out', join(DIR, `${VP}-entrance-sheet.jpg`));
const frames = readdirSync(DIR)
  .filter((f) => f.startsWith(`${VP}-frame-`))
  .map((f) => ({ f, t: Number(f.match(/frame-(\d+)_(\d)s/).slice(1).join('.')) }))
  .sort((a, b) => a.t - b.t);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1800, height: 1000 } });
const sheet = await page.evaluate(
  async ({ frames, crop }) => {
    const imgs = await Promise.all(
      frames.map(async ({ src }) => {
        const i = new Image();
        i.src = src;
        await i.decode();
        return i;
      }),
    );
    const cw = Math.round(imgs[0].width * crop);
    const ch = imgs[0].height;
    const cols = 3;
    const scale = 580 / cw;
    const tw = Math.round(cw * scale);
    const th = Math.round(ch * scale);
    const c = document.createElement('canvas');
    c.width = cols * tw + (cols + 1) * 8;
    c.height = Math.ceil(imgs.length / cols) * (th + 30) + 8;
    const g = c.getContext('2d');
    g.fillStyle = '#0b2233';
    g.fillRect(0, 0, c.width, c.height);
    imgs.forEach((img, n) => {
      const x = 8 + (n % cols) * (tw + 8);
      const y = 8 + Math.floor(n / cols) * (th + 30);
      g.drawImage(img, 0, 0, cw, ch, x, y, tw, th);
      g.fillStyle = '#fff';
      g.font = '600 16px system-ui';
      g.fillText(`${frames[n].t.toFixed(1)} s`, x + 4, y + th + 20);
    });
    return c.toDataURL('image/jpeg', 0.78);
  },
  { frames: frames.map(({ f, t }) => ({ t, src: `data:image/jpeg;base64,${readFileSync(join(DIR, f)).toString('base64')}` })), crop: CROP },
);
writeFileSync(OUT, Buffer.from(sheet.split(',')[1], 'base64'));
await browser.close();
console.log(`${frames.length} frames → ${OUT}`);
