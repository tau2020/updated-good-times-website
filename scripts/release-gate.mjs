#!/usr/bin/env node
/**
 * The release gate: what must be true before this site may be deployed to
 * production, from the facts in src/data/site.mjs. A production deployment
 * runs it first, before it touches the project's settings, so a draft privacy
 * notice or booking terms never reach the domain.
 *
 *   node scripts/release-gate.mjs     # exit 1 and list what is open
 *
 * It checks what the code can know. The owner's sign-offs on everything else
 * are in docs/APPROVAL_REGISTER.md.
 *
 * An owner's recorded override (site.legal.releaseOverride) lets a release
 * through with exactly the blockers it names, each printed as a warning; any
 * blocker it does not name still fails the job.
 */
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { OPEN_POINTS } from '../src/pages/terms.mjs';

/** Everything that still stands between `site` and a production release, in plain words. Empty when clear. */
export function releaseBlockers(site, { openTermsPoints = OPEN_POINTS } = {}) {
  const open = [];
  const { legal, contact } = site;
  if (!legal.privacyApproved) open.push('Good Times has not approved the privacy notice (site.legal.privacyApproved)');
  if (!legal.termsApproved) open.push('Good Times has not approved the booking terms (site.legal.termsApproved)');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(legal.effective || '')) open.push('the approved texts have no effective date (site.legal.effective)');
  // Each fact confirmed, and actually filled in: a `verified` flag on an empty value is not a confirmation.
  const facts = {
    entity: ['registered business name and number', (f) => f.name && f.registration],
    address: ['physical address', (f) => f.text],
    informationOfficer: ['Information Officer', (f) => f.name && f.email],
    retention: ['retention period', (f) => f.text],
  };
  for (const [key, [label, filled]] of Object.entries(facts)) {
    const f = legal[key] || {};
    if (!f.verified || !filled(f)) open.push(`the ${label} is not confirmed (site.legal.${key})`);
  }
  if (!contact.email.verified) open.push('no confirmed email address for customers and privacy requests (site.contact.email)');
  for (const point of openTermsPoints) open.push(`the booking terms do not yet cover ${point} (OPEN_POINTS, src/pages/terms.mjs)`);
  return open;
}

/**
 * The gate's verdict: every open blocker, those the owner's recorded override
 * accepts (matched by the key each message names in parentheses), and those
 * that remain. Clear only when nothing remains.
 */
export function releaseDecision(site, options) {
  const open = releaseBlockers(site, options);
  const o = site.legal.releaseOverride;
  const accepted = o && /^\d{4}-\d{2}-\d{2}$/.test(o.date || '') && Array.isArray(o.accepted) ? o.accepted : [];
  const covered = (m) => accepted.some((key) => m.includes(`(${key})`) || m.includes(`(${key},`));
  const overridden = open.filter(covered);
  const remaining = open.filter((m) => !covered(m));
  return { open, overridden, remaining, clear: remaining.length === 0, override: overridden.length ? o : null };
}

// Run as a script by any path, a symlink included: a gate that silently did nothing would let a release through.
const invoked = process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
if (invoked) {
  const { site } = await import('../src/data/site.mjs');
  const d = releaseDecision(site);
  if (!d.clear) {
    console.error(`Not ready for production:\n  - ${d.remaining.join('\n  - ')}\nSee docs/APPROVAL_REGISTER.md.`);
    process.exitCode = 1;
  } else if (d.override) {
    // GitHub shows ::warning:: lines as annotations on the run.
    for (const m of d.overridden) console.log(`::warning title=Released under the owner's override of ${d.override.date}::${m}`);
    console.log(`Release gate: passed under the owner's recorded override of ${d.override.date} (${d.overridden.length} accepted items open).`);
  } else {
    console.log('Release gate: clear.');
  }
}
