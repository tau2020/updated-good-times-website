/**
 * The enquire/ page as rendered by the build, in each delivery state.
 * (Browser behaviour is covered by test/e2e/enquiry.spec.mjs.)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { page } from '../src/pages/enquire.mjs';
import { layout } from '../src/partials/layout.mjs';
import { site } from '../src/data/site.mjs';
import { FIELDS, inSection, TOUR_SLUGS, PACKAGE_SLUGS, TRANSFER_TYPES, CUSTOM_TOUR } from '../src/assets/js/enquiry-schema.js';
import { tours } from '../src/data/tours.mjs';
import { packages } from '../src/data/packages.mjs';

const unverified = {
  phone: { ...site.contact.phone, verified: false },
  whatsapp: { ...site.contact.whatsapp, verified: false },
  email: { ...site.contact.email, verified: false },
  hours: { text: '', verified: false },
  responseTime: { text: '', verified: false },
};
const verified = {
  ...unverified,
  phone: { ...site.contact.phone, verified: true },
  whatsapp: { ...site.contact.whatsapp, verified: true },
  email: { ...site.contact.email, verified: true },
};
const variant = ({ mode = 'preview', enabled = true, preview = true, contact = unverified } = {}) => ({ ...site, preview, contact, enquiry: { ...site.enquiry, mode, enabled } });
const body = (opts) => page.body({ site: variant(opts) });
const text = (html) => html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const config = (html) => JSON.parse(/<script type="application\/json" id="enquiry-config">([\s\S]*?)<\/script>/.exec(html)[1]);
const panel = (html, step, path) => {
  const re = new RegExp(`<div class="wizard-step" data-wizard-step="${step}"${path ? ` data-path="${path}"` : ''}[\\s\\S]*?(?=<div class="wizard-step" data-wizard-step|</form>)`);
  return re.exec(html)?.[0] || '';
};

test('preview build: the wizard works but the only result is a labelled preview, never a reference', () => {
  const html = body({ mode: 'preview' });
  assert.match(html, /data-mode="preview"/);
  assert.match(html, /data-result="preview"/);
  assert.doesNotMatch(html, /data-result="success"/);
  assert.doesNotMatch(html, /GT-[A-Z2-9]{6}/);
  assert.doesNotMatch(html, /Enquiry received; your booking is not yet confirmed/);
  assert.match(html, /Preview only: this enquiry was not sent to us\./);
  assert.match(text(html), /shows an enquiry reference to quote/);
  assert.doesNotMatch(text(html), /GT-/, 'the preview never prints the reference prefix');
  assert.match(text(html), /Preview build\. Pressing send will not contact us/);
  assert.equal(config(html).mode, 'preview');
});

test('live build: success and duplicate results with the exact not-confirmed sentence; posts to the API', () => {
  const html = body({ mode: 'live' });
  assert.match(html, /data-mode="live"/);
  assert.match(html, /data-result="success"/);
  assert.match(html, /data-result="duplicate"/);
  assert.doesNotMatch(html, /data-result="preview"/);
  assert.doesNotMatch(html, /Preview build/);
  assert.equal((html.match(/Enquiry received; your booking is not yet confirmed\./g) || []).length, 2);
  assert.doesNotMatch(html, /GT-[A-Z2-9]{6}/, 'the reference is filled in only after a real 201');
  const cfg = config(html);
  assert.equal(cfg.mode, 'live');
  assert.equal(cfg.endpoint, '/api/enquiries');
  assert.equal(cfg.referencePrefix, 'GT-');
  assert.equal(cfg.whatsapp, '');
  assert.doesNotMatch(html, /data-whatsapp/, 'no WhatsApp button while the number is unverified');
});

test('live build with a verified WhatsApp number offers "Continue on WhatsApp" with no personal data in the URL', () => {
  const html = body({ mode: 'live', contact: verified, preview: false });
  const a = /<a class="btn gt-button gt-button--secondary" data-whatsapp data-number="(\d+)" href="([^"]+)"/.exec(html);
  assert.ok(a, 'WhatsApp button rendered');
  assert.equal(a[2], `https://wa.me/${a[1]}`);
  assert.equal(config(html).whatsapp, a[1]);
});

test('both states show the not-a-booking notice on the review step', () => {
  for (const mode of ['preview', 'live']) {
    assert.match(text(body({ mode })), /Sending an enquiry does not create a confirmed booking\. We’ll reply to confirm availability and a quote\./);
  }
});

test('disabled: a paused notice instead of the form (no fake form)', () => {
  const html = body({ enabled: false });
  assert.doesNotMatch(html, /<form/);
  assert.doesNotMatch(html, /data-enquiry[\s>]/);
  assert.match(html, /Online enquiries are paused at the moment\./);
});

test('contact channels appear only when verified; an unverified one is simply absent, with no pending note', () => {
  const c = site.contact;
  const pending = body({ preview: true });
  for (const s of [c.phone.display, c.email.address, c.whatsapp.e164.replace(/\D/g, '')]) assert.ok(!pending.includes(s), s);
  assert.doesNotMatch(pending, /awaiting[^<]{0,30}confirmation/i);
  const prod = body({ preview: false });
  assert.doesNotMatch(prod, /awaiting[^<]{0,30}confirmation/i);
  for (const s of [c.phone.display, c.email.address]) assert.ok(!prod.includes(s), s);
  const shown = body({ preview: false, contact: verified });
  assert.ok(shown.includes(c.email.address) && shown.includes(c.phone.display));
});

test('no invented service promises on the page', () => {
  const t = text(body({ mode: 'live' })) + text(body({ mode: 'preview' }));
  assert.doesNotMatch(t, /within (one|1|24|48|a few)|working day|guarantee|24\/7|around the clock|instant confirmation/i);
  // "Book Now" is the site-wide call to action; the page itself never promises a booking.
  assert.doesNotMatch(t, /instant(ly)? (book|confirm)|secure booking|free cancellation|pay now|confirm (&|and) pay|amount due\b(?!\.)/i);
});

test('every panel is rendered (usable without JavaScript) with its heading; the stepper names the three steps after the choice', () => {
  const html = body();
  assert.match(html, /data-wizard-step="service"[\s\S]*?What would you like to book\?/);
  for (const [n, eyebrow] of [[1, 'Date &amp; details'], [1, 'Date &amp; details'], [2, 'Traveller info'], [3, 'Review &amp; send']]) assert.match(html, new RegExp(`Step ${n} of 3: ${eyebrow}`));
  assert.doesNotMatch(html, /Step \d of 4/);
  for (const name of ['Date &amp; Details', 'Traveller Info', 'Review &amp; Send']) assert.match(html, new RegExp(`</span>${name}</span>`));
  assert.match(html, /<ol class="wizard-progress" data-progress[^>]*data-requires-js hidden>/, 'the stepper is hidden until a service is chosen');
  assert.match(html, /<noscript>[\s\S]*This form needs JavaScript to send/);
  assert.match(html, /<button type="submit"[^>]*data-submit disabled>/, 'no implicit submission before the script is ready');
  assert.match(html, /<form class="wizard-form" method="post" novalidate/);
  assert.match(html, /class="honeypot" aria-hidden="true"><label for="enq-hp">Leave this field empty<\/label><input type="text" id="enq-hp" name="gt_hp_check" value="" tabindex="-1" autocomplete="off"/);
  assert.doesNotMatch(html, /name="website"/);
});

test('every schema field has a control in the right step; tours and transfer types come from src/data', () => {
  const html = body();
  const panels = { service: panel(html, 'service'), tour: panel(html, 'details', 'tour'), transfer: panel(html, 'details', 'transfer'), contact: panel(html, 'contact') };
  for (const [name, f] of Object.entries(FIELDS)) {
    for (const [section, markup] of Object.entries(panels)) {
      const has = new RegExp(`name="${name}"`).test(markup);
      assert.equal(has, inSection(f, section), `${name} in ${section}`);
    }
  }
  for (const slug of [...TOUR_SLUGS, CUSTOM_TOUR]) assert.match(panels.tour, new RegExp(`<option value="${slug}">`));
  for (const t of TRANSFER_TYPES) assert.match(panels.transfer, new RegExp(`name="transfer_type" value="${t}"`));
});

test('ids are unique, every label points at a control and every aria-describedby target exists', () => {
  const html = body({ mode: 'live' });
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  assert.deepEqual(dupes, []);
  const set = new Set(ids);
  for (const m of html.matchAll(/<label[^>]*\sfor="([^"]+)"/g)) assert.ok(set.has(m[1]), `label for=${m[1]}`);
  for (const m of html.matchAll(/aria-(?:describedby|labelledby|controls)="([^"]+)"/g)) for (const id of m[1].split(/\s+/)) assert.ok(set.has(id), `aria target ${id}`);
  for (const m of html.matchAll(/<(input|select|textarea)\b[^>]*\sid="([^"]+)"/g)) {
    if (m[2] === 'enq-hp') continue;
    const labelled = new RegExp(`for="${m[2]}"`).test(html) || /aria-labelledby=/.test(m[0]);
    assert.ok(labelled, `control ${m[2]} has a label`);
  }
});

test('no executable inline script (the site CSP allows only the layout head script); the config is a JSON data block', () => {
  for (const opts of [{ mode: 'preview' }, { mode: 'live' }, { enabled: false }]) {
    const html = body(opts);
    const scripts = [...html.matchAll(/<script\b([^>]*)>/g)].map((m) => m[1]);
    for (const attrs of scripts) assert.match(attrs, /type="application\/json"/, `inline script ${attrs}`);
  }
});

test('step 1 of the tour path carries a summary card per tour and an honest total row', () => {
  const html = body();
  const tour = panel(html, 'details', 'tour');
  for (const slug of [...TOUR_SLUGS, CUSTOM_TOUR]) assert.match(tour, new RegExp(`data-tour-card="${slug}" hidden`), slug);
  assert.match(tour, /data-total-row data-requires-js/);
  assert.match(tour, /We’ll confirm your quote/);
  assert.match(tour, /Not an amount due/);
  assert.doesNotMatch(text(tour), /total due|pay now|amount due\b(?!\.)/i);
  assert.match(tour, /data-calendar-for="enq-tour-preferred-date" data-requires-js/);
  const cfg = config(html);
  assert.equal(typeof cfg.showPrices, 'boolean');
  // Exactly the published group prices (rand, per group, per day or per trip, in tiers by group size); a tour
  // or activity without a published price has none, so its total row asks for a quote instead.
  const published = [...tours, ...packages].filter((t) => t.price?.currency === 'ZAR');
  assert.deepEqual(Object.keys(cfg.prices).sort(), published.map((t) => t.slug).sort());
  for (const [slug, price] of Object.entries(cfg.prices)) {
    assert.ok([...TOUR_SLUGS, ...PACKAGE_SLUGS].includes(slug), slug);
    assert.ok(price.unit && price.tiers.length > 0, slug);
    for (const tier of price.tiers) assert.ok(Number.isInteger(tier.amount) && tier.amount > 0 && Number.isInteger(tier.max) && tier.max > 0, slug);
    assert.deepEqual(price.tiers, published.find((t) => t.slug === slug).price.tiers, slug);
  }
});

test('consent wording links to the privacy notice', () => {
  const html = body();
  assert.match(html, /I agree that Good Times in Cape Town may use these details to reply to this enquiry\./);
  assert.match(html, /<a href="privacy\/">privacy notice<\/a>/);
});

test('in the full layout: own stylesheet and module script, one h1, no bottom bar while contacts are unverified', () => {
  const html = layout(page, variant());
  assert.match(html, /<link rel="stylesheet" href="\.\.\/assets\/css\/enquiry\.css">/);
  assert.match(html, /<script type="module" src="\.\.\/assets\/js\/enquiry\.js"><\/script>/);
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  assert.match(html, /<h1 data-page-title data-title-tour="Book Your Tour" data-title-package="Book Your Multi-day Tour" data-title-transfer="Book Your Transfer">Book with us<\/h1>/);
  // No tour enquiry bar here; the site-wide contact bar appears once WhatsApp is verified (test/contact.test.mjs).
  assert.equal(page.mobileCta, undefined);
  assert.doesNotMatch(html, /data-mobile-cta|data-contact-bar/);
  assert.match(html, /<li aria-current="page">Book<\/li>/);
});
