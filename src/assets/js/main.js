/* Good Times in Cape Town — core behaviour (no dependencies)
   - preview bar offset
   - header condense on scroll
   - mobile drawer with focus trap
   - reveal on scroll (IntersectionObserver; everything visible without JS)
   - home hero film (poster first, motion and visibility aware, no controls)
   - home search card (tabs, travellers popover, date limits)
   - tour filter chips, tour detail tabs, segmented tabs, booking card
   - mobile booking and contact bars (the tour galleries' lightbox is media.js) */
(function () {
  'use strict';
  const doc = document;
  const html = doc.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const noMotion = () => reduce.matches || /[?&]nomotion\b/.test(location.search);

  /* ---------- Preview bar offset ---------- */
  const bar = doc.querySelector('[data-preview-bar]');
  if (bar) {
    const setBar = () => html.style.setProperty('--preview-h', `${bar.offsetHeight}px`);
    setBar();
    window.addEventListener('resize', setBar, { passive: true });
  }

  /* ---------- Header ----------
     The one owner of the header's scrolled state: .is-condensed past the threshold (data-condense-at, 8 px by default,
     40 on the home page), which styles.css paints as white glass (paint only; nothing moves). Re-read when a page
     comes back from the back/forward cache. Its measured height (--header-live) gives anchors their offset. Phones
     that report little memory or ask to save data get the solid header (.is-lite): blur is costly there. */
  const header = doc.querySelector('[data-header]');
  if (header) {
    const condenseAt = Number(header.dataset.condenseAt) || 8;
    let ticking = false;
    const update = () => {
      header.classList.toggle('is-condensed', window.scrollY > condenseAt);
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });
    window.addEventListener('pageshow', (e) => e.persisted && update());
    update();
    const lite = (navigator.deviceMemory && navigator.deviceMemory <= 2) || navigator.connection?.saveData === true;
    if (lite) header.classList.add('is-lite');
    const measure = () => html.style.setProperty('--header-live', `${header.offsetHeight}px`);
    measure();
    if ('ResizeObserver' in window) new ResizeObserver(measure).observe(header);
    else window.addEventListener('resize', measure, { passive: true });
  }

  /* ---------- Drawer ---------- */
  const toggle = doc.querySelector('[data-nav-toggle]');
  const drawer = doc.querySelector('[data-drawer]');
  if (toggle && drawer) {
    const focusables = () => Array.from(drawer.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'));
    let lastFocus = null;
    const open = () => {
      lastFocus = doc.activeElement;
      if (header) drawer.style.setProperty('--drawer-top', `${Math.max(0, header.getBoundingClientRect().bottom)}px`);
      drawer.hidden = false;
      requestAnimationFrame(() => drawer.classList.add('is-open'));
      toggle.setAttribute('aria-expanded', 'true');
      doc.body.classList.add('drawer-open');
      html.classList.add('drawer-open');
      header?.classList.add('is-condensed');
      (focusables()[0] || drawer).focus({ preventScroll: true });
    };
    const close = (restore = true) => {
      drawer.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      doc.body.classList.remove('drawer-open');
      html.classList.remove('drawer-open');
      const done = () => {
        drawer.hidden = true;
        drawer.removeEventListener('transitionend', done);
      };
      drawer.addEventListener('transitionend', done);
      setTimeout(done, 350);
      if (restore) (lastFocus || toggle).focus({ preventScroll: true });
      window.dispatchEvent(new Event('scroll'));
    };
    toggle.addEventListener('click', () => (toggle.getAttribute('aria-expanded') === 'true' ? close() : open()));
    doc.addEventListener('keydown', (e) => {
      if (drawer.hidden) return;
      if (e.key === 'Escape') return close();
      if (e.key !== 'Tab') return;
      const f = [toggle, ...focusables()];
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && doc.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && doc.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });
    drawer.querySelectorAll('a[href]').forEach((a) => a.addEventListener('click', () => close(false)));
    window.matchMedia('(min-width: 64em)').addEventListener?.('change', (e) => e.matches && !drawer.hidden && close(false));
  }

  /* ---------- Home hero film: decorative video behind the hero, over its poster ----------
     Nothing is fetched until motion is allowed (no reduced-motion preference, no ?nomotion).
     The file matching the screen's aspect ratio is attached (a portrait crop where one is
     supplied, data-*-mobile; otherwise the one 16:9 file, which the CSS crops), the
     film fades in only once a frame has been presented, it pauses while the hero is
     offscreen or the tab is hidden, and if autoplay is refused or the file fails the
     poster simply stays. No controls, no play button, nothing focusable. */
  const film = doc.querySelector('[data-hero-film]');
  const filmVideo = film?.querySelector('video');
  if (film && filmVideo && typeof filmVideo.play === 'function') {
    const portrait = window.matchMedia('(max-aspect-ratio: 9/10)');
    const video = filmVideo;
    let variant = null; // 'portrait' | 'landscape' once sources are attached
    let inView = true;
    let retryArmed = false;
    let gone = false;
    video.muted = true;
    video.defaultMuted = true;
    const ready = () => film.classList.add('is-playing');
    const unready = () => film.classList.remove('is-playing');
    const allowed = () => !gone && !noMotion() && inView && !doc.hidden;
    const pause = () => {
      if (!video.paused) video.pause();
    };
    const teardown = () => {
      io?.disconnect();
      doc.removeEventListener('visibilitychange', sync);
      reduce.removeEventListener?.('change', sync);
      portrait.removeEventListener?.('change', sync);
    };
    const fail = () => {
      // No playable source or a network failure: keep the poster, drop the element so no broken-media box can appear
      gone = true;
      unready();
      teardown();
      video.remove();
    };
    const attach = () => {
      const d0 = video.dataset;
      const want = portrait.matches && (d0.mp4Mobile || d0.webmMobile) ? 'portrait' : 'landscape';
      if (variant === want) return;
      variant = want;
      unready();
      video.querySelectorAll('source').forEach((el) => el.remove());
      const d = video.dataset;
      const files = (want === 'portrait' ? [[d.webmMobile, 'video/webm'], [d.mp4Mobile, 'video/mp4']] : [[d.webm, 'video/webm'], [d.mp4, 'video/mp4']]).filter(([src]) => src);
      if (!files.length) return fail();
      files.forEach(([src, type], i) => {
        const source = doc.createElement('source');
        source.src = src;
        source.type = type;
        if (i === files.length - 1) source.addEventListener('error', fail); // the last candidate failing means nothing can play
        video.appendChild(source);
      });
      video.load();
    };
    const play = () => {
      if (!allowed()) return;
      attach();
      if (gone) return;
      const attempt = video.play();
      if (attempt && typeof attempt.catch === 'function') {
        attempt.catch((err) => {
          if (!err || err.name === 'AbortError') return; // paused or reloaded before it started: nothing to do
          if (err.name === 'NotSupportedError') return fail();
          // Autoplay refused (no gesture yet): the poster stays; one quiet retry on the first interaction
          if (!retryArmed) {
            retryArmed = true;
            const once = () => allowed() && video.play().catch(() => {});
            ['pointerdown', 'keydown', 'touchstart'].forEach((t) => doc.addEventListener(t, once, { once: true, passive: true }));
          }
        });
      }
    };
    const sync = () => {
      if (allowed()) play();
      else {
        pause();
        if (noMotion()) unready(); // reduced motion switched on: back to the still poster
      }
    };
    video.addEventListener('playing', () => {
      // Fade in only once a frame has actually been presented, never over a black box
      if (typeof video.requestVideoFrameCallback === 'function') video.requestVideoFrameCallback(ready);
      else ready();
    });
    video.addEventListener('error', fail);
    const io = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
      inView = entries.some((en) => en.isIntersecting);
      sync();
    }, { threshold: 0 }) : null;
    io?.observe(film);
    doc.addEventListener('visibilitychange', sync);
    reduce.addEventListener?.('change', sync);
    portrait.addEventListener?.('change', sync); // device rotated: swap to the better-framed file
    window.addEventListener('pagehide', (e) => {
      pause();
      if (!e.persisted) teardown();
    });
    window.addEventListener('pageshow', (e) => e.persisted && sync());
    sync();
  }

  /* ---------- Reveal ---------- */
  const reveal = () => {
    const items = doc.querySelectorAll('[data-reveal]');
    if (!('IntersectionObserver' in window) || noMotion()) {
      items.forEach((el) => el.classList.add('is-visible'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add('is-visible');
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.04 });
    items.forEach((el) => io.observe(el));
  };
  reveal();
  // Safety net: nothing stays hidden if something fails.
  setTimeout(() => doc.querySelectorAll('[data-reveal]:not(.is-visible)').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight) el.classList.add('is-visible');
  }), 2500);

  /* ---------- Tour filter chips ---------- */
  const chipBar = doc.querySelector('[data-filter]');
  if (chipBar) {
    const cards = doc.querySelectorAll('[data-categories]');
    const status = doc.querySelector('[data-filter-status]');
    const chips = chipBar.querySelectorAll('[data-filter-value]');
    const apply = (value) => {
      let shown = 0;
      chips.forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.filterValue === value)));
      cards.forEach((card) => {
        const show = value === 'all' || card.dataset.categories.split(' ').includes(value);
        card.hidden = !show;
        if (show) shown++;
      });
      if (status) status.textContent = `${shown} tour${shown === 1 ? '' : 's'} shown`;
    };
    chips.forEach((c) => c.addEventListener('click', () => apply(c.dataset.filterValue)));
    chipBar.hidden = false;
    const initial = decodeURIComponent(location.hash.slice(1));
    if (initial && Array.from(cards).some((c) => c.dataset.categories.split(' ').includes(initial))) apply(initial);
  }

  /* ---------- Tabs (tour detail): all panels stay visible without JS ---------- */
  doc.querySelectorAll('[data-tabs]').forEach((root) => {
    const list = root.querySelector('[role="tablist"]');
    const tabs = Array.from(root.querySelectorAll('[role="tab"]'));
    const panels = tabs.map((t) => doc.getElementById(t.getAttribute('aria-controls')));
    if (!list || !tabs.length || panels.some((p) => !p)) return;
    const select = (i, focus) => {
      tabs.forEach((t, j) => {
        const on = i === j;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        panels[j].hidden = !on;
      });
      if (focus) tabs[i].focus();
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(i, false));
      t.addEventListener('keydown', (e) => {
        const k = e.key;
        if (k === 'ArrowRight' || k === 'ArrowLeft' || k === 'Home' || k === 'End') {
          e.preventDefault();
          const n = k === 'Home' ? 0 : k === 'End' ? tabs.length - 1 : (i + (k === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
          select(n, true);
        }
      });
    });
    list.hidden = false;
    root.classList.add('is-enhanced');
    const fromHash = tabs.findIndex((t) => `#${t.getAttribute('aria-controls')}` === location.hash);
    select(fromHash > -1 ? fromHash : 0, false);
  });

  /* ---------- Plan carried from the home search (?date=&adults=&children=&pickup=): the tours
     page shows it and passes it on with every tour link; booking forms prefill from it ---------- */
  const params = new URLSearchParams(location.search);
  const plan = {};
  ['date', 'adults', 'children', 'pickup'].forEach((k) => {
    const v = (params.get(k) || '').trim().slice(0, 200);
    if (v) plan[k] = v;
  });
  if (Object.keys(plan).length) {
    doc.querySelectorAll('a[data-carry-plan]').forEach((a) => {
      const url = new URL(a.getAttribute('href'), location.href);
      Object.entries(plan).forEach(([k, v]) => url.searchParams.set(k, v));
      a.setAttribute('href', url.pathname + url.search + url.hash);
    });
    const planBar = doc.querySelector('[data-plan-bar]');
    const planText = planBar?.querySelector('[data-plan-text]');
    if (planText) {
      const parts = [];
      const adults = Number(plan.adults);
      const children = Number(plan.children);
      if (adults) parts.push(`${adults} adult${adults === 1 ? '' : 's'}`);
      if (children) parts.push(`${children} child${children === 1 ? '' : 'ren'}`);
      const date = /^\d{4}-\d{2}-\d{2}$/.test(plan.date || '') ? new Date(`${plan.date}T12:00:00`) : null;
      if (date && !Number.isNaN(date.getTime())) parts.push(date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }));
      if (plan.pickup) parts.push(`from ${plan.pickup}`);
      if (parts.length) {
        planText.textContent = `Planning for ${parts.join(' · ')}`;
        planBar.hidden = false;
      }
    }
    doc.querySelectorAll('[data-plan-field]').forEach((input) => {
      const v = plan[input.name];
      if (v === undefined) return;
      if (input.type === 'number') {
        const n = Number(v);
        if (!Number.isInteger(n)) return;
        input.value = String(Math.min(Number(input.max) || n, Math.max(Number(input.min) || 0, n)));
      } else input.value = v;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    // Booking-card forms carry the pickup area along even though they have no pickup field.
    doc.querySelectorAll('form[data-plan-form]').forEach((form) => {
      if (plan.pickup && !form.elements.pickup) {
        const hidden = doc.createElement('input');
        hidden.type = 'hidden';
        hidden.name = 'pickup';
        hidden.value = plan.pickup;
        form.appendChild(hidden);
      }
    });
  }

  /* ---------- Date fields: today to three years ahead (the booking schema's rule) ---------- */
  const isoLocal = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  doc.querySelectorAll('input[type="date"][data-date-limits]').forEach((input) => {
    const now = new Date();
    input.min = isoLocal(now);
    input.max = `${now.getFullYear() + 3}${input.min.slice(4)}`;
  });

  /* ---------- Travellers field: a button opens a popover with adult and children counters
     writing to the real inputs; without JavaScript the inputs are shown as-is ---------- */
  doc.querySelectorAll('[data-travellers]').forEach((root) => {
    const toggleBtn = root.querySelector('[data-travellers-toggle]');
    const pop = root.querySelector('[data-travellers-pop]');
    const label = root.querySelector('[data-travellers-label]');
    const live = root.querySelector('[data-travellers-live]');
    const inputs = Array.from(root.querySelectorAll('input[data-counter-input]'));
    if (!toggleBtn || !pop || !inputs.length) return;
    const noun = (n, one, many) => `${n} ${n === 1 ? one : many}`;
    const text = () => {
      const a = Number(inputs.find((i) => i.name === 'adults')?.value) || 0;
      const c = Number(inputs.find((i) => i.name === 'children')?.value) || 0;
      return c ? `${noun(a, 'adult', 'adults')} · ${noun(c, 'child', 'children')}` : noun(a, 'adult', 'adults');
    };
    const syncOne = (input) => {
      const n = Number(input.value);
      const row = input.closest('[data-counter-row]') || root;
      row.querySelector('[data-counter="-1"]')?.setAttribute('aria-disabled', String(n <= Number(input.min)));
      row.querySelector('[data-counter="1"]')?.setAttribute('aria-disabled', String(n >= Number(input.max)));
    };
    const sync = () => {
      inputs.forEach(syncOne);
      if (label) label.textContent = text();
    };
    const open = () => {
      pop.hidden = false;
      toggleBtn.setAttribute('aria-expanded', 'true');
      pop.querySelector('button, input')?.focus({ preventScroll: true });
    };
    const close = (focus = true) => {
      if (pop.hidden) return;
      pop.hidden = true;
      toggleBtn.setAttribute('aria-expanded', 'false');
      if (focus) toggleBtn.focus({ preventScroll: true });
    };
    pop.hidden = true;
    toggleBtn.hidden = false;
    toggleBtn.setAttribute('aria-expanded', 'false');
    toggleBtn.addEventListener('click', () => (pop.hidden ? open() : close()));
    root.querySelector('[data-travellers-done]')?.addEventListener('click', () => close());
    root.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-counter]');
      if (!btn || btn.getAttribute('aria-disabled') === 'true') return;
      const input = root.querySelector(`#${btn.getAttribute('aria-controls')}`);
      if (!input) return;
      const n = Math.min(Number(input.max), Math.max(Number(input.min), (Number(input.value) || 0) + Number(btn.dataset.counter)));
      input.value = String(n);
      sync();
      if (live) live.textContent = text();
    });
    inputs.forEach((i) => i.addEventListener('input', sync));
    doc.addEventListener('click', (e) => {
      if (!root.contains(e.target)) close(false);
    });
    root.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !pop.hidden) {
        e.preventDefault();
        close();
      }
    });
    sync();
  });

  /* ---------- Contact bar (phones and tablets, every page once WhatsApp is verified):
     visible from the start, and out of the way while a text field has focus so the
     on-screen keyboard never pushes it over what you are typing ---------- */
  const contactBar = doc.querySelector('[data-contact-bar]');
  if (contactBar) {
    // Text entry only: pickers (date, time, select) and buttons bring up no keyboard.
    const typing = () => !!doc.activeElement?.matches('input:is(:not([type]), [type="text"], [type="email"], [type="tel"], [type="search"], [type="url"], [type="number"], [type="password"]), textarea');
    // On the home page the bar waits until the hero has scrolled away, so the approved hero is never covered
    const hero = contactBar.hasAttribute('data-contact-bar-after-hero') ? doc.querySelector('.hero') : null;
    let heroInView = !!hero;
    const sync = () => contactBar.classList.toggle('is-visible', !heroInView && !typing());
    doc.addEventListener('focusin', sync);
    doc.addEventListener('focusout', () => setTimeout(sync, 0));
    if (hero && 'IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        heroInView = entries[0].isIntersecting;
        sync();
      }).observe(hero);
    } else {
      heroInView = false;
      sync();
    }
  }

  /* ---------- Mobile enquiry bar: appears once the page hero has scrolled away ---------- */
  const mobileCta = doc.querySelector('[data-mobile-cta]');
  if (mobileCta) {
    const anchor = doc.querySelector('[data-mobile-cta-after]') || doc.querySelector('main > :first-child');
    if ('IntersectionObserver' in window && anchor) {
      new IntersectionObserver((entries) => {
        mobileCta.classList.toggle('is-visible', !entries[0].isIntersecting);
      }).observe(anchor);
    } else {
      mobileCta.classList.add('is-visible');
    }
  }
})();
