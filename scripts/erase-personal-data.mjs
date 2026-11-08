#!/usr/bin/env node
/**
 * Erase customers' personal information from the booking database: a
 * deletion request, or the retention period Good Times decides on. Lists what would
 * go and changes nothing unless --apply is given.
 *
 *   node scripts/erase-personal-data.mjs --reference GT-ABC123
 *   node scripts/erase-personal-data.mjs --email guest@example.com --apply
 *   node scripts/erase-personal-data.mjs --before 2025-11-01 --apply      # the retention period
 *
 * Add --include-active to erase a request that is still open (a trip to come,
 * or flexible dates): it loses the booking and frees its vehicle. Needs
 * DATABASE_URL (the production connection string for production). Copies of
 * the emails in Good Times' mailbox and in Resend's log are separate:
 * docs/enquiries/GO_LIVE_READINESS.md › F (privacy requests).
 */
import { findForErasure, eraseEnquiries, maskEmail } from '../lib/enquiries/erase.mjs';
import { closeDb } from '../lib/db/index.mjs';

const args = process.argv.slice(2);
const opt = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] ?? '' : undefined);

try {
  const rows = await findForErasure({ reference: opt('--reference'), email: opt('--email'), before: opt('--before') });
  for (const r of rows) {
    const received = new Date(r.created_at).toISOString().slice(0, 10);
    console.log(`${r.reference_number}  ${r.enquiry_type.padEnd(8)} ${r.status.padEnd(9)} received ${received}  ${maskEmail(r.email)}${r.holds_vehicle ? '  (still open)' : ''}`);
  }
  if (!rows.length) console.log('Nothing matches.');
  else if (!args.includes('--apply')) console.log(`${rows.length} would be erased. Nothing changed: add --apply to erase.`);
  else console.log(`Erased ${(await eraseEnquiries(rows, { includeActive: args.includes('--include-active') })).length}.`);
} catch (err) {
  console.error(err.message);
  process.exitCode = 1;
} finally {
  await closeDb();
}
