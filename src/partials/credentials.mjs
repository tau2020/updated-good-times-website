/**
 * The credentials strip (home page, straight after the sand journey): who stands behind a Good Times day, in a few
 * calm lines beside the professional association's mark. An editorial strip in the sand's own warm tone, so the beach
 * above runs into it and it hands over to the coast-road chapter below: it is also the join where the removed water
 * chapter used to be (qa/surgical-change-report.md). Not a banner, not a floating badge, and nothing in it covers a
 * photograph.
 *
 * Every point is a statement the company makes on its own website (site.credentials, read 5 Nov 2026). The Cape
 * Tourist Guides Association is a professional association, not an award: its logo (the association's own vector
 * file, unaltered) and its line appear only once the membership is verified (`site.credentials.ctga.verified`).
 * Until then a preview build shows them with a plain "preview only" note beside them, so the owner can judge the
 * composition, and a production build leaves them out (docs/APPROVAL_REGISTER.md › T1). The Tripadvisor rating is
 * kept apart from it, beside the reviews.
 */
import { esc, icon } from './ui.mjs';

export function credentialsStrip(site) {
  const c = site.credentials;
  const ctga = c.ctga;
  const showCtga = Boolean(ctga && (ctga.verified || site.preview));
  const badge = showCtga
    ? `<figure class="gt-credentials__badge${ctga.verified ? '' : ' is-pending'}">
      <a class="gt-credentials__logo" href="${esc(ctga.url)}" rel="noopener" target="_blank"><img src="${esc(ctga.logo)}" alt="${esc(ctga.name)}" width="168" height="112" loading="lazy" decoding="async"><span class="visually-hidden"> (opens in a new tab)</span></a>
      <figcaption class="gt-credentials__line">${esc(ctga.line)}${ctga.verified ? '' : `<span class="gt-credentials__pending">${icon('info')} Preview only: shown for review until the ${esc(ctga.short)} membership is confirmed</span>`}</figcaption>
    </figure>`
    : '';
  return `<section class="gt-credentials" aria-labelledby="credentials-title">
  <div class="container gt-credentials__inner${showCtga ? ' has-badge' : ''}">
    <div class="gt-credentials__head">
      <p class="gt-credentials__eyebrow">Good Times since ${esc(site.founded)}</p>
      <h2 class="gt-credentials__title" id="credentials-title">Local knowledge. <em>Professional guiding.</em></h2>
    </div>
    <ul class="gt-credentials__points" role="list">
      ${c.points.map((p) => `<li class="gt-credentials__point"><strong>${esc(p.title)}</strong> <span>${esc(p.text)}</span></li>`).join('\n      ')}
    </ul>
    ${badge}
  </div>
</section>`;
}
