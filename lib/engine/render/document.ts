/**
 * The whole deck as one standalone HTML file.
 *   present: presentation with the player (animation, steps, transitions, notes)
 *   static:  all slides one below another in their final state, without a script (PDF, PNG, measurement)
 */
import {
  deriveTokens,
  findGoogleFont,
  type Deck,
  type FontRef,
} from "@/lib/domain";
import { playerConfig, type PlayerConfig } from "../motion";
import { esc } from "../text";
import type { AssetData } from "./blocks";
import { deckCss, MODE_CSS } from "./css";
import { MEASURE_JS } from "./measure-source";
import { PLAYER_JS } from "./player-source";
import { renderSlide } from "./slide";

export type RenderMode = "present" | "static";


/** Body font weights the deck uses (regular text, semibold labels, bold highlights). */
const BODY_WEIGHTS = [400, 600, 700];

function googleFontsHref(deck: Deck): string | undefined {
  const { heading, body } = deck.design.fonts;
  const want = new Map<string, Set<number>>();
  const add = (f: FontRef, weights: number[]) => {
    if (f.source !== "google") return;
    const face = findGoogleFont(f.family)!;
    const set = want.get(f.family) ?? new Set<number>();
    for (const w of weights) if (face.weights.includes(w)) set.add(w);
    want.set(f.family, set);
  };
  add(heading, [deck.design.type.headingWeight, 500]);
  add(body, BODY_WEIGHTS);
  if (want.size === 0) return undefined;
  const families = [...want.entries()]
    .map(([family, ws]) => `family=${encodeURIComponent(family).replace(/%20/g, "+")}:wght@${[...ws].sort((a, b) => a - b).join(";")}`)
    .join("&");
  return `https://fonts.googleapis.com/css2?${families}&display=block`;
}

function fontFaces(deck: Deck, assets: Record<string, AssetData>): string {
  const refs = [deck.design.fonts.heading, deck.design.fonts.body].filter((f) => f.source === "asset");
  return refs
    .map((f) => {
      if (f.source !== "asset") return "";
      const a = assets[f.assetId];
      if (!a) throw new Error(`Font asset ${f.assetId} is not available to the renderer`);
      return `@font-face{font-family:"${f.family}";src:url(${a.src});font-weight:${f.weight};font-display:block}`;
    })
    .join("\n");
}

/** Parts of the deck for composing somewhere other than a standalone file (MCP App in the chat). */
export interface DeckParts {
  lang: string;
  title: string;
  /** Google Fonts stylesheet, when the deck uses Google fonts. */
  fontsHref?: string;
  /** Deck CSS (fonts from assets, tokens, blocks). Without the display mode CSS. */
  css: string;
  /** <section class="slide"> for every slide. */
  slides: string;
  /** Player configuration (timing, easing, notes). */
  config: PlayerConfig;
}

export function renderDeckParts(deck: Deck, assets: Record<string, AssetData>): DeckParts {
  const tokens = deriveTokens(deck.design);
  return {
    lang: deck.brief.language,
    title: deck.title,
    fontsHref: googleFontsHref(deck),
    css: `${fontFaces(deck, assets)}\n${deckCss(tokens)}`,
    slides: deck.slides.map((s, i) => renderSlide(s, i, { deck, tokens, assets })).join("\n"),
    config: playerConfig(deck),
  };
}

export const HUD_HTML = `<aside class="hud"><div class="hud-count"></div><div class="hud-notes"></div><div class="hud-keys">Arrows or click: next | G: all slides | P: presenter | F: full screen | N: notes</div></aside>`;

export function renderDeckHtml(deck: Deck, assets: Record<string, AssetData>, mode: RenderMode): string {
  const p = renderDeckParts(deck, assets);
  const present = mode === "present";
  // JSON in <script>: the < character is escaped so the text of notes cannot close the tag.
  const config = JSON.stringify(p.config).replace(/</g, "\\u003c");
  return `<!doctype html>
<html lang="${esc(p.lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="generator" content="InstaDeck">
<title>${esc(p.title)}</title>
${p.fontsHref ? `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="${p.fontsHref}">` : ""}
<style>
${p.css}
${MODE_CSS[mode]}
</style>
</head>
<body class="${mode}">
<main class="stage">
${p.slides}
</main>
${present ? `${HUD_HTML}\n<script type="application/json" id="deck-config">${config}</script>\n<script>${PLAYER_JS}
${MEASURE_JS}
mountInstaDeck({ root: document.body, config: JSON.parse(document.getElementById("deck-config").textContent), hash: true, autoplayMs: Number(new URLSearchParams(location.search).get("autoplay")) || 0, controls: { presenter: true, print: true, html: true, pptx: true } });</script>` : ""}
</body>
</html>
`;
}
