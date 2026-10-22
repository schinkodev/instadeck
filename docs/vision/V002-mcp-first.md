# V002: MCP first, the presentation as a standalone HTML file

> Status: superseded (V003-open-source-local.md: the layers, tools and principles still hold, distribution and storage change)
> Type: vision
> Date: 2026-10-18
> Supersedes: V001-architecture.md

## Problem

V001 planned a UI of our own (dashboard, chat, viewer), our own harness, credits and MP4 through Remotion. That is a lot of work that does not sell the core value. The value is domain knowledge of how great branded pitch decks are made. Users want to use it in the harness they already have (Claude Code, Claude Desktop, claude.ai).

## Design

```
lib/domain   knowledge: blocks, layouts, tokens, brand kit, motion presets, principles, pitch story
lib/engine   deterministic: compiling a deck into standalone HTML, validation, PDF, PNG, brand colors
lib/state    local deck storage with revisions, applyOps (the only write path), assets
lib/tools    tools in MCP shape (a transport independent definition) and the service
server/      MCP server: stdio (local), later Streamable HTTP (hosted)
skills/      skill for Claude Code: format, workflow, taste
```

Dependencies only point down, ESLint enforces it.

### Principles

1. **The model decides content, structure and design. The engine renders, validates and exports.** The model composes slides from blocks and layouts and picks tokens and motion presets by name. The engine generates the HTML. That is why every deck is on brand, can be validated and animates without any work from the model.
2. **The output is one standalone HTML file.** A presentation with animation (slide entrances, step reveals on click, animated numbers and charts, transitions), keyboard controls, full screen and speaker notes. It works offline except for web fonts. A static variant of the same file (all steps revealed, no animation) is the source for PDF and PNG.
3. **A presentation, not a video.** Time does not move on its own, the presenter advances the steps. Animation runs in the browser through CSS and Web Animations. No Remotion and no video rendering.
4. **MCP is the main interface.** The server is a standard, generic MCP server and does not assume our client. Outputs come as text, PNG previews and the path to the HTML file (local), later a link (hosted).
5. **No UI or harness of our own.** The hosted part will later only be static HTML sharing and HTTP MCP.

### Inspired by HyperFrames

HyperFrames (HeyGen, Apache 2.0) turns HTML into video for agents. We take: HTML as the output format, timing in `data-` attributes, deterministic output, a skill for agents and non-interactive control. We do not take: the agent writing HTML itself. Here the engine writes the HTML, because the value is in the domain.

### Data model (short)

- `Deck`: id, title, brief (company, topic, audience, goal, language), design (token parameters), brandKitId, slides, revision
- `Slide`: id (stable), layout, intent (what the slide communicates), blocks by layout zone, motion (entrance, transition, stagger, steps), notes
- `Block`: a discriminated union (heading, text, bullets, stat, stats, chart, image, logo, quote, timeline, team, comparison, cards, table, cta), each with content limits
- `Op`: add_slide, update_slide, remove_slide, move_slide, set_design, apply_brand, set_title
- `BrandKit`: logo assets, colors, fonts (Google Fonts or an uploaded file), tone

### MCP tools

| Tool | What it does |
|---|---|
| `get_design_guide` | Catalog of blocks, layouts, motion presets and the principles for a brief |
| `create_brand_kit`, `get_brand_kit`, `list_brand_kits` | A brand kit from assets and values chosen by the model |
| `add_asset` | Adds a logo, font or image from a file (local path) or base64 |
| `extract_brand_colors` | A deterministic palette from a logo (SVG and raster) |
| `create_deck` | Creates a deck from a brief, optionally with slides right away |
| `get_deck`, `list_decks` | Reading |
| `apply_ops` | The only write, `expected_revision`, returns validation findings and the path to the HTML |
| `validate_deck` | Validation: schema, contrast, content limits, motion budget, overflow (measured in a browser) |
| `render_preview` | PNG of selected slides |
| `export_deck` | `html` or `pdf`, returns the path |
| `get_history`, `revert_deck` | Revisions |
| `delete_deck` | Deletes a deck, `destructiveHint`, requires `confirm: true` |

Resources: `instadeck://guide`, `instadeck://blocks`, `instadeck://layouts`, `instadeck://motion`, `instadeck://principles/design`, `instadeck://principles/storytelling`, `instadeck://pitch`, `instadeck://capabilities`, `instadeck://deck/{id}`. Prompt: `create_pitch_deck`. Instructions and capabilities follow a capability registry (`done | partial | planned`, a test keeps them in sync).

### Storage

Locally `INSTADECK_HOME` (default `~/.instadeck`): `decks/<id>.json` with revision history, `brand-kits/`, `assets/`, `out/<id>/deck.html`. Hosted storage only in phase 6.

## Implementation

Phases, after each one typecheck, lint, tests, commit and push:

1. ~~Skeleton~~ done, Next.js removed (a plain TypeScript package, `tsx`, vitest, ESLint, CI).
2. ~~**domain**~~ done: schemas, block catalog, 20 or more layouts, tokens with derivation, motion presets, brand kit rules, design and storytelling principles (taken over from slyde-saas), the pitch story.
3. ~~**engine**~~ done: compiling to HTML with a presentation runtime, static mode, validation (pure rules and measurement in a browser), PDF and PNG through Chromium, color extraction.
4. ~~**state**~~ done: `JsonFileStore`, `applyOps` with revisions and atomicity, history and revert, assets.
5. ~~**MCP (stdio)**~~ done, waiting for a manual check in Claude Code and Desktop: tools, resources, prompt, instructions, capabilities, skill.
6. Later, only with consent: a hosted HTTP MCP with API keys, shared links (static HTML hosting), paid hosting.

## Acceptance Criteria

- [x] One `create_deck` call with slides produces a standalone `deck.html` that opens in a browser and plays with animation
- [x] The PDF has selectable text and matches the static HTML
- [x] Validation finds overflowing text, low contrast and an exceeded motion budget (tests)
- [x] `apply_ops` with a mismatching revision fails and writes nothing
- [x] MCP contract tests: every tool in the capability registry, `isError` on failure, `destructiveHint` on delete
- [ ] Manual check in Claude Code: a deck comes out of a company description and a logo
- [x] No test calls a model, user facing copy contains neither the word AI nor an em dash
