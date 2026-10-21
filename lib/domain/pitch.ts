/**
 * Stavební kameny pitch decku. Inspirace, ne předpis: pevná kostra dává všem deckům stejný
 * tvar (lekce ze slyde-saas). Model vybírá a řadí beaty podle publika a cíle,
 * řídí se principy storytellingu (principles/storytelling.ts).
 */

export interface PitchBeat {
  id: string;
  question: string;
  /** Co musí slide doložit, aby beat obstál. */
  evidence: string;
  layouts: readonly string[];
  /** Pro které publikum je beat nutný. */
  essentialFor: readonly ("investors" | "customers" | "partners")[];
}

export const PITCH_BEATS: readonly PitchBeat[] = [
  { id: "hook", question: "Why should I listen for the next ten minutes?", evidence: "A surprising fact, a bold claim or the vision in one sentence.", layouts: ["title", "title-image", "statement", "image-full"], essentialFor: ["investors", "customers", "partners"] },
  { id: "problem", question: "What is broken, for whom, and how much does it cost?", evidence: "A concrete pain with a number or a real story.", layouts: ["statement", "headline-stat", "points", "image-text"], essentialFor: ["investors", "customers"] },
  { id: "why-now", question: "Why is this solvable now and not five years ago?", evidence: "A shift in technology, regulation or behavior.", layouts: ["statement", "chart", "timeline"], essentialFor: ["investors"] },
  { id: "solution", question: "What do you do, in one sentence?", evidence: "The product promise and the moment of value.", layouts: ["statement", "text-image", "image-full"], essentialFor: ["investors", "customers", "partners"] },
  { id: "product", question: "What does it look like and how does it work?", evidence: "Screenshots or a three step flow.", layouts: ["text-image", "image-text", "cards"], essentialFor: ["customers", "investors"] },
  { id: "traction", question: "Who already wants it?", evidence: "Growth, revenue, retention, logos, quotes. The strongest number first.", layouts: ["stats", "headline-stat", "chart-insight", "logos", "quote"], essentialFor: ["investors", "customers"] },
  { id: "market", question: "How big can this get?", evidence: "Bottom up market size with the logic behind it.", layouts: ["headline-stat", "stats", "chart-insight"], essentialFor: ["investors"] },
  { id: "business-model", question: "How do you make money and is it healthy?", evidence: "Pricing, margins, unit economics.", layouts: ["cards", "stats", "table"], essentialFor: ["investors"] },
  { id: "competition", question: "Why do you win against alternatives?", evidence: "An honest comparison on the dimensions customers care about.", layouts: ["comparison", "table"], essentialFor: ["investors", "customers"] },
  { id: "go-to-market", question: "How do you reach customers repeatably?", evidence: "Channels with early proof, sales motion.", layouts: ["cards", "timeline", "chart"], essentialFor: ["investors", "partners"] },
  { id: "roadmap", question: "What comes next?", evidence: "Three to five milestones tied to the ask.", layouts: ["timeline"], essentialFor: ["partners", "customers"] },
  { id: "team", question: "Why are you the people to build this?", evidence: "Relevant experience, one line each.", layouts: ["team"], essentialFor: ["investors", "partners"] },
  { id: "financials", question: "What do the next years look like?", evidence: "Revenue plan and key assumptions.", layouts: ["chart", "chart-insight", "table"], essentialFor: ["investors"] },
  { id: "ask", question: "What exactly do you want from this audience?", evidence: "Amount, use of funds and what it unlocks, or the next step.", layouts: ["closing", "headline-stat", "cards"], essentialFor: ["investors", "customers", "partners"] },
];

export const PITCH_GUIDANCE = {
  slides: { min: 8, max: 16, sweetSpot: "10 to 13 slides for a first meeting" },
  rules: [
    "Every content slide headline is the takeaway as a full sentence, the slide body proves it.",
    "One idea per slide. When a slide needs two headlines, it is two slides.",
    "Lead with the strongest proof. Traction beats promises, numbers beat adjectives.",
    "Alternate visual rhythm: do not use the same layout on consecutive slides.",
    "Use the accent tone for at most two moments, typically the hook or the ask.",
    "Close with a callback to the opening hook.",
  ],
} as const;
