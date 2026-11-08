# Historical media: the 14 images at the booking site's /media/ addresses

Step 4B, Phase C (8 Nov 2026). Search Console's crawl stats show Googlebot-Image requesting 14 images at the old booking site's `/media/…` addresses between 28 Oct and 7 Nov 2026; all 14 now answer 404. This file records where each original was found, what it shows, and what the new site does with its address. The registry entries are in `src/data/legacy-urls.mjs` (group "Images at the booking site's /media/ addresses"); the build serves the kept files from `src/legacy-media/` and refuses any byte that differs from the checksum recorded here.

## The rule applied

An original is served again at its historical address, **unaltered**, only when all of these hold (or, for rules 2 and 4, when the owner has approved it: H3, 8 Nov 2026):

1. it is the original file: found at its source, and its checksum recorded;
2. the rights register (`docs/RIGHTS_REGISTER.md`) already covers that photograph for this site: the same photograph is approved and in use here (basis W, company-owned website photographs, or U, the owner's enlargement of one);
3. it shows no child and no one who may be under 18 (P4), and no personal information;
4. it shows no identifiable person whose photograph the owner has not already approved for this site.

A file that fails rule 3 is **retired** for good (404). A file that failed only rule 2 or 4 was **held** (404) until the owner decided: on 8 Nov 2026 the owner approved all six (approval register H3), and they are now served like the first four. Nothing is cropped, blurred, re-encoded or replaced: an address either serves the original or answers 404. Redirecting an image to a page passes nothing to image search, so no image address is redirected.

## Where the originals were found

| Source | What it holds | How it was checked |
|---|---|---|
| The booking site's media store, still online (the DigitalOcean Spaces bucket the booking site served `/media/` from; the WordPress theme's import code names it) | All 14 originals | Downloaded on 8 Nov 2026 (GET only); each file's MD5 equals the store's ETag |
| The hosting account's backup of 7 Nov 2026 (`wp-content/uploads/2026/11/`) | 10 of the 14, copied there by the WordPress import of 5 Nov 2026 | SHA-256 identical to the store's copy, byte for byte |
| The booking site's own export, in the WordPress theme (`migration-data/export.json`) | The `/media/` paths of 8 of them, as the booking site recorded them | Path for path |
| `media-src/` (the owner's Drive copies used by the site) | The same photographs as 4 of them, as approved Drive copies or the owner's enlargements | By eye, side by side |

The originals and the review sheets are kept outside the repository (the session's evidence folder); copies of the 14 belong in the owner's private Drive (Good Times Web Migration), not on GitHub.

## Decisions

| Address | Bytes | SHA-256 (first 16) | What it shows | Decision |
|---|---|---|---|---|
| `/media/tours/gallery/Cape_Town_City_Private_Tour0.webp` | 169,632 | `94c0354c668150d0` | Bo-Kaap and Devil's Peak; people far | **Kept**: the same photograph is in use (bokaap-street, U) |
| `/media/tours/gallery/Gardern_Route_3_1.webp` | 117,634 | `55da00ddf963a7ea` | The Hermanus whale sculpture, two guests | **Kept**: in use (hermanus-whale-sculpture, W, consent P1) |
| `/media/tours/gallery/Gardern_Route_4_1.webp` | 148,944 | `db25be6fa4e96815` | Rooiberg's red chair, one person far | **Kept**: in use (rooiberg-red-chair, U) |
| `/media/tours/gallery/Gardern_Route_5_1.webp` | 110,812 | `38755ffc9da2f480` | The Map of Africa viewpoint, two guests | **Kept**: in use (map-of-africa-viewpoint, W, consent P1) |
| `/media/tours/gallery/38.webp` | 236,484 | `4820bce49d2cbead` | Airport arrivals: a guest and a driver from behind; a bystander's face in view | **Kept**: approved by the owner (H3, 8 Nov 2026) |
| `/media/tours/gallery/Gardern_Route_1_2.webp` | 38,216 | `9f10419506f26116` | The Cango Caves sign, one identifiable guest (the same guest is in the approved cango-caves, P2) | **Kept**: approved by the owner (H3) |
| `/media/tours/gallery/wine_tasting.webp` | 237,634 | `260fac95ae3f4356` | A guest by a wine estate's fireside, identifiable | **Kept**: approved by the owner (H3) |
| `/media/tours/citytour_L6J9iiN.png` | 1,069,547 | `aaa8df18cefaed05` | The old site's "Cape Town City Tour" card: lettering over two identifiable guests | **Kept**: approved by the owner (H3) |
| `/media/tours/shark-cage-diving.png` | 728,708 | `ea3f3f127e9edc7b` | The old site's "Shark Cage Diving" card; no people. Who took the underwater photograph in it is not recorded (D3) | **Kept**: approved by the owner (H3); the photographer is still unrecorded |
| `/media/gallery/19.png` | 1,197,893 | `c74a03adc8e7099f` | The old gallery's framed photograph of two identifiable guests at Groot Constantia | **Kept**: approved by the owner (H3) |
| `/media/tours/gallery/Cape_Town_City_Private_Tour7_2.webp` | 212,180 | `1e3b1f451826e3ad` | Two children with their family: byte for byte the photograph the register withdrew on 5 Nov 2026 (company-garden-guide) | **Retired**: P4 |
| `/media/gallery/33.png` | 1,168,148 | `4fda87b0e0c3f94a` | A group at a viewpoint above Hout Bay, children among them | **Retired**: P4 |
| `/media/tours/peninsula_WsHDY45.png` | 1,032,208 | `1da60c7f9d09d073` | The old "Cape Peninsula Adventure" card: two young people who may be under 18 | **Retired**: P4 (the rule that withdrew peninsula-granite-bay) |
| `/media/tours/gallery/36.webp` | 76,366 | `6d8d4fd883d69708` | An arrivals welcome sign with a guest's full name handwritten on it | **Retired**: personal information; the site's own copy is blurred, and the original cannot be altered at its address |

Full checksums are in the registry. The ten kept originals are now in this repository (`src/legacy-media/`); the four retired ones exist only in the booking site's media store and the hosting backup, and are still publicly readable at the store's own address until it is closed.

## The owner's decision (H3, 8 Nov 2026)

All six held files were approved and are served unaltered at their old addresses (their entries' action changed from `hold` to `asset`; the build checks their bytes against the checksums above). Approving the photographs with identifiable guests rests on the owner's confirmation that those guests agreed to marketing use, as P1 asks for the photographs already in use; the shark card's underwater photograph still has no recorded photographer or licence (D3). Nothing retired comes back without written parental consent (P4) or, for the welcome sign, the guest's consent.

## How it is checked

- `test/legacy-registry.test.mjs`: the ten kept files in `src/legacy-media/` are exactly the kept entries (six of them approved under H3) and match their checksums; no retired original is anywhere under `src/`.
- `test/legacy-urls.test.mjs` and `node qa/legacy-urls.mjs`: on the Pages runtime, the kept addresses answer 200 with the original bytes (SHA-256) and an image content type; the retired ones answer 404 without a redirect.
