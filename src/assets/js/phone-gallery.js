/* Good Times in Cape Town — HeroPhoneGallery (partials/phone-gallery.mjs, phone-gallery.css)
   The photo viewer in the hero's phone swipes through "Cape Town Memories" on its own, as if an unseen finger
   were flicking through it, and lifts the photograph showing out of the phone onto the hero when it is clicked.
   Two parts, per gallery:

   The swipe. One GSAP timeline, built once and repeated:
     hold → the swipe: one continuous curve, slow as the finger pushes off, fast as it flicks, then a long
     glide that carries the next photograph a hair past the edge → it settles back.
   Holds and swipes vary a little, so it never ticks like a metronome. Only the track moves (xPercent: a
   transform), clipped by the screen; the phone and everything around it never move. A copy of the first
   photograph closes the track: each time round, the timeline resets the track from that copy to the real
   first photograph, which looks identical, so the loop has no visible jump.
   It runs only with motion allowed (html.cine: no reduced-motion preference, no ?nomotion) and GSAP loaded;
   otherwise the first photograph simply stays and nothing else is fetched. It attaches the other
   photographs' sources, waits until every one has decoded (a swipe never reveals an empty frame) and starts
   after the hero's entrance has begun. It pauses while the phone is off screen, the tab is hidden or a
   photograph is lifted out, and on its play/pause key (WCAG 2.2.2); a pause asked for mid-swipe waits for
   the photograph to land. Reduced motion switched on mid-visit stops it where it is.

   The lift. A click or tap on the phone's screen (or Enter on its Enlarge button) lifts the photograph
   showing out of the phone and onto the hero, larger (never more than 1.35 times its own pixels), with its
   place, its tour and its credit, in a modal <dialog>: focus stays inside, the page behind is still and does
   not scroll. GSAP Flip morphs the photograph itself: the phone's copy is measured and hidden, and the
   dialog's copy flies from that very box to its own, tilting a little on the way, as the hero dims. A click
   anywhere (but the tour link), Escape or Close flies it back into the phone (Flip.fit onto the same box),
   and the swipe carries on from that photograph after a full hold. A click mid-swipe lets the arriving
   photograph finish its way in first. Without motion the photograph simply appears and goes; without GSAP
   it still opens and closes, without the flight.

   destroy() kills the timeline, the tweens, the dialog and every listener and observer (pagehide; a
   back-forward restore resumes instead). */
(function () {
  'use strict';
  var doc = document;
  var html = doc.documentElement;
  var gsap = window.gsap;
  var Flip = window.Flip;
  var roots = doc.querySelectorAll('[data-phone-gallery]');
  if (!roots.length) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var motion = function () {
    return !!gsap && html.classList.contains('cine') && !reduce.matches;
  };
  if (gsap && Flip) gsap.registerPlugin(Flip);
  var canLift = typeof HTMLDialogElement === 'function' && typeof doc.createElement('dialog').showModal === 'function';
  var toArray = function (list) {
    return Array.prototype.slice.call(list);
  };

  // Seconds on each photograph (slightly uneven), each swipe's length and how far past the edge it glides, cycled
  var HOLDS = [1.45, 1.1, 1.3, 1.05, 1.35, 1.2];
  var SWIPES = [0.46, 0.43, 0.49, 0.44, 0.47, 0.42];
  var SETTLES = [0.2, 0.18, 0.22, 0.19, 0.21, 0.18];
  var OVERSHOOT = [1.6, 1.1, 1.9, 1.3, 1.5, 1.2]; // % of a photograph's width
  // The finger: a cubic Bézier, as CSS defines it, solved for x (GSAP core has no CustomEase)
  var bezier = function (x1, y1, x2, y2) {
    var cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    var cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    var x = function (t) { return ((ax * t + bx) * t + cx) * t; };
    var dx = function (t) { return (3 * ax * t + 2 * bx) * t + cx; };
    var y = function (t) { return ((ay * t + by) * t + cy) * t; };
    return function (p) {
      if (p <= 0 || p >= 1) return p;
      var t = p;
      for (var i = 0; i < 6; i++) {
        var d = dx(t);
        if (Math.abs(d) < 1e-6) break;
        t -= (x(t) - p) / d;
      }
      if (t < 0 || t > 1) { // Newton wandered off: bisect
        var lo = 0, hi = 1;
        t = p;
        for (var j = 0; j < 20; j++) {
          if (x(t) < p) lo = t; else hi = t;
          t = (lo + hi) / 2;
        }
      }
      return y(t);
    };
  };
  var SWIPE = bezier(0.42, 0.02, 0.16, 1); // pushes off slowly, flicks, glides to a stop (no jump in speed anywhere)
  var SETTLE = bezier(0.3, 0, 0.3, 1); // from a standstill just past the edge, back onto the photograph

  // The lift: the hero dims to this; the photograph's flight out and back
  var DIM = 'rgba(4, 12, 20, 0.72)';
  var CLEAR = 'rgba(4, 12, 20, 0)';
  var OUT = 0.82;
  var BACK = 0.66;
  var CLOSE = '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';

  var instances = [];
  var create = function (root) {
    var track = root.querySelector('[data-phone-track]');
    var slides = toArray(root.querySelectorAll('[data-phone-slide]'));
    var count = root.querySelector('[data-phone-count]');
    var dots = toArray(root.querySelectorAll('[data-phone-dot]'));
    var toggle = root.querySelector('[data-phone-toggle]');
    var opener = root.querySelector('[data-phone-open]');
    var titleEl = root.querySelector('.phone-gallery__title');
    var hero = root.closest('.hero') || root.parentElement;
    var n = slides.length - 1; // the last slide is the copy of the first
    if (!track || n < 2) return null;
    var state = { ready: false, paused: false, offscreen: false, hidden: doc.hidden, swiping: false, zoomed: false, index: 0, step: 100, destroyed: false };
    var tl = null;
    var ctx = null;
    var io = null;
    var startCall = null;
    var holdStart = [0]; // the timeline's time at which each photograph has settled, for resuming after a lift

    var show = function (k) {
      state.index = k % n;
      if (count) count.textContent = String(state.index + 1);
      dots.forEach(function (d, i) { d.classList.toggle('is-active', i === state.index); });
      if (opener) opener.setAttribute('aria-label', 'Enlarge photo ' + (state.index + 1) + ' of ' + n + ': ' + (slides[state.index].getAttribute('data-place') || ''));
    };
    var wanted = function () { return state.ready && !state.paused && !state.offscreen && !state.hidden && !state.zoomed && !state.destroyed; };
    var sync = function () {
      if (!tl) return;
      if (wanted()) {
        if (tl.paused()) tl.resume();
      } else if (!state.swiping && !tl.paused()) tl.pause(); // mid-swipe: landed() pauses it
    };
    var landed = function () {
      state.swiping = false;
      if (!wanted() && tl && !tl.paused()) tl.pause();
    };
    var label = function () {
      if (!toggle) return;
      toggle.classList.toggle('is-paused', state.paused);
      toggle.setAttribute('aria-label', state.paused ? 'Play the photo gallery' : 'Pause the photo gallery');
    };

    // ---------- The swipe ----------
    // Every photograph's sources (and colour washes), attached now; resolved once each has loaded and decoded
    var load = function () {
      var imgs = [];
      slides.forEach(function (slide) {
        slide.querySelectorAll('source[data-srcset]').forEach(function (s) {
          s.srcset = s.getAttribute('data-srcset');
          s.removeAttribute('data-srcset');
        });
        slide.querySelectorAll('img[data-src]').forEach(function (img) {
          img.src = img.getAttribute('data-src');
          img.removeAttribute('data-src');
        });
        // The photograph and its colour wash: a swipe never reveals either one missing
        slide.querySelectorAll('.phone-gallery__img, .phone-gallery__wash').forEach(function (img) { imgs.push(img); });
      });
      return Promise.all(imgs.map(function (img) {
        return new Promise(function (resolve) {
          var done = function () {
            if (!img.naturalWidth || img.naturalWidth < 2) return resolve(false);
            if (typeof img.decode !== 'function') return resolve(true);
            img.decode().then(function () { resolve(true); }, function () { resolve(img.naturalWidth > 1); });
          };
          if (img.complete && img.naturalWidth > 1) return done();
          img.addEventListener('load', done, { once: true });
          img.addEventListener('error', function () { resolve(false); }, { once: true });
        });
      })).then(function (ok) { return ok.every(Boolean); });
    };

    var build = function () {
      // One page and the dark gap after it, in % of the track's width (the stylesheet sets the gap)
      var step = (state.step = (100 * (slides[1].offsetLeft - slides[0].offsetLeft)) / track.offsetWidth || 100);
      var t = gsap.timeline({ paused: true, repeat: -1, delay: 0.9 });
      t.set(track, { xPercent: 0 }, 0);
      t.call(show, [0], 0);
      var at = 0;
      for (var i = 0; i < n; i++) {
        var to = -step * (i + 1);
        var swipe = SWIPES[i % SWIPES.length];
        var settle = SETTLES[i % SETTLES.length];
        at += HOLDS[i % HOLDS.length];
        t.call(function () { state.swiping = true; }, null, at);
        t.to(track, { xPercent: to - OVERSHOOT[i % OVERSHOOT.length], duration: swipe, ease: SWIPE }, at);
        t.call(show, [i + 1], at + swipe * 0.42); // the counter and dots move on as the new photograph takes over
        t.to(track, { xPercent: to, duration: settle, ease: SETTLE }, at + swipe);
        t.call(landed, null, at + swipe + settle);
        at += swipe + settle;
        holdStart[i + 1] = at;
      }
      holdStart[n] = 0; // the copy of the first is the first
      return t;
    };

    var start = function () {
      if (state.destroyed || !motion()) return;
      ctx = gsap.context(function () { tl = build(); }, root);
      state.ready = true;
      if (toggle) toggle.hidden = false;
      label();
      sync();
    };

    // ---------- The lift ----------
    var zoom = null; // the dialog, made on first use
    var lifted = -1; // the slide whose photograph is out
    var busy = false;
    var snap = null; // the arriving photograph's last quarter-second (killTweensOf(track) would kill the swipe too)
    var clear = function (els, props) {
      if (gsap) gsap.set(els, { clearProps: props });
    };
    var make = function () {
      var d = doc.createElement('dialog');
      d.className = 'pg-zoom';
      d.setAttribute('aria-labelledby', root.id + '-zoom-place');
      d.innerHTML =
        '<figure class="pg-zoom__figure">' +
        '<div class="pg-zoom__frame"></div>' +
        '<figcaption class="pg-zoom__caption">' +
        '<span class="pg-zoom__place" id="' + root.id + '-zoom-place"></span>' +
        '<a class="pg-zoom__tour" href="tours/"></a>' +
        '<span class="pg-zoom__meta"></span>' +
        '</figcaption>' +
        '<button class="pg-zoom__close" type="button" aria-label="Close the photo">' + CLOSE + '</button>' +
        '</figure>';
      doc.body.appendChild(d);
      var z = {
        dialog: d,
        figure: d.querySelector('.pg-zoom__figure'),
        frame: d.querySelector('.pg-zoom__frame'),
        caption: d.querySelector('.pg-zoom__caption'),
        place: d.querySelector('.pg-zoom__place'),
        tour: d.querySelector('.pg-zoom__tour'),
        meta: d.querySelector('.pg-zoom__meta'),
        close: d.querySelector('.pg-zoom__close'),
      };
      // Escape: the animated way back (the native close would skip the photograph's return)
      d.addEventListener('cancel', onCancel);
      // A click anywhere puts the photograph back, except on the tour link, which goes to the tour
      d.addEventListener('click', onDialogClick);
      d.addEventListener('close', settle);
      return z;
    };
    var phoneImgOf = function (k) {
      return slides[k].querySelector('.phone-gallery__img');
    };
    // The phone's photograph, copied into the dialog: the same file at first (cached, so the flight starts at
    // once), its larger renditions once it has landed
    var fill = function (k) {
      var slide = slides[k];
      var picture = slide.querySelector('picture').cloneNode(true);
      picture.className = 'pg-zoom__picture';
      picture.querySelectorAll('source').forEach(function (s) {
        if (s.hasAttribute('data-srcset')) {
          s.srcset = s.getAttribute('data-srcset');
          s.removeAttribute('data-srcset');
        }
      });
      var img = picture.querySelector('img');
      if (img.hasAttribute('data-src')) {
        img.src = img.getAttribute('data-src');
        img.removeAttribute('data-src');
      }
      img.className = 'pg-zoom__img';
      img.alt = phoneImgOf(k).alt;
      img.setAttribute('data-flip-id', 'pg-lift');
      zoom.frame.replaceChildren(picture);
      zoom.place.textContent = slide.getAttribute('data-place') || '';
      zoom.tour.textContent = slide.getAttribute('data-tour') || '';
      zoom.tour.setAttribute('href', slide.getAttribute('data-tour-href') || 'tours/');
      zoom.tour.hidden = !slide.getAttribute('data-tour');
      var credit = slide.getAttribute('data-credit');
      zoom.meta.textContent = (titleEl ? titleEl.textContent + ' · ' : '') + (k + 1) + ' / ' + n + (credit ? ' · ' + credit : '');
      return img;
    };
    // Where it lands: centred on the part of the hero in view, below the header, as large as the room allows
    var place = function (img) {
      var vw = html.clientWidth;
      var vh = window.innerHeight;
      var h = hero.getBoundingClientRect();
      var header = doc.querySelector('[data-header]');
      var top = Math.max(0, h.top, header ? header.getBoundingClientRect().bottom : 0);
      var bottom = Math.min(vh, h.bottom);
      var left = Math.max(0, h.left);
      var right = Math.min(vw, h.right);
      if (bottom - top < 260) {
        top = 0;
        bottom = vh;
      }
      var areaW = right - left;
      var areaH = bottom - top;
      var margin = Math.min(56, Math.max(16, areaW * 0.04));
      var natW = Number(img.getAttribute('width')) || 4;
      var natH = Number(img.getAttribute('height')) || 3;
      var ar = natW / natH;
      var capH = zoom.caption.offsetHeight + 14;
      var w = Math.min(areaW - 2 * margin, natW * 1.35, (areaH - 2 * margin - capH) * ar);
      w = Math.max(w, Math.min(240, areaW - 2 * margin));
      var figH = w / ar + capH;
      zoom.figure.style.width = Math.round(w) + 'px';
      zoom.figure.style.left = Math.round(left + (areaW - w) / 2) + 'px';
      zoom.figure.style.top = Math.round(top + Math.max(margin, (areaH - figH) / 2)) + 'px';
      return w;
    };
    // Once it has landed, the browser fetches the rendition its new size calls for
    var upgrade = function (img, w) {
      var size = Math.round(w) + 'px';
      img.parentElement.querySelectorAll('source').forEach(function (s) { s.setAttribute('sizes', size); });
      img.setAttribute('sizes', size);
    };
    var open = function () {
      if (!canLift || busy || state.zoomed || state.destroyed) return;
      if (!zoom) zoom = make();
      busy = true;
      state.zoomed = true;
      if (tl && !tl.paused()) tl.pause(); // at once, even mid-swipe
      state.swiping = false;
      // The photograph showing: the slide nearest the track's position (0 … n, n being the copy of the first)
      var nearest = tl ? Math.max(0, Math.min(n, Math.round(-(gsap.getProperty(track, 'xPercent') || 0) / state.step))) : 0;
      var k = nearest === n ? 0 : nearest;
      var lift = function () {
        snap = null;
        if (state.destroyed) return;
        if (nearest === n && gsap) gsap.set(track, { xPercent: 0 }); // the copy and the first look the same
        lifted = k;
        show(k);
        var phoneImg = phoneImgOf(k);
        var flying = motion() && !!Flip && phoneImg.getClientRects().length > 0;
        phoneImg.setAttribute('data-flip-id', 'pg-lift');
        var from = flying ? Flip.getState(phoneImg, { props: 'borderRadius' }) : null;
        var img = fill(k);
        zoom.dialog.showModal();
        html.classList.add('pg-locked');
        var w = place(img);
        phoneImg.style.visibility = 'hidden'; // the photograph has left the phone
        zoom.close.focus({ preventScroll: true });
        var done = function () {
          busy = false;
          upgrade(img, w);
        };
        if (!motion()) return done();
        gsap.fromTo(zoom.dialog, { backgroundColor: CLEAR }, { backgroundColor: DIM, duration: flying ? 0.5 : 0.3, ease: 'power2.out' });
        // Opacity only for the close button: it already has focus and must keep it
        gsap.fromTo([zoom.caption, zoom.close], { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4, delay: flying ? OUT * 0.72 : 0.12, stagger: 0.06, ease: 'power2.out', clearProps: 'opacity,transform' });
        if (!flying) {
          gsap.fromTo(img, { opacity: 0, scale: 0.94 }, { opacity: 1, scale: 1, duration: 0.36, ease: 'power2.out', clearProps: 'opacity,transform', onComplete: done });
          return;
        }
        Flip.from(from, { targets: img, duration: OUT, ease: 'expo.inOut', scale: false, props: 'borderRadius', onComplete: done });
        // A tilt on the way out, as a print tossed onto a table settles flat
        gsap.to(img, { keyframes: { rotation: [-3.2, 0], easeEach: 'sine.inOut' }, duration: OUT, ease: 'none' });
      };
      // Mid-swipe, the arriving photograph finishes its way in first (a quarter of a second)
      var x = tl ? gsap.getProperty(track, 'xPercent') || 0 : 0;
      if (tl && Math.abs(x + state.step * nearest) > 0.3) snap = gsap.to(track, { xPercent: -state.step * nearest, duration: 0.24, ease: 'power2.out', onComplete: lift });
      else lift();
    };
    var closing = false;
    var close = function () {
      if (!zoom || !zoom.dialog.open || closing) return; // a second click while it flies back changes nothing
      closing = true;
      var img = zoom.frame.querySelector('img');
      var phoneImg = phoneImgOf(lifted);
      // Escape or a click always wins: an opening still in flight is stopped where it is, then the photograph returns
      if (gsap) gsap.killTweensOf([img, zoom.dialog, zoom.caption, zoom.close]);
      busy = true;
      var finish = function () {
        zoom.dialog.close(); // → settle()
      };
      if (!motion()) return finish();
      var flying = !!Flip && phoneImg.getClientRects().length > 0;
      gsap.to([zoom.caption, zoom.close], { opacity: 0, y: 6, duration: 0.18, ease: 'power1.in' });
      gsap.to(zoom.dialog, { backgroundColor: CLEAR, duration: flying ? 0.5 : 0.26, delay: flying ? 0.12 : 0, ease: 'power1.inOut' });
      if (!flying) {
        gsap.to(img, { opacity: 0, scale: 0.94, duration: 0.26, ease: 'power1.in', onComplete: finish });
        return;
      }
      Flip.fit(img, phoneImg, { duration: BACK, ease: 'power3.inOut', scale: false, props: 'borderRadius', onComplete: finish });
      gsap.to(img, { keyframes: { rotation: [2.4, 0], easeEach: 'sine.inOut' }, duration: BACK, ease: 'none' });
    };
    // The dialog has closed: the photograph is back in the phone, and the swipe carries on from it after a full hold
    function settle() {
      var k = lifted;
      if (k > -1) {
        var phoneImg = phoneImgOf(k);
        phoneImg.style.visibility = '';
        phoneImg.removeAttribute('data-flip-id');
      }
      clear([zoom.caption, zoom.close, zoom.dialog], 'opacity,transform,backgroundColor');
      zoom.frame.replaceChildren();
      html.classList.remove('pg-locked');
      busy = false;
      closing = false;
      lifted = -1;
      state.zoomed = false;
      if (tl && k > -1) tl.seek(holdStart[k] || 0, true);
      sync();
      if (opener && !state.destroyed) opener.focus({ preventScroll: true });
    }
    function onCancel(e) {
      e.preventDefault();
      close();
    }
    function onDialogClick(e) {
      if (e.target.closest && e.target.closest('a[href]')) return;
      close();
    }
    var onResize = function () {
      if (zoom && zoom.dialog.open && !busy) {
        var img = zoom.frame.querySelector('img');
        if (img) upgrade(img, place(img));
      }
    };

    // ---------- Wiring ----------
    var onToggle = function () {
      state.paused = !state.paused;
      label();
      sync();
    };
    var onVisibility = function () {
      state.hidden = doc.hidden;
      sync();
    };
    var onReduce = function () {
      if (reduce.matches) stop(true);
    };
    var onPageHide = function (e) {
      if (e.persisted) {
        state.hidden = true;
        sync();
      } else destroy();
    };
    var onPageShow = function (e) {
      if (!e.persisted) return;
      state.hidden = doc.hidden;
      sync();
    };

    // The swipe stops (reduced motion switched on, or the page going away); the lift keeps working
    function stop(keep) {
      var at = state.index;
      state.ready = false;
      if (startCall) startCall.kill();
      startCall = null;
      if (io) io.disconnect();
      io = null;
      if (toggle) {
        toggle.removeEventListener('click', onToggle);
        toggle.hidden = true;
      }
      if (tl) tl.kill();
      if (ctx) ctx.revert(); // every tween and set the swipe made, the track's transform included
      tl = null;
      ctx = null;
      // Stay on the photograph that was showing, without moving
      if (keep && at && gsap) {
        gsap.set(track, { xPercent: -state.step * at });
        show(at);
      } else show(0);
    }
    function destroy() {
      if (state.destroyed) return;
      state.destroyed = true;
      if (snap) snap.kill();
      snap = null;
      stop(false);
      doc.removeEventListener('visibilitychange', onVisibility);
      if (reduce.removeEventListener) reduce.removeEventListener('change', onReduce);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('pageshow', onPageShow);
      window.removeEventListener('resize', onResize);
      if (opener) {
        opener.removeEventListener('click', open);
        opener.hidden = true;
      }
      if (zoom) {
        if (gsap) gsap.killTweensOf([zoom.frame.querySelector('img'), zoom.dialog, zoom.caption, zoom.close].filter(Boolean));
        zoom.dialog.removeEventListener('cancel', onCancel);
        zoom.dialog.removeEventListener('click', onDialogClick);
        zoom.dialog.removeEventListener('close', settle);
        if (zoom.dialog.open) zoom.dialog.close();
        zoom.dialog.remove();
        zoom = null;
        html.classList.remove('pg-locked');
        slides.forEach(function (s) {
          var img = s.querySelector('.phone-gallery__img');
          img.style.visibility = '';
          img.removeAttribute('data-flip-id');
        });
      }
    }

    if (toggle) toggle.addEventListener('click', onToggle);
    doc.addEventListener('visibilitychange', onVisibility);
    if (reduce.addEventListener) reduce.addEventListener('change', onReduce);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('pageshow', onPageShow);
    if (canLift && opener) {
      opener.hidden = false;
      opener.addEventListener('click', open);
      window.addEventListener('resize', onResize);
    }

    if (motion()) {
      if ('IntersectionObserver' in window) {
        io = new IntersectionObserver(function (entries) {
          state.offscreen = !entries.some(function (en) { return en.isIntersecting; });
          sync();
        }, { threshold: 0 });
        io.observe(root);
      }
      load().then(function (ok) {
        if (!ok || state.destroyed || !motion()) return; // a photograph failed: the first one stays, still
        startCall = gsap.delayedCall(0, start);
      });
    }

    return {
      root: root,
      state: state,
      timeline: function () { return tl; },
      pause: function () { if (!state.paused) onToggle(); },
      play: function () { if (state.paused) onToggle(); },
      lift: open,
      drop: close,
      lifted: function () { return !!(zoom && zoom.dialog.open); },
      destroy: destroy,
    };
  };

  Array.prototype.forEach.call(roots, function (root) {
    var g = create(root);
    if (g) instances.push(g);
  });
  window.__phoneGalleries = instances; // read by the browser tests
})();
