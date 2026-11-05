// Launch checks on every browser project, and on Mobile Safari (WebKit, iPhone 13)
// when PW_WEBKIT=1, as a deployment runs them against staging: the key pages render
// without script errors or sideways scrolling, a multi-day tour request goes through
// the wizard, the hero photograph is served as AVIF, and the staff sign-in form posts
// (where the dashboard is on).
import { test, expect } from '@playwright/test';

const PAGES = ['/', '/tours/', '/tours/cape-peninsula-private-tour/', '/tours/sky-diving/', '/packages/', '/packages/garden-route-private-tour/', '/transfers/', '/destinations/', '/about/', '/reviews/', '/faq/', '/enquire/', '/contact/', '/privacy/', '/terms/'];
const inDays = (n) => new Date(Date.now() + 2 * 3600e3 + n * 864e5).toISOString().slice(0, 10);
const LIVE = process.env.E2E_ENQUIRY_MODE === 'live';

test.describe('launch', () => {
  for (const path of PAGES) {
    test(`${path} renders without script errors or sideways scrolling`, async ({ page }) => {
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      const res = await page.goto(`${path}?nomotion`);
      expect(res.status()).toBe(200);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('h1')).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, 'no horizontal scroll').toBeLessThanOrEqual(0);
      expect(errors, errors.join('\n')).toEqual([]);
    });
  }

  test('a multi-day tour request: the tour page’s card opens the wizard on it, and the review says what will be sent', async ({ page }) => {
    test.skip(LIVE, 'the preview build sends nothing; the live suite submits for real');
    await page.goto('/packages/garden-route-private-tour/?nomotion');
    await page.locator('#book-date').fill(inDays(40));
    await page.locator('#book-nights').selectOption('4');
    await page.getByRole('button', { name: 'Get a Personalised Quote' }).click();
    await page.waitForSelector('.wizard.is-ready');
    const details = page.locator('[data-wizard-step="details"][data-path="tour"]');
    await expect(details.locator('[name="tour_slug"]')).toHaveValue('garden-route-private-tour');
    await expect(details.locator('[name="nights"]')).toHaveValue('4');
    await details.locator('[name="pickup_area"]').fill('Cape Town International Airport');
    await details.locator('[data-next]').click();
    const contact = page.locator('[data-wizard-step="contact"]');
    await contact.locator('[name="name"]').fill('Sam Traveller');
    await contact.locator('[name="email"]').fill('sam@example.com');
    await contact.locator('[name="consent"]').check();
    await contact.locator('[name="terms"]').check();
    await contact.locator('[data-next]').click();
    const review = page.locator('[data-wizard-step="review"]');
    await expect(review).toContainText('Garden Route Private Tour');
    await expect(review).toContainText('4 nights');
    await review.locator('[data-submit]').click();
    await expect(page.locator('[data-result="preview"]')).toBeVisible();
    await expect(page.locator('[data-result="preview"]')).toContainText('this enquiry was not sent to us');
  });

  test('the hero scene is served: its held frame as AVIF, its film in byte ranges (Safari plays only 206 Partial Content)', async ({ request }) => {
    const poster = await request.get('/assets/img/hero-moment-poster-1280.avif');
    expect(poster.status()).toBe(200);
    expect(poster.headers()['content-type']).toMatch(/^image\/avif/);
    expect((await poster.body()).length).toBeGreaterThan(1000);
    for (const [file, type] of [['hero-moment-1280.mp4', /^video\/mp4/], ['hero-moment-1280.webm', /^video\/webm/]]) {
      const res = await request.get(`/assets/video/${file}`, { headers: { Range: 'bytes=0-1023' } });
      expect(res.status(), file).toBe(206);
      expect(res.headers()['content-range'], file).toMatch(/^bytes 0-1023\/\d+$/);
      expect(res.headers()['content-type'], file).toMatch(type);
      expect((await res.body()).length, file).toBe(1024);
    }
  });

  // A real browser decides the Origin header a form post carries (a no-referrer policy made it `null`
  // and locked staff out), so only a browser test catches it. An address not on the staff list: nothing is sent.
  test('the staff dashboard’s sign-in form posts from a real browser', async ({ page }, testInfo) => {
    const res = await page.goto('/admin/sign-in');
    test.skip(res.status() === 503, 'the dashboard is off where bookings are not live');
    await page.locator('#email').fill(`launch-check+${testInfo.project.name}-${Date.now()}@test.invalid`);
    await page.getByRole('button', { name: 'Email me a sign-in link' }).click();
    await expect(page.locator('h1')).toHaveText('Check your email');
  });
});
