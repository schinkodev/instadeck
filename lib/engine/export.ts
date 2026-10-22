/**
 * Measurement and exports over static HTML (the final state of every slide).
 */
import type { Deck, MotionSample } from "@/lib/domain";
import type { LayoutMeasure } from "@/lib/domain/layout-limits";
import { withPage } from "./browser";
import type { AssetData } from "./render/blocks";
import { playerConfig } from "./motion";
import { buildPptx } from "./pptx";
import { renderDeckHtml } from "./render/document";
import { MEASURE_JS } from "./render/measure-source";
import type { SlideSnapshot } from "./snapshot";
import { layoutFindings } from "./validate/layout";
import { motionFindings } from "./validate/motion";
import type { Finding } from "./validate/rules";

export interface OverflowMeasure {
  slideId: string;
  zone?: string;
  px: number;
  axis: "x" | "y";
}

/** Measurement result (measure.js) as validation findings. */
export function overflowFindings(raw: OverflowMeasure[]): Finding[] {
  return raw.map((o) => ({
    severity: "error" as const,
    rule: "overflow",
    slideId: o.slideId,
    ...(o.zone ? { zone: o.zone } : {}),
    message:
      o.axis === "y"
        ? `Content is ${o.px}px taller than the space it has. Shorten the text, remove an item, or pick a layout with more room`
        : `Content is ${o.px}px wider than its zone. A long word or number does not fit`,
  }));
}

/**
 * Measurement in Chromium over static HTML: content overflow, composition (balance, size contrast) and motion (sampling every used
 * entrance and transition against the deck intensity).
 */
export async function measureDeck(deck: Deck, assets: Record<string, AssetData>): Promise<Finding[]> {
  const html = renderDeckHtml(deck, assets, "static");
  const config = playerConfig(deck);
  const raw = await withPage(
    html,
    (page) =>
      page.evaluate(`${MEASURE_JS}\n({ overflow: measureInstaDeck(document), layout: measureLayoutInstaDeck(document), motion: measureMotionInstaDeck(document.body, ${JSON.stringify(config)}) })`) as Promise<{
        overflow: OverflowMeasure[];
        layout: LayoutMeasure[];
        motion: MotionSample[];
      }>,
  );
  return [...overflowFindings(raw.overflow), ...layoutFindings(raw.layout), ...motionFindings(config.measure, raw.motion)];
}

/** Snapshot of the rendered slides in Chromium (static HTML: final state, scale 1). */
export async function snapshotDeck(deck: Deck, assets: Record<string, AssetData>): Promise<SlideSnapshot[]> {
  const html = renderDeckHtml(deck, assets, "static");
  return withPage(html, (page) => page.evaluate(`${MEASURE_JS}\nsnapshotInstaDeck(document.querySelectorAll(".slide"))`) as Promise<SlideSnapshot[]>);
}

/** PPTX locally: geometry from Chromium, the file from the snapshot and the deck. */
export async function exportPptx(deck: Deck, assets: Record<string, AssetData>): Promise<Uint8Array> {
  return buildPptx(deck, await snapshotDeck(deck, assets), assets);
}

export async function exportPdf(deck: Deck, assets: Record<string, AssetData>): Promise<Uint8Array> {
  const html = renderDeckHtml(deck, assets, "static");
  return withPage(html, (page) => page.pdf({ printBackground: true, preferCSSPageSize: true }));
}

/** PNG of slides (indexes from 0). scale 0.5 gives 960x540. */
export async function renderPng(deck: Deck, assets: Record<string, AssetData>, indexes: number[], scale = 0.5): Promise<Uint8Array[]> {
  const html = renderDeckHtml(deck, assets, "static");
  return withPage(
    html,
    async (page) => {
      const out: Uint8Array[] = [];
      for (const i of indexes) {
        const el = await page.$(`#slide-${i + 1}`);
        if (!el) throw new Error(`Slide ${i + 1} does not exist`);
        out.push(await el.screenshot({ type: "png" }));
      }
      return out;
    },
    { scale },
  );
}
