#!/usr/bin/env node
/**
 * Erase customers' personal information from the booking database: a
 * deletion request, or the retention periods. Lists what would go and changes
 * nothing unless --apply is given.
 *
 *   node scripts/erase-personal-data.mjs --reference GT-ABC234
 *   node scripts/erase-personal-data.mjs --email guest@example.com --apply
 *   node scripts/erase-personal-data.mjs --before 2025-11-01 --apply      # everything received and served before a date
 *   node scripts/erase-personal-data.mjs --retention                      # what the retention periods select now
 *   node scripts/erase-personal-data.mjs --retention --apply
 *   node scripts/erase-personal-data.mjs --retention --now 2027-01-01     # a rehearsal: what they would select then
 *
 * --retention (instead of --reference, --email or --before) applies the periods the privacy notice states
 * (site.legal.retention), exactly as lib/enquiries/erase.mjs sets them out:
 *   not converted   (never Confirmed) selected only when ALL of: its last activity (updated_at) is more than 1
 *                   calendar month ago; the date asked about, coalesce(return_slot_end, slot_end), has passed (or
 *                   there was none); and it holds no vehicle time. "We delete it one month after our last contact
 *                   about it, or once the date you asked about has passed, whichever is later."
 *   converted       (Confirmed now, or its history shows it was moved to Confirmed) selected 5 years after the end
 *                   of its trip, coalesce(return_slot_end, slot_end), or after updated_at when it has no slot.
 *   never           a request that still holds a vehicle, even with --include-active (which --retention ignores).
 * Each category is listed with masked addresses. Legal exceptions (a tax query, a dispute) are for a person to
 * decide, never the tool: read the list before adding --apply. --now (a Cape Town date, or a time with its offset)
 * moves the clock for a rehearsal; one later than the clock is refused with --apply, because it would erase
 * requests before their time.
 *
 * Add --include-active to erase a request that is still open (a trip to come, or flexible dates) by --reference,
 * --email or --before: it loses the booking and frees its vehicle. Needs DATABASE_URL (the production connection
 * string for production). Copies of the emails in Good Times' mailbox and in Resend's log are separate:
 * docs/enquiries/GO_LIVE_READINESS.md › F (privacy requests).
 */
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { findForErasure, eraseEnquiries, maskEmail, parseNow, retentionCutoffs } from '../lib/enquiries/erase.mjs';
import { closeDb } from '../lib/db/index.mjs';

const day = (v) => (v ? new Date(v).toISOString().slice(0, 10) : '');
const iso = (ms) => new Date(ms).toISOString();
const plural = (n, unit) => `${n} ${unit}${n === 1 ? '' : 's'}`;
const line = (r) => `${r.reference_number}  ${r.enquiry_type.padEnd(8)} ${r.status.padEnd(9)} received ${day(r.created_at)}  ${maskEmail(r.email)}${r.holds_vehicle ? '  (still open)' : ''}`;
const dueLine = (r) =>
  `  ${r.reference_number}  ${r.enquiry_type.padEnd(8)} ${r.status.padEnd(9)} received ${day(r.created_at)}  last activity ${day(r.updated_at)}  ${r.trip_end ? `trip ended ${day(r.trip_end)}` : 'no trip date'}  ${maskEmail(r.email)}`;

function erased(rows, references, log) {
  log(`Erased ${references.length}.`);
  const kept = rows.map((r) => r.reference_number).filter((ref) => !references.includes(ref));
  if (kept.length) log(`Kept ${kept.length} that changed after they were listed (reopened, or no longer due): ${kept.join(', ')}.`);
}

/** Run the tool with these arguments; resolves to the exit code. `clock` and the output functions are for tests. */
export async function main(args, { log = console.log, error = console.error, clock = Date.now } = {}) {
  const opt = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] ?? '' : undefined);
  const apply = args.includes('--apply');
  const selector = { reference: opt('--reference'), email: opt('--email'), before: opt('--before') };
  try {
    if (!args.includes('--retention')) {
      if (opt('--now') !== undefined) throw new Error('--now goes with --retention');
      const rows = await findForErasure(selector);
      for (const r of rows) log(line(r));
      if (!rows.length) log('Nothing matches.');
      else if (!apply) log(`${rows.length} would be erased. Nothing changed: add --apply to erase.`);
      else erased(rows, await eraseEnquiries(rows, { includeActive: args.includes('--include-active') }), log);
      return 0;
    }

    const now = opt('--now') === undefined ? clock() : parseNow(opt('--now'));
    if (apply && now > clock()) throw new Error('--now is later than the clock: that is a rehearsal only, and with --apply it would erase requests before their time. Drop --now or --apply.');
    const rows = await findForErasure({ ...selector, retention: true, now });
    const c = retentionCutoffs(now);
    const unconverted = rows.filter((r) => r.category === 'unconverted');
    const converted = rows.filter((r) => r.category === 'converted');
    log(`Retention as of ${iso(now)} (site.legal.retention): ${plural(c.unconvertedMonths, 'month')} for a request that did not become a booking, ${plural(c.convertedYears, 'year')} after the trip for a booking.`);
    log(`Not converted (never Confirmed), last activity before ${iso(c.unconvertedBefore)}, the date asked about passed, no vehicle held: ${unconverted.length}`);
    for (const r of unconverted) log(dueLine(r));
    log(`Converted (Confirmed), the trip (or, without one, the last activity) ended at or before ${iso(c.convertedUpTo)}: ${converted.length}`);
    for (const r of converted) log(dueLine(r));
    if (converted.length) log('  A person checks that none of these is needed for a tax query or a dispute before --apply: the tool cannot know.');
    if (args.includes('--include-active')) log('--include-active does not apply to --retention: a request that holds a vehicle is never erased by it.');
    if (!rows.length) log('Nothing is due.');
    else if (!apply) log(`${rows.length} would be erased. Nothing changed: add --apply to erase.`);
    else erased(rows, await eraseEnquiries(rows), log);
    return 0;
  } catch (err) {
    error(err.message);
    return 1;
  }
}

const invoked = (() => {
  try {
    return Boolean(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
})();

if (invoked) {
  try {
    process.exitCode = await main(process.argv.slice(2));
  } finally {
    await closeDb();
  }
}
