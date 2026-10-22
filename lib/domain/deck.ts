/**
 * Deck, slide a operace. Slide má stabilní ID, které se přesunem nemění.
 * Operace (Op) jsou jediný způsob, jak se deck mění (applyOps v lib/state).
 */
import { z } from "zod";
import { blockSchema } from "./blocks";
import { LAYOUT_IDS } from "./layouts";
import { FRAME_IDS } from "./narrative";
import { BEAT_IDS } from "./pitch";
import { SCHOOL_IDS } from "./schools";
import { factSchema } from "./facts";
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

/** Brief pro create_deck: koncept je povinný, model se rozhodne dřív, než volí barvy a písma. */
export const createBriefSchema = briefSchema.extend({ concept: conceptSchema });

export const slideInputSchema = z.strictObject({
  layout: z.enum(LAYOUT_IDS).describe("Layout id from instadeck://layouts"),
  intent: z.string().min(1).max(160).describe("The one thing this slide must communicate, as a sentence. Not shown on the slide"),
  beat: z.enum(BEAT_IDS).optional().describe("The story beat this slide carries (section pitch, beats): hook, problem, traction, ask..."),
  tone: z.enum(TONES).optional().describe("default, inverse (dark on light swapped) or accent (accent colored background, for one or two key moments)"),
  blocks: z.record(z.string(), blockSchema).describe("Block per zone of the layout, keyed by zone name"),
  motion: slideMotionSchema.optional(),
  notes: z.string().max(1200).optional().describe("Speaker notes"),
});
export type SlideInput = z.infer<typeof slideInputSchema>;

export const slideSchema = slideInputSchema.extend({ id: z.string().min(1) });
export type Slide = z.infer<typeof slideSchema>;

export const deckSchema = z.strictObject({
  id: z.string().min(1),
  title: z.string().min(1),
  brief: briefSchema,
  brandKitId: z.string().optional(),
  design: designSchema,
  motion: storedDeckMotionSchema,
  facts: z.array(factSchema).max(60).optional(),
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
  z.strictObject({ op: z.literal("set_facts"), facts: z.array(factSchema).max(60).describe("The full list of facts, replaces the current one") }),
  z.strictObject({ op: z.literal("apply_brand"), brand_kit_id: z.string().describe("Brand kit whose colors and fonts replace the design") }),
]);
export type Op = z.infer<typeof opSchema>;
