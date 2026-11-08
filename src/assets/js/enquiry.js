/* Good Times in Cape Town: enquiry wizard (enquire/ only)
   Loaded as an ES module. Validation is shared with the API through
   ./enquiry-schema.js, so the browser and the server always agree.

   - four panels: Service → Details (tour or transfer) → Contact → Review & send;
     the stepper counts the three after the choice, which prefilled links skip
   - inline calendars mirror the native date inputs; a total row shows the
     indicative total from the published group rate (never an amount due)
   - focus moves to each new step's heading; per-field errors use aria-invalid
     and aria-describedby, plus an error summary with links to the fields
   - draft kept in sessionStorage (gt:enquiry:draft), restored on reload,
     cleared once Good Times has confirmed receipt
   - prefill: ?type=tour&tour=<slug|package|custom>[&nights&date&adults&children&pickup]
              ?type=transfer[&transfer=<type>][&pickup_location&destination&transfer_date&adults&children]
              ?next=/users/book/<slug>/ (the old booking site's sign-in links, redirected here)
   - multi-day packages travel the tour path: their own summary card, a nights
     choice, "Multi-day tour" in the summaries
   - preview mode: no network request at all; the result says so plainly
   - live mode: POST JSON; a GT- reference is shown only after a real 201
     (or a 409 that names the enquiry already received)
   - availability (live mode): the calendars grey out fully booked dates
     (GET /api/availability), Next on the details step asks the server whether
     the date and time are still free (POST /api/availability), and a 409
     "unavailable" on send points at the field to change. If availability
     cannot be reached the form carries on: the server checks again on send. */
import { validateEnquiry, TOUR_SLUGS, PACKAGE_SLUGS, CUSTOM_TOUR, TRANSFER_TYPES, FLIGHT_REQUIRED_TYPES, todayInSast, earliestDate, stepOf, BOOKING_RULES } from './enquiry-schema.js';
import { display, onCurrencyChange } from './currency.js';
import { enhancePhone, enhanceCountry } from './country-pickers.js';

const root = document.querySelector('[data-enquiry]');
if (root) {
  try {
    init(root);
  } catch (err) {
    console.error('[enquiry]', err);
    root.classList.add('is-fallback');
  }
}

function init(root) {
  const DRAFT_KEY = 'gt:enquiry:draft';
  const ORDER = ['service', 'details', 'contact', 'review'];
  const AIRPORT = 'Cape Town International Airport (CPT)';
  const METHOD = { email: 'Email', whatsapp: 'WhatsApp', phone: 'Phone call' };

  const cfg = JSON.parse(document.getElementById('enquiry-config')?.textContent || '{}');
  const live = cfg.mode === 'live';
  const prefix = String(cfg.referencePrefix || 'GT-').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const REF_RE = new RegExp(`^${prefix}[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$`);

  const form = root.querySelector('[data-enquiry-form]');
  const panels = {
    service: form.querySelector('[data-wizard-step="service"]'),
    tour: form.querySelector('[data-wizard-step="details"][data-path="tour"]'),
    transfer: form.querySelector('[data-wizard-step="details"][data-path="transfer"]'),
    contact: form.querySelector('[data-wizard-step="contact"]'),
    review: form.querySelector('[data-wizard-step="review"]'),
  };
  const progress = root.querySelector('[data-progress]');
  const liveRegion = root.querySelector('[data-live]');
  const submitBtn = form.querySelector('[data-submit]');
  const submitLabel = form.querySelector('[data-submit-label]');
  const submitError = form.querySelector('[data-submit-error]');
  const offlineNote = root.querySelector('[data-offline]');
  const asideList = document.querySelector('[data-aside-list]');
  const pageTitle = document.querySelector('[data-page-title]');
  const defaultTitle = pageTitle?.textContent || '';
  // Without motion (a reduced-motion preference, or ?nomotion as everywhere else on the site) every scroll is instant.
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches || /[?&]nomotion\b/.test(location.search);
  const state = { step: 'service', busy: false, done: false, checking: false };
  // The calling-code button beside the phone number (country-pickers.js), once the form is ready.
  let phoneUi = null;

  /* ---------- storage (best effort; never throws) ---------- */
  const store = {
    read() {
      try {
        const v = JSON.parse(window.sessionStorage.getItem(DRAFT_KEY) || 'null');
        return v && v.v === 1 ? v : null;
      } catch {
        return null;
      }
    },
    write(obj) {
      try {
        window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(obj));
      } catch {
        /* private mode or quota: the draft is a convenience only */
      }
    },
    clear() {
      try {
        window.sessionStorage.removeItem(DRAFT_KEY);
      } catch {
        /* ignore */
      }
    },
  };

  const newKey = () => {
    try {
      if (crypto.randomUUID) return crypto.randomUUID();
      const a = new Uint8Array(16);
      crypto.getRandomValues(a);
      return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      return `k${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`.padEnd(20, '0');
    }
  };

  const draft = store.read();
  const HONEYPOT = 'gt_hp_check';
  const session = { key: draft?.key || newKey(), search: draft?.search ?? null };

  /* ---------- time on the form ----------
     Measured with performance.now() (monotonic: a wrong device clock cannot
     affect it) from the moment the form became interactive, plus any time
     already spent in earlier page loads of this draft. Sent as elapsed_ms. */
  const clock = { before: Number.isFinite(draft?.elapsedBefore) && draft.elapsedBefore >= 0 ? draft.elapsedBefore : 0, t0: performance.now() };
  const elapsedMs = () => Math.max(0, Math.round(clock.before + (performance.now() - clock.t0)));
  const resetClock = () => {
    clock.before = 0;
    clock.t0 = performance.now();
  };

  /* ---------- reading and writing panels ---------- */
  const controls = (panel) => [...panel.querySelectorAll('input[name], select[name], textarea[name]')].filter((el) => el.name !== HONEYPOT);
  const isShown = (el) => {
    let n = el.closest('[data-show-if]');
    while (n) {
      if (n.hidden) return false;
      n = n.parentElement?.closest('[data-show-if]');
    }
    return true;
  };

  /** Values of one panel. Hidden conditional fields read as blank unless `all` (for the draft). */
  function readPanel(panel, { all = false } = {}) {
    const out = {};
    for (const el of controls(panel)) {
      const shown = all || isShown(el);
      if (el.type === 'radio') {
        if (!(el.name in out)) out[el.name] = '';
        if (el.checked && shown) out[el.name] = el.value;
      } else if (el.type === 'checkbox') out[el.name] = shown ? el.checked : false;
      else out[el.name] = shown ? el.value : '';
    }
    return out;
  }

  function writePanel(panel, vals) {
    if (!panel || !vals || typeof vals !== 'object') return;
    for (const el of controls(panel)) {
      if (!(el.name in vals)) continue;
      const v = vals[el.name];
      if (el.type === 'radio') el.checked = v === el.value;
      else if (el.type === 'checkbox') el.checked = Boolean(v);
      else if (typeof v === 'string' || typeof v === 'number') el.value = String(v);
    }
  }

  const raw = (panel, name) => {
    const els = panel.querySelectorAll(`[name="${name}"]`);
    if (!els.length) return '';
    if (els[0].type === 'radio') return [...els].find((e) => e.checked)?.value || '';
    if (els[0].type === 'checkbox') return els[0].checked;
    return els[0].value;
  };
  const setRadio = (panel, name, value) => panel.querySelectorAll(`[name="${name}"]`).forEach((r) => (r.checked = r.value === value));

  const type = () => raw(panels.service, 'enquiry_type');
  const detailsPanel = () => (type() === 'tour' || type() === 'transfer' ? panels[type()] : null);
  const panelFor = (step) => (step === 'details' ? detailsPanel() : panels[step]);
  const sectionFor = (step) => (step === 'details' ? type() : step);

  function values() {
    const d = detailsPanel();
    const contact = readPanel(panels.contact);
    // The number as it will be sent: with the chosen country's code in front (the field itself changes on blur only).
    if (phoneUi && contact.phone) contact.phone = phoneUi.compose(contact.phone);
    return { ...readPanel(panels.service), ...(d ? readPanel(d) : {}), ...contact };
  }

  function persist() {
    if (state.done) return;
    store.write({
      v: 1,
      key: session.key,
      elapsedBefore: elapsedMs(),
      search: session.search,
      step: state.step,
      panels: {
        service: readPanel(panels.service, { all: true }),
        tour: readPanel(panels.tour, { all: true }),
        transfer: readPanel(panels.transfer, { all: true }),
        contact: readPanel(panels.contact, { all: true }),
      },
    });
  }
  let persistTimer;
  const persistSoon = () => {
    clearTimeout(persistTimer);
    persistTimer = setTimeout(persist, 250);
  };

  /* ---------- live region ---------- */
  let announceTimer;
  const announce = (msg) => {
    if (!liveRegion) return;
    liveRegion.textContent = '';
    clearTimeout(announceTimer);
    announceTimer = setTimeout(() => (liveRegion.textContent = msg), 60);
  };

  /* ---------- conditional fields and dynamic requirements ---------- */
  function evalCond(cond, panel) {
    let m = /^(\w+)>(\d+)$/.exec(cond);
    if (m) return Number(raw(panel, m[1])) > Number(m[2]);
    m = /^(\w+)=(.+)$/.exec(cond);
    if (m) return m[2].split('|').includes(raw(panel, m[1]));
    return raw(panel, cond) === true;
  }

  function syncConditional() {
    for (const panel of [panels.tour, panels.transfer, panels.contact]) {
      for (const el of panel.querySelectorAll('[data-show-if]')) {
        const show = evalCond(el.dataset.showIf, panel);
        if (el.hidden === show) {
          el.hidden = !show;
          if (!show) el.querySelectorAll('[data-error-for]').forEach((e) => clearFieldError(panel, e.dataset.errorFor));
        }
      }
    }
    syncRequired();
  }

  function setDynamic(panel, name, required) {
    const wrap = panel.querySelector(`[data-dynamic="${name}"]`);
    if (!wrap) return;
    const tag = wrap.querySelector('[data-optional-tag]');
    if (tag) tag.hidden = required;
    const input = wrap.querySelector(`[name="${name}"]`);
    if (required) input?.setAttribute('aria-required', 'true');
    else input?.removeAttribute('aria-required');
  }

  function syncRequired() {
    const method = raw(panels.contact, 'preferred_contact_method');
    setDynamic(panels.contact, 'phone', method === 'whatsapp' || method === 'phone');
    setDynamic(panels.transfer, 'flight_number', FLIGHT_REQUIRED_TYPES.includes(raw(panels.transfer, 'transfer_type')));
    setDynamic(panels.tour, 'preferred_date', !raw(panels.tour, 'dates_flexible'));
  }

  /** Airport transfers: fill the airport end of the route (only if empty or still our own suggestion). */
  function airportAutofill() {
    const t = raw(panels.transfer, 'transfer_type');
    const pick = panels.transfer.querySelector('[name="pickup_location"]');
    const dest = panels.transfer.querySelector('[name="destination"]');
    const set = (el) => {
      if (!el.value.trim() || el.value === AIRPORT) el.value = AIRPORT;
    };
    const unset = (el) => {
      if (el.value === AIRPORT) el.value = '';
    };
    if (t === 'airport-arrival') {
      set(pick);
      unset(dest);
    } else if (t === 'airport-departure') {
      set(dest);
      unset(pick);
    } else {
      unset(pick);
      unset(dest);
    }
  }

  function setDateLimits() {
    const today = todayInSast();
    // The first date that meets the minimum notice (BOOKING_RULES); the server applies the same rule.
    const earliest = earliestDate();
    const max = `${Number(today.slice(0, 4)) + 3}${today.slice(4)}`;
    form.querySelectorAll('input[type="date"]').forEach((i) => {
      i.min = earliest;
      i.max = max;
    });
    const out = raw(panels.transfer, 'transfer_date');
    const ret = panels.transfer.querySelector('[name="return_date"]');
    if (ret) ret.min = out && out > earliest ? out : earliest;
    renderCalendars();
  }

  /* ---------- availability (live mode only) ---------- */
  const AVAILABILITY = cfg.availabilityEndpoint || '/api/availability';
  const booked = new Map(); // 'YYYY-MM' → { full: Set, closed: Set }
  const asked = new Set();

  /** The month's fully booked dates, once loaded; asks the server the first time (the calendars re-render when it answers). */
  function bookedIn(month) {
    if (!live) return null;
    if (!booked.has(month) && !asked.has(month)) {
      asked.add(month);
      fetch(`${AVAILABILITY}?month=${month}`, { credentials: 'same-origin' })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .then((b) => {
          booked.set(month, { full: new Set(b.full || []), closed: new Set(b.closed || []) });
          renderCalendars();
        })
        .catch(() => asked.delete(month)); // offline or busy: no dates greyed out; the server still checks
    }
    return booked.get(month) || null;
  }

  /** Forget what is known about a month (after the server says a date is taken). */
  function forgetBooked(date) {
    const month = String(date || '').slice(0, 7);
    booked.delete(month);
    asked.delete(month);
    renderCalendars();
  }

  /**
   * Ask the server whether the details step's date and time are still free.
   * Resolves { field, error } when they are not, null otherwise (including when
   * the server cannot be asked: sending checks again).
   */
  async function checkAvailability() {
    try {
      const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
      const timer = ctrl ? setTimeout(() => ctrl.abort(), 8000) : null;
      const res = await fetch(AVAILABILITY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values()),
        credentials: 'same-origin',
        signal: ctrl?.signal,
      });
      clearTimeout(timer);
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.available === false && body.field && body.error) return { field: body.field, error: body.error };
    } catch {
      /* unreachable: carry on */
    }
    return null;
  }

  /* ---------- counters ---------- */
  function syncCounter(input) {
    const n = parseInt(input.value, 10);
    const wrap = input.closest('.counter');
    wrap.querySelector('[data-counter="-1"]')?.setAttribute('aria-disabled', String(Number.isFinite(n) && n <= Number(input.dataset.min)));
    wrap.querySelector('[data-counter="1"]')?.setAttribute('aria-disabled', String(Number.isFinite(n) && n >= Number(input.dataset.max)));
  }

  function stepCounter(btn) {
    const input = document.getElementById(btn.getAttribute('aria-controls'));
    if (!input || btn.getAttribute('aria-disabled') === 'true') return;
    const min = Number(input.dataset.min);
    const max = Number(input.dataset.max);
    let n = parseInt(input.value, 10);
    if (!Number.isFinite(n)) n = min;
    n = Math.min(max, Math.max(min, n + Number(btn.dataset.counter)));
    input.value = String(n);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    announce(`${input.dataset.noun.charAt(0).toUpperCase()}${input.dataset.noun.slice(1)}: ${n}`);
  }

  /* ---------- errors ---------- */
  function controlFor(panel, name) {
    const group = panel?.querySelector(`[data-group="${name}"]`);
    if (group) {
      const inputs = [...group.querySelectorAll(`input[name="${name}"]`)];
      return { group, inputs, focusEl: inputs.find((i) => i.checked) || inputs[0], wrap: group };
    }
    const el = panel?.querySelector(`[name="${name}"]`);
    return el ? { group: null, inputs: [el], focusEl: el, wrap: el.closest('.field') } : null;
  }

  const describe = (el, id, on) => {
    const ids = (el.getAttribute('aria-describedby') || '').split(/\s+/).filter((x) => x && x !== id);
    if (on) ids.push(id);
    if (ids.length) el.setAttribute('aria-describedby', ids.join(' '));
    else el.removeAttribute('aria-describedby');
  };

  function setFieldError(panel, name, msg) {
    const c = controlFor(panel, name);
    const err = panel?.querySelector(`[data-error-for="${name}"]`);
    if (!c || !err) return false;
    err.querySelector('[data-error-text]').textContent = msg;
    err.hidden = false;
    describe(c.group || c.inputs[0], err.id, true);
    c.inputs.forEach((i) => i.setAttribute('aria-invalid', 'true'));
    c.wrap?.classList.add('is-invalid');
    return true;
  }

  function clearFieldError(panel, name) {
    const c = controlFor(panel, name);
    const err = panel?.querySelector(`[data-error-for="${name}"]`);
    if (err) {
      err.hidden = true;
      err.querySelector('[data-error-text]').textContent = '';
    }
    if (!c) return;
    if (err) describe(c.group || c.inputs[0], err.id, false);
    c.inputs.forEach((i) => i.removeAttribute('aria-invalid'));
    c.wrap?.classList.remove('is-invalid');
    const link = panel.querySelector(`[data-error-list] a[data-field="${name}"]`);
    if (link) {
      const list = link.closest('[data-error-list]');
      link.parentElement.remove();
      if (!list.children.length) list.closest('[data-error-summary]').hidden = true;
    }
  }

  function clearPanelErrors(panel) {
    if (!panel) return;
    panel.querySelectorAll('[data-error-for]').forEach((e) => clearFieldError(panel, e.dataset.errorFor));
    const box = panel.querySelector('[data-error-summary]');
    if (box) {
      box.hidden = true;
      box.querySelector('[data-error-list]').replaceChildren();
    }
  }

  function showErrors(panel, errors, { focus = true } = {}) {
    clearPanelErrors(panel);
    const entries = Object.entries(errors).filter(([name, msg]) => setFieldError(panel, name, msg));
    entries.sort(([a], [b]) => {
      const pos = controlFor(panel, a).focusEl.compareDocumentPosition(controlFor(panel, b).focusEl);
      return pos & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    });
    const box = panel.querySelector('[data-error-summary]');
    const list = box.querySelector('[data-error-list]');
    for (const [name, msg] of entries) {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = `#${controlFor(panel, name).focusEl.id}`;
      a.dataset.field = name;
      a.textContent = msg;
      li.append(a);
      list.append(li);
    }
    box.hidden = entries.length === 0;
    if (focus && entries.length) {
      box.focus({ preventScroll: true });
      box.scrollIntoView({ block: 'center', behavior: reduce ? 'instant' : 'smooth' });
    }
    return entries.length;
  }

  /** Re-check one step after an edit, clearing errors that are now fixed (never adding new ones while typing). */
  function recheck(panel) {
    if (!panel || !panel.querySelector('[data-error-for]:not([hidden])')) return;
    const step = panel.dataset.wizardStep;
    const r = validateEnquiry(values(), { section: sectionFor(step) });
    panel.querySelectorAll('[data-error-for]:not([hidden])').forEach((e) => {
      const name = e.dataset.errorFor;
      if (!r.errors[name]) clearFieldError(panel, name);
      else if (r.errors[name] !== e.querySelector('[data-error-text]').textContent) {
        e.querySelector('[data-error-text]').textContent = r.errors[name];
        const link = panel.querySelector(`[data-error-list] a[data-field="${name}"]`);
        if (link) link.textContent = r.errors[name];
      }
    });
  }

  const firstErrorStep = (errors) => ORDER.find((s) => Object.keys(errors).some((k) => stepOf(k) === s)) || null;
  const errorsFor = (errors, step) => Object.fromEntries(Object.entries(errors).filter(([k]) => stepOf(k) === step));

  /* ---------- formatting for the summaries ---------- */
  const fmtDate = (iso) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    if (!m) return '';
    try {
      return new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])));
    } catch {
      return iso;
    }
  };
  const when = (d, t) => (d ? `${fmtDate(d)}${t ? `, ${t} SAST` : ''}` : '');
  const party = (a, c) => {
    const out = [];
    const na = Number(a) || 0;
    const nc = Number(c) || 0;
    if (na) out.push(`${na} adult${na === 1 ? '' : 's'}`);
    if (nc) out.push(`${nc} child${nc === 1 ? '' : 'ren'}`);
    return out.join(', ');
  };
  const short = (s) => {
    const t = String(s || '').trim();
    if (/cape town international|\bCPT\b|airport/i.test(t)) return 'CPT airport';
    const first = t.split(',')[0].trim();
    return first.length > 26 ? `${first.slice(0, 25)}…` : first;
  };
  const isPackage = (slug) => PACKAGE_SLUGS.includes(slug);
  const typeLabel = (t, slug) => (t === 'tour' ? (isPackage(slug) ? 'Multi-day tour' : 'Private tour') : t === 'transfer' ? 'Transfer request' : '');
  const nightsText = (n) => (Number(n) ? `${Number(n)} night${Number(n) === 1 ? '' : 's'}` : 'Not sure yet');

  function summaryModel(v) {
    const sections = [{ step: 'service', title: 'Service', rows: [['Request', typeLabel(v.enquiry_type, v.tour_slug)]] }];
    if (v.enquiry_type === 'tour') {
      const date = v.preferred_date ? `${fmtDate(v.preferred_date)}${v.dates_flexible ? ' (flexible)' : ''}` : v.dates_flexible ? 'Flexible' : '';
      const pkg = isPackage(v.tour_slug);
      sections.push({
        step: 'details',
        title: pkg ? 'Multi-day tour details' : 'Tour details',
        rows: [
          [pkg ? 'Multi-day tour' : 'Tour', cfg.tours?.[v.tour_slug] || ''],
          [pkg ? 'Start date' : 'Date', date],
          ['Dates that could work', v.flexible_dates],
          ...(pkg ? [['Nights', nightsText(v.nights)]] : []),
          ['Group', party(v.adults, v.children)],
          ['Children’s ages', v.children_ages],
          ['Pickup', v.pickup_area],
          ['Special requests', v.special_requests],
        ],
      });
    } else if (v.enquiry_type === 'transfer') {
      const luggage = [Number(v.suitcases) ? `${v.suitcases} suitcase${Number(v.suitcases) === 1 ? '' : 's'}` : '', v.oversized_items].filter(Boolean).join('; ');
      sections.push({
        step: 'details',
        title: 'Transfer details',
        rows: [
          ['Type', cfg.transferTypes?.[v.transfer_type] || ''],
          ['Pickup', v.pickup_location],
          ['Destination', v.destination],
          ['Date and time', when(v.transfer_date, v.transfer_time)],
          ['Flight', v.flight_number],
          ['Passengers', party(v.adults, v.children)],
          ['Child seats', v.child_seats],
          ['Luggage', luggage],
          ['Return', v.return_trip ? when(v.return_date, v.return_time) : 'No return transfer'],
          ['Notes', v.notes],
        ],
      });
    }
    sections.push({
      step: 'contact',
      title: 'Contact details',
      rows: [
        ['Name', v.name],
        ['Email', v.email],
        ['Phone', v.phone],
        ['Reply by', METHOD[v.preferred_contact_method] || ''],
        ['Country', v.country],
        ['Consent', v.consent ? 'You agreed that Good Times in Cape Town may use these details to reply.' : ''],
        ['Terms', v.terms ? 'You agreed to the Terms & Conditions.' : ''],
      ],
    });
    return sections;
  }

  function renderSummary(container, model, { editable }) {
    container.replaceChildren();
    for (const s of model) {
      const sec = document.createElement('section');
      sec.className = 'enq-summary-section';
      const head = document.createElement('div');
      head.className = 'enq-summary-section__head';
      const h = document.createElement('h3');
      h.className = 'enq-summary-section__title';
      h.textContent = s.title;
      head.append(h);
      if (editable) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'enq-summary-edit';
        b.dataset.goto = s.step;
        b.append('Edit');
        const hidden = document.createElement('span');
        hidden.className = 'visually-hidden';
        hidden.textContent = ` ${s.title.toLowerCase()}`;
        b.append(hidden);
        head.append(b);
      }
      const dl = document.createElement('dl');
      dl.className = 'enq-summary-list';
      for (const [k, val] of s.rows) {
        if (val === undefined || val === null || String(val).trim() === '') continue;
        const row = document.createElement('div');
        row.className = 'enq-summary-row';
        const dt = document.createElement('dt');
        dt.textContent = k;
        const dd = document.createElement('dd');
        dd.textContent = String(val);
        row.append(dt, dd);
        dl.append(row);
      }
      sec.append(head, dl);
      container.append(sec);
    }
  }

  function updateAside() {
    if (!asideList) return;
    const v = values();
    const t = v.enquiry_type;
    const rows = [['Service', typeLabel(t, v.tour_slug), 'Not chosen yet']];
    if (t === 'tour') {
      const pkg = isPackage(v.tour_slug);
      rows.push([pkg ? 'Multi-day tour' : 'Tour', cfg.tours?.[v.tour_slug] || '', 'Not chosen yet']);
      rows.push([pkg ? 'Start date' : 'Date', v.preferred_date ? fmtDate(v.preferred_date) : v.dates_flexible ? 'Flexible' : '', 'Not selected']);
      if (pkg) rows.push(['Nights', nightsText(v.nights), '']);
      rows.push(['Group', party(v.adults, v.children), 'Not given']);
    } else if (t === 'transfer') {
      rows.push(['Type', cfg.transferTypes?.[v.transfer_type] || '', 'Not chosen yet']);
      rows.push(['Route', v.pickup_location && v.destination ? `${short(v.pickup_location)} → ${short(v.destination)}` : '', 'Not given']);
      rows.push(['When', when(v.transfer_date, v.transfer_time), 'Not selected']);
      rows.push(['Passengers', party(v.adults, v.children), 'Not given']);
    }
    asideList.replaceChildren(
      ...rows.map(([k, val, empty]) => {
        const div = document.createElement('div');
        const dt = document.createElement('dt');
        dt.textContent = k;
        const dd = document.createElement('dd');
        dd.textContent = val || empty;
        if (!val) dd.className = 'is-empty';
        div.append(dt, dd);
        return div;
      }),
    );
  }

  function syncService() {
    const t = type();
    const pkg = t === 'tour' && isPackage(raw(panels.tour, 'tour_slug'));
    panels.service.querySelectorAll('.service-choice').forEach((c) => c.classList.toggle('is-selected', Boolean(c.querySelector('input:checked'))));
    submitLabel.textContent = t === 'transfer' ? 'Send Transfer Enquiry' : pkg ? 'Send Multi-day Enquiry' : t === 'tour' ? 'Send Tour Enquiry' : 'Send Enquiry';
    if (pageTitle) pageTitle.textContent = (pkg && pageTitle.dataset.titlePackage) || (t === 'tour' && pageTitle.dataset.titleTour) || (t === 'transfer' && pageTitle.dataset.titleTransfer) || defaultTitle;
  }

  /* ---------- tour summary card and the indicative total (step 1 of the tour path) ---------- */
  function syncTourSummary() {
    const slug = raw(panels.tour, 'tour_slug');
    panels.tour.querySelectorAll('[data-tour-card]').forEach((c) => (c.hidden = c.dataset.tourCard !== slug));
    // A package with a set length preselects it, unless the visitor has already chosen.
    const nights = panels.tour.querySelector('[name="nights"]');
    if (nights && !nights.value && cfg.packageNights?.[slug]) nights.value = String(cfg.packageNights[slug]);
  }

  /**
   * The indicative total from Good Times' published group rates (cfg.prices: { slug: { unit, tiers } }), in the
   * visitor's currency (currency.js): a private group's rate is chosen by its size (adults and children together);
   * a starting price (`startingFrom`, the Private Cape Town Experience) keeps its "From"; a per-day rate is
   * multiplied by the days (nights + 1) once nights are chosen; a group larger than the last tier gets no amount.
   * Never an amount due.
   */
  function updateTotal() {
    const text = panels.tour.querySelector('[data-total-text]');
    if (!text) return;
    const v = readPanel(panels.tour);
    const adults = parseInt(v.adults, 10);
    const children = parseInt(v.children, 10) || 0;
    const guests = Number.isFinite(adults) && adults > 0 ? adults + Math.max(children, 0) : 0;
    const rate = cfg.prices?.[v.tour_slug];
    const tiers = Array.isArray(rate?.tiers) ? rate.tiers.filter((t) => Number.isSafeInteger(t.amount) && t.amount > 0) : [];
    const tier = guests ? tiers.find((t) => guests <= t.max) : null;
    const shown = Boolean(cfg.showPrices && tier);
    if (shown) {
      if (rate.unit === 'per day') {
        const nights = parseInt(v.nights, 10);
        const days = Number.isFinite(nights) && nights > 0 ? nights + 1 : 0;
        const day = display(tier.amount).text;
        text.textContent = days
          ? `${display(tier.amount, { times: days }).text} for ${days} days · ${day} a day for ${tier.label}`
          : `From ${day} a day · the rate for ${tier.label}`;
      } else {
        text.textContent = `${tier.startingFrom ? 'From ' : ''}${display(tier.amount).text} for your private group of ${guests} · the rate for ${tier.label}`;
      }
    } else if (cfg.showPrices && tiers.length && guests > tiers[tiers.length - 1].max) {
      text.textContent = `Groups of more than ${tiers[tiers.length - 1].max}: we’ll confirm your quote`;
    } else {
      text.textContent = 'We’ll confirm your quote';
    }
    // The selector and its note belong to a shown price: none for a custom day or a tour priced on enquiry.
    const area = panels.tour.querySelector('[data-currency-area]');
    if (area) area.hidden = !shown;
  }

  /* ---------- inline calendars: a month grid that writes to the native date input ----------
     Keyboard: arrows move a day or a week, Home/End the week's ends, Page Up/Down a month
     (with Shift, a year). Days outside the input's min/max are disabled. Without the
     script the native input is the only control, so nothing is lost. */
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const WEEKDAYS = [['Mo', 'Monday'], ['Tu', 'Tuesday'], ['We', 'Wednesday'], ['Th', 'Thursday'], ['Fr', 'Friday'], ['Sa', 'Saturday'], ['Su', 'Sunday']];
  const calendars = [];
  function initCalendar(cal) {
    const input = document.getElementById(cal.dataset.calendarFor || '');
    if (!input) return;
    const parse = (s) => {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
      return m ? { y: +m[1], m: +m[2] - 1, d: +m[3] } : null;
    };
    const iso = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const shift = (s, days) => {
      const p = parse(s);
      const t = new Date(Date.UTC(p.y, p.m, p.d + days));
      return iso(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate());
    };
    const allowed = (s) => (!input.min || s >= input.min) && (!input.max || s <= input.max);
    // A tour needs the whole day free; a transfer only needs a free moment.
    const takenKind = input.name === 'preferred_date' ? 'full' : 'closed';
    const monthId = `${input.id}-month`;
    let view = null;
    let focusIso = '';
    const render = (focusAfter = '') => {
      // Keep keyboard focus through a re-render (e.g. when the month's availability arrives).
      const active = cal.contains(document.activeElement) ? document.activeElement : null;
      if (!focusAfter && active?.dataset.date) focusAfter = active.dataset.date;
      const keepNav = active?.dataset.calendarNav;
      const today = todayInSast();
      const selected = parse(input.value) ? input.value : '';
      if (!view) {
        const base = parse(selected) || parse(today);
        view = { y: base.y, m: base.m };
      }
      const first = iso(view.y, view.m, 1);
      const taken = bookedIn(first.slice(0, 7));
      const daysInMonth = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate();
      const last = iso(view.y, view.m, daysInMonth);
      const inView = (s) => s >= first && s <= last;
      focusIso = inView(focusAfter) ? focusAfter : inView(selected) ? selected : inView(today) ? today : '';
      if (!focusIso) for (let d = 1; d <= daysInMonth && !focusIso; d++) if (allowed(iso(view.y, view.m, d))) focusIso = iso(view.y, view.m, d);
      if (!focusIso) focusIso = first;

      const head = document.createElement('div');
      head.className = 'calendar__head';
      const mkNav = (dir, label) => {
        const b = document.createElement('button');
        b.type = 'button';
        // Text-labelled, as every Previous/Next on the site (design/buttons/design.md §2.2); the name keeps the month
        b.className = 'calendar__nav gt-button gt-button--utility';
        b.dataset.calendarNav = String(dir);
        b.setAttribute('aria-label', label);
        b.textContent = dir < 0 ? 'Previous' : 'Next';
        b.disabled = dir < 0 ? Boolean(input.min) && shift(first, -1) < input.min.slice(0, 8) + '01' : Boolean(input.max) && shift(last, 1) > input.max;
        return b;
      };
      const title = document.createElement('p');
      title.className = 'calendar__month';
      title.id = monthId;
      title.setAttribute('aria-live', 'polite');
      title.textContent = `${MONTHS[view.m]} ${view.y}`;
      head.append(mkNav(-1, 'Previous month'), title, mkNav(1, 'Next month'));

      const table = document.createElement('table');
      table.className = 'calendar__grid';
      table.setAttribute('role', 'grid');
      table.setAttribute('aria-labelledby', monthId);
      const thead = document.createElement('thead');
      const hr = document.createElement('tr');
      for (const [abbr, full] of WEEKDAYS) {
        const th = document.createElement('th');
        th.scope = 'col';
        th.setAttribute('abbr', full);
        th.textContent = abbr;
        hr.append(th);
      }
      thead.append(hr);
      const tbody = document.createElement('tbody');
      const offset = (new Date(Date.UTC(view.y, view.m, 1)).getUTCDay() + 6) % 7; // Monday first
      let row = document.createElement('tr');
      for (let i = 0; i < offset; i++) row.append(document.createElement('td'));
      for (let d = 1; d <= daysInMonth; d++) {
        const s = iso(view.y, view.m, d);
        const td = document.createElement('td');
        td.setAttribute('role', 'gridcell');
        td.setAttribute('aria-selected', String(s === selected));
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'calendar__day';
        b.dataset.date = s;
        b.tabIndex = s === focusIso ? 0 : -1;
        b.textContent = String(d);
        b.setAttribute('aria-label', new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(view.y, view.m, d))));
        if (s === today) b.classList.add('is-today');
        if (!allowed(s)) b.setAttribute('aria-disabled', 'true');
        else if (taken?.[takenKind].has(s)) {
          b.setAttribute('aria-disabled', 'true');
          b.classList.add('is-booked');
          b.setAttribute('aria-label', `${b.getAttribute('aria-label')}, fully booked`);
        }
        td.append(b);
        row.append(td);
        if (row.children.length === 7) {
          tbody.append(row);
          row = document.createElement('tr');
        }
      }
      if (row.children.length) {
        while (row.children.length < 7) row.append(document.createElement('td'));
        tbody.append(row);
      }
      table.append(thead, tbody);
      const note = document.createElement('p');
      note.className = 'calendar__note';
      note.textContent = `Bookings need ${BOOKING_RULES.minNoticeHours} hours’ notice, up to three years ahead.${live ? ' Fully booked days are crossed out.' : ''} We confirm every booking with you.`;
      cal.replaceChildren(head, table, note);
      if (focusAfter) cal.querySelector(`[data-date="${focusAfter}"]`)?.focus({ preventScroll: true });
      else if (keepNav) cal.querySelector(`[data-calendar-nav="${keepNav}"]:not([disabled])`)?.focus({ preventScroll: true });
    };
    const moveTo = (s) => {
      const p = parse(s);
      view = { y: p.y, m: p.m };
      render(s);
    };
    cal.addEventListener('click', (e) => {
      const nav = e.target.closest('[data-calendar-nav]');
      if (nav && !nav.disabled) {
        view = { y: view.y + (view.m + Number(nav.dataset.calendarNav) < 0 ? -1 : view.m + Number(nav.dataset.calendarNav) > 11 ? 1 : 0), m: (view.m + Number(nav.dataset.calendarNav) + 12) % 12 };
        render();
        cal.querySelector(`[data-calendar-nav="${nav.dataset.calendarNav}"]`)?.focus({ preventScroll: true });
        return;
      }
      const day = e.target.closest('[data-date]');
      if (!day || day.getAttribute('aria-disabled') === 'true') return;
      input.value = day.dataset.date;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      render(day.dataset.date);
    });
    cal.addEventListener('keydown', (e) => {
      const day = e.target.closest('[data-date]');
      if (!day) return;
      const s = day.dataset.date;
      const p = parse(s);
      const jump = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
      let target = '';
      if (jump) target = shift(s, jump);
      else if (e.key === 'Home') target = shift(s, -((new Date(Date.UTC(p.y, p.m, p.d)).getUTCDay() + 6) % 7));
      else if (e.key === 'End') target = shift(s, 6 - ((new Date(Date.UTC(p.y, p.m, p.d)).getUTCDay() + 6) % 7));
      else if (e.key === 'PageUp' || e.key === 'PageDown') {
        const dir = e.key === 'PageUp' ? -1 : 1;
        const t = new Date(Date.UTC(e.shiftKey ? p.y + dir : p.y, e.shiftKey ? p.m : p.m + dir, 1));
        const lastDay = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate();
        target = iso(t.getUTCFullYear(), t.getUTCMonth(), Math.min(p.d, lastDay));
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        day.click();
        return;
      }
      if (!target) return;
      e.preventDefault();
      moveTo(target);
    });
    input.addEventListener('input', () => {
      const p = parse(input.value);
      if (p && (!view || p.y !== view.y || p.m !== view.m)) view = { y: p.y, m: p.m };
      render();
    });
    calendars.push({ render, reset: () => { view = null; } });
    render();
  }
  const renderCalendars = () => calendars.forEach((c) => c.render());

  /* ---------- steps ---------- */
  function showOnly(panel) {
    for (const p of Object.values(panels)) p.hidden = p !== panel;
  }

  function updateProgress() {
    if (!progress) return;
    const idx = ORDER.indexOf(state.step);
    progress.hidden = state.step === 'service';
    progress.querySelectorAll('[data-progress-step]').forEach((li) => {
      const i = ORDER.indexOf(li.dataset.progressStep);
      li.classList.toggle('is-complete', i < idx);
      if (i === idx) li.setAttribute('aria-current', 'step');
      else li.removeAttribute('aria-current');
      const s = li.querySelector('[data-progress-state]');
      if (s) s.textContent = i < idx ? ' (completed)' : '';
    });
  }

  // 'instant' rather than 'auto': the site sets scroll-behavior: smooth on <html>.
  function scrollToWizard({ instant = false } = {}) {
    const top = root.getBoundingClientRect().top;
    if (top < 0 || top > window.innerHeight * 0.5) root.scrollIntoView({ block: 'start', behavior: instant || reduce ? 'instant' : 'smooth' });
  }

  function goTo(step, { focus = true, scroll = true } = {}) {
    if (step !== 'service' && !detailsPanel()) step = 'service';
    state.step = step;
    const panel = panelFor(step);
    hideResults();
    hideSubmitError();
    showOnly(panel);
    if (step === 'review') {
      renderSummary(panel.querySelector('[data-review]'), summaryModel(validateEnquiry(values()).data), { editable: true });
    }
    updateProgress();
    persist();
    if (focus) panel.querySelector('.wizard-step__title')?.focus({ preventScroll: true });
    if (scroll) scrollToWizard();
  }

  async function next() {
    if (state.checking) return;
    const step = state.step;
    const panel = panelFor(step);
    const r = validateEnquiry(values(), { section: sectionFor(step) });
    if (!r.ok) {
      showErrors(panel, r.errors);
      return;
    }
    if (live && step === 'details') {
      const btn = panel.querySelector('[data-next]');
      state.checking = true;
      btn?.setAttribute('aria-busy', 'true');
      const taken = await checkAvailability();
      state.checking = false;
      btn?.removeAttribute('aria-busy');
      if (state.step !== step) return;
      if (taken) {
        forgetBooked(r.data.preferred_date || r.data.transfer_date);
        if (showErrors(panel, { [taken.field]: taken.error })) return;
      }
    }
    clearPanelErrors(panel);
    goTo(ORDER[ORDER.indexOf(step) + 1]);
  }

  function back() {
    const i = ORDER.indexOf(state.step);
    if (i > 0) goTo(ORDER[i - 1]);
  }

  /* ---------- submit ---------- */
  const MSG = {
    // Before sending: we know for certain that nothing left the browser.
    offline: 'You appear to be offline, so nothing was sent. Reconnect, then press send again. Your answers are still here.',
    // After sending without a clear answer we cannot know whether it arrived. Trying again is safe: the same
    // idempotency key goes with it, so an enquiry that did arrive comes back as its reference, never a duplicate.
    unsure: 'We could not confirm that your enquiry was received. Please check your connection and press send again: if it did arrive, you will see its reference instead of a second enquiry. Your answers are still here.',
    invalid: 'Some answers could not be accepted. Please check them and try again.',
    tooLarge: 'Your enquiry is too long to send. Please shorten the notes and try again.',
    paused: 'Online enquiries are paused at the moment, so this could not be sent. Your answers are still here; please try again later.',
    rate: (s) => `Too many attempts from this connection. Please wait ${s > 0 && s <= 120 ? `${s} seconds` : 'a minute'} and try again. Your answers are still here.`,
  };

  function showSubmitError(msg) {
    if (state.step !== 'review') goTo('review', { focus: false });
    submitError.querySelector('[data-submit-error-text]').textContent = msg;
    submitError.setAttribute('role', 'alert');
    submitError.hidden = false;
    submitError.scrollIntoView({ block: 'center', behavior: reduce ? 'instant' : 'smooth' });
  }
  function hideSubmitError() {
    submitError.hidden = true;
    submitError.removeAttribute('role');
  }

  function setBusy(busy) {
    state.busy = busy;
    // aria-disabled rather than disabled, so keyboard focus stays on the button.
    submitBtn.setAttribute('aria-disabled', String(busy));
    submitBtn.setAttribute('aria-busy', String(busy));
    submitLabel.textContent = busy ? 'Sending…' : '';
    if (!busy) syncService();
    panels.review.querySelectorAll('[data-back], [data-goto]').forEach((b) => (b.disabled = busy));
  }

  function payloadFrom(vals) {
    return {
      ...vals,
      [HONEYPOT]: form.querySelector(`[name="${HONEYPOT}"]`)?.value || '',
      elapsed_ms: elapsedMs(),
      idempotency_key: session.key,
      page_url: location.href.split('#')[0],
    };
  }

  async function send() {
    hideSubmitError();
    const vals = values();
    const r = validateEnquiry(vals);
    if (!r.ok) {
      const step = firstErrorStep(r.errors) || 'review';
      goTo(step, { focus: false });
      showErrors(panelFor(step), errorsFor(r.errors, step));
      return;
    }
    const payload = payloadFrom(vals);
    if (!live) return showPreview(r.data, payload);
    if (navigator.onLine === false) return showSubmitError(MSG.offline);

    setBusy(true);
    announce('Sending your enquiry…');
    let res;
    let body = {};
    try {
      const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
      const timer = ctrl ? setTimeout(() => ctrl.abort(), 20000) : null;
      res = await fetch(cfg.endpoint || '/api/enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': session.key },
        body: JSON.stringify(payload),
        credentials: 'same-origin',
        signal: ctrl?.signal,
      });
      clearTimeout(timer);
      body = await res.json().catch(() => ({}));
    } catch (err) {
      setBusy(false);
      // The request may or may not have reached the server.
      return showSubmitError(MSG.unsure);
    }
    setBusy(false);

    const ref = typeof body.reference === 'string' && REF_RE.test(body.reference) ? body.reference : '';
    if (res.status === 201 && ref) return showResult('success', ref, body, vals);
    // Taken since the details step: nothing was stored; point at the date or time to change.
    if (res.status === 409 && body.code === 'unavailable' && body.errors && typeof body.errors === 'object') {
      forgetBooked(vals.preferred_date || vals.transfer_date);
      const step = firstErrorStep(body.errors);
      if (step) {
        goTo(step, { focus: false });
        if (showErrors(panelFor(step), errorsFor(body.errors, step))) return;
      }
      return showSubmitError(typeof body.error === 'string' ? body.error : MSG.invalid);
    }
    if (res.status === 409 && ref) return showResult('duplicate', ref, body, vals);
    if (res.status === 400 && body.errors && typeof body.errors === 'object' && Object.keys(body.errors).length) {
      const step = firstErrorStep(body.errors);
      if (step) {
        goTo(step, { focus: false });
        if (showErrors(panelFor(step), errorsFor(body.errors, step))) return;
      }
      return showSubmitError(MSG.invalid);
    }
    if (res.status === 413) return showSubmitError(MSG.tooLarge);
    if (res.status === 400 || res.status === 415) return showSubmitError(MSG.invalid);
    if (res.status === 429) return showSubmitError(MSG.rate(Number(res.headers.get('Retry-After'))));
    // Our API's own 503s mean "not accepted"; any other 503 (a platform error) is uncertain.
    if (res.status === 503 && ['disabled', 'preview', 'misconfigured'].includes(body.code)) return showSubmitError(MSG.paused);
    // Any other "OK" without a reference (e.g. the anti-spam decoy) is never shown as success.
    // 5xx, 504 timeouts and any "OK" without a reference (e.g. the anti-spam decoy): never shown as success,
    // never claimed as definitely not sent.
    return showSubmitError(MSG.unsure);
  }

  /* ---------- results ---------- */
  const results = () => [...root.querySelectorAll('[data-result]')];
  function hideResults() {
    results().forEach((r) => (r.hidden = true));
    form.hidden = false;
    if (progress) progress.hidden = state.step === 'service';
  }

  function reveal(panel) {
    form.hidden = true;
    if (progress) progress.hidden = true;
    results().forEach((r) => (r.hidden = r !== panel));
    panel.querySelector('.wizard-result__title')?.focus({ preventScroll: true });
    // The form just collapsed, so jump rather than animate across the shrinking page.
    scrollToWizard({ instant: true });
  }

  function showResult(kind, ref, body, vals) {
    const panel = root.querySelector(`[data-result="${kind}"]`);
    if (!panel) return showSubmitError(MSG.unsure);
    panel.querySelectorAll('[data-ref]').forEach((n) => (n.textContent = ref));
    panel.querySelectorAll('[data-email]').forEach((n) => (n.textContent = vals.email));
    const emailed = body.emailed !== false;
    panel.querySelectorAll('[data-emailed]').forEach((n) => (n.hidden = (n.dataset.emailed === 'yes') !== emailed));
    // Only the reference goes into the WhatsApp text: no personal details in a URL.
    panel.querySelectorAll('[data-whatsapp]').forEach((a) => {
      a.href = `https://wa.me/${a.dataset.number}?text=${encodeURIComponent(`Hello Good Times, my enquiry reference is ${ref}.`)}`;
    });
    // Good Times has the enquiry: forget the draft and start a fresh session.
    store.clear();
    state.done = true;
    session.key = newKey();
    resetClock();
    reveal(panel);
    announce(`Enquiry received. Your reference is ${ref}. Your booking is not yet confirmed.`);
  }

  function showPreview(data, payload) {
    const panel = root.querySelector('[data-result="preview"]');
    if (!panel) return;
    renderSummary(panel.querySelector('[data-preview-summary]'), summaryModel(data), { editable: false });
    const shown = { ...payload };
    delete shown[HONEYPOT];
    panel.querySelector('[data-preview-json]').textContent = JSON.stringify(shown, null, 2);
    // Nothing was sent, so the draft stays.
    reveal(panel);
  }

  function restart() {
    store.clear();
    state.done = false;
    session.key = newKey();
    resetClock();
    session.search = location.search;
    form.reset();
    Object.values(panels).forEach(clearPanelErrors);
    syncConditional();
    syncService();
    form.querySelectorAll('.counter__input').forEach(syncCounter);
    syncTourSummary();
    updateTotal();
    calendars.forEach((c) => c.reset());
    renderCalendars();
    updateAside();
    goTo('service');
  }

  /* ---------- prefill from the URL ---------- */
  /**
   * The old booking site's sign-in page sent visitors on with ?next=/users/book/<slug>/. That address now redirects
   * here keeping its query (src/data/legacy-urls.mjs), so the booking it was for is chosen as its own link would be.
   */
  function legacyBooking(params) {
    const m = /^\/users\/book\/([a-z0-9-]+)\/?$/.exec(params.get('next') || '');
    if (!m) return null;
    if (m[1] === 'airport-private-transfer') return { type: 'transfer' };
    return TOUR_SLUGS.includes(m[1]) || PACKAGE_SLUGS.includes(m[1]) ? { type: 'tour', tour: m[1] } : null;
  }

  function applyPrefill() {
    const params = new URLSearchParams(location.search);
    const legacy = params.get('type') ? null : legacyBooking(params);
    if (legacy) for (const [k, v] of Object.entries(legacy)) params.set(k, v);
    const t = params.get('type');
    if (t !== 'tour' && t !== 'transfer') return false;
    if (session.search === location.search) return false; // already applied in this tab (e.g. a reload)
    session.search = location.search;
    setRadio(panels.service, 'enquiry_type', t);
    const text = (panel, name, value) => {
      const el = panel.querySelector(`[name="${name}"]`);
      const v = String(value || '').trim();
      if (el && v) el.value = v.slice(0, Number(el.maxLength) > 0 ? Number(el.maxLength) : 200);
    };
    const date = (panel, name, value) => {
      if (/^\d{4}-\d{2}-\d{2}$/.test(value || '')) text(panel, name, value);
    };
    const count = (panel, name, value) => {
      const el = panel.querySelector(`[name="${name}"]`);
      const n = parseInt(value || '', 10);
      if (el && Number.isInteger(n)) el.value = String(Math.min(Number(el.dataset.max), Math.max(Number(el.dataset.min), n)));
    };
    if (t === 'tour') {
      const slug = params.get('tour');
      if (slug && (TOUR_SLUGS.includes(slug) || PACKAGE_SLUGS.includes(slug) || slug === CUSTOM_TOUR)) panels.tour.querySelector('[name="tour_slug"]').value = slug;
      // Only a value the nights list offers (the multi-day tours' own range); anything else stays "not sure yet".
      const nights = panels.tour.querySelector('[name="nights"]');
      const n = params.get('nights');
      if (nights && n && [...nights.options].some((o) => o.value === n)) nights.value = n;
      date(panels.tour, 'preferred_date', params.get('date') || params.get('preferred_date'));
      count(panels.tour, 'adults', params.get('adults'));
      count(panels.tour, 'children', params.get('children'));
      text(panels.tour, 'pickup_area', params.get('pickup') || params.get('pickup_area'));
    } else {
      const tt = params.get('transfer');
      if (tt && TRANSFER_TYPES.includes(tt)) setRadio(panels.transfer, 'transfer_type', tt);
      text(panels.transfer, 'pickup_location', params.get('pickup_location'));
      text(panels.transfer, 'destination', params.get('destination'));
      date(panels.transfer, 'transfer_date', params.get('transfer_date') || params.get('date'));
      count(panels.transfer, 'adults', params.get('adults'));
      count(panels.transfer, 'children', params.get('children'));
    }
    return true;
  }

  /* ---------- events ---------- */
  function onEdit(e) {
    const el = e.target;
    if (!el?.name || el.name === HONEYPOT) return;
    if (el.name === 'transfer_type' && e.type === 'change') airportAutofill();
    if (el.name === 'enquiry_type') syncService();
    if (el.name === 'transfer_date') setDateLimits();
    if (el.classList.contains('counter__input')) syncCounter(el);
    if (el.name === 'tour_slug') {
      syncTourSummary();
      syncService();
    }
    if (['tour_slug', 'adults', 'children', 'nights'].includes(el.name)) updateTotal();
    syncConditional();
    persistSoon();
    updateAside();
    recheck(el.closest('[data-wizard-step]'));
  }
  form.addEventListener('input', onEdit);
  form.addEventListener('change', onEdit);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (state.busy) return;
    // Enter in a field submits the form natively; before the last step it means "Next".
    if (state.step !== 'review') return next();
    send();
  });

  root.addEventListener('click', (e) => {
    const t = e.target;
    const counterBtn = t.closest('[data-counter]');
    if (counterBtn) return stepCounter(counterBtn);
    if (t.closest('[data-next]')) return next();
    if (t.closest('[data-back]')) return back();
    const go = t.closest('[data-goto]');
    if (go && !state.busy) return goTo(go.dataset.goto);
    if (t.closest('[data-back-to-review]')) return goTo('review');
    if (t.closest('[data-restart]')) return restart();
    const link = t.closest('[data-error-list] a');
    if (link) {
      e.preventDefault();
      const target = document.getElementById(link.hash.slice(1));
      target?.focus({ preventScroll: true });
      target?.scrollIntoView({ block: 'center', behavior: reduce ? 'instant' : 'smooth' });
    }
  });

  const syncOnline = () => {
    if (offlineNote) offlineNote.hidden = navigator.onLine !== false;
  };
  window.addEventListener('online', syncOnline);
  window.addEventListener('offline', syncOnline);
  window.addEventListener('pagehide', persist);

  /* ---------- boot ---------- */
  if (draft?.panels) for (const [k, vals] of Object.entries(draft.panels)) writePanel(panels[k], vals);
  const prefilled = applyPrefill();
  if (prefilled && type() === 'transfer') airportAutofill();
  syncConditional();
  syncService();
  setDateLimits();
  form.querySelectorAll('.counter__input').forEach(syncCounter);
  syncTourSummary();
  updateTotal();
  onCurrencyChange(updateTotal);
  form.querySelectorAll('[data-calendar-for]').forEach(initCalendar);
  // Searchable country pickers: the phone's calling code, and the country of residence (which suggests the code).
  phoneUi = enhancePhone(panels.contact.querySelector('[name="phone"]'));
  enhanceCountry(panels.contact.querySelector('[name="country"]'), { onPick: (c) => phoneUi?.follow(c.iso) });
  syncOnline();

  let start = prefilled ? 'details' : ORDER.includes(draft?.step) ? draft.step : 'service';
  if (start === 'review' && !validateEnquiry(values()).ok) start = firstErrorStep(validateEnquiry(values()).errors) || 'service';
  submitBtn.disabled = false;
  root.classList.add('is-ready');
  goTo(start, { focus: false, scroll: false });
  updateAside();
}
