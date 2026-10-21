/**
 * Landing page instadeck.app. Statická, bez frameworku. Co InstaDeck umí, se bere z registru
 * schopností (server/capabilities.ts) a z domény, takže stránka neslibuje nic, co server nemá.
 * Vizuál ze slyde-saas: bílá plocha, Plus Jakarta Sans, logo v JetBrains Mono, akcent #B86B6B, bez zaoblení.
 */
import { LAYOUTS, BLOCK_TYPES, GOOGLE_FONTS } from "@/lib/domain";
import { capabilitiesFor } from "@/server/capabilities";

const REPO = "https://github.com/schinkodev/instadeck";
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
  { id: "other", name: "Other", steps: "InstaDeck is a standard MCP server over streamable HTTP, with no sign in. Point any client that supports remote servers at this address.", label: "Server URL", code: CONNECTOR_URL },
] as const;

const GITHUB_ICON = `<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8a8 8 0 0 0 5.47 7.59c.4.07.55-.17.55-.38v-1.33c-2.23.48-2.7-1.07-2.7-1.07-.36-.93-.89-1.17-.89-1.17-.73-.5.05-.49.05-.49.81.06 1.23.83 1.23.83.72 1.23 1.88.88 2.34.67.07-.52.28-.88.51-1.08-1.78-.2-3.65-.89-3.65-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.28.82 2.15 0 3.07-1.87 3.75-3.66 3.95.29.25.54.73.54 1.48v2.2c0 .21.15.46.55.38A8 8 0 0 0 16 8c0-4.42-3.58-8-8-8Z"/></svg>`;
const STAR_ICON = `<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="currentColor"><path d="M8 .6l2.2 4.7 5.1.7-3.7 3.6.9 5.1L8 12.2l-4.5 2.5.9-5.1L.7 6l5.1-.7L8 .6Z"/></svg>`;

function clientPicker(): string {
  const tabs = CLIENTS.map((c, i) => `<button type="button" role="tab" id="tab-${c.id}" aria-controls="panel-${c.id}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${esc(c.name)}</button>`).join("");
  const panels = CLIENTS.map(
    (c, i) => `<div role="tabpanel" id="panel-${c.id}" aria-labelledby="tab-${c.id}"${i === 0 ? "" : " hidden"}>
      <p class="picker-steps">${esc(c.steps)}</p>
      <div class="code"><div class="code-bar"><span>${esc(c.label)}</span><button type="button" data-copy="code-${c.id}">Copy</button></div><pre id="code-${c.id}">${esc(c.code)}</pre></div>
    </div>`,
  ).join("");
  return `<div class="picker"><div class="tabs" role="tablist" aria-label="Choose your MCP client">${tabs}</div>${panels}</div>`;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const PROMPT =
  "Make a seed pitch deck for Northwind Grid. We predict power grid congestion hours ahead, live with three operators, €1.9M ARR, raising €6M. Use the logo in ~/Desktop/northwind.svg.";

const STEPS = [
  {
    title: "Describe it",
    text: "Tell Claude about the company, the audience and the ask. Point it to your logo and brand fonts, it reads the brand colors from the logo.",
  },
  {
    title: "Claude designs it",
    text: `Claude plans the story with proven pitch beats and composes every slide from ${LAYOUTS.length} layouts and ${BLOCK_TYPES.length} building blocks, in your colors and type.`,
  },
  {
    title: "InstaDeck makes it right",
    text: "Every change is rendered, measured and checked: text that does not fit, weak contrast, motion that is louder than the audience calls for. The deck plays right in the chat and Claude fixes what is off.",
  },
];

const FEATURES = [
  { title: "Motion with intent", text: "Claude designs a motion language for each deck, from perfectly still to kinetic: its own entrances and transitions, headlines that glide from slide to slide, numbers that count up. InstaDeck measures every motion against the principles of perception." },
  { title: "Your brand, enforced", text: `Brand colors become a full design system with a modular type scale. ${GOOGLE_FONTS.length} curated typefaces or your own font files.` },
  { title: "Present, share, download", text: "Every deck presents full screen with an overview and a presenter view. Download it as PDF, as PowerPoint with editable text and native charts, or as one HTML file that works offline." },
  { title: "Works where you are", text: "Plays in the chat in claude.ai and Claude Desktop, opens from a link anywhere, or runs entirely on your computer with Claude Code. Open source under MIT." },
];

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
<meta name="description" content="Describe your company, add your logo, and Claude builds a branded pitch deck with motion that plays right in the chat. Free and open source.">
<meta property="og:title" content="InstaDeck | Pitch decks that move">
<meta property="og:description" content="Describe your company, add your logo, and Claude builds a branded pitch deck with motion that plays right in the chat. Free and open source.">
<meta property="og:image" content="https://instadeck.app/og.png">
<meta property="og:url" content="https://instadeck.app">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap">
<style>
/* Spacing a velikosti jen ze stupnice po 8 px, aby se rytmus stránky nerozjel: --s1 8, --s2 16, --s3 24, --s4 32, --s5 48, --s6 64, --s7 96. */
:root{--bg:#FFFFFF;--subtle:#F5F5F3;--fg:#111111;--muted:#555E70;--dim:#6F7A8E;--accent:#B86B6B;--accent-hover:#A55E5E;--line:rgba(26,26,26,.09);--line-strong:rgba(26,26,26,.16);--inset:#F0F2F7;
--s1:8px;--s2:16px;--s3:24px;--s4:32px;--s5:48px;--s6:64px;--s7:96px;--gutter:24px;--max:1120px;--control:44px;--section:var(--s7)}
*{box-sizing:border-box}
html{scroll-behavior:smooth;scroll-padding-top:var(--s7)}
body{margin:0;background:var(--bg);color:var(--fg);font-family:"Plus Jakarta Sans",-apple-system,BlinkMacSystemFont,sans-serif;font-size:16px;line-height:1.6;letter-spacing:-0.01em;-webkit-font-smoothing:antialiased}
a{color:inherit}
.wrap{max-width:var(--max);margin:0 auto;padding:0 var(--gutter)}
.mono{font-family:"JetBrains Mono",monospace}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px}

/* Ovládací prvky: jedna výška, jedno písmo */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:var(--s1);height:var(--control);padding:0 var(--s3);background:var(--accent);color:#FFF;border:1.5px solid var(--accent);font:inherit;font-size:14px;font-weight:500;line-height:1;text-decoration:none;white-space:nowrap;cursor:pointer;transition:background .15s,color .15s,border-color .15s}
.btn:hover{background:var(--accent-hover);border-color:var(--accent-hover)}
.btn-outline{background:transparent;color:var(--fg);border-color:var(--fg)}
.btn-outline:hover{background:var(--fg);border-color:var(--fg);color:#FFF}
.btn-ghost{background:transparent;color:var(--fg);border-color:transparent}
.btn-ghost:hover{background:var(--subtle);border-color:transparent}
.btn .count{padding-left:var(--s1);margin-left:2px;border-left:1px solid currentColor;opacity:.7;font-variant-numeric:tabular-nums}

nav{position:sticky;top:0;z-index:10;background:rgba(255,255,255,.92);backdrop-filter:saturate(1.4) blur(8px);border-bottom:1px solid transparent}
nav.is-stuck{border-bottom-color:var(--line)}
nav .wrap{display:flex;justify-content:space-between;align-items:center;height:72px}
.logo{font-family:"JetBrains Mono",monospace;font-size:13px;letter-spacing:.08em;text-transform:uppercase;text-decoration:none}
.nav-links{display:flex;gap:var(--s1);align-items:center}

.hero{padding:var(--s6) 0 var(--s5);text-align:center}
.hero h1{margin:0 auto;max-width:820px;font-size:clamp(40px,7vw,72px);line-height:1.04;letter-spacing:-0.035em;font-weight:700;text-wrap:balance}
.hero h1 em{font-style:normal;color:var(--accent)}
.hero .sub{margin:var(--s3) auto 0;max-width:640px;font-size:clamp(17px,2vw,20px);color:var(--muted);text-wrap:pretty}

/* Výběr klienta: záložky nad jedním blokem kódu */
.picker{max-width:800px;margin:var(--s5) auto 0;text-align:left}
.tabs{display:flex;flex-wrap:wrap;gap:var(--s1);margin-bottom:var(--s3)}
.tabs button{height:36px;padding:0 14px;background:transparent;border:1.5px solid var(--line-strong);color:var(--muted);font:inherit;font-size:13px;font-weight:500;cursor:pointer;transition:background .15s,color .15s,border-color .15s}
.tabs button:hover{color:var(--fg);border-color:var(--fg)}
.tabs button[aria-selected="true"]{background:var(--fg);border-color:var(--fg);color:#FFF}
.picker-steps{margin:0 0 var(--s2);min-height:calc(2 * 1.6em);color:var(--muted);font-size:15px}
.code{border:1.5px solid var(--fg);background:#FFF}
.code-bar{display:flex;justify-content:space-between;align-items:center;height:40px;padding-left:var(--s2);border-bottom:1px solid var(--line-strong);background:var(--subtle);font-family:"JetBrains Mono",monospace;font-size:12px;color:var(--dim)}
.code-bar button{height:100%;padding:0 var(--s2);min-width:88px;border:none;border-left:1px solid var(--line-strong);background:transparent;font:inherit;font-size:12px;color:var(--fg);cursor:pointer}
.code-bar button:hover{background:var(--fg);color:#FFF}
.code pre{margin:0;padding:var(--s2);overflow-x:auto;font-family:"JetBrains Mono",monospace;font-size:13.5px;line-height:1.7;min-height:calc(var(--s2) * 2 + 1.7em * 2)}
.picker-foot{margin-top:var(--s2);font-size:13px;color:var(--dim)}
.picker-foot a{color:var(--muted)}

.demo{padding-top:var(--s4)}
.frame{position:relative;width:100%;aspect-ratio:16/9;background:#0B0B0C;box-shadow:0 32px 80px -32px rgba(15,23,42,.35);border:1px solid var(--line-strong)}
.frame iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
.demo-caption{display:flex;justify-content:space-between;gap:var(--s2);flex-wrap:wrap;margin-top:var(--s2);font-size:14px;color:var(--muted)}
.demo-caption a{color:var(--fg);font-weight:500}

section.block{padding:var(--section) 0;border-top:1px solid var(--line)}
.demo{padding-bottom:var(--section)}
.head{max-width:680px}
.head h2{margin:0;font-size:clamp(28px,4vw,40px);line-height:1.1;letter-spacing:-0.03em;font-weight:700;text-wrap:balance}
.head .lead{margin:var(--s2) 0 0;color:var(--muted);font-size:18px;text-wrap:pretty}
.content{margin-top:var(--s5)}

.prompt{padding:var(--s3) var(--s4);background:var(--inset);font-size:18px;line-height:1.55;max-width:880px}
.prompt span{display:block;margin-bottom:var(--s1);font-family:"JetBrains Mono",monospace;font-size:12px;color:var(--dim)}
.steps{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--s4);margin-top:var(--s5);counter-reset:step}
.steps > div{border-top:2px solid var(--fg);padding-top:var(--s3);counter-increment:step}
.steps > div::before{content:"0" counter(step);display:block;font-family:"JetBrains Mono",monospace;font-size:13px;color:var(--accent);margin-bottom:var(--s1)}
.steps h3,.features h3,.cards h3{margin:0;font-size:20px;line-height:1.3;letter-spacing:-0.02em;font-weight:600}
.steps p,.features p,.cards p{margin:var(--s1) 0 0;color:var(--muted);font-size:15px}

.features{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1px;background:var(--line);border:1px solid var(--line)}
.features > div{background:#FFF;padding:var(--s4)}

.caps{margin:0;padding:0;list-style:none;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:var(--s6)}
.caps li{display:flex;justify-content:space-between;align-items:flex-start;gap:var(--s3);padding:var(--s2) 0;border-top:1px solid var(--line);font-size:15px}
.caps em{font-style:normal;font-size:12px;font-family:"JetBrains Mono",monospace;color:var(--dim);white-space:nowrap;padding-top:2px}
.caps .is-planned span{color:var(--dim)}

.cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--s4)}
.cards > div{min-width:0;border:1px solid var(--line-strong);padding:var(--s4);display:flex;flex-direction:column;gap:var(--s2)}
.cards p{margin:0}
.cards .code{margin-top:auto}
.cards .actions{display:flex;gap:var(--s1);flex-wrap:wrap}
.note{margin:var(--s3) 0 0;font-size:14px;color:var(--muted)}

.oss{display:flex;justify-content:space-between;align-items:center;gap:var(--s4);flex-wrap:wrap}
footer{padding:var(--s4) 0 var(--s5);border-top:1px solid var(--line);font-size:13px;color:var(--dim);display:flex;justify-content:space-between;gap:var(--s2);flex-wrap:wrap}

@media (max-width:760px){
  :root{--section:var(--s6);--gutter:16px}
  .steps,.features,.cards,.caps{grid-template-columns:1fr}
  .hero{padding-top:var(--s4)}
  .nav-links .btn-ghost{display:none}
  .features > div,.cards > div{padding:var(--s3)}
  .prompt{padding:var(--s2) var(--s3)}
}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
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

<div class="wrap">
<header class="hero">
  <h1>Pitch decks that <em>move</em>, built by your Claude.</h1>
  <p class="sub">Describe your company and add your logo. Claude writes the story and the design, InstaDeck turns it into a branded presentation with motion, checks every slide and hands you the deck.</p>
  ${clientPicker()}
  <p class="picker-foot">Free, no account. <a href="#install">Run it on your computer instead</a></p>
</header>

<section class="demo">
  <div class="frame"><iframe src="/demo/deck.html?autoplay=4200" title="A pitch deck made with InstaDeck" loading="lazy"></iframe></div>
  <div class="demo-caption"><span>A real InstaDeck, playing live. Click it to take over, use the arrow keys, press F for fullscreen.</span><a href="/demo/deck.html">Open the demo</a></div>
</section>
</div>

<section class="block" id="how"><div class="wrap">
  <div class="head">
    <h2>You bring the company. Claude and InstaDeck bring the craft.</h2>
    <p class="lead">InstaDeck is a toolset Claude uses through the Model Context Protocol. Claude decides what to say and how it should look. InstaDeck renders, measures and exports, so the result holds up on a big screen.</p>
  </div>
  <div class="prompt content"><span>You, in Claude</span>${esc(PROMPT)}</div>
  <div class="steps">${STEPS.map((s) => `<div><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></div>`).join("")}</div>
</div></section>

<section class="block"><div class="wrap">
  <div class="head"><h2>Built like a design team would build it.</h2></div>
  <div class="features content">${FEATURES.map((f) => `<div><h3>${esc(f.title)}</h3><p>${esc(f.text)}</p></div>`).join("")}</div>
</div></section>

<section class="block"><div class="wrap">
  <div class="head">
    <h2>What InstaDeck does today</h2>
    <p class="lead">The same list Claude reads from the server. Planned items are marked, nothing is promised that is not there.</p>
  </div>
  <ul class="caps content">${capabilityList()}</ul>
</div></section>

<section class="block" id="install"><div class="wrap">
  <div class="head">
    <h2>Works in any MCP client</h2>
    <p class="lead">InstaDeck is a standard MCP server, so it is not tied to one app. Use the hosted connector for zero setup, or run the same server on your computer.</p>
  </div>
  <div class="cards content">
    <div>
      <h3>Hosted connector</h3>
      <p>Nothing to install, no account. Pick your client at the top of the page, or paste this address into any client that supports remote MCP servers. In Claude the deck plays right in the chat, elsewhere you get a link to present.</p>
      <div class="code"><div class="code-bar"><span>Server URL</span><button type="button" data-copy="code-url">Copy</button></div><pre id="code-url">${esc(CONNECTOR_URL)}</pre></div>
    </div>
    <div>
      <h3>On your computer</h3>
      <p>Decks as folders you keep, slide previews for Claude and PDF export. Needs Node 20 and Chrome, Edge or Chromium. Works with any client that starts a stdio server.</p>
      <div class="code"><div class="code-bar"><span>Claude Code</span><button type="button" data-copy="code-local">Copy</button></div><pre id="code-local">${esc(CODE_LOCAL)}</pre></div>
      <div class="actions"><a class="btn btn-outline" href="${DESKTOP_DOWNLOAD}">Claude Desktop extension</a></div>
    </div>
  </div>
  <p class="note">The hosted connector needs no account. Decks it makes are kept for 30 days, download the presentation from its link to keep it.</p>
</div></section>

<section class="block"><div class="wrap oss">
  <div class="head">
    <h2>Open source, MIT licensed</h2>
    <p class="lead">Read the code, change the layouts, add your own blocks. Contributions are welcome.</p>
  </div>
  <a class="btn btn-outline" href="${REPO}" target="_blank" rel="noopener">${STAR_ICON}Star on GitHub</a>
</div></section>

<div class="wrap"><footer>
  <span class="mono">InstaDeck ${esc(version)}</span>
  <span>Claude is a model by Anthropic. InstaDeck is an independent open source project.</span>
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

  var tabs = Array.prototype.slice.call(document.querySelectorAll('.picker [role="tab"]'));
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
