/**
 * Brand visuals (V008, the image layer): a slide background drawn from the palette of the slide, so a deck without
 * photos looks deliberately typographic instead of empty. Deterministic, no stock and no generated images.
 *
 * Only plain boxes, circles and one line of text, in solid colors: the PowerPoint snapshot reads the same DOM, so the
 * background exports as shapes and text with no special case.
 */
import { chapterNumbers, mix, type Background, type Deck, type Palette, type Slide } from "@/lib/domain";
import { esc } from "../text";

/**
 * How far the visual moves from the background toward the ink. Small enough that text on top keeps its contrast
 * (checked as background-contrast), large enough to read as a shape (figure and ground).
 */
export const BRAND_VISUAL_STRENGTH = 0.1;

/** Colors of the visual: the accent, or the foreground when the slide itself is the accent. `solid` is the one small, stronger shape. */
export function brandColors(palette: Palette, accentSlide: boolean): { tint: string; solid: string } {
  const ink = accentSlide ? palette.fg : palette.accent;
  return { tint: mix(palette.bg, ink, BRAND_VISUAL_STRENGTH), solid: mix(palette.bg, ink, BRAND_VISUAL_STRENGTH * 1.6) };
}

/** The visual layer, placed behind the grid. Positions alternate with the slide index so neighboring slides do not repeat. */
export function renderBrandVisual(background: Background, deck: Deck, slide: Slide, index: number, palette: Palette): string {
  const { tint, solid } = brandColors(palette, slide.tone === "accent");
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
      const side = right ? "right" : "left";
      return `<div class="brand-visual brand-geometry" aria-hidden="true"><div class="brand-circle" style="background:${tint};${side}:-160px;bottom:-200px;width:880px;height:880px;border-radius:440px"></div><div style="background:${solid};${side}:640px;bottom:96px;width:120px;height:120px"></div></div>`;
    }
  }
}
