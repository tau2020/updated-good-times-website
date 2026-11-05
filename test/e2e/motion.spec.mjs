// The cinematic motion layer in a real browser: the brand aircraft (partials/aircraft.mjs, assets/js/brand-plane.js)
// and the sand journey (partials/sand-journey.mjs, assets/js/sand-journey.js, assets/js/motion/sand/).
// The sand is drawn in the lite tier here (?sand=lite): the test browser draws WebGL in software.
import { test, expect } from '@playwright/test';

const motion = async (page) => page.emulateMedia({ reducedMotion: 'no-preference' });

test.describe('the brand aircraft', () => {
  test('flies in, lands exactly on the logo’s own airliner, hands the logo back whole, and its landing starts the titles', async ({ page, isMobile }) => {
    await motion(page);
    await page.goto('/');
    await page.waitForFunction(() => window.__heroEntrance && window.__brandPlane);
    const r = await page.evaluate(() => {
      const tl = window.__heroEntrance;
      const p = window.__brandPlane;
      const brand = document.querySelector('.site-header--overlay .brand');
      const layer = document.querySelector('[data-aircraft-flight]');
      // Seeks fire the timeline's callbacks (seek(t, false)), as playing through would
      tl.pause();
      tl.seek(0, false);
      const at = (t) => {
        tl.seek(t, false);
        return { masked: brand.classList.contains('is-awaiting-aircraft'), flying: !layer.hidden };
      };
      const box = (el) => {
        const b = el.getBoundingClientRect();
        return [b.x, b.y, b.width, b.height];
      };
      const first = at(0.02);
      const air = at(0.75);
      const plane = layer.querySelector('[data-aircraft-plane]');
      const airBox = box(plane);
      at(0.15 + p.handoverAt - 0.004);
      const glyph = box(plane.querySelector('.aircraft-flight__glyph'));
      const dock = box(brand.querySelector('[data-aircraft-dock]'));
      const landed = at(0.15 + p.handoverAt + 0.01);
      const titles = tl.getChildren(false, true, false).filter((t) => t.targets()[0] && t.targets()[0].closest && t.targets()[0].closest('.primary-nav'));
      const out = { first, air, airBox, glyph, dock, landed, landsAt: p.landsAt, titlesAt: titles.length ? titles[0].startTime() : null, variant: p.variant };
      tl.seek(tl.duration(), false);
      return out;
    });
    expect(r.variant).toBe('jet');
    expect(r.first, 'the airliner’s place is empty from the first frame').toEqual({ masked: true, flying: false });
    expect(r.air, 'in the air: the copy flies, the logo waits').toEqual({ masked: true, flying: true });
    expect(r.airBox[2], 'large while it crosses the hero (60–90 px is the brief)').toBeGreaterThan(r.dock[2] * 2.5);
    // The landed glyph is the dock box less its clear space (2 of the logo's 84 units on each side), to the pixel
    const pad = (r.dock[2] * 2) / 84;
    const expected = [r.dock[0] + pad, r.dock[1] + pad, r.dock[2] - 2 * pad, r.dock[3] - 2 * pad];
    r.glyph.forEach((v, i) => expect(Math.abs(v - expected[i]), `landing error, coordinate ${i}`).toBeLessThan(0.5));
    expect(r.landed, 'after the handover the logo is whole and the layer gone').toEqual({ masked: false, flying: false });
    if (!isMobile) expect(r.titlesAt, 'the titles start at the landing').toBeCloseTo(0.15 + r.landsAt + 0.08, 2);
    await expect(page.locator('[data-aircraft-flight]')).toBeHidden();
    await expect(page.locator('.brand.is-awaiting-aircraft')).toHaveCount(0);
  });

  test('the header stays in the tab order through the entrance, and whatever is focused shows at once', async ({ page, isMobile }) => {
    test.skip(isMobile, 'the desktop titles');
    await motion(page);
    await page.goto('/');
    await page.waitForFunction(() => window.__heroEntrance);
    await page.evaluate(() => {
      window.__heroEntrance.pause(0.3);
    });
    const tours = page.locator('.site-header--overlay .primary-nav a').first();
    expect(await tours.evaluate((el) => getComputedStyle(el).visibility)).toBe('visible');
    await tours.focus();
    expect(await tours.evaluate((el) => [document.activeElement === el, getComputedStyle(el).opacity])).toEqual([true, '1']);
  });

  test('without motion there is no flight and the logo is whole', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.waitForTimeout(500);
    await expect(page.locator('[data-aircraft-flight]')).toBeHidden();
    await expect(page.locator('.brand.is-awaiting-aircraft')).toHaveCount(0);
    expect(await page.evaluate(() => window.__brandPlane)).toBeFalsy();
  });

  // While the entrance is playing (not paused: the master timeline would otherwise put a nested flight back in the air)
  const inFlight = async (page) => {
    await motion(page);
    await page.goto('/');
    await page.waitForFunction(() => window.__brandPlane && window.__heroEntrance && window.__heroEntrance.time() > 0.45 && window.__heroEntrance.time() < 1.1);
  };
  const landed = (page) => page.evaluate(() => [window.__brandPlane.timeline.progress(), document.querySelector('.brand').classList.contains('is-awaiting-aircraft'), document.querySelector('[data-aircraft-flight]').hidden]);

  test('a resize mid-flight lands it at once, the logo whole, and it stays landed', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop viewport');
    await inFlight(page);
    await page.setViewportSize({ width: 1100, height: 760 });
    await page.waitForTimeout(150);
    expect(await landed(page)).toEqual([1, false, true]);
    await page.waitForTimeout(600); // the entrance plays on (the titles, the call to action); the aircraft does not take off again
    expect(await landed(page)).toEqual([1, false, true]);
  });

  test('scrolling while it is in the air lands it at once', async ({ page }) => {
    await inFlight(page);
    await page.evaluate(() => window.scrollBy(0, 120));
    await page.waitForTimeout(150);
    expect(await landed(page)).toEqual([1, false, true]);
    await page.waitForTimeout(600);
    expect(await landed(page)).toEqual([1, false, true]);
  });
});

test.describe('the sand journey', () => {
  test('with motion: a held stage, one frame per progress value (the same going forwards and backwards), sand at the start, none at the end', async ({ page }) => {
    test.setTimeout(90_000);
    await motion(page);
    await page.goto('/?sand=lite');
    const section = page.locator('[data-sand-journey]');
    await expect(section).toHaveClass(/\bis-live\b/);
    await page.evaluate(() => window.scrollTo({ top: 40, behavior: 'instant' }));
    await page.waitForFunction(() => window.__sandJourney.ready(), null, { timeout: 60_000 });
    const geo = await page.evaluate(() => {
      const s = document.querySelector('[data-sand-journey]');
      const stage = s.querySelector('[data-sand-stage]');
      const c = s.querySelector('canvas');
      return { h: s.offsetHeight, vh: innerHeight, sticky: getComputedStyle(stage).position, canvas: [c.getAttribute('aria-hidden'), getComputedStyle(c).pointerEvents], tier: window.__sandJourney.tier };
    });
    expect(geo.h).toBeGreaterThan(geo.vh * 2.5);
    expect(geo.sticky).toBe('sticky');
    expect(geo.canvas).toEqual(['true', 'none']);
    expect(geo.tier).toBe('lite');
    const sums = await page.evaluate(() => {
      const api = window.__sandJourney;
      const ps = [0, 0.1, 0.45, 0.72, 0.9, 1];
      const fwd = ps.map((p) => api.checksum(p));
      const back = [...ps].reverse().map((p) => api.checksum(p)).reverse();
      return ps.map((p, i) => ({ p, same: fwd[i].hash === back[i].hash, alpha: fwd[i].meanAlpha }));
    });
    for (const s of sums) expect(s.same, `p ${s.p}`).toBe(true);
    expect(sums[0].alpha).toBe(1);
    expect(sums[2].alpha, 'the walk: the sand whole').toBe(1);
    expect(sums[3].alpha, 'mid-sweep: partly gone, not a wipe').toBeGreaterThan(0.05);
    expect(sums[3].alpha).toBeLessThan(0.95);
    expect(sums.at(-1).alpha, 'the end: the photograph clear').toBe(0);
    // Scrolling drives it: the bottom of the section is the end of the scene
    await page.evaluate(() => {
      const t = window.__sandJourney.trigger;
      window.scrollTo({ top: t.end, behavior: 'instant' });
    });
    await expect.poll(() => page.evaluate(() => window.__sandJourney.p), { timeout: 10_000 }).toBeGreaterThan(0.99);
    await expect(page.locator('.sand-journey__cta')).toBeVisible();
    expect(await page.locator('.sand-journey__words').evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
  });

  test('without motion it is the static scene: the photograph, the words and the link, one screen tall, no canvas', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const section = page.locator('[data-sand-journey]');
    await expect(section).toHaveClass(/\bis-static\b/);
    await expect(section.locator('canvas')).toHaveCount(0);
    const h = await section.evaluate((s) => [s.offsetHeight, innerHeight]);
    expect(h[0]).toBeLessThanOrEqual(h[1] + 1);
    await section.scrollIntoViewIfNeeded();
    await expect(section.locator('.sand-journey__beach img')).toBeVisible();
    await expect(section.getByRole('heading', { level: 2, name: 'Cape Peninsula Private Tour' })).toBeVisible();
    const cta = section.getByRole('link', { name: /^Explore This Experience\s*:\s*the Cape Peninsula Private Tour$/ });
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute('href', 'tours/cape-peninsula-private-tour/');
    await cta.click();
    await expect(page).toHaveURL(/\/tours\/cape-peninsula-private-tour\/$/);
  });

  test('?sand=static keeps the static scene with motion allowed, and the aircraft still flies', async ({ page }) => {
    await motion(page);
    await page.goto('/?sand=static');
    await expect(page.locator('[data-sand-journey]')).toHaveClass(/\bis-static\b/);
    await page.waitForFunction(() => window.__brandPlane);
  });

  test('a lost WebGL context shows the static scene; restored, the sand comes back', async ({ page }) => {
    test.setTimeout(90_000);
    await motion(page);
    await page.goto('/?sand=lite');
    await page.evaluate(() => window.scrollTo({ top: 40, behavior: 'instant' }));
    await page.waitForFunction(() => window.__sandJourney.ready(), null, { timeout: 60_000 });
    expect(await page.evaluate(() => window.__sandJourney.loseContext())).toBe(true);
    const section = page.locator('[data-sand-journey]');
    await expect(section).toHaveClass(/\bis-lost\b/);
    expect(await section.locator('canvas').evaluate((c) => getComputedStyle(c).display)).toBe('none');
    expect(await section.locator('.sand-journey__words').evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
    await page.evaluate(() => window.__sandJourney.restoreContext());
    await page.waitForFunction(() => window.__sandJourney.ready(), null, { timeout: 60_000 });
    await expect(section).not.toHaveClass(/\bis-lost\b/);
  });

  test('a renderer that arrives while the scene is on screen cross-fades in, never swapping the words out in one frame', async ({ page }) => {
    test.setTimeout(90_000);
    await motion(page);
    // Hold the renderer back (a slow connection) while the visitor scrolls into the held stage
    let release;
    const gate = new Promise((r) => (release = r));
    await page.route(/\/assets\/js\/motion\/sand\/renderer\.js$/, async (route) => {
      await gate;
      await route.continue();
    });
    await page.goto('/?sand=lite');
    const t = await page.evaluate(() => [window.__sandJourney.trigger.start, window.__sandJourney.trigger.end]);
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), Math.round(t[0] + 0.4 * (t[1] - t[0])));
    await page.waitForTimeout(700);
    const words = page.locator('.sand-journey__words');
    expect(await words.evaluate((el) => getComputedStyle(el).opacity), 'the static scene meanwhile').toBe('1');
    // Record the section's classes and the words' transition from here on (the test browser draws slowly, so the
    // 0.8 s cross-fade is read from the record rather than raced)
    await page.evaluate(() => {
      const s = document.querySelector('[data-sand-journey]');
      const w = s.querySelector('.sand-journey__words');
      window.__arrivals = [];
      new MutationObserver(() => window.__arrivals.push([s.className, getComputedStyle(w).transitionDuration])).observe(s, { attributes: true, attributeFilter: ['class'] });
    });
    release();
    await page.waitForFunction(() => window.__sandJourney.ready(), null, { timeout: 60_000 });
    await expect.poll(() => page.evaluate(() => window.__arrivals.some(([c]) => /\bis-arriving\b/.test(c) && /\bis-ready\b/.test(c))), { timeout: 10_000 }).toBe(true);
    const fade = await page.evaluate(() => window.__arrivals.find(([c]) => /\bis-arriving\b/.test(c))[1]);
    expect(fade, 'the words fade over 0.7 s as the sand arrives').toMatch(/0\.7s/);
    await expect(page.locator('[data-sand-journey]')).not.toHaveClass(/\bis-arriving\b/, { timeout: 5_000 });
    await expect.poll(() => words.evaluate((el) => getComputedStyle(el).opacity), { message: 'then the state for this p', timeout: 5_000 }).toBe('0');
  });

  test('the words are reachable by keyboard and show at once when focused, whatever the sand is doing', async ({ page }) => {
    test.setTimeout(60_000);
    await motion(page);
    await page.goto('/?sand=lite');
    await page.evaluate(() => window.scrollTo({ top: 40, behavior: 'instant' }));
    await page.waitForFunction(() => window.__sandJourney.ready(), null, { timeout: 45_000 });
    await page.evaluate(() => window.__sandJourney.renderAt(0.3));
    const cta = page.locator('.sand-journey__cta');
    expect(await page.locator('.sand-journey__words').evaluate((el) => getComputedStyle(el).opacity)).toBe('0');
    await cta.focus();
    expect(await page.locator('.sand-journey__words').evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
  });
});
