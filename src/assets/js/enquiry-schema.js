/* Good Times in Cape Town: enquiry schema (ONE source of truth)
   This file runs unchanged in two places:
     · the browser, as an ES module imported by assets/js/enquiry.js
     · Node, re-exported by lib/enquiries/schema.mjs for the API (and
       imported by src/pages/enquire.mjs at build time for field limits)
   It therefore has no imports and touches no globals. Keep it that way.

   Two request paths share one endpoint and one table:
     enquiry_type = 'tour'      a private tour enquiry
     enquiry_type = 'transfer'  a transfer request
   plus shared contact details. validateEnquiry() returns field-keyed errors
   (in form order) so the wizard can build an error summary from them. */

export const ENQUIRY_TYPES = ['tour', 'transfer'];

/** Wizard sections, in order. `details` is `tour` or `transfer` depending on the chosen path. */
export const SECTIONS = ['service', 'tour', 'transfer', 'contact'];

/**
 * Tour slugs the form accepts, in catalogue order. The browser cannot import
 * src/data/tours.mjs, so the list lives here; test/schema.test.mjs fails if it
 * ever differs from TOUR_SLUGS in src/data/tours.mjs.
 */
export const TOUR_SLUGS = [
  'cape-peninsula-private-tour',
  'cape-town-city-private-tour',
  'cape-winelands-private-tour',
  'township-private-tour',
  'private-cape-town-experience',
  'whale-watching-private-tour',
  'cape-agulhas-private-tour',
  'shark-cage-diving',
  'quad-biking',
  'sky-diving',
];

/**
 * Multi-day tour slugs (src/data/packages.mjs). A multi-day request
 * travels the tour path with the package as its tour_slug, plus the nights
 * asked for; test/schema.test.mjs keeps this list equal to the data.
 */
export const PACKAGE_SLUGS = ['garden-route-private-tour'];

/** "Not sure yet / plan a custom day". */
export const CUSTOM_TOUR = 'custom';

/** Transfer request types (kept equal to TRANSFER_TYPES in src/data/transfers.mjs by a test). */
export const TRANSFER_TYPES = ['airport-arrival', 'airport-departure', 'other'];

/** Types for which a flight number is required (the `flight: true` types in src/data/transfers.mjs). */
export const FLIGHT_REQUIRED_TYPES = ['airport-arrival'];

/** Types for which the form offers a flight number field at all. */
export const FLIGHT_TYPES = ['airport-arrival', 'airport-departure'];

export const CONTACT_METHODS = ['email', 'whatsapp', 'phone'];

/**
 * All dates and times on the form are Cape Town time. South Africa Standard
 * Time is UTC+2 all year (no daylight saving), so a fixed offset is exact and
 * behaves the same in every browser and on the server.
 */
export const TIMEZONE = 'Africa/Johannesburg';
export const SAST_OFFSET = '+02:00';
const SAST_MS = 2 * 3600 * 1000;
const MAX_YEARS_AHEAD = 3;

/** Today's date in Cape Town as YYYY-MM-DD. `now` is injectable for tests. */
export function todayInSast(now = Date.now()) {
  return new Date(Number(now) + SAST_MS).toISOString().slice(0, 10);
}

/** Epoch milliseconds for a Cape Town date and time ('2026-10-17', '14:30'). NaN if either is malformed. */
export function sastEpoch(date, time = '00:00') {
  if (!isValidDate(date) || !isValidTime(time)) return NaN;
  return Date.parse(`${date}T${time}:00${SAST_OFFSET}`);
}

/** ISO 8601 timestamp with the SAST offset, for a timestamptz column. '' when incomplete. */
export function sastIso(date, time) {
  return isValidDate(date) && isValidTime(time) ? `${date}T${time}:00${SAST_OFFSET}` : '';
}

/**
 * The booking rules: the one place to change them. Approved by the owner on 8 Nov 2026
 * (docs/APPROVAL_REGISTER.md, D9): how many vehicles can be out at once, the notice
 * needed, the transfer hours and how long each transfer holds a vehicle. The form uses them for
 * the dates and times it offers; the API applies the same checks and, with
 * them, keeps every request within the vehicles available (lib/bookings/
 * availability.mjs). A single day's vehicle count can be changed, or the day
 * closed, from the staff dashboard (/admin/availability).
 */
export const BOOKING_RULES = Object.freeze({
  /** Vehicles with a driver that can be out at the same time on a normal day. */
  vehicles: 2,
  /** Minimum notice before a tour date or a transfer pickup, in hours. */
  minNoticeHours: 24,
  /** Earliest and latest transfer pickup times, Cape Town time. */
  transferHours: Object.freeze({ first: '04:00', last: '23:00' }),
  /** How long one transfer holds a vehicle, in minutes, by transfer type; 'day' holds it for the whole date. */
  transferHold: Object.freeze({ 'airport-arrival': 120, 'airport-departure': 120, other: 180 }),
  // A day tour holds a vehicle for its whole date; a package for its nights plus one day.
});

/** The first Cape Town date that meets the minimum notice. */
export function earliestDate(now = Date.now()) {
  return todayInSast(Number(now) + BOOKING_RULES.minNoticeHours * 3600 * 1000);
}

const noticeText = () => `${BOOKING_RULES.minNoticeHours} hours’ notice`;

/**
 * Field specification, in form order. `section` places a field in a wizard
 * step (an array when both detail paths use it). `type` drives coercion in
 * both the browser and the API. `messages.required` replaces the generic
 * wording where a plain "X is required" would read badly.
 */
export const FIELDS = {
  // Step 1: service
  enquiry_type: { section: 'service', type: 'enum', values: ENQUIRY_TYPES, required: true, label: 'Service', messages: { required: 'Choose a private tour or a transfer request.' } },

  // Step 2a: tour enquiry
  tour_slug: { section: 'tour', type: 'enum', values: [...TOUR_SLUGS, ...PACKAGE_SLUGS, CUSTOM_TOUR], required: true, label: 'Tour', messages: { required: 'Choose a tour or activity, or “Not sure yet”.', invalid: 'Choose a tour or activity from the list.' } },
  preferred_date: { section: 'tour', type: 'date', label: 'Preferred date' },
  dates_flexible: { section: 'tour', type: 'bool', label: 'My dates are flexible' },
  flexible_dates: { section: 'tour', type: 'text', max: 300, label: 'Dates that could work' },
  // Multi-day tours only; 0 means "not sure yet", and Good Times suggests the length.
  nights: { section: 'tour', type: 'int', min: 0, max: 30, default: 0, label: 'Nights' },

  // Step 2b: transfer request
  transfer_type: { section: 'transfer', type: 'enum', values: TRANSFER_TYPES, required: true, label: 'Transfer type', messages: { required: 'Choose the type of transfer.', invalid: 'Choose a transfer type from the list.' } },
  pickup_location: { section: 'transfer', type: 'text', required: true, max: 200, label: 'Pickup location', messages: { required: 'Tell us where to collect you.' } },
  destination: { section: 'transfer', type: 'text', required: true, max: 200, label: 'Destination', messages: { required: 'Tell us where you are going.' } },
  transfer_date: { section: 'transfer', type: 'date', required: true, label: 'Date', messages: { required: 'Choose the transfer date.' } },
  transfer_time: { section: 'transfer', type: 'time', required: true, label: 'Pickup time', messages: { required: 'Choose a pickup time.' } },
  flight_number: { section: 'transfer', type: 'flight', max: 12, label: 'Flight number' },

  // Both detail paths
  adults: { section: ['tour', 'transfer'], type: 'int', required: true, min: 1, max: 30, label: 'Adults', messages: { required: 'Enter the number of adults (1 to 30).' } },
  children: { section: ['tour', 'transfer'], type: 'int', min: 0, max: 20, default: 0, label: 'Children' },
  children_ages: { section: 'tour', type: 'text', max: 120, label: 'Children’s ages' },
  pickup_area: { section: 'tour', type: 'text', required: true, max: 200, label: 'Pickup area or accommodation', messages: { required: 'Tell us where to collect you: a hotel, address or area.' } },
  special_requests: { section: 'tour', type: 'textarea', max: 2000, label: 'Special requests' },

  child_seats: { section: 'transfer', type: 'text', max: 120, label: 'Child seats' },
  suitcases: { section: 'transfer', type: 'int', min: 0, max: 40, default: 0, label: 'Suitcases' },
  oversized_items: { section: 'transfer', type: 'text', max: 200, label: 'Oversized items' },
  return_trip: { section: 'transfer', type: 'bool', label: 'Add a return transfer' },
  return_date: { section: 'transfer', type: 'date', label: 'Return date' },
  return_time: { section: 'transfer', type: 'time', label: 'Return pickup time' },
  notes: { section: 'transfer', type: 'textarea', max: 2000, label: 'Notes' },

  // Step 3: contact
  name: { section: 'contact', type: 'text', required: true, min: 2, max: 120, label: 'Full name', messages: { required: 'Enter your full name.' } },
  email: { section: 'contact', type: 'email', required: true, max: 200, label: 'Email address', messages: { required: 'Enter your email address.' } },
  phone: { section: 'contact', type: 'phone', max: 40, label: 'Phone or WhatsApp number' },
  preferred_contact_method: { section: 'contact', type: 'enum', values: CONTACT_METHODS, default: 'email', label: 'Preferred contact method', messages: { invalid: 'Choose how you would like us to reply.' } },
  country: { section: 'contact', type: 'text', max: 80, label: 'Country of residence' },
  consent: { section: 'contact', type: 'bool', required: true, label: 'Consent', messages: { required: 'Tick the box to let Good Times use these details to reply.' } },
  // Acceptance of the Terms & Conditions (D78); the API records the version accepted, with the server's time.
  terms: { section: 'contact', type: 'bool', required: true, label: 'Terms & Conditions', messages: { required: 'Tick the box to agree to the Terms & Conditions.' } },
};

/**
 * The ONE email rule, shared by the form, the API and the email layer (the
 * reply-to check in lib/email/sanitise.mjs imports isValidEmail), so an
 * address the form accepts can always be used as reply-to. Deliberately
 * strict ASCII: letters, digits and . _ % + - before the @.
 */
export const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
export const EMAIL_MESSAGE = 'Enter an email address like name@example.com, using only letters without accents, numbers and . _ % + - before the @.';
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
// Airline designator (two characters, at least one a letter, or three letters) then 1–4 digits and an optional suffix.
const FLIGHT_RE = /^(?:([A-Z]{3})|([A-Z]{2}|[A-Z]\d|\d[A-Z]))\s?(\d{1,4}[A-Z]?)$/;

export const inSection = (field, section) => (Array.isArray(field.section) ? field.section.includes(section) : field.section === section);

/** Collapse whitespace and drop control characters. Newlines survive only when `multiline`. */
export function cleanText(value, { multiline = false } = {}) {
  let s = String(value ?? '');
  s = multiline ? s.replace(/\r\n?/g, '\n').replace(/[^\S\n]+/g, ' ').replace(/\n{3,}/g, '\n\n') : s.replace(/\s+/g, ' ');
  // eslint-disable-next-line no-control-regex
  s = s.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '');
  return s.trim();
}

export function isValidEmail(v) {
  if (typeof v !== 'string' || v.length > 200 || !EMAIL_RE.test(v)) return false;
  const [local, domain] = v.split('@');
  // No leading, trailing or doubled dots in the local part; no label starting or ending with a hyphen.
  if (local.startsWith('.') || local.endsWith('.') || local.includes('..')) return false;
  return domain.split('.').every((label) => label && !label.startsWith('-') && !label.endsWith('-'));
}

/** International number: a leading + (or 00) and country code, 8–15 digits in all. */
export function isValidPhone(v) {
  if (typeof v !== 'string' || !/^(\+|00)[1-9][0-9 ()./-]{5,}$/.test(v.trim())) return false;
  const digits = v.replace(/\D/g, '').replace(/^00/, '').length;
  return digits >= 8 && digits <= 15;
}

export function isValidDate(v) {
  if (typeof v !== 'string' || !DATE_RE.test(v)) return false;
  const d = new Date(v + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

export function isValidTime(v) {
  return typeof v === 'string' && TIME_RE.test(v);
}

/** 'sa123' → 'SA 123'; null when it does not look like a flight number. */
export function normaliseFlight(v) {
  const s = String(v ?? '').toUpperCase().replace(/\s+/g, ' ').trim();
  const m = FLIGHT_RE.exec(s);
  return m ? `${m[1] || m[2]} ${m[3]}` : null;
}

function addYears(iso, years) {
  return `${Number(iso.slice(0, 4)) + years}${iso.slice(4)}`;
}

const truthy = (v) => v === true || v === 'true' || v === 'on' || v === '1' || v === 1 || v === 'yes';

/**
 * Whether an optional, conditional field applies to the rest of the input.
 * Direct API callers may send fields that do not apply; they are ignored
 * rather than rejected.
 */
function applies(key, raw) {
  switch (key) {
    case 'return_date':
    case 'return_time':
      return truthy(raw.return_trip);
    case 'flexible_dates':
      return truthy(raw.dates_flexible);
    case 'children_ages':
    case 'child_seats':
      return Number(String(raw.children ?? '').trim() || 0) > 0;
    case 'flight_number':
      return FLIGHT_TYPES.includes(cleanText(raw.transfer_type));
    case 'nights':
      return PACKAGE_SLUGS.includes(cleanText(raw.tour_slug));
    default:
      return true;
  }
}

/** The sections a full validation covers for a given type. */
function sectionsFor(type) {
  return ENQUIRY_TYPES.includes(type) ? ['service', type, 'contact'] : ['service', 'contact'];
}

/**
 * Validate and normalise a raw object of form values.
 *
 *   validateEnquiry(values)                         whole enquiry (path from enquiry_type)
 *   validateEnquiry(values, { section: 'tour' })    one wizard step
 *
 * Returns { ok, data, errors }. `errors` maps field → message, in form order.
 * `data` always holds every field (strings '', numbers, booleans) so
 * templates never see undefined; fields of the path not taken are blank.
 * `now` (ms) is injectable so tests can pin "today" in Cape Town.
 */
export function validateEnquiry(input, { section, now = Date.now() } = {}) {
  const raw = input && typeof input === 'object' ? input : {};
  const type = cleanText(raw.enquiry_type);
  const active = section ? [section] : sectionsFor(type);
  const data = {};
  const errors = {};
  const fail = (k, msg) => {
    if (!errors[k]) errors[k] = msg;
  };
  const today = todayInSast(now);
  const latest = addYears(today, MAX_YEARS_AHEAD);

  for (const [key, f] of Object.entries(FIELDS)) {
    // A field is checked only when its step is being validated AND it applies to what was chosen;
    // anything else (e.g. a return date with no return transfer) is ignored and stored blank.
    const checking = active.some((s) => inSection(f, s)) && applies(key, raw);
    const v = checking ? raw[key] : undefined;
    const present = v !== undefined && v !== null && String(v).trim() !== '';
    const req = f.messages?.required || `${f.label} is required.`;

    switch (f.type) {
      case 'bool': {
        data[key] = checking ? truthy(v) : false;
        if (checking && f.required && !data[key]) fail(key, req);
        break;
      }
      case 'int': {
        const n = present ? Number(String(v).trim()) : f.default ?? 0;
        if (!checking) {
          data[key] = f.default ?? 0;
          break;
        }
        if (!present && f.required) fail(key, req);
        else if (!Number.isInteger(n) || n < f.min || n > f.max) fail(key, `${f.label}: enter a whole number from ${f.min} to ${f.max}.`);
        data[key] = Number.isInteger(n) && n >= f.min && n <= f.max ? n : f.default ?? 0;
        break;
      }
      case 'enum': {
        const s = cleanText(v);
        if (!checking) data[key] = '';
        else if (!s) {
          data[key] = f.default || '';
          if (!f.default && f.required) fail(key, req);
        } else if (!f.values.includes(s)) {
          data[key] = '';
          fail(key, f.messages?.invalid || `Choose one of the ${f.label.toLowerCase()} options.`);
        } else data[key] = s;
        break;
      }
      case 'date': {
        const s = cleanText(v);
        data[key] = '';
        if (!checking) break;
        if (!s) {
          if (f.required) fail(key, req);
        } else if (!isValidDate(s)) fail(key, `${f.label}: enter a real date, for example ${today}.`);
        else if (s < today) fail(key, 'Choose today or a later date.');
        else if (s > latest) fail(key, `Choose a date within the next ${MAX_YEARS_AHEAD} years.`);
        else data[key] = s;
        break;
      }
      case 'time': {
        // Browsers may add seconds ('14:30:00'); keep hours and minutes.
        const s = cleanText(v).replace(/^(\d{2}:\d{2}):\d{2}(\.\d+)?$/, '$1');
        data[key] = '';
        if (!checking) break;
        if (!s) {
          if (f.required) fail(key, req);
        } else if (!isValidTime(s)) fail(key, `${f.label}: enter a time like 14:30.`);
        else data[key] = s;
        break;
      }
      case 'flight': {
        const s = cleanText(v);
        data[key] = '';
        if (!checking || !s) break;
        const norm = normaliseFlight(s);
        if (!norm || s.length > f.max) fail(key, 'Enter a flight number like SA 123 or BA59.');
        else data[key] = norm;
        break;
      }
      default: {
        const s = checking ? cleanText(v, { multiline: f.type === 'textarea' }) : '';
        data[key] = '';
        if (!checking) break;
        if (!s) {
          if (f.required) fail(key, req);
          break;
        }
        if (s.length > f.max) fail(key, `${f.label} is too long (${f.max} characters at most).`);
        else if (f.min && s.length < f.min) fail(key, `${f.label} looks too short.`);
        else if (f.type === 'email' && !isValidEmail(s)) fail(key, EMAIL_MESSAGE);
        else if (f.type === 'phone' && !isValidPhone(s)) fail(key, 'Include your country calling code, for example +27 82 123 4567.');
        else if (key === 'name' && !/\p{L}/u.test(s)) fail(key, 'Enter your full name.');
        data[key] = f.type === 'phone' ? s.replace(/^00/, '+') : s;
      }
    }
  }

  /* ---------- cross-field rules ---------- */
  const has = (s) => active.includes(s);

  const earliest = earliestDate(now);

  if (has('tour')) {
    if (!data.preferred_date && !data.dates_flexible && !errors.preferred_date) fail('preferred_date', 'Choose a preferred date, or tick “My dates are flexible”.');
    if (data.preferred_date && data.preferred_date < earliest && !errors.preferred_date) {
      fail('preferred_date', `Tours need ${noticeText()}. Choose ${earliest} or later.`);
    }
    if (!data.dates_flexible) data.flexible_dates = '';
    if (!data.children) data.children_ages = '';
  }

  if (has('transfer')) {
    // Outbound date and time are Cape Town time and must not be in the past.
    if (data.transfer_date && data.transfer_time && !errors.transfer_time && sastEpoch(data.transfer_date, data.transfer_time) < Number(now)) {
      fail('transfer_time', 'That time has already passed in Cape Town. Choose a later time.');
    } else if (data.transfer_date && data.transfer_time && !errors.transfer_time && sastEpoch(data.transfer_date, data.transfer_time) < Number(now) + BOOKING_RULES.minNoticeHours * 3600 * 1000) {
      fail(data.transfer_date < earliest ? 'transfer_date' : 'transfer_time', `Transfers need ${noticeText()}. Choose a pickup at least ${BOOKING_RULES.minNoticeHours} hours from now.`);
    }
    const { first, last } = BOOKING_RULES.transferHours;
    const hoursText = `Pickups run from ${first} to ${last}, Cape Town time.`;
    if (data.transfer_time && !errors.transfer_time && (data.transfer_time < first || data.transfer_time > last)) fail('transfer_time', hoursText);
    if (data.return_trip && data.return_time && !errors.return_time && (data.return_time < first || data.return_time > last)) fail('return_time', hoursText);
    if (FLIGHT_REQUIRED_TYPES.includes(data.transfer_type) && !data.flight_number && !errors.flight_number) {
      fail('flight_number', 'Enter your flight number, for example SA 123. We need it for airport arrivals.');
    }
    if (!FLIGHT_TYPES.includes(data.transfer_type)) {
      // The form only offers a flight number for airport transfers; ignore one sent for any other type.
      data.flight_number = '';
      delete errors.flight_number;
    }
    if (data.return_trip) {
      if (!data.return_date && !errors.return_date) fail('return_date', 'Choose the return date, or untick the return transfer.');
      if (!data.return_time && !errors.return_time) fail('return_time', 'Choose the return pickup time.');
      const out = sastEpoch(data.transfer_date, data.transfer_time);
      const back = sastEpoch(data.return_date, data.return_time);
      if (data.return_date && data.transfer_date && data.return_date < data.transfer_date) {
        fail('return_date', 'The return must be after the outbound transfer.');
      } else if (Number.isFinite(out) && Number.isFinite(back) && back <= out) {
        fail('return_time', 'The return must be after the outbound transfer.');
      }
    } else {
      data.return_date = '';
      data.return_time = '';
    }
    if (!data.children) data.child_seats = '';
  }

  if (has('contact')) {
    const m = data.preferred_contact_method;
    if ((m === 'phone' || m === 'whatsapp') && !data.phone && !errors.phone) {
      fail('phone', m === 'whatsapp' ? 'Enter a WhatsApp number with your country code so we can reply there.' : 'Enter a phone number with your country code so we can call you.');
    }
  }

  data.travellers = (data.adults || 0) + (data.children || 0);

  // Report errors in form order, whatever order the checks ran in.
  const order = Object.keys(FIELDS);
  const sorted = {};
  for (const k of Object.keys(errors).sort((a, b) => order.indexOf(a) - order.indexOf(b))) sorted[k] = errors[k];

  return { ok: Object.keys(sorted).length === 0, data, errors: sorted };
}

/** The wizard step a field belongs to for a given path ('service' | 'details' | 'contact'). */
export function stepOf(field) {
  const f = FIELDS[field];
  if (!f) return null;
  if (inSection(f, 'service')) return 'service';
  if (inSection(f, 'contact')) return 'contact';
  return 'details';
}
