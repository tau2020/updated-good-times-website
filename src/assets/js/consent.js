/* Good Times in Cape Town: the analytics choice (no dependencies)
   Cloudflare Web Analytics loads only after the visitor allows it. The page
   carries the site token in <meta name="gt-analytics"> (production builds
   only); without it nothing here runs and the choice is never offered.
   - every visitor is asked once; Allow and Decline weigh the same
   - the answer is kept in localStorage (gt:consent), so it is not asked on
     every page; "Analytics settings" in the footer changes it at any time
   - the beacon is the one script file the CSP allows from another site
     (ANALYTICS_BEACON in src/partials/security.mjs) */
(function () {
  'use strict';
  const doc = document;
  const meta = doc.querySelector('meta[name="gt-analytics"]');
  const token = meta ? meta.content.trim() : '';
  const banner = doc.querySelector('[data-consent]');
  if (!token || !banner) return;

  const BEACON = 'https://static.cloudflareinsights.com/beacon.min.js';
  const KEY = 'gt:consent';
  const settings = doc.querySelector('[data-consent-settings]');
  const opener = settings && settings.querySelector('[data-consent-open]');
  const status = banner.querySelector('[data-consent-status]');
  const buttons = [...banner.querySelectorAll('[data-consent-choice]')];

  const read = () => {
    try {
      const v = JSON.parse(window.localStorage.getItem(KEY) || 'null');
      return v && v.v === 1 && (v.analytics === 'granted' || v.analytics === 'denied') ? v.analytics : null;
    } catch (e) {
      return null;
    }
  };
  let choice = read();
  const save = (value) => {
    choice = value;
    try {
      window.localStorage.setItem(KEY, JSON.stringify({ v: 1, analytics: value, at: new Date().toISOString() }));
    } catch (e) {
      /* Storage blocked: the answer holds for this page only, and the question comes back on the next. */
    }
  };

  let loaded = false;
  const load = () => {
    if (loaded) return;
    loaded = true;
    const s = doc.createElement('script');
    s.defer = true;
    s.src = BEACON;
    s.setAttribute('data-cf-beacon', JSON.stringify({ token }));
    doc.head.appendChild(s);
  };

  /* ---------- the banner ---------- */
  let reopened = false;
  const show = (fromSettings) => {
    reopened = fromSettings;
    for (const b of buttons) {
      if (fromSettings && choice) b.setAttribute('aria-pressed', String(b.dataset.consentChoice === choice));
      else b.removeAttribute('aria-pressed');
    }
    if (status) {
      status.textContent = fromSettings && choice ? (choice === 'granted' ? 'Visit statistics are on.' : 'Visit statistics are off.') : '';
      status.hidden = !status.textContent;
    }
    banner.hidden = false;
    // Asked on arrival, it never takes the focus; opened from the footer, it does, and gives it back.
    if (fromSettings) {
      banner.tabIndex = -1;
      banner.focus();
    }
  };
  const hide = () => {
    banner.hidden = true;
    if (reopened && opener) opener.focus();
    reopened = false;
  };

  for (const b of buttons) {
    b.addEventListener('click', () => {
      save(b.dataset.consentChoice);
      if (choice === 'granted') load();
      hide();
    });
  }
  banner.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && reopened) hide();
  });
  if (settings && opener) {
    settings.hidden = false;
    opener.addEventListener('click', () => show(true));
  }

  if (choice === 'granted') load();
  else if (!choice) show(false);
})();
