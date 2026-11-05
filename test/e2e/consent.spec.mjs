// Visit statistics with consent in a real browser. Preview builds carry no analytics config, so these tests add
// the production <meta name="gt-analytics"> to each page as it is served, and answer for Cloudflare's beacon with a
// stub that records it ran: nothing here ever reaches Cloudflare.
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const TOKEN = '0123456789abcdef0123456789abcdef';
const BEACON = 'https://static.cloudflareinsights.com/beacon.min.js';
const STUB = `window.__beacon = (window.__beacon || 0) + 1;
document.documentElement.dataset.beaconConfig = document.currentScript.getAttribute('data-cf-beacon');
fetch('https://cloudflareinsights.com/cdn-cgi/rum', { method: 'POST', body: '{}', keepalive: true }).catch(() => {});`;

/** Serve every page with the analytics config (and, optionally, the generated CSP and the zone's own injected beacon). */
async function withAnalytics(page, { csp = null, zoneInjection = false } = {}) {
  const hits = [];
  await page.route('**/*', async (route) => {
    if (route.request().resourceType() !== 'document') return route.continue();
    const res = await route.fetch();
    let body = await res.text();
    body = body.replace('<meta charset="utf-8">', `<meta charset="utf-8">\n<meta name="gt-analytics" content="${TOKEN}">`);
    // What a Cloudflare zone adds by itself when its automatic setup is on: a versioned beacon and an inline snippet.
    if (zoneInjection) body = body.replace('</body>', `<script defer src="${BEACON}/vTEST" data-cf-beacon='{"token":"${TOKEN}"}'></script><script>window.__zoneInline = true</script></body>`);
    const headers = { ...res.headers() };
    if (csp) headers['content-security-policy'] = csp;
    await route.fulfill({ response: res, body, headers });
  });
  // Registered last, so matched first: Cloudflare's addresses never leave the browser.
  await page.route(/^https:\/\/(static\.)?cloudflareinsights\.com\//, async (route) => {
    hits.push(route.request().url());
    if (route.request().url() === BEACON) return route.fulfill({ status: 200, contentType: 'text/javascript', body: STUB });
    if (route.request().url().startsWith(`${BEACON}/`)) return route.fulfill({ status: 200, contentType: 'text/javascript', body: 'window.__zoneBeacon = true' });
    return route.fulfill({ status: 204, body: '' });
  });
  return hits;
}

const banner = (page) => page.locator('[data-consent]');
const beaconRuns = (page) => page.evaluate(() => window.__beacon || 0);
const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('gt:consent') || 'null'));

test.describe('visit statistics with consent', () => {
  test('asked on arrival; nothing loads before a choice; Allow loads the beacon with the token, and is remembered', async ({ page }) => {
    const hits = await withAnalytics(page);
    await page.goto('/tours/?nomotion');
    await expect(banner(page)).toBeVisible();
    await expect(banner(page)).toContainText('May we count your visit with Cloudflare Web Analytics?');
    await expect(page.locator('[data-consent-settings]')).toBeVisible();
    expect(await page.evaluate(() => document.activeElement === document.body), 'the question does not take the focus').toBe(true);
    await page.waitForLoadState('networkidle');
    expect(hits, 'nothing requested before a choice').toEqual([]);

    await banner(page).getByRole('button', { name: 'Allow' }).click();
    await expect(banner(page)).toBeHidden();
    await expect.poll(() => beaconRuns(page)).toBe(1);
    expect(JSON.parse(await page.evaluate(() => document.documentElement.dataset.beaconConfig))).toEqual({ token: TOKEN });
    expect(await stored(page)).toMatchObject({ v: 1, analytics: 'granted' });

    await page.goto('/about/?nomotion');
    await expect(banner(page)).toBeHidden();
    await expect.poll(() => beaconRuns(page)).toBe(1);
    expect(hits.filter((u) => u === BEACON)).toHaveLength(2);
  });

  test('Decline: nothing loads on this page or the next; the footer reopens the choice and gives the focus back; Allow then loads it', async ({ page }) => {
    const hits = await withAnalytics(page);
    await page.goto('/contact/?nomotion');
    await banner(page).getByRole('button', { name: 'Decline' }).click();
    await expect(banner(page)).toBeHidden();
    expect(await stored(page)).toMatchObject({ v: 1, analytics: 'denied' });
    await page.goto('/faq/?nomotion');
    await page.waitForLoadState('networkidle');
    await expect(banner(page)).toBeHidden();
    expect(hits).toEqual([]);
    expect(await beaconRuns(page)).toBe(0);

    const settings = page.getByRole('button', { name: 'Analytics settings' });
    await settings.click();
    await expect(banner(page)).toBeVisible();
    await expect(banner(page)).toBeFocused();
    await expect(banner(page).locator('[data-consent-status]')).toHaveText('Visit statistics are off.');
    await expect(banner(page).getByRole('button', { name: 'Decline' })).toHaveAttribute('aria-pressed', 'true');
    await expect(banner(page).getByRole('button', { name: 'Allow' })).toHaveAttribute('aria-pressed', 'false');
    await page.keyboard.press('Escape');
    await expect(banner(page)).toBeHidden();
    await expect(settings).toBeFocused();
    expect(await stored(page)).toMatchObject({ analytics: 'denied' }, 'Escape changes nothing');

    await settings.click();
    await banner(page).getByRole('button', { name: 'Allow' }).click();
    await expect(banner(page)).toBeHidden();
    await expect(settings).toBeFocused();
    await expect.poll(() => beaconRuns(page)).toBe(1);
    expect(await stored(page)).toMatchObject({ analytics: 'granted' });
  });

  test('without the config (preview and staging builds) nothing is offered and nothing loads', async ({ page }) => {
    const hits = [];
    await page.route(/cloudflareinsights\.com/, (route) => {
      hits.push(route.request().url());
      return route.abort();
    });
    await page.goto('/tours/?nomotion');
    await page.waitForLoadState('networkidle');
    await expect(banner(page)).toBeHidden();
    await expect(page.locator('[data-consent-settings]')).toBeHidden();
    expect(hits).toEqual([]);
  });

  test('on a phone it sits inside the screen above the booking bar, with no sideways scrolling and no serious accessibility violations', async ({ page }) => {
    await withAnalytics(page);
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 740 });
      await page.goto('/tours/cape-town-city-private-tour/?nomotion');
      await expect(banner(page)).toBeVisible();
      const bar = page.locator('[data-contact-bar]');
      await expect(bar).toHaveClass(/is-visible/);
      await page.waitForTimeout(500); // the bar's slide-in
      const b = await banner(page).boundingBox();
      const c = await bar.boundingBox();
      expect(b.y + b.height, `${width}px: the banner ends above the bar`).toBeLessThanOrEqual(c.y);
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.x + b.width).toBeLessThanOrEqual(width);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, 'no horizontal scroll').toBeLessThanOrEqual(0);
    }
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    const bad = results.violations.filter((v) => ['serious', 'critical'].includes(v.impact));
    expect(bad.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });

  test('under the generated CSP: the beacon file and its endpoint are allowed, the zone’s own injected copy is refused', async ({ page, request }) => {
    // Locally the build's _headers file is served as it is; a deployed site applies it instead, so the policy is
    // read from a page's own response there. Either way it is the policy the build generated.
    const file = await request.get('/_headers');
    const fromFile = file.ok() ? /Content-Security-Policy: (.+)/.exec(await file.text())?.[1] : null;
    const csp = fromFile || (await request.get('/reviews/')).headers()['content-security-policy'];
    expect(csp, 'a Content-Security-Policy').toBeTruthy();
    await page.addInitScript(() => {
      window.__csp = [];
      document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(`${e.violatedDirective} ${e.blockedURI}`));
    });
    const hits = await withAnalytics(page, { csp, zoneInjection: true });
    await page.goto('/reviews/?nomotion');
    await page.waitForLoadState('networkidle');
    expect(await page.evaluate(() => [window.__zoneBeacon || false, window.__zoneInline || false]), 'the zone’s injection never runs').toEqual([false, false]);
    expect(hits, 'not even requested').toEqual([]);
    const before = await page.evaluate(() => window.__csp);
    expect(before.some((v) => v.startsWith('script-src') && v.includes('/beacon.min.js/vTEST'))).toBe(true);
    expect(before.some((v) => v.startsWith('script-src') && v.endsWith(' inline'))).toBe(true);

    await banner(page).getByRole('button', { name: 'Allow' }).click();
    await expect.poll(() => beaconRuns(page)).toBe(1);
    await expect.poll(() => hits.includes('https://cloudflareinsights.com/cdn-cgi/rum')).toBe(true);
    const after = (await page.evaluate(() => window.__csp)).filter((v) => !before.includes(v));
    expect(after, 'the allowed beacon and its report raise no violation').toEqual([]);
  });
});
