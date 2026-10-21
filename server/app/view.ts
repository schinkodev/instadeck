/**
 * MCP App: deck přímo v chatu (claude.ai, Claude Desktop). Běží v sandboxu klienta.
 *
 * Tool vrátí deckId a presentation.url. Aplikace si vykreslené části decku načte toolem
 * get_deck_view (jen pro aplikaci), vloží je do stránky, změří přetečení a pohyb v prohlížeči
 * uživatele, výsledek pošle modelu (updateModelContext) a připojí player s animacemi.
 * Funguje stejně s hostovaným konektorem i s lokálním serverem. Tlačítko Upravit slide pošle
 * do chatu zprávu, který slide a jak změnit.
 * Bundluje se esbuildem do server/app/view-source.ts (npm run gen).
 */
import { App } from "@modelcontextprotocol/ext-apps";
import type { MotionSample } from "@/lib/domain/motion-limits";
import { MEASURE_JS } from "@/lib/engine/render/measure-source";
import { PLAYER_JS } from "@/lib/engine/render/player-source";
// Přímo z modulů bez zod: bundle MCP App má zůstat malý.
import { motionFindings, type MotionMeasureContext } from "@/lib/engine/validate/motion";

interface DeckParts {
  lang: string;
  title: string;
  fontsHref?: string;
  css: string;
  slides: string;
  config: { measure: MotionMeasureContext };
}

interface OverflowMeasure {
  slideId: string;
  zone?: string;
  px: number;
  axis: "x" | "y";
}

interface PlayerHandle {
  destroy(): void;
}

declare global {
  interface Window {
    mountInstaDeck(opts: {
      root: HTMLElement;
      config: unknown;
      hash: boolean;
      onFullscreen: () => void;
      controls: Record<string, boolean>;
      onAsk?: (a: { index: number; slideId: string; text: string }) => void;
    }): PlayerHandle;
    measureInstaDeck(root: HTMLElement): OverflowMeasure[];
    measureMotionInstaDeck(root: HTMLElement, config: unknown): MotionSample[];
  }
}

const frame = document.getElementById("frame")!;
const root = document.getElementById("deck")!;
const status = document.getElementById("status")!;
const deckCss = document.getElementById("deck-css")!;
const fonts = document.getElementById("deck-fonts") as HTMLLinkElement;
const openButton = document.getElementById("open") as HTMLButtonElement;

// Player a měření jsou klasické skripty (stejné jako v samostatném deck.html), vloží se jednou.
for (const source of [PLAYER_JS, MEASURE_JS]) {
  const s = document.createElement("script");
  s.textContent = source;
  document.head.appendChild(s);
}

let player: PlayerHandle | undefined;
let presentationUrl: string | undefined;
let shown: string | undefined;
let fullscreen = false;

const app = new App({ name: "InstaDeck", version: "1.0.0" }, { availableDisplayModes: ["inline", "fullscreen"] });

function setStatus(text: string) {
  status.textContent = text;
  status.hidden = !text;
}

async function toggleFullscreen() {
  const r = await app.requestDisplayMode({ mode: fullscreen ? "inline" : "fullscreen" });
  fullscreen = r.mode === "fullscreen";
  frame.classList.toggle("is-fullscreen", fullscreen);
}

openButton.addEventListener("click", (e) => {
  e.stopPropagation();
  if (presentationUrl) void app.openLink({ url: presentationUrl });
});

function report(deckId: string, revision: number, raw: OverflowMeasure[], motion: { rule: string; message: string }[]): string {
  if (raw.length === 0 && motion.length === 0) return `InstaDeck view: deck ${deckId} revision ${revision} rendered in the chat, every slide fits and the motion matches its intensity.`;
  const lines = raw.map((o) =>
    o.axis === "y"
      ? `- error overflow, slide ${o.slideId}${o.zone ? `, zone ${o.zone}` : ""}: content is ${o.px}px taller than its space`
      : `- error overflow, slide ${o.slideId}${o.zone ? `, zone ${o.zone}` : ""}: content is ${o.px}px wider than its zone`,
  );
  const moves = motion.map((f) => `- warning ${f.rule}: ${f.message}`);
  return [`InstaDeck view: deck ${deckId} revision ${revision} rendered in the chat and measured. Fix these with apply_ops:`, ...lines, ...moves].join("\n");
}

async function show(deckId: string, revision: number, url: string) {
  const key = `${deckId}@${revision}`;
  if (key === shown) return;
  shown = key;
  presentationUrl = url;
  // Lokální soubor (file://) z chatu otevřít nejde, odkaz má jen hostovaný deck.
  openButton.hidden = !/^https?:/.test(url);
  setStatus("Rendering the deck");
  const res = await app.callServerTool({ name: "get_deck_view", arguments: { deck_id: deckId } });
  if (res.isError) throw new Error("The deck could not be loaded");
  const parts = (res.structuredContent as { parts: DeckParts }).parts;

  player?.destroy();
  player = undefined;
  document.documentElement.lang = parts.lang;
  deckCss.textContent = parts.css;
  if (parts.fontsHref) fonts.href = parts.fontsHref;
  else fonts.removeAttribute("href");
  root.innerHTML = `<main class="stage">${parts.slides}</main><aside class="hud"><div class="hud-count"></div><div class="hud-notes"></div><div class="hud-keys">Arrows or click: next | G: all slides | F: full screen | N: notes</div></aside>`;
  await document.fonts.ready;

  // Měří se koncový stav před připojením playeru, animace by posouvaly obdélníky.
  const raw = window.measureInstaDeck(root);
  const motion = motionFindings(parts.config.measure, window.measureMotionInstaDeck(root, parts.config));
  if (app.getHostCapabilities()?.updateModelContext) {
    await app.updateModelContext({ content: [{ type: "text", text: report(deckId, revision, raw, motion) }], structuredContent: { deckId, revision, overflow: raw, motion } });
  }
  // V chatu bez okna řečníka a bez stahování (sandbox klienta). Stahuje se z odkazu, který otevře Open.
  const canAsk = !!app.getHostCapabilities()?.message;
  player = window.mountInstaDeck({
    root,
    config: parts.config,
    hash: false,
    onFullscreen: () => void toggleFullscreen(),
    controls: {},
    ...(canAsk && {
      onAsk: ({ index, slideId, text }) =>
        void app.sendMessage({ role: "user", content: [{ type: "text", text: `Change slide ${index + 1} of deck ${deckId} (slide_id ${slideId}): ${text}` }] }),
    }),
  });
  setStatus("");
}

app.ontoolinput = () => {
  if (!shown) setStatus("Building the deck");
};

app.ontoolresult = (result) => {
  const data = result.structuredContent as { deckId?: string; revision?: number; presentation?: { url?: string } } | undefined;
  if (result.isError || !data?.deckId || data.revision === undefined || !data.presentation?.url) {
    if (!shown) setStatus("The deck was not saved. Claude is fixing it.");
    return;
  }
  show(data.deckId, data.revision, data.presentation.url).catch((e: unknown) => setStatus(e instanceof Error ? e.message : String(e)));
};

void app.connect();
