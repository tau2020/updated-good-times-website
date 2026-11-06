/**
 * The call-to-action map: "Make It Yours" is the signature on the global booking action only
 * (header, Travel Concierge, phone menu, phone bar, footer), always leading to the page's own enquiry link (a tour's or a
 * package's prefilled one on its page); every other button names what it does and keeps its destination and parameters.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { site } from '../src/data/site.mjs';
import { layout } from '../src/partials/layout.mjs';
import { SIGNATURE_CTA, SIGNATURE_DESC_ID } from '../src/partials/ui.mjs';

const dir = new URL('../src/pages/', import.meta.url);
const pages = [];
for (const f of readdirSync(dir).filter((f) => f.endsWith('.mjs')).sort()) {
  const mod = await import(new URL(f, dir));
  pages.push(...(Array.isArray(mod.pages) ? mod.pages : [mod.page]).filter(Boolean));
}
const byPath = (p) => pages.find((x) => x.path === p);
const render = (path, s = site) => layout(byPath(path), s);
/** The page's own content, without the header, the concierge, the menu or the footer that every page shares. */
const mainOf = (html) => html.slice(html.indexOf('<main'), html.indexOf('</main>'));
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** The anchor or button whose visible words are exactly `label` (tags inside allowed), as its opening tag. */
const control = (html, label) => {
  const re = new RegExp(`<(a|button)\\b([^>]*)>(?:<[^>]+>)*\\s*${esc(label)}\\s*(?:<span class="visually-hidden">[^<]*</span>)?(?:</span>)?</\\1>`, 'g');
  return [...html.matchAll(re)].map((m) => m[2]);
};
const hrefOf = (attrs) => (/href="([^"]*)"/.exec(attrs) || [])[1]?.replace(/&amp;/g, '&').replace(/^(\.\.\/)+/, '');

test('the signature reads "Make It Yours" in the header, the concierge, the phone menu, the phone bar and the footer, each to the page’s booking link', () => {
  const verified = { ...site, contact: { ...site.contact, whatsapp: { ...site.contact.whatsapp, verified: true } } };
  for (const p of pages) {
    const html = layout(p, verified);
    const book = (p.enquireHref || 'enquire/').replace(/&amp;/g, '&');
    const header = /<a class="btn-coin header-cta"([^>]*)>/.exec(html)?.[1] || '';
    const concierge = /<a class="btn-coin gt-concierge-panel__cta"([^>]*)>/.exec(html)?.[1] || '';
    const drawer = /<div class="drawer__footer">\s*<a class="[^"]*"([^>]*)><span>([^<]*)<\/span>/.exec(html) || [];
    assert.equal(hrefOf(header), book, `${p.path}: header`);
    assert.equal(hrefOf(concierge), book, `${p.path}: concierge`);
    assert.equal(hrefOf(drawer[1] || ''), book, `${p.path}: phone menu`);
    assert.equal(drawer[2], SIGNATURE_CTA, `${p.path}: phone menu label`);
    assert.match(html, new RegExp(`<span class="btn-coin__label">${SIGNATURE_CTA}</span></a>`), `${p.path}: coin label`);
    const footer = html.slice(html.indexOf('id="footer-company"'), html.indexOf('id="footer-legal"'));
    assert.equal(hrefOf(control(footer, SIGNATURE_CTA)[0] || ''), book, `${p.path}: footer`);
    if (p.path !== 'enquire/index.html') {
      const bar = html.slice(html.indexOf('data-contact-bar'), html.indexOf('</div>', html.indexOf('data-contact-bar')));
      assert.equal(hrefOf(control(bar, SIGNATURE_CTA)[0] || ''), book, `${p.path}: phone bar`);
    }
    // Every signature link is described by the one hidden line, which exists once on the page
    const uses = [...html.matchAll(new RegExp(`>(?:<span[^>]*>)*${SIGNATURE_CTA}<`, 'g'))].length;
    assert.ok(uses >= 4, `${p.path}: ${uses} signature links`);
    assert.equal((html.match(new RegExp(`aria-describedby="${SIGNATURE_DESC_ID}"`, 'g')) || []).length, uses, `${p.path}: each one described`);
    assert.equal((html.match(new RegExp(`<p id="${SIGNATURE_DESC_ID}" hidden>`, 'g')) || []).length, 1, `${p.path}: one description`);
    assert.doesNotMatch(html, /Start Planning|Plan My Journey|Book Now/i, `${p.path}: retired labels`);
  }
});

test('the signature never labels a form submission or a wizard step', () => {
  for (const p of pages) {
    const html = render(p.path);
    for (const m of html.matchAll(/<button\b[^>]*>[\s\S]*?<\/button>/g)) assert.doesNotMatch(m[0], new RegExp(SIGNATURE_CTA), `${p.path}: ${m[0].slice(0, 80)}`);
  }
  const enquire = render('enquire/index.html');
  assert.match(enquire, /<button type="submit"[^>]*data-submit[^>]*>.*<span data-submit-label>Send Enquiry<\/span><\/button>/);
  const js = readFileSync(new URL('../src/assets/js/enquiry.js', import.meta.url), 'utf8');
  assert.match(js, /'Send Transfer Enquiry' : pkg \? 'Send Multi-day Enquiry' : t === 'tour' \? 'Send Tour Enquiry' : 'Send Enquiry'/);
});

test('home: the hero, the four ways in, the closing actions and the concierge cards keep their routes and parameters', () => {
  const html = render('index.html');
  // The hero's one call to action (test/hero.test.mjs has the rest of the hero)
  assert.deepEqual([...html.matchAll(/<a class="btn-champagne hero__cta" href="([^"]*)" data-intro>([\s\S]*?)<\/a>/g)].map((m) => [m[2].replace(/<[^>]+>/g, ''), m[1]]), [
    ['Good Times start Here!', 'tours/'],
  ]);
  const ways = [...html.matchAll(/<h3 class="lc-way__name"><a href="([^"]*)">([^<]*)<\/a><\/h3>[\s\S]*?<p class="lc-way__go"><span>([^<]*)<\/span><\/p>/g)].map((m) => [m[2], m[3], m[1].replace(/&amp;/g, '&')]);
  assert.deepEqual(ways, [
    ['Private Tours', 'Explore Tours', 'tours/'],
    ['Airport Transfers', 'Arrange a Transfer', 'transfers/#airport'],
    ['Adventure Activities', 'Add an Adventure', 'tours/#adventure'],
    ['Custom Journeys', 'Tailor Your Journey', 'enquire/?type=tour&tour=custom'],
  ]);
  assert.match(html, /<a class="lc-way__extra" href="packages\/">The Garden Route Tour<\/a>/);
  assert.equal(hrefOf(control(html.slice(html.indexOf('lc-ways__book')), 'Plan My Day')[0]), 'enquire/', '04 closes with Plan My Day (an enquiry, never a booking)');
  assert.equal(hrefOf(control(html.slice(html.indexOf('lc-ease__foot')), 'Get a Quote')[0]), 'enquire/', '08 closes with Get a Quote');
  assert.match(html, /href="faq\/"><span class="lc-note__label">Questions first\? Read the FAQ<\/span>/);
  const invite = html.slice(html.indexOf('id="invite-title"'));
  assert.equal(hrefOf(control(invite, 'Plan My Day')[0]), 'enquire/?type=tour');
  assert.equal(hrefOf(control(invite, 'Arrange a Transfer')[0]), 'enquire/?type=transfer&transfer=airport-arrival');
  // The concierge and the phone menu name each card by its action, to the same routes
  const cards = [...html.matchAll(/<p class="lc-invite__name"><a href="([^"]*)">([^<]*)<\/a><\/p>/g)].map((m) => [m[2], m[1].replace(/&amp;/g, '&')]);
  assert.deepEqual(cards, ways.map(([, action, href]) => [action, href]));
  const rows = [...html.matchAll(/<a class="gt-concierge-row" href="([^"]*)">[\s\S]*?<span class="gt-concierge-row__name">([^<]*)<\/span>/g)].map((m) => [m[2], m[1].replace(/&amp;/g, '&')]);
  assert.deepEqual(rows, cards);
});

test('tours, packages and transfers: context-specific actions keep their prefilled enquiries', () => {
  const tour = mainOf(render('tours/cape-town-city-private-tour/index.html'));
  assert.match(tour, /<input type="hidden" name="tour" value="cape-town-city-private-tour">[\s\S]*?<button type="submit" class="btn gt-button gt-button--primary gt-button--block">Request a Quote<\/button>/);
  assert.equal(hrefOf(control(tour, 'Explore Tours')[0]), 'tours/', 'similar tours: Explore Tours');
  const list = mainOf(render('tours/index.html'));
  assert.equal(hrefOf(control(list, 'Explore Multi-day Tours')[0]), 'packages/');
  assert.match(list, /href="\.\.\/enquire\/\?type=tour&amp;tour=custom" data-carry-plan>Plan a custom private day<\/a>/);

  // The multi-day tour: its own enquiry, and the nights left to the traveller ("Not sure yet" first; three days or more)
  const pkg = mainOf(render('packages/garden-route-private-tour/index.html'));
  assert.match(pkg, /<input type="hidden" name="tour" value="garden-route-private-tour">[\s\S]*?<select class="sfield__control" name="nights"[^>]*><option value="">Not sure yet<\/option><option value="2">2 nights<\/option>[\s\S]*?<\/select>[\s\S]*?<button type="submit"[^>]*>Get a Personalised Quote<\/button>/);
  assert.doesNotMatch(pkg, /<input type="hidden" name="nights"/, 'no fixed length');
  assert.equal(hrefOf(control(pkg, 'Plan a custom multi-day trip')[0]), 'enquire/?type=tour&tour=custom');
  assert.equal(hrefOf(control(pkg, 'Explore Tours')[0]), 'tours/');

  const transfers = mainOf(render('transfers/index.html'));
  assert.equal(hrefOf(control(transfers, 'Arrange a Transfer')[0]), 'enquire/?type=transfer&transfer=airport-arrival');
  assert.equal(hrefOf(control(transfers, 'Airport departure')[0]), 'enquire/?type=transfer&transfer=airport-departure');
  assert.equal(hrefOf(control(transfers, 'Something else')[0]), 'enquire/?type=transfer&transfer=other');
  assert.doesNotMatch(transfers, /safari/i, 'no safari transfers');
  assert.equal(hrefOf(control(transfers, 'Get a Quote')[0]), 'enquire/?type=transfer');
});

test('contact, about, destinations, reviews, FAQ and 404: each action says what it does and goes where it says', () => {
  const routes = {
    'contact/index.html': [['Request Your Tour', 'enquire/?type=tour'], ['Arrange a Transfer', 'enquire/?type=transfer'], ['Read Our FAQ', 'faq/'], ['Read Reviews', 'reviews/']],
    'about/index.html': [['Explore Tours', 'tours/'], ['Contact Us', 'contact/']],
    'destinations/index.html': [['Tailor Your Journey', 'enquire/?type=tour&tour=custom'], ['Arrange a Transfer', 'enquire/?type=transfer&transfer=other']],
    'reviews/index.html': [['Explore Tours', 'tours/'], ['Get a Quote', 'enquire/']],
    'faq/index.html': [['Explore Tours', 'tours/']],
    '404.html': [['Go to the Home Page', './'], ['Explore Tours', 'tours/']],
  };
  for (const [path, list] of Object.entries(routes)) {
    const main = mainOf(render(path));
    for (const [label, href] of list) assert.equal(hrefOf(control(main, label)[0] || ''), href, `${path}: ${label}`);
  }
});
