/**
 * The Search Console audit of 8 Nov 2026, implemented (docs/seo/GSC_AUDIT_IMPLEMENTATION.md), checked on a production
 * build and a preview build (temporary copies; site/ is left alone). What test/seo.test.mjs and
 * test/production-build.test.mjs already check (unique titles and descriptions, canonicals, parsing JSON-LD, links that
 * land without a redirect, the sitemap's host) is not repeated here. This adds:
 *  - content: the priority pages answer their searches in their openings, with no target phrase dense enough to read as
 *    stuffing; the shark cage diving page promises no sighting, states transport consistently as the add-on it is, and
 *    answers the visitor's questions without repeating itself; the activities are not called private;
 *  - prices: every price a page shows or marks up is a tier of the pricing data (pricing.test.mjs pins the amounts);
 *  - structured data: one organisation, every breadcrumb a built page, nothing rated, no availability; each TouristTrip
 *    names its page, matches its visible itinerary, and a per-day rate says so;
 *  - sitemap: exactly the indexable canonical pages, <loc> only, in a document whose whole shape is checked;
 *  - preview: never indexable, no sitemap;
 *  - booking links keep their tour or transfer; images are described, sized and loaded as they should be.
 */
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, statSync, cpSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ENVIRONMENTS, DOMAIN } from '../scripts/cloudflare/project.mjs';
import { tours, operatorRun } from '../src/data/tours.mjs';
import { packages } from '../src/data/packages.mjs';
import { priceFor } from '../src/data/pricing.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = `https://${DOMAIN.apex}`;
let prod;
let prev;

function build(vars) {
  const work = mkdtempSync(join(tmpdir(), 'gt-gsc-'));
  for (const dir of ['src', 'lib']) cpSync(join(ROOT, dir), join(work, dir), { recursive: true });
  cpSync(join(ROOT, 'package.json'), join(work, 'package.json'));
  execFileSync(process.execPath, ['src/build.mjs'], { cwd: work, env: { ...process.env, ...vars, VERCEL: '1' }, stdio: 'pipe' });
  process.on('exit', () => rmSync(work, { recursive: true, force: true }));
  return join(work, 'site');
}
before(() => {
  prod = build(ENVIRONMENTS.production.vars);
  prev = build(ENVIRONMENTS.preview.vars);
});

const files = (dir) => readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? files(join(dir, n)) : [join(dir, n)]));
const read = (dir, p) => readFileSync(join(dir, p), 'utf8');
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const text = (h) => decode(h.replace(/<(script|style|svg)[\s\S]*?<\/\1>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const mainOf = (h) => (/<main[\s\S]*?<\/main>/.exec(h) || [''])[0];
const meta = (h, re) => (re.exec(h) || [])[1] ?? null;
const parsed = new Map();
/** Every built HTML page outside /media/, with its parsed head and graph (read once per build). */
function pages(dir) {
  if (!parsed.has(dir)) {
    parsed.set(
      dir,
      files(dir)
        .filter((f) => f.endsWith('.html') && !relative(dir, f).startsWith('media/'))
        .map((f) => {
          const rel = relative(dir, f);
          const h = readFileSync(f, 'utf8');
          const ld = meta(h, /<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
          return {
            path: `/${rel.replace(/index\.html$/, '')}`,
            h,
            title: decode(meta(h, /<title>([\s\S]*?)<\/title>/) || ''),
            description: decode(meta(h, /<meta name="description" content="([^"]*)"/) || ''),
            canonical: meta(h, /<link rel="canonical" href="([^"]*)"/),
            robots: meta(h, /<meta name="robots" content="([^"]*)"/),
            ld,
            graph: ld ? JSON.parse(ld)['@graph'] : [],
          };
        }),
    );
  }
  return parsed.get(dir);
}
const indexable = (dir) => pages(dir).filter((p) => p.robots === 'index,follow');
const page = (dir, path) => pages(dir).find((p) => p.path === path);
const tour = (slug) => tours.find((t) => t.slug === slug);
/** _redirects' sources, each as a matcher for the paths it catches. */
function redirectSources(dir) {
  return read(dir, '_redirects')
    .split('\n')
    .filter((l) => l.trim() && !l.startsWith('#'))
    .map((l) => l.trim().split(/\s+/)[0])
    .map((from) => new RegExp(`^${from.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/:[a-z]+/gi, '[^/]+')}$`));
}
/** The booking form's summary card for a tour (pages/enquire.mjs), as text. */
const bookingCard = (slug) => {
  const h = page(prod, '/enquire/').h;
  const at = h.indexOf(`data-tour-card="${slug}"`);
  assert.ok(at > 0, `${slug}: a booking card`);
  return text(h.slice(at, h.indexOf('data-tour-card=', at + 20)));
};

/* ---------------- titles and content ---------------- */

test('the priority pages keep their approved titles; transfers is the private airport transfer page', () => {
  const titles = {
    '/tours/cape-town-city-private-tour/': 'Cape Town City Private Tour: Castle, District Six & Bo-Kaap | Good Times',
    '/tours/shark-cage-diving/': 'Shark Cage Diving in Gansbaai from Cape Town | Good Times',
    '/tours/township-private-tour/': 'Township Private Tour: Langa, Cape Town | Good Times',
    '/tours/cape-peninsula-private-tour/': 'Cape Peninsula Private Tour: Cape Point & Boulders Penguins | Good Times',
    '/packages/garden-route-private-tour/': 'Garden Route Private Tour from Cape Town: 3+ Days | Good Times',
    '/tours/cape-agulhas-private-tour/': 'Cape Agulhas Private Tour from Cape Town | Good Times',
    '/transfers/': 'Private Airport Transfers in Cape Town | Good Times',
  };
  for (const [path, title] of Object.entries(titles)) assert.equal(page(prod, path).title, title, path);
  assert.deepEqual([...page(prod, '/transfers/').h.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/g)].map((m) => text(m[1])), ['Private Airport Transfers']);
});

/** How often a phrase occurs in a page's visible main text, and how many words that text has. */
const usage = (h, phrase) => {
  const t = text(mainOf(h)).toLowerCase();
  return { n: (t.match(new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length, words: t.split(' ').length };
};
const intro = (h) => text((/<div class="prose">([\s\S]*?)<\/div>/.exec(mainOf(h)) || ['', ''])[1]);

test('the priority pages answer their searches in their openings, and no target phrase is dense enough to read as stuffing', () => {
  const city = page(prod, '/tours/cape-town-city-private-tour/');
  assert.match(intro(city.h), /^Explore central Cape Town on a private guided tour/);
  assert.match(city.description, /^A private guided tour of central Cape Town/);
  assert.match(intro(page(prod, '/tours/township-private-tour/').h), /a private township tour in Cape Town: half a day in Langa/);
  assert.match(intro(page(prod, '/tours/cape-agulhas-private-tour/').h), /a private day trip from Cape Town/);
  // Present, and under one use per hundred words of the page's own text: a ceiling far above natural use (the place
  // name included, which the shark cage diving page once repeated fifteen times)
  for (const [path, phrase] of [
    ['/tours/cape-town-city-private-tour/', 'central cape town'],
    ['/tours/township-private-tour/', 'private township tour'],
    ['/tours/cape-agulhas-private-tour/', 'day trip from cape town'],
    ['/tours/shark-cage-diving/', 'shark cage diving'],
    ['/tours/shark-cage-diving/', 'gansbaai'],
    ['/transfers/', 'private airport transfer'],
  ]) {
    const { n, words } = usage(page(prod, path).h, phrase);
    assert.ok(n >= 1, `${path}: “${phrase}” is used`);
    assert.ok(n / words <= 0.01, `${path}: “${phrase}” ${n} times in ${words} words`);
  }
  // The Peninsula and the transfers pages already said what their searches look for; it stays said.
  const peninsula = text(mainOf(page(prod, '/tours/cape-peninsula-private-tour/').h));
  for (const w of ['Cape Point', 'Cape Peninsula', 'Chapman’s Peak', 'Boulders Beach', 'Pickup from your accommodation']) assert.ok(peninsula.includes(w), `Peninsula: ${w}`);
  const transfers = text(mainOf(page(prod, '/transfers/').h));
  for (const w of ['Cape Town International Airport', 'Airport arrival', 'Airport departure', 'name board', 'not a confirmed booking']) assert.ok(transfers.includes(w), `transfers: ${w}`);
});

test('shark cage diving: no sighting promised anywhere, transport consistently the add-on it is, the questions answered without repeating the page', () => {
  const p = page(prod, '/tours/shark-cage-diving/');
  const main = text(mainOf(p.h));
  const all = `${main} ${p.title} ${p.description} ${p.ld}`;
  assert.doesNotMatch(all, /great white/i, 'no species promised');
  // In the site's own words (the home page: "luck, never a promise"); the browser suite keeps "guarantee" off every page
  assert.match(main, /no sighting can be promised/);
  assert.doesNotMatch(all, /guarantee/i);
  for (const path of ['/', '/services/', '/tours/']) assert.doesNotMatch(text(mainOf(page(prod, path).h)), /great white/i, path);

  // Transport: never included, never a stop, and every sentence that mentions it says it is the add-on
  const t = tour('shark-cage-diving');
  assert.ok(!t.included.some((x) => /transport|pickup|transfer/i.test(x)), 'transport is not among the inclusions');
  assert.ok(!t.itinerary.some((s) => /pickup|drive/i.test(s.stop)), 'no pickup or drive listed as a stop');
  assert.ok(!t.intro.join(' ').includes('After pickup'), 'the opening no longer begins the day with a pickup');
  const own = [...t.intro, t.pickup, ...t.notIncluded, ...t.itinerary.map((s) => s.stop), ...t.faq.map((f) => f.a)];
  const aboutTransport = own.flatMap((s) => s.split(/(?<=[.:;])\s+/)).filter((s) => /transport|pickup/i.test(s));
  assert.ok(aboutTransport.length >= 3, aboutTransport.join(' / '));
  for (const s of aboutTransport) assert.match(s, /add-on|not included|can be added/, s);
  for (const s of [t.intro[1], t.pickup]) assert.ok(main.includes(s), `on the page: ${s}`);
  // The booking form's card says so too (pages/enquire.mjs reads the pickup answer)
  assert.match(bookingCard('shark-cage-diving'), /Transport as an add-on/);

  // The visitor's questions: five here, transport in the Pickup block beside them, the weather and the booking in the
  // Cancellation and Booking blocks; the operator's own requirements as the official page states them
  for (const q of ['What is shark cage diving?', 'Where does it take place?', 'What equipment is provided?', 'Will we see sharks?', 'Are there participation requirements?']) {
    assert.ok(p.h.includes(`<h3>${q}</h3>`), q);
  }
  for (const block of ['Pickup', 'Booking', 'Cancellation']) assert.ok(p.h.includes(`<h3>${block}</h3>`), block);
  assert.match(t.faq.find((f) => /participation/.test(f.q)).a, /age, health and weight requirements/);

  // No passage of eight words said twice in the page's own copy (it once said "for a chance to see sharks up close" three times)
  const words = (s) => s.toLowerCase().replace(/[^a-z0-9’' ]+/g, ' ').split(/\s+/).filter(Boolean);
  const seen = new Map();
  [...t.intro, ...t.highlights, ...t.itinerary.map((s) => s.stop), t.pickup, ...t.faq.flatMap((f) => [f.q, f.a])].forEach((field, i) => {
    const w = words(field);
    for (let j = 0; j + 8 <= w.length; j++) {
      const g = w.slice(j, j + 8).join(' ');
      assert.ok(!seen.has(g) || seen.get(g) === i, `said twice: “${g}”`);
      seen.set(g, i);
    }
  });
});

test('the adventure activities are what their official pages say, run by an accredited specialist, and never called private', () => {
  const activities = tours.filter(operatorRun);
  assert.deepEqual(activities.map((t) => t.slug).sort(), ['quad-biking', 'shark-cage-diving', 'sky-diving']);
  for (const t of activities) {
    const main = text(mainOf(page(prod, `/tours/${t.slug}/`).h));
    assert.match(main, /Run by an accredited specialist/, t.slug);
    assert.doesNotMatch(main, /Private: only your group|Private activity|Every tour is private/, t.slug);
    assert.match(main, /The activity as the operator runs it/, `${t.slug}: its itinerary note`);
    assert.match(bookingCard(t.slug), /Run by an accredited specialist/, `${t.slug}: its booking card`);
    assert.doesNotMatch(bookingCard(t.slug), /Private/, `${t.slug}: its booking card`);
    assert.ok(t.confirm.some((c) => /Whether the activity itself is private/.test(c)), `${t.slug}: the owner's question`);
  }
  // The activity cards on the tours page carry no privacy line; the tours' cards and pages still do
  const cards = [...page(prod, '/tours/').h.matchAll(/<article class="card"[\s\S]*?<\/article>/g)].map((m) => m[0]);
  for (const t of tours) {
    const card = cards.find((c) => c.includes(`tours/${t.slug}/"`));
    assert.ok(card, `${t.slug}: a card on the tours page`);
    assert.equal(/Private<\/span>/.test(card), !operatorRun(t), `${t.slug}: the card's privacy line`);
  }
  assert.match(text(mainOf(page(prod, '/tours/cape-town-city-private-tour/').h)), /Private: only your group/);
});

test('the Garden Route: private, three days or more, priced per day, departure by arrangement, accommodation not included', () => {
  const main = text(mainOf(page(prod, '/packages/garden-route-private-tour/').h));
  assert.match(main, /three days or more/i);
  assert.match(main, /per day/i);
  // The official page: "Departure: Flexible, by arrangement", "Return: Flexible, by arrangement" (no pickup is stated)
  assert.match(main, /Departure from Cape Town and your return are flexible, by arrangement\./);
  assert.ok(packages.find((p) => p.slug === 'garden-route-private-tour').notIncluded.includes('Accommodation'));
  assert.doesNotMatch(main, /accommodation (is )?included/i);
});

/* ---------------- prices ---------------- */

test('every price a tour, package or the transfers page shows or marks up is a tier of the pricing data', () => {
  // The rendering agrees with src/data/pricing.mjs; test/pricing.test.mjs pins the approved amounts themselves
  const priced = [...tours.filter((t) => t.price).map((t) => [`/tours/${t.slug}/`, t.slug]), ...packages.map((p) => [`/packages/${p.slug}/`, p.slug])];
  for (const [path, slug] of priced) {
    const p = page(prod, path);
    const rate = priceFor(slug, '');
    for (const tier of rate.tiers) assert.ok(p.h.includes(`data-money="${tier.amount}"`), `${path}: R${tier.amount} shown`);
    const offers = [].concat(p.graph.find((n) => n['@type'] === 'TouristTrip').offers);
    assert.deepEqual(offers.map((o) => [o.price, o.priceCurrency, o.eligibleQuantity.maxValue]), rate.tiers.map((t) => [String(t.amount), 'ZAR', t.max]), `${path}: offers`);
  }
  const transfers = page(prod, '/transfers/').h;
  for (const tier of priceFor('airport-private-transfer', '').tiers) assert.ok(transfers.includes(`data-money="${tier.amount}"`), `transfers: R${tier.amount}`);
});

/* ---------------- structured data ---------------- */

test('structured data: one organisation, every breadcrumb a built page, nothing rated and no availability claimed', () => {
  const built = new Set(pages(prod).map((p) => p.path));
  for (const p of pages(prod)) {
    const orgs = p.graph.filter((n) => n['@type'] === 'TravelAgency');
    assert.equal(orgs.length, 1, `${p.path}: one organisation`);
    assert.equal(orgs[0]['@id'], `${ORIGIN}/#organization`);
    assert.equal(orgs[0].name, 'Good Times in Cape Town');
    for (const item of p.graph.find((n) => n['@type'] === 'BreadcrumbList')?.itemListElement || []) assert.ok(built.has(new URL(item.item).pathname), `${p.path}: breadcrumb ${item.item} is a page`);
    assert.doesNotMatch(p.ld || '', /aggregateRating|"Review"|"Rating"/, `${p.path}: no rating or review markup`);
    assert.doesNotMatch(p.ld || '', /"availability"|"validThrough"|InStock|"availabilityStarts"/, `${p.path}: no availability asserted`);
  }
});

test('each TouristTrip: its page’s URL, the organisation as provider, the visible itinerary in order, and a per-day rate marked as one', () => {
  for (const t of tours) {
    const p = page(prod, `/tours/${t.slug}/`);
    const trip = p.graph.find((n) => n['@type'] === 'TouristTrip');
    assert.equal(trip.url, p.canonical, `${t.slug}: url`);
    assert.equal(trip.provider['@id'], `${ORIGIN}/#organization`);
    const visible = [...p.h.matchAll(/<span class="itinerary__stop">([\s\S]*?)<\/span>/g)].map((m) => decode(m[1]));
    assert.deepEqual(trip.itinerary?.itemListElement.map((i) => i.item.name) || [], visible, `${t.slug}: itinerary = what the page lists`);
  }
  const gr = page(prod, '/packages/garden-route-private-tour/').graph.find((n) => n['@type'] === 'TouristTrip');
  assert.equal(gr.url, `${ORIGIN}/packages/garden-route-private-tour/`);
  assert.deepEqual([].concat(gr.offers)[0].priceSpecification, { '@type': 'UnitPriceSpecification', referenceQuantity: { '@type': 'QuantitativeValue', value: 1, unitCode: 'DAY' }, price: 8500, priceCurrency: 'ZAR' });
  // A rate per group stays a rate per group; a starting price keeps its minimum
  const offersOf = (slug) => [].concat(page(prod, `/tours/${slug}/`).graph.find((n) => n['@type'] === 'TouristTrip').offers);
  assert.ok(offersOf('cape-town-city-private-tour').every((o) => !o.priceSpecification), 'per-group rates carry no specification');
  assert.deepEqual(offersOf('private-cape-town-experience')[0].priceSpecification, { '@type': 'PriceSpecification', minPrice: 6000, priceCurrency: 'ZAR' });
});

/* ---------------- sitemap and preview ---------------- */

test('the sitemap: well formed by its exact shape, <loc> only, exactly the indexable canonical pages, no redirect source', () => {
  const xml = read(prod, 'sitemap.xml');
  // The whole document matches this grammar, and a <loc> holds only URL-safe characters (nothing to escape), so it is
  // well formed by construction; no <lastmod>, <changefreq> or <priority> can hide anywhere in it
  const origin = ORIGIN.replace(/[.]/g, '\\.');
  assert.match(xml, new RegExp(`^<\\?xml version="1\\.0" encoding="UTF-8"\\?>\\n<urlset xmlns="http://www\\.sitemaps\\.org/schemas/sitemap/0\\.9">\\n(  <url><loc>${origin}/[a-z0-9/-]*</loc></url>\\n)+</urlset>\\n$`));
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert.equal(new Set(locs).size, locs.length, 'no duplicates');
  assert.deepEqual([...locs].sort(), indexable(prod).map((p) => p.canonical).sort(), 'exactly the indexable canonical pages');
  const sources = redirectSources(prod);
  for (const l of locs) assert.ok(!sources.some((re) => re.test(new URL(l).pathname)), `${l} is not a redirect source`);
  for (const bad of ['/admin', '/api', '/404', '/design-system', '/media/']) assert.ok(!locs.some((l) => new URL(l).pathname.startsWith(bad)), bad);
});

test('a preview is never indexable: robots.txt shuts everything, no sitemap, every page noindex', () => {
  assert.equal(read(prev, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
  assert.equal(existsSync(join(prev, 'sitemap.xml')), false);
  for (const p of pages(prev)) assert.equal(p.robots, 'noindex,nofollow', p.path);
  assert.match(read(prev, '_headers'), /X-Robots-Tag: noindex/);
});

/* ---------------- booking links ---------------- */

test('booking links keep their service: every tour’s booking card and header button, and the transfer actions', () => {
  // (That every internal link lands on a page without a redirect: test/seo.test.mjs)
  for (const t of tours) {
    const h = page(prod, `/tours/${t.slug}/`).h;
    assert.ok(h.includes(`<input type="hidden" name="tour" value="${t.slug}">`), `${t.slug}: the booking card carries the tour`);
    // The navbar's booking action (Book Your Adventure since 8 Nov 2026) opens the form on this tour
    assert.match(h, new RegExp(`<a class="btn gt-button gt-button--primary header-cta" href="(?:\\.\\./)*enquire/\\?type=tour&amp;tour=${t.slug}"`), `${t.slug}: the header's booking button carries the tour`);
  }
  const transfers = page(prod, '/transfers/').h;
  for (const type of ['airport-arrival', 'airport-departure']) assert.ok(transfers.includes(`enquire/?type=transfer&amp;transfer=${type}`), `transfers: ${type}`);
});

/* ---------------- images ---------------- */

test('images: alt text present and specific, dimensions set, below-the-fold images lazy, one high-priority image, each product’s photograph described', () => {
  const generic = /^(image|photo|picture|img|untitled|graphic|banner|hero)\s*\d*$/i;
  for (const p of pages(prod)) {
    for (const [, a] of p.h.matchAll(/<img\s([^>]*)>/g)) {
      const alt = /\balt="([^"]*)"/.exec(a);
      assert.ok(alt, `${p.path}: every image has an alt attribute (${a.slice(0, 80)})`);
      assert.doesNotMatch(alt[1], generic, `${p.path}: “${alt[1]}” describes nothing`);
      assert.doesNotMatch(alt[1], /\.(jpe?g|png|webp|avif)\b/i, `${p.path}: no file name as alt text`);
      assert.match(a, /\bwidth="\d+"/, `${p.path}: width (${a.slice(0, 80)})`);
      assert.match(a, /\bheight="\d+"/, `${p.path}: height (${a.slice(0, 80)})`);
    }
    // Below the fold, a photograph loads lazily. Exempt: the header (logos), the page's LCP image (eager, high
    // priority), a carousel's visible first slide (low priority, deliberately not lazy), a placeholder whose file
    // arrives by data-src as it scrolls near, and thumbnails too small to matter.
    for (const [, a] of p.h.slice(p.h.indexOf('<main')).matchAll(/<img\s([^>]*)>/g)) {
      if (/\bsrc="data:/.test(a) || /fetchpriority="(high|low)"|loading="eager"/.test(a)) continue;
      if (Number(/\bwidth="(\d+)"/.exec(a)[1]) * Number(/\bheight="(\d+)"/.exec(a)[1]) <= 20000) continue;
      assert.match(a, /loading="lazy"/, `${p.path}: below-the-fold images load lazily (${a.slice(0, 90)})`);
    }
    assert.ok((p.h.match(/<img\s[^>]*fetchpriority="high"/g) || []).length <= 1, `${p.path}: at most one high-priority image`);
  }
  // A tour's or a package's own photograph is the page's main image, not a backdrop: it is described, in either hero form
  for (const path of [...tours.map((t) => `/tours/${t.slug}/`), ...packages.map((p) => `/packages/${p.slug}/`)]) {
    const hero = /<img\s[^>]*fetchpriority="high"[^>]*>/.exec(mainOf(page(prod, path).h))?.[0];
    assert.ok(hero, `${path}: a main photograph`);
    assert.match(hero, /\balt="[^"]{20,}"/, `${path}: its main photograph is described`);
  }
});
