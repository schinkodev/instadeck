/**
 * Hodnocení změřené kompozice (measure.js, measureLayoutInstaDeck): pasivní bílé místo a kontrast velikostí.
 * Běží lokálně po měření v Chromiu i v MCP App, proto importuje jen moduly bez zod.
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
  }
  return out;
}
