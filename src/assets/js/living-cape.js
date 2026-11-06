/* Good Times in Cape Town — The Cape, A Living Story, home page only
   The chapters beneath the approved hero. GSAP is the one motion engine: ScrollTrigger
   drives every scroll-linked moment (scrubbed, so scrolling back reverses it). The destination carousel, the exhibition and its
   lightbox are the media system's (media.js, D66). Nothing here reads or writes the hero, the
   header or their descendants.

   Without motion (reduced motion, ?nomotion: no html.cine) or without GSAP, the page is
   already complete in its markup: the photograph stands in its frame, the routes are drawn,
   the words are in place.

   Motifs (D65 §12): Atlantic Drift (the scenes, from 48em), Air Reveal (words), Ink Draw (the journey line, the
   closing thread). The opening chapter's water, which trickled from the sand journey onto a photograph, was removed
   with its chapter on 6 Nov 2026 (qa/surgical-change-report.md): its SVG layer, its scrubbed timeline, its ticker and
   its on-screen trigger went with it. Story photographs (D66, design.md §06) each have their own
   entrance: the collage of moments rises as one stagger, the guide's portrait opens from a mask, the two smaller
   moments rise and drift, the services' photographs stay still. */
(function () {
  'use strict';
  var doc = document;
  var html = doc.documentElement;
  var root = doc.querySelector('[data-living-cape]');
  if (!root) return;
  var gsap = window.gsap;
  var ST = window.ScrollTrigger;
  var motion = !!(gsap && ST) && html.classList.contains('cine');
  var api = (window.__livingCape = { motion: motion });
  var toArray = function (sel, scope) {
    return Array.prototype.slice.call((scope || root).querySelectorAll(sel));
  };
  if (motion) gsap.registerPlugin(ST);

  if (!motion) return;

  /* ---------- Scenes: Atlantic Drift (the photograph a little slower than the page, ±5% of its oversized crop) and
     Air Reveal (the words). The drift is scrubbed from 48em only: on phones each scene is a still, correctly cropped
     photograph (D66, design.md §06). ---------- */
  var scenes = toArray('[data-scene]');
  scenes.forEach(function (s) {
    toArray('[data-scene-words]', s).forEach(function (words, b) {
      // Opacity, never visibility: the closing actions must stay reachable by keyboard before they are revealed
      gsap.from(words.children, {
        opacity: 0,
        y: 26,
        duration: 0.9,
        ease: 'power2.out',
        stagger: 0.09,
        delay: b * 0.25,
        scrollTrigger: { trigger: s, start: 'top 66%', toggleActions: 'play none none reverse' },
      });
    });
  });
  gsap.matchMedia().add('(min-width: 48em)', function () {
    scenes.forEach(function (s) {
      var drift = s.querySelector('[data-scene-drift]');
      var headline = s.querySelector('[data-scene-words]');
      if (drift) gsap.fromTo(drift, { yPercent: -5 }, { yPercent: 5, ease: 'none', scrollTrigger: { trigger: s, start: 'top bottom', end: 'bottom top', scrub: true } });
      // The headline drifts a little against the photograph; the actions stay put
      if (headline) gsap.fromTo(headline, { y: 36 }, { y: -36, ease: 'none', scrollTrigger: { trigger: s, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
  });

  /* ---------- 06 · The guide's portrait opens from a mask once, the photograph settling from 1.02 (design.md §06) ---------- */
  var frames = toArray('[data-unveil]');
  if (frames.length) {
    // The mask keeps the frame's rounded corners (D66) all the way
    var clip = function (top) {
      return function (i, f) {
        return 'inset(' + top + '% 0% 0% 0% round ' + (parseFloat(getComputedStyle(f).borderTopLeftRadius) || 0) + 'px)';
      };
    };
    gsap.set(frames, { clipPath: clip(12) });
    gsap.set(frames.map(function (f) { return f.querySelector('img'); }), { scale: 1.02 });
    ST.batch(frames, {
      start: 'top 88%',
      once: true,
      onEnter: function (batch) {
        gsap.to(batch, { clipPath: clip(0), duration: 0.9, ease: 'power3.out', clearProps: 'clipPath' });
        gsap.to(batch.map(function (f) { return f.querySelector('img'); }), { scale: 1, duration: 0.8, ease: 'power2.out', clearProps: 'transform' });
      },
    });
  }

  /* ---------- 03 and 06 · Photographs that rise once as a group: one controlled stagger per composition ---------- */
  var groups = {};
  toArray('[data-rise]').forEach(function (el) {
    var k = el.getAttribute('data-rise');
    (groups[k] = groups[k] || []).push(el);
  });
  Object.keys(groups).forEach(function (k) {
    var els = groups[k];
    gsap.from(els, { y: 28, autoAlpha: 0, duration: 0.7, ease: 'power2.out', stagger: 0.1, scrollTrigger: { trigger: els[0], start: 'top 85%', once: true } });
  });

  /* ---------- Depth: in the asymmetric compositions, some prints travel a little faster or slower (desktop) ---------- */
  gsap.matchMedia().add('(min-width: 64em)', function () {
    toArray('[data-depth]').forEach(function (el) {
      var d = Number(el.getAttribute('data-depth'));
      if (!d) return;
      gsap.fromTo(el, { yPercent: 7 * d }, { yPercent: -7 * d, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
  });

  /* ---------- The interlude: two backdrops held by CSS sticky while the words pass. With motion each
     artwork settles slowly into place, the elephant darkens a little as the cheetah rises over it,
     and each beat's words rise in. The layering itself is plain scrolling, so it never depends on this. ---------- */
  (function wild() {
    var s = root.querySelector('[data-wild]');
    if (!s) return;
    var panels = toArray('[data-wild-panel]', s);
    panels.forEach(function (panel, i) {
      var img = panel.querySelector('[data-wild-art] img');
      var words = panel.querySelector('.lc-wild__words');
      if (img) {
        gsap.fromTo(img, { scale: i ? 1.14 : 1.1 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: panel, start: 'top bottom', end: i ? 'top top' : 'top -60%', scrub: true } });
      }
      if (words) {
        gsap.from(words.children, {
          opacity: 0,
          y: 30,
          duration: 0.9,
          ease: 'power2.out',
          stagger: 0.1,
          scrollTrigger: { trigger: words, start: 'top 82%', toggleActions: 'play none none reverse' },
        });
      }
    });
    var shade = s.querySelector('[data-wild-shade]');
    if (shade && panels[1]) {
      gsap.fromTo(shade, { opacity: 0 }, { opacity: 0.55, ease: 'none', scrollTrigger: { trigger: panels[1], start: 'top bottom', end: 'top top', scrub: true } });
    }
  })();

  /* ---------- 09 · Ink Draw: the route between the three steps draws as they scroll into view ---------- */
  (function journey() {
    var j = root.querySelector('[data-journey]');
    if (!j) return;
    var state = { p: 0 };
    var draw = function () {
      j.style.setProperty('--journey', (1 - state.p).toFixed(3));
    };
    draw();
    var stops = toArray('.lc-ease__stop', j);
    gsap.set(stops, { scale: 0.7, autoAlpha: 0 });
    var tl = gsap.timeline({ scrollTrigger: { trigger: j, start: 'top 82%', end: 'bottom 60%', scrub: 0.6 } });
    tl.to(state, { p: 1, ease: 'none', duration: 1, onUpdate: draw }, 0);
    stops.forEach(function (stop, i) {
      tl.to(stop, { scale: 1, autoAlpha: 1, duration: 0.12, ease: 'back.out(2)' }, i * 0.4);
    });
    api.journey = { timeline: tl, state: state };
  })();

  /* ---------- 11 · The golden thread resolved: a fine line drawn under the sun's seal ---------- */
  (function thread() {
    var path = root.querySelector('[data-thread]');
    if (!path) return;
    var el = path.closest('svg');
    var t = { v: 1 };
    var set = function () {
      el.style.setProperty('--thread', t.v.toFixed(3));
    };
    set();
    gsap.to(t, { v: 0, duration: 1.4, ease: 'power2.inOut', onUpdate: set, scrollTrigger: { trigger: el, start: 'top 80%', toggleActions: 'play none none reverse' } });
  })();

  // Lazy images change heights as they load: measure again once everything is in
  window.addEventListener('load', function () {
    ST.refresh();
  });
})();
