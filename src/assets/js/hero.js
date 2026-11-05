/* Good Times in Cape Town — home hero entrance (one GSAP master timeline, home page only)
   A directed sequence over the already-visible photograph: the wordmark and Book Now arrive
   first, the navigation titles follow one by one, the headline rises, its rule draws, the
   lead settles, and the two actions close the composition. Whole elements only, opacity and
   small transforms (autoAlpha, y, a touch of scale on the wordmark and the headline),
   overlapping so it reads as one piece: about 4.5 s on desktop, 3.8 s on tablets and 2.7 s
   on phones. It runs once per load, only when motion is allowed (html.cine from the inline
   gate) and GSAP has loaded; otherwise nothing is hidden or moved. styles.css keeps the
   holding state until the timeline takes over, with a timed fallback should this script
   never run. Elements are hidden with autoAlpha, so nothing invisible can take focus. */
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
  var headline = one('.hero__title');
  var rule = one('.hero__rule');
  var lead = one('.hero__lead');
  var actions = list('.hero__actions > *');
  var primary = actions[0] || null;
  var secondary = actions[1] || null;

  var ctx = gsap.context(function () {
    // Starting states, written before the stylesheet's holding state is released
    var fading = [brand, bookNow, headline, lead].concat(titles, actions).filter(Boolean);
    gsap.set(fading, { autoAlpha: 0 });
    if (brand) gsap.set(brand, { y: 12, scale: 0.985, transformOrigin: 'left center' });
    if (bookNow) gsap.set(bookNow, { y: 10 });
    if (titles.length) gsap.set(titles, { y: 8 });
    if (headline) gsap.set(headline, { y: 18, scale: 0.99, transformOrigin: 'left bottom' });
    if (rule) gsap.set(rule, { autoAlpha: 0, scaleX: 0, transformOrigin: 'left center' });
    if (lead) gsap.set(lead, { y: 12 });
    if (actions.length) gsap.set(actions, { y: 10 });
    html.classList.add('intro-ready');

    var tl = gsap.timeline({ defaults: { ease: 'power2.out' }, onComplete: finish });

    // Act I — the brand arrives (0.0–1.3 s)
    tl.addLabel('brand', 0);
    if (brand) tl.to(brand, { autoAlpha: 1, y: 0, scale: 1, duration: 1.2 }, 'brand');
    if (bookNow) tl.to(bookNow, { autoAlpha: 1, y: 0, duration: 1 }, 'brand+=0.15');

    // Act II — the navigation titles, one after another (0.7–2.7 s)
    tl.addLabel('titles', 0.7);
    if (titles.length) tl.to(titles, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.28 }, 'titles');

    // Act III — the headline rises, the rule follows (2.0–3.4 s)
    tl.addLabel('headline', 2);
    if (headline) tl.to(headline, { autoAlpha: 1, y: 0, scale: 1, duration: 1.35 }, 'headline');
    if (rule) tl.to(rule, { autoAlpha: 1, scaleX: 1, duration: 0.65, ease: 'power3.out' }, 'headline+=0.45');

    // Act IV — the supporting story (2.6–3.8 s)
    tl.addLabel('lead', 2.6);
    if (lead) tl.to(lead, { autoAlpha: 1, y: 0, duration: 1.2, ease: 'sine.out' }, 'lead');

    // Act V — the calls to action (3.4–4.5 s)
    tl.addLabel('actions', 3.4);
    if (primary) tl.to(primary, { autoAlpha: 1, y: 0, duration: 0.9 }, 'actions');
    if (secondary) tl.to(secondary, { autoAlpha: 1, y: 0, duration: 0.9 }, 'actions+=0.18');

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
