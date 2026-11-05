/* Good Times in Cape Town — the media system
   Markup: src/partials/media.mjs. Styles: living-cape.css (section 5, the carousel) and media.css (the exhibition
   and its lightbox). The carousel is the home page's; the exhibition hangs on the home page and, since D71, in
   every tour's and package's Gallery tab, where the photo band's "View gallery" opens the same lightbox.

   04 · The destination carousel. One canonical active index; the arrows, the arrow keys (Home and End too),
   keyboard focus on a card's link, a click on a card, a mouse drag and a native swipe all resolve to it.
   The track is a native horizontal scroller, snapping without this file. From 48em the active card is
   wider and a change of destination is one GSAP timeline: the widths and the scroll position settle
   together (550–750 ms, power3.inOut), the new photograph settles from 1.045 and its words rise out of
   their mask. An interruption (a rapid click, a key held down, a hand on the strip) kills the timeline
   where it stands and the next one starts from there, so the cards can never be scrambled. Dragging only
   scrolls; the expansion settles once the destination is chosen. Below 48em every card is the same
   width, the swipe is native and the active card follows the snap. No autoplay, nothing pinned.

   07 · The exhibition. Each tile rises once as it enters (only the tiles entering together are staggered);
   each print opens in a native modal <dialog> that shows the photograph whole, with "03 / 10", its place,
   story, credit and day. On a wide screen with a fine pointer the print lifts into the dialog (Flip);
   elsewhere, and whenever it is opened from outside the wall, the dialog fades in and the photograph settles.
   The page behind cannot scroll while it is open. In a tab the wall may be hidden when the page loads: its
   tiles then enter when the tab first shows them, and ScrollTrigger measures the page again after every
   change of tab (a tab changes the height of everything below it).

   Without motion (reduced motion, ?nomotion: no html.cine) every change is immediate and nothing moves by
   itself. Without GSAP both still work, without their movement. */
(function () {
  'use strict';
  var doc = document;
  var html = doc.documentElement;
  var gsap = window.gsap;
  var ST = window.ScrollTrigger;
  var Flip = window.Flip;
  var motion = !!(gsap && ST) && html.classList.contains('cine');
  var api = (window.__media = { motion: motion });
  if (motion) gsap.registerPlugin.apply(gsap, [ST, Flip].filter(Boolean));
  var toArray = function (sel, scope) {
    return Array.prototype.slice.call((scope || doc).querySelectorAll(sel));
  };
  var clamp = function (v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  };
  var pad2 = function (v) {
    return (v < 10 ? '0' : '') + v;
  };
  var debounce = function (fn, ms) {
    var t;
    return function () {
      clearTimeout(t);
      t = setTimeout(fn, ms);
    };
  };
  var focusVisible = function (el) {
    try {
      return el.matches(':focus-visible');
    } catch (err) {
      return true;
    }
  };

  /* ---------- 04 · The destination carousel ---------- */
  (function carousel() {
    var section = doc.querySelector('[data-film]');
    if (!section) return;
    var q = function (sel) {
      return section.querySelector(sel);
    };
    var viewport = q('[data-film-viewport]');
    var track = q('[data-film-track]');
    var controls = q('[data-film-controls]');
    var prev = q('[data-film-prev]');
    var next = q('[data-film-next]');
    var current = q('[data-film-current]');
    var progress = q('[data-film-progress]');
    var hint = q('[data-film-hint]');
    var scrollbar = q('[data-film-scrollbar]');
    var thumb = q('[data-film-thumb]');
    var status = q('[data-film-status]');
    var probe = q('[data-film-probe]');
    var items = toArray('[data-film-item]', section);
    var n = items.length;
    if (!viewport || !track || !controls || !probe || !n) return;
    var links = items.map(function (li) {
      return li.querySelector('a');
    });
    var drifts = items.map(function (li) {
      return li.querySelector('[data-film-drift]');
    });
    var expanding = window.matchMedia('(min-width: 48em)');
    var active = 0;
    items.forEach(function (li, i) {
      if (li.classList.contains('is-active')) active = i;
    });
    var geo = null;
    var steering = null; // the settle timeline, while it runs
    var drag = null;
    var touching = false;
    var swallow = false;

    section.classList.add('is-enhanced');
    controls.hidden = false;
    if (hint) hint.hidden = false;
    if (scrollbar) scrollbar.hidden = false;

    /* Geometry, measured again on every resize, breakpoint change and load (never cached for good). The two
       probes carry the CSS widths of a card and of the featured card; the end padding is read back from the
       strip, as the browser actually honours it. */
    var measure = function () {
      var w = probe.children[0].getBoundingClientRect().width;
      var W = probe.children[1].getBoundingClientRect().width;
      var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      var padL = parseFloat(getComputedStyle(viewport).paddingLeft) || 0;
      var now = items.reduce(function (sum, li) {
        return sum + li.getBoundingClientRect().width;
      }, 0);
      var padR = Math.max(0, viewport.scrollWidth - padL - now - (n - 1) * gap);
      var expand = expanding.matches && W > w + 1;
      var strip = (expand ? W + (n - 1) * w : n * w) + (n - 1) * gap;
      geo = { w: w, W: W, gap: gap, padL: padL, expand: expand, width: window.innerWidth, max: Math.max(0, padL + strip + padR - viewport.clientWidth) };
    };
    // Where the strip rests with card i active. From 48em the card before it stays in view as context (the first two
    // rest at the start, the last ones at the end); below, the active card leads.
    var target = function (i) {
      var step = geo.w + geo.gap;
      return clamp((geo.expand ? Math.max(0, i - 1) : i) * step, 0, geo.max);
    };
    // A card's start in the strip's scroll coordinates, as it is laid out at this moment
    var startOf = function (i) {
      return items[i].getBoundingClientRect().left - viewport.getBoundingClientRect().left + viewport.scrollLeft - geo.padL;
    };
    // The destination a free scroll (a drag, a swipe, a wheel) came to rest nearest to. Where several rest at the same
    // place (the first two, the last few), the current one is kept, or the one nearest to it is taken.
    var nearest = function (x) {
      var best = Infinity;
      var ties = [];
      for (var i = 0; i < n; i++) {
        var t = geo.expand ? (i ? clamp(startOf(i - 1), 0, geo.max) : 0) : clamp(startOf(i), 0, geo.max);
        var d = Math.abs(t - x);
        if (d < best - 1) {
          best = d;
          ties = [i];
        } else if (d <= best + 1) ties.push(i);
      }
      if (ties.indexOf(active) >= 0) return active;
      ties.sort(function (a, b) {
        return Math.abs(a - active) - Math.abs(b - active);
      });
      return ties[0];
    };

    /* The state everyone sees: the active card, aria-current, the counter, the arrows, the proportional progress */
    var paint = function (instant) {
      items.forEach(function (li, i) {
        var on = i === active;
        li.classList.toggle('is-active', on);
        if (on) li.setAttribute('aria-current', 'true');
        else li.removeAttribute('aria-current');
      });
      current.textContent = pad2(active + 1);
      prev.setAttribute('aria-disabled', String(active === 0));
      next.setAttribute('aria-disabled', String(active === n - 1));
      var p = (active + 1) / n;
      if (motion && !instant) gsap.to(progress, { scaleX: p, duration: 0.34, ease: 'power2.out', overwrite: true });
      else progress.style.transform = 'scaleX(' + p + ')';
    };
    var announce = function () {
      if (status) status.textContent = items[active].getAttribute('data-film-label') + '. Destination ' + (active + 1) + ' of ' + n + '.';
    };
    // The scroll position as a hairline: the thumb is the share of the strip in view
    var rail = function () {
      if (!thumb) return;
      var sw = viewport.scrollWidth;
      var cw = viewport.clientWidth;
      var share = Math.min(1, cw / sw);
      var at = sw > cw ? viewport.scrollLeft / (sw - cw) : 0;
      thumb.style.width = (share * 100).toFixed(2) + '%';
      thumb.style.transform = 'translateX(' + (at * (1 / share - 1) * 100).toFixed(2) + '%)';
    };
    // From 48em, with motion: each photograph sits a little against the strip's movement (its frame is 8% wider)
    var drift = function () {
      if (!motion || !geo.expand) return;
      var vb = viewport.getBoundingClientRect();
      var mid = vb.left + vb.width / 2;
      items.forEach(function (li, i) {
        var r = li.getBoundingClientRect();
        var rel = clamp((r.left + r.width / 2 - mid) / vb.width, -1, 1);
        drifts[i].style.transform = 'translate3d(' + (-rel * 3).toFixed(2) + '%, 0, 0)';
      });
    };
    // The words of a card rise out of their mask; the featured card's round arrow follows
    var reveal = function (i, full) {
      if (!motion) return;
      var li = items[i];
      var title = li.querySelector('.lc-film__title');
      var rest = full ? toArray('.lc-film__line, .lc-film__meta', li) : [];
      var go = full ? li.querySelector('.lc-film__go') : null;
      gsap.fromTo(title, { yPercent: 100, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.45, delay: 0.16, ease: 'power3.out', overwrite: true, clearProps: 'transform,opacity' });
      if (rest.length) gsap.fromTo(rest, { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.42, delay: 0.24, stagger: 0.06, ease: 'power3.out', overwrite: true, clearProps: 'transform,opacity' });
      if (go) gsap.fromTo(go, { scale: 0.7, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.36, delay: 0.36, ease: 'power2.out', overwrite: true, clearProps: 'transform,opacity' });
    };
    var settleImage = function (i) {
      if (!motion) return;
      var img = drifts[i].querySelector('img');
      if (img) gsap.fromTo(img, { scale: 1.045 }, { scale: 1, duration: 0.8, ease: 'power2.out', overwrite: true, clearProps: 'transform' });
    };
    var release = function () {
      items.forEach(function (li) {
        li.style.width = '';
      });
    };
    var halt = function () {
      if (!steering) return;
      steering.kill();
      steering = null;
    };

    /* The settle: widths (from 48em) and the scroll position on one timeline, or at once without motion */
    var travel = function (animate) {
      var to = target(active);
      halt();
      if (!animate) {
        release();
        viewport.classList.remove('is-steering');
        viewport.scrollLeft = to;
        rail();
        drift();
        return;
      }
      viewport.classList.add('is-steering');
      steering = gsap.timeline({
        defaults: { duration: geo.expand ? 0.65 : 0.5, ease: 'power3.inOut' },
        onUpdate: function () {
          rail();
          drift();
        },
        onComplete: function () {
          steering = null;
          release();
          viewport.classList.remove('is-steering');
        },
      });
      if (geo.expand) {
        steering.to(
          items,
          {
            width: function (j) {
              return j === active ? geo.W : geo.w;
            },
          },
          0,
        );
      }
      steering.to(viewport, { scrollLeft: to }, 0);
    };
    var select = function (i, opts) {
      opts = opts || {};
      i = clamp(i, 0, n - 1);
      var was = active;
      var animate = motion && !opts.instant;
      // Every card is held at its present width before the classes change, so the timeline starts from what is on screen
      if (animate && geo.expand) {
        items.forEach(function (li) {
          li.style.width = li.getBoundingClientRect().width + 'px';
        });
      }
      active = i;
      paint(!animate);
      travel(animate);
      if (i !== was) {
        reveal(i, true);
        if (geo.expand) reveal(was, false);
        settleImage(i);
        if (opts.announce) announce();
      }
      if (opts.focus) links[i].focus({ preventScroll: true });
    };

    /* Arrows: bounded, never wrapping; the end arrow says so (aria-disabled) */
    prev.addEventListener('click', function () {
      if (active > 0) select(active - 1, { announce: true });
    });
    next.addEventListener('click', function () {
      if (active < n - 1) select(active + 1, { announce: true });
    });
    // A click on a card selects it; the card's link (its name and round arrow) opens its page
    track.addEventListener('click', function (e) {
      if (e.target.closest('a')) return;
      var li = e.target.closest('[data-film-item]');
      if (li) select(items.indexOf(li), { announce: true });
    });
    // After a drag, the click that ends it is swallowed: a drag never navigates
    viewport.addEventListener(
      'click',
      function (e) {
        if (!swallow) return;
        swallow = false;
        e.preventDefault();
        e.stopPropagation();
      },
      true,
    );
    // Keys while focus is in the strip: ← → step, Home and End jump; focus follows to the new card's link
    viewport.addEventListener('keydown', function (e) {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      var to = { ArrowRight: active + 1, ArrowLeft: active - 1, Home: 0, End: n - 1 }[e.key];
      if (to === undefined) return;
      e.preventDefault();
      select(to, { announce: to !== active, focus: true });
    });
    // Tabbing onto a card's link selects that card (keyboard focus only; a mouse press focuses the link too)
    viewport.addEventListener('focusin', function (e) {
      var li = e.target.closest('[data-film-item]');
      if (!li || drag || !focusVisible(e.target)) return;
      var i = items.indexOf(li);
      if (i !== active) select(i);
    });

    /* A mouse drag scrolls the strip (touch and trackpads scroll it natively); on release a flick carries on a
       little, and the strip settles on the destination nearest to where it would come to rest */
    viewport.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      drag = { id: e.pointerId, x: e.clientX, left: viewport.scrollLeft, moved: false, trail: [[e.clientX, e.timeStamp]] };
    });
    viewport.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var dx = e.clientX - drag.x;
      if (!drag.moved) {
        if (Math.abs(dx) < 6) return;
        drag.moved = true;
        halt(); // the hand takes over from any settle in progress
        drag.left = viewport.scrollLeft + dx;
        viewport.classList.add('is-dragging', 'is-steering');
        try {
          viewport.setPointerCapture(drag.id);
        } catch (err) {
          /* the drag still works, captured or not */
        }
      }
      viewport.scrollLeft = drag.left - dx;
      drag.trail.push([e.clientX, e.timeStamp]);
      if (drag.trail.length > 6) drag.trail.shift();
    });
    var letGo = function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var d = drag;
      drag = null;
      viewport.classList.remove('is-dragging');
      if (!d.moved) return;
      swallow = true;
      setTimeout(function () {
        swallow = false;
      }, 0);
      var a = d.trail[0];
      var b = d.trail[d.trail.length - 1];
      var v = b[1] > a[1] && e.timeStamp - b[1] < 80 ? (b[0] - a[0]) / (b[1] - a[1]) : 0;
      var i = nearest(viewport.scrollLeft - v * 180);
      select(i, { announce: i !== active });
    };
    viewport.addEventListener('pointerup', letGo);
    viewport.addEventListener('pointercancel', letGo);
    viewport.addEventListener('dragstart', function (e) {
      e.preventDefault();
    });

    /* Native scrolling (touch, trackpad, wheel): the rail and the drift follow every frame. Below 48em the active
       card follows the snap; from 48em, once the strip comes to rest, it settles on the nearest destination. */
    var queued = false;
    var frame = function () {
      queued = false;
      rail();
      if (steering) return;
      drift();
      if (!geo.expand && !drag) {
        var i = nearest(viewport.scrollLeft);
        if (i !== active) {
          var was = active;
          active = i;
          paint(false);
          if (was !== i) reveal(i, true);
        }
      }
    };
    var rest = function () {
      if (drag || steering || touching || !geo.expand) return;
      var i = nearest(viewport.scrollLeft);
      if (i !== active || Math.abs(viewport.scrollLeft - target(i)) > 1) select(i, { announce: i !== active });
    };
    var restSoon = debounce(rest, 160);
    var hasScrollEnd = 'onscrollend' in window;
    viewport.addEventListener(
      'scroll',
      function () {
        if (!queued) {
          queued = true;
          requestAnimationFrame(frame);
        }
        if (!hasScrollEnd) restSoon();
      },
      { passive: true },
    );
    if (hasScrollEnd) viewport.addEventListener('scrollend', rest);
    viewport.addEventListener(
      'touchstart',
      function () {
        touching = true;
      },
      { passive: true },
    );
    viewport.addEventListener(
      'touchend',
      function () {
        touching = false;
        if (!hasScrollEnd) restSoon();
      },
      { passive: true },
    );

    /* Resize, breakpoint and load: measure again and keep the active destination in view, at once */
    var relayout = function () {
      halt();
      release();
      viewport.classList.remove('is-steering');
      measure();
      if (!geo.expand) {
        drifts.forEach(function (d) {
          d.style.transform = '';
        });
      }
      paint(true);
      viewport.scrollLeft = target(active);
      rail();
      drift();
    };
    var widthChanged = debounce(function () {
      if (geo && window.innerWidth !== geo.width) relayout();
    }, 150);
    window.addEventListener('resize', widthChanged, { passive: true });
    if (expanding.addEventListener) expanding.addEventListener('change', relayout);
    window.addEventListener('load', relayout);
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(relayout);

    measure();
    // Phones lead with the first destination; from 48em the featured card in the markup stays
    if (!geo.expand) active = 0;
    paint(true);
    viewport.scrollLeft = target(active);
    rail();
    drift();

    /* The section enters once: the heading rises, then the cards, 80 ms apart (opacity only: every link stays tabbable) */
    if (motion) {
      gsap.from(toArray('.lc-film__intro > *, .lc-film__nav', section), { y: 22, opacity: 0, duration: 0.6, ease: 'power2.out', stagger: 0.08, clearProps: 'transform,opacity', scrollTrigger: { trigger: section, start: 'top 80%', once: true } });
      gsap.from(items, { y: 26, opacity: 0, duration: 0.65, ease: 'power2.out', stagger: 0.085, clearProps: 'transform,opacity', scrollTrigger: { trigger: viewport, start: 'top 88%', once: true } });
    }

    api.carousel = {
      select: function (i) {
        select(i, { announce: true });
      },
      active: function () {
        return active;
      },
      busy: function () {
        return !!steering || !!drag;
      },
      geometry: function () {
        return geo;
      },
      target: function (i) {
        return target(i);
      },
    };
  })();

  /* ---------- 07 · The exhibition and its lightbox ---------- */
  (function exhibition() {
    var wall = doc.querySelector('[data-lc-gallery]');
    if (!wall) return;
    var tiles = toArray('.lc-gallery__item', wall);
    if (motion) {
      // Once each, as it enters; only the tiles entering together are staggered (design.md §05: 0.85 → 1, 20 px).
      // Each print enters in the manner of its role (data-role, the food photography brief): a wide view opens
      // from a soft mask, a plate settles from a slight scale, a table is uncovered slowly from below, a glass
      // rises, people simply arrive. Transforms, opacity and clip-path only; all cleared when done.
      var ROLES = {
        wide: { from: { opacity: 0.85, y: 20, clipPath: 'inset(0% 0% 14% 0%)' }, to: { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.9 } },
        food: { from: { opacity: 0.55, scale: 0.955 }, to: { duration: 0.85 } },
        table: { from: { opacity: 0.85, clipPath: 'inset(100% 0% 0% 0%)' }, to: { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.15, ease: 'power3.inOut' } },
        wine: { from: { opacity: 0.85, y: 40 }, to: { duration: 0.85 } },
        people: { from: { opacity: 0.85, y: 12 }, to: { duration: 0.7 } },
      };
      var roleOf = function (t) {
        return ROLES[t.getAttribute('data-role')] || { from: { opacity: 0.85, y: 20 }, to: { duration: 0.7 } };
      };
      var reveal = function () {
        tiles.forEach(function (t) {
          gsap.set(t, roleOf(t).from);
        });
        ST.batch(tiles, {
          start: 'top 92%',
          once: true,
          onEnter: function (batch) {
            batch.forEach(function (t, k) {
              var to = { opacity: 1, y: 0, scale: 1, delay: k * 0.12, ease: 'power2.out', overwrite: true, clearProps: 'transform,opacity,clipPath' };
              var own = roleOf(t).to;
              for (var key in own) to[key] = own[key];
              gsap.to(t, to);
            });
          },
        });
      };
      var panel = wall.closest('[role="tabpanel"]');
      var tabs = panel && panel.closest('[data-tabs]');
      if (panel && panel.hidden) {
        // Measured once the tab shows the wall (before that it has no place on the page)
        var shown = new MutationObserver(function () {
          if (panel.hidden) return;
          shown.disconnect();
          reveal();
        });
        shown.observe(panel, { attributes: true, attributeFilter: ['hidden'] });
      } else reveal();
      if (tabs) {
        new MutationObserver(
          debounce(function () {
            ST.refresh();
          }, 60),
        ).observe(tabs, { subtree: true, attributes: true, attributeFilter: ['hidden'] });
      }
    }

    var dialog = doc.querySelector('[data-lc-lightbox]');
    var dataEl = doc.querySelector('[data-lc-gallery-data]');
    if (!dialog || !dataEl || typeof dialog.showModal !== 'function') return; // the prints stay plain links to the full photograph
    var data = JSON.parse(dataEl.textContent);
    var prints = toArray('[data-lc-open]', wall);
    // Ways in from outside the wall (the tour page's photo band): data-lc-show is the photograph's index
    var showers = toArray('[data-lc-show]');
    var q = function (sel) {
      return dialog.querySelector(sel);
    };
    var frame = q('[data-lc-frame]');
    var stage = q('[data-lc-stage]');
    var info = q('[data-lc-info]');
    var controls = q('.lc-lightbox__controls');
    var closer = q('[data-lc-close]');
    var title = q('[data-lc-title]');
    var place = q('[data-lc-place]');
    var story = q('[data-lc-story]');
    var credit = q('[data-lc-credit]');
    var link = q('[data-lc-link]');
    var linkLabel = q('[data-lc-link-label]');
    var count = q('[data-lc-count]');
    var n = prints.length;
    var index = -1;
    var opener = null;
    var busy = false;
    var fromWall = true;
    var lifts = window.matchMedia('(min-width: 64em) and (pointer: fine)');
    // The print lifts only when it was the way in and is on the page (not behind another tab)
    var lift = function () {
      return motion && !!Flip && lifts.matches && fromWall && thumbOf(index).getClientRects().length > 0;
    };

    var thumbOf = function (i) {
      return prints[i].querySelector('.lc-print__frame');
    };
    var setStage = function () {
      frame.style.setProperty('--stage-h', stage.clientHeight + 'px');
    };
    var upgrade = function () {
      // Once the photograph has landed, the browser fetches a rendition sized for the lightbox (thumbnails in the wall)
      frame.querySelectorAll('source').forEach(function (s) {
        s.setAttribute('sizes', '(min-width: 64em) 68vw, 100vw');
      });
    };
    var fill = function (i) {
      index = (i + n) % n;
      var picture = prints[index].querySelector('picture').cloneNode(true);
      var img = picture.querySelector('img');
      img.setAttribute('loading', 'eager');
      img.alt = data[index].alt;
      frame.replaceChildren(picture);
      var w = Number(img.getAttribute('width')) || 3;
      var h = Number(img.getAttribute('height')) || 2;
      frame.style.setProperty('--ar', w + ' / ' + h);
      frame.style.setProperty('--ar-n', (w / h).toFixed(4));
      // While the print lifts, the photograph keeps the crop it had in the wall
      frame.style.setProperty('--lift-focus', thumbOf(index).style.getPropertyValue('--focus') || '50% 50%');
      frame.setAttribute('data-flip-id', 'lc-print-' + index);
      title.textContent = data[index].title;
      place.textContent = data[index].place || '';
      place.hidden = !data[index].place;
      story.textContent = data[index].story || '';
      story.hidden = !data[index].story;
      credit.textContent = data[index].credit;
      // The private day the photograph belongs to; a tour's own gallery has none to point to
      link.hidden = !data[index].href;
      if (data[index].href) {
        link.setAttribute('href', data[index].href);
        linkLabel.textContent = data[index].link;
      }
      count.textContent = pad2(index + 1) + ' / ' + pad2(n);
      prints.forEach(function (p, j) {
        p.classList.toggle('is-away', j === index && dialog.open);
      });
    };
    var done = function () {
      busy = false;
      frame.classList.remove('is-lifting');
      upgrade();
    };
    var open = function (i, trigger) {
      if (busy || dialog.open) return;
      opener = trigger || prints[i];
      fromWall = prints.indexOf(opener) > -1;
      fill(i);
      dialog.showModal();
      html.classList.add('lc-locked');
      setStage();
      closer.focus({ preventScroll: true });
      if (!motion) return upgrade();
      busy = true;
      gsap.fromTo(dialog, { backgroundColor: 'rgba(7, 16, 18, 0)' }, { backgroundColor: 'rgba(7, 16, 18, 0.96)', duration: 0.36, ease: 'power2.out', clearProps: 'backgroundColor' });
      // Opacity only: the close button already has focus and must keep it
      gsap.fromTo([info, controls], { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.4, delay: 0.18, stagger: 0.05, ease: 'power2.out', clearProps: 'opacity,transform' });
      if (lift()) {
        var state = Flip.getState(thumbOf(index));
        frame.classList.add('is-lifting');
        prints[index].classList.add('is-away');
        Flip.from(state, { targets: frame, duration: 0.55, ease: 'power3.inOut', scale: false, onComplete: done });
      } else {
        gsap.fromTo(frame, { opacity: 0, scale: 0.96 }, { opacity: 1, scale: 1, duration: 0.38, ease: 'power2.out', clearProps: 'opacity,transform', onComplete: done });
      }
    };
    var settle = function () {
      prints.forEach(function (p) {
        p.classList.remove('is-away');
      });
      html.classList.remove('lc-locked');
      frame.classList.remove('is-lifting');
      busy = false;
      if (opener) opener.focus({ preventScroll: true });
    };
    var close = function () {
      if (!dialog.open) return;
      if (!motion) return dialog.close();
      // Escape always wins: an opening or a step still in progress is finished at once, then the photograph returns
      if (busy) {
        gsap.killTweensOf([frame, info, controls, dialog]);
        gsap.set([frame, info, controls], { clearProps: 'opacity,transform,visibility,width,height,top,left' });
      }
      busy = true;
      var thumb = thumbOf(index);
      var r = thumb.getBoundingClientRect();
      var inView = r.bottom > 0 && r.top < window.innerHeight;
      var finish = function () {
        dialog.close();
        gsap.set([frame, info, controls], { clearProps: 'opacity,transform,visibility,width,height,top,left' });
      };
      gsap.to([info, controls], { opacity: 0, y: 8, duration: 0.18, ease: 'power1.in' });
      gsap.to(dialog, { backgroundColor: 'rgba(7, 16, 18, 0)', duration: 0.34, delay: 0.06, ease: 'power1.in' });
      if (lift() && inView) {
        frame.classList.add('is-lifting');
        Flip.fit(frame, thumb, { duration: 0.48, ease: 'power3.inOut', scale: false, onComplete: finish });
      } else gsap.to(frame, { opacity: 0, scale: 0.96, duration: 0.26, ease: 'power1.in', onComplete: finish });
    };
    var go = function (d) {
      if (busy || !dialog.open) return;
      if (!motion) {
        fill(index + d);
        return upgrade();
      }
      busy = true;
      gsap.to(frame, {
        opacity: 0,
        x: -d * 28,
        duration: 0.18,
        ease: 'power1.in',
        onComplete: function () {
          fill(index + d);
          setStage();
          gsap.fromTo(frame, { opacity: 0, x: d * 28 }, { opacity: 1, x: 0, duration: 0.34, ease: 'power2.out', clearProps: 'opacity,transform', onComplete: done });
        },
      });
    };

    prints.forEach(function (p, i) {
      p.addEventListener('click', function (e) {
        e.preventDefault();
        open(i, p);
      });
    });
    showers.forEach(function (b) {
      var i = clamp(Number(b.getAttribute('data-lc-show')) || 0, 0, n - 1);
      b.hidden = false;
      b.addEventListener('click', function () {
        open(i, b);
      });
    });
    closer.addEventListener('click', close);
    q('[data-lc-prev]').addEventListener('click', function () {
      go(-1);
    });
    q('[data-lc-next]').addEventListener('click', function () {
      go(1);
    });
    dialog.addEventListener('cancel', function (e) {
      // Escape: the animated way out (the native close would skip the photograph's return)
      e.preventDefault();
      close();
    });
    dialog.addEventListener('close', settle);
    dialog.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'ArrowRight') go(1);
    });
    // A swipe across the photograph steps through (the stage leaves vertical panning to the browser); the click
    // that ends a swipe is not a click on the dark ground
    var swipe = null;
    var swiped = false;
    stage.addEventListener('pointerdown', function (e) {
      swipe = { x: e.clientX, y: e.clientY };
    });
    stage.addEventListener('pointerup', function (e) {
      if (!swipe) return;
      var dx = e.clientX - swipe.x;
      var dy = e.clientY - swipe.y;
      swipe = null;
      if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.3) {
        swiped = true;
        setTimeout(function () {
          swiped = false;
        }, 0);
        go(dx < 0 ? 1 : -1);
      }
    });
    stage.addEventListener('pointercancel', function () {
      swipe = null;
    });
    stage.addEventListener('dragstart', function (e) {
      e.preventDefault();
    });
    // A click on the dark ground around the photograph closes
    dialog.addEventListener('click', function (e) {
      if (swiped) return;
      if (e.target === dialog || e.target === stage || e.target === dialog.firstElementChild) close();
    });
    window.addEventListener('resize', function () {
      if (dialog.open) setStage();
    });

    api.gallery = {
      open: open,
      close: close,
      next: function () {
        go(1);
      },
      index: function () {
        return index;
      },
      busy: function () {
        return busy;
      },
    };
  })();
})();
