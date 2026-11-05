/**
 * EmailProvider — the one interface every sender implements.
 *
 * @typedef {object} EmailMessage
 * @property {string|string[]} to
 * @property {string} subject
 * @property {string} html
 * @property {string} text
 * @property {string} [replyTo]
 * @property {Record<string,string>} [headers]
 *
 * @typedef {object} EmailProvider
 * @property {string} name
 * @property {(msg: EmailMessage) => Promise<{ id: string }>} send
 */
import { config } from '../config.mjs';

let provider;

/** Provider chosen by EMAIL_PROVIDER. Cached after first use. */
export async function getProvider() {
  if (provider) return provider;
  switch (config.email.provider) {
    case 'resend':
      provider = (await import('./resend.mjs')).createResendProvider();
      break;
    case 'file':
      provider = (await import('./file.mjs')).createFileProvider();
      break;
    default:
      throw new Error(`Unknown EMAIL_PROVIDER "${config.email.provider}"`);
  }
  return provider;
}

/** Test/scripts helper: swap in a custom provider (e.g. one that fails on purpose). */
export function setProvider(p) {
  provider = p;
}
