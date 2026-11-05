// Enquiry wizard in a real browser: both paths, keyboard use, prefill links,
// drafts, validation, honest delivery states.
//
//   npm run test:e2e -- test/e2e/enquiry.spec.mjs            preview build (default): nothing is ever sent
//
// Live mode (client behaviour against the real local API, plus mocked
// failures) runs only when E2E_ENQUIRY_MODE=live and a live server is already
// listening on E2E_PORT (or E2E_BASE_URL), e.g. scripts/cloudflare/local-pages.mjs
// or a local PGlite database and the file email provider (README › Enquiries).
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const LIVE = process.env.E2E_ENQUIRY_MODE === 'live';
const REF = /GT-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}/;
const inDays = (n) => new Date(Date.now() + 2 * 3600e3 + n * 864e5).toISOString().slice(0, 10);
const inDaysFrom = (iso, n) => new Date(Date.parse(`${iso}T12:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
/**
 * Live runs against a deployed preview keep their requests in its database, so the dates they use fill up run after
 * run (a day tour holds a vehicle for its date, a package for its nights plus one day; two vehicles unless the
 * dashboard sets a day's count). The first start date from `from` with `days` consecutive dates still free, asked of
 * the same month view the calendars use. Each parallel worker starts its own stretch of the calendar (`spread` days
 * apart), so concurrent runs never compete for the same vehicles.
 */
async function freeDates(page, from, days = 1, spread = 0) {
  const taken = new Map();
  const isTaken = async (date) => {
    const month = date.slice(0, 7);
    if (!taken.has(month)) {
      const res = await page.request.get(`/api/availability?month=${month}`);
      const body = res.ok() ? await res.json().catch(() => ({})) : {};
      taken.set(month, new Set([...(body.full || []), ...(body.closed || [])]));
    }
    return taken.get(month).has(date);
  };
  let start = inDaysFrom(from, spread * test.info().parallelIndex);
  for (let tries = 0; tries < 700; tries++) {
    let clash = -1;
    for (let k = 0; k < days && clash < 0; k++) if (await isTaken(inDaysFrom(start, k))) clash = k;
    if (clash < 0) return start;
    start = inDaysFrom(start, clash + 1);
  }
  throw new Error(`no ${days} free consecutive days within 700 tries from ${from}`);
}
// Good Times' ten day tours and activities, and the multi-day Garden Route tour (src/data/tours.mjs, packages.mjs).
const TOURS = [
  'cape-peninsula-private-tour',
  'cape-town-city-private-tour',
  'cape-winelands-private-tour',
  'township-private-tour',
  'private-cape-town-experience',
  'whale-watching-private-tour',
  'cape-agulhas-private-tour',
  'shark-cage-diving',
  'quad-biking',
  'sky-diving',
];
const MULTI_DAY = 'garden-route-private-tour';
const TRANSFERS = ['airport-arrival', 'airport-departure', 'other'];

/**
 * A visitor from South Africa, whose prices stay in rand. A deployed site answers /api/currency from the visitor's
 * country (a runner abroad would see converted amounts), so tests that read rand totals pin it.
 */
const inRand = (page) =>
  page.route('**/api/currency', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, base: 'ZAR', currency: 'ZAR', rates: { GBP: '0.04507', USD: '0.06025', EUR: '0.05383', AUD: '0.0858', CAD: '0.08432' }, date: '2026-11-04', stale: false, source: 'test' }) }),
  );
const step = (page, id, path) => page.locator(`[data-wizard-step="${id}"]${path ? `[data-path="${path}"]` : ''}`);
const summary = (page, id, path) => step(page, id, path).locator('[data-error-summary]');

async function open(page, query = '') {
  await page.goto(`/enquire/${query}${query.includes('?') ? '&' : '?'}nomotion`);
  await page.waitForSelector('.wizard.is-ready');
}

async function axeClean(page) {
  // Let border/box-shadow transitions on freshly invalid fields finish, so contrast is measured at rest.
  await page.waitForTimeout(400);
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  const bad = results.violations.filter((v) => ['serious', 'critical'].includes(v.impact));
  expect(bad.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`), JSON.stringify(bad.map((v) => v.nodes.map((n) => n.target)), null, 1)).toEqual([]);
}

async function noOverflow(page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, 'no horizontal scroll').toBeLessThanOrEqual(0);
}

/** Fill a valid tour enquiry up to the review step. */
async function fillTour(page, { email = 'amara@example.com', date = inDays(30) } = {}) {
  await open(page, `?type=tour&tour=cape-town-city-private-tour`);
  const t = step(page, 'details', 'tour');
  await t.locator('[name="preferred_date"]').fill(date);
  await t.locator('[name="pickup_area"]').fill('Hotel in Sea Point');
  await t.locator('[data-next]').click();
  await fillContact(page, { email });
}

async function fillContact(page, { email = 'amara@example.com', method = 'email' } = {}) {
  const c = step(page, 'contact');
  await expect(c).toBeVisible();
  await c.locator('[name="name"]').fill('Amara Okafor');
  await c.locator('[name="email"]').fill(email);
  await c.locator('[name="phone"]').fill('+44 20 7946 0958');
  await c.locator(`[name="preferred_contact_method"][value="${method}"]`).check();
  await c.locator('[name="consent"]').check();
  await c.locator('[name="terms"]').check();
  await c.locator('[data-next]').click();
  await expect(step(page, 'review')).toBeVisible();
}

async function fillTransfer(page, { email = 'tom@example.com', date = inDays(20) } = {}) {
  await open(page, '?type=transfer&transfer=airport-arrival');
  const t = step(page, 'details', 'transfer');
  await t.locator('[name="destination"]').fill('Camps Bay, Victoria Road');
  await t.locator('[name="transfer_date"]').fill(date);
  await t.locator('[name="transfer_time"]').fill('14:30');
  await t.locator('[name="flight_number"]').fill('BA59');
  await t.locator('[data-next]').click();
  await fillContact(page, { email, method: 'whatsapp' });
}

/* ======================================================================== */
test.describe('enquiry wizard (preview build)', () => {
  test.skip(LIVE, 'preview-build behaviour');

  test('tour path end to end with the keyboard; preview sends nothing and says so', async ({ page }) => {
    const posts = [];
    const lookups = [];
    // The display-currency lookup is a GET without a body or query: it carries nothing from the form. Any other API traffic fails.
    page.on('request', (r) => {
      if (!r.url().includes('/api/')) return;
      if (new URL(r.url()).pathname === '/api/currency') lookups.push({ method: r.method(), search: new URL(r.url()).search, body: r.postData() });
      else posts.push(r.url());
    });
    await open(page);
    await expect(step(page, 'service')).toBeVisible();
    await expect(step(page, 'details', 'tour')).toBeHidden();
    await expect(page.locator('[data-progress]'), 'the stepper starts after the service choice').toBeHidden();

    // Next without a choice → error summary, focused, linking to the field.
    await step(page, 'service').locator('[data-next]').click();
    await expect(summary(page, 'service')).toBeVisible();
    await expect(summary(page, 'service')).toBeFocused();
    await expect(summary(page, 'service').locator('a')).toHaveText('Choose a private tour or a transfer request.');
    await expect(page.locator('#enq-type-tour')).toHaveAttribute('aria-invalid', 'true');

    // Keyboard: choose with Space, move on with Enter on Next.
    await page.locator('#enq-type-tour').focus();
    await page.keyboard.press('Space');
    await expect(summary(page, 'service')).toBeHidden();
    await step(page, 'service').locator('[data-next]').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#enq-step-tour')).toBeFocused();
    await expect(page.locator('[data-progress]')).toBeVisible();
    await expect(page.locator('[data-progress-step="details"]')).toHaveAttribute('aria-current', 'step');
    await expect(page.locator('[data-progress-step="details"]')).toContainText('Date & Details');

    // Empty details → per-field errors wired with aria-invalid and aria-describedby.
    const t = step(page, 'details', 'tour');
    await t.locator('[data-next]').click();
    await expect(summary(page, 'details', 'tour').locator('li')).toHaveCount(3);
    const select = t.locator('[name="tour_slug"]');
    await expect(select).toHaveAttribute('aria-invalid', 'true');
    await expect(select).toHaveAttribute('aria-describedby', /enq-tour-tour-slug-error/);
    await expect(t.locator('#enq-tour-tour-slug-error')).toContainText('Choose a tour');
    await summary(page, 'details', 'tour').locator('a').first().click();
    await expect(select).toBeFocused();

    await select.selectOption('cape-peninsula-private-tour');
    await expect(select).not.toHaveAttribute('aria-invalid', 'true');
    await t.locator('[name="preferred_date"]').fill(inDays(14));
    await t.locator('[aria-label="More adults"]').click();
    await expect(t.locator('[name="adults"]')).toHaveValue('3');
    await t.locator('[name="pickup_area"]').fill('Hotel in Sea Point');
    // Enter in a text field means "Next".
    await t.locator('[name="pickup_area"]').press('Enter');
    await expect(page.locator('#enq-step-contact')).toBeFocused();
    await expect(page.locator('[data-progress-step="details"]')).toHaveClass(/is-complete/);
    await expect(page.locator('[data-progress-step="contact"]')).toHaveAttribute('aria-current', 'step');

    // WhatsApp without a number, no consent, terms not accepted → errors.
    const c = step(page, 'contact');
    await c.locator('[name="preferred_contact_method"][value="whatsapp"]').check();
    await c.locator('[data-next]').click();
    const errs = summary(page, 'contact').locator('li');
    await expect(errs).toHaveCount(5);
    await expect(summary(page, 'contact')).toContainText('WhatsApp number');
    await expect(summary(page, 'contact')).toContainText('Tick the box');
    await expect(summary(page, 'contact')).toContainText('Tick the box to agree to the Terms & Conditions.');
    await c.locator('[name="name"]').fill('Amara Okafor');
    await c.locator('[name="email"]').fill('amara@example.com');
    await c.locator('[name="phone"]').fill('082 123 4567');
    await c.locator('[data-next]').click();
    await expect(summary(page, 'contact')).toContainText('country calling code');
    await c.locator('[name="phone"]').fill('+44 20 7946 0958');
    await c.locator('[name="consent"]').check();
    await c.locator('[name="terms"]').check();
    await c.locator('[data-next]').click();

    // Review shows what was entered, with Edit links back to each step.
    const r = step(page, 'review');
    await expect(page.locator('#enq-step-review')).toBeFocused();
    await expect(r.locator('[data-review]')).toContainText('Cape Peninsula Private Tour');
    await expect(r.locator('[data-review]')).toContainText('3 adults');
    await expect(r.locator('[data-review]')).toContainText('WhatsApp');
    await expect(r).toContainText('Sending an enquiry does not create a confirmed booking. We’ll reply to confirm availability and a quote.');
    await expect(r.locator('[data-submit]')).toHaveText(/Send Tour Enquiry/);
    await r.getByRole('button', { name: 'Edit tour details' }).click();
    await expect(page.locator('#enq-step-tour')).toBeFocused();
    await expect(t.locator('[name="pickup_area"]')).toHaveValue('Hotel in Sea Point');
    await t.locator('[data-next]').click();
    // As on the first pass, wait for the contact step (shown and focused) before using its Next: in WebKit the second click raced the step change.
    await expect(page.locator('#enq-step-contact')).toBeFocused();
    await c.locator('[data-next]').click();
    await expect(page.locator('#enq-step-review')).toBeFocused();

    // Send: preview result, no request, no reference.
    await r.locator('[data-submit]').click();
    const result = page.locator('[data-result="preview"]');
    await expect(result).toBeVisible();
    await expect(result.locator('.wizard-result__title')).toBeFocused();
    await expect(result.locator('.wizard-result__title')).toHaveText('Preview only: this enquiry was not sent to us.');
    await expect(result.locator('[data-preview-summary]')).toContainText('Hotel in Sea Point');
    const sent = JSON.parse(await result.locator('[data-preview-json]').textContent());
    expect(sent.enquiry_type).toBe('tour');
    // Time on form is measured with the monotonic clock, not the device clock; the honeypot is never shown.
    expect(Number.isInteger(sent.elapsed_ms) && sent.elapsed_ms >= 0).toBe(true);
    expect(sent.started_at).toBeUndefined();
    expect(sent.gt_hp_check).toBeUndefined();
    expect(sent.website).toBeUndefined();
    expect(await page.locator('main').textContent()).not.toMatch(REF);
    expect(posts, 'no network request in preview mode').toEqual([]);
    for (const l of lookups) expect(l, 'the currency lookup sends nothing').toEqual({ method: 'GET', search: '', body: null });
    // Nothing was sent, so the draft is kept.
    expect(await page.evaluate(() => sessionStorage.getItem('gt:enquiry:draft'))).toBeTruthy();
    await axeClean(page);
    await result.locator('[data-back-to-review]').click();
    await expect(step(page, 'review')).toBeVisible();
  });

  test('step 1 of the tour path: summary card, inline calendar, counters and the indicative total', async ({ page }) => {
    await inRand(page);
    await open(page, '?type=tour&tour=cape-town-city-private-tour&adults=3');
    await expect(page.locator('h1')).toHaveText('Book Your Tour');
    const t = step(page, 'details', 'tour');
    await expect(t.locator('[data-tour-card="cape-town-city-private-tour"]')).toBeVisible();
    await expect(t.locator('[data-tour-card="cape-town-city-private-tour"]')).toContainText('5.0');
    await expect(t.locator('[data-tour-card]:visible')).toHaveCount(1);
    await expect(t.locator('[name="adults"]')).toHaveValue('3');
    // The published rate is per private group: R4,000 for 1–4 guests, R8,000 for 5–8, on enquiry above that.
    await expect(t.locator('[data-total-text]')).toHaveText('R4,000 for your private group of 3 · the rate for 1–4 guests');
    await expect(t.locator('[data-total-row]')).toContainText('Not an amount due');
    await t.locator('[aria-label="Fewer adults"]').click();
    await expect(t.locator('[data-total-text]')).toHaveText('R4,000 for your private group of 2 · the rate for 1–4 guests');
    // Children count towards the group: 2 adults and 3 children are a group of 5.
    await t.locator('[name="children"]').fill('3');
    await expect(t.locator('[data-total-text]')).toHaveText('R8,000 for your private group of 5 · the rate for 5–8 guests');
    await t.locator('[name="children"]').fill('0');
    await t.locator('[name="adults"]').fill('9');
    await expect(t.locator('[data-total-text]')).toHaveText('Groups of more than 8: we’ll confirm your quote');
    await t.locator('[name="adults"]').fill('2');
    await expect(t.locator('[data-total-text]')).toHaveText('R4,000 for your private group of 2 · the rate for 1–4 guests');
    // Calendar: next month, pick the first allowed day; the native input follows.
    const cal = t.locator('[data-calendar-for="enq-tour-preferred-date"]');
    await expect(cal.locator('[role="grid"]')).toBeVisible();
    await cal.getByRole('button', { name: 'Next month' }).click();
    const day = cal.locator('.calendar__day:not([aria-disabled="true"])').first();
    const iso = await day.getAttribute('data-date');
    await day.click();
    await expect(t.locator('[name="preferred_date"]')).toHaveValue(iso);
    await expect(cal.locator('td[aria-selected="true"] .calendar__day')).toHaveAttribute('data-date', iso);
    await day.press('ArrowRight');
    await expect(cal.locator('.calendar__day:focus')).toHaveAttribute('data-date', inDaysFrom(iso, 1));
    // Typing a date moves the calendar to that month.
    await t.locator('[name="preferred_date"]').fill(inDays(400));
    await expect(cal.locator('td[aria-selected="true"] .calendar__day')).toHaveAttribute('data-date', inDays(400));
    await t.locator('[name="tour_slug"]').selectOption('custom');
    await expect(t.locator('[data-tour-card="custom"]')).toBeVisible();
    await expect(t.locator('[data-total-text]')).toHaveText('We’ll confirm your quote');
    await axeClean(page);
  });

  test('transfer path: prefill, airport suggestion and the cross-field rules', async ({ page }) => {
    await open(page, '?type=transfer&transfer=airport-arrival');
    const t = step(page, 'details', 'transfer');
    await expect(page.locator('#enq-step-transfer')).toBeVisible();
    await expect(t.locator('[value="airport-arrival"]')).toBeChecked();
    await expect(t.locator('[name="pickup_location"]')).toHaveValue('Cape Town International Airport (CPT)');
    await expect(t.locator('[data-dynamic="flight_number"] [data-optional-tag]')).toBeHidden();

    await t.locator('[data-next]').click();
    const s = summary(page, 'details', 'transfer');
    for (const msg of ['where you are going', 'transfer date', 'pickup time', 'flight number']) await expect(s).toContainText(msg);
    await expect(t.locator('[name="flight_number"]')).toHaveAttribute('aria-invalid', 'true');

    await t.locator('[name="destination"]').fill('Camps Bay');
    await t.locator('[name="transfer_date"]').fill(inDays(-1));
    await t.locator('[name="transfer_time"]').fill('12:00');
    await t.locator('[name="flight_number"]').fill('nonsense');
    await t.locator('[data-next]').click();
    await expect(s).toContainText('today or a later date');
    await expect(s).toContainText('flight number like SA 123');

    await t.locator('[name="transfer_date"]').fill(inDays(5));
    await t.locator('[name="flight_number"]').fill('sa 123');
    await t.locator('[name="return_trip"]').check();
    await t.locator('[name="return_date"]').fill(inDays(4));
    await t.locator('[name="return_time"]').fill('10:00');
    await t.locator('[data-next]').click();
    await expect(s).toContainText('after the outbound transfer');

    await t.locator('[name="return_date"]').fill(inDays(6));
    await t.locator('[data-next]').click();
    await expect(step(page, 'contact')).toBeVisible();

    // Back, switch to a departure: the airport moves ends and the flight becomes optional.
    await step(page, 'contact').locator('[data-back]').click();
    await expect(page.locator('#enq-step-transfer')).toBeFocused();
    await t.locator('[value="airport-departure"]').check();
    await expect(t.locator('[name="pickup_location"]')).toHaveValue('');
    await expect(t.locator('[data-dynamic="flight_number"] [data-optional-tag]')).toBeVisible();
    // Something else (not an airport): no flight number at all.
    await t.locator('[value="other"]').check();
    await expect(t.locator('[name="flight_number"]')).toBeHidden();
    await axeClean(page);
  });

  test('every enquiry link used on the site prefills the right step', async ({ page }) => {
    await open(page);
    // Leaving the wizard saves the draft (pagehide), so clear storage from another page.
    const fresh = async (q) => {
      await page.goto('/privacy/');
      await page.evaluate(() => sessionStorage.clear());
      await open(page, q);
    };
    for (const slug of [...TOURS, 'custom']) {
      await fresh(`?type=tour&tour=${slug}`);
      await expect(page.locator('#enq-step-tour'), slug).toBeVisible();
      await expect(step(page, 'details', 'tour').locator('[name="tour_slug"]')).toHaveValue(slug);
      await expect(page.locator('#enq-type-tour')).toBeChecked();
    }
    await fresh('?type=transfer');
    await expect(page.locator('#enq-step-transfer')).toBeVisible();
    await expect(step(page, 'details', 'transfer').locator('[name="transfer_type"]:checked')).toHaveCount(0);
    for (const tt of TRANSFERS) {
      await fresh(`?type=transfer&transfer=${tt}`);
      await expect(page.locator('#enq-step-transfer'), tt).toBeVisible();
      await expect(step(page, 'details', 'transfer').locator(`[value="${tt}"]`)).toBeChecked();
    }
    // Invalid values are ignored.
    await fresh('?type=tour&tour=not-a-real-tour');
    await expect(page.locator('#enq-step-tour')).toBeVisible();
    await expect(step(page, 'details', 'tour').locator('[name="tour_slug"]')).toHaveValue('');
    await fresh('?type=transfer&transfer=helicopter');
    await expect(step(page, 'details', 'transfer').locator('[name="transfer_type"]:checked')).toHaveCount(0);
    await fresh('?type=booking');
    await expect(step(page, 'service')).toBeVisible();
  });

  test('a multi-day tour: its page’s card prefills the tour, nights and date; nights appear only for it; the summary says Multi-day tour', async ({ page }) => {
    await inRand(page);
    await page.goto(`/packages/${MULTI_DAY}/?nomotion`);
    await page.locator('#book-date').fill(inDays(45));
    await page.locator('#book-nights').selectOption('7');
    await page.getByRole('button', { name: 'Get a Personalised Quote' }).click();
    await page.waitForSelector('.wizard.is-ready');
    const t = step(page, 'details', 'tour');
    await expect(page.locator('#enq-step-tour')).toBeVisible();
    await expect(page.locator('h1')).toHaveText('Book Your Multi-day Tour');
    await expect(t.locator('[name="tour_slug"]')).toHaveValue(MULTI_DAY);
    await expect(t.locator('[name="nights"]')).toBeVisible();
    await expect(t.locator('[name="nights"]')).toHaveValue('7');
    await expect(t.locator('[name="preferred_date"]')).toHaveValue(inDays(45));
    // Its own summary card, with its own photograph.
    const card = t.locator(`[data-tour-card="${MULTI_DAY}"]`);
    await expect(card).toBeVisible();
    await expect(card).toContainText('Your multi-day tour');
    await expect(card.locator('img')).toBeVisible();
    // The published rate is per day for 1–4 guests: 7 nights are 8 days.
    await expect(t.locator('[data-total-text]')).toHaveText('R68,000 for 8 days · R8,500 a day for 1–4 guests');

    // A day tour has no nights. The Garden Route suggests no length of its own: with none chosen it stays "not sure yet".
    await t.locator('[name="tour_slug"]').selectOption('cape-town-city-private-tour');
    await expect(t.locator('[name="nights"]')).toBeHidden();
    await expect(page.locator('h1')).toHaveText('Book Your Tour');
    await t.locator('[name="nights"]').evaluate((s) => (s.value = ''));
    await t.locator('[name="tour_slug"]').selectOption(MULTI_DAY);
    await expect(t.locator('[name="nights"]')).toHaveValue('');
    await expect(t.locator('[data-total-text]')).toHaveText('From R8,500 a day · the rate for 1–4 guests');

    await t.locator('[name="nights"]').selectOption('7');
    await t.locator('[name="pickup_area"]').fill('V&A Waterfront');
    await t.locator('[data-next]').click();
    await fillContact(page);
    const review = step(page, 'review');
    await expect(review).toContainText('Multi-day tour');
    await expect(review).toContainText('Multi-day tour details');
    await expect(review).toContainText('Garden Route Private Tour');
    await expect(review).toContainText('7 nights');
    await expect(review.locator('[data-submit]')).toHaveText(/Send Multi-day Enquiry/);
    await review.locator('[data-submit]').click();
    const json = JSON.parse(await page.locator('[data-preview-json]').textContent());
    expect(json.tour_slug).toBe(MULTI_DAY);
    expect(String(json.nights)).toBe('7');
    await axeClean(page);
  });

  test('multi-day tour links prefill the tour and its nights; a nights value the list does not offer is ignored', async ({ page }) => {
    await open(page, `?type=tour&tour=${MULTI_DAY}&nights=4`);
    const t = step(page, 'details', 'tour');
    await expect(t.locator('[name="tour_slug"]')).toHaveValue(MULTI_DAY);
    await expect(t.locator('[name="nights"]')).toHaveValue('4');
    await page.goto('/privacy/');
    await page.evaluate(() => sessionStorage.clear());
    await open(page, `?type=tour&tour=${MULTI_DAY}&nights=99`);
    await expect(t.locator('[name="tour_slug"]')).toHaveValue(MULTI_DAY);
    await expect(t.locator('[name="nights"]')).toHaveValue('');
  });

  test('the draft survives a reload, and a new enquiry link updates it without losing contact details', async ({ page }) => {
    await open(page, '?type=tour&tour=whale-watching-private-tour');
    const t = step(page, 'details', 'tour');
    await t.locator('[name="dates_flexible"]').check();
    await t.locator('[name="flexible_dates"]').fill('Any day in September');
    await t.locator('[name="pickup_area"]').fill('Gardens');
    await t.locator('[data-next]').click();
    await step(page, 'contact').locator('[name="name"]').fill('Amara Okafor');
    await page.reload();
    await page.waitForSelector('.wizard.is-ready');
    await expect(step(page, 'contact')).toBeVisible();
    await expect(step(page, 'contact').locator('[name="name"]')).toHaveValue('Amara Okafor');
    await open(page, '?type=tour&tour=cape-agulhas-private-tour');
    await expect(page.locator('#enq-step-tour')).toBeVisible();
    await expect(t.locator('[name="tour_slug"]')).toHaveValue('cape-agulhas-private-tour');
    await expect(t.locator('[name="flexible_dates"]')).toHaveValue('Any day in September');
    await expect(step(page, 'contact').locator('[name="name"]')).toHaveValue('Amara Okafor');
    const draft = JSON.parse(await page.evaluate(() => sessionStorage.getItem('gt:enquiry:draft')));
    expect(draft.panels.contact.name).toBe('Amara Okafor');
    expect(draft.panels.contact.gt_hp_check).toBeUndefined();
    expect(draft.elapsedBefore).toBeGreaterThan(0);
  });

  test('the Terms & Conditions box: unticked, required, opens the terms in a new tab without losing answers, shown on review', async ({ page, context }) => {
    await open(page, '?type=tour&tour=cape-town-city-private-tour');
    const t = step(page, 'details', 'tour');
    await t.locator('[name="preferred_date"]').fill(inDays(30));
    await t.locator('[name="pickup_area"]').fill('Hotel in Sea Point');
    await t.locator('[data-next]').click();
    const c = step(page, 'contact');
    const box = c.locator('[name="terms"]');
    await expect(box).not.toBeChecked();
    await expect(c.locator('label[for="enq-terms"]')).toHaveText('I have read and agree to the Terms & Conditions (opens in a new tab).');
    await c.locator('[name="name"]').fill('Amara Okafor');
    await c.locator('[name="email"]').fill('amara@example.com');
    await c.locator('[name="consent"]').check();

    // Without the tick: one concise error, linked from the summary, and the step does not advance.
    await c.locator('[data-next]').click();
    await expect(summary(page, 'contact').locator('li')).toHaveCount(1);
    await expect(summary(page, 'contact').locator('a')).toHaveText('Tick the box to agree to the Terms & Conditions.');
    await expect(box).toHaveAttribute('aria-invalid', 'true');
    await expect(step(page, 'review')).toBeHidden();

    // The link opens the terms in a new tab; the form keeps every answer.
    const [terms] = await Promise.all([context.waitForEvent('page'), c.locator('label[for="enq-terms"] a').click()]);
    await terms.waitForLoadState();
    expect(new URL(terms.url()).pathname).toBe('/terms/');
    await expect(terms.locator('h1')).toHaveText('Terms & Conditions');
    await terms.close();
    await expect(c.locator('[name="name"]')).toHaveValue('Amara Okafor');
    await expect(c.locator('[name="consent"]')).toBeChecked();
    await expect(box, 'opening the terms does not tick the box').not.toBeChecked();

    // A same-tab visit (the link opened without a new tab) and back: the draft brings the answers back.
    await page.goto('/terms/?nomotion');
    await page.goBack();
    await page.waitForSelector('.wizard.is-ready');
    await expect(step(page, 'contact').locator('[name="name"]')).toHaveValue('Amara Okafor');

    await step(page, 'contact').locator('[name="terms"]').check();
    await expect(summary(page, 'contact')).toBeHidden();
    await step(page, 'contact').locator('[data-next]').click();
    await expect(step(page, 'review')).toContainText('You agreed to the Terms & Conditions.');
  });

  test('works at 320px wide without horizontal scrolling on every step', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await open(page);
    await noOverflow(page);
    await page.locator('#enq-type-transfer').check();
    await step(page, 'service').locator('[data-next]').click();
    await noOverflow(page);
    await step(page, 'details', 'transfer').locator('[value="airport-arrival"]').check();
    await step(page, 'details', 'transfer').locator('[name="return_trip"]').check();
    await step(page, 'details', 'transfer').locator('[data-next]').click();
    await noOverflow(page);
    await fillTour(page);
    await noOverflow(page);
    await step(page, 'review').locator('[data-submit]').click();
    await expect(page.locator('[data-result="preview"]')).toBeVisible();
    await page.locator('[data-preview-json]').evaluate((el) => (el.closest('details').open = true));
    await noOverflow(page);
  });

  test('an offline notice appears and clears with the connection', async ({ page, context }) => {
    await open(page);
    await expect(page.locator('[data-offline]')).toBeHidden();
    await context.setOffline(true);
    await expect(page.locator('[data-offline]')).toBeVisible();
    await context.setOffline(false);
    await expect(page.locator('[data-offline]')).toBeHidden();
  });

  test('review and error states have no serious accessibility violations', async ({ page }) => {
    await open(page, '?type=tour');
    await step(page, 'details', 'tour').locator('[data-next]').click();
    await axeClean(page);
    await fillTour(page);
    await axeClean(page);
  });

  test('if the script never loads, the full form and a notice appear (CSS safety net, no inline script)', async ({ page }) => {
    await page.route('**/assets/js/enquiry.js', (route) => route.abort());
    await page.goto('/enquire/?nomotion');
    await expect(page.locator('#enq-step-service')).toBeVisible();
    await expect(page.locator('#enq-step-tour')).toBeHidden(); // until the 6 s safety net
    await expect(page.locator('.wizard-fallback-note')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('.wizard-fallback-note')).toContainText('did not load');
    for (const id of ['#enq-step-tour', '#enq-step-transfer', '#enq-step-contact']) await expect(page.locator(id)).toBeVisible();
    await expect(page.locator('[data-next]').first()).toBeHidden();
    await expect(page.locator('[data-submit]')).toBeHidden();
  });

  test('without JavaScript every question is visible and nothing can be submitted', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto('/enquire/');
    // (Playwright's text engine skips <noscript>, so locate it by CSS.)
    await expect(page.locator('.wizard noscript strong')).toHaveText('This form needs JavaScript to send.');
    await expect(page.locator('.wizard noscript strong')).toBeVisible();
    for (const id of ['#enq-step-service', '#enq-step-tour', '#enq-step-transfer', '#enq-step-contact']) await expect(page.locator(id)).toBeVisible();
    await expect(page.locator('[data-submit]')).toBeHidden();
    await expect(page.locator('[data-next]').first()).toBeHidden();
    await noOverflow(page);
    await context.close();
  });
});

/* ======================================================================== */
test.describe('enquiry wizard (live build)', () => {
  test.skip(!LIVE, 'set E2E_ENQUIRY_MODE=live and serve a live build');
  // Against a deployed site the emails are really sent, so they go to Resend's test inbox, which
  // accepts everything and bounces nothing (a bounce from example.com would hurt Good Times' sending domain).
  const unique = (tag) => {
    const id = `${tag.slice(0, 12)}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    return process.env.E2E_BASE_URL ? `delivered+${id}@resend.dev` : `e2e-${id}@example.com`;
  };
  // The API ignores anything sent within 3 seconds of opening the form (anti-spam).
  const humanPause = (page) => page.waitForTimeout(3200);

  test('a tour enquiry is received: GT- reference, the exact not-confirmed sentence, draft cleared', async ({ page }) => {
    await fillTour(page, { email: unique('tour'), date: await freeDates(page, inDays(30), 1, 7) });
    await humanPause(page);
    const [res] = await Promise.all([page.waitForResponse((r) => r.url().endsWith('/api/enquiries')), step(page, 'review').locator('[data-submit]').click()]);
    expect(res.status()).toBe(201);
    const ok = page.locator('[data-result="success"]');
    await expect(ok).toBeVisible();
    await expect(ok.locator('.wizard-result__title')).toBeFocused();
    await expect(ok.locator('[data-ref]')).toHaveText(REF);
    expect((await ok.locator('[data-ref]').textContent()).trim()).toBe((await res.json()).reference);
    await expect(ok).toContainText('Enquiry received; your booking is not yet confirmed.');
    expect(await page.evaluate(() => sessionStorage.getItem('gt:enquiry:draft'))).toBeNull();
    await axeClean(page);
  });

  test('a transfer request is received', async ({ page }) => {
    await fillTransfer(page, { email: unique('transfer'), date: await freeDates(page, inDays(20), 1, 7) });
    await expect(step(page, 'review').locator('[data-submit]')).toHaveText(/Send Transfer Enquiry/);
    await humanPause(page);
    const [res] = await Promise.all([page.waitForResponse((r) => r.url().endsWith('/api/enquiries')), step(page, 'review').locator('[data-submit]').click()]);
    expect(res.status()).toBe(201);
    await expect(page.locator('[data-result="success"] [data-ref]')).toHaveText(REF);
  });

  test('a multi-day tour request is received with its nights, the shortest and a longer stay', async ({ page }) => {
    for (const [slug, nights] of [[MULTI_DAY, '2'], [MULTI_DAY, '6']]) {
      // The tour holds a vehicle for its nights plus one day: start where that many days are still free
      const date = await freeDates(page, inDays(50), Number(nights) + 1, 60);
      await page.goto('/privacy/');
      await page.evaluate(() => sessionStorage.clear());
      await open(page, `?type=tour&tour=${slug}&nights=${nights}`);
      const t = step(page, 'details', 'tour');
      await t.locator('[name="preferred_date"]').fill(date);
      await t.locator('[name="pickup_area"]').fill('Cape Town International Airport');
      await t.locator('[data-next]').click();
      await fillContact(page, { email: unique(`${slug.slice(0, 6)}${nights}`) });
      await expect(step(page, 'review').locator('[data-submit]')).toHaveText(/Send Multi-day Enquiry/);
      await humanPause(page);
      const [res] = await Promise.all([page.waitForResponse((r) => r.url().endsWith('/api/enquiries')), step(page, 'review').locator('[data-submit]').click()]);
      expect(res.status(), `${slug} from ${date}`).toBe(201);
      const sent = JSON.parse(res.request().postData());
      expect([sent.tour_slug, String(sent.nights)]).toEqual([slug, nights]);
      await expect(page.locator('[data-result="success"] [data-ref]')).toHaveText(REF);
    }
  });

  test('a lost response is retried with the same idempotency key and shows the existing reference', async ({ page }) => {
    await fillTour(page, { email: unique('retry'), date: await freeDates(page, inDays(30), 1, 7) });
    await humanPause(page);
    let firstRef = '';
    let calls = 0;
    await page.route('**/api/enquiries', async (route) => {
      calls++;
      if (calls === 1) {
        const r = await route.fetch(); // reaches the server and is stored…
        firstRef = (await r.json()).reference;
        return route.abort('connectionreset'); // …but the browser never hears back
      }
      return route.continue();
    });
    await step(page, 'review').locator('[data-submit]').click();
    await expect(step(page, 'review').locator('[data-submit-error]')).toContainText('could not confirm that your enquiry was received');
    await step(page, 'review').locator('[data-submit]').click();
    const dup = page.locator('[data-result="duplicate"]');
    await expect(dup).toBeVisible();
    await expect(dup.locator('[data-ref]')).toHaveText(firstRef);
    expect(firstRef).toMatch(REF);
  });

  test('busy state blocks double submits; failures keep the answers and say what happened', async ({ page }) => {
    let calls = 0;
    const replies = [
      { status: 429, headers: { 'Retry-After': '30' }, body: { ok: false } },
      { status: 503, body: { ok: false, code: 'disabled' } },
      { status: 500, body: { ok: false } },
      { status: 504, body: {} },
      { status: 503, body: {} }, // a platform 503, not ours: outcome unknown
      { status: 200, body: { ok: true } }, // anti-spam decoy: never shown as success
      { status: 400, body: { ok: false, errors: { pickup_area: 'Tell us where to collect you: a hotel, address or area.' } } },
    ];
    const bodies = [];
    await page.route('**/api/enquiries', async (route) => {
      bodies.push(JSON.parse(route.request().postData()));
      const r = replies[calls++] || replies[replies.length - 1];
      await new Promise((ok) => setTimeout(ok, 400));
      await route.fulfill({ status: r.status, headers: { 'content-type': 'application/json', ...(r.headers || {}) }, body: JSON.stringify(r.body) });
    });
    await fillTour(page, { email: unique('mock'), date: await freeDates(page, inDays(30), 1, 7) });
    const submit = step(page, 'review').locator('[data-submit]');
    const error = step(page, 'review').locator('[data-submit-error]');
    await submit.click();
    await expect(submit).toHaveAttribute('aria-busy', 'true');
    await submit.click({ force: true });
    await expect(error).toContainText('wait 30 seconds');
    expect(calls).toBe(1);
    await submit.click();
    await expect(error).toContainText('paused');
    // 500, 504, a foreign 503 and the decoy: we cannot know, so we never say "not sent" (nor "sent").
    for (let i = 0; i < 4; i++) {
      const before = calls;
      await submit.click();
      await expect(submit).toHaveAttribute('aria-busy', 'false');
      expect(calls).toBe(before + 1);
      await expect(error).toBeVisible();
      await expect(error).toContainText('could not confirm that your enquiry was received');
      await expect(error).not.toContainText('not sent');
    }
    await expect(page.locator('[data-result="success"]')).toBeHidden();
    // Every retry carries the same idempotency key, and elapsed time from the monotonic clock.
    expect(new Set(bodies.map((b) => b.idempotency_key)).size).toBe(1);
    for (const b of bodies) {
      expect(Number.isInteger(b.elapsed_ms) && b.elapsed_ms >= 0).toBe(true);
      expect(b.started_at).toBeUndefined();
      expect(b.gt_hp_check).toBe('');
    }
    await submit.click();
    await expect(page.locator('#enq-step-tour')).toBeVisible();
    await expect(summary(page, 'details', 'tour')).toContainText('Tell us where to collect you');
    expect(await page.evaluate(() => sessionStorage.getItem('gt:enquiry:draft'))).toBeTruthy();
  });

  test('a 409 duplicate shows the existing reference', async ({ page }) => {
    await page.route('**/api/enquiries', (route) =>
      route.fulfill({ status: 409, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ok: false, code: 'duplicate_content', reference: 'GT-ABC234' }) }),
    );
    await fillTour(page, { email: unique('dup'), date: await freeDates(page, inDays(30), 1, 7) });
    await step(page, 'review').locator('[data-submit]').click();
    const dup = page.locator('[data-result="duplicate"]');
    await expect(dup).toBeVisible();
    await expect(dup.locator('[data-ref]')).toHaveText('GT-ABC234');
    await expect(dup).toContainText('Enquiry received; your booking is not yet confirmed.');
  });

  // Availability answers are mocked, so these run the same against any server's data.
  // The API's own wording (lib/enquiries/store.mjs › unavailableReason), with a fixed date.
  const FULL = 'We are fully booked on Monday 7 December 2026. Choose another date, or tick “My dates are flexible”.';
  const json = (body, status = 200) => ({ status, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

  test('a fully booked date is crossed out in the calendar, and Next refuses it at the date field', async ({ page }) => {
    const full = inDays(33);
    await page.route(
      (url) => url.pathname === '/api/availability',
      (route) =>
        route.request().method() === 'POST'
          ? route.fulfill(json({ ok: true, available: false, field: 'preferred_date', error: FULL }))
          : route.fulfill(json({ ok: true, month: full.slice(0, 7), earliest: inDays(1), full: [full], closed: [full] })),
    );
    await open(page, '?type=tour&tour=cape-town-city-private-tour');
    const t = step(page, 'details', 'tour');
    await t.locator('[name="preferred_date"]').fill(full);
    const day = t.locator(`.calendar [data-date="${full}"]`);
    await expect(day).toHaveClass(/is-booked/);
    await expect(day).toHaveAttribute('aria-disabled', 'true');
    await expect(day).toHaveAttribute('aria-label', /fully booked/);
    await expect(t.locator('.calendar__note')).toContainText('Fully booked days are crossed out');
    await t.locator('[name="pickup_area"]').fill('Hotel in Sea Point');
    await t.locator('[data-next]').click();
    await expect(summary(page, 'details', 'tour')).toContainText('fully booked');
    await expect(t.locator('[name="preferred_date"]')).toHaveAttribute('aria-invalid', 'true');
    await expect(step(page, 'contact')).toBeHidden();
    await axeClean(page);
  });

  test('keyboard focus stays in the calendar when a month’s availability arrives', async ({ page }) => {
    await page.route(
      (url) => url.pathname === '/api/availability',
      async (route) => {
        await new Promise((ok) => setTimeout(ok, 600)); // answers after the keyboard has moved on
        const month = new URL(route.request().url()).searchParams.get('month');
        await route.fulfill(json({ ok: true, month, earliest: inDays(1), full: [], closed: [] }));
      },
    );
    await open(page, '?type=tour&tour=cape-town-city-private-tour');
    const t = step(page, 'details', 'tour');
    await t.locator('.calendar [data-date][tabindex="0"]').focus();
    await page.keyboard.press('PageDown');
    await page.waitForTimeout(900);
    expect(await page.evaluate(() => Boolean(document.activeElement?.closest('.calendar') && document.activeElement.dataset.date))).toBe(true);
  });

  test('a date taken while the visitor was typing: the 409 "unavailable" on send goes back to the date, nothing shown as received', async ({ page }) => {
    await page.route('**/api/enquiries', (route) => route.fulfill(json({ ok: false, code: 'unavailable', field: 'preferred_date', error: FULL, errors: { preferred_date: FULL } }, 409)));
    await fillTour(page, { email: unique('taken'), date: await freeDates(page, inDays(30), 1, 7) });
    await step(page, 'review').locator('[data-submit]').click();
    await expect(step(page, 'details', 'tour')).toBeVisible();
    await expect(summary(page, 'details', 'tour')).toContainText('fully booked');
    await expect(page.locator('[data-result="success"]')).toBeHidden();
  });
});
