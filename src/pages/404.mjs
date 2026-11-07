import { button } from '../partials/ui.mjs';

export const page = {
  path: '404.html',
  title: 'Page not found',
  description: 'The page you were looking for is not here. Explore Good Times in Cape Town’s private tours and airport transfers instead.',
  noindex: true,
  // Served for any missing URL: no canonical (its own address, /404.html, redirects to /404; the audit's F5).
  canonical: false,
  // Served for any missing URL, so relative links must resolve from the site root.
  base: '/',
  body: () => `
<section class="page-head">
  <div class="container">
    <p class="eyebrow">404</p>
    <h1>This road doesn’t lead anywhere.</h1>
    <p class="lead">The page may have moved, or the link may be mistyped. These will get you back on route.</p>
    <div class="cluster mt-6">
      ${button({ href: './', label: 'Go to the Home Page', variant: 'gold' })}
      ${button({ href: 'tours/', label: 'Explore Tours', variant: 'outline' })}
    </div>
  </div>
</section>`,
};
