/**
 * Visit statistics with consent: Cloudflare Web Analytics is offered to every
 * visitor and loaded only after Allow. The page carries the token only when
 * one is configured (WEB_ANALYTICS_TOKEN; Good Times has none yet, so the
 * tests supply their own); the banner is hidden until the script
 * shows it; Allow and Decline weigh the same; the footer reopens the choice;
 * the policy allows the one beacon file the script loads; the privacy notice
 * says what is counted.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { site } from '../src/data/site.mjs';
import { layout } from '../src/partials/layout.mjs';
import { ANALYTICS_BEACON, ANALYTICS_ENDPOINT, contentSecurityPolicy } from '../src/partials/security.mjs';
import { page as privacy } from '../src/pages/privacy.mjs';
import { page as home } from '../src/pages/index.mjs';

const TOKEN = '0123456789abcdef0123456789abcdef';
const withToken = { ...site, preview: false, env: 'production', analytics: { cloudflareToken: TOKEN } };
const without = { ...site, analytics: { cloudflareToken: '' } };
const script = readFileSync(new URL('../src/assets/js/consent.js', import.meta.url), 'utf8');

test('the config is in the page only when a token is configured; the banner and the footer entry start hidden', () => {
  const on = layout(home, withToken);
  assert.equal((on.match(/<meta name="gt-analytics" content="([0-9a-f]{32})">/) || [])[1], TOKEN);
  assert.doesNotMatch(layout(home, without), /gt-analytics/);
  // Good Times has no Web Analytics token configured yet: the site's own pages carry none, so nothing is counted.
  assert.equal(site.analytics.cloudflareToken, process.env.WEB_ANALYTICS_TOKEN || '');
  if (!site.analytics.cloudflareToken) assert.doesNotMatch(layout(home, { ...site, preview: false, env: 'production' }), /gt-analytics/);
  for (const html of [on, layout(home, without)]) {
    assert.match(html, /<section class="consent" data-consent role="region" aria-label="Visit statistics" hidden>/);
    assert.match(html, /<li data-consent-settings hidden><button type="button" class="footer-links__button" data-consent-open>Analytics settings<\/button><\/li>/);
    assert.match(html, /<script src="assets\/js\/consent\.js" defer><\/script>/);
    assert.doesNotMatch(html, /cloudflareinsights/, 'the HTML never loads the beacon itself');
  }
});

test('the banner: plain words, a link to the details, and Allow and Decline as the same kind of button', () => {
  const html = layout(home, withToken);
  const banner = html.match(/<section class="consent"[\s\S]*?<\/section>/)[0];
  assert.match(banner, /May we count your visit with Cloudflare Web Analytics\? It sets no cookies and does not follow you to other websites\. Nothing is counted unless you allow it\./);
  assert.match(banner, /<a href="privacy\/#analytics">How it works<\/a>/);
  const buttons = [...banner.matchAll(/<button type="button" class="([^"]+)" data-consent-choice="(granted|denied)">(Allow|Decline)<\/button>/g)];
  assert.deepEqual(buttons.map((b) => [b[2], b[3]]), [['granted', 'Allow'], ['denied', 'Decline']]);
  assert.equal(buttons[0][1], buttons[1][1], 'equal weight');
  // Early in the page (after the skip link), so keyboard and screen-reader users meet it before the navigation.
  assert.ok(html.indexOf('class="skip-link"') < html.indexOf('data-consent ') && html.indexOf('data-consent ') < html.indexOf('<header'));
});

test('the script loads exactly the file the policy allows, with the token, and only after a stored or given Allow', () => {
  assert.equal(ANALYTICS_BEACON, 'https://static.cloudflareinsights.com/beacon.min.js');
  assert.equal(ANALYTICS_ENDPOINT, 'https://cloudflareinsights.com/cdn-cgi/rum');
  assert.ok(script.includes(`const BEACON = '${ANALYTICS_BEACON}';`));
  assert.ok(contentSecurityPolicy().includes(` ${ANALYTICS_BEACON};`));
  assert.match(script, /s\.setAttribute\('data-cf-beacon', JSON\.stringify\(\{ token \}\)\)/);
  assert.match(script, /if \(choice === 'granted'\) load\(\);\n  else if \(!choice\) show\(false\);/);
  assert.equal((script.match(/load\(\)/g) || []).length, 2, 'load() is called only for a stored Allow and on the Allow button');
  assert.doesNotMatch(script, /document\.cookie|sessionStorage/);
});

test('the privacy notice says what is counted, that nothing is without Allow, and where the answer is kept', () => {
  const html = privacy.body({ site });
  const section = html.slice(html.indexOf('<h2 id="analytics">'), html.indexOf('<h2>What is stored in your browser</h2>'));
  assert.match(section, /Visit statistics, only if you allow them/);
  for (const fact of ['If you choose Allow', 'Cloudflare Web Analytics', 'the pages you open', 'the website that sent you here', 'the country your connection comes from', 'how quickly each page loads', 'Cloudflare says it uses no cookies or other storage in your browser', 'If you choose Decline, or do not choose, nothing is loaded and nothing is counted', 'Analytics settings at the foot of every page']) {
    assert.ok(section.includes(fact), fact);
  }
  assert.match(html, /To improve our tours and this website<\/strong>: from the feedback you choose to give us, and visit statistics only if you allow them, which you can withdraw at any time\./);
  assert.match(html, /counts visits with Cloudflare Web Analytics/);
  assert.match(html, /kept in your browser’s local storage/);
  assert.match(html, /This website sets no cookies and uses no advertising trackers\./);
  assert.doesNotMatch(html, /no analytics/);
});
