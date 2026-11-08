# The independent visual critique, and what changed because of it (8 Nov 2026)

A separate reviewer (an agent briefed only with the brief's design criteria and the before and after screenshots, not
with this work's own reasoning) judged the three changed areas blind, at 1440, 1024, 768 and 390 px. Its scores of the
first version, and what was done about each point.

| Area | Score | Its verdict, in short |
|---|---|---|
| Header | 5/10 | The top untouched, the blur and hairline restrained; but a 78% white glass with `saturate(135%)` takes the colour of whatever is beneath (grey over the dark bands, blue over sky, cream over the sand): rarely "white glass" |
| Backdrops | 3/10 | The steps band's plate read as an acacia savanna at dusk, the image the brief forbids; the memory band's plate was barely visible; the reviews plate was foam with no horizon: textures, not landscapes |
| Reviews chapter | 6/10 | The structure and the labelling meet the brief (proof, postcard, notes, ribbon, "in our words", no stars on themes, no carousel), but five floating cards on a gradient, not yet an editorial spread |

## The least successful element: the steps band's backdrop

The sunset plate put a flat-topped acacia on a pink dusk horizon under the three steps, tinted the steps' copy from
`#F2F6F5` toward a dusty pink and showed pale rings around the step icons. **Corrected**: the plate is now its dusk cloud
alone (no horizon, no tree), behind the heading only, masked out before the steps, their route and the button, which
stay on the band's clean ground (`02-scenic.md`). The reviewer's alternative, a Cape ridgeline, is the better image, but
none was supplied: Good Times' own Twelve Apostles and Table Mountain photographs are already placed elsewhere, and the
site keeps one photograph in one place. A ridgeline plate is the obvious next candidate for the owner (P14).

## The other points

| Point | Done |
|---|---|
| The header's colour casts | The glass is now 80% white, `blur(18px) saturate(125%) brightness(1.06)`: whiter, fewer casts, within the brief's ranges; every header text measures higher than before (`01-header.md`). Not done: a separate near-opaque state over dark bands (a second observer for the same paint; the contrast is already AA everywhere) |
| The reviews plate behind copy | Hidden on phones and tablets (it sat behind the heading and introduction); faded out before the ribbon's small print on wide screens |
| Alignment in the reviews chapter | One 7/5 column system for the head and the cards: the proof and the first note share an edge, the second steps in by a gutter and a half; the postcard aligns to the notes' top |
| The postcard looked like scrapbook clip-art | No tilt, no wave postmark, a smaller stamp pinned in the corner, the label shortened to "In our words" so it never breaks; the white print edge kept. The photograph stays (the departures wave): every other unused Good Times photograph is a near-duplicate of one placed elsewhere |
| Redundancy | The second icon on "Read our reviews" removed (the leaf stays); the ribbon's repeated Tripadvisor link removed; the Google line one link with one underline; the small print at most 60 characters wide. "The reviews speak for themselves" and the repeated "5.0" stay: both are in the owner's own badge |
| The notes' edge bars | Removed: they read as quotation mark-up on words labelled as not quotes |
| The memory band's plate barely visible | Presence raised from 11% to 13%; it stays a whisper by design (the brief's 6–12% for wide bands, and the paragraph beside it) |

## What the reviewer flagged outside the three areas

Everything it listed comes from the 20 commits between the staging deployment (7 Nov) and `main` (8 Nov), or from the
environment, not from this work: the footer's Services and Safety & Trust links and the transfers page's title are the
owner-approved changes of 8 Nov (Step 4B and the Search Console audit); the shark cage line is the Search Console accuracy
repair; prices in rand rather than US dollars on the local server is the currency default without Cloudflare's country
header (a deployed preview shows the visitor's currency as before). The no-show sentence on the transfers page is this
work: the owner's cancellation rule, applied everywhere on purpose (`04-legal-reconciliation.md`).

## The weakest element now

The scenic system is the least convincing part: the supplied photographs are East African wildlife, Casablanca and
generic sky, so the honest placements are atmospheric rather than scenic. With Cape photographs supplied (a ridgeline at
dawn, the Atlantic from Sea Point, fynbos), the same component carries them at once: one record and one build command
(`02-scenic.md` › Adding a placement).
