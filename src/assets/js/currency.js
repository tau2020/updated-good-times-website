/* Good Times in Cape Town — prices in the visitor's currency.

   Loaded only on pages that show a price (src/partials/layout.mjs). Every
   price is written in rand (ZAR) with its amount in data-money; this module shows it
   in one currency, chosen in this order:
     1. the visitor's own choice in a selector (kept for the session)
     2. the currency of the country Cloudflare sees (GET /api/currency)
     3. ZAR, the prices' own currency
   A currency without a usable rate is never shown: the price stays in rand.
   Converted amounts are marked "≈" (and read as "about"). Nothing here is a
   payable amount and nothing here is sent with a booking request.

   One shared state: every price, every selector and the booking wizard's
   estimate (enquiry.js, through display() and onCurrencyChange()) read it, so
   they cannot disagree. Changing currency rewrites text only: no reload, no
   reset of a form, no restarted animation.

   Storage: sessionStorage (cleared when the tab closes), so no consent is
   needed; when the browser refuses storage everything still works for the page. */
import { BASE, CURRENCIES, currencyLabel, isCurrency, readRates, convertWhole, formatWhole } from './currency-core.js';

const CHOICE_KEY = 'gt:currency';
const DATA_KEY = 'gt:currency-data';
const DATA_MAX_AGE = 6 * 3600 * 1000; // ask again after six hours; the server's own cache does the heavy lifting
const ENDPOINT = '/api/currency';

const memory = {};
const store = {
  get(k) {
    try {
      return window.sessionStorage.getItem(k);
    } catch {
      return memory[k] ?? null;
    }
  },
  set(k, v) {
    memory[k] = v;
    try {
      window.sessionStorage.setItem(k, v);
    } catch {
      /* private mode or storage blocked: this page keeps it in memory */
    }
  },
};

const state = { detected: BASE, rates: readRates(null), date: '', stale: false, loaded: false };
const listeners = new Set();

function choice() {
  const c = store.get(CHOICE_KEY);
  return isCurrency(c) ? c : '';
}

/** The currency shown now: the choice or the detected one, if a rate exists for it; otherwise ZAR. */
export function current() {
  for (const c of [choice(), state.detected]) if (c && (c === BASE || typeof state.rates[c] === 'bigint')) return c;
  return BASE;
}

/**
 * A ZAR amount as shown now. `times` multiplies the shown (rounded) unit amount,
 * so "≈R2,086 · 2 adults × ≈R1,043" always adds up. Returns
 * { amount, currency, converted, text } (text with "≈" when converted).
 */
export function display(amount, { times = 1 } = {}) {
  const cur = current();
  const unit = convertWhole(amount, cur, state.rates);
  if (unit === null) return { amount: amount * times, currency: BASE, converted: false, text: formatWhole(amount * times, BASE) };
  const converted = cur !== BASE;
  return { amount: unit * times, currency: cur, converted, text: `${converted ? '≈' : ''}${formatWhole(unit * times, cur)}` };
}

export function onCurrencyChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/* ---------- rendering ---------- */
function renderPrice(el) {
  const amount = Number(el.dataset.money);
  if (!Number.isSafeInteger(amount)) return;
  const d = display(amount);
  const plain = d.converted ? `about ${formatWhole(d.amount, d.currency)}` : d.text;
  // Our own strings only (never visitor input): "≈" for the eye, "about" for screen readers.
  el.innerHTML = d.converted ? `<span aria-hidden="true">≈</span><span class="visually-hidden">about </span>${formatWhole(d.amount, d.currency)}` : d.text;
  el.dataset.moneyShown = d.currency;
  if (el.dataset.moneyLabel) el.setAttribute('aria-label', `${el.dataset.moneyLabel} ${plain}`);
}

function renderPicker(p) {
  const cur = current();
  const select = p.querySelector('[data-currency-select]');
  const usable = (c) => c === BASE || typeof state.rates[c] === 'bigint';
  for (const o of select.options) o.disabled = !usable(o.value);
  select.value = cur;
  select.disabled = !state.loaded || ![...select.options].some((o) => o.value !== BASE && !o.disabled);
  p.querySelector('[data-currency-face]').textContent = currencyLabel(cur);
  p.classList.toggle('is-fixed', select.disabled);
  // Shown once its rates are known (its space is kept meanwhile): never a control that changes under the visitor's finger.
  p.classList.toggle('is-ready', state.loaded);
}


function render() {
  document.querySelectorAll('[data-money]').forEach(renderPrice);
  document.querySelectorAll('[data-currency-picker]').forEach(renderPicker);
  document.documentElement.dataset.currency = current();
  listeners.forEach((fn) => fn(current()));
}

let status;
function announce(text) {
  if (!status) {
    status = document.createElement('p');
    status.className = 'visually-hidden';
    status.setAttribute('aria-live', 'polite');
    document.body.append(status);
  }
  status.textContent = text;
}

/* ---------- data ---------- */
function apply(data) {
  state.detected = isCurrency(data?.currency) ? data.currency : BASE;
  state.rates = readRates(data?.rates);
  state.date = typeof data?.date === 'string' ? data.date : '';
  state.stale = Boolean(data?.stale);
  state.loaded = true;
}

function cached() {
  try {
    const d = JSON.parse(store.get(DATA_KEY) || 'null');
    return d && Date.now() - Number(d.savedAt || 0) < DATA_MAX_AGE ? d : null;
  } catch {
    return null;
  }
}

async function load() {
  const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), 6000) : null;
  try {
    const res = await fetch(ENDPOINT, { credentials: 'same-origin', signal: ctrl?.signal, headers: { accept: 'application/json' } });
    const body = res.ok ? await res.json() : null;
    if (!body?.ok) return null;
    const data = { currency: body.currency, rates: body.rates, date: body.date, stale: body.stale, savedAt: Date.now() };
    store.set(DATA_KEY, JSON.stringify(data));
    return data;
  } catch {
    return null; // offline or refused: prices stay in rand
  } finally {
    clearTimeout(timer);
  }
}

/* ---------- start ---------- */
function bindPickers() {
  document.querySelectorAll('[data-currency-select]').forEach((select) => {
    select.addEventListener('change', () => {
      if (!isCurrency(select.value)) return;
      store.set(CHOICE_KEY, select.value);
      render();
      announce(`Prices now shown in ${CURRENCIES[current()].name}${current() === BASE ? '' : ', converted'}.`);
    });
  });
}

async function start() {
  bindPickers();
  const known = cached();
  if (known) {
    apply(known);
    render();
    return;
  }
  render(); // rand and a selector that waits for its rates
  apply(await load());
  render();
}

// Back and forward restore a page from memory with the currency it had: show the current one.
window.addEventListener('pageshow', (e) => {
  if (e.persisted) {
    const known = cached();
    if (known) apply(known);
    render();
  }
});

start();
