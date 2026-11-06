/* Good Times in Cape Town — the sand journey's controller (home page only)
   The section after the hero is, in its markup, a complete static scene: the destination image (a woman at the water's
   edge, her footprints behind her), its words and the link to the Cape Peninsula tour. With motion (html.cine) and
   WebGL2 it becomes a scroll scene: the section is taller
   than the screen and its stage is held by CSS sticky while the visitor scrolls (no ScrollTrigger pin, so no pin
   spacer and no layout shift); ScrollTrigger turns the scroll into one progress value p (scrubbed, so it eases and
   reverses), and the renderer (assets/js/motion/sand/renderer.js, loaded after the hero's entrance or at the first
   scroll, never on the hero's critical path) draws the sand
   at p and nothing else. GSAP is the only clock: there is no animation loop here or in the renderer.

   Tiers: full (WebGL2, up to 2× pixels, shadows), lite (fewer pixels and grains, no cast shadows; chosen when frames
   are measured to be slow while the scene is drawing), static (reduced motion, ?nomotion, no WebGL2, a failed
   renderer, a lost context until it is restored, print): the image with its words and link (when the script runs, the
   words fade in once as the scene comes into view, opacity only). ?sand=static|lite
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

  /* The destination's film (the owner's section-2-video as a 7-second loop: the surf and the wind in her dress; she, the
     camera and her prints never move). It plays on its own clock over its own first frame (the poster picture under
     it); the scroll never scrubs it. It plays only with motion allowed (no reduced motion, no ?nomotion), the data saver
     off, the tab visible and the scene on screen and not buried under the sand (the renderer's layer covers the whole
     picture until the sweep is near), in every tier. Nothing is fetched before it may play. It fades in once a frame has
     been presented, pauses whenever one of those stops being true, and if autoplay is refused or the file fails the
     poster simply stays. Muted, inline, no controls, hidden from assistive technology. */
  var filmSync = function () {};
  (function () {
    var beach = stage.querySelector('[data-sand-photo]');
    var film = beach && beach.querySelector('[data-sand-film]');
    if (!film || typeof film.play !== 'function') return;
    var reduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
    var conn = navigator.connection || {};
    var inView = false;
    var attached = false;
    var gone = false;
    var retry = false;
    var wanted = null;
    var io = null;
    film.muted = true;
    film.defaultMuted = true;
    var saving = function () {
      return !!conn.saveData || /(^|-)2g$/.test(conn.effectiveType || '');
    };
    var buried = function () {
      var c = section.classList;
      return c.contains('is-ready') && !c.contains('is-lost') && api.p < 0.5;
    };
    var allowed = function () {
      return !gone && !reduce.matches && !/[?&]nomotion\b/.test(location.search) && !saving() && inView && !doc.hidden && !buried();
    };
    var ready = function () {
      beach.classList.add('is-playing');
    };
    var fail = function () {
      // No playable source or a network failure: keep the poster, drop the element so no broken box can appear
      gone = true;
      beach.classList.remove('is-playing');
      if (io) io.disconnect();
      if (film.parentNode) film.parentNode.removeChild(film);
      api.film = 'failed';
    };
    var attach = function () {
      if (attached) return;
      attached = true;
      var source = doc.createElement('source');
      source.src = film.getAttribute('data-mp4');
      source.type = 'video/mp4';
      source.addEventListener('error', fail);
      film.appendChild(source);
      film.load();
    };
    var play = function () {
      attach();
      if (gone) return;
      var attempt = film.play();
      if (attempt && typeof attempt.catch === 'function') {
        attempt.catch(function (err) {
          if (!err || err.name === 'AbortError') return; // paused or reloaded before it started
          if (err.name === 'NotSupportedError') return fail();
          // Autoplay refused (no gesture yet, a low-power mode): the poster stays; one quiet retry on the first touch
          if (retry) return;
          retry = true;
          var once = function () {
            if (allowed()) film.play().catch(function () {});
          };
          ['pointerdown', 'keydown', 'touchstart'].forEach(function (t) {
            doc.addEventListener(t, once, { once: true, passive: true });
          });
        });
      }
    };
    filmSync = function () {
      var want = allowed();
      if (reduce.matches) beach.classList.remove('is-playing'); // reduced motion switched on: back to the poster
      if (want === wanted) return;
      wanted = want;
      if (want) play();
      else if (!film.paused) film.pause();
    };
    film.addEventListener('playing', function () {
      // Fade in only once a frame has actually been presented, never over an empty box
      if (typeof film.requestVideoFrameCallback === 'function') film.requestVideoFrameCallback(ready);
      else ready();
    });
    film.addEventListener('error', fail);
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(
        function (entries) {
          inView = entries.some(function (e) {
            return e.isIntersecting;
          });
          filmSync();
        },
        { rootMargin: '200px 0px' }
      );
      io.observe(beach);
    } else inView = true;
    doc.addEventListener('visibilitychange', filmSync);
    if (reduce.addEventListener) reduce.addEventListener('change', filmSync);
    if (conn.addEventListener) conn.addEventListener('change', filmSync);
    window.addEventListener('pagehide', function () {
      if (!film.paused) film.pause();
      wanted = null;
    });
    window.addEventListener('pageshow', function (e) {
      if (!e.persisted) return;
      wanted = null;
      filmSync();
    });
    api.film = film;
    filmSync();
  })();

  var live =html.classList.contains('cine') && !!gsap && !!ST && !!src && typeof window.WebGL2RenderingContext !== 'undefined' && query !== 'static';
  if (!live) {
    section.classList.add('is-static');
    // The final scene at once; only its words fade in (opacity, nothing moves), once, as it comes into view
    if ('IntersectionObserver' in window) {
      section.classList.add('is-fading');
      var seen = new IntersectionObserver(
        function (entries) {
          if (!entries.some(function (e) { return e.isIntersecting; })) return;
          seen.disconnect();
          section.classList.add('is-seen');
        },
        { threshold: 0.3 }
      );
      seen.observe(section);
    }
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
    filmSync();
    if (section.getBoundingClientRect().top >= 0) {
      section.classList.remove('is-live');
      if (trigger) trigger.kill();
      if (tween) tween.kill();
      ST.refresh();
    } else {
      section.classList.add('is-static');
    }
  };

  // The words rise in, one after another (eyebrow, headline, line, link), once the scene is clear enough; p is the
  // only input (PHASE.words in motion/sand/scene.js)
  var words = function (p) {
    var st = section.style;
    st.setProperty('--words', smooth(0.84, 0.97, p).toFixed(3));
    for (var i = 0; i < 4; i++) st.setProperty('--w' + i, smooth(0.84 + 0.025 * i, 0.89 + 0.025 * i, p).toFixed(3));
  };

  // Where the stylesheet put the destination image on the stage ({ k: CSS px per image px, ox, oy }): the animated
  // trail is laid out from it, so its last prints land on the image's own. "Image px" are the pixels of the still the
  // prints were measured on (motion/sand/scene.js PHOTO, 1672 wide); the picture shown is the film's first frame, the
  // same picture at 1280 × 720 (it registers on the still at zero offset), so its scale is converted to the still's
  var PHOTO_W = 1672;
  var photoImg = stage.querySelector('[data-sand-photo] img');
  var placement = function () {
    if (!photoImg) return null;
    var nw = Number(photoImg.getAttribute('width')) || PHOTO_W;
    var nh = Number(photoImg.getAttribute('height')) || 941;
    var unit = nw / PHOTO_W; // picture px per still px
    var sr = stage.getBoundingClientRect();
    var r = photoImg.getBoundingClientRect();
    var cs = getComputedStyle(photoImg);
    if (cs.objectFit === 'cover') {
      var k = Math.max(r.width / nw, r.height / nh);
      var pos = cs.objectPosition.split(' ');
      var px = parseFloat(pos[0]) / 100 || 0;
      var py = parseFloat(pos[1]) / 100 || 0;
      return { k: k * unit, ox: r.left - sr.left + (r.width - nw * k) * px, oy: r.top - sr.top + (r.height - nh * k) * py };
    }
    return { k: (r.height / nh) * unit, ox: r.left - sr.left, oy: r.top - sr.top };
  };
  var headerHeight = function () {
    var hd = doc.querySelector('[data-header]');
    return hd ? hd.offsetHeight : 0;
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
    filmSync(); // the film starts as the sweep nears and rests while the sand covers it (it is never scrubbed)
  };

  var measure = function () {
    var span = trigger ? trigger.end - trigger.start : 1;
    api.pinAt = span > 0 ? (START * window.innerHeight) / span : 0.25;
    if (renderer) renderer.resize(stage.clientWidth, stage.clientHeight, api.pinAt, placement(), headerHeight());
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
          renderer.resize(stage.clientWidth, stage.clientHeight, api.pinAt, placement(), headerHeight());
          renderer.renderAt(state.p);
          // Arriving while the scene is on screen (a slow connection, a fast scroll): the sand and the words cross-fade
          // into the state for this p over 0.7 s, rather than the image and its words vanishing in one frame
          var r = stage.getBoundingClientRect();
          if (r.bottom > 0 && r.top < window.innerHeight && state.p > 0.01 && state.p < 0.97) {
            section.classList.add('is-arriving');
            setTimeout(function () {
              section.classList.remove('is-arriving');
            }, 800);
          }
          section.classList.add('is-ready');
          section.classList.remove('is-lost');
          filmSync();
        };
        canvas.addEventListener('webglcontextlost', function (e) {
          e.preventDefault(); // ask for it back
          section.classList.add('is-lost');
          renderer = null;
          api.tier = 'static';
          filmSync();
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
  api.placement = placement;
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
