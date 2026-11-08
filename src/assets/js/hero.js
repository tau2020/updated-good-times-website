/* Good Times in Cape Town — home hero entrance (one GSAP master timeline, home page only)
   A directed sequence over the already-visible café scene and its phone: the wordmark and Book Now arrive first,
   the logo's own little green airliner flies in from the left, follows the logo's dotted route and lands as the "i"
   of "in" (brand-plane.js), and its landing starts the navigation titles one by one; then the headline, Good Times
   Start Here!, rises at 2.2 s (the owner's choice of 7 Nov 2026, in place of the Find Your Good Time leaf) and the lime
   swash under "Start Here!" draws from left to right. Whole elements only, opacity and small transforms (y, a touch of
   scale on the wordmark), overlapping so it reads as one piece (the aircraft at the owner's slower pace, 6 Nov 2026:
   it lands at about 4.0 s on desktop; the headline keeps its own moment, 2.2 s). Then, once the aircraft has handed
   the logo back whole, the company statement under it is drawn in from left to right, softly, in 0.5 s (Addendum,
   6 Nov 2026), and last the navigation's Plan My Day leaf unfolds from its stem (the brief of 6 Nov 2026): about 5.8 s
   on desktop, 4.8 s on tablets, 3.2 s on phones (which show no header leaf). After the headline, the hero's services
   (HeroServices, the hero-services brief of 7 Nov 2026) follow it: the sentence rises, its lime brush draws under
   "tailored for you." from left to right, the four services settle in turn, and the two calls to action, Explore Our
   Tours and Our Experiences, rise together, all in place by about 4.3 s on desktop, as the aircraft lands. The headline and the services are staged with opacity only, so their words stay in the
   accessibility tree.
   The phone is not part of it: its first photograph is there from the first paint, and its gallery
   (phone-gallery.js) begins to swipe on its own. It runs once per load, only when motion is allowed
   (html.cine from the inline gate) and GSAP has loaded; otherwise nothing is hidden or moved and the logo is whole.
   styles.css keeps the holding state until the timeline takes over, with a timed fallback should this
   script never run. The header (wordmark, titles, Book Now) is staged with opacity only, so it stays in the
   accessibility tree and in the tab order at every moment, and anything focused shows at once (styles.css). */
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
  // The hero's words (partials/hero-services.mjs): the headline, then the services; over the photograph on wide
  // screens, the headline bottom left and the services beneath the hero elsewhere
  var services = document.querySelector('[data-hero-services]');
  var headline = services ? one('.hero-headline', services) : null;
  var swash = headline ? headline.querySelector('.hero-headline__swash') : null;
  // The two calls to action, Explore Our Tours and Our Experiences: in the tab order throughout (opacity only; a focused
  // one shows at once, hero-services.css)
  var actions = services ? one('.hero-services__actions', services) : null;
  var lead = services ? one('.hero-services__lead', services) : null;
  var brush = services ? one('.hero-services__brush', services) : null;
  var items = services ? list('.hero-services__item', services) : [];

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
    if (brand) gsap.set(brand, { y: 12, scale: 0.985, transformOrigin: 'left center' });
    // The clip reaches past the line's box so its soft shadow over the film is never cut while it draws in
    if (statement) gsap.set(statement, { y: 4, clipPath: 'inset(-1em 100% -1em -1em)' });
    if (bookNow) gsap.set(bookNow, { y: 6 });
    if (titles.length) gsap.set(titles, { y: 8 });
    // The headline and the services: opacity and a few pixels of rise (never visibility), the brushes clipped to nothing
    // from the right
    if (headline) gsap.set(headline, { opacity: 0, y: 16 });
    if (actions) gsap.set(actions, { opacity: 0, y: 12 });
    if (swash) gsap.set(swash, { clipPath: 'inset(-20% 100% -20% -5%)' });
    if (lead) gsap.set(lead, { opacity: 0, y: 14 });
    if (services) gsap.set(services, { '--hs-veil': 0 }); // the shade behind the words (hero-services.css) waits for them
    if (items.length) gsap.set(items, { opacity: 0, y: 12 });
    if (brush) gsap.set(brush, { clipPath: 'inset(-50% 100% -50% -5%)' });
    html.classList.add('intro-ready');

    var tl = gsap.timeline({ defaults: { ease: 'power2.out' }, onComplete: finish });

    // Act I — the brand arrives (0.0–0.5 s with the aircraft, 0.0–1.2 s without)
    tl.addLabel('brand', 0);
    if (brand) tl.to(brand, { opacity: 1, y: 0, scale: 1, duration: plane ? 0.5 : 1.2 }, 'brand');

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

    // Act V — the navigation's call to action (Book Your Adventure, a pill since the owner's request of 8 Nov 2026; Plan My
    // Day's leaf before it) rises last, as the statement settles. It is in the tab order and takes a click throughout:
    // only its opacity was held
    tl.addLabel('bookNow', 'statement+=0.1');
    if (bookNow) tl.to(bookNow, { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out', clearProps: 'transform' }, 'bookNow');

    // Act III — the headline, Good Times Start Here!, rises into its place (2.2 s), the shade behind the words with it
    // (wide screens); the lime swash under "Start Here!" draws in one quick stroke from left to right (2.4 s)
    tl.addLabel('headline', 2.2);
    if (headline) tl.to(headline, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out', clearProps: 'transform' }, 'headline');
    if (services) tl.to(services, { '--hs-veil': 1, duration: 0.65, ease: 'power1.out', clearProps: '--hs-veil' }, 'headline');
    if (swash) tl.to(swash, { clipPath: 'inset(-20% 0% -20% -5%)', duration: 0.5, ease: 'power2.inOut', clearProps: 'clipPath' }, 'headline+=0.2');

    // Act III·b — the hero's services, once the headline has risen (2.65–4.25 s): the sentence rises; the brush draws
    // under its last words, one quick stroke from left to right; then the four services settle in turn, each icon, title
    // and line as one. Nothing keeps moving afterwards
    tl.addLabel('services', 'headline+=0.45');
    if (lead) tl.to(lead, { opacity: 1, y: 0, duration: 0.65, ease: 'power2.out', clearProps: 'transform' }, 'services');
    if (brush) tl.to(brush, { clipPath: 'inset(-50% 0% -50% -5%)', duration: 0.55, ease: 'power2.inOut', clearProps: 'clipPath' }, 'services+=0.45');
    if (items.length) tl.to(items, { opacity: 1, y: 0, duration: 0.55, stagger: 0.12, ease: 'power2.out', clearProps: 'transform' }, 'services+=0.7');
    // ... and the two calls to action rise together as the last service settles (3.75 s)
    if (actions) tl.to(actions, { opacity: 1, y: 0, duration: 0.55, ease: 'power2.out', clearProps: 'transform' }, 'services+=1.1');

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
    // A visitor who scrolls while it is in the air is on their way: it lands at once rather than chase a moving header.
    // One who is (or goes) more than half a screen down while it plays (a restored scroll position after a reload or
    // a return, a link to a section, a quick start) is past the hero: the whole entrance finishes at once, so the
    // header, Plan My Day included, never makes them wait
    var y0 = window.scrollY;
    var past = function () {
      return window.scrollY > window.innerHeight * 0.5;
    };
    var onScroll = function () {
      if (Math.abs(window.scrollY - y0) < 4) return;
      if (plane && plane.timeline.progress() < 1) settle();
      if (past() || tl.progress() === 1) {
        window.removeEventListener('scroll', onScroll);
        if (tl.progress() < 1) tl.progress(1);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    if (past()) {
      settle();
      tl.progress(1);
    }

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
