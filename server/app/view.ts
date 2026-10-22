/**
 * MCP App: the deck right in the chat (claude.ai, Claude Desktop). Runs in the client's sandbox.
 *
 * A tool returns deckId and presentation.url. The app loads the rendered parts of the deck with the tool
 * get_deck_view (app only), puts them into the page, measures overflow and motion in the user's
 * browser, sends the result to the model (updateModelContext) and mounts the player with animations.
 * Works the same with the hosted connector and the local server. The Edit slide button sends
 * a message to the chat saying which slide to change and how.
 * Bundled with esbuild into server/app/view-source.ts (npm run gen).
 */
import { App } from "@modelcontextprotocol/ext-apps";
import type { LayoutMeasure } from "@/lib/domain/layout-limits";
import type { MotionOverlap, MotionSample } from "@/lib/domain/motion-limits";
import { MEASURE_JS } from "@/lib/engine/render/measure-source";
import { PLAYER_JS } from "@/lib/engine/render/player-source";
// Directly from modules without zod: the MCP App bundle should stay small.
import { layoutFindings } from "@/lib/engine/validate/layout";
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
    measureMotionInstaDeck(root: HTMLElement, config: unknown): { samples: MotionSample[]; overlaps: MotionOverlap[] };
    measureLayoutInstaDeck(root: HTMLElement): LayoutMeasure[];
  }
}

const frame = document.getElementById("frame")!;
const root = document.getElementById("deck")!;
const status = document.getElementById("status")!;
const deckCss = document.getElementById("deck-css")!;
const fonts = document.getElementById("deck-fonts") as HTMLLinkElement;
const openButton = document.getElementById("open") as HTMLButtonElement;

// The player and measurement are classic scripts (the same as in a standalone deck.html), inserted once.
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

function report(deckId: string, revision: number, raw: OverflowMeasure[], motion: { rule: string; message: string; slideId?: string }[]): string {
  if (raw.length === 0 && motion.length === 0) return `InstaDeck view: deck ${deckId} revision ${revision} rendered in the chat, every slide fits, the composition is balanced and the motion matches its intensity.`;
  const lines = raw.map((o) =>
    o.axis === "y"
      ? `- error overflow, slide ${o.slideId}${o.zone ? `, zone ${o.zone}` : ""}: content is ${o.px}px taller than its space`
      : `- error overflow, slide ${o.slideId}${o.zone ? `, zone ${o.zone}` : ""}: content is ${o.px}px wider than its zone`,
  );
  const moves = motion.map((f) => `- warning ${f.rule}${f.slideId ? `, slide ${f.slideId}` : ""}: ${f.message}`);
  return [`InstaDeck view: deck ${deckId} revision ${revision} rendered in the chat and measured. Fix these with apply_ops:`, ...lines, ...moves].join("\n");
}

async function show(deckId: string, revision: number, url: string) {
  const key = `${deckId}@${revision}`;
  if (key === shown) return;
  shown = key;
  presentationUrl = url;
  // A local file (file://) cannot be opened from the chat, only a hosted deck has a link.
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
  // Measuring text over an image reads its pixels, so the image must be decoded first.
  await Promise.all(Array.from(root.querySelectorAll("img"), (img) => img.decode().catch(() => undefined)));

  // The final state is measured before the player mounts, animation would move the rectangles.
  const raw = window.measureInstaDeck(root);
  const measured = window.measureMotionInstaDeck(root, parts.config);
  const motion = [...layoutFindings(window.measureLayoutInstaDeck(root)), ...motionFindings(parts.config.measure, measured.samples, measured.overlaps)];
  if (app.getHostCapabilities()?.updateModelContext) {
    await app.updateModelContext({ content: [{ type: "text", text: report(deckId, revision, raw, motion) }], structuredContent: { deckId, revision, overflow: raw, motion } });
  }
  // In the chat no presenter window and no downloads (client sandbox). Downloads come from the link that Open opens.
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
