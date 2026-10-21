/**
 * Písma. Model volí z kurátorovaného výběru Google Fonts (víme, že existují a jaké mají řezy),
 * nebo brandové písmo nahrané jako asset. Libovolný název by prohlížeč tiše nahradil jiným písmem.
 */
import { z } from "zod";

export type FontCategory = "sans" | "serif" | "display" | "mono";

export interface FontFace {
  family: string;
  category: FontCategory;
  /** Dostupné řezy (variabilní písma: rozsah po stovkách). */
  weights: readonly number[];
  /** Kdy se hodí, pro model. */
  character: string;
}

const w = (from: number, to: number) => Array.from({ length: (to - from) / 100 + 1 }, (_, i) => from + i * 100);

export const GOOGLE_FONTS: readonly FontFace[] = [
  { family: "Inter", category: "sans", weights: w(100, 900), character: "Neutral, highly legible UI sans. Safe for body text in any deck." },
  { family: "Inter Tight", category: "sans", weights: w(100, 900), character: "Tighter Inter for large headings with a confident, product feel." },
  { family: "Plus Jakarta Sans", category: "sans", weights: w(200, 800), character: "Friendly geometric sans, modern startup tone." },
  { family: "Manrope", category: "sans", weights: w(200, 800), character: "Semi-geometric, technical but warm. Good for fintech and SaaS." },
  { family: "DM Sans", category: "sans", weights: w(100, 900), character: "Low contrast geometric sans, clean and calm." },
  { family: "Space Grotesk", category: "sans", weights: w(300, 700), character: "Quirky grotesk with character. Tech, crypto, developer tools." },
  { family: "Sora", category: "sans", weights: w(100, 800), character: "Wide geometric sans, futuristic and bold headings." },
  { family: "Outfit", category: "sans", weights: w(100, 900), character: "Rounded geometric, approachable consumer brands." },
  { family: "Work Sans", category: "sans", weights: w(100, 900), character: "Grotesk optimized for screens, editorial and versatile." },
  { family: "IBM Plex Sans", category: "sans", weights: w(100, 700), character: "Engineered corporate sans. Enterprise, B2B, infrastructure." },
  { family: "Archivo", category: "sans", weights: w(100, 900), character: "Grotesk with wide range, strong condensed feel at heavy weights." },
  { family: "Schibsted Grotesk", category: "sans", weights: w(400, 900), character: "Newsroom grotesk, direct and serious." },
  { family: "Geist", category: "sans", weights: w(100, 900), character: "Swiss inspired developer sans, precise and minimal." },
  { family: "Figtree", category: "sans", weights: w(300, 900), character: "Clean geometric with soft details, friendly and clear." },
  { family: "Fraunces", category: "serif", weights: w(100, 900), character: "Soft display serif with personality. Consumer, food, lifestyle, premium." },
  { family: "Playfair Display", category: "serif", weights: w(400, 900), character: "High contrast didone. Luxury, fashion, editorial headings only." },
  { family: "Instrument Serif", category: "serif", weights: [400], character: "Elegant condensed serif for large headings. Pair with a neutral sans." },
  { family: "Source Serif 4", category: "serif", weights: w(200, 900), character: "Readable text serif. Research, finance, long form." },
  { family: "Newsreader", category: "serif", weights: w(200, 800), character: "Editorial text serif with optical sizes. Thoughtful, literary." },
  { family: "Libre Caslon Text", category: "serif", weights: [400, 700], character: "Classic book serif. Heritage, law, institutions." },
  { family: "DM Serif Display", category: "serif", weights: [400], character: "Display serif with high contrast, headings only." },
  { family: "Bricolage Grotesque", category: "display", weights: w(200, 800), character: "Expressive grotesk with ink traps. Bold creative brands." },
  { family: "Syne", category: "display", weights: w(400, 800), character: "Wide, art school display face. Agencies, culture, events." },
  { family: "Unbounded", category: "display", weights: w(200, 900), character: "Very wide rounded display. Loud consumer and web3 brands, headings only." },
  { family: "Big Shoulders Display", category: "display", weights: w(100, 900), character: "Condensed industrial display. Sports, logistics, hardware." },
  { family: "JetBrains Mono", category: "mono", weights: w(100, 800), character: "Developer mono. Use for numbers or code accents, never body text." },
  { family: "IBM Plex Mono", category: "mono", weights: w(100, 700), character: "Corporate mono for data labels and figures." },
];

export function findGoogleFont(family: string): FontFace | undefined {
  return GOOGLE_FONTS.find((f) => f.family === family);
}

export const fontRefSchema = z.discriminatedUnion("source", [
  z.strictObject({
    source: z.literal("google"),
    family: z.enum(GOOGLE_FONTS.map((f) => f.family) as [string, ...string[]]).describe("Family from the curated Google Fonts list (instadeck://fonts)"),
  }),
  z.strictObject({
    source: z.literal("asset"),
    assetId: z.string().describe("Font file added with add_asset (woff2, woff, ttf, otf)"),
    family: z.string().min(1).describe("Name to register the font under"),
    weight: z.number().int().min(100).max(900).describe("Weight of this file"),
  }),
]);
export type FontRef = z.infer<typeof fontRefSchema>;
