/**
 * Applying operations to a deck, a pure function. An invalid operation (unknown slide, position outside the deck)
 * throws OpError and changes nothing: either all operations pass, or none.
 */
import { designFromBrand, patchMotion, type BrandKit, type Deck, type DesignPatch, type Op, type Slide } from "@/lib/domain";

export class OpError extends Error {
  constructor(
    message: string,
    readonly opIndex: number,
  ) {
    super(`Operation ${opIndex + 1}: ${message}`);
  }
}

export interface OpContext {
  newSlideId: () => string;
  brandKit: (id: string) => BrandKit | undefined;
}

function mergeDesign(design: Deck["design"], patch: DesignPatch): Deck["design"] {
  return {
    colors: { ...design.colors, ...patch.colors },
    fonts: { ...design.fonts, ...patch.fonts },
    type: { ...design.type, ...patch.type },
    space: { ...design.space, ...patch.space },
    shape: { ...design.shape, ...patch.shape },
  };
}

function indexOf(deck: Deck, slideId: string, i: number): number {
  const at = deck.slides.findIndex((s) => s.id === slideId);
  if (at < 0) throw new OpError(`slide ${slideId} does not exist. Slide ids: ${deck.slides.map((s) => s.id).join(", ") || "none"}`, i);
  return at;
}

export interface Applied {
  deck: Deck;
  /** Ids of slides the operations added or changed (for previews). */
  touched: string[];
  /** The operations changed the look of the whole deck (design, motion, brand). */
  global: boolean;
}

export function applyOpsToDeck(input: Deck, ops: Op[], ctx: OpContext): Applied {
  const deck: Deck = structuredClone(input);
  const touched = new Set<string>();
  let global = false;

  ops.forEach((op, i) => {
    switch (op.op) {
      case "add_slide": {
        const at = op.at ?? deck.slides.length;
        if (at > deck.slides.length) throw new OpError(`position ${at} is past the end of the deck (${deck.slides.length} slides)`, i);
        const slide: Slide = { ...structuredClone(op.slide), id: ctx.newSlideId() };
        deck.slides.splice(at, 0, slide);
        touched.add(slide.id);
        break;
      }
      case "update_slide": {
        const at = indexOf(deck, op.slide_id, i);
        const s = deck.slides[at]!;
        const blocks = { ...s.blocks };
        for (const [zone, block] of Object.entries(op.blocks ?? {})) {
          if (block === null) delete blocks[zone];
          else blocks[zone] = structuredClone(block);
        }
        const { background: _drop, ...rest } = s;
        const background = op.background === undefined ? s.background : (op.background ?? undefined);
        deck.slides[at] = {
          ...rest,
          ...(background && { background }),
          ...(op.layout !== undefined && { layout: op.layout }),
          ...(op.intent !== undefined && { intent: op.intent }),
          ...(op.beat !== undefined && { beat: op.beat }),
          ...(op.tone !== undefined && { tone: op.tone }),
          ...(op.motion !== undefined && { motion: op.motion }),
          ...(op.notes !== undefined && { notes: op.notes }),
          blocks,
        };
        touched.add(s.id);
        break;
      }
      case "remove_slide": {
        deck.slides.splice(indexOf(deck, op.slide_id, i), 1);
        touched.delete(op.slide_id);
        break;
      }
      case "move_slide": {
        const from = indexOf(deck, op.slide_id, i);
        if (op.to >= deck.slides.length) throw new OpError(`position ${op.to} is past the last slide (${deck.slides.length - 1})`, i);
        const [s] = deck.slides.splice(from, 1);
        deck.slides.splice(op.to, 0, s!);
        break;
      }
      case "set_design":
        deck.design = mergeDesign(deck.design, op.design);
        global = true;
        break;
      case "set_motion":
        deck.motion = patchMotion(deck.motion, op.motion);
        global = true;
        break;
      case "set_title":
        deck.title = op.title;
        break;
      case "set_brief":
        deck.brief = { ...deck.brief, ...op.brief };
        break;
      case "apply_brand": {
        const brand = ctx.brandKit(op.brand_kit_id);
        if (!brand) throw new OpError(`brand kit ${op.brand_kit_id} does not exist`, i);
        // Colors from the brand, fonts from the brand only if it prescribes them, otherwise they stay from the deck.
        deck.design = designFromBrand(brand, deck.design);
        deck.brandKitId = brand.id;
        global = true;
        break;
      }
    }
  });
  return { deck, touched: [...touched], global };
}
