# V008: Design from principles down, guardrails, the image layer and analytic decks

> Status: current
> Type: vision
> Date: 2026-10-21
> Supersedes: nothing, extends V005 (brand system, examples) and V006 (motion language)

## Problem

Decks are correct but alike. The reasons are visible in the code:

- The main style lever is six moods with a fixed font pair each. Two brands with the same mood differ only in color.
- Golden examples are whole decks and the instructions say "keep the structure and rhythm of the example". The model clones them.
- The design principles (`lib/domain/principles/design.ts`) are knowledge the model reads once. Only some of them are enforced (contrast, text length, layout rhythm, motion). White space, the dominance of one element and the number of type sizes are not measured.
- Images are an `image` block in four layouts and the full bleed `image-full` with a fixed gradient. There is no slide background, no consistent treatment of photos, no controlled legibility of text over an image and no visuals derived from the brand, so a deck without photos looks empty rather than deliberate.
- Charts are hand written SVG and HTML: four kinds, no axes, no negative values, 8 categories and 3 series. A financial or analytic deck does not fit.

## Principle

**Freedom in the concept, measured precision in the execution.** It builds on the rule in `CLAUDE.md`: taste rules are principles, not lists, and what matters is guarded measurably, with a reason grounded in perception. The model may do everything it can. Deciding the idea (concept, references, story) is its job. Numbers, spacing, contrast, sums and alignment are computed and checked by the engine.

No narrowing "just in case". Every new rule needs the principle it follows from and the way it is measured.

## Four enforcement layers

| Layer | What it does | Where it runs |
|---|---|---|
| 1 Schema | a bad state cannot be written (`strictObject`, zones, count limits) | domain, `applyOps` |
| 2 Tokens and derivation | the model picks the intent, the engine derives the numbers (scale, palette, grid, spacing, chart labels) | domain, engine |
| 3 Lint and measurement | a violation is reported with a reason and a severity | engine statically, measurement in a browser (locally Chromium, hosted the MCP App) |
| 4 Critique | what can only be judged by eye: hierarchy, focus, fit with the concept | the model with PNGs and a rubric (`review_deck`) |

The hosted mode has no browser on the server for layer 3. Measurements that need rendering therefore run in the MCP App at the user, like the overflow measurement today. Everything that follows from the data can run statically on the server.

## Principles audit

Every principle gets the layer that enforces it. What sits only in layer 4 or nowhere is a gap. The state of the design principles in the code on 2026-10-21:

| Principle | Then | Gap and step |
|---|---|---|
| Limited typeface palette (Tschichold) | 1 schema: `fonts.heading`, `fonts.body` | none |
| Modular scale (Bringhurst) | 2 tokens: `typeScales`, `base` | none |
| Meaningful contrast in size (Williams) | 2 tokens, partly | measure the heading to body ratio per slide (at least 1.5) |
| Data-ink ratio (Tufte) | nothing | a rule for new charts: axes, grid and labels only when they carry information |
| Flush left (Tschichold) | 2 renderer | none |
| Line length 45 to 75 (Bringhurst) | 2 `.text` max-width 36em | measure bullets and cards too |
| 60/30/10 | 3 only `tone-accent` at most 2 | measure the accent area per slide |
| Seven contrasts (Itten) | 4 | critique rubric |
| Simultaneous contrast (Albers) | 3 `contrast` for fg, muted, accent on bg and fg on cards | **muted on surface** was missing although `card-text` is muted on a card. Add it |
| Limited active palette (Vignelli) | 1 six slots | none |
| Honest expression, signal color (Rams, Swiss) | 2 renderer, `==highlight==` only in text | lint: at most 2 highlights per slide, accent outside numbers and highlights |
| Grid (Müller-Brockmann) | 2 layouts | measure the number of distinct left and top edges of zones per slide |
| Proximity (Gestalt) | 2 spacing tokens | measure that the gap between groups is larger than within them |
| Active white space | nothing | measure how much of the slide content covers, warn above 70% |
| Figure-ground | 3 contrast | measure that `surface` is distinguishable from `bg` (subtle but clear) |
| Common region (Palmer) | 2 cards | none |
| One dominant element (Williams) | nothing | measure the ratio of the largest element to the second, `statement` and `headline-stat` must win clearly |
| Repetition (Williams) | 2 renderer | none |
| Less but better (Rams) | 1 count limits, 3 text length | add limits on bullets and blocks |
| Gutenberg diagram | 4 | critique rubric |
| Semantic consistency (Vignelli) | 2 tokens | none |
| Smallest effective difference (Tufte) | 2 `surface` = 8% mix | none |
| Form follows function | nothing | **critical with backgrounds**: define when a background is functional (see the image layer) |
| Cognitive load (Miller, Cowan) | 1 stats at most 4 | add bullets and cards |
| Signal to noise (Reynolds) | 2 renderer | none |

The storytelling principles (Minto, Duarte, Alley, Kahneman) are audited with the same table. "The heading is the takeaway, not a label" stood only in the guide text. Lint: a heading that is a label (Problem, Solution, Team, Market...) without a verb or a number is a warning.

The audit is `docs/principles-audit.md`, generated from data (every principle in the domain carries `enforced` with its layers and an optional `gap`), so it cannot drift from the code. A test fails when a principle has no layer.

## Principles from design history that were missing, and how they are measured

| Principle | Source | How it is enforced |
|---|---|---|
| A fixed grid and baseline | Müller-Brockmann | zones align to 12 columns, lint on the number of left edges |
| Visual variables | Bertin | one variable carries the meaning (position, length, color), not three at once, in charts |
| Ranking of perceptual tasks | Cleveland and McGill | position and length before angle and area: a donut at most 4 segments and only for a share of a whole |
| Lie factor | Tufte | the ratio of visual change to data change must be 1: columns start at zero, a truncated bridge axis is marked as broken |
| Small multiples, sparklines | Tufte | new chart kinds |
| Contrast of treatment | Itten, Albers | a color rule in the school (see concept and schools) |
| Asymmetry and emptiness | Tschichold, Hara | the "ma" school, measured share of emptiness |
| Three second test, STAR moment | Duarte | critique rubric: one slide is deliberately memorable |
| Assertion-evidence | Alley | the heading is a sentence, the body proves it with a visual, not with bullets |
| Coherence and redundancy | Mayer | no decoration without meaning, the slide does not repeat what the speaker says |
| Peak-end | Kahneman | the peak and the end of the deck are designed, not accidental |
| A consistent international notation | IBCS (Hichert) | actuals solid, plan outlined, forecast hatched, variances in their own chart |

## Concept and schools

The model picks a mood (one of six). A second axis and a step before layouts:

**The deck concept** (a required field in `brief`): the idea in one sentence, named references ("editorial like Bloomberg Businessweek"), anti-references (what the deck is not), one recurring graphic device (signature). The schema works as a prompt: a field the model has to fill makes it decide. The concept is stored with the deck and every later edit (`apply_ops`) reads it, so edits keep the point.

**Schools** as a lens next to the mood. The mood is the personality of the brand, the school is the formal language. A school is a record in the domain: typography, palette logic, grid, density, treatment of images, the character of motion, what to avoid and one sentence on how to think in it. The set: Swiss/International, editorial, Japanese "ma", product keynote, technical product, brutalism, Bauhaus and constructivism, functional (Rams, Braun), data journalism (Economist, FT), IBCS for finance, warm humanist. Schools add no new constraints: they are **recommendations with reasons** and the model may combine them.

**Slide recipes instead of whole example decks.** Named compositions ("problem: one big number and one human sentence") with a bad and a good example. The model composes by beat. `get_example` stays for the rhythm of the whole. This one regressed in the eval, see Status.

## Story: narrative frames and asking the user

A deck needs a head and a tail, and the model must not invent proof. The eval showed both: decks without a clear ending and placeholders on slides ("Add real bio", "replace with sourced figure"). The golden examples themselves taught the placeholder habit.

- **Narrative frames as data** (`lib/domain/narrative.ts`): classical oration (Cicero), SCQA (Minto), And But Therefore (Olson), motivated sequence (Monroe), story spine (Adams, Pixar), what is and what could be (Duarte), claim, grounds, warrant, rebuttal (Toulmin). A frame is an order of stages, a stage names its job and the beats that serve it, and a frame names how it fails.
- **A beat says what to ask** (`askUser`) and whether it stands on evidence (`needsEvidence`). New beats `risks` and `decision` for boards and internal decks.
- **Asking:** before building, the model checks the beats against the brief and asks the user for missing evidence, at most five questions with a suggested answer each. It invents no numbers, names or quotes and writes no placeholder on a slide. A beat without its evidence is left out.
- **Validation** only of what the deck declares (`brief.frame`, `slide.beat`): it opens with the hook, ends with the ask or a decision, follows the stages of the frame, and a beat that needs evidence carries an evidence block. The `placeholder` lint catches notes to the author on a slide.
- **Later:** MCP `elicitation` (a form straight to the user) where the client supports it, on top of the question in the chat. An eval with sparse briefs that measures whether the model asks.

## The image layer: assets, images, backgrounds

From principles down.

**Principles.**

- Picture superiority and dual coding (Paivio, Mayer): an image is remembered better than text when it carries meaning. Decoration is not (coherence principle).
- Figure-ground (Gestalt): text over an image must be legible at once. Legibility is measured, not estimated.
- Repetition and Vignelli: the images of a deck get one treatment (crop, radius, color treatment). One photo with a filter and another without is a mistake, not a style.
- Tufte and "form follows function": a background either carries meaning (chapter, mood, depth) or is a quiet surface. Texture without meaning is refused.
- Albers: the color of an image and of the background are judged side by side. A duotone in the brand color unifies mismatched photos.
- The golden ratio and thirds: the focal point of an image (`focus`, exists already) belongs on a strong point of the composition, text on the opposite side.

**Data model.**

- An asset has a **role**: `logo`, `photo`, `screenshot`, `illustration`, `texture`, `icon`. The role decides its treatment (a screenshot is not cropped, a logo gets no duotone, a photo does).
- The deck gets `imagery` (one treatment): `treatment` (`none | grayscale | duotone | tint`), `radius`, `overlay`. Repetition is then guaranteed by the schema.
- A slide gets an optional `background`: `none` (default, a quiet surface), `field` (a color surface from the tokens, the current `tone`), `image` (an asset with a focal point and overlay) and `brand` (a visual generated from the brand: a large numeral, a crop of the logo mark, a geometric composition from accent positions). It is a feature, not a fallback: a deck without photos must look deliberately typographic.
- `overlay` is not a fixed gradient. The engine computes the smallest opacity at which text over the image reaches 4.5:1 contrast (3:1 for large type) from the luminance of the image under the text.

**Measurement.**

- Statically: every image has `alt`, a role and a fitting layout (an `image` background only under layouts that carry it). Resolution: an image narrower than its displayed width on a 1920 px slide is a warning.
- In a browser: sampling the luminance under the text zones (canvas) gives the real contrast of text over the image; it comes back as a finding, like overflow.

**Sources and boundaries.** The hosted `add_asset` takes `url` and small `data_base64`. The server generates, searches and downloads no stock images. The model uses what the user provides. Until there is an image, a slide is typographic or uses a brand visual. The user is responsible for the image license.

**Exports.** `field` and `image` backgrounds go to PPTX as the slide background. A treatment (duotone, tint) cannot go to PPTX as a CSS filter: either it is processed on upload (a derived asset), or a rendered snapshot is placed in the PPTX. The decision is among the open questions.

## Motion: film and animation grammar

V006 is a good base (Tversky, Heer and Robertson, Thomas and Johnston). To add to `motion.ts` where missing:

- **The meaning of a transition follows the relation of the slides.** Cut: contrast. Dissolve: passing time. Match cut (`morph`): continuity of an element. Wipe: a new chapter. The transition is chosen by the relation between two slides. The same headline: `morph`, a new chapter: wipe, emphasis: lift.
- Choreography in waves by hierarchy (headline, main element, support), not all at once.
- Slow in and out by the weight of the element, entrances decelerate, exits accelerate (measured already).
- Doherty: nothing waits longer than about 400 ms for the first response (`readableMs` covers part of it).
- Motion in data (grow, draw, sweep) matches what changes: columns grow from the baseline, a line draws from left to right, a waterfall builds step by step.

## Analytic and financial decks

**What was missing.** Kinds: waterfall/bridge, stacked, columns combined with a line, negative values, small multiples, scatter, a heatmap (cohorts), a table with sparklines, a football field. Notation: axes and grid only when they carry information, reference lines, annotations, direct labels instead of a legend, units in the header, years with A/E/F, negative numbers in parentheses, a required source and date.

**Integrity of numbers** is the main guardrail. The model provides the data and the intent, the engine derives numbers and labels.

- Facts of the deck: named numbers (value, unit, period, actual or estimate, source). Stats point at facts, so the number on slide 4 cannot differ from slide 9.
- Derived values: change, growth, CAGR, share, computed by the engine. The model writes its value, the engine checks it.
- Checks: a bridge adds up (start plus changes is the end), donut shares, table totals, a nonsensical unit, percentages in labels match the data.
- Precision: number formatting by locale, thousands, decimal separator, currency, `tabular-nums`.

**IBCS as a school.** Actuals solid, plan outlined, forecast hatched, variances in their own chart, one scale across compared charts.

**Dependency.** V008 proposed five d3 modules without a DOM. Only `d3-array` (ISC, no dependencies) turned out necessary, for nice axis ticks. Our own block schema and our own HTML and SVG on top keep `data-part` for motion. Vega-Lite is too free for this case, ECharts and Chart.js need a DOM or canvas and connect badly to motion and PPTX. PPTX keeps native charts from `pptxgenjs`, a waterfall as a stacked chart on an invisible base.

## Eval

Without measurement we tune by feel. An eval harness outside CI (it calls a model and costs money), `scripts/eval/run.ts`:

- 10 fixed briefs (seed, enterprise, board update, financial analysis, product launch, consumer app, nonprofit, internal strategy, a given brand, devtools; English and Czech).
- For each version of the guide, decks are generated, rendered to PNG with the code of that version and compared pairwise (A/B) by a model with vision against a rubric: focus, hierarchy, concept, rhythm, legibility, polish. Every pair is judged twice with the order swapped, against position bias.
- A controlled test renders the same decks with the old and the new renderer, an uncontrolled test generates new decks with the new version.
- A human decides the contested pairs. The result is a table of versions and wins, not one number.
- It stays outside `npm test`. CI tests do not call a model.

## Phases

1. **Audit and eval.** `enforced` on the principles, the generated `principles-audit.md`, a test that no principle has an empty layer. The eval script and 10 briefs. Muted on surface, label headings and highlight limits.
2. **Concept, schools and story.** The concept field, 11 schools in the domain, narrative frames, beats and asking the user, slide recipes, a change to the `get_example` instruction.
3. **Image layer.** Asset roles, `imagery`, `background`, overlay computed from contrast, legibility measured in the browser, brand visuals, backgrounds in PPTX.
4. **Analytics.** Facts, derived values, integrity checks, new chart kinds and notation, the IBCS school, `d3-array`.
5. **Critique.** `review_deck`: PNGs, computed metrics (density curve, share of slides with a visual, number of type sizes), a rubric and roles. In the hosted mode first find out what the MCP App can send back (see Open).
6. **Polish.** Palette derivation in OKLCH instead of mixing in sRGB, typesetting by language (done in phase 1: non-breaking spaces in numbers and after Czech one-letter words), consistent spacing for ranges.

Every phase: a branch, a PR, typecheck, lint, vitest and an eval for anything that changes deck quality.

## Status on 2026-10-22

| Step | PR | Result | State |
|---|---|---|---|
| Principles audit, three new rules | #13 | design principles 21 of 27 covered, storytelling 6 of 14 | merged |
| Eval harness | #14 | baseline of 10 decks, 0 findings, about 6 USD | merged |
| Composition measurement, figures in the optical center, closing hierarchy | #15 | controlled eval (same decks, other renderer) 10 to 0, polish 2.8 to 3.5 | merged |
| Typesetting by language, placeholder lint | #16 | tests, the cause in the golden examples removed | merged |
| Narrative frames, beats, asking the user | #17 | tests, examples carry their frame and beats | merged |
| Concept and schools | #18 | the stack #15 to #18 against the baseline: 6 to 1, 3 contested | merged |
| Slide recipes | #20 | 0 to 5 against #18: decks became templates without a peak | draft, not merged |
| Analytic charts | #21 | measured only together with #22 | open |
| Facts and checked numbers | #22 | with #21: 2 to 6 against #18, but won the financial brief | draft, to iterate |

The eval judge is the same model as the generator and has not been calibrated against a human yet.

## Open

- Treatment of photos for PPTX: a derived asset on upload (needs an image processing library, watch out for native binaries on ARM64 Lambda) or a rendered snapshot.
- What the MCP App may send back to the model: if only findings, the hosted model never sees the image and critique (layer 4) stays local.
- How many schools are enough. More than about 12 will blend and blur the differences.
- Charts reading straight from facts (a chart series that points at facts).
- Calibrating the eval judge against the owner's choices, and a second judge model.
