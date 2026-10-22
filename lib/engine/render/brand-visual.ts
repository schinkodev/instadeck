/**
 * Brand visuals (V008, the image layer): a slide background drawn from the palette of the slide, so a deck without
 * photos looks deliberately typographic instead of empty. Deterministic, no stock and no generated images.
 *
 * Only plain boxes and one line of text, in solid colors: the PowerPoint snapshot reads the same DOM, so the
 * background exports as shapes and text with no special case.
 */
import { DEFAULT_IMAGE_OVERLAY, chapterNumbers, mix, withAlpha, type Background, type Deck, type Palette, type Slide } from "@/lib/domain";
import type { AssetData } from "./blocks";
import { esc } from "../text";

/**
 * How far the visual moves from the background toward the ink. Small enough that text on top keeps its contrast
 * (checked as background-contrast), large enough to read as a shape (figure and ground).
 */
export const BRAND_VISUAL_STRENGTH = 0.1;

/** Width of the geometry line in pixels: thin enough to stay a signal, wide enough to survive a projector. */
export const BRAND_LINE_WIDTH = 12;

/**
 * Colors of the visual: the accent, or the foreground when the slide itself is the accent. `tint` is for shapes text may
 * cross, `ink` the full color for a line that stays outside the margins.
 */
export function brandColors(palette: Palette, accentSlide: boolean): { tint: string; ink: string } {
  const ink = accentSlide ? palette.fg : palette.accent;
  return { tint: mix(palette.bg, ink, BRAND_VISUAL_STRENGTH), ink };
}

/** An image under the content with an overlay in the slide color. The overlay is what keeps text legible, the browser measures it. */
export function renderImageBackground(background: Extract<Background, { type: "image" }>, assets: Record<string, AssetData>, palette: Palette): string {
  const a = assets[background.assetId];
  if (!a) throw new Error(`Asset ${background.assetId} is not available to the renderer`);
  const pos = background.focus ? ` style="object-position:${(background.focus.x * 100).toFixed(1)}% ${(background.focus.y * 100).toFixed(1)}%"` : "";
  const overlay = background.overlay ?? DEFAULT_IMAGE_OVERLAY;
  return `<div class="bg-image" aria-hidden="true"><img src="${a.src}" data-asset="${esc(background.assetId)}" alt=""${pos}/><div class="bg-overlay" style="background:${withAlpha(palette.bg, overlay)}"></div></div>`;
}

/** The visual layer, placed behind the grid. Positions alternate with the slide index so neighboring slides do not repeat. */
export function renderBrandVisual(background: Extract<Background, { type: "brand" }>, deck: Deck, slide: Slide, index: number, palette: Palette): string {
  const { tint, ink } = brandColors(palette, slide.tone === "accent");
  const right = index % 2 === 0;
  switch (background.visual) {
    case "numeral": {
      const label = String(chapterNumbers(deck.slides).get(slide.id) ?? 0).padStart(2, "0");
      return `<div class="brand-visual brand-numeral" aria-hidden="true"><div class="brand-numeral-text" style="color:${tint};${right ? "right" : "left"}:72px">${esc(label)}</div></div>`;
    }
    case "field": {
      return `<div class="brand-visual brand-field" aria-hidden="true"><div style="background:${tint};${right ? "right" : "left"}:0;width:640px;top:0;height:1080px"></div></div>`;
    }
    case "geometry": {
      // One thin line along the edge, outside the margins: it marks the slide without competing with the title.
      return `<div class="brand-visual brand-geometry" aria-hidden="true"><div style="background:${ink};${right ? "right" : "left"}:0;width:${BRAND_LINE_WIDTH}px;top:0;height:1080px"></div></div>`;
    }
  }
}
