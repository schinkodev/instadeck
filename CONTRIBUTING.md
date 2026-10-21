# Contributing to InstaDeck

Thanks for helping. InstaDeck is an [MCP](https://modelcontextprotocol.io) server that lets your Claude build branded, animated pitch decks. The model decides content, structure, design and motion. The engine renders, measures, validates and exports.

## How to contribute

1. Open an issue first for anything larger than a small fix, so we agree on the direction.
2. Fork the repo and create a branch from `main`.
3. Make the change, then run:

   ```bash
   npm install
   npm run typecheck
   npm run lint
   npm test
   ```

4. Open a pull request. CI runs the same three checks and must be green. Only the maintainer pushes to `main` and publishes releases, so every change arrives as a pull request from a fork.

You need Node 22. Slide previews, PDF and PNG need Google Chrome, Microsoft Edge or Chromium (set `INSTADECK_CHROME` if it is not found).

Try your change against a real client with `claude mcp add instadeck -- npx tsx /path/to/instadeck/server/stdio.ts`.

## Project rules

- **Layers depend only downwards** (`lib/domain`, `lib/engine`, `lib/state`, `lib/tools`, `server`). ESLint enforces it.
- **`applyOps` in `lib/state` is the only way to write a deck.**
- **Domain knowledge lives in `lib/domain`.** Tool descriptions, resources and the skill are generated from it, not hard coded.
- **Tools keep the MCP shape**: ids in arguments, no process state, `structuredContent` plus a text copy, `isError` on failure. A new tool needs an entry in `server/capabilities.ts`, otherwise a test fails.
- **No fallbacks or "just in case" heuristics.** Fix the cause.
- **Taste rules are principles, not lists.** The model may do anything it can. We only guard what matters (coherence, legibility, motion that carries meaning), measurably and with a reason from perception. Please do not add blanket restrictions.
- **Golden examples** in `lib/domain/examples.json` are invented content without assets. Every example must pass `create_deck` with no errors or warnings. Add them only through `npm run example`.
- **Tests** use vitest and never call a model.
- **Copy**: identifiers, tool descriptions and presentation controls in English. Deck content follows the brief language. Never use an em dash anywhere (`tests/copy-rules.test.ts` checks it).

## What we will not merge

- Features that need a side channel only our own client can use. Everything goes through MCP tools and resources.
- Anything that claims a capability the server does not have. Unfinished work is `planned` in the capability registry.

## License

By contributing you agree that your contribution is licensed under the MIT License of this project.
