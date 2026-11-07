# Font design: "Good Times, Naturally"

The type system of goodtimesincapetown.co.za's new site, as implemented on 6 Nov 2026. It replaces Plus Jakarta Sans
(display) and Inter (text), which read as formal and rigid next to the brand's personality: happy afternoons, ocean air,
a guide who knows where to take you.

Implemented in `src/assets/css/tokens.css` (the tokens), `src/assets/css/styles.css` §1 (the faces) and §4 (the
headings), and read everywhere else through the tokens. `test/naturally.test.mjs` fails if a sheet names a font family
directly, if a face is missing or not WOFF2, or if a licence is missing.

## 1. The three faces

| Role | Face | Character | Used for |
|---|---|---|---|
| Display | **Bricolage Grotesque** | Quirky, friendly, confident, a little unconventional. Its optical-size axis gives large sizes ink traps and personality and small sizes a sturdier, calmer cut | Section and chapter headlines, tour names and headings, large statements over photographs, key promotional lines, the big rating number, the hero's "Find Your Good Time", "Make It Yours" and the large leaves, reviewer names on the cards |
| Body and interface | **DM Sans** | Clear, warm, open, very readable at 14–20 px | Paragraphs, navigation (bar, drawer, concierge), tour facts and metadata, booking details, forms, labels and validation messages, review summaries, captions and credits, the standard and compact buttons |
| Accent (occasional) | **Caveat** | Hand-written, relaxed | Only short, non-critical notes, on the home page only: the hand-written place labels under the "moments" prints, the label under the owner's Cape Peninsula photograph and the credentials strip's "Good Times since 2014". (The tours page's route-collage labels were tried in Caveat and moved to the display face: 75 KB for four decorative labels was not worth it on a landing page.) |

The logo is a protected brand asset (Approved Logo Pack v2, `src/assets/brand/`). It is artwork, never set or re-set in
any of these faces.

### Why these three

- **Bricolage Grotesque** brings the "fun, chilled, welcoming" note without becoming childish: grotesque bones (it
  reads as professional), quirky details at display sizes (it reads as Good Times). Set bold and in sentence case it
  sounds conversational rather than shouty.
- **DM Sans** pairs with it naturally (both geometric-grotesque, similar x-heights: 0.525 and 0.504 em) and is far
  calmer, so everything a visitor has to *use* (prices, times, forms) stays plain and legible.
- **Caveat** is the guide's pencil in the margin. It is used sparingly so it stays a flourish; it never carries a
  price, a time, a condition, a form control or a call to action.

## 2. Files, loading and licences

| File | Source | Axes | Size | Loaded |
|---|---|---|---|---|
| `src/assets/fonts/BricolageGrotesque.woff2` | `@fontsource-variable/bricolage-grotesque` 5.3.0, `bricolage-grotesque-latin-opsz-normal.woff2` | weight 200–800, optical size 12–96 | 76.9 KB | Preloaded on every page |
| `src/assets/fonts/DMSans.woff2` | `@fontsource-variable/dm-sans` 5.3.0, `dm-sans-latin-wght-normal.woff2` | weight 100–1000 (optical size fixed at 14, the text cut) | 36.9 KB | Preloaded on every page |
| `src/assets/fonts/DMSans-Italic.woff2` | same package, `dm-sans-latin-wght-italic.woff2` | weight 100–1000 | 39.7 KB | Only when italic text is on the page |
| `src/assets/fonts/Caveat.woff2` | `@fontsource-variable/caveat` 5.3.0, `caveat-latin-wght-normal.woff2` | weight 400–700 | 74.9 KB | Only when accent text is on the page |

- **Self-hosted, WOFF2, Latin subset** (U+0000–00FF and the usual punctuation, the same range as before). The site's
  Content-Security-Policy allows fonts from its own origin only; nothing is fetched from Google.
- **Unmodified files.** All three are under the SIL Open Font License 1.1 (`licenses/OFL-bricolage-grotesque.txt`,
  `licenses/OFL-dm-sans.txt`, `licenses/OFL-caveat.txt`, recorded in `NOTICE.md`). They are used as distributed, so the
  Reserved Font Name clauses are respected.
- **Weight on the wire.** The two preloaded faces total 113.8 KB, against 104.9 KB for the three faces preloaded before
  (Plus Jakarta Sans roman and italic, Inter). Italic DM Sans and Caveat are declared but only downloaded by a page that
  uses them.
- **`font-display: swap`** with **metric-matched fallbacks**, measured from the WOFF2 files against Arial's metrics with
  fontTools (letter-frequency weighted average advance, `OS/2` typo metrics), so a line keeps its length and height while
  the faces load:

  | Fallback face | Weights | Over | `size-adjust` | `ascent-override` | `descent-override` | `line-gap-override` |
  |---|---|---|---|---|---|---|
  | Bricolage Grotesque Fallback | 100–549 | Arial, Helvetica, Liberation Sans | 108% | 86.1% | 25% | 0% |
  | Bricolage Grotesque Fallback | 550–1000 | Arial Bold, Helvetica Bold, Liberation Sans Bold | 99.5% | 93.5% | 27.1% | 0% |
  | DM Sans Fallback | 100–549 | Arial, Helvetica, Liberation Sans | 106% | 93.5% | 29.2% | 0% |
  | DM Sans Fallback | 550–1000 | Arial Bold, Helvetica Bold, Liberation Sans Bold | 101% | 98.2% | 30.7% | 0% |
  | Caveat Fallback | all | Arial, Helvetica, Liberation Sans | 77.4% | 124% | 38.7% | 0% |

  Bold headings must fall back to a **real bold face**: they carry `font-synthesis: none`, so with a regular fallback
  they were set in plain Arial, narrower than Bricolage Bold (which is 98–100% of Arial Bold's width at 34–44 px, but
  106–110% of Arial Regular's), and some wrapped onto one line less until the web font arrived. The first preview
  showed it as a 16–45 px jump at 412 px on the tours, contact and reviews pages; the weight-split faces fixed it
  (`qa/surgical-change-report.md`). The bold face's 99.5% was then set from the site's own headings measured in both
  faces at phone sizes (median width ratio 1.00 for 44 px headings), where a late swap is most likely; at the desktop
  title size (72 px, optical size 72) Bricolage runs a few per cent narrower than the fallback, and desktop
  connections usually have the preloaded face before the first paint. `qa/surgical-fontswap.mjs` checks that no page's
  first block changes height when the fonts arrive.

## 3. Tokens

All in `:root`, `src/assets/css/tokens.css`.

| Token | Value | Notes |
|---|---|---|
| `--font-display` | `'Bricolage Grotesque', 'Bricolage Grotesque Fallback', system-ui, …, sans-serif` | |
| `--font-body` | `'DM Sans', 'DM Sans Fallback', system-ui, …, sans-serif` | |
| `--font-accent` | `'Caveat', 'Caveat Fallback', 'Segoe Print', 'Bradley Hand', cursive` | |
| `--text-hero` | `clamp(3.25rem, 7vw, 7rem)` | The brief's value. Reserved for the largest statements |
| `--text-h1` | `clamp(2.75rem, 5vw, 5.25rem)` | The brief's value. Page titles, the home page's scene statements. 44 px on phones, 72 px at 1440 |
| `--text-h2` | `clamp(2.1rem, 3.8vw, 4rem)` | The brief's value. Chapter and section titles. 33.6 px on phones, 54.7 px at 1440 |
| `--text-h3` | `clamp(1.4rem, 2.2vw, 2.15rem)` | The brief's value. Sub-sections, the credentials strip, service names |
| `--text-h4` | `clamp(1.15rem, 1.05rem + 0.45vw, 1.4rem)` | Added after review: card, step and list titles. `--text-h3` (31.7 px at 1440) was too big for a tour card |
| `--text-lead` | `clamp(1.1rem, 1.02rem + 0.4vw, 1.3rem)` | Lead paragraphs |
| `--text-body` | `clamp(1rem, 1.05vw, 1.125rem)` | The brief's value: 16 px up to ~1520 px, 18 px from ~1715 px |
| `--text-small`, `--text-xs` | `0.9375rem`, `0.8125rem` | Metadata, captions, credits |
| `--text-eyebrow` | `0.8125rem` | Eyebrows (was 0.75 rem) |
| `--text-accent` | `clamp(1.35rem, 1.2rem + 0.6vw, 1.75rem)` | Caveat runs small: about 1.4× the words beside it |
| `--leading-display` | `1.02` | The brief's value: h1 and scene statements |
| `--leading-heading` | `1.1` | Default for headings; h2 1.04, h3 1.15 |
| `--leading-body` | `1.6` | The brief's value: body, leads, review summaries |
| `--tracking-display` | `-0.035em` | The brief's value: h1 and scene statements |
| `--tracking-heading` | `-0.02em` | h3 and smaller headings; h2 −0.03 em |
| `--tracking-eyebrow` | `0.08em` | Eyebrows (was 0.2 em: calmer capitals) |
| `--weight-display`, `--weight-display-strong` | `700`, `800` | Titles at 700; statements over photographs at 800 |

The brief's tokens are kept at their values; where a component needed a smaller step it takes one (`--text-h4`), it
does not shrink the token.

## 4. Hierarchy and usage rules

| Level | Element / class | Face, weight | Size token | Case |
|---|---|---|---|---|
| Scene statement (over a photograph) | `.lc-statement` | Bricolage 800 | `--text-h1` | Sentence |
| Page title | `h1` | Bricolage 700 | `--text-h1` | Title case is kept only for proper names ("Cape Peninsula Private Tour") |
| Chapter / section title | `h2`, `.lc-title` | Bricolage 700 | `--text-h2` | Sentence |
| Sub-section | `h3` | Bricolage 700 | `--text-h3` | Sentence |
| Card, step, list title | `.card__title`, `.lc-ease__step h3`, `.story-card__name` | Bricolage 650–700 | `--text-h4` (or fixed 1.06–1.13 rem) | As the name |
| Lead | `.lc-lead`, `.lead` | DM Sans 400 | `--text-lead` | Sentence |
| Body | `body`, `.lc-body`, `.prose` | DM Sans 400 | `--text-body` | Sentence |
| Navigation | `.primary-nav a`, drawer, concierge toggle | DM Sans 600 | 1–1.125 rem | As the page name |
| Chapter mark | `.lc-mark` | DM Sans 600 | 0.9375 rem | **Sentence case** (was spaced capitals) |
| Eyebrow | `.eyebrow` | DM Sans 600, 0.08 em | `--text-eyebrow` | Capitals, short only |
| Caption, credit, metadata | `figcaption`, `.source-note`, `.story-card__source` | DM Sans 400–500 | `--text-small` / `--text-xs` | Sentence |
| Hand-written note (home page) | `.lc-moments figcaption`, `.lc-memory__place`, `.gt-credentials__eyebrow` | Caveat 600, rotated −1° to −2° | `--text-accent` | Sentence |
| Buttons | `.gt-button` | DM Sans 600; `--large` Bricolage 650 | 0.875–1.0625 rem | Title Case, as the brief writes them ("Plan My Day") |
| Company statement, under the logo (Addendum, 6 Nov 2026) | `.brand-lockup__statement` | DM Sans 600, 0.01 em, one line | `--statement-size`: the logo's width ÷ 25, 10–13 px | **Exactly as supplied**: "Make Unforgettable Experience In The Mother City" |

Rules:

1. **Bold but relaxed.** Headlines are sentence case, tightly set, never in capitals. Spaced capitals are kept for
   short eyebrows only; the chapter marks are now sentence case.
2. **`<em>` in a heading is a colour turn, never a slant.** Bricolage Grotesque has no italic; `:is(h1, h2, h3, h4) em`
   is `font-style: normal` and headings carry `font-synthesis: none`, so a browser never fakes one. (The hero's Find Your
   Good Time leaf, whose "Good Time" leaned as a drawn 9° skew, was removed on 7 Nov 2026; the hero's headline is now
   "Good Times Start Here!" in Caveat 700, `design/typography.md` §10.)
3. **Line lengths.** Leads stop at 34–42 rem, body text at 36–42 em, review summaries at the card's width.
4. **Wrapping.** Headings use `text-wrap: balance` and `overflow-wrap: break-word` (was `anywhere`, which could split a
   word mid-way on a narrow phone); paragraphs `text-wrap: pretty`.
5. **Never over a face, the scenery or a call to action.** Scene statements keep the scenes' existing word boxes and
   scrims; their size is the brief's `--text-h1`, the same 72 px at 1440 as the statements had. Checked on the
   preview at 360, 390, 768, 1024 and 1440 px (`qa/surgical-change-report.md`).
6. **Caveat sparingly.** At most one hand-written element per section, always beside or under a photograph or a title,
   always repeating or decorating information that is also available in plain text (the alt text, the heading).
7. **The brand lockup** (Addendum, 6 Nov 2026). The company statement sits directly beneath the logo wherever the
   lockup appears (every page's header, the footer, the share image and the emails' header), set as text, never in
   the artwork: the logo files are untouched, and the site shows the pack's compact artwork, which has no tagline of
   its own (the full artwork's older tagline is never shown beside the statement). One line in DM Sans 600, starting
   at the artwork's left edge and spanning about its width: its size is the logo's width ÷ 25, so the two scale
   together (11.2–11.7 px on 390 px phones, 10.2 px beside the 68 px desktop logo, 12.1 px on the home page at
   1440 px), never under 10 px or over 13 px. Green as in the logo: the leaf green `--green-primary` on light grounds
   (5.2:1 on white), the reversed logo's own `#45E375` (`--logo-green-on-dark`) on the footer's navy (8.4:1) and over
   the home film, there with a soft shadow. Phones narrower than 360 px leave it out of the header, where the row has
   no room beside the menu button; the footer always has it. The case is the client's, kept as written.

## 5. Examples

- Home, chapter 01: eyebrow (DM Sans) "01 — Where the road meets the ocean"; statement (Bricolage 800, `--text-h1`)
  "Follow the coast. *Forget the clock.*" with the turn in lime-green; lead (DM Sans `--text-lead`).
- Home, the owner's photograph: the place hand-written under it in Caveat, "Chapman’s Peak Drive, above Hout Bay",
  and the credit in DM Sans 0.8125 rem.
- Tour page: eyebrow "CAPE PENINSULA · PRIVATE TOUR" (DM Sans capitals, 0.08 em), title "Cape Peninsula Private Tour"
  (Bricolage 700, `--text-h1`), overview heading "Follow the coast. Forget the clock." (`h2`), lead and facts in DM Sans.

## 6. Prohibited

- Setting or re-setting the logo, or any part of it, in a web font. (The company statement under it is text beside
  the artwork, not part of it; the full artwork's own older tagline is not re-set or shown with it.)
- Caveat for paragraphs, prices, times, conditions, form fields, labels, validation, navigation or buttons.
- Faux italics or faux bold (no `font-style: italic` on Bricolage; weights only within each face's axis).
- Naming a font family in a component (`test/naturally.test.mjs` enforces `var(--font-*)`).
- Long runs of capitals; letter-spacing above 0.08 em on anything longer than a few words.
- Loading fonts from a third-party host, or adding another family.
