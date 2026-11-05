// The sand journey in a browser without WebGL: the static scene (partials/sand-journey.mjs), and the rest unaffected.
// Its own file because the browser is launched with WebGL switched off (a launch option applies to the whole file).
import { test, expect } from '@playwright/test';

test.use({
  launchOptions: {
    ...(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {}),
    args: ['--disable-3d-apis', '--disable-webgl', '--disable-webgl2'],
  },
});

test('without WebGL the sand journey is the static scene, one screen tall, with no error, and the aircraft still lands', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Chromium switches');
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await page.evaluate(() => window.scrollTo({ top: 60, behavior: 'instant' }));
  await expect.poll(() => page.evaluate(() => window.__sandJourney.tier === 'static' && !!window.__sandJourney.error), { timeout: 20_000 }).toBe(true);
  const r = await page.locator('[data-sand-journey]').evaluate((s) => ({ h: s.offsetHeight, vh: innerHeight, canvas: !!s.querySelector('canvas'), words: getComputedStyle(s.querySelector('.sand-journey__words')).opacity }));
  expect(r).toEqual({ h: r.vh, vh: r.vh, canvas: false, words: '1' });
  await expect(page.locator('.brand.is-awaiting-aircraft')).toHaveCount(0, { timeout: 10_000 });
  expect(errors).toEqual([]);
});
