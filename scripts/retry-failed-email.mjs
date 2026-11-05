#!/usr/bin/env node
/**
 * Replay emails that failed to send (e.g. during a Resend outage), and any
 * still `queued` after 10 minutes (a send that was cut off part-way).
 *
 *   node scripts/retry-failed-email.mjs            # retry up to 50 rows
 *   node scripts/retry-failed-email.mjs --limit 5
 *
 * Rows are re-rendered from email_log.payload, so the copy sent is whatever
 * the templates produce *now*. Rows that have failed five times are left alone.
 */
import { retryFailedEmails } from '../lib/email/send.mjs';
import { closeDb } from '../lib/db/index.mjs';

const args = process.argv.slice(2);
const limit = args.includes('--limit') ? Number(args[args.indexOf('--limit') + 1]) : 50;

const summary = await retryFailedEmails({ limit });
console.log(`considered ${summary.considered} · sent ${summary.sent} · still failed ${summary.failed}`);
await closeDb();
process.exitCode = summary.failed ? 1 : 0;
