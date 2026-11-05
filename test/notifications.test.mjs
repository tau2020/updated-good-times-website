import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { OUTBOX, query, one, closeDb, post, validTour, validTransfer, key, decodeEml, emlSubject } from './helpers/env.mjs';
import { handle } from '../lib/http/app.mjs';
import { setProvider } from '../lib/email/provider.mjs';
import { retryFailedEmails, setSendTimeoutMs } from '../lib/email/send.mjs';
import { verifyAction } from '../lib/security/signing.mjs';
import { formatShortDate } from '../lib/email/layout.mjs';

after(() => closeDb());

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function submit(body) {
  const res = await handle(...post('/api/enquiries', body, { headers: { 'idempotency-key': key() } }));
  assert.equal(res.status, 201);
  const json = await res.json();
  const row = await one('SELECT id FROM enquiries WHERE reference_number = $1', [json.reference]);
  // The two emails are sent concurrently, so order by template (team first), not by time.
  const logs = (await query(`SELECT template, recipient, status, provider_message_id FROM email_log WHERE enquiry_id = $1 ORDER BY template DESC`, [row.id])).rows;
  const read = async (l) => readFile(join(OUTBOX, `${l.provider_message_id}.eml`), 'utf8');
  return { json, row, logs, read };
}

test('tour enquiry: team notification (reply-to visitor, scannable subject, 4 signed links incl. confirmed) and a not-confirmed acknowledgement', async () => {
  const body = { ...validTour(), email: 'tour-notify@example.com', name: 'Tess Tourist' };
  const { json, row, logs, read } = await submit(body);
  assert.equal(json.emailed, true);
  assert.deepEqual(
    logs.map((l) => [l.template, l.recipient, l.status]),
    [
      ['new-enquiry-internal', 'team@test.invalid', 'sent'],
      ['enquiry-received', 'tour-notify@example.com', 'sent'],
    ],
  );

  // Team email
  const internal = await read(logs[0]);
  assert.match(internal, /^Reply-To: tour-notify@example.com$/m);
  assert.match(internal, /^To: team@test.invalid$/m);
  assert.match(internal, /^From: Good Times in Cape Town <enquiries@test.invalid>$/m);
  const subject = emlSubject(internal);
  assert.equal(subject, `Tour ${json.reference} · Cape Peninsula Private Tour · ${formatShortDate(body.preferred_date, { weekday: false })} · 2 adults, 1 child`);
  const [iText, iHtml] = decodeEml(internal);
  for (const needle of ['Tess Tourist', 'tour-notify@example.com', '+44 20 7946 0958', 'United Kingdom', 'Cape Peninsula Private Tour', 'Hotel in Sea Point', '2 adults, 1 child', 'children’s ages: 6', 'A relaxed pace, please.', json.reference, 'Not yet confirmed']) {
    assert.match(iHtml, new RegExp(esc(needle)), `internal html missing ${needle}`);
    assert.match(iText, new RegExp(esc(needle)), `internal text missing ${needle}`);
  }
  const links = [...iHtml.matchAll(/href="(http:\/\/test\.local\/api\/enquiries\/[^"]+\/status\?token=[^"]+)"/g)].map((m) => m[1]);
  assert.equal(links.length, 4);
  const statuses = links.map((link) => {
    const u = new URL(link.replace(/&amp;/g, '&'));
    const v = verifyAction(u.searchParams.get('token'));
    assert.equal(v.ok, true);
    assert.equal(v.enquiryId, row.id);
    return v.status;
  });
  assert.deepEqual(statuses, ['CONTACTED', 'QUOTED', 'CONFIRMED', 'CLOSED']);
  for (const label of ['Mark contacted', 'Mark quoted', 'Mark confirmed', 'Close<']) assert.match(iHtml, new RegExp(label));
  assert.match(iHtml, /only after you have confirmed the booking with the customer/);

  // Visitor acknowledgement
  const customer = await read(logs[1]);
  assert.match(customer, /^Reply-To: reply@test.invalid$/m);
  assert.match(emlSubject(customer), new RegExp(`^Your Good Times tour enquiry ${json.reference}: received, not yet confirmed$`));
  const [cText, cHtml] = decodeEml(customer);
  for (const part of [cText, cHtml]) {
    assert.match(part, /This is not yet a confirmed booking\./);
    assert.match(part, new RegExp(json.reference));
    assert.match(part, /We will reply to confirm availability and a quote/);
    assert.match(part, /Good Times in Cape Town/);
    assert.doesNotMatch(part, /within|working day|24 hours|guarantee/i, 'no response-time promises');
  }
  assert.match(cHtml, /assets\/brand\/gt-logo-reversed-email\.png/);
  assert.doesNotMatch(cHtml + cText, /automated/i);
});

test('transfer request: subject reads like "Transfer GT-… · Sat 17 Oct 14:30 · CPT airport → Camps Bay · 3 pax"', async () => {
  const body = { ...validTransfer(), email: 'transfer-notify@example.com', name: 'Tom Traveller' };
  const { json, logs, read } = await submit(body);
  const internal = await read(logs[0]);
  assert.equal(emlSubject(internal), `Transfer ${json.reference} · ${formatShortDate(body.transfer_date)} 14:30 · CPT airport → Camps Bay · 3 pax · + return`);
  assert.match(emlSubject(internal), /^Transfer GT-[A-Z2-9]{6} · (Mon|Tue|Wed|Thu|Fri|Sat|Sun) \d{1,2} [A-Z][a-z]{2} 14:30 · CPT airport → Camps Bay · 3 pax/);
  const [iText, iHtml] = decodeEml(internal);
  for (const needle of ['Airport arrival', 'Cape Town International Airport (CPT)', 'Camps Bay, Victoria Road', '14:30 SAST', 'BA 59', '3 suitcases; 1 golf bag', 'age 4', '09:00 SAST', 'Please wait at arrivals.', 'WhatsApp']) {
    assert.match(iHtml, new RegExp(esc(needle)), `internal html missing ${needle}`);
    assert.match(iText, new RegExp(esc(needle)), `internal text missing ${needle}`);
  }
  // No personal details in WhatsApp URLs: the visitor's number is plain text only.
  assert.doesNotMatch(iHtml + iText, /wa\.me/);
  assert.match(iText, /^Phone: \+44 20 7946 0958$/m);
  assert.match(iText, /^Reply by: WhatsApp$/m);

  const customer = await read(logs[1]);
  assert.match(emlSubject(customer), /^Your Good Times transfer request GT-[A-Z2-9]{6}: received, not yet confirmed$/);
  const [cText, cHtml] = decodeEml(customer);
  assert.match(cText, /This is not yet a confirmed booking\./);
  assert.match(cText, /You asked to be contacted on WhatsApp at \+44 20 7946 0958/);
  assert.match(cText, /Flight: BA 59/);
  // The acknowledgement goes to an unverified address: no free text is echoed back.
  for (const freeText of ['Please wait at arrivals.', '1 golf bag', 'age 4']) {
    assert.ok(!cText.includes(freeText) && !cHtml.includes(freeText), `visitor email echoes "${freeText}"`);
    assert.ok(iText.includes(freeText), `team email keeps "${freeText}"`);
  }
  assert.match(cText, /Luggage: 3 suitcases$/m);
  assert.match(cText, /Destination: Camps Bay, Victoria Road/);
});

test('tour acknowledgement leaves out special requests, flexible-dates text and ages; the team email keeps them', async () => {
  const { logs, read } = await submit({ ...validTour(), email: 'tour-free-text@example.com', preferred_date: '', dates_flexible: true, flexible_dates: 'Visit http://spam.example now', special_requests: 'Cheap pills at http://spam.example' });
  const [iText] = decodeEml(await read(logs[0]));
  const [cText, cHtml] = decodeEml(await read(logs[1]));
  assert.match(iText, /Cheap pills at http:\/\/spam\.example/);
  assert.match(iText, /Flexible: Visit http:\/\/spam\.example now/);
  assert.match(iText, /children’s ages: 6/);
  assert.doesNotMatch(cText + cHtml, /spam\.example|Cheap pills|children’s ages/);
  assert.match(cText, /Date: Flexible$/m);
  assert.match(cText, /Group: 2 adults, 1 child$/m);
});

test('provider outage: the enquiry is still stored (201, emailed:false), rows logged failed, retry sends them', async () => {
  setProvider({
    name: 'down',
    async send() {
      throw new Error('Resend responded 500: Internal Server Error');
    },
  });
  let json;
  try {
    const res = await handle(...post('/api/enquiries', { ...validTour(), email: 'outage@example.com' }, { headers: { 'idempotency-key': key() } }));
    assert.equal(res.status, 201);
    json = await res.json();
  } finally {
    setProvider(undefined);
  }
  assert.equal(json.emailed, false);
  assert.match(json.reference, /^GT-/);
  const row = await one('SELECT id, status FROM enquiries WHERE reference_number = $1', [json.reference]);
  assert.equal(row.status, 'NEW');
  const failed = (await query(`SELECT status, error, attempts FROM email_log WHERE enquiry_id = $1`, [row.id])).rows;
  assert.equal(failed.length, 2);
  for (const f of failed) {
    assert.equal(f.status, 'failed');
    assert.match(f.error, /500/);
  }
  const summary = await retryFailedEmails({ log: () => {} });
  assert.equal(summary.sent, 2);
  const after_ = (await query(`SELECT status, attempts, provider_message_id FROM email_log WHERE enquiry_id = $1`, [row.id])).rows;
  for (const f of after_) {
    assert.equal(f.status, 'sent');
    assert.equal(f.attempts, 2);
    assert.match(f.provider_message_id, /^file-/);
  }
});

test('one email rule: what the form accepts is exactly what can be a reply-to address', async () => {
  // Addresses the strict reply-to check would refuse are refused by the form and API up front, with a friendly message.
  for (const email of ['josé@example.com', 'a,b@x.com', 'a"b@x.co', "o'brien@example.com", 'a..b@example.com']) {
    const res = await handle(...post('/api/enquiries', { ...validTour(), email }, { headers: { 'idempotency-key': key() } }));
    assert.equal(res.status, 400, email);
    assert.match((await res.json()).errors.email, /letters without accents/, email);
  }
  // A valid address round-trips to Reply-To unchanged.
  const { logs, read } = await submit({ ...validTour(), email: 'First.Last+tours@mail.example.co.uk' });
  assert.match(await read(logs[0]), /^Reply-To: First\.Last\+tours@mail\.example\.co\.uk$/m);
});

test('without notes, the team email leaves out the empty notes block', async () => {
  const { logs, read } = await submit({ ...validTransfer(), email: 'nonote@example.com', notes: '', return_trip: false });
  const [text, html] = decodeEml(await read(logs[0]));
  assert.doesNotMatch(html, />Notes</);
  assert.doesNotMatch(text, /^Notes:/m);
  assert.match(text, /Return: No return transfer/);
  assert.doesNotMatch(emlSubject(await read(logs[0])), /return/);
});

test('team and visitor emails are sent at the same time, so a slow provider costs one wait, not two', async () => {
  const starts = [];
  setProvider({
    name: 'slow',
    async send({ to }) {
      starts.push({ to, at: Date.now() });
      await new Promise((ok) => setTimeout(ok, 300));
      return { id: `slow-${to}` };
    },
  });
  try {
    const t0 = Date.now();
    const res = await handle(...post('/api/enquiries', { ...validTour(), email: 'slow@example.com' }, { headers: { 'idempotency-key': key() } }));
    const took = Date.now() - t0;
    assert.equal(res.status, 201);
    assert.equal(starts.length, 2);
    assert.ok(Math.abs(starts[0].at - starts[1].at) < 150, 'both sends started together');
    assert.ok(took < 550, `took ${took} ms (in series it would be over 600)`);
  } finally {
    setProvider(undefined);
  }
});

test('a hanging provider for the visitor email still yields the team email and a 201 within the time budget', async () => {
  setSendTimeoutMs(400);
  setProvider({
    name: 'half-hung',
    send: ({ to }) => (to === 'team@test.invalid' ? Promise.resolve({ id: 'team-ok' }) : new Promise(() => {})),
  });
  let res;
  let took;
  try {
    const t0 = Date.now();
    res = await handle(...post('/api/enquiries', { ...validTransfer(), email: 'hung@example.com' }, { headers: { 'idempotency-key': key() } }));
    took = Date.now() - t0;
  } finally {
    setProvider(undefined);
    setSendTimeoutMs(12_000);
  }
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.emailed, false);
  assert.ok(took < 1500, `responded in ${took} ms`);
  const row = await one('SELECT id FROM enquiries WHERE reference_number = $1', [body.reference]);
  const logs = (await query(`SELECT template, status, error FROM email_log WHERE enquiry_id = $1 ORDER BY template`, [row.id])).rows;
  assert.deepEqual(logs.map((l) => [l.template, l.status]), [['enquiry-received', 'failed'], ['new-enquiry-internal', 'sent']]);
  assert.match(logs[0].error, /timed out/);
});

test('the retry job also picks up emails left "queued" for over 10 minutes (a send that was cut off), not fresh ones', async () => {
  const res = await handle(...post('/api/enquiries', { ...validTour(), email: 'stale@example.com' }, { headers: { 'idempotency-key': key() } }));
  const { reference } = await res.json();
  const row = await one('SELECT id FROM enquiries WHERE reference_number = $1', [reference]);
  const logs = (await query(`SELECT id FROM email_log WHERE enquiry_id = $1 ORDER BY template`, [row.id])).rows;
  // Simulate one send cut off 11 minutes ago and one still in flight.
  await query(`UPDATE email_log SET status = 'queued', provider_message_id = NULL, attempts = 0, updated_at = now() - interval '11 minutes' WHERE id = $1`, [logs[0].id]);
  await query(`UPDATE email_log SET status = 'queued', provider_message_id = NULL, attempts = 0, updated_at = now() WHERE id = $1`, [logs[1].id]);
  // (Other rows left failed by earlier tests in this file are retried too; only these two matter here.)
  const summary = await retryFailedEmails({ log: () => {} });
  assert.ok(summary.sent >= 1);
  assert.equal((await one('SELECT status FROM email_log WHERE id = $1', [logs[0].id])).status, 'sent');
  assert.equal((await one('SELECT status FROM email_log WHERE id = $1', [logs[1].id])).status, 'queued');
});
