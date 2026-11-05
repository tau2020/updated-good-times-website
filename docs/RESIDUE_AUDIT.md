# Residue audit

The final check, on 5 Nov 2026, that nothing identifying the template's earlier operator remains in this repository, the build or the staging deployment. The identifiers themselves are listed once, in `src/tools/brand-guard.mjs` (`PATTERNS`), so this document names only their categories. `npm run guard` re-runs the check over every tracked file and the built `site/`, and fails on any hit.

## Method

1. **Pattern sweep** of every tracked file and the built site (`npm run guard`), plus `test/identity.test.mjs` for the enquiry system (it also bans the earlier operator's service promises and integrations).
2. **Asset checksums:** every image, icon, logo, font and media file in `src/assets/` was compared with the template's own files.
3. **Colour sweep:** the template's palette (`tokens.css`) against every stylesheet, partial, page and email template.
4. **Backends and credentials:** every environment variable, email address, database URL, API endpoint, analytics token and Cloudflare setting, in code and in the deployed project.
5. **Rendered output:** the smoke checks against staging assert that no page names the earlier operator. The browser suite checks the rendered pages, and the captured emails were checked for the earlier operator's name.
6. **History:** the repository was created fresh for this conversion; no commit, branch or object from the template's history exists.

## Results

| Category | Result |
|---|---|
| Business names, slogans and people's names | None |
| Domains, website addresses and email addresses | None. The site, its emails and its configuration use only goodtimesincapetown.co.za addresses and the staging address |
| Phone and WhatsApp numbers | None. Only +27 72 376 8432 (Good Times) |
| Listing IDs (Tripadvisor) | None. Only Good Times' listing (d19611200) and its products |
| Reference format | `GT-` only (`lib/enquiries/reference.mjs`); the database and cookies use `gt` names |
| Product names and URLs | None. The template's tour, package and transfer names and slugs are banned by the guard; the current website's addresses redirect to the new pages |
| Logos, favicons and social images | None. All from the Good Times Logo Pack v2 |
| Photographs and video | None. No template image or film remains (checksums); 50 Good Times photographs |
| Fonts | The template's display faces were removed. Inter, an open-source font, is the same file as the template's |
| Colours | The template's brand palette is gone; only neutrals and the standard error, warning and success colours of the form states remain |
| Copy, prices, inclusions, cancellation rules, terms | None. All rewritten from Good Times' own pages |
| Reviews | None. Ten Good Times Tripadvisor reviews, summarised |
| Inboxes, hidden recipients, backends, database, analytics, credentials | None. No environment sends anything (preview mode). The only addresses configured are Good Times' published info@ (production, pending) and nothing on staging; no analytics token; no secret exists in the project |
| Cloudflare | A new project, `good-times-in-cape-town`, in the Good Times account. The account's other Pages project was not touched, no domain is attached, no DNS changed |
| Documentation and decision logs | Not carried over. Code comments still cite the template's design-decision numbers (for example "D66"), which name no business and refer to the framework's own design history |

## Outcome

No identifier of the template's earlier operator remains in the repository, the build or the staging deployment, apart from the guard's own pattern list and the tests that prove those identifiers are refused (each marked `brand-guard-allow`).
