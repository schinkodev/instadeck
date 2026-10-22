import { describe, expect, it } from "vitest";
import {
  BLOCK_TYPES,
  BLOCK_INFO,
  DEFAULT_DESIGN,
  DESIGN_PRINCIPLES,
  ENTRANCES,
  GOOGLE_FONTS,
  LAYOUTS,
  MAX_PX,
  MIN_FONT_PX,
  PITCH_BEATS,
  STORYTELLING_PRINCIPLES,
  TYPE_SCALES,
  blockSchema,
  contrastRatio,
  deriveTokens,
  designFromBrand,
  designSchema,
  getLayout,
  mix,
  opSchema,
  parseHex,
  type Design,
} from "@/lib/domain";

describe("color", () => {
  it("computes WCAG contrast", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
    expect(contrastRatio("#FFFFFF", "#FFFFFF")).toBeCloseTo(1, 5);
    // known value: #767676 on white is the AA boundary (4.54)
    expect(contrastRatio("#767676", "#FFFFFF")).toBeCloseTo(4.54, 1);
  });

  it("mixes and rejects invalid hex", () => {
    expect(mix("#000000", "#FFFFFF", 0.5)).toBe("#808080");
    expect(() => parseHex("red")).toThrow();
    expect(() => parseHex("#FFF")).toThrow();
  });
});

describe("tokens", () => {
  it("derives an ascending modular scale with minimum and maximum sizes", () => {
    for (const scale of Object.keys(TYPE_SCALES) as Design["type"]["scale"][]) {
      for (const base of [22, 28, 36]) {
        const t = deriveTokens({ ...DEFAULT_DESIGN, type: { ...DEFAULT_DESIGN.type, base, scale } });
        const s = t.size;
        const order = [s.caption, s.small, s.body, s.lead, s.h3, s.h2, s.h1, s.display];
        expect([...order].sort((a, b) => a - b)).toEqual(order);
        expect(s.caption).toBeGreaterThanOrEqual(MIN_FONT_PX);
        expect(s.h1).toBeLessThanOrEqual(MAX_PX.h1);
        expect(s.display).toBeLessThanOrEqual(MAX_PX.display);
      }
    }
  });

  it("derives tone palettes with readable text on accent", () => {
    const t = deriveTokens(DEFAULT_DESIGN);
    expect(t.palette.inverse.bg).toBe(DEFAULT_DESIGN.colors.fg);
    expect(t.palette.accent.bg).toBe(DEFAULT_DESIGN.colors.accent);
    expect(contrastRatio(t.palette.accent.bg, t.palette.accent.fg)).toBeGreaterThanOrEqual(4.5);
  });

  it("default design passes its own schema", () => {
    expect(designSchema.parse(DEFAULT_DESIGN)).toEqual(DEFAULT_DESIGN);
  });
});

describe("catalog consistency", () => {
  it("layouts have unique ids and every grid area is a zone", () => {
    expect(new Set(LAYOUTS.map((l) => l.id)).size).toBe(LAYOUTS.length);
    for (const l of LAYOUTS) {
      const areas = new Set(l.grid.areas.flatMap((a) => a.split(/\s+/)).filter((a) => a !== "."));
      const zones = new Set(l.zones.map((z) => z.name));
      for (const a of areas) expect(zones, `${l.id}: area ${a}`).toContain(a);
      for (const z of l.zones) {
        if (l.bleed?.zone === z.name) expect(areas.has(z.name), `${l.id}: bleed zone is outside the grid`).toBe(false);
        else expect(areas, `${l.id}: zone ${z.name} has no grid area`).toContain(z.name);
        for (const t of z.accepts) expect(BLOCK_TYPES).toContain(t);
      }
      const cols = l.grid.columns.split(/\s+(?![^(]*\))/).length;
      for (const row of l.grid.areas) expect(row.split(/\s+/).length, `${l.id}: columns`).toBe(cols);
      expect(l.grid.rows.split(/\s+(?![^(]*\))/).length, `${l.id}: rows`).toBe(l.grid.areas.length);
    }
    expect(LAYOUTS.length).toBeGreaterThanOrEqual(20);
  });

  it("every block type is documented and placeable in some layout", () => {
    for (const t of BLOCK_TYPES) {
      expect(BLOCK_INFO[t].purpose.length).toBeGreaterThan(10);
      expect(LAYOUTS.some((l) => l.zones.some((z) => z.accepts.includes(t))), t).toBe(true);
    }
  });

  it("pitch beats reference existing layouts", () => {
    for (const b of PITCH_BEATS) for (const l of b.layouts) expect(getLayout(l), `${b.id}: ${l}`).toBeDefined();
  });

  it("fonts and principles are complete", () => {
    expect(new Set(GOOGLE_FONTS.map((f) => f.family)).size).toBe(GOOGLE_FONTS.length);
    expect(DESIGN_PRINCIPLES.length).toBeGreaterThan(20);
    expect(STORYTELLING_PRINCIPLES.length).toBeGreaterThan(10);
    expect(Object.keys(ENTRANCES)).toContain("rise");
  });
});

describe("schemas", () => {
  it("enforces cognitive limits on lists", () => {
    const items = ["a", "b", "c", "d", "e", "f"];
    expect(blockSchema.safeParse({ type: "bullets", items }).success).toBe(false);
    expect(blockSchema.safeParse({ type: "bullets", items: items.slice(0, 4) }).success).toBe(true);
  });

  it("rejects fonts outside the curated list", () => {
    const bad = { ...DEFAULT_DESIGN, fonts: { ...DEFAULT_DESIGN.fonts, heading: { source: "google", family: "Comic Neue Extra" } } };
    expect(designSchema.safeParse(bad).success).toBe(false);
  });

  it("parses ops", () => {
    const op = opSchema.parse({ op: "update_slide", slide_id: "s1", blocks: { support: null } });
    expect(op.op).toBe("update_slide");
    expect(opSchema.safeParse({ op: "add_slide", slide: { layout: "nope", intent: "x", blocks: {} } }).success).toBe(false);
  });
});

describe("brand", () => {
  it("maps brand colors into the design and keeps typography", () => {
    const d = designFromBrand({ name: "Acme", colors: { primary: "#E4572E", dark: "#1B1B1E" }, logos: [] }, DEFAULT_DESIGN);
    expect(d.colors.accent).toBe("#E4572E");
    expect(d.colors.fg).toBe("#1B1B1E");
    expect(d.colors.bg).toBe("#FFFFFF");
    expect(d.type).toEqual(DEFAULT_DESIGN.type);
    expect(designSchema.safeParse(d).success).toBe(true);
  });
});

describe("narrative frames", () => {
  it("name only existing beats and every beat tells what to ask the user", async () => {
    const { NARRATIVE_FRAMES, PITCH_BEATS, BEAT_IDS } = await import("@/lib/domain");
    for (const f of NARRATIVE_FRAMES) for (const st of f.stages) for (const b of st.beats) expect(BEAT_IDS, `${f.id}/${st.name}`).toContain(b);
    for (const b of PITCH_BEATS) expect(b.askUser.length, b.id).toBeGreaterThan(20);
    // every beat has a place in every frame, so a frame never rejects a beat silently
    for (const f of NARRATIVE_FRAMES) for (const b of BEAT_IDS) expect(f.stages.some((s) => s.beats.includes(b)), `${f.id} lacks ${b}`).toBe(true);
  });
});

describe("composition", () => {
  it("derives the grid from intent and says why a layout cannot take it", async () => {
    const { compositionProblems, getLayout, resolveGrid } = await import("@/lib/domain");
    const textImage = getLayout("text-image")!;
    const points = getLayout("points")!;
    const statement = getLayout("statement")!;
    // Two columns: the split is applied and the larger share goes to the dominant zone.
    expect(resolveGrid(textImage, { split: "1:2" }, undefined).columns).toBe("1fr 2fr");
    expect(resolveGrid(textImage, { split: "1:2", dominant: "body" }, undefined).columns).toBe("2fr 1fr");
    expect(resolveGrid(textImage, { split: "1:1", dominant: "image" }, undefined).columns).toBe("1fr 1fr");
    expect(resolveGrid(textImage, undefined, undefined).columns).toBe(textImage.grid.columns);
    // One column: asymmetric adds an empty lead track, center keeps the grid.
    const asym = resolveGrid(statement, { axis: "asymmetric" }, undefined);
    expect(asym.columns).toBe("0.4fr 1fr");
    expect(asym.areas).toEqual([". statement", ". support"]);
    // Dense one column layouts keep the full width: an explicit asymmetric is an error, a school default is skipped.
    expect(compositionProblems(points, { axis: "asymmetric" })[0]).toContain("squeezed");
    expect(compositionProblems(getLayout("image-full")!, { axis: "center" })).toHaveLength(1);
    expect(resolveGrid(getLayout("cards")!, undefined, { axis: "asymmetric" }).columns).toBe("1fr");
    expect(compositionProblems(textImage, { axis: "asymmetric" })).toEqual([]);
    expect(resolveGrid(statement, { axis: "center" }, undefined)).toMatchObject({ axis: "center", columns: statement.grid.columns });
    // Problems are explicit.
    expect(compositionProblems(points, { split: "1:2" })[0]).toContain("two column");
    expect(compositionProblems(points, { axis: "center" })[0]).toContain("left edge");
    expect(compositionProblems(textImage, { dominant: "nope" })[0]).toContain("Zones:");
    expect(compositionProblems(getLayout("chart-insight")!, { dominant: "title" })[0]).toContain("spans both");
    expect(compositionProblems(getLayout("headline-stat")!, { split: "1:2" })).toHaveLength(1);
    expect(compositionProblems(textImage, { axis: "asymmetric", split: "1:3", dominant: "image" })).toEqual([]);
  });

  it("applies a school default only where the layout can take it", async () => {
    const { getLayout, resolveGrid, schoolComposition } = await import("@/lib/domain");
    const keynote = schoolComposition("keynote");
    expect(keynote).toEqual({ axis: "center" });
    expect(resolveGrid(getLayout("statement")!, undefined, keynote).axis).toBe("center");
    expect(resolveGrid(getLayout("comparison")!, undefined, keynote).axis).toBe("left");
    // The uneven split favors the visual: the image sits in the second column of text-image and the first of image-text.
    expect(resolveGrid(getLayout("text-image")!, undefined, schoolComposition("swiss")).columns).toBe("1fr 2fr");
    expect(resolveGrid(getLayout("image-text")!, undefined, schoolComposition("swiss")).columns).toBe("2fr 1fr");
    expect(resolveGrid(getLayout("chart-insight")!, undefined, schoolComposition("swiss")).columns).toBe("1fr 2fr");
    // A full bleed layout, a quote and a logo grid are built for their width: no school axis moves them.
    for (const id of ["image-full", "quote", "logos", "cards"]) expect(resolveGrid(getLayout(id)!, undefined, schoolComposition("swiss")).columns, id).toBe(getLayout(id)!.grid.columns);
    for (const id of ["image-full", "quote", "logos"]) expect(resolveGrid(getLayout(id)!, undefined, schoolComposition("keynote")).axis, id).toBe("left");
    expect(schoolComposition(undefined)).toBeUndefined();
  });
});

describe("design schools", () => {
  it("use only curated fonts and known type scales, with unique ids", async () => {
    const { DESIGN_SCHOOLS, GOOGLE_FONTS, TYPE_SCALES, findGoogleFont } = await import("@/lib/domain");
    expect(new Set(DESIGN_SCHOOLS.map((s) => s.id)).size).toBe(DESIGN_SCHOOLS.length);
    for (const s of DESIGN_SCHOOLS) {
      for (const f of [...s.type.heading, ...s.type.body]) expect(findGoogleFont(f), `${s.id}: ${f}`).toBeDefined();
      for (const f of s.type.body) expect(findGoogleFont(f)!.category, `${s.id}: body ${f}`).not.toBe("mono");
      expect(Object.keys(TYPE_SCALES), s.id).toContain(s.type.scale);
      expect(findGoogleFont(s.type.heading[0]!)!.weights, `${s.id}: weight`).toContain(s.type.weight);
    }
    expect(GOOGLE_FONTS.length).toBeGreaterThan(0);
  });

  it("create_deck requires a concept, a stored brief does not", async () => {
    const { briefSchema, createBriefSchema } = await import("@/lib/domain");
    const brief = { company: "A", topic: "B", language: "en" };
    expect(briefSchema.safeParse(brief).success).toBe(true);
    expect(createBriefSchema.safeParse(brief).success).toBe(false);
    expect(createBriefSchema.safeParse({ ...brief, concept: { idea: "A quiet editorial deck", avoid: "Clutter", signature: "One rule under every headline" } }).success).toBe(true);
  });
});
