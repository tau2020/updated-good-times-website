/**
 * The current website's addresses and where each one lives on this site, written to site/_redirects
 * (Cloudflare Pages) as permanent redirects. They only matter once the domain is moved here (an owner
 * decision, docs/APPROVAL_REGISTER.md); on staging they are harmless.
 *
 * Only addresses recorded as sources (each offering's own page on goodtimesincapetown.co.za, read on
 * 5 Nov 2026) are listed, so nothing is guessed. The current site's full address list is to be checked
 * before the cutover, and any other page added here.
 */
import { tours } from './tours.mjs';
import { packages } from './packages.mjs';
import { services } from './transfers.mjs';

const pathOf = (url) => new URL(url).pathname;

/** [from, to] pairs, the most specific first (Pages applies the first match). */
export const redirects = [
  ...packages.map((p) => [pathOf(p.source.listing), `/packages/${p.slug}/`]),
  ...services.map((s) => [pathOf(s.source.listing), '/transfers/']),
  ...tours.map((t) => [pathOf(t.source.listing), `/tours/${t.slug}/`]),
  ['/tour/', '/tours/'],
].filter(([from, to]) => from !== to);

/** The _redirects file: each address with and without its trailing slash, as a 301. */
export function redirectsFile(list = redirects) {
  const lines = [];
  for (const [from, to] of list) {
    const bare = from.replace(/\/+$/, '');
    for (const f of new Set([from, bare].filter(Boolean))) lines.push(`${f} ${to} 301`);
  }
  return `# The current website's addresses → this site (src/data/redirects.mjs)\n${lines.join('\n')}\n`;
}
