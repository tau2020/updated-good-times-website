/* Good Times in Cape Town — the sand journey's controller (home page only)
   The section after the hero is, in its markup, a complete static scene: the Camps Bay photograph, its words and the
   link to the Cape Peninsula day. With motion (html.cine) and WebGL2 it becomes a scroll scene: the section is taller
   than the screen and its stage is held by CSS sticky while the visitor scrolls (no ScrollTrigger pin, so no pin
   spacer and no layout shift); ScrollTrigger turns the scroll into one progress value p (scrubbed, so it eases and
   reverses), and the renderer (assets/js/motion/sand/renderer.js, loaded after the hero's entrance or at the first
   scroll, never on the hero's critical path) draws the sand
   at p and nothing else. GSAP is the only clock: there is no animation loop here or in the renderer.

   Tiers: full (WebGL2, up to 2× pixels, shadows), lite (fewer pixels and grains, no cast shadows; chosen when frames
   are measured to be slow while the scene is drawing), static (reduced motion, ?nomotion, no WebGL2, a failed
   renderer, a lost context until it is restored, print): the photograph with its words and link. ?sand=static|lite
   forces a tier (QA). The canvas is decorative (aria-hidden, no pointer events); the words are real HTML and stay in
   the accessibility tree, and anything focused in them shows at once (motion.css). */
(function () {
  'use strict';
  var doc = document;
  var html = doc.documentElement;
  var section = doc.querySelector('[data-sand-journey]');
  if (!section) return;
  var stage = section.querySelector('[data-sand-stage]');
  var gsap = window.gsap;
  var ST = window.ScrollTrigger;
  var query = (/[?&]sand=(static|lite|full)\b/.exec(location.search) || [])[1];
  var src = (doc.currentScript && doc.currentScript.src) || '';
  var api = (window.__sandJourney = { mode: 'static', tier: 'static', p: 0, pinAt: 0 });

  var live = html.classList.contains('cine') && !!gsap && !!ST && !!src && typeof window.WebGL2RenderingContext !== 'undefined' && query !== 'static';
  if (!live) {
    section.classList.add('is-static');
    return;
  }
  gsap.registerPlugin(ST);
  section.classList.add('is-live');
  api.mode = 'live';

  var clamp = function (v, a, b) {
    return v < a ? a : v > b ? b : v;
  };
  var smooth = function (a, b, x) {
    var t = clamp((x - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  };
  var state = { p: 0 };
  var renderer = null;
  var canvas = null;
  var mod = null;
  var START = 0.72; // progress begins when the section's top is 72% down the screen (the hero still in view)

  // Leave the static scene in place. The section collapses to one screen while its top is still at or below the top of
  // the screen (its stage stays where it is and only what lies below its end moves, out of sight); once the visitor is
  // inside the held stretch, it stays tall and shows the static scene there, so nothing jumps under them
  var giveUp = function (why) {
    api.error = why;
    api.tier = 'static';
    if (renderer) {
      try {
        renderer.destroy();
      } catch (e) {
        /* already gone */
      }
      renderer = null;
    }
    if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
    section.classList.remove('is-ready');
    if (section.getBoundingClientRect().top >= 0) {
      section.classList.remove('is-live');
      if (trigger) trigger.kill();
      if (tween) tween.kill();
      ST.refresh();
    } else {
      section.classList.add('is-static');
    }
  };

  // The words rise in as the sand clears (and the scrim behind them); p is the only input
  var words = function (p) {
    section.style.setProperty('--words', smooth(0.89, 0.985, p).toFixed(3)); // PHASE.words in motion/sand/scene.js
  };

  // Frame cadence while the scene is being drawn: if most recent frames are slow, drop to lite once
  var times = [];
  var last = 0;
  var watch = function () {
    var now = performance.now();
    var dt = now - last;
    last = now;
    if (!renderer || renderer.quality !== 'full' || query === 'full') return;
    if (dt > 0 && dt < 250) times.push(dt);
    if (times.length > 36) times.shift();
    if (times.length === 36) {
      var slow = times.filter(function (t) {
        return t > 30;
      }).length;
      if (slow > 22) {
        renderer.setQuality('lite');
        api.tier = 'lite';
        api.downgraded = true;
        times = [];
      }
    }
  };

  var draw = function () {
    api.p = state.p;
    words(state.p);
    if (renderer) {
      renderer.renderAt(state.p);
      watch();
    }
  };

  var measure = function () {
    var span = trigger ? trigger.end - trigger.start : 1;
    api.pinAt = span > 0 ? (START * window.innerHeight) / span : 0.25;
    if (renderer) renderer.resize(stage.clientWidth, stage.clientHeight, api.pinAt);
  };

  var tween = gsap.to(state, {
    p: 1,
    ease: 'none',
    onUpdate: draw,
    scrollTrigger: {
      trigger: section,
      start: 'top ' + Math.round(START * 100) + '%',
      end: 'bottom bottom',
      scrub: 0.45,
      onRefresh: function () {
        measure();
      },
    },
  });
  var trigger = tween.scrollTrigger;
  measure();
  words(0);

  // The renderer, only when the section is near (about one and a half screens ahead)
  var start = function () {
    if (renderer || mod === false) return;
    var url = new URL('motion/sand/renderer.js', src).href;
    import(url)
      .then(function (m) {
        mod = m;
        canvas = doc.createElement('canvas');
        canvas.className = 'sand-journey__sand';
        canvas.setAttribute('aria-hidden', 'true');
        canvas.setAttribute('role', 'presentation');
        var beach = stage.querySelector('.sand-journey__beach');
        beach.parentNode.insertBefore(canvas, beach.nextSibling);
        var make = function () {
          renderer = m.createSandRenderer(canvas, { quality: query === 'lite' ? 'lite' : 'full' });
          api.tier = renderer.quality;
          renderer.resize(stage.clientWidth, stage.clientHeight, api.pinAt);
          renderer.renderAt(state.p);
          // Arriving while the scene is on screen (a slow connection, a fast scroll): the sand and the words cross-fade
          // into the state for this p over 0.7 s, rather than the photograph and its words vanishing in one frame
          var r = stage.getBoundingClientRect();
          if (r.bottom > 0 && r.top < window.innerHeight && state.p > 0.01 && state.p < 0.985) {
            section.classList.add('is-arriving');
            setTimeout(function () {
              section.classList.remove('is-arriving');
            }, 800);
          }
          section.classList.add('is-ready');
          section.classList.remove('is-lost');
        };
        canvas.addEventListener('webglcontextlost', function (e) {
          e.preventDefault(); // ask for it back
          section.classList.add('is-lost');
          renderer = null;
          api.tier = 'static';
        });
        canvas.addEventListener('webglcontextrestored', function () {
          try {
            make();
          } catch (err) {
            giveUp(err.message);
          }
        });
        make();
      })
      .catch(function (err) {
        mod = false;
        giveUp(err && err.message ? err.message : String(err));
      });
  };
  // When to load it: the section starts at the fold, so "near the viewport" is from the first paint. The hero's
  // entrance owns the first seconds (the aircraft must not stutter while a shader compiles), so the renderer loads
  // once the entrance is done and the browser is idle, or at the first scroll, whichever comes first.
  var kicked = false;
  var kick = function (now) {
    if (kicked) return;
    kicked = true;
    if (now || !window.requestIdleCallback) setTimeout(start, 0);
    else window.requestIdleCallback(start, { timeout: 700 });
  };
  if (html.classList.contains('intro-done')) kick();
  else if ('MutationObserver' in window) {
    var mo = new MutationObserver(function () {
      if (!html.classList.contains('intro-done')) return;
      mo.disconnect();
      kick();
    });
    mo.observe(html, { attributes: true, attributeFilter: ['class'] });
  } else setTimeout(kick, 4000);
  var onScroll = function () {
    window.removeEventListener('scroll', onScroll);
    kick(true);
  };
  window.addEventListener('scroll', onScroll, { passive: true });

  // Leaving for good frees the GPU; a back-forward restore keeps it (the context-loss events cover the rest)
  window.addEventListener('pagehide', function (e) {
    if (e.persisted || !renderer) return;
    renderer.destroy();
    renderer = null;
  });

  // Test and QA hooks: draw any p directly and checksum it (the determinism tests), read the state
  api.renderAt = function (p) {
    state.p = clamp(p, 0, 1);
    draw();
  };
  api.checksum = function (p) {
    return renderer ? renderer.checksum(clamp(p, 0, 1)) : null;
  };
  api.ready = function () {
    return !!renderer;
  };
  api.scene = function () {
    return renderer && renderer.scene;
  };
  api.trigger = trigger;
  var lose = null;
  api.loseContext = function () {
    lose = renderer && renderer.gl.getExtension('WEBGL_lose_context');
    if (lose) lose.loseContext();
    return !!lose;
  };
  api.restoreContext = function () {
    if (lose) lose.restoreContext();
    return !!lose;
  };
})();
