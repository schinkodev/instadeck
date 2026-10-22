# InstaDeck

Branded pitch decks as an open source MCP server (MIT, npm `instadeck`, `instadeck.app`). The user describes the company and topic in their own Claude and adds brand assets, the result is an animated presentation and a PDF. **MCP first**: no UI or harness of our own.

One core, two paths: the **hosted connector** `https://instadeck.app/mcp` (default, nothing to install, the presentation plays as an MCP App right in the claude.ai and Desktop chat, link `/d/<id>`) and the **local server** `npx -y instadeck` (the pro option: files in a folder, previews and measurement in Chromium).

## Specs

- [docs/vision/V009-composition-from-parameters.md](docs/vision/V009-composition-from-parameters.md): composition parameters on a grid instead of more fixed layouts, school default compositions, signature as render primitives (proposal)
- [docs/vision/V008-design-from-principles-down.md](docs/vision/V008-design-from-principles-down.md): audit of the principles by enforcement layer, concept and schools, story frames and asking the user, image layer (assets, backgrounds), analytic decks with facts and checked numbers, eval
- [docs/vision/V006-motion-language.md](docs/vision/V006-motion-language.md): the model designs the motion language of a deck (intensity, its own keyframes, shared transitions), measured principles guard it instead of lists
- [docs/vision/V005-examples-brand-and-free-tier.md](docs/vision/V005-examples-brand-and-free-tier.md): golden examples, brand system, free and premium boundary (extends V004)
- [docs/vision/V004-connector-and-local-server.md](docs/vision/V004-connector-and-local-server.md): current direction (hosted connector with an MCP App as the default, local server as the pro option)
- [docs/vision/V003-open-source-local.md](docs/vision/V003-open-source-local.md): open source, npm, extensions, landing (default path superseded by V004)
- [docs/vision/V002-mcp-first.md](docs/vision/V002-mcp-first.md): layers, tools and principles (distribution superseded by V003)

## Layers (dependencies only point down, ESLint enforces it)

```
lib/domain   blocks, layouts, tokens, brand kit, motion language and presets, design, storytelling and motion principles, narrative frames, design schools, golden examples (examples.json)
lib/engine   deterministic: HTML presentation, validation, overflow, composition and motion measurement, PDF, PNG, colors from a logo
lib/state    deck storage with revisions, applyOps (the only write path), assets
lib/tools    tools in MCP shape and the service
server/      MCP server: stdio (local), HTTP (connector, Lambda), MCP App
skills/      skill for Claude Code
site/        static landing page (instadeck.app)
scripts/     build, bundles, generated files, golden example promotion, eval
```

## Rules

- **The model decides content, structure, design and motion. The engine renders, measures, validates and exports.** The model does not write HTML. It composes slides from blocks and layouts and designs the motion language of the deck as data (presets or its own keyframes, V006).
- **A presentation, not a video.** Animation runs in the browser (CSS and Web Animations), the presenter advances the steps.
- **The only write path** is `applyOps` in `lib/state`.
- **Domain knowledge** lives in `lib/domain`. Tool descriptions, resources and the skill are generated from it and do not hard-code it.
- **Tools keep the MCP shape**: ids in arguments, no state in the process, `structuredContent` plus a text copy, `isError` on failure.
- **The server is a standard, generic MCP server.** Every output must make sense in any client (text, PNG, path or link).
- **Self-description**: the capability registry `server/capabilities.ts` (`done | partial | planned`) feeds the instructions and a resource. A new tool needs an entry in the registry, otherwise a test fails.
- **No fallbacks or heuristics "just in case".** Fix the cause.
- **Taste rules are principles, not lists.** The model may do everything it can. What matters is guarded (coherence, legibility, motion only when it carries meaning), measurably and with a reason grounded in perception. Do not add narrowing "just in case".
- **Golden examples** are data in `lib/domain/examples.json`, without assets and with made-up content. Each must pass `create_deck` without errors and warnings. They are added only through `npm run example`.
- **Tests with vitest** for domain, engine, state and tools, without calling a model. After each step: typecheck, lint, tests and a commit on a branch. Nothing is pushed to `main`, changes go through a pull request (see Workflow).
- **A design change is measured.** A change to the guide, principles, validation or renderer that affects deck quality comes with an eval result in its pull request (`npm run eval`, see `scripts/eval/run.ts`). A change that regresses in the eval is not merged.
- **Everything goes through MCP tools and resources.** No side channels only for our own client. What the model does not learn from a tool description, the instructions or a resource does not exist. What the server does not have is not promised (`planned` in the registry).
- **Nothing is published or deployed without an explicit go:** making the repo public, `npm publish`, GitHub Release, GitHub Pages, DNS, AWS resources. Say beforehand what exactly will be created.
- **Claude runs the server and the tests itself** and does not ask the user to run anything.

## Workflow

- `main` is a protected branch. Nobody pushes to it directly, everything goes through a **pull request** with green CI (typecheck, lint, tests, secrets check).
- A contributor works in a **fork**, on a short branch, and opens the PR against `main` of this repo. The PR template is in `.github/`. Details in `CONTRIBUTING.md`, and for collaborators `docs/ONBOARDING.md`.
- One pull request is one change with one reason. Stack pull requests at most two deep, then merge first.
- Changes to `.github/`, `lib/domain/examples.json`, `server/capabilities.ts` and `LICENSE` are approved by the owner (CODEOWNERS).
- **Never in the repo:** keys, tokens, `.env`, account numbers or names of production resources. gitleaks guards it locally (`.githooks/pre-commit`) and in CI.
- Releases (tag `v*`, GitHub Release, npm) are made only by the owner, the steps are in `docs/RELEASING.md`.

## Language and copy

- **Everything in this repository is in English:** documentation, specs, code comments, identifiers, tool descriptions and the presentation controls. Deck content follows the language of the brief.
- Other languages appear only as data: tests of Czech typesetting, the Czech eval briefs, the Czech one-letter words in the typesetting rules.
- **Never the word "AI"** in user facing copy.
- **Never an em dash**, anywhere. Use a comma, a period, a pipe or rephrase. `tests/copy-rules.test.ts` guards it.

## Taste of the decks (enforced by the domain and validation, not by the prompt)

Two typefaces, a modular scale, the accent only as a signal, a cognitive limit of about four items per slide, plenty of white space, no decoration without a function. Every principle names the layer that enforces it, see the generated `docs/principles-audit.md`. Motion leads attention (`lib/domain/principles/motion.ts`): the deck declares an intensity from `still` to `kinetic` and the measurement checks the motion matches it. One hero motion per slide, one entrance and one transition carry the deck and exceptions are rare, text moves in blocks, never letter by letter, entrances decelerate into rest, overshoot only for `kinetic`.

## Development

```bash
npm test             # vitest
npm run typecheck
npm run lint
npm run mcp          # MCP server over stdio (for claude mcp add)
npm run gen          # regenerate generated files (skill, principles audit, player and view sources)
npm run eval         # deck quality eval through `claude -p` (costs money, outside CI), see scripts/eval/run.ts
```

Connect in Claude Code (development): `claude mcp add instadeck -- npx tsx /path/to/instadeck/server/stdio.ts`. After publishing: `npx -y instadeck`.
Data: `INSTADECK_HOME` (default `~/InstaDeck`), every deck is a folder. Browser: an installed Chrome, Edge or Chromium, or `INSTADECK_CHROME`.

## Operating the hosted connector

Infrastructure, deployment and production details are not part of this repo. The owner manages them in a private repo. Contributors do not touch them and do not deploy or publish anything.

## Versions (checked 2026-10-18)

`@modelcontextprotocol/sdk` 1.32.1, `zod` 4, `vitest` 5, `typescript` 6, Node 22. Check the current version with `npm view` before adding a dependency.
