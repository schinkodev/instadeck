# V007: The viewer, exports and the way to users

> Status: current
> Type: vision
> Date: 2026-10-21
> Supersedes: nothing, extends V004 to V006

## Problem

The hosted connector runs and the decks are good, but people keep making presentations in their PowerPoint, Google Slides or an artifact. The barriers: a deck behind a link is a bare presentation without an overview or downloads, companies need PPTX and PDF, edits through the chat are imprecise, the local variant cannot do what the hosted one can, and neither the repo nor the npm package is public.

## Principle

Every improvement belongs in the core (player, `deck.json`, engine), so every path gets it at once: the `deck.html` file locally, the link `/d/<id>` and the player in the chat (MCP App). No UI of our own outside the presentation, the controls are part of the player.

## Phases

1. **Viewer v2** (player): a control bar that appears only when the mouse moves (previous, next, position, overview, notes, presenter, full screen, download). An overview as a grid of live thumbnails (G), a presenter view in a second window with notes, the next slide and a timer (P). Download: PDF by printing from the browser (vector, selectable text) and offline HTML.
2. **Exports**: PPTX and PDF without a browser on the server (see Decisions of phase 2).
3. **The same experience on both paths**: the MCP App gets the parts of the deck straight from the tool, so the deck plays in the chat locally too. Picking a slide in the chat tells the model which slide to change. Sharing a local deck by link only on an explicit go (`sharing` from planned to done).
4. **Going public** after phases 1 and 2: a public repo, `npm publish`, a GitHub Release, a README with a live example deck. Only on the owner's go, describe beforehand what will be created.
5. **Growth**: import of an old deck (PPTX, PDF), a gallery of live examples on the landing page, OG images and embeds, measured invariants for layout, later the `scene` block, MP4 locally, the player as a standalone package.

## Decisions of phase 1

- The player builds the controls itself (bar, overview, presenter window), pages only switch them on with `controls` options. In the chat there is no presenter window and no download (client sandbox), instead an Open button opens the link.
- The HTML to download is the same file the page loaded (a fetch of its own address). It is not offered from a file on disk, which already is the HTML.
- Print shows only the slides in their final state, the controls and the overview are not printed.

## Decisions of phase 2: the user's browser is the layout engine

The hosted connector is one small stateless service without a browser, and it stays that way. Only a browser lays out slides exactly (grids with `auto` rows, text wrapping), an estimate without one would be a heuristic.

- **Snapshot** (`snapshotInstaDeck` in measure.js): the browser that rendered the deck reads the position, size and style of every element from the computed styles (text with runs, areas, rules, images, the places of charts and tables). Locally Chromium, hosted the viewer's browser behind the link.
- **Composer** (`lib/engine/pptx.ts`, pptxgenjs, pure JS): builds the PPTX from the snapshot and the deck. Text is editable, what was on one line stays on one line, charts are native from the deck data, tables native, speaker notes included. No animation, fonts by reference (Google Fonts).
- **Hosted**: a stateless `POST /d/<id>/deck.pptx` with the snapshot and the revision. A snapshot of an older revision returns 409. The hosted package grew from 559 to 707 kB.
- **PDF** by printing in the browser (vector, selectable text, exact). No Chromium on the server.
- **Deferred:** if server side rendering is ever needed (OG images, a PDF file straight from the chat, MP4), it belongs in a separate function called on demand (a container with Chromium), outside the main path of the connector. A new AWS resource, only on the owner's go.

## Decisions of phase 3: the same player in the chat on both paths

- The app in the chat loads the deck with the tool `get_deck_view`, visible only to the app (MCP Apps `visibility: ["app"]`), not through an HTTP endpoint `/d/<id>/view.json` (removed). It is plain MCP without a side channel and works the same with the hosted connector (assets as URLs) and with the local server in Claude Desktop (assets as data URIs).
- Editing a slide from the chat: a button in the bar opens a short form, the text goes to the chat as a message (`ui/message`) with the deck and slide ids. The model changes the slide through `apply_ops`. Only when the host supports messages.
- Locally there is no Open button in the chat: a `file://` file cannot be opened from the chat. Sharing a local deck by link stays planned.
