import { esc, icon, brandMark, button, coinButton, contactList, waHref, telHref, SIGNATURE_CTA, SIGNATURE_ATTRS, signatureDesc } from './ui.mjs';
import { conciergeTrigger, conciergePanel, drawerServices } from './living-cape.mjs';
import { aircraftDock, aircraftFlight, dockBox } from './aircraft.mjs';
import { tours } from '../data/tours.mjs';
import { services } from '../data/transfers.mjs';

/**
 * LINK_STYLE=files writes explicit `index.html` hrefs (for hosts or file://
 * previews without directory indexes). Default "pretty" keeps clean URLs.
 */
const LINK_STYLE = (process.env.LINK_STYLE || 'pretty').trim();

/** The only executable inline script. build.mjs hashes it for the Content-Security-Policy. */
export const INLINE_GATE =
  "(function(h){h.classList.replace('no-js','js');if(!matchMedia('(prefers-reduced-motion: reduce)').matches&&!/[?&]nomotion\\b/.test(location.search))h.classList.add('cine')})(document.documentElement)";

function jsonLd(page, site) {
  const org = {
    '@type': 'TravelAgency',
    '@id': `${site.url}/#organization`,
    name: site.name,
    url: `${site.url}/`,
    logo: `${site.url}/assets/brand/android-chrome-512.png`,
    image: `${site.url}/assets/img/og-default.jpg`,
    description: 'Private, guide-led tours of Cape Town and the Western Cape since 2014: the Cape Peninsula, the city, Langa, the Winelands, the coast and the Garden Route, plus airport transfers.',
    foundingDate: String(site.founded),
    founder: { '@type': 'Person', name: site.founder },
    areaServed: { '@type': 'Place', name: 'Cape Town and the Western Cape, South Africa' },
    sameAs: Object.values(site.social).filter(Boolean),
  };
  if (site.contact.phone.verified) org.telephone = site.contact.phone.e164;
  if (site.contact.email.verified) org.email = site.contact.email.address;
  const office = site.contact.office;
  if (office?.verified) {
    org.address = { '@type': 'PostalAddress', streetAddress: office.street, addressLocality: office.locality, addressRegion: office.region, postalCode: office.postalCode, addressCountry: office.country };
    org.hasMap = office.mapsUrl;
  }
  const web = { '@type': 'WebSite', '@id': `${site.url}/#website`, url: `${site.url}/`, name: site.name, publisher: { '@id': `${site.url}/#organization` }, inLanguage: site.locale };
  const url = `${site.url}/${page.path === 'index.html' ? '' : page.path.replace(/index\.html$/, '')}`;
  const pageNode = { '@type': 'WebPage', '@id': `${url}#webpage`, url, name: page.title, description: page.description, isPartOf: { '@id': `${site.url}/#website` } };
  const crumbs = page.breadcrumbs
    ? {
        '@type': 'BreadcrumbList',
        itemListElement: page.breadcrumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.label, item: `${site.url}/${c.href === './' ? '' : c.href}` })),
      }
    : null;
  const graph = [org, web, pageNode, crumbs, ...(page.schema || [])].filter(Boolean);
  // Page schema may reference the organisation as `__SITE__/#organization`.
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replaceAll('__SITE__', site.url).replace(/</g, '\\u003c');
}

/** Prefix relative URLs for documents in subfolders; optionally append index.html. */
function relativize(html, path) {
  const depth = path.split('/').length - 1;
  const root = '../'.repeat(depth);
  const isRel = (u) => u !== undefined && !/^(https?:|mailto:|tel:|#|data:|\/\/|\/|javascript:)/i.test(u);
  const files = (u) => {
    if (LINK_STYLE !== 'files') return u;
    const m = /^([^?#]*)(.*)$/.exec(u);
    return m[1] === '' || m[1].endsWith('/') ? `${m[1]}index.html${m[2]}` : u;
  };
  const fix = (u, attr) => {
    if (!isRel(u)) return u;
    const v = attr === 'href' ? files(u) : u;
    return depth ? root + v : v;
  };
  const fixList = (v) =>
    v
      .split(',')
      .map((part) => {
        const [u, ...rest] = part.trim().split(/\s+/);
        return fix(u, 'srcset') + (rest.length ? ' ' + rest.join(' ') : '');
      })
      .join(', ');
  return html.replace(/\b(href|src|srcset|imagesrcset|data-mp4|data-webm|data-mp4-mobile|data-webm-mobile|action)="([^"]*)"/g, (m, attr, val) =>
    attr === 'srcset' || attr === 'imagesrcset' ? `${attr}="${fixList(val)}"` : `${attr}="${fix(val, attr === 'action' ? 'href' : attr)}"`,
  );
}

export function layout(page, site) {
  return relativize(render(page, site), page.path);
}

/**
 * Phones and tablets (below 64em): once a direct line is verified, every page gets a
 * bar with two equal buttons, WhatsApp (or Call, while WhatsApp is unconfirmed) and the
 * signature Plan My Day (tour and package pages keep their prefilled booking link). On the
 * booking page itself the second button calls instead of linking to the page you are on.
 */
function contactBar(page, site) {
  const { phone, whatsapp } = site.contact;
  if (!whatsapp.verified && !phone.verified) return '';
  const call = phone.verified ? `<a class="btn gt-button gt-button--secondary" href="${telHref(phone)}">${icon('phone')}<span>Call</span></a>` : '';
  const first = whatsapp.verified
    ? `<a class="btn gt-button gt-button--secondary" href="${waHref(whatsapp)}" rel="noopener" target="_blank">${icon('whatsapp')}<span>WhatsApp</span><span class="visually-hidden"> (opens in a new tab)</span></a>`
    : call;
  const second =
    page.nav === 'enquire/'
      ? whatsapp.verified ? call : ''
      : button({ href: page.enquireHref || 'enquire/', label: SIGNATURE_CTA, variant: 'gold', attrs: SIGNATURE_ATTRS });
  // On the home page the bar waits until the hero has scrolled away (main.js), so it never covers the hero
  const afterHero = page.path === 'index.html';
  return `<div class="mobile-cta mobile-cta--contact${afterHero ? '' : ' is-visible'}" data-contact-bar${afterHero ? ' data-contact-bar-after-hero' : ''}>
  ${first}
  ${second}
</div>`;
}

/**
 * The footer's social row: WhatsApp (once verified), Instagram, Facebook and Tripadvisor, each in its own familiar
 * colours on a 44 px disc. Only the business's own, existing profiles are linked.
 */
function socialLinks(site) {
  const { whatsapp } = site.contact;
  const out = ' (opens in a new tab)';
  const items = [
    whatsapp.verified && [waHref(whatsapp), `Message ${site.name} on WhatsApp${out}`, 'whatsapp'],
    site.social.instagram && [site.social.instagram, `${site.name} on Instagram${out}`, 'instagram'],
    site.social.facebook && [site.social.facebook, `${site.name} on Facebook${out}`, 'facebook'],
    site.social.tripadvisor && [site.social.tripadvisor, `${site.name} on Tripadvisor${out}`, 'tripadvisor'],
  ].filter(Boolean);
  return `<ul class="social" role="list" aria-label="Follow our journey">
        ${items.map(([href, label, ic]) => `<li><a href="${esc(href)}" rel="noopener" target="_blank" aria-label="${esc(label)}">${brandMark(ic)}</a></li>`).join('\n        ')}
      </ul>`;
}

/**
 * The Travel Concierge's direct line (desktop): WhatsApp, a call and the primary address, each with its mark, a name
 * and the number or address beneath, between fine rules. Verified channels only.
 */
function conciergeReach(site) {
  const { phone, whatsapp, email } = site.contact;
  const item = (href, mark, name, value, attrs = '') =>
    `<li><a class="gt-concierge-reach__item" href="${href}"${attrs}>${mark}<span class="gt-concierge-reach__text"><span class="gt-concierge-reach__name">${name}</span><span class="gt-concierge-reach__value">${esc(value)}</span></span></a></li>`;
  const items = [
    whatsapp.verified && item(waHref(whatsapp), brandMark('whatsapp'), 'WhatsApp<span class="visually-hidden"> (opens in a new tab)</span>', whatsapp.display, ' rel="noopener" target="_blank"'),
    phone.verified && item(telHref(phone), brandMark('phone'), 'Call Us', phone.display),
    email.verified && item(`mailto:${esc(email.address)}`, `<span class="gt-concierge-reach__mail" aria-hidden="true">${icon('mail')}</span>`, 'Email Us', email.address),
  ].filter(Boolean);
  return items.length
    ? `<div class="gt-concierge-panel__reach"><p class="gt-concierge-panel__heading">Or talk to us directly</p><ul class="gt-concierge-reach" role="list">${items.join('')}</ul></div>`
    : '';
}

/**
 * The analytics choice: asked of every visitor before anything is counted, and changed at any time from the
 * footer. Hidden until assets/js/consent.js finds the page's analytics config (production builds only), so a page
 * without JavaScript, or a preview build, never shows it. Allow and Decline are the same kind of button: declining is
 * as easy as allowing. Early in the page, so keyboard and screen-reader users meet it first; it sits at the foot of
 * the screen.
 */
function consentBanner() {
  return `<section class="consent" data-consent role="region" aria-label="Visit statistics" hidden>
  <p class="consent__title">Help us improve this website</p>
  <p class="consent__text">May we count your visit with Cloudflare Web Analytics? It sets no cookies and does not follow you to other websites. Nothing is counted unless you allow it. <a href="privacy/#analytics">How it works</a></p>
  <p class="consent__status" data-consent-status hidden></p>
  <div class="consent__actions">
    <button type="button" class="btn gt-button gt-button--secondary" data-consent-choice="granted">Allow</button>
    <button type="button" class="btn gt-button gt-button--secondary" data-consent-choice="denied">Decline</button>
  </div>
</section>`;
}

/** The office, exactly as Good Times publishes it, with a link to directions (verified only). */
function officeLine(site) {
  const o = site.contact.office;
  if (!o?.verified) return `<span>${icon('pin')} Cape Town, South Africa</span>`;
  return `<a class="footer-contact__office" href="${esc(o.mapsUrl)}" rel="noopener" target="_blank">${icon('pin')}<span>${o.lines.map(esc).join('<br>')}<span class="visually-hidden"> (directions open in a new tab)</span></span></a>`;
}

function render(page, site) {
  const pretty = page.path === 'index.html' ? '' : page.path.replace(/index\.html$/, '');
  const canonical = `${site.url}/${pretty}`;
  const title = page.path === 'index.html' ? `${site.name} | ${site.tagline}` : `${page.title} | ${site.shortName}`;
  const og = page.ogImage || 'assets/img/og-default.jpg';
  const current = (href) => (page.nav === href ? ' aria-current="page"' : '');
  const noindex = site.preview || page.noindex;
  const contacts = contactList(site);
  const bar = contactBar(page, site) || (typeof page.mobileCta === 'function' ? page.mobileCta({ site }) : page.mobileCta || '');
  const overlay = Boolean(page.overlayHeader);
  // The brand aircraft's entrance (the home page): the dock anchor in the logo link and the flight layer in the header
  const flight = overlay && Boolean(page.brandFlight);
  const bodyClass = [page.bodyClass, overlay ? 'has-overlay-header' : '', site.preview ? 'has-preview-bar' : '', bar ? 'has-mobile-cta' : ''].filter(Boolean).join(' ');
  const bookHref = page.enquireHref || 'enquire/';
  const main = page.body({ site });
  // The currency script only where a price or the selector is shown: the home page and pages without prices never load it.
  const scripts = [...(page.scripts || [])];
  if (/data-money=|data-currency-picker/.test(main + bar)) scripts.push({ module: 'assets/js/currency.js' });

  return `<!doctype html>
<html lang="${site.locale}" class="no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
${page.base ? `<base href="${page.base}">` : ''}
<title>${esc(title)}</title>
<meta name="description" content="${esc(page.description)}">
<link rel="canonical" href="${canonical}">
<meta name="robots" content="${noindex ? 'noindex,nofollow' : 'index,follow'}">
<meta name="theme-color" content="${site.themeColor}">
<meta name="format-detection" content="telephone=no">
${site.analytics.cloudflareToken ? `<meta name="gt-analytics" content="${esc(site.analytics.cloudflareToken)}">` : ''}
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(site.name)}">
<meta property="og:locale" content="${site.locale.replace('-', '_')}">
<meta property="og:url" content="${canonical}">
<meta property="og:title" content="${esc(page.ogTitle || title)}">
<meta property="og:description" content="${esc(page.description)}">
<meta property="og:image" content="${site.url}/${og}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(page.ogAlt || `The Good Times in Cape Town logo, Table Mountain and a dotted flight path over the name, and beneath it: ${site.statement}`)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="assets/brand/favicon.ico" sizes="any">
<link rel="icon" href="assets/brand/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="assets/brand/apple-touch-icon-180.png">
<link rel="manifest" href="assets/brand/site.webmanifest">
<link rel="preload" href="assets/fonts/BricolageGrotesque.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="assets/fonts/DMSans.woff2" as="font" type="font/woff2" crossorigin>
${(page.preload || []).filter(Boolean).map((p) => `<link rel="preload" as="image" href="${p.href}" type="${p.type}" imagesrcset="${p.srcset}" imagesizes="${p.sizes}"${p.media ? ` media="${p.media}"` : ''} fetchpriority="high">`).join('\n')}
<link rel="stylesheet" href="assets/css/tokens.css">
<link rel="stylesheet" href="assets/css/styles.css">
<link rel="stylesheet" href="assets/css/living-cape-system.css">
<link rel="stylesheet" href="assets/css/buttons.css">
${(page.styles || []).map((s) => `<link rel="stylesheet" href="${s}">`).join('\n')}
<script>${INLINE_GATE}</script>
<script type="application/ld+json">${jsonLd(page, site)}</script>
</head>
<body class="${bodyClass}">
<a class="skip-link" href="#main">Skip to content</a>
${consentBanner()}
${signatureDesc()}
${site.preview ? `<div class="preview-bar" data-preview-bar role="note"><div class="container preview-bar__inner">${icon('info')}<span>Staging preview, not yet live.${site.enquiry.mode === 'live' ? ' Test booking requests are delivered to the configured inbox.' : ' Booking requests made here are not sent.'}</span>${flight ? '<button type="button" class="preview-bar__replay" data-intro-replay hidden>Replay the intro</button>' : ''}</div></div>` : ''}
<header class="site-header${overlay ? ' site-header--overlay' : ''}" data-header${overlay ? ' data-condense-at="40"' : ''}>
  <div class="container header-bar">
    <div class="brand-lockup">
      <a class="brand" href="./" aria-label="${esc(site.name)}, home" data-intro${flight ? ` style="${dockBox().style}"` : ''}>
        <img class="brand__logo brand__logo--ink" src="assets/brand/gt-logo-compact.svg" alt="" width="2121" height="564">
        ${overlay ? `<img class="brand__logo brand__logo--gold" src="assets/brand/gt-logo-reversed-compact.svg" alt="" width="2121" height="564">` : ''}
        ${flight ? aircraftDock() : ''}
      </a>
      <p class="brand-lockup__statement" data-intro data-statement>${esc(site.statement)}</p>
    </div>
    <nav class="primary-nav" aria-label="Primary">
      <ul>
        ${site.nav.map((n) => `<li><a href="${n.href}"${current(n.href)} data-intro>${esc(n.label)}</a></li>`).join('\n        ')}
      </ul>
    </nav>
    ${conciergeTrigger()}
    ${coinButton({ href: bookHref, cls: 'header-cta', attrs: 'data-intro' })}
    <button class="nav-toggle" type="button" data-nav-toggle aria-controls="drawer" aria-expanded="false">
      <span class="visually-hidden">Menu</span>
      ${icon('menu')}${icon('close')}
    </button>
  </div>
  ${flight ? aircraftFlight({ preview: site.preview }) : ''}
</header>
${conciergePanel({ bookHref, reach: conciergeReach(site) })}

<div class="drawer" id="drawer" data-drawer hidden>
  ${drawerServices()}
  <p class="eyebrow drawer__eyebrow">Menu</p>
  <nav class="drawer__nav" aria-label="Mobile">
    <ul>
      <li><a href="./"${page.path === 'index.html' ? ' aria-current="page"' : ''}>Home</a></li>
      ${[...site.nav, ...site.navSecondary].map((n) => `<li><a href="${n.href}"${current(n.href)}>${esc(n.label)}</a></li>`).join('\n      ')}
    </ul>
  </nav>
  <div class="drawer__footer">
    ${button({ href: bookHref, label: SIGNATURE_CTA, variant: 'gold', cls: 'gt-button--block', attrs: SIGNATURE_ATTRS })}
    ${contacts}
  </div>
</div>

<main id="main" tabindex="-1">
${main}
</main>

<footer class="site-footer on-dark">
  <div class="container footer-main">
    <div class="footer-brand">
      <div class="brand-lockup brand-lockup--footer">
        <img src="assets/brand/gt-logo-reversed-compact.svg" alt="${esc(site.name)}" width="2121" height="564" loading="lazy" decoding="async">
        <p class="brand-lockup__statement">${esc(site.statement)}</p>
      </div>
      <p>Private, guide-led tours of Cape Town and the Western Cape since ${site.founded}, founded by ${esc(site.founder)}.</p>
      <div class="footer-contact mt-5">
        ${contacts}
        ${officeLine(site)}
      </div>
      ${socialLinks(site)}
    </div>
    <nav aria-labelledby="footer-tours">
      <h2 class="footer-heading" id="footer-tours">Tours</h2>
      <ul class="footer-links">
        ${tours.filter((t) => !t.categories.includes('adventure')).map((t) => `<li><a href="tours/${t.slug}/">${esc(t.footerLabel || t.shortTitle.replace(/ Private Tour$/, ''))}</a></li>`).join('\n        ')}
        <li><a href="tours/#adventure">Adventure activities</a></li>
        <li><a href="packages/">Multi-day: the Garden Route</a></li>
        <li><a href="tours/">All tours</a></li>
      </ul>
    </nav>
    <nav aria-labelledby="footer-shuttles">
      <h2 class="footer-heading" id="footer-shuttles">Transfers</h2>
      <ul class="footer-links">
        ${services.map((s) => `<li><a href="transfers/#${s.id}">${esc(s.shortTitle)}</a></li>`).join('\n        ')}
        <li><a href="transfers/">All transfers</a></li>
        <li><a href="enquire/?type=transfer">Request a transfer</a></li>
      </ul>
    </nav>
    <nav aria-labelledby="footer-company">
      <h2 class="footer-heading" id="footer-company">Company</h2>
      <ul class="footer-links">
        <li><a href="about/">About</a></li>
        <li><a href="destinations/">Destinations</a></li>
        <li><a href="reviews/">Reviews</a></li>
        <li><a href="faq/">FAQ</a></li>
        <li><a href="contact/">Contact</a></li>
        <li><a href="${bookHref}" ${SIGNATURE_ATTRS}>${SIGNATURE_CTA}</a></li>
      </ul>
    </nav>
    <nav aria-labelledby="footer-legal">
      <h2 class="footer-heading" id="footer-legal">Legal</h2>
      <ul class="footer-links">
        <li><a href="privacy/">Privacy</a></li>
        ${site.preview || site.legal.termsApproved ? '<li><a href="terms/">Terms &amp; Conditions</a></li>' : ''}
        <li><a href="privacy/#credits">Photo credits</a></li>
        <li data-consent-settings hidden><button type="button" class="footer-links__button" data-consent-open>Analytics settings</button></li>
      </ul>
    </nav>
  </div>
  <div class="footer-base">
    <div class="container footer-base__inner">
      <span>© ${new Date().getFullYear()} ${esc(site.name)}</span>
    </div>
  </div>
</footer>
${bar}
<script src="assets/js/main.js" defer></script>
<script src="assets/js/consent.js" defer></script>
<script src="assets/js/vendor/gsap.min.js" defer></script>
<script src="assets/js/concierge.js" defer></script>
${scripts.map((s) => (typeof s === 'string' ? `<script src="${s}" defer></script>` : `<script type="module" src="${s.module}"></script>`)).join('\n')}
</body>
</html>
`;
}
