/**
 * Prahy kompozice slidu, které se měří v prohlížeči (measure.js, measureLayoutInstaDeck).
 * Bez zod, aby je mohla importovat MCP App. Principy jsou v principles/design.ts.
 */

export const LAYOUT_LIMITS = {
  /**
   * Aktivní a pasivní bílé místo (Tschichold, Arnheim): prázdno, které obsah rámuje, je záměr. Prázdno,
   * které zbude na jedné straně, působí nedokončeně a vychyluje rovnováhu. Obsah slidu se střední hustotou
   * má sahat aspoň do této části výšky mřížky.
   */
  minFill: 0.6,
  /** Smysluplný kontrast velikostí (Williams): nadpis musí být zjevně větší než text pod ním. */
  minHeadingRatio: 1.5,
} as const;

/** Layouty s nízkou hustotou jsou řídké záměrně (titul, výrok, citát), rovnováha se u nich neměří. */
export const SPARSE_LAYOUTS: readonly string[] = ["title", "title-image", "statement", "section", "headline-stat", "image-full", "quote", "logos", "closing"];

export interface LayoutMeasure {
  slideId: string;
  layout: string;
  /** Spodní hrana obsahu jako podíl výšky mřížky (0 nahoře, 1 dole). */
  fill: number;
  /** Největší písmo nadpisu a největší písmo textu pod ním v px slidu (0, když na slidu není). */
  headingPx: number;
  bodyPx: number;
}
