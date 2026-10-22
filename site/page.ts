/**
 * Landing page of instadeck.app. Static, no framework. What InstaDeck can do comes from the capability
 * registry (server/capabilities.ts) and the domain, so the page promises nothing the server does not have.
 * The decks on the page are the golden examples, rendered by scripts/site.ts (site/showcase.ts).
 * Visual: printed cards on warm paper. Bricolage Grotesque for display, Figtree for text, JetBrains Mono for labels and code,
 * the InstaDeck rose for actions and the accents of the example decks for everything that marks a deck or a step.
 *
 * Design system of the page: spacing only from an 8 px scale, one control height, one outline width, one card with a
 * hard offset shadow, two content widths (--narrow for the hero and text, --max for decks and grids). Things that sit side by side share rows
 * through subgrid, so headings, text and code blocks in neighbouring cards start on the same line. Every deck image
 * is 16:9 with its width and height set, so nothing shifts while it loads.
 */
import { LAYOUTS, BLOCK_TYPES, GOOGLE_FONTS, SLIDE } from "@/lib/domain";
import { NARRATIVE_FRAMES } from "@/lib/domain/narrative";
import { DESIGN_SCHOOLS } from "@/lib/domain/schools";
import { capabilitiesFor } from "@/server/capabilities";
import { SHOWCASE, WALL, deckName, slideLayout, type ShowcaseDeck } from "@/site/showcase";

const REPO = "https://github.com/schinkodev/instadeck";
const AUTHOR = { name: "Jakub Schinko", url: "https://schinko.dev" };
const CONNECTOR_URL = "https://instadeck.app/mcp";
const CODE_REMOTE = `claude mcp add --transport http instadeck ${CONNECTOR_URL}`;
const CODE_LOCAL = "claude mcp add instadeck -- npx -y instadeck";
const DESKTOP_DOWNLOAD = `${REPO}/releases/latest/download/instadeck.mcpb`;
/** One step of a deck every 3.6 s: long enough to read a headline, short enough to see the motion language. */
const AUTOPLAY_MS = 3600;

/** Paths of the files scripts/site.ts writes for every deck. */
export const deckFiles = (id: string) => ({ html: `demo/${id}.html`, cover: `demo/${id}/cover.png`, slide: (i: number) => `demo/${id}/${String(i + 1).padStart(2, "0")}.png` });
/** Scale of the images against the 1920 x 1080 slide: a cover fills the player on a 2x screen, a wall slide a quarter of it. */
export const IMAGE_SCALE = { cover: 0.6, slide: 0.3 } as const;
const px = (scale: number) => ({ w: Math.round(SLIDE.width * scale), h: Math.round(SLIDE.height * scale) });

/** How to add the hosted connector in common MCP clients. Every client has its own step and its own text to copy. */
const CLIENTS = [
  { id: "claude", name: "Claude", steps: "Settings, Connectors, Add custom connector, paste the link. Works in claude.ai and Claude Desktop on every plan, and the deck plays right in the chat.", label: "Connector link", code: CONNECTOR_URL },
  { id: "claude-code", name: "Claude Code", steps: "Run this once, then ask for a deck in any project.", label: "Terminal", code: CODE_REMOTE },
  { id: "cursor", name: "Cursor", steps: "Add it to ~/.cursor/mcp.json, or to .cursor/mcp.json in a project.", label: "mcp.json", code: `{ "mcpServers": { "instadeck": { "url": "${CONNECTOR_URL}" } } }` },
  { id: "vscode", name: "VS Code", steps: "Run this once, then use it in Copilot agent mode.", label: "Terminal", code: `code --add-mcp '{"name":"instadeck","type":"http","url":"${CONNECTOR_URL}"}'` },
  { id: "codex", name: "Codex", steps: "Add it to ~/.codex/config.toml.", label: "config.toml", code: `[mcp_servers.instadeck]\nurl = "${CONNECTOR_URL}"` },
  { id: "gemini", name: "Gemini CLI", steps: "Run this once, then ask for a deck.", label: "Terminal", code: `gemini mcp add --transport http instadeck ${CONNECTOR_URL}` },
  { id: "windsurf", name: "Windsurf", steps: "Add it to ~/.codeium/windsurf/mcp_config.json.", label: "mcp_config.json", code: `{ "mcpServers": { "instadeck": { "serverUrl": "${CONNECTOR_URL}" } } }` },
  { id: "other", name: "Other", steps: "A standard MCP server over streamable HTTP, with no sign in. Point any client that supports remote servers at this address.", label: "Server URL", code: CONNECTOR_URL },
] as const;

const STEPS = [
  {
    title: "You describe it",
    text: "The company, the audience and the ask, in a sentence or a page. Add your logo, brand fonts, photos or screenshots.",
  },
  {
    title: "Claude shapes the story",
    text: `It picks one of ${NARRATIVE_FRAMES.length} narrative frames for the audience, orders the beats, and asks you for the numbers and proof it does not have instead of making them up.`,
  },
  {
    title: "Claude designs it",
    text: `It sets a visual concept, draws on ${DESIGN_SCHOOLS.length} design schools and composes every slide from ${LAYOUTS.length} layouts and ${BLOCK_TYPES.length} building blocks, in your colors and type.`,
  },
  {
    title: "InstaDeck makes it right",
    text: "Every change is rendered, measured and checked. Claude sees what does not fit, what reads weakly and what moves too much, and fixes it.",
  },
];

const FEATURES = [
  { label: "Story", title: "A story with a spine", text: "Every deck follows a declared frame, from Minto's pyramid to Duarte's what is and what could be. InstaDeck checks that it opens with a hook, closes with the ask, and that every claim that needs proof carries it. Speaker notes go to the presenter view and to PowerPoint." },
  { label: "Brand", title: "Your brand, enforced", text: `Colors read from your logo become a full design system with a modular type scale and checked contrast. ${GOOGLE_FONTS.length} curated typefaces, or your own font files.` },
  { label: "Assets", title: "Your assets, placed with intent", text: "Logos sit where a title or a close needs them, screenshots and photos go into layouts built to carry them, and an image that continues to the next slide glides there instead of appearing twice." },
  { label: "Motion", title: "Motion with intent", text: "Claude designs a motion language for each deck, from perfectly still to kinetic: its own entrances and transitions, headlines that glide from slide to slide, numbers that count up. Every move is measured against how people perceive it." },
  { label: "Output", title: "Present, share, download", text: "Every deck presents full screen with an overview and a presenter view. Download it as PDF, as PowerPoint with editable text and native charts, or as one HTML file that works offline." },
  { label: "Clients", title: "Works where you are", text: "Plays in the chat in claude.ai and Claude Desktop, opens from a link anywhere, or runs entirely on your computer. Any MCP client can use it." },
];

const GITHUB_ICON = `<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8a8 8 0 0 0 5.47 7.59c.4.07.55-.17.55-.38v-1.33c-2.23.48-2.7-1.07-2.7-1.07-.36-.93-.89-1.17-.89-1.17-.73-.5.05-.49.05-.49.81.06 1.23.83 1.23.83.72 1.23 1.88.88 2.34.67.07-.52.28-.88.51-1.08-1.78-.2-3.65-.89-3.65-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.28.82 2.15 0 3.07-1.87 3.75-3.66 3.95.29.25.54.73.54 1.48v2.2c0 .21.15.46.55.38A8 8 0 0 0 16 8c0-4.42-3.58-8-8-8Z"/></svg>`;
const STAR_ICON = `<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="currentColor"><path d="M8 .6l2.2 4.7 5.1.7-3.7 3.6.9 5.1L8 12.2l-4.5 2.5.9-5.1L.7 6l5.1-.7L8 .6Z"/></svg>`;

/** The InstaDeck mark (brand/mark.svg) inline, so the logo needs no request. */
const MARK = `<svg viewBox="0 0 512 512" aria-hidden="true"><rect width="512" height="512" rx="112" fill="#1C1A17"/><path d="M256 104a152 152 0 0 1 0 304Z" fill="#B86B6B"/><path d="M256 104a152 152 0 0 0 0 304Z" fill="#FFF" fill-opacity=".12"/></svg>`;
/** The wave under "move" in the hero. pathLength 1 lets the stroke draw in with a dash offset from 1 to 0. */
const WAVE = `<svg viewBox="0 0 200 20" preserveAspectRatio="none" aria-hidden="true"><path pathLength="1" d="M3 12 C 28 2, 48 2, 70 11 S 112 20, 134 10 S 176 2, 197 9"/></svg>`;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Tabs above panels. The client picker and the deck gallery share them, one script handles both. */
function tablist(group: string, label: string, items: readonly { id: string }[], button: (item: never) => string, attrs: (item: never) => string = () => ""): string {
  return `<div class="tablist-${group}" role="tablist" aria-label="${esc(label)}">${items
    .map((t, i) => `<button type="button" role="tab" id="${group}-tab-${t.id}" aria-controls="${group}-${t.id}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}"${attrs(t as never)}>${button(t as never)}</button>`)
    .join("")}</div>`;
}
const panels = (group: string, items: readonly { id: string }[], panel: (item: never) => string) =>
  items.map((t, i) => `<div role="tabpanel" id="${group}-${t.id}" aria-labelledby="${group}-tab-${t.id}"${i === 0 ? "" : " hidden"}>${panel(t as never)}</div>`).join("");

const code = (id: string, label: string, text: string) =>
  `<div class="code"><div class="code-bar"><span>${esc(label)}</span><button type="button" data-copy="${id}">Copy</button></div><pre id="${id}">${esc(text)}</pre></div>`;

function clientPicker(): string {
  return `<div class="picker card">${tablist("client", "Choose your MCP client", CLIENTS, (c: (typeof CLIENTS)[number]) => esc(c.name))}<div class="panels">${panels("client", CLIENTS, (c: (typeof CLIENTS)[number]) => `<p class="picker-steps">${esc(c.steps)}</p>${code(`code-${c.id}`, c.label, c.code)}`)}</div></div>`;
}

/** The gallery: one live player, the decks as tabs under it, and for the chosen deck the brief and what Claude chose. */
function gallery(): string {
  const cover = px(IMAGE_SCALE.cover);
  const first = SHOWCASE[0]!;
  const thumb = (d: ShowcaseDeck) =>
    `<img src="/${deckFiles(d.id).cover}" width="${cover.w}" height="${cover.h}" alt="" loading="lazy" decoding="async"><span class="deck-name">${esc(d.name)}</span><span class="deck-meta">${cap(d.intensity)}, ${d.slides} slides</span>`;
  const info = (d: ShowcaseDeck) => `<div class="deck-info">
      <figure class="brief"><figcaption>You, in Claude</figcaption><blockquote>${esc(d.brief)}</blockquote></figure>
      <dl class="chose">
        <div><dt>Idea</dt><dd>${esc(d.idea)}</dd></div>
        <div><dt>Story</dt><dd>${esc(d.frame)}</dd></div>
        ${d.school ? `<div><dt>School</dt><dd>${esc(d.school)}</dd></div>` : ""}
        <div><dt>Type</dt><dd>${esc(d.type)}</dd></div>
        <div><dt>Motion</dt><dd><strong>${cap(d.intensity)}.</strong> ${esc(d.motion)}</dd></div>
      </dl>
    </div>`;
  return `<section class="gallery" id="decks" aria-label="Example decks">
  <div class="frame" id="frame" style="background-image:url(/${deckFiles(first.id).cover})"><iframe id="player" src="/${deckFiles(first.id).html}?autoplay=${AUTOPLAY_MS}" title="${esc(first.name)}, a deck made with InstaDeck, playing live" loading="lazy"></iframe></div>
  <div class="frame-caption"><span>Playing live. Click to take over, use the arrow keys, press F for fullscreen.</span><a id="open-deck" href="/${deckFiles(first.id).html}" target="_blank" rel="noopener">Open full screen</a></div>
  ${tablist("deck", "Example decks", SHOWCASE, thumb, (d: ShowcaseDeck) => ` style="--deck:${d.color}" data-deck="/${deckFiles(d.id).html}" data-cover="/${deckFiles(d.id).cover}" data-name="${esc(d.name)}"`)}
  <div class="panels">${panels("deck", SHOWCASE, info)}</div>
  <p class="gallery-note">These are the golden examples that ship with InstaDeck, which Claude reads before it builds yours. Companies and numbers are made up.</p>
</section>`;
}

function wall(): string {
  const s = px(IMAGE_SCALE.slide);
  return `<div class="wall content">${WALL.map(
    (w) => `<figure><img src="/${deckFiles(w.deck).slide(w.slide)}" width="${s.w}" height="${s.h}" alt="${esc(`A ${slideLayout(w.deck, w.slide)} slide from the ${deckName(w.deck).toLowerCase()} example`)}" loading="lazy" decoding="async"><figcaption><span>${esc(slideLayout(w.deck, w.slide))}</span><span>${esc(deckName(w.deck))}</span></figcaption></figure>`,
  ).join("")}</div>`;
}

function capabilityList(): string {
  return capabilitiesFor("hosted").map(
    (c) => `<li class="${c.status === "planned" ? "is-planned" : ""}"><span>${esc(c.claim)}</span>${c.status === "planned" ? "<em>Planned</em>" : ""}</li>`,
  ).join("");
}

export function landingHtml(version: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>InstaDeck | Branded pitch decks that move, built by your Claude</title>
<meta name="description" content="Describe your company, add your logo, and Claude builds a branded pitch deck with a real story and motion that plays right in the chat. Free and open source.">
<meta property="og:title" content="InstaDeck | Pitch decks that move">
<meta property="og:description" content="Describe your company, add your logo, and Claude builds a branded pitch deck with a real story and motion that plays right in the chat. Free and open source.">
<meta property="og:image" content="https://instadeck.app/og.png">
<meta property="og:url" content="https://instadeck.app">
<meta name="twitter:card" content="summary_large_image">
<link rel="canonical" href="https://instadeck.app/">
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=Figtree:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap">
<style>
/* Design system of the page. A warm paper surface, ink outlines of 2 px and hard offset shadows: the page reads like a
   set of printed cards on a desk, the decks are the only full color on it. Palette: ink, paper, the InstaDeck rose
   for actions, and the accents of the five example decks (--deck-1 to --deck-5) to mark steps and decks.
   Spacing only from an 8 px scale: --s1 8, --s2 16, --s3 24, --s4 32, --s5 48, --s6 64, --s7 96, --s8 128. */
:root{--paper:#F7F2E8;--band:#EFE7D8;--card:#FFFCF6;--ink:#1C1A17;--muted:#4F4A43;--dim:#7A7268;--dot:rgba(28,26,23,.13);
--accent:#B44A45;--accent-hover:#9E3F3B;--accent-soft:#F4DCD6;${SHOWCASE.map((d, i) => `--deck-${i + 1}:${d.color};`).join("")}
--s1:8px;--s2:16px;--s3:24px;--s4:32px;--s5:48px;--s6:64px;--s7:96px;--s8:128px;
--gutter:24px;--max:1120px;--narrow:720px;--control:44px;--line:2px;--radius:16px;--radius-sm:10px;--section:var(--s8);
--lift:4px 4px 0 var(--ink);--lift-lg:8px 8px 0 var(--ink);--lift-sm:2px 2px 0 var(--ink);
--display:"Bricolage Grotesque",Figtree,sans-serif;--mono:"JetBrains Mono",ui-monospace,monospace;--ease:cubic-bezier(.2,.7,.2,1)}
*{box-sizing:border-box}
html{scroll-behavior:smooth;scroll-padding-top:var(--s7)}
body{margin:0;overflow-x:clip;background:var(--paper);color:var(--ink);font-family:Figtree,-apple-system,BlinkMacSystemFont,sans-serif;font-size:16px;line-height:1.6;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
a{color:inherit;text-underline-offset:3px;text-decoration-thickness:1.5px}
p,figure,blockquote,dl,dd{margin:0}
img{display:block;max-width:100%;height:auto}
h1,h2,h3{margin:0;font-family:var(--display);font-weight:800;text-wrap:balance}
.wrap{max-width:calc(var(--max) + 2 * var(--gutter));margin:0 auto;padding:0 var(--gutter)}
.mono{font-family:var(--mono)}
.eyebrow{font-family:var(--mono);font-size:12px;line-height:16px;font-weight:500;letter-spacing:.08em;text-transform:uppercase;color:var(--accent)}
:focus-visible{outline:2px solid var(--accent);outline-offset:3px}
/* A card: the one surface of the page. Everything that holds content is a card or sits directly on the paper. */
.card{background:var(--card);border:var(--line) solid var(--ink);border-radius:var(--radius);box-shadow:var(--lift)}

/* Controls: one height, one outline, one shadow that presses in on click */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:var(--s1);height:var(--control);padding:0 var(--s3);background:var(--accent);color:#FFF;border:var(--line) solid var(--ink);border-radius:var(--radius-sm);box-shadow:var(--lift-sm);font:inherit;font-size:15px;font-weight:600;line-height:1;text-decoration:none;white-space:nowrap;cursor:pointer;transition:transform .12s var(--ease),box-shadow .12s var(--ease),background .15s}
.btn:hover{background:var(--accent-hover);transform:translate(-1px,-1px);box-shadow:3px 3px 0 var(--ink)}
.btn:active{transform:translate(2px,2px);box-shadow:0 0 0 var(--ink)}
.btn-outline{background:var(--card);color:var(--ink)}
.btn-outline:hover{background:var(--card)}
.btn-ghost{background:transparent;color:var(--ink);border-color:transparent;box-shadow:none;padding:0 var(--s2)}
.btn-ghost:hover{background:var(--band);transform:none;box-shadow:none}
.btn .count{padding-left:var(--s1);border-left:1.5px solid currentColor;font-variant-numeric:tabular-nums}

/* Navigation: a card that floats over the paper, 64 px tall with its outline */
nav{position:sticky;top:var(--s2);z-index:10;margin-top:var(--s2)}
nav .bar{display:flex;justify-content:space-between;align-items:center;height:var(--s6);padding:0 var(--s1) 0 var(--s2);background:var(--card);border:var(--line) solid var(--ink);border-radius:var(--radius);box-shadow:var(--lift-sm);transition:box-shadow .2s var(--ease)}
nav.is-stuck .bar{box-shadow:var(--lift)}
.logo{display:inline-flex;align-items:center;gap:10px;font-family:var(--display);font-size:19px;font-weight:800;letter-spacing:-0.02em;text-decoration:none}
.logo svg{width:28px;height:28px}
.nav-links{display:flex;gap:var(--s1);align-items:center}
.nav-links .btn{height:40px;padding:0 var(--s2);font-size:14px}

/* Hero: one axis on a dotted grid that fades out toward the decks */
.hero{position:relative;padding:var(--s7) 0 var(--s6);text-align:center}
.hero::before{content:"";position:absolute;inset:calc(-1 * var(--s6) - var(--s2)) calc(50% - 50vw) 0;z-index:-1;background:radial-gradient(var(--dot) 1.2px,transparent 1.6px) 0 0/var(--s3) var(--s3);-webkit-mask-image:linear-gradient(#000 40%,transparent);mask-image:linear-gradient(#000 40%,transparent)}
.badge{display:inline-flex;align-items:center;gap:var(--s1);height:32px;padding:0 14px;margin-bottom:var(--s4);background:var(--card);border:var(--line) solid var(--ink);border-radius:999px;font-size:13px;font-weight:600}
.badge::before{content:"";width:8px;height:8px;border-radius:50%;background:var(--deck-1)}
.hero h1{margin:0 auto;max-width:900px;font-size:clamp(44px,7.4vw,84px);line-height:1.02;letter-spacing:-0.02em}
.hero h1 .punct{margin-left:-0.04em}
.nowrap{white-space:nowrap}
/* The word that moves: a wave under it draws in once on load, the same way a deck's accent leads the eye */
.move{position:relative;display:inline-block;font-style:normal;color:var(--accent)}
.move svg{position:absolute;left:-2%;bottom:-0.2em;width:104%;height:.32em;overflow:visible}
.move path{fill:none;stroke:var(--accent);stroke-width:7;stroke-linecap:round;stroke-dasharray:1;stroke-dashoffset:1;animation:draw .9s .35s var(--ease) forwards}
@keyframes draw{to{stroke-dashoffset:0}}
.hero .sub{margin:var(--s4) auto 0;max-width:620px;font-size:clamp(17px,2vw,20px);line-height:1.55;color:var(--muted);text-wrap:pretty}
.picker{max-width:800px;margin:var(--s5) auto 0;padding:var(--s2);text-align:left}
.picker-steps{display:flex;align-items:center;min-height:calc(var(--s2) * 2 + 1.6em * 2);padding:var(--s2) var(--s1);font-size:14px;color:var(--muted);text-wrap:pretty}
.picker-foot{margin-top:var(--s3);font-size:14px;color:var(--dim)}
.picker-foot a{color:var(--ink);font-weight:500}
.picker-foot span + span::before{content:"\\00B7";margin:0 var(--s1)}

/* Client chips: pills that fill with ink when chosen */
.tablist-client{display:flex;flex-wrap:wrap;gap:4px}
.tablist-client button{height:36px;padding:0 12px;background:transparent;border:var(--line) solid transparent;border-radius:999px;color:var(--muted);font:inherit;font-size:14px;font-weight:600;white-space:nowrap;cursor:pointer;transition:background .15s,color .15s,border-color .15s}
.tablist-client button:hover{color:var(--ink);border-color:var(--ink)}
.tablist-client button[aria-selected="true"]{background:var(--ink);border-color:var(--ink);color:var(--card)}

.code{border:var(--line) solid var(--ink);border-radius:var(--radius-sm);background:var(--paper);overflow:hidden;min-width:0}
.code-bar{display:flex;justify-content:space-between;align-items:center;height:40px;padding-left:var(--s2);border-bottom:var(--line) solid var(--ink);background:var(--band);font-family:var(--mono);font-size:12px;color:var(--muted)}
.code-bar button{height:100%;min-width:80px;padding:0 var(--s2);border:0;border-left:var(--line) solid var(--ink);background:var(--card);font:inherit;font-size:12px;font-weight:500;color:var(--ink);cursor:pointer;transition:background .15s,color .15s}
.code-bar button:hover{background:var(--ink);color:var(--card)}
.code pre{margin:0;padding:var(--s2);overflow-x:auto;font-family:var(--mono);font-size:13px;line-height:24px;min-height:calc(var(--s2) * 2 + 48px);white-space:pre-wrap;word-break:break-word}

/* Gallery: the player spans --max at exactly 16:9 inside a 2 px outline, the cover of the deck sits under it until the deck has loaded */
.gallery{padding:var(--s4) 0 var(--section)}
.frame{position:relative;width:100%;aspect-ratio:16/9;overflow:hidden;background:var(--card) center/cover no-repeat;border:var(--line) solid var(--ink);border-radius:var(--radius);box-shadow:var(--lift-lg)}
.frame iframe{position:absolute;inset:0;width:100%;height:100%;border:0;opacity:0;transition:opacity .3s var(--ease)}
.frame iframe.is-ready{opacity:1}
.frame-caption{display:flex;justify-content:space-between;align-items:baseline;gap:var(--s2);flex-wrap:wrap;margin-top:var(--s3);font-size:14px;line-height:20px;color:var(--dim)}
.frame-caption a{color:var(--ink);font-weight:600}
/* Deck tabs: five equal cards. The chosen one lifts and takes the accent of its own brand as its shadow. */
.tablist-deck{display:grid;grid-template-columns:repeat(${SHOWCASE.length},minmax(0,1fr));gap:var(--s3);margin-top:var(--s5)}
.tablist-deck button{display:grid;align-content:start;justify-items:start;padding:var(--s1) var(--s1) 12px;background:var(--card);border:var(--line) solid var(--ink);border-radius:var(--radius);box-shadow:var(--lift-sm);color:var(--ink);font:inherit;text-align:left;cursor:pointer;transition:transform .15s var(--ease),box-shadow .15s var(--ease)}
.tablist-deck button:hover{transform:translate(-1px,-1px);box-shadow:3px 3px 0 var(--ink)}
.tablist-deck button[aria-selected="true"]{transform:translate(-2px,-2px);box-shadow:6px 6px 0 var(--deck)}
.tablist-deck img{width:100%;aspect-ratio:16/9;object-fit:cover;border:1.5px solid rgba(28,26,23,.16);border-radius:8px}
.deck-name{display:flex;align-items:center;gap:var(--s1);margin-top:12px;padding:0 var(--s1);font-size:15px;line-height:20px;font-weight:700}
.deck-name::before{content:"";width:10px;height:10px;border-radius:50%;background:var(--deck)}
.deck-meta{padding:0 var(--s1) 0 26px;font-size:13px;line-height:20px;color:var(--dim)}
/* Under the tabs: the brief as a chat message on the left (7 of 12 columns), what Claude chose on the right */
.deck-info{display:grid;grid-template-columns:minmax(0,7fr) minmax(0,5fr);column-gap:var(--s6);margin-top:var(--s5)}
.brief figcaption,.chose dt{font-family:var(--mono);font-size:12px;line-height:16px;font-weight:500;letter-spacing:.04em;text-transform:uppercase;color:var(--dim)}
.brief blockquote{margin-top:12px;padding:var(--s3);background:var(--card);border:var(--line) solid var(--ink);border-radius:var(--radius) var(--radius) var(--radius) 4px;box-shadow:var(--lift);font-size:19px;line-height:30px;text-wrap:pretty}
.chose{display:grid;align-content:start;row-gap:var(--s2);padding-top:28px}
.chose div{display:grid;grid-template-columns:var(--s7) minmax(0,1fr);column-gap:var(--s2);padding-bottom:var(--s2);border-bottom:1.5px dashed rgba(28,26,23,.2)}
.chose div:last-child{border-bottom:0;padding-bottom:0}
.chose dt{padding-top:2px}
.chose dd{font-size:15px;line-height:22px;color:var(--muted);text-wrap:pretty}
.chose strong{font-weight:700;color:var(--ink)}
.gallery-note{margin-top:var(--s5);font-size:14px;line-height:20px;color:var(--dim)}

/* Sections sit on the paper or on a darker band, the band alternates so each section reads as its own sheet */
section.block{padding:var(--section) 0}
section.band{background:var(--band);border-top:var(--line) solid var(--ink);border-bottom:var(--line) solid var(--ink)}
.head{max-width:var(--narrow)}
.head .eyebrow{margin-bottom:var(--s2)}
.head h2{font-size:clamp(32px,4.6vw,52px);line-height:1.06;letter-spacing:-0.015em}
.head .lead{margin-top:var(--s3);color:var(--muted);font-size:19px;line-height:1.55;text-wrap:pretty}
.content{margin-top:var(--s6)}
h3{font-size:20px;line-height:26px;letter-spacing:-0.015em;font-weight:700}
.body{margin-top:var(--s1);color:var(--muted);font-size:15px;line-height:24px;text-wrap:pretty}

/* How it works: four cards on one row, each with a round number in the accent of one example deck */
.steps{margin-bottom:0;padding:0;list-style:none;counter-reset:step;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:var(--s3)}
.steps li{counter-increment:step;padding:var(--s3)}
.steps li::before{content:counter(step);display:grid;place-items:center;width:40px;height:40px;margin-bottom:var(--s3);border:var(--line) solid var(--ink);border-radius:50%;box-shadow:var(--lift-sm);background:var(--step);color:#FFF;font-family:var(--display);font-size:18px;font-weight:800}
${[1, 2, 3, 4].map((i) => `.steps li:nth-child(${i}){--step:var(--deck-${i === 1 ? 1 : i + 1})}`).join("")}

/* Slide wall: four columns of 16:9 slides from the example decks, each labelled with its layout and deck */
.wall{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:var(--s4) var(--s3)}
.wall img{width:100%;aspect-ratio:16/9;border:var(--line) solid var(--ink);border-radius:var(--radius-sm);box-shadow:var(--lift-sm)}
.wall figcaption{display:flex;justify-content:space-between;gap:var(--s1);margin-top:12px;font-size:13px;line-height:20px;color:var(--dim)}
.wall figcaption span:first-child{font-family:var(--mono);font-size:12px;color:var(--ink);font-weight:500}

/* Features: six cards, every cell with the same inner rows */
.features{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--s3)}
.features > div{padding:var(--s4);display:grid;grid-template-rows:subgrid;grid-row:span 3;row-gap:0}
.features .eyebrow{justify-self:start;margin-bottom:var(--s3);padding:4px 10px;background:var(--accent-soft);border-radius:999px;color:var(--accent-hover)}
.caps{margin-top:var(--s5);padding:0 var(--s4)}
.caps summary{display:flex;justify-content:space-between;align-items:center;gap:var(--s2);min-height:var(--s7);cursor:pointer;list-style:none;font-weight:700;font-size:17px}
.caps summary::-webkit-details-marker{display:none}
.caps summary .eyebrow{color:var(--ink)}
.caps summary .eyebrow::after{content:"+";display:inline-block;width:1ch;margin-left:var(--s1);text-align:center}
.caps[open] summary .eyebrow::after{content:"\\2212"}
.caps summary p{font-weight:400;font-size:15px;color:var(--muted);margin-top:2px}
.caps ul{margin:0 0 var(--s3);padding:0;list-style:none;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:var(--s6)}
.caps li{display:flex;justify-content:space-between;align-items:flex-start;gap:var(--s3);padding:var(--s2) 0;border-top:1.5px dashed rgba(28,26,23,.2);font-size:14px;line-height:22px;color:var(--muted)}
.caps em{font-style:normal;font-size:12px;font-family:var(--mono);color:var(--dim);white-space:nowrap}
.caps .is-planned span{color:var(--dim)}

/* Install: two cards on a subgrid, so heading, text, code and action sit on the same rows in both */
.cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));grid-template-rows:repeat(5,auto);column-gap:var(--s4)}
.cards > div{display:grid;grid-template-rows:subgrid;grid-row:span 5;row-gap:0;padding:var(--s4);min-width:0}
.cards .eyebrow{margin-bottom:var(--s2)}
.cards .body{margin-bottom:var(--s3)}
.cards .actions{display:flex;align-items:center;gap:var(--s2);margin-top:var(--s3)}
.models{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);column-gap:var(--s4);margin-top:var(--s5)}
.models p{font-size:15px;line-height:24px;color:var(--muted)}
.models strong{color:var(--ink);font-weight:700}

/* Closing call: one centered card, the only place besides the hero with two actions side by side */
.cta{padding:var(--s7) var(--s4);text-align:center}
.cta h2{font-size:clamp(32px,4.6vw,52px);line-height:1.06;letter-spacing:-0.015em}
.cta .eyebrow{margin-bottom:var(--s2)}
.cta p:not(.eyebrow){max-width:560px;margin:var(--s3) auto 0;color:var(--muted);font-size:19px;line-height:1.55}
.cta .actions{display:flex;justify-content:center;gap:var(--s2);flex-wrap:wrap;margin-top:var(--s5)}
footer{display:flex;justify-content:space-between;align-items:center;gap:var(--s2);flex-wrap:wrap;min-height:var(--s7);border-top:var(--line) solid var(--ink);font-size:14px;color:var(--dim)}
footer a{color:var(--muted)}
footer a:hover{color:var(--ink)}
footer .sep::before{content:"\\00B7";margin:0 var(--s1)}

@media (max-width:960px){
  .deck-info{grid-template-columns:1fr;row-gap:var(--s4)}
  .chose{padding-top:0}
  .steps{grid-template-columns:repeat(2,minmax(0,1fr))}
  .wall{grid-template-columns:repeat(2,minmax(0,1fr))}
  .features{grid-template-columns:repeat(2,minmax(0,1fr))}
  .nav-links .btn-ghost{display:none}
}
@media (max-width:720px){
  :root{--section:var(--s7);--gutter:16px;--lift-lg:5px 5px 0 var(--ink)}
  .hero{padding:var(--s6) 0 var(--s5)}
  .nav-links .btn-outline span:not(.count){display:none}
  .content{margin-top:var(--s5)}
  .picker{padding:12px}
  /* Deck tabs scroll sideways inside the gutter instead of shrinking the covers below legibility */
  .tablist-deck{grid-template-columns:none;grid-auto-flow:column;grid-auto-columns:46%;gap:var(--s2);overflow-x:auto;scroll-snap-type:x mandatory;margin:var(--s4) calc(-1 * var(--gutter)) 0;padding:0 var(--gutter) var(--s2);scroll-padding:0 var(--gutter)}
  .tablist-deck button{scroll-snap-align:start}
  .deck-info{margin-top:var(--s4)}
  .brief blockquote{padding:var(--s2);font-size:17px;line-height:28px}
  .chose div{grid-template-columns:var(--s6) minmax(0,1fr)}
  .steps,.features,.caps ul,.models{grid-template-columns:1fr}
  .wall{gap:var(--s3) var(--s2)}
  .wall figcaption span:last-child{display:none}
  .features > div{grid-row:auto;grid-template-rows:auto;padding:var(--s3)}
  .caps{padding:0 var(--s3)}
  .cards{grid-template-columns:1fr;grid-template-rows:none;row-gap:var(--s3)}
  .cards > div{grid-row:auto;grid-template-rows:auto;padding:var(--s3)}
  .models p + p{margin-top:var(--s2)}
  .cta{padding:var(--s6) var(--s3)}
  footer{padding:var(--s3) 0;flex-direction:column;align-items:flex-start;gap:var(--s1)}
}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}*{transition:none!important}.move path{animation:none;stroke-dashoffset:0}}
</style>
</head>
<body>
<nav id="nav"><div class="wrap"><div class="bar">
  <a class="logo" href="/">${MARK}InstaDeck</a>
  <div class="nav-links">
    <a class="btn btn-ghost" href="#decks">Examples</a>
    <a class="btn btn-ghost" href="#how">How it works</a>
    <a class="btn btn-outline" href="${REPO}" target="_blank" rel="noopener" aria-label="Star InstaDeck on GitHub">${GITHUB_ICON}<span>Star</span><span class="count" id="stars" hidden></span></a>
    <a class="btn" href="#install">Install</a>
  </div>
</div></div></nav>

<main>
<div class="wrap">
<header class="hero" id="top">
  <p class="badge">Open source MCP server</p>
  <h1>Pitch decks that <span class="nowrap"><em class="move">move${WAVE}</em><span class="punct">,</span></span> built by your Claude<span class="punct">.</span></h1>
  <p class="sub">Describe your company and add your logo. Claude shapes the story and the design, InstaDeck turns it into a branded presentation with motion, checks every slide and hands you the deck.</p>
  ${clientPicker()}
  <p class="picker-foot"><span>Free, no account</span><span><a href="#install">Run it on your computer instead</a></span></p>
</header>

${gallery()}
</div>

<section class="block band" id="how"><div class="wrap">
  <div class="head">
    <p class="eyebrow">How it works</p>
    <h2>You bring the company. Claude and InstaDeck bring the craft.</h2>
    <p class="lead">Claude decides what to say and how it should look. InstaDeck renders, measures and exports, so the result holds up on a big screen.</p>
  </div>
  <ol class="steps content">${STEPS.map((s) => `<li class="card"><h3>${esc(s.title)}</h3><p class="body">${esc(s.text)}</p></li>`).join("")}</ol>
</div></section>

<section class="block"><div class="wrap">
  <div class="head">
    <p class="eyebrow">What you get</p>
    <h2>Built like a design team would build it.</h2>
    <p class="lead">Every slide below comes from the decks above. Each one is composed from a layout, set in the brand's type and checked for fit, contrast and balance before anyone sees it.</p>
  </div>
  ${wall()}
  <div class="features content">${FEATURES.map((f) => `<div class="card"><p class="eyebrow">${esc(f.label)}</p><h3>${esc(f.title)}</h3><p class="body">${esc(f.text)}</p></div>`).join("")}</div>
  <details class="caps card">
    <summary><div>The full list Claude reads from the server<p>Planned items are marked. Nothing here is promised that is not there.</p></div><span class="eyebrow">Show</span></summary>
    <ul>${capabilityList()}</ul>
  </details>
</div></section>

<section class="block band" id="install"><div class="wrap">
  <div class="head">
    <p class="eyebrow">Install</p>
    <h2>Works in any MCP client</h2>
    <p class="lead">One server, two ways to run it. The hosted connector needs nothing installed, the local server keeps every deck on your disk.</p>
  </div>
  <div class="cards content">
    <div class="card">
      <p class="eyebrow">Hosted</p>
      <h3>Connector in the cloud</h3>
      <p class="body">No install, no account. In Claude the deck plays right in the chat, elsewhere you get a link to present. Decks are kept for 30 days, download one to keep it.</p>
      ${code("code-url", "Server URL", CONNECTOR_URL)}
      <div class="actions"><a class="btn btn-outline" href="#top">Setup for your client</a></div>
    </div>
    <div class="card">
      <p class="eyebrow">Local</p>
      <h3>On your computer</h3>
      <p class="body">Decks as folders you keep, slide previews for Claude and PDF export. Needs Node 20 and Chrome, Edge or Chromium, and works with any client that starts a stdio server.</p>
      ${code("code-local", "Claude Code", CODE_LOCAL)}
      <div class="actions"><a class="btn btn-outline" href="${DESKTOP_DOWNLOAD}">Claude Desktop extension</a></div>
    </div>
  </div>
  <div class="models">
    <p><strong>Made and tested with Claude.</strong> The design guide, the examples and the checks are tuned on Claude, and in claude.ai and Claude Desktop the deck plays right in the chat.</p>
    <p><strong>Open to other models.</strong> It is a standard MCP server, so Codex, Gemini CLI, Cursor or any client that calls tools can build decks with it. The checks are the same, how good the deck gets follows the model.</p>
  </div>
</div></section>

<section class="block"><div class="wrap">
  <div class="cta card">
    <p class="eyebrow">Free and MIT licensed</p>
    <h2>Your next deck is one sentence away.</h2>
    <p>Add the connector, tell Claude about your company and watch the deck play in the chat. Read the code, change the layouts, add your own blocks.</p>
    <div class="actions"><a class="btn" href="#top">Add the connector</a><a class="btn btn-outline" href="${REPO}" target="_blank" rel="noopener">${STAR_ICON}Star on GitHub</a></div>
  </div>
</div></section>
</main>

<div class="wrap"><footer>
  <span><span class="mono">InstaDeck ${esc(version)}</span><span class="sep">Built by <a href="${AUTHOR.url}">${esc(AUTHOR.name)}</a></span></span>
  <span>Independent project, not affiliated with Anthropic.</span>
</footer></div>

<script>
(function () {
  var nav = document.getElementById("nav");
  var onScroll = function () { nav.classList.toggle("is-stuck", window.scrollY > 8); };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  document.querySelectorAll("[data-copy]").forEach(function (b) {
    b.addEventListener("click", function () {
      navigator.clipboard.writeText(document.getElementById(b.getAttribute("data-copy")).textContent).then(function () {
        b.textContent = "Copied";
        setTimeout(function () { b.textContent = "Copy"; }, 1600);
      });
    });
  });

  // The player shows the cover of the deck until the deck has loaded, then fades the live deck in over it.
  var frame = document.getElementById("frame");
  var player = document.getElementById("player");
  var open = document.getElementById("open-deck");
  player.addEventListener("load", function () { player.classList.add("is-ready"); });
  function play(tab) {
    player.classList.remove("is-ready");
    frame.style.backgroundImage = "url(" + tab.dataset.cover + ")";
    player.title = tab.dataset.name + ", a deck made with InstaDeck, playing live";
    player.src = tab.dataset.deck + "?autoplay=${AUTOPLAY_MS}";
    open.href = tab.dataset.deck;
  }

  document.querySelectorAll('[role="tablist"]').forEach(function (list) {
    var tabs = Array.prototype.slice.call(list.querySelectorAll('[role="tab"]'));
    function select(tab) {
      if (tab.getAttribute("aria-selected") === "true") return;
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
      });
      if (tab.dataset.deck) play(tab);
    }
    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { select(t); });
      t.addEventListener("keydown", function (e) {
        var d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (!d) return;
        var next = tabs[(i + d + tabs.length) % tabs.length];
        select(next);
        next.focus();
      });
    });
  });

  fetch("https://api.github.com/repos/${REPO.split("github.com/")[1]}").then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
    if (!j || typeof j.stargazers_count !== "number" || j.stargazers_count < 50) return;
    var el = document.getElementById("stars");
    el.textContent = j.stargazers_count.toLocaleString("en");
    el.hidden = false;
  }).catch(function () {});
})();
</script>
</body>
</html>
`;
}
