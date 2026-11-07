/* Good Times in Cape Town — home hero entrance (one GSAP master timeline, home page only)
   A directed sequence over the already-visible café scene and its phone: the wordmark and Book Now arrive first,
   the logo's own little green airliner flies in from the left, follows the logo's dotted route and lands as the "i"
   of "in" (brand-plane.js), and its landing starts the navigation titles one by one; then the one call to action,
   Find Your Good Time, rises into the bottom-left corner and a single sheen crosses it. Whole elements only,
   opacity and small transforms (y, a touch of scale on the wordmark and the call to action), overlapping so it reads
   as one piece: about 4.8 s on desktop, 4.0 s on tablets and 2.9 s on phones (the aircraft at the owner's slower pace,
   6 Nov 2026: it lands at about 4.0 s on desktop; the call to action keeps its own moment, 2.2 s). Then, once the
   aircraft has handed the logo back whole, the company statement under it is drawn in from left to right, softly, in
   0.5 s: the entrance's last step (Addendum, 6 Nov 2026), about 5.3 s on desktop, 4.4 s on tablets, 3.2 s on phones.
   The phone is not part of it: its first photograph is there from the first paint, and its gallery
   (phone-gallery.js) begins to swipe on its own. It runs once per load, only when motion is allowed
   (html.cine from the inline gate) and GSAP has loaded; otherwise nothing is hidden or moved and the logo is whole.
   styles.css keeps the holding state until the timeline takes over, with a timed fallback should this
   script never run. The header (wordmark, titles, Book Now) is staged with opacity only, so it stays in the
   accessibility tree and in the tab order at every moment, and anything focused shows at once (styles.css);
   the call to action is hidden with autoAlpha, so it cannot take focus while invisible. */
(function () {
  'use strict';
  var html = document.documentElement;
  var gsap = window.gsap;
  var finish = function () {
    html.classList.add('intro-ready', 'intro-done');
  };
  if (!html.classList.contains('cine') || !gsap || !document.body.classList.contains('home')) return finish();

  // Only what is actually rendered takes part: no desktop titles on phones, no Book Now below 640 px
  var shown = function (el) {
    return !!el && el.getClientRects().length > 0;
  };
  var list = function (selector, root) {
    return Array.prototype.filter.call((root || document).querySelectorAll(selector), shown);
  };
  var one = function (selector, root) {
    var el = (root || document).querySelector(selector);
    return shown(el) ? el : null;
  };

  var header = document.querySelector('.site-header--overlay');
  var brand = header && one('.brand', header);
  var statement = header && one('.brand-lockup__statement', header);
  var bookNow = header && one('.header-cta', header);
  var titles = header ? list('.primary-nav a', header) : [];
  var cta = one('.hero__cta');
  var sheen = cta && cta.querySelector('.hero__cta-sheen');

  // The aircraft is measured before anything moves (the brand's own entrance shifts it by a few pixels)
  var plane = null;
  try {
    plane = window.GTBrandPlane && brand ? window.GTBrandPlane.prepare({ header: header, brand: brand }) : null;
  } catch (e) {
    plane = null;
  }

  var built = false;
  var ctx = gsap.context(function () {
    // Starting states, written before the stylesheet's holding state is released
    var staged = [brand, statement, bookNow].concat(titles).filter(Boolean);
    gsap.set(staged, { opacity: 0 });
    if (cta) gsap.set(cta, { autoAlpha: 0 });
    if (brand) gsap.set(brand, { y: 12, scale: 0.985, transformOrigin: 'left center' });
    // The clip reaches past the line's box so its soft shadow over the film is never cut while it draws in
    if (statement) gsap.set(statement, { y: 4, clipPath: 'inset(-1em 100% -1em -1em)' });
    if (bookNow) gsap.set(bookNow, { y: 10 });
    if (titles.length) gsap.set(titles, { y: 8 });
    if (cta) gsap.set(cta, { y: 16, scale: 0.96, transformOrigin: 'left bottom' });
    html.classList.add('intro-ready');

    var tl = gsap.timeline({ defaults: { ease: 'power2.out' }, onComplete: finish });

    // Act I — the brand arrives (0.0–0.5 s with the aircraft, 0.0–1.2 s without), Book Now beside it
    tl.addLabel('brand', 0);
    if (brand) tl.to(brand, { opacity: 1, y: 0, scale: 1, duration: plane ? 0.5 : 1.2 }, 'brand');
    if (bookNow) tl.to(bookNow, { opacity: 1, y: 0, duration: 1 }, 'brand+=0.15');

    // The aircraft (0.15–4.8 s): in from the left, along the logo's route, landing as the "i" of "in"
    var landing = 0.7;
    if (plane) {
      tl.add(plane.timeline, 'brand+=0.15');
      landing = 0.15 + plane.landsAt + 0.08;
    }

    // Act II — the navigation titles, one after another, from the landing (about 4.1–4.8 s) or from 0.7 s without it
    tl.addLabel('titles', landing);
    if (titles.length) tl.to(titles, { opacity: 1, y: 0, duration: plane ? 0.3 : 0.9, stagger: plane ? 0.085 : 0.28 }, 'titles');

    // Act IV — the company statement, once the logo entrance is complete: when the aircraft hands the logo back whole
    // (its handover, about 0.8 s after the touchdown, its settle done), or once the brand has arrived (1.2 s) without it.
    // A soft left-to-right draw (0.5 s) under the wordmark; nothing else moves.
    tl.addLabel('statement', plane ? 0.15 + plane.handoverAt : 1.2);
    if (statement) tl.to(statement, { opacity: 1, y: 0, clipPath: 'inset(-1em 0% -1em -1em)', duration: 0.5, ease: 'power2.out', clearProps: 'transform,clipPath' }, 'statement');

    // Act III — the call to action rises into its corner and settles, then one sheen crosses it (2.2–3.7 s)
    tl.addLabel('cta', 2.2);
    if (cta) {
      tl.to(cta, { autoAlpha: 1, y: 0, scale: 1, duration: 0.95, ease: 'back.out(1.5)', clearProps: 'transform' }, 'cta');
      // x: 0 drops the stylesheet's resting offset that GSAP would otherwise read in and add (translateX(-160%))
      if (sheen) tl.fromTo(sheen, { x: 0, xPercent: -160 }, { x: 0, xPercent: 330, duration: 0.85, ease: 'power2.inOut', clearProps: 'transform' }, 'cta+=0.62');
    }

    // The same composition, quicker where the screen is smaller
    var desktop = window.matchMedia('(min-width: 64em)').matches;
    var tablet = !desktop && window.matchMedia('(min-width: 40em)').matches;
    tl.timeScale(desktop ? 1 : tablet ? 1.2 : 1.65);

    // Leaving the page mid-sequence (or a back-forward restore) settles everything; the entrance never replays.
    // A resize, a turn of the phone or a scroll while the aircraft is in the air lands it at once (its path was measured
    // for the old layout); the logo is then whole and stays attached to the wordmark like any other part of it.
    var settle = function () {
      if (plane) plane.finish();
    };
    window.addEventListener(
      'pagehide',
      function () {
        if (tl.progress() < 1) tl.progress(1);
        settle();
      },
      { once: true },
    );
    var width = window.innerWidth;
    var height = window.innerHeight;
    window.addEventListener('resize', function () {
      if (Math.abs(window.innerWidth - width) < 2 && Math.abs(window.innerHeight - height) < 90) return; // the phone's toolbar
      if (plane && plane.timeline.progress() < 1) settle();
    });
    // A visitor who scrolls while it is in the air is on their way: it lands at once rather than chase a moving header
    var y0 = window.scrollY;
    var onScroll = function () {
      if (Math.abs(window.scrollY - y0) < 4) return;
      window.removeEventListener('scroll', onScroll);
      if (plane && plane.timeline.progress() < 1) settle();
    };
    if (plane) window.addEventListener('scroll', onScroll, { passive: true });

    // Preview builds only: replay the whole entrance (a review aid in the preview bar, never in production)
    var replay = document.querySelector('[data-intro-replay]');
    if (replay) {
      replay.hidden = false;
      replay.addEventListener('click', function () {
        if (plane) {
          tl.remove(plane.timeline);
          plane.rebuild();
          tl.add(plane.timeline, 'brand+=0.15');
        }
        window.scrollTo(0, 0);
        tl.restart();
      });
    }
    window.__heroEntrance = tl; // read by the browser tests
    window.__brandPlane = plane;
    built = true;
  });
  // Should anything above have failed, the logo is never left without its airliner
  if (!built && plane) plane.finish();
  window.__heroEntranceContext = ctx;
})();
