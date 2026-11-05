/* Good Times in Cape Town — guest stories (home page)
   Every verified review as a compact card in a carousel. With motion allowed (no reduced-motion
   preference, no ?nomotion) and GSAP loaded: the viewport clips, the track moves one card at a
   time under GSAP (0.75 s), loops seamlessly through cloned cards at both ends (aria-hidden,
   inert, no tab stops, never left on screen), advances by itself every 5 s, and rests while the
   pointer is over it, while anything inside has focus, while a pointer is down, while the section
   is off screen or the tab hidden, and on the Pause control; a drag or a swipe moves it a card.
   Without motion (reduced motion, ?nomotion, no GSAP, no JavaScript): a native snapping scroller
   with no autoplay, where the arrows scroll by a card. Below: the avatars' fallback and the two
   counted figures (D54). */
(function () {
  'use strict';
  var root = document.querySelector('[data-stories]');
  if (!root) return;
  var viewport = root.querySelector('[data-stories-viewport]');
  var track = root.querySelector('[data-stories-track]');
  var prev = root.querySelector('[data-stories-prev]');
  var next = root.querySelector('[data-stories-next]');
  var toggle = root.querySelector('[data-stories-toggle]');
  var cards = Array.prototype.slice.call(track ? track.children : []);
  if (!viewport || !track || cards.length < 2) return;

  var gsap = window.gsap;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var noMotion = function () {
    return reduce.matches || /[?&]nomotion\b/.test(location.search);
  };
  var INTERVAL = 5000; // milliseconds between automatic moves
  var DURATION = 0.75; // seconds per move
  var EASE = 'power2.inOut';
  var N = cards.length;

  var state = { live: false, index: 0, target: 0, visible: 1, step: 0, clones: [], tween: null, timer: null, drag: null, swallow: false, hover: false, focus: false, pointer: false, offscreen: false, hidden: false, paused: false, ro: null, io: null };

  var perView = function () {
    return window.matchMedia('(min-width: 64em)').matches ? 3 : window.matchMedia('(min-width: 40em)').matches ? 2 : 1;
  };
  var gap = function () {
    var cs = getComputedStyle(track);
    return parseFloat(cs.columnGap) || parseFloat(cs.gap) || 0;
  };
  var stepOf = function () {
    return cards[0].getBoundingClientRect().width + gap();
  };
  /* The track's x for card i as the first card in view (the cloned run before the first card is `visible` wide) */
  var xFor = function (i) {
    return -(state.visible + i) * state.step;
  };
  var running = function () {
    return state.live && !state.paused && !state.hover && !state.focus && !state.pointer && !state.offscreen && !state.hidden;
  };
  var schedule = function () {
    clearTimeout(state.timer);
    state.timer = null;
    if (!running()) return;
    state.timer = setTimeout(function () {
      state.timer = null;
      if (running()) go(state.target + 1);
      schedule();
    }, INTERVAL);
  };
  /* Past either end the clones show the same picture as the real cards: step back to them without a visible change */
  var settle = function () {
    if (state.target >= N) state.target -= N;
    else if (state.target < 0) state.target += N;
    state.index = state.target;
    gsap.set(track, { x: xFor(state.index) });
  };
  var go = function (to, instant) {
    if (!state.live) return;
    if (state.tween && state.tween.isActive()) {
      state.tween.kill(); // a quick second press lands the first move at once
      settle();
    }
    if (to >= N + state.visible || to < -state.visible) {
      // out of the cloned range (not reachable a card at a time): no animation can show it, so step there directly
      state.target = ((to % N) + N) % N;
      settle();
      schedule();
      return;
    }
    state.target = to;
    if (instant) {
      settle();
      schedule();
      return;
    }
    state.tween = gsap.to(track, { x: xFor(to), duration: DURATION, ease: EASE, overwrite: true, onComplete: settle });
    schedule();
  };
  var measure = function () {
    if (!state.live) return;
    state.step = stepOf();
    if (!(state.tween && state.tween.isActive()) && !state.drag) gsap.set(track, { x: xFor(state.index) });
  };
  var setToggle = function () {
    if (!toggle) return;
    toggle.hidden = !state.live;
    toggle.classList.toggle('is-paused', state.paused);
    toggle.setAttribute('aria-label', state.paused ? 'Play the reviews' : 'Pause the reviews');
  };

  var clone = function (card) {
    var c = card.cloneNode(true);
    c.classList.add('is-clone');
    c.setAttribute('aria-hidden', 'true');
    c.setAttribute('inert', '');
    c.querySelectorAll('a, button').forEach(function (el) {
      el.tabIndex = -1;
    });
    return c;
  };
  var mount = function (at) {
    if (state.live) return;
    state.visible = perView();
    cards.slice(-state.visible).forEach(function (card) {
      var c = clone(card);
      state.clones.push(c);
      track.insertBefore(c, cards[0]);
    });
    cards.slice(0, state.visible).forEach(function (card) {
      var c = clone(card);
      state.clones.push(c);
      track.appendChild(c);
    });
    root.classList.add('is-motion');
    state.live = true;
    state.index = state.target = at || 0;
    measure();
    if ('ResizeObserver' in window) {
      state.ro = new ResizeObserver(function () {
        if (!state.live) return;
        if (perView() !== state.visible) {
          var keep = state.index; // the same card stays first in view when the columns change
          unmount();
          mount(keep);
        } else measure();
      });
      state.ro.observe(viewport);
    }
    if ('IntersectionObserver' in window) {
      state.io = new IntersectionObserver(function (entries) {
        state.offscreen = !entries.some(function (e) {
          return e.isIntersecting;
        });
        schedule();
      }, { threshold: 0.15 });
      state.io.observe(root);
    }
    setToggle();
    schedule();
  };
  var unmount = function () {
    if (!state.live) return;
    clearTimeout(state.timer);
    state.timer = null;
    if (state.tween) state.tween.kill();
    if (state.ro) state.ro.disconnect();
    if (state.io) state.io.disconnect();
    state.clones.forEach(function (c) {
      c.remove();
    });
    state.clones = [];
    state.ro = state.io = state.tween = state.drag = null;
    root.classList.remove('is-motion', 'is-dragging');
    gsap.set(track, { clearProps: 'transform' });
    state.live = false;
    state.index = state.target = 0;
    setToggle();
  };
  var sync = function () {
    if (gsap && !noMotion()) mount();
    else unmount();
  };

  /* The arrows: a card at a time, either way; a glide in motion mode, a scroll otherwise */
  var nudge = function (dir) {
    if (!state.live) {
      viewport.scrollBy({ left: dir * stepOf(), behavior: noMotion() ? 'auto' : 'smooth' });
      return;
    }
    go(state.target + dir);
  };
  if (prev) prev.addEventListener('click', function () {
    nudge(-1);
  });
  if (next) next.addEventListener('click', function () {
    nudge(1);
  });
  if (toggle) toggle.addEventListener('click', function () {
    state.paused = !state.paused;
    setToggle();
    schedule();
  });
  /* With the scroller focused, the arrow keys step a card in motion mode (the native scroller handles them itself otherwise) */
  viewport.addEventListener('keydown', function (e) {
    if (!state.live || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      go(state.target + (e.key === 'ArrowRight' ? 1 : -1));
    }
  });

  /* Rest conditions */
  root.addEventListener('pointerenter', function () {
    state.hover = true;
    schedule();
  });
  root.addEventListener('pointerleave', function () {
    state.hover = false;
    schedule();
  });
  root.addEventListener('focusin', function (e) {
    state.focus = true;
    schedule();
    // A card's link taking focus brings that card into view by the shortest way round
    var card = e.target.closest ? e.target.closest('[data-story-card]') : null;
    if (!card || card.classList.contains('is-clone') || !state.live) return;
    var i = cards.indexOf(card);
    var offset = (((i - state.index) % N) + N) % N;
    if (offset < state.visible) return; // already in view
    if (offset > N / 2) offset -= N;
    viewport.scrollLeft = 0; // the browser's own scroll of the clipped viewport is undone
    go(state.index + offset);
  });
  root.addEventListener('focusout', function (e) {
    if (!root.contains(e.relatedTarget)) {
      state.focus = false;
      schedule();
    }
  });
  document.addEventListener('visibilitychange', function () {
    state.hidden = document.hidden;
    schedule();
  });
  viewport.addEventListener('scroll', function () {
    if (state.live && viewport.scrollLeft) viewport.scrollLeft = 0; // the clipped viewport never scrolls itself in motion mode
  });

  /* A drag or a swipe moves the track with the pointer and lands a card along; vertical gestures stay the page's */
  var onDown = function (e) {
    if (!state.live || (e.button !== undefined && e.button > 0)) return;
    if (e.target.closest && e.target.closest('button')) return;
    if (state.tween && state.tween.isActive()) {
      state.tween.kill();
      settle();
    }
    state.pointer = true;
    schedule();
    state.drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, from: Number(gsap.getProperty(track, 'x')) || 0, horizontal: null, t0: Date.now() };
  };
  var onMove = function (e) {
    var d = state.drag;
    if (!d || e.pointerId !== d.id) return;
    var dx = e.clientX - d.x0;
    var dy = e.clientY - d.y0;
    if (d.horizontal === null) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      d.horizontal = Math.abs(dx) > Math.abs(dy);
      if (!d.horizontal) {
        state.drag = null;
        state.pointer = false;
        schedule();
        return;
      }
      if (viewport.setPointerCapture) {
        try {
          viewport.setPointerCapture(e.pointerId);
        } catch (err) {
          /* a pointer that is already gone */
        }
      }
      root.classList.add('is-dragging');
    }
    gsap.set(track, { x: d.from + dx });
  };
  var onUp = function (e) {
    var d = state.drag;
    if (!d || e.pointerId !== d.id) return;
    state.drag = null;
    state.pointer = false;
    root.classList.remove('is-dragging');
    if (d.horizontal) {
      var dx = e.clientX - d.x0;
      var flick = Math.abs(dx) > 24 && Date.now() - d.t0 < 300;
      if (Math.abs(dx) > state.step * 0.25 || flick) go(state.index + (dx < 0 ? 1 : -1));
      else go(state.index); // not far enough: back into place
      state.swallow = true; // the click that ends a drag opens nothing
      setTimeout(function () {
        state.swallow = false;
      }, 0);
    } else schedule();
  };
  viewport.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
  viewport.addEventListener(
    'click',
    function (e) {
      if (state.swallow) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    true,
  );

  /* The step depends on the cards' final widths: measure again once fonts and images are in */
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  window.addEventListener('load', measure);
  reduce.addEventListener && reduce.addEventListener('change', sync);
  window.addEventListener('pagehide', function (e) {
    if (!e.persisted) unmount();
  });
  window.addEventListener('pageshow', function (e) {
    if (e.persisted) sync();
  });
  sync();
  window.__stories = {
    state: state,
    running: running,
    mounted: function () {
      return state.live;
    },
    go: go,
    next: function () {
      nudge(1);
    },
    prev: function () {
      nudge(-1);
    },
  }; // read by the browser tests
})();

/* Avatars (D54): each is the reviewer's Tripadvisor avatar over the reviewer's initials; if one fails to load, the initials show */
(function () {
  'use strict';
  Array.prototype.forEach.call(document.querySelectorAll('.story-card__avatar img'), function (img) {
    var drop = function () {
      img.remove();
    };
    img.addEventListener('error', drop);
    if (img.complete && img.naturalWidth === 0) drop();
  });
})();

/* Verified figures (D54): the numerals count up from zero once, when they scroll into view, about 1.8 s each with a
   short cascade (GSAP core + ScrollTrigger). Without motion (reduced motion, ?nomotion, no GSAP, no JavaScript) the
   exact figures are simply there, as they are in the markup. */
(function () {
  'use strict';
  var gsap = window.gsap;
  var ScrollTrigger = window.ScrollTrigger;
  var strip = document.querySelector('[data-story-stats]');
  if (!strip || !gsap || !ScrollTrigger || strip.hasAttribute('data-counted')) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || /[?&]nomotion\b/.test(location.search)) return;
  gsap.registerPlugin(ScrollTrigger);
  var figures = Array.prototype.map.call(strip.querySelectorAll('[data-count]'), function (el) {
    var decimals = Number(el.getAttribute('data-decimals')) || 0;
    var figure = { el: el, end: parseFloat(el.getAttribute('data-count')), decimals: decimals, value: 0 };
    el.textContent = (0).toFixed(decimals);
    return figure;
  });
  var tl = gsap.timeline({
    paused: true,
    onComplete: function () {
      strip.setAttribute('data-counted', '');
    },
  });
  figures.forEach(function (f, i) {
    tl.to(
      f,
      {
        value: f.end,
        duration: 1.8,
        ease: 'power2.out',
        onUpdate: function () {
          f.el.textContent = f.value.toFixed(f.decimals);
        },
      },
      i * 0.12,
    );
  });
  var trigger = ScrollTrigger.create({
    trigger: strip,
    start: 'top 85%',
    once: true,
    onEnter: function () {
      tl.play();
    },
  });
  window.addEventListener(
    'pagehide',
    function () {
      tl.progress(1); // the exact figures, whatever the state
      trigger.kill();
      tl.kill();
    },
    { once: true },
  );
  window.__guestCounters = { timeline: tl, trigger: trigger, figures: figures }; // read by the browser tests
})();
