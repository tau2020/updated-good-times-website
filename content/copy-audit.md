# Copy audit: "Good Times, Naturally"

Every visible line changed in the refresh of 6 Nov 2026, where it is, what it said, what it says now and why. The
voice: **fun, authentic, locally knowledgeable, easygoing** — an experienced Cape Town guide telling a friend what makes
the city special. The proven anchor stays exactly as approved: **Good Times start Here!** (the home hero's call to
action, unchanged).

## How the copy was written

- **Research first** (6 Nov 2026). Contemporary experience brands lead with a verb and a local, people-first angle
  (Airbnb's 2025 Experiences campaign: "Don't just see Lisbon. Live it with the people who know it best"; its host
  guidance asks for short, action-led titles). Guidance for tour operators converges on the same few points: show
  trust early and again next to the call to action, keep reviews visible on the site rather than only a link away, give
  each section one clear next step, write directly and in the active voice, and answer the traveller's uncertainty
  (what is included, what it costs, what happens next). Most of those guides come from vendors, so they were used as a
  checklist, not as evidence. Sources: [Woorise on Intrepid Travel](https://woorise.com/landing-page-examples/intrepid-travel),
  [Sked Social on Airbnb Experiences](https://skedsocial.com/blog/instagram-strategy-how-airbnb-experiences),
  [Airbnb: writing an effective title](https://www.airbnb.com/resources/hosting-homes/a/how-to-write-an-effective-title-and-description-712),
  [Resmark: building trust when travellers feel uncertain](https://www.resmarksystems.com/how-tour-operators-can-build-trust-when-travelers-feel-uncertain),
  [Rework: website conversion for travel](https://resources.rework.com/libraries/travel-tour-growth/website-conversion-for-travel),
  [Tourpreneur copywriting clinic](https://tourpreneur.libsyn.com/copywriting-for-tour-operators-clinic-we-review-3-tour-operator-websites-117).
  No competitor's wording was copied; the lines below are written for Good Times from its own facts and photographs.
- **Section by section** (the brief's coherence rules): look at the section's photographs; name the real tour, place or
  message they show; write a headline that belongs to that section only; make the supporting line add information;
  choose a contextual call to action; make the next section carry the story on.
- **Facts are untouchable.** Prices, inclusions, exclusions, durations, capacities, policies, seasons, safety notes and
  places are the company's own (`src/data/*.mjs`, read from goodtimesincapetown.co.za on 5 Nov 2026) and were not
  changed. Where a line was rewritten, the facts it carried were kept or moved, never dropped silently (each row says
  so). Nothing promises an itinerary, wildlife, a pickup or an inclusion the tour pages do not.
- **Clichés out** unless they state a fact: "unforgettable", "breathtaking" and "hidden gems" were removed from visible
  copy (`grep` of `src/pages`, `src/partials`, `src/data` on 6 Nov 2026), and "tailored" from the tours page's banner. It
  stays in the Private Cape Town Experience's own product description, where it names what is sold (a tailored day),
  and in the About page's meta description. The logo's own tagline, "Make
  unforgettable memories in the Mother City", is part of the protected logo artwork and stays in the logo and its
  alt text; it no longer appears as page text.
- **SEO intent kept.** Page titles, meta descriptions, URLs, H1 keywords ("Tours & Experiences", "Airport Transfers",
  "Cape Peninsula Private Tour" …) and structured data are unchanged, except the reviews page description, which no
  longer hard-codes a review count. The new headlines sit under the keyword-bearing H1s (as the banner's sub-line) or
  as section headings, and keep the place names (Cape Peninsula, Chapman’s Peak, Cape Point, Hout Bay, Winelands,
  Fairview, Franschhoek, Langa, Gansbaai, Cape Town International).
- **Sentence case** for headlines, chapter marks and eyebrows' words; Title Case kept for proper names and for button
  labels, as the brief writes them ("Plan My Day", "Explore Tours", "Make It Yours").

## Home page (`src/pages/index.mjs`, `src/partials/sand-journey.mjs`)

| Location | Original | Replacement | Why |
|---|---|---|---|
| Hero call to action | Good Times start **Here!** | *Unchanged* | The brand anchor. Only its typeface changed (Bricolage Grotesque; "Here!" leans by a drawn skew) |
| Sand journey, eyebrow | Cape Peninsula · Coastal Journey | Cape Peninsula · Coastal journey | Sentence case, the site's voice. The owner's words of 6 Nov 2026 otherwise kept |
| Sand journey, headline | Look Where Your Footsteps Led. | Look where your footsteps led. | Sentence case: relaxed, not formal. Same words |
| Sand journey, line | One private journey. Breathtaking coastlines, penguins, and unforgettable Cape Town moments. | One private day on the coast: big views, the penguins at Boulders and plenty of reasons to stop. | Two banned clichés out; the facts kept and made specific (private, the coast, the penguins *at Boulders*, which the Peninsula tour visits) |
| Sand journey, button | Explore the Cape Peninsula Tour | *Unchanged* | Clear, contextual |
| **New** credentials strip | — | "Good Times since 2014" (hand-written) · **Local knowledge. Professional guiding.** · Accredited local guides — Recognised by the Western Cape tourism authorities. · A registered operator — Registered with Western Cape Tourism. · Private by design — Only your group, your guide and a day planned around you. · *(preview builds only, until verified)* CTGA logo · Connected to the Cape’s professional guiding community. | The brief §6. Each point restates a claim on the company's own About and Safety pages (`site.credentials`). The CTGA line is the brief's softer wording and is gated (T1, `docs/APPROVAL_REGISTER.md`) |
| Ch. 01 mark | 02 · Where the Road Meets the Ocean | 01 · Where the road meets the ocean | Renumbered after the water chapter's removal; sentence case |
| Ch. 01 headline | The coast road is half the *adventure.* | Follow the coast. *Forget the clock.* | The brief's Cape Peninsula headline; matches the photograph (a couple at rest on a viewpoint above the sea) |
| Ch. 01 line | Chapman’s Peak Drive, the Cape of Good Hope and Cape Point, then the penguins at Boulders Beach: the Peninsula in one private day. | Ocean roads, dramatic cliffs and plenty of reasons to stop for a photo, with a guide who knows the route and the stories behind it. | The brief's supporting copy, kept short: over the photograph a longer line ran across the couple's faces at 768 and 1024 px (the first draft did; checked on the preview), and the brief forbids type over faces. The places live on: Chapman’s Peak Drive and Hout Bay in the photograph block below, the penguins at Boulders in the sand journey's line, Cape Point and the full route on the Peninsula tour page, whose overview now carries the brief's whole line |
| Ch. 01 link | Follow the coast road | *Unchanged* | Already in voice |
| **New** Peninsula photograph block | — | *On the Cape Peninsula day* · **The best bits? They’re yours to remember.** · Two travellers at a lookout on Chapman’s Peak Drive, with Hout Bay, its harbour and the Sentinel behind them. On a private day your group sets the pace, so there’s time for the photo stops, and your guide knows which lookouts are worth pulling over for. · [Plan a Peninsula Day] · caption (hand-written) "Chapman’s Peak Drive, above Hout Bay" · credit "A guest’s photograph from a Good Times tour" | The brief §5's suggested line. Describes only what the photograph shows (place checked against the library's own Hout Bay photograph); names nobody; ties to no review. The button opens the Peninsula enquiry (an enquiry, not a booking) |
| Ch. 02 mark | 03 · The Moments Between Destinations | 02 · The bits between the big sights | Renumbered; conversational |
| Ch. 02 headline | It’s not only where you go. It’s everything *along the way.* | The big sights are great. The bits in between? *Even better.* | Less generic; distinct from the photograph block's "best bits" line above it |
| Ch. 02 lead | … Photographs from our own days out. | … All of them photographed on our own days out. | Warmer; same fact |
| Ch. 02 captions | Muizenberg’s bathing huts · A selfie above the bay · The goat tower at Fairview, on a Winelands day · At the Cape of Good Hope | *Unchanged words*, now hand-written (Caveat) | Short, by place, nobody named |
| Ch. 03 mark | 04 · The Cape Is Yours to Discover | 03 · Pick a direction | Renumbered; shorter |
| Ch. 03 headline | Which side of the Cape will you *fall in love with?* | Which side of the Cape will you *fall for first?* | Lighter, playful |
| Ch. 03 note | Six directions from Cape Town, each a private day or more with us. | Six directions from Cape Town, each one a private day (or more) with us. | Rhythm |
| Interlude mark | An interlude | An interlude, with adrenaline | Says what's coming |
| Interlude headline | The best journeys leave room for the *unexpected.* | For the stories you’ll *tell twice.* | The brief's Adventure headline |
| Interlude line | Quad bikes on the dunes, a tandem skydive with the Cape below you, a cage dive with great white sharks off Gansbaai: add an adventure to your days with us. | Fancy something with a little more adrenaline? Quad bikes on the dunes, a tandem skydive with the Cape below you, a cage dive with great white sharks off Gansbaai. Each runs with a safety briefing and depends on the weather and the season, so tell us your dates and we’ll help you work out what fits your Cape Town days. | The brief's supporting copy, with the activities' own safety, weather and season conditions now stated (`src/data/tours.mjs`) |
| Interlude link | Adventure activities | Explore adventure options | The brief's verb |
| Ch. 04 mark | 05 · Your Journey, Your Way | 04 · Your day, your way | Renumbered; "day" is what is sold |
| Ch. 04 closing button | Get a Quote | **Plan My Day** | The brief's primary label; still an enquiry |
| Ch. 04 closing line | Nothing is booked or charged until we’ve confirmed the arrangements with you. | Tell us what you have in mind and we’ll reply with a quote. Nothing is booked or charged until we’ve confirmed the arrangements with you. | Says what the button does; the safeguard kept |
| Ch. 05 mark | 06 · The People Make the Journey | 05 · The people make it | Renumbered; shorter |
| Ch. 05 headline | The beautiful places are only *part of the story.* | The views do half the work. *We do the rest.* | Playful, about the team the section describes |
| Ch. 05 point 1 | … shaped around the people on it, with pickup from your accommodation. | … shaped around the people on it, and most start with pickup from your accommodation. | Accuracy: the site's own trust cue says *most* tours start at your accommodation |
| Ch. 05 point 2 | … and the hidden gems between them. | … and the good bits in between. | Cliché out |
| Ch. 05 link | Meet Good Times | Meet the Good Times team | Clearer |
| Taste interlude headline | The Cape is also something *you taste.* | Good views. *Better pours.* | The brief's Winelands headline |
| Taste interlude lead | On the Winelands day there is wine and cheese at Fairview, then La Motte, Franschhoek and Lanzerac. Tasting fees and lunch are paid on the day, so you choose what to taste and where to eat. | Take the scenic route through the Cape Winelands, where mountain views, beautiful estates and long lunches are all part of the appeal: wine and cheese at Fairview, then La Motte, Franschhoek and Lanzerac. Tastings and lunch are optional and paid on the day, so you choose what to taste and where to eat. | The brief's supporting copy, the stops kept, and "optional and paid on the day" stated plainly (the brief asks for it) |
| Ch. 06 mark | 07 · The Living Travel Exhibition | 06 · From our camera roll | Renumbered; human |
| Ch. 06 headline | Some memories never *leave the frame.* | Snapshots from *real days out.* | Says what the gallery is: Good Times' own photographs |
| Ch. 07 mark | 08 · The Golden Cape | 07 · Golden hour | Renumbered |
| Ch. 07 headline | Some days you wish could last *a little longer.* | *Unchanged* | Already warm and specific to the photograph |
| Ch. 08 mark | 09 · The Art of Making It Easy | 08 · Easy does it | Renumbered; conversational |
| Ch. 08 headline | All the wonder. *None of the worry.* | *Unchanged* | In voice |
| Ch. 08 step 1 | Tell us your plans. / Share the places you’d love to see … | Tell us what you’re after. / The places you’d love to see … | Friendlier |
| Ch. 08 step 2 | Receive your personalised quote. / … through your preferred contact method. | Get your personalised quote. / … however you prefer to be contacted. | Plain words |
| Ch. 08 step 3 | Confirm your experience. / Once you’re happy with the arrangements, we confirm your booking, and on the day your guide collects you. | Say yes, and we confirm. / Once you’re happy with the arrangements, we confirm your booking. On the day, your guide collects you. | Same order of events; the booking is confirmed by Good Times only after the visitor agrees |
| Ch. 08 buttons | Get a Quote · Questions first? Read the FAQ | *Unchanged* | |
| Ch. 09 (reviews) mark | 10 · Words from the road | 09 · The people behind the good times | The brief §7's section name |
| Ch. 09 headline | Beautiful places. *Beautifully remembered.* | Good times, *by the people who had them.* | Adapted from the brief's "Good times, in their words": the cards are our labelled summaries, not the reviewers' own words (no quote permission is recorded), so "in their words" would mislead |
| Ch. 09 lead | — | Don’t just take our word for it. Here’s what travellers said about their days in the Cape: each card sums up a real review in a line, and the whole review is a tap away on Tripadvisor. | The brief's supporting copy, with the honest note about summaries |
| Ch. 09 figures | 264 Tripadvisor reviews · 5.0 Average rating out of 5 | Rated 5.0 out of 5 on Tripadvisor · As listed on 5 November 2026 | The brief: no hard-coded review count (it changes); the rating dated and linked |
| Ch. 09 card label | Review summary · Cape Peninsula Private Tour | The review in short, in our words (the tour now a chip) | Clearer about who wrote the line |
| Ch. 09 buttons | Previous · Next · Pause · Read All Our Reviews on Tripadvisor | Show *n* more reviews · Read every review on Tripadvisor | The carousel became a grid; sentence case |
| Ch. 10 mark | 11 · Your Story Begins Here | 10 · Your turn | Renumbered |
| Ch. 10 headline | The Cape is waiting. Make the journey *yours.* | Your kind of Cape Town *starts here.* | The brief's final call to action, echoing the anchor |
| Ch. 10 line | Tell us where you’d like to go. You’ll receive availability and a personalised quote, and nothing is booked or charged until we’ve confirmed it with you. | Tell us who’s coming, what you love and when you’ll be here. We’ll help shape a day worth looking forward to, and reply with availability and a quote. Nothing is booked or charged until we’ve confirmed it with you. | The brief's supporting copy; the safeguard kept |
| Ch. 10 buttons | Request Your Tour · Arrange a Transfer | **Plan My Day** · Arrange a Transfer | The brief's label; same destinations (`enquire/?type=tour`, the airport transfer request) |
| **Removed** with the water chapter | 01 · Good Times Since 2014 / A private day, *shaped around you.* / Every Good Times tour is private … since 2014. / A pause above a long white beach on a Cape Peninsula day. A Good Times photograph. / The Cape Peninsula day | — | The section was removed (brief §3). Its facts survive: "since 2014" and "private" in the credentials strip, the private-day promise in the tours page banner and the Peninsula block |

## Tours (`src/pages/tours.mjs`)

| Location | Original | Replacement | Why |
|---|---|---|---|
| Banner H1 | Tours & Experiences | *Unchanged* | The page's keyword |
| Banner sub-line | Private, guide-led days from Cape Town. | **Same Cape. Your own kind of day.** | The brief's private touring introduction |
| Banner text | Every tour is private and tailored to your group, and most start with pickup from your accommodation. Choose a day below, or tell us what you have in mind. | Big views, good stories, unexpected stops. Explore Cape Town at your own pace, with a local guide and a day planned around your people. Every tour is private, and most start with pickup from your accommodation. | The brief's supporting copy; "private" and "most … pickup" kept |
| Custom day card | Mix the Peninsula, the city and the Winelands, or ask for somewhere else. Tell us what you’d like to see and you’ll receive a quote. | … or ask for somewhere else entirely. Tell us what you’d like to see and we’ll come back with a plan and a quote. | Warmer; same offer |
| Multi-day section lead | A private journey of several days, planned with you. We confirm the route, what is included and the price with your quote. | One day not enough? Take a few, with your own guide. We plan the route with you and confirm what’s included and the price with your quote. | Voice; same conditions |
| Tour page, Peninsula overview heading | The Peninsula in one private day | **Follow the coast. Forget the clock.** + lead: Ocean roads, dramatic cliffs and plenty of reasons to stop for a photo. Discover the Cape Peninsula with a guide who knows the route, and the stories behind it. | The brief's Cape Peninsula copy, on the page its photographs belong to |
| Tour page, City overview heading | Cape Town’s story, street by street | **Meet the city, not just its landmarks.** + lead: From familiar landmarks to the neighbourhoods that give Cape Town its character, get to know the stories behind the sights. | The brief's City copy |
| Tour page, Winelands overview heading | A private day among the vines | **Good views. Better pours.** + lead: … Tastings and lunch are optional and paid on the day. | The brief's Winelands copy, with the charges made explicit |
| Tour page, Township overview heading | Langa, with the people who know it | **Real places. Real people. Real stories.** + lead: Langa is a living neighbourhood, and you visit it as a guest: its history, its art and its everyday life, with a guide who knows it well. | The brief's Cultural headline. The lead is written to be respectful and community-conscious: a neighbourhood, visited as a guest, nothing staged and no interaction promised beyond the tour's own listed stops |
| Tour page, reviews tab lead | Our short summaries of guests’ reviews on Tripadvisor; each links to the original. | What guests said about this day on Tripadvisor, summed up by us in a line; each links to the full review. | Voice; same disclosure |
| Tour facts (intro, itinerary, included, excluded, durations, prices, cancellation, pickup) | — | *Unchanged* | Facts from the company's own pages |

## Other pages

| Page · location | Original | Replacement | Why |
|---|---|---|---|
| Transfers · banner sub-line | Met at arrivals. Driven to your door. | **Land in Cape Town. We’ll take it from there.** | The brief's Transfers headline |
| Transfers · banner text | … with a name board at arrivals and a hand with your luggage. | … : a name board at arrivals, a hand with your luggage and a private drive to your door. | Reassuring, practical; same service |
| Transfers · section head | Where are you going? / Pick the journey you need. You give the details … | Where are you headed? / Pick the journey you need. You add the details … | Voice |
| About · banner sub-line | Make unforgettable memories in the Mother City. (the logo's tagline) | Showing people the Cape we love, since 2014. | The tagline belongs to the logo artwork; as page text it was a cliché |
| About · story heading | Good journeys begin with good people. | We really like showing people around. | Human, specific |
| About · story paragraph | Founded in 2014 by Stuart Matanhire, Good Times in Cape Town began with a simple idea: to share the beauty and diversity of the Mother City through authentic, personal experiences, with professional, accredited guides. | Stuart Matanhire founded Good Times in Cape Town in 2014 with a simple idea: share the beauty and diversity of the Mother City the way a friend would, in person and unhurried, with professional, accredited guides. | Voice; same facts |
| About · approach lead | How we make your journey personal. | Three things we never skip. | Voice |
| About · Local insight | … from the famous sights to the hidden gems. | … from the famous sights to the good bits in between. | Cliché out |
| About · closing | Come and experience the Cape with us. | Come and see the Cape with us. | Plainer |
| About · credentials paragraph | Our team is a registered associate of the Cape Tourist Guides Association, and our guides are accredited … | *Unchanged* | The company's existing documented statement, retained as the brief allows (CTGA logo gated separately, T1) |
| Destinations · lead | … Pick a destination to see the days that go there. | … Pick a direction and see the days that go there. | Echoes the home page |
| Reviews · H1 | What Our Guests Say | What our guests say | Sentence case |
| Reviews · meta description | Good Times in Cape Town is rated 5.0 from 264 Tripadvisor reviews. Read summaries … | Good Times in Cape Town is rated 5.0 on Tripadvisor. Read short summaries of guests’ reviews, each linking to the full review. | No hard-coded count in metadata (the page itself still dates its figures) |
| Contact · H1 | Get in touch | Let’s talk Cape Town. | Voice; the eyebrow "Contact" and the title tag keep the keyword |
| FAQ · lead | … Anything else, ask us before you book. | … Still wondering about something? Just ask us before you book. | Voice |
| Multi-day tours · banner sub-line | Private journeys from Cape Town, planned with you. | One day not enough? Take a few. | Voice; the text below keeps the details |
| Privacy · credits | Fonts: Plus Jakarta Sans and Inter, used under the SIL Open Font Licence. | Fonts: Bricolage Grotesque, DM Sans and Caveat, used under the SIL Open Font Licence. The Cape Tourist Guides Association’s logo is the association’s own … | The new faces; the logo's ownership |

| Booking form · "What happens next" (aside and confirmation) | Share your plans · Receive your personalised quote · Confirm your experience (aside); We check availability · You receive your personalised quote · Confirm your experience (confirmation) | Tell us what you’re after · Get your personalised quote · Say yes, and we confirm (aside); We check availability · You receive your personalised quote · Say yes, and we confirm (confirmation) | The same three steps in the same words as the home page's chapter 08; the explanations under them unchanged ("Once you’re happy with the arrangements, we’ll finalise your booking") |

## Addendum, 6 Nov 2026: contact addresses and the company statement

| Where | Before | After | Why |
|---|---|---|---|
| Every page's header, under the logo; the footer's lockup; the share image; the emails' header | (none: the footer showed the logo pack's full artwork, with its own tagline "Make unforgettable memories in the Mother City" drawn in) | **Make Unforgettable Experience In The Mother City** | The client's statement, exactly as supplied (words, case and the singular "Experience"); the footer and the share image now use the compact artwork, so the older tagline is never shown beside it (`design/font-design.md` §4.7) |
| Footer logo's alt text | Good Times in Cape Town: Make unforgettable memories in the Mother City | Good Times in Cape Town | The statement is now real text beside the logo |
| Share image description (`og:image:alt`) | The Good Times in Cape Town logo: Table Mountain, a dotted flight path and the words Make unforgettable memories in the Mother City | The Good Times in Cape Town logo, Table Mountain and a dotted flight path over the name, and beneath it: Make Unforgettable Experience In The Mother City | Describes the new image |
| Primary email: footer, mobile menu, Travel Concierge ("Email Us"), contact page, booking form aside, privacy and terms pages, emails' footer, JSON-LD | info@goodtimesincapetown.co.za | hello@goodtimesincapetown.co.za | The client's instruction: hello@ replaces info@ in every public place |
| Contact page, "Phone, email and our office" | Email · info@goodtimesincapetown.co.za | Email us · hello@goodtimesincapetown.co.za, then **Email Stuart · stuart@goodtimesincapetown.co.za** | Stuart's address as the additional contact option, in the contact section only; each address labelled once there are two |

## Deliberately unchanged

- **The booking wizard and its confirmation states** (`src/pages/enquire.mjs`, `src/assets/js/enquiry*.js`): labels,
  validation messages, the review step, "Sending an enquiry does not create a confirmed booking" and the "nothing is
  sent" preview notice are functional copy, covered by the enquiry tests; only their type and buttons changed (and the
  three next-step titles above).
- **Legal pages** (privacy, terms) apart from the font credit; **tour, package and transfer data** (facts);
  **photo captions** (except the hand-written style); **the 404 page** ("This road doesn’t lead anywhere." is already
  in voice); **SEO titles, descriptions and structured data** (except the reviews description above).
