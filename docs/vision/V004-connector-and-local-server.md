# V004: The hosted connector as the default, the local server as the pro option

> Status: current
> Type: vision
> Date: 2026-10-20
> Supersedes: V003-open-source-local.md (open source, MIT, npm, extensions and the landing page still hold, the default path changes)

## Problem

V003 is local only: it does not work in claude.ai, where most connector users are, and it needs Node, Chrome and a terminal. Meanwhile claude.ai supports custom connectors on every plan (one on Free), without sign-in, and since January 2026 MCP Apps: a tool returns HTML that Claude renders right in the conversation, also full screen.

## Design

One product, one core (domain, engine, validation, tools), two ways to connect:

| | Hosted connector (default) | Local server (pro option) |
|---|---|---|
| Connect | `https://instadeck.app/mcp` in claude.ai, Claude Desktop, Claude Code (`--transport http`) | `npx -y instadeck`, the `.mcpb` extension |
| Install | none | Node, Chrome or Edge |
| Viewing | MCP App in the chat (claude.ai, Desktop), the link `instadeck.app/d/<id>` everywhere | the `deck.html` file in a folder |
| Quality checks | overflow measured in the user's browser (MCP App), static validation | static validation, measurement and PNG previews in Chromium |
| State | S3, unguessable ids, expiry after 30 days | the user's folder, permanent |
| PDF | print from `instadeck.app/d/<id>` | `export_deck` or print |
| Sharing | the link `instadeck.app/d/<id>` | later the same link (upload to the hosted part) |

### The hosted part

A stateless service over object storage. MCP runs over `WebStandardStreamableHTTPServerTransport` (Request and Response), the same handler locally and hosted.

- **No sign-in.** A deck, an asset and a brand kit have an unguessable id (a capability). The hosted server therefore has no `list_decks`, `list_assets` or `list_brand_kits`: nobody sees anyone else's data. The local server has them.
- **Revisions without a database:** a new revision is written conditionally (S3 `If-None-Match: *`, locally a `link` onto an existing file fails). A second concurrent write of the same revision ends in a conflict.
- **Protection:** request rate and input size limits, data expiry.
- **Assets in the hosted version:** `data_base64` (a small logo from claude.ai) or `url` (the server downloads an image or a font from a public address, with a size limit). Uploading larger files through a presigned URL is planned.

### MCP App

- Resource `ui://instadeck/deck.html` (MIME `text/html;profile=mcp-app`): the renderer and player from the engine in one HTML file, no CDN.
- A tool that creates or changes a deck points at the resource (`_meta.ui.resourceUri`). The result carries the deck JSON and asset URLs (`/a/<id>`), not the whole HTML (claude.ai limits a result to about 150,000 characters).
- The app renders the deck, measures overflow and sends the findings to the model (`updateModelContext`). Buttons: full screen (`requestDisplayMode`), open the link.
- CSP: `resourceDomains` for `instadeck.app` (assets) and Google Fonts.
- Claude Code does not render MCP Apps: it gets text with a link. For full quality in Claude Code there is the local server.

## Implementation

1. An engine portable beyond Node: the player as a generated module, the renderer returns parts (CSS, slides, configuration), the player can be mounted and unmounted.
2. Storage behind a `Files` interface (disk, S3), conditional revision writes, `local` and `hosted` modes (ids, listing, outputs).
3. HTTP server: `/mcp`, `/d/<id>`, `/a/<id>`, `/health`, locally `npm run serve`.
4. MCP App: the resource, links from tools, measurement in the browser, full screen.
5. Build of the hosted package and a landing page with the connector as the main button.

## Acceptance Criteria

- [x] The same tool tests run against the local and the hosted mode (storage on disk, the S3 interface through a contract test)
- [x] Concurrent writes of the same revision: exactly one succeeds
- [x] The hosted server lists nobody else's data, ids are unguessable
- [x] `/d/<id>` returns the presentation, `/a/<id>` an asset with the right type
- [x] The MCP App renders a deck from a tool result and sends measurement findings (test in a headless browser with a mock host)
- [x] The hosted package runs (scripts/smoke-lambda.mjs calls the built package)
- [x] The local server still passes `scripts/smoke-pack.mjs`

## Status 2026-10-20

Done and tested locally and in CI: storage over disk and S3 (S3Mock in CI), the hosted mode of the tools, the HTTP handler, the Lambda adapter and package (536 kB zip), the MCP App (end to end with the AppBridge test host in Chromium), the landing page with the connector as the main path.

The MCP App is 578 kB (mostly `ext-apps` and its dependencies), to be reduced later.
