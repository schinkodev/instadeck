# V006: The motion language of a deck, principles instead of lists

> Status: current
> Type: vision
> Date: 2026-10-20
> Supersedes: the rule "the model picks motion presets by name" (V002, CLAUDE.md), extends V005

## Problem

Foundation models can do motion in HTML and CSS that looks like the work of a motion designer: layered entrances, elements flying between slides, custom curves. We gave them a menu of six entrances and five transitions with fixed parameters, and rules written as lists (`distinctEntrances: 2`). The ceiling was low and the rules did not guarantee anything that mattered.

The goal of InstaDeck is to use the prompt space of the model: the model may do everything it can, and we provide a clear goal, measurement and golden examples that take it to its best region. Being a wrapper does not matter (Hyperframes is a wrapper too).

## Design

**The model designs the motion language for every deck**, the way it designs a type scale:

- `intensity`: `still | subtle | expressive | kinetic`. No motion (`still`) is a full design choice for minimalist professional decks, not an absence of design.
- `rationale`: why this language fits the audience. It cannot be verified, but writing it raises quality.
- `vocabulary`: named entrances and transitions of its own as Web Animations keyframes (opacity, transform, filter, clip-path), with a duration and a curve (named, `cubic-bezier()` or `linear()`). An animation always ends in the resting state of the slide, so the final state, print and PDF still hold.
- A transition can be `shared`: the same elements (headline, logo, image) on neighboring slides glide from place to place (magic move).
- A slide can override the entrance of the whole slide or of single zones. Exceptions are for key moments.
- Presets (`rise`, `fade`, `slide`, `morph`...) are written in the same format. The model sees them in full and can start from them.

**We guard the result, not the input.** The rules rest on how perception works (`lib/domain/principles/motion.ts`) and are measured:

- statically (without a browser): time until a slide is readable, durations below the threshold of perception or above the threshold of waiting, coherence (exceptions are rare), `still` without hero motion, a shared transition without shared elements, unknown names,
- in a browser (sampling the animation on a probe): the energy of the motion (travel, scale, blur, rotation) against the declared intensity, overshoot (bounce) outside `kinetic`, an entrance that speeds up into rest instead of slowing down.

Measurement in a browser runs locally in Chromium and, for the hosted connector, in the MCP App in the user's browser, just like the overflow measurement. No browser on the server. A link opened outside the chat is not measured, and that is fine.

**Golden examples cover the space of styles**, not just pitch beats: from `still` (board update) to `kinetic` (a consumer launch with its own vocabulary and shared transitions). Each explains why motion is there or not.

## Security

The model writes neither HTML nor JS. Keyframes are data with an allow list of properties and values without `url(`, passed as JSON to Web Animations. A link `/d/<id>` on `instadeck.app` therefore cannot carry a foreign script.

## Open

- A `scene` block: free SVG or canvas in a sandboxed iframe on a separate domain for one exceptional visual. Not yet, first find out how much of it keyframes cover.
- The same approach (measured invariants instead of lists) for layout: grid, white space, alignment. Started in V008 (layout balance, type contrast).
- MP4 export from a declarative timeline in the local variant.
