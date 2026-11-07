# Historical URL registry

Generated from `src/data/legacy-urls.mjs` (2026-11-08) by `npm run seo:registry`: edit the registry, never this file. The same entries build `site/_redirects` (`src/data/redirects.mjs`), the restored pages and the preserved files, and drive the tests (`test/legacy-registry.test.mjs`, `test/legacy-urls.test.mjs`) and the suite for any deployment (`node qa/legacy-urls.mjs --base=<url> --env=<env>`). The CSV beside it has the same rows.

**140 entries** covering **325 concrete addresses** (patterns expanded through their samples), plus the two host redirects.

Search Console figures are private and are not in this public repository: the evidence column names the sources (key below), and the figures are in the owner’s Drive (Good Times Web Migration).

## Totals

| Action | Entries | | Priority | Entries | | Owner | Entries |
|---|---|---|---|---|---|---|---|
| keep | 9 | | Critical | 6 | | engineering | 126 |
| redirect | 53 | | High | 30 | | owner | 10 |
| prefix | 27 | | Medium | 20 | | cutover | 2 |
| page | 2 | | Low | 84 | | platform | 2 |
| asset | 4 | |  |  | |  |  |
| platform | 1 | |  |  | |  |  |
| host | 2 | |  |  | |  |  |
| query | 22 | |  |  | |  |  |
| retire | 14 | |  |  | |  |  |
| hold | 6 | |  |  | |  |  |

## Key

| Action | Meaning |
|---|---|
| keep | The same address answers on the new site |
| redirect | 301 to the new address: a static rule, with and without the trailing slash |
| prefix | 301 for every address under it: a dynamic rule, after every static rule |
| page | A page of the new site answers at the old address (restored) |
| asset | The original file, unaltered, answers at its old address |
| platform | Cloudflare Pages redirects it by itself |
| host | A host-level redirect, set at the domain cutover (not possible in _redirects) |
| query | A query string on the home page: the new home page answers, canonical / |
| retire | 404 by design |
| hold | 404 until the owner decides (the decision named) |

| Owner | Meaning |
|---|---|
| engineering | Done in this repository (the registry and the build) |
| owner | Good Times decides (docs/APPROVAL_REGISTER.md) |
| cutover | Done at the domain cutover (docs/seo/READINESS.md) |
| platform | Cloudflare Pages behaviour; nothing to configure |

| Evidence | Source |
|---|---|
| gsc | Search Console performance, 16 months to 8 Nov 2026: clicks or impressions (figures private) |
| gsc-crawl | Search Console crawl stats, 28 Oct–7 Nov 2026: Googlebot requested it (figures private) |
| gsc-links | Search Console links report: other sites link to it (figures private) |
| register | SEO preservation register, 8 Nov 2026 (56 rows) |
| audit | SEO migration audit, 7 Nov 2026: its 190-URL map and proposed 70-rule _redirects |
| additions | _redirects-gsc-additions, 8 Nov 2026 (32 rules, 16 addresses) |
| repo | This repository before Step 4B: src/data/redirects.mjs (26 rules), each offering’s page read 5 Nov 2026 |
| wp-backup | The hosting account’s backup of 7 Nov 2026: the WordPress database and theme |
| django-export | The booking site’s own export, kept in the WordPress theme (migration-data/export.json) |
| media-store | The booking site’s media store, still online: each file read and checked against its MD5, 8 Nov 2026 |
| wayback | Internet Archive index (CDX), read 8 Nov 2026 |
| static-2025 | The May 2025 static pages in the hosting account’s backup |
| pattern | Follows a documented address pattern; no direct record of this one address |

| Era | Site |
|---|---|
| static-2022 | A static site, 2021–2022 (Internet Archive captures) |
| static-2025 | Static pages of May 2025, still in the hosting account but 404 on the live site |
| django | The booking site (Django on DigitalOcean) until 5 Nov 2026 |
| wordpress | The WordPress site of 5–7 Nov 2026 on the cPanel hosting account |

## Tour pages, booking site and WordPress slugs

| Address | Priority | Action | First response | Final destination | Owner | Evidence | Note |
|---|---|---|---|---|---|---|---|
| `/tour/cape-peninsula-private-tour/` | High | redirect | 301 | `/tours/cape-peninsula-private-tour/` | engineering | gsc, gsc-crawl, register, repo | The booking site’s address, with search impressions. Missing from the audit’s 70-rule file (it crawled WordPress, which had renamed the slug): its own static rule, so it never falls through to /tour/*. |
| `/tour/cape-town-city-private-tour/` | High | redirect | 301 | `/tours/cape-town-city-private-tour/` | engineering | gsc, gsc-crawl, register, repo | The booking site’s address, with search impressions. Missing from the audit’s 70-rule file (it crawled WordPress, which had renamed the slug): its own static rule, so it never falls through to /tour/*. |
| `/tour/township-private-tour/` | High | redirect | 301 | `/tours/township-private-tour/` | engineering | gsc, gsc-crawl, register, repo | The booking site’s address, with search impressions. Missing from the audit’s 70-rule file (it crawled WordPress, which had renamed the slug): its own static rule, so it never falls through to /tour/*. |
| `/tour/cape-winelands-private-tour/` | High | redirect | 301 | `/tours/cape-winelands-private-tour/` | engineering | gsc, gsc-crawl, register, repo | The booking site’s address, with search impressions. Missing from the audit’s 70-rule file (it crawled WordPress, which had renamed the slug): its own static rule, so it never falls through to /tour/*. |
| `/tour/cape-peninsula-adventure/` | High | redirect | 301 | `/tours/cape-peninsula-private-tour/` | engineering | gsc-crawl, audit, wp-backup, django-export | WordPress’s slug for the same tour (the booking site’s export carried it); answered 404 on the deployed site before Step 4B. |
| `/tour/cape-town-city-tour/` | High | redirect | 301 | `/tours/cape-town-city-private-tour/` | engineering | gsc, gsc-crawl, register, audit, wp-backup, django-export | WordPress’s slug for the same tour (the booking site’s export carried it); answered 404 on the deployed site before Step 4B. |
| `/tour/township-cultural-tour/` | High | redirect | 301 | `/tours/township-private-tour/` | engineering | gsc-crawl, audit, wp-backup, django-export | WordPress’s slug for the same tour (the booking site’s export carried it); answered 404 on the deployed site before Step 4B. |
| `/tour/winelands-experience/` | High | redirect | 301 | `/tours/cape-winelands-private-tour/` | engineering | gsc, register, audit, wp-backup, django-export | WordPress’s slug for the same tour (the booking site’s export carried it); answered 404 on the deployed site before Step 4B. |
| `/tour/airport-private-transfer/` | Critical | redirect | 301 | `/transfers/` | engineering | gsc, gsc-crawl, register, audit, repo, wp-backup |  |
| `/tour/shark-cage-diving/` | High | redirect | 301 | `/tours/shark-cage-diving/` | engineering | gsc, gsc-crawl, register, audit, repo, wp-backup |  |
| `/tour/garden-route-private-tour/` | High | redirect | 301 | `/packages/garden-route-private-tour/` | engineering | gsc, gsc-crawl, register, audit, repo, wp-backup |  |
| `/tour/whale-watching-private-tour/` | High | redirect | 301 | `/tours/whale-watching-private-tour/` | engineering | gsc, gsc-crawl, register, audit, repo, wp-backup |  |
| `/tour/sky-diving/` | High | redirect | 301 | `/tours/sky-diving/` | engineering | gsc, gsc-crawl, register, audit, repo, wp-backup |  |
| `/tour/cape-agulhas-private-tour/` | High | redirect | 301 | `/tours/cape-agulhas-private-tour/` | engineering | gsc, gsc-crawl, register, audit, repo, wp-backup |  |
| `/tour/private-cape-town-experience/` | High | redirect | 301 | `/tours/private-cape-town-experience/` | engineering | gsc, gsc-crawl, register, audit, repo, wp-backup |  |
| `/tour/quad-biking/` | High | redirect | 301 | `/tours/quad-biking/` | engineering | gsc, gsc-crawl, register, audit, repo, wp-backup |  |

## Booking pages → the booking form, the tour chosen

| Address | Priority | Action | First response | Final destination | Owner | Evidence | Note |
|---|---|---|---|---|---|---|---|
| `/users/book/cape-peninsula-private-tour/` | High | redirect | 301 | `/enquire/?type=tour&tour=cape-peninsula-private-tour` | engineering | gsc, gsc-crawl, register, additions |  |
| `/users/book/cape-town-city-private-tour/` | High | redirect | 301 | `/enquire/?type=tour&tour=cape-town-city-private-tour` | engineering | gsc, gsc-crawl, register, additions |  |
| `/users/book/cape-winelands-private-tour/` | High | redirect | 301 | `/enquire/?type=tour&tour=cape-winelands-private-tour` | engineering | gsc, gsc-crawl, register, additions |  |
| `/users/book/township-private-tour/` | High | redirect | 301 | `/enquire/?type=tour&tour=township-private-tour` | engineering | additions, pattern | The one booking page the preservation register lacks: no Search Console record, but every other tour’s booking page is evidenced, and the additions file includes it. Kept, High like its siblings. |
| `/users/book/private-cape-town-experience/` | High | redirect | 301 | `/enquire/?type=tour&tour=private-cape-town-experience` | engineering | gsc, register, additions |  |
| `/users/book/whale-watching-private-tour/` | High | redirect | 301 | `/enquire/?type=tour&tour=whale-watching-private-tour` | engineering | gsc, gsc-crawl, register, additions |  |
| `/users/book/cape-agulhas-private-tour/` | High | redirect | 301 | `/enquire/?type=tour&tour=cape-agulhas-private-tour` | engineering | gsc-crawl, register, additions |  |
| `/users/book/shark-cage-diving/` | High | redirect | 301 | `/enquire/?type=tour&tour=shark-cage-diving` | engineering | gsc, gsc-crawl, register, additions |  |
| `/users/book/quad-biking/` | High | redirect | 301 | `/enquire/?type=tour&tour=quad-biking` | engineering | gsc, gsc-crawl, register, additions |  |
| `/users/book/sky-diving/` | High | redirect | 301 | `/enquire/?type=tour&tour=sky-diving` | engineering | gsc-crawl, register, additions |  |
| `/users/book/garden-route-private-tour/` | High | redirect | 301 | `/enquire/?type=tour&tour=garden-route-private-tour` | engineering | gsc-crawl, register, additions | The multi-day tour travels the tour path of the form; its nights stay “not sure yet” (no old link carried them). |
| `/users/book/airport-private-transfer/` | High | redirect | 301 | `/enquire/?type=transfer` | engineering | gsc-crawl, register, additions | The old booking page did not say arrival or departure, so the transfer path opens with neither chosen. |

## The booking site’s account pages (reviewed)

| Address | Priority | Action | First response | Final destination | Owner | Evidence | Note |
|---|---|---|---|---|---|---|---|
| `/bookings/` | High | redirect | 301 | `/enquire/` | engineering | gsc, gsc-crawl, register, additions | The booking site’s bookings page. There are no customer accounts here; booking is a request through the form. |
| `/accounts/login/` | Critical | redirect | 301 | `/enquire/` | engineering | gsc, gsc-crawl, register, additions | Reviewed: the booking site asked visitors to sign in before booking (Googlebot followed /accounts/login/?next=/users/book/quad-biking/). The form is that step’s successor; the query passes through, and the form chooses the tour named in next=. Never /admin/ (staff only, and a Functions route). (1 addresses, e.g. `/accounts/login/?next=/users/book/quad-biking/`) |
| `/accounts/signup/` | Low | redirect | 301 | `/enquire/` | engineering | gsc, gsc-crawl, register, additions | Reviewed with /accounts/login/: account creation before booking. No accounts here; the form needs none. |

## Pages kept, restored or redirected

| Address | Priority | Action | First response | Final destination | Owner | Evidence | Note |
|---|---|---|---|---|---|---|---|
| `/` | Critical | keep | 200 | `/` | engineering | gsc, gsc-links, gsc-crawl, register, audit, wayback |  |
| `/contact/` | Critical | keep | 200 | `/contact/` | engineering | gsc, gsc-crawl, register, audit |  |
| `/about/` | High | keep | 200 | `/about/` | engineering | gsc, gsc-crawl, register, audit |  |
| `/faq/` | Medium | keep | 200 | `/faq/` | engineering | gsc-crawl, register, audit |  |
| `/privacy/` | Medium | keep | 200 | `/privacy/` | engineering | gsc-crawl, register, audit |  |
| `/terms/` | Medium | keep | 200 | `/terms/` | owner (B2) | gsc-crawl, register, audit | Answers, as a marked draft kept out of search (noindex) until the owner approves the terms (B2); the old page was indexable. |
| `/tours/` | Medium | keep | 200 | `/tours/` | engineering | audit, wp-backup | WordPress’s tour archive (has_archive: tours). |
| `/sitemap.xml` | Low | keep | 200 | `/sitemap.xml` | engineering | audit | Production builds only (a preview publishes no sitemap). |
| `/robots.txt` | Low | keep | 200 | `/robots.txt` | engineering | audit, wayback |  |
| `/gallery/` | Medium | redirect | 301 | `/tours/` | owner (H2) | gsc, gsc-crawl, register, audit | WordPress gathered every tour’s photographs here; the booking site had a gallery list of its own. Each photograph now sits on its tour’s page, all reached from /tours/ (the audit’s target, and the register’s fallback). A gallery page of its own needs photographs not already placed elsewhere (H2). |
| `/tour/` | Low | redirect | 301 | `/tours/` | engineering | repo, audit |  |
| `/index.php` | Low | redirect | 301 | `/` | engineering | audit |  |
| `/favicon.ico` | Low | redirect | 301 | `/assets/brand/favicon.ico` | engineering | gsc-crawl, register, audit, wayback | The approved logo pack’s icon (src/assets/brand/favicon.ico). |
| `/wp-sitemap.xml` | Low | redirect | 301 | `/sitemap.xml` | engineering | audit |  |
| `/index.html` | Low | platform | 308 | `/` | platform | gsc, gsc-crawl, register, wayback | Pages answers 308 to / for any index.html. |
| `/services/` | Critical | page | 200 | `/services/` | owner (H1) | gsc, gsc-links, gsc-crawl, register, additions | The booking site’s “Our offer” page (every service). The additions file sent it to /tours/, which covers neither transfers nor the overview it was linked for: it is now an overview of the four services at its own address. If the owner prefers the redirect, change action to redirect, to /tours/. |
| `/safety/` | Medium | page | 200 | `/safety/` | owner (H1) | gsc-crawl, register, audit, wp-backup | WordPress’s Safety & Trust page. The audit sent it to /about/; the register prefers keeping the page. Restored with the verified statements only (the accreditations, the association, private groups, since 2014); its unverified claims wait for H4. |

## WordPress tour categories

| Address | Priority | Action | First response | Final destination | Owner | Evidence | Note |
|---|---|---|---|---|---|---|---|
| `/tour-category/private-tours/` | Low | redirect | 301 | `/tours/` | engineering | register, audit, wp-backup |  |
| `/tour-category/day-tours/` | Low | redirect | 301 | `/tours/` | engineering | register, audit, wp-backup |  |
| `/tour-category/nature-tours/` | Low | redirect | 301 | `/tours/#nature` | engineering | gsc-crawl, register, audit, wp-backup | Refined from /tours/ to its Nature filter: the category held the whale watching tour. |
| `/tour-category/adventure-activities/` | Low | redirect | 301 | `/tours/#adventure` | engineering | gsc-crawl, register, audit, wp-backup | Refined from /tours/ to its Adventure filter: the category held shark cage diving, quad biking and sky diving. |
| `/tour-category/multi-day-tours/` | Low | redirect | 301 | `/packages/` | engineering | register, audit, wp-backup |  |
| `/tour-category/airport-pickups/` | Low | redirect | 301 | `/transfers/` | engineering | gsc-crawl, register, audit, wp-backup |  |
| `/tour-category/cultural-tours/` | Low | redirect | 301 | `/tours/township-private-tour/` | engineering | gsc-crawl, register, audit, wp-backup |  |
| `/tour-category/cultural-experiences/` | Low | redirect | 301 | `/tours/township-private-tour/` | engineering | register, audit, wp-backup |  |
| `/tour-category/city-tours/` | Low | redirect | 301 | `/tours/cape-town-city-private-tour/` | engineering | register, audit, wp-backup |  |
| `/tour-category/peninsula-tours/` | Low | redirect | 301 | `/tours/cape-peninsula-private-tour/` | engineering | register, audit, wp-backup |  |
| `/tour-category/winelands/` | Low | redirect | 301 | `/tours/cape-winelands-private-tour/` | engineering | register, audit, wp-backup |  |

## The older static sites’ pages

| Address | Priority | Action | First response | Final destination | Owner | Evidence | Note |
|---|---|---|---|---|---|---|---|
| `/contact.html` | Low | redirect | 301 | `/contact/` | engineering | wayback, static-2025 |  |
| `/tours.html` | Low | redirect | 301 | `/tours/` | engineering | wayback |  |
| `/gallery.html` | Low | redirect | 301 | `/tours/` | engineering (H2) | wayback |  |
| `/about-us.html` | Low | redirect | 301 | `/about/` | engineering | static-2025 |  |
| `/our-offer.html` | Low | redirect | 301 | `/services/` | engineering | static-2025 | “Our Tour Services” |
| `/customer-protection.html` | Low | redirect | 301 | `/safety/` | engineering | static-2025 | “Your Safety is Our Priority” |

## Images at the booking site’s /media/ addresses

| Address | Priority | Action | First response | Final destination | Owner | Evidence | Note |
|---|---|---|---|---|---|---|---|
| `/media/tours/gallery/Cape_Town_City_Private_Tour0.webp` | Medium | asset | 200 | `/media/tours/gallery/Cape_Town_City_Private_Tour0.webp` | engineering | gsc-crawl, register, media-store, wp-backup, django-export | Bo-Kaap and Devil’s Peak; people far. The same photograph is on the site already (bokaap-street, U, the owner’s enlargement): served unaltered. |
| `/media/tours/gallery/Gardern_Route_3_1.webp` | Medium | asset | 200 | `/media/tours/gallery/Gardern_Route_3_1.webp` | engineering | gsc-crawl, register, media-store, wp-backup, django-export | Hermanus whale sculpture, two guests. On the site already (hermanus-whale-sculpture, W, consent P1): served unaltered. |
| `/media/tours/gallery/Gardern_Route_4_1.webp` | Medium | asset | 200 | `/media/tours/gallery/Gardern_Route_4_1.webp` | engineering | gsc-crawl, register, media-store, wp-backup, django-export | Rooiberg’s red chair; one person, far. On the site already (rooiberg-red-chair, U): served unaltered. |
| `/media/tours/gallery/Gardern_Route_5_1.webp` | Medium | asset | 200 | `/media/tours/gallery/Gardern_Route_5_1.webp` | engineering | gsc-crawl, register, media-store, wp-backup, django-export | The Map of Africa viewpoint, two guests. On the site already (map-of-africa-viewpoint, W, consent P1): served unaltered. |
| `/media/tours/gallery/38.webp` | Medium | hold | 404 (until decided) |  | owner (H3) | gsc-crawl, register, media-store | Airport arrivals: a guest and a driver from behind, a bystander’s face in view. Not yet approved for this site. |
| `/media/tours/gallery/Gardern_Route_1_2.webp` | Medium | hold | 404 (until decided) |  | owner (H3) | gsc-crawl, register, media-store, wp-backup, django-export | Cango Caves sign, an identifiable guest (the same guest is in the approved cango-caves, P2). Not yet approved for this site. |
| `/media/tours/gallery/wine_tasting.webp` | Medium | hold | 404 (until decided) |  | owner (H3) | gsc-crawl, register, media-store, wp-backup, django-export | A guest at a wine estate’s fireside, identifiable. Not yet approved for this site. |
| `/media/tours/citytour_L6J9iiN.png` | Medium | hold | 404 (until decided) |  | owner (H3) | gsc-crawl, register, media-store, wp-backup | The old site’s “Cape Town City Tour” card: lettering over a photograph of two identifiable guests. |
| `/media/tours/shark-cage-diving.png` | Medium | hold | 404 (until decided) |  | owner (H3) | gsc-crawl, register, media-store, wp-backup, django-export | The old site’s “Shark Cage Diving” card: no people; who took the underwater photograph in it is not recorded (D3). |
| `/media/gallery/19.png` | Medium | hold | 404 (until decided) |  | owner (H3) | gsc-crawl, register, media-store | The old gallery’s framed photograph of two identifiable guests at Groot Constantia. |
| `/media/tours/gallery/Cape_Town_City_Private_Tour7_2.webp` | Medium | retire | 404 |  | engineering | gsc-crawl, register, media-store, wp-backup, django-export | Two children with their family: byte for byte the photograph the rights register withdrew (company-garden-guide, P4). Never served. |
| `/media/gallery/33.png` | Medium | retire | 404 |  | engineering | gsc-crawl, register, media-store | Children in the frame (P4). Never served. |
| `/media/tours/peninsula_WsHDY45.png` | Medium | retire | 404 |  | engineering | gsc-crawl, register, media-store, wp-backup | The old “Cape Peninsula Adventure” card: two young people who may be under 18 (the rule that withdrew peninsula-granite-bay, P4). Never served. |
| `/media/tours/gallery/36.webp` | Medium | retire | 404 |  | engineering | gsc-crawl, register, media-store | An arrivals welcome sign with a guest’s full name handwritten on it: personal information. The site’s own copy is blurred; the original cannot be altered at this address. Never served. |

## Everything under each tour’s old address

| Address | Priority | Action | First response | Final destination | Owner | Evidence | Note |
|---|---|---|---|---|---|---|---|
| `/tour/cape-peninsula-private-tour/*` | Low | prefix | 301 | `/tours/cape-peninsula-private-tour/` | engineering | pattern | Any page under the booking site’s tour address (1 addresses, e.g. `/tour/cape-peninsula-private-tour/feed/`) |
| `/tour/cape-town-city-private-tour/*` | Low | prefix | 301 | `/tours/cape-town-city-private-tour/` | engineering | pattern | Any page under the booking site’s tour address (1 addresses, e.g. `/tour/cape-town-city-private-tour/feed/`) |
| `/tour/township-private-tour/*` | Low | prefix | 301 | `/tours/township-private-tour/` | engineering | pattern | Any page under the booking site’s tour address (1 addresses, e.g. `/tour/township-private-tour/feed/`) |
| `/tour/cape-winelands-private-tour/*` | Low | prefix | 301 | `/tours/cape-winelands-private-tour/` | engineering | pattern | Any page under the booking site’s tour address (1 addresses, e.g. `/tour/cape-winelands-private-tour/feed/`) |
| `/tour/cape-peninsula-adventure/*` | Low | prefix | 301 | `/tours/cape-peninsula-private-tour/` | engineering | audit, wp-backup | 6 WordPress attachment page(s), plus feeds (6 addresses, e.g. `/tour/cape-peninsula-adventure/%f0%9f%a7%ad-cape-peninsula-private-tour/`, `/tour/cape-peninsula-adventure/%f0%9f%a7%ad-cape-peninsula-private-tour-gallery/`) |
| `/tour/cape-town-city-tour/*` | Low | prefix | 301 | `/tours/cape-town-city-private-tour/` | engineering | audit, wp-backup | 11 WordPress attachment page(s), plus feeds (11 addresses, e.g. `/tour/cape-town-city-tour/cape-town-city-private-tour/`, `/tour/cape-town-city-tour/cape-town-city-private-tour-gallery/`) |
| `/tour/township-cultural-tour/*` | Low | prefix | 301 | `/tours/township-private-tour/` | engineering | audit, wp-backup | 4 WordPress attachment page(s), plus feeds (4 addresses, e.g. `/tour/township-cultural-tour/%f0%9f%8c%8d-township-private-tour/`, `/tour/township-cultural-tour/%f0%9f%8c%8d-township-private-tour-gallery/`) |
| `/tour/winelands-experience/*` | Low | prefix | 301 | `/tours/cape-winelands-private-tour/` | engineering | audit, wp-backup | 9 WordPress attachment page(s), plus feeds (9 addresses, e.g. `/tour/winelands-experience/%f0%9f%8d%b7-cape-winelands-private-tour/`, `/tour/winelands-experience/%f0%9f%8d%b7-cape-winelands-private-tour-gallery/`) |
| `/tour/airport-private-transfer/*` | Low | prefix | 301 | `/transfers/` | engineering | audit, wp-backup | 3 WordPress attachment page(s), plus feeds (3 addresses, e.g. `/tour/airport-private-transfer/%e2%9c%88%ef%b8%8f-airport-private-transfer/`, `/tour/airport-private-transfer/%e2%9c%88%ef%b8%8f-airport-private-transfer-gallery/`) |
| `/tour/shark-cage-diving/*` | Low | prefix | 301 | `/tours/shark-cage-diving/` | engineering | audit, wp-backup | 3 WordPress attachment page(s), plus feeds (3 addresses, e.g. `/tour/shark-cage-diving/%f0%9f%a6%88-shark-cage-diving/`, `/tour/shark-cage-diving/%f0%9f%a6%88-shark-cage-diving-gallery/`) |
| `/tour/garden-route-private-tour/*` | Low | prefix | 301 | `/packages/garden-route-private-tour/` | engineering | audit, wp-backup | 7 WordPress attachment page(s), plus feeds (7 addresses, e.g. `/tour/garden-route-private-tour/%f0%9f%8c%bf-garden-route-private-tour/`, `/tour/garden-route-private-tour/%f0%9f%8c%bf-garden-route-private-tour-gallery/`) |
| `/tour/whale-watching-private-tour/*` | Low | prefix | 301 | `/tours/whale-watching-private-tour/` | engineering | audit, wp-backup | 3 WordPress attachment page(s), plus feeds (3 addresses, e.g. `/tour/whale-watching-private-tour/%f0%9f%90%8b-whale-watching-private-tour/`, `/tour/whale-watching-private-tour/%f0%9f%90%8b-whale-watching-private-tour-gallery/`) |
| `/tour/sky-diving/*` | Low | prefix | 301 | `/tours/sky-diving/` | engineering | audit, wp-backup | 3 WordPress attachment page(s), plus feeds (3 addresses, e.g. `/tour/sky-diving/%f0%9f%aa%82-sky-diving/`, `/tour/sky-diving/%f0%9f%aa%82-sky-diving-gallery/`) |
| `/tour/cape-agulhas-private-tour/*` | Low | prefix | 301 | `/tours/cape-agulhas-private-tour/` | engineering | audit, wp-backup | 3 WordPress attachment page(s), plus feeds (3 addresses, e.g. `/tour/cape-agulhas-private-tour/%f0%9f%87%bf%f0%9f%87%a6-cape-agulhas-private-tour/`, `/tour/cape-agulhas-private-tour/%f0%9f%87%bf%f0%9f%87%a6-cape-agulhas-private-tour-gallery/`) |
| `/tour/private-cape-town-experience/*` | Low | prefix | 301 | `/tours/private-cape-town-experience/` | engineering | audit, wp-backup | 2 WordPress attachment page(s), plus feeds (2 addresses, e.g. `/tour/private-cape-town-experience/private-cape-town-experience-2/`, `/tour/private-cape-town-experience/private-cape-town-experience-gallery/`) |
| `/tour/quad-biking/*` | Low | prefix | 301 | `/tours/quad-biking/` | engineering | audit, wp-backup | 2 WordPress attachment page(s), plus feeds (2 addresses, e.g. `/tour/quad-biking/%f0%9f%8f%8d%ef%b8%8f-quad-biking/`, `/tour/quad-biking/%f0%9f%8f%8d%ef%b8%8f-quad-biking-gallery/`) |

## Everything under a category whose page is not /tours/

| Address | Priority | Action | First response | Final destination | Owner | Evidence | Note |
|---|---|---|---|---|---|---|---|
| `/tour-category/multi-day-tours/*` | Low | prefix | 301 | `/packages/` | engineering | pattern, wp-backup |  (1 addresses, e.g. `/tour-category/multi-day-tours/feed/`) |
| `/tour-category/airport-pickups/*` | Low | prefix | 301 | `/transfers/` | engineering | gsc-crawl, wp-backup |  (1 addresses, e.g. `/tour-category/airport-pickups/feed/`) |
| `/tour-category/cultural-tours/*` | Low | prefix | 301 | `/tours/township-private-tour/` | engineering | pattern, wp-backup |  (1 addresses, e.g. `/tour-category/cultural-tours/feed/`) |
| `/tour-category/cultural-experiences/*` | Low | prefix | 301 | `/tours/township-private-tour/` | engineering | pattern, wp-backup |  (1 addresses, e.g. `/tour-category/cultural-experiences/feed/`) |
| `/tour-category/city-tours/*` | Low | prefix | 301 | `/tours/cape-town-city-private-tour/` | engineering | pattern, wp-backup |  (1 addresses, e.g. `/tour-category/city-tours/feed/`) |
| `/tour-category/peninsula-tours/*` | Low | prefix | 301 | `/tours/cape-peninsula-private-tour/` | engineering | pattern, wp-backup |  (1 addresses, e.g. `/tour-category/peninsula-tours/feed/`) |
| `/tour-category/winelands/*` | Low | prefix | 301 | `/tours/cape-winelands-private-tour/` | engineering | pattern, wp-backup |  (1 addresses, e.g. `/tour-category/winelands/feed/`) |

## Catch-alls

| Address | Priority | Action | First response | Final destination | Owner | Evidence | Note |
|---|---|---|---|---|---|---|---|
| `/users/book/*` | Low | prefix | 301 | `/enquire/` | engineering | pattern | A booking page for any other (retired) offering: the form, nothing chosen. (1 addresses, e.g. `/users/book/retired-tour/`) |
| `/tour/*` | Low | prefix | 301 | `/tours/` | engineering | audit |  (2 addresses, e.g. `/tour/feed/`, `/tour/retired-tour/`) |
| `/tour-category/*` | Low | prefix | 301 | `/tours/` | engineering | audit |  (2 addresses, e.g. `/tour-category/day-tours/feed/`, `/tour-category/private-tours/page/2/`) |
| `/wp-sitemap-*` | Low | prefix | 301 | `/sitemap.xml` | engineering | audit |  (3 addresses, e.g. `/wp-sitemap-posts-tour-1.xml`, `/wp-sitemap-posts-page-1.xml`) |

## Retired on purpose

| Address | Priority | Action | First response | Final destination | Owner | Evidence | Note |
|---|---|---|---|---|---|---|---|
| `/wp-content/uploads/*` | Low | retire | 404 |  | engineering | gsc-crawl, register, audit, wp-backup | WordPress’s two-day-old copies of the booking site’s photographs. An image redirected to a page passes nothing to image search (the audit); the originals that may be kept are at their /media/ addresses. (56 addresses, e.g. `/wp-content/uploads/2026/11/Airpost.webp`, `/wp-content/uploads/2026/11/Cape_Agulhas.webp`) |
| `/static/*` | Low | retire | 404 |  | engineering | gsc-crawl, register | The booking site’s theme files: slides, logos, favicons, the accreditation badge, styles and scripts. (29 addresses, e.g. `/static/css/about.066a697615f7.css`, `/static/css/animate.min.e78c4ece198b.css`) |
| `/image/*` | Low | retire | 404 |  | engineering | wayback | The 2021–2022 static site’s images; none has answered since 2022. (37 addresses, e.g. `/image/about_banner.jpg`, `/image/banner/banner-1.jpg`) |
| `/wp-*` | Low | retire | 404 |  | engineering | gsc-crawl, register, audit | WordPress system files (the sitemaps excepted, above). (8 addresses, e.g. `/wp-login.php`, `/wp-admin/`) |
| `/xmlrpc.php` | Low | retire | 404 |  | engineering | audit, wp-backup |  |
| `/hello-world/` | Low | retire | 404 |  | engineering | audit, wp-backup | WordPress’s sample post. (1 addresses, e.g. `/hello-world/feed/`) |
| `WordPress archives and feeds` | Low | retire | 404 |  | engineering | audit, wp-backup | Feeds, the category, date, author and search archives (the author archive’s real name is not recorded here). (8 addresses, e.g. `/feed/`, `/comments/feed/`) |
| `Apple app-site association` | Low | retire | 404 |  | engineering | gsc-crawl, register |  (2 addresses, e.g. `/apple-app-site-association`, `/.well-known/apple-app-site-association`) |
| `/images/*` | Low | retire | 404 |  | engineering | static-2025 | The May 2025 static pages’ images. (3 addresses, e.g. `/images/logo.png`, `/images/banner.png`) |
| `/cdn-cgi/*` | Low | retire | 404 |  | platform | gsc-crawl, register | Cloudflare’s email obfuscation on the booking site (the page and its script). Email Obfuscation stays off on the new zone (setup.mjs domain): its rewriting is blocked by the site’s security policy. (2 addresses, e.g. `/cdn-cgi/l/email-protection`, `/cdn-cgi/scripts/5c5dd728/cloudflare-static/email-decode.min.js`) |

## WordPress query links

| Address | Priority | Action | First response | Final destination | Owner | Evidence | Note |
|---|---|---|---|---|---|---|---|
| `/?p=1` | Low | query | 200 | `/` | engineering | audit, wp-backup | _redirects cannot match a query string (Pages drops it from a rule’s source, so such a rule would redirect the home page itself): the home page answers, canonical /. Never publicly linked (the audit). |
| `/?p=9` | Low | query | 200 | `/` | engineering | audit, wp-backup | _redirects cannot match a query string (Pages drops it from a rule’s source, so such a rule would redirect the home page itself): the home page answers, canonical /. Never publicly linked (the audit). |
| `/?p=13` | Low | query | 200 | `/` | engineering | audit, wp-backup | _redirects cannot match a query string (Pages drops it from a rule’s source, so such a rule would redirect the home page itself): the home page answers, canonical /. Never publicly linked (the audit). |
| `/?p=16` | Low | query | 200 | `/` | engineering | audit, wp-backup | _redirects cannot match a query string (Pages drops it from a rule’s source, so such a rule would redirect the home page itself): the home page answers, canonical /. Never publicly linked (the audit). |
| `/?p=20` | Low | query | 200 | `/` | engineering | audit, wp-backup | _redirects cannot match a query string (Pages drops it from a rule’s source, so such a rule would redirect the home page itself): the home page answers, canonical /. Never publicly linked (the audit). |
| `/?p=24` | Low | query | 200 | `/` | engineering | audit, wp-backup | _redirects cannot match a query string (Pages drops it from a rule’s source, so such a rule would redirect the home page itself): the home page answers, canonical /. Never publicly linked (the audit). |
| `/?p=28` | Low | query | 200 | `/` | engineering | audit, wp-backup | _redirects cannot match a query string (Pages drops it from a rule’s source, so such a rule would redirect the home page itself): the home page answers, canonical /. Never publicly linked (the audit). |
| `/?p=36` | Low | query | 200 | `/` | engineering | audit, wp-backup | _redirects cannot match a query string (Pages drops it from a rule’s source, so such a rule would redirect the home page itself): the home page answers, canonical /. Never publicly linked (the audit). |
| `/?p=40` | Low | query | 200 | `/` | engineering | audit, wp-backup | _redirects cannot match a query string (Pages drops it from a rule’s source, so such a rule would redirect the home page itself): the home page answers, canonical /. Never publicly linked (the audit). |
| `/?p=43` | Low | query | 200 | `/` | engineering | audit, wp-backup | _redirects cannot match a query string (Pages drops it from a rule’s source, so such a rule would redirect the home page itself): the home page answers, canonical /. Never publicly linked (the audit). |
| `/?p=48` | Low | query | 200 | `/` | engineering | audit, wp-backup | _redirects cannot match a query string (Pages drops it from a rule’s source, so such a rule would redirect the home page itself): the home page answers, canonical /. Never publicly linked (the audit). |
| `/?p=60` | Low | query | 200 | `/` | engineering | audit, wp-backup | _redirects cannot match a query string (Pages drops it from a rule’s source, so such a rule would redirect the home page itself): the home page answers, canonical /. Never publicly linked (the audit). |
| `/?p=67` | Low | query | 200 | `/` | engineering | audit, wp-backup | _redirects cannot match a query string (Pages drops it from a rule’s source, so such a rule would redirect the home page itself): the home page answers, canonical /. Never publicly linked (the audit). |
| `/?page_id=6` | Low | query | 200 | `/` | engineering | audit, wp-backup | _redirects cannot match a query string (Pages drops it from a rule’s source, so such a rule would redirect the home page itself): the home page answers, canonical /. Never publicly linked (the audit). |
| `/?page_id=7` | Low | query | 200 | `/` | engineering | audit, wp-backup | _redirects cannot match a query string (Pages drops it from a rule’s source, so such a rule would redirect the home page itself): the home page answers, canonical /. Never publicly linked (the audit). |
| `/?page_id=8` | Low | query | 200 | `/` | engineering | audit, wp-backup | _redirects cannot match a query string (Pages drops it from a rule’s source, so such a rule would redirect the home page itself): the home page answers, canonical /. Never publicly linked (the audit). |
| `/?page_id=81` | Low | query | 200 | `/` | engineering | audit, wp-backup | _redirects cannot match a query string (Pages drops it from a rule’s source, so such a rule would redirect the home page itself): the home page answers, canonical /. Never publicly linked (the audit). |
| `/?page_id=82` | Low | query | 200 | `/` | engineering | audit, wp-backup | _redirects cannot match a query string (Pages drops it from a rule’s source, so such a rule would redirect the home page itself): the home page answers, canonical /. Never publicly linked (the audit). |
| `/?page_id=83` | Low | query | 200 | `/` | engineering | audit, wp-backup | _redirects cannot match a query string (Pages drops it from a rule’s source, so such a rule would redirect the home page itself): the home page answers, canonical /. Never publicly linked (the audit). |
| `/?page_id=84` | Low | query | 200 | `/` | engineering | audit, wp-backup | _redirects cannot match a query string (Pages drops it from a rule’s source, so such a rule would redirect the home page itself): the home page answers, canonical /. Never publicly linked (the audit). |
| `/?s=tour` | Low | query | 200 | `/` | engineering | audit, wp-backup | _redirects cannot match a query string (Pages drops it from a rule’s source, so such a rule would redirect the home page itself): the home page answers, canonical /. Never publicly linked (the audit). |
| `/?amp=1` | Low | query | 200 | `/` | engineering | audit, wp-backup | _redirects cannot match a query string (Pages drops it from a rule’s source, so such a rule would redirect the home page itself): the home page answers, canonical /. Never publicly linked (the audit). |

## Host redirects at the cutover

| Address | Priority | Action | First response | Final destination | Owner | Evidence | Note |
|---|---|---|---|---|---|---|---|
| `www.goodtimesincapetown.co.za/*` | Critical | host | 301 (at cutover) | `https://goodtimesincapetown.co.za/:path` | cutover (A2) | gsc, gsc-links, gsc-crawl, register | www holds much of the home page’s search traffic and most of its external links. A zone redirect rule, path and query kept (setup.mjs domain). Which host is canonical is A2: whichever it is, the other answers 301 to it. |
| `http://goodtimesincapetown.co.za/*` | High | host | 301 (at cutover) | `https://goodtimesincapetown.co.za/:path` | cutover | audit, wayback | Always Use HTTPS on the zone (Pages also forces HTTPS on its custom domains). The WordPress site served inner pages over http without a redirect (the audit). |
