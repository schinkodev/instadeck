/**
 * Slide composition thresholds measured in a browser (measure.js, measureLayoutInstaDeck).
 * No zod, so the MCP App can import it. The principles are in principles/design.ts.
 */

export const LAYOUT_LIMITS = {
  /**
   * Active and passive white space (Tschichold, Arnheim): emptiness that frames content is intended. Emptiness
   * left over on one side looks unfinished and throws off the balance. The content of a medium density slide
   * must reach at least this share of the grid height.
   */
  minFill: 0.6,
  /** Meaningful size contrast (Williams): a heading must be clearly larger than the text below it. */
  minHeadingRatio: 1.5,
  /**
   * One dominant element (Williams): on a slide built around one figure (a hero number, the ask) either the figure or the
   * heading wins by this ratio. Two elements of similar size compete and neither leads the eye.
   */
  minDominance: 1.5,
} as const;


/** Low density layouts are sparse on purpose (title, statement, quote), their balance is not measured. */
export const SPARSE_LAYOUTS: readonly string[] = ["title", "title-image", "statement", "section", "headline-stat", "image-full", "quote", "logos", "closing"];

export interface LayoutMeasure {
  slideId: string;
  layout: string;
  /** Bottom edge of the content as a share of the grid height (0 top, 1 bottom). */
  fill: number;
  /** Largest heading font and largest font of the text below it, in slide px (0 when the slide has none). */
  headingPx: number;
  bodyPx: number;
  /** Largest font in a figure zone (Zone.figure: a hero number, the ask), in slide px (0 when the slide has none). */
  figurePx: number;
  /** Zones whose content shares no edge or center line with any other zone. */
  unaligned: string[];
}
