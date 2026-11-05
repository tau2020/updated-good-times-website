# Conversion report

How the supplied website template became the Good Times in Cape Town site (5 Nov 2026). This was a controlled template conversion, not a redesign. The template's structure and behaviour were kept, and everything that identified its earlier operator was replaced with verified Good Times material, or removed where Good Times has no equivalent.

## Kept as it was

- **Architecture:** the zero-dependency static generator (`src/build.mjs`), the page modules and the layout shell, the CSP with the inline script's hash, `_headers`, and robots/sitemap by environment.
- **Pages and section order:** home, tours, tour detail, multi-day tours, transfers, destinations, about, reviews, contact, FAQ, enquire, privacy, terms, 404. Each page keeps the template's sections, in the template's order.
- **Header, navigation and footer:** the same structure and responsive behaviour (drawer, booking bar, Travel Concierge menu).
- **Components:** cards, the tour tabs, the booking card, the destination carousel, the photo exhibition and its lightbox, the review carousel, the counters, the button system, the currency selector.
- **Motion:** GSAP entrances, the chapter choreography, scroll reveals and the reduced-motion paths, unchanged.
- **Enquiry system:** the two-path wizard, the shared validation module, idempotency, rate limits, honeypot, the availability check, signed status links, the bookings dashboard and email templates. Only the wording, the references (`GT-`) and the products changed.
- **Deployment tooling:** the project-as-code scripts, now pointed at a new Good Times project.

## Replaced

| Area | Now |
|---|---|
| Name and identity | Good Times in Cape Town, "Private tours in Cape Town since 2014", founded by Stuart Matanhire; office at 277 Main Road, Adelphi Centre, Sea Point (as published) |
| Logo | The Approved Logo Pack v2, used as supplied: the compact logo in the header (light and reversed), the full reversed logo in the footer, the pack's favicons, app icons and social avatar, and a PNG of the reversed logo for emails. Nothing was redrawn |
| Palette | Derived from the logo: navy `#102E42` and `#0B2233`; Good Times green `#056A2B` for text and buttons (6.3:1 on white) and the logo's `#059A35` for marks; light greens; a sunshine accent `#F2C94C` |
| Typography | Plus Jakarta Sans (headings) and Inter (text), self-hosted. The template's serif display faces were removed |
| Contacts | +27 72 376 8432 (calls) and info@goodtimesincapetown.co.za, both published by Good Times. WhatsApp is not shown until the number is confirmed for it, so the phone bar offers Call |
| Social and listings | Good Times' Tripadvisor (5.0 from 264 reviews, read 5 Nov 2026), Facebook, Instagram and YouTube |
| Photography | 50 Good Times photographs (Tripadvisor business uploads, website photographs and owner-supplied files), each with a recorded basis: `docs/RIGHTS_REGISTER.md`. None of the template's photographs or its hero film remain |
| Copy | Rewritten for every page from Good Times' own published facts, in a warm, plain voice, without superlatives |
| Prices | Good Times' published rand prices, as group tiers (1–4 and 5–8 guests) or per trip, dated; "Price on enquiry" where none is published. The display currency's base is now ZAR |
| Terms and privacy | Good Times' own published Terms & Conditions (two adaptations: links to pages this site does not have). The privacy notice describes this site's actual processing. Both are marked draft until approved |
| Reviews | Ten Tripadvisor reviews as short summaries in our own words, each linked; no reviewer's text, photo or avatar is copied |
| SEO and metadata | Good Times titles, descriptions, Open Graph image, and JSON-LD (TravelAgency with founder, address and map; TouristTrip with Offers; FAQPage; BreadcrumbList). Staging is `noindex` (meta, `X-Robots-Tag`, `robots.txt`), with canonicals on the staging address. A sitemap is only made for production |

## Offerings mapped onto the template

The template sold seven day tours, two multi-day packages and two transfer services. Good Times' twelve published offerings were mapped onto those slots:

| Template slot | Good Times offering | Page | Price shown |
|---|---|---|---|
| Day tour | Cape Peninsula Private Tour | `/tours/cape-peninsula-private-tour/` | R6,000 (1–4) / R12,000 (5–8) |
| Day tour | Cape Town City Private Tour | `/tours/cape-town-city-private-tour/` | R4,000 / R8,000 |
| Day tour | Cape Winelands Private Tour | `/tours/cape-winelands-private-tour/` | R6,000 / R12,000 |
| Day tour | Township Private Tour (Langa) | `/tours/township-private-tour/` | R4,000 / R8,000 |
| Day tour | Private Cape Town Experience | `/tours/private-cape-town-experience/` | R3,500, up to 10 |
| Day tour | Whale Watching Private Tour (seasonal) | `/tours/whale-watching-private-tour/` | On enquiry |
| Day tour | Cape Agulhas Private Tour | `/tours/cape-agulhas-private-tour/` | On enquiry |
| Day tour (new adventure category) | Shark Cage Diving, Quad Biking, Sky Diving | `/tours/<slug>/` | On enquiry |
| Multi-day package | Garden Route Private Tour (3+ days) | `/packages/garden-route-private-tour/` | R8,500 per day, 1–4 |
| Airport transfer | Airport Private Transfer | `/transfers/` | R800 (1–4) / R1,600 (5–8) per trip |

Where the template had more slots than Good Times has offerings, the slot was removed rather than filled: the second multi-day package and the safari transfer service (with its transfer type and availability hold). The adventure activities took the safari's place in the home page's services and in the "wild" interlude. Tours without a usable photograph (Cape Agulhas, Sky Diving) show the logo pack's mountain-trail artwork instead of a stock image.

The current website's tour addresses (`/tour/<slug>/`) redirect permanently to their new pages (`site/_redirects`, from `src/data/redirects.mjs`); they take effect only once the domain moves here.

## Removed

- Everything that identified the template's earlier operator: names, logos, colours, photographs, film, contacts, inboxes, domain, analytics token, listing IDs, reference format, prices, inclusions, cancellation rules, terms, reviews, documentation and decision logs. `npm run guard` fails if any identifier returns.
- The hero film (Good Times has none). The home hero is a photograph.
- The template's live enquiry configuration. Every environment is in preview mode until Good Times' own database, sending domain and secrets exist (`docs/APPROVAL_REGISTER.md` A4).

## Added

- Approval guards in the deployment tooling: production refuses to deploy until `RELEASE.approved`, and domain, DNS and email changes are refused until `DOMAIN.approved`.
- `scripts/cloudflare/build.mjs` (build with one environment's variables), the legacy-address redirects, and a smoke check for them.
- Group-tier pricing in the booking card and the wizard total.
- The art panel for tours without a photograph.

## Withdrawn during review

Four selected photographs were withdrawn on 5 Nov 2026 because they show children or people who may be under 18 (`docs/RIGHTS_REGISTER.md` › Withdrawn). Each placement now uses another Good Times photograph of adults or scenery.
