/**
 * The staff dashboard sign-in link. Sent only to addresses in ADMIN_EMAILS;
 * the link opens a page whose button signs in (so mail scanners that open
 * links cannot use it), works once, and expires.
 *
 * @param {{ url: string, minutes: number }} props
 */
import { shell, textShell, h1, eyebrow, p, button } from '../layout.mjs';

export function render({ url, minutes }) {
  const subject = 'Your Good Times bookings dashboard sign-in link';
  const note = `The link works once and expires in ${minutes} minutes. If you did not ask for it, ignore this email: nobody can sign in without it.`;
  const body = [eyebrow('Bookings dashboard'), h1('Sign in'), p('Press the button to sign in to the Good Times bookings dashboard.'), button(url, 'Sign in to the dashboard'), p(note)].join('\n');
  const html = shell({ title: subject, preheader: 'Your sign-in link for the Good Times bookings dashboard.', body, footerNote: 'Sent because someone asked to sign in with this address.' });
  const text = textShell(['Sign in to the Good Times bookings dashboard:', url, '', note]);
  return { subject, html, text };
}
