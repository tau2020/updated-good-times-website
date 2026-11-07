// Display currencies in the browser: the selector only beside prices, automatic currency by country, the
// visitor's choice kept for the session, every price in step, the booking estimate, failures and blocked storage.
// Every price is Good Times' own rand (ZAR) amount; /api/currency is answered here with fixed rates from the rand
// (illustrative, the same as the unit tests'), so the results never depend on the day's exchange rates.
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const RATES = { GBP: '0.04507', USD: '0.06025', EUR: '0.05383', AUD: '0.0858', CAD: '0.08432' };
const COUNTRY = { ZA: 'ZAR', GB: 'GBP', US: 'USD', DE: 'EUR', AU: 'AUD', ZW: 'USD', CA: 'CAD', XX: 'ZAR' };

/** Answer /api/currency as Cloudflare would for a visitor from `country`; counts the calls. */
async function visitorFrom(page, country, { rates = RATES, fail = false } = {}) {
  const calls = { n: 0 };
  await page.route('**/api/currency', (route) => {
    calls.n++;
    if (fail) return route.abort('failed');
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, base: 'ZAR', currency: COUNTRY[country] || 'ZAR', rates, date: '2026-10-23', stale: false, source: 'test' }) });
  });
  return calls;
}
// The first card on the tours page is the Cape Peninsula Private Tour: from R6,000 for 1–4 guests.
const firstPrice = (page) => page.locator('main .card [data-money]').first();
const picker = (page) => page.locator('[data-currency-picker]:visible');
const choose = (page, code) => page.locator('[data-currency-picker] select:visible, [data-currency-picker] select').first().selectOption(code);
const NO_NOTE = /European Central Bank|Your quote confirms the price and currency/;

test.describe('currency', () => {
  test('the home page shows no selector and never asks for a currency', async ({ page }) => {
    const calls = await visitorFrom(page, 'US');
    await page.goto('/?nomotion');
    await expect(page.locator('[data-currency-picker]')).toHaveCount(0);
    await page.waitForTimeout(400);
    expect(calls.n).toBe(0);
    for (const path of ['/about/?nomotion', '/contact/?nomotion', '/packages/?nomotion', '/faq/?nomotion']) {
      await page.goto(path);
      await expect(page.locator('[data-currency-picker]'), path).toHaveCount(0);
    }
  });

  test('a visitor from South Africa: rand prices as they are, no note; one selector, beside the prices, never in the header', async ({ page }) => {
    await visitorFrom(page, 'ZA');
    await page.goto('/tours/?nomotion');
    await expect(picker(page)).toHaveCount(1);
    await expect(picker(page)).toHaveClass(/is-ready/);
    await expect(page.locator('.site-header [data-currency-picker], .site-footer [data-currency-picker]')).toHaveCount(0);
    await expect(firstPrice(page)).toHaveText('R6,000');
    await expect(picker(page).locator('[data-currency-face]')).toHaveText('ZAR (R)');
    await expect(page.locator('main')).not.toContainText(NO_NOTE);
  });

  // Each visitor in a fresh browser: automatic currency by country, converted from the rand and marked ≈.
  for (const [country, text] of Object.entries({ ZA: 'R6,000', GB: '≈£270', US: '≈US$362', DE: '≈€323', AU: '≈A$515', ZW: '≈US$362', CA: '≈CA$506', XX: 'R6,000' })) {
    test(`a visitor from ${country} sees ${text}`, async ({ page }) => {
      await visitorFrom(page, country);
      await page.goto('/tours/?nomotion');
      await expect(firstPrice(page)).toHaveText(text.replace('≈', '≈about '));
      await expect(firstPrice(page).locator('[aria-hidden="true"]')).toHaveCount(text.startsWith('≈') ? 1 : 0);
      // No exchange-rate note under the prices: converted amounts carry their ≈ alone.
      await expect(page.locator('main')).not.toContainText(NO_NOTE);
    });
  }

  test('changing currency updates every price at once, without a reload, and the choice follows the visitor', async ({ page }) => {
    await visitorFrom(page, 'ZA');
    await page.goto('/tours/?nomotion');
    await expect(picker(page)).toHaveClass(/is-ready/);
    await page.evaluate(() => (window.__sameDocument = true));
    await choose(page, 'USD');
    await expect(firstPrice(page)).toHaveText('≈about US$362');
    // Every card's price follows, each converted once from its own rand amount (R6,000, R4,500, R6,000, R4,500, R6,000, R8,500).
    await expect(page.locator('main [data-money]')).toHaveText(['≈about US$362', '≈about US$271', '≈about US$362', '≈about US$271', '≈about US$362', '≈about US$512']);
    const shown = await page.locator('main [data-money]').evaluateAll((els) => els.map((e) => e.dataset.moneyShown));
    expect(new Set(shown)).toEqual(new Set(['USD']));
    await expect(page.locator('main')).not.toContainText(NO_NOTE);
    expect(await page.evaluate(() => window.__sameDocument)).toBe(true);

    // A tour page: the booking card and both group tiers in USD; then a reload; then back.
    await page.goto('/tours/cape-town-city-private-tour/?nomotion');
    await expect(page.locator('.enquiry-card__amount [data-money]')).toHaveText('≈about US$271');
    await expect(page.locator('.enquiry-card .price-tiers [data-money]')).toHaveText(['≈about US$271', '≈about US$542']);
    await expect(page.locator('.enquiry-card [data-currency-face]')).toHaveText('USD (US$)');
    await page.reload();
    await expect(page.locator('.enquiry-card__amount [data-money]')).toHaveText('≈about US$271');
    await choose(page, 'GBP');
    await expect(page.locator('.enquiry-card__amount [data-money]')).toHaveText('≈about £203');
    await expect(page.locator('.enquiry-card .price-tiers [data-money]')).toHaveText(['≈about £203', '≈about £406']);
    await page.goBack();
    await expect(firstPrice(page)).toHaveText('≈about £270');
    // Back to the prices' own currency: no marks.
    await choose(page, 'ZAR');
    await expect(firstPrice(page)).toHaveText('R6,000');
  });

  test('the transfers page: one selector beside the prices; every price follows it', async ({ page }) => {
    await visitorFrom(page, 'GB');
    await page.goto('/transfers/?nomotion');
    await expect(picker(page)).toHaveCount(1);
    // The airport transfer: R850 per trip for 1–4 guests (shown twice), R1,700 for 5–8.
    await expect(page.locator('main [data-money]')).toHaveText(['≈about £38', '≈about £38', '≈about £77']);
  });

  test('rates unavailable: every price stays in rand and the selector says so, without offering a change', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await visitorFrom(page, 'US', { fail: true });
    await page.goto('/tours/?nomotion');
    await expect(picker(page)).toHaveClass(/is-fixed/);
    await expect(picker(page).locator('select')).toBeDisabled();
    await expect(picker(page).locator('[data-currency-face]')).toHaveText('ZAR (R)');
    await expect(firstPrice(page)).toHaveText('R6,000');
    expect(errors).toEqual([]);
  });

  test('a currency without a usable rate is never shown: rand instead of an invented amount', async ({ page }) => {
    await visitorFrom(page, 'CA', { rates: { ...RATES, CAD: '0' } });
    await page.goto('/tours/?nomotion');
    await expect(picker(page)).toHaveClass(/is-ready/);
    await expect(firstPrice(page)).toHaveText('R6,000');
    await expect(picker(page).locator('option[value="CAD"]')).toBeDisabled();
  });

  test('storage blocked (private browsing): the selector still works on the page', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'sessionStorage', { get() { throw new DOMException('blocked', 'SecurityError'); } });
    });
    await visitorFrom(page, 'ZA');
    await page.goto('/tours/?nomotion');
    await expect(picker(page)).toHaveClass(/is-ready/);
    await choose(page, 'EUR');
    await expect(firstPrice(page)).toHaveText('≈about €323');
  });

  test('the booking estimate follows the currency; changing it midway keeps every answer', async ({ page }) => {
    await visitorFrom(page, 'ZA');
    await page.goto('/enquire/?type=tour&tour=cape-town-city-private-tour&nomotion');
    const total = page.locator('[data-total-text]');
    await expect(total).toHaveText('R4,500 for your private group of 2 · the rate for 1–4 guests');
    const t = page.locator('[data-wizard-step="details"][data-path="tour"]');
    await t.locator('[name="pickup_area"]').fill('Hotel in Sea Point');
    await t.locator('[name="special_requests"]').fill('A relaxed pace, please.');
    await t.locator('[data-currency-area] select').selectOption('USD');
    await expect(total).toHaveText('≈US$271 for your private group of 2 · the rate for 1–4 guests');
    await expect(t.locator('[name="pickup_area"]')).toHaveValue('Hotel in Sea Point');
    await expect(t.locator('[name="special_requests"]')).toHaveValue('A relaxed pace, please.');
    await expect(t.locator('.booking-total__note')).toHaveText(/^Not an amount due/);
    // The multi-day tour's rate is per day: the days multiply the shown daily amount, so the line always adds up.
    await t.locator('[name="tour_slug"]').selectOption('garden-route-private-tour');
    await expect(total).toHaveText('From ≈US$512 a day · the rate for 1–4 guests');
    await t.locator('[name="nights"]').selectOption('4');
    await expect(total).toHaveText('≈US$2,560 for 5 days · ≈US$512 a day for 1–4 guests');
    await expect(t.locator('[name="pickup_area"]')).toHaveValue('Hotel in Sea Point');
    // A custom day has no price: no estimate, no selector.
    await t.locator('[name="tour_slug"]').selectOption('custom');
    await expect(total).toHaveText('We’ll confirm your quote');
    await expect(t.locator('[data-currency-area]')).toBeHidden();
    // The draft the wizard keeps holds no price or currency.
    const draft = await page.evaluate(() => sessionStorage.getItem('gt:enquiry:draft') || '');
    expect(draft).not.toMatch(/currency|price|USD|US\$/i);
  });

  test('labelled, keyboard reachable, with a visible focus ring; no serious accessibility violations', async ({ page }, info) => {
    await visitorFrom(page, 'ZA');
    await page.goto('/tours/?nomotion');
    await expect(picker(page)).toHaveClass(/is-ready/);
    // The name a screen reader announces: the words shown at this width only.
    const name = info.project.name === 'desktop' ? 'Prices displayed in' : 'Prices in';
    const select = page.getByRole('combobox', { name, exact: true });
    await expect(select).toHaveValue('ZAR');
    await select.focus();
    const ring = await picker(page).locator('.currency-picker__control').evaluate((e) => getComputedStyle(e).outlineStyle);
    expect(ring).toBe('solid');
    const results = await new AxeBuilder({ page }).include('[data-currency-picker]').include('main .card').analyze();
    expect(results.violations.filter((v) => ['serious', 'critical'].includes(v.impact))).toEqual([]);
    if (info.project.name !== 'desktop') await expect(picker(page)).toContainText('Change');
  });

  test('converting after load moves nothing on the page (no layout shift from the selector or the prices)', async ({ page }) => {
    await visitorFrom(page, 'GB');
    await page.goto('/tours/?nomotion');
    await expect(firstPrice(page)).toHaveText('≈about £270');
    const cls = await page.evaluate(
      () =>
        new Promise((done) => {
          let sum = 0;
          new PerformanceObserver((list) => {
            for (const e of list.getEntries()) if (!e.hadRecentInput) sum += e.value;
          }).observe({ type: 'layout-shift', buffered: true });
          setTimeout(() => done(sum), 300);
        }),
    );
    expect(cls).toBeLessThan(0.02);
  });
});
