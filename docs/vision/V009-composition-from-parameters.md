# V009: Composition from parameters, not from more templates

> Status: proposal, decision A/B/C taken in this document, implementation follows in steps
> Type: vision
> Date: 2026-10-22
> Supersedes: nothing, extends V008 (concept and schools) and answers issue #28

## Problem

Schools (`lib/domain/schools.ts`) change tokens: fonts, scale, density, radius, cards and a motion recommendation. The geometry of the 20 layouts (`lib/domain/layouts.ts`, a fixed `grid.areas` each) is the same for every school: white background, headline top left, content below. Editorial, Swiss and IBCS decks look like siblings, and a user who tries several briefs gets "almost always a similar style".

The `signature` of the concept is filled in ("green only on the one number") but the engine never draws it. The model states a device that nothing carries out.

## What #20 taught

Slide recipes (V008, phase 2, part two) regressed in the eval: 0 to 5 against #18. The judge saw "a run of cards and stat rows on white with no clear peak". The hypothesis is that named templates pull the model toward template compositions. More named templates is the wrong lever. Variety has to come from the composition itself, and the headline-stat and closing slides already show the direction: #26 fixed them by measuring dominance and alignment instead of adding a layout.

## Decision: how much freedom for the model

| Option | What the model chooses | For | Against |
|---|---|---|---|
| A. More fixed layouts | a layout id from a longer list | simple, trivial PowerPoint export | a list again, endless additions, still similar, the same failure as #20 |
| **B. Composition parameters on a grid** | a layout plus parameters: axis, split, dominant element, color field, scale of the hero | real variety, the model does the design work, the engine measures | more room for mistakes, more to measure |
| C. Free placement of zones on a 12 column grid | columns and rows of every zone | maximum freedom | coherence across slides breaks, PowerPoint and measurement get harder, the model solves pixels instead of the story |

**Decision: B.** It follows V008, "freedom in the concept, measured precision in the execution": the model decides the composition as intent, the engine derives the numbers and checks that the slide holds the grid, has one dominant element and enough empty space. A fails for the reason #20 failed. C gives the model the one job the engine does better (pixels) and takes away what keeps a deck coherent.

## Composition parameters

A layout keeps its zones and its purpose. A slide may add a `composition` object. Every parameter is optional and has a default that comes from the school, so a slide without it renders as today under the default school.

| Parameter | Values | What the engine does |
|---|---|---|
| `axis` | `left`, `center`, `asymmetric` | the alignment axis of text and figure. `asymmetric` moves the text column off the center and leaves the opposite side empty on purpose |
| `split` | `1:2`, `1:1`, `2:1`, `1:3` | the ratio of two columns in layouts that have two |
| `dominant` | a zone name | the zone that leads. The engine scales it up and measures that it leads (the existing `layout-dominance`) |
| `field` | `none`, `tone`, `half`, `band` | a color field behind the dominant zone or across part of the slide, drawn from the palette (`tone` or `background`) |
| `scale` | `1`, `1.5`, `2` | scale of the hero element, capped by what fits and by the measured dominance |

The values are a closed set, not free numbers. The model picks intent, the engine derives pixels. A parameter that the layout cannot honor (a `split` on a one column layout) is an error with the layouts that can.

### Schools carry a default composition

| School | Default composition |
|---|---|
| Swiss | `axis: asymmetric` (two column layouts get the uneven split toward the visual), a heavy rule |
| Keynote | `axis: center`, one element on a `field: tone` |
| Editorial | large serif numbers, a narrow text column, `field: none` |
| Ma | `axis: asymmetric`, `scale: 1`, the smallest content on the largest empty field |
| IBCS | `axis: left`, no field, the grid shows |

Step 2 implements the axis defaults for Swiss, Ma, Keynote (center) and IBCS (left). Editorial carries none yet: its large serif numbers and narrow column need `scale` and `field` (step 3), and a plain split default turned out to shrink the text column instead of the image. An axis other than `left` applies only to title, statement, section and closing in one column: a full bleed layout has white text on a scrim that fades to the right, a quote and a logo grid are built for their width, and dense content keeps a left edge.

The model may override on any slide. The deck stays coherent because a deck uses the defaults of one school and exceptions mark moments, the same rule as for motion exceptions in V006.

## Signature as render primitives

A `signature` is free text today. It gets a small set of render primitives that repeat on every slide: **a rule**, **a chapter number**, **a frame**, **a color field**, **a crop**. The model picks one and parameterizes it (position, weight, which color), the engine draws it and measures that it stays out of the text. A signature that no primitive can draw stays a sentence in the concept and the guide says so, instead of promising it.

## What is measured

Principles, each with the perception it follows from:

- **The grid holds** (Müller-Brockmann): the left edges of the zones sit on column lines of the slide grid. A parameter never creates an edge that is off the grid.
- **One dominant element** (Gestalt, figure and ground): the existing `layout-dominance`, now also for a slide with a parameterized hero.
- **Enough empty space** (Arnheim, active white space): the share of empty area stays above a floor, so `scale: 2` cannot fill the slide.
- **The difference is real**: a test renders the same content under two schools and requires the zone rectangles to differ on several slides. Tokens alone do not pass it. The axis moves the open layouts (title, statement, section, closing) and the uneven split moves the two column ones, so the dense slides keep their layout in every school.
- **Dominance by construction**: a `dominant` zone gets the larger column, so step 2 does not measure it again. A first version compared content areas and warned wrongly on a text zone next to an image, which fills its column by nature.

## PowerPoint

A composition resolves into zone rectangles and a color field resolves into a rectangle. The export already places zones by rectangle, so parameters add no new object type. The rule, the chapter number and the frame are shapes. A crop needs the same decision as the photo treatment in V008 phase 3 and waits for it.

## Eval

Against the current state, both orders, on the ten briefs plus one brief written to need a peak. The criteria that #20 lost, **focus** and **hierarchy**, must not regress. A step that regresses in the eval is not merged (`CLAUDE.md`). The judge is the same model as the generator and not yet calibrated, so a person decides the ambiguous pairs.

## Steps

Each is one pull request with its own eval where it changes deck quality.

1. This document (no code).
2. `composition` on a slide with `axis`, `split` and `dominant`, the measurement of the grid, and the cross-school geometry test. Schools get defaults for these three.
3. `field` and `scale`, with the empty space measurement.
4. Signature primitives: rule, chapter number, frame, color field. The crop waits for V008 phase 3.
5. PowerPoint for all of the above.

## Not now

- Free placement of zones (option C) and user-defined layouts.
- A longer layout list (option A).
- Composition parameters for charts and tables, which have their own geometry.

## Open

- Whether `field: half` and `field: band` should be separate values or one value with a side.
- How the school default and the concept's `signature` combine when they disagree. The proposal is that the signature wins, because the model wrote it for this deck.
- How many schools carry a distinct default before the differences blur (see V008, Open).
