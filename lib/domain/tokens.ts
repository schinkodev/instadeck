/**
 * Design system decku. Model volí generativní parametry (barvy, písma, základ a poměr škály,
 * hustotu), doména z nich odvodí konkrétní hodnoty. Žádné ad hoc velikosti (princip modular-scale).
 */
import { z } from "zod";
import { bestContrast, isHex, mix } from "./color";
import { fontRefSchema, type FontRef } from "./fonts";

export const SLIDE = { width: 1920, height: 1080 } as const;

const hex = z.string().refine(isHex, "Expected #RRGGBB");

/** Pojmenované modulární škály (Bringhurst, Brown). */
export const TYPE_SCALES = {
  "minor-third": 1.2,
  "major-third": 1.25,
  "perfect-fourth": 1.333,
  "augmented-fourth": 1.414,
  "perfect-fifth": 1.5,
  golden: 1.618,
} as const;
export type TypeScaleName = keyof typeof TYPE_SCALES;

/** Hustota mění okraje a mezery, ne velikost písma. */
export const DENSITY = { airy: 1.25, balanced: 1, compact: 0.8 } as const;

export const designSchema = z.strictObject({
  colors: z.strictObject({
    bg: hex.describe("Main background"),
    fg: hex.describe("Main text"),
    accent: hex.describe("Signal color: key numbers, highlights, chart focus. Never for decoration"),
    accent2: hex.describe("Secondary chart and diagram color"),
    muted: hex.describe("Secondary text: labels, captions, detail"),
    surface: hex.describe("Card and panel background, close to bg"),
  }),
  fonts: z.strictObject({ heading: fontRefSchema, body: fontRefSchema }),
  type: z.strictObject({
    base: z.number().min(22).max(36).describe("Body size in px on a 1920x1080 slide"),
    scale: z.enum(Object.keys(TYPE_SCALES) as [TypeScaleName, ...TypeScaleName[]]),
    headingWeight: z.number().int().min(300).max(900),
    headingTracking: z.number().min(-0.05).max(0.05).describe("Letter spacing of headings in em"),
    headingCase: z.enum(["none", "upper"]),
  }),
  space: z.strictObject({
    unit: z.number().min(8).max(16).describe("Spacing unit in px, every gap is a multiple"),
    density: z.enum(Object.keys(DENSITY) as [keyof typeof DENSITY, ...(keyof typeof DENSITY)[]]),
  }),
  shape: z.strictObject({
    radius: z.number().min(0).max(32).describe("Corner radius of cards, images and charts in px"),
    cards: z.enum(["flat", "outline", "filled"]).describe("How cards and panels are drawn"),
  }),
});
export type Design = z.infer<typeof designSchema>;

/** Tón slidu: hlavní barvy, prohozené, nebo akcentová plocha (pro silné momenty jako ask). */
export const TONES = ["default", "inverse", "accent"] as const;
export type Tone = (typeof TONES)[number];

export interface Palette {
  bg: string;
  fg: string;
  accent: string;
  accent2: string;
  muted: string;
  surface: string;
  line: string;
}

export interface Tokens {
  palette: Record<Tone, Palette>;
  fonts: { heading: FontRef; body: FontRef };
  size: { display: number; h1: number; h2: number; h3: number; lead: number; body: number; small: number; caption: number; stat: number };
  lineHeight: { heading: number; body: number };
  heading: { weight: number; tracking: number; case: "none" | "upper" };
  space: { xs: number; sm: number; md: number; lg: number; xl: number; xxl: number };
  margin: { x: number; y: number };
  radius: number;
  cards: Design["shape"]["cards"];
}

/** Nejmenší přípustné písmo na slidu 1920x1080 (čitelnost z poslední řady). */
export const MIN_FONT_PX = 18;

/** Strop velkých stupňů škály: u velkých poměrů by jinak nadpis nevešel na šířku 1920 px. */
export const MAX_PX = { h1: 104, display: 180, stat: 200 } as const;

const round = (n: number) => Math.round(n);

function palettes(c: Design["colors"]): Record<Tone, Palette> {
  const base: Palette = { ...c, line: mix(c.bg, c.fg, 0.14) };
  const inverse: Palette = {
    bg: c.fg,
    fg: c.bg,
    accent: c.accent,
    accent2: c.accent2,
    muted: mix(c.fg, c.bg, 0.62),
    surface: mix(c.fg, c.bg, 0.08),
    line: mix(c.fg, c.bg, 0.18),
  };
  // Na akcentové ploše je text ta z hlavních barev, která má vůči akcentu vyšší kontrast.
  const onAccent = bestContrast(c.accent, [c.fg, c.bg]);
  const offAccent = onAccent === c.fg ? c.bg : c.fg;
  const accent: Palette = {
    bg: c.accent,
    fg: onAccent,
    accent: onAccent,
    accent2: mix(c.accent, onAccent, 0.5),
    muted: onAccent,
    surface: mix(c.accent, offAccent, 0.12),
    line: mix(c.accent, onAccent, 0.25),
  };
  return { default: base, inverse, accent };
}

export function deriveTokens(d: Design): Tokens {
  const r = TYPE_SCALES[d.type.scale];
  const b = d.type.base;
  const u = d.space.unit;
  const k = DENSITY[d.space.density];
  return {
    palette: palettes(d.colors),
    fonts: d.fonts,
    size: {
      caption: round(Math.max(MIN_FONT_PX, b / r / r)),
      small: round(Math.max(MIN_FONT_PX, b / r)),
      body: round(b),
      lead: round(b * Math.sqrt(r)),
      h3: round(b * r),
      h2: round(b * r * r),
      h1: round(Math.min(MAX_PX.h1, b * r ** 3)),
      display: round(Math.min(MAX_PX.display, b * r ** 5)),
      stat: round(Math.min(MAX_PX.stat, b * r ** 6)),
    },
    lineHeight: { heading: r >= 1.414 ? 1.02 : 1.08, body: 1.45 },
    heading: { weight: d.type.headingWeight, tracking: d.type.headingTracking, case: d.type.headingCase },
    space: { xs: u, sm: 2 * u, md: 3 * u, lg: 5 * u, xl: 8 * u, xxl: 13 * u },
    margin: { x: round(12 * u * k), y: round(8 * u * k) },
    radius: d.shape.radius,
    cards: d.shape.cards,
  };
}

/** Výchozí design: neutrální, čitelný. Brand kit nebo model ho přepíše. */
export const DEFAULT_DESIGN: Design = {
  colors: { bg: "#FFFFFF", fg: "#111318", accent: "#2F5BFF", accent2: "#8AA2FF", muted: "#5F6675", surface: "#F3F4F7" },
  fonts: { heading: { source: "google", family: "Inter Tight" }, body: { source: "google", family: "Inter" } },
  type: { base: 28, scale: "perfect-fourth", headingWeight: 700, headingTracking: -0.02, headingCase: "none" },
  space: { unit: 12, density: "balanced" },
  shape: { radius: 12, cards: "filled" },
};
