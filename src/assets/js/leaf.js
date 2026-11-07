/* Good Times in Cape Town — the signature leaf's motion (every page; design/button-tokens.md, design/motion-bible.md)
   The brand's primary calls to action are leaf-shaped (ui.mjs › leafButton, buttons.css). GSAP gives them three small
   movements, each on the leaf's drawing only (the link, its words and its target never move or shrink):
     · entrance: the leaf unfolds from its stem (scaleX and a slight turn from the base), its midrib draws to the tip and
       the words settle in. Leaves that open a scene are played by that scene's own timeline (data-leaf-owner: the home
       intro, the hero, the sand journey); the others unfold once, as they scroll into view, if they start below it;
     · hover (a fine pointer only, never needed on touch): a small sway from the stem and the side veins opening;
     · press: a quick squeeze, released with a short spring; navigation is never delayed.
   Without motion (reduced motion, ?nomotion: no html.cine) or without GSAP nothing moves and every leaf is whole; the
   stylesheet's hover keeps the colour change and the side veins. A leaf that takes keyboard focus mid-entrance is shown
   at once. API (window.GTLeaf): unfurl(el, vars) → a paused-or-not timeline for a scene to nest; ready. */
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

  // A gentle settle with the slightest overshoot, as a leaf springs open (CustomEase where the page has it)
  var ease = 'back.out(1.35)';
  if (motion && window.CustomEase) {
    gsap.registerPlugin(window.CustomEase);
    ease = window.CustomEase.create('leafUnfurl', 'M0,0 C0.12,0.58 0.26,1.04 0.5,1.03 0.72,1.02 0.84,1 1,1');
  }

  /** The entrance as a timeline; the caller decides when it plays (a scene nests it; scrolled-into-view leaves play it). */
  api.unfurl = function (el, vars) {
    if (!motion || !el) return null;
    var p = parts(el);
    var tl = gsap.timeline(vars || {});
    if (p.shape) {
      tl.fromTo(
        p.shape,
        { scaleX: 0.16, scaleY: 0.72, rotation: -8, opacity: 0, transformOrigin: BASE },
        { scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, duration: 0.8, ease: ease, clearProps: 'transform,opacity' },
        0,
      );
    }
    if (p.vein) tl.fromTo(p.vein, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.7, ease: 'power2.out', clearProps: 'strokeDashoffset' }, 0.2);
    if (p.label) tl.fromTo(p.label, { opacity: 0, x: -8 }, { opacity: 1, x: 0, duration: 0.45, ease: 'power2.out', clearProps: 'opacity,transform' }, 0.36);
    return tl;
  };

  if (!motion) return;

  var fine = window.matchMedia('(hover: hover) and (pointer: fine)');

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
      if (e.pointerType !== 'mouse' || !fine.matches) return;
      hovered = true;
      gsap.to(p.shape, { rotation: 1.3, scaleX: 1.025, scaleY: 1.07, duration: 0.42, ease: 'sine.out', transformOrigin: BASE, overwrite: 'auto' });
      if (p.veinlets) gsap.to(p.veinlets, { strokeDashoffset: 0, duration: 0.45, ease: 'power2.out', overwrite: 'auto' });
    });
    el.addEventListener('pointerleave', function (e) {
      if (e.pointerType !== 'mouse') return;
      hovered = false;
      rest();
      if (p.veinlets) gsap.to(p.veinlets, { strokeDashoffset: 1, duration: 0.35, ease: 'power1.in', overwrite: 'auto' });
    });
    el.addEventListener('pointerdown', function () {
      gsap.to(p.shape, { scaleX: 0.965, scaleY: 0.92, rotation: 0, duration: 0.09, ease: 'power2.out', transformOrigin: BASE, overwrite: 'auto' });
    });
    var release = function () {
      gsap.to(p.shape, { scaleX: hovered ? 1.025 : 1, scaleY: hovered ? 1.07 : 1, rotation: hovered ? 1.3 : 0, duration: 0.55, ease: 'elastic.out(1, 0.55)', transformOrigin: BASE, overwrite: 'auto' });
    };
    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);
    // Focus during an entrance shows the leaf whole at once
    el.addEventListener('focusin', function () {
      if (el.__leafEntrance && el.__leafEntrance.progress() < 1) el.__leafEntrance.progress(1);
    });
  };

  var setup = function () {
    var leaves = Array.prototype.slice.call(document.querySelectorAll('[data-leaf]'));
    leaves.forEach(bind);
    var ST = window.ScrollTrigger;
    if (!ST) return;
    gsap.registerPlugin(ST);
    // Leaves that start below the fold, outside any panel and not owned by a scene, unfold as they come into view (once)
    var vh = window.innerHeight;
    leaves.forEach(function (el) {
      if (el.hasAttribute('data-leaf-owner') || el.closest('[hidden], .drawer, .gt-concierge-panel, .mobile-cta, .site-header, .site-footer')) return;
      if (!el.getClientRects().length || el.getBoundingClientRect().top < vh * 0.92) return;
      var tl = api.unfurl(el, { paused: true });
      if (!tl) return;
      el.__leafEntrance = tl;
      ST.create({ trigger: el, start: 'top 92%', once: true, onEnter: function () { tl.play(); } });
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup);
  else setup();
  api.ready = true;
})();
