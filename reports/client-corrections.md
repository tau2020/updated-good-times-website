# Client corrections: the owner's brief of 6 Nov 2026

The brief's §2 ("Client image corrections — mandatory") and the contact details of §4, item by item: what was asked,
what was found, what was done, and what still needs the owner. Photographs, sources and renditions are listed in
`design/asset-manifest.md`. Everything here is on the preview (`naturally-preview`), not on the live site.

## Summary

| § | Request | Status | Needs the owner |
|---|---|---|---|
| 2.1 | Remove the Fairview goat photograph and its caption; traveller 106 if suitable, not duplicated | **Done** | No |
| 2.2 | Restore the interlude's photograph of two women raising their hands, in blue tones | **Done, to be confirmed**: the matching photograph is in place, but it was never in the interlude in this site's history | Please confirm it is the one you meant |
| 2.3 | Remove the airport transfer's personal photograph (traveller 12 first, traveller 11 second) | **Done**, on the transfers page and for the airport service everywhere it appears | Please confirm we read "the Airport Transfer photograph" as you meant |
| 2.4 | A better main Transfers photograph; Transfers and Airport departure different | **Done** | No |
| 2.5 | Restore the Aquila Game Reserve team photograph on About › Meet our team | **Restored, place unconfirmed**: the section's previous photograph is back; nothing in the files or history names Aquila | Please confirm it is the Aquila photograph, or send it |
| 2.6 | Replace the City tour's unclear couple photograph (traveller 10 recommended) | **Done** | No |
| §4 | hello@ as the public address, stuart@ on the contact page | **Done** (Addendum); form delivery stays with info@ until hello@ is confirmed to receive mail | Confirm hello@ receives mail (approval register A4) |

## 2.1 The goat tower

- **Asked**: remove the goat photograph and the caption "The goat tower at Fairview, on a Winelands day."; replace it
  with `replace-goats-on-home-page-Cape Peninsula Private Tour - traveller 106.jpg` if its composition and relevance
  hold; never duplicate it.
- **Done**: the home page's moments collage keeps its frame (4:3, the same place in the layout) with traveller 106: two
  guests and their guide in a smiling selfie high above the Peninsula's coast. It is real, it is a Cape Peninsula day,
  and it fits a collage of "the moments people keep". New caption: "With our guide, high above the Peninsula". The
  collage's lead no longer mentions goats.
- **No duplicate**: traveller 106 was the hero phone's sixth photograph; it left the phone, whose sixth photograph is now
  traveller 050 (two guests on the rocks above a turquoise sea). The goat photograph is out of the library, with its
  caption and renditions, so it cannot reappear.
- **Checked**: `test/journey.test.mjs` (no page mentions goats; traveller 106 shown once), the duplicate check
  (118 photographs in 118 placements).

## 2.2 The interlude

- **Asked**: put back "the previous image featuring two ladies raising their hands, with prominent blue tones"; not a
  look-alike; if the exact image cannot be found, say so.
- **Found**: in every version of this site (5 to 7 Nov), the interlude's first backdrop was Cape Point's cliffs
  (`cape-point-cliffs`). The photograph described, two women on a rock above the ocean with their arms raised under a
  blue sky, exists exactly once in the library and the site's history: `private-guests-arms-raised`, from the
  company's original website, which this site used as the Private Cape Town Experience's banner. It is not a
  look-alike: no other photograph has two women with raised hands.
- **Done**: it is the interlude's first backdrop, at its highest available quality (2880 × 2160), framed on the two
  women (on phones the words sit above them, over a soft scrim, so no word crosses a face). The Private Cape Town
  Experience's banner is now its own card photograph (a couple on the rocks at sunset), so the photograph is shown once.
- **Needs the owner**: please confirm this is the photograph you meant. If you remember the interlude differently
  (for example on the old website), a screenshot or the file's name is enough for us to find it.

## 2.3 The airport transfer's personal photograph

- **Asked**: remove the disliked personal photograph from the Airport Transfer section; traveller 12 first, traveller
  11 second; choose the better composition for the layout.
- **Found**: two places fit the description. On the transfers page, the airport transfer section showed operator 05
  (three guests in face masks waving under the departures sign), and its banner a soft photograph of a couple waving.
  The airport service itself (its "Airport Transfers" way on the home page, its row in the Travel Concierge and the
  phone menu on every page, and its choice in the booking form) showed a selfie of three people outside departures
  (from the Good Times profile page): the most "personal" photograph of the two.
- **Done, in both**:
  - Transfers page banner: **traveller 12**, two travellers wheeling their cases through the arrivals hall towards the
    "Welcome to the Mother City" wall. Their backs are to the camera, so the page title sits over the hall, never over a
    face (traveller 04 was tried and retired: the faces filled the banner).
  - The airport service's photograph, everywhere it appears: **traveller 11**, the terminal's welcome banner under its
    glass roof. A clear "you have arrived" without anyone's face; it crops cleanly to the home card's 3:2 and the
    phone's square.
  - The selfie is out of the library, so it cannot come back.
- **Needs the owner**: please confirm that is what you meant by the Airport Transfer photograph.

## 2.4 The Transfers photograph and Airport departure

- **Asked**: a better main Transfers photograph (meet and greet, a transfer vehicle, guests with luggage, a real
  transfer); move the original to Airport departure only if it suits; operator 04 is a possible departure photograph;
  Transfers and Airport departure must differ.
- **Done**: the transfers page's airport transfer section now opens on **traveller 13**: a Good Times driver with the
  welcome sign giving a thumbs-up beside an arriving guest and his cases. The guest's name on the sign is pixelated for
  his privacy; nothing else was retouched.
- **Airport departure**: the row keeps its photograph of four guests under the "All Departures" sign. Operator 04 was
  assessed: the two guests are small under the sign with much empty pavement, so it reads less clearly at the row's
  size; it stays in the transfers gallery. The original banner (the soft couple) was not moved there: it is the
  photograph you wanted improved.
- **Different**: banner (traveller 12), airport section (traveller 13) and departure row (four guests) are three
  different photographs (`test/journey.test.mjs`).

## 2.5 Meet our team: the Aquila Game Reserve photograph

- **Asked**: restore the team photograph taken at Aquila Game Reserve; do not assume Drive's `about-image.jpg`; keep the
  name, role and biography; if it cannot be retrieved, report it rather than substitute.
- **Found**: the section showed one photograph from the site's first version (5 Nov) until 6 Nov:
  `winelands-garden-lunch`, guests and their guide smiling around a garden lunch table under the trees, from the
  company's original website. On 6 Nov it was replaced by the owner's portrait (`about-image.jpg`). No file, caption,
  alt text or commit anywhere in the repository or the Drive folders names Aquila.
- **Done**: the previous photograph is back in Meet our team (5:4, opening from a soft mask as it comes into view);
  "Founded by Stuart Matanhire." and the biography are unchanged. Its caption does not name a place: "Guests and their
  guide at lunch, on a day out with Good Times". The owner's portrait now leads the home page's people chapter, so
  nothing is duplicated and `about-image.jpg` is not presented as Aquila.
- **Unresolved**: whether this photograph was taken at Aquila Game Reserve. Please confirm it, or send the Aquila
  photograph (or its file name in the Drive). If it is Aquila, we will name the place in its caption.

## 2.6 The City tour photograph

- **Asked**: replace the unclear photograph of a couple (traveller 10 recommended; 17 and 20 for secondary storytelling).
- **Done**: the City tour's banner is **traveller 10**: a guest at the white-railed steps of a bright pink house beside
  a blue one in the Bo-Kaap. It is framed so the guest is whole at banner width on desktop and phones. The couple
  photograph (`castle-cannon-couple`) is shown nowhere.
- **Not used**: traveller 17 (the brief's link opens a café table, not the Table Mountain model it describes) and
  traveller 20 (a market scene): the page has no free secondary placement that would not repeat a photograph.

## §4 Contact details (Addendum of 6 Nov 2026)

hello@goodtimesincapetown.co.za is the public address everywhere (footer, menu, Travel Concierge, contact, enquiry,
privacy and terms, emails' footer, structured data); stuart@goodtimesincapetown.co.za is the additional contact on the
contact page. The sender of the enquiry emails is hello@. Delivery of new requests, replies and sign-in links stays with
info@ (the mailbox that receives mail today) until Good Times confirms hello@ receives mail: the brief asks not to
redirect delivery to an unverified mailbox (`docs/APPROVAL_REGISTER.md`, A4). No credential or secret is in the
repository.

## Noted, not acted on

- The Drive has two files named "replace-A selfie above the bay…" (a leopard and a cheetah). They look like a wish to
  replace the home page's "A selfie above the bay" moment, but the brief does not ask for it, so the selfie stays.
  Tell us if you want them used.
