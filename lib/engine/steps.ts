/**
 * Kroky odkrývání. Blok má krok `step` (0 = se vstupem slidu). U seznamů s `build: "items"`
 * se první položka objeví s blokem a každá další o krok později.
 */
import type { Block, Slide } from "@/lib/domain";

/** Položky bloku, které se odkrývají jednotlivě, pokud má blok build. */
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

/** Počet kliknutí potřebných k odkrytí celého slidu. */
export function slideSteps(slide: Slide): number {
  return Math.max(0, ...Object.values(slide.blocks).map((b) => blockSteps(b).last));
}
