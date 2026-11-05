/**
 * What happens the moment an enquiry is stored: the Good Times team gets the full
 * notification (reply-to = the visitor) with signed status links, and the
 * visitor gets an acknowledgement that says plainly it is not yet a
 * confirmed booking. Both go through sendTemplate(), which logs every
 * attempt and never throws, so an email outage cannot fail the request.
 */
import { config } from '../config.mjs';
import { ACTIONS } from './status.mjs';
import { actionUrl } from '../security/signing.mjs';
import { sendTemplate } from '../email/send.mjs';

/** One signed link per team action, all expiring together. */
export function actionLinks(enquiry, { now = Date.now() } = {}) {
  const expiresAt = now + config.limits.actionLinkDays * 24 * 3600 * 1000;
  const links = {};
  for (const status of Object.keys(ACTIONS)) links[status] = actionUrl({ enquiryId: enquiry.id, status, expiresAt });
  return links;
}

/** The request's page in the staff dashboard. */
export const dashboardUrl = (enquiry) => `${config.siteUrl}/admin/bookings/${encodeURIComponent(enquiry.id)}`;

/**
 * Tell the customer about a status Good Times set: CONFIRMED sends the booking
 * confirmation, CANCELLED the cancellation notice. Logged and retried like
 * every other email; never throws.
 */
export async function notifyCustomerOfStatus(enquiry, status) {
  const template = { CONFIRMED: 'booking-confirmed', CANCELLED: 'booking-cancelled' }[status];
  if (!template) return { ok: false, skipped: true };
  return sendTemplate(template, { enquiry }, { to: enquiry.email, enquiryId: enquiry.id, replyTo: null });
}

/**
 * Both emails are sent at the same time (each send has its own time limit in
 * sendTemplate), so a slow or failing provider costs one timeout, not two,
 * inside the function's time budget.
 *
 * @returns {Promise<{ internal: object, customer: object, allSent: boolean }>}
 */
export async function notifyNewEnquiry(enquiry) {
  const [internal, customer] = (
    await Promise.allSettled([
      sendTemplate('new-enquiry-internal', { enquiry, actions: actionLinks(enquiry), dashboardUrl: dashboardUrl(enquiry) }, { to: config.email.teamInbox, enquiryId: enquiry.id, replyTo: enquiry.email }),
      sendTemplate('enquiry-received', { enquiry }, { to: enquiry.email, enquiryId: enquiry.id, replyTo: null }),
    ])
  ).map((r) => (r.status === 'fulfilled' ? r.value : { ok: false, error: String(r.reason?.message || r.reason) }));
  return { internal, customer, allSent: Boolean(internal.ok && customer.ok) };
}
