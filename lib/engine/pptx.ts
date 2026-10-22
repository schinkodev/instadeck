/**
 * PPTX from a snapshot of rendered slides (snapshot.ts) and from the deck. No browser: the browser supplied
 * the geometry, here the file is only assembled. Text stays editable, charts are native PowerPoint
 * charts from the deck data, tables native tables, speaker notes come along. Animation does not.
 *
 * Slide 1920x1080 px = 13.333 x 7.5 inches: 144 px per inch, 1 px = 0.5 pt.
 */
import PptxGenJS from "pptxgenjs";
import { deriveTokens, type Block, type Deck, type Palette } from "@/lib/domain";
import type { AssetData } from "./render/blocks";
import type { SlideSnapshot, SnapshotItem } from "./snapshot";

const PX_PER_INCH = 144;
const inch = (px: number) => px / PX_PER_INCH;
const pt = (px: number) => Math.round(px * 0.5 * 10) / 10;
const hex = (c: string) => c.replace("#", "").toUpperCase();
const transparency = (alpha: number) => Math.round((1 - alpha) * 100);

type Pptx = InstanceType<typeof PptxGenJS>;
type PptxSlide = ReturnType<Pptx["addSlide"]>;
type Rect = { x: number; y: number; w: number; h: number };
const pos = (r: Rect) => ({ x: inch(r.x), y: inch(r.y), w: inch(r.w), h: inch(r.h) });

/** Series color as in HTML (render/blocks.ts): with a highlight accent and line, otherwise accent, second accent, muted. */
function chartColors(b: Extract<Block, { type: "chart" }>, p: Palette): string[] {
  if (b.highlight !== undefined && (b.kind === "column" || b.kind === "bar")) return b.categories.map((_, i) => hex(i === b.highlight ? p.accent : p.line));
  if (b.kind === "donut") return b.categories.map((_, i) => hex(i === b.highlight ? p.accent : [p.accent, p.accent2, p.muted, p.line, p.fg, p.surface][i % 6]!));
  if (b.highlight !== undefined && b.kind === "line") return b.series.map((_, i) => hex(i === 0 ? p.accent : p.line));
  return [p.accent, p.accent2, p.muted].map(hex);
}

function addChart(pptx: Pptx, s: PptxSlide, b: Extract<Block, { type: "chart" }>, r: Rect, p: Palette, fonts: { body: string; size: number }) {
  const data = b.series.map((x) => ({ name: x.name, labels: b.categories, values: x.values }));
  const type = b.kind === "line" ? pptx.ChartType.line : b.kind === "donut" ? pptx.ChartType.doughnut : pptx.ChartType.bar;
  const single = b.series.length === 1;
  s.addChart(type, data, {
    ...pos(r),
    barDir: b.kind === "bar" ? "bar" : "col",
    chartColors: chartColors(b, p),
    // One series with a highlight: colors per column, not per series.
    ...(single && b.highlight !== undefined && b.kind !== "line" && { varyColors: true }),
    showLegend: b.kind === "donut" || !single,
    legendPos: b.kind === "donut" ? "r" : "t",
    legendFontFace: fonts.body,
    legendFontSize: fonts.size,
    legendColor: hex(p.muted),
    showValue: b.kind !== "line",
    dataLabelFontFace: fonts.body,
    dataLabelFontSize: fonts.size,
    dataLabelColor: hex(b.kind === "donut" ? p.bg : p.fg),
    dataLabelPosition: b.kind === "donut" ? "ctr" : "outEnd",
    ...(b.unit && { dataLabelFormatCode: `#,##0.##"${b.unit.replace(/"/g, "")}"` }),
    catAxisLabelColor: hex(p.muted),
    catAxisLabelFontFace: fonts.body,
    catAxisLabelFontSize: fonts.size,
    catAxisLineShow: true,
    catAxisLineColor: hex(p.line),
    valAxisHidden: true,
    valGridLine: { style: "none" },
    barGapWidthPct: 60,
    lineSize: 3,
    lineDataSymbolSize: 8,
    holeSize: 62,
  });
}

type Border = { type: "none" } | { pt: number; color: string };
/** Cell border: only the bottom line (order top, right, bottom, left). */
const bottomRule = (width: number, color: string): [Border, Border, Border, Border] => [{ type: "none" }, { type: "none" }, { pt: width, color }, { type: "none" }];

function addTable(s: PptxSlide, b: Extract<Block, { type: "table" }>, r: Rect, p: Palette, fonts: { body: string; small: number; body_: number }) {
  const hl = (i: number) => b.highlightColumn === i;
  const head = b.columns.map((c, i) => ({
    text: c,
    options: { bold: true, fontSize: fonts.small, color: hex(hl(i) ? p.accent : p.muted), border: bottomRule(1.5, hex(p.fg)) },
  }));
  const rows = b.rows.map((row) =>
    row.map((cell, i) => ({
      text: cell.replace(/==(.+?)==/g, "$1"),
      options: { bold: hl(i), color: hex(hl(i) ? p.accent : p.fg), border: bottomRule(0.75, hex(p.line)) },
    })),
  );
  s.addTable([head, ...rows], { ...pos(r), fontFace: fonts.body, fontSize: fonts.body_, color: hex(p.fg), margin: [4, 6, 4, 0], valign: "middle" });
}

function addItem(pptx: Pptx, s: PptxSlide, it: SnapshotItem, ctx: { slide: Deck["slides"][number]; palette: Palette; assets: Record<string, AssetData>; fonts: { body: string; size: number; small: number; body_: number } }) {
  switch (it.kind) {
    case "box": {
      const shape = it.ellipse ? pptx.ShapeType.ellipse : it.radius > 0 ? pptx.ShapeType.roundRect : pptx.ShapeType.rect;
      s.addShape(shape, {
        ...pos(it),
        fill: it.fill ? { color: it.fill.color, transparency: transparency(it.fill.alpha) } : { type: "none" },
        line: it.line ? { color: it.line.color, width: pt(it.line.width), transparency: transparency(it.line.alpha) } : { type: "none" },
        ...(shape === pptx.ShapeType.roundRect && { rectRadius: Math.min(1, it.radius / (Math.min(it.w, it.h) / 2)) }),
      });
      return;
    }
    case "line": {
      const x = Math.min(it.x1, it.x2);
      const y = Math.min(it.y1, it.y2);
      s.addShape(pptx.ShapeType.line, { x: inch(x), y: inch(y), w: inch(Math.abs(it.x2 - it.x1)), h: inch(Math.abs(it.y2 - it.y1)), line: { color: it.color, width: pt(it.width) } });
      return;
    }
    case "text": {
      const runs = it.runs
        .filter((r) => r.text)
        .map((r) => ({
          text: r.upper ? r.text.toUpperCase() : r.text,
          options: { fontFace: r.font, fontSize: pt(r.size), color: r.color, bold: r.bold, italic: r.italic, ...(r.spacing && { charSpacing: pt(r.spacing) }) },
        }));
      if (!runs.length) return;
      // Text starts on the first line of the box, without inner margins and without autofit. What the browser
      // set on one line stays on one line even with different font metrics.
      s.addText(runs, { ...pos(it), margin: 0, valign: "top", align: it.align, lineSpacing: pt(it.lineHeight), fit: "none", wrap: it.lines > 1, paraSpaceBefore: 0, paraSpaceAfter: 0 });
      return;
    }
    case "image": {
      const a = ctx.assets[it.asset];
      if (!a) throw new Error(`Asset ${it.asset} is not available to the exporter`);
      const data = a.src.replace(/^data:/, "");
      const box = pos(it);
      const ratio = it.nw && it.nh ? it.nh / it.nw : it.h / it.w;
      s.addImage({
        data,
        ...box,
        // sizing computes the crop from the image aspect ratio: w and h are the image dimensions, sizing is the frame.
        w: box.w,
        h: box.w * ratio,
        sizing: { type: it.fit, w: box.w, h: box.h },
        ...(it.radius >= Math.min(it.w, it.h) / 2 - 0.5 && { rounding: true }),
      });
      return;
    }
    case "chart": {
      const b = ctx.slide.blocks[it.zone];
      if (b?.type !== "chart") throw new Error(`Slide ${ctx.slide.id} has no chart in zone ${it.zone}`);
      addChart(pptx, s, b, it, ctx.palette, ctx.fonts);
      return;
    }
    case "table": {
      const b = ctx.slide.blocks[it.zone];
      if (b?.type !== "table") throw new Error(`Slide ${ctx.slide.id} has no table in zone ${it.zone}`);
      addTable(s, b, it, ctx.palette, ctx.fonts);
      return;
    }
    case "scrim": {
      // Protective gradient (in HTML linear, 74% black on the left, transparent from 82%) as stripes:
      // PowerPoint through pptxgenjs has no gradient fill.
      const bands = 32;
      for (let i = 0; i < bands; i++) {
        const t = (i + 0.5) / bands;
        const at = t * 0.82;
        const alpha = at < 0.5 ? 0.74 - (0.34 * at) / 0.5 : 0.4 * (1 - (at - 0.5) / 0.32);
        s.addShape(pptx.ShapeType.rect, { x: inch(it.x + it.w * 0.82 * (i / bands)), y: inch(it.y), w: inch((it.w * 0.82) / bands), h: inch(it.h), fill: { color: "000000", transparency: transparency(alpha) }, line: { type: "none" } });
      }
      return;
    }
  }
}

export async function buildPptx(deck: Deck, snapshot: SlideSnapshot[], assets: Record<string, AssetData>): Promise<Uint8Array> {
  const tokens = deriveTokens(deck.design);
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "INSTADECK", width: 1920 / PX_PER_INCH, height: 1080 / PX_PER_INCH });
  pptx.layout = "INSTADECK";
  pptx.title = deck.title;
  pptx.company = deck.brief.company;
  const fonts = { body: tokens.fonts.body.family, size: pt(tokens.size.small), small: pt(tokens.size.small), body_: pt(tokens.size.body) };
  const bySlide = new Map(snapshot.map((s) => [s.slideId, s]));
  for (const slide of deck.slides) {
    const snap = bySlide.get(slide.id);
    if (!snap) throw new Error(`The rendered layout of slide ${slide.id} is missing. Measure the current revision of the deck again`);
    const s = pptx.addSlide();
    s.background = { color: snap.background };
    const ctx = { slide, palette: tokens.palette[slide.tone ?? "default"], assets, fonts };
    for (const it of snap.items) addItem(pptx, s, it, ctx);
    if (slide.notes) s.addNotes(slide.notes);
  }
  return (await pptx.write({ outputType: "uint8array" })) as Uint8Array;
}
