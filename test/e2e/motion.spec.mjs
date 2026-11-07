// The cinematic motion layer in a real browser: the brand aircraft (partials/aircraft.mjs, assets/js/brand-plane.js)
// and the sand journey (partials/sand-journey.mjs, assets/js/sand-journey.js, assets/js/motion/sand/).
// The sand is drawn in the lite tier here (?sand=lite): the test browser draws WebGL in software.
import { test, expect } from '@playwright/test';

const motion = async (page) => page.emulateMedia({ reducedMotion: 'no-preference' });
// The sand journey's words, eyebrow to link, as their opacities ('1 1 1 1' shown, '0 0 0 0' waiting for the sand)
const WORDS = '.sand-journey__eyebrow, .sand-journey__title, .sand-journey__line, .sand-journey__cta';
const wordsShown = (page) => page.locator('[data-sand-journey]').evaluate((s, sel) => [...s.querySelectorAll(sel)].map((el) => getComputedStyle(el).opacity).join(' '), WORDS);

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

  test('a visitor who arrives past the hero (a link to a section, a restored scroll) gets the whole header at once', async ({ page, isMobile }) => {
    test.skip(isMobile, 'the header carries Plan My Day from 40em');
    await motion(page);
    await page.goto('/#gallery');
    // Never the 5.8 s entrance for someone already half a screen down: it finishes at once
    await page.waitForFunction(() => window.__heroEntrance && window.__heroEntrance.progress() === 1, null, { timeout: 5_000 });
    const cta = page.locator('.site-header .header-cta');
    expect(await cta.evaluate((a) => getComputedStyle(a).opacity)).toBe('1');
    expect(await cta.locator('.leaf-btn__shape').evaluate((s) => getComputedStyle(s).opacity)).toBe('1');
    await expect(page.locator('.brand.is-awaiting-aircraft')).toHaveCount(0);
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
    await expect.poll(() => page.evaluate(() => window.__sandJourney.p), { timeout: 25_000 }).toBeGreaterThan(0.99);
    await expect(page.locator('.sand-journey__cta')).toBeVisible();
    await expect.poll(() => wordsShown(page), { timeout: 8_000 }).toBe('1 1 1 1');
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
    await expect(section.getByRole('heading', { level: 2, name: 'Look where your footsteps led.' })).toBeVisible();
    await expect(section.getByText('One private day on the coast: big views, the penguins at Boulders and plenty of reasons to stop.')).toBeVisible();
    expect(await wordsShown(page)).toBe('1 1 1 1');
    // Nothing split, nothing scaled: the headline is its plain text, the photograph its own size
    await expect(section.locator('.sand-journey__title-line-mask, .sand-journey__title-word')).toHaveCount(0);
    expect(await section.locator('.sand-journey__beach img').evaluate((i) => getComputedStyle(i).transform)).toBe('none');
    // Reduced motion: no fade either (the brief of 6 Nov 2026): the words are simply there
    await expect(section).not.toHaveClass(/\bis-fading\b/);
    expect(await section.locator('.sand-journey__words').evaluate((w) => getComputedStyle(w).opacity)).toBe('1');
    const cta = section.getByRole('link', { name: 'Explore the Cape Peninsula Tour', exact: true });
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
    expect(await wordsShown(page)).toBe('1 1 1 1');
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
    expect(await wordsShown(page), 'the static scene meanwhile').toBe('1 1 1 1');
    // Record the section's classes, and the words on every frame from here on (the test browser draws slowly, so the
    // 0.7 s run back is read from the record rather than raced)
    await page.evaluate((sel) => {
      const s = document.querySelector('[data-sand-journey]');
      window.__arrivals = [];
      window.__frames = [];
      new MutationObserver(() => window.__arrivals.push(s.className)).observe(s, { attributes: true, attributeFilter: ['class'] });
      const tick = () => {
        window.__frames.push([...s.querySelectorAll(sel)].map((el) => Number(getComputedStyle(el).opacity)));
        if (window.__frames.length < 600) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, WORDS);
    release();
    await page.waitForFunction(() => window.__sandJourney.ready(), null, { timeout: 60_000 });
    await expect.poll(() => page.evaluate(() => window.__arrivals.some((c) => /\bis-arriving\b/.test(c) && /\bis-ready\b/.test(c))), { timeout: 10_000 }).toBe(true);
    // The words run back over 0.7 s (the entrance in reverse, sped up to fit), never vanishing in one frame
    const run = await page.evaluate(() => ({ back: window.__sandJourney.words.reversed(), seconds: window.__sandJourney.words.duration() / Math.abs(window.__sandJourney.words.timeScale()) }));
    expect(run.back).toBe(true);
    expect(run.seconds).toBeCloseTo(0.7, 1);
    await expect(page.locator('[data-sand-journey]')).not.toHaveClass(/\bis-arriving\b/, { timeout: 5_000 });
    await expect.poll(() => wordsShown(page), { message: 'then the state for this p', timeout: 5_000 }).toBe('0 0 0 0');
    const between = await page.evaluate(() => window.__frames.filter((f) => f.some((o) => o > 0.02 && o < 0.98)).length);
    expect(between, 'frames with a word part way').toBeGreaterThan(0);
  });

  test('the words are reachable by keyboard and show at once when focused, whatever the sand is doing', async ({ page }) => {
    test.setTimeout(60_000);
    await motion(page);
    await page.goto('/?sand=lite');
    await page.evaluate(() => window.scrollTo({ top: 40, behavior: 'instant' }));
    await page.waitForFunction(() => window.__sandJourney.ready(), null, { timeout: 45_000 });
    await page.evaluate(() => window.__sandJourney.renderAt(0.3));
    const cta = page.locator('.sand-journey__cta');
    expect(await wordsShown(page)).toBe('0 0 0 0');
    // Waiting, the words take no clicks (an invisible link must not catch one), but the link can still be focused
    expect(await page.locator('.sand-journey__foot').evaluate((f) => getComputedStyle(f).pointerEvents)).toBe('none');
    await cta.focus();
    expect(await wordsShown(page)).toBe('1 1 1 1');
    expect(await page.locator('.sand-journey__foot').evaluate((f) => getComputedStyle(f).pointerEvents)).toBe('auto');
  });

  test('the words appear one after another once the sand has cleared enough, never over the trail or the woman', async ({ page, isMobile }) => {
    test.setTimeout(60_000);
    await motion(page);
    await page.goto('/?sand=lite');
    await page.evaluate(() => window.scrollTo({ top: 40, behavior: 'instant' }));
    await page.waitForFunction(() => window.__sandJourney.ready(), null, { timeout: 45_000 });
    // None before p 0.84 (the sand is gone by about 0.80); from there a triggered entrance, in time, not scrubbed
    const at = async (p) => {
      await page.evaluate((p) => window.__sandJourney.renderAt(p), p);
      return (await wordsShown(page)).split(' ').map(Number);
    };
    expect(await at(0.83)).toEqual([0, 0, 0, 0]);
    const cover = await page.evaluate(() => window.__sandJourney.checksum(0.84).meanAlpha);
    expect(cover, 'the sand all but gone when the words begin').toBeLessThan(0.02);
    await at(0.9); // the entrance starts
    // The plan (design/motion-bible.md §4): the eyebrow (0.4–0.6 s), the headline's words rising through line masks
    // (SplitText; 0.9–1.3 s in all), the line (0.6–0.8 s) following the headline, then the leaf once the line is readable
    const plan = await page.evaluate(() => {
      const tl = window.__sandJourney.words;
      const abs = (t) => {
        let s = t.startTime();
        for (let p = t.parent; p && p !== tl; p = p.parent) s += p.startTime();
        return s;
      };
      const out = {};
      for (const t of tl.getChildren(true, true, false)) {
        const el = t.targets()[0];
        if (!el || !el.closest) continue;
        const key = ['eyebrow', 'title', 'line', 'cta'].find((k) => el.closest(`.sand-journey__${k}`));
        if (!key) continue;
        const a = abs(t);
        const b = a + t.totalDuration();
        out[key] = out[key] ? [Math.min(out[key][0], a), Math.max(out[key][1], b)] : [a, b];
      }
      return { out, masks: document.querySelectorAll('.sand-journey__title-line-mask').length, words: document.querySelectorAll('.sand-journey__title-word').length, label: document.querySelector('.sand-journey__title').getAttribute('aria-label') };
    });
    const { eyebrow, title, line, cta } = plan.out;
    const f = isMobile ? 0.8 : 1;
    expect(plan.words, 'the headline split into its five words').toBe(5);
    expect(plan.masks).toBeGreaterThan(0);
    expect(plan.label, 'one accessible name for the split headline').toBe('Look where your footsteps led.');
    expect(eyebrow[0]).toBe(0);
    expect(eyebrow[1] - eyebrow[0]).toBeGreaterThanOrEqual(0.4 * f - 0.001);
    expect(eyebrow[1] - eyebrow[0]).toBeLessThanOrEqual(0.6);
    expect(title[0]).toBeGreaterThan(eyebrow[0]);
    expect(title[1] - title[0]).toBeGreaterThanOrEqual(0.9 * f);
    expect(title[1] - title[0]).toBeLessThanOrEqual(1.3);
    expect(line[0]).toBeGreaterThan(title[0]);
    expect(line[1] - line[0]).toBeGreaterThanOrEqual(0.6 * f - 0.001);
    expect(line[1] - line[0]).toBeLessThanOrEqual(0.8);
    expect(cta[0], 'the leaf once the line is readable').toBeGreaterThan(line[0] + 0.4 * f);
    // Half way: the eyebrow and the headline in, the line coming, the leaf still waiting
    const mid = await page.evaluate((sel) => {
      const tl = window.__sandJourney.words;
      tl.pause();
      tl.seek(tl.labels.line + 0.1);
      const o = [...document.querySelectorAll(sel)].map((el) => Number(getComputedStyle(el).opacity));
      tl.play();
      return o;
    }, WORDS);
    expect(mid[0]).toBe(1);
    expect(mid[1]).toBe(1);
    expect(mid[2]).toBeGreaterThan(0);
    expect(mid[2]).toBeLessThan(1);
    expect(mid[3]).toBe(0);
    await expect.poll(() => wordsShown(page), { timeout: 8_000 }).toBe('1 1 1 1');
    // Scrolling back above p 0.80 runs it back
    await at(0.78);
    await expect.poll(() => wordsShown(page), { timeout: 8_000 }).toBe('0 0 0 0');
    // In the held stage at the end: no word box covers one of the image's prints or the woman (scene.js › PHOTO)
    const t = await page.evaluate(() => window.__sandJourney.trigger.end);
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), t);
    await expect.poll(() => page.evaluate(() => window.__sandJourney.p), { timeout: 25_000 }).toBeGreaterThan(0.99);
    await expect.poll(() => wordsShown(page), { timeout: 8_000 }).toBe('1 1 1 1'); // at rest, not mid-entrance
    const hits = await page.evaluate((sel) => {
      const { k, ox, oy } = window.__sandJourney.placement();
      const sr = document.querySelector('[data-sand-stage]').getBoundingClientRect();
      const rect = (x0, y0, x1, y1) => [sr.left + ox + x0 * k, sr.top + oy + y0 * k, sr.left + ox + x1 * k, sr.top + oy + y1 * k];
      // Each print's box (its centre ± 0.6 foot along, ± 0.3 across, generous), and the woman, hat to feet
      const prints = [[120.6, 320.5], [348.5, 409.3], [546.1, 561.8], [816.5, 620.1]].map(([x, y]) => rect(x - 75, y - 45, x + 75, y + 45));
      const woman = rect(1100, 95, 1310, 662);
      const over = (a, b) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
      const out = [];
      for (const el of document.querySelectorAll(sel)) {
        const b = el.getBoundingClientRect();
        const box = [b.left, b.top, b.right, b.bottom];
        prints.forEach((pr, i) => over(box, pr) && out.push(`${el.className} over print ${i + 1}`));
        if (over(box, woman)) out.push(`${el.className} over the woman`);
      }
      return out;
    }, WORDS);
    expect(hits).toEqual([]);
  });

  test('the coast reveals itself: the scenery leans in over the last steps and settles back to its own framing, sand and photograph together', async ({ page, isMobile }) => {
    test.setTimeout(60_000);
    await motion(page);
    await page.goto('/?sand=lite');
    await page.evaluate(() => window.scrollTo({ top: 40, behavior: 'instant' }));
    await page.waitForFunction(() => window.__sandJourney.ready(), null, { timeout: 45_000 });
    const at = (p) =>
      page.evaluate((p) => {
        const api = window.__sandJourney;
        api.renderAt(p);
        const stage = document.querySelector('[data-sand-stage]');
        const s = stage.getBoundingClientRect();
        const box = (el) => {
          // the layout box (offsets) plus its transform origin: the point on the stage it scales about
          let x = 0;
          let y = 0;
          for (let n = el; n && n !== stage; n = n.offsetParent) {
            x += n.offsetLeft;
            y += n.offsetTop;
          }
          const [ox, oy] = getComputedStyle(el).transformOrigin.split(' ').map(parseFloat);
          return [x + ox, y + oy];
        };
        const img = stage.querySelector('[data-sand-photo] img');
        const sand = stage.querySelector('.sand-journey__sand');
        const scale = (el) => {
          const m = getComputedStyle(el).transform;
          return m === 'none' ? 1 : new DOMMatrix(m).a;
        };
        return { reveal: api.reveal(), img: scale(img), sand: scale(sand), pivots: [box(img), box(sand)], stage: [s.width, s.height] };
      }, p);
    const amp = isMobile ? 0.015 : 0.04;
    const walk = await at(0.3);
    expect(walk.reveal.amp).toBeCloseTo(amp, 5);
    expect([walk.img, walk.sand], 'nothing scaled through the walk').toEqual([1, 1]);
    const lean = await at(0.6);
    expect(lean.img, 'leaning in at the last step').toBeCloseTo(1 + amp, 3);
    expect(lean.sand, 'the sand with it').toBeCloseTo(lean.img, 5);
    // About the same point on the stage, so the trail stays on the photograph's prints
    expect(Math.abs(lean.pivots[0][0] - lean.pivots[1][0])).toBeLessThan(1);
    expect(Math.abs(lean.pivots[0][1] - lean.pivots[1][1])).toBeLessThan(1);
    const settling = await at(0.75);
    expect(settling.img).toBeLessThan(lean.img);
    expect(settling.img).toBeGreaterThan(1);
    const settled = await at(0.95);
    expect([settled.img, settled.sand], 'its own framing once the sand is gone').toEqual([1, 1]);
    // The trail is measured unscaled: the placement is the same mid-lean as at rest
    const pl = await page.evaluate(() => {
      const api = window.__sandJourney;
      api.renderAt(0.6);
      const a = api.placement();
      api.renderAt(0.95);
      const b = api.placement();
      return [a, b];
    });
    expect(pl[0]).toEqual(pl[1]);
  });
});
