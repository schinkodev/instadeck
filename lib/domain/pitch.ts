/**
 * Building blocks of a pitch deck. Inspiration, not a prescription: a fixed skeleton gives every deck the same
 * shape (a lesson from slyde-saas). The model picks and orders beats by audience and goal,
 * following the storytelling principles (principles/storytelling.ts).
 */

export interface PitchBeat {
  id: string;
  /** The audience question the beat answers. */
  question: string;
  /** What to ask the user when the evidence is missing from the brief. The model never makes up a number, a name or a quote. */
  askUser: string;
  /** The beat rests on evidence: a slide with text only claims but does not prove (assertion-evidence). */
  needsEvidence: boolean;
  /** What the slide must prove for the beat to hold. */
  evidence: string;
  layouts: readonly string[];
  /** For which audience the beat is essential. */
  essentialFor: readonly ("investors" | "customers" | "partners" | "board")[];
}

export const PITCH_BEATS: readonly PitchBeat[] = [
  { id: "hook", askUser: "What is the one surprising fact or claim this audience should remember?", needsEvidence: false, question: "Why should I listen for the next ten minutes?", evidence: "A surprising fact, a bold claim or the vision in one sentence.", layouts: ["title", "title-image", "statement", "image-full"], essentialFor: ["investors", "customers", "partners"] },
  { id: "problem", askUser: "What does the problem cost the customer, as a number (time, money, risk), or what real story shows it?", needsEvidence: true, question: "What is broken, for whom, and how much does it cost?", evidence: "A concrete pain with a number or a real story.", layouts: ["statement", "headline-stat", "points", "image-text"], essentialFor: ["investors", "customers"] },
  { id: "why-now", askUser: "What changed recently (technology, regulation, behavior) that makes this possible now?", needsEvidence: false, question: "Why is this solvable now and not five years ago?", evidence: "A shift in technology, regulation or behavior.", layouts: ["statement", "chart", "timeline"], essentialFor: ["investors"] },
  { id: "solution", askUser: "What does the product do, in one sentence, and when does the customer first feel its value?", needsEvidence: false, question: "What do you do, in one sentence?", evidence: "The product promise and the moment of value.", layouts: ["statement", "text-image", "image-full"], essentialFor: ["investors", "customers", "partners"] },
  { id: "product", askUser: "Do you have screenshots or photos of the product, or the three steps a customer goes through?", needsEvidence: false, question: "What does it look like and how does it work?", evidence: "Screenshots or a three step flow.", layouts: ["text-image", "image-text", "cards"], essentialFor: ["customers", "investors"] },
  { id: "traction", askUser: "What is your strongest proof: revenue, growth, retention, customers, a quote? Give the numbers and the period.", needsEvidence: true, question: "Who already wants it?", evidence: "Growth, revenue, retention, logos, quotes. The strongest number first.", layouts: ["stats", "headline-stat", "chart-insight", "logos", "quote"], essentialFor: ["investors", "customers"] },
  { id: "market", askUser: "How many customers could buy this and what does one pay per year?", needsEvidence: true, question: "How big can this get?", evidence: "Bottom up market size with the logic behind it.", layouts: ["headline-stat", "stats", "chart-insight"], essentialFor: ["investors"] },
  { id: "business-model", askUser: "How do you charge, what does a customer pay and what is the margin?", needsEvidence: true, question: "How do you make money and is it healthy?", evidence: "Pricing, margins, unit economics.", layouts: ["cards", "stats", "table"], essentialFor: ["investors"] },
  { id: "competition", askUser: "What do customers use today instead, and on which two or three points do you win?", needsEvidence: false, question: "Why do you win against alternatives?", evidence: "An honest comparison on the dimensions customers care about.", layouts: ["comparison", "table"], essentialFor: ["investors", "customers"] },
  { id: "go-to-market", askUser: "How do you find customers today, and which channel has worked so far?", needsEvidence: false, question: "How do you reach customers repeatably?", evidence: "Channels with early proof, sales motion.", layouts: ["cards", "timeline", "chart"], essentialFor: ["investors", "partners"] },
  { id: "roadmap", askUser: "What are the next three to five milestones, and which of them does this round or decision fund?", needsEvidence: false, question: "What comes next?", evidence: "Three to five milestones tied to the ask.", layouts: ["timeline"], essentialFor: ["partners", "customers"] },
  { id: "team", askUser: "Who are the founders or key people, and what in their past makes them right for this?", needsEvidence: false, question: "Why are you the people to build this?", evidence: "Relevant experience, one line each.", layouts: ["team"], essentialFor: ["investors", "partners"] },
  { id: "financials", askUser: "What revenue and costs do you plan for the next two or three years, and on which assumptions?", needsEvidence: true, question: "What do the next years look like?", evidence: "Revenue plan and key assumptions.", layouts: ["chart", "chart-insight", "table"], essentialFor: ["investors"] },
  { id: "risks", askUser: "Which risks do you see, and what is the plan or the trigger for each?", needsEvidence: false, question: "What could go wrong and what do you do about it?", evidence: "Two to four named risks, each with its likelihood or impact and a response.", layouts: ["table", "cards", "points"], essentialFor: ["board"] },
  { id: "decision", askUser: "What decision do you need, by when, and what are the options with their cost?", needsEvidence: false, question: "What do you need us to decide today?", evidence: "The decision as one sentence, the options with cost and impact, and the recommendation.", layouts: ["closing", "comparison", "table", "headline-stat"], essentialFor: ["board"] },
  { id: "ask", askUser: "What exactly do you want from this audience: the amount and use of funds, or the next step?", needsEvidence: false, question: "What exactly do you want from this audience?", evidence: "Amount, use of funds and what it unlocks, or the next step.", layouts: ["closing", "headline-stat", "cards"], essentialFor: ["investors", "customers", "partners"] },
];

export const BEAT_IDS = PITCH_BEATS.map((b) => b.id) as [string, ...string[]];

export function getBeat(id: string): PitchBeat | undefined {
  return PITCH_BEATS.find((b) => b.id === id);
}

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
