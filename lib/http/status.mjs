/**
 * Status links from the team notification (Mark contacted, Mark quoted,
 * Mark confirmed, Close).
 *
 *   GET  /api/enquiries/:id/status?token=…   shows a confirmation page. It
 *        never changes anything, so email link scanners and chat previews
 *        that open links cannot move an enquiry.
 *   POST /api/enquiries/:id/status           (form field `token`) applies it.
 *
 * The token carries the enquiry id, the target status and an expiry,
 * HMAC-signed. Both requests check signature, expiry and id; the state
 * machine only moves an enquiry forwards, so every link is effectively
 * single-use. Renders a small branded page: there is no admin panel.
 */
import { config } from '../config.mjs';
import { verifyAction } from '../security/signing.mjs';
import { getEnquiry, transitionStatus } from '../enquiries/store.mjs';
import { notifyCustomerOfStatus } from '../enquiries/notify.mjs';
import { ACTIONS, STATUS_LABELS, canTransition } from '../enquiries/status.mjs';
import { html, readForm } from './response.mjs';
import { escapeHtml } from '../email/sanitise.mjs';
import { site } from '../../src/data/site.mjs';

const NAME = (status) => STATUS_LABELS[status] || status;
const MAX_FORM_BYTES = 2048;

const MESSAGES = {
  ok: (e, to) => ({
    status: 200,
    eyebrow: 'Done',
    title: `${e.reference_number} is now “${NAME(to)}”.`,
    note: to === 'CONFIRMED' ? `${e.name} · ${e.email}. Recorded as confirmed; the customer has been emailed their booking confirmation.` : `${e.name} · ${e.email}`,
  }),
  already: (e) => ({ status: 200, eyebrow: 'Already done', title: `${e.reference_number} is already “${NAME(e.status)}”.`, note: 'This link has been used, or the status moved on. Nothing changed.' }),
  backwards: (e) => ({ status: 409, eyebrow: 'No change', title: `${e.reference_number} is already “${NAME(e.status)}”.`, note: 'This link would move the enquiry back a step, so nothing changed.' }),
  terminal: (e) => ({ status: 409, eyebrow: 'No change', title: `${e.reference_number} is ${NAME(e.status).toLowerCase()}.`, note: 'A closed or cancelled request is not reopened from a link; use the bookings dashboard.' }),
  invalid: () => ({ status: 400, eyebrow: 'No change', title: 'That is not a valid status change.', note: '' }),
  missing: () => ({ status: 404, eyebrow: 'Not found', title: 'We could not find that enquiry.', note: '' }),
  expired: () => ({ status: 410, eyebrow: 'Link expired', title: 'This link has expired.', note: `Status links last ${config.limits.actionLinkDays} days.` }),
  signature: () => ({ status: 403, eyebrow: 'Not allowed', title: 'This link is not valid.', note: '' }),
  malformed: () => ({ status: 400, eyebrow: 'Not allowed', title: 'This link is not valid.', note: '' }),
  paused: () => ({ status: 503, eyebrow: 'Unavailable', title: 'Status links are not active on this deployment.', note: '' }),
};

/** Signature, expiry, id and action checks shared by GET and POST. */
function check(id, token) {
  const v = verifyAction(token);
  if (!v.ok) return { refuse: MESSAGES[v.reason]?.() || MESSAGES.malformed() };
  if (v.enquiryId !== id) return { refuse: MESSAGES.signature() };
  if (!(v.status in ACTIONS)) return { refuse: MESSAGES.invalid() };
  return { v };
}

const idFrom = (request, ctx) => ctx.params?.id || new URL(request.url).pathname.split('/')[3] || '';

/** GET: confirmation page only. */
export async function getStatusAction(request, ctx = {}) {
  if (!config.accepting) return page(MESSAGES.paused());
  const id = idFrom(request, ctx);
  const token = new URL(request.url).searchParams.get('token') || '';
  const c = check(id, token);
  if (c.refuse) return page(c.refuse);
  const e = await getEnquiry(id);
  if (!e) return page(MESSAGES.missing());
  const t = canTransition(e.status, c.v.status);
  if (!t.ok) return page((MESSAGES[t.reason] || MESSAGES.invalid)(e, c.v.status));
  const to = c.v.status;
  return page({
    status: 200,
    eyebrow: 'Confirm',
    title: `Mark ${e.reference_number} as “${NAME(to)}”?`,
    note: `${e.name} · ${e.email}. Currently “${NAME(e.status)}”.`,
    warning: to === 'CONFIRMED' ? 'Only if you have confirmed the booking with the customer. They will be emailed a booking confirmation.' : to === 'CLOSED' ? 'A closed enquiry cannot be reopened from a link.' : '',
    form: { action: `/api/enquiries/${encodeURIComponent(id)}/status`, token, label: ACTIONS[to] },
  });
}

/** POST: apply the change. */
export async function postStatusAction(request, ctx = {}) {
  if (!config.accepting) return page(MESSAGES.paused());
  const id = idFrom(request, ctx);
  const body = await readForm(request, MAX_FORM_BYTES);
  if (!body.ok) return page({ ...MESSAGES.malformed(), status: body.status });
  const c = check(id, body.form.get('token') || '');
  if (c.refuse) return page(c.refuse);
  const r = await transitionStatus(id, c.v.status);
  if (r.ok) {
    if (c.v.status === 'CONFIRMED') await notifyCustomerOfStatus(r.enquiry, 'CONFIRMED');
    return page(MESSAGES.ok(r.enquiry, c.v.status));
  }
  if (r.reason === 'missing') return page(MESSAGES.missing());
  return page((MESSAGES[r.reason] || MESSAGES.invalid)(r.enquiry, c.v.status));
}

function page({ status, eyebrow, title, note, warning = '', form = null }) {
  const action = form
    ? `<form method="post" action="${escapeHtml(form.action)}">
<input type="hidden" name="token" value="${escapeHtml(form.token)}">
<button type="submit">${escapeHtml(form.label)}</button>
</form>`
    : '';
  return html(
    status,
    `<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title>${escapeHtml(title)} | ${escapeHtml(site.shortName)}</title>
<style>
body{margin:0;background:#f8fafa;color:#2b333b;font-family:Inter,'Helvetica Neue',Arial,sans-serif;min-height:100vh;display:flex;flex-direction:column}
header{background:#0b2233;padding:20px 24px;border-bottom:3px solid #056a2b;text-align:center}
header img{height:40px;width:auto;display:inline-block}
main{flex:1;display:grid;place-items:center;padding:32px 16px}
.card{max-width:520px;width:100%;background:#fff;border:1px solid #e1e5e8;border-radius:12px;padding:36px 28px;text-align:center;box-sizing:border-box}
.eyebrow{margin:0 0 10px;font-size:12px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#056a2b}
h1{margin:0 0 12px;font-family:'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif;font-weight:700;font-size:30px;line-height:1.15;color:#0b1620;overflow-wrap:anywhere}
p{margin:0;font-size:15px;line-height:1.6;color:#5e6670;overflow-wrap:anywhere}
.warning{margin-top:14px;padding:10px 14px;border:1px solid #cfe6d8;border-radius:6px;background:#eef7f1;color:#0b1620}
form{margin-top:22px}
button{min-height:48px;padding:12px 26px;border:1px solid #056a2b;border-radius:6px;background:#056a2b;color:#fff;font:600 15px Inter,'Helvetica Neue',Arial,sans-serif;cursor:pointer}
button:focus-visible{outline:3px solid #175b9a;outline-offset:3px}
a{color:#102e42}
</style></head>
<body>
<header><img src="/assets/brand/gt-logo-reversed-compact.svg" alt="${escapeHtml(site.name)}" width="150" height="40"></header>
<main><div class="card">
<p class="eyebrow">${escapeHtml(eyebrow)}</p>
<h1>${escapeHtml(title)}</h1>
${note ? `<p>${escapeHtml(note)}</p>` : ''}
${warning ? `<p class="warning">${escapeHtml(warning)}</p>` : ''}
${action}
<p style="margin-top:22px;font-size:13px"><a href="/">${escapeHtml(site.name)}</a></p>
</div></main>
</body></html>`,
    {
      // The token is in the URL: never send it on as a referrer. Lock the page down.
      'Referrer-Policy': 'no-referrer',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; img-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
    },
  );
}
