import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { OUTBOX, query, one, closeDb } from './helpers/env.mjs';
import { headerSafe, subjectSafe, safeReplyTo, escapeHtml, textToHtml } from '../lib/email/sanitise.mjs';
import { renderTemplate, TEMPLATE_NAMES as ALL_TEMPLATES } from '../lib/email/templates/index.mjs';

// Every template about one request (the staff sign-in email has its own test below).
const TEMPLATE_NAMES = ALL_TEMPLATES.filter((n) => n !== 'admin-sign-in');
import { sendTemplate, retryFailedEmails } from '../lib/email/send.mjs';
import { getProvider, setProvider } from '../lib/email/provider.mjs';
import { createResendProvider, ResendError } from '../lib/email/resend.mjs';
import { formatDate, formatDayDate, formatShortDate, partyLine, firstName } from '../lib/email/layout.mjs';
import { shortPlace, teamSubject, tourTitle } from '../lib/email/summary.mjs';
import { site } from '../src/data/site.mjs';

after(() => closeDb());

const base = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Amara Okafor',
  email: 'amara@example.com',
  phone: '+44 20 7946 0958',
  country: 'United Kingdom',
  status: 'NEW',
  created_at: '2026-10-16T09:00:00Z',
  page_url: 'http://test.local/enquire/',
};
const tourEnquiry = {
  ...base,
  reference_number: 'GT-TEST42',
  enquiry_type: 'tour',
  preferred_contact_method: 'email',
  tour_slug: 'cape-town-city-private-tour',
  preferred_date: '2026-11-12',
  dates_flexible: false,
  flexible_dates: '',
  adults: 2,
  children: 0,
  children_ages: '',
  pickup_area: 'Gardens',
  special_requirements: 'Slow pace.\n\nNo stairs <please> & thanks.',
};
const transferEnquiry = {
  ...base,
  reference_number: 'GT-TEST43',
  enquiry_type: 'transfer',
  preferred_contact_method: 'phone',
  transfer_type: 'airport-arrival',
  pickup_location: 'Cape Town International Airport',
  destination: 'Camps Bay',
  pickup_date_sast: '2026-10-17',
  pickup_time_sast: '14:30',
  return_trip: false,
  flight_number: 'SA 123',
  adults: 2,
  children: 1,
  child_seats: 'age 3',
  suitcases: 2,
  oversized_items: '',
  special_requirements: '',
};
const actions = { CONTACTED: 'http://test.local/a?token=1', CONFIRMED: 'http://test.local/c?token=3', CLOSED: 'http://test.local/b?token=2' };
const fixtures = [tourEnquiry, transferEnquiry, { ...tourEnquiry, tour_slug: 'custom', preferred_date: '', dates_flexible: true, flexible_dates: 'Any weekday in November' }];
const render = (name, enquiry) => renderTemplate(name, { enquiry, actions });

test('header sanitiser strips CR/LF and control characters; reply-to is strict', () => {
  assert.equal(headerSafe('Eve\r\nBcc: victim@example.com'), 'Eve Bcc: victim@example.com');
  assert.equal(subjectSafe('x'.repeat(400)).length, 150);
  assert.equal(safeReplyTo('amara@example.com'), 'amara@example.com');
  assert.equal(safeReplyTo('amara@example.com\r\nBcc: x@y.z'), null);
  assert.equal(safeReplyTo('"Amara" <amara@example.com>'), null);
  assert.equal(safeReplyTo(''), null);
  for (const bad of ['josé@example.com', 'a,b@x.com', 'a"b@x.co']) assert.equal(safeReplyTo(bad), null, bad);
  assert.equal(safeReplyTo('First.Last+tours@mail.example.co.uk'), 'First.Last+tours@mail.example.co.uk');
  assert.equal(escapeHtml('<b>&"\''), '&lt;b&gt;&amp;&quot;&#39;');
  assert.match(textToHtml('a\n\nb<c'), /<p[^>]*>a<\/p><p[^>]*>b&lt;c<\/p>/);
});

test('layout and summary helpers format dates, parties and places for humans', () => {
  assert.equal(formatDate('2026-11-12'), '12 November 2026');
  assert.equal(formatDayDate('2026-10-17'), 'Saturday 17 October 2026');
  assert.equal(formatShortDate('2026-10-17'), 'Sat 17 Oct');
  assert.equal(formatShortDate('2026-11-12', { weekday: false }), '12 Nov');
  assert.equal(partyLine(2, 1), '2 adults, 1 child');
  assert.equal(partyLine(1, 0), '1 adult');
  assert.equal(firstName('Amara Okafor'), 'Amara');
  assert.equal(firstName(''), 'there');
  assert.equal(firstName('Zoë-Anne Smith'), 'Zoë-Anne');
  assert.equal(firstName('www.cheap-pills.example Buy'), 'there', 'links are never echoed in a greeting');
  assert.equal(firstName('http://spam.example'), 'there');
  assert.equal(shortPlace('Cape Town International Airport (CPT)'), 'CPT airport');
  assert.equal(shortPlace('Camps Bay, Victoria Road'), 'Camps Bay');
  assert.equal(shortPlace('The Very Long Guesthouse Name In Constantia Valley'), 'The Very Long Guesthouse Na…');
  assert.equal(tourTitle('cape-town-city-private-tour', { short: true }), 'Cape Town City Private Tour');
  assert.equal(tourTitle('garden-route-private-tour', { short: true }), 'Garden Route Private Tour', 'a multi-day tour by its own title');
  assert.equal(tourTitle('custom', { short: true }), 'Custom day');
  assert.equal(teamSubject(transferEnquiry), 'Transfer GT-TEST43 · Sat 17 Oct 14:30 · CPT airport → Camps Bay · 3 pax');
  assert.equal(teamSubject(tourEnquiry), 'Tour GT-TEST42 · Cape Town City Private Tour · 12 Nov · 2 adults');
  assert.equal(teamSubject(fixtures[2]), 'Tour GT-TEST42 · Custom day · flexible dates · 2 adults');
});

test('every template renders a subject, Good Times-branded html and a plain-text part for both paths, with visitor input escaped', () => {
  for (const name of TEMPLATE_NAMES) {
    for (const e of fixtures) {
      const m = render(name, e);
      const label = `${name}/${e.enquiry_type}`;
      assert.ok(m.subject.length > 5, label);
      assert.doesNotMatch(m.subject, /[\r\n]/, label);
      assert.match(m.html, /<table/, label);
      assert.match(m.html, /Good Times in Cape Town/, label);
      assert.match(m.html, /background:#102e42/, `${label}: navy brand band`);
      assert.match(m.html, /gt-logo-reversed-email\.png/, `${label}: the Good Times logo`);
      assert.match(m.html, new RegExp(e.reference_number), label);
      assert.match(m.text, new RegExp(e.reference_number), label);
      assert.doesNotMatch(m.text, /<table|<\/p>/, `${label} text part contains html`);
      assert.doesNotMatch(m.html + m.text, /undefined|\[object Object\]|NaN/, label);
    }
  }
  const internal = render('new-enquiry-internal', tourEnquiry);
  assert.match(internal.html, /&lt;please&gt; &amp; thanks/);
  assert.doesNotMatch(internal.html, /<please>/);
  assert.match(internal.html, /Mark contacted/);
  assert.match(internal.html, /Mark confirmed/);
  assert.doesNotMatch(internal.html, /Mark quoted/, 'no link supplied → not rendered');
});

test('rendered emails carry no inherited identity, journey/consultation wording or response-time promises', () => {
  const banned = [/safari/i, /\bsoul\b/i, /SJ-/, /journey/i, /consultation/i, /one working day/i, /travel designer/i, /cal\.com/i];
  const former = [/\bJAP\b/, /jap[-_ ]?shuttles|japshuttlesandtours|shuttlejap/i, /best above the rest/i]; // brand-guard-allow: proves the template's earlier operator never appears
  banned.push(...former);
  for (const name of TEMPLATE_NAMES) {
    for (const e of fixtures) {
      const m = render(name, e);
      for (const re of banned) assert.doesNotMatch(`${m.subject}\n${m.html}\n${m.text}`, re, `${name}/${e.enquiry_type} matches ${re}`);
    }
  }
  // A transfer of another kind is named by its own label, and carries nothing from an old identity.
  const other = render('new-enquiry-internal', { ...transferEnquiry, transfer_type: 'other', flight_number: '' });
  assert.match(other.html, /Transfer: Something else/);
  for (const re of banned) assert.doesNotMatch(other.html + other.text, re);
});

test('the acknowledgement echoes no free text (unverified recipient); the team email keeps it', () => {
  const spammy = { ...transferEnquiry, oversized_items: 'Visit http://spam.example', child_seats: 'Buy now', special_requirements: 'Cheap pills http://spam.example', children: 1 };
  const visitor = render('enquiry-received', spammy);
  const team = render('new-enquiry-internal', spammy);
  assert.doesNotMatch(visitor.html + visitor.text, /spam\.example|Buy now|Cheap pills/);
  assert.match(team.text, /Cheap pills http:\/\/spam\.example/);
  assert.match(team.text, /Visit http:\/\/spam\.example/);
  assert.doesNotMatch(team.html + team.text, /wa\.me/, 'no personal details in WhatsApp URLs');
});

test('the acknowledgement says plainly that it is not a confirmed booking', () => {
  for (const e of fixtures) {
    const m = render('enquiry-received', e);
    assert.match(m.subject, /not yet confirmed/);
    assert.match(m.html, /This is not yet a confirmed booking\./);
    assert.match(m.text, /This is not yet a confirmed booking\./);
    assert.match(m.text, /Kind regards,\nGood Times in Cape Town/);
  }
});

test('the footer prints only verified contact details', () => {
  const m = render('enquiry-received', tourEnquiry);
  const c = site.contact;
  if (!c.email.verified) assert.ok(!m.html.includes(c.email.address) && !m.text.includes(c.email.address));
  if (!c.phone.verified) assert.ok(!m.html.includes(c.phone.display) && !m.text.includes(c.phone.display));
  assert.match(m.html, /http:\/\/test\.local\/privacy\//);
});

test('a header-injection attempt in the name cannot reach the subject', () => {
  const m = render('new-enquiry-internal', { ...transferEnquiry, name: 'Mallory\r\nBcc: victim@example.com', destination: 'Camps Bay\r\nBcc: x@y.z' });
  assert.doesNotMatch(m.subject, /[\r\n]/);
  const r = render('enquiry-received', { ...tourEnquiry, name: 'Mallory\r\nBcc: victim@example.com' });
  assert.doesNotMatch(r.subject, /[\r\n]/);
});

test('file provider writes a multipart .eml and sendTemplate logs it as sent', async () => {
  const provider = await getProvider();
  assert.equal(provider.name, 'file');
  await query(`INSERT INTO enquiries (id, reference_number, name, email, idempotency_key, dedupe_hash) VALUES ($1,$2,$3,$4,$5,$6)`, [
    tourEnquiry.id, tourEnquiry.reference_number, tourEnquiry.name, tourEnquiry.email, 'k-email-test-0000000000', 'h',
  ]);
  const r = await sendTemplate('enquiry-received', { enquiry: tourEnquiry }, { to: tourEnquiry.email, enquiryId: tourEnquiry.id, replyTo: 'team@test.invalid' });
  assert.equal(r.ok, true, r.error);
  const row = await one('SELECT status, provider_message_id, attempts FROM email_log WHERE id = $1', [r.logId]);
  assert.equal(row.status, 'sent');
  assert.equal(row.attempts, 1);
  assert.match(row.provider_message_id, /^file-/);
  const files = await readdir(OUTBOX);
  const eml = await readFile(join(OUTBOX, files.find((f) => f.startsWith(row.provider_message_id))), 'utf8');
  assert.match(eml, /Content-Type: multipart\/alternative/);
  assert.match(eml, /Content-Type: text\/plain/);
  assert.match(eml, /Content-Type: text\/html/);
  assert.match(eml, /Reply-To: team@test.invalid/);
  assert.match(eml, /Message-ID: <file-[^@]+@goodtimesincapetown\.local>/);
});

test('a provider failure is logged as failed, never thrown, and the retry script sends it later', async () => {
  let calls = 0;
  setProvider({
    name: 'flaky',
    async send() {
      calls++;
      if (calls === 1) throw new Error('Resend responded 500: boom');
      return { id: `retry-${calls}` };
    },
  });
  try {
    const r = await sendTemplate('new-enquiry-internal', { enquiry: tourEnquiry, actions }, { to: 'team@test.invalid', enquiryId: tourEnquiry.id, replyTo: 'not an email' });
    assert.equal(r.ok, false);
    let row = await one('SELECT status, error, attempts FROM email_log WHERE id = $1', [r.logId]);
    assert.equal(row.status, 'failed');
    assert.match(row.error, /500/);
    const summary = await retryFailedEmails({ log: () => {} });
    assert.equal(summary.considered, 1);
    assert.equal(summary.sent, 1);
    row = await one('SELECT status, provider_message_id, attempts FROM email_log WHERE id = $1', [r.logId]);
    assert.equal(row.status, 'sent');
    assert.equal(row.provider_message_id, 'retry-2');
    assert.equal((await retryFailedEmails({ log: () => {} })).considered, 0);
  } finally {
    setProvider(undefined);
  }
});

test('resend provider posts the expected payload and surfaces API errors (fetch is mocked; nothing is sent)', async () => {
  let captured;
  const ok = createResendProvider({
    fetchImpl: async (url, init) => {
      captured = { url, init, body: JSON.parse(init.body) };
      return new Response(JSON.stringify({ id: 're_123' }), { status: 200 });
    },
  });
  const r = await ok.send({ to: 'a@example.com', subject: 'Hi', html: '<p>x</p>', text: 'x', replyTo: 'b@example.com', headers: { 'X-Entity-Ref-ID': '1' } });
  assert.equal(r.id, 're_123');
  assert.equal(captured.url, 'https://api.resend.com/emails');
  assert.equal(captured.init.headers.Authorization, 'Bearer ');
  assert.deepEqual(captured.body.to, ['a@example.com']);
  assert.equal(captured.body.reply_to, 'b@example.com');
  assert.equal(captured.body.from, 'Good Times in Cape Town <enquiries@test.invalid>');
  const bad = createResendProvider({ fetchImpl: async () => new Response(JSON.stringify({ message: 'Invalid API key' }), { status: 401 }) });
  await assert.rejects(bad.send({ to: 'a@example.com', subject: 's', html: 'h', text: 't' }), (e) => e instanceof ResendError && e.status === 401 && /Invalid API key/.test(e.message));
});

test('the staff sign-in email carries the link, its expiry and nothing else', () => {
  const url = 'http://test.local/admin/sign-in/confirm?token=abc.def';
  const m = renderTemplate('admin-sign-in', { url, minutes: 20 });
  assert.match(m.subject, /sign-in link/);
  assert.ok(m.html.includes(url) && m.text.includes(url));
  assert.match(m.text, /expires in 20 minutes/);
  assert.doesNotMatch(m.html + m.text, /undefined|\[object Object\]|NaN/);
});

test('booking confirmed and cancelled emails name the booking and leave out free text', () => {
  for (const e of fixtures) {
    const ok = render('booking-confirmed', e);
    assert.match(ok.subject, new RegExp(`${e.reference_number} is confirmed`));
    const off = render('booking-cancelled', e);
    assert.match(off.subject, new RegExp(`${e.reference_number} has been cancelled`));
    for (const m of [ok, off]) assert.doesNotMatch(m.html + m.text, /&lt;please&gt;|<please>/, 'no visitor free text to an unverified address');
  }
});
