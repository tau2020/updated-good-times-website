/* Good Times in Cape Town — the Travel Concierge, every page from 64em
   The trigger in the header bar opens a sheet at the right of the page, which dims and softens behind it. The sheet
   opens vertically (owner, 25 Oct 2026): it unfolds downward from its top edge and folds back up to close. The sheet is a modal dialog: focus moves to the first service and stays inside the sheet (Tab and
   Shift+Tab wrap), the page behind cannot scroll, and Escape, the close button or a click on the dimmed page closes it
   and returns focus to the trigger. Choosing a link closes it on the way. GSAP tweens the fold (a clip from the
   bottom edge) from wherever it is, so an interrupted open or close simply turns round; the contents follow in a
   short stagger. Without motion
   (reduced motion, ?nomotion) or without GSAP it opens and closes at once. Below 64em the trigger is not shown and
   the mobile menu (main.js) carries the same four services. Nothing here touches the hero or the header's own
   elements beyond the trigger. */
(function () {
  'use strict';
  var doc = document;
  var html = doc.documentElement;
  var root = doc.querySelector('[data-concierge-root]');
  var toggle = root && root.querySelector('[data-concierge-toggle]');
  var panel = doc.querySelector('[data-concierge-panel]');
  var sheet = panel && panel.querySelector('[data-concierge-clip]');
  var backdrop = panel && panel.querySelector('[data-concierge-backdrop]');
  var closer = panel && panel.querySelector('[data-concierge-close]');
  if (!toggle || !panel || !sheet || !backdrop) return;

  var gsap = window.gsap;
  var desktop = window.matchMedia('(min-width: 64em)');
  var motion = function () {
    return !!gsap && html.classList.contains('cine');
  };
  var open = false;
  // The fold: the whole sheet, or none of it below its top edge
  var OPEN = 'inset(0% 0% 0% 0%)';
  var FOLDED = 'inset(0% 0% 100% 0%)';
  var focusables = function () {
    return Array.prototype.filter.call(sheet.querySelectorAll('a[href], button:not([disabled])'), function (el) {
      return el.offsetParent !== null || el === closer;
    });
  };
  var parts = function () {
    return sheet.querySelectorAll('.gt-concierge-panel__head, .gt-concierge-panel__services > li, .gt-concierge-panel__index, .gt-concierge-panel__book, .gt-concierge-panel__reach');
  };

  var show = function () {
    if (open) return;
    open = true;
    panel.hidden = false;
    html.classList.add('is-concierge-open');
    toggle.setAttribute('aria-expanded', 'true');
    var first = sheet.querySelector('.lc-invite__name a') || focusables()[0];
    if (first) first.focus({ preventScroll: true });
    if (!motion()) {
      gsap && gsap.set([sheet, backdrop], { clearProps: 'clipPath,opacity' });
      return;
    }
    gsap.killTweensOf([sheet, backdrop]);
    // From wherever an interrupted close left it, or folded up to its top edge
    if (!sheet.style.clipPath) gsap.set(sheet, { clipPath: FOLDED });
    if (!backdrop.style.opacity) gsap.set(backdrop, { opacity: 0 });
    gsap.to(sheet, { clipPath: OPEN, duration: 0.55, ease: 'power3.out', clearProps: 'clipPath' });
    gsap.to(backdrop, { opacity: 1, duration: 0.4, ease: 'power1.out', clearProps: 'opacity' });
    // Opacity and a small rise only: hiding with visibility would take focus away from the first service
    gsap.fromTo(parts(), { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out', stagger: 0.04, delay: 0.14, clearProps: 'opacity,transform' });
  };

  var hide = function (restoreFocus) {
    if (!open) return;
    open = false;
    toggle.setAttribute('aria-expanded', 'false');
    if (restoreFocus) toggle.focus({ preventScroll: true });
    var done = function () {
      if (open) return;
      panel.hidden = true;
      html.classList.remove('is-concierge-open');
      if (gsap) gsap.set([sheet, backdrop], { clearProps: 'clipPath,opacity' });
    };
    if (!motion()) return done();
    gsap.killTweensOf([sheet, backdrop]);
    if (!sheet.style.clipPath) gsap.set(sheet, { clipPath: OPEN });
    gsap.to(sheet, { clipPath: FOLDED, duration: 0.38, ease: 'power2.in', onComplete: done });
    gsap.to(backdrop, { opacity: 0, duration: 0.34, ease: 'power1.in' });
  };

  toggle.hidden = false;
  toggle.addEventListener('click', function () {
    open ? hide(false) : show();
  });
  if (closer) {
    closer.addEventListener('click', function () {
      hide(true);
    });
  }
  backdrop.addEventListener('click', function () {
    hide(true);
  });

  doc.addEventListener('keydown', function (e) {
    if (!open) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      hide(true);
      return;
    }
    if (e.key !== 'Tab') return;
    // A modal sheet: focus wraps inside it
    var list = focusables();
    if (!list.length) return;
    var first = list[0];
    var last = list[list.length - 1];
    if (e.shiftKey && (doc.activeElement === first || !sheet.contains(doc.activeElement))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (doc.activeElement === last || !sheet.contains(doc.activeElement))) {
      e.preventDefault();
      first.focus();
    }
  });
  // Choosing a destination closes the sheet (a same-page link included)
  sheet.addEventListener('click', function (e) {
    if (e.target.closest('a[href]')) hide(false);
  });
  window.addEventListener(
    'resize',
    function () {
      if (open && !desktop.matches) hide(false);
    },
    { passive: true },
  );
  window.addEventListener('pagehide', function () {
    hide(false);
  });

  window.__concierge = {
    open: show,
    close: hide,
    isOpen: function () {
      return open;
    },
  };
})();
