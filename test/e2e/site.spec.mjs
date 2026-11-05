// Site-wide browser checks: every page, navigation, interactive components, preview safety.
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PAGES = [
  '/',
  '/tours/',
  '/tours/cape-peninsula-private-tour/',
  '/tours/cape-town-city-private-tour/',
  '/tours/cape-winelands-private-tour/',
  '/tours/township-private-tour/',
  '/tours/private-cape-town-experience/',
  '/tours/whale-watching-private-tour/',
  '/tours/cape-agulhas-private-tour/',
  '/tours/shark-cage-diving/',
  '/tours/quad-biking/',
  '/tours/sky-diving/',
  '/packages/',
  '/packages/garden-route-private-tour/',
  '/transfers/',
  '/about/',
  '/reviews/',
  '/faq/',
  '/enquire/',
  '/destinations/',
  '/contact/',
  '/privacy/',
  '/terms/',
  '/design-system/',
];
const inDays = (n) => new Date(Date.now() + 2 * 3600e3 + n * 864e5).toISOString().slice(0, 10);
// The template's earlier operator, which must never be named anywhere on this site.
const FORMER_OPERATOR = /jap[ -]?shuttles|japshuttlesandtours|shuttlejap|\bJAP\b/i; // brand-guard-allow: proves the former operator is never named
// Photographs withdrawn on 5 Nov 2026 because they show children or people who may be under 18 (docs/RIGHTS_REGISTER.md)
const WITHDRAWN = ['company-garden-guide', 'langa-drumming', 'langa-local-guide', 'peninsula-granite-bay'];

test.describe('every page', () => {
  for (const path of PAGES) {
    test(`${path} renders cleanly`, async ({ page }) => {
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
      const res = await page.goto(`${path}?nomotion`);
      expect(res.status()).toBe(200);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page).toHaveTitle(/^Good Times in Cape Town \| .+|.+ \| Good Times$/);
      expect(await page.title()).not.toMatch(FORMER_OPERATOR);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, 'no horizontal scroll').toBeLessThanOrEqual(0);
      // Preview builds must never be indexable.
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
      expect(errors, errors.join('\n')).toEqual([]);
    });
  }

  test('missing pages return the 404 page with styles', async ({ page }) => {
    const res = await page.goto('/no-such-page/deeper/');
    expect(res.status()).toBe(404);
    await expect(page.locator('h1')).toContainText('doesn’t lead anywhere');
    const bg = await page.locator('.page-head').evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg).toBe('rgb(247, 250, 249)');
  });

  test('pages run under the generated Content-Security-Policy without violations', async ({ page, request }) => {
    test.setTimeout(120_000); // every page in turn, each through the injected policy
    // Locally the server does not send the policy, so inject the one written to site/_headers.
    // On a deployed host (which consumes _headers) the real response header is used instead.
    const file = await request.get('/_headers');
    const csp = file.ok() ? /Content-Security-Policy: (.+)/.exec(await file.text())?.[1] : null;
    if (csp) {
      await page.route('**/*', async (route) => {
        const res = await route.fetch();
        const h = { ...res.headers() };
        if ((h['content-type'] || '').includes('text/html')) h['content-security-policy'] = csp;
        await route.fulfill({ response: res, headers: h });
      });
    } else {
      const served = (await request.get('/')).headers()['content-security-policy'];
      expect(served, 'deployed host sends a Content-Security-Policy header').toMatch(/script-src 'self' 'sha256-/);
    }
    await page.addInitScript(() => {
      window.__csp = [];
      document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(`${e.violatedDirective} ${e.blockedURI}`));
    });
    for (const path of PAGES) {
      await page.goto(`${path}?nomotion`);
      await page.waitForLoadState('networkidle');
      expect(await page.evaluate(() => window.__csp), path).toEqual([]);
      await expect(page.locator('html')).toHaveClass(/\bjs\b/); // inline gate script ran
    }
  });

  test('robots.txt blocks crawling in preview builds', async ({ request }) => {
    const res = await request.get('/robots.txt');
    expect(await res.text()).toContain('Disallow: /');
  });
});

test.describe('accessibility (axe, WCAG 2.2 AA)', () => {
  for (const path of ['/', '/tours/', '/tours/cape-town-city-private-tour/', '/tours/whale-watching-private-tour/', '/tours/sky-diving/', '/packages/', '/packages/garden-route-private-tour/', '/transfers/', '/about/', '/reviews/', '/destinations/', '/contact/', '/faq/', '/enquire/', '/privacy/', '/terms/']) {
    test(`${path} has no serious or critical violations`, async ({ page }) => {
      await page.goto(`${path}?nomotion`);
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      const bad = results.violations.filter((v) => ['serious', 'critical'].includes(v.impact));
      expect(bad.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`), JSON.stringify(bad.map((v) => v.nodes.map((n) => n.target)), null, 1)).toEqual([]);
    });
  }
});

test.describe('navigation', () => {
  test('mobile drawer traps focus and closes with Escape', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'drawer is the mobile navigation');
    await page.goto('/?nomotion');
    const toggle = page.locator('[data-nav-toggle]');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#drawer')).toBeVisible();
    for (let i = 0; i < 15; i++) await page.keyboard.press('Tab');
    const inside = await page.evaluate(() => !!document.activeElement.closest('#drawer, .site-header'));
    expect(inside, 'focus stays inside the menu').toBe(true);
    await page.keyboard.press('Escape');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle).toBeFocused();
  });

  test('desktop navigation marks the current section', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop nav');
    await page.goto('/transfers/?nomotion');
    await expect(page.locator('.primary-nav a[aria-current="page"]')).toHaveText('Transfers');
  });

  test('the footer’s Terms & Conditions link opens the terms from a nested page, and a refresh keeps them', async ({ page }) => {
    await page.goto('/tours/cape-town-city-private-tour/?nomotion');
    const legal = page.locator('.site-footer nav[aria-labelledby="footer-legal"]');
    await expect(legal.locator('a')).toHaveText(['Privacy', 'Terms & Conditions', 'Photo credits']);
    await legal.getByRole('link', { name: 'Terms & Conditions' }).click();
    await expect(page).toHaveURL(/\/terms\/$/);
    await page.reload();
    await expect(page.locator('h1')).toHaveText('Terms & Conditions');
    // Good Times' published terms, section by section
    await expect(page.locator('.prose h2')).toHaveText(['1. Bookings', '2. Pricing & payment', '3. Cancellations & changes', '4. On tour', '5. Photography', '6. Liability', '7. Governing law']);
    await expect(page.locator('.prose')).toContainText('These terms are governed by the laws of South Africa.');
  });

  test('skip link moves focus to main content', async ({ page }) => {
    await page.goto('/tours/?nomotion');
    await page.keyboard.press('Tab');
    await expect(page.locator('.skip-link')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#main')).toBeFocused();
  });
});

test.describe('tours', () => {
  test('category chips filter the catalogue', async ({ page }) => {
    await page.goto('/tours/?nomotion');
    const visible = () => page.locator('.card[data-categories]:visible');
    const all = await visible().count();
    expect(all).toBe(11); // 10 tours and activities + the custom-day card
    await page.getByRole('button', { name: 'Wine & food' }).click();
    await expect(page.getByRole('button', { name: 'Wine & food' })).toHaveAttribute('aria-pressed', 'true');
    const filtered = await visible().count();
    expect(filtered).toBeLessThan(all);
    await expect(page.locator('[data-filter-status]')).toContainText(`${filtered} tour`);
    // The multi-day tour below the catalogue is never filtered away.
    await expect(page.locator('.card--package:visible')).toHaveCount(1);
    await page.getByRole('button', { name: 'All tours' }).click();
    await expect(visible()).toHaveCount(all);
  });

  test('tour tabs work with the keyboard', async ({ page }) => {
    await page.goto('/tours/cape-town-city-private-tour/?nomotion');
    const first = page.getByRole('tab', { name: 'Overview' });
    await first.focus();
    await page.keyboard.press('ArrowRight');
    const itinerary = page.getByRole('tab', { name: 'Itinerary' });
    await expect(itinerary).toBeFocused();
    await expect(itinerary).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#panel-itinerary')).toBeVisible();
    await expect(page.locator('#panel-overview')).toBeHidden();
    await page.keyboard.press('End');
    await expect(page.getByRole('tab', { name: 'FAQs' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#panel-faqs')).toBeVisible();
  });

  test('a destination link opens the catalogue filtered by its area', async ({ page }) => {
    await page.goto('/destinations/?nomotion');
    // The Overberg coast has three day tours, so its card opens the catalogue on them
    await page.locator('.card__title a', { hasText: 'The Overberg coast' }).click();
    await expect(page).toHaveURL(/\/tours\/#coast$/);
    await expect(page.locator('.card[data-categories]:visible')).toHaveCount(4); // 3 coast tours + the custom-day card
    await expect(page.locator('[data-filter-status]')).toContainText('4 tours');
  });

  test('the custom-day card shows its route collage: three labelled prints, decorative, inside the card (owner, 25 Oct 2026)', async ({ page }) => {
    await page.goto('/tours/?nomotion#city');
    const card = page.locator('.card--custom');
    const collage = card.locator('.route-collage');
    await expect(collage).toHaveAttribute('aria-hidden', 'true');
    await expect(collage.locator('figcaption')).toHaveText(['Peninsula', 'City', 'Winelands']);
    await expect(collage.locator('img')).toHaveCount(3);
    for (const img of await collage.locator('img').all()) await expect(img).toHaveAttribute('alt', '');
    const box = await card.boundingBox();
    for (const p of await collage.locator('.route-collage__print').all()) {
      const b = await p.boundingBox();
      expect(b.x).toBeGreaterThanOrEqual(box.x);
      expect(b.x + b.width).toBeLessThanOrEqual(box.x + box.width);
      expect(b.y + b.height).toBeLessThanOrEqual((await card.locator('.eyebrow').boundingBox()).y);
    }
    // Each print's label stays readable (no other print covers its middle), and the whole card, prints included,
    // is the one link to a custom-day request
    await collage.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    const hit = await collage.locator('figcaption').evaluateAll((caps) =>
      caps.map((c) => {
        const r = c.getBoundingClientRect();
        const stack = document.elementsFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        const print = stack.find((el) => el.closest('.route-collage__print'));
        return { own: c.closest('figure').contains(print), link: stack[0].matches('.card__title a') };
      }),
    );
    expect(hit).toEqual(Array(3).fill({ own: true, link: true }));
  });

  test('the photo band opens the gallery lightbox on its own photograph', async ({ page }) => {
    await page.goto('/tours/cape-town-city-private-tour/?nomotion');
    const opener = page.locator('.photo-band__btn');
    await expect(opener).toHaveText(/View Gallery/);
    const index = Number(await opener.getAttribute('data-lc-show')); // the band opens on its own photo
    const total = await page.locator('#panel-gallery [data-lc-open]').count();
    const pad = (v) => String(v).padStart(2, '0');
    await opener.click();
    const dialog = page.locator('[data-lc-lightbox]');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('[data-lc-close]')).toBeFocused();
    await expect(dialog.locator('[data-lc-count]')).toHaveText(`${pad(index + 1)} / ${pad(total)}`);
    await expect(dialog.locator('[data-lc-title]')).toHaveText(/\S/);
    await expect(dialog.locator('[data-lc-place]')).toHaveText(/\S/);
    await expect(dialog.locator('[data-lc-link]')).toBeHidden(); // no link back to the page it is on
    await expect(dialog.locator('[data-lc-story]')).toBeHidden();
    await expect(dialog.locator('[data-lc-credit]')).toHaveText(/\S/);
    await page.keyboard.press('ArrowRight');
    await expect(dialog.locator('[data-lc-count]')).toHaveText(`${pad(((index + 1) % total) + 1)} / ${pad(total)}`);
    await expect(dialog.locator('[data-lc-frame] img')).toHaveAttribute('alt', /\S/);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(opener).toBeFocused();
  });

  test('a tour gallery hangs as an exhibition whose Previous, Next and Close sit in one row', async ({ page }) => {
    await page.goto('/tours/cape-peninsula-private-tour/?nomotion');
    await page.locator('#tab-gallery').click();
    const prints = page.locator('#panel-gallery [data-lc-open]');
    await expect(prints).toHaveCount(7);
    await prints.nth(2).click();
    const dialog = page.locator('[data-lc-lightbox]');
    await expect(dialog.locator('[data-lc-count]')).toHaveText('03 / 07');
    const boxes = await Promise.all(['[data-lc-prev]', '[data-lc-next]', '[data-lc-close]'].map((sel) => dialog.locator(sel).boundingBox()));
    const mid = (b) => b.y + b.height / 2;
    expect(Math.abs(mid(boxes[0]) - mid(boxes[1]))).toBeLessThan(2);
    expect(Math.abs(mid(boxes[0]) - mid(boxes[2]))).toBeLessThan(2);
    expect(boxes[0].x + boxes[0].width).toBeLessThanOrEqual(boxes[1].x);
    // The photograph is shown whole, and the controls never sit on it
    const frame = await dialog.locator('[data-lc-frame]').boundingBox();
    for (const b of boxes) expect(b.y >= frame.y + frame.height || b.x >= frame.x + frame.width).toBe(true);
    await dialog.locator('[data-lc-prev]').click();
    await expect(dialog.locator('[data-lc-count]')).toHaveText('02 / 07');
    await dialog.locator('[data-lc-close]').click();
    await expect(dialog).toBeHidden();
    await expect(prints.nth(2)).toBeFocused();
  });

  test('the booking card carries the date and travellers into a prefilled booking request, with its price and no disclaimers', async ({ page }) => {
    await page.goto('/tours/cape-winelands-private-tour/?nomotion');
    const card = page.locator('.enquiry-card');
    // The price in the visitor's currency (a deployed preview tested from abroad shows ≈ and the converted amount), from its rand amount.
    await expect(card.locator('.enquiry-card__amount')).toHaveText(/^From (R|≈about (£|US\$|€|A\$|CA\$))[\d,]+$/);
    await expect(card.locator('.enquiry-card__amount [data-money]')).toHaveAttribute('data-money', /^\d+$/);
    // Removed at the owner's request (25 Oct 2026): the price label and note, and "Nothing is charged online"
    await expect(card).not.toContainText(/Indicative price|not our direct rate|Nothing is charged online/);
    // (Good Times' own published cancellation rule may be stated; no checkout language is)
    await expect(page.locator('body')).not.toContainText(/secure booking|confirm & pay/i);
    await card.locator('[name="date"]').fill(inDays(21));
    await card.locator('[data-travellers-toggle]').click();
    await card.locator('[aria-label="More adults"]').click();
    await expect(card.locator('[name="adults"]')).toHaveValue('3');
    await card.locator('[data-travellers-done]').click();
    await card.getByRole('button', { name: 'Request a Quote' }).click();
    await expect(page).toHaveURL(/\/enquire\/\?type=tour&tour=cape-winelands-private-tour&date=\d{4}-\d{2}-\d{2}&adults=3&children=0$/);
    await page.waitForSelector('.wizard.is-ready');
    await expect(page.locator('h1')).toHaveText('Book Your Tour');
    const details = page.locator('[data-wizard-step="details"][data-path="tour"]');
    await expect(details.locator('[name="tour_slug"]')).toHaveValue('cape-winelands-private-tour');
    await expect(details.locator('[name="preferred_date"]')).toHaveValue(inDays(21));
    await expect(details.locator('[name="adults"]')).toHaveValue('3');
  });
});

test.describe('home hero', () => {
  // "The world has stopped, the memories haven't": the café scene held still, one call to action bottom left, the phone
  // bottom right (index.mjs, styles.css › Home hero, HeroPhoneGallery). Face clearances at every size: qa/hero.mjs.
  const box = (loc) => loc.evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, right: r.right, bottom: r.bottom }; });

  test('shows the held café scene, one call to action bottom left and the phone bottom right: no paragraph, search panel, rating badge or second action', async ({ page }) => {
    await page.goto('/?nomotion');
    await expect(page.locator('.hero h1')).toHaveText('Good Times in Cape Town: private tours of Cape Town and the Western Cape with local guides, since 2014');
    await expect(page.locator('.hero h1')).toHaveClass('visually-hidden');
    const cta = page.locator('.hero a');
    await expect(cta).toHaveCount(1);
    await expect(cta).toHaveText('Good Times start Here!');
    await expect(cta).toHaveAttribute('href', /(^|\/)tours\/$/);
    await expect(cta).toBeVisible();
    await expect(page.locator('.hero__poster img')).toBeVisible();
    await expect(page.locator('.hero__poster img')).toHaveAttribute('alt', /^Four friends laughing at a photo on a phone/);
    await expect(page.locator('.hero .phone-gallery')).toBeVisible();
    // Bottom left and bottom right of the hero, apart from each other
    const [hero, c, phone] = [await box(page.locator('.hero')), await box(cta), await box(page.locator('.phone-gallery'))];
    expect(c.x + c.w / 2, 'call to action on the left').toBeLessThan(hero.x + hero.w / 2);
    expect(phone.x + phone.w / 2, 'phone on the right').toBeGreaterThan(hero.x + hero.w / 2);
    for (const b of [c, phone]) expect(hero.bottom - b.bottom, 'near the hero’s foot').toBeLessThan(40);
    expect(c.right, 'never under the phone').toBeLessThan(phone.x);
    expect(phone.right).toBeLessThanOrEqual(hero.right);
    await expect(page.locator('.hero p.hero__lead, .hero__link, .hero .search, .hero form, .hero [role="tablist"], .hero input, .hero .eyebrow, .hero .btn')).toHaveCount(0);
    await expect(page.locator('.hero .medallion, .hero .stars, .hero .rating')).toHaveCount(0);
    await expect(page.locator('.hero svg:not(.phone-gallery svg), .hero .icon')).toHaveCount(0);
    await expect(page.locator('.hero')).not.toContainText(/tripadvisor|extraordinary places|cape town, personally|tailored|find experiences/i);
    // The header over the hero: the reversed logo from the approved logo pack, Make It Yours with its ornamental coin
    const header = page.locator('.site-header--overlay');
    await expect(header.locator('.brand__logo--gold')).toBeVisible();
    // The approved compact lockup (light over the photograph, dark once condensed), drawn at its own proportions, never clipped or squeezed
    for (const [sel, file] of [['.brand__logo--gold', 'gt-logo-reversed-compact.svg'], ['.brand__logo--ink', 'gt-logo-compact.svg']]) await expect(header.locator(sel)).toHaveAttribute('src', new RegExp(`${file}$`));
    const lockup = await header.locator('.brand__logo--gold').evaluate((img) => {
      const r = img.getBoundingClientRect();
      const cs = getComputedStyle(img);
      return { ratio: r.width / r.height, natural: img.naturalWidth / img.naturalHeight, width: r.width, clipped: [cs.overflow, getComputedStyle(img.parentElement).overflow], fit: cs.objectFit };
    });
    expect(Math.abs(lockup.ratio - lockup.natural)).toBeLessThan(0.03);
    expect(lockup.width, 'never narrower than the kit minimum').toBeGreaterThanOrEqual(180);
    expect(lockup.clipped).not.toContain('hidden');
    await expect(header.locator('.header-cta')).toHaveAttribute('href', /(^|\/)enquire\/$/);
    await expect(header.locator('.header-cta .btn-coin__coin svg')).toHaveCount(1);
    await expect(header.locator('.primary-nav a')).toHaveText(['Tours', 'Transfers', 'Destinations', 'About', 'Contact']);
    const fonts = await page.evaluate(() => [...document.fonts].filter((f) => f.family === 'Plus Jakarta Sans' && f.status === 'loaded').map((f) => f.style));
    expect(fonts, 'Plus Jakarta Sans roman and italic loaded (“Here!” leans)').toEqual(expect.arrayContaining(['normal', 'italic']));
  });

  test('with motion the film fades in over its own first frame, muted and looping, with no controls or play button', async ({ page }) => {
    const media = [];
    page.on('request', (r) => r.url().includes('/assets/video/') && media.push(r.url().split('/').pop()));
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    await expect(page.locator('.hero__media')).toHaveClass(/\bis-playing\b/, { timeout: 15_000 });
    const film = await page.locator('.hero__video').evaluate((v) => ({ src: v.currentSrc.split('/').pop(), muted: v.muted, loop: v.loop, controls: v.controls, paused: v.paused, hidden: v.getAttribute('aria-hidden'), opacity: getComputedStyle(v).opacity }));
    expect(film).toEqual({ src: expect.stringMatching(/^hero-moment-1280\.(webm|mp4)$/), muted: true, loop: true, controls: false, paused: false, hidden: 'true', opacity: expect.any(String) });
    expect(media.every((f) => /^hero-moment-1280\.(webm|mp4)$/.test(f)), media.join()).toBe(true);
    // Poster and film share one crop, so nothing jumps as it fades in
    const fit = await page.evaluate(() => ['.hero__poster img', '.hero__video'].map((s) => { const cs = getComputedStyle(document.querySelector(s)); return `${cs.objectFit} ${cs.objectPosition}`; }));
    expect(fit[0]).toBe(fit[1]);
    await expect(page.locator('.hero [role="button"], [data-film-toggle], .hero video[controls]')).toHaveCount(0);
  });

  test('with motion the phone gallery swipes on its own: only the photographs move, clipped by the screen; the phone stays put; its key pauses and plays', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    await page.waitForFunction(() => !!(window.__phoneGalleries && window.__phoneGalleries[0] && window.__phoneGalleries[0].timeline()), null, { timeout: 15_000 });
    const plan = await page.evaluate(() => { const g = window.__phoneGalleries[0]; const tl = g.timeline(); return { repeat: tl.repeat(), cycle: tl.duration(), step: g.state.step }; });
    expect(plan.repeat, 'loops for ever').toBe(-1);
    expect(plan.cycle, 'six holds and six swipes').toBeGreaterThan(9);
    expect(plan.cycle).toBeLessThan(13);
    expect(plan.step, 'a page and the dark gap after it').toBeGreaterThan(100);
    const phone = page.locator('.phone-gallery');
    const frame = await phone.boundingBox();
    const toggle = page.locator('[data-phone-toggle]');
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-label', 'Pause the photo gallery');
    // The first swipe: the track moves left by one page, the counter follows, the phone does not move
    await expect(page.locator('[data-phone-count]')).toHaveText('2', { timeout: 8_000 });
    await page.waitForFunction(() => !window.__phoneGalleries[0].state.swiping);
    const x = await page.locator('[data-phone-track]').evaluate((t) => new DOMMatrix(getComputedStyle(t).transform).m41 / t.offsetWidth);
    expect(x).toBeCloseTo(-plan.step / 100, 2);
    expect(await phone.boundingBox(), 'the phone never moves').toEqual(frame);
    expect(await page.locator('.phone-gallery__screen').evaluate((s) => getComputedStyle(s).overflow)).toBe('hidden');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), 'no sideways scroll').toBeLessThanOrEqual(0);
    // Every photograph has loaded before the first swipe: none is ever empty
    expect(await page.locator('.phone-gallery__img').evaluateAll((imgs) => imgs.every((i) => i.complete && i.naturalWidth > 1 && !i.src.startsWith('data:')))).toBe(true);
    // Pause: the photograph stays; play: it carries on
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-label', 'Play the photo gallery');
    await page.waitForFunction(() => window.__phoneGalleries[0].timeline().paused());
    const held = await page.locator('[data-phone-count]').textContent();
    await page.waitForTimeout(3_000);
    await expect(page.locator('[data-phone-count]')).toHaveText(held);
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-label', 'Pause the photo gallery');
    expect(await page.evaluate(() => window.__phoneGalleries[0].timeline().paused())).toBe(false);
    // Leaving the page kills the timeline and every listener
    await page.evaluate(() => window.__phoneGalleries[0].destroy());
    expect(await page.evaluate(() => [window.__phoneGalleries[0].timeline(), window.__phoneGalleries[0].state.destroyed])).toEqual([null, true]);
    await expect(toggle).toBeHidden();
  });

  test('a click on the phone lifts its photograph out onto the hero (GSAP Flip), and a click away flies it back into the phone', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    await page.waitForFunction(() => !!(window.__phoneGalleries && window.__phoneGalleries[0] && window.__phoneGalleries[0].timeline()), null, { timeout: 15_000 });
    await page.waitForFunction(() => !window.__phoneGalleries[0].state.swiping);
    const k = await page.evaluate(() => window.__phoneGalleries[0].state.index);
    const inPhone = page.locator('.phone-gallery__slide').nth(k).locator('.phone-gallery__img');
    const opener = page.locator('[data-phone-open]');
    await opener.scrollIntoViewIfNeeded(); // so the click itself never scrolls the page
    const small = await inPhone.boundingBox();
    await expect(opener).toBeVisible();
    await expect(opener).toHaveAttribute('aria-label', new RegExp(`^Enlarge photo ${k + 1} of 6: `));
    await opener.click();
    const zoom = page.locator('.pg-zoom');
    await expect(zoom).toHaveJSProperty('open', true);
    // In flight it starts from the phone's own box; it lands far larger, centred on the hero, and the phone's copy is out
    await expect.poll(async () => (await zoom.locator('.pg-zoom__img').boundingBox()).width, { timeout: 3_000 }).toBeGreaterThan(small.width * 1.6);
    await page.waitForTimeout(1_000);
    const big = await zoom.locator('.pg-zoom__img').boundingBox();
    const hero = await page.locator('.hero').boundingBox();
    expect(Math.abs(big.x + big.width / 2 - (hero.x + hero.width / 2)), 'centred across the hero').toBeLessThan(4);
    expect(big.y + big.height, 'within the hero').toBeLessThan(hero.y + hero.height);
    expect(await inPhone.evaluate((i) => getComputedStyle(i).visibility), 'the photograph has left the phone').toBe('hidden');
    expect(await page.evaluate(() => [window.__phoneGalleries[0].timeline().paused(), window.__phoneGalleries[0].state.zoomed, document.documentElement.classList.contains('pg-locked')]), 'the swipe waits; the page holds still').toEqual([true, true, true]);
    await expect(zoom.locator('.pg-zoom__img')).toHaveAttribute('alt', await inPhone.getAttribute('alt'));
    expect(await zoom.locator('.pg-zoom__img').evaluate((i) => i.currentSrc), 'its largest rendition once landed').toMatch(/memories-[a-z-]+-(549|550|552|800)\.(avif|webp)$/);
    await expect(zoom.locator('.pg-zoom__place')).toHaveText(await page.locator('.phone-gallery__slide').nth(k).getAttribute('data-place'));
    await expect(zoom.locator('.pg-zoom__tour')).toHaveAttribute('href', /(^|\/)tours\/[a-z-]+\/$/);
    await expect(zoom.locator('.pg-zoom__meta')).toHaveText(new RegExp(`^Cape Town Memories · ${k + 1} / 6 · An AI-generated illustration$`));
    await expect(zoom.locator('.pg-zoom__close')).toBeFocused();
    // A click away (the dimmed hero, far from the photograph) puts it back, and the swipe carries on from it
    await page.mouse.click(hero.x + 24, hero.y + hero.height - 24);
    await expect(zoom).toHaveJSProperty('open', false, { timeout: 3_000 });
    await expect(page.locator('html')).not.toHaveClass(/\bpg-locked\b/); // the dialog's close event has been handled
    expect(await inPhone.evaluate((i) => getComputedStyle(i).visibility)).toBe('visible');
    expect(await inPhone.boundingBox(), 'back in exactly the same place').toEqual(small);
    expect(await page.evaluate(() => [window.__phoneGalleries[0].timeline().paused(), window.__phoneGalleries[0].state.zoomed, document.documentElement.classList.contains('pg-locked')])).toEqual([false, false, false]);
    await expect(opener).toBeFocused();
    await expect(page.locator('[data-phone-count]')).toHaveText(String(k + 1));
    // Escape is a way back too
    await opener.click();
    await expect(zoom).toHaveJSProperty('open', true);
    await page.keyboard.press('Escape');
    await expect(zoom).toHaveJSProperty('open', false, { timeout: 3_000 });
    await expect(page.locator('.hero a')).toHaveCount(1);
  });

  test('without motion the photograph is enlarged and put back at once, from the keyboard too, and the open dialog passes axe', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const opener = page.locator('[data-phone-open]');
    await expect(opener).toBeVisible();
    await opener.focus();
    await page.keyboard.press('Enter');
    const zoom = page.locator('.pg-zoom');
    await expect(zoom).toHaveJSProperty('open', true);
    expect(await zoom.locator('.pg-zoom__img').evaluate((i) => getComputedStyle(i).transform), 'nothing flies').toBe('none');
    await expect(zoom.locator('.pg-zoom__close')).toBeFocused();
    await expect(zoom.locator('.pg-zoom__place')).toHaveText('Table Mountain');
    const axe = await new AxeBuilder({ page }).include('.pg-zoom').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    expect(axe.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    await page.keyboard.press('Enter'); // Close
    await expect(zoom).toHaveJSProperty('open', false);
    await expect(opener).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(zoom).toHaveJSProperty('open', true);
    await page.keyboard.press('Escape');
    await expect(zoom).toHaveJSProperty('open', false);
    expect(await page.evaluate(() => window.__phoneGalleries[0].timeline()), 'still no swipe').toBeNull();
  });

  test('with motion, the entrance plays as one directed sequence of whole elements and settles into the approved layout', async ({ page, isMobile }) => {
    // The layout to settle into: the static hero, as rendered without motion
    await page.goto('/?nomotion');
    const boxes = (p) =>
      p.evaluate(() =>
        Object.fromEntries(
          ['.site-header--overlay .brand', '.site-header--overlay .header-cta', '.hero__cta', '.phone-gallery'].map((sel) => {
            const r = document.querySelector(sel).getBoundingClientRect();
            return [sel, [r.x, r.y, r.width, r.height].map((n) => Math.round(n))];
          }),
        ),
      );
    const settled = await boxes(page);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    await expect(page.locator('html')).toHaveClass(/\bintro-ready\b/);
    await expect(page.locator('.intro-char, .intro-word')).toHaveCount(0); // whole elements, never letters
    // The phone is never held back: its first photograph is there from the first paint
    expect(await page.locator('.phone-gallery').evaluate((el) => [getComputedStyle(el).opacity, getComputedStyle(el).visibility])).toEqual(['1', 'visible']);
    // One master timeline, acts in the directed order, timed for the screen
    const plan = await page.evaluate(() => {
      const tl = window.__heroEntrance;
      const name = (el) => (el.classList.contains('brand') ? 'brand' : el.classList.contains('header-cta') ? 'bookNow' : el.closest('.primary-nav') ? `title:${el.textContent.trim()}` : el.classList.contains('hero__cta') ? 'cta' : el.className.split(' ')[0]);
      return { duration: tl.duration(), timeScale: tl.timeScale(), landsAt: window.__brandPlane && window.__brandPlane.landsAt, tweens: tl.getChildren(false, true, false).map((t) => ({ at: t.startTime(), targets: t.targets().map(name) })) };
    });
    const startOf = (n) => plan.tweens.find((t) => t.targets.includes(n))?.at;
    expect(startOf('brand')).toBe(0);
    if (!isMobile) {
      expect(startOf('bookNow')).toBeCloseTo(0.15, 2);
      const titles = plan.tweens.find((t) => t.targets[0]?.startsWith('title:')).targets;
      expect(titles).toEqual(['title:Tours', 'title:Transfers', 'title:Destinations', 'title:About', 'title:Contact']);
      // The brand aircraft (brand-plane.js) flies from 0.15 s; its landing starts the titles
      expect(plan.landsAt).toBeGreaterThan(1);
      expect(startOf('title:Tours')).toBeCloseTo(0.15 + plan.landsAt + 0.08, 2);
    } else {
      expect(plan.tweens.some((t) => t.targets.some((n) => n.startsWith('title:') || n === 'bookNow')), 'hidden desktop titles and Book Now are left alone on phones').toBe(false);
    }
    expect(startOf('cta')).toBeCloseTo(2.2, 2);
    expect(startOf('hero__cta-sheen')).toBeCloseTo(2.82, 2);
    expect(plan.tweens.some((t) => t.targets.some((n) => /phone-gallery|hero__poster|hero__video/.test(n))), 'the scene and the phone are not part of it').toBe(false);
    const seconds = plan.duration / plan.timeScale;
    if (isMobile) expect(seconds).toBeLessThanOrEqual(2.5);
    else expect(seconds).toBeGreaterThan(3.4);
    expect(seconds).toBeLessThanOrEqual(3.8);
    // Nothing invisible can take focus while its entrance is pending
    expect(await page.locator('.hero__cta').evaluate((el) => getComputedStyle(el).visibility)).toBe('hidden');
    await expect(page.locator('html')).toHaveClass(/\bintro-done\b/, { timeout: 12_000 });
    const states = await page.evaluate(() =>
      [...document.querySelectorAll('.hero [data-intro], .site-header--overlay [data-intro]')].map((el) => [getComputedStyle(el).opacity, getComputedStyle(el).visibility]),
    );
    expect(states.length).toBeGreaterThan(isMobile ? 1 : 7);
    for (const [opacity, visibility] of states) expect([opacity, visibility]).toEqual(['1', 'visible']);
    expect(await boxes(page), 'every element settles exactly where the static hero draws it').toEqual(settled);
  });

  test('with reduced motion the scene stays a still, the gallery shows its first photograph and loads no other, and nothing is hidden', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const media = [];
    page.on('request', (r) => /\/assets\/(video\/|img\/memories-)/.test(r.url()) && media.push(r.url().split('/').pop()));
    await page.goto('/');
    await page.waitForTimeout(1_200);
    expect(media.filter((f) => !/^memories-table-mountain-/.test(f)), 'no film, and no other photograph').toEqual([]);
    await expect(page.locator('.hero__poster img')).toBeVisible();
    expect(await page.locator('.hero__video').evaluate((v) => v.currentSrc)).toBe('');
    await expect(page.locator('.hero__media')).not.toHaveClass(/\bis-playing\b/);
    await expect(page.locator('.hero h1')).toHaveCount(1);
    expect(await page.locator('.hero__cta').evaluate((el) => [getComputedStyle(el).opacity, getComputedStyle(el).visibility, getComputedStyle(el).transform])).toEqual(['1', 'visible', 'none']);
    // No timeline is built under reduced motion (the gallery's lift still works: it simply does not fly)
    expect(await page.evaluate(() => [window.__heroEntrance, window.__phoneGalleries[0].timeline()]), 'no timeline under reduced motion').toEqual([undefined, null]);
    await expect(page.locator('[data-phone-toggle]')).toBeHidden();
    await expect(page.locator('[data-phone-count]')).toHaveText('1');
    expect(await page.locator('[data-phone-track]').evaluate((t) => getComputedStyle(t).transform)).toBe('none');
    expect(await page.locator('.phone-gallery__slide').first().locator('.phone-gallery__img').evaluate((i) => i.complete && i.naturalWidth > 1)).toBe(true);
    await expect(page.locator('html')).toHaveClass(/\bintro-done\b/);
  });

  test('the call to action leads to the tours catalogue', async ({ page }) => {
    await page.goto('/?nomotion');
    await page.locator('.hero__cta').click();
    await expect(page).toHaveURL(/\/tours\/$/);
    await expect(page.locator('h1')).toHaveText('Tours & Experiences');
  });

  test('a plan carried in the URL still reaches the tours page, which shows it and passes it on', async ({ page }) => {
    await page.goto(`/tours/?pickup=Camps+Bay&date=${inDays(10)}&adults=2&children=0&nomotion`);
    await expect(page.locator('[data-plan-bar]')).toBeVisible();
    await expect(page.locator('[data-plan-bar]')).toContainText('Planning for 2 adults');
    await expect(page.locator('.card__title a').first()).toHaveAttribute('href', /\?.*adults=2/);
  });
});

test.describe('guest stories', () => {
  const real = (page) => page.locator('.stories [data-story-card]:not(.is-clone)');
  const running = (page) => page.evaluate(() => window.__stories.running());
  const index = (page) => page.evaluate(() => window.__stories.state.index);
  const trackX = (page) => page.evaluate(() => new DOMMatrixReadOnly(getComputedStyle(document.querySelector('[data-stories-track]')).transform).m41);
  /** The real cards whose boxes lie within the viewport's inner box */
  const inView = (page) =>
    page.evaluate(() => {
      const v = document.querySelector('[data-stories-viewport]').getBoundingClientRect();
      const cs = getComputedStyle(document.querySelector('[data-stories-viewport]'));
      const left = v.left + parseFloat(cs.paddingLeft);
      const right = v.right - parseFloat(cs.paddingRight);
      return [...document.querySelectorAll('.stories [data-story-card]')].filter((c) => {
        const r = c.getBoundingClientRect();
        return r.left >= left - 1 && r.right <= right + 1;
      }).map((c) => (c.classList.contains('is-clone') ? 'clone:' : '') + c.querySelector('.story-card__name').textContent.trim());
    });

  test('shows the compact design in the Living Cape surfaces: the heading beside the two listing figures, every review as a card with an illustrated avatar, our labelled summary, the reviewer’s rating and the link, and one Tripadvisor action', async ({ page, isMobile }) => {
    await page.goto('/?nomotion');
    const section = page.locator('section.stories#reviews');
    await expect(section).toHaveCount(1);
    // Chapter 10, "Words from the road", on deep navy
    await expect(section.locator('.stories__eyebrow .lc-mark__num')).toHaveText('10');
    await expect(section.locator('.stories__eyebrow .lc-mark__label')).toHaveText('Words from the road');
    await expect(section.locator('h2')).toHaveText('Beautiful places. Beautifully remembered.');
    await expect(section.locator('h2 em')).toHaveText('Beautifully remembered.');
    // Exactly two figures, the listing's own (site.tripadvisor), and nothing of the old strip: no breakdown, no checked date, no lead
    const stats = section.locator('[data-story-stats] .stories__stat');
    await expect(stats).toHaveCount(2);
    await expect(section.locator('.stories__stat-value')).toHaveText(['264', '5.0']);
    await expect(section.locator('.stories__stat-label')).toHaveText(['Tripadvisor reviews', 'Average rating']);
    await expect(section.locator('.stories__stat-sub')).toHaveText('out of 5');
    await expect(section.locator('.stories__stat-icon')).toHaveCount(2);
    await expect(section).not.toContainText(/259|Excellent reviews|Other reviews|Checked|names and places are as the reviewers gave them/);
    await expect(section.locator('.guest__lead, .guest__attribution, .guest__note, .guest__trio, .guest-card, [data-guest-dialog]')).toHaveCount(0);
    if (!isMobile) {
      const [head, statsBox] = await Promise.all([section.locator('.stories__intro').boundingBox(), section.locator('[data-story-stats]').boundingBox()]);
      expect(statsBox.x, 'the figures sit to the right of the heading on desktop').toBeGreaterThan(head.x + head.width);
    }
    // Every review, once, as a compact card: an illustrated avatar, name, place where given, our labelled summary
    // (never the reviewer's words: no permission to quote is recorded), the reviewer's own rating and the link to the review
    const cards = real(page);
    const { reviews } = await import('../../src/data/reviews.mjs');
    const { tours } = await import('../../src/data/tours.mjs');
    await expect(cards).toHaveCount(reviews.length);
    for (const [i, r] of reviews.entries()) {
      const card = cards.nth(i);
      await expect(card.locator('.story-card__name'), r.author).toHaveText(r.author);
      if (r.origin) await expect(card.locator('.story-card__place')).toHaveText(r.origin);
      else await expect(card.locator('.story-card__place')).toHaveCount(0);
      const about = r.tour ? tours.find((t) => t.slug === r.tour).shortTitle : r.label;
      await expect(card.locator('.story-card__label'), r.author).toHaveText(about ? `Review summary · ${about}` : 'Review summary');
      await expect(card.locator('.story-card__quote--summary p').last(), r.author).toHaveText(r.summary);
      await expect(card.locator('blockquote'), `${r.author}: no verbatim quote`).toHaveCount(0);
      await expect(card.locator('.story-card__source a')).toHaveAttribute('href', r.url);
      await expect(card.locator('.story-card__source a')).toHaveAttribute('target', '_blank');
      await expect(card.locator('.story-card__source a')).toHaveAttribute('rel', /\bnoopener\b/);
      // The reviewer's own profile photo once its file is supplied (named in the alt), otherwise an original illustration
      // over the initials (nobody's likeness, no alt)
      const src = await card.locator('.story-card__avatar img').getAttribute('src');
      if (src.startsWith('assets/img/reviewers/')) {
        expect(src, r.author).toBe(`assets/img/reviewers/${r.avatar}`);
        await expect(card.locator('.story-card__avatar img')).toHaveAttribute('alt', `${r.author}’s Tripadvisor profile photo`);
      } else {
        expect(src, r.author).toMatch(/^assets\/img\/avatars\/guest-\d{2}\.svg$/);
        await expect(card.locator('.story-card__avatar img')).toHaveAttribute('alt', '');
      }
      // Stars only where the review's own rating is recorded
      await expect(card.locator('.stars')).toHaveCount(r.rating ? 1 : 0);
      if (r.rating) await expect(card.locator('.story-card__stars .visually-hidden')).toHaveText(`Rated ${r.rating} out of 5`);
    }
    // The avatars are lazy; load every one so a missing file would fail here, and check their size
    const avatars = await cards.locator('.story-card__avatar').evaluateAll((els) =>
      Promise.all(
        els.map(async (el) => {
          const img = el.querySelector('img');
          img.loading = 'eager';
          const loaded = await img.decode().then(() => img.naturalWidth > 0, () => false);
          const r = el.getBoundingClientRect();
          return { size: Math.round(r.width), loaded, round: getComputedStyle(el).borderRadius };
        }),
      ),
    );
    for (const a of avatars) {
      expect(a.loaded).toBe(true);
      expect(a.size).toBe(isMobile ? 48 : 56); // compact, human-scale portraits (design.md §06: 40–56 px)
      expect(a.round).toBe('50%');
    }
    // No avatar strip or marquee and no backdrop photograph: the only images in the section are one avatar per card
    expect(await section.locator('img').count()).toBe(reviews.length);
    await expect(section.locator('.stories__avatars, .stories__marquee, [class*="strip"]')).toHaveCount(0);
    // One action beneath the cards, to the listing
    const cta = section.locator('.stories__cta');
    await expect(cta).toHaveCount(1);
    await expect(cta).toHaveText(/Read All Our Reviews on Tripadvisor/);
    await expect(cta).toHaveAttribute('href', /^https:\/\/www\.tripadvisor\.co\.za\/Attraction_Review-g312659-d19611200-/);
    await expect(cta).toHaveAttribute('target', '_blank');
    await expect(cta).toHaveAttribute('rel', /\bnoopener\b/);
    await expect(section.locator('a.btn, a[href$="reviews/"]')).toHaveCount(0);
    const [ctaBox, carouselBox] = await Promise.all([cta.boundingBox(), section.locator('[data-stories]').boundingBox()]);
    expect(ctaBox.y).toBeGreaterThanOrEqual(carouselBox.y + carouselBox.height - 1);
    // Compact: the whole section on a 1440 × 900 desktop stays well under a screen and a half (each card carries a
    // summary label and the reviewer's stars, a line more than a bare quote)
    if (!isMobile) expect((await section.boundingBox()).height, 'section height').toBeLessThanOrEqual(760);
    // Deep navy ground and white review panels; nothing overflows the page
    expect(await section.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgb(11, 34, 51)');
    expect(await section.locator('.story-card__inner').first().evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgb(255, 255, 255)');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  });

  test('the rating is promoted here alone: the Tripadvisor band, the medallion and the duplicate figures are gone from every page', async ({ page }) => {
    for (const path of ['/', '/about/', '/contact/', '/tours/', '/transfers/', '/reviews/']) {
      await page.goto(`${path}?nomotion`);
      await expect(page.locator('.ta-band, .medallion'), path).toHaveCount(0);
      if (path !== '/reviews/') await expect(page.locator('.reviews-photo'), `${path} (the Reviews page keeps its own photo hero)`).toHaveCount(0);
      await expect(page.locator('body'), path).not.toContainText(/Rated 5\.0 on Tripadvisor|traveller reviews|271 of them Excellent|what guests say about their days/i);
    }
    await page.goto('/?nomotion');
    await expect(page.locator('.band')).toHaveCount(0); // no trust band: its cues are part of the home story
    await expect(page.locator('.stories')).toHaveCount(1);
    // The only star rows on the home page are the reviewers' own ratings, one per review card
    const { reviews } = await import('../../src/data/reviews.mjs');
    await expect(page.locator('main .stars')).toHaveCount(reviews.filter((r) => r.rating).length);
    expect(await page.locator('main .stars').evaluateAll((els) => els.every((el) => el.closest('[data-story-card]')))).toBe(true);
    await page.goto('/about/?nomotion');
    await expect(page.locator('.stats, .themes .stars')).toHaveCount(0); // no figures strip on About
    await expect(page.locator('main')).not.toContainText(/tripadvisor|264|5\.0/i);
    await page.goto('/contact/?nomotion');
    await expect(page.locator('main')).not.toContainText(/Rated \d|264/);
    await expect(page.locator('main a[href$="reviews/"]')).toHaveCount(1);
  });

  test('the two figures count up once, from zero to the exact values, when they scroll into view; without motion they are simply there', async ({ page }) => {
    const values = () => page.locator('[data-story-stats] [data-count]').evaluateAll((els) => els.map((el) => el.textContent));
    const show = () => page.evaluate(() => { const r = document.querySelector('[data-story-stats]').getBoundingClientRect(); window.scrollTo({ top: window.scrollY + r.top - window.innerHeight * 0.6, behavior: 'instant' }); });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    expect(await values(), 'zero until the figures are in view').toEqual(['0', '0.0']);
    expect(await page.evaluate(() => window.__guestCounters.timeline.isActive())).toBe(false);
    await show();
    await page.waitForTimeout(700);
    const mid = await values();
    expect(Number(mid[0])).toBeGreaterThan(0);
    expect(Number(mid[0])).toBeLessThan(264);
    expect(mid[1]).toMatch(/^\d\.\d$/);
    await expect.poll(values, { timeout: 4_000 }).toEqual(['264', '5.0']);
    await expect(page.locator('[data-story-stats]')).toHaveAttribute('data-counted', '');
    // Once only: leaving and returning changes nothing
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.waitForTimeout(200);
    await show();
    await page.waitForTimeout(400);
    expect(await values()).toEqual(['264', '5.0']);
    // Reduced motion and ?nomotion: the exact figures from the first paint, no timeline
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    expect(await values()).toEqual(['264', '5.0']);
    expect(await page.evaluate(() => window.__guestCounters)).toBeUndefined();
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/?nomotion');
    expect(await values()).toEqual(['264', '5.0']);
    expect(await page.evaluate(() => window.__guestCounters)).toBeUndefined();
  });

  test('with motion the carousel moves a card at a time under GSAP, loops without a visible seam, advances by itself about every 5 s, and rests for the pointer, focus, the Pause control and the page scrolling on', async ({ page, isMobile }) => {
    test.setTimeout(90_000);
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    const carousel = page.locator('[data-stories]');
    await carousel.scrollIntoViewIfNeeded();
    await expect(carousel).toHaveClass(/\bis-motion\b/);
    expect(await page.evaluate(() => window.__stories.mounted())).toBe(true);
    const total = await real(page).count();
    const visible = isMobile ? 1 : 3;
    // The cloned run at each end: hidden from assistive technology, inert, never a tab stop
    const clones = page.locator('.stories [data-story-card].is-clone');
    await expect(clones).toHaveCount(2 * visible);
    expect(await clones.evaluateAll((els) => els.every((el) => el.getAttribute('aria-hidden') === 'true' && el.hasAttribute('inert')))).toBe(true);
    expect(await clones.locator('a, button').evaluateAll((els) => els.every((el) => el.tabIndex === -1))).toBe(true);
    // Exactly `visible` real cards in view, starting with the first; no clone on screen at rest
    // (checked before the axe scan: on the long home page the scan can outlast the 5 s autoplay)
    const first = await real(page).first().locator('.story-card__name').textContent();
    expect(await inView(page)).toHaveLength(visible);
    expect((await inView(page))[0]).toBe(first.trim());
    const axe = await new AxeBuilder({ page }).include('.stories').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    expect(axe.violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => v.id)).toEqual([]);
    // Next glides exactly one card; Previous glides back; the transform alone moves the track
    const step = await page.evaluate(() => {
      const track = document.querySelector('[data-stories-track]');
      return track.children[0].getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap);
    });
    // The scan may have outlasted an autoplay step: start the button checks from the first card, settled
    if ((await index(page)) !== 0) {
      await page.locator('[data-stories-viewport]').hover();
      await expect.poll(() => running(page)).toBe(false);
      while ((await index(page)) !== 0) {
        await page.locator('[data-stories-prev]').click();
        await page.waitForTimeout(850);
      }
    }
    const x0 = await trackX(page);
    await page.locator('[data-stories-next]').click();
    await expect.poll(() => index(page)).toBe(1);
    await page.waitForTimeout(900);
    expect(Math.abs((await trackX(page)) - (x0 - step))).toBeLessThan(1);
    expect(await page.locator('[data-stories-viewport]').evaluate((el) => [getComputedStyle(el).overflowX, el.scrollLeft])).toEqual(['hidden', 0]);
    await page.locator('[data-stories-prev]').click();
    await expect.poll(() => index(page)).toBe(0);
    await page.waitForTimeout(900);
    expect(Math.abs((await trackX(page)) - x0)).toBeLessThan(1);
    // Round the whole collection: after `total` presses the first card leads again at the same x, with no clone left in view
    for (let i = 0; i < total; i++) {
      await page.locator('[data-stories-next]').click();
      await page.waitForTimeout(850);
    }
    await expect.poll(() => index(page)).toBe(0);
    expect(Math.abs((await trackX(page)) - x0), 'seamless loop').toBeLessThan(1);
    expect((await inView(page)).some((n) => n.startsWith('clone:'))).toBe(false);
    expect((await inView(page))[0]).toBe(first.trim());
    // Backwards past the start: the last card comes round
    await page.locator('[data-stories-prev]').click();
    await expect.poll(() => index(page)).toBe(total - 1);
    await page.waitForTimeout(900);
    expect((await inView(page))[0]).toBe((await real(page).nth(total - 1).locator('.story-card__name').textContent()).trim());
    await page.locator('[data-stories-next]').click();
    await expect.poll(() => index(page)).toBe(0);
    await page.waitForTimeout(900);
    // Autoplay: with the pointer away and nothing focused, the next card comes by itself within about six seconds
    await page.evaluate(() => document.activeElement.blur());
    await page.mouse.move(2, 2);
    await expect.poll(() => running(page), { timeout: 3_000 }).toBe(true);
    const before = await index(page);
    await expect.poll(() => index(page), { timeout: 7_000 }).toBe((before + 1) % total);
    // Rest while the pointer is over it
    const box = await page.locator('[data-stories-viewport]').boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await expect.poll(() => running(page)).toBe(false);
    const held = await index(page);
    await page.waitForTimeout(5_600);
    expect(await index(page), 'nothing moves under the pointer').toBe(held);
    await page.mouse.move(2, 2);
    await expect.poll(() => running(page)).toBe(true);
    // Rest while anything inside has focus; the keyboard steps a card from the scroller
    const viewport = page.locator('[data-stories-viewport]');
    await viewport.focus();
    await expect.poll(() => running(page)).toBe(false);
    const at = await index(page);
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => index(page)).toBe((at + 1) % total);
    await page.keyboard.press('ArrowLeft');
    await expect.poll(() => index(page)).toBe(at);
    await page.evaluate(() => document.activeElement.blur());
    await expect.poll(() => running(page)).toBe(true);
    // The explicit control
    const toggle = page.locator('[data-stories-toggle]');
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-label', 'Pause the reviews');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-label', 'Play the reviews');
    await expect(toggle).toHaveClass(/\bis-paused\b/);
    await page.mouse.move(2, 2);
    await page.evaluate(() => document.activeElement.blur());
    expect(await running(page)).toBe(false);
    await toggle.click();
    await page.mouse.move(2, 2);
    await page.evaluate(() => document.activeElement.blur());
    await expect.poll(() => running(page)).toBe(true);
    // Rest while the section is off screen
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await expect.poll(() => page.evaluate(() => window.__stories.state.offscreen)).toBe(true);
    expect(await running(page)).toBe(false);
    // Tabbing through the region reaches the arrows, the scroller, each real card's link and the control, never a clone
    await carousel.scrollIntoViewIfNeeded();
    await page.locator('[data-stories-prev]').focus();
    const visited = [];
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press('Tab');
      const where = await page.evaluate(() => {
        const el = document.activeElement;
        return { inside: !!el.closest('[data-stories]'), clone: !!el.closest('.is-clone'), inCard: !!el.closest('[data-story-card]') };
      });
      if (!where.inside) break;
      visited.push(where);
    }
    expect(visited.some((v) => v.clone), 'a clone took focus').toBe(false);
    expect(visited.filter((v) => v.inCard).length, 'each real card’s link once').toBe(total);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
    expect(errors).toEqual([]);
  });

  test('a swipe moves the carousel a card', async ({ page, isMobile }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    const carousel = page.locator('[data-stories]');
    await carousel.scrollIntoViewIfNeeded();
    await expect(carousel).toHaveClass(/\bis-motion\b/);
    const box = await page.locator('[data-stories-viewport]').boundingBox();
    const y = box.y + box.height / 2;
    const swipe = async (from, to) => {
      await page.mouse.move(from, y);
      await page.mouse.down();
      for (let i = 1; i <= 8; i++) await page.mouse.move(from + ((to - from) * i) / 8, y + (i % 2));
      await page.mouse.up();
    };
    await swipe(box.x + box.width * 0.7, box.x + box.width * 0.2);
    await expect.poll(() => index(page), { timeout: 3_000 }).toBe(1);
    await expect(carousel).not.toHaveClass(/is-dragging/);
    await page.waitForTimeout(900);
    if (isMobile) expect((await inView(page))[0]).toBe((await real(page).nth(1).locator('.story-card__name').textContent()).trim());
    await swipe(box.x + box.width * 0.2, box.x + box.width * 0.7);
    await expect.poll(() => index(page), { timeout: 3_000 }).toBe(0);
    // A short drag lands back where it was
    await swipe(box.x + box.width * 0.5, box.x + box.width * 0.5 - 12);
    await page.waitForTimeout(900);
    expect(await index(page)).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  });

  test('with reduced motion or ?nomotion the carousel is a native snapping scroller with no autoplay and no clones, and the arrows scroll it a card at a time', async ({ page, isMobile }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const carousel = page.locator('[data-stories]');
    await carousel.scrollIntoViewIfNeeded();
    await expect(carousel).not.toHaveClass(/is-motion/);
    await expect(page.locator('.stories .is-clone')).toHaveCount(0);
    expect(await page.evaluate(() => window.__stories.mounted())).toBe(false);
    await expect(page.locator('[data-stories-toggle]')).toBeHidden();
    const viewport = page.locator('[data-stories-viewport]');
    expect(await viewport.evaluate((el) => [getComputedStyle(el).overflowX, getComputedStyle(el).scrollSnapType])).toEqual(['auto', expect.stringMatching(/^x/)]);
    expect(await page.locator('[data-stories-track]').evaluate((el) => getComputedStyle(el).transform)).toBe('none');
    const at = () => viewport.evaluate((el) => el.scrollLeft);
    const x0 = await at();
    await page.waitForTimeout(5_600);
    expect(await at(), 'nothing moves by itself').toBe(x0);
    const card = await real(page).first().boundingBox();
    const box = await viewport.boundingBox();
    if (isMobile) {
      expect(card.width / box.width).toBeGreaterThan(0.8);
      expect(card.width / box.width).toBeLessThan(1);
    }
    for (const sel of ['[data-stories-prev]', '[data-stories-next]']) await expect(page.locator(sel)).toBeVisible();
    await page.locator('[data-stories-next]').click();
    await expect.poll(at).toBeGreaterThan(card.width * 0.9);
    await page.locator('[data-stories-prev]').click();
    await expect.poll(at).toBeLessThan(2);
    if (isMobile) {
      // A swipe (here a horizontal wheel over the scroller) scrolls the row, not the page
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.wheel(260, 0);
      await expect.poll(at).toBeGreaterThan(100);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/?nomotion');
    await expect(page.locator('[data-stories]')).not.toHaveClass(/is-motion/);
    await expect(page.locator('.stories .is-clone')).toHaveCount(0);
  });
});

test.describe('home story: The Cape, A Living Story', () => {
  // The taste composition (`taste`) is a second, unnumbered interlude between 07 and 08
  const CHAPTERS = ['lc-sun', 'lc-scene', 'lc-moments', 'lc-film', 'lc-wild', 'lc-ways', 'lc-people', 'taste', 'lc-gallery', 'lc-scene', 'lc-ease', 'stories', 'lc-scene'];

  test('tells one story in order below the hero: eleven chapters and two interludes, each with its own heading', async ({ page }) => {
    await page.goto('/?nomotion');
    // The hero is the first thing in <main>; the story is one scoped block beneath it
    await expect(page.locator('main > :first-child')).toHaveClass(/^hero$/);
    // Between them, the sand journey (partials/sand-journey.mjs; test/e2e/motion.spec.mjs)
    expect(await page.locator('main > *').evaluateAll((els) => els.map((el) => el.className.split(' ')[0]))).toEqual(['hero', 'sand-journey', 'living-cape']);
    expect(await page.locator('.living-cape > section').evaluateAll((els) => els.map((el) => el.className.split(' ')[0]))).toEqual(CHAPTERS);
    const heroBottom = await page.locator('.hero').evaluate((el) => el.getBoundingClientRect().bottom + scrollY);
    expect(await page.locator('.living-cape').evaluate((el) => el.getBoundingClientRect().top + scrollY)).toBeGreaterThanOrEqual(heroBottom - 1);
    await expect(page.locator('.hero .living-cape, .hero [data-reveal], .hero .gt-engraved-icon, .hero .lc-seal, .hero .lc-note')).toHaveCount(0);
    // Chapter marks 01–11 in order, and the chapters' headings
    expect(await page.locator('.living-cape .lc-mark__num').allTextContents()).toEqual(['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11']);
    expect(await page.locator('.living-cape > section h2').evaluateAll((els) => els.filter((h) => !h.closest('dialog')).map((h) => h.textContent.replace(/\s+/g, ' ').trim()))).toEqual([
      'A private day, shaped around you.',
      'The coast road is half the adventure.',
      'It’s not only where you go. It’s everything along the way.',
      'Which side of the Cape will you fall in love with?',
      'The best journeys leave room for the unexpected.',
      'Four ways to see the Cape with us.',
      'The beautiful places are only part of the story.',
      'The Cape is also something you taste.',
      'Some memories never leave the frame.',
      'Some days you wish could last a little longer.',
      'All the wonder. None of the worry.',
      'Beautiful places. Beautifully remembered.',
      'The Cape is waiting. Make the journey yours.',
    ]);
    // One h1 (the hero's); every chapter heading is an h2
    await expect(page.locator('h1')).toHaveCount(1);
    // None of the template's earlier home sections remain
    await expect(page.locator('.offer, .roads, .why, .moments, .route, .invite, .band')).toHaveCount(0);
  });

  test('every chapter link leads to a real route: the four services, six destinations, the gallery’s days and the closing actions', async ({ page }) => {
    await page.goto('/?nomotion');
    const ways = page.locator('.lc-way__name a');
    await expect(ways).toHaveText(['Private Tours', 'Airport Transfers', 'Adventure Activities', 'Custom Journeys']);
    await expect(page.locator('.lc-way__go')).toHaveText(['Explore Tours', 'Arrange a Transfer', 'Add an Adventure', 'Tailor Your Journey']);
    await expect(page.locator('.lc-way__extra')).toHaveText('The Garden Route Tour');
    for (const [i, href] of [/(^|\/)tours\/$/, /(^|\/)transfers\/#airport$/, /(^|\/)tours\/#adventure$/, /(^|\/)enquire\/\?type=tour&tour=custom$/].entries()) await expect(ways.nth(i)).toHaveAttribute('href', href);
    await expect(page.locator('.lc-way__extra')).toHaveAttribute('href', /(^|\/)packages\/$/);
    // Each service is shown with a real Good Times photograph, not an icon card
    await expect(page.locator('.lc-way__photo img')).toHaveCount(4);
    expect(await page.locator('.lc-way__photo img').evaluateAll((imgs) => imgs.map((i) => i.alt))).toEqual(expect.arrayContaining([expect.stringMatching(/Cape of Good Hope/), expect.stringMatching(/departures/), expect.stringMatching(/quad bikes/), expect.stringMatching(/Rooiberg/)]));
    await expect(page.locator('.lc-way .gt-engraved-icon:not(.lc-way__go .gt-engraved-icon)')).toHaveCount(0);
    await expect(page.locator('.lc-ways__book .lc-seal')).toHaveAttribute('href', /(^|\/)enquire\/$/);
    const { destinations } = await import('../../src/data/tours.mjs');
    const film = page.locator('.lc-film__name a');
    await expect(film).toHaveCount(6);
    for (const [i, id] of ['peninsula', 'city', 'langa', 'winelands', 'overberg', 'garden-route'].entries()) {
      const d = destinations.find((x) => x.id === id);
      await expect(film.nth(i)).toHaveText(d.name);
      await expect(film.nth(i)).toHaveAttribute('href', new RegExp(`(^|/)${d.href.replace(/[?#.]/g, '\\$&')}$`));
    }
    // Every link in the story resolves (same-origin pages and assets)
    const hrefs = await page.locator('.living-cape a[href]').evaluateAll((as) => [...new Set(as.map((a) => a.href).filter((h) => h.startsWith(location.origin)))]);
    for (const href of hrefs) expect((await page.request.get(href.split('#')[0])).status(), href).toBe(200);
    // The closing actions open the booking request on the chosen path
    await page.locator('.lc-scene--invite .lc-seal').click();
    await expect(page).toHaveURL(/\/enquire\/\?type=tour$/);
    await page.waitForSelector('.wizard.is-ready');
    await expect(page.locator('h1')).toHaveText('Book Your Tour');
    await page.goto('/?nomotion');
    await page.locator('.lc-scene--invite .lc-quiet').click();
    await expect(page).toHaveURL(/\/enquire\/\?type=transfer&transfer=airport-arrival$/);
    await page.waitForSelector('.wizard.is-ready');
    await expect(page.locator('[data-wizard-step="details"][data-path="transfer"] [name="transfer_type"][value="airport-arrival"]')).toBeChecked();
  });

  test('the interlude’s two backdrops are Good Times’ own photographs, with no on-image disclaimers; captions carry places, nobody is named, and no withdrawn photograph appears', async ({ page }) => {
    await page.goto('/?nomotion');
    const { images } = await import('../../src/data/images.mjs');
    const art = page.locator('.lc-wild__art img');
    await expect(art).toHaveCount(2);
    // Real photographs from the image register, each with its own description: no illustration stands in for one
    for (const [src, alt] of await art.evaluateAll((imgs) => imgs.map((i) => [i.getAttribute('src'), i.alt]))) {
      const entry = images.find((x) => x.name === /assets\/img\/(.+)-\d+\.\w+$/.exec(src)?.[1]);
      expect(entry, `${src} is in the image register`).toBeTruthy();
      expect(alt).toBe(entry.alt);
    }
    await expect(page.locator('.lc-wild__label, .lc-wild__tag')).toHaveCount(0);
    await expect(page.locator('.lc-wild')).not.toContainText(/AI-generated|Illustration|Artwork, not photographs/);
    // The words invite an adventure; they promise no sighting or outcome
    await expect(page.locator('.lc-wild')).not.toContainText(/you will see|guaranteed|our photograph/i);
    // Each is a full-bleed backdrop held while the words pass (CSS sticky); the cheetah's panel rises over the elephant's
    for (const media of await page.locator('.lc-wild__media').all()) {
      expect(await media.evaluate((el) => getComputedStyle(el).position)).toBe('sticky');
    }
    expect(await page.locator('.lc-wild__panel--two').evaluate((el) => parseFloat(getComputedStyle(el).marginTop))).toBeLessThan(0);
    // No artwork anywhere in the story: every image is a photograph
    await expect(page.locator('.living-cape img[src*="art-"]')).toHaveCount(0);
    // Captions name places, never people: not the founder, not a reviewer (guests' consent is the owner's to confirm)
    const { reviews } = await import('../../src/data/reviews.mjs');
    const names = new RegExp(`\\b(${['Stuart', 'Matanhire', ...new Set(reviews.map((r) => r.author))].map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`);
    const captions = await page.locator('.living-cape figcaption, .lc-print__label').allInnerTexts();
    expect(captions.length).toBeGreaterThan(8);
    for (const c of captions) expect(c).not.toMatch(names);
    // The photographs withdrawn for showing children or possible minors are not used
    for (const name of WITHDRAWN) await expect(page.locator(`img[src*="${name}-"]`), name).toHaveCount(0);
  });

  test('with motion water trickles from the hero’s edge and uncovers the coast as you scroll, keeps moving while the page is still, and reverses; without motion the photograph simply stands', async ({ page }) => {
    // Without motion: no water layer over the photograph, no timeline
    await page.goto('/?nomotion');
    await expect(page.locator('[data-sun-water]')).toBeHidden();
    await expect(page.locator('[data-sun-frame] img')).toBeVisible();
    expect(await page.evaluate(() => window.__livingCape.motion)).toBe(false);
    expect(await page.evaluate(() => window.__livingCape.sun)).toBeUndefined();
    // With motion: scrubbed by the scroll position
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.__livingCape && window.__livingCape.sun));
    const st = await page.evaluate(() => ({ start: window.__livingCape.sun.scrollTrigger.start, end: window.__livingCape.sun.scrollTrigger.end }));
    const to = (y) => page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
    const at = (f) => to(st.start + (st.end - st.start) * f);
    const water = () => page.evaluate(() => ({ reach: window.__livingCape.water.reach, wet: window.__livingCape.water.wet }));
    // On the way down: a stream running beside the words, the photograph not reached yet
    await at(0.45);
    await expect.poll(async () => (await water()).reach, { timeout: 5_000 }).toBeGreaterThan(60);
    await expect(page.locator('[data-sun-water]')).toBeVisible();
    expect((await water()).wet).toBe(0);
    // The water keeps moving while the page is still
    await page.waitForTimeout(800);
    const shape = () => page.locator('.lc-water__body').getAttribute('d');
    const before = await shape();
    await page.waitForTimeout(400);
    expect(await shape(), 'the stream is redrawn while the scroll is held').not.toBe(before);
    // Over the photograph: wet channels and spreading fronts uncover it
    await at(0.8);
    await expect.poll(async () => (await water()).wet, { timeout: 5_000 }).toBeGreaterThan(5);
    // At the end the layer is gone and the photograph stands whole, at its own scale
    await to(st.end + 200);
    await expect.poll(() => page.evaluate(() => window.__livingCape.sun.progress()), { timeout: 5_000 }).toBe(1);
    await expect(page.locator('[data-sun-water]')).toBeHidden();
    expect(await page.locator('[data-sun-frame] img').evaluate((el) => el.style.transform)).toBe('');
    // Scrolling back up draws the water back
    await at(0.45);
    await expect.poll(async () => (await water()).wet, { timeout: 5_000 }).toBe(0);
    await to(0);
    await expect.poll(() => page.evaluate(() => window.__livingCape.sun.progress()), { timeout: 5_000 }).toBe(0);
    // Nothing of this touches the hero or the header
    expect(await page.evaluate(() => [...document.querySelectorAll('.hero, .hero *, .site-header .brand, .site-header .primary-nav, .site-header .primary-nav *, .header-cta, .header-cta *')].some((el) => /water|journey|thread/.test(el.style.cssText)))).toBe(false);
  });

  test('with motion the journey line draws as the steps scroll into view; without motion it is simply drawn', async ({ page }) => {
    const ink = () => page.locator('[data-journey]').evaluate((el) => parseFloat(getComputedStyle(el).getPropertyValue('--journey')) || 0);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.__livingCape && window.__livingCape.journey));
    expect(await ink(), 'nothing drawn before the steps come into view').toBe(1);
    await page.evaluate(() => {
      const r = document.querySelector('[data-journey]').getBoundingClientRect();
      window.scrollTo({ top: window.scrollY + r.top - window.innerHeight * 0.55, behavior: 'instant' });
    });
    await expect.poll(ink, { timeout: 5_000 }).toBeLessThan(0.8);
    await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));
    await expect.poll(ink, { timeout: 5_000 }).toBe(0);
    for (const url of ['/?nomotion', '/']) {
      if (url === '/') await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(url);
      expect(await ink(), `${url}: drawn in full`).toBe(0);
      expect(await page.evaluate(() => window.__livingCape.journey)).toBeUndefined();
    }
  });

  test('the destination carousel features one destination at a time; arrows and keys move one selection, bounded at both ends, and the strip never traps the page', async ({ page, isMobile }) => {
    await page.goto('/?nomotion');
    const viewport = page.locator('[data-film-viewport]');
    const items = page.locator('[data-film-item]');
    const links = page.locator('.lc-film__name a');
    const prev = page.locator('[data-film-prev]');
    const next = page.locator('[data-film-next]');
    const active = () => page.evaluate(() => window.__media.carousel.active());
    await expect(page.locator('[data-film-controls]')).toBeVisible();
    await expect(items).toHaveCount(6);
    // Cape Town is featured from 48em; phones lead with the first destination
    const first = isMobile ? 0 : 1;
    expect(await active()).toBe(first);
    await expect(page.locator('[data-film-item].is-active')).toHaveCount(1);
    await expect(items.nth(first)).toHaveAttribute('aria-current', 'true');
    await expect(page.locator('[data-film-current]')).toHaveText(`0${first + 1}`);
    // Bounded: at the first card ← is disabled and does nothing; → steps one at a time to the last, where it stops
    while ((await active()) > 0) await prev.click();
    await expect(prev).toHaveAttribute('aria-disabled', 'true');
    await prev.dispatchEvent('click');
    expect(await active()).toBe(0);
    for (let i = 1; i < 6; i++) {
      await next.click();
      expect(await active()).toBe(i);
      await expect(page.locator('[data-film-current]')).toHaveText(`0${i + 1}`);
      await expect(items.nth(i)).toHaveAttribute('aria-current', 'true');
    }
    await expect(next).toHaveAttribute('aria-disabled', 'true');
    await next.dispatchEvent('click');
    expect(await active()).toBe(5);
    // Announced politely; the progress line is proportional to the destination
    await expect(page.locator('[data-film-status]')).toHaveAttribute('aria-live', 'polite');
    await expect(page.locator('[data-film-status]')).toHaveText('The Garden Route, Multi-day tour. Destination 6 of 6.');
    expect(await page.locator('[data-film-progress]').evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).a)).toBeCloseTo(1, 2);
    const inView = (i) => items.nth(i).evaluate((el) => {
      const r = el.getBoundingClientRect();
      const v = el.closest('[data-film-viewport]').getBoundingClientRect();
      return r.left >= v.left - 1 && r.right <= v.right + 1;
    });
    expect(await inView(5)).toBe(true);
    // Keys while focus is in the strip: Home, ← →, End move the selection, and the focus follows to that card's link
    await links.nth(5).focus();
    await page.keyboard.press('Home');
    expect(await active()).toBe(0);
    await expect(links.nth(0)).toBeFocused();
    await page.keyboard.press('ArrowRight');
    expect(await active()).toBe(1);
    await expect(links.nth(1)).toBeFocused();
    await page.keyboard.press('End');
    expect(await active()).toBe(5);
    await expect(links.nth(5)).toBeFocused();
    expect(await inView(5)).toBe(true);
    // Tabbing onto a card's link selects that card
    await page.keyboard.press('Shift+Tab');
    expect(await active()).toBe(4);
    // A vertical wheel over the strip still scrolls the page
    const before = await page.evaluate(() => scrollY);
    await viewport.hover();
    await page.mouse.wheel(0, 400);
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before);
  });

  test('the living gallery opens a print in an accessible dialog, whole and credited, steps with the keyboard, locks the page, closes with Escape and returns focus', async ({ page, isMobile }) => {
    for (const motion of [false, true]) {
      await page.emulateMedia({ reducedMotion: motion ? 'no-preference' : 'reduce' });
      await page.goto(motion ? '/' : '/?nomotion');
      const prints = page.locator('[data-lc-open]');
      await expect(prints).toHaveCount(12);
      // Without JavaScript each print is a plain link to the full photograph
      await expect(prints.first()).toHaveAttribute('href', /assets\/img\/boulders-penguin-colony-\d+\.webp$/);
      await prints.nth(2).scrollIntoViewIfNeeded();
      await prints.nth(2).click();
      const dialog = page.locator('[data-lc-lightbox]');
      await expect(dialog).toHaveJSProperty('open', true);
      await expect(page.locator('[data-lc-count]')).toHaveText('03 / 12');
      await expect(page.locator('[data-lc-title]')).toHaveText('The Castle of Good Hope');
      await expect(page.locator('[data-lc-place]')).toHaveText('Cape Town');
      await expect(page.locator('[data-lc-link]')).toHaveAttribute('href', /tours\/cape-town-city-private-tour\/$/);
      // The credit comes from the photograph's recorded origin, with the site's photo credits
      await expect(page.locator('[data-lc-credit]')).toHaveText('A Good Times photograph');
      await expect(page.locator('.lc-lightbox__credit a')).toHaveAttribute('href', /(^|\/)privacy\/#credits$/);
      await expect(page.locator('[data-lc-close]')).toBeFocused();
      if (motion) await expect.poll(() => page.evaluate(() => window.__media.gallery.busy())).toBe(false);
      // The photograph whole: contained, its frame at the photograph's own proportions
      const shown = await page.locator('[data-lc-frame] img').evaluate((img) => {
        const r = img.parentElement.parentElement.getBoundingClientRect();
        return { fit: getComputedStyle(img).objectFit, frame: r.width / r.height, natural: Number(img.getAttribute('width')) / Number(img.getAttribute('height')) };
      });
      expect(shown.fit).toBe('contain');
      expect(Math.abs(shown.frame - shown.natural)).toBeLessThan(0.02);
      await page.keyboard.press('ArrowRight');
      await expect(page.locator('[data-lc-count]')).toHaveText('04 / 12');
      await expect(page.locator('[data-lc-title]')).toHaveText('The statue of Nelson Mandela');
      await expect(page.locator('[data-lc-frame] img')).toHaveAttribute('alt', /Mandela/);
      if (motion) await expect.poll(() => page.evaluate(() => window.__media.gallery.busy())).toBe(false);
      await page.keyboard.press('ArrowRight');
      await expect(page.locator('[data-lc-title]')).toHaveText('The District Six Museum');
      if (motion) await expect.poll(() => page.evaluate(() => window.__media.gallery.busy())).toBe(false);
      // A photograph enlarged for the web says so in its credit
      await page.keyboard.press('ArrowRight');
      await expect(page.locator('[data-lc-title]')).toHaveText('Heading out to shark territory');
      await expect(page.locator('[data-lc-credit]')).toHaveText('A Good Times photograph, enlarged for the web');
      // Once landed, the lightbox asks for a larger rendition than the wall's thumbnail
      if (!isMobile) await expect.poll(() => page.locator('[data-lc-frame] img').evaluate((img) => Number(/-(\d+)\.(?:avif|webp)$/.exec(img.currentSrc)?.[1] || 0))).toBeGreaterThanOrEqual(1200);
      // The page behind cannot scroll
      await expect(page.locator('html')).toHaveClass(/lc-locked/);
      const y = await page.evaluate(() => scrollY);
      await page.mouse.move(200, 200);
      await page.mouse.wheel(0, 600);
      await page.waitForTimeout(200);
      expect(await page.evaluate(() => scrollY)).toBe(y);
      // A native modal: Tab cycles through the dialog's controls (and the browser's own chrome), never into the inert page behind
      for (let i = 0; i < 6; i++) {
        await page.keyboard.press('Tab');
        expect(await page.evaluate(() => !!document.activeElement.closest('dialog') || document.activeElement === document.body), 'focus never reaches the page behind').toBe(true);
      }
      await page.keyboard.press('Escape');
      await expect(dialog).toHaveJSProperty('open', false);
      await expect(prints.nth(2)).toBeFocused();
      await expect(page.locator('.lc-print.is-away')).toHaveCount(0);
      await expect(page.locator('html')).not.toHaveClass(/lc-locked/);
    }
  });
});

test.describe('media system (design.md)', () => {
  test('the six destinations keep their names, links, photographs and accurate labels: a count of private tours, or the kind of journey, never a duration', async ({ page }) => {
    await page.goto('/?nomotion');
    const { destinations } = await import('../../src/data/tours.mjs');
    const rows = [
      ['peninsula', '1 private tour', '1 private tour to choose from', 'Explore the private tour to the Cape Peninsula'],
      ['city', '2 private tours', '2 private tours to choose from', 'Explore the private tours to Cape Town'],
      ['langa', '1 private tour', '1 private tour to choose from', 'Explore the private tour to Langa'],
      ['winelands', '1 private tour', '1 private tour to choose from', 'Explore the private tour to the Cape Winelands'],
      ['overberg', '3 private tours', '3 private tours to choose from', 'Explore the private tours to the Overberg coast'],
      ['garden-route', 'Multi-day tour', '', 'Explore the Garden Route multi-day tour'],
    ];
    const items = page.locator('[data-film-item]');
    for (const [i, [id, label, spoken, linkName]] of rows.entries()) {
      const d = destinations.find((x) => x.id === id);
      const item = items.nth(i);
      await expect(item.locator('.lc-film__num')).toHaveText(`0${i + 1}`);
      await expect(item.locator('.lc-film__name a')).toHaveText(d.name);
      await expect(item.locator('.lc-film__name a')).toHaveAttribute('href', new RegExp(`(^|/)${d.href.replace(/[?#.]/g, '\\$&')}$`));
      await expect(item.locator('.lc-film__name a')).toHaveAttribute('aria-label', linkName);
      await expect(item.locator('.lc-film__line')).toHaveText(d.text);
      await expect(item.locator('.lc-film__meta')).toContainText(label);
      if (spoken) await expect(item.locator('.lc-film__meta .visually-hidden')).toHaveText(spoken);
      // A real photograph with its own description, reserved space and lazy loading
      const img = item.locator('img');
      expect((await img.getAttribute('alt')).length).toBeGreaterThan(20);
      await expect(img).toHaveAttribute('loading', 'lazy');
      await expect(img).toHaveAttribute('width', /^\d+$/);
      await expect(img).toHaveAttribute('height', /^\d+$/);
    }
    // No card is a clickable <div>: the one interactive element in each card is its link
    expect(await items.evaluateAll((lis) => lis.map((li) => li.querySelectorAll('a, button, [tabindex]').length))).toEqual([1, 1, 1, 1, 1, 1]);
  });

  test('from 48em a click on a card features it, rapid input never scrambles the cards, and a drag scrolls and selects but never navigates (motion)', async ({ page, isMobile }) => {
    test.skip(isMobile, 'mouse input; phones swipe natively');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.__media && window.__media.carousel));
    await page.locator('[data-film-viewport]').evaluate((v) => window.scrollTo({ top: v.getBoundingClientRect().top + scrollY - 200, behavior: 'instant' }));
    const settled = () => page.waitForFunction(() => !window.__media.carousel.busy(), null, { timeout: 5_000 });
    const state = () =>
      page.evaluate(() => {
        const items = [...document.querySelectorAll('[data-film-item]')];
        const c = window.__media.carousel;
        return {
          active: c.active(),
          featured: items.filter((li) => li.classList.contains('is-active')).length,
          widths: items.map((li) => Math.round(li.getBoundingClientRect().width)),
          inline: items.some((li) => li.style.width),
          atRest: Math.abs(document.querySelector('[data-film-viewport]').scrollLeft - c.target(c.active())) < 2,
        };
      });
    const clean = (s) => {
      expect(s.featured).toBe(1);
      const others = s.widths.filter((_, i) => i !== s.active);
      expect(new Set(others).size, 'the five others share one width').toBe(1);
      expect(s.widths[s.active], 'the featured card is clearly wider').toBeGreaterThan(others[0] * 1.6);
      expect(s.inline, 'no width left on the cards once settled').toBe(false);
      expect(s.atRest).toBe(true);
    };
    await page.waitForTimeout(800);
    // A click on the photograph of a card that is not featured features it
    await page.locator('.lc-film__card').nth(2).click({ position: { x: 40, y: 60 } });
    await settled();
    let s = await state();
    expect(s.active).toBe(2);
    clean(s);
    // Rapid input, mid-animation, either way: it settles at the bound, cleanly
    await page.evaluate(async () => {
      const b = document.querySelector('[data-film-next]');
      for (let i = 0; i < 8; i++) {
        b.click();
        await new Promise((r) => setTimeout(r, 45));
      }
    });
    await settled();
    s = await state();
    expect(s.active).toBe(5);
    clean(s);
    await page.evaluate(async () => {
      const b = document.querySelector('[data-film-prev]');
      for (let i = 0; i < 3; i++) {
        b.click();
        await new Promise((r) => setTimeout(r, 30));
      }
      document.querySelector('[data-film-next]').click();
    });
    await settled();
    s = await state();
    expect(s.active).toBe(3);
    clean(s);
    // A drag across the photographs scrolls the strip and settles on a destination; the page does not change
    const url = page.url();
    const box = await page.locator('.lc-film__card').nth(3).boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + 60);
    await page.mouse.down();
    for (let k = 1; k <= 12; k++) await page.mouse.move(box.x + box.width / 2 + k * 30, box.y + 60);
    await page.mouse.up();
    await settled();
    expect(page.url()).toBe(url);
    s = await state();
    expect(s.active).toBeLessThan(3);
    clean(s);
    // A drag that starts on a card's link does not follow it
    const link = page.locator('[data-film-item].is-active .lc-film__name a');
    const lb = await link.boundingBox();
    await page.mouse.move(lb.x + 8, lb.y + 8);
    await page.mouse.down();
    for (let k = 1; k <= 10; k++) await page.mouse.move(lb.x + 8 - k * 30, lb.y + 10);
    await page.mouse.up();
    await settled();
    expect(page.url()).toBe(url);
    clean(await state());
    // The featured card's link (its name; the buttons carry no arrows since 25 Oct 2026) opens its page
    const go = page.locator('[data-film-item].is-active .lc-film__name a');
    const href = await go.getAttribute('href');
    await page.locator('[data-film-item].is-active .lc-film__title').click();
    await expect(page).toHaveURL(new RegExp(`(^|/)${href.replace(/[?#.]/g, '\\$&')}$`));
  });

  test('with reduced motion a change of destination is immediate (no timeline, no entrance, no drift) and the strip is final at once', async ({ page, isMobile }) => {
    test.skip(isMobile, 'the featured width is from 48em');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    expect(await page.evaluate(() => window.__media.motion)).toBe(false);
    await page.locator('[data-film-next]').click();
    // At once: no timeline running and no width held on any card, only the classes (the CSS widths)
    const s = await page.evaluate(() => ({
      busy: window.__media.carousel.busy(),
      active: window.__media.carousel.active(),
      featured: [...document.querySelectorAll('[data-film-item]')].findIndex((li) => li.classList.contains('is-active')),
      inline: [...document.querySelectorAll('[data-film-item]')].some((li) => li.style.width),
      drift: [...document.querySelectorAll('[data-film-drift]')].map((d) => d.style.transform).join(''),
      faded: [...document.querySelectorAll('[data-film-item], .lc-gallery__item')].some((el) => el.style.opacity || el.style.transform),
    }));
    expect(s).toEqual({ busy: false, active: 2, featured: 2, inline: false, drift: '', faded: false });
    // The rendered widths follow within a frame or two (the site's reduced-motion rule leaves every transition at 0.01 ms)
    const widths = () => page.locator('[data-film-item]').evaluateAll((lis) => lis.map((li) => li.getBoundingClientRect().width));
    await expect.poll(async () => { const w = await widths(); return w[2] > w[1] * 1.6; }, { timeout: 1_000 }).toBe(true);
  });

  test('phones: a native swipe moves the strip a card at a time, the active card follows the snap, and a vertical swipe still scrolls the page', async ({ page, isMobile, browserName }) => {
    test.skip(!isMobile || browserName !== 'chromium', 'touch gestures through Chromium’s DevTools protocol');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.__media && window.__media.carousel));
    const vp = page.locator('[data-film-viewport]');
    await vp.evaluate((v) => window.scrollTo({ top: v.getBoundingClientRect().top + scrollY - 160, behavior: 'instant' }));
    await page.waitForTimeout(500);
    // Native swiping: snapping, contained at the ends, and both pan directions left to the browser
    expect(await vp.evaluate((el) => [getComputedStyle(el).scrollSnapType, getComputedStyle(el).overscrollBehaviorX, getComputedStyle(el).touchAction])).toEqual([expect.stringMatching(/^x mandatory/), 'contain', 'auto']);
    // Real touch input through the DevTools protocol (the same events Playwright's touchscreen sends)
    const cdp = await page.context().newCDPSession(page);
    const swipe = async (dx, dy) => {
      const b = await vp.boundingBox();
      const x = Math.round(b.x + b.width * (dx < 0 ? 0.8 : 0.5));
      const y = Math.round(b.y + b.height / 2);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
      for (let k = 1; k <= 12; k++) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + Math.round((dx * k) / 12), y: y + Math.round((dy * k) / 12) }] });
        await page.waitForTimeout(16);
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    };
    const active = () => page.evaluate(() => window.__media.carousel.active());
    expect(await active()).toBe(0);
    await swipe(-260, 0);
    await expect.poll(active).toBe(1);
    await expect(page.locator('[data-film-current]')).toHaveText('02');
    await swipe(-260, 0);
    await expect.poll(active).toBe(2);
    const y = await page.evaluate(() => scrollY);
    await swipe(0, -300);
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(y + 100);
    expect(await active()).toBe(2);
  });

  test('the exhibition hangs all twelve photographs as an editorial mosaic: flush rows of mixed sizes, rounded, unbordered, each crop on its subject', async ({ page, isMobile }) => {
    await page.goto('/?nomotion');
    await expect(page.locator('.lc-gallery__item')).toHaveCount(12);
    const boxes = await page.locator('.lc-print__frame').evaluateAll((els) =>
      els.map((e) => {
        const r = e.getBoundingClientRect();
        const img = e.querySelector('img');
        const cs = getComputedStyle(e);
        return { y: Math.round(r.top + scrollY), w: Math.round(r.width), h: Math.round(r.height), radius: cs.borderTopLeftRadius, shadow: cs.boxShadow, border: cs.borderTopWidth, fit: getComputedStyle(img).objectFit, focus: e.style.getPropertyValue('--focus'), alt: img.alt };
      }),
    );
    const rows = Object.values(boxes.reduce((acc, b) => ((acc[b.y] = acc[b.y] || []).push(b), acc), {}));
    // From 64em: a feature and a portrait; three; a wide strip and the platter; three; the tasting table and the flight.
    // Phones: the feature and the seal island across both columns
    expect(rows.map((r) => r.length)).toEqual(isMobile ? [1, 2, 2, 1, 2, 2, 2] : [2, 3, 2, 3, 2]);
    for (const r of rows) expect(new Set(r.map((b) => b.h)).size, 'every print in a row is the same height').toBe(1);
    if (!isMobile) expect(new Set(boxes.map((b) => b.w)).size, 'not a grid of identical cards').toBeGreaterThan(5);
    for (const b of boxes) {
      expect(b.radius).toBe('14px');
      expect(b.shadow).toBe('none');
      expect(b.border).toBe('0px');
      expect(b.fit).toBe('cover');
      expect(b.focus).toMatch(/^\d+% \d+%$/);
      expect(b.alt.length).toBeGreaterThan(20);
    }
  });

  test('the media sections fit every width: no horizontal page scroll, controls whole and at least 44 px, cards at the sizes design.md sets', async ({ page, isMobile }) => {
    test.skip(isMobile, 'widths set explicitly');
    for (const [w, h] of [[320, 640], [375, 812], [390, 844], [768, 1024], [1024, 768], [1440, 900], [1920, 1080]]) {
      await page.setViewportSize({ width: w, height: h });
      await page.goto('/?nomotion');
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), `${w}px: no horizontal scroll`).toBe(0);
      for (const sel of ['[data-film-prev]', '[data-film-next]']) {
        const b = await page.locator(sel).boundingBox();
        expect(b.x, `${w}px ${sel}`).toBeGreaterThanOrEqual(0);
        expect(b.x + b.width, `${w}px ${sel}`).toBeLessThanOrEqual(w);
        expect(Math.min(b.width, b.height)).toBeGreaterThanOrEqual(44);
      }
      const card = await page.locator('[data-film-item].is-active .lc-film__card').boundingBox();
      expect(card.x, `${w}px: the featured card starts in view`).toBeGreaterThanOrEqual(0);
      expect(card.x + card.width, `${w}px: the featured card is whole`).toBeLessThanOrEqual(w);
      if (w >= 1200) {
        expect(card.height).toBeGreaterThanOrEqual(340);
        expect(card.height).toBeLessThanOrEqual(380);
      }
      if (w < 768) expect(card.height).toBeLessThanOrEqual(480);
    }
  });

  test('photographs loading in the carousel and the exhibition shift nothing', async ({ page }) => {
    await page.addInitScript(() => {
      window.__shifts = [];
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          if (e.hadRecentInput) continue;
          const media = e.sources.some((s) => {
            const el = s.node && (s.node.nodeType === 1 ? s.node : s.node.parentElement);
            return !!(el && el.closest('.lc-film, .lc-gallery'));
          });
          if (media) window.__shifts.push(e.value);
        }
      }).observe({ type: 'layout-shift', buffered: true });
    });
    await page.goto('/?nomotion');
    for (const sel of ['.lc-film', '.lc-gallery']) {
      await page.locator(sel).scrollIntoViewIfNeeded();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(300);
    }
    expect(await page.evaluate(() => window.__shifts.reduce((a, v) => a + v, 0))).toBeLessThan(0.01);
  });
});

test.describe('travel concierge', () => {
  test('desktop: the trigger opens a sheet from the right: a modal dialog with photo cards, popular days, Make It Yours and the direct line; Escape, the close button and a click outside close it', async ({ page, isMobile }) => {
    test.skip(isMobile, 'the desktop sheet; phones use the menu');
    for (const path of ['/?nomotion', '/tours/?nomotion']) {
      await page.goto(path);
      // The navigation: five titles beside the trigger and the Make It Yours coin
      await expect(page.locator('.primary-nav a')).toHaveText(['Tours', 'Transfers', 'Destinations', 'About', 'Contact']);
      const toggle = page.locator('[data-concierge-toggle]');
      await expect(toggle).toBeVisible();
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
      const heroBox = path === '/?nomotion' ? await page.locator('.hero').boundingBox() : null;
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');
      const panel = page.locator('#concierge');
      const sheet = panel.locator('[role="dialog"]');
      await expect(sheet).toBeVisible();
      await expect(sheet).toHaveAttribute('aria-modal', 'true');
      await expect(sheet).toHaveAccessibleName('Where would you like to begin?');
      // The sheet meets the right edge, over a dimmed page; the page behind does not scroll; nothing moves
      const vw = page.viewportSize().width;
      const box = await sheet.boundingBox();
      expect(Math.round(box.x + box.width)).toBe(vw);
      expect(box.width).toBeLessThan(vw);
      expect(await page.evaluate(() => document.documentElement.classList.contains('is-concierge-open') && getComputedStyle(document.documentElement).overflow === 'hidden')).toBe(true);
      expect(await panel.evaluate((el) => !el.closest('header'))).toBe(true);
      if (heroBox) expect(await page.locator('.hero').boundingBox()).toEqual(heroBox);
      // Focus moves to the first service
      await expect(panel.locator('.lc-invite__name a').first()).toBeFocused();
      // Four photograph cards, each with its badge; the four most-booked days, each with its photograph; the way to all tours
      await expect(panel.locator('.lc-invite__name a')).toHaveText(['Explore Tours', 'Arrange a Transfer', 'Add an Adventure', 'Tailor Your Journey']);
      await expect(panel.locator('.lc-invite__photo img')).toHaveCount(4);
      await expect(panel.locator('.lc-invite__badge svg')).toHaveCount(4);
      await expect(panel.locator('.gt-concierge__day')).toHaveCount(4);
      await expect(panel.locator('.gt-concierge__thumb img')).toHaveCount(4);
      await expect(panel.locator('.gt-concierge__all')).toHaveText('View All Private Tours');
      await expect(panel.locator('.gt-concierge-panel__cta')).toHaveText('Make It Yours');
      // The direct line calls or writes, exactly; WhatsApp is not offered until the number is confirmed for it
      const reach = panel.locator('.gt-concierge-panel__reach a');
      expect(await reach.evaluateAll((as) => as.map((a) => a.getAttribute('href')))).toEqual(['tel:+27723768432', 'mailto:info@goodtimesincapetown.co.za']);
      await expect(reach.locator('.gt-concierge-reach__name')).toHaveText(['Call Us', 'Email Us']);
      await expect(panel.locator('a[href*="wa.me"]')).toHaveCount(0);
      // Every other link in the sheet answers
      const hrefs = await panel.locator('a[href]:not(.gt-concierge-panel__reach a)').evaluateAll((as) => as.map((a) => a.href));
      expect(hrefs.length).toBe(10);
      for (const href of new Set(hrefs.map((h) => h.split('#')[0]))) expect((await page.request.get(href)).status(), href).toBe(200);
      // Focus wraps inside the sheet: Shift+Tab from the first stop reaches the last
      await page.keyboard.press('Shift+Tab');
      expect(await page.evaluate(() => document.activeElement.closest('[role="dialog"]') !== null)).toBe(true);
      await page.keyboard.press('Escape');
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
      await expect(toggle).toBeFocused();
      await expect(panel).toBeHidden();
      expect(await page.evaluate(() => document.documentElement.classList.contains('is-concierge-open'))).toBe(false);
      // The close button closes it and returns focus to the trigger
      await toggle.click();
      await page.locator('[data-concierge-close]').click();
      await expect(panel).toBeHidden();
      await expect(toggle).toBeFocused();
      // A click on the dimmed page closes it too
      await toggle.click();
      await expect(sheet).toBeVisible();
      await page.mouse.click(10, 880);
      await expect(panel).toBeHidden();
    }
  });

  test('with motion the sheet opens and closes vertically: it unfolds downward and an interrupted open turns round cleanly', async ({ page, isMobile }) => {
    test.skip(isMobile, 'the desktop sheet');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/tours/');
    const toggle = page.locator('[data-concierge-toggle]');
    const sheet = page.locator('[data-concierge-clip]');
    const state = () => sheet.evaluate((el) => ({ clip: getComputedStyle(el).clipPath, transform: getComputedStyle(el).transform }));
    await toggle.click();
    await page.waitForTimeout(100);
    // On its way open: still clipped from the bottom edge, never moved sideways
    const mid = await state();
    expect(mid.clip).toMatch(/^inset\(0(px|%)? 0(px|%)? [1-9]/);
    expect(mid.transform === 'none' || new DOMMatrix(mid.transform).m41 === 0).toBe(true);
    // Folded halfway, then opened again: it turns round from where it is
    await page.evaluate(() => window.__concierge.close(false));
    await page.waitForTimeout(80);
    await page.evaluate(() => window.__concierge.open());
    await expect.poll(async () => (await state()).clip).toBe('none');
    const box = await sheet.boundingBox();
    expect(Math.round(box.x + box.width)).toBe(page.viewportSize().width);
    expect(Math.round(box.y)).toBe(0);
    await page.keyboard.press('Escape');
    await expect(page.locator('#concierge')).toBeHidden();
  });

  test('phones: the menu opens on the four services as thumb-sized rows above the usual list', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'the mobile menu');
    await page.goto('/?nomotion');
    await expect(page.locator('[data-concierge-toggle]')).toBeHidden();
    await page.locator('[data-nav-toggle]').click();
    const rows = page.locator('#drawer .gt-concierge-row');
    await expect(rows).toHaveCount(4);
    await expect(rows.locator('.gt-concierge-row__name')).toHaveText(['Explore Tours', 'Arrange a Transfer', 'Add an Adventure', 'Tailor Your Journey']);
    await expect(rows.locator('.gt-concierge-row__photo img')).toHaveCount(4);
    for (const box of await rows.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height))) expect(box).toBeGreaterThanOrEqual(44);
    await expect(page.locator('#drawer .drawer__nav a').first()).toHaveText(/Home/);
  });
});

test.describe('design system specimen', () => {
  test('preview builds show the engraved symbols and every action state; nothing on the page is broken', async ({ page }) => {
    await page.goto('/design-system/?nomotion');
    await expect(page.locator('h1')).toHaveText('The Cape, A Living Story');
    await expect(page.locator('.lc-specimen__icons svg.gt-engraved-icon').first()).toBeVisible();
    expect(await page.locator('.lc-specimen__icons code').count()).toBeGreaterThanOrEqual(30);
    await expect(page.locator('.lc-seal[aria-disabled="true"]')).toHaveCount(1);
    await expect(page.locator('.lc-seal.is-loading')).toHaveCount(1);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  });
});

/** Every <picture> photo on the page: CSS box, drawn width (object-fit: cover aware), chosen file and largest rendition. */
const photos = (page) =>
  page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight * 0.8) {
      scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 40));
    }
    scrollTo(0, 0);
    await Promise.all([...document.images].map((i) => (i.complete ? null : new Promise((r) => i.addEventListener('load', r, { once: true }) || setTimeout(r, 3000)))));
    return [...document.querySelectorAll('picture img')]
      // A deferred photograph (the hero's phone gallery before it moves) is a placeholder pixel, not yet a photo
      .filter((img) => img.naturalWidth > 1 && !img.currentSrc.startsWith('data:') && img.getBoundingClientRect().width)
      .map((img) => {
        const r = img.getBoundingClientRect();
        const drawn = getComputedStyle(img).objectFit === 'cover' ? Math.max(r.width, (r.height * img.naturalWidth) / img.naturalHeight) : r.width;
        const source = [...img.closest('picture').querySelectorAll('source')].find((s) => !s.media || matchMedia(s.media).matches);
        const widths = (source?.srcset || '').split(',').map((s) => parseInt(s.trim().split(/\s+/)[1])).filter(Boolean);
        return { file: img.currentSrc.split('/').pop(), hero: !!img.closest('.hero__media'), cssW: r.width, drawn, chosen: parseInt(/-(\d+)\.\w+$/.exec(img.currentSrc)?.[1] || '0'), max: Math.max(...widths) };
      });
  });

test.describe('design remediation (stage 1)', () => {
  test('rating bars fill in proportion to the review counts', async ({ page }) => {
    await page.goto('/reviews/?nomotion');
    const rows = await page.locator('.bars li').evaluateAll((lis) =>
      lis.map((li) => ({
        count: parseInt(li.lastElementChild.textContent),
        pct: (100 * li.querySelector('.bars__fill').getBoundingClientRect().width) / li.querySelector('.bars__track').getBoundingClientRect().width,
      })),
    );
    const total = rows.reduce((a, r) => a + r.count, 0);
    expect(rows.length).toBe(5);
    for (const r of rows) expect(Math.abs(r.pct - (100 * r.count) / total), `${r.count} of ${total}`).toBeLessThan(0.6);
    expect(rows[0].pct, 'Excellent').toBeGreaterThan(90);
  });

  test('the About banner draws its photograph within its largest rendition at desktop width', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop check at 1440 px');
    await page.goto('/about/?nomotion');
    const hero = (await photos(page)).find((p) => p.file.startsWith('peninsula-bench-view'));
    expect(hero, 'peninsula-bench-view in the banner').toBeTruthy();
    // The largest rendition is 1600 px wide; at 1x it must never upscale.
    expect(hero.drawn, 'drawn within the largest rendition').toBeLessThanOrEqual(hero.max + 1);
    expect(hero.chosen, 'the largest rendition is served').toBe(hero.max);
  });

  test('the small-source tour heroes are framed at native size, never stretched; tours without a photograph show the logo artwork, never a stand-in photograph', async ({ page }) => {
    // Whale watching leads with a 1200 px portrait from Hermanus: framed, not stretched to full bleed
    await page.goto('/tours/whale-watching-private-tour/?nomotion');
    await expect(page.locator('.tour-hero--framed')).toBeVisible();
    const frame = (await photos(page)).find((p) => p.file.startsWith('hermanus-frame'));
    expect(frame, 'whale-watching-private-tour').toBeTruthy();
    expect(frame.drawn, 'whale-watching-private-tour: within its largest rendition').toBeLessThanOrEqual(frame.max + 1);
    // Shark cage diving leads with a 2000 px photograph of the boat: full bleed, not framed
    await page.goto('/tours/shark-cage-diving/?nomotion');
    await expect(page.locator('.tour-hero--framed')).toHaveCount(0);
    expect((await photos(page)).find((p) => p.file.startsWith('marine-dynamics-boat')), 'marine-dynamics-boat in the hero').toBeTruthy();
    // Cape Agulhas and Sky Diving have no Good Times photograph yet: the approved mountain-trail artwork, decorative
    for (const path of ['/tours/cape-agulhas-private-tour/', '/tours/sky-diving/']) {
      await page.goto(`${path}?nomotion`);
      await expect(page.locator('.tour-hero .art-panel img[src$="gt-mountain-trail.svg"]'), path).toHaveCount(1);
      await expect(page.locator('.tour-hero .art-panel img'), path).toHaveAttribute('alt', '');
      await expect(page.locator('.tour-hero picture'), path).toHaveCount(0);
    }
  });

  test('no photo is drawn wider than its largest rendition', async ({ page }) => {
    test.setTimeout(120_000);
    for (const path of PAGES) {
      await page.goto(`${path}?nomotion`);
      // The home hero photograph is drawn full bleed on purpose.
      const over = (await photos(page)).filter((p) => !p.hero && p.drawn > p.max + 1);
      expect(over.map((p) => `${p.file}: drawn ${Math.round(p.drawn)} px, largest ${p.max} px`), path).toEqual([]);
    }
  });
});

test.describe('taste compositions and About’s photographs', () => {
  const PLACES = [
    ['/', '[data-taste="reveal"]', ['winelands-host-pouring', 'winelands-tasting-table']],
    ['/tours/cape-winelands-private-tour/', '[data-taste="diptych"]', ['winelands-pergola-lunch', 'winelands-garden-lunch']],
    ['/destinations/', '[data-taste="quiet"]', ['winelands-pergola-lunch']],
    // About's penguins and Langa mural share the Reveal's choreography
    ['/about/', '[data-taste="reveal"]', ['boulders-penguins-boardwalk', 'langa-mural']],
  ];
  const settled = (sel) =>
    `[...document.querySelectorAll('${sel} [data-taste-main], ${sel} [data-taste-frame], ${sel} [data-taste-layer], ${sel} [data-taste-words] > *, ${sel} figcaption')].every((e) => { const cs = getComputedStyle(e); return Number(cs.opacity) === 1 && cs.visibility === 'visible' && cs.clipPath === 'none'; })`;

  test('without motion every photograph, word and caption is simply in place; nothing is hidden or clipped', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const [path, sel, names] of PLACES) {
      await page.goto(`${path}?nomotion`);
      const box = page.locator(sel);
      await expect(box).toHaveCount(1);
      for (const n of names) await expect(box.locator(`img[src*="${n}-"]`)).toHaveCount(1);
      expect(await page.evaluate(settled(sel)), `${path}: settled at once`).toBe(true);
      // Each photograph has real alt text and a crop on its subject
      for (const alt of await box.locator('img').evaluateAll((imgs) => imgs.map((i) => i.alt))) expect(alt.length).toBeGreaterThan(20);
    }
  });

  test('with motion each composition plays once as it is reached and settles completely, with no console errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    for (const [path, sel] of PLACES) {
      await page.goto(path);
      // Before it is reached the composition waits, its photographs masked (About's sits just below the banner)
      if (path !== '/about/') expect(await page.evaluate(settled(sel)), `${path}: waiting below the fold`).toBe(false);
      await page.locator(sel).scrollIntoViewIfNeeded();
      await page.mouse.wheel(0, 200);
      await expect.poll(() => page.evaluate(settled(sel)), { timeout: 6000 }).toBe(true);
    }
    expect(errors).toEqual([]);
  });

  test('the compositions fit every width and never imply that food or tastings are included', async ({ page, isMobile }) => {
    test.skip(isMobile, 'widths set explicitly');
    for (const [path, sel] of PLACES) {
      for (const [w, h] of [[320, 640], [375, 812], [768, 1024], [1024, 768], [1440, 900]]) {
        await page.setViewportSize({ width: w, height: h });
        await page.goto(`${path}?nomotion`);
        expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), `${path} at ${w}px`).toBe(0);
        // Captions never sit under an overlapping photograph
        const overlap = await page.evaluate((sel) => {
          const caps = [...document.querySelectorAll(`${sel} figcaption`)].map((c) => c.getBoundingClientRect());
          const pics = [...document.querySelectorAll(`${sel} [data-taste-frame]`)].map((f) => f.getBoundingClientRect());
          return caps.some((c) => pics.some((p) => c.left < p.right - 1 && c.right > p.left + 1 && c.top < p.bottom - 1 && c.bottom > p.top + 1));
        }, sel);
        expect(overlap, `${path} at ${w}px: captions clear`).toBe(false);
      }
      const text = await page.locator(sel).innerText();
      expect(text).not.toMatch(/(lunch|meal|dining|tasting|wine)s? (is |are )?included|complimentary|private chef/i);
    }
  });
});

test.describe('header', () => {
  test('the header carries no contact links and Make It Yours never leaves the bar', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop widths set explicitly');
    for (const [w, h] of [[1024, 768], [1280, 800], [1440, 900], [1600, 900], [1920, 1080]]) {
      await page.setViewportSize({ width: w, height: h });
      for (const path of ['/', '/tours/', '/contact/']) {
        await page.goto(`${path}?nomotion`);
        const r = await page.evaluate(() => {
          const bar = document.querySelector('.header-bar').getBoundingClientRect();
          const cta = document.querySelector('.header-cta').getBoundingClientRect();
          return { barRight: bar.right, ctaRight: cta.right, links: document.querySelectorAll('.site-header a[href^="tel:"], .site-header a[href*="wa.me"]').length, overflow: document.documentElement.scrollWidth - innerWidth };
        });
        expect(r.overflow, `${path} at ${w}px`).toBe(0);
        expect(r.ctaRight, `${path} at ${w}px: Make It Yours inside the bar`).toBeLessThanOrEqual(r.barRight + 1);
        expect(r.links, `${path} at ${w}px: no WhatsApp or call link in the header`).toBe(0);
      }
    }
  });
});

test.describe('the button system', () => {
  // Directional glyphs, wherever they are drawn; a form field's own dropdown indicator (.sfield__chevron) is not a CTA arrow
  const ARROWS = 'svg.icon--arrow, svg.icon--arrow-left, svg.icon--chevron, svg.icon--chevron-left, svg.icon--chevron-down:not(.sfield__chevron), svg.jei--arrow, svg.jei--chevron, svg.jei--chevron-left, svg.jei--chevron-down';

  test('no button, button-styled link or navigation row on any page carries an arrow, chevron or arrow-in-circle', async ({ page }) => {
    test.setTimeout(120_000);
    for (const path of PAGES) {
      await page.goto(`${path}?nomotion`);
      const found = await page.evaluate((sel) => [...document.querySelectorAll(sel)].filter((svg) => svg.closest('a, button, [role="button"]')).map((svg) => `${svg.getAttribute('class')} in ${svg.closest('a, button').textContent.trim().slice(0, 40)}`), ARROWS);
      expect(found, path).toEqual([]);
      // No empty round containers left behind
      await expect(page.locator('.card__go, .row-card__go, .lc-invite__go, .lc-film__go, .service-choice__go, .gt-concierge-row__go, .lc-seal__arrow, .lc-note__arrow'), path).toHaveCount(0);
    }
  });

  test('Make It Yours is the signature enquiry action: the header and the concierge carry it with the compass medallion, the phone menu as the primary button', async ({ page, isMobile }) => {
    await page.goto('/tours/?nomotion');
    if (!isMobile) {
      await expect(page.locator('.header-cta')).toHaveText('Make It Yours');
      await expect(page.locator('.header-cta')).toHaveAccessibleName('Make It Yours');
      await expect(page.locator('.header-cta')).toHaveAccessibleDescription(/Opens our enquiry form/);
      await expect(page.locator('.header-cta .btn-coin__coin')).toHaveAttribute('aria-hidden', 'true');
      await page.locator('[data-concierge-toggle]').click();
      const cta = page.locator('#concierge .gt-concierge-panel__cta');
      await expect(cta).toHaveText('Make It Yours');
      await expect(cta).toHaveAttribute('href', /enquire\/$/);
      await expect(cta.locator('.btn-coin__coin')).toHaveCount(1);
    } else {
      await page.locator('[data-nav-toggle]').click();
      const drawer = page.locator('.drawer__footer .gt-button--primary');
      await expect(drawer).toHaveText('Make It Yours');
      await expect(drawer).toHaveAttribute('href', /enquire\/$/);
    }
    // Nothing on the site still says Book Now or Start Planning
    for (const path of ['/', '/tours/', '/contact/', '/reviews/']) {
      await page.goto(`${path}?nomotion`);
      await expect(page.locator('a, button').filter({ hasText: /^\s*(Book Now|Start Planning)\s*$/i }), path).toHaveCount(0);
    }
  });

  test('every primary is the Good Times green plate with white words; every control is at least 44 px tall; carousel and gallery steps are labelled in words', async ({ page, isMobile }) => {
    for (const path of ['/', '/tours/cape-winelands-private-tour/', '/contact/', '/destinations/', '/enquire/']) {
      await page.goto(`${path}?nomotion`);
      const primaries = await page.locator('.gt-button--primary:visible').evaluateAll((els) => els.map((e) => { const cs = getComputedStyle(e); return { text: e.textContent.trim(), bg: cs.backgroundImage, ink: cs.color, h: e.getBoundingClientRect().height }; }));
      expect(primaries.length, path).toBeGreaterThan(0);
      for (const b of primaries) {
        expect(b.bg, `${path}: ${b.text}`).toMatch(/linear-gradient/);
        expect(b.ink, `${path}: ${b.text}`).toBe('rgb(255, 255, 255)');
      }
      const short = await page.locator('.gt-button:visible').evaluateAll((els) => els.filter((e) => e.getBoundingClientRect().height < 43.5).map((e) => e.textContent.trim()));
      expect(short, `${path}: 44 px targets`).toEqual([]);
    }
    await page.goto('/?nomotion');
    await expect(page.locator('[data-film-prev]')).toContainText('Previous');
    await expect(page.locator('[data-film-next]')).toContainText('Next');
    await expect(page.locator('[data-stories-prev]')).toContainText('Previous');
    await expect(page.locator('[data-stories-next]')).toContainText('Next');
    await expect(page.locator('[data-lc-prev]')).toHaveText(/Previous/);
    await expect(page.locator('[data-lc-next]')).toHaveText(/Next/);
    // Each control's name begins with the words on it (WCAG 2.5.3)
    await expect(page.locator('[data-film-prev]')).toHaveAccessibleName('Previous destination');
    await expect(page.locator('[data-stories-next]')).toHaveAccessibleName('Next review');
  });

  test('from 320 px up no button’s words are clipped or pushed past the screen (the phone bar included)', async ({ page, isMobile }) => {
    test.skip(isMobile, 'widths set explicitly');
    for (const w of [320, 375, 768, 1024, 1440]) {
      await page.setViewportSize({ width: w, height: 800 });
      for (const path of ['/', '/tours/cape-town-city-private-tour/', '/packages/garden-route-private-tour/', '/contact/', '/enquire/']) {
        await page.goto(`${path}?nomotion`);
        await page.evaluate(() => scrollTo(0, 1200));
        const clipped = await page.evaluate(() => [...document.querySelectorAll('.gt-button, .btn-coin')].filter((e) => e.offsetParent && (e.scrollWidth > e.clientWidth + 1 || e.getBoundingClientRect().right > innerWidth + 0.5)).map((e) => e.textContent.trim()));
        expect(clipped, `${path} at ${w}px`).toEqual([]);
      }
    }
  });

  test('keyboard focus is a 3 px ring with an offset; reduced motion keeps every state but moves nothing', async ({ page, isMobile }) => {
    test.skip(isMobile, 'keyboard and pointer hover');
    await page.goto('/contact/?nomotion');
    const primary = page.locator('main .gt-button--primary').first();
    await primary.focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    const ring = await primary.evaluate((e) => { const cs = getComputedStyle(e); return [cs.outlineStyle, cs.outlineWidth, cs.outlineOffset]; });
    expect(ring).toEqual(['solid', '3px', '3px']);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/contact/');
    await primary.hover();
    expect(await primary.evaluate((e) => getComputedStyle(e).transform)).toBe('none');
    expect(await primary.evaluate((e) => getComputedStyle(e).transitionDuration.split(',').every((d) => parseFloat(d) === 0))).toBe(true);
  });
});

test.describe('content honesty', () => {
  test('the price disclaimers and "Nothing is charged online" are gone from every page', async ({ page }) => {
    for (const path of PAGES) {
      await page.goto(`${path}?nomotion`);
      await expect(page.locator('main'), path).not.toContainText(/Nothing is charged online|not our direct rates?|Indicative price|Tripadvisor “from” price|Prices are indicative/i);
    }
  });

  test('no invented claims, placeholder text or source-brand leakage in the rendered site', async ({ page }) => {
    for (const path of PAGES) {
      await page.goto(`${path}?nomotion`);
      let text = await page.locator('body').innerText();
      // Good Times' own published cancellation rule ("Free cancellation up to 24 hours before …", from its official
      // tour and transfer pages) is a policy, not a marketplace claim: only that rule itself is set aside, wherever stated.
      text = text.replace(/free cancellation up to 24 hours before[^.;)]*/gi, '');
      // The terms say plainly that a request is not yet a booking: a disclaimer, not a promise
      if (path === '/terms/') text = text.replace('does not by itself guarantee a place on a tour', '');
      expect(text, path).not.toMatch(/lorem ipsum|24\/7|guarantee|insured|award-winning|#5 on Tripadvisor|1,200\+|Thousands of|10\+ years|100% locally|Free cancellation|Secure booking|Confirm & Pay/i);
      // Nothing of the template's earlier operators: not the name, not a reference or product of theirs
      expect(text, path).not.toMatch(FORMER_OPERATOR);
      expect(text, path).not.toMatch(/Safari (and|&) Soul|SJ-[A-Z0-9]{6}|Winelands Classic|Garden Route Explorer/); // brand-guard-allow: the template operators' names and products must never return
    }
  });

  test('no withdrawn photograph (children, or people who may be under 18) appears on any page, in any rendition', async ({ page }) => {
    const pattern = new RegExp(`(^|/)(${WITHDRAWN.join('|')})-\\d+\\.(avif|webp|jpe?g)\\b`);
    for (const path of PAGES) {
      await page.goto(`${path}?nomotion`);
      const used = await page.evaluate(() => [...document.querySelectorAll('img[src], source[srcset], a[href], [style*="url("]')].flatMap((e) => [e.getAttribute('src'), e.getAttribute('srcset'), e.getAttribute('href'), e.getAttribute('style')]).filter(Boolean).join(' ').split(/[\s,]+/));
      expect(used.filter((u) => pattern.test(u)), path).toEqual([]);
    }
  });

  test('the published contact details are the confirmed ones and every link works: call, email and the office; no WhatsApp until it is confirmed; no pending notes', async ({ page }) => {
    await page.goto('/contact/?nomotion');
    const main = page.locator('main');
    await expect(main.locator('a[href="tel:+27723768432"]')).toHaveCount(1);
    await expect(main.locator('a[href="mailto:info@goodtimesincapetown.co.za"]')).toHaveCount(1);
    // The number is confirmed for calls only, so nothing offers WhatsApp on it yet
    await expect(page.locator('a[href*="wa.me"], .brand-mark--whatsapp')).toHaveCount(0);
    // Call sits under the number in its familiar colour; Tripadvisor is named plainly
    await expect(main.locator('.contact-action .brand-mark--phone')).toHaveCount(1);
    await expect(main.locator('.contact-links a[href*="tripadvisor"]')).toHaveText(/^\s*Tripadvisor\s*\(opens in a new tab\)\s*$/);
    await expect(main).toContainText('+27 72 376 8432');
    // The office, as published, with a link to the map
    await expect(main).toContainText('277 Main Road, Adelphi Centre');
    await expect(main.locator('a[href^="https://www.google.com/maps"], a[href^="https://maps.google"], a[href*="goo.gl/maps"]')).toHaveCount(1);
    // The footer: the call link, and the social icons with their names
    const footer = page.locator('.site-footer');
    await expect(footer.locator('a[href="tel:+27723768432"]')).toHaveCount(1);
    // Each in its network's own colours
    const social = await footer.locator('.social a').evaluateAll((as) =>
      as.map((a) => { const m = a.querySelector('.brand-mark'); return [a.getAttribute('aria-label'), m.className.match(/brand-mark--(\w+)/)[1], getComputedStyle(m).backgroundImage !== 'none' ? 'gradient' : getComputedStyle(m).backgroundColor]; }),
    );
    expect(social.map(([, n, bg]) => [n, bg])).toEqual([
      ['instagram', 'gradient'],
      ['facebook', 'rgb(8, 102, 255)'],
      ['tripadvisor', 'rgb(52, 224, 161)'],
    ]);
    for (const [label] of social) expect(label).toMatch(/^Good Times in Cape Town on .+ \(opens in a new tab\)$/);
    for (const path of PAGES) {
      await page.goto(`${path}?nomotion`);
      await expect(page.locator('body'), path).not.toContainText(/awaiting (our |owner |Good Times )?confirmation|once Good Times confirms|Every booking request is confirmed by/i);
      // No incomplete or guessed address or number anywhere
      expect(await page.locator('a[href^="mailto:"]').evaluateAll((as) => as.every((a) => /^mailto:[a-z]+@goodtimesincapetown\.co\.za$/.test(a.getAttribute('href')))), path).toBe(true);
      expect(await page.locator('a[href^="tel:"]').evaluateAll((as) => as.every((a) => a.getAttribute('href') === 'tel:+27723768432')), path).toBe(true);
    }
  });
});
