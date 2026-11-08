/* Good Times in Cape Town: the booking form's country pickers (enquire/ only)
   Loaded as an ES module by enquiry.js. Without JavaScript both fields stay plain text boxes, as before.

   - Phone or WhatsApp: a flag button with the calling code beside the number. It opens a list to search by
     country, other name ("UK", "Holland") or code ("+44", "44"). The code lives on the button only, never twice:
     the box keeps the number as the visitor writes it, and the form sends the two together ("07700 900123" with
     the UK → "+44 7700 900123", shown in full on the review step). A number typed with + or 00 moves its code onto
     the button when the visitor leaves the box; one pasted or filled in by the browser moves it at once. A code is only ever applied by the visitor: chosen in the list, typed with the
     number, or following their country of residence. The browser's language ("en-GB") only puts its country first
     in the list: "en-US" is the default of half the world, and a guessed +1 in front of a South African number
     would send a number nobody can call. Until a code is chosen the button says so, and the form asks for one.
   - Country of residence: type and choose from the list (the WAI-ARIA combobox pattern: arrows, Enter, Escape),
     or keep your own words. Choosing a country moves the phone code to it, unless one was picked by hand.

   Both lists are listboxes driven from a search box with aria-activedescendant, announce how many countries
   match, and keep 44 px targets. */
import { byIso, byName, flagOf, guessCountry, searchCountries, splitNumber, withCode } from './countries.js';

const DIAL_KEY = 'gt:enquiry:dial';
const guess = (() => {
  try {
    return guessCountry(navigator.languages?.length ? navigator.languages : [navigator.language]);
  } catch {
    return null;
  }
})();

function node(tag, attrs = {}, text = '') {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== false && v != null) n.setAttribute(k, v === true ? '' : String(v));
  if (text) n.textContent = text;
  return n;
}
const fire = (input) => {
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
};
const countWord = (n) => `${n} ${n === 1 ? 'country' : 'countries'}`;

/** A listbox of countries driven by a search field (`owner`), with one active option at a time. */
function listbox({ id, label, owner, dial }) {
  const ul = node('ul', { id, role: 'listbox', 'aria-label': label, class: 'cpick__list' });
  let items = [];
  let active = -1;
  const setActive = (i) => {
    const opts = ul.children;
    if (opts[active]) opts[active].setAttribute('aria-selected', 'false');
    active = items.length ? Math.max(0, Math.min(items.length - 1, i)) : -1;
    if (opts[active]) {
      opts[active].setAttribute('aria-selected', 'true');
      owner.setAttribute('aria-activedescendant', opts[active].id);
      opts[active].scrollIntoView({ block: 'nearest' });
    } else owner.removeAttribute('aria-activedescendant');
  };
  return {
    ul,
    render(countries, { current = '', query = '', activate = true } = {}) {
      items = countries;
      ul.replaceChildren(
        ...countries.map((c) => {
          const li = node('li', { id: `${id}-${c.iso}`, role: 'option', 'aria-selected': 'false', 'data-iso': c.iso, class: `cpick__opt${c.iso === current ? ' is-current' : ''}` });
          li.append(node('span', { class: 'cpick__flag', 'aria-hidden': 'true' }, flagOf(c.iso)), node('span', { class: 'cpick__name' }, c.name));
          if (dial) li.append(node('span', { class: 'cpick__dial' }, `+${c.dial}`));
          return li;
        }),
      );
      active = -1;
      owner.removeAttribute('aria-activedescendant');
      // Something typed: the best match is the one Enter takes. Nothing typed: the country already chosen.
      if (activate && countries.length) setActive(query.trim() ? 0 : Math.max(0, countries.findIndex((c) => c.iso === current)));
    },
    move: (delta) => setActive(active < 0 ? 0 : active + delta),
    get current() {
      return items[active] || null;
    },
    get size() {
      return items.length;
    },
  };
}

/** Choose by pointer without taking focus from the search field; returns the option's country. */
function onOptionClick(ul, pick) {
  ul.addEventListener('pointerdown', (e) => e.preventDefault());
  ul.addEventListener('click', (e) => {
    const li = e.target.closest('[role="option"]');
    if (li) pick(byIso(li.dataset.iso));
  });
}

/**
 * The phone or WhatsApp number: a calling-code button beside it. Returns { compose(value), follow(iso) }:
 * compose gives the number as the form will send it (without changing the field), follow suggests a country.
 */
export function enhancePhone(input) {
  if (!input || input.dataset.enhanced) return null;
  input.dataset.enhanced = 'tel';
  const id = input.id || 'enq-phone';
  const hint = input.closest('.field')?.querySelector('.field__hint');
  if (hint) hint.textContent = 'Choose your country code, then type your number.';

  const wrap = node('div', { class: 'tel' });
  input.before(wrap);
  const button = node('button', { type: 'button', class: 'tel__code', 'aria-haspopup': 'listbox', 'aria-expanded': 'false', 'aria-controls': `${id}-pop` });
  const pop = node('div', { class: 'cpick', id: `${id}-pop`, hidden: true });
  const search = node('input', {
    class: 'input cpick__search',
    type: 'text',
    role: 'combobox',
    'aria-autocomplete': 'list',
    'aria-expanded': 'true',
    'aria-controls': `${id}-list`,
    'aria-label': 'Search for your country or its calling code',
    placeholder: 'Search country or code',
    autocomplete: 'off',
    autocapitalize: 'off',
    spellcheck: 'false',
    enterkeyhint: 'done',
  });
  const list = listbox({ id: `${id}-list`, label: 'Countries and calling codes', owner: search, dial: true });
  const empty = node('p', { class: 'cpick__empty', hidden: true });
  const status = node('p', { class: 'visually-hidden', role: 'status' });
  pop.append(search, list.ul, empty, status);
  wrap.append(button, input, pop);

  let chosen = null;
  let manual = false;
  const save = () => {
    try {
      sessionStorage.setItem(DIAL_KEY, JSON.stringify({ iso: chosen?.iso || '', manual }));
    } catch {
      /* a convenience only */
    }
  };
  // The button's parts stay in place and only their words change: the box's blur can update the button between a
  // pointer's down and up on it, and a replaced part would swallow that click.
  const flagEl = node('span', { class: 'tel__flag', 'aria-hidden': 'true' });
  const dialEl = node('span', { class: 'tel__dial', 'aria-hidden': 'true' });
  button.append(flagEl, dialEl, node('span', { class: 'tel__caret', 'aria-hidden': 'true' }));
  const show = () => {
    flagEl.textContent = chosen ? flagOf(chosen.iso) : '🌐';
    dialEl.textContent = chosen ? `+${chosen.dial}` : 'Code';
    button.setAttribute('aria-label', chosen ? `Country code: ${chosen.name}, +${chosen.dial}. Change it` : 'Choose your country code');
  };
  const choose = (c, { byPerson = false } = {}) => {
    chosen = c || null;
    if (byPerson) manual = true;
    show();
    save();
  };

  // Where to start: the choice already made this visit, or the number already there (never a guess).
  let stored = null;
  try {
    stored = JSON.parse(sessionStorage.getItem(DIAL_KEY) || 'null');
  } catch {
    /* none */
  }
  const fromNumber = splitNumber(input.value, stored?.iso)?.country;
  if (fromNumber) choose(fromNumber, { byPerson: Boolean(stored?.manual) });
  else if (stored?.iso && byIso(stored.iso)) choose(byIso(stored.iso), { byPerson: Boolean(stored.manual) });
  else choose(null);

  const render = (q) => {
    const found = searchCountries(q, { first: [chosen?.iso, guess?.iso].filter(Boolean) });
    list.render(found, { current: chosen?.iso, query: q });
    empty.hidden = found.length > 0;
    empty.textContent = found.length ? '' : `No country matches “${q.trim()}”.`;
    status.textContent = q.trim() ? countWord(found.length) : '';
  };
  const outside = (e) => {
    if (!wrap.contains(e.target)) close({ focus: null });
  };
  function open() {
    if (!pop.hidden) return;
    pop.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    search.value = '';
    render('');
    search.focus();
    document.addEventListener('pointerdown', outside, true);
  }
  function close({ focus = button } = {}) {
    if (pop.hidden) return;
    pop.hidden = true;
    button.setAttribute('aria-expanded', 'false');
    document.removeEventListener('pointerdown', outside, true);
    focus?.focus();
  }
  // A number written with its code: the code goes to the button, the box keeps the rest.
  const moveCode = (country = null) => {
    const split = splitNumber(input.value, chosen?.iso);
    if (!split) return false;
    choose(country || split.country, { byPerson: true });
    input.value = split.rest;
    fire(input);
    return true;
  };
  const pick = (c) => {
    if (!c) return;
    choose(c, { byPerson: true });
    // The form re-checks the number with its new code (a "choose your code" message clears).
    if (!moveCode(c)) fire(input);
    close({ focus: input });
  };

  button.addEventListener('click', () => (pop.hidden ? open() : close()));
  search.addEventListener('input', () => render(search.value));
  search.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      list.move(e.key === 'ArrowDown' ? 1 : -1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      pick(list.current);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'Tab') close({ focus: null });
  });
  onOptionClick(list.ul, pick);

  // A number with its code: the button follows while typing; pasted or autofilled, the code moves to it at once.
  input.addEventListener('input', (e) => {
    if (!e.isTrusted) return; // our own events
    const split = splitNumber(input.value, chosen?.iso);
    if (!split) return;
    if (split.country.iso !== chosen?.iso) choose(split.country, { byPerson: true });
    if (!/^(insertText|deleteContent)/.test(e.inputType || '')) moveCode();
  });
  input.addEventListener('blur', () => moveCode());

  return {
    compose: (value) => withCode(value, chosen),
    /** A number written without a code while no code is chosen: the form asks for one. */
    needsCode: (value) => Boolean(String(value ?? '').trim()) && !chosen && !/^(\+|00)/.test(String(value).trim()),
    // Only while the number is still empty: then the code is on the button, in view, before anything is typed.
    follow(iso) {
      const c = byIso(iso);
      if (!c || manual || input.value.trim()) return;
      choose(c);
    },
  };
}

/** Country of residence: type to find, choose from the list, or keep your own words. */
export function enhanceCountry(input, { onPick } = {}) {
  if (!input || input.dataset.enhanced) return null;
  input.dataset.enhanced = 'country';
  const id = input.id || 'enq-country';
  const wrap = node('div', { class: 'combo' });
  input.before(wrap);
  wrap.append(input);
  for (const [k, v] of Object.entries({ role: 'combobox', 'aria-autocomplete': 'list', 'aria-expanded': 'false', 'aria-controls': `${id}-list`, autocomplete: 'off', placeholder: 'Start typing, for example Germany' })) input.setAttribute(k, v);
  const list = listbox({ id: `${id}-list`, label: 'Countries', owner: input, dial: false });
  list.ul.classList.add('combo__list');
  list.ul.hidden = true;
  const status = node('p', { class: 'visually-hidden', role: 'status' });
  wrap.append(list.ul, status);

  const isOpen = () => !list.ul.hidden;
  const close = () => {
    list.ul.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
  };
  const openWith = (q) => {
    const found = searchCountries(q, { first: guess ? [guess.iso] : [] });
    list.render(found, { current: byName(input.value)?.iso || '', query: q, activate: Boolean(q.trim()) });
    list.ul.hidden = found.length === 0;
    input.setAttribute('aria-expanded', String(found.length > 0));
    status.textContent = q.trim() ? (found.length ? countWord(found.length) : 'No country matches. You can keep what you typed.') : '';
  };
  const pick = (c) => {
    if (!c) return;
    input.value = c.name;
    close();
    fire(input);
    onPick?.(c);
  };

  input.addEventListener('input', (e) => {
    if (!e.isTrusted) return; // our own events after a choice
    const exact = byName(input.value);
    if (exact && exact.name.toLowerCase() === input.value.trim().toLowerCase()) {
      close();
      onPick?.(exact);
    } else if (input.value.trim()) openWith(input.value);
    else close();
  });
  input.addEventListener('click', () => {
    if (!isOpen()) openWith(input.value);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen()) openWith(input.value);
      else list.move(e.key === 'ArrowDown' ? 1 : -1);
    } else if (e.key === 'Enter' && isOpen()) {
      e.preventDefault();
      pick(list.current);
    } else if (e.key === 'Escape' && isOpen()) {
      e.preventDefault();
      close();
    }
  });
  // Leaving: the list closes; another name for a country ("UK", "Holland") becomes its name.
  input.addEventListener('blur', () => {
    close();
    const c = byName(input.value);
    if (c && c.name !== input.value) {
      input.value = c.name;
      fire(input);
    }
    if (c) onPick?.(c);
  });
  onOptionClick(list.ul, pick);
  return { close };
}
