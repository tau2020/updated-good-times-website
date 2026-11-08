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
   moments rise and drift. The four ways (tour discovery) open as editorial reveals, the airport way with its own
   "arrival" doors and route; the invitation closes the page calmly with its own timeline and leaf; the footer lands
   gently (design/motion-bible.md, one section a heading). The footer is the one thing outside the chapters this
   file touches; still nothing in the hero or the header. */
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

  // A once-only entrance built after the visitor has already passed its start line (gsap.matchMedia rebuilding it
  // after a resize, a restored scroll position) plays at once rather than waiting for a scroll that will not come
  var whenReached = function (el, frac, tl) {
    ST.create({ trigger: el, start: 'top ' + Math.round(frac * 100) + '%', once: true, onEnter: function () { tl.play(); } });
    if (el.getBoundingClientRect().top < window.innerHeight * frac) tl.play();
  };

  /* ---------- Scenes: Atlantic Drift (the photograph a little slower than the page, ±5% of its oversized crop) and
     Air Reveal (the words). The drift is scrubbed from 48em only: on phones each scene is a still, correctly cropped
     photograph (D66, design.md §06). ---------- */
  var scenes = toArray('[data-scene]');
  scenes.forEach(function (s) {
    if (s.hasAttribute('data-invite')) return; // the invitation has its own entrance (below); its drift is shared
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

  /* ---------- 09 · Guest voices (the owner's request of 8 Nov 2026): the chapter's words, the rating bar and the review
     wall rise once with a light drift (16 px) and opacity only (never visibility, so they stay in the accessibility tree
     and the tab order; voices.css shows a focused one at once), at most 0.1 s apart. Cards that "Load more" adds later
     have their own short entrance (review-wall.css). No pin, no scrub, no loop; without motion (above) they are simply
     in place. ---------- */
  var voices = toArray('[data-voice]');
  if (voices.length) {
    gsap.from(voices, { opacity: 0, y: 16, duration: 0.7, ease: 'power2.out', stagger: 0.1, scrollTrigger: { trigger: voices[0], start: 'top 85%', once: true } });
  }

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

  /* ---------- 04 · Tour discovery (design/motion-bible.md §6): editorial reveals, not the page's generic fade. Each
     way's photograph opens from the side it sits on (the left column from the left, the right from the right, a beat
     later; on phones the thumbnail opens upward) while its picture settles from depth (1.08); then its name, line,
     facts and action follow in a short stagger, the action last. The airport way is "from arrival to adventure"
     (§7): its photograph opens from the middle, like an arrivals hall's doors, then its route draws from the airport to
     the stay, then its words. One timeline per card, played once as it comes into view. The card is a link
     throughout (clip-path, opacity and transforms only: its target never moves), and focus inside it shows it whole.
     The photograph's hover zoom stays the stylesheet's (on the img); the settle is GSAP's (on the picture). ---------- */
  (function ways() {
    var cards = toArray('[data-way]');
    if (!cards.length) return;
    gsap.matchMedia().add({ wide: '(min-width: 48em)', narrow: '(max-width: 47.99em)' }, function (ctx) {
      var wide = ctx.conditions.wide;
      cards.forEach(function (card, i) {
        var photo = card.querySelector('[data-way-photo]');
        var pic = photo && photo.querySelector('picture');
        var route = card.querySelector('.lc-way__route');
        var words = toArray('.lc-way__name, .lc-way__line, .lc-way__facts, .lc-way__go, .lc-way__extra', card);
        var airport = card.getAttribute('data-service') === 'airport';
        var round = ' round ' + (photo ? parseFloat(getComputedStyle(photo).borderTopLeftRadius) || 0 : 0) + 'px)';
        var right = wide && i % 2 === 1;
        var o = right ? 0.12 : 0;
        var closed = airport ? 'inset(0% 50% 0% 50%' : !wide ? 'inset(100% 0% 0% 0%' : right ? 'inset(0% 0% 0% 100%' : 'inset(0% 100% 0% 0%';
        var tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.out' } });
        if (photo) tl.fromTo(photo, { clipPath: closed + round }, { clipPath: 'inset(0% 0% 0% 0%' + round, duration: airport ? 1.15 : wide ? 1.0 : 0.7, ease: airport ? 'power3.inOut' : 'power3.out' }, o);
        if (pic) tl.fromTo(pic, { scale: wide ? 1.08 : 1.04 }, { scale: 1, duration: wide ? 1.3 : 0.9, clearProps: 'transform' }, o);
        var w = o + (wide ? 0.38 : 0.25);
        if (route) {
          var dots = route.querySelectorAll('circle');
          tl.fromTo(dots[0], { scale: 0, transformOrigin: '50% 50%' }, { scale: 1, duration: 0.3, ease: 'back.out(2)', clearProps: 'transform' }, o + 0.55)
            .fromTo(route.querySelector('.lc-way__route-line'), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.75, ease: 'power1.inOut', clearProps: 'strokeDashoffset' }, o + 0.65)
            .fromTo(dots[1], { scale: 0, transformOrigin: '50% 50%' }, { scale: 1, duration: 0.35, ease: 'back.out(2.2)', clearProps: 'transform' }, o + 1.3);
          w = o + 1.05;
        }
        tl.fromTo(words, { opacity: 0, y: wide ? 18 : 10 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.08, clearProps: 'opacity,transform' }, w);
        tl.eventCallback('onComplete', function () {
          if (photo) gsap.set(photo, { clearProps: 'clipPath' });
        });
        card.__entrance = tl;
        whenReached(card, 0.84, tl);
      });
    });
    root.addEventListener('focusin', function (e) {
      var card = e.target.closest && e.target.closest('[data-way]');
      if (card && card.__entrance && card.__entrance.progress() < 1) card.__entrance.progress(1);
    });
  })();

  /* ---------- 10 · The invitation (motion bible §13): the journey's calm close, the other end of "Look where your
     footsteps led.". The photograph comes up out of the dusk (its layer from 0.3 to full over 1.5 s, the picture
     settling from 1.08 over 2 s); the seal and the chapter mark; the headline's words rise and clear one after another
     (SplitText words: a softer gesture than the Peninsula's line masks); the line; then Plan My Day unfurls (its leaf
     is this scene's: data-leaf-owner="invite") and the transfer action appears beside it. Once, as it comes into
     view: the invitation never hides again, and focus inside it shows it whole. The scene's drift (scrubbed, wide
     screens) is shared with the other scenes: it moves the drift layer and the words block, never these. ---------- */
  (function invite() {
    var s = root.querySelector('[data-invite]');
    if (!s) return;
    var media = s.querySelector('.lc-scene__media');
    var img = media && media.querySelector('img');
    var head = s.querySelector('[data-scene-words]');
    var seal = s.querySelector('.lc-invite-seal');
    var mark = head && head.querySelector('.lc-mark');
    var title = s.querySelector('.lc-statement');
    var line = s.querySelector('.lc-scene__line');
    var leaf = s.querySelector('[data-leaf-owner="invite"]');
    var rest = toArray('.lc-scene__actions > *', s).filter(function (a) {
      return a !== leaf;
    });
    var words = null;
    if (title && window.SplitText) {
      gsap.registerPlugin(window.SplitText);
      words = window.SplitText.create(title, { type: 'words', wordsClass: 'lc-statement__word' }).words;
    }
    gsap.matchMedia().add({ wide: '(min-width: 48em)', narrow: '(max-width: 47.99em)' }, function (ctx) {
      var f = ctx.conditions.wide ? 1 : 0.8;
      var tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.out' } });
      if (media) tl.fromTo(media, { opacity: 0.3 }, { opacity: 1, duration: 1.5 * f, ease: 'power1.out', clearProps: 'opacity' }, 0);
      if (img) tl.fromTo(img, { scale: 1.08 }, { scale: 1, duration: 2 * f, clearProps: 'transform' }, 0);
      if (seal) tl.fromTo(seal, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6 * f, clearProps: 'opacity,transform' }, 0.3 * f);
      if (mark) tl.fromTo(mark, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.5 * f, clearProps: 'opacity,transform' }, 0.45 * f);
      if (words && words.length) tl.fromTo(words, { opacity: 0, yPercent: 45 }, { opacity: 1, yPercent: 0, duration: 0.9 * f, ease: 'power3.out', stagger: 0.07 * f, clearProps: 'opacity,transform' }, 0.6 * f);
      else if (title) tl.fromTo(title, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.9 * f, clearProps: 'opacity,transform' }, 0.6 * f);
      if (line) tl.fromTo(line, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.7 * f, clearProps: 'opacity,transform' }, 1.25 * f);
      var at = 1.75 * f;
      if (leaf) {
        tl.fromTo(leaf, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: 'none', clearProps: 'opacity' }, at);
        var unfurl = window.GTLeaf && window.GTLeaf.unfurl ? window.GTLeaf.unfurl(leaf) : null;
        if (unfurl) tl.add(unfurl, at);
      }
      if (rest.length) tl.fromTo(rest, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5, clearProps: 'opacity,transform' }, at + 0.45);
      s.__entrance = tl;
      api.invite = tl;
      whenReached(s, 0.62, tl);
    });
    s.addEventListener('focusin', function () {
      if (s.__entrance && s.__entrance.progress() < 1) s.__entrance.progress(1);
    });
  })();

  /* ---------- The footer (motion bible §15): a gentle landing after the journey, the calmest moment on the page. Its
     logo comes up, the company statement after it, then the groups in a short stagger; once, as it comes into view.
     Nothing pinned, nothing over the contact details, every link usable throughout (opacity and transforms only), and
     focus inside it shows it whole. Its links' hover is the stylesheet's (a colour and underline fade). ---------- */
  (function footer() {
    var f = doc.querySelector('.site-footer');
    if (!f) return;
    var logo = f.querySelector('.brand-lockup--footer img');
    var statement = f.querySelector('.brand-lockup--footer .brand-lockup__statement');
    var groups = toArray('.footer-brand > :not(.brand-lockup), .footer-main > :not(.footer-brand)', f);
    gsap.matchMedia().add('(min-width: 0em)', function () {
      var tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.out' } });
      if (logo) tl.fromTo(logo, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.7, clearProps: 'opacity,transform' }, 0);
      if (statement) tl.fromTo(statement, { opacity: 0 }, { opacity: 1, duration: 0.5, clearProps: 'opacity' }, 0.3);
      if (groups.length) tl.fromTo(groups, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.07, clearProps: 'opacity,transform' }, 0.2);
      f.__entrance = tl;
      whenReached(f, 0.9, tl);
    });
    f.addEventListener('focusin', function () {
      if (f.__entrance && f.__entrance.progress() < 1) f.__entrance.progress(1);
    });
  })();

  // Nothing stays hidden (an interrupted scroll, a trigger that never fired): once the page has settled, an entrance
  // that has not started for something already in or above the view is shown whole
  window.addEventListener('load', function () {
    setTimeout(function () {
      toArray('[data-way], [data-invite]').concat(toArray('.site-footer', doc)).forEach(function (el) {
        var tl = el.__entrance;
        if (tl && tl.progress() === 0 && !tl.isActive() && el.getBoundingClientRect().top < window.innerHeight) tl.progress(1);
      });
    }, 2500);
  });

  // Lazy images change heights as they load: measure again once everything is in
  window.addEventListener('load', function () {
    ST.refresh();
  });
})();
