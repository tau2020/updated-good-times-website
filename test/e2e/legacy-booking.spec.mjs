// The booking site's old addresses in a real browser: each /users/book/<slug>/ follows its redirect
// (src/data/legacy-urls.mjs) to the booking form with the same tour chosen, the sign-in page's ?next= link does the
// same, the account pages open the form at its first step, and both old sites' tour addresses land on the tour.
// Runs on the local server (which applies _redirects as Pages does), wrangler pages dev or a deployment (E2E_BASE_URL).
import { test, expect } from '@playwright/test';
import { legacyUrls } from '../../src/data/legacy-urls.mjs';

const BOOKING = legacyUrls.filter((e) => e.path.startsWith('/users/book/') && e.action === 'redirect');
const step = (page, id, path) => page.locator(`[data-wizard-step="${id}"]${path ? `[data-path="${path}"]` : ''}`);

/** A fresh visit: no draft from an earlier test in this tab, no motion (a redirect would drop ?nomotion). */
async function visit(page, path) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/privacy/');
  await page.evaluate(() => sessionStorage.clear());
  const res = await page.goto(path);
  return res;
}

test.describe('the booking site’s old addresses', () => {
  test('twelve booking pages: each opens the form on its own tour, the transfer on the transfer path', async ({ page }) => {
    expect(BOOKING).toHaveLength(12);
    for (const e of BOOKING) {
      const res = await visit(page, e.path);
      expect(res.status(), e.path).toBe(200);
      const to = new URL(e.to, 'https://x.invalid');
      expect(new URL(page.url()).pathname + new URL(page.url()).search, e.path).toBe(to.pathname + to.search);
      await page.waitForSelector('.wizard.is-ready');
      const tour = to.searchParams.get('tour');
      if (tour) {
        await expect(page.locator('#enq-step-tour'), e.path).toBeVisible();
        await expect(page.locator('#enq-type-tour')).toBeChecked();
        await expect(step(page, 'details', 'tour').locator('[name="tour_slug"]'), e.path).toHaveValue(tour);
      } else {
        await expect(page.locator('#enq-step-transfer'), e.path).toBeVisible();
        await expect(page.locator('#enq-type-transfer')).toBeChecked();
      }
    }
  });

  test('the sign-in page’s ?next= link keeps its booking: the tour, or the transfer', async ({ page }) => {
    await visit(page, '/accounts/login/?next=/users/book/quad-biking/');
    expect(new URL(page.url()).pathname).toBe('/enquire/');
    await page.waitForSelector('.wizard.is-ready');
    await expect(page.locator('#enq-step-tour')).toBeVisible();
    await expect(step(page, 'details', 'tour').locator('[name="tour_slug"]')).toHaveValue('quad-biking');

    await visit(page, '/accounts/login/?next=/users/book/airport-private-transfer/');
    await page.waitForSelector('.wizard.is-ready');
    await expect(page.locator('#enq-step-transfer')).toBeVisible();

    await visit(page, '/accounts/login/?next=/users/book/a-retired-tour/');
    await page.waitForSelector('.wizard.is-ready');
    await expect(step(page, 'service')).toBeVisible();
  });

  test('the account and bookings pages open the form at its first step', async ({ page }) => {
    for (const path of ['/accounts/login/', '/accounts/signup/', '/bookings/']) {
      await visit(page, path);
      expect(new URL(page.url()).pathname, path).toBe('/enquire/');
      await page.waitForSelector('.wizard.is-ready');
      await expect(step(page, 'service'), path).toBeVisible();
    }
  });

  test('both old sites’ tour addresses land on the tour', async ({ page }) => {
    for (const [path, heading] of [
      ['/tour/cape-peninsula-private-tour/', 'Cape Peninsula Private Tour'],
      ['/tour/cape-peninsula-adventure/', 'Cape Peninsula Private Tour'],
      ['/tour/township-cultural-tour', 'Township Private Tour'],
      ['/tour/winelands-experience/%f0%9f%8d%b7-cape-winelands-private-tour-gallery-2/', 'Cape Winelands Private Tour'],
      ['/tour/garden-route-private-tour/', 'Garden Route Private Tour'],
    ]) {
      await visit(page, path);
      await expect(page.locator('h1'), path).toHaveText(heading);
    }
  });
});
