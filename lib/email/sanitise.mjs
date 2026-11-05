/**
 * Everything a visitor typed is hostile until it has been through here.
 *
 * - Nothing from a visitor ever becomes `from`.
 * - Subjects and header values lose CR, LF and control characters so a
 *   name like "Eve\r\nBcc: victim@…" cannot inject a header.
 * - A visitor's email is used as reply-to only when it passes the strict
 *   check; otherwise the configured REPLY_TO_EMAIL is used. The check is the
 *   very rule the form and the API validate with (isValidEmail from the
 *   shared schema), so every accepted address is usable as reply-to.
 */
import { isValidEmail } from '../enquiries/schema.mjs';

/** Single-line, control-free, length-capped. Safe in a subject or any header value. */
export function headerSafe(value, max = 200) {
  return (
    String(value ?? '')
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u001F\u007F\u2028\u2029]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, max)
  );
}

export function subjectSafe(value) {
  return headerSafe(value, 150);
}

/** Returns the address if it is strictly valid, else null. Never throws. */
export function safeReplyTo(email) {
  const raw = String(email ?? '');
  // Any control character means a header-injection attempt: refuse rather than clean it up.
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001F\u007F]/.test(raw)) return null;
  const s = headerSafe(raw, 200);
  return isValidEmail(s) ? s : null;
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Multi-line visitor text → HTML paragraphs with line breaks, fully escaped. */
export function textToHtml(value) {
  return String(value ?? '')
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 1em">${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('');
}
