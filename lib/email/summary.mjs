/**
 * Human descriptions of a stored enquiry, shared by both email templates:
 * tour and package titles, transfer labels, short place names for subjects,
 * and the "what you sent" rows for each path.
 */
import { tourBySlug } from '../../src/data/tours.mjs';
import { packageBySlug } from '../../src/data/packages.mjs';
import { types as transferTypes } from '../../src/data/transfers.mjs';
import { formatDate, formatDayDate, formatShortDate, partyLine } from './layout.mjs';

export const CONTACT_LABEL = { email: 'Email', whatsapp: 'WhatsApp', phone: 'Phone call' };

/** A multi-day package request: the tour path with a package slug (D60). */
export const isPackage = (e) => e.enquiry_type !== 'transfer' && Boolean(packageBySlug(e.tour_slug));

export function tourTitle(slug, { short = false } = {}) {
  if (slug === 'custom') return short ? 'Custom day' : 'Not sure yet / a custom day';
  const t = tourBySlug(slug) || packageBySlug(slug);
  return t ? (short ? t.shortTitle : t.title) : slug || 'Not given';
}

/** "6 nights", or "Not sure yet" when the visitor left it to Good Times. */
export function nightsLine(e) {
  const n = Number(e.nights) || 0;
  return n ? `${n} night${n === 1 ? '' : 's'}` : 'Not sure yet';
}

export function transferLabel(id) {
  return transferTypes.find((t) => t.id === id)?.label || id || 'Transfer';
}

/** A short, phone-friendly name for a pickup or destination ("CPT airport", "Camps Bay"). */
export function shortPlace(text, max = 28) {
  const s = String(text ?? '').trim();
  if (/cape town international|\bCPT\b|airport/i.test(s)) return 'CPT airport';
  const first = s.split(',')[0].trim() || s;
  return first.length > max ? `${first.slice(0, max - 1).trimEnd()}…` : first;
}

export const pax = (e) => (Number(e.adults) || 0) + (Number(e.children) || 0);

const when = (date, time) => (date ? `${formatDayDate(date)}${time ? `, ${time} SAST` : ''}` : '');

export function tourDateLine(e, { withText = true } = {}) {
  const extra = withText && e.flexible_dates ? `: ${e.flexible_dates}` : '';
  if (e.preferred_date && e.dates_flexible) return `${formatDayDate(e.preferred_date)} (flexible${extra})`;
  if (e.preferred_date) return formatDayDate(e.preferred_date);
  return `Flexible${extra}`;
}

function luggageLine(e, { withText = true } = {}) {
  const out = [];
  const n = Number(e.suitcases) || 0;
  if (n) out.push(`${n} suitcase${n === 1 ? '' : 's'}`);
  if (withText && e.oversized_items) out.push(e.oversized_items);
  return out.join('; ');
}

function partyWithAges(e, { withText = true } = {}) {
  const base = partyLine(e.adults, e.children);
  return withText && e.children_ages ? `${base} (children’s ages: ${e.children_ages})` : base;
}

/**
 * The trip details, as label/value rows (empty values are dropped by detailTable).
 *
 * `visitor: true` is for the acknowledgement, which goes to an address nobody
 * has verified: it leaves out the long free-text fields (notes, special
 * requests, flexible-dates text, oversized items, ages) so the form cannot be
 * used to relay arbitrary text. Pickup and destination (max 200 characters
 * each) stay, because the visitor needs them to check the request. The team
 * email keeps everything.
 */
export function tripRows(e, { visitor = false } = {}) {
  const withText = !visitor;
  if (e.enquiry_type === 'transfer') {
    return [
      ['Request', `Transfer: ${transferLabel(e.transfer_type)}`],
      ['Pickup', e.pickup_location],
      ['Destination', e.destination],
      ['Date and time', when(e.pickup_date_sast, e.pickup_time_sast)],
      ['Flight', e.flight_number],
      ['Passengers', partyLine(e.adults, e.children)],
      ['Child seats', withText ? e.child_seats : ''],
      ['Luggage', luggageLine(e, { withText })],
      ['Return', e.return_trip ? when(e.return_date_sast, e.return_time_sast) : 'No return transfer'],
      ['Notes', withText ? e.special_requirements : ''],
    ];
  }
  if (isPackage(e)) {
    return [
      ['Request', 'Multi-day tour enquiry'],
      ['Multi-day tour', tourTitle(e.tour_slug)],
      ['Start date', tourDateLine(e, { withText })],
      ['Nights', nightsLine(e)],
      ['Group', partyWithAges(e, { withText })],
      ['Pickup', e.pickup_area],
      ['Special requests', withText ? e.special_requirements : ''],
    ];
  }
  return [
    ['Request', 'Private tour enquiry'],
    ['Tour', tourTitle(e.tour_slug)],
    ['Date', tourDateLine(e, { withText })],
    ['Group', partyWithAges(e, { withText })],
    ['Pickup', e.pickup_area],
    ['Special requests', withText ? e.special_requirements : ''],
  ];
}

/** 'transfer', 'multi-day tour' or 'tour', for customer emails ("your transfer", "your multi-day tour"). */
export function kindLabel(e) {
  return e.enquiry_type === 'transfer' ? 'transfer' : isPackage(e) ? 'multi-day tour' : 'tour';
}

export function contactRows(e) {
  return [
    ['Name', e.name],
    ['Email', e.email],
    ['Phone', e.phone],
    ['Reply by', CONTACT_LABEL[e.preferred_contact_method] || e.preferred_contact_method],
    ['Country', e.country],
  ];
}

/**
 * Team subject lines, scannable on a phone:
 *   Transfer GT-ABC123 · Sat 17 Oct 14:30 · CPT airport → Camps Bay · 3 pax
 *   Tour GT-ABC123 · Cape Peninsula Private Tour · 12 Nov · 2 adults
 *   Multi-day GT-ABC123 · Garden Route Private Tour · 12 Nov · 6 nights · 2 adults
 */
export function teamSubject(e) {
  const ref = e.reference_number;
  if (e.enquiry_type === 'transfer') {
    const date = e.pickup_date_sast ? `${formatShortDate(e.pickup_date_sast)} ${e.pickup_time_sast}`.trim() : 'date not given';
    const ret = e.return_trip ? ' · + return' : '';
    return `Transfer ${ref} · ${date} · ${shortPlace(e.pickup_location)} → ${shortPlace(e.destination)} · ${pax(e)} pax${ret}`;
  }
  const date = e.preferred_date ? formatShortDate(e.preferred_date, { weekday: false }) : 'flexible dates';
  if (isPackage(e)) {
    const nights = Number(e.nights) ? ` · ${nightsLine(e)}` : '';
    return `Multi-day ${ref} · ${tourTitle(e.tour_slug, { short: true })} · ${date}${nights} · ${partyLine(e.adults, e.children)}`;
  }
  return `Tour ${ref} · ${tourTitle(e.tour_slug, { short: true })} · ${date} · ${partyLine(e.adults, e.children)}`;
}

/** One line for the visitor's acknowledgement ("your Cape Town City Tour enquiry for 12 November 2026"). */
export function visitorSummary(e) {
  if (e.enquiry_type === 'transfer') {
    const d = e.pickup_date_sast ? ` on ${formatDate(e.pickup_date_sast)}` : '';
    return `your transfer request (${transferLabel(e.transfer_type).toLowerCase()}${d})`;
  }
  const d = e.preferred_date ? ` for ${formatDate(e.preferred_date)}` : '';
  return e.tour_slug === 'custom' ? `your private tour enquiry${d}` : `your ${tourTitle(e.tour_slug, { short: true })} enquiry${d}`;
}
