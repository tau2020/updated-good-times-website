# The enhancement brief of 8 Nov 2026

The owner's master enhancement prompt and its legal and reputation addendum, carried out on the branch
`enhancement/glass-scenic-reputation-legal` (from `main` `45e972f`). Not merged, not deployed to production, and not
yet on a Cloudflare preview (no Cloudflare token is provisioned in this environment; `06-qa.md` › G8 has the commands).

| | Report |
|---|---|
| Gate 0: what the site was, measured before any change | `00-baseline.md` |
| A: the header, white at the top, glass once the page moves | `01-header.md` |
| B: the scenic backdrops | `02-scenic.md` |
| C–E: Tripadvisor's proof, the guest voices chapter, Google, the evidence for every trust claim | `03-reputation.md` |
| F: the owner's legal checklist against the approved texts and the site | `04-legal-reconciliation.md` |
| G: the booking rules at 48 hours, and the acceptance matrix | `05-booking.md` |
| QA: every gate, what ran, what passed, what is pending | `06-qa.md` |
| The independent visual critique, and the weakest element | `07-critique.md` |
| Evidence (dated screenshots of the primary sources) | `evidence/` |

## For the owner

Decisions that only the owner can take are in `docs/APPROVAL_REGISTER.md`. New or changed on 8 Nov 2026: **B6** (the
deposit for a booking made under 7 days ahead), **B7** (a South African legal practitioner's sign-off), **R4**
(Tripadvisor's permission for the rating as shown, or its widget instead), **R5** (the review summaries on `/reviews/`),
**T1** reopened and **T2** (the CTGA associate claim and the Certificate of Excellence: the issuing bodies do not list
them), **P14** (the scenic backdrops), **G1** (the Google profile's address), **S6** (the header's glass), **D9** (48 hours,
as the approved document says), and **B3–B5** settled by the checklist. The release gate (`node scripts/release-gate.mjs`)
holds production on B7 and R4.
