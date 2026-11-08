/**
 * The Booking Terms and the Privacy Notice, approved by the owner on 8 Nov 2026
 * (the texts are the company's own, adapted to this website; docs/APPROVAL_REGISTER.md,
 * B1 and B2): no draft notice, an effective date, the terms indexable and linked
 * from every footer, and no fact Good Times has not confirmed. Unapproved, the
 * same pages say plainly that they are drafts and the terms exist only in a
 * preview or under the release override. The release gate still names what the
 * approval did not settle (the legal facts, the commercial terms). Every "From"
 * price states Good Times' own basis (per group, per day, per trip), never "per adult".
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { site } from '../src/data/site.mjs';
import { layout } from '../src/partials/layout.mjs';
import { page as privacy } from '../src/pages/privacy.mjs';
import { termsPage, pages as termsPages, OPEN_POINTS, termsPublished } from '../src/pages/terms.mjs';
import { faqs } from '../src/data/faq.mjs';
import { releaseBlockers, releaseDecision } from '../scripts/release-gate.mjs';

const production = { ...site, preview: false, env: 'production' };
/** The same site once Good Times has approved both texts (the facts left as they are). */
const approvedTexts = (s) => ({ ...s, legal: { ...s.legal, privacyApproved: true, termsApproved: true } });
const dir = new URL('../src/pages/', import.meta.url);
const pages = [];
for (const f of readdirSync(dir).filter((f) => f.endsWith('.mjs')).sort()) {
  const mod = await import(new URL(f, dir));
  pages.push(...(Array.isArray(mod.pages) ? mod.pages : [mod.page]).filter(Boolean));
}
const footerOf = (html) => html.slice(html.indexOf('<footer'), html.indexOf('</footer>'));

test('both texts approved by the owner on 8 Nov 2026, effective that day; the facts are the owner’s own answers in the Legal details checklist', () => {
  assert.equal(site.legal.privacyApproved, true);
  assert.equal(site.legal.termsApproved, true);
  assert.equal(site.legal.effective, '2026-11-08', 'effective from the approval');
  // The one override on record, kept as given: the release to good-times-in-cape-town.pages.dev of 7 Nov 2026 (A1)
  assert.deepEqual(site.legal.releaseOverride.accepted, ['site.legal.privacyApproved', 'site.legal.termsApproved', 'site.legal.effective', 'site.legal.entity', 'site.legal.informationOfficer', 'site.legal.retention', 'OPEN_POINTS']);
  assert.match(site.legal.releaseOverride.date, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(site.legal.releaseOverride.scope, /pages\.dev only/);
  // The Legal details checklist, completed and signed by the owner on 8 Nov 2026 (items 1–3)
  assert.equal(site.legal.entity.name, 'Good Times In Cape Town (Pty) Ltd');
  assert.equal(site.legal.entity.registration, '2022/878500/07');
  assert.deepEqual([site.legal.informationOfficer.name, site.legal.informationOfficer.email], ['Stuart Matanhire', 'stuart@goodtimesincapetown.co.za']);
  assert.deepEqual([site.legal.retention.unconvertedMonths, site.legal.retention.confirmedYears], [1, 5]);
  for (const key of ['entity', 'informationOfficer', 'retention']) assert.equal(site.legal[key].verified, true, key);
  // Items 4 and 5: the per-booking cancellation rule and the payment terms
  assert.deepEqual({ ...site.legal.cancellation, source: undefined }, { dayTour: 24, multiDay: 48, transfer: 24, activity: 24, lateCharge: 100, noShowCharge: 100, source: undefined });
  assert.deepEqual({ ...site.legal.payment, source: undefined }, { methods: ['bank transfer (EFT)', 'card', 'cash'], depositPercent: 50, depositDaysBefore: 7, balance: 'on the day', source: undefined });
  // Not yet signed off by a South African legal practitioner (the owner's brief of 8 Nov 2026)
  assert.equal(site.legal.counselReview.verified, false);
  // The one fact taken as published: the office on the official site (to be confirmed as the address for notices).
  assert.deepEqual(site.legal.address, { text: '277 Main Road, Adelphi Centre, Sea Point, Cape Town, 8005', verified: true });
});

test('the Privacy Notice: approved, so no draft notice; it keeps its content, gives its effective date and names no unconfirmed fact', () => {
  for (const s of [site, production]) {
    const html = privacy.body({ site: s });
    assert.doesNotMatch(html, /Draft for Good Times|notice--warning/);
    assert.match(html, /Effective 2026-11-08\./);
    for (const key of ['entity', 'informationOfficer']) if (!site.legal[key].verified) assert.doesNotMatch(html, key === 'entity' ? /Registered name and number:/ : /Information Officer:/, key);
    for (const kept of ['Who we are', 'What we collect', 'Why we use it', 'Who helps us, and where your details are kept', 'Cloudflare', 'Neon', 'Resend', 'Our email provider', 'How long we keep it', 'Keeping it safe', 'session storage', 'Your rights', 'Information Regulator', 'Information Commissioner’s Office', 'Changes to this notice', 'Photo credits']) assert.ok(html.includes(kept), kept);
    // Good Times' own policy, kept: no selling, sharing only to deliver a booking.
    assert.match(html, /We do not sell your personal information to third parties/);
    assert.match(html, /We share information only where it is needed to deliver your booking/);
    // The checklist's facts and the corrections of 8 Nov 2026: the company, the Information Officer as the address for
    // privacy requests (hello@ for everything else), the retention periods, and the database where it really is
    assert.match(html, /Registered name and number: Good Times In Cape Town \(Pty\) Ltd, 2022\/878500\/07/);
    assert.match(html, /Information Officer, for anything about your personal information: Stuart Matanhire, <a href="mailto:stuart@goodtimesincapetown\.co\.za">/);
    assert.match(html, /General enquiries: <a href="mailto:hello@goodtimesincapetown\.co\.za">/);
    assert.match(html, /Email our Information Officer, Stuart Matanhire, at <a href="mailto:stuart@goodtimesincapetown\.co\.za">/);
    assert.ok(html.includes(site.legal.retention.text.replace(/’/g, '’')), 'the retention periods');
    assert.match(html, /hosted by Amazon Web Services in Ohio, in the United States/);
    assert.doesNotMatch(html, /Frankfurt, Germany|\[to correct|retention periods to add|to correct before go-live/i, 'no editor note and no wrong region');
  }
  assert.doesNotMatch(privacy.body({ site: approvedTexts(production) }), /Draft for Good Times|notice--warning/, 'approved: no draft notice');
  // Unapproved, the same page says it is a draft: the switch works both ways.
  const draft = { ...production, legal: { ...production.legal, privacyApproved: false } };
  assert.match(privacy.body({ site: draft }), /<p class="notice notice--warning">[\s\S]*?Draft for Good Times’ approval\./);
});

test('the Terms & Conditions: approved, so indexable, dated, without a draft notice and linked from every footer; unapproved, a draft built only for a preview or under the release override', () => {
  const html = termsPage.body({ site: production });
  assert.doesNotMatch(html, /Draft for Good Times|notice--warning/);
  assert.match(html, /Effective 2026-11-08\./);
  assert.equal(termsPage.noindex, false);
  assert.equal(termsPages.length, 1);
  const home = pages.find((p) => p.path === 'index.html');
  assert.match(footerOf(layout(home, { ...site, preview: true })), /<a href="terms\/">Terms &amp; Conditions<\/a>/);
  assert.match(footerOf(layout(home, production)), /<a href="terms\/">Terms &amp; Conditions<\/a>/);
  // Unapproved: a draft that says so, published in production only under the owner's release override (7 Nov 2026)
  const unapproved = { ...production, legal: { ...production.legal, termsApproved: false } };
  assert.match(termsPage.body({ site: unapproved }), /<p class="notice notice--warning">[\s\S]*?Draft for Good Times’ approval\./);
  assert.equal(termsPublished(unapproved), true);
  // Without approval or override a production build has neither the page nor a link to it
  const locked = { ...unapproved, legal: { ...unapproved.legal, releaseOverride: null } };
  assert.equal(termsPublished(locked), false);
  const productionFooter = footerOf(layout(home, locked));
  assert.doesNotMatch(productionFooter, /href="terms\//, 'no link to a page that is not built');
  assert.match(productionFooter, /<a href="privacy\/">Privacy<\/a>/);
  // Once approved: no draft notice, and every footer links the terms.
  const approved = approvedTexts(production);
  assert.doesNotMatch(termsPage.body({ site: approved }), /Draft for Good Times|notice--warning/);
  assert.match(footerOf(layout(home, approved)), /<a href="terms\/">Terms &amp; Conditions<\/a>/);
});

test('the release gate names what the approval did not settle: the unconfirmed facts and each open commercial point', () => {
  const open = releaseBlockers(site).join('\n');
  assert.doesNotMatch(open, /site\.legal\.privacyApproved|site\.legal\.termsApproved|effective date/, 'both texts approved and dated');
  for (const key of ['entity', 'address', 'informationOfficer', 'retention']) {
    if (site.legal[key].verified) assert.doesNotMatch(open, new RegExp(`site\\.legal\\.${key}\\b`), `${key} is confirmed`);
    else assert.match(open, new RegExp(`site\\.legal\\.${key}`), key);
  }
  for (const point of OPEN_POINTS) assert.ok(open.includes(point), point);
  // The override of 7 Nov 2026 (A1) still covers what it named; two new items it never named hold production: the legal
  // practitioner's sign-off and Tripadvisor's permission for the rating shown in the site's own design (8 Nov 2026)
  const d = releaseDecision(site);
  assert.equal(d.clear, false);
  assert.deepEqual(d.remaining, [
    'no South African legal practitioner has signed off the privacy notice and the terms (site.legal.counselReview)',
    'Tripadvisor’s permission to show its rating and review count outside its widgets is not recorded (site.tripadvisor.permission)',
  ]);
  assert.equal(releaseDecision({ ...site, legal: { ...site.legal, releaseOverride: null } }).clear, false, 'the domain still needs every open point');
});

test('every "From" price states Good Times’ own basis, never "per adult"; the FAQ says prices are per group', () => {
  const BASIS = /^per (group|day|trip)(, \d+–\d+ guests| of \d+–\d+ guests)?$/;
  const CAPTIONED = /<span class="price__amount">From <span data-money="\d+">[^<]*<\/span>(?: <s [^>]*>[^<]*<\/s>)?<\/span><span class="price__note">([^<]*)<\/span>/g;
  let seen = 0;
  for (const p of pages.filter((x) => x.path !== 'terms/index.html')) {
    const html = layout(p, site);
    // The caption under each "From" price (destination cards reuse the class for other notes).
    const captions = [...html.matchAll(CAPTIONED)];
    for (const [, note] of captions) assert.match(note, BASIS, `${p.path}: ${note}`);
    assert.equal(captions.length, (html.match(/class="price__amount">From /g) || []).length, `${p.path}: every "From" price has its basis`);
    seen += captions.length;
    assert.doesNotMatch(html, /class="enquiry-card__amount">[^\n]*<small>/, `${p.path}: the booking card's unit`);
    assert.doesNotMatch(html, /per adult/i, `${p.path}: "per adult" anywhere on a priced page`);
  }
  assert.ok(seen > 10, 'the prices were found');
  const tours = layout(pages.find((p) => p.path === 'tours/index.html'), site);
  assert.match(tours, /<span class="price__amount">From <span data-money="4500">R4,500<\/span><\/span><span class="price__note">per group<\/span>/);
  const tour = pages.find((p) => p.path === 'tours/cape-town-city-private-tour/index.html');
  assert.match(tour.mobileCta({ site }), /<strong>From <span data-money="4500">R4,500<\/span><\/strong>per group/);
  // The basis is stated where a visitor reads how prices work.
  const faq = faqs.find((f) => /per person or per group/i.test(f.q));
  assert.ok(faq, 'the FAQ on prices');
  assert.match([].concat(faq.a ?? faq.answer ?? '').join(' '), /^Per group\./);
});
