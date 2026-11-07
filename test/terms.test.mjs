/**
 * The Terms & Conditions: Good Times' own published text
 * (test/fixtures/terms-source.md, from goodtimesincapetown.co.za/terms/),
 * reproduced block for block with only the adaptations listed below (this
 * website has no "My Bookings" or "Safety & Trust" page), plus nothing but what
 * the page states from site data (the draft notice while unapproved, the
 * effective date once set, the confirmed legal facts). The booking wizard asks
 * for acceptance with an unticked box; the API refuses a request without it and
 * records the version accepted, with the server's time, in the request's
 * history; the customer's acknowledgement and confirmation emails name the
 * terms and link them.
 */
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { one, query, closeDb, post, validTour, validTransfer, key } from './helpers/env.mjs';
import { site } from '../src/data/site.mjs';
import { layout } from '../src/partials/layout.mjs';
import { termsPage, TERMS, OPEN_POINTS, termsPublished } from '../src/pages/terms.mjs';
import { page as enquirePage } from '../src/pages/enquire.mjs';
import { validateEnquiry, FIELDS } from '../lib/enquiries/schema.mjs';
import { handle } from '../lib/http/app.mjs';
import { getEnquiryByReference, termsAcceptance } from '../lib/enquiries/store.mjs';
import { renderTemplate } from '../lib/email/templates/index.mjs';

after(() => closeDb());

const production = { ...site, preview: false, env: 'production' };
/** The same site once Good Times has approved the terms. */
const approvedTerms = (x) => ({ ...x, legal: { ...x.legal, termsApproved: true } });
const decode = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
const squash = (s) => s.replace(/\s+/g, ' ').trim();
// Typography only: the site sets apostrophes as ’, the source as '.
const norm = (s) => squash(s).replace(/'/g, '’');

/** The published text as blocks in reading order: headings, paragraphs, list points; markdown marks and the source note removed. */
const source = readFileSync(new URL('./fixtures/terms-source.md', import.meta.url), 'utf8')
  .replace(/<!--[\s\S]*?-->\s*/g, '')
  .split(/\n{2,}|\n(?=- |#)/)
  .flatMap((b) => b.split('\n'))
  .map((l) => norm(l.replace(/^#+\s*/, '').replace(/^- /, '').replace(/\*\*/g, '')))
  .filter(Boolean);

/**
 * Where this website's text differs from the published one, and why (docs/APPROVAL_REGISTER.md):
 * the site has no "My Bookings" page and no "Safety & Trust" page to point to, and the closing line
 * names hello@, which replaced info@ as Good Times' address on 6 Nov 2026 (the page reads it from site data).
 */
const ADAPTATIONS = [
  ['contact us as soon as possible — either through your My Bookings page or directly by phone or email.', 'contact us as soon as possible, directly by phone or email.'],
  ['keep guests safe (see our Safety & Trust page).', 'keep guests safe.'],
  ['info@goodtimesincapetown.co.za', 'hello@goodtimesincapetown.co.za'],
];
const adapted = source.map((b) => ADAPTATIONS.reduce((t, [from, to]) => t.replace(from, to), b));

/** What the page states from site data rather than from the text: the confirmed legal facts, after the introduction. */
function factsBlock(x) {
  const { entity, address } = x.legal;
  if (!entity.verified && !address.verified) return null;
  const who = entity.verified ? `${x.name} is the trading name of ${entity.name}${entity.registration ? `, registration number ${entity.registration}` : ''}${entity.directors ? `; directors: ${entity.directors}` : ''}.` : '';
  return norm(`${who} ${address.verified ? `Address: ${address.text}.` : ''}`);
}
/** The blocks the page must have for `x`: the adapted text, with the confirmed facts after the introduction. */
function expected(x) {
  const facts = factsBlock(x);
  return facts ? [...adapted.slice(0, 2), facts, ...adapted.slice(2)] : adapted;
}

/**
 * The page's blocks in reading order: h1, h2, paragraphs and list points. Left out: the breadcrumb, the
 * eyebrow (the site's name, above every page title), the draft notice and the effective date, which
 * have their own assertions.
 */
function pageBlocks(x) {
  const html = termsPage
    .body({ site: x })
    .replace(/<nav class="breadcrumb"[\s\S]*?<\/nav>/, '')
    .replace(/<p class="eyebrow">[\s\S]*?<\/p>/, '')
    .replace(/<p class="notice notice--warning">[\s\S]*?<\/p>/, '')
    .replace(/<p class="small muted">Effective [^<]*<\/p>/, '');
  return [...html.matchAll(/<(h1|h2|p|li)\b[^>]*>([\s\S]*?)<\/\1>/g)].map((m) => norm(decode(m[2].replace(/<[^>]+>/g, ''))));
}
/** The page's text blocks alone (the confirmed facts left out): what must match the published text. */
const textBlocks = (x) => pageBlocks(x).filter((b) => b !== factsBlock(x));

test('the page reproduces Good Times’ published Terms & Conditions block for block, with only the listed adaptations', () => {
  assert.equal(source.length, 19, 'the source parses into its 19 blocks');
  for (const [from] of ADAPTATIONS) assert.equal(source.filter((b) => b.includes(from)).length, 1, `the source says "${from}" once`);
  for (const x of [site, production, approvedTerms(production)]) {
    assert.deepEqual(pageBlocks(x), expected(x));
    assert.doesNotMatch(pageBlocks(x).join(' '), /My Bookings|Safety & Trust/, 'no link to a page this site does not have');
  }
  // The only fact stated from site data today: the published office, after the introduction.
  assert.equal(factsBlock(site), 'Address: 277 Main Road, Adelphi Centre, Sea Point, Cape Town, 8005.');
});

test('until Good Times approves the text, the page says it is a draft and names what is still open; then it does not', () => {
  for (const x of [site, production]) {
    const html = termsPage.body({ site: x });
    assert.equal(/<p class="notice notice--warning">/.test(html), !x.legal.termsApproved);
    if (!x.legal.termsApproved) {
      assert.match(html, /Draft for Good Times’ approval\./);
      assert.ok(OPEN_POINTS.length > 0 && html.includes(`Still to confirm: ${OPEN_POINTS.join('; ')}`), 'every open point is named');
    }
  }
  assert.doesNotMatch(termsPage.body({ site: approvedTerms(production) }), /notice--warning|Draft for Good Times/);
  const dated = { ...approvedTerms(production), legal: { ...approvedTerms(production).legal, effective: '2026-12-01' } };
  assert.match(termsPage.body({ site: dated }), /<p class="small muted">Effective 2026-12-01\.<\/p>/);
  assert.deepEqual(pageBlocks(dated), expected(dated), 'the effective date is the only addition');
});

test('all seven numbered sections, with anchors, in the published order', () => {
  const html = termsPage.body({ site: production });
  const h2 = [...html.matchAll(/<h2 id="([^"]+)">([^<]+)<\/h2>/g)].map((m) => [m[1], decode(m[2])]);
  assert.deepEqual(h2, [
    ['bookings', '1. Bookings'],
    ['pricing', '2. Pricing & payment'],
    ['cancellations', '3. Cancellations & changes'],
    ['on-tour', '4. On tour'],
    ['photography', '5. Photography'],
    ['liability', '6. Liability'],
    ['governing-law', '7. Governing law'],
  ]);
  const published = readFileSync(new URL('./fixtures/terms-source.md', import.meta.url), 'utf8').match(/^## .+$/gm).map((l) => l.slice(3));
  assert.deepEqual(h2.map(([, t]) => t), published, 'the headings are the published ones');
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  assert.doesNotMatch(html, /<h3\b/, 'no heading level skipped');
});

test('every figure in the source, and no other, appears on the page', () => {
  const figures = (t) => [...t.matchAll(/\d+%?/g)].map((m) => m[0]);
  const text = textBlocks(production).join(' ');
  assert.deepEqual(figures(text), figures(source.join(' ')));
  for (const f of ['South African Rand (ZAR)', 'the amount actually charged is always in ZAR', 'an alternative date or a full refund', 'end a tour early, without refund', 'the laws of South Africa', 'the jurisdiction of the South African courts', 'hello@goodtimesincapetown.co.za', '+27 72 376 8432']) {
    assert.ok(text.includes(f), f);
  }
  // No commercial term the published text does not give: no deposit, percentage or notice period is invented.
  assert.doesNotMatch(text, /deposit|\d+%|\d+ (hours|days)/i);
});

test('a change to the text needs a new version: the recorded version names exactly this text', () => {
  const hash = createHash('sha256').update(JSON.stringify(TERMS)).digest('hex').slice(0, 16);
  // When the text changes on purpose: set a new site.legal.termsVersion, then record its hash here.
  const VERSIONS = { '2026-11-05': '9656def551858c88' };
  assert.equal(VERSIONS[site.legal.termsVersion], hash, `the text's hash is ${hash}`);
  assert.equal(termsAcceptance(), `Accepted the Terms & Conditions, version ${site.legal.termsVersion}`);
});

test('the page: at the /terms/ route, indexable once approved, titled Terms & Conditions', () => {
  assert.equal(termsPage.path, 'terms/index.html');
  assert.equal(termsPage.noindex, !site.legal.termsApproved);
  const html = layout(termsPage, production);
  assert.match(html, /<title>Terms &amp; Conditions \| Good Times<\/title>/);
  assert.match(html, /<li aria-current="page">Terms &amp; Conditions<\/li>/);
});

test('wherever the terms page is built, every footer has one Terms & Conditions link; without it, none; Privacy always', async () => {
  const dir = new URL('../src/pages/', import.meta.url);
  const pages = [];
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.mjs')).sort()) {
    const mod = await import(new URL(f, dir));
    pages.push(...(Array.isArray(mod.pages) ? mod.pages : [mod.page]).filter(Boolean));
  }
  // A preview build has the page; so does production once the terms are approved, or under the owner's release override
  // that accepts them as a draft (7 Nov 2026). An unapproved production build without that override has none.
  const locked = { ...production, legal: { ...production.legal, releaseOverride: null } };
  for (const [x, links] of [[{ ...site, preview: true }, 1], [approvedTerms(production), 1], [production, termsPublished(production) ? 1 : 0], [locked, 0]]) {
    for (const p of pages) {
      const html = layout(p, x);
      const footer = html.slice(html.indexOf('<footer'), html.indexOf('</footer>'));
      assert.equal((footer.match(/<a href="(?:\.\.\/)*terms\/">Terms &amp; Conditions<\/a>/g) || []).length, links, `${p.path}: ${links} terms link`);
      assert.equal((footer.match(/href="(?:\.\.\/)*terms\//g) || []).length, links, `${p.path}: no other terms link in the footer`);
      assert.match(footer, /<a href="(?:\.\.\/)*privacy\/">Privacy<\/a>/, `${p.path}: Privacy kept`);
      assert.doesNotMatch(html, /Booking terms/, `${p.path}: the old name`);
    }
  }
});

test('the booking wizard: an unticked, required box that links the terms in a new tab, apart from the reply consent', () => {
  const html = enquirePage.body({ site });
  const box = html.match(/<div class="field field--check[^"]*">\s*<div class="check">\s*<input type="checkbox" id="enq-terms"[^>]*>\s*<label for="enq-terms">([\s\S]*?)<\/label>/);
  assert.ok(box, 'the terms checkbox');
  const input = html.match(/<input type="checkbox" id="enq-terms"[^>]*>/)[0];
  assert.match(input, /name="terms"/);
  assert.match(input, /aria-required="true"/);
  assert.doesNotMatch(input, /\bchecked\b/, 'never ticked in advance');
  assert.equal(squash(decode(box[1].replace(/<span class="visually-hidden">[^<]*<\/span>/, '').replace(/<[^>]+>/g, ''))), 'I have read and agree to the Terms & Conditions.');
  assert.match(box[1], /<a href="terms\/" target="_blank" rel="noopener">Terms &amp; Conditions<span class="visually-hidden"> \(opens in a new tab\)<\/span><\/a>/);
  assert.match(html, /id="enq-terms-error"/, 'its own error slot');
  // The reply consent is still its own box, in the same step, before the terms.
  assert.ok(html.indexOf('id="enq-consent"') > 0 && html.indexOf('id="enq-consent"') < html.indexOf('id="enq-terms"'));
});

test('the schema: acceptance is required on its own, with a concise message, in the contact step', () => {
  assert.equal(FIELDS.terms.required, true);
  const base = { ...validTour() };
  assert.equal(validateEnquiry(base).ok, true);
  const without = validateEnquiry({ ...base, terms: false });
  assert.deepEqual(Object.keys(without.errors), ['terms']);
  assert.equal(without.errors.terms, 'Tick the box to agree to the Terms & Conditions.');
  assert.ok(validateEnquiry({ ...base, terms: undefined }).errors.terms);
  assert.deepEqual(Object.keys(validateEnquiry({ ...base, consent: false }).errors), ['consent'], 'the reply consent stays separate');
  assert.ok(validateEnquiry({ ...base, terms: false }, { section: 'contact' }).errors.terms);
  assert.equal(validateEnquiry({ ...base, terms: false }, { section: 'tour' }).errors.terms, undefined, 'asked only in the contact step');
});

const send = async (body) => {
  const res = await handle(...post('/api/enquiries', body, { headers: { 'idempotency-key': key() } }));
  return { status: res.status, body: await res.json() };
};

test('the API refuses a request without acceptance, and stores nothing', async () => {
  const before = (await one('SELECT count(*)::int AS n FROM enquiries')).n;
  for (const terms of [false, undefined, '']) {
    const r = await send({ ...validTour(), email: 'no-terms@example.com', terms });
    assert.equal(r.status, 400, String(terms));
    assert.equal(r.body.errors.terms, 'Tick the box to agree to the Terms & Conditions.');
  }
  assert.equal((await one('SELECT count(*)::int AS n FROM enquiries')).n, before);
});

test('an accepted request records the version, the server’s time and the request in its history', async () => {
  for (const [body, email] of [
    [validTour(), 'terms-tour@example.com'],
    [validTransfer(), 'terms-transfer@example.com'],
  ]) {
    const t0 = Date.now();
    // A time sent by the browser is not used: the server's clock is the record.
    const r = await send({ ...body, email, terms: 'yes', terms_accepted_at: '2000-01-01T00:00:00Z' });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    const row = await getEnquiryByReference(r.body.reference);
    const events = (await query("SELECT at, actor, detail FROM enquiry_events WHERE enquiry_id = $1 AND kind = 'terms'", [row.id])).rows;
    assert.equal(events.length, 1);
    assert.equal(events[0].detail, `Accepted the Terms & Conditions, version ${site.legal.termsVersion}`);
    assert.equal(events[0].actor, 'customer');
    const at = new Date(events[0].at).getTime();
    assert.ok(at >= t0 - 5000 && at <= Date.now() + 5000, 'the server’s time');
    assert.equal(row.reference_number, r.body.reference);
  }
});

test('the customer’s acknowledgement and confirmation name the terms and link them; the other emails do not', () => {
  const e = {
    id: '22222222-2222-4222-8222-222222222222',
    reference_number: 'GT-TERMS1',
    enquiry_type: 'tour',
    status: 'NEW',
    name: 'Amara Okafor',
    email: 'amara@example.com',
    phone: '',
    country: '',
    preferred_contact_method: 'email',
    tour_slug: 'cape-town-city-private-tour',
    preferred_date: '2026-11-12',
    adults: 2,
    children: 0,
    created_at: '2026-10-28T09:00:00Z',
  };
  const sentence = 'Your booking is subject to the Good Times in Cape Town Terms & Conditions.';
  for (const name of ['enquiry-received', 'booking-confirmed']) {
    const out = renderTemplate(name, { enquiry: e });
    assert.ok(squash(decode(out.html.replace(/<[^>]+>/g, ' ').replace(/ \./g, '.'))).includes(sentence), `${name}: html`);
    assert.match(out.html, /<a href="http:\/\/test\.local\/terms\/"[^>]*>Terms &amp; Conditions<\/a>/, `${name}: link`);
    assert.ok(out.text.includes(`${sentence} http://test.local/terms/`), `${name}: text`);
  }
  for (const name of ['booking-cancelled', 'new-enquiry-internal']) {
    const out = renderTemplate(name, { enquiry: e, actionLinks: {} });
    assert.doesNotMatch(out.html + out.text, /subject to the Good Times in Cape Town Terms/, name);
  }
});
