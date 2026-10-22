/** PowerPoint from a snapshot of rendered slides: assembly without a browser, schema of the input from the browser. */
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { buildPptx, exportRequestSchema, type SlideSnapshot } from "@/lib/engine";
import { sampleDeck } from "./fixtures/sample-deck";

const text = (t: string, extra: Partial<Record<string, unknown>> = {}) => ({
  kind: "text" as const,
  x: 144,
  y: 120,
  w: 900,
  h: 140,
  lines: 1,
  align: "left" as const,
  lineHeight: 70,
  runs: [{ text: t, font: "Manrope", size: 64, color: "111111", bold: true, italic: false, spacing: -1.3, upper: false }],
  ...extra,
});

function snapshotFor(deck = sampleDeck()): SlideSnapshot[] {
  return deck.slides.map((s) => ({ slideId: s.id, background: "FAF9F6", items: [text(`Slide ${s.id}`)] }));
}

async function unzip(bytes: Uint8Array) {
  const zip = await JSZip.loadAsync(bytes);
  const files = Object.keys(zip.files);
  const read = (name: string) => zip.file(name)!.async("string");
  return { files, read };
}

describe("pptx", () => {
  it("builds one editable slide per deck slide with notes", async () => {
    const deck = sampleDeck();
    deck.slides[2]!.notes = "Pause after the number.";
    const { files, read } = await unzip(await buildPptx(deck, snapshotFor(deck), {}));
    expect(files.filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f))).toHaveLength(deck.slides.length);
    const slide = await read("ppt/slides/slide3.xml");
    expect(slide).toContain(`Slide ${deck.slides[2]!.id}`);
    expect(slide).toContain('typeface="Manrope"');
    expect(slide).toContain('wrap="none"');
    expect(files.some((f) => f.startsWith("ppt/notesSlides/"))).toBe(true);
    const notes = await Promise.all(files.filter((f) => /^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(f)).map(read));
    expect(notes.some((n) => n.includes("Pause after the number."))).toBe(true);
  });

  it("draws charts as native charts from the deck data", async () => {
    const deck = sampleDeck();
    const at = deck.slides.findIndex((s) => Object.values(s.blocks).some((b) => b.type === "chart"));
    const zone = Object.entries(deck.slides[at]!.blocks).find(([, b]) => b.type === "chart")![0];
    const snap = snapshotFor(deck);
    snap[at]!.items.push({ kind: "chart", x: 700, y: 300, w: 1000, h: 600, zone });
    const { files } = await unzip(await buildPptx(deck, snap, {}));
    expect(files.some((f) => /^ppt\/charts\/chart\d+\.xml$/.test(f))).toBe(true);
  });

  it("draws a waterfall as a stacked chart on an invisible base, and stacked as stacked", async () => {
    for (const kind of ["waterfall", "stacked"] as const) {
      const deck = sampleDeck();
      const at = deck.slides.findIndex((s) => Object.values(s.blocks).some((b) => b.type === "chart"));
      const zone = Object.entries(deck.slides[at]!.blocks).find(([, b]) => b.type === "chart")![0];
      deck.slides[at]!.blocks[zone] =
        kind === "waterfall"
          ? { type: "chart", kind, categories: ["2023", "Robotics", "FX", "2024"], series: [{ name: "Revenue", values: [540, 48, -2, 586] }] }
          : { type: "chart", kind, categories: ["Q1", "Q2"], series: [{ name: "A", values: [1, 2] }, { name: "B", values: [3, 4] }] };
      const snap = snapshotFor(deck);
      snap[at]!.items.push({ kind: "chart", x: 700, y: 300, w: 1000, h: 600, zone });
      const { files, read } = await unzip(await buildPptx(deck, snap, {}));
      const chart = await read(files.find((f) => /^ppt\/charts\/chart\d+\.xml$/.test(f))!);
      expect(chart, kind).toContain('<c:grouping val="stacked"/>');
      // Robotics stojí na základně 540 (start), FX na 586 (po Robotics 588 minus 2).
      if (kind === "waterfall") for (const v of ["540", "586"]) expect(chart.split(`<c:v>${v}</c:v>`).length - 1, v).toBeGreaterThanOrEqual(2);
    }
  });

  it("refuses a snapshot that misses a slide or points to a missing block", async () => {
    const deck = sampleDeck();
    await expect(buildPptx(deck, snapshotFor(deck).slice(1), {})).rejects.toThrow(/measure the current revision/i);
    const snap = snapshotFor(deck);
    snap[0]!.items.push({ kind: "table", x: 0, y: 0, w: 10, h: 10, zone: "title" });
    await expect(buildPptx(deck, snap, {})).rejects.toThrow(/no table/);
  });

  it("accepts only well formed snapshots from a browser", () => {
    const ok = { revision: 3, slides: [{ slideId: "s1", background: "FFFFFF", items: [text("x")] }] };
    expect(exportRequestSchema.safeParse(ok).success).toBe(true);
    expect(exportRequestSchema.safeParse({ ...ok, slides: [{ ...ok.slides[0], background: "#FFF" }] }).success).toBe(false);
    expect(exportRequestSchema.safeParse({ ...ok, slides: [{ ...ok.slides[0], items: [{ ...text("x"), onclick: "x" }] }] }).success).toBe(false);
    expect(exportRequestSchema.safeParse({ ...ok, slides: [] }).success).toBe(false);
  });
});
