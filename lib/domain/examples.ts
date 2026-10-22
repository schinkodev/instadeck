/**
 * Golden examples: proven decks in the shape create_deck takes. The model reads their
 * structure, rhythm and text lengths, but always replaces the content. The data is in examples.json, more examples
 * are added with `npm run example` from a deck that turned out well. A test checks that every example passes
 * validation without errors and warnings.
 */
import { z } from "zod";
import data from "./examples.json";
import { conceptSchema, designPatchSchema, slideInputSchema } from "./deck";
import { deckMotionSchema } from "./motion";
import { FRAME_IDS } from "./narrative";

export const exampleSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  title: z.string().min(1),
  purpose: z.string().min(1).describe("When this example fits"),
  audience: z.string().min(1),
  frame: z.enum(FRAME_IDS).describe("Narrative frame of the example, for brief.frame"),
  concept: conceptSchema.describe("Design concept of the example, for brief.concept"),
  why: z.array(z.string().min(1)).min(2).describe("What makes the deck work, for the model to learn from"),
  design: designPatchSchema,
  motion: deckMotionSchema,
  slides: z.array(slideInputSchema).min(1),
});
export type DeckExample = z.infer<typeof exampleSchema>;

export const EXAMPLES: readonly DeckExample[] = z.array(exampleSchema).parse(data);

export const EXAMPLE_NOTE =
  "Names, numbers and quotes in examples are made up. Replace every one with the user's real content, never present them as facts. When the user has not given a number, name or quote, ask for it or leave the claim out, never put a placeholder or a note to yourself on a slide. Keep the structure, rhythm and text lengths.";

export function findExample(id: string): DeckExample | undefined {
  return EXAMPLES.find((e) => e.id === id);
}

export function exampleSummary(e: DeckExample) {
  return { id: e.id, title: e.title, purpose: e.purpose, audience: e.audience, slides: e.slides.length, layouts: e.slides.map((s) => s.layout) };
}
