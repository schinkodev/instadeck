/**
 * Scoring of the measured composition (measure.js, measureLayoutInstaDeck): passive white space and size contrast.
 * Runs locally after measurement in Chromium and in the MCP App, so it imports only modules without zod.
 */
import { LAYOUT_LIMITS, SPARSE_LAYOUTS, type LayoutMeasure } from "@/lib/domain/layout-limits";
import type { Finding } from "./rules";

export function layoutFindings(measures: LayoutMeasure[]): Finding[] {
  const out: Finding[] = [];
  for (const m of measures) {
    if (!SPARSE_LAYOUTS.includes(m.layout) && m.fill < LAYOUT_LIMITS.minFill) {
      out.push({
        severity: "warning",
        rule: "layout-balance",
        slideId: m.slideId,
        message: `Content ends at ${Math.round(m.fill * 100)}% of the slide height and leaves the lower part empty, so the slide looks unfinished. Give the argument a visual (stats, cards, chart, image), split it into a statement slide, or add the evidence that is missing`,
      });
    }
    if (m.headingPx > 0 && m.bodyPx > 0 && m.headingPx / m.bodyPx < LAYOUT_LIMITS.minHeadingRatio) {
      out.push({
        severity: "warning",
        rule: "type-contrast",
        slideId: m.slideId,
        message: `The heading (${m.headingPx}px) is only ${(m.headingPx / m.bodyPx).toFixed(2)}x the text below it (${m.bodyPx}px). Make the difference obvious: a larger heading level, a smaller body size or a larger type scale`,
      });
    }
    if (m.headingPx > 0 && m.figurePx > 0) {
      const ratio = Math.max(m.headingPx, m.figurePx) / Math.min(m.headingPx, m.figurePx);
      if (ratio < LAYOUT_LIMITS.minDominance) {
        const fix =
          m.layout === "closing"
            ? "a display heading as the callback with the ask below it, or a short h1 label above a large ask"
            : "a smaller heading level (h1 or h2) so the number leads";
        out.push({
          severity: "warning",
          rule: "layout-dominance",
          slideId: m.slideId,
          message: `The heading (${m.headingPx}px) and the figure (${m.figurePx}px) are close in size and compete. Let one lead: ${fix}`,
        });
      }
    }
    if (m.dominant && m.dominant.ratio < LAYOUT_LIMITS.minZoneDominance) {
      out.push({
        severity: "warning",
        rule: "composition-dominance",
        slideId: m.slideId,
        message: `The zone "${m.dominant.zone}" is declared dominant but its content is only ${m.dominant.ratio.toFixed(2)}x the largest other zone, so it does not lead. Make its content larger, or declare the zone that does lead`,
      });
    }
    if (m.unaligned.length) {
      out.push({
        severity: "warning",
        rule: "layout-alignment",
        slideId: m.slideId,
        message: `The content of ${m.unaligned.map((z) => `"${z}"`).join(", ")} shares no edge or center line with the rest of the slide, so it floats. Choose a layout whose zones line up, or drop the zone`,
      });
    }
  }
  return out;
}
