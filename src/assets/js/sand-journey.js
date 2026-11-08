/* Good Times in Cape Town — the sand journey's controller (home page only)
   The section after the hero is, in its markup, a complete static scene: the destination image (a woman at the water's
   edge, her footprints behind her), its words and the link to the Cape Peninsula tour. With motion (html.cine) and
   WebGL2 it becomes a scroll scene: the section is taller
   than the screen and its stage is held by CSS sticky while the visitor scrolls (no ScrollTrigger pin, so no pin
   spacer and no layout shift); one ScrollTrigger turns the scroll into one progress value p (scrubbed, so it eases and
   reverses), and the renderer (assets/js/motion/sand/renderer.js, loaded after the hero's entrance or at the first
   scroll, never on the hero's critical path) draws the sand at p and nothing else. "The Coast Reveals Itself"
   (design/motion-bible.md §4): the walk and its last print (phase 1), the sweep (2) and the coastal reveal's depth (3)
   follow p; the words (phases 4 to 7: eyebrow, SplitText headline, line, leaf) are a triggered entrance, played once
   the sand has cleared and run back if the visitor scrolls back, so they are never read half-scrubbed; then the
   section simply scrolls on (8). GSAP is the only clock: there is no animation loop here or in the renderer.

   Tiers: full (WebGL2, up to 2× pixels, shadows), lite (fewer pixels and grains, no cast shadows; chosen when frames
   are measured to be slow while the scene is drawing), static (reduced motion, ?nomotion, no WebGL2, a failed
   renderer, a lost context until it is restored, print): the image with its words and link (when the script runs and
   motion is allowed, the words fade in once as the scene comes into view, opacity only; with reduced motion they are
   simply there; no split, no scale). ?sand=static|lite
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
     off, the tab visible and the scene on screen: in the scroll scene (html.cine with WebGL2) once the renderer has
     drawn its sand and the sweep is near (p 0.5; the sweep begins at 0.605), never under the sand and never while the
     visitor is still in the hero; without the scroll scene, once a quarter of the picture is in view. It starts loading
     a little before (p 0.4) so it is ready when uncovered, and nothing is fetched before then. It fades in once a frame
     has been presented, pauses whenever one of those stops being true, and if autoplay is refused or the file fails the
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
    // The scroll scene owns the picture until its sweep: before the renderer is ready the visitor is still in the hero
    var scene = function () {
      var c = section.classList;
      return c.contains('is-live') && !c.contains('is-static') && !c.contains('is-lost');
    };
    var reached = function (at) {
      return !scene() || (section.classList.contains('is-ready') && api.p >= at);
    };
    var permitted = function () {
      return !gone && !reduce.matches && !/[?&]nomotion\b/.test(location.search) && !saving() && inView && !doc.hidden;
    };
    var allowed = function () {
      return permitted() && reached(0.5);
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
      if (!attached && permitted() && reached(0.4)) attach(); // load a little ahead of the sweep
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
        { threshold: 0.25 }
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
    // The final scene at once; only its words fade in (opacity, nothing moves), once, as it comes into view. With
    // reduced motion not even that: the photograph, the words and the link are simply there (the brief of 6 Nov 2026)
    var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if ('IntersectionObserver' in window && !calm) {
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
    depth(state.p);
    canvas = null;
    syncWords('instant');
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

  // The scenery's caption and the contact shadow under the hero follow the scroll (decoration, scrubbed); the words
  // themselves have their own triggered entrance (below)
  var credit = function (p) {
    section.style.setProperty('--words', smooth(0.84, 0.97, p).toFixed(3));
  };

  // Where the stylesheet put the destination image on the stage ({ k: CSS px per image px, ox, oy }): the animated
  // trail is laid out from it, so its last prints land on the image's own. "Image px" are the pixels of the still the
  // prints were measured on (motion/sand/scene.js PHOTO, 1672 wide); the picture shown is the film's first frame, the
  // same picture at 1280 × 720 (it registers on the still at zero offset), so its scale is converted to the still's.
  // Measured from the layout (offsets), so the reveal's scale (below), a transform, never enters into it
  var PHOTO_W = 1672;
  var photoImg = stage.querySelector('[data-sand-photo] img');
  var boxOnStage = function (el) {
    var x = 0;
    var y = 0;
    var n = el;
    while (n && n !== stage) {
      x += n.offsetLeft;
      y += n.offsetTop;
      n = n.offsetParent;
    }
    if (n === stage) return { x: x, y: y, w: el.offsetWidth, h: el.offsetHeight };
    var a = el.getBoundingClientRect();
    var b = stage.getBoundingClientRect();
    return { x: a.left - b.left, y: a.top - b.top, w: a.width, h: a.height };
  };
  var placement = function () {
    if (!photoImg) return null;
    var nw = Number(photoImg.getAttribute('width')) || PHOTO_W;
    var nh = Number(photoImg.getAttribute('height')) || 941;
    var unit = nw / PHOTO_W; // picture px per still px
    var r = boxOnStage(photoImg);
    var cs = getComputedStyle(photoImg);
    if (cs.objectFit === 'cover') {
      var k = Math.max(r.w / nw, r.h / nh);
      var pos = cs.objectPosition.split(' ');
      var px = parseFloat(pos[0]) / 100 || 0;
      var py = parseFloat(pos[1]) / 100 || 0;
      return { k: k * unit, ox: r.x + (r.w - nw * k) * px, oy: r.y + (r.h - nh * k) * py };
    }
    return { k: (r.h / nh) * unit, ox: r.x, oy: r.y };
  };

  /* Phase 3, the coastal reveal (scrubbed: it follows the scroll): a restrained depth move on the scenery. Over the
     walk's last steps the view leans in a little towards where the footsteps lead (the last print and the woman's
     feet), and as the sand is swept away it settles back to the photograph's own framing, so the coast opens out:
     at most 4% (desktop), 2.5% (tablets), 1.5% (phones); nothing moves before p 0.44 or after 0.93. The sand (canvas)
     and the photograph (and its film) take the same scale about the same point on the stage, so the animated trail
     stays exactly on the photograph's prints throughout. A pure function of p, like the sand; no horizon to keep (the
     photograph looks straight down at the beach), and never a zoom past the frame. */
  var FOCUS = [995, 630]; // between the last print and her feet, in still px (scene.js › PHOTO)
  var amp = 0;
  var scaleNow = 1;
  var depthLayers = function () {
    return [canvas, photoImg, stage.querySelector('[data-sand-film]')].filter(Boolean);
  };
  var depthAmp = function () {
    var mq = function (q) {
      return window.matchMedia(q).matches;
    };
    return mq('(max-width: 47.99em)') ? 0.015 : mq('(max-width: 63.99em), (max-aspect-ratio: 1/1)') ? 0.025 : 0.04;
  };
  var origins = function (pl) {
    if (!pl) return;
    var fx = pl.ox + FOCUS[0] * pl.k;
    var fy = pl.oy + FOCUS[1] * pl.k;
    depthLayers().forEach(function (el) {
      if (!el.offsetParent) return; // not displayed (the canvas until the renderer is ready): set when it is
      var b = boxOnStage(el);
      el.style.transformOrigin = (fx - b.x).toFixed(1) + 'px ' + (fy - b.y).toFixed(1) + 'px';
    });
  };
  var depth = function (p) {
    var on = !!renderer && !section.classList.contains('is-lost');
    var k = on ? 1 + amp * smooth(0.44, 0.6, p) * (1 - smooth(0.605, 0.93, p)) : 1;
    if (Math.abs(k - scaleNow) < 0.00005 && (k !== 1 || scaleNow === 1)) return;
    scaleNow = k;
    var t = k === 1 ? '' : 'scale(' + k.toFixed(5) + ')';
    depthLayers().forEach(function (el) {
      el.style.transform = t;
    });
  };

  /* Phases 4 to 7, the words: a triggered entrance, not scrubbed (a scrubbed headline is hard to read mid-scroll). It
     plays once the sand has cleared (p 0.84; the sand is all but gone by 0.80) and runs back, twice as fast, if the
     visitor scrolls back above p 0.80. Eyebrow (0.5 s: a short rise and fade), headline (SplitText: its words rise
     through a mask per line, staggered, with a CustomEase settle, about 1.25 s in all; re-split when its width
     changes), the line (0.7 s), then the call to action fades in (a green pill since 8 Nov 2026), once the line is readable: about
     2.4 s in all on desktop, a little shorter on tablets and phones. Opacity and transforms only, so the words never
     leave the accessibility tree, and the link is never moved: it can be focused at any time, and focus anywhere in
     the words shows them at once. While they wait (hidden) they take no pointer events. Built once the renderer is
     ready; until then (and in every static case) the words are simply there. */
  var wordsEl = stage.querySelector('[data-sand-words]');
  var eyebrow = wordsEl.querySelector('.sand-journey__eyebrow');
  var title = wordsEl.querySelector('.sand-journey__title');
  var line = wordsEl.querySelector('.sand-journey__line');
  var cta = wordsEl.querySelector('.sand-journey__cta');
  var WORDS_ON = 0.84;
  var WORDS_OFF = 0.8;
  var text = null;
  var splitter = null;
  var shown = true; // the state the words are in, or heading for
  var riseEase = null;
  var rise = function () {
    if (riseEase) return riseEase;
    if (!window.CustomEase) return 'power3.out';
    gsap.registerPlugin(window.CustomEase);
    // A quick lift, then a long, soft settle with the slightest overshoot (about 1.5%: inside the line's mask)
    riseEase = window.CustomEase.create('peninsulaRise', 'M0,0 C0.14,0.56 0.24,0.92 0.46,1.012 0.62,1.03 0.8,1 1,1');
    return riseEase;
  };
  var pace = function () {
    var mq = function (q) {
      return window.matchMedia(q).matches;
    };
    return mq('(max-width: 47.99em)') ? 0.8 : mq('(max-width: 63.99em), (max-aspect-ratio: 1/1)') ? 0.88 : 1;
  };
  var makeText = function (words) {
    var f = pace();
    var tl = gsap.timeline({ paused: true });
    tl.fromTo(eyebrow, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.5 * f, ease: 'power2.out', clearProps: 'opacity,transform' }, 0);
    tl.addLabel('title', 0.22 * f);
    if (words && words.length) {
      tl.fromTo(title, { opacity: 0 }, { opacity: 1, duration: 0.01, ease: 'none', clearProps: 'opacity' }, 'title');
      tl.fromTo(words, { yPercent: 118 }, { yPercent: 0, duration: 1.0 * f, ease: rise(), stagger: 0.06 * f, clearProps: 'transform' }, 'title');
    } else {
      tl.fromTo(title, { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 1.0 * f, ease: rise(), clearProps: 'opacity,transform' }, 'title');
    }
    tl.addLabel('line', 0.95 * f);
    tl.fromTo(line, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.7 * f, ease: 'power2.out', clearProps: 'opacity,transform' }, 'line');
    tl.addLabel('cta', 1.55 * f);
    tl.fromTo(cta, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: 'none', clearProps: 'opacity' }, 'cta');
    return tl;
  };
  // (Re)build the entrance, keeping where the old one was and where it was going (a re-split mid-entrance carries on)
  var build = function (split) {
    var old = text;
    var at = old ? old.progress() : shown ? 1 : 0;
    var back = old ? old.reversed() : false;
    var moving = old ? old.isActive() : false;
    var speed = old ? Math.abs(old.timeScale()) : 1; // (GSAP keeps a reversed animation's timeScale negative)
    if (old) old.kill();
    text = makeText(split ? split.words : null);
    text.progress(at).timeScale(speed);
    if (moving) {
      if (back) text.reverse();
      else text.play();
    }
    api.words = text;
  };
  var ensureText = function () {
    if (text) return;
    if (window.SplitText) {
      gsap.registerPlugin(window.SplitText);
      splitter = window.SplitText.create(title, { type: 'lines,words', mask: 'lines', linesClass: 'sand-journey__title-line', wordsClass: 'sand-journey__title-word', autoSplit: true, onSplit: build });
      api.split = splitter;
    }
    if (!text) build(null);
  };
  var wanted = function () {
    if (!renderer || section.classList.contains('is-lost') || section.classList.contains('is-static')) return true;
    if (wordsEl.contains(doc.activeElement)) return true;
    if (state.p >= WORDS_ON) return true;
    if (state.p < WORDS_OFF) return false;
    return shown;
  };
  // how: 'instant' (no motion: off screen, a lost context), 'arrive' (the renderer arriving on screen: the words run
  // back in 0.7 s, never vanishing in one frame), or nothing (the scroll: play, or run back twice as fast)
  var syncWords = function (how) {
    if (!text) return;
    var want = wanted();
    if (want === shown && how !== 'instant') return;
    shown = want;
    section.classList.toggle('is-waiting', !want);
    if (how === 'instant') {
      text.pause().progress(want ? 1 : 0);
    } else if (want) {
      text.timeScale(1).play();
    } else {
      text.timeScale(how === 'arrive' ? Math.max(1, text.duration() / 0.7) : 2).reverse();
    }
  };
  wordsEl.addEventListener('focusin', function () {
    if (!text) return;
    shown = true;
    section.classList.remove('is-waiting');
    text.pause().progress(1);
  });
  wordsEl.addEventListener('focusout', function () {
    setTimeout(function () {
      syncWords();
    }, 0);
  });
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
    credit(state.p);
    if (renderer) {
      renderer.renderAt(state.p);
      watch();
    }
    depth(state.p);
    syncWords();
    filmSync(); // the film starts as the sweep nears and rests while the sand covers it (it is never scrubbed)
  };

  var measure = function () {
    var span = trigger ? trigger.end - trigger.start : 1;
    api.pinAt = span > 0 ? (START * window.innerHeight) / span : 0.25;
    amp = depthAmp();
    var pl = placement();
    origins(pl);
    if (renderer) renderer.resize(stage.clientWidth, stage.clientHeight, api.pinAt, pl, headerHeight());
    scaleNow = NaN; // reapply at the new size
    depth(state.p);
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
  credit(0);

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
          var pl = placement();
          renderer.resize(stage.clientWidth, stage.clientHeight, api.pinAt, pl, headerHeight());
          renderer.renderAt(state.p);
          // Arriving while the scene is on screen (a slow connection, a fast scroll): the sand, the scenery's scale and
          // the words go over to the state for this p in 0.7 s, rather than the image and its words vanishing in one frame
          var r = stage.getBoundingClientRect();
          var arriving = r.bottom > 0 && r.top < window.innerHeight && state.p > 0.01 && state.p < 0.97;
          if (arriving) {
            section.classList.add('is-arriving');
            setTimeout(function () {
              section.classList.remove('is-arriving');
            }, 800);
          }
          section.classList.add('is-ready');
          section.classList.remove('is-lost');
          origins(pl); // the canvas is displayed from here
          scaleNow = NaN;
          depth(state.p);
          ensureText();
          syncWords(arriving ? 'arrive' : 'instant');
          filmSync();
        };
        canvas.addEventListener('webglcontextlost', function (e) {
          e.preventDefault(); // ask for it back
          section.classList.add('is-lost');
          renderer = null;
          api.tier = 'static';
          depth(state.p);
          syncWords('instant'); // the static scene: the photograph and its words, at once
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
  // The coastal reveal's scale now and its amplitude on this screen (QA)
  api.reveal = function () {
    return { scale: scaleNow, amp: amp };
  };
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
