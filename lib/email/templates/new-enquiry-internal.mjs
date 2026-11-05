/**
 * Team notification: everything the visitor sent, a subject line that can be
 * read at a glance on a phone, and the signed one-click status links.
 * Reply-to is the visitor, so "Reply" just works.
 *
 * @param {{ enquiry: object, actions: Record<string,string>, dashboardUrl?: string }} props
 *   actions: status → signed URL, e.g. { CONTACTED: 'https://…' }
 *   dashboardUrl: the request in the staff dashboard (/admin/bookings/<id>)
 */
import { subjectSafe, escapeHtml, textToHtml } from '../sanitise.mjs';
import { shell, textShell, h1, eyebrow, p, button, detailTable, quoteBlock, referenceBadge, formatDateTime, COLOURS, SANS } from '../layout.mjs';
import { ACTIONS } from '../../enquiries/status.mjs';
import { tripRows, contactRows, teamSubject, isPackage } from '../summary.mjs';

export function render({ enquiry: e, actions = {}, dashboardUrl = '' }) {
  const ref = e.reference_number;
  const transfer = e.enquiry_type === 'transfer';
  const pkg = isPackage(e);
  const subject = subjectSafe(teamSubject(e));
  const trip = tripRows(e).filter(([k]) => k !== 'Notes' && k !== 'Special requests');
  const note = e.special_requirements;
  const meta = [
    ['Received', e.created_at ? formatDateTime(e.created_at) : ''],
    ['Sent from', e.page_url],
  ];

  const links = Object.entries(ACTIONS)
    .filter(([status]) => actions[status])
    .map(
      ([status, label]) =>
        `<a href="${escapeHtml(actions[status])}" style="display:inline-block;margin:0 8px 10px 0;padding:10px 16px;border:1px solid ${COLOURS.goldStroke};border-radius:999px;font-family:${SANS};font-size:13px;font-weight:700;color:${COLOURS.navy};text-decoration:none">${escapeHtml(label)}</a>`,
    )
    .join('');

  const body = [
    eyebrow(transfer ? 'New transfer request' : pkg ? 'New multi-day tour enquiry' : 'New tour enquiry'),
    h1(e.name),
    referenceBadge(ref),
    p(`<span style="color:${COLOURS.muted};font-size:14px">Not yet confirmed. Reply to confirm availability and a quote. The visitor prefers <strong style="color:${COLOURS.ink}">${escapeHtml(contactRows(e).find(([k]) => k === 'Reply by')[1])}</strong>.</span>`),
    eyebrow(transfer ? 'Transfer' : pkg ? 'Multi-day tour' : 'Tour'),
    detailTable(trip),
    note ? eyebrow(transfer ? 'Notes' : 'Special requests') : '',
    note ? quoteBlock(textToHtml(note)) : '',
    eyebrow('Contact'),
    detailTable(contactRows(e)),
    detailTable(meta),
    dashboardUrl ? button(dashboardUrl, 'Open in the bookings dashboard') : '',
    eyebrow('Update status'),
    p(`Each link opens a short confirmation page; press its button to apply the change. No login needed. Links only move an enquiry forwards and expire in two weeks. Use <strong>Mark confirmed</strong> only after you have confirmed the booking with the customer.`),
    `<p style="margin:0 0 8px">${links}</p>`,
    p(`<span style="color:${COLOURS.muted};font-size:13px">Reply to this email to write to ${escapeHtml(e.name)} directly.</span>`),
  ].join('\n');

  const html = shell({ title: subject, preheader: `${e.name} · ${e.email}${note ? ` · ${note.slice(0, 80)}` : ''}`, body, footerNote: 'Internal notification from the website enquiry form.' });

  const line = ([k, v]) => `${k}: ${v}`;
  const has = ([, v]) => v && String(v).trim();
  const text = textShell([
    subject,
    '',
    'Not yet confirmed. Reply to confirm availability and a quote.',
    '',
    ...trip.filter(has).map(line),
    ...(note ? ['', `${transfer ? 'Notes' : 'Special requests'}:`, note] : []),
    '',
    ...contactRows(e).filter(has).map(line),
    ...meta.filter(has).map(line),
    '',
    ...(dashboardUrl ? [`Bookings dashboard: ${dashboardUrl}`, ''] : []),
    'Update status (each link opens a confirmation page; forwards only; expires in two weeks; "Mark confirmed" only once the booking is confirmed with the customer):',
    ...Object.entries(ACTIONS)
      .filter(([status]) => actions[status])
      .map(([status, label]) => `  ${label}: ${actions[status]}`),
    '',
    `Reply to this email to write to ${e.name} directly.`,
  ]);

  return { subject, html, text };
}
