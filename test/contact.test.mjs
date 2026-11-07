/**
 * Direct contact as rendered by the layout on every page: nothing appears
 * until a channel is verified in src/data/site.mjs; once it is, the mobile
 * contact bar, the footer, the concierge panel and the enquiry page show it.
 * Good Times publishes one number (for calls; WhatsApp is not yet confirmed);
 * its primary address is hello@goodtimesincapetown.co.za, with
 * stuart@goodtimesincapetown.co.za as an additional one on the contact page.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { site } from '../src/data/site.mjs';
import { layout } from '../src/partials/layout.mjs';

const dir = new URL('../src/pages/', import.meta.url);
const pages = [];
for (const f of readdirSync(dir).filter((f) => f.endsWith('.mjs')).sort()) {
  const mod = await import(new URL(f, dir));
  pages.push(...(Array.isArray(mod.pages) ? mod.pages : [mod.page]).filter(Boolean));
}
const byPath = (p) => pages.find((x) => x.path === p);
const TOUR = 'tours/cape-town-city-private-tour/index.html';

const c = site.contact;
const set = (over) => ({
  phone: { ...c.phone, verified: false },
  whatsapp: { ...c.whatsapp, verified: false },
  email: { ...c.email, verified: false },
  hours: { text: '', verified: false },
  responseTime: { text: '', verified: false },
  ...over,
});
const variant = ({ preview = true, contact = set() } = {}) => ({ ...site, preview, env: preview ? 'preview' : 'production', contact });
const all = { phone: { ...c.phone, verified: true }, whatsapp: { ...c.whatsapp, verified: true }, email: { ...c.email, verified: true } };
const render = (path, s) => layout(byPath(path), s);
const digits = c.whatsapp.e164.replace(/\D/g, '');
const section = (html, start, end) => html.slice(html.indexOf(start), html.indexOf(end, html.indexOf(start)));
/** True when `index` sits inside an <a> element (an anchor opened before it and not yet closed). */
const insideLink = (html, index) => {
  const before = html.slice(0, index);
  return before.lastIndexOf('<a ') > before.lastIndexOf('</a>');
};

test('nothing verified: no contact links, header slot or contact bar on any page; production shows no pending note', () => {
  for (const preview of [true, false]) {
    const s = variant({ preview });
    for (const p of pages) {
      const html = layout(p, s);
      assert.doesNotMatch(html, /wa\.me|href="tel:|href="mailto:/, `${p.path} (${s.env})`);
      assert.doesNotMatch(html, /header-contact|data-contact-bar/, `${p.path} (${s.env})`);
      if (!preview) assert.doesNotMatch(html, /awaiting confirmation|class="pending"/, `${p.path} (production)`);
    }
  }
  // Tour pages keep their own booking bar (price or duration + Request a Quote) until a direct line is verified.
  assert.match(render(TOUR, variant()), /class="mobile-cta" data-mobile-cta/);
});

test('verified: no page’s header carries contact links; the number’s WhatsApp and Call actions carry their coloured marks', () => {
  const s = variant({ preview: false, contact: set(all) });
  for (const p of pages) {
    const header = section(layout(p, s), '<header', '</header>');
    assert.doesNotMatch(header, /wa\.me|href="tel:|header-contact/, p.path);
  }
  const footer = section(render('tours/index.html', s), '<footer', '</footer>');
  assert.match(footer, new RegExp(`<a class="contact-action" href="https://wa\\.me/${digits}"[^>]*><span class="brand-mark brand-mark--whatsapp"`));
  assert.match(footer, new RegExp(`<a class="contact-action" href="tel:\\${c.phone.e164}"><span class="brand-mark brand-mark--phone"`));
});

test('verified WhatsApp: every page gets a WhatsApp + Plan My Day bar; tour pages keep the prefilled link; the booking page calls instead', () => {
  const s = variant({ preview: false, contact: set(all) });
  for (const p of pages) {
    const html = layout(p, s);
    const bar = section(html, 'data-contact-bar', '</div>');
    assert.ok(bar, `${p.path}: contact bar`);
    assert.match(html, /<body class="[^"]*\bhas-mobile-cta\b/, `${p.path}: footer clears the bar`);
    assert.match(bar, new RegExp(`href="https://wa\\.me/${digits}"[^>]*>.*WhatsApp`), `${p.path}: WhatsApp button`);
    assert.equal((bar.match(/class="(?:btn |leaf-btn[" ])/g) || []).length, 2, `${p.path}: two buttons (Plan My Day is the leaf)`);
    assert.doesNotMatch(html, /data-mobile-cta[ >]/, `${p.path}: one bar only`);
    if (p.path === 'enquire/index.html') {
      assert.match(bar, /href="tel:/, 'enquiry page: Call');
      assert.doesNotMatch(bar, /href="[^"]*enquire\//, 'enquiry page: no link to itself');
    } else if (p.path.startsWith('tours/') && p.path !== 'tours/index.html') {
      assert.match(bar, /href="[^"]*enquire\/\?type=tour&amp;tour=[a-z-]+"[^>]*>[\s\S]*?<span class="leaf-btn__label">Plan My Day<\/span>/, `${p.path}: prefilled tour booking`);
    } else if (p.path.startsWith('packages/') && p.path !== 'packages/index.html') {
      assert.match(bar, /href="[^"]*enquire\/\?type=tour&amp;tour=[a-z-]+(&amp;nights=\d+)?"[^>]*>[\s\S]*?<span class="leaf-btn__label">Plan My Day<\/span>/, `${p.path}: prefilled package booking`);
    } else {
      assert.match(bar, /href="[^"]*enquire\/"[^>]*>[\s\S]*?<span class="leaf-btn__label">Plan My Day<\/span>/, `${p.path}: Plan My Day`);
    }
  }
});

test('verified: footer and enquiry page give the number as selectable text, outside any link, with a wa.me link', () => {
  const s = variant({ preview: false, contact: set(all) });
  const value = `<span class="contact-list__value">${c.phone.display}</span>`;
  const blocks = {
    footer: section(render('index.html', s), '<footer', '</footer>'),
    'enquiry page': section(render('enquire/index.html', s), 'id="enq-talk-title"', '</section>'),
  };
  for (const [name, html] of Object.entries(blocks)) {
    const at = html.indexOf(value);
    assert.ok(at > -1, `${name}: number as text`);
    assert.equal(insideLink(html, at), false, `${name}: the number is not inside a link`);
    assert.match(html, new RegExp(`href="https://wa\\.me/${digits}"`), `${name}: WhatsApp link`);
    assert.match(html, new RegExp(`href="tel:\\${c.phone.e164}"`), `${name}: call link`);
    assert.match(html, new RegExp(`href="mailto:${c.email.address}"`), `${name}: email`);
    assert.doesNotMatch(html, /awaiting confirmation/, `${name}: no pending note`);
  }
});

test('only WhatsApp verified: the contact list shows its number with WhatsApp alone; the enquiry-page bar is WhatsApp alone', () => {
  const s = variant({ preview: false, contact: set({ whatsapp: { ...c.whatsapp, verified: true } }) });
  const footer = section(render('tours/index.html', s), '<footer', '</footer>');
  assert.match(footer, new RegExp(`<span class="contact-list__value">${c.whatsapp.display.replace(/\+/g, '\\+')}</span>`));
  assert.match(footer, new RegExp(`wa\\.me/${digits}`));
  assert.doesNotMatch(footer, /href="tel:/);
  const bar = section(render('enquire/index.html', s), 'data-contact-bar', '</div>');
  assert.equal((bar.match(/class="btn /g) || []).length, 1);
});

test('different phone and WhatsApp numbers: the contact list shows each number as text with its own action, never one number beside the other channel', () => {
  const wa = { ...c.whatsapp, e164: '+27820000000', display: '+27 82 000 0000', verified: true };
  const s = variant({ preview: false, contact: set({ whatsapp: wa, phone: { ...c.phone, verified: true } }) });
  const items = section(render('tours/index.html', s), '<footer', '</footer>').split('<li class="contact-list__item">').slice(1).map((i) => i.slice(0, i.indexOf('</li>')));
  const waItem = items.find((i) => i.includes('+27 82 000 0000'));
  const telItem = items.find((i) => i.includes(c.phone.display));
  assert.ok(waItem && telItem && waItem !== telItem, 'two rows');
  assert.match(waItem, /wa\.me\/27820000000"/);
  assert.doesNotMatch(waItem, /href="tel:/);
  assert.match(telItem, new RegExp(`href="tel:\\${c.phone.e164}"`));
  assert.doesNotMatch(telItem, /wa\.me/);
});

test('verified: the concierge panel carries the direct line on every page, WhatsApp and Call in their colours', () => {
  const s = variant({ preview: false, contact: set(all) });
  for (const p of pages) {
    const reach = section(layout(p, s), 'class="gt-concierge-panel__reach"', '</ul>');
    assert.match(reach, new RegExp(`href="https://wa\\.me/${digits}"`), p.path);
    assert.match(reach, new RegExp(`href="tel:\\${c.phone.e164}"`), p.path);
    assert.match(reach, new RegExp(`href="mailto:${c.email.address}"`), p.path);
    assert.match(reach, /brand-mark--whatsapp[\s\S]*brand-mark--phone/, p.path);
  }
});

test('verified: the mobile menu lists each number once, with WhatsApp opening in a new tab like everywhere else', () => {
  const drawer = section(render('index.html', variant({ preview: false, contact: set(all) })), 'id="drawer"', '</div>\n</div>');
  assert.equal(drawer.split(c.phone.display).length - 1, 1, 'number shown once');
  assert.match(drawer, new RegExp(`href="https://wa\\.me/${digits}" rel="noopener" target="_blank"`));
});

test('only the phone verified (Good Times today): every page gets a Call + Plan My Day bar, tour pages prefilled; the booking page a single Call; no WhatsApp anywhere', () => {
  const s = variant({ preview: false, contact: set({ phone: { ...c.phone, verified: true } }) });
  for (const p of pages) {
    const html = layout(p, s);
    const bar = section(html, 'data-contact-bar', '</div>');
    assert.ok(bar, `${p.path}: contact bar`);
    assert.match(html, /<body class="[^"]*\bhas-mobile-cta\b/, `${p.path}: footer clears the bar`);
    assert.match(bar, new RegExp(`href="tel:\\${c.phone.e164}"[^>]*>.*Call`), `${p.path}: Call button`);
    assert.doesNotMatch(html, /wa\.me/, `${p.path}: no WhatsApp link while it is unconfirmed`);
    assert.doesNotMatch(html, /data-mobile-cta[ >]/, `${p.path}: one bar only`);
    if (p.path === 'enquire/index.html') {
      assert.equal((bar.match(/class="btn /g) || []).length, 1, 'enquiry page: Call alone');
      assert.doesNotMatch(bar, /href="[^"]*enquire\//, 'enquiry page: no link to itself');
    } else {
      assert.equal((bar.match(/class="(?:btn |leaf-btn[" ])/g) || []).length, 2, `${p.path}: two buttons (Plan My Day is the leaf)`);
      if (p.path.startsWith('tours/') && p.path !== 'tours/index.html') {
        assert.match(bar, /href="[^"]*enquire\/\?type=tour&amp;tour=[a-z-]+"[^>]*>[\s\S]*?<span class="leaf-btn__label">Plan My Day<\/span>/, `${p.path}: prefilled tour booking`);
      } else if (p.path.startsWith('packages/') && p.path !== 'packages/index.html') {
        assert.match(bar, /href="[^"]*enquire\/\?type=tour&amp;tour=[a-z-]+(&amp;nights=\d+)?"[^>]*>[\s\S]*?<span class="leaf-btn__label">Plan My Day<\/span>/, `${p.path}: prefilled package booking`);
      } else {
        assert.match(bar, /<span class="leaf-btn__label">Plan My Day<\/span>/, `${p.path}: Plan My Day`);
      }
    }
  }
  const footer = section(render(TOUR, s), '<footer', '</footer>');
  assert.match(footer, new RegExp(`<span class="contact-list__label">Phone</span>\\s*<span class="contact-list__value">${c.phone.display.replace(/\+/g, '\\+')}</span>`));
  assert.match(footer, new RegExp(`href="tel:\\${c.phone.e164}"`));
});

test('the contacts: the published number for calls (5 Nov 2026), WhatsApp unconfirmed; hello@ the primary address and stuart@ the additional one (Good Times, 6 Nov 2026)', () => {
  assert.equal(c.phone.e164, '+27723768432');
  assert.equal(c.phone.display, '+27 72 376 8432');
  assert.equal(c.phone.verified, true);
  assert.equal(c.whatsapp.e164, c.phone.e164, 'the same number, if it takes WhatsApp');
  assert.equal(c.whatsapp.verified, false, 'WhatsApp waits for Good Times to confirm it');
  assert.equal(c.email.address, 'hello@goodtimesincapetown.co.za');
  assert.equal(c.email.verified, true);
  assert.equal(c.emailGeneral.address, 'stuart@goodtimesincapetown.co.za');
  assert.equal(c.emailGeneral.verified, true);
  // The site as configured, in production: the call and the primary address, and nothing unconfirmed.
  const live = variant({ preview: false, contact: c });
  const footer = section(render('index.html', live), '<footer', '</footer>');
  assert.match(footer, /<span class="contact-list__label">Email<\/span>\s*<a class="contact-list__value" href="mailto:hello@goodtimesincapetown\.co\.za">/);
  assert.match(footer, new RegExp(`href="tel:\\${c.phone.e164}"`));
  assert.doesNotMatch(footer, /wa\.me/);
  // The former address is gone everywhere; the additional one is on the contact page only.
  for (const p of pages) {
    const html = layout(p, live);
    assert.doesNotMatch(html, /info@/, `${p.path}: no info@ left`);
    if (p.path !== 'contact/index.html') assert.doesNotMatch(html, /stuart@/, `${p.path}: the additional address belongs to the contact section`);
  }
  // The contact section: both addresses, each with its own label, the primary first.
  const direct = section(render('contact/index.html', live), '<h2>Phone, email and our office</h2>', '<h3>');
  assert.match(direct, /<span class="contact-list__label">Email us<\/span>\s*<a class="contact-list__value" href="mailto:hello@goodtimesincapetown\.co\.za">/);
  assert.match(direct, /<span class="contact-list__label">Email Stuart<\/span>\s*<a class="contact-list__value" href="mailto:stuart@goodtimesincapetown\.co\.za">/);
  assert.ok(direct.indexOf('mailto:hello@') < direct.indexOf('mailto:stuart@'), 'the primary address first');
  // Should the primary address ever be withdrawn, the additional one stands in everywhere, as plain "Email".
  const second = { address: 'second@example.com', label: 'Bookings', verified: true };
  const one = variant({ preview: false, contact: set({ emailGeneral: second }) });
  const single = section(render('index.html', one), '<footer', '</footer>');
  assert.match(single, /<span class="contact-list__label">Email<\/span>\s*<a class="contact-list__value" href="mailto:second@example\.com">/);
  assert.doesNotMatch(single, /hello@/, 'only the verified address');
  // Nowhere is an unconfirmed channel announced as pending
  for (const p of pages) assert.doesNotMatch(layout(p, variant()), /awaiting confirmation|appear here once/, p.path);
});
