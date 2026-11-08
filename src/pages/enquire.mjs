/**
 * Book: the booking-request wizard (Date & Details → Traveller Info → Review & Send).
 *
 * The wizard keeps its four panels (service choice, details, contact,
 * review); the three-step stepper counts the steps after the choice, which
 * is skipped when the page opens with ?type=tour or ?type=transfer.
 *
 * Every step is rendered as plain HTML, so without JavaScript the page still
 * shows all the questions (it cannot send without JavaScript, and says so).
 * assets/js/enquiry.js turns the fieldsets into steps, validates with the
 * shared schema (assets/js/enquiry-schema.js, also used by the API) and
 * handles the three honest delivery states:
 *
 *   site.enquiry.enabled === false → a "paused" notice, no form
 *   site.enquiry.mode === 'preview' → the whole wizard works, nothing is sent,
 *                                      and the result says so plainly
 *   site.enquiry.mode === 'live'    → POST to the API; a GT- reference only
 *                                      after a real 201
 *
 * Prefill: ?type=tour&tour=<slug|package|custom>[&nights=<n>] and ?type=transfer[&transfer=<type>],
 * plus the plan carried from the search card and booking cards
 * (date, adults, children, pickup; pickup_location, destination, transfer_date).
 */
import { esc, icon, picture, breadcrumb, contactList, showRating, ratingRow, currencyPicker, artPanel } from '../partials/ui.mjs';
import { routeArt } from '../partials/route-art.mjs';
import { tours, groupLine } from '../data/tours.mjs';
import { packages } from '../data/packages.mjs';
import { types as transferTypes } from '../data/transfers.mjs';
import { SERVICES } from '../partials/living-cape.mjs';
import { licensedCredit } from '../partials/cards.mjs';
import { FIELDS, CUSTOM_TOUR, FLIGHT_TYPES, PACKAGE_SLUGS } from '../assets/js/enquiry-schema.js';
import { site as siteData } from '../data/site.mjs';

const crumbs = [
  { label: 'Home', href: './' },
  { label: 'Book', href: 'enquire/' },
];

/** The stepper: the three steps after the service choice. */
const STEPS = [
  { id: 'details', name: 'Date &amp; Details' },
  { id: 'contact', name: 'Traveller Info' },
  { id: 'review', name: 'Review &amp; Send' },
];

/* ---------- small markup helpers (ids are unique per path) ---------- */

const fid = (path, name) => `enq-${path ? `${path}-` : ''}${name.replace(/_/g, '-')}`;
const optionalTag = (hidden = false) => `<span class="field__optional" data-optional-tag${hidden ? ' hidden' : ''}> (optional)</span>`;
const errorEl = (id, name) => `<p class="field__error" id="${id}-error" data-error-for="${name}" hidden>${icon('alert')}<span data-error-text></span></p>`;
const showIf = (cond) => (cond ? ` data-show-if="${esc(cond)}"` : '');

/**
 * `dynamic` marks a field whose required state the script changes ('required'
 * or 'optional' is the state rendered before the script runs): the phone
 * number (required for WhatsApp or phone replies), the flight number
 * (required for airport arrivals) and the tour date (optional when flexible).
 */
function field({ path = '', name, label, type = 'text', hint = '', optional = false, dynamic = '', attrs = '', value = '', cond = '', cls = '' }) {
  const f = FIELDS[name];
  const id = fid(path, name);
  const hintId = hint ? `${id}-hint` : '';
  const max = f?.max && ['text', 'email', 'tel', 'search'].includes(type) ? ` maxlength="${f.max}"` : '';
  const isOptional = optional || dynamic === 'optional';
  const required = isOptional ? '' : ' aria-required="true"';
  const tag = optional ? optionalTag() : dynamic ? optionalTag(dynamic === 'required') : '';
  return `<div class="field${cls ? ` ${cls}` : ''}"${showIf(cond)}${dynamic ? ` data-dynamic="${name}"` : ''}>
      <label class="field__label" for="${id}">${esc(label)}${tag}</label>
      ${hint ? `<p class="field__hint" id="${hintId}">${hint}</p>` : ''}
      <input class="input" id="${id}" name="${name}" type="${type}"${value !== '' ? ` value="${esc(value)}"` : ''}${max}${hintId ? ` aria-describedby="${hintId}"` : ''}${required} ${attrs}>
      ${errorEl(id, name)}
    </div>`;
}

function textarea({ path = '', name, label, hint = '', rows = 4, placeholder = '' }) {
  const f = FIELDS[name];
  const id = fid(path, name);
  const hintId = hint ? `${id}-hint` : '';
  return `<div class="field">
      <label class="field__label" for="${id}">${esc(label)}${optionalTag()}</label>
      ${hint ? `<p class="field__hint" id="${hintId}">${hint}</p>` : ''}
      <textarea class="input" id="${id}" name="${name}" rows="${rows}" maxlength="${f.max}"${hintId ? ` aria-describedby="${hintId}"` : ''}${placeholder ? ` placeholder="${esc(placeholder)}"` : ''}></textarea>
      ${errorEl(id, name)}
    </div>`;
}

/** Nights, for the multi-day tours only (shown once one is chosen); blank means Good Times suggests the length. */
function nightsField(path) {
  const id = fid(path, 'nights');
  const hint = `${packages.map((x) => `${x.shortTitle}: ${x.duration}, so ${x.nights.min} nights or more`).join('. ')}. Leave it blank and we’ll suggest a length.`;
  // The range the multi-day tours themselves offer (packages.mjs › nights), as on their own pages.
  const min = Math.min(...packages.map((x) => x.nights.min));
  const max = Math.max(...packages.map((x) => x.nights.max));
  const options = Array.from({ length: max - min + 1 }, (_, i) => min + i).map((n) => `<option value="${n}">${n} night${n === 1 ? '' : 's'}</option>`);
  return `<div class="field mt-4"${showIf(`tour_slug=${PACKAGE_SLUGS.join('|')}`)}>
      <label class="field__label" for="${id}">Nights${optionalTag()}</label>
      <p class="field__hint" id="${id}-hint">${esc(hint)}</p>
      <select class="input" id="${id}" name="nights" aria-describedby="${id}-hint">
        <option value="">Not sure yet: we’ll suggest</option>
        ${options.join('\n        ')}
      </select>
      ${errorEl(id, 'nights')}
    </div>`;
}

/** A whole-number row with − / + buttons (the buttons need JavaScript; typing always works). */
function counter({ path, name, label, noun, value, hint = '' }) {
  const f = FIELDS[name];
  const id = fid(path, name);
  const hintId = hint ? `${id}-hint` : '';
  return `<div class="field field--counter">
      <div class="field--counter__text">
        <label class="field__label" for="${id}">${esc(label)}${f.required ? '' : optionalTag()}</label>
        ${hint ? `<p class="field__hint" id="${hintId}">${hint}</p>` : ''}
      </div>
      <div class="counter">
        <button type="button" class="counter__btn" data-counter="-1" aria-controls="${id}" aria-label="Fewer ${esc(noun)}" data-requires-js>${icon('minus')}</button>
        <input class="input counter__input" id="${id}" name="${name}" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="2" value="${value}" data-min="${f.min}" data-max="${f.max}" data-noun="${esc(noun)}"${hintId ? ` aria-describedby="${hintId}"` : ''}${f.required ? ' aria-required="true"' : ''} autocomplete="off">
        <button type="button" class="counter__btn" data-counter="1" aria-controls="${id}" aria-label="More ${esc(noun)}" data-requires-js>${icon('plus')}</button>
      </div>
      ${errorEl(id, name)}
    </div>`;
}

function checkbox({ path = '', name, label, hint = '', cls = '' }) {
  const id = fid(path, name);
  const hintId = hint ? `${id}-hint` : '';
  return `<div class="field field--check${cls ? ` ${cls}` : ''}">
      <div class="check">
        <input type="checkbox" id="${id}" name="${name}" value="yes"${hintId ? ` aria-describedby="${hintId}"` : ''}${FIELDS[name].required ? ' aria-required="true"' : ''}>
        <label for="${id}">${label}</label>
      </div>
      ${hint ? `<p class="field__hint" id="${hintId}">${hint}</p>` : ''}
      ${errorEl(id, name)}
    </div>`;
}

/** A radio group as a fieldset; `options` are { value, title, hint }. */
function radios({ path = '', name, legend, options, cls = '', checked = '', hint = '' }) {
  const id = fid(path, name);
  const hintId = hint ? `${id}-hint` : '';
  return `<fieldset class="fieldset field-group" id="${id}" data-group="${name}"${hintId ? ` aria-describedby="${hintId}"` : ''}>
      <legend class="fieldset__legend">${esc(legend)}</legend>
      ${hint ? `<p class="field__hint" id="${hintId}">${hint}</p>` : ''}
      <div class="choices ${cls}">
        ${options
          .map(
            (o) => `<label class="choice" for="${id}-${o.value}">
          <input type="radio" id="${id}-${o.value}" name="${name}" value="${esc(o.value)}"${o.value === checked ? ' checked' : ''}>
          <span><span class="choice__title">${esc(o.title)}</span>${o.hint ? `<span class="choice__hint">${esc(o.hint)}</span>` : ''}</span>
        </label>`,
          )
          .join('\n        ')}
      </div>
      ${errorEl(id, name)}
    </fieldset>`;
}

/** Step heading. `n` is the step number after the service choice (none for the choice itself). */
function stepHead({ n, id, eyebrow, title, lead }) {
  return `<p class="wizard-step__eyebrow">${n ? `Step ${n} of ${STEPS.length}: ` : ''}${eyebrow}</p>
      <h2 class="wizard-step__title" id="${id}" tabindex="-1">${esc(title)}</h2>
      ${lead ? `<p class="wizard-step__lead">${lead}</p>` : ''}
      <div class="error-summary" data-error-summary tabindex="-1" aria-labelledby="${id}-errors" hidden>
        <h3 class="error-summary__title" id="${id}-errors">${icon('alert')} Some information needs attention</h3>
        <ul class="error-summary__list" data-error-list></ul>
      </div>`;
}

const nav = ({ back = true, next }) => `<div class="wizard-nav" data-requires-js>
        ${back ? `<button type="button" class="btn gt-button gt-button--secondary gt-button--plain wizard-nav__back" data-back><span>Back</span></button>` : '<span></span>'}
        <button type="button" class="btn gt-button gt-button--primary wizard-nav__next" data-next><span>${esc(next)}</span></button>
      </div>`;

/** A booking card: a titled panel inside a step (date, travellers). */
const bookingCard = (id, title, body) => `<section class="booking-card" aria-labelledby="${id}">
        <h3 class="booking-card__title" id="${id}">${esc(title)}</h3>
        ${body}
      </section>`;

/* ---------- contact channels (verified only; numbers as selectable text) ---------- */

function channelsBlock(site, { intro = '' } = {}) {
  const list = contactList(site);
  if (list) return `${intro ? `<p>${intro}</p>` : ''}<div class="channels">${list}</div>`;
  return '';
}

/* ---------- tour summary cards (the script shows the one for the chosen tour) ---------- */

function tourSummary(t) {
  const ta = t.tripadvisor;
  const features = [
    { icon: 'clock', text: t.duration },
    { icon: 'users', text: groupLine(t) },
    { icon: 'pin', text: /^Pickup from your accommodation/.test(t.pickup) ? 'Pickup included' : t.pickup.startsWith('Pickup can be added') ? 'Transport as an add-on' : 'At the operator’s site' },
  ];
  return `<div class="booking-summary" data-tour-card="${esc(t.slug)}" hidden>
        <div class="booking-summary__media">${t.images.card ? picture({ name: t.images.card, sizes: '(min-width: 48em) 240px, 92vw' }) : artPanel()}</div>
        <div class="booking-summary__body">
          <p class="eyebrow">Your tour</p>
          <p class="booking-summary__title">${esc(t.shortTitle)}</p>
          ${showRating(ta) ? ratingRow({ rating: ta.rating, reviews: ta.reviews }) : ''}
          <ul class="booking-summary__features" role="list">${features.map((f) => `<li>${icon(f.icon)}<span>${esc(f.text)}</span></li>`).join('')}</ul>
          <a class="booking-summary__link" href="tours/${esc(t.slug)}/">View tour details</a>
        </div>
      </div>`;
}

/** A multi-day tour's card: its photo, or the illustrated route where Good Times has none. */
function packageSummary(p) {
  const features = [
    { icon: 'calendar', text: p.duration },
    { icon: 'users', text: 'Private: only your group' },
    { icon: 'chat', text: 'A plan and quote from us' },
  ];
  return `<div class="booking-summary" data-tour-card="${esc(p.slug)}" hidden>
        <div class="booking-summary__media">${p.images.card ? picture({ name: p.images.card, sizes: '(min-width: 48em) 240px, 92vw' }) : routeArt({ id: `route-summary-${p.slug}`, decorative: true })}</div>
        <div class="booking-summary__body">
          <p class="eyebrow">Your multi-day tour</p>
          <p class="booking-summary__title">${esc(p.shortTitle)}</p>
          <ul class="booking-summary__features" role="list">${features.map((f) => `<li>${icon(f.icon)}<span>${esc(f.text)}</span></li>`).join('')}</ul>
          <a class="booking-summary__link" href="packages/${esc(p.slug)}/">View tour details</a>
        </div>
      </div>`;
}

const customSummary = () => `<div class="booking-summary booking-summary--plain" data-tour-card="${CUSTOM_TOUR}" hidden>
        <div class="booking-summary__body">
          <p class="eyebrow">Your own route</p>
          <p class="booking-summary__title">A custom private day</p>
          <p class="booking-summary__text">Tell us what you would like to see in the requests box below, and we’ll reply with a plan, availability and a quote.</p>
        </div>
      </div>`;

/* ---------- the steps ---------- */

function serviceStep() {
  // Each choice shows its service's own photograph (the home page's card and the concierge's row: one per service)
  const service = (id) => SERVICES.find((s) => s.id === id);
  const card = (value, s, title, hint) => `<label class="service-choice" for="enq-type-${value}">
          <span class="service-choice__media" style="--focus: ${s.focus}">${picture({ name: s.image, alt: '', sizes: '(min-width: 64em) 340px, (min-width: 40em) 44vw, 92vw' })}${licensedCredit(s.image, 'span')}</span>
          <span class="service-choice__body">
            <input class="service-choice__input" type="radio" id="enq-type-${value}" name="enquiry_type" value="${value}" aria-labelledby="enq-type-${value}-title" aria-describedby="enq-type-${value}-hint">
            <span class="service-choice__title" id="enq-type-${value}-title">${title}</span>
            <span class="service-choice__hint" id="enq-type-${value}-hint">${hint}</span>
          </span>
        </label>`;
  return `<div class="wizard-step" data-wizard-step="service" role="group" aria-labelledby="enq-step-service">
      ${stepHead({ id: 'enq-step-service', eyebrow: 'Start here', title: 'What would you like to book?', lead: 'Choose one, and we ask only the questions that matter for it.' })}
      <fieldset class="fieldset field-group" id="enq-enquiry-type" data-group="enquiry_type">
        <legend class="visually-hidden">Service</legend>
        <div class="service-choices">
        ${card('tour', service('tours'), 'A private tour', 'Choose a tour or activity, a date and your pickup area')}
        ${card('transfer', service('airport'), 'A transfer', 'The airport or another route: tell us when and where')}
        </div>
        ${errorEl('enq-enquiry-type', 'enquiry_type')}
      </fieldset>
      ${nav({ back: false, next: 'Continue' })}
    </div>`;
}

function tourStep() {
  const p = 'tour';
  return `<div class="wizard-step" data-wizard-step="details" data-path="tour" role="group" aria-labelledby="enq-step-tour">
      ${stepHead({ n: 1, id: 'enq-step-tour', eyebrow: 'Date &amp; details', title: 'Choose your date and travellers' })}
      <div class="booking-summaries" data-tour-summary data-requires-js>
        ${tours.map(tourSummary).join('\n        ')}
        ${packages.map(packageSummary).join('\n        ')}
        ${customSummary()}
      </div>
      <div class="field">
        <label class="field__label" for="${fid(p, 'tour_slug')}">Tour or activity</label>
        <p class="field__hint" id="${fid(p, 'tour_slug')}-hint">Everything is private: only your group. Not sure? Compare the <a href="tours/">tours</a> and the <a href="packages/">multi-day tour</a>; your answers stay in this tab.</p>
        <select class="input" id="${fid(p, 'tour_slug')}" name="tour_slug" aria-describedby="${fid(p, 'tour_slug')}-hint" aria-required="true">
          <option value="">Choose a tour or activity</option>
          <optgroup label="Private tours and activities">
          ${tours.map((t) => `<option value="${esc(t.slug)}">${esc(t.shortTitle)}</option>`).join('\n          ')}
          </optgroup>
          <optgroup label="Multi-day tours">
          ${packages.map((x) => `<option value="${esc(x.slug)}">${esc(x.shortTitle)} (${esc(x.duration)})</option>`).join('\n          ')}
          </optgroup>
          <option value="${CUSTOM_TOUR}">Not sure yet / plan a custom day</option>
        </select>
        ${errorEl(fid(p, 'tour_slug'), 'tour_slug')}
      </div>
      <div class="booking-cols mt-5">
        ${bookingCard(
          'enq-tour-date-title',
          'Select Your Date',
          `${field({ path: p, name: 'preferred_date', label: 'Preferred date', type: 'date', dynamic: 'required', hint: 'We’ll confirm availability for your date with your quote. For a multi-day tour, the day you would like to start.', attrs: 'autocomplete="off"' })}
        <div class="calendar" data-calendar-for="${fid(p, 'preferred_date')}" data-requires-js></div>
        ${checkbox({ path: p, name: 'dates_flexible', label: 'My dates are flexible', cls: 'mt-4' })}
        ${field({ path: p, name: 'flexible_dates', label: 'Which dates could work?', optional: true, hint: 'For example “any day from 10 to 14 November”.', cond: 'dates_flexible', cls: 'mt-4', attrs: 'autocomplete="off"' })}
        ${nightsField(p)}`,
        )}
        ${bookingCard(
          'enq-tour-travellers-title',
          'Select Travellers',
          `${counter({ path: p, name: 'adults', label: 'Adults', noun: 'adults', value: 2, hint: 'Ages 12 and up' })}
        ${counter({ path: p, name: 'children', label: 'Children', noun: 'children', value: 0, hint: 'Ages 0 to 11, infants included' })}
        ${field({ path: p, name: 'children_ages', label: 'Children’s ages', optional: true, hint: 'Helps us plan the day, for example “4 and 7”.', cond: 'children>0', cls: 'mt-4', attrs: 'autocomplete="off"' })}
        <p class="booking-card__note">Our rates are per private group: children count towards its size, and we confirm your price with your quote.</p>`,
        )}
      </div>
      ${field({ path: p, name: 'pickup_area', label: 'Pickup area or accommodation', hint: 'Hotel name, address or suburb in Cape Town.', cls: 'mt-5', attrs: 'autocomplete="off"' })}
      <div class="mt-5">${textarea({ name: 'special_requests', path: p, label: 'Special requests', hint: 'Mobility, pace, dietary needs, language, a custom route or anything else.', rows: 4 })}</div>
      <div class="booking-total" data-total-row data-requires-js>
        <p class="booking-total__text" data-total-text>We’ll confirm your quote</p>
        <p class="booking-total__note">Not an amount due. We’ll confirm availability and your price with your quote.</p>
        ${siteData.prices.show ? `<div class="currency-area" data-currency-area>${currencyPicker({ id: 'currency-booking' })}</div>` : ''}
      </div>
      ${nav({ next: 'Continue to Traveller Details' })}
    </div>`;
}

function transferStep() {
  const p = 'transfer';
  const flightCond = `transfer_type=${FLIGHT_TYPES.join('|')}`;
  return `<div class="wizard-step" data-wizard-step="details" data-path="transfer" role="group" aria-labelledby="enq-step-transfer">
      ${stepHead({ n: 1, id: 'enq-step-transfer', eyebrow: 'Date &amp; details', title: 'Plan your transfer' })}
      ${radios({ path: p, name: 'transfer_type', legend: 'Transfer type', cls: 'choices--grid', options: transferTypes.map((t) => ({ value: t.id, title: t.label, hint: t.hint })) })}
      <div class="form-row form-row--2 mt-5">
        ${field({ path: p, name: 'pickup_location', label: 'Pickup location', hint: 'Airport, hotel or address.', attrs: 'autocomplete="off"' })}
        ${field({ path: p, name: 'destination', label: 'Destination', hint: 'Hotel, address or reserve.', attrs: 'autocomplete="off"' })}
      </div>
      <div class="booking-cols mt-5">
        ${bookingCard(
          'enq-transfer-date-title',
          'Select Your Date',
          `${field({ path: p, name: 'transfer_date', label: 'Date', type: 'date', attrs: 'autocomplete="off"' })}
        <div class="calendar" data-calendar-for="${fid(p, 'transfer_date')}" data-requires-js></div>
        ${field({ path: p, name: 'transfer_time', label: 'Pickup time (SAST)', type: 'time', hint: 'Cape Town time.', cls: 'mt-4', attrs: 'autocomplete="off"' })}
        ${field({ path: p, name: 'flight_number', label: 'Flight number', dynamic: 'required', hint: 'Required for airport arrivals, for example SA 123 or BA59.', cond: flightCond, cls: 'mt-4', attrs: 'autocomplete="off" autocapitalize="characters" spellcheck="false"' })}`,
        )}
        ${bookingCard(
          'enq-transfer-travellers-title',
          'Select Travellers',
          `${counter({ path: p, name: 'adults', label: 'Adults', noun: 'adults', value: 2, hint: 'Ages 12 and up' })}
        ${counter({ path: p, name: 'children', label: 'Children', noun: 'children', value: 0, hint: 'Ages 0 to 11, infants included' })}
        ${field({ path: p, name: 'child_seats', label: 'Child seats', optional: true, hint: 'If you need child seats, the children’s ages, for example “1 and 4”. We confirm what we can provide.', cond: 'children>0', cls: 'mt-4', attrs: 'autocomplete="off"' })}
        ${counter({ path: p, name: 'suitcases', label: 'Suitcases', noun: 'suitcases', value: 0 })}
        ${field({ path: p, name: 'oversized_items', label: 'Oversized items', optional: true, hint: 'Golf bags, surfboards, bikes.', cls: 'mt-4', attrs: 'autocomplete="off"' })}`,
        )}
      </div>
      <div class="return-leg mt-5">
        ${checkbox({ path: p, name: 'return_trip', label: 'Add a return transfer', hint: 'The same route in reverse, on a later date or time.' })}
        <div class="form-row form-row--2 mt-4" data-show-if="return_trip">
          ${field({ path: p, name: 'return_date', label: 'Return date', type: 'date', attrs: 'autocomplete="off"' })}
          ${field({ path: p, name: 'return_time', label: 'Return pickup time (SAST)', type: 'time', attrs: 'autocomplete="off"' })}
        </div>
      </div>
      <div class="mt-5">${textarea({ name: 'notes', path: p, label: 'Notes', hint: 'Anything the driver should know, including any mobility needs.', rows: 3 })}</div>
      <div class="booking-total" data-requires-js>
        <p class="booking-total__text">We’ll confirm your quote</p>
        <p class="booking-total__note">Not an amount due. We’ll confirm availability and your price with your quote.</p>
      </div>
      ${nav({ next: 'Continue to Traveller Details' })}
    </div>`;
}

// NOTE: the consent wording below and the privacy notice it links to still need Good Times'
// confirmation (and a legal check under POPIA / GDPR) before the live launch.
function contactStep() {
  return `<div class="wizard-step" data-wizard-step="contact" role="group" aria-labelledby="enq-step-contact">
      ${stepHead({ n: 2, id: 'enq-step-contact', eyebrow: 'Traveller info', title: 'Who is travelling, and how should we reply?' })}
      ${field({ name: 'name', label: 'Full name', attrs: 'autocomplete="name"' })}
      <div class="form-row form-row--2 mt-5">
        ${field({ name: 'email', label: 'Email address', type: 'email', attrs: 'autocomplete="email" inputmode="email" spellcheck="false"' })}
        ${field({ name: 'phone', label: 'Phone or WhatsApp number', type: 'tel', dynamic: 'optional', hint: 'With your country code, for example +27 82 123 4567.', attrs: 'autocomplete="tel" inputmode="tel"' })}
      </div>
      <div class="mt-5">${radios({
        name: 'preferred_contact_method',
        legend: 'How would you like us to reply?',
        cls: 'choices--inline',
        checked: 'email',
        options: [
          { value: 'email', title: 'Email' },
          { value: 'whatsapp', title: 'WhatsApp' },
          { value: 'phone', title: 'Phone call' },
        ],
      })}</div>
      ${field({ name: 'country', label: 'Country of residence', optional: true, cls: 'mt-5 field--narrow', attrs: 'autocomplete="country-name"' })}
      ${checkbox({
        name: 'consent',
        label: 'I agree that Good Times in Cape Town may use these details to reply to this enquiry.',
        hint: 'Read how your details are handled in the <a href="privacy/">privacy notice</a>.',
        cls: 'mt-6 field--consent',
      })}
      ${checkbox({
        name: 'terms',
        // A new tab, so the form stays as it is (it also survives a same-tab visit: the draft is in sessionStorage).
        label: 'I have read and agree to the <a href="terms/" target="_blank" rel="noopener">Terms &amp; Conditions<span class="visually-hidden"> (opens in a new tab)</span></a>.',
        cls: 'mt-4 field--consent',
      })}
      ${nav({ next: 'Continue to Review' })}
    </div>`;
}

function reviewStep(site) {
  const preview = site.enquiry.mode !== 'live';
  return `<div class="wizard-step" data-wizard-step="review" role="group" aria-labelledby="enq-step-review" data-requires-js>
      ${stepHead({ n: 3, id: 'enq-step-review', eyebrow: 'Review &amp; send', title: 'Check your enquiry', lead: 'Make sure everything is right, then send it to us. Use Edit to change any part.' })}
      <div class="enq-summary" data-review></div>
      <div class="notice notice--warning enq-summary-notice">${icon('info')}<p><strong>Sending an enquiry does not create a confirmed booking.</strong> We’ll reply to confirm availability and a quote.</p></div>
      ${preview ? `<p class="preview-note">${icon('info')}<span><strong>Preview build.</strong> Pressing send will not contact us; nothing leaves this page.</span></p>` : ''}
      <div class="notice notice--error submit-error" data-submit-error tabindex="-1" hidden>${icon('alert')}<p data-submit-error-text></p></div>
      <div class="wizard-nav">
        <button type="button" class="btn gt-button gt-button--secondary gt-button--plain wizard-nav__back" data-back><span>Back</span></button>
        <button type="submit" class="btn gt-button gt-button--primary wizard-nav__next wizard-submit" data-submit disabled><span class="spinner" aria-hidden="true"></span><span data-submit-label>Send Enquiry</span></button>
      </div>
    </div>`;
}

/* ---------- results (only the ones this mode can produce are rendered) ---------- */

function liveResults(site) {
  const wa = site.contact.whatsapp.verified
    ? `<a class="btn gt-button gt-button--secondary" data-whatsapp data-number="${site.contact.whatsapp.e164.replace(/\D/g, '')}" href="https://wa.me/${site.contact.whatsapp.e164.replace(/\D/g, '')}" rel="noopener" target="_blank">${icon('whatsapp')}<span>Chat on WhatsApp</span></a>`
    : '';
  const actions = `<div class="cluster wizard-result__actions">
        ${wa}
        <a class="btn gt-button gt-button--primary" href="tours/"><span>Explore Tours</span></a>
        <button type="button" class="btn gt-button gt-button--secondary" data-restart>Start a New Enquiry</button>
      </div>`;
  const next = `<h3 class="wizard-result__subtitle">What happens next</h3>
      <ol class="next-steps next-steps--compact">
        <li><span class="next-steps__title">We check availability</span><span class="next-steps__text">for the date, time and group you gave.</span></li>
        <li><span class="next-steps__title">You receive your personalised quote</span><span class="next-steps__text">through the contact method you chose.</span></li>
        <li><span class="next-steps__title">Say yes, and we confirm</span><span class="next-steps__text">Once you’re happy with the arrangements, we’ll finalise your booking.</span></li>
      </ol>`;
  return `<div class="wizard-result wizard-result--success" data-result="success" hidden>
      <div class="wizard-result__icon">${icon('check')}</div>
      <p class="eyebrow">Enquiry received</p>
      <h2 class="wizard-result__title" tabindex="-1">Thank you. We have your enquiry.</h2>
      <p class="reference">Your reference <strong data-ref></strong></p>
      <p class="wizard-result__key"><strong>Enquiry received; your booking is not yet confirmed.</strong></p>
      <p class="wizard-result__text" data-emailed="yes">An acknowledgement is on its way to <strong data-email></strong>. Please quote your reference if you contact us.</p>
      <p class="wizard-result__text" data-emailed="no" hidden>Your enquiry is safely stored. The acknowledgement email may take a little longer than usual to arrive. Please quote your reference if you contact us.</p>
      ${next}
      ${actions}
    </div>
    <div class="wizard-result wizard-result--duplicate" data-result="duplicate" hidden>
      <div class="wizard-result__icon wizard-result__icon--info">${icon('info')}</div>
      <p class="eyebrow">Already received</p>
      <h2 class="wizard-result__title" tabindex="-1">We already have this enquiry.</h2>
      <p class="reference">Your reference <strong data-ref></strong></p>
      <p class="wizard-result__key"><strong>Enquiry received; your booking is not yet confirmed.</strong></p>
      <p class="wizard-result__text">There is no need to send it again. If something has changed, reply to the acknowledgement email and quote your reference.</p>
      ${actions}
    </div>`;
}

function previewResult() {
  return `<div class="wizard-result wizard-result--preview" data-result="preview" hidden>
      <div class="wizard-result__icon wizard-result__icon--info">${icon('info')}</div>
      <p class="eyebrow">Preview build</p>
      <h2 class="wizard-result__title" tabindex="-1">Preview only: this enquiry was not sent to us.</h2>
      <p class="wizard-result__text">This is a preview build of the website, so nothing left your browser and we have received nothing. On the live site, we receive these details, the visitor gets an acknowledgement email, and this screen shows an enquiry reference to quote when getting in touch.</p>
      <h3 class="wizard-result__subtitle">What would have been sent</h3>
      <div class="enq-summary enq-summary--static" data-preview-summary></div>
      <details class="preview-data">
        <summary>Technical view: the data the live site would send</summary>
        <pre data-preview-json></pre>
      </details>
      <div class="cluster wizard-result__actions">
        <button type="button" class="btn gt-button gt-button--primary" data-back-to-review><span>Back to Review</span></button>
        <button type="button" class="btn gt-button gt-button--secondary" data-restart>Start Again</button>
      </div>
    </div>`;
}

/* ---------- page ---------- */

function clientConfig(site) {
  const cfg = {
    mode: site.enquiry.mode === 'live' ? 'live' : 'preview',
    endpoint: site.enquiry.endpoint,
    referencePrefix: site.enquiry.referencePrefix,
    whatsapp: site.contact.whatsapp.verified ? site.contact.whatsapp.e164.replace(/\D/g, '') : '',
    tours: Object.fromEntries([...tours.map((t) => [t.slug, t.shortTitle]), ...packages.map((x) => [x.slug, x.shortTitle]), [CUSTOM_TOUR, 'Not sure yet / a custom day']]),
    // Nights to preselect when a package is chosen and none is set yet (only where the package has a set length).
    packageNights: Object.fromEntries(packages.filter((x) => x.nights.suggested).map((x) => [x.slug, x.nights.suggested])),
    transferTypes: Object.fromEntries(transferTypes.map((t) => [t.id, t.label])),
    // Good Times' published group rates in ZAR (tours and multi-day tours), for the total row; never an amount due.
    showPrices: Boolean(site.prices.show),
    prices: Object.fromEntries([...tours, ...packages].filter((t) => t.price?.currency === 'ZAR').map((t) => [t.slug, { unit: t.price.unit, tiers: t.price.tiers }])),
  };
  return JSON.stringify(cfg).replace(/</g, '\\u003c');
}

function aside(site) {
  return `<aside class="enquiry-aside" aria-label="About your enquiry">
      <section class="aside-card" aria-labelledby="enq-next-title">
        <h2 class="aside-card__title" id="enq-next-title">What happens next</h2>
        <ol class="next-steps">
          <li><span class="next-steps__title">Tell us what you’re after</span><span class="next-steps__text">Choose a tour or a transfer and tell us what you need.</span></li>
          <li><span class="next-steps__title">Get your personalised quote</span><span class="next-steps__text">We’ll check availability and reply by email, WhatsApp or phone, as you prefer.</span></li>
          <li><span class="next-steps__title">Say yes, and we confirm</span><span class="next-steps__text">Once you’re happy with the arrangements, we’ll finalise your booking.</span></li>
        </ol>
      </section>
      <section class="aside-card aside-card--summary" aria-labelledby="enq-summary-title" data-aside-summary data-requires-js>
        <h2 class="aside-card__title" id="enq-summary-title">Your enquiry</h2>
        <dl class="aside-summary" data-aside-list></dl>
        <p class="aside-summary__note">${icon('info')} No booking is confirmed yet.</p>
      </section>
      ${(() => {
        const block = channelsBlock(site);
        return block ? `<section class="aside-card aside-card--plain" aria-labelledby="enq-talk-title"><h2 class="aside-card__title" id="enq-talk-title">Prefer to talk?</h2>${block}</section>` : '';
      })()}
    </aside>`;
}

function disabledNotice(site) {
  const block = channelsBlock(site, { intro: 'You can still reach us directly:' });
  return `<div class="wizard wizard--paused">
      <div class="notice notice--warning">${icon('info')}<div><strong>Online enquiries are paused at the moment.</strong><p>Please try again later.</p></div></div>
      ${block ? `<div class="mt-5">${block}</div>` : ''}
    </div>`;
}

function wizard(site) {
  const live = site.enquiry.mode === 'live';
  return `<div class="wizard" data-enquiry data-mode="${live ? 'live' : 'preview'}">
      <script type="application/json" id="enquiry-config">${clientConfig(site)}</script>
      <noscript><div class="notice notice--warning wizard-alert">${icon('info')}<div><strong>This form needs JavaScript to send.</strong><p>You can read all the questions below, but sending an enquiry needs JavaScript switched on.</p>${channelsBlock(site)}</div></div></noscript>
      <div class="notice notice--warning wizard-alert wizard-fallback-note">${icon('alert')}<div><strong>The interactive form did not load.</strong><p>Please refresh the page to try again.</p>${channelsBlock(site)}</div></div>
      <div class="notice wizard-alert" data-offline hidden>${icon('info')}<div><strong>You appear to be offline.</strong><p>You can keep filling in the form; your answers are saved in this browser tab. Reconnect before you send.</p></div></div>
      <ol class="wizard-progress" data-progress aria-label="Booking progress" data-requires-js hidden>
        ${STEPS.map((s, i) => `<li class="wizard-progress__item" data-progress-step="${s.id}"${i === 0 ? ' aria-current="step"' : ''}><span class="wizard-progress__num" aria-hidden="true"><span class="wizard-progress__digit">${i + 1}</span>${icon('check', 'wizard-progress__check')}</span><span class="wizard-progress__name"><span class="visually-hidden">Step ${i + 1}: </span>${s.name}</span><span class="visually-hidden" data-progress-state></span></li>`).join('\n        ')}
      </ol>
      <div class="visually-hidden" role="status" aria-live="polite" data-live></div>
      <form class="wizard-form" method="post" novalidate data-enquiry-form>
        <div class="honeypot" aria-hidden="true"><label for="enq-hp">Leave this field empty</label><input type="text" id="enq-hp" name="gt_hp_check" value="" tabindex="-1" autocomplete="off" data-lpignore="true" data-1p-ignore data-form-type="other"></div>
        ${serviceStep()}
        ${tourStep()}
        ${transferStep()}
        ${contactStep()}
        ${reviewStep(site)}
      </form>
      ${live ? liveResults(site) : previewResult()}
    </div>`;
}

export const page = {
  path: 'enquire/index.html',
  nav: 'enquire/',
  title: 'Book a private tour or transfer',
  description: 'Send Good Times in Cape Town a booking request for a private tour, an activity or an airport transfer. We reply to confirm availability and a quote; a request is not a confirmed booking.',
  breadcrumbs: crumbs,
  styles: ['assets/css/enquiry.css'],
  scripts: siteData.enquiry.enabled === false ? [] : [{ module: 'assets/js/enquiry.js' }],
  body: ({ site }) => {
    const enabled = site.enquiry.enabled !== false;
    return `
<section class="page-head page-head--booking">
  <div class="container">
    ${breadcrumb(crumbs)}
    <h1 data-page-title data-title-tour="Book Your Tour" data-title-package="Book Your Multi-day Tour" data-title-transfer="Book Your Transfer">Book with us</h1>
    <p class="lead">Tell us about your day and we’ll reply with availability and a quote.</p>
  </div>
</section>

<section class="section enquiry-section">
  <div class="container enquiry-layout">
    <div class="enquiry-main">
    ${enabled ? wizard(site) : disabledNotice(site)}
    </div>
    ${aside(site)}
  </div>
</section>`;
  },
};
