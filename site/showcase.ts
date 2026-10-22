/**
 * Decks shown on the landing page. They are the golden examples from lib/domain/examples.json, rendered at build time
 * by scripts/site.ts, so the page shows real InstaDecks and nothing drawn by hand. The brief is what a user would type
 * to get that deck: it states only facts the deck itself contains.
 */
import { EXAMPLES, type DeckExample } from "@/lib/domain";
import { NARRATIVE_FRAMES } from "@/lib/domain/narrative";
import { DESIGN_SCHOOLS } from "@/lib/domain/schools";

const BRIEFS: Record<string, { name: string; brief: string }> = {
  "seed-pitch": {
    name: "Seed pitch",
    brief: "Seed pitch deck for Northwind. We predict grid congestion hours ahead, so operators stop throwing away wind power. Three pilots are live and cut curtailment by a third. We are raising €4M to go from 3 to 20 grids.",
  },
  "board-update": {
    name: "Board update",
    brief: "Q3 board update for Harborline. Revenue $4.1M against a plan of $3.8M and burn flat, but two senior engineering hires slipped. Answer first, and end with the two decisions we need: the Q4 plan and $1.2M for hiring.",
  },
  "sales-deck": {
    name: "Sales deck",
    brief: "First call deck for the operations team of a mid-size retailer. Brightline replaces stock planning in spreadsheets. Lead with what stockouts cost them, then the pilot results, the six week rollout and pricing per store. Sober, no hype.",
  },
  "product-launch": {
    name: "Product launch",
    brief: "Launch deck for Pocket Ledger, a money app that sorts your spending by itself. For press and early customers, we launch on 3 November. Warm and friendly, short lines. The beta has 4,200 users who save €47 a month on average.",
  },
  "kinetic-launch": {
    name: "Keynote",
    brief: "Launch keynote for Tandem, the language app where you practice with a real partner ten minutes a day. Playful and full of motion, like the app. 6,000 beta learners, streaks 3.4 times longer than alone, free to start.",
  },
};

/** Slides for the wall: one strong slide of each kind, across all decks, so the grid shows range and no deck twice in a row. */
export const WALL: readonly { deck: string; slide: number }[] = [
  { deck: "seed-pitch", slide: 1 },
  { deck: "board-update", slide: 3 },
  { deck: "product-launch", slide: 2 },
  { deck: "kinetic-launch", slide: 8 },
  { deck: "sales-deck", slide: 4 },
  { deck: "seed-pitch", slide: 6 },
  { deck: "product-launch", slide: 3 },
  { deck: "kinetic-launch", slide: 5 },
];

export type ShowcaseDeck = {
  id: string;
  name: string;
  brief: string;
  slides: number;
  frame: string;
  school?: string;
  intensity: string;
  motion: string;
  type: string;
  idea: string;
  /** Accent of the deck's own brand, the page marks the deck with it. */
  color: string;
};

function describe(e: DeckExample): ShowcaseDeck {
  const b = BRIEFS[e.id];
  if (!b) throw new Error(`No landing brief for example ${e.id}`);
  const school = e.concept.school ? DESIGN_SCHOOLS.find((s) => s.id === e.concept.school)!.name : undefined;
  const fonts = [e.design.fonts?.heading?.family, e.design.fonts?.body?.family].filter((f): f is string => !!f);
  return {
    id: e.id,
    name: b.name,
    brief: b.brief,
    slides: e.slides.length,
    frame: NARRATIVE_FRAMES.find((f) => f.id === e.frame)!.name,
    ...(school && { school }),
    intensity: e.motion.intensity,
    motion: e.motion.rationale ?? "",
    type: [...new Set(fonts)].join(" and "),
    idea: e.concept.idea,
    color: e.design.colors?.accent ?? "#111111",
  };
}

/** Order on the page: from the deck that moves least to the one that moves most, after the seed pitch that opens. */
const ORDER = ["seed-pitch", "board-update", "sales-deck", "product-launch", "kinetic-launch"];

export const SHOWCASE: readonly ShowcaseDeck[] = ORDER.map((id) => describe(EXAMPLES.find((e) => e.id === id)!));

export const slideLayout = (deck: string, slide: number) => EXAMPLES.find((e) => e.id === deck)!.slides[slide]!.layout;
export const deckName = (deck: string) => SHOWCASE.find((d) => d.id === deck)!.name;
