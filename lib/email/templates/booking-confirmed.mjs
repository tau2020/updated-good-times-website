/**
 * Customer confirmation: sent when Good Times marks a request Confirmed (from the
 * dashboard or the status link in the team email), which Good Times does only once
 * the booking is agreed with the customer. Same "what you sent" rows as the
 * acknowledgement (no free text to an unverified address).
 *
 * @param {{ enquiry: object }} props
 */
import { subjectSafe, escapeHtml } from '../sanitise.mjs';
import { shell, textShell, h1, eyebrow, p, detailTable, referenceBadge, firstName, termsLine, termsTextLine } from '../layout.mjs';
import { tripRows, kindLabel } from '../summary.mjs';

export function render({ enquiry: e }) {
  const ref = e.reference_number;
  const name = firstName(e.name);
  const subject = subjectSafe(`Your Good Times booking ${ref} is confirmed`);
  const rows = tripRows(e, { visitor: true }).filter(([k]) => k !== 'Request');
  const intro = `We have confirmed your ${kindLabel(e)}. The details are below; the price and anything else agreed with us stand as arranged with you.`;

  const body = [
    eyebrow('Booking confirmed'),
    h1(`You’re booked, ${name}.`),
    p(escapeHtml(intro)),
    referenceBadge(ref),
    eyebrow('Your booking'),
    detailTable(rows),
    p(`If anything changes, reply to this email and quote your reference, <strong>${escapeHtml(ref)}</strong>.`),
    termsLine(),
    p(`Kind regards,<br>Good Times in Cape Town`),
  ].join('\n');

  const html = shell({ title: subject, preheader: `Reference ${ref}. Your booking is confirmed.`, body });
  const text = textShell([
    `You’re booked, ${name}.`,
    '',
    intro,
    '',
    `Reference: ${ref}`,
    '',
    'Your booking:',
    ...rows.filter(([, v]) => v && String(v).trim()).map(([k, v]) => `  ${k}: ${v}`),
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
