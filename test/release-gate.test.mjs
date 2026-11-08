/**
 * The release gate (scripts/release-gate.mjs) and the legal pages it guards:
 * a production deployment needs Good Times' approved privacy notice and
 * booking terms, its confirmed legal facts, and no commercial term left open.
 * Drafts say so; unconfirmed facts are left out rather than shown as pending
 * (as the contact details are), and an unapproved terms page is preview-only.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { site } from '../src/data/site.mjs';
import { releaseBlockers, releaseDecision } from '../scripts/release-gate.mjs';
import { page as privacy } from '../src/pages/privacy.mjs';
import { termsPage, pages as termsPages, OPEN_POINTS } from '../src/pages/terms.mjs';

/** The site as it would be once Good Times has supplied and approved everything. */
function approved() {
  const s = structuredClone(site);
  Object.assign(s.legal, {
    entity: { name: 'Example Tours (Pty) Ltd', registration: '2020/000000/07', directors: 'A. Example', verified: true },
    address: { text: '1 Example Street, Cape Town, 8001', verified: true },
    informationOfficer: { name: 'A. Example', email: 'privacy@example.com', verified: true },
    retention: { text: 'We keep a request for two years after the trip, then erase it.', verified: true },
    effective: '2026-11-01',
    privacyApproved: true,
    termsApproved: true,
    counselReview: { by: 'A. Practitioner (attorney)', date: '2026-11-02', verified: true },
  });
  s.tripadvisor.permission = { status: 'granted', verified: true };
  return s;
}

test('the gate lists every open approval and fact while the texts are drafts', () => {
  const draft = structuredClone(site);
  Object.assign(draft.legal, { privacyApproved: false, termsApproved: false, effective: '', retention: { text: '', verified: false } });
  const open = releaseBlockers(draft).join('\n');
  for (const want of [/privacy notice \(site\.legal\.privacyApproved\)/, /booking terms \(site\.legal\.termsApproved\)/, /effective date/, /retention period/]) assert.match(open, want);
});

test('approvals alone do not clear the gate while the terms leave a commercial point open', () => {
  const s = approved();
  // A commercial point the terms leave open holds the gate until it is written (none today: the owner decided B6 on 8 Nov 2026)
  const point = 'when the deposit is due for a late booking';
  const open = releaseBlockers(s, { openTermsPoints: [point] });
  assert.equal(open.length, 1, open.join('; '));
  assert.ok(open.every((o) => /booking terms do not yet cover/.test(o)));
  assert.deepEqual(OPEN_POINTS, [], 'B6 decided: nothing left open in the terms');
  assert.deepEqual(releaseBlockers(s), [], 'everything approved, confirmed and written: clear');
});

test('a draft says it is a draft; an unconfirmed fact is left out, never shown as pending', () => {
  const draft = structuredClone(site);
  // A draft of both texts, whatever the live data says.
  draft.legal.privacyApproved = false;
  draft.legal.termsApproved = false;
  draft.legal.informationOfficer = { name: '', email: '', verified: false };
  for (const preview of [true, false]) {
    const html = privacy.body({ site: { ...draft, preview } });
    assert.match(html, /Draft for Good Times’ approval/);
    assert.doesNotMatch(html, /class="pending"|awaiting confirmation|Information Officer:/);
  }
  // Every open point is named in the draft notice, in the page's own words.
  const terms = termsPage.body({ site: draft });
  assert.match(terms, /Draft for Good Times’ approval/);
  assert.ok(terms.includes(OPEN_POINTS.length ? `Still to confirm: ${OPEN_POINTS.join('; ')}; and the registered business details.` : 'Still to confirm: the registered business details.'), 'the open points');
  const final = approved();
  final.preview = false;
  const done = privacy.body({ site: final });
  assert.doesNotMatch(done, /Draft for Good Times’ approval/);
  assert.doesNotMatch(termsPage.body({ site: final }), /Draft for Good Times’ approval|notice--warning/);
  assert.match(done, /Effective 2026-11-01/);
  assert.match(done, /A\. Example, <a href="mailto:privacy@example\.com">/);
});

test('the privacy notice names every processor the booking system uses, and promises no marketing', () => {
  const html = privacy.body({ site: approved() });
  // The inbox's provider is named generically until Good Times confirms it (docs/APPROVAL_REGISTER.md).
  // Neon's database is in AWS us-east-2, Ohio (the Neon console, 8 Nov 2026): the approved text's "Frankfurt" was wrong
  for (const name of ['Cloudflare', 'Neon', 'Resend', 'Our email provider', 'WhatsApp', 'Ohio, in the United States', 'Ireland']) assert.match(html, new RegExp(name), name);
  assert.doesNotMatch(html, /Frankfurt, Germany/);
  assert.match(html, /never signs you up for promotional messages/);
  assert.match(html, /Information Regulator/);
  assert.match(html, /session storage/);
});

test('the terms page is noindex and preview-only until Good Times approves it', () => {
  if (site.legal.termsApproved) return;
  assert.equal(termsPage.noindex, true);
  assert.equal(termsPages.length, site.preview ? 1 : 0);
  assert.match(termsPage.body({ site }), /A booking is only confirmed once you’ve received confirmation from our team/);
});

test('a verified flag on an empty value is not a confirmation', () => {
  const s = approved();
  s.legal.entity = { name: '', registration: '', directors: '', verified: true };
  s.legal.retention = { text: '', verified: true };
  const open = releaseBlockers(s, { openTermsPoints: [] }).join('\n');
  assert.match(open, /registered business name and number is not confirmed/);
  assert.match(open, /retention period is not confirmed/);
});

test('the script itself fails the job, and says why, while anything open is not covered by an override', async () => {
  const { spawnSync } = await import('node:child_process');
  const r = spawnSync(process.execPath, ['scripts/release-gate.mjs'], { cwd: new URL('..', import.meta.url), encoding: 'utf8', env: { ...process.env, VERCEL: '1' } });
  const d = releaseDecision(site);
  assert.equal(r.status, d.clear ? 0 : 1, r.stderr);
  if (!d.clear) assert.match(r.stderr, /Not ready for production/);
  if (d.clear && d.override) {
    assert.match(r.stdout, /passed under the owner's recorded override/);
    assert.equal((r.stdout.match(/^::warning /gm) || []).length, d.overridden.length, 'every accepted item is shown on the run');
  }
});

test('an owner’s override passes exactly the blockers it names; anything else still stops the release', () => {
  const s = structuredClone(site);
  s.legal.releaseOverride = { date: '2026-10-26', by: 'test', accepted: ['site.legal.effective', 'site.legal.entity', 'site.legal.address', 'site.legal.informationOfficer', 'site.legal.retention', 'OPEN_POINTS', 'site.legal.counselReview', 'site.tripadvisor.permission'] };
  // This copy keeps open what the live data has since settled (B6, B7, R4 on 8 Nov 2026), so the override has work to do
  Object.assign(s.legal, { privacyApproved: true, termsApproved: true, effective: '', retention: { text: '', verified: false }, counselReview: { by: '', date: '', verified: false } });
  s.tripadvisor.permission = { status: 'not requested', verified: false };
  const opts = { openTermsPoints: ['when the deposit is due for a late booking'] };
  const ok = releaseDecision(s, opts);
  assert.equal(ok.clear, true, ok.remaining.join('; '));
  // effective, retention, the open deposit point, the practitioner's sign-off and Tripadvisor's permission
  assert.ok(ok.overridden.length >= 5, ok.overridden.join('; '));
  // A blocker the override does not name: an unapproved privacy notice.
  s.legal.privacyApproved = false;
  const stopped = releaseDecision(s, opts);
  assert.equal(stopped.clear, false);
  assert.deepEqual(stopped.remaining, ['Good Times has not approved the privacy notice (site.legal.privacyApproved)']);
  // Without a dated override, nothing is waived.
  s.legal.privacyApproved = true;
  s.legal.releaseOverride = { accepted: ok.overridden.length ? ['site.legal.effective'] : [] };
  assert.equal(releaseDecision(s, opts).clear, false);
  // A key must match whole: "site.legal.e" waives nothing.
  s.legal.releaseOverride = { date: '2026-10-26', accepted: ['site.legal.e', 'OPEN'] };
  assert.equal(releaseDecision(s, opts).overridden.length, 0);
});
