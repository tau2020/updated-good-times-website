# Media audit — independent critique (Gate F)

The report below is the independent critic's, unedited. The critic was a separate reviewer, briefed only with a plain
summary of what the owner asked for and the two preview URLs: the baseline (`media-baseline`, approved `9e9b201`) and
the feature (`media-preview`). It was asked to be sceptical, to look at the browser rather than at anyone's claims, and
to report with its own severities. It was told not to read `audit/`, `docs/` or the git history, and could read the tour
and package data only for what each tour includes. It ran from 09:59 to 11:05 UTC on 6 November 2026, in a cloud
browser, at 375 to 1920 px. During that time the fixes from the browser tests and the crop review were being deployed to
the same alias (`daccb97` to `b529be0`), so a few of its observations predate them; each finding was checked again on
the final deployment.

Only its evidence paths are changed: they pointed at its scratch folder, and now point at the compressed copies
committed in `critic/` (PNG to JPEG; the pictures are otherwise as it made them). What was done about each finding is
in `final-image-verification.md` § "Independent critique (Gate F)". The critic's words carry no approval: they are
findings to act on, checked again on the preview after each fix.

---

## Visual audit of the media changes (AFTER: media-preview, compared against BEFORE: media-baseline)

I found no critical defects, but six major ones. Three of the owner's specific fixes were not delivered or only partly delivered, and the media work caused several visible regressions.

How I checked: headless Chromium at DPR 1 on 23 routes at 375, 390, 768, 1024, 1440 and 1920 px. I opened every gallery, lightbox, phone zoom, the concierge panel and the mobile menu, and scrolled the sand journey in steps of 1.5 s. I also ran a pixel-correlation search over all 113 AFTER photos that catches crops, resizes and flips.

### 1. Findings, most severe first

**M1. Major. `/`, every width tested (375–1920), hero "Cape Town Memories" phone, slide 1.**
- The caption "Chapman's Peak Drive" sits on top of the pager dots. The dots run through "Peak Drive".
- The photo (chapmans-peak-couple) is 9:16, which pushes the caption to the bottom of the screen.
- This is the slide every visitor sees on load. In BEFORE, captions sat about 70 px above the dots.
- Evidence: `critic/phone-slide1-overlap-all-widths.jpg` and `critic/phone-slides-390.jpg`

**M2. Major. `/`, all widths, "The moments between destinations". Goat tower fix not delivered.**
- fairview-goat-tower is the same file, byte-identical to BEFORE. Only its frame changed from 3:2 to 4:3.
- The file is a close-up of two goats in one arch of a brick wall. The tower still can't be recognised.
- Evidence: `critic/goat-lunch-selfie-before-after-half.jpg` and `critic/goat-lunch-full.jpg`

**M3. Major. `/`, "The Cape is also something you taste". Outdoor tasting / tasting table fix not delivered.**
- winelands-host-pouring and winelands-tasting-table are byte-identical to BEFORE, with identical crops.
- The main photo is soft: an 800 px file stretched to about 1,095 px at 1440.
- The inset cuts the guests off at both edges.
- Evidence: `critic/home-taste-1440.jpg`

**M4. Major. Tour pages lost content as a side effect of removing duplicates.**
- Whale Watching and Quad Biking no longer have a Gallery tab.
- Quad Biking and Private Cape Town Experience lost the full-width "View Gallery" photo band. Private Experience still has a 2-photo gallery, so dropping its band is inconsistent with the other tours.
- These pages are 450–480 px shorter at 1440 and 1920.
- Whale Watching (hermanus-frame) and Quad Biking (quad-bikes-convoy) now use their card photo as the page hero. In BEFORE they had a separate photo.
- Evidence: `critic/tabs-removed-before-after.jpg`

**M5. Major. Licensed photos are shown without their credit, and stock photos read as the company's own.**
- shark-cage-gansbaai (CC BY-SA 4.0, Wikimedia) is the "Adventure Activities" card on `/`. It is also the "Add an Adventure" image in the concierge and menu on every page. No credit appears beside it anywhere.
- agulhas-lighthouse (CC BY-SA 4.0) only ever appears as a card: on /tours/, in the booking choice, and in "Similar private days". It is never shown with its credit.
- On /tours/ and the Quad Biking page, the skydive-tandem card sits next to "aerial views of Cape Town" without the "not taken in Cape Town" note that the Sky Diving page carries.
- The Photo credits section on /privacy/ says these photos are "credited below and beside them". That is not true here.
- Evidence: `critic/home-ways-1440.jpg` and `critic/drawer-390.jpg`

**M6. Major. /tours/cape-winelands-private-tour/, every width from 390 to 1920, "The pleasures along the way" inset.**
- winelands-estate-terrace is a landscape shot of two guests and a waiter, placed in a portrait slot.
- What shows is one woman, a hand holding a bottle and a camera. The waiter and the second guest are cut away.
- The caption is "Lunch on an estate terrace", but no food is visible.
- It is upscaled about 1.4× at 1440.
- Evidence: `critic/winelands-taste-1440.jpg` and `critic/winelands-estate-terrace-full.jpg`

**Minor**

- **m1. `/` layout shift.** The goat-tower frame went from 3:2 to 4:3 and the garden-lunch frame from 3:2 to 5:4. Everything below them moves down by 41 px at 1440, 77 at 390, 46 at 768, 29 at 1024 and 44 at 1920.
- **m2. Agulhas and Sky Diving hero layout changed.**
  - Both moved from the framed hero (title beside the image) to the full-bleed hero, with a new credit pill. Page heights change by +245 px at 1440 and −195 px at 768.
  - On Agulhas, the "Indian Ocean | Atlantic Ocean" sign is cropped out at 1440 and 1920 and half cut at 1024. At 768 the credit pill covers "Atlantic Ocean".
  - Evidence: `critic/agulhas-sky-before-after.jpg` and `critic/hero-crops-detail.jpg`
- **m3. Beach film is soft on large screens.** The film and its poster are only 1280×720, so they are upscaled 1.5× at 1920. They look visibly softer than the 1600 px still they replaced. Evidence: `critic/sand-1920-zoom.jpg`
- **m4. Castle only partly fixed.** In "A city day at the Castle of Good Hope" (castle-table-mountain), the Castle is a dark wall behind reeds and the couple is the real subject. Evidence: `critic/strips-castle.jpg`
- **m5. Not much variety, and several near-twin photos.**
  - The phone gallery is six posed guest photos, four of them from the Cape Peninsula.
  - The same Chapman's Peak wall appears in three near-identical group shots: the Private Tours card, phone slide 1 and the Private Experience gallery.
  - The couple in the green "Packers" shirt appears three times.
  - The Winelands gallery is now four wine-table shots, with no Fairview, Mandela statue or Franschhoek.
  - The transfers card is three "All Departures" sign shots; the main one has guests in face masks.
  - cape-point-cliffs and cape-point-headland are the same view taken twice; so are cape-of-good-hope-cove and diaz-beach-cove.
  - Evidence: `critic/same-scene-groups.jpg`, `critic/near-dupes.jpg` and `critic/transfers-mosaic-1440.jpg`
- **m6. Langa expansion is thin.**
  - Of the five new photos, three are museum text panels or rooms and two are empty homes. None shows the arts centre, the drumming or residents.
  - "Welcomed into a home" (lightbox 11 on `/`) shows guests seated in a family's living room. The tour page does not list a home visit.
  - Evidence: `critic/galleries-390.jpg`
- **m7. Cape Minstrels lightbox (`/`, item 3).** It is linked to the City tour, which doesn't list it, and it has no "luck, never a promise" note like the zebra photo.
- **m8. Garden Route gallery, "A garden path".** It is a generic garden with no place named and nothing that identifies the Garden Route. Evidence: `critic/garden-route-gallery-1440.jpg`
- **m9. Food coverage is partial.** Only burger-lunch-guide and lunch-spread-guests actually show food.
  - In pergola-lunch-table (/destinations/), the food is barely visible, the bottom 40% of the frame is floor, and the copy says "under the vines" while the photo shows a reed pergola.
  - Evidence: `critic/destinations-taste-1440.jpg`
- **m10. Group photos cropped.**
  - The /about/ "A mural in Langa" inset crops the four guests and the LANGA lettering at every width.
  - The lunch-spread-guests tile on `/` cuts the four guests down to about two and a half.
  - Evidence: `critic/about-pair-before-after.jpg`
- **m11. Leftovers and an existing repeat.**
  - The soft airport-welcome-sign photo is still in the /transfers/ Airport tab.
  - The photo band repeats gallery photo 1 on the Peninsula, City, Winelands and Township pages. This pattern was already in BEFORE, so the owner should decide whether it counts as a duplicate.

### 2. Checked and looks right

- **Beach film behaviour.**
  - The file has no audio track and plays muted.
  - It loops, shows no controls and is hidden from screen readers.
  - It loads at about 42% of the scroll and starts under the sand at about 50%, before the sweep. It fades in only once a frame is showing.
  - Frame 0 lines up exactly with the poster (0 px shift) at 1440×900, 390×844 and 844×390.
  - The loop seam is smooth, and it pauses when scrolled out of view.
  - With reduced motion it is hidden and never requested, and the poster shows. With ?nomotion the poster shows.
  - The footprints and the sweep match BEFORE at 1440 and 390.
  - Evidence: `critic/sand-before-after-1440.jpg` and `critic/sand-after-1440-reduce-log.txt`
- **Owner portrait on /about/.** Head and face are whole, with good headroom and no distortion, from 375 to 1920. Evidence: `critic/about-strips.jpg`
- **Placeholders and animals.** No placeholder remains anywhere, and there is no cheetah or lion.
- **Duplicates.** Apart from the allowed exceptions and the photo-band pattern, I found no repeated, cropped or recoloured photo. The search was tested beforehand with deliberate crops.
- **Specific fixes that landed.**
  - The phone-gallery photos are authentic and sharp, and all six zooms work.
  - The home lightbox (12 photos), the tour lightboxes and the concierge panel all work, and their captions match the photos.
  - "A selfie above the bay" shows both people and the coast at every width.
  - "Lunch in a Winelands garden" now shows guests, food and garden.
  - "Lunch with our guide" shows exactly guests and guide at lunch, and the lunch and tasting copy says they are not included in the price.
  - The transfer service photo is now sharp.
- **Errors and unchanged parts.**
  - There are no console errors, failed requests or broken images.
  - The JavaScript is unchanged apart from the sand-journey script. CSS changes are limited to the film, the credit pill and photo positioning.
  - Navigation, footer, body text and the booking form are unchanged, apart from photo captions, credits and photo counts.

### 3. Could not check

- I only used headless Chromium with software WebGL. I did not test Safari or iOS (autoplay in low-power mode), Firefox or real devices. I judged high-DPI sharpness by calculation rather than screenshots.
- I can't tell from the site where the photos came from, whether they are licensed or consented, who the people are, or whether the film is AI-made.
- I can't tell whether skydiving image generation was attempted and reported as blocked.
- I submitted no forms.
