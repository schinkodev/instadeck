/**
 * Brand system, deterministic: from a primary color and a mood it makes a palette with verified contrast,
 * a font pair and the shape of the typography. The model decides what the brand is, the code proposes numbers and guards legibility.
 * Checking a finished brand kit (checkBrandKit) uses the same rules as deck validation.
 */
import {
  CONTRAST,
  DEFAULT_DESIGN,
  contrastRatio,
  deriveTokens,
  designFromBrand,
  findGoogleFont,
  mix,
  reachContrast,
  type BrandKitInput,
  type DesignPatch,
  type Intensity,
  type Tempo,
  type TypeScaleName,
} from "@/lib/domain";
import type { Finding } from "../validate/rules";

export interface Mood {
  character: string;
  heading: string;
  body: string;
  weight: number;
  tracking: number;
  scale: TypeScaleName;
  radius: number;
  cards: "flat" | "outline" | "filled";
  density: "airy" | "balanced" | "compact";
  tempo: Tempo;
  intensity: Intensity;
}

export const MOODS = {
  calm: { character: "Quiet and trustworthy: health, finance, education, serious B2B.", heading: "DM Sans", body: "Inter", weight: 600, tracking: -0.01, scale: "major-third", radius: 16, cards: "filled", density: "airy", tempo: "calm", intensity: "subtle" },
  confident: { character: "Direct and product led: SaaS, platforms, most startups.", heading: "Inter Tight", body: "Inter", weight: 700, tracking: -0.02, scale: "perfect-fourth", radius: 12, cards: "filled", density: "balanced", tempo: "confident", intensity: "subtle" },
  energetic: { character: "Bold and playful: consumer apps, events, creative brands.", heading: "Bricolage Grotesque", body: "Figtree", weight: 700, tracking: -0.02, scale: "perfect-fourth", radius: 20, cards: "filled", density: "balanced", tempo: "brisk", intensity: "expressive" },
  premium: { character: "Refined and editorial: luxury, design, hospitality, advisory.", heading: "Instrument Serif", body: "Inter", weight: 400, tracking: -0.01, scale: "perfect-fourth", radius: 4, cards: "flat", density: "airy", tempo: "calm", intensity: "subtle" },
  technical: { character: "Precise and engineered: developer tools, infrastructure, data.", heading: "Space Grotesk", body: "IBM Plex Sans", weight: 600, tracking: -0.01, scale: "major-third", radius: 6, cards: "outline", density: "balanced", tempo: "confident", intensity: "subtle" },
  friendly: { character: "Warm and approachable: community, retail, family, wellbeing.", heading: "Outfit", body: "Figtree", weight: 600, tracking: -0.01, scale: "major-third", radius: 20, cards: "filled", density: "balanced", tempo: "confident", intensity: "expressive" },
} as const satisfies Record<string, Mood>;

export type MoodName = keyof typeof MOODS;
export const MOOD_NAMES = Object.keys(MOODS) as [MoodName, ...MoodName[]];

const ratio = (a: string, b: string) => Math.round(contrastRatio(a, b) * 100) / 100;

export interface BrandSystemInput {
  primary: string;
  mood: MoodName;
  secondary?: string;
  dark?: string;
  light?: string;
}

export function suggestBrandSystem(input: BrandSystemInput) {
  const m: Mood = MOODS[input.mood];
  const adjustments: string[] = [];
  const light = (input.light ?? "#FFFFFF").toUpperCase();

  const darkSeed = input.dark ?? mix(input.primary, "#000000", 0.9);
  const dark = reachContrast(darkSeed, light, CONTRAST.enhanced);
  if (input.dark && dark.changed) adjustments.push(`dark ${input.dark} darkened to ${dark.hex}: text needs ${CONTRAST.enhanced}:1 on the background to be read from the back of a room.`);
  if (!input.dark) adjustments.push(`dark derived from the primary color as a tinted near black (${dark.hex}).`);

  const accent = reachContrast(input.primary, light, CONTRAST.largeText);
  if (accent.changed) adjustments.push(`primary ${input.primary.toUpperCase()} darkened to ${accent.hex}: the accent needs ${CONTRAST.largeText}:1 on the background.`);

  const secondary = (input.secondary ?? mix(accent.hex, light, 0.45)).toUpperCase();
  if (!input.secondary) adjustments.push(`secondary derived as a lighter tint of the accent (${secondary}), used as the second chart color.`);

  const brandKit = {
    colors: { primary: accent.hex, secondary, dark: dark.hex, light },
    fonts: { heading: { source: "google" as const, family: m.heading }, body: { source: "google" as const, family: m.body } },
  };
  const design: DesignPatch = {
    type: { base: 28, scale: m.scale, headingWeight: m.weight, headingTracking: m.tracking, headingCase: "none" },
    space: { unit: 12, density: m.density },
    shape: { radius: m.radius, cards: m.cards },
  };

  const base = designFromBrand({ name: "suggestion", logos: [], ...brandKit }, DEFAULT_DESIGN);
  const tokens = deriveTokens({ ...base, type: { ...base.type, ...design.type }, space: { ...base.space, ...design.space }, shape: { ...base.shape, ...design.shape } });
  const p = tokens.palette.default;
  const onAccent = tokens.palette.accent;
  const contrast = {
    text: ratio(p.fg, p.bg),
    accent: ratio(p.accent, p.bg),
    muted: ratio(p.muted, p.bg),
    textOnAccentSlide: ratio(onAccent.fg, onAccent.bg),
  };
  if (contrast.accent < CONTRAST.text) adjustments.push(`accent contrast is ${contrast.accent}:1: fine for large highlights and numbers, avoid it for small text.`);

  return {
    mood: input.mood,
    character: m.character,
    brand_kit: brandKit,
    design,
    motion: { tempo: m.tempo, intensity: m.intensity },
    palette: { bg: p.bg, fg: p.fg, accent: p.accent, accent2: p.accent2, muted: p.muted, surface: p.surface },
    contrast,
    adjustments,
  };
}

/** Check of a brand kit before a deck is built from it. The same threshold rules as deck validation. */
export function checkBrandKit(kit: BrandKitInput, design?: DesignPatch): Finding[] {
  const out: Finding[] = [];
  const push = (severity: Finding["severity"], rule: string, message: string) => out.push({ severity, rule, message });
  const base = designFromBrand(kit, DEFAULT_DESIGN);
  const headingWeight = design?.type?.headingWeight ?? base.type.headingWeight;
  const tokens = deriveTokens(base);
  const p = tokens.palette.default;

  const text = contrastRatio(p.fg, p.bg);
  if (text < CONTRAST.text) push("error", "brand-contrast", `Text on background has contrast ${text.toFixed(2)}:1, needs ${CONTRAST.text}:1. Change colors.dark or colors.light.`);
  const accent = contrastRatio(p.accent, p.bg);
  if (accent < CONTRAST.largeText) push("error", "brand-contrast", `Primary color on background has contrast ${accent.toFixed(2)}:1, needs ${CONTRAST.largeText}:1. Use suggest_brand_system to get a readable accent.`);
  const muted = contrastRatio(p.muted, p.bg);
  if (muted < CONTRAST.text) push(muted < CONTRAST.largeText ? "error" : "warning", "brand-contrast", `Secondary text has contrast ${muted.toFixed(2)}:1 on the background.`);
  const a = tokens.palette.accent;
  const onAccent = contrastRatio(a.fg, a.bg);
  if (onAccent < CONTRAST.text) push("warning", "brand-contrast", `Text on an accent tone slide has contrast ${onAccent.toFixed(2)}:1. Avoid the accent tone, or pick a darker or lighter primary.`);

  for (const [role, f] of [["heading", kit.fonts?.heading], ["body", kit.fonts?.body]] as const) {
    if (f?.source !== "google") continue;
    const face = findGoogleFont(f.family);
    if (role === "heading" && face && !face.weights.includes(headingWeight)) {
      push("warning", "brand-font-weight", `${f.family} has no weight ${headingWeight}. Set design.type.headingWeight in create_deck to one of ${face.weights.join(", ")}.`);
    }
  }

  if (kit.logos.length === 0) push("info", "brand-logo", "No logo in the brand kit. Decks will have no logo unless a slide adds one.");
  else if (!kit.logos.some((l) => l.on === "light" || l.on === "any")) push("warning", "brand-logo", "No logo variant works on a light background, which is the default slide tone.");
  return out;
}
