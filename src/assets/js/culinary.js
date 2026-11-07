/* Good Times in Cape Town — the culinary compositions' movement
   Markup: src/partials/culinary.mjs. Styles: culinary.css.

   Each composition plays once as it comes into view, then only drifts with the scroll:
   - The Culinary Reveal (home): the landscape opens from a soft inset and settles from 1.06 (1.1 s); once it
     is established the food photograph rises 40 px out of its mask (0.9 s); then the brass line draws and the
     words and caption follow. On the scroll the landscape and the plate drift at different speeds.
   - The Dining Diptych (Winelands tour): the table opens downward, the plate rises upward 200 ms later; the
     line and the text follow. A small difference in drift gives the pair depth.
   - The Quiet Moment (destinations): the plate opens from a soft inset and settles; a slight drift.
   - About's coast and penguins use the Reveal's choreography: the coast first, then the penguins, then the caption.
   - The Portrait (About › Meet our team, design/motion-bible.md §11): the team photograph opens from a clean, rounded
     inset (its corners easing from soft to the frame's own) and settles from 1.06; then the eyebrow, the name and
     the words in a restrained stagger, and the caption. Opacity, not visibility: the words stay in the
     accessibility tree before they are revealed.
   Phones keep the entrances with less travel and no landscape drift. Nothing is pinned or snapped.

   Initial states are set here, never in CSS: without GSAP, with reduced motion or ?nomotion (no html.cine)
   every photograph and word is simply in place. gsap.matchMedia reverts everything when the conditions change. */
(function () {
  'use strict';
  var gsap = window.gsap;
  var ST = window.ScrollTrigger;
  var sections = Array.prototype.slice.call(document.querySelectorAll('[data-taste]'));
  if (!sections.length || !gsap || !ST || !document.documentElement.classList.contains('cine')) return;
  gsap.registerPlugin(ST);

  var ROUND = ' round 14px';
  var open = 'inset(0% 0% 0% 0%' + ROUND + ')';
  var kids = function (el, skip) {
    return Array.prototype.filter.call(el ? el.children : [], function (c) {
      return c !== skip;
    });
  };
  // Plays the entrance once, when the composition is well inside the view (or at once if it already is).
  // Once it has played, the masks are removed: a settled composition carries no clip-path.
  var once = function (trigger, tl, start, masks) {
    tl.eventCallback('onComplete', function () {
      gsap.set(masks, { clearProps: 'clipPath' });
    });
    ST.create({ trigger: trigger, start: start || 'top 72%', once: true, onEnter: function () { tl.play(); } });
  };
  // A scroll-linked drift: transforms only, scrubbed with a little smoothing
  var drift = function (target, trigger, from, to) {
    if (!target) return;
    gsap.fromTo(target, from, Object.assign({ ease: 'none', scrollTrigger: { trigger: trigger, start: 'top bottom', end: 'bottom top', scrub: 0.6 } }, to));
  };

  var choreograph = {
    reveal: function (s, wide) {
      var main = s.querySelector('[data-taste-main]');
      var layer = s.querySelector('[data-taste-layer]');
      var words = s.querySelector('[data-taste-words]');
      var rule = s.querySelector('[data-taste-rule]');
      var caption = s.querySelector('[data-taste-caption]');
      var mainPic = main && main.querySelector('picture');
      var layerFrame = layer && layer.querySelector('[data-taste-frame]');
      if (!main || !layer) return;
      var tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.out' } });
      // Phase 1: the atmosphere
      tl.fromTo(main, { clipPath: 'inset(6% 6% 6% 6%' + ROUND + ')' }, { clipPath: open, duration: 1.1 }, 0)
        .fromTo(mainPic, { scale: 1.06 }, { scale: 1, duration: 1.1 }, 0)
        // Phase 2: the food, once the landscape is established
        .fromTo(layer, { clipPath: 'inset(100% 0% 0% 0%)', y: wide ? 40 : 28, autoAlpha: 0 }, { clipPath: 'inset(0% 0% 0% 0%)', y: 0, autoAlpha: 1, duration: 0.9, ease: 'power3.out' }, 0.75);
      // Phase 3: the editorial detail (About's pair has its own words beside it, so only a caption)
      if (words) tl.fromTo(kids(words, rule), { y: 16, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.6, stagger: 0.08 }, 0.95);
      if (rule) tl.fromTo(rule, { scaleX: 0 }, { scaleX: 1, duration: 0.7, ease: 'power2.inOut' }, 1.05);
      if (caption) tl.fromTo(caption, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5 }, words ? 1.35 : 1.05);
      once(s, tl, null, [main, layer]);
      // Phase 4: the scroll continues; the plate moves a little faster than the landscape
      if (wide) drift(mainPic, s, { yPercent: -4 }, { yPercent: 4 });
      drift(layerFrame, s, { y: wide ? 26 : 10 }, { y: wide ? -26 : -10 });
    },

    diptych: function (s, wide) {
      var panes = s.querySelectorAll('[data-taste-pane]');
      var head = s.querySelector('[data-taste-words]');
      var rule = s.querySelector('[data-taste-rule]');
      var text = head && head.querySelector('.taste__text');
      if (panes.length < 2) return;
      var a = panes[0].querySelector('[data-taste-frame]');
      var b = panes[1].querySelector('[data-taste-frame]');
      var caps = s.querySelectorAll('figcaption');
      var tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.out' } });
      tl.fromTo(a, { clipPath: 'inset(0% 0% 100% 0%' + ROUND + ')' }, { clipPath: open, duration: 1.05 }, 0)
        .fromTo(a.querySelector('picture'), { scale: 1.06 }, { scale: 1, duration: 1.15 }, 0)
        .fromTo(b, { clipPath: 'inset(100% 0% 0% 0%' + ROUND + ')', y: wide ? 36 : 24 }, { clipPath: open, y: 0, duration: 0.9, ease: 'power3.out' }, 0.2)
        .fromTo(rule, { scaleX: 0 }, { scaleX: 1, duration: 0.7, ease: 'power2.inOut' }, 0.6)
        .fromTo(text, { y: 14, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.6 }, 0.7)
        .fromTo(caps, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5, stagger: 0.1 }, 0.9);
      once(s.querySelector('.taste__spread') || s, tl, 'top 78%', [a, b]);
      if (wide) {
        drift(a.querySelector('picture'), s, { yPercent: -3 }, { yPercent: 3 });
        drift(panes[1], s, { y: 30 }, { y: -30 });
      }
    },

    portrait: function (s, wide) {
      var frame = s.querySelector('[data-taste-frame]');
      var words = s.querySelector('[data-taste-words]');
      var caption = s.querySelector('[data-taste-caption]');
      if (!frame) return;
      var pic = frame.querySelector('picture');
      var r = parseFloat(getComputedStyle(frame).borderTopLeftRadius) || 14;
      var tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.out' } });
      tl.fromTo(frame, { clipPath: 'inset(9% 11% 9% 11% round ' + r * 3 + 'px)' }, { clipPath: 'inset(0% 0% 0% 0% round ' + r + 'px)', duration: 1.15, ease: 'power3.out' }, 0)
        .fromTo(pic, { scale: 1.06 }, { scale: 1, duration: 1.3 }, 0);
      if (words) tl.fromTo(words.children, { y: wide ? 18 : 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, stagger: 0.1, clearProps: 'opacity,transform' }, 0.5);
      if (caption) tl.fromTo(caption, { opacity: 0 }, { opacity: 1, duration: 0.5, clearProps: 'opacity' }, 1.0);
      once(s, tl, null, [frame]);
      if (wide) drift(pic, s, { yPercent: -2.5 }, { yPercent: 2.5 });
    },

    quiet: function (s, wide) {
      var frame = s.querySelector('[data-taste-frame]');
      var words = s.querySelector('[data-taste-words]');
      var rule = s.querySelector('[data-taste-rule]');
      if (!frame) return;
      var pic = frame.querySelector('picture');
      var tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.out' } });
      tl.fromTo(frame, { clipPath: 'inset(10% 10% 10% 10%' + ROUND + ')' }, { clipPath: open, duration: 1.0 }, 0)
        .fromTo(pic, { scale: 1.04 }, { scale: 1, duration: 1.2 }, 0)
        .fromTo(kids(words, rule), { y: 14, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.6, stagger: 0.08 }, 0.55)
        .fromTo(rule, { scaleX: 0 }, { scaleX: 1, duration: 0.7, ease: 'power2.inOut' }, 0.7);
      once(s, tl, null, [frame]);
      if (wide) drift(pic, s, { yPercent: -3 }, { yPercent: 3 });
    },
  };

  var mm = gsap.matchMedia();
  // The handler runs only while some condition matches, so motion is itself the condition; width only scales it
  mm.add({ motion: '(prefers-reduced-motion: no-preference)', wide: '(min-width: 48em)' }, function (ctx) {
    if (!ctx.conditions.motion) return;
    sections.forEach(function (s) {
      var play = choreograph[s.getAttribute('data-taste')];
      if (play) play(s, ctx.conditions.wide);
    });
  });
})();
