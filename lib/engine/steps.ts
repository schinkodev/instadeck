/**
 * Reveal steps. A block has a `step` (0 = with the slide entrance). For lists with `build: "items"`
 * the first item appears with the block and every next one a step later.
 */
import type { Block, Slide } from "@/lib/domain";

/** Items of a block that reveal one by one, when the block has a build. */
export function itemCount(block: Block): number {
  switch (block.type) {
    case "bullets":
    case "stats":
    case "cards":
    case "timeline":
      return block.items.length;
    case "comparison":
      return block.columns.length;
    default:
      return 0;
  }
}

export function blockSteps(block: Block): { first: number; last: number } {
  const first = block.step ?? 0;
  const builds = "build" in block && block.build === "items" ? Math.max(0, itemCount(block) - 1) : 0;
  return { first, last: first + builds };
}

/** Number of clicks needed to reveal the whole slide. */
export function slideSteps(slide: Slide): number {
  return Math.max(0, ...Object.values(slide.blocks).map((b) => blockSteps(b).last));
}
