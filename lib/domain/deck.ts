/**
 * Deck, slide and operations. A slide has a stable id that does not change when it moves.
 * Operations (Op) are the only way a deck changes (applyOps in lib/state).
 */
import { z } from "zod";
import { blockSchema } from "./blocks";
import { LAYOUT_IDS } from "./layouts";
import { FRAME_IDS } from "./narrative";
import { BEAT_IDS } from "./pitch";
import { SCHOOL_IDS } from "./schools";
import { deckMotionPatchSchema, slideMotionSchema, storedDeckMotionSchema } from "./motion";
import { designSchema, TONES } from "./tokens";

export const conceptSchema = z.strictObject({
  idea: z.string().min(10).max(200).describe("The visual idea of the deck in one sentence, e.g. a quiet editorial deck where one number per slide speaks"),
  school: z.enum(SCHOOL_IDS).optional().describe("Design school the deck follows (section schools), when one fits"),
  references: z.array(z.string().min(2).max(80)).max(4).optional().describe("Named references, e.g. Bloomberg Businessweek covers, Braun product manuals"),
  avoid: z.string().min(3).max(160).describe("What the deck must not look like"),
  signature: z.string().min(3).max(160).describe("One device that recurs on every slide: a rule, a crop, a number style, a color field"),
});
export type Concept = z.infer<typeof conceptSchema>;

export const briefSchema = z.strictObject({
  company: z.string().min(1).describe("Company or product name"),
  topic: z.string().min(1).describe("What the deck is about, e.g. seed round pitch, partner pitch, product launch"),
  audience: z.string().optional().describe("Who will see it: seed investors, enterprise buyers, partners"),
  goal: z.string().optional().describe("What the audience should do or believe afterwards"),
  language: z.string().min(2).describe("Language of the slide content, BCP 47 tag, e.g. en, cs, de"),
  concept: conceptSchema.optional().describe("The design concept, required when the deck is created"),
  frame: z.enum(FRAME_IDS).optional().describe("Narrative frame that orders the story (section pitch, frames): classical, scqa, abt, monroe, story-spine, sparkline, toulmin"),
});
export type Brief = z.infer<typeof briefSchema>;

/** Brief for create_deck: the concept is required, the model decides it before choosing colors and fonts. */
export const createBriefSchema = briefSchema.extend({ concept: conceptSchema });

/**
 * Background of a slide (V008, the image layer). Without assets a deck has no visual at all, so the brand can draw one
 * from its own tokens: deterministic, no stock and no generated images.
 */
export const BRAND_VISUALS = ["numeral", "field", "geometry"] as const;
export const backgroundSchema = z
  .strictObject({
    type: z.literal("brand"),
    visual: z.enum(BRAND_VISUALS).describe("numeral = the chapter number set very large, field = a color field across part of the slide, geometry = circle and square from the accent"),
  })
  .describe("A visual drawn from the brand colors behind the content. Use it for the title and the chapter openers, not on every slide");
export type Background = z.infer<typeof backgroundSchema>;

export const slideInputSchema = z.strictObject({
  layout: z.enum(LAYOUT_IDS).describe("Layout id from instadeck://layouts"),
  intent: z.string().min(1).max(160).describe("The one thing this slide must communicate, as a sentence. Not shown on the slide"),
  beat: z.enum(BEAT_IDS).optional().describe("The story beat this slide carries (section pitch, beats): hook, problem, traction, ask..."),
  tone: z.enum(TONES).optional().describe("default, inverse (dark on light swapped) or accent (accent colored background, for one or two key moments)"),
  background: backgroundSchema.optional(),
  blocks: z.record(z.string(), blockSchema).describe("Block per zone of the layout, keyed by zone name"),
  motion: slideMotionSchema.optional(),
  notes: z.string().max(1200).optional().describe("Speaker notes"),
});
export type SlideInput = z.infer<typeof slideInputSchema>;

export const slideSchema = slideInputSchema.extend({ id: z.string().min(1) });
export type Slide = z.infer<typeof slideSchema>;

/** Chapter number of each slide that uses the numeral visual: its place among those slides, from 1. */
export function chapterNumbers(slides: readonly Slide[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const s of slides) if (s.background?.type === "brand" && s.background.visual === "numeral") out.set(s.id, out.size + 1);
  return out;
}

export const deckSchema = z.strictObject({
  id: z.string().min(1),
  title: z.string().min(1),
  brief: briefSchema,
  brandKitId: z.string().optional(),
  design: designSchema,
  motion: storedDeckMotionSchema,
  slides: z.array(slideSchema),
  revision: z.number().int().min(0),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Deck = z.infer<typeof deckSchema>;

export const designPatchSchema = z.strictObject({
  colors: designSchema.shape.colors.partial().optional(),
  fonts: designSchema.shape.fonts.partial().optional(),
  type: designSchema.shape.type.partial().optional(),
  space: designSchema.shape.space.partial().optional(),
  shape: designSchema.shape.shape.partial().optional(),
});
export type DesignPatch = z.infer<typeof designPatchSchema>;

export const opSchema = z.discriminatedUnion("op", [
  z.strictObject({
    op: z.literal("add_slide"),
    slide: slideInputSchema,
    at: z.number().int().min(0).optional().describe("Position, default end of deck"),
  }),
  z.strictObject({
    op: z.literal("update_slide"),
    slide_id: z.string(),
    layout: slideInputSchema.shape.layout.optional(),
    intent: slideInputSchema.shape.intent.optional(),
    beat: slideInputSchema.shape.beat,
    tone: slideInputSchema.shape.tone,
    background: backgroundSchema.nullable().optional().describe("null removes the background"),
    blocks: z.record(z.string(), blockSchema.nullable()).optional().describe("Zones to set. null removes the block from the zone. Unlisted zones stay"),
    motion: slideMotionSchema.optional(),
    notes: z.string().max(1200).optional(),
  }),
  z.strictObject({ op: z.literal("remove_slide"), slide_id: z.string() }),
  z.strictObject({ op: z.literal("move_slide"), slide_id: z.string(), to: z.number().int().min(0) }),
  z.strictObject({ op: z.literal("set_design"), design: designPatchSchema.describe("Only the fields to change") }),
  z.strictObject({ op: z.literal("set_motion"), motion: deckMotionPatchSchema }),
  z.strictObject({ op: z.literal("set_title"), title: z.string().min(1) }),
  z.strictObject({ op: z.literal("set_brief"), brief: briefSchema.partial() }),
  z.strictObject({ op: z.literal("apply_brand"), brand_kit_id: z.string().describe("Brand kit whose colors and fonts replace the design") }),
]);
export type Op = z.infer<typeof opSchema>;
