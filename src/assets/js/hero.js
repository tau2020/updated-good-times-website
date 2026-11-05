/* Good Times in Cape Town — home hero entrance (one GSAP master timeline, home page only)
   A directed sequence over the already-visible café scene and its phone: the wordmark and Book Now
   arrive first, the navigation titles follow one by one, then the one call to action, Good Times
   start Here!, rises into the bottom-left corner and a single sheen crosses it. Whole elements only,
   opacity and small transforms (autoAlpha, y, a touch of scale on the wordmark and the call to action),
   overlapping so it reads as one piece: about 3.7 s on desktop, 3.1 s on tablets and 2.3 s on phones.
   The phone is not part of it: its first photograph is there from the first paint, and its gallery
   (phone-gallery.js) begins to swipe on its own. It runs once per load, only when motion is allowed
   (html.cine from the inline gate) and GSAP has loaded; otherwise nothing is hidden or moved.
   styles.css keeps the holding state until the timeline takes over, with a timed fallback should this
   script never run. Elements are hidden with autoAlpha, so nothing invisible can take focus. */
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
  var bookNow = header && one('.header-cta', header);
  var titles = header ? list('.primary-nav a', header) : [];
  var cta = one('.hero__cta');
  var sheen = cta && cta.querySelector('.hero__cta-sheen');

  var ctx = gsap.context(function () {
    // Starting states, written before the stylesheet's holding state is released
    var fading = [brand, bookNow, cta].concat(titles).filter(Boolean);
    gsap.set(fading, { autoAlpha: 0 });
    if (brand) gsap.set(brand, { y: 12, scale: 0.985, transformOrigin: 'left center' });
    if (bookNow) gsap.set(bookNow, { y: 10 });
    if (titles.length) gsap.set(titles, { y: 8 });
    if (cta) gsap.set(cta, { y: 16, scale: 0.96, transformOrigin: 'left bottom' });
    html.classList.add('intro-ready');

    var tl = gsap.timeline({ defaults: { ease: 'power2.out' }, onComplete: finish });

    // Act I — the brand arrives (0.0–1.3 s)
    tl.addLabel('brand', 0);
    if (brand) tl.to(brand, { autoAlpha: 1, y: 0, scale: 1, duration: 1.2 }, 'brand');
    if (bookNow) tl.to(bookNow, { autoAlpha: 1, y: 0, duration: 1 }, 'brand+=0.15');

    // Act II — the navigation titles, one after another (0.7–2.7 s)
    tl.addLabel('titles', 0.7);
    if (titles.length) tl.to(titles, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.28 }, 'titles');

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

    // Leaving the page mid-sequence (or a back-forward restore) settles everything; the entrance never replays
    window.addEventListener(
      'pagehide',
      function () {
        if (tl.progress() < 1) tl.progress(1);
      },
      { once: true },
    );
    window.__heroEntrance = tl; // read by the browser tests
  });
  window.__heroEntranceContext = ctx;
})();
