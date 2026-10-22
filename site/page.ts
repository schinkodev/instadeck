/**
 * Landing page instadeck.app. Statická, bez frameworku. Co InstaDeck umí, se bere z registru
 * schopností (server/capabilities.ts) a z domény, takže stránka neslibuje nic, co server nemá.
 * Vizuál ze slyde-saas: bílá plocha, Plus Jakarta Sans, logo v JetBrains Mono, akcent #B86B6B, bez zaoblení.
 *
 * Design systém stránky: mezery jen ze stupnice po 8 px, jedna výška ovládacích prvků, jedna tloušťka
 * rámečku, dva sloupce obsahu (--narrow pro hero a texty, --max pro demo a mřížky). Co stojí vedle sebe,
 * sdílí řádky přes subgrid, takže nadpisy, texty i bloky kódu v sousedních kartách začínají na stejné lince.
 */
import { LAYOUTS, BLOCK_TYPES, GOOGLE_FONTS } from "@/lib/domain";
import { NARRATIVE_FRAMES } from "@/lib/domain/narrative";
import { DESIGN_SCHOOLS } from "@/lib/domain/schools";
import { capabilitiesFor } from "@/server/capabilities";

const REPO = "https://github.com/schinkodev/instadeck";
const AUTHOR = { name: "Jakub Schinko", url: "https://schinko.dev" };
const CONNECTOR_URL = "https://instadeck.app/mcp";
const CODE_REMOTE = `claude mcp add --transport http instadeck ${CONNECTOR_URL}`;
const CODE_LOCAL = "claude mcp add instadeck -- npx -y instadeck";
const DESKTOP_DOWNLOAD = `${REPO}/releases/latest/download/instadeck.mcpb`;

/** Jak přidat hostovaný konektor v běžných MCP klientech. Každý klient má vlastní krok a vlastní text ke zkopírování. */
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

/** Ukázkové zadání. Smyšlené firmy jako v golden examples, každé ukazuje jiné publikum, rámec nebo jazyk. */
const PROMPTS = [
  {
    id: "seed",
    name: "Seed pitch",
    text: "Make a seed pitch deck for Northwind Grid. We predict power grid congestion hours ahead, live with three operators, €1.9M ARR, raising €6M. Our logo is attached.",
    note: "Claude picks a frame for investors, asks for the numbers it is missing and builds the deck in Northwind's colors, read from the logo.",
  },
  {
    id: "board",
    name: "Board update",
    text: "Q3 board update for Fernhill. Revenue €412k against a plan of €450k, churn down to 2.1 %, hiring paused. Be straight about the miss and end with the two decisions we need from the board.",
    note: "A calm deck that does not move. It opens with the answer, shows the miss next to the plan and closes on the decisions.",
  },
  {
    id: "sales",
    name: "Sales deck",
    text: "Enterprise sales deck for Lumen Ops, for the CFO of a 2,000 person logistics company. Numbers first, no hype. Use our brand fonts and the product screenshots in ./assets.",
    note: "Your fonts and screenshots go into layouts made for them, the savings land as a chart, and speaker notes carry what the slide leaves out.",
  },
  {
    id: "czech",
    name: "In Czech",
    text: "Připrav prezentaci k uvedení aplikace Kolo na trh, pro novináře, česky. Hravě, s fotkami produktu, které přikládám.",
    note: "The deck is written in the language of the brief, typeset for it, and moves with a livelier rhythm for a launch.",
  },
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

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Záložky nad panely. Sdílí je výběr klienta i ukázkové prompty, obsluhuje je jeden skript. */
function tabs(group: string, label: string, items: readonly { id: string; name: string }[], panel: (item: never) => string): string {
  const buttons = items.map((t, i) => `<button type="button" role="tab" id="${group}-tab-${t.id}" aria-controls="${group}-${t.id}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${esc(t.name)}</button>`).join("");
  const panels = items.map((t, i) => `<div role="tabpanel" id="${group}-${t.id}" aria-labelledby="${group}-tab-${t.id}"${i === 0 ? "" : " hidden"}>${panel(t as never)}</div>`).join("");
  return `<div class="tablist" role="tablist" aria-label="${esc(label)}">${buttons}</div><div class="panels">${panels}</div>`;
}

const code = (id: string, label: string, text: string) =>
  `<div class="code"><div class="code-bar"><span>${esc(label)}</span><button type="button" data-copy="${id}">Copy</button></div><pre id="${id}">${esc(text)}</pre></div>`;

function clientPicker(): string {
  return `<div class="picker">${tabs("client", "Choose your MCP client", CLIENTS, (c: (typeof CLIENTS)[number]) => `<p class="picker-steps">${esc(c.steps)}</p>${code(`code-${c.id}`, c.label, c.code)}`)}</div>`;
}

function promptPicker(): string {
  return `<div class="prompts">${tabs("prompt", "Example briefs", PROMPTS, (p: (typeof PROMPTS)[number]) => `<figure class="prompt"><figcaption class="mono">You, in your chat</figcaption><blockquote${p.id === "czech" ? ' lang="cs"' : ""}>${esc(p.text)}</blockquote></figure><p class="prompt-note">${esc(p.note)}</p>`)}</div>`;
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
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap">
<style>
/* Stupnice po 8 px: --s1 8, --s2 16, --s3 24, --s4 32, --s5 48, --s6 64, --s7 96, --s8 128. Nic mimo ni. */
:root{--bg:#FFFFFF;--subtle:#F5F5F3;--inset:#F0F2F7;--fg:#111111;--muted:#555E70;--dim:#6F7A8E;--accent:#B86B6B;--accent-hover:#A55E5E;--line:rgba(17,17,17,.09);--line-strong:rgba(17,17,17,.18);
--s1:8px;--s2:16px;--s3:24px;--s4:32px;--s5:48px;--s6:64px;--s7:96px;--s8:128px;
--gutter:24px;--max:1120px;--narrow:720px;--control:40px;--bar:40px;--border:1px;--section:var(--s8);
--mono:"JetBrains Mono",ui-monospace,monospace;--ease:cubic-bezier(.2,.7,.2,1)}
*{box-sizing:border-box}
html{scroll-behavior:smooth;scroll-padding-top:var(--s7)}
body{margin:0;background:var(--bg);color:var(--fg);font-family:"Plus Jakarta Sans",-apple-system,BlinkMacSystemFont,sans-serif;font-size:16px;line-height:1.6;letter-spacing:-0.01em;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
a{color:inherit;text-underline-offset:3px;text-decoration-thickness:1px}
p{margin:0}
h1,h2,h3{margin:0;font-weight:700;text-wrap:balance}
.wrap{max-width:calc(var(--max) + 2 * var(--gutter));margin:0 auto;padding:0 var(--gutter)}
.mono{font-family:var(--mono)}
.eyebrow{font-family:var(--mono);font-size:12px;line-height:16px;letter-spacing:.06em;text-transform:uppercase;color:var(--dim)}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px}

/* Ovládací prvky: jedna výška, jeden rámeček, jedno písmo */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:var(--s1);height:var(--control);padding:0 var(--s2);background:var(--accent);color:#FFF;border:var(--border) solid var(--accent);font:inherit;font-size:14px;font-weight:500;line-height:1;text-decoration:none;white-space:nowrap;cursor:pointer;transition:background .15s,color .15s,border-color .15s}
.btn:hover{background:var(--accent-hover);border-color:var(--accent-hover)}
.btn-outline{background:transparent;color:var(--fg);border-color:var(--fg)}
.btn-outline:hover{background:var(--fg);border-color:var(--fg);color:#FFF}
.btn-ghost{background:transparent;color:var(--fg);border-color:transparent}
.btn-ghost:hover{background:var(--subtle);border-color:transparent}
.btn .count{padding-left:var(--s1);border-left:1px solid currentColor;opacity:.7;font-variant-numeric:tabular-nums}

nav{position:sticky;top:0;z-index:10;background:rgba(255,255,255,.9);backdrop-filter:saturate(1.4) blur(8px);-webkit-backdrop-filter:saturate(1.4) blur(8px);border-bottom:1px solid transparent;transition:border-color .2s}
nav.is-stuck{border-bottom-color:var(--line)}
nav .wrap{display:flex;justify-content:space-between;align-items:center;height:var(--s6)}
.logo{font-family:var(--mono);font-size:13px;font-weight:500;letter-spacing:.08em;text-transform:uppercase;text-decoration:none}
.nav-links{display:flex;gap:var(--s1);align-items:center}

/* Záložky jako segmentový přepínač: buňky sdílí rámeček, žádné mezery mezi nimi */
.tablist{display:flex;flex-wrap:wrap;border-top:var(--border) solid var(--line-strong);border-left:var(--border) solid var(--line-strong)}
.tablist button{flex:1 1 auto;height:var(--control);padding:0 var(--s2);background:var(--bg);border:0;border-right:var(--border) solid var(--line-strong);border-bottom:var(--border) solid var(--line-strong);color:var(--muted);font:inherit;font-size:13px;font-weight:500;white-space:nowrap;cursor:pointer;transition:background .15s,color .15s}
.tablist button:hover{color:var(--fg);background:var(--subtle)}
.tablist button[aria-selected="true"]{background:var(--fg);color:#FFF}

/* Hero: jedna osa. Nadpis, podtitul i výběr klienta sdílí střed i šířku --narrow. */
.hero{padding:var(--s7) 0 var(--s6);text-align:center}
.hero .eyebrow{margin-bottom:var(--s3)}
.hero h1{margin:0 auto;max-width:860px;font-size:clamp(40px,7vw,76px);line-height:1.02;letter-spacing:-0.04em}
.hero h1 em{font-style:normal;color:var(--accent)}
/* Tučná čárka a tečka v Plus Jakarta Sans mají široký levý okraj glyfu, ve velikosti nadpisu z toho je viditelná mezera. Optické dorovnání. */
.hero h1 .punct{margin-left:-0.1em}
.hero .sub{margin:var(--s3) auto 0;max-width:600px;font-size:clamp(17px,2vw,19px);line-height:1.55;color:var(--muted);text-wrap:pretty}
.picker{max-width:var(--narrow);margin:var(--s5) auto 0;text-align:left}
.picker-steps{display:flex;align-items:center;min-height:calc(var(--s2) * 2 + 1.6em * 2);padding:var(--s2) 0;font-size:14px;color:var(--muted);text-wrap:pretty}
.picker-foot{margin-top:var(--s3);font-size:13px;color:var(--dim)}
.picker-foot a{color:var(--muted)}
.picker-foot span + span::before{content:"\\00B7";margin:0 var(--s1)}

.code{border:var(--border) solid var(--fg);background:var(--bg);min-width:0}
.code-bar{display:flex;justify-content:space-between;align-items:center;height:var(--bar);padding-left:var(--s2);border-bottom:var(--border) solid var(--line-strong);background:var(--subtle);font-family:var(--mono);font-size:12px;color:var(--dim)}
.code-bar button{height:100%;min-width:80px;padding:0 var(--s2);border:0;border-left:var(--border) solid var(--line-strong);background:transparent;font:inherit;font-size:12px;color:var(--fg);cursor:pointer;transition:background .15s,color .15s}
.code-bar button:hover{background:var(--fg);color:#FFF}
.code pre{margin:0;padding:var(--s2);overflow-x:auto;font-family:var(--mono);font-size:13px;line-height:24px;min-height:calc(var(--s2) * 2 + 48px);white-space:pre-wrap;word-break:break-word}

.demo{padding-bottom:var(--section)}
.frame{position:relative;width:100%;aspect-ratio:16/9;background:#0B0B0C;border:var(--border) solid var(--line-strong);box-shadow:0 1px 2px rgba(15,23,42,.06),0 32px 64px -32px rgba(15,23,42,.3)}
.frame iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
.demo-caption{display:flex;justify-content:space-between;align-items:baseline;gap:var(--s2);flex-wrap:wrap;margin-top:var(--s2);font-size:14px;color:var(--muted)}
.demo-caption a{color:var(--fg);font-weight:500}

section.block{padding:var(--section) 0;border-top:var(--border) solid var(--line)}
.head{max-width:var(--narrow)}
.head .eyebrow{margin-bottom:var(--s2)}
.head h2{font-size:clamp(30px,4.2vw,44px);line-height:1.08;letter-spacing:-0.035em}
.head .lead{margin-top:var(--s2);color:var(--muted);font-size:18px;line-height:1.55;text-wrap:pretty}
.content{margin-top:var(--s6)}
h3{font-size:18px;line-height:24px;letter-spacing:-0.02em;font-weight:600}
.body{margin-top:var(--s1);color:var(--muted);font-size:15px;line-height:24px;text-wrap:pretty}

/* Jak to funguje: prompt vlevo, kroky vpravo, oba sloupce začínají na stejné lince */
.how{display:grid;grid-template-columns:minmax(0,7fr) minmax(0,5fr);gap:var(--s6);align-items:start}
.prompts .panels{border:var(--border) solid var(--line-strong);border-top:0}
.prompts{position:sticky;top:calc(var(--s6) + var(--s4))}
.prompt{margin:0;padding:var(--s4);background:var(--inset);min-height:200px}
.prompt figcaption{font-size:12px;line-height:16px;color:var(--dim);margin-bottom:var(--s2)}
.prompt blockquote{margin:0;font-size:19px;line-height:30px;letter-spacing:-0.015em;text-wrap:pretty}
.prompt-note{padding:var(--s2) var(--s4);font-size:14px;line-height:22px;color:var(--muted);border-top:var(--border) solid var(--line-strong);min-height:calc(var(--s2) * 2 + 44px)}
.steps{margin:0;padding:0;list-style:none;counter-reset:step;border-top:var(--border) solid var(--fg)}
.steps li{counter-increment:step;display:grid;grid-template-columns:var(--s5) minmax(0,1fr);padding:var(--s3) 0;border-bottom:var(--border) solid var(--line)}
.steps li::before{content:"0" counter(step);font-family:var(--mono);font-size:12px;line-height:24px;color:var(--accent)}
.steps li:last-child{border-bottom:0;padding-bottom:0}

/* Funkce: mřížka 3 x 2 s vlasovými linkami, každá buňka stejná vnitřní stavba */
.features{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--border);background:var(--line-strong);border:var(--border) solid var(--line-strong)}
.features > div{background:var(--bg);padding:var(--s4);display:grid;grid-template-rows:subgrid;grid-row:span 3;row-gap:0}
.features .eyebrow{margin-bottom:var(--s3);color:var(--accent)}
.caps{margin-top:var(--s5);border-top:var(--border) solid var(--line-strong)}
.caps summary{display:flex;justify-content:space-between;align-items:center;gap:var(--s2);min-height:var(--s7);cursor:pointer;list-style:none;font-weight:600}
.caps summary::-webkit-details-marker{display:none}
.caps summary .eyebrow{transition:color .15s}
.caps summary:hover .eyebrow{color:var(--fg)}
.caps summary .eyebrow::after{content:"+";display:inline-block;width:1ch;margin-left:var(--s1);text-align:center}
.caps[open] summary .eyebrow::after{content:"\\2212"}
.caps summary p{font-weight:400;font-size:15px;color:var(--muted);margin-top:2px}
.caps ul{margin:0 0 var(--s2);padding:0;list-style:none;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:var(--s6)}
.caps li{display:flex;justify-content:space-between;align-items:flex-start;gap:var(--s3);padding:var(--s2) 0;border-top:var(--border) solid var(--line);font-size:14px;line-height:22px;color:var(--muted)}
.caps em{font-style:normal;font-size:12px;font-family:var(--mono);color:var(--dim);white-space:nowrap}
.caps .is-planned span{color:var(--dim)}

/* Instalace: dvě karty na subgridu, takže nadpis, text, kód a akce leží v obou na stejných řádcích */
.cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));grid-template-rows:repeat(5,auto);column-gap:var(--s4)}
.cards > div{display:grid;grid-template-rows:subgrid;grid-row:span 5;row-gap:0;padding:var(--s4);border:var(--border) solid var(--line-strong);min-width:0}
.cards .eyebrow{margin-bottom:var(--s2)}
.cards .body{margin-bottom:var(--s3)}
.cards .actions{display:flex;align-items:center;gap:var(--s2);margin-top:var(--s3);font-size:13px;color:var(--dim)}
.cards .actions a:not(.btn){color:var(--muted)}
.models{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);column-gap:var(--s4);margin-top:var(--s5);padding-top:var(--s3);border-top:var(--border) solid var(--line)}
.models p{font-size:14px;line-height:22px;color:var(--muted)}
.models strong{color:var(--fg);font-weight:600}

.oss{display:flex;justify-content:space-between;align-items:flex-end;gap:var(--s4);flex-wrap:wrap}
footer{display:flex;justify-content:space-between;align-items:center;gap:var(--s2);flex-wrap:wrap;min-height:var(--s7);border-top:var(--border) solid var(--line);font-size:13px;color:var(--dim)}
footer a{color:var(--muted)}
footer a:hover{color:var(--fg)}
footer .sep::before{content:"\\00B7";margin:0 var(--s1)}

@media (max-width:960px){
  .how{grid-template-columns:1fr;gap:var(--s5)}
  .prompts{position:static}
  .features{grid-template-columns:repeat(2,minmax(0,1fr))}
}
@media (max-width:720px){
  :root{--section:var(--s7);--gutter:16px}
  .hero{padding:var(--s6) 0 var(--s5)}
  .nav-links .btn-ghost{display:none}
  .content{margin-top:var(--s5)}
  .features,.caps ul,.models{grid-template-columns:1fr}
  .features > div{grid-row:auto;grid-template-rows:auto;padding:var(--s3)}
  .cards{grid-template-columns:1fr;grid-template-rows:none;row-gap:var(--s3)}
  .cards > div{grid-row:auto;grid-template-rows:auto;padding:var(--s3)}
  .models p + p{margin-top:var(--s2)}
  .tablist button{flex:1 1 33%;padding:0 var(--s1)}
  .prompt{padding:var(--s3);min-height:0}
  .prompt blockquote{font-size:17px;line-height:28px}
  .prompt-note{padding:var(--s2) var(--s3)}
  footer{padding:var(--s3) 0;flex-direction:column;align-items:flex-start;gap:var(--s1)}
}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}*{transition:none!important}}
</style>
</head>
<body>
<nav id="nav"><div class="wrap">
  <a class="logo" href="/">InstaDeck</a>
  <div class="nav-links">
    <a class="btn btn-ghost" href="#how">How it works</a>
    <a class="btn btn-outline" href="${REPO}" target="_blank" rel="noopener" aria-label="Star InstaDeck on GitHub">${GITHUB_ICON}<span>Star</span><span class="count" id="stars" hidden></span></a>
    <a class="btn" href="#install">Install</a>
  </div>
</div></nav>

<main>
<div class="wrap">
<header class="hero" id="top">
  <p class="eyebrow">Open source MCP server</p>
  <h1>Pitch decks that <em>move</em><span class="punct">,</span> built by your Claude<span class="punct">.</span></h1>
  <p class="sub">Describe your company and add your logo. Claude shapes the story and the design, InstaDeck turns it into a branded presentation with motion, checks every slide and hands you the deck.</p>
  ${clientPicker()}
  <p class="picker-foot"><span>Free, no account</span><span><a href="#install">Run it on your computer instead</a></span></p>
</header>

<section class="demo" aria-label="Live demo">
  <div class="frame"><iframe src="/demo/deck.html?autoplay=4200" title="A pitch deck made with InstaDeck" loading="lazy"></iframe></div>
  <div class="demo-caption"><span>A real InstaDeck, playing live. Click it to take over, use the arrow keys, press F for fullscreen.</span><a href="/demo/deck.html">Open the demo</a></div>
</section>
</div>

<section class="block" id="how"><div class="wrap">
  <div class="head">
    <p class="eyebrow">How it works</p>
    <h2>You bring the company. Claude and InstaDeck bring the craft.</h2>
    <p class="lead">Claude decides what to say and how it should look. InstaDeck renders, measures and exports, so the result holds up on a big screen.</p>
  </div>
  <div class="how content">
    ${promptPicker()}
    <ol class="steps">${STEPS.map((s) => `<li><div><h3>${esc(s.title)}</h3><p class="body">${esc(s.text)}</p></div></li>`).join("")}</ol>
  </div>
</div></section>

<section class="block"><div class="wrap">
  <div class="head">
    <p class="eyebrow">What you get</p>
    <h2>Built like a design team would build it.</h2>
  </div>
  <div class="features content">${FEATURES.map((f) => `<div><p class="eyebrow">${esc(f.label)}</p><h3>${esc(f.title)}</h3><p class="body">${esc(f.text)}</p></div>`).join("")}</div>
  <details class="caps">
    <summary><div>The full list Claude reads from the server<p>Planned items are marked. Nothing here is promised that is not there.</p></div><span class="eyebrow">Show</span></summary>
    <ul>${capabilityList()}</ul>
  </details>
</div></section>

<section class="block" id="install"><div class="wrap">
  <div class="head">
    <p class="eyebrow">Install</p>
    <h2>Works in any MCP client</h2>
    <p class="lead">One server, two ways to run it. The hosted connector needs nothing installed, the local server keeps every deck on your disk.</p>
  </div>
  <div class="cards content">
    <div>
      <p class="eyebrow">Hosted</p>
      <h3>Connector in the cloud</h3>
      <p class="body">No install, no account. In Claude the deck plays right in the chat, elsewhere you get a link to present. Decks are kept for 30 days, download one to keep it.</p>
      ${code("code-url", "Server URL", CONNECTOR_URL)}
      <div class="actions"><a class="btn btn-outline" href="#top">Setup for your client</a></div>
    </div>
    <div>
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

<section class="block"><div class="wrap oss">
  <div class="head">
    <p class="eyebrow">MIT licensed</p>
    <h2>Open source, top to bottom</h2>
    <p class="lead">Read the code, change the layouts, add your own blocks. Contributions are welcome.</p>
  </div>
  <a class="btn btn-outline" href="${REPO}" target="_blank" rel="noopener">${STAR_ICON}Star on GitHub</a>
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

  document.querySelectorAll('[role="tablist"]').forEach(function (list) {
    var tabs = Array.prototype.slice.call(list.querySelectorAll('[role="tab"]'));
    function select(tab) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
      });
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
