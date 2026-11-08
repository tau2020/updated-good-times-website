import { esc, icon, breadcrumb } from '../partials/ui.mjs';
import { images, generated, ORIGIN_NOTES as ORIGIN } from '../data/images.mjs';
import { SCENES, PLACEMENTS } from '../data/scenic.mjs';

/** The scenic backdrops in use (src/data/scenic.mjs): stock photographs, credited although their licences do not ask it */
const backdrops = SCENES.filter((s) => PLACEMENTS.some((p) => p.scene === s.name));
const PAGE_NAMES = { 'index.html': 'the home page', 'about/index.html': 'About', 'contact/index.html': 'Contact', 'destinations/index.html': 'Destinations', 'transfers/index.html': 'Transfers' };
/** "the home page", "About and Contact", "the home page, About and Transfers" */
const listOf = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const shownOn = (s) => listOf([...new Set(PLACEMENTS.filter((p) => p.scene === s.name).map((p) => PAGE_NAMES[p.page] || p.page))]);
const backdropPages = listOf([...new Set(PLACEMENTS.map((p) => PAGE_NAMES[p.page] || p.page))]);
const backdropLine = (s) =>
  `<li>${esc(s.subject)}, a faint background on ${esc(shownOn(s))}: photograph by ${esc(s.author)} on ${esc(s.platform)} (<a href="${esc(s.licenseUrl)}" rel="noopener">${esc(s.license)}</a>, <a href="${esc(s.source)}" rel="noopener">source</a>). ${esc(s.place)}.</li>`;

/** One line of the photo list: what it shows, where it comes from, and for a licensed photograph its author, licence and source */
const creditLine = (i) =>
  i.origin === 'L'
    ? `<li>${esc(i.alt)}: ${esc(ORIGIN.L)}. ${esc(i.credit)} (<a href="${esc(i.licenseUrl)}" rel="noopener">${esc(i.license)}</a>, <a href="${esc(i.source)}" rel="noopener">source</a>)</li>`
    : `<li>${esc(i.alt)}: ${esc(ORIGIN[i.origin] || 'Good Times in Cape Town')}</li>`;

/**
 * The privacy notice (POPIA s.18; GDPR and UK GDPR Art. 13 for travellers from the UK and EU).
 * It joins Good Times' own privacy policy (goodtimesincapetown.co.za/privacy/, read on 5 Nov 2026:
 * POPIA, no selling of personal information, sharing only to deliver a booking, the rights listed)
 * with what this website's code verifiably does (the booking request, its processors, browser storage).
 * Good Times' own facts come from site.legal and appear only once verified. Until Good Times approves
 * the text (site.legal.privacyApproved) the page says it is a draft, and the production deployment
 * refuses to run (scripts/release-gate.mjs).
 */
const crumbs = [{ label: 'Home', href: './' }, { label: 'Privacy', href: 'privacy/' }];

export const page = {
  path: 'privacy/index.html',
  nav: null,
  title: 'Privacy notice and credits',
  description: 'How Good Times in Cape Town handles the details you send through this website, in line with POPIA: what we collect, who helps us, your rights, and credits for the photography.',
  breadcrumbs: crumbs,
  body: ({ site }) => {
    const { legal, contact } = site;
    const mail = contact.email.verified ? `<a href="mailto:${esc(contact.email.address)}">${esc(contact.email.address)}</a>` : '';
    const officer = legal.informationOfficer;
    const officerMail = officer.verified && officer.email ? `<a href="mailto:${esc(officer.email)}">${esc(officer.email)}</a>` : mail;
    return `
<section class="page-head">
  <div class="container">
    ${breadcrumb(crumbs)}
    <p class="eyebrow">Your information</p>
    <h1>Privacy notice and credits</h1>
    <p class="lead">What happens to the details you send us, in plain language, in line with South Africa’s Protection of Personal Information Act (POPIA).</p>
  </div>
</section>

<section class="section">
  <div class="container prose">
    ${legal.privacyApproved ? '' : `<p class="notice notice--warning">${icon('alert')}<span><strong>Draft for Good Times’ approval.</strong> This notice combines Good Times’ own privacy policy with how this new website works. The registered business details, the Information Officer and the retention period still need Good Times’ confirmation, and the wording a legal review, before it is published.</span></p>`}
    ${legal.effective ? `<p class="small muted">Effective ${esc(legal.effective)}.</p>` : ''}

    <h2>Who we are</h2>
    <p>${esc(site.name)} is a private tour operator in Cape Town, South Africa, founded in ${site.founded}. We decide how the details you send us are used (in South African law, the “responsible party”; in UK and EU law, the “controller”).</p>
    <ul>
      ${legal.entity.verified ? `<li>Registered name and number: ${esc(legal.entity.name)}${legal.entity.registration ? `, ${esc(legal.entity.registration)}` : ''}</li>` : ''}
      ${legal.address.verified ? `<li>Address: ${esc(legal.address.text)}</li>` : ''}
      ${officer.verified ? `<li>Information Officer, for anything about your personal information: ${esc(officer.name)}${officerMail ? `, ${officerMail}` : ''}</li>` : ''}
      ${mail ? `<li>${officer.verified ? 'General enquiries' : 'Email'}: ${mail}</li>` : ''}
    </ul>

    <h2>What we collect</h2>
    <p>When you send a booking request we ask for:</p>
    <ul>
      <li>your name and email address, and a phone or WhatsApp number when you would like us to reply that way;</li>
      <li>how you would like us to reply, and, if you choose to tell us, your country of residence;</li>
      <li>your trip: the tour, activity or transfer, dates and times, the number of adults and children, children’s ages, pickup and drop-off points, a flight number for airport transfers, luggage, and any notes you add.</li>
    </ul>
    <p>Your name, email address and trip details are needed to answer you; without them we cannot reply to your request. Everything else is up to you. Please tell us about health, mobility or dietary needs only if you want us to plan for them; we use them for that alone.</p>
    <p>With each request the website also records the time you agreed to this notice, the page you sent it from, your browser’s identifying string (its name and version, and your operating system), and a keyed one-way code made from your internet (IP) address, not the address itself. We use these only to keep the booking system safe and to stop the same request arriving twice.</p>
    <p>On pages that show prices, Cloudflare tells our website which country your connection appears to come from, so that prices can be shown in your currency. We use it for that alone, at that moment, and do not keep it.</p>
    <p>If you email, call or message us, we receive what you send.</p>

    <h2>Why we use it</h2>
    <ul>
      <li><strong>To answer your request and arrange your tour</strong>: checking availability, quoting, confirming, and the messages that go with that. This is needed to take the steps you ask for before a booking, and to carry it out.</li>
      <li><strong>To keep the booking system safe</strong>: stopping automated misuse and duplicate requests. This is in our legitimate interest and yours.</li>
      <li><strong>To keep the records the law asks of us</strong>, once a booking goes ahead.</li>
      <li><strong>To improve our tours and this website</strong>: from the feedback you choose to give us, and visit statistics only if you allow them, which you can withdraw at any time.</li>
    </ul>
    <p>We do not sell your personal information to third parties, and we don’t share your details with anyone for their own marketing. Booking with us never signs you up for promotional messages. The tick box on the booking form records your agreement to us using your details to reply.</p>

    <h2>Who helps us, and where your details are kept</h2>
    <p>We share information only where it is needed to deliver your booking: for example with a guide preparing for your tour, with the operator of an activity you book, or with a payment processor handling a payment. A few companies also process your request on our behalf, to provide their service to us:</p>
    <ul>
      <li><strong>Cloudflare</strong> runs this website and its booking form, through data centres around the world, and, if you allow it, counts visits with Cloudflare Web Analytics.</li>
      <li><strong>Neon</strong> stores booking requests in a database hosted by Amazon Web Services in Ohio, in the United States.</li>
      <li><strong>Resend</strong>, a company in the United States, sends the website’s emails through Amazon Web Services in Ireland.</li>
      <li><strong>Our email provider</strong> hosts the inbox where your request and our replies are kept.</li>
      <li><strong>WhatsApp</strong> (Meta) carries your messages if you choose to contact us or be answered there.</li>
    </ul>
    <p>Your details are therefore stored outside South Africa, in the United States, and may pass through other countries on the way. We send them only where answering your request depends on it, and share them with no one else unless the law requires it.</p>

    <h2>How long we keep it</h2>
    <p>${legal.retention.verified ? esc(legal.retention.text) : 'We keep a request only as long as we need it to arrange your tour and to keep the records the law asks of us, and then erase it.'} You can ask us to erase it sooner, subject to any legal or record-keeping requirements.</p>

    <h2>Keeping it safe</h2>
    <p>We take reasonable technical and organisational measures to protect your personal information against loss, misuse and unauthorised access. The website runs only over an encrypted connection. Requests are stored in an access-controlled database; our team signs in to its bookings dashboard with single-use links sent to their own addresses, and the action links in the team’s emails are signed and expire. If your information is ever compromised, we will tell you and the authorities as the law requires.</p>

    <h2 id="analytics">Visit statistics, only if you allow them</h2>
    <p>When you first visit, we may ask whether we may count your visit. If you choose Allow, the website loads Cloudflare Web Analytics, which records the pages you open, the website that sent you here, your browser, operating system and type of device, the country your connection comes from, and how quickly each page loads. Cloudflare says it uses no cookies or other storage in your browser for these statistics and does not fingerprint visitors. We see only totals, never a record of you.</p>
    <p>If you choose Decline, or do not choose, nothing is loaded and nothing is counted. You can change your mind at any time with Analytics settings at the foot of every page; declining stops the statistics from the next page you open.</p>

    <h2>What is stored in your browser</h2>
    <p>While you fill in the booking form, your answers are kept in your browser’s session storage, so a reload does not lose them. They are cleared when you close the tab or once your request is received. When you move on from the trip details, the form may ask our booking system whether your date and time are still free; it sends your answers for that check and nothing is kept. The currency prices are shown in, whether you chose it or it was picked for your country, and that day’s exchange rates are kept in session storage too, so every page shows the same currency until you close the tab. The rates are the European Central Bank’s, which our server fetches from Frankfurter without sending anything about you. Your answer to the visit statistics question is kept in your browser’s local storage, which stays after you close the tab, so that we do not ask on every page; clearing this website’s data in your browser removes it. This website sets no cookies and uses no advertising trackers.</p>

    <h2>Your rights</h2>
    <p>Under POPIA you have the right to ask what personal information we hold about you, to ask us to correct inaccurate information, to ask us to delete your information, subject to any legal or record-keeping requirements, and to object to how your information is being used. You can also withdraw your agreement. We tell you in writing what we have done within 30 days, and none of this costs you anything.${officer.verified && officerMail ? ` Email our Information Officer, ${esc(officer.name)}, at ${officerMail}, quoting your booking reference if you have one.` : mail ? ` Email ${mail}, quoting your booking reference if you have one.` : ''}</p>
    <p>You have the right to complain to us, and we would like to hear first if you are unhappy with how we handled your information. You can also complain to the <strong>Information Regulator</strong> of South Africa: POPIAComplaints@inforegulator.org.za, Woodmead North Office Park, 54 Maxwell Drive, Woodmead, Johannesburg 2191 (<a href="https://inforegulator.org.za/" rel="noopener" target="_blank">inforegulator.org.za<span class="visually-hidden"> (opens in a new tab)</span></a>). In the UK you can complain to the <strong>Information Commissioner’s Office</strong> (<a href="https://ico.org.uk/make-a-complaint/" rel="noopener" target="_blank">ico.org.uk<span class="visually-hidden"> (opens in a new tab)</span></a>), and in the EU to your country’s data protection authority.</p>

    <h2>Links to other sites</h2>
    <p>We link to Tripadvisor, Facebook, Instagram, YouTube, Google Maps and WhatsApp. Their own privacy policies apply when you visit them.</p>

    <h2>Changes to this notice</h2>
    <p>If we change how we use your details, we will update this page and its date first.</p>
    ${officer.verified && officerMail ? `<p>Questions about this notice or your personal information? Contact our Information Officer at ${officerMail}${mail ? `; for anything else, ${mail}` : ''}.</p>` : mail ? `<p>Questions about this notice or your data? Contact us at ${mail}.</p>` : ''}

    <h2 id="credits">Photo credits</h2>
    <p>Nearly every photograph on this website is Good Times’ own: taken on our tours, published on our own website or uploaded to our own Tripadvisor listing, and a few are guests’ own photographs from our tours that Good Times chose for this website. One is edited for privacy (a guest’s name on a welcome sign is blurred). Four are not ours: photographs of Cape Agulhas, a tandem skydive and shark cage diving off Gansbaai, used under their open licences from Wikimedia Commons where we have none of our own: each is credited below, and on the photograph itself wherever it is shown larger than a small thumbnail. Two pictures are not photographs: the café scene at the top of the home page is an AI-generated illustration of five friends, and the short film of the woman standing at the water’s edge after the footprints below it is AI-generated too; neither is a picture of our guests. ${backdrops.length ? `The faint backgrounds behind a few bands of words (on ${esc(backdropPages)}: skies, a dusk cloud and the sea) are stock photographs from Unsplash and Pexels, used as decoration under their licences: they were not taken on our tours, and none of them shows Cape Town. ` : ''}The logo is Good Times’ own approved artwork.</p>
    <details>
      <summary>Photo list and origins</summary>
      <ul class="small">
        ${[...images, ...generated].map(creditLine).join('\n        ')}
        ${backdrops.map(backdropLine).join('\n        ')}
      </ul>
    </details>
    <p class="small muted">Fonts: Bricolage Grotesque, DM Sans and Caveat, used under the SIL Open Font Licence. The Cape Tourist Guides Association’s logo is the association’s own and is shown only as described on the home page.</p>
  </div>
</section>`;
  },
};
