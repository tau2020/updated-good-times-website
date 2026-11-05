/**
 * Visitor acknowledgement: confirms what Good Times received, gives the reference,
 * and says plainly that this is not yet a confirmed booking. No promises
 * about response times (none are confirmed by Good Times).
 *
 * @param {{ enquiry: object }} props
 */
import { subjectSafe, escapeHtml } from '../sanitise.mjs';
import { shell, textShell, h1, eyebrow, p, notice, detailTable, referenceBadge, firstName, termsLine, termsTextLine } from '../layout.mjs';
import { tripRows, visitorSummary, isPackage } from '../summary.mjs';

const NOT_CONFIRMED_TITLE = 'This is not yet a confirmed booking.';
const NOT_CONFIRMED_BODY = 'Nothing is booked until we have confirmed availability, the price and the arrangements with you.';

export function render({ enquiry: e }) {
  const ref = e.reference_number;
  const name = firstName(e.name);
  const kind = e.enquiry_type === 'transfer' ? 'transfer request' : isPackage(e) ? 'multi-day tour enquiry' : 'tour enquiry';
  const subject = subjectSafe(`Your Good Times ${kind} ${ref}: received, not yet confirmed`);
  const via = { whatsapp: `on WhatsApp at ${e.phone}`, phone: `by phone on ${e.phone}` }[e.preferred_contact_method] || `by email at ${e.email}`;
  // No free text in a message to an unverified address (see tripRows).
  const rows = tripRows(e, { visitor: true });
  const intro = `Thank you for ${visitorSummary(e)}. We will reply to confirm availability and a quote. You asked to be contacted ${via}.`;

  const body = [
    eyebrow('Enquiry received'),
    h1(`Thank you, ${name}.`),
    p(escapeHtml(intro)),
    notice(NOT_CONFIRMED_TITLE, NOT_CONFIRMED_BODY),
    referenceBadge(ref),
    eyebrow('What you sent'),
    detailTable(rows),
    p(`If anything changes, reply to this email and quote your reference, <strong>${escapeHtml(ref)}</strong>.`),
    termsLine(),
    p(`Kind regards,<br>Good Times in Cape Town`),
  ].join('\n');

  const html = shell({ title: subject, preheader: `Reference ${ref}. ${NOT_CONFIRMED_TITLE}`, body });

  const text = textShell([
    `Thank you, ${name}.`,
    '',
    intro,
    '',
    `${NOT_CONFIRMED_TITLE} ${NOT_CONFIRMED_BODY}`,
    '',
    `Reference: ${ref}`,
    '',
    'What you sent:',
    ...rows.filter(([, v]) => v && String(v).trim()).map(([k, v]) => `  ${k}: ${String(v).replace(/\n/g, '\n    ')}`),
    '',
    `If anything changes, reply to this email and quote your reference, ${ref}.`,
    '',
    termsTextLine(),
    '',
    'Kind regards,',
    'Good Times in Cape Town',
  ]);

  return { subject, html, text };
}
