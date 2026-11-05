/**
 * Guest reviews of Good Times in Cape Town on Tripadvisor.
 *
 * Source: Good Times' own review research (Drive › Tripadvisor Photo Collection ›
 * 09 - Image Index & Research: tripadvisor-review-index.csv and
 * testimonial-candidates.csv, compiled 3 Nov 2026), which records each review's
 * reviewer, location, rating, tour, dates and link, and a paraphrased summary.
 *
 * Each entry links to the original review. `summary` is our own short paraphrase,
 * labelled as a summary on the page; it is not the reviewer's wording. The research
 * asks that a guest's own words are quoted only with their permission, so no entry
 * carries `quote`/`excerpt` text and every card shows the summary. `rating` is the
 * reviewer's own bubble rating, from the index. `avatar` names the reviewer's own Tripadvisor
 * profile photo, shown at the owner's request (5 Nov 2026) once the owner supplies its file in
 * src/assets/img/reviewers/ (src/partials/reviewer-photo.mjs); until then a card draws initials or
 * an illustrated avatar. The research notes advised against these personal images and the
 * reviewers' consent is not recorded: docs/APPROVAL_REGISTER.md › R2. Reviews from the
 * company's business partners (index #254, #255) are not used, and guides other than
 * the founder are not named until Good Times confirms they work with it.
 *
 * Do not add review markup (AggregateRating/Review schema) for these: they are
 * third-party reviews of the business itself.
 */

export const reviewSource = {
  name: 'Tripadvisor',
  checked: '2026-11-03',
  url: 'https://www.tripadvisor.co.za/Attraction_Review-g312659-d19611200-Reviews-Good_Times_In_Cape_Town-Cape_Town_Central_Western_Cape.html',
};

/** A short verbatim pull-quote needs the reviewer's permission: none is recorded yet, so none is shown. */
export const pullQuote = null;

/** Themes that recur across the listing's reviews (our paraphrase, from the review research). */
export const themes = [
  { title: 'Calm, safe days', text: 'Reviewers mention careful, relaxed driving and feeling safe, solo travellers included.' },
  { title: 'History that stays with you', text: 'Guests often describe the stories behind the places: Langa, District Six and the city’s past and present.' },
  { title: 'Plans that bend', text: 'A flexible start, a new route when a road closes, an extra stop on request: the day follows the group.' },
];

const TA = 'https://www.tripadvisor.co.za/ShowUserReviews-g312659-';

export const reviews = [
  {
    author: 'seamus0314', avatar: 'seamus0314.jpg', origin: 'Arlington, Virginia', visited: 'Mar 2026', party: 'Couple',
    tour: 'cape-peninsula-private-tour', written: '2026-03-08', rating: 5,
    url: `${TA}d19714975-r1052347335-Cape_Peninsula_Private_Tour-Cape_Town_Central_Western_Cape.html`,
    summary: 'After plenty of research, they call this the Peninsula tour to book: seamless stops, rich history along the way and Chapman’s Peak to remember.',
  },
  {
    author: 'TravelAngelDani', avatar: 'travelangeldani.jpg', origin: 'Garbsen, Germany', visited: 'Feb 2026', party: 'Couple',
    tour: 'cape-winelands-private-tour', written: '2026-02-27', rating: 5,
    url: `${TA}d19685038-r1051281574-Cape_Winelands_Private_Tour-Cape_Town_Central_Western_Cape.html`,
    summary: 'Two days in the Winelands: Stuart handled the bookings and the timing, kept the pace relaxed and matched the estates to their taste in wine.',
  },
  {
    author: 'TravelAngelDani', avatar: 'travelangeldani.jpg', origin: 'Garbsen, Germany', visited: 'Feb 2026', party: 'Couple',
    tour: null, label: 'Airport Private Transfer', service: 'airport', written: '2026-02-27', rating: 5,
    url: `${TA}d19930417-r1051276181-Cape_Town_Private_Airport_Transfer-Cape_Town_Central_Western_Cape.html`,
    summary: 'Arrival and departure transfers with clear contact beforehand, a name sign at arrivals and a hand with plenty of luggage.',
  },
  {
    author: 'Lydia W', avatar: 'lydia-w.jpg', origin: 'Singapore', visited: 'Feb 2025', party: 'Solo',
    tour: 'cape-peninsula-private-tour', written: '2025-02-25', rating: 5,
    url: `${TA}d19714975-r995395596-Cape_Peninsula_Private_Tour-Cape_Town_Central_Western_Cape.html`,
    summary: 'A solo traveller who felt safe all day: Chapman’s Peak, the penguins at Boulders Beach and a hike at the Cape of Good Hope.',
  },
  {
    author: 'Lydia W', avatar: 'lydia-w.jpg', origin: 'Singapore', visited: 'Feb 2025', party: 'Solo',
    tour: 'township-private-tour', written: '2025-02-26', rating: 5,
    url: `${TA}d20311065-r995470531-Langa_Township_Private_Tour-Cape_Town_Central_Western_Cape.html`,
    summary: 'Langa with a guide who lives there, finished with a braai lunch at a local butchery, with pap and chakalaka.',
  },
  {
    author: 'Thea H', avatar: 'thea-h.jpg', origin: 'Kerkrade, The Netherlands', visited: '', party: '',
    tour: 'township-private-tour', written: '2025-03-11', rating: 5,
    url: `${TA}d20311065-r997530936-Langa_Township_Private_Tour-Cape_Town_Central_Western_Cape.html`,
    summary: 'A Langa tour with guides born and raised there, who gave an honest, realistic picture of the township and its history.',
  },
  {
    author: 'Meena301', avatar: 'meena301.jpg', origin: 'London, United Kingdom', visited: '', party: '',
    tour: 'cape-peninsula-private-tour', written: '2024-10-02', rating: 5,
    url: `${TA}d19714975-r972224570-Cape_Peninsula_Private_Tour-Cape_Town_Central_Western_Cape.html`,
    summary: 'Booked through their hotel in Camps Bay: a flexible start to the day and a guide who took the time to get to know the group.',
  },
  {
    author: 'Dave F', avatar: 'dave-f.jpg', origin: 'Yonkers, New York', visited: 'Jul 2024', party: '',
    tour: 'township-private-tour', written: '2024-07-10', rating: 5,
    url: `${TA}d20311065-r958891925-Langa_Township_Private_Tour-Cape_Town_Central_Western_Cape.html`,
    summary: 'Stuart, the owner, drove them to Langa himself and set the township’s history in context along the way.',
  },
  {
    author: 'Kashou106', avatar: 'kashou106.jpg', origin: 'Houston, Texas', visited: 'Sep 2023', party: 'Friends',
    tour: 'cape-peninsula-private-tour', written: '2023-10-13', rating: 5,
    url: `${TA}d19714975-r921143619-Cape_Peninsula_Private_Tour-Cape_Town_Central_Western_Cape.html`,
    summary: 'A rockslide had closed Chapman’s Peak that day, and the alternatives planned instead more than made up for it.',
  },
  {
    author: 'andyjanec', avatar: 'andyjanec.jpg', origin: 'Soham, United Kingdom', visited: '', party: '',
    tour: 'cape-town-city-private-tour', written: '2023-09-02', rating: 5,
    url: `${TA}d19907537-r914461434-Cape_Town_Private_City_Tour-Cape_Town_Central_Western_Cape.html`,
    summary: 'A hard-hitting city tour told in the order history happened; by the end the group was left speechless.',
  },
];
