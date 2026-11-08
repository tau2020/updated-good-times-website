import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateEnquiry,
  cleanText,
  isValidEmail,
  isValidPhone,
  isValidDate,
  isValidTime,
  normaliseFlight,
  todayInSast,
  sastIso,
  sastEpoch,
  stepOf,
  FIELDS,
  TOUR_SLUGS,
  PACKAGE_SLUGS,
  CUSTOM_TOUR,
  TRANSFER_TYPES,
  FLIGHT_REQUIRED_TYPES,
  CONTACT_METHODS,
  earliestDate,
  BOOKING_RULES,
} from '../lib/enquiries/schema.mjs';
import * as browserSchema from '../src/assets/js/enquiry-schema.js';
import { TOUR_SLUGS as DATA_TOUR_SLUGS, tours } from '../src/data/tours.mjs';
import { PACKAGE_SLUGS as DATA_PACKAGE_SLUGS, packages } from '../src/data/packages.mjs';
import { TRANSFER_TYPES as DATA_TRANSFER_TYPES, types as dataTransferTypes } from '../src/data/transfers.mjs';

// "Now" is pinned: Friday 16 October 2026, 10:00 in Cape Town (08:00 UTC). With 48 hours' notice
// (BOOKING_RULES.minNoticeHours) the first tour date is Sunday the 18th and the first pickup 10:00 that day;
// the fixtures below sit well clear of that, three days ahead or more.
const NOW = Date.parse('2026-10-16T10:00:00+02:00');
const v = (input, opts = {}) => validateEnquiry(input, { now: NOW, ...opts });

const contact = {
  name: 'Amara Okafor',
  email: 'amara@example.com',
  phone: '+44 20 7946 0958',
  preferred_contact_method: 'email',
  country: 'United Kingdom',
  consent: true,
  terms: true,
};
const tour = {
  enquiry_type: 'tour',
  tour_slug: 'cape-town-city-private-tour',
  preferred_date: '2026-11-12',
  adults: '2',
  children: '1',
  children_ages: '6',
  pickup_area: 'Hotel in Sea Point',
  special_requests: 'A relaxed pace.',
  ...contact,
};
const transfer = {
  enquiry_type: 'transfer',
  transfer_type: 'airport-arrival',
  pickup_location: 'Cape Town International Airport (CPT)',
  destination: 'Camps Bay',
  transfer_date: '2026-10-19', // Monday: 76 hours 30 minutes after NOW
  transfer_time: '14:30',
  flight_number: 'ba59',
  adults: 2,
  children: 0,
  suitcases: '3',
  oversized_items: 'Golf bag',
  return_trip: false,
  notes: '',
  ...contact,
};

/* ---------- lists stay equal to src/data ---------- */

test('allowed tour slugs, transfer types and flight-required types exactly equal src/data', () => {
  assert.deepEqual(TOUR_SLUGS, DATA_TOUR_SLUGS);
  assert.deepEqual(TOUR_SLUGS, tours.map((t) => t.slug));
  assert.deepEqual(TRANSFER_TYPES, DATA_TRANSFER_TYPES);
  assert.deepEqual(FLIGHT_REQUIRED_TYPES, dataTransferTypes.filter((t) => t.flight).map((t) => t.id));
  assert.ok(!TOUR_SLUGS.includes(CUSTOM_TOUR));
  assert.deepEqual(CONTACT_METHODS, ['email', 'whatsapp', 'phone']);
});

test('allowed package slugs exactly equal src/data/packages.mjs and never overlap the tours', () => {
  assert.deepEqual(PACKAGE_SLUGS, DATA_PACKAGE_SLUGS);
  assert.deepEqual(PACKAGE_SLUGS, packages.map((p) => p.slug));
  for (const slug of PACKAGE_SLUGS) assert.ok(!TOUR_SLUGS.includes(slug) && slug !== CUSTOM_TOUR, slug);
});

test('the server re-exports the very same module the browser loads', () => {
  assert.equal(validateEnquiry, browserSchema.validateEnquiry);
  assert.equal(FIELDS, browserSchema.FIELDS);
});

/* ---------- happy paths ---------- */

test('a complete tour enquiry is valid and coerced', () => {
  const r = v(tour);
  assert.equal(r.ok, true, JSON.stringify(r.errors));
  assert.equal(r.data.enquiry_type, 'tour');
  assert.equal(r.data.adults, 2);
  assert.equal(r.data.children, 1);
  assert.equal(r.data.travellers, 3);
  assert.equal(r.data.preferred_date, '2026-11-12');
  assert.equal(r.data.consent, true);
  // The path not taken is blank, never undefined.
  assert.equal(r.data.transfer_type, '');
  assert.equal(r.data.pickup_location, '');
  assert.equal(r.data.return_trip, false);
});

test('a complete transfer request is valid; the flight number is normalised', () => {
  const r = v(transfer);
  assert.equal(r.ok, true, JSON.stringify(r.errors));
  assert.equal(r.data.flight_number, 'BA 59');
  assert.equal(r.data.suitcases, 3);
  assert.equal(r.data.transfer_time, '14:30');
  assert.equal(r.data.tour_slug, '');
  assert.equal(r.data.pickup_area, '');
});

test('every field is populated even from an empty object, and the required ones are reported', () => {
  const r = v({});
  assert.equal(r.ok, false);
  for (const key of Object.keys(FIELDS)) assert.notEqual(r.data[key], undefined, key);
  assert.ok(r.errors.enquiry_type);
  assert.ok(r.errors.name);
  assert.ok(r.errors.email);
  assert.ok(r.errors.consent);
  assert.equal(r.data.preferred_contact_method, 'email');
});

test('errors come back keyed by field and in form order (for the error summary)', () => {
  const r = v({ enquiry_type: 'transfer', transfer_type: 'airport-arrival', consent: false });
  const keys = Object.keys(r.errors);
  const order = Object.keys(FIELDS);
  assert.deepEqual(keys, [...keys].sort((a, b) => order.indexOf(a) - order.indexOf(b)));
  for (const k of ['pickup_location', 'destination', 'transfer_date', 'transfer_time', 'flight_number', 'adults', 'name', 'email', 'consent']) assert.ok(r.errors[k], k);
  assert.ok(keys.indexOf('flight_number') < keys.indexOf('name'));
});

test('section-scoped validation reports only that wizard step', () => {
  const s = v({}, { section: 'service' });
  assert.deepEqual(Object.keys(s.errors), ['enquiry_type']);
  const t = v({ tour_slug: 'cape-town-city-private-tour', dates_flexible: true, adults: 2, pickup_area: 'Gardens' }, { section: 'tour' });
  assert.equal(t.ok, true, JSON.stringify(t.errors));
  assert.equal(t.data.name, '');
  const c = v(contact, { section: 'contact' });
  assert.equal(c.ok, true, JSON.stringify(c.errors));
  const tr = v({}, { section: 'transfer' });
  assert.ok(tr.errors.transfer_type && tr.errors.pickup_location);
  assert.equal(tr.errors.name, undefined);
});

/* ---------- tour rules ---------- */

test('tour: every catalogue slug and "custom" are accepted; anything else is rejected', () => {
  for (const slug of [...TOUR_SLUGS, CUSTOM_TOUR]) assert.equal(v({ ...tour, tour_slug: slug }).ok, true, slug);
  assert.ok(v({ ...tour, tour_slug: 'atlantis-day-trip' }).errors.tour_slug);
  assert.ok(v({ ...tour, tour_slug: '' }).errors.tour_slug);
});

test('packages travel the tour path: accepted with or without nights; nights 1 to 30 kept, blank is 0 ("not sure yet")', () => {
  for (const slug of PACKAGE_SLUGS) {
    const r = v({ ...tour, tour_slug: slug, nights: '6' });
    assert.equal(r.ok, true, JSON.stringify(r.errors));
    assert.equal(r.data.tour_slug, slug);
    assert.equal(r.data.nights, 6);
    assert.equal(v({ ...tour, tour_slug: slug, nights: '' }).data.nights, 0);
    assert.equal(v({ ...tour, tour_slug: slug }).data.nights, 0);
  }
  const bad = v({ ...tour, tour_slug: 'garden-route-private-tour', nights: '45' });
  assert.match(bad.errors.nights, /Nights: enter a whole number from 0 to 30/);
  assert.ok(v({ ...tour, tour_slug: 'garden-route-private-tour', nights: 'six' }).errors.nights);
  assert.equal(stepOf('nights'), 'details');
});

test('nights are ignored, and stored as 0, for day tours, the custom day and transfers', () => {
  for (const slug of [TOUR_SLUGS[0], CUSTOM_TOUR]) {
    const r = v({ ...tour, tour_slug: slug, nights: '45' });
    assert.equal(r.ok, true, JSON.stringify(r.errors));
    assert.equal(r.data.nights, 0);
  }
  const t = v({ ...transfer, nights: '5' });
  assert.equal(t.ok, true, JSON.stringify(t.errors));
  assert.equal(t.data.nights, 0);
});

test('tour: a preferred date is required unless "my dates are flexible" is ticked', () => {
  assert.match(v({ ...tour, preferred_date: '' }).errors.preferred_date, /flexible/);
  const flex = v({ ...tour, preferred_date: '', dates_flexible: 'yes', flexible_dates: 'Any day 10 to 14 November' });
  assert.equal(flex.ok, true, JSON.stringify(flex.errors));
  assert.equal(flex.data.flexible_dates, 'Any day 10 to 14 November');
  // Free-text dates are optional when flexible, and dropped when not.
  assert.equal(v({ ...tour, preferred_date: '', dates_flexible: true }).ok, true);
  assert.equal(v({ ...tour, flexible_dates: 'ignored' }).data.flexible_dates, '');
});

test('tour: the date cannot be in the past and needs 48 hours’ notice in Cape Town (SAST)', () => {
  assert.equal(BOOKING_RULES.minNoticeHours, 48, 'the owner’s rule of 8 Nov 2026');
  // It is 10:00 SAST on Friday 16 October: Sunday the 18th is the first date with 48 hours' notice.
  assert.equal(earliestDate(NOW), '2026-10-18');
  assert.match(v({ ...tour, preferred_date: '2026-10-16' }).errors.preferred_date, /48 hours’ notice/);
  assert.equal(v({ ...tour, preferred_date: '2026-10-17' }).errors.preferred_date, 'Tours need 48 hours’ notice. Choose 2026-10-18 or later.');
  assert.equal(v({ ...tour, preferred_date: '2026-10-18' }).ok, true);
  assert.match(v({ ...tour, preferred_date: '2026-10-15' }).errors.preferred_date, /today or a later date/);
  assert.match(v({ ...tour, preferred_date: '2026-02-30' }).errors.preferred_date, /real date/);
  assert.match(v({ ...tour, preferred_date: '2031-01-01' }).errors.preferred_date, /next 3 years/);
});

test('tour: the first date offered is the Cape Town date 48 hours on, at 10:00, at 23:59, across Cape Town midnight and near UTC midnight', () => {
  const at = (iso) => Date.parse(iso);
  const dayBefore = (iso) => new Date(Date.parse(`${iso}T12:00:00Z`) - 864e5).toISOString().slice(0, 10);
  const cases = [
    // Friday the 16th in Cape Town, from its first to its last moment: Sunday the 18th, whatever time the tour then starts.
    ['2026-10-16T00:00:00+02:00', '2026-10-18'],
    ['2026-10-16T10:00:00+02:00', '2026-10-18'],
    ['2026-10-16T23:59:00+02:00', '2026-10-18'],
    ['2026-10-16T23:59:59.999+02:00', '2026-10-18'],
    // A minute after 23:59 it is Saturday the 17th in Cape Town: Monday the 19th.
    ['2026-10-17T00:00:00+02:00', '2026-10-19'],
    // Near UTC midnight: 21:59 UTC is still the 16th in Cape Town, 22:00 UTC is already the 17th...
    ['2026-10-16T21:59:00Z', '2026-10-18'],
    ['2026-10-16T22:00:00Z', '2026-10-19'],
    // ...so at 23:30 UTC on the 16th (01:30 on the 17th in Cape Town) the first date is the 19th, where the UTC date would say the 18th;
    ['2026-10-16T23:30:00Z', '2026-10-19'],
    // and UTC midnight itself is 02:00 in Cape Town.
    ['2026-10-17T00:00:00Z', '2026-10-19'],
  ];
  for (const [iso, first] of cases) {
    const now = at(iso);
    assert.equal(earliestDate(now), first, iso);
    assert.equal(validateEnquiry({ ...tour, preferred_date: first }, { now }).ok, true, `${iso}: ${first} is offered`);
    assert.equal(validateEnquiry({ ...tour, preferred_date: dayBefore(first) }, { now }).errors.preferred_date, `Tours need 48 hours’ notice. Choose ${first} or later.`, `${iso}: the day before is not`);
  }
});

test('tour: party size limits and pickup area', () => {
  assert.ok(v({ ...tour, adults: 0 }).errors.adults);
  assert.ok(v({ ...tour, adults: 31 }).errors.adults);
  assert.ok(v({ ...tour, adults: '' }).errors.adults);
  assert.ok(v({ ...tour, adults: 'two' }).errors.adults);
  assert.equal(v({ ...tour, adults: 30, children: 20 }).ok, true);
  assert.ok(v({ ...tour, children: 21 }).errors.children);
  assert.equal(v({ ...tour, children: '' }).data.children, 0);
  assert.equal(v({ ...tour, children: 0 }).data.children_ages, '', 'ages are dropped without children');
  assert.match(v({ ...tour, pickup_area: '  ' }).errors.pickup_area, /collect you/);
});

/* ---------- transfer rules ---------- */

test('transfer: every transfer type is accepted; unknown types are rejected', () => {
  for (const t of TRANSFER_TYPES) assert.equal(v({ ...transfer, transfer_type: t }).ok, true, t);
  assert.ok(v({ ...transfer, transfer_type: 'helicopter' }).errors.transfer_type);
});

test('transfer: pickup, destination, date and time are required', () => {
  const r = v({ ...transfer, pickup_location: '', destination: '', transfer_date: '', transfer_time: '' });
  for (const k of ['pickup_location', 'destination', 'transfer_date', 'transfer_time']) assert.ok(r.errors[k], k);
  assert.ok(v({ ...transfer, transfer_time: '25:00' }).errors.transfer_time);
  assert.equal(v({ ...transfer, transfer_time: '14:30:00' }).data.transfer_time, '14:30');
});

test('transfer: the pickup cannot be in the past, needs 48 hours’ notice and runs 04:00 to 23:00 (SAST)', () => {
  const notice = 'Transfers need 48 hours’ notice. Choose a pickup at least 48 hours from now.';
  assert.match(v({ ...transfer, transfer_date: '2026-10-15' }).errors.transfer_date, /today or a later date/);
  // It is 10:00 SAST on 16 October. 09:59 today has passed; 18:00 today and any time tomorrow are under 48 hours away,
  // and the date is the field to change.
  assert.match(v({ ...transfer, transfer_date: '2026-10-16', transfer_time: '09:59' }).errors.transfer_time, /already passed in Cape Town/);
  assert.equal(v({ ...transfer, transfer_date: '2026-10-16', transfer_time: '18:00' }).errors.transfer_date, notice);
  assert.equal(v({ ...transfer, transfer_date: '2026-10-17', transfer_time: '23:00' }).errors.transfer_date, notice);
  // Exactly 48 hours ahead (10:00 on Sunday the 18th) is accepted; 47 hours 59 minutes is not, nor is a
  // millisecond short, and then the time is the field to change.
  assert.equal(v({ ...transfer, transfer_date: '2026-10-18', transfer_time: '10:00' }).ok, true);
  assert.equal(v({ ...transfer, transfer_date: '2026-10-18', transfer_time: '09:59' }).errors.transfer_time, notice);
  assert.equal(validateEnquiry({ ...transfer, transfer_date: '2026-10-18', transfer_time: '10:00' }, { now: NOW + 1 }).errors.transfer_time, notice);
  assert.equal(validateEnquiry({ ...transfer, transfer_date: '2026-10-18', transfer_time: '10:01' }, { now: NOW + 1 }).ok, true);
  // Late in the evening the first date offered can have no pickup left: at 23:30 SAST on the 16th the 18th is
  // offered, but its last pickup, 23:00, is 47 hours 30 minutes away; 04:00 on the 19th is fine.
  const lateSast = Date.parse('2026-10-16T23:30:00+02:00');
  assert.equal(earliestDate(lateSast), '2026-10-18');
  assert.equal(validateEnquiry({ ...transfer, transfer_date: '2026-10-18', transfer_time: '23:00' }, { now: lateSast }).errors.transfer_time, notice);
  assert.equal(validateEnquiry({ ...transfer, transfer_date: '2026-10-19', transfer_time: '04:00' }, { now: lateSast }).ok, true);
  // Near UTC midnight: 23:30 UTC on the 16th is 01:30 SAST on the 17th, so 48 hours on is 01:30 on the 19th.
  const lateUtc = Date.parse('2026-10-16T23:30:00Z');
  assert.equal(validateEnquiry({ ...transfer, transfer_date: '2026-10-18', transfer_time: '23:00' }, { now: lateUtc }).errors.transfer_date, notice);
  assert.equal(validateEnquiry({ ...transfer, transfer_date: '2026-10-19', transfer_time: '04:00' }, { now: lateUtc }).ok, true);
  // 08:30 UTC is 10:30 SAST: a 10:00 pickup that day is already past even though 10:00 > 08:30.
  const r = validateEnquiry({ ...transfer, transfer_date: '2026-10-16', transfer_time: '10:00' }, { now: Date.parse('2026-10-16T08:30:00Z') });
  assert.ok(r.errors.transfer_time);
  // Pickup hours, outbound and return.
  const later = { ...transfer, transfer_date: '2026-10-20' };
  assert.match(v({ ...later, transfer_time: '03:59' }).errors.transfer_time, /04:00 to 23:00/);
  assert.match(v({ ...later, transfer_time: '23:01' }).errors.transfer_time, /04:00 to 23:00/);
  assert.equal(v({ ...later, transfer_time: '04:00' }).ok, true);
  assert.equal(v({ ...later, transfer_time: '23:00' }).ok, true);
  assert.match(v({ ...later, return_trip: true, return_date: '2026-10-22', return_time: '23:30' }).errors.return_time, /04:00 to 23:00/);
});

test('transfer: a flight number is required for airport arrivals only, and must look like one', () => {
  assert.match(v({ ...transfer, flight_number: '' }).errors.flight_number, /flight number/i);
  assert.equal(v({ ...transfer, transfer_type: 'airport-departure', flight_number: '' }).ok, true);
  assert.equal(v({ ...transfer, transfer_type: 'airport-departure', flight_number: 'sa 342' }).data.flight_number, 'SA 342');
  for (const ok of ['SA 123', 'BA59', '4Z 123', 'saa1234', 'FA 7', 'EK770']) assert.ok(normaliseFlight(ok), ok);
  for (const bad of ['hello', '123', 'S', 'SA12345', 'SA-123', 'XX XX']) {
    assert.equal(normaliseFlight(bad), null, bad);
    assert.ok(v({ ...transfer, flight_number: bad }).errors.flight_number, bad);
  }
  // A flight number sent for a non-airport transfer is ignored rather than rejected.
  const other = v({ ...transfer, transfer_type: 'other', flight_number: 'nonsense' });
  assert.equal(other.ok, true, JSON.stringify(other.errors));
  assert.equal(other.data.flight_number, '');
});

test('transfer: an optional return leg needs a date and time after the outbound transfer', () => {
  // The outbound pickup is 14:30 on Monday 19 October (the fixture).
  const base = { ...transfer, return_trip: true };
  const missing = v({ ...base, return_date: '', return_time: '' });
  assert.ok(missing.errors.return_date && missing.errors.return_time);
  assert.match(v({ ...base, return_date: '2026-10-18', return_time: '18:00' }).errors.return_date, /after the outbound/);
  assert.match(v({ ...base, return_date: '2026-10-19', return_time: '12:00' }).errors.return_time, /after the outbound/);
  assert.match(v({ ...base, return_date: '2026-10-19', return_time: '14:30' }).errors.return_time, /after the outbound/);
  const ok = v({ ...base, return_date: '2026-10-19', return_time: '20:00' });
  assert.equal(ok.ok, true, JSON.stringify(ok.errors));
  const ok2 = v({ ...base, return_date: '2026-10-26', return_time: '09:00' });
  assert.equal(ok2.ok, true);
  // Without the return tick, return fields are dropped.
  const none = v({ ...transfer, return_trip: false, return_date: '2026-10-26', return_time: '09:00' });
  assert.equal(none.data.return_date, '');
  assert.equal(none.data.return_time, '');
});

test('transfer: suitcases and child seats', () => {
  assert.ok(v({ ...transfer, suitcases: 41 }).errors.suitcases);
  assert.equal(v({ ...transfer, suitcases: '' }).data.suitcases, 0);
  assert.equal(v({ ...transfer, children: 1, child_seats: '1 seat, age 4' }).data.child_seats, '1 seat, age 4');
  assert.equal(v({ ...transfer, children: 0, child_seats: 'ignored' }).data.child_seats, '');
});

/* ---------- contact rules ---------- */

test('phone is required when the visitor asks for WhatsApp or a phone call', () => {
  assert.match(v({ ...tour, phone: '', preferred_contact_method: 'whatsapp' }).errors.phone, /WhatsApp/);
  assert.match(v({ ...tour, phone: '', preferred_contact_method: 'phone' }).errors.phone, /phone number/);
  assert.equal(v({ ...tour, phone: '', preferred_contact_method: 'email' }).ok, true);
});

test('phone numbers must be international (country code first)', () => {
  assert.equal(isValidPhone('+27 82 123 4567'), true);
  assert.equal(isValidPhone('+1 (212) 555-0100'), true);
  assert.equal(isValidPhone('0027 82 123 4567'), true);
  assert.equal(isValidPhone('082 123 4567'), false);
  assert.equal(isValidPhone('+27 12'), false);
  assert.equal(isValidPhone('+1234567890123456'), false);
  assert.match(v({ ...tour, phone: '082 123 4567' }).errors.phone, /country calling code/);
  assert.equal(v({ ...tour, phone: '0027 82 123 4567' }).data.phone, '+27 82 123 4567');
});

test('consent is required; checkbox values are understood', () => {
  assert.match(v({ ...tour, consent: false }).errors.consent, /Tick the box/);
  assert.ok(v({ ...tour, consent: undefined }).errors.consent);
  for (const yes of [true, 'yes', 'on', 'true', '1']) assert.equal(v({ ...tour, consent: yes }).ok, true, String(yes));
});

test('preferred contact method must be one of the offered options; blank means email', () => {
  assert.ok(v({ ...tour, preferred_contact_method: 'pigeon' }).errors.preferred_contact_method);
  assert.equal(v({ ...tour, preferred_contact_method: '' }).data.preferred_contact_method, 'email');
});

test('email, name and lengths', () => {
  assert.ok(v({ ...tour, email: 'not-an-email' }).errors.email);
  assert.equal(isValidEmail('a@b.co'), true);
  assert.equal(isValidEmail('a@b'), false);
  // One strict rule shared with the reply-to check (lib/email/sanitise.mjs).
  for (const bad of ['josé@example.com', 'a,b@x.com', 'a"b@x.co', "o'brien@example.com", 'a b@x.com', 'a..b@x.com', '.a@x.com', 'a@-x.com', 'a@x', 'a@x.c']) {
    assert.equal(isValidEmail(bad), false, bad);
    assert.match(v({ ...tour, email: bad }).errors.email, /name@example\.com/, bad);
  }
  for (const good of ['first.last+tours@mail.example.co.uk', 'a_b%c-d@x-y.travel', 'A@B.CO']) assert.equal(isValidEmail(good), true, good);
  assert.ok(v({ ...tour, name: 'x'.repeat(121) }).errors.name);
  assert.ok(v({ ...tour, name: '12345' }).errors.name);
  assert.ok(v({ ...tour, special_requests: 'x'.repeat(2001) }).errors.special_requests);
  assert.ok(v({ ...transfer, notes: 'x'.repeat(2001) }).errors.notes);
  assert.ok(v({ ...transfer, pickup_location: 'x'.repeat(201) }).errors.pickup_location);
});

test('newlines and control characters are stripped from single-line fields but kept in notes', () => {
  const r = v({ ...tour, name: 'Eve\r\nBcc: victim@example.com', special_requests: 'Line one\nLine two\u0000' });
  assert.equal(r.ok, true, JSON.stringify(r.errors));
  assert.equal(r.data.name, 'Eve Bcc: victim@example.com');
  assert.equal(r.data.special_requests, 'Line one\nLine two');
  assert.equal(cleanText('  a \t b  '), 'a b');
});

test('an unknown enquiry type is rejected', () => {
  const r = v({ ...tour, enquiry_type: 'booking' });
  assert.ok(r.errors.enquiry_type);
});

/* ---------- helpers ---------- */

test('Cape Town time helpers use the fixed UTC+2 offset', () => {
  assert.equal(todayInSast(Date.parse('2026-10-16T21:59:00Z')), '2026-10-16');
  assert.equal(todayInSast(Date.parse('2026-10-16T22:00:00Z')), '2026-10-17');
  assert.equal(sastIso('2026-10-17', '14:30'), '2026-10-17T14:30:00+02:00');
  assert.equal(sastIso('2026-10-17', ''), '');
  assert.equal(sastEpoch('2026-10-17', '14:30'), Date.parse('2026-10-17T12:30:00Z'));
  assert.equal(isValidDate('2027-02-28'), true);
  assert.equal(isValidDate('2027-02-29'), false);
  assert.equal(isValidTime('23:59'), true);
  assert.equal(isValidTime('24:00'), false);
});

test('stepOf maps fields to wizard steps', () => {
  assert.equal(stepOf('enquiry_type'), 'service');
  assert.equal(stepOf('tour_slug'), 'details');
  assert.equal(stepOf('adults'), 'details');
  assert.equal(stepOf('flight_number'), 'details');
  assert.equal(stepOf('consent'), 'contact');
  assert.equal(stepOf('nope'), null);
});

test('fields that do not apply to the choices made are ignored, not rejected', () => {
  // Return fields without the return tick
  const noReturn = v({ ...transfer, return_trip: false, return_date: '2001-01-01', return_time: 'whenever' });
  assert.equal(noReturn.ok, true, JSON.stringify(noReturn.errors));
  assert.equal(noReturn.data.return_date, '');
  assert.equal(noReturn.data.return_time, '');
  // Flexible-dates text with fixed dates, however long
  const fixed = v({ ...tour, dates_flexible: false, flexible_dates: 'x'.repeat(5000) });
  assert.equal(fixed.ok, true, JSON.stringify(fixed.errors));
  assert.equal(fixed.data.flexible_dates, '');
  // Ages and child seats without children
  assert.equal(v({ ...tour, children: 0, children_ages: 'y'.repeat(500) }).ok, true);
  assert.equal(v({ ...transfer, children: 0, child_seats: 'z'.repeat(500) }).ok, true);
  // ...but they are checked when they do apply
  assert.ok(v({ ...tour, dates_flexible: true, flexible_dates: 'x'.repeat(301) }).errors.flexible_dates);
  assert.ok(v({ ...transfer, return_trip: true, return_date: '2001-01-01', return_time: '10:00' }).errors.return_date);
  assert.ok(v({ ...tour, children: 2, children_ages: 'y'.repeat(121) }).errors.children_ages);
});
