/**
 * The staff dashboard's pages: plain server-rendered HTML with inline styles
 * and no JavaScript, so its Content-Security-Policy can forbid every script.
 * Every value is escaped here; handlers pass raw rows.
 */
import { escapeHtml as h, textToHtml } from '../email/sanitise.mjs';
import { formatDateTime, formatShortDate, formatDayDate, partyLine } from '../email/layout.mjs';
import { tripRows, contactRows, tourTitle, transferLabel, isPackage } from '../email/summary.mjs';
import { STATUSES, STATUS_LABELS } from '../enquiries/status.mjs';
import { site } from '../../src/data/site.mjs';
import { ICON_LINKS } from '../http/response.mjs';

const CSS = `
/* src/assets/css/tokens.css */
:root{--forest:#102e42;--forest-deep:#0b2233;--forest-soft:#e6f4ea;--ink:#0b1620;--text:#283037;--gold:#056a2b;--gold-soft:#45e375;--muted:#5b6670;--line:#e1e5e8;--line-strong:#c9d0d5;--paper:#f8fafa;--ok:#1d6b45;--warn:#8a3b12}
*{box-sizing:border-box}
body{margin:0;background:var(--paper);color:var(--text);font:15px/1.5 Inter,'Helvetica Neue',Arial,sans-serif}
a{color:var(--forest)}
header.top{background:var(--forest-deep);border-bottom:3px solid var(--gold);padding:12px 16px;display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center;justify-content:space-between}
header.top img{height:34px;width:auto;display:block}
header.top nav{display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center}
header.top nav a{color:var(--gold-soft);text-decoration:none;font-weight:700}
header.top nav a[aria-current]{text-decoration:underline;text-underline-offset:4px}
header.top .who{color:#c9d6dc;font-size:13px}
header.top form{margin:0}
header.top button{background:none;border:1px solid var(--gold-soft);color:var(--gold-soft);border-radius:999px;padding:4px 12px;font:600 13px inherit;cursor:pointer}
main{max-width:1180px;margin:0 auto;padding:20px 16px 48px}
h1{font-family:'Bricolage Grotesque','Helvetica Neue',Arial,sans-serif;font-weight:700;font-size:30px;line-height:1.15;color:var(--ink);margin:0 0 14px}
h2{font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:var(--gold);margin:26px 0 10px}
.card{background:#fff;border:1px solid var(--line);border-radius:12px;padding:18px}
.flash{padding:10px 14px;border-radius:10px;margin:0 0 16px;border:1px solid #b9dcc8;background:#eef8f2;color:var(--ok)}
.flash.error{border-color:#efc9b5;background:#fff3ec;color:var(--warn)}
.tabs{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 14px;padding:0;list-style:none}
.tabs a{display:inline-block;padding:6px 12px;border:1px solid var(--line-strong);border-radius:999px;background:#fff;text-decoration:none;color:var(--ink);font-weight:600;font-size:14px}
.tabs a[aria-current]{background:var(--forest);border-color:var(--forest);color:#fff}
.tabs .n{color:var(--muted);font-weight:500;margin-left:4px}
.tabs a[aria-current] .n{color:#c9d6dc}
form.search{display:flex;gap:8px;margin:0 0 14px;flex-wrap:wrap}
input,select,textarea{font:inherit;color:inherit;border:1px solid var(--line-strong);border-radius:8px;padding:8px 10px;background:#fff;max-width:100%}
input[type=search]{flex:1;min-width:200px}
textarea{width:100%;min-height:90px}
button.btn{font:600 14px Inter,'Helvetica Neue',Arial,sans-serif;border-radius:6px;padding:10px 18px;border:1px solid var(--gold);background:var(--gold);color:#fff;cursor:pointer;min-height:44px}
button.btn.plain{background:#fff;border-color:var(--line-strong);color:var(--ink)}
button:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible{outline:3px solid var(--gold-soft);outline-offset:2px}
table.list{width:100%;border-collapse:collapse;background:#fff;border:1px solid var(--line);border-radius:12px;overflow:hidden}
table.list th,table.list td{padding:10px 12px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}
table.list th{font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);background:#f5f7f7}
table.list tr:last-child td{border-bottom:0}
.ref{font-weight:700;letter-spacing:.04em;white-space:nowrap}
.muted{color:var(--muted);font-size:13px}
.badge{display:inline-block;padding:2px 10px;border-radius:999px;font-size:12px;font-weight:700;white-space:nowrap;border:1px solid var(--line)}
.s-NEW{background:#eef7f1;border-color:#cfe6d8;color:#04461c}
.s-CONTACTED,.s-QUOTED{background:var(--forest-soft);border-color:#c5d6cb;color:var(--forest)}
.s-CONFIRMED{background:#e6f5ec;border-color:#b9dcc8;color:var(--ok)}
.s-CLOSED{background:#f1f3f4;color:var(--muted)}
.s-CANCELLED{background:#fdeee8;border-color:#efc9b5;color:var(--warn)}
dl.rows{display:grid;grid-template-columns:minmax(120px,180px) 1fr;gap:0;margin:0}
dl.rows dt,dl.rows dd{margin:0;padding:8px 0;border-bottom:1px solid var(--line)}
dl.rows dt{font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);padding-right:12px}
.grid{display:grid;gap:18px;grid-template-columns:1fr}
@media(min-width:900px){.grid{grid-template-columns:3fr 2fr}}
.stack>*+*{margin-top:12px}
label{display:block;font-weight:600;margin:0 0 4px}
.check{display:flex;gap:8px;align-items:center;font-weight:500}
.check input{width:18px;height:18px}
ul.plain{list-style:none;margin:0;padding:0}
ul.plain li{padding:8px 0;border-bottom:1px solid var(--line)}
.full{color:var(--warn);font-weight:700}
@media(max-width:720px){
  table.list thead{display:none}
  table.list,table.list tbody,table.list tr,table.list td{display:block;width:100%}
  table.list tr{border-bottom:1px solid var(--line);padding:6px 0}
  table.list td{border:0;padding:4px 12px}
  table.list td[data-label]::before{content:attr(data-label) ": ";font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em}
  dl.rows{grid-template-columns:1fr}
  dl.rows dt{border-bottom:0;padding-bottom:0}
}
/* availability: a month calendar and the chosen day */
.visually-hidden{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.lead{font-size:17px;max-width:60ch;margin:0 0 18px;color:var(--ink)}
.center{text-align:center;margin:0 0 10px}
.avail{display:grid;gap:20px;grid-template-columns:1fr}
@media(min-width:960px){.avail{grid-template-columns:minmax(0,3fr) minmax(320px,2fr);align-items:start}}
.monthbar{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:8px;margin:0 0 8px}
.monthbar h2.month{margin:0;font:700 24px/1.2 'Bricolage Grotesque','Helvetica Neue',Arial,sans-serif;letter-spacing:0;text-transform:none;color:var(--ink);text-align:center}
.monthbar a.step{justify-self:start;display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:0 16px;border:1px solid var(--line-strong);border-radius:999px;background:#fff;text-decoration:none;color:var(--ink);font-weight:600}
.monthbar a.step:last-child{justify-self:end}
table.cal{width:100%;border-collapse:separate;border-spacing:5px;table-layout:fixed;margin:0 -5px}
table.cal th{font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;padding:2px 0 4px;text-align:center}
table.cal th abbr{text-decoration:none}
table.cal td{padding:0;vertical-align:top}
.cal .cell{display:flex;flex-direction:column;gap:2px;min-height:72px;padding:7px 8px;border-radius:10px;border:1px solid var(--line-strong);background:#fff;text-decoration:none;color:var(--ink)}
.cal a.cell:hover{border-color:var(--forest);background:#f3f8f5}
.cal .num{font-weight:700;font-size:16px;line-height:1.1}
.cal .lab{font-size:13px;font-weight:700;line-height:1.2}
.cal .sub{font-size:12px;color:var(--muted);line-height:1.2}
.cal .open .lab,.chip.open{color:var(--ok)}
.cal .some,.chip.some{background:#fff6dc;border-color:#e6c868}
.cal .some .lab,.chip.some{color:#5c4300}
.cal .full,.chip.full{background:#fdeee8;border-color:#e3a988}
.cal .full .lab,.chip.full{color:var(--warn)}
.cal .closed,.chip.closed{background:repeating-linear-gradient(135deg,#eef1f2 0 6px,#e2e6e8 6px 12px);border-color:#b9c1c7}
.cal .closed .lab,.chip.closed{color:#2f383f}
.cal .past{background:#eef1f2;border-color:transparent;color:#5b6670}
.cal .today{box-shadow:inset 0 0 0 2px var(--gold)}
.cal .tday{font-size:11px;font-weight:700;color:var(--gold)}
.short{display:none}
.avail .card>h2:first-child,.avail .card>.stack>h2:first-child{margin-top:0}
.day li .what{display:block;margin-top:2px}
.cal .sel{outline:3px solid var(--forest);outline-offset:1px}
.legend{display:flex;flex-wrap:wrap;gap:8px 18px;margin:12px 0 0;padding:0;list-style:none;font-size:14px}
.legend li{display:flex;align-items:center;gap:6px}
.chip{display:inline-block;min-width:56px;text-align:center;padding:2px 8px;border-radius:6px;border:1px solid var(--line-strong);background:#fff;font-weight:700;font-size:13px}
.eyebrow{margin:0;font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--gold)}
.day h2{margin:0;font:700 24px/1.2 'Bricolage Grotesque','Helvetica Neue',Arial,sans-serif;letter-spacing:0;text-transform:none;color:var(--ink)}
.day h3{margin:18px 0 6px;font-size:15px;color:var(--ink)}
.state{font-size:17px;font-weight:600;margin:0;padding:10px 12px;border-radius:8px;background:#eef8f2;color:var(--ok)}
.state-some{background:#fff6dc;color:#5c4300}
.state-full{background:#fdeee8;color:var(--warn)}
.state-closed{background:#eef1f2;color:#2f383f}
.state-past{background:#f1f3f4;color:var(--muted)}
.day form{margin:0}
button.btn.big{width:100%;min-height:52px;font-size:16px}
button.btn.dark{background:var(--forest);border-color:var(--forest)}
.stepper{display:flex;align-items:center;gap:14px}
.stepper button.step{min-width:52px;min-height:52px;padding:0;font-size:24px;line-height:1}
.stepper button[disabled]{opacity:.45;cursor:not-allowed}
.stepper .count{font:700 30px/1 'Bricolage Grotesque','Helvetica Neue',Arial,sans-serif;min-width:2ch;text-align:center;color:var(--ink)}
ol.steps{margin:0;padding-left:22px}
ol.steps li{margin:4px 0}
details.card>summary{cursor:pointer;font-weight:700;color:var(--ink);min-height:28px}
details.card[open]>summary{margin-bottom:12px}
.pair{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.pair input{width:100%}
.row{display:flex;flex-wrap:wrap;gap:8px}
@media(max-width:560px){
  h1{font-size:26px}
  table.cal{border-spacing:3px;margin:0 -3px}
  .cal .cell{min-height:58px;padding:5px 4px;border-radius:8px}
  .cal .num{font-size:14px}
  .cal .lab{font-size:11px}
  .cal .sub{display:none}
  .cal .tday{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
  .long{display:none}
  .short{display:inline}
  .monthbar h2.month{font-size:20px}
  .monthbar a.step{padding:0 12px}
}`;

/** The whole page around `body`. */
export function layout({ title, body, session = null, form = '', current = '' }) {
  const nav = session
    ? `<nav aria-label="Dashboard">
<a href="/admin/"${current === 'bookings' ? ' aria-current="page"' : ''}>Bookings</a>
<a href="/admin/availability"${current === 'availability' ? ' aria-current="page"' : ''}>Availability</a>
<span class="who">${h(session.email)}</span>
<form method="post" action="/admin/sign-out"><input type="hidden" name="form" value="${h(form)}"><button type="submit">Sign out</button></form>
</nav>`
    : '';
  return `<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title>${h(title)} | ${h(site.shortName)} bookings</title>${ICON_LINKS}<style>${CSS}</style></head>
<body><header class="top"><a href="/admin/"><img src="/assets/brand/gt-logo-reversed-compact.svg" alt="${h(site.name)}: bookings dashboard" width="128" height="34"></a>${nav}</header>
<main>${body}</main></body></html>`;
}

export const flash = (msg) => (msg ? `<p class="flash${msg.error ? ' error' : ''}" role="${msg.error ? 'alert' : 'status'}">${h(msg.text)}</p>` : '');

export const badge = (status) => `<span class="badge s-${h(status)}">${h(STATUS_LABELS[status] || status)}</span>`;

/* ---------- sign-in ---------- */

export function signInPage({ message = null, disabled = false, next = '/admin/' } = {}) {
  const body = disabled
    ? `<div class="card"><h1>Bookings dashboard</h1><p>Sign-in is not set up on this deployment (no staff addresses in ADMIN_EMAILS, or bookings are not live here).</p></div>`
    : `<div class="card stack" style="max-width:480px;margin:0 auto">
<h1>Bookings dashboard</h1>
${flash(message)}
<p>Enter your Good Times staff email address. We will email you a link to sign in; no password is needed.</p>
<form method="post" action="/admin/sign-in" class="stack">
<input type="hidden" name="next" value="${h(next)}">
<div><label for="email">Email address</label><input id="email" name="email" type="email" autocomplete="email" required style="width:100%"></div>
<button class="btn" type="submit">Email me a sign-in link</button>
</form></div>`;
  return layout({ title: 'Sign in', body });
}

export function signInSentPage() {
  return layout({
    title: 'Check your email',
    body: `<div class="card stack" style="max-width:480px;margin:0 auto"><h1>Check your email</h1><p>If that address belongs to Good Times staff, a sign-in link is on its way. It works once and expires in 20 minutes.</p><p class="muted">Nothing arrived? Check the spam folder, then <a href="/admin/sign-in">ask again</a>.</p></div>`,
  });
}

export function confirmSignInPage({ token, email, next = '/admin/' }) {
  return layout({
    title: 'Sign in',
    body: `<div class="card stack" style="max-width:480px;margin:0 auto"><h1>Sign in</h1><p>Sign in to the Good Times bookings dashboard as <strong>${h(email)}</strong>.</p>
<form method="post" action="/admin/sign-in/confirm"><input type="hidden" name="token" value="${h(token)}"><input type="hidden" name="next" value="${h(next)}"><button class="btn" type="submit">Sign in</button></form></div>`,
  });
}

export function messagePage({ title, text, status = 200 }) {
  return { status, html: layout({ title, body: `<div class="card stack" style="max-width:520px;margin:0 auto"><h1>${h(title)}</h1><p>${h(text)}</p><p><a href="/admin/">Bookings dashboard</a></p></div>` }) };
}

/* ---------- bookings ---------- */

/** What was asked for, in a few words. */
export function serviceOf(e) {
  if (e.enquiry_type === 'transfer') return transferLabel(e.transfer_type);
  return `${isPackage(e) ? 'Package: ' : ''}${tourTitle(e.tour_slug, { short: true })}`;
}

/** When, in Cape Town time. */
export function whenOf(e, { long = false } = {}) {
  const fmt = long ? formatDayDate : formatShortDate;
  if (e.enquiry_type === 'transfer') {
    const out = e.pickup_date_sast ? `${fmt(e.pickup_date_sast)} ${e.pickup_time_sast}` : '';
    return e.return_trip && e.return_date_sast ? `${out} · return ${fmt(e.return_date_sast)} ${e.return_time_sast}` : out;
  }
  if (!e.preferred_date) return 'Flexible dates';
  const nights = isPackage(e) && e.nights ? ` · ${e.nights} nights` : '';
  return `${fmt(e.preferred_date)}${e.dates_flexible ? ' (flexible)' : ''}${nights}`;
}

/** A request whose emails need a person: one failed, or none was ever sent. */
const emailMark = (state) => (state === 'failed' ? ' <span class="full">Email failed</span>' : state === 'none' ? ' <span class="full">No email sent</span>' : '');

/** The line above the retry button: what a retry would send, and what gave up. */
function failedLine(failed) {
  const n = failed?.retryable || 0;
  const gone = failed?.givenUp || 0;
  if (!n && !gone) return '<p class="muted">No email is waiting to be sent again.</p>';
  const parts = [];
  if (n) parts.push(`${n} email${n === 1 ? '' : 's'} failed to send and will go again when you press Retry.`);
  if (gone) parts.push(`${gone} gave up after 5 attempts: open the booking to see the error, and contact the customer directly.`);
  return `<p class="full">${h(parts.join(' '))}</p>`;
}

export function listPage({ session, form, views, view, counts, rows, q, message, failed = null }) {
  const tabs = Object.entries(views)
    .map(([k, v]) => `<li><a href="/admin/?view=${k}"${k === view ? ' aria-current="page"' : ''}>${h(v.label)}<span class="n">${h(counts?.[k] ?? '')}</span></a></li>`)
    .join('');
  const table = rows.length
    ? `<table class="list"><thead><tr><th>Reference</th><th>Service</th><th>When (SAST)</th><th>Party</th><th>Customer</th><th>Status</th><th>Received</th></tr></thead><tbody>
${rows
  .map(
    (e) => `<tr>
<td data-label="Ref"><a class="ref" href="/admin/bookings/${h(e.id)}">${h(e.reference_number)}</a></td>
<td data-label="Service">${h(serviceOf(e))}</td>
<td data-label="When">${h(whenOf(e))}</td>
<td data-label="Party">${h(partyLine(e.adults, e.children))}</td>
<td data-label="Customer">${h(e.name)}<br><span class="muted">${h(e.email)}</span></td>
<td data-label="Status">${badge(e.status)}${emailMark(e.email_state)}</td>
<td data-label="Received" class="muted">${h(formatDateTime(e.created_at).replace(/ SAST$/, ''))}</td>
</tr>`,
  )
  .join('\n')}
</tbody></table>`
    : `<div class="card"><p>No bookings here${q ? ` matching “${h(q)}”` : ''}.</p></div>`;
  const body = `${flash(message)}<h1>Bookings</h1>
<ul class="tabs">${tabs}</ul>
<form class="search" method="get" action="/admin/" role="search"><input type="hidden" name="view" value="${h(view)}">
<input type="search" name="q" value="${h(q)}" placeholder="Reference, name, email or phone" aria-label="Search bookings"><button class="btn plain" type="submit">Search</button></form>
${table}
<h2>Emails</h2>
${failedLine(failed)}
<form method="post" action="/admin/emails/retry"><input type="hidden" name="form" value="${h(form)}"><button class="btn plain" type="submit">Retry emails that failed to send</button></form>`;
  return layout({ title: 'Bookings', body, session, form, current: 'bookings' });
}

const rowsHtml = (rows) =>
  `<dl class="rows">${rows
    .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== '')
    .map(([k, v]) => `<dt>${h(k)}</dt><dd>${typeof v === 'object' && v.html ? v.html : h(v).replace(/\n/g, '<br>')}</dd>`)
    .join('')}</dl>`;

function contactLinks(e) {
  const phone = String(e.phone || '').replace(/[^\d+]/g, '');
  return [
    ['Name', e.name],
    ['Email', { html: `<a href="mailto:${h(e.email)}?subject=${encodeURIComponent(`Your Good Times booking ${e.reference_number}`)}">${h(e.email)}</a>` }],
    ['Phone', phone ? { html: `<a href="tel:${h(phone)}">${h(e.phone)}</a> · <a href="https://wa.me/${h(phone.replace(/\D/g, ''))}">WhatsApp</a>` } : ''],
    ...contactRows(e).filter(([k]) => !['Name', 'Email', 'Phone'].includes(k)),
  ];
}

export function detailPage({ session, form, e, events, emails, message }) {
  const notes = e.special_requirements ? [[e.enquiry_type === 'transfer' ? 'Notes' : 'Special requests', { html: textToHtml(e.special_requirements) }]] : [];
  const trip = tripRows(e).filter(([k]) => k !== 'Notes' && k !== 'Special requests');
  const options = STATUSES.map((s) => `<option value="${s}"${s === e.status ? ' selected' : ''}>${h(STATUS_LABELS[s])}</option>`).join('');
  const history = events.length
    ? `<ul class="plain">${events.map((ev) => `<li>${h(ev.detail || ev.kind)}<br><span class="muted">${h(formatDateTime(ev.at))}${ev.actor ? ` · ${h(ev.actor)}` : ''}</span></li>`).join('')}</ul>`
    : '<p class="muted">No history recorded.</p>';
  const mails = emails.length
    ? `<ul class="plain">${emails
        .map(
          (m) =>
            `<li><strong>${h(m.template)}</strong> → ${h(m.recipient)} · <span class="${m.status === 'failed' ? 'full' : ''}">${h(m.status)}</span>${m.attempts > 1 ? ` (${h(m.attempts)} attempts)` : ''}<br><span class="muted">${h(formatDateTime(m.updated_at))}${m.error ? ` · ${h(m.error)}` : ''}</span></li>`,
        )
        .join('')}</ul>`
    : '<p class="full">No email was sent for this request: the team notification and the customer’s acknowledgement are missing. Contact the customer directly.</p>';
  const body = `${flash(message)}
<p><a href="/admin/">← All bookings</a></p>
<h1>${h(e.reference_number)} · ${h(e.name)}</h1>
<p>${badge(e.status)} <span class="muted">${h(serviceOf(e))} · ${h(whenOf(e, { long: true }))}</span></p>
<div class="grid">
<div class="stack">
<h2>${e.enquiry_type === 'transfer' ? 'Transfer' : isPackage(e) ? 'Package' : 'Tour'}</h2>
<div class="card">${rowsHtml([...trip, ...notes])}</div>
<h2>Customer</h2>
<div class="card">${rowsHtml(contactLinks(e))}</div>
<h2>Received</h2>
<div class="card">${rowsHtml([['Received', formatDateTime(e.created_at)], ['From page', e.page_url], ['Consent', e.consent_at ? formatDateTime(e.consent_at) : '']])}</div>
</div>
<div class="stack">
<h2>Status</h2>
<form class="card stack" method="post" action="/admin/bookings/${h(e.id)}/status">
<input type="hidden" name="form" value="${h(form)}">
<div><label for="status">Status</label><select id="status" name="status">${options}</select></div>
<label class="check"><input type="checkbox" name="notify" value="on" checked> Email the customer when this confirms or cancels the booking</label>
<p class="muted">Set <strong>Confirmed</strong> only once the booking is agreed with the customer. Closed and Cancelled free the vehicle.</p>
<button class="btn" type="submit">Save status</button>
</form>
<h2>Team note</h2>
<form class="card stack" method="post" action="/admin/bookings/${h(e.id)}/note">
<input type="hidden" name="form" value="${h(form)}">
<label for="note" class="muted" style="font-weight:500">Only the team sees this. Never emailed.</label>
<textarea id="note" name="note" maxlength="4000">${h(e.staff_note)}</textarea>
<button class="btn plain" type="submit">Save note</button>
</form>
<h2>History</h2>
<div class="card">${history}</div>
<h2>Emails</h2>
<div class="card">${mails}</div>
</div>
</div>`;
  return layout({ title: `${e.reference_number} · ${e.name}`, body, session, form, current: 'bookings' });
}

/* ---------- availability ---------- */

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const count = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** A month on the previous/next buttons: 'December', or 'Dec' on a phone. */
const stepName = (month) => {
  const name = MONTH_NAMES[Number(month.slice(5, 7)) - 1];
  return `<span class="long">${h(name)}</span><span class="short">${h(name.slice(0, 3))}</span>`;
};
const nextDay = (iso) => new Date(Date.parse(`${iso}T12:00:00Z`) + 864e5).toISOString().slice(0, 10);

/** Changed days, consecutive ones with the same vehicles and reason joined: one line for a week's holiday. */
function runsOf(overrides) {
  const runs = [];
  for (const o of overrides) {
    const last = runs[runs.length - 1];
    if (last && nextDay(last.to) === o.day && last.vehicles === o.vehicles && last.note === (o.note || '')) last.to = o.day;
    else runs.push({ from: o.day, to: o.day, vehicles: o.vehicles, note: o.note || '' });
  }
  return runs;
}

/** 'YYYY-MM' → 'November 2026' */
export const monthName = (month) => `${MONTH_NAMES[Number(month.slice(5, 7)) - 1]} ${month.slice(0, 4)}`;

/** The word on a day in the calendar, and the sentence on its own panel (`normal`: the usual vehicles). */
function dayWords(d, normal) {
  const free = Math.max(0, d.vehicles - d.peak);
  const changed = d.vehicles !== normal && d.vehicles > 0;
  switch (d.state) {
    case 'past':
      return { label: '', sentence: 'This day has passed, so it cannot be changed.' };
    case 'closed':
      return { label: 'Closed', sentence: `Closed. The website does not offer this day.${d.note ? ` Reason: ${d.note}.` : ''}` };
    case 'full':
      return { label: 'Full', sentence: `Full. ${d.vehicles === 1 ? 'The vehicle is' : d.vehicles === 2 ? 'Both vehicles are' : `All ${d.vehicles} vehicles are`} booked, so the website no longer offers this day.` };
    case 'some':
      return { label: `${free} left`, sentence: `${free} of ${count(d.vehicles, 'vehicle')} still free.${changed ? ` (Normally ${normal}.)` : ''}` };
    default:
      return { label: 'Open', sentence: `Open. ${count(d.vehicles, 'vehicle')} can go out and none is booked yet.${changed ? ` (Normally ${normal}.)` : ''}` };
  }
}

/** One day of the month grid: a link to that day, or a faint box for a day that has passed. Its words are its name. */
function dayCell(d, { normal, selected, month }) {
  if (!d) return '<td></td>';
  const n = Number(d.date.slice(8, 10));
  const w = dayWords(d, normal);
  const [weekday, , monthWord] = formatDayDate(d.date).split(' ');
  const sub = d.state !== 'closed' && d.state !== 'past' && d.vehicles !== normal ? `<span class="sub">${h(count(d.vehicles, 'vehicle'))}</span>` : '';
  const cls = `${d.state}${d.today ? ' today' : ''}${d.date === selected ? ' sel' : ''}`;
  const num = `<span class="num"><span class="visually-hidden">${h(weekday)} </span>${n}<span class="visually-hidden"> ${h(monthWord)}</span>${d.today ? ' <span class="tday">today</span>' : ''}</span>`;
  if (d.state === 'past') return `<td><span class="cell ${cls}">${num}<span class="visually-hidden">, passed</span></span></td>`;
  const picked = d.date === selected ? '<span class="visually-hidden">, selected</span>' : '';
  return `<td><a class="cell ${cls}" href="/admin/availability?month=${h(month)}&amp;day=${h(d.date)}#day"${d.today ? ' aria-current="date"' : ''}>${num}<span class="lab">${h(w.label)}</span>${sub}${picked}</a></td>`;
}

/** One hidden-field form with a single button: one tap, one change. */
const action = (form, fields, label, cls = 'btn') =>
  `<form method="post" action="/admin/availability"><input type="hidden" name="form" value="${h(form)}">${Object.entries(fields)
    .map(([k, v]) => `<input type="hidden" name="${h(k)}" value="${h(v)}">`)
    .join('')}<button class="${cls}" type="submit">${label}</button></form>`;

/** The selected day: what it looks like, who is booked, and the buttons that change it. */
function dayPanel(d, { form, normal, bookings }) {
  const w = dayWords(d, normal);
  const booked = bookings.length
    ? `<h3>Booked this day</h3><ul class="plain">${bookings
        .map((b) => `<li><a class="ref" href="/admin/bookings/${h(b.id)}">${h(b.reference_number)}</a> ${h(b.name)} ${badge(b.status)}<span class="what muted">${h(b.what)}</span></li>`)
        .join('')}</ul>`
    : '';
  let actions = '';
  if (d.state === 'closed') {
    actions = `${action(form, { day: d.date, action: 'open' }, 'Open this day', 'btn big')}<p class="muted">It goes back to the normal ${h(count(normal, 'vehicle'))}.</p>`;
  } else if (d.state !== 'past') {
    const keep = bookings.length ? `<p class="muted">The ${bookings.length === 1 ? 'booking above stays' : `${bookings.length} bookings above stay`} as ${bookings.length === 1 ? 'it is' : 'they are'}: closing only stops new bookings.</p>` : '';
    actions = `<form class="stack" method="post" action="/admin/availability"><input type="hidden" name="form" value="${h(form)}"><input type="hidden" name="day" value="${h(d.date)}"><input type="hidden" name="action" value="close">
<div><label for="reason">Reason <span class="muted">(optional, only the team sees it)</span></label><input id="reason" name="note" maxlength="200" placeholder="For example: public holiday" style="width:100%"></div>
<button class="btn big dark" type="submit">Close this day</button></form>${keep}
<h3>Vehicles this day</h3>
<div class="stepper">${d.vehicles > 1 ? action(form, { day: d.date, action: 'fewer' }, '<span aria-hidden="true">−</span><span class="visually-hidden">One vehicle fewer</span>', 'btn plain step') : '<button class="btn plain step" type="button" disabled><span aria-hidden="true">−</span><span class="visually-hidden">One vehicle fewer (not possible: close the day instead)</span></button>'}
<span class="count">${h(d.vehicles)}<span class="visually-hidden"> ${d.vehicles === 1 ? 'vehicle' : 'vehicles'}</span></span>
${d.vehicles < 50 ? action(form, { day: d.date, action: 'more' }, '<span aria-hidden="true">+</span><span class="visually-hidden">One vehicle more</span>', 'btn plain step') : ''}</div>
<p class="muted">How many vehicles, each with a driver, can go out at the same time.</p>
${d.vehicles !== normal ? action(form, { day: d.date, action: 'open' }, `Back to normal (${h(count(normal, 'vehicle'))})`, 'btn plain') : ''}`;
  }
  return `<section id="day" class="card stack day" aria-labelledby="dayname">
<p class="eyebrow">Selected day</p>
<h2 id="dayname">${h(formatDayDate(d.date))}</h2>
<p class="state state-${h(d.state)}">${h(w.sentence)}</p>
${booked}
${actions}
<p><a href="/admin/availability?month=${h(d.date.slice(0, 7))}">Back to the calendar</a></p>
</section>`;
}

/** No day chosen yet: what the page does, and closing several days at once. */
function helpPanel({ form, normal, today }) {
  return `<section class="card stack" aria-labelledby="how">
<h2 id="how">How it works</h2>
<ol class="steps"><li>Choose a day in the calendar.</li><li>Close it, open it again, or change how many vehicles can go out.</li><li>The website stops offering a day when it is full or closed. Bookings you already have stay as they are.</li></ol>
<p class="muted">Normally ${h(count(normal, 'vehicle'))} can go out each day.</p>
</section>
<details class="card"><summary>Going away? Close several days at once</summary>
<form class="stack" method="post" action="/admin/availability"><input type="hidden" name="form" value="${h(form)}">
<div class="pair"><div><label for="from">First day</label><input id="from" name="from" type="date" required min="${h(today)}"></div>
<div><label for="to">Last day</label><input id="to" name="to" type="date" required min="${h(today)}"></div></div>
<div><label for="rangenote">Reason <span class="muted">(optional)</span></label><input id="rangenote" name="note" maxlength="200" placeholder="For example: team holiday" style="width:100%"></div>
<div class="row"><button class="btn dark" type="submit" name="action" value="closeRange">Close these days</button><button class="btn plain" type="submit" name="action" value="openRange">Open them again</button></div>
</form></details>`;
}

export function availabilityPage({ session, form, month, weeks, selected, bookings = [], prevMonth, nextMonth, thisMonth, overrides, defaultVehicles: normal, today, message }) {
  const grid = `<table class="cal"><caption class="visually-hidden">${h(monthName(month))}</caption>
<thead><tr>${WEEKDAYS.map((d) => `<th scope="col"><abbr title="${d}">${d.slice(0, 3)}</abbr></th>`).join('')}</tr></thead>
<tbody>${weeks.map((week) => `<tr>${week.map((d) => dayCell(d, { normal, selected: selected?.date, month })).join('')}</tr>`).join('\n')}</tbody></table>`;
  const legend = `<ul class="legend" aria-label="What the words mean">
<li><span class="chip open">Open</span>bookings welcome</li>
<li><span class="chip some">1 left</span>some vehicles booked</li>
<li><span class="chip full">Full</span>no vehicles left</li>
<li><span class="chip closed">Closed</span>you closed it</li></ul>`;
  const nav = `<div class="monthbar">
${prevMonth ? `<a class="step" href="/admin/availability?month=${h(prevMonth)}"><span aria-hidden="true">‹</span>${stepName(prevMonth)}</a>` : '<span class="step" aria-hidden="true"></span>'}
<h2 class="month">${h(monthName(month))}</h2>
${nextMonth ? `<a class="step" href="/admin/availability?month=${h(nextMonth)}">${stepName(nextMonth)}<span aria-hidden="true">›</span></a>` : '<span class="step" aria-hidden="true"></span>'}
</div>${month !== thisMonth ? `<p class="center"><a href="/admin/availability">Back to this month</a></p>` : ''}`;
  const changed = overrides.length
    ? `<ul class="plain">${runsOf(overrides)
        .map((r) => `<li><a href="/admin/availability?month=${h(r.from.slice(0, 7))}&amp;day=${h(r.from)}#day">${h(formatShortDate(r.from))}</a>${r.to !== r.from ? ` to ${h(formatShortDate(r.to))}` : ''}: ${r.vehicles === 0 ? 'closed' : h(count(r.vehicles, 'vehicle'))}${r.note ? ` <span class="muted">· ${h(r.note)}</span>` : ''}</li>`)
        .join('')}</ul>`
    : '<p class="muted">None. Every day has the normal number of vehicles.</p>';
  const body = `${flash(message)}<h1>Availability</h1>
<p class="lead">Choose a day to close it, open it again, or change how many vehicles can go out.</p>
<div class="avail">
<div>${nav}${grid}${legend}</div>
<div class="stack">${selected ? dayPanel(selected, { form, normal, bookings }) : helpPanel({ form, normal, today })}
<section class="card" aria-labelledby="changed"><h2 id="changed">Days you have changed</h2>${changed}</section></div>
</div>`;
  return layout({ title: 'Availability', body, session, form, current: 'availability' });
}
