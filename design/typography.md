# Typography

The brief of 6 Nov 2026 (§11) asks for a review of the site's typography: keep the brand fun, chilled and friendly,
never rigid or corporate, and make type, photographs, captions, leaves and motion one creative system. This is that
review and the rules that came out of it. The full decision record of the faces (why these three, the measured
fallbacks, every hierarchy level) is `design/font-design.md`; the leaf's type is in `design/button-tokens.md` §4; the
motion of text is in `design/motion-bible.md`.

## 1. Review: what was kept and why

The "Good Times, Naturally" type system (6 Nov 2026) already does what the brief asks, so it is **kept unchanged**: a
quirky, friendly display face for headlines, a calm text face for everything a visitor has to use, and a hand-written
accent used sparingly. Changing it now would only make the site look different. This round adds the rules that the new
motion and the signature leaf needed (§7, §8) and corrects two stale references in `design/font-design.md` (the hero's
call to action now reads "Find Your Good Time").

## 2. The families

| Role | Family | Character | Where |
|---|---|---|---|
| Display | **Bricolage Grotesque** (variable: weight 200–800, optical size 12–96) | Quirky, confident, a little unconventional; ink traps and personality at large sizes, a calmer cut small | Headlines, scene statements, tour names, the large and hero leaves, reviewer names |
| Body and interface | **DM Sans** (variable weight 100–1000; italic on demand) | Clear, warm, open | Paragraphs, navigation, facts, forms, captions, the standard leaves and pills, the company statement |
| Decorative hand-written | **Caveat** (weight 400–700), home page only | The guide's pencil in the margin | Short place labels under photographs and the credentials strip's "Good Times since 2014"; never body copy, prices, times, conditions, forms or buttons |

The logo is artwork from the approved pack: never set or re-set in any of these faces.

## 3. Heading scale (tokens, `src/assets/css/tokens.css`)

| Token | Value | At 390 px | At 1440 px | Use |
|---|---|---|---|---|
| `--text-hero` | `clamp(3.25rem, 7vw, 7rem)` | 52 px | 100.8 px | The largest statements |
| `--text-h1` | `clamp(2.75rem, 5vw, 5.25rem)` | 44 px | 72 px | Page titles, scene statements ("Your Cape Town story starts here.") |
| `--text-h2` | `clamp(2.1rem, 3.8vw, 4rem)` | 33.6 px | 54.7 px | Chapter and section titles |
| `--text-h3` | `clamp(1.4rem, 2.2vw, 2.15rem)` | 22.4 px | 31.7 px | Sub-sections |
| `--text-h4` | `clamp(1.15rem, 1.05rem + 0.45vw, 1.4rem)` | 18.6 px | 22.4 px | Card, step and list titles |
| `--text-lead` | `clamp(1.1rem, 1.02rem + 0.4vw, 1.3rem)` | 17.6 px | 20.8 px | Lead paragraphs |
| `--text-body` | `clamp(1rem, 1.05vw, 1.125rem)` | 16 px | 16 px (18 px from about 1715 px) | Body |
| `--text-small`, `--text-xs` | 15 px, 13 px | | | Metadata, captions, credits |
| `--text-eyebrow` | 13 px | | | Eyebrows |
| `--text-accent` | `clamp(1.35rem, 1.2rem + 0.6vw, 1.75rem)` | | | Caveat, about 1.4× the words beside it |

Two scene-specific sizes sit outside the scale and follow their photograph: the Cape Peninsula headline
(`clamp(1.6rem, min(52 × one image pixel, 6.2svh), 3.25rem)`, so it stays in the sand above the trail) and the company
statement (the logo's width ÷ 25, 10 to 13 px).

## 4. Line heights and letter spacing

| | Line height | Letter spacing |
|---|---|---|
| Display (h1, scene statements) | 1.02 (`--leading-display`) | −0.035 em (`--tracking-display`) |
| Headings | 1.1 (h2 1.04, h3 1.15) | −0.02 em (h2 −0.03 em) |
| The Cape Peninsula headline | 1.04 | −0.025 em |
| Body, leads, review summaries | 1.6 (`--leading-body`) | normal |
| Eyebrows (capitals, short) | 1.4 | 0.08 em; 0.18 em only for the Peninsula's two-word eyebrow on the sand |
| Leaves | 1 (one line); balanced lines below 384 px | −0.005 to −0.012 em |

## 5. Responsive rules

- Every size above 1rem is fluid (`clamp`), so there are no jumps between breakpoints.
- Headings use `text-wrap: balance`, paragraphs `text-wrap: pretty`; `overflow-wrap: break-word`, never `anywhere`.
- Measure: leads stop at 34–42 rem, body at 36–42 em.
- Phones keep body text at 16 px minimum; nothing a visitor must read is under 13 px except the company statement
  (10 px minimum, and only beside the logo).
- Text never sits over a face, the scenery's subject or a call to action: scenes keep their word boxes and scrims,
  and the Peninsula's words are placed in the photograph's own sand (`motion.css`).

## 6. Font loading

- Self-hosted WOFF2, Latin subset, unmodified (SIL OFL 1.1, `licenses/`). Nothing from a third-party host.
- Bricolage Grotesque and DM Sans are **preloaded** on every page (113.8 KB together). DM Sans italic and Caveat load
  only on pages that use them.
- `font-display: swap` with **metric-matched fallbacks** (Arial with measured `size-adjust` and ascent/descent
  overrides, a real bold fallback for bold headings), so lines keep their length and height while the faces load:
  `qa/surgical-fontswap.mjs` checks that no page's first block changes height when they arrive.
- Split text waits for the fonts: SplitText re-splits when a font finishes loading (its `autoSplit`), and the Cape
  Peninsula headline is only split once the sand renderer is ready, long after the faces have arrived.

## 7. Text animation rules

1. **Words and lines, never letters.** Text moves as readable units: whole elements, words, or words within lines. No
   per-character effects, no random rotation, no scrambling (the brief: no chaotic typography).
2. **Opacity and transforms only.** Text is never animated through `visibility` or `display` when it should stay in the
   accessibility tree; a split element keeps one accessible name (SplitText's `aria-label` on the element, its pieces
   hidden). The one exception is the hero's call to action during the intro, hidden with `autoAlpha` so it cannot take
   focus while invisible.
3. **Masks never clip a glyph.** A line mask reaches 0.16 em below its line box (padding cancelled by a negative
   margin, so the layout does not move): descenders such as the p and y of "footsteps" and "your" stay whole at rest.
   Overshoot inside a mask is at most 1.5%.
4. **Triggered, not scrubbed.** Words enter on a timeline that the scroll starts, so they are never read half-way
   through a scrub; only decoration (an image caption's fade, a contact shadow) follows the scroll.
5. **Small, consistent travel.** 8 to 26 px for blocks (most 12 to 18 px), 45% of a line for the invitation's words,
   118% of a line inside a mask for the Peninsula headline. Durations 0.4 to 1.3 s per piece, staggers 0.06 to 0.1 s.
6. **Distinct gestures for distinct moments.** Masked lines for the story's arrival ("Look where your footsteps led."),
   words rising and clearing for its close ("Your Cape Town story starts here."), a soft rise for everything else.
7. **Focus shows text at once.** Anything focused inside a staged section completes its entrance immediately.
8. **Reduced motion.** No text moves. The only allowance is a one-time opacity fade (the static Cape Peninsula scene).
9. **Brand words are never animated into something else.** The company statement is revealed as written (a soft
   left-to-right reveal after the logo is whole); the logo is never split, redrawn or re-set.

## 8. Type and the leaf

The signature leaf's words are always white and never sit in its narrow ends (wider padding at the tip than the base).
DM Sans 650 at 1 rem for the standard and header leaves; Bricolage Grotesque 700 for the large leaves. (The hero's
**Find Your Good Time** leaf, Bricolage 800 with a drawn 9° lean, was removed on 7 Nov 2026: see §10.) Calls to action are written in title case, as the brief writes them ("Plan My Day").

## 9. One system

Bricolage's quirk carries the headlines and the large leaves; DM Sans keeps every fact, form and caption calm; Caveat
appears a handful of times as a hand-written note beside a photograph. Captions name places plainly and credit
photographs honestly. The motion follows the same temperament: confident at the story's turns, quiet in between.

## 10. The hero's headline and services (7 Nov 2026)

The owner's hero-services brief, after the "Cape Town Good Times Banner" reference, and the owner's choice of the same
day: the headline **Good Times Start Here!** in place of the Find Your Good Time leaf. In the site's own three families
(no new font):
- **The headline**: Caveat 700, the site's handwriting, tilted 1.5°: "Good Times" in white, "Start Here!" in leaf green
  (`--green-deep`) on a lime brush swash (`--green-lime-accent`, 6:1). An exception to Caveat's rule of "never anything
  a visitor must not miss", at the owner's request and after the reference: it is large (32–76 px) and short, and the
  page's h1 for search and screen readers is unchanged. One line on laptops (as wide as the faceless stretch allows),
  two lines on tall wide screens (as in the reference), on phones and on short landscape screens.
- **The sentence** ("Private tours, airport transfers and authentic Cape Town experiences tailored for you."): DM Sans
  650, white, left-aligned, at most three lines on wide screens; 16–20 px over the photograph (by the screen's height),
  17–21 px beneath the hero. Below the call to action in weight and size, never competing with it.
- **The four titles**: Bricolage Grotesque 700 in its display cut (`font-variation-settings: 'opsz' 96`: the narrower,
  livelier drawing gives the slightly condensed look of the reference without a condensed font), 14–17 px, one line
  each (in a row of four they are held to 2.7% of the row's width).
- **The four lines**: DM Sans 500, 12.5–14 px, centred and balanced under their titles.
- Over the photograph, every line holds at least 5.4:1 against the brightest part of the town behind it, measured
  without the words' own shadow (`qa/hero-services-shots.mjs`); beneath the hero, 16:1 on the navy.

