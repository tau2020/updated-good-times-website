/* Good Times in Cape Town — the signature leaf's motion (every page; design/button-tokens.md, design/motion-bible.md)
   The brand's primary calls to action are leaf-shaped (ui.mjs › leafButton, buttons.css). GSAP gives them three small
   movements, each on the leaf's drawing only (the link, its words and its target never move or shrink):
     · entrance: the leaf unfolds from its stem (scaleX and a slight turn from the base), its midrib draws to the tip and
       the words settle in. Leaves that open a scene are played by that scene's own timeline (data-leaf-owner: the home
       intro, the hero, the sand journey); the others unfold once, as they come into view, if they start below the
       fold (an IntersectionObserver: no scroll plug-in needed, so it works on every page);
     · hover (a fine pointer only, never needed on touch): a small sway from the stem and the side veins opening;
     · press: a quick squeeze, released with a short spring; navigation is never delayed.
   Hover and press wait while an entrance is playing (they would take over its transform for good). Without motion
   (reduced motion, ?nomotion: no html.cine) or without GSAP nothing moves and every leaf is whole; the stylesheet's
   hover keeps the colour change and the side veins. A leaf that takes keyboard focus mid-entrance is shown at once (a
   scene's own timeline does the same for the leaves it plays). API (window.GTLeaf): unfurl(el, vars) → a paused-or-not
   timeline for a scene to nest; ready. */
(function () {
  'use strict';
  var gsap = window.gsap;
  var html = document.documentElement;
  var api = (window.GTLeaf = { ready: false, unfurl: null });
  var motion = !!gsap && html.classList.contains('cine');

  var parts = function (el) {
    return {
      shape: el.querySelector('.leaf-btn__shape'),
      vein: el.querySelector('.leaf-btn__vein'),
      veinlets: el.querySelector('.leaf-btn__veinlets'),
      label: el.querySelector('.leaf-btn__label'),
    };
  };
  // The base of the leaf, where its stem joins (the drawing's 4% across, its middle): every turn and stretch starts here
  var BASE = '4% 52%';

  // A gentle settle with the slightest overshoot, as a leaf springs open. CustomEase where the page loads it (the home
  // page, after this file: so the ease is made at the first entrance, not here); back.out(1.35) elsewhere
  var ease = null;
  var unfurlEase = function () {
    if (ease) return ease;
    if (!window.CustomEase) return 'back.out(1.35)';
    gsap.registerPlugin(window.CustomEase);
    ease = window.CustomEase.get('leafUnfurl') || window.CustomEase.create('leafUnfurl', 'M0,0 C0.12,0.58 0.26,1.04 0.5,1.03 0.72,1.02 0.84,1 1,1');
    return ease;
  };

  /** The entrance as a timeline; the caller decides when it plays (a scene nests it; leaves coming into view play it). */
  api.unfurl = function (el, vars) {
    if (!motion || !el) return null;
    var p = parts(el);
    var tl = gsap.timeline(vars || {});
    if (p.shape) {
      tl.fromTo(
        p.shape,
        { scaleX: 0.16, scaleY: 0.72, rotation: -8, opacity: 0, transformOrigin: BASE },
        { scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, duration: 0.8, ease: unfurlEase(), clearProps: 'transform,opacity' },
        0,
      );
    }
    if (p.vein) tl.fromTo(p.vein, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.7, ease: 'power2.out', clearProps: 'strokeDashoffset' }, 0.2);
    if (p.label) tl.fromTo(p.label, { opacity: 0, x: -8 }, { opacity: 1, x: 0, duration: 0.45, ease: 'power2.out', clearProps: 'opacity,transform' }, 0.36);
    el.__leafEntrance = tl; // hover and press wait while it plays
    return tl;
  };

  if (!motion) return;

  var fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  // An entrance playing on this leaf, whoever plays it (isActive is false when it, or the scene that nests it, is paused)
  var entering = function (el) {
    var t = el.__leafEntrance;
    return !!t && t.isActive();
  };

  var bind = function (el) {
    if (el.__leaf) return;
    el.__leaf = true;
    var p = parts(el);
    if (!p.shape) return;
    var hovered = false;
    var rest = function (d) {
      gsap.to(p.shape, { rotation: 0, scaleX: 1, scaleY: 1, duration: d || 0.45, ease: 'sine.out', transformOrigin: BASE, overwrite: 'auto' });
    };
    el.addEventListener('pointerenter', function (e) {
      if (e.pointerType !== 'mouse' || !fine.matches || entering(el)) return;
      hovered = true;
      gsap.to(p.shape, { rotation: 1.3, scaleX: 1.025, scaleY: 1.07, duration: 0.42, ease: 'sine.out', transformOrigin: BASE, overwrite: 'auto' });
      if (p.veinlets) gsap.to(p.veinlets, { strokeDashoffset: 0, duration: 0.45, ease: 'power2.out', overwrite: 'auto' });
    });
    el.addEventListener('pointerleave', function (e) {
      if (e.pointerType !== 'mouse' || !hovered) return;
      hovered = false;
      if (entering(el)) return;
      rest();
      if (p.veinlets) gsap.to(p.veinlets, { strokeDashoffset: 1, duration: 0.35, ease: 'power1.in', overwrite: 'auto' });
    });
    var pressed = false;
    el.addEventListener('pointerdown', function () {
      if (entering(el)) return;
      pressed = true;
      gsap.to(p.shape, { scaleX: 0.965, scaleY: 0.92, rotation: 0, duration: 0.09, ease: 'power2.out', transformOrigin: BASE, overwrite: 'auto' });
    });
    var release = function () {
      if (!pressed) return;
      pressed = false;
      gsap.to(p.shape, { scaleX: hovered ? 1.025 : 1, scaleY: hovered ? 1.07 : 1, rotation: hovered ? 1.3 : 0, duration: 0.55, ease: 'elastic.out(1, 0.55)', transformOrigin: BASE, overwrite: 'auto' });
    };
    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);
    el.addEventListener('pointerleave', release);
    // Focus during its own entrance (a leaf coming into view) shows the leaf whole at once
    el.addEventListener('focusin', function () {
      var t = el.__leafSolo;
      if (t && t.progress() < 1) t.progress(1);
    });
  };

  var setup = function () {
    var leaves = Array.prototype.slice.call(document.querySelectorAll('[data-leaf]'));
    leaves.forEach(bind);
    if (!('IntersectionObserver' in window)) return;
    // Leaves that start below the fold, outside any panel and not owned by a scene, unfold as they come into view (once)
    var vh = window.innerHeight;
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          io.unobserve(e.target);
          if (e.target.__leafSolo) e.target.__leafSolo.play();
        });
      },
      { rootMargin: '0px 0px -8% 0px' }
    );
    leaves.forEach(function (el) {
      if (el.hasAttribute('data-leaf-owner') || el.closest('[hidden], .drawer, .gt-concierge-panel, .mobile-cta, .site-header, .site-footer')) return;
      if (!el.getClientRects().length || el.getBoundingClientRect().top < vh * 0.92) return;
      var tl = api.unfurl(el, { paused: true });
      if (!tl) return;
      el.__leafSolo = tl;
      io.observe(el);
    });
  };
  // After every deferred script (the page's plug-ins and scenes load after this file), before the first paint of a
  // leaf below the fold matters
  var done = false;
  var go = function () {
    if (done) return;
    done = true;
    setup();
  };
  if (document.readyState === 'complete') go();
  else {
    document.addEventListener('DOMContentLoaded', go);
    window.addEventListener('load', go);
  }
  api.ready = true;
})();
