# InstaDeck

Branded, animated pitch decks from your own Claude.

You describe your company and topic and add your logo. Claude writes the story, the content and the design. InstaDeck turns it into a presentation that plays with slide transitions, click by click reveals, counting numbers and growing charts, in a motion language Claude designs for your audience, and prints to PDF.

InstaDeck is an [MCP](https://modelcontextprotocol.io) server. It has no app of its own and no model of its own: the model is the Claude you already use, InstaDeck gives it the knowledge, the tools and the checks to make a deck that looks designed.

## Add it to Claude

**claude.ai and Claude Desktop** (every plan, nothing to install): Settings, Connectors, Add custom connector, paste

```
https://instadeck.app/mcp
```

The deck plays right in the chat. Every deck also gets a link to present full screen, share, or print to PDF.

**Claude Code**

```bash
claude mcp add --transport http instadeck https://instadeck.app/mcp
```

**On your computer** (decks stay in folders you own, slide previews for Claude, PDF export). Needs Node 20 or newer and Google Chrome, Microsoft Edge or Chromium.

```bash
claude mcp add instadeck -- npx -y instadeck
```

For Claude Desktop, download `instadeck.mcpb` from the [latest release](https://github.com/schinkodev/instadeck/releases/latest) and open it. Optional for Claude Code: copy [`skills/instadeck`](skills/instadeck) into `~/.claude/skills/`.

## Where your data lives

| | Hosted connector | On your computer |
|---|---|---|
| Decks and assets | Stored by InstaDeck on AWS (S3, eu-central-1) | Folders in `~/InstaDeck` |
| Access | Anyone with the deck link. No accounts, the link is an unguessable id | Only you |
| Kept for | Decks 30 days after the last change, logos and brand kits 365 days | Until you delete them |
| Checks | Text fit and motion are measured in your browser | Measured and previewed in a local Chromium |
| In the chat | The deck plays in claude.ai and Claude Desktop, pick a slide and say what to change | The same in Claude Desktop |
| Downloads | PDF, PowerPoint and HTML from the deck link | `export_deck`: PDF, PowerPoint, HTML |

Use the local server for anything confidential.

## What Claude gets

| Tool | What it does |
|---|---|
| `get_design_guide` | Layouts, blocks, the motion language, pitch beats and the design, storytelling and motion principles |
| `get_example` | Proven example decks (seed pitch, enterprise sales deck, product launch, board update, consumer launch), from still to kinetic, and why they work |
| `add_asset`, `extract_brand_colors` | Logo and brand files, colors read from the logo |
| `suggest_brand_system` | A coherent, readable palette, font pair and type scale from a primary color and a mood |
| `create_brand_kit`, `get_brand_kit` | Saves the brand and checks it for contrast and fonts |
| `create_deck`, `get_deck`, `apply_ops` | Builds and edits the deck. Every change is validated and versioned |
| `validate_deck` | Text that does not fit, low contrast, overlong text, motion that does not fit its intensity, repetitive layouts |
| `get_history`, `revert_deck`, `delete_deck` | Revisions |
| `render_preview`, `export_deck`, `list_*` | Local server only: PNG previews, PDF, PowerPoint, listings |

Claude never writes HTML. It composes slides from layouts and blocks and designs the motion as data: how much the deck moves, its own entrances and transitions as keyframes, elements that glide between slides. InstaDeck guarantees the brand and the typography and measures every motion against principles of perception. Resources under `instadeck://` carry the same knowledge for clients that read them.

## Use

Ask Claude for a deck, for example:

> Make a seed pitch deck for Northwind Grid, a startup that predicts power grid congestion. Use the logo from northwind.energy.

On your computer, decks are folders:

```
~/InstaDeck/
  northwind-seed-pitch/
    deck.html    open in a browser to present
    deck.pdf     after "export it as PDF"
    deck.json    the deck itself, with its history in .revisions/
```

Present: arrow keys, space or click to advance, G for all slides, P for the presenter view, F for fullscreen, N for speaker notes. The download menu on a shared link saves the deck as PDF, PowerPoint or HTML.

PowerPoint export keeps text editable and charts and tables native. The layout comes from the browser that rendered the deck (Chromium on your computer, or the viewer's browser on a shared link), so the server never runs a browser. Fonts are referenced by name: install the deck's Google Fonts for the exact look.

## Configure (local server)

| Variable | Default | Meaning |
|---|---|---|
| `INSTADECK_HOME` | `~/InstaDeck` | Where decks, brand kits and assets live |
| `INSTADECK_CHROME` | found automatically | Path to the browser executable |

## How it works

```
lib/domain   layouts, blocks, design tokens, brand kit, motion language, examples, design, storytelling and motion principles
lib/engine   renders the presentation, validates, suggests brand systems, measures overflow and motion, exports PDF and PNG
lib/state    decks with revisions, one write path (folder on disk or S3)
lib/tools    MCP tools
server/      MCP server: stdio (local), HTTP and MCP App (hosted connector)
```

The hosted connector is a small stateless service over object storage. There is no database and no browser on the server.

## Add an example deck

Examples live in [`lib/domain/examples.json`](lib/domain/examples.json) and every one must build without findings (a test checks it). When a deck turns out well, promote it:

```bash
npm run example -- <deck.json or https://instadeck.app/d/ID> my-example \
  --title "Series A pitch" --purpose "..." --audience "..." --why "reason one|reason two" --content-is-public
```

Examples are shown to every user, so replace real names and numbers first. Decks with logos or images are refused, examples carry no assets.

## Develop

```bash
npm install
npm test            # domain, engine, state, tools, MCP contract
npm run typecheck
npm run lint
npm run mcp         # local server from source (stdio)
npm run serve       # hosted connector locally (STATE_BACKEND=local INSTADECK_HOSTED_DIR=... INSTADECK_PUBLIC_URL=http://localhost:3535)
npm run gen         # regenerate the skill, the MCP App and browser script modules
npm run bundle      # build the Claude Desktop extension
npm run build:lambda # build the hosted connector for AWS Lambda
```

## License

MIT
