/**
 * Customer notice: sent when Good Times cancels a request from the dashboard and
 * leaves "Email the customer" ticked. Neutral wording, because it covers both
 * a request Good Times could not take and a booking that was cancelled.
 *
 * @param {{ enquiry: object }} props
 */
import { subjectSafe, escapeHtml } from '../sanitise.mjs';
import { shell, textShell, h1, eyebrow, p, detailTable, referenceBadge, firstName } from '../layout.mjs';
import { tripRows, kindLabel } from '../summary.mjs';

export function render({ enquiry: e }) {
  const ref = e.reference_number;
  const name = firstName(e.name);
  const subject = subjectSafe(`Your Good Times ${kindLabel(e)} ${ref} has been cancelled`);
  const rows = tripRows(e, { visitor: true }).filter(([k]) => k !== 'Request');
  const intro = `We have cancelled your ${kindLabel(e)} ${ref}. If you did not expect this, or would like to arrange another date, reply to this email and we will help.`;

  const body = [
    eyebrow('Cancelled'),
    h1(`Hello ${name},`),
    p(escapeHtml(intro)),
    referenceBadge(ref),
    detailTable(rows),
    p(`Kind regards,<br>Good Times in Cape Town`),
  ].join('\n');

  const html = shell({ title: subject, preheader: `Reference ${ref} has been cancelled.`, body });
  const text = textShell([`Hello ${name},`, '', intro, '', `Reference: ${ref}`, '', ...rows.filter(([, v]) => v && String(v).trim()).map(([k, v]) => `  ${k}: ${v}`), '', 'Kind regards,', 'Good Times in Cape Town']);
  return { subject, html, text };
}
