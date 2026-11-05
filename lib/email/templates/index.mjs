/** Template registry: name → render(props) → { subject, html, text }. */
import * as newEnquiryInternal from './new-enquiry-internal.mjs';
import * as enquiryReceived from './enquiry-received.mjs';
import * as bookingConfirmed from './booking-confirmed.mjs';
import * as bookingCancelled from './booking-cancelled.mjs';
import * as adminSignIn from './admin-sign-in.mjs';

export const TEMPLATES = Object.freeze({
  'new-enquiry-internal': newEnquiryInternal.render,
  'enquiry-received': enquiryReceived.render,
  'booking-confirmed': bookingConfirmed.render,
  'booking-cancelled': bookingCancelled.render,
  'admin-sign-in': adminSignIn.render,
});

export const TEMPLATE_NAMES = Object.freeze(Object.keys(TEMPLATES));

export function renderTemplate(name, props) {
  const render = TEMPLATES[name];
  if (!render) throw new Error(`Unknown email template "${name}"`);
  const out = render(props);
  if (!out.subject || !out.html || !out.text) throw new Error(`Template "${name}" must return subject, html and text`);
  return out;
}
