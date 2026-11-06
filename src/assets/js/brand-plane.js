/* Good Times in Cape Town — the brand aircraft's flight (home page entrance; hero.js nests it in its master timeline)
   The approved lockup's own green airliner (the "i" of "in") is masked out of the logo while a flying copy enters from
   the left over the sky of the hero, swings round to the location pin above Table Mountain, follows the logo's dotted
   route dot by dot, and lands in its place nose down. The landing hands over to the logo itself in one frame: the
   flying copy is the glyph's exact outline at the glyph's measured box, so the swap cannot be seen. Its last move is a
   small settle (under 2 px) and the detail drawn for flight (cockpit, nacelles, lights) fading away.

   GSAP is the only clock: MotionPathPlugin moves the aircraft along a path measured from the page (the dock anchor
   inside the logo link, data-aircraft-dock, and the route's fractions in data-route); the bank, the shadow and the
   trail are derived from the tween's own progress in onUpdate, so nothing ticks on its own. The layer is decorative
   (aria-hidden, no pointer events) and the logo link and navigation stay in the DOM throughout.

   API: GTBrandPlane.prepare({ header, brand }) -> null (no layer, no dock, logo not shown) or
   { timeline, landsAt, variant, rebuild(), finish() }. landsAt is the time (in the nested timeline) the aircraft
   touches down, where hero.js starts the navigation titles. */
(function () {
  'use strict';
  var gsap = window.gsap;
  var MPP = window.MotionPathPlugin;
  if (!gsap || !MPP) return;
  gsap.registerPlugin(MPP);

  var clamp = function (v, a, b) {
    return v < a ? a : v > b ? b : v;
  };

  /* Centripetal Catmull–Rom through the waypoints, as cubic Béziers (SVG path data), plus a dense polyline with
     cumulative length so the scale, the shadow and the trail can be keyed to the distance flown. */
  function smoothPath(pts) {
    var segs = [];
    var d = 'M' + pts[0][0].toFixed(2) + ',' + pts[0][1].toFixed(2);
    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[i - 1] || pts[i];
      var p1 = pts[i];
      var p2 = pts[i + 1];
      var p3 = pts[i + 2] || p2;
      var t01 = Math.pow(Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), 0.5) || 1;
      var t12 = Math.pow(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]), 0.5) || 1;
      var t23 = Math.pow(Math.hypot(p3[0] - p2[0], p3[1] - p2[1]), 0.5) || 1;
      var m1 = [0, 1].map(function (k) {
        return (p2[k] - p1[k] + t12 * ((p1[k] - p0[k]) / t01 - (p2[k] - p0[k]) / (t01 + t12))) * (p0 === p1 ? 0 : 1);
      });
      var m2 = [0, 1].map(function (k) {
        return (p2[k] - p1[k] + t12 * ((p3[k] - p2[k]) / t23 - (p3[k] - p1[k]) / (t12 + t23))) * (p3 === p2 ? 0 : 1);
      });
      var c1 = [p1[0] + m1[0] / 3, p1[1] + m1[1] / 3];
      var c2 = [p2[0] - m2[0] / 3, p2[1] - m2[1] / 3];
      // Ends without a neighbour get the chord direction
      if (p0 === p1) c1 = [p1[0] + (c2[0] - p1[0]) / 2, p1[1] + (c2[1] - p1[1]) / 2];
      if (p3 === p2) c2 = [p2[0] - (p2[0] - c1[0]) / 2, p2[1] - (p2[1] - c1[1]) / 2];
      segs.push([p1, c1, c2, p2]);
      d += 'C' + [c1, c2, p2].map(function (p) {
        return p[0].toFixed(2) + ',' + p[1].toFixed(2);
      }).join(' ');
    }
    // Dense samples for lengths
    var poly = [];
    var lens = [];
    var total = 0;
    var knots = [0];
    segs.forEach(function (s) {
      for (var j = poly.length ? 1 : 0; j <= 24; j++) {
        var t = j / 24;
        var u = 1 - t;
        var x = u * u * u * s[0][0] + 3 * u * u * t * s[1][0] + 3 * u * t * t * s[2][0] + t * t * t * s[3][0];
        var y = u * u * u * s[0][1] + 3 * u * u * t * s[1][1] + 3 * u * t * t * s[2][1] + t * t * t * s[3][1];
        if (poly.length) total += Math.hypot(x - poly[poly.length - 1][0], y - poly[poly.length - 1][1]);
        poly.push([x, y]);
        lens.push(total);
      }
      knots.push(total);
    });
    return { d: d, poly: poly, lens: lens, total: total, knots: knots };
  }

  /* The point at a fraction of the length flown */
  function at(path, f) {
    var L = clamp(f, 0, 1) * path.total;
    var lo = 0;
    var hi = path.lens.length - 1;
    while (hi - lo > 1) {
      var mid = (lo + hi) >> 1;
      if (path.lens[mid] < L) lo = mid;
      else hi = mid;
    }
    var span = path.lens[hi] - path.lens[lo] || 1;
    var k = (L - path.lens[lo]) / span;
    return [path.poly[lo][0] + (path.poly[hi][0] - path.poly[lo][0]) * k, path.poly[lo][1] + (path.poly[hi][1] - path.poly[lo][1]) * k];
  }

  /* The flight's pace. The owner asked for it 65% slower, then 10% slower again (6 Nov 2026): the aircraft now flies at
     31.5% of the first build's speed (0.35 × 0.9), so every time in the flight (the path, the touchdown and the
     hand-over) is stretched by 1 / 0.315. */
  var PACE = 1 / (0.35 * 0.9);
  var at_ = function (seconds) {
    return seconds * PACE;
  };

  function shown(el) {
    return !!el && el.getClientRects().length > 0 && getComputedStyle(el).display !== 'none';
  }

  function prepare(opts) {
    var header = opts && opts.header;
    var brand = opts && opts.brand;
    if (!header || !brand) return null;
    var layer = header.querySelector('[data-aircraft-flight]');
    var dock = brand.querySelector('[data-aircraft-dock]');
    if (!layer || !dock) return null;
    var logo = Array.prototype.filter.call(brand.querySelectorAll('.brand__logo'), shown)[0];
    if (!logo) return null;
    var route = JSON.parse(dock.getAttribute('data-route') || '[]');
    if (route.length < 3) return null;

    var plane = layer.querySelector('[data-aircraft-plane]');
    var bankEl = layer.querySelector('[data-aircraft-bank]');
    var shadow = layer.querySelector('[data-aircraft-shadow]');
    var trailSvg = layer.querySelector('[data-aircraft-trail]');
    var finalGlyph = layer.querySelector('.aircraft-flight__glyph--final');
    var detail = layer.querySelector('.aircraft-flight__detail');
    var prop = layer.querySelector('.aircraft-flight__prop');
    var preview = layer.hasAttribute('data-aircraft-preview');
    var variant = preview && /[?&]aircraft=prop\b/.test(location.search) ? 'prop' : 'jet';
    layer.setAttribute('data-variant', variant);

    var api = { variant: variant, timeline: null, landsAt: 0, handoverAt: 0 };

    /* Everything measured from the page as laid out (before the entrance moves the brand), relative to the layer */
    function measure() {
      layer.hidden = false;
      var L = layer.getBoundingClientRect();
      var D = dock.getBoundingClientRect();
      var R = logo.getBoundingClientRect();
      layer.hidden = true;
      var vw = window.innerWidth;
      var vh = window.innerHeight;
      var G = [D.left + D.width / 2 - L.left, D.top + D.height / 2 - L.top];
      var pts = route.map(function (f) {
        return [R.left + f[0] * R.width - L.left, R.top + f[1] * R.height - L.top];
      });
      pts[pts.length - 1] = G;
      var pin = pts[0];
      var portrait = vh > vw * 1.05;
      var headerBottom = header.getBoundingClientRect().bottom - L.top;
      // The approach: in from the left over the hero's sky (landscape) or along the header band (portrait), out to the
      // right of the logo, a climbing turn to the pin, then the logo's own dotted route down to the "i"
      var sky = portrait ? Math.max(headerBottom + vh * 0.05, vh * 0.16) : Math.max(headerBottom + vh * 0.08, vh * 0.22);
      var reach = portrait ? Math.min(vw * 0.86, pin[0] + vw * 0.42) : Math.min(vw * 0.62, pin[0] + Math.max(vw * 0.2, 220));
      // Never across the header's own controls (Book Now, the concierge, the menu button): the turn stays left of them
      var controls = Array.prototype.filter.call(header.querySelectorAll('.header-cta, .nav-toggle, .gt-concierge__toggle, [data-concierge-toggle]'), shown);
      var limit = controls.reduce(function (m, el) {
        return Math.min(m, el.getBoundingClientRect().left - L.left);
      }, vw);
      reach = Math.max(pin[0] + 36, Math.min(reach, limit - 30));
      // Never above the header's top edge (a preview bar or the browser's own chrome sits there)
      var ceiling = Math.max(4, pin[1] - 9);
      var lead = [
        [-Math.max(80, vw * 0.06), sky + vh * 0.05],
        [Math.max(pin[0] - vw * 0.1, vw * 0.1), sky],
        [reach, Math.max(pin[1] + vh * 0.12, headerBottom * 0.85)],
        [Math.min(reach + (portrait ? vw * 0.02 : vw * 0.03), limit - 12), pin[1] + vh * 0.045],
        [pin[0] + (reach - pin[0]) * 0.5, ceiling + 3],
      ];
      var all = lead.concat(pts);
      var path = smoothPath(all);
      // The spline can bulge past its waypoints: lower the turn until the whole curve stays under the ceiling
      for (var tries = 0; tries < 8; tries++) {
        var top = Infinity;
        for (var q = 0; q < path.poly.length; q++) top = Math.min(top, path.poly[q][1]);
        if (top >= ceiling) break;
        lead[4][1] += ceiling - top + 1;
        lead[3][1] += (ceiling - top + 1) * 0.5;
        all = lead.concat(pts);
        path = smoothPath(all);
      }
      var pinAt = path.knots[lead.length] / path.total;
      var leadAt = path.knots[2] / path.total;
      return { path: path, G: G, D: D, pinAt: pinAt, leadAt: leadAt, size: [D.width, D.height], portrait: portrait };
    }

    function build() {
      var g = measure();
      plane.style.width = g.size[0] + 'px';
      plane.style.height = g.size[1] + 'px';
      shadow.style.width = g.size[0] + 'px';
      shadow.style.height = g.size[1] + 'px';

      // The trail: dots like the logo's own, laid along the approach only (the route already has its dots)
      var NS = 'http://www.w3.org/2000/svg';
      while (trailSvg.firstChild) trailSvg.removeChild(trailSvg.firstChild);
      var gap = Math.max(9, g.size[0] * 0.9);
      var trail = [];
      for (var s = gap * 2; s < g.pinAt * g.path.total - gap; s += gap) {
        var p = at(g.path, s / g.path.total);
        var c = document.createElementNS(NS, 'circle');
        c.setAttribute('cx', p[0].toFixed(1));
        c.setAttribute('cy', p[1].toFixed(1));
        c.setAttribute('r', Math.max(1.6, g.size[0] * 0.12).toFixed(2));
        c.style.opacity = '0';
        trailSvg.appendChild(c);
        trail.push({ el: c, f: s / g.path.total });
      }

      var big = g.portrait ? 3.4 : 4.6;
      var state = { bank: 0, rot: null };
      var T = at_(1.2);
      var dockAt = at_(0.02) + T;
      var handover = dockAt + at_(0.25);
      // Which of the two is shown follows the playhead, so any seek (forwards, backwards, a replay) is exact: until
      // the handover the logo's airliner is held back (its place is empty from the first frame, as the brief asks)
      // and, once the flight has begun, the copy flies; from the handover on the logo is whole and the layer gone
      var sync = function () {
        var t = flight.time();
        brand.classList.toggle('is-awaiting-aircraft', t < handover);
        layer.hidden = !(t > 0 && t < handover);
        if (t < 0.03) {
          state.bank = 0;
          state.rot = null;
        }
      };
      var flight = gsap.timeline({ onUpdate: sync, onComplete: sync, onReverseComplete: sync });

      flight.set(plane, { xPercent: -50, yPercent: -50, x: g.path.poly[0][0], y: g.path.poly[0][1], rotation: 0, scale: big, transformOrigin: '50% 50%' }, 0);
      flight.set(shadow, { xPercent: -50, yPercent: -50, transformOrigin: '50% 50%', opacity: 0 }, 0);
      flight.set(bankEl, { scaleX: 1 }, 0);
      flight.set(detail, { opacity: 1 }, 0);
      // The flat landed glyph stays hidden in the air (it is drawn over the flight detail); the jet's own outline is the
      // detail's base, and the propeller crossfades into the landed glyph at touchdown
      flight.set(finalGlyph, { opacity: 0 }, 0);
      if (prop) flight.set(prop, { opacity: variant === 'prop' ? 1 : 0 }, 0);

      flight.to(
        plane,
        {
          duration: T,
          // In already flying (full speed off-screen), slowing steadily to touchdown: the route gets about a third of it
          ease: 'sine.out',
          motionPath: { path: g.path.d, autoRotate: -90 },
          onUpdate: function () {
            var f = this.ratio; // eased progress = fraction of the path's length flown (MotionPathPlugin spaces by length)
            // Size: large over the hero, shrinking to the route, a touch above final size at touchdown
            var sc = f < g.pinAt ? big + (1.7 - big) * Math.pow(f / g.pinAt, 0.85) : 1.7 + (1.04 - 1.7) * ((f - g.pinAt) / (1 - g.pinAt));
            // Bank from the turn rate (wings foreshortened in a top view), damped
            var rot = gsap.getProperty(plane, 'rotation');
            if (state.rot !== null) {
              var dr = rot - state.rot;
              while (dr > 180) dr -= 360;
              while (dr < -180) dr += 360;
              var target = clamp(dr * 2.4 * PACE, -15, 15); // per-frame turn × pace: the same bank at any speed
              state.bank += (target - state.bank) * 0.22;
            }
            state.rot = rot;
            var bank = state.bank * (1 - clamp((f - g.pinAt) / (1 - g.pinAt), 0, 1));
            gsap.set(plane, { scale: sc });
            gsap.set(bankEl, { scaleX: Math.cos((bank * Math.PI) / 180) });
            // The shadow: offset towards the lower right, as far as the aircraft is high, gone at touchdown
            var alt = Math.pow(1 - f, 1.4);
            var pos = [gsap.getProperty(plane, 'x'), gsap.getProperty(plane, 'y')];
            gsap.set(shadow, {
              x: pos[0] + alt * 30,
              y: pos[1] + alt * 44,
              rotation: rot,
              scale: sc * (1 - alt * 0.08),
              opacity: 0.26 * Math.min(1, f * 6) * (0.4 + 0.6 * alt),
            });
            shadow.style.filter = 'blur(' + (0.5 + alt * 3.5).toFixed(2) + 'px)';
            for (var i = 0; i < trail.length; i++) {
              var age = f - trail[i].f;
              trail[i].el.style.opacity = age < 0 ? '0' : (0.7 * clamp(1 - age / 0.16, 0, 1)).toFixed(3);
            }
          },
        },
        at_(0.02),
      );

      // Touchdown: square to the glyph, settle 1.5 px past and back, flight detail away, then hand over to the logo
      flight.to(plane, { rotation: 0, duration: at_(0.24), ease: 'power2.out' }, dockAt);
      flight.to(plane, { y: g.G[1] + 1.5, duration: at_(0.1), ease: 'sine.out' }, dockAt);
      flight.to(plane, { y: g.G[1], x: g.G[0], scale: 1, duration: at_(0.14), ease: 'sine.inOut' }, dockAt + at_(0.1));
      flight.to(bankEl, { scaleX: 1, duration: at_(0.18) }, dockAt);
      flight.to(shadow, { opacity: 0, duration: at_(0.12) }, dockAt);
      flight.to(detail, { opacity: 0, duration: at_(0.2), ease: 'power1.out' }, dockAt);
      if (variant === 'prop') {
        flight.to(prop, { opacity: 0, duration: at_(0.2) }, dockAt + at_(0.02));
        flight.to(finalGlyph, { opacity: 1, duration: at_(0.2) }, dockAt + at_(0.02));
      }
      // An empty tween holds the timeline open to the handover, where sync() gives the logo back
      flight.to({}, { duration: 0.001 }, handover - 0.001);
      api.timeline = flight;
      api.landsAt = dockAt;
      api.handoverAt = handover;
      return flight;
    }

    build();
    brand.classList.add('is-awaiting-aircraft');
    api.rebuild = build;
    // Settle immediately (resize, leaving the page): the logo whole, the layer hidden
    api.finish = function () {
      var tl = api.timeline;
      if (tl && tl.progress() < 1) {
        if (tl.parent) tl.parent.remove(tl); // the master would otherwise keep rendering it at its own time
        tl.progress(1);
      }
      brand.classList.remove('is-awaiting-aircraft');
      layer.hidden = true;
    };
    return api;
  }

  window.GTBrandPlane = { prepare: prepare, smoothPath: smoothPath };
})();
