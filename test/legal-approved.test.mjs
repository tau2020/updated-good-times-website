/**
 * The Booking Terms and the Privacy Notice await Good Times' approval (the
 * texts are the company's own, adapted to this website; docs/APPROVAL_REGISTER.md):
 * both say plainly that they are drafts and keep their content, the terms
 * exist only in preview builds (noindex) and are linked from the footer only
 * where the page exists, and the release gate names everything still open (the
 * two approvals, the legal facts, the effective date, the commercial terms).
 * Once approved, the same pages lose the draft notice and the terms are linked
 * from every footer. Every "From" price states Good Times' own basis (per
 * group, per day, per trip), never "per adult".
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { site } from '../src/data/site.mjs';
import { layout } from '../src/partials/layout.mjs';
import { page as privacy } from '../src/pages/privacy.mjs';
import { termsPage, pages as termsPages, OPEN_POINTS } from '../src/pages/terms.mjs';
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

test('nothing is approved yet, and the facts only Good Times can give stay unconfirmed', () => {
  assert.equal(site.legal.privacyApproved, false);
  assert.equal(site.legal.termsApproved, false);
  assert.equal(site.legal.effective, '', 'no effective date before the approval');
  // The one override on record: the release to good-times-in-cape-town.pages.dev of 7 Nov 2026 (A1), accepting exactly
  // the items still open; the texts themselves stay unapproved and say so
  assert.deepEqual(site.legal.releaseOverride.accepted, ['site.legal.privacyApproved', 'site.legal.termsApproved', 'site.legal.effective', 'site.legal.entity', 'site.legal.informationOfficer', 'site.legal.retention', 'OPEN_POINTS']);
  assert.match(site.legal.releaseOverride.date, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(site.legal.releaseOverride.scope, /pages\.dev only/);
  for (const key of ['entity', 'informationOfficer', 'retention']) assert.equal(site.legal[key].verified, false, key);
  // The one fact taken as published: the office on the official site (to be confirmed as the address for notices).
  assert.deepEqual(site.legal.address, { text: '277 Main Road, Adelphi Centre, Sea Point, Cape Town, 8005', verified: true });
});

test('the Privacy Notice: says it is a draft for Good Times’ approval, and keeps its content', () => {
  for (const s of [site, production]) {
    const html = privacy.body({ site: s });
    assert.match(html, /<p class="notice notice--warning">[\s\S]*?Draft for Good Times’ approval\./);
    for (const kept of ['Who we are', 'What we collect', 'Why we use it', 'Who helps us, and where your details are kept', 'Cloudflare', 'Neon', 'Resend', 'Our email provider', 'How long we keep it', 'Keeping it safe', 'session storage', 'Your rights', 'Information Regulator', 'Information Commissioner’s Office', 'Changes to this notice', 'Photo credits']) assert.ok(html.includes(kept), kept);
    // Good Times' own policy, kept: no selling, sharing only to deliver a booking.
    assert.match(html, /We do not sell your personal information to third parties/);
    assert.match(html, /We share information only where it is needed to deliver your booking/);
  }
  const approved = privacy.body({ site: approvedTexts(production) });
  assert.doesNotMatch(approved, /Draft for Good Times|notice--warning/, 'once approved, no draft notice');
});

test('the Terms & Conditions: a draft, noindex and preview-only; the footer links them only where the page exists', () => {
  const html = termsPage.body({ site: production });
  assert.match(html, /<p class="notice notice--warning">[\s\S]*?Draft for Good Times’ approval\./);
  assert.equal(termsPage.noindex, true);
  assert.equal(termsPages.length, site.preview ? 1 : 0, 'built only for a preview while unapproved');
  const home = pages.find((p) => p.path === 'index.html');
  // A preview build has the page, so its footer links it; a production build has neither yet.
  const previewFooter = footerOf(layout(home, { ...site, preview: true }));
  assert.match(previewFooter, /<a href="terms\/">Terms &amp; Conditions<\/a>/);
  const productionFooter = footerOf(layout(home, production));
  assert.doesNotMatch(productionFooter, /href="terms\//, 'no link to a page that is not built');
  assert.match(productionFooter, /<a href="privacy\/">Privacy<\/a>/);
  // Once approved: no draft notice, and every footer links the terms.
  const approved = approvedTexts(production);
  assert.doesNotMatch(termsPage.body({ site: approved }), /Draft for Good Times|notice--warning/);
  assert.match(footerOf(layout(home, approved)), /<a href="terms\/">Terms &amp; Conditions<\/a>/);
});

test('the release gate names everything still open: both approvals, the effective date, the unconfirmed facts and each open commercial point', () => {
  const open = releaseBlockers(site).join('\n');
  assert.match(open, /Good Times has not approved the privacy notice \(site\.legal\.privacyApproved\)/);
  assert.match(open, /Good Times has not approved the booking terms \(site\.legal\.termsApproved\)/);
  if (!site.legal.effective) assert.match(open, /effective date/);
  for (const key of ['entity', 'address', 'informationOfficer', 'retention']) {
    if (site.legal[key].verified) assert.doesNotMatch(open, new RegExp(`site\\.legal\\.${key}\\b`), `${key} is confirmed`);
    else assert.match(open, new RegExp(`site\\.legal\\.${key}`), key);
  }
  for (const point of OPEN_POINTS) assert.ok(open.includes(point), point);
  // Clear only through the recorded override of 7 Nov 2026 (A1): every open item is one it names; without it, no release
  const d = releaseDecision(site);
  assert.equal(d.clear, true);
  assert.deepEqual(d.overridden, d.open, 'everything open is accepted by name');
  assert.equal(releaseDecision({ ...site, legal: { ...site.legal, releaseOverride: null } }).clear, false, 'no production release without the override');
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
