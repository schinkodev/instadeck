/**
 * Signature of a deck as a render primitive (V009, step 4): one device the engine draws on every slide, so the
 * `signature` the model writes in the concept becomes visible instead of staying a sentence.
 *
 *   rule   a line along one edge of the content: top, bottom or left, hairline or heavy (the Swiss heavy rule)
 *   frame  a line around the slide, hairline or heavy
 *   folio  the slide number in a corner, set in the heading font (editorial page numbers)
 *   band   a strip of brand tint along one edge of the slide
 *   none   no device, also to switch off the default of the school
 *
 * Every primitive sits in the slide margin, outside the grid, so it never touches the content (by construction, like
 * dominance in V009). None takes a color: the rule and the frame use the text color, the folio the muted color and the
 * band a tint of the brand, because the accent is a signal and never decoration.
 * The chapter number set large and the color field behind a moment are slide backgrounds (background, brand visuals).
 *
 * No zod: the module is also bundled into the MCP App.
 */

export const SIGNATURE_KINDS = ["none", "rule", "frame", "folio", "band"] as const;
export const SIGNATURE_EDGES = ["top", "bottom", "left"] as const;
export const SIGNATURE_WEIGHTS = ["hairline", "heavy"] as const;
export const FOLIO_CORNERS = ["top-right", "bottom-right", "bottom-left"] as const;

export type SignatureEdge = (typeof SIGNATURE_EDGES)[number];
export type SignatureWeight = (typeof SIGNATURE_WEIGHTS)[number];
export type FolioCorner = (typeof FOLIO_CORNERS)[number];

export type Signature =
  | { kind: "none" }
  | { kind: "rule"; edge: SignatureEdge; weight?: SignatureWeight }
  | { kind: "frame"; weight?: SignatureWeight }
  | { kind: "folio"; corner?: FolioCorner }
  | { kind: "band"; edge: SignatureEdge };

/** Line width in px on a 1920x1080 slide. A hairline reads as structure, heavy as a mark (Müller-Brockmann's rule). */
export const SIGNATURE_LINE_PX: Record<SignatureWeight, number> = { hairline: 2, heavy: 8 };

/**
 * How far the band moves from the background toward the brand color. A band holds no text, so it may be stronger
 * than a brand visual under text (BRAND_VISUAL_STRENGTH), and it stays a tint, not the signal color.
 */
export const SIGNATURE_BAND_STRENGTH = 0.3;

/** The signature a deck draws: its own, else the default of its school, else none. */
export function resolveSignature(own: Signature | undefined, schoolDefault: Signature | undefined): Signature {
  return own ?? schoolDefault ?? { kind: "none" };
}
