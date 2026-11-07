/**
 * Shared Good Times-branded shell for every email. Table-based, inline-styled HTML
 * that holds up in Gmail, Outlook (Word engine) and Apple Mail, plus a
 * plain-text twin. Colours and type mirror the design tokens in
 * src/assets/css/tokens.css (ocean navy, Good Times green, white), and the
 * header carries the approved reversed logo as a PNG (mail clients do not render SVG)
 * with the company statement under it, as on the site (6 Nov 2026).
 */
import { config } from '../config.mjs';
import { site } from '../../src/data/site.mjs';
import { escapeHtml } from './sanitise.mjs';

export const COLOURS = {
  navy: '#102e42', // the logo's ocean navy: the brand band
  ink: '#0b1620',
  ivory: '#f3f7f5',
  sky: '#eaeff0',
  gold: '#056a2b', // Good Times green: the accent rule (the key names predate the palette)
  goldStroke: '#45e375',
  goldText: '#6fed8f', // light green text on navy: 9.5:1
  goldInk: '#056a2b', // green text and links on white: 6.3:1
  muted: '#5b6670',
  line: '#e1e7ea',
  noticeBg: '#eef7f1',
  noticeLine: '#cfe6d8',
};

/** The display stack (Bricolage Grotesque where installed, then the system sans; emails cannot load web fonts). */
export const SERIF = "'Bricolage Grotesque', 'Helvetica Neue', Helvetica, Arial, sans-serif";
export const SANS = "Inter, 'Helvetica Neue', Helvetica, Arial, sans-serif";

/* ---------- formatting helpers shared by templates ---------- */

/**
 * First name for a greeting. Only a plain word is used (letters, apostrophes,
 * hyphens, up to 30 characters); anything else, such as a link pasted into
 * the name field, falls back to "there".
 */
export const firstName = (name) => {
  const first = String(name ?? '').trim().split(/\s+/)[0] || '';
  return /^\p{L}[\p{L}'’-]{0,29}$/u.test(first) ? first : 'there';
};

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function parts(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? ''));
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  return { y, mo, d, dow: new Date(Date.UTC(y, mo - 1, d)).getUTCDay() };
}

/** '2026-11-12' → '12 November 2026'. Anything else is returned as given. */
export function formatDate(iso) {
  const p = parts(iso);
  return p ? `${p.d} ${MONTHS[p.mo - 1]} ${p.y}` : String(iso ?? '');
}

/** '2026-10-17' → 'Saturday 17 October 2026'. */
export function formatDayDate(iso) {
  const p = parts(iso);
  return p ? `${DAYS[p.dow]} ${p.d} ${MONTHS[p.mo - 1]} ${p.y}` : String(iso ?? '');
}

/** '2026-10-17' → 'Sat 17 Oct' (for subjects). */
export function formatShortDate(iso, { weekday = true } = {}) {
  const p = parts(iso);
  if (!p) return String(iso ?? '');
  return `${weekday ? `${DAYS[p.dow].slice(0, 3)} ` : ''}${p.d} ${MONTHS[p.mo - 1].slice(0, 3)}`;
}

/** Date/ISO string → 'Friday 16 October 2026, 09:00 SAST' (Cape Town time by default). */
export function formatDateTime(value, timeZone = site.timezone) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value ?? '');
  const fmt = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone });
  return `${fmt.format(d).replace(' at ', ', ')}${timeZone === 'Africa/Johannesburg' ? ' SAST' : ` (${timeZone})`}`;
}

export function partyLine(adults, children) {
  const a = Number(adults) || 0;
  const c = Number(children) || 0;
  const out = [];
  if (a) out.push(`${a} adult${a === 1 ? '' : 's'}`);
  if (c) out.push(`${c} child${c === 1 ? '' : 'ren'}`);
  return out.join(', ') || 'Not given';
}

/* ---------- HTML building blocks ---------- */

export const p = (html) => `<p style="margin:0 0 18px;font-family:${SANS};font-size:16px;line-height:1.65;color:${COLOURS.ink}">${html}</p>`;

export const h1 = (text) =>
  `<h1 style="margin:0 0 18px;font-family:${SERIF};font-weight:600;font-size:30px;line-height:1.15;color:${COLOURS.navy}">${escapeHtml(text)}</h1>`;

export const eyebrow = (text) =>
  `<p style="margin:0 0 10px;font-family:${SANS};font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:${COLOURS.goldInk}">${escapeHtml(text)}</p>`;

export function button(href, label) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 22px"><tr><td style="border-radius:999px;background:${COLOURS.gold};border:1px solid ${COLOURS.goldStroke}">
<a href="${escapeHtml(href)}" style="display:inline-block;padding:13px 24px;font-family:${SANS};font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px">${escapeHtml(label)}</a>
</td></tr></table>`;
}

/** Definition list as a two-column table. Rows with empty values are skipped. */
export function detailTable(rows) {
  const cells = rows
    .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== '')
    .map(
      ([k, v]) => `<tr>
<td valign="top" style="padding:9px 14px 9px 0;border-bottom:1px solid ${COLOURS.line};font-family:${SANS};font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${COLOURS.muted};white-space:nowrap">${escapeHtml(k)}</td>
<td valign="top" style="padding:9px 0;border-bottom:1px solid ${COLOURS.line};font-family:${SANS};font-size:15px;line-height:1.5;color:${COLOURS.ink}">${escapeHtml(v).replace(/\n/g, '<br>')}</td>
</tr>`,
    )
    .join('');
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 22px">${cells}</table>`;
}

export function quoteBlock(html) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 22px"><tr>
<td style="padding:16px 20px;background:${COLOURS.ivory};border-left:3px solid ${COLOURS.gold};font-family:${SANS};font-size:15px;line-height:1.65;color:${COLOURS.ink}">${html}</td>
</tr></table>`;
}

/** A highlighted box; used for the "not yet a confirmed booking" statement. */
export function notice(titleText, bodyText) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 22px"><tr>
<td style="padding:16px 20px;background:${COLOURS.noticeBg};border:1px solid ${COLOURS.noticeLine};border-radius:10px;font-family:${SANS};font-size:15px;line-height:1.6;color:${COLOURS.navy}">
<strong style="display:block;margin:0 0 4px">${escapeHtml(titleText)}</strong>${escapeHtml(bodyText)}</td>
</tr></table>`;
}

export function referenceBadge(reference) {
  return `<p style="margin:0 0 22px;font-family:${SANS};font-size:13px;color:${COLOURS.muted}">Reference&nbsp; <span style="font-family:${SANS};font-size:16px;font-weight:700;letter-spacing:0.08em;color:${COLOURS.navy}">${escapeHtml(reference)}</span></p>`;
}

/** The legal reference in the customer's acknowledgement and confirmation, linking the published terms. */
export const TERMS_SENTENCE = `Your booking is subject to the ${site.name} Terms & Conditions.`;
export const termsUrl = () => `${config.siteUrl}/terms/`;
export const termsLine = () =>
  p(`Your booking is subject to the ${escapeHtml(site.name)} <a href="${escapeHtml(termsUrl())}" style="color:${COLOURS.goldInk}">Terms &amp; Conditions</a>.`);
export const termsTextLine = () => `${TERMS_SENTENCE} ${termsUrl()}`;

/** Verified public contact lines for the footer (nothing unconfirmed is ever printed). */
function contactBits() {
  const c = site.contact;
  const out = [];
  if (c.email.verified) out.push({ text: c.email.address, href: `mailto:${c.email.address}` });
  if (c.phone.verified) out.push({ text: c.phone.display, href: `tel:${c.phone.e164}` });
  if (c.whatsapp.verified && (!c.phone.verified || c.whatsapp.e164 !== c.phone.e164)) out.push({ text: `WhatsApp ${c.whatsapp.display}`, href: `https://wa.me/${c.whatsapp.e164.replace(/\D/g, '')}` });
  return out;
}

/**
 * The shell. `preheader` is the hidden preview line inbox clients show.
 */
export function shell({ title, preheader = '', body, footerNote = '' }) {
  const origin = config.siteUrl;
  // The approved reversed logo as a PNG: email clients such as Gmail and Outlook do not render SVG.
  const logo = `${origin}/assets/brand/gt-logo-reversed-email.png`;
  const year = new Date().getFullYear();
  const contacts = contactBits()
    .map((c) => `<a href="${escapeHtml(c.href)}" style="color:${COLOURS.goldInk};text-decoration:none">${escapeHtml(c.text)}</a>`)
    .join(' · ');
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en-GB">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>${escapeHtml(title)}</title>
<!--[if mso]><style>table,td{font-family:Arial,sans-serif!important}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background:${COLOURS.ivory}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeHtml(preheader)}${'&nbsp;&zwnj;'.repeat(40)}</div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${COLOURS.ivory}">
<tr><td align="center" style="padding:28px 12px">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%">
  <tr><td style="background:${COLOURS.navy};border-radius:12px 12px 0 0;border-bottom:3px solid ${COLOURS.gold};padding:18px 28px">
    <a href="${escapeHtml(origin)}/" style="text-decoration:none">
      <img src="${escapeHtml(logo)}" width="240" height="64" alt="${escapeHtml(site.name)}" style="display:block;border:0;width:240px;height:64px;font-family:${SERIF};font-size:22px;font-weight:700;line-height:1.1;color:${COLOURS.goldText}">
    </a>
    <p style="margin:4px 0 0;font-family:${SANS};font-size:11px;font-weight:600;line-height:1.3;color:${COLOURS.goldStroke}">${escapeHtml(site.statement)}</p>
  </td></tr>
  <tr><td style="background:#ffffff;border:1px solid ${COLOURS.line};border-top:0;border-radius:0 0 12px 12px;padding:34px 32px 26px">
${body}
  </td></tr>
  <tr><td align="center" style="padding:24px 20px 0;font-family:${SANS};font-size:12px;line-height:1.7;color:${COLOURS.muted}">
    ${footerNote ? `<p style="margin:0 0 10px">${footerNote}</p>` : ''}
    <p style="margin:0">${escapeHtml(site.name)} · ${escapeHtml(site.descriptor)}${contacts ? `<br>${contacts}` : ''}<br><a href="${escapeHtml(origin)}/" style="color:${COLOURS.goldInk};text-decoration:none">${escapeHtml(origin.replace(/^https?:\/\//, ''))}</a></p>
    <p style="margin:10px 0 0">© ${year} ${escapeHtml(site.name)} · <a href="${escapeHtml(origin)}/privacy/" style="color:${COLOURS.muted}">Privacy</a></p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

/** Plain-text twin: body lines plus the same signature block. */
export function textShell(lines) {
  const origin = config.siteUrl;
  const contacts = contactBits().map((c) => c.text);
  return [...lines, '', '—', site.name, site.descriptor, ...(contacts.length ? [contacts.join(' · ')] : []), `${origin}/`].join('\n');
}
