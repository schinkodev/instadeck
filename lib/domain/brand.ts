/**
 * Brand kit: co značka předepisuje (barvy, písma, loga, tón). Z brand kitu se deterministicky
 * odvodí design decku. Interpretaci assetů (co je logo, jaký je tón) dělá model, ne kód.
 */
import { z } from "zod";
import { CONTRAST, isHex, mix, reachContrast } from "./color";
import { fontRefSchema } from "./fonts";
import type { Design } from "./tokens";

const hex = z.string().refine(isHex, "Expected #RRGGBB");

export const brandKitInputSchema = z.strictObject({
  name: z.string().min(1),
  colors: z.strictObject({
    primary: hex.describe("The brand color, becomes the accent"),
    secondary: hex.optional().describe("Second brand color, used in charts and diagrams"),
    dark: hex.optional().describe("Brand dark, becomes text color (default near black)"),
    light: hex.optional().describe("Brand light, becomes background (default white)"),
  }),
  fonts: z
    .object({ heading: fontRefSchema.optional(), body: fontRefSchema.optional() })
    .optional()
    .describe("Brand fonts. Omit to let the deck design choose"),
  logos: z
    .array(z.strictObject({ assetId: z.string(), variant: z.enum(["full", "mark"]), on: z.enum(["light", "dark", "any"]).describe("Background the logo is made for") }))
    .default([]),
  tone: z.string().max(300).optional().describe("Voice and personality of the brand in a sentence or two"),
});
export type BrandKitInput = z.infer<typeof brandKitInputSchema>;

export const brandKitSchema = brandKitInputSchema.extend({ id: z.string(), createdAt: z.string() });
export type BrandKit = z.infer<typeof brandKitSchema>;

const DEFAULT_DARK = "#111318";
const DEFAULT_LIGHT = "#FFFFFF";

/** Barvy a písma brandu do designu. Typografie, mezery a tvary zůstávají z výchozího designu. */
export function designFromBrand(brand: BrandKit | BrandKitInput, base: Design): Design {
  const fg = brand.colors.dark ?? DEFAULT_DARK;
  const bg = brand.colors.light ?? DEFAULT_LIGHT;
  const accent = brand.colors.primary;
  return {
    ...base,
    colors: {
      bg,
      fg,
      accent,
      accent2: brand.colors.secondary ?? mix(accent, bg, 0.45),
      muted: reachContrast(mix(fg, bg, 0.42), bg, CONTRAST.text).hex,
      surface: mix(bg, fg, 0.045),
    },
    fonts: { heading: brand.fonts?.heading ?? base.fonts.heading, body: brand.fonts?.body ?? base.fonts.body },
  };
}
