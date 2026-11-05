/* Good Times in Cape Town — The Cape, A Living Story, home page only
   The chapters beneath the approved hero. GSAP is the one motion engine: ScrollTrigger
   drives every scroll-linked moment (scrubbed, so scrolling back reverses it), GSAP's ticker
   keeps the opening chapter's water moving. The destination carousel, the exhibition and its
   lightbox are the media system's (media.js, D66). Nothing here reads or writes the hero, the
   header or their descendants.

   Without motion (reduced motion, ?nomotion: no html.cine) or without GSAP, the page is
   already complete in its markup: the photograph stands in its frame, the routes are drawn,
   the words are in place.

   Motifs (D65 §12): the water that reveals the Cape (01), Atlantic Drift (the scenes, from 48em), Air Reveal (words),
   Ink Draw (the journey line, the closing thread). Story photographs (D66, design.md §06) each have their own
   entrance: the collage of moments rises as one stagger, the guide's portrait opens from a mask, the two smaller
   moments rise and drift, the services' photographs stay still. */
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

  /* ---------- 01 · Water reveals the Cape: a fine stream leaves the hero's lower edge, trickles down beside the
     words, reaches the photograph, branches and spreads across it, uncovering the coast wherever it has run.
     The scroll sets how far the water has travelled (scrubbed, so scrolling back draws it back); the water
     itself keeps moving while it is on screen: swells run down the streams, glints ride on them, the lip
     under the hero ripples and the fronts shiver. One SVG layer, a few paths redrawn per frame; the
     section clips it, so nothing ever paints on the hero. ---------- */
  (function water() {
    var section = root.querySelector('[data-sun]');
    if (!section) return;
    var inner = section.querySelector('.lc-sun__inner');
    var svg = section.querySelector('[data-sun-water]');
    var frame = section.querySelector('[data-sun-frame]');
    var img = frame.querySelector('img');
    var NS = 'http://www.w3.org/2000/svg';
    var add = function (tag, attrs, parent) {
      var el = doc.createElementNS(NS, tag);
      Object.keys(attrs).forEach(function (k) {
        el.setAttribute(k, attrs[k]);
      });
      (parent || svg).appendChild(el);
      return el;
    };
    var defs = add('defs', {});
    var clipRect = add('rect', {}, add('clipPath', { id: 'lc-water-frame' }, defs));
    // The wet area: the spreading fronts, and the wet trail along each stream, which widens with time (four
    // strokes, the narrowest nearest the moving front)
    var mask = add('mask', { id: 'lc-water-reveal', maskUnits: 'userSpaceOnUse' }, defs);
    var maskBase = add('rect', { fill: '#fff' }, mask);
    var holes = add('path', { fill: '#000' }, mask);
    var TRAIL = [0, 45, 120, 240];
    var trails = TRAIL.map(function () {
      return add('path', { fill: 'none', stroke: '#000', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, mask);
    });
    var framed = add('g', { 'clip-path': 'url(#lc-water-frame)' });
    // Paper over the dry parts of the photograph, with the damp edge of the water drawn on it (only the part
    // outside the wet area shows, so overlapping fronts never draw lines across the photograph)
    var dry = add('g', { mask: 'url(#lc-water-reveal)' }, framed);
    var veil = add('rect', { class: 'lc-water__veil' }, dry);
    var damp = TRAIL.map(function () {
      return add('path', { class: 'lc-water__damp' }, dry);
    });
    var edges = TRAIL.map(function () {
      return add('path', { class: 'lc-water__edge' }, dry);
    });
    var glow = add('path', { class: 'lc-water__glow' }, dry);
    var front = add('path', { class: 'lc-water__front' }, dry);
    // In the wet channels: a thin film of water over the newly uncovered photograph (it follows one of the
    // trail strokes exactly, so it never reaches the paper)
    var film = add('path', { class: 'lc-water__film' }, framed);
    // The running water
    var flow = add('g', {});
    var shade = add('path', { class: 'lc-water__shade', transform: 'translate(1.4 2.2)' }, flow);
    var body = add('path', { class: 'lc-water__body' }, flow);
    var sheen = add('path', { class: 'lc-water__light lc-water__light--soft' }, flow);
    var light = add('path', { class: 'lc-water__light' }, flow);
    var sparkle = add('path', { class: 'lc-water__sparkle' }, flow);

    var clamp = function (v) {
      return v < 0 ? 0 : v > 1 ? 1 : v;
    };
    var smooth = function (v) {
      v = clamp(v);
      return v * v * (3 - 2 * v);
    };
    var easeOut = function (v) {
      v = clamp(v);
      return 1 - (1 - v) * (1 - v);
    };
    var f = function (v) {
      return Math.round(v * 10) / 10;
    };
    var pt = function (x, y) {
      return f(x) + ' ' + f(y);
    };
    var dot = function (x, y, r) {
      return 'M' + pt(x - r, y) + 'a' + f(r) + ' ' + f(r) + ' 0 1 0 ' + f(2 * r) + ' 0a' + f(r) + ' ' + f(r) + ' 0 1 0 ' + f(-2 * r) + ' 0';
    };
    // A closed curve through the points (Catmull-Rom as cubic Béziers)
    var curve = function (P) {
      var n = P.length / 2;
      var d = 'M' + pt(P[0], P[1]);
      for (var i = 0; i < n; i++) {
        var a = ((i - 1 + n) % n) * 2;
        var b = i * 2;
        var c = ((i + 1) % n) * 2;
        var e = ((i + 2) % n) * 2;
        d += 'C' + pt(P[b] + (P[c] - P[a]) / 6, P[b + 1] + (P[c + 1] - P[a + 1]) / 6) + ' ' + pt(P[c] - (P[e] - P[b]) / 6, P[c + 1] - (P[e + 1] - P[b + 1]) / 6) + ' ' + pt(P[c], P[c + 1]);
      }
      return d + 'Z';
    };

    /* ----- The course: measured from the layout on every refresh (resizes, orientation, late images and fonts) ----- */
    var geo = null;
    var measure = function () {
      var wide = window.matchMedia('(min-width: 48em)').matches;
      var seed = wide ? 1771 : 2399;
      // A fixed seed: the water takes the same course on every visit
      var rnd = function () {
        seed = (seed * 16807) % 2147483647;
        return (seed - 1) / 2147483646;
      };
      var ib = inner.getBoundingClientRect();
      var fb = frame.getBoundingClientRect();
      var vh = window.innerHeight;
      var g = { wide: wide, w: ib.width, h: ib.height, fx: fb.left - ib.left, fy: fb.top - ib.top, fw: fb.width, fh: fb.height };
      var top = ib.top + window.scrollY;
      var frameTop = top + g.fy;
      // Scroll positions: the lip forms as the section comes up; the stream runs down at about the pace of the page,
      // its front held in the lower half of the screen; it reaches the photograph while the frame's top edge is in
      // view, branches and spreads as the frame rises, and the coast is whole when the frame is centred
      g.S0 = top - vh * 0.95;
      g.sA = top - vh * 0.6;
      g.sB = Math.max(g.sA + 40, frameTop - vh * 0.72);
      g.S1 = Math.max(g.sB + 160, frameTop + g.fh / 2 - vh * 0.5);
      g.U = g.S1 - g.sB;
      g.diag = Math.hypot(g.fw, g.fh);
      var inside = function (p) {
        return p.x > g.fx + 10 && p.x < g.fx + g.fw - 10 && p.y < g.fy + g.fh - 10;
      };
      // A course that wanders as an uneven surface would make it; with `fall`, gravity turns it downhill over that distance
      var course = function (x, y, dx, dy, len, wander, keep, fall) {
        var l = Math.hypot(dx, dy);
        dx /= l;
        dy /= l;
        var p1 = rnd() * 6.28;
        var p2 = rnd() * 6.28;
        var p3 = rnd() * 6.28;
        var pts = [];
        for (var s = 0; s <= len; s += 5) {
          var k = fall ? Math.exp(-s / fall) : 1;
          var ax = dx * k;
          var ay = dy * k + 1 - k;
          var al = Math.hypot(ax, ay);
          var off = wander * (Math.sin(s / 83 + p1) - Math.sin(p1) + 0.45 * (Math.sin(s / 31 + p2) - Math.sin(p2)) + 0.16 * (Math.sin(s / 12 + p3) - Math.sin(p3)));
          var p = { x: x - (ay / al) * off, y: y + (ax / al) * off };
          if (keep && !keep(p)) break;
          pts.push(p);
          x += (ax / al) * 5;
          y += (ay / al) * 5;
        }
        return pts;
      };
      var stream = function (pts, w, extra) {
        var s = 0;
        pts.forEach(function (p, i) {
          var a = pts[Math.max(0, i - 1)];
          var b = pts[Math.min(pts.length - 1, i + 1)];
          var l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
          p.nx = -(b.y - a.y) / l;
          p.ny = (b.x - a.x) / l;
          p.dx = (b.x - a.x) / l;
          p.dy = (b.y - a.y) / l;
          if (i) s += Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y);
          p.s = s;
        });
        var st = { pts: pts, len: s, w: w, v: wide ? 62 : 52, gap: 230, o: [0, 74 + rnd() * 20, 150 + rnd() * 30], p1: rnd() * 6.28, p2: rnd() * 6.28 };
        // The lit side faces up and to the left
        var mid = pts[Math.floor(pts.length / 2)] || pts[0];
        st.lit = mid.nx - mid.ny * 0.3 < 0 ? 1 : -1;
        Object.keys(extra || {}).forEach(function (k) {
          st[k] = extra[k];
        });
        return st;
      };
      var at = function (st, s) {
        for (var i = 0; i < st.pts.length; i++) if (st.pts[i].s >= s) return st.pts[i];
        return st.pts[st.pts.length - 1];
      };

      // The main stream: from the hero's edge, down the lane beside the words, into the photograph
      var x0 = wide ? g.fx + g.fw * 0.71 : g.w * 0.915;
      var w0 = wide ? 3.4 : 2.8;
      var above = course(x0, 0, wide ? 0.03 : 0, 1, g.fy, wide ? 7 : 3);
      var last = above[above.length - 1];
      var into = course(last.x, last.y, wide ? -0.2 : -0.45, 1, g.fh * (wide ? 0.62 : 0.64), wide ? 10 : 5, inside);
      var main = stream(above.concat(into.slice(1)), w0, { main: true });
      var reachFrame = at(main, 1e9).s;
      for (var i = 0; i < main.pts.length; i++) {
        if (main.pts[i].y >= g.fy) {
          reachFrame = main.pts[i].s;
          break;
        }
      }
      main.head = function (vs) {
        if (vs <= g.S0) return 0;
        if (vs < g.sA) return 14 * smooth((vs - g.S0) / (g.sA - g.S0));
        if (vs < g.sB) return 14 + (reachFrame - 14) * Math.pow((vs - g.sA) / (g.sB - g.sA), 1.12);
        return reachFrame + (main.len - reachFrame) * easeOut((vs - g.sB) / (0.44 * g.U));
      };
      g.streams = [main];
      var branch = function (st, s, v0, dur, dx, dy, len, w, wander, keep, fall) {
        var o = at(st, s);
        var b = stream(course(o.x, o.y, dx, dy, len, wander, keep, fall), w);
        if (b.pts.length < 4) return;
        b.head = function (vs) {
          return vs <= v0 ? 0 : b.len * easeOut((vs - v0) / dur);
        };
        g.streams.push(b);
      };
      var passOf = function (st, s) {
        var lo = g.S0;
        var hi = g.S1 + 1;
        for (var k = 0; k < 26; k++) {
          var m = (lo + hi) / 2;
          if (st.head(m) >= s + 0.5) hi = m;
          else lo = m;
        }
        return hi;
      };
      // Delicate side trickles on the way down (they run out before the photograph)
      (wide ? [[0.34, 0.9, 52], [0.68, -0.8, 66]] : [[0.55, -0.8, 38]]).forEach(function (t) {
        var s = reachFrame * t[0];
        branch(main, s, passOf(main, s) + 8, 150, t[1], 1, t[2], w0 * 0.5, 2, function (p) {
          return p.y < g.fy - 24;
        }, 16);
      });
      // Branches across the photograph, each leaving the main stream where its front is at that moment
      (wide
        ? [[0.08, -1.25, 1, 0.56, 0.34], [0.17, 0.6, 1, 0.4, 0.3], [0.25, -2.6, 1, 0.66, 0.36], [0.34, -0.7, 1, 0.42, 0.3]]
        : [[0.1, -1.1, 1, 0.82, 0.36], [0.24, -0.15, 1, 0.46, 0.3]]
      ).forEach(function (t) {
        var v0 = g.sB + t[0] * g.U;
        branch(main, main.head(v0) - 2, v0, t[4] * g.U, t[1], t[2], (wide ? g.fw : g.fh) * t[3], w0 * 0.8, wide ? 9 : 5, inside, wide ? 520 : 300);
      });

      // Where the water wets the photograph: a trail along every stream inside the frame (drawn as strokes), then
      // fronts that spread outward from points along the streams (further downhill), until the coast is whole
      g.trail = (wide ? [7, 14, 22, 32] : [5, 10, 15, 22]);
      g.blobs = [];
      g.F = g.diag / 0.66;
      g.streams.forEach(function (st) {
        st.wetFrom = 1e9;
        for (var j = 0; j < st.pts.length; j++) {
          if (st.pts[j].y >= g.fy + g.trail[3] / 2 + 3) {
            st.wetFrom = st.pts[j].s;
            break;
          }
        }
        var gap = wide ? 40 : 34;
        var next = st.wetFrom + gap * 0.4;
        st.pts.forEach(function (p) {
          if (p.s < next) return;
          next = p.s + gap * (0.7 + rnd() * 0.6);
          var big = rnd();
          var pass = passOf(st, p.s);
          // Each front starts to spread a little after the water has passed it, so the widening follows the flow
          var u0 = (pass - g.sB) / g.U + 0.14 + rnd() * 0.14;
          g.blobs.push({
            x: p.x,
            y: p.y,
            along: Math.atan2(p.dy, p.dx),
            pass: pass,
            R: (0.05 + 0.25 * Math.pow(big, 1.5)) * Math.max(g.fw, g.fh),
            u0: u0,
            u1: Math.min(0.9, u0 + 0.45 + rnd() * 0.15),
            ph: [0, 0, 0, 0, 0].map(function () {
              return rnd() * 6.28;
            }),
          });
        });
      });
      // Fine droplets left beside the streams as they pass
      g.beads = [];
      g.streams.forEach(function (st) {
        var n = Math.round(st.len / (wide ? 52 : 70));
        for (var k = 0; k < n; k++) {
          var s = 10 + rnd() * (st.len - 14);
          var p = at(st, s);
          var side = (rnd() < 0.5 ? -1 : 1) * (st.w * 0.9 + 2.5 + rnd() * 6);
          g.beads.push({ st: st, s: s, x: p.x + p.nx * side, y: p.y + p.ny * side, r: 0.7 + rnd() * rnd() * 2.2 });
        }
      });
      g.lip = { x: x0, half: wide ? 150 : 64, depth: wide ? 2.6 : 2 };
      svg.setAttribute('viewBox', '0 0 ' + f(g.w) + ' ' + f(g.h));
      // The frame's rounded corners (D66): the water and the paper are clipped to the same shape as the photograph
      var radius = parseFloat(getComputedStyle(frame).borderTopLeftRadius) || 0;
      [clipRect, veil].forEach(function (r) {
        r.setAttribute('x', f(g.fx - 1));
        r.setAttribute('y', f(g.fy - 1));
        r.setAttribute('width', f(g.fw + 2));
        r.setAttribute('height', f(g.fh + 2));
        r.setAttribute('rx', f(radius));
      });
      [mask, maskBase].forEach(function (r) {
        r.setAttribute('x', f(g.fx - 4));
        r.setAttribute('y', f(g.fy - 4));
        r.setAttribute('width', f(g.fw + 8));
        r.setAttribute('height', f(g.fh + 8));
      });
      geo = g;
      return g;
    };

    /* ----- Drawing one frame ----- */
    // Half the stream's width at s: a little uneven along its length, swelling where water runs down it
    var halfWidth = function (st, s, head, t) {
      var w = st.w * (0.84 + 0.16 * Math.sin(s / 29 + st.p1) + 0.08 * Math.sin(s / 11 + st.p2));
      var swell = 0;
      for (var m = 0; m < 3; m++) {
        var c = (s - t * st.v - st.o[m]) % st.gap;
        if (c < 0) c += st.gap;
        if (c > st.gap / 2) c -= st.gap;
        swell += Math.exp(-(c * c) / 80);
      }
      w *= 1 + 0.6 * swell;
      if (head - s < 12) w *= 1 + 0.35 * (1 - (head - s) / 12);
      if (st.main && s < 18) w *= 1 + 0.8 * (1 - s / 18);
      return w / 2;
    };
    var ribbon = function (st, head, t, out) {
      var pts = st.pts;
      var L = [];
      var R = [];
      var i = 0;
      for (; i < pts.length && pts[i].s <= head; i++) {
        var p = pts[i];
        var hw = halfWidth(st, p.s, head, t);
        L.push(pt(p.x + p.nx * hw, p.y + p.ny * hw));
        R.push(pt(p.x - p.nx * hw, p.y - p.ny * hw));
      }
      if (!L.length) return;
      // The front gathers into a rounded bead just ahead of the last point
      var q = pts[Math.min(i, pts.length - 1)];
      var e = pts[i - 1];
      var k = q === e ? 0 : clamp((head - e.s) / (q.s - e.s || 1));
      var hx = e.x + (q.x - e.x) * k;
      var hy = e.y + (q.y - e.y) * k;
      var rh = halfWidth(st, head, head, t) * 1.15;
      var cap = [];
      for (var c = 0; c <= 6; c++) {
        var a = (c / 6) * Math.PI;
        cap.push(pt(hx + rh * (e.nx * Math.cos(a) + e.dx * Math.sin(a)), hy + rh * (e.ny * Math.cos(a) + e.dy * Math.sin(a))));
      }
      out.body += 'M' + L.join('L') + 'L' + cap.join('L') + 'L' + R.reverse().join('L') + 'Z';
      // A thin silver line along the lit side, brighter glints where the swells pass, a spark on the front
      var line = [];
      for (var j = 2; j < i - 1; j++) {
        var r = pts[j];
        var o = halfWidth(st, r.s, head, t) * 0.45 * st.lit;
        line.push(pt(r.x + r.nx * o, r.y + r.ny * o));
      }
      if (line.length > 1) out.sheen += 'M' + line.join('L');
      for (var m = 0; m < 3; m++) {
        var sc = (((t * st.v + st.o[m]) % st.gap) + st.gap) % st.gap;
        for (; sc < head - 6; sc += st.gap) {
          if (sc < 8) continue;
          var g1 = [];
          for (var du = -8; du <= 8; du += 4) {
            var gp = pts[Math.min(pts.length - 1, Math.round((sc + du) / 5))];
            var go = halfWidth(st, gp.s, head, t) * 0.5 * st.lit;
            g1.push(pt(gp.x + gp.nx * go, gp.y + gp.ny * go));
          }
          out.light += 'M' + g1.join('L');
        }
      }
      out.spark += dot(hx + (e.nx * st.lit - e.dx * 0.2) * rh * 0.4, hy + (e.ny * st.lit - e.dy * 0.2) * rh * 0.4, Math.max(0.6, rh * 0.3));
    };
    // The lip of water under the hero's edge, rippling along its length
    var lip = function (g, grow, t, out) {
      var half = g.lip.half * (0.35 + 0.65 * grow);
      var depth = g.lip.depth * (0.4 + 0.6 * grow);
      var top = [];
      var bottom = [];
      for (var x = -half; x <= half; x += 6) {
        var q = x / half;
        var d = depth * Math.pow(Math.max(0, 1 - q * q), 1.5) * (1 + 0.22 * Math.sin((g.lip.x + x) / 7 + t * 2.2));
        top.push(pt(g.lip.x + x, -1));
        bottom.unshift(pt(g.lip.x + x, d));
      }
      out.body += 'M' + top.join('L') + 'L' + bottom.join('L') + 'Z';
      out.sheen += 'M' + pt(g.lip.x - half * 0.6, depth * 0.35) + 'L' + pt(g.lip.x + half * 0.6, depth * 0.35);
    };
    // A spreading front: nearly round, fingered finely along its edge, running further downhill, shivering slowly
    var wetFront = function (b, rad, t) {
      var n = Math.max(14, Math.min(64, Math.round(rad / 7)));
      var P = [];
      var h = b.ph;
      for (var i = 0; i < n; i++) {
        var a = (i / n) * 6.2832;
        var k = 1 + 0.06 * Math.sin(2 * a + h[0]) + 0.045 * Math.sin(4 * a + h[1]) + 0.035 * Math.sin(7 * a + h[2]) + 0.025 * Math.sin(13 * a + h[3]) + 0.016 * Math.sin(21 * a + h[4] + t * 0.5);
        // Young fronts stretch along their channel; grown ones are roundish, reaching further downhill
        k *= (1 + 0.32 * Math.sin(a)) * (1 + 0.45 * Math.cos(2 * (a - b.along)) * (1 - smooth(rad / 260)));
        P.push(b.x + Math.cos(a) * rad * k, b.y + Math.sin(a) * rad * k);
      }
      return curve(P);
    };
    // The wet trail of a stream up to arc length `to`, from where it entered the photograph
    var trail = function (st, to) {
      if (to <= st.wetFrom + 1) return '';
      var d = [];
      var pts = st.pts;
      for (var i = 0; i < pts.length && pts[i].s <= to; i++) if (pts[i].s >= st.wetFrom) d.push(pt(pts[i].x, pts[i].y));
      return d.length > 1 ? 'M' + d.join('L') : '';
    };

    var state = { p: 0 };
    var view = api.water = { state: state, frames: 0, wet: 0, reach: 0, done: false };
    var render = function () {
      var g = geo;
      if (!g) return;
      var t = gsap.ticker.time;
      var vs = g.S0 + state.p * (g.S1 - g.S0);
      var u = (vs - g.sB) / g.U;
      var done = vs >= g.S1 - 0.5;
      view.frames++;
      // Past the end the layer is hidden and the photograph is left exactly as it is without motion
      if (done && view.done) return;
      view.done = done;
      svg.classList.toggle('is-done', done);
      img.style.transform = done ? '' : 'scale(' + (1.06 - 0.06 * smooth(u)).toFixed(4) + ')';
      if (done) return;
      var out = { body: '', sheen: '', light: '', spark: '' };
      lip(g, smooth((vs - g.S0) / (g.sA - g.S0)), t, out);
      g.streams.forEach(function (st) {
        var head = Math.min(st.len, st.head(vs));
        if (head > 0.5) ribbon(st, head, t, out);
      });
      view.reach = g.streams[0].head(vs);
      g.beads.forEach(function (b) {
        var r = b.r * smooth((b.st.head(vs) - b.s - 6) / 24);
        if (r < 0.2) return;
        out.body += dot(b.x, b.y, r);
        out.spark += dot(b.x - r * 0.35, b.y - r * 0.35, r * 0.32);
      });
      var count = 0;
      var trailAll = '';
      TRAIL.forEach(function (age, i) {
        var d = '';
        g.streams.forEach(function (st) {
          var s = trail(st, Math.min(st.len, st.head(vs - age)));
          if (s) count++;
          d += s;
        });
        var w = g.trail[i];
        if (i === 1) trailAll = d;
        trails[i].setAttribute('d', d);
        trails[i].setAttribute('stroke-width', w);
        damp[i].setAttribute('d', d);
        damp[i].setAttribute('stroke-width', w + 18);
        edges[i].setAttribute('d', d);
        edges[i].setAttribute('stroke-width', w + 3);
      });
      var wet = '';
      // Last, every front keeps spreading until nothing dry is left
      var flood = g.F * Math.pow(clamp((u - 0.62) / 0.34), 2.4);
      g.blobs.forEach(function (b) {
        if (vs <= b.pass) return;
        var rad = b.R * (0.5 - 0.5 * Math.cos(Math.PI * clamp((u - b.u0) / (b.u1 - b.u0)))) + flood;
        if (rad < 1) return;
        wet += wetFront(b, rad, t);
        count++;
      });
      view.wet = count;
      holes.setAttribute('d', wet);
      front.setAttribute('d', wet);
      glow.setAttribute('d', wet);
      film.setAttribute('d', trailAll);
      film.setAttribute('stroke-width', g.trail[1]);
      shade.setAttribute('d', out.body);
      body.setAttribute('d', out.body);
      sheen.setAttribute('d', out.sheen);
      light.setAttribute('d', out.light);
      sparkle.setAttribute('d', out.spark);
      // The water and the last of the paper clear together, leaving the photograph as it is without motion
      flow.style.opacity = (1 - smooth((u - 0.86) / 0.12)).toFixed(3);
      dry.style.opacity = (1 - smooth((u - 0.9) / 0.08)).toFixed(3);
      // The film shows on the young channels and clears as the photograph opens around them
      film.style.opacity = (1 - smooth((u - 0.3) / 0.3)).toFixed(3);
    };

    var dirty = true;
    var last = -1;
    var live = false;
    var calm = window.matchMedia('(pointer: coarse)').matches ? 1 / 30 : 0;
    var tick = function () {
      var t = gsap.ticker.time;
      if (!dirty && t - last < calm) return;
      dirty = false;
      last = t;
      try {
        render();
        if (!live) svg.classList.add('is-live');
        live = true;
      } catch (err) {
        // Whatever fails, the photograph is never left covered
        gsap.ticker.remove(tick);
        svg.classList.remove('is-live');
        img.style.transform = '';
        live = false;
      }
    };
    var tween = gsap.fromTo(
      state,
      { p: 0 },
      {
        p: 1,
        ease: 'none',
        onUpdate: function () {
          dirty = true;
        },
        scrollTrigger: {
          trigger: section,
          start: function () {
            return measure().S0;
          },
          end: function () {
            return geo.S1;
          },
          scrub: 0.6,
          invalidateOnRefresh: true,
          onRefresh: function () {
            dirty = true;
          },
        },
      },
    );
    // The water moves only while the section is on screen
    ST.create({
      trigger: section,
      start: 'top bottom',
      end: 'bottom top',
      onToggle: function (self) {
        if (self.isActive) {
          dirty = true;
          gsap.ticker.add(tick);
        } else gsap.ticker.remove(tick);
      },
    });
    api.sun = tween;
  })();

  /* ---------- Scenes: Atlantic Drift (the photograph a little slower than the page, ±5% of its oversized crop) and
     Air Reveal (the words). The drift is scrubbed from 48em only: on phones each scene is a still, correctly cropped
     photograph (D66, design.md §06). ---------- */
  var scenes = toArray('[data-scene]');
  scenes.forEach(function (s) {
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

  // Lazy images change heights as they load: measure again once everything is in
  window.addEventListener('load', function () {
    ST.refresh();
  });
})();
