/**
 * Narrative frames: proven story shapes the model chooses from by audience and goal.
 * Every stage of a frame says what job it does and which beats (pitch.ts) serve it. A frame gives the deck
 * a beginning, an end and the order in which the audience takes in the argument. Validation checks the order when the deck
 * names its frame (brief.frame) and the slides carry beats.
 */

export interface FrameStage {
  name: string;
  job: string;
  beats: readonly string[];
}

export interface NarrativeFrame {
  id: string;
  name: string;
  author: string;
  fits: string;
  stages: readonly FrameStage[];
  /** How the frame fails, so it can be avoided. */
  failure: string;
}

export const NARRATIVE_FRAMES: readonly NarrativeFrame[] = [
  {
    id: "classical",
    name: "Classical oration",
    author: "Cicero, Quintilian",
    fits: "Formal persuasion of a skeptical, expert audience: investors, boards, procurement. The most complete arc, it already has a head and a tail.",
    stages: [
      { name: "exordium", job: "Win attention and goodwill.", beats: ["hook"] },
      { name: "narratio", job: "State the facts of the situation.", beats: ["problem", "why-now"] },
      { name: "propositio", job: "State the thesis in one sentence.", beats: ["solution"] },
      { name: "confirmatio", job: "Prove it, strongest proof first.", beats: ["product", "traction", "market", "business-model", "go-to-market", "financials", "team", "roadmap"] },
      { name: "refutatio", job: "Answer the objections before they are raised.", beats: ["competition", "risks"] },
      { name: "peroratio", job: "Sum up and ask.", beats: ["decision", "ask"] },
    ],
    failure: "Confirmatio becomes a list of every fact. Keep the three strongest proofs.",
  },
  {
    id: "scqa",
    name: "Situation, Complication, Question, Answer",
    author: "Barbara Minto",
    fits: "Busy decision makers and analytic decks: boards, consultants, finance. The answer comes early and the rest proves it.",
    stages: [
      { name: "situation", job: "What the audience already agrees with.", beats: ["hook"] },
      { name: "complication", job: "What changed or broke.", beats: ["problem", "why-now"] },
      { name: "answer", job: "The recommendation, stated once and early.", beats: ["solution", "decision"] },
      { name: "support", job: "Grouped proof for the answer.", beats: ["product", "traction", "market", "business-model", "go-to-market", "financials", "competition", "team", "roadmap", "risks"] },
      { name: "close", job: "The ask or the decision, restated.", beats: ["ask", "decision"] },
    ],
    failure: "The situation is too long and the audience waits for the point. One slide of situation is enough.",
  },
  {
    id: "abt",
    name: "And, But, Therefore",
    author: "Randy Olson",
    fits: "Short decks and any audience: a crisp three act tension in ten slides or fewer.",
    stages: [
      { name: "and", job: "The world as it is, agreed facts.", beats: ["hook"] },
      { name: "but", job: "The conflict that makes it urgent.", beats: ["problem", "why-now"] },
      { name: "therefore", job: "What follows: the solution, its proof and the ask.", beats: ["solution", "product", "traction", "market", "business-model", "competition", "go-to-market", "team", "financials", "roadmap", "risks", "decision", "ask"] },
    ],
    failure: "And, and, and: facts without the but. Without conflict there is no reason to listen.",
  },
  {
    id: "monroe",
    name: "Motivated sequence",
    author: "Alan Monroe",
    fits: "Selling to customers and partners: moves the audience from attention to action.",
    stages: [
      { name: "attention", job: "Make them look up.", beats: ["hook"] },
      { name: "need", job: "Show the need is theirs.", beats: ["problem", "why-now"] },
      { name: "satisfaction", job: "Show how the need is met.", beats: ["solution", "product", "competition"] },
      { name: "visualization", job: "Let them see the future with it, with proof that others got there.", beats: ["traction", "market", "business-model", "go-to-market", "team", "financials", "roadmap", "risks"] },
      { name: "action", job: "Tell them exactly what to do next.", beats: ["decision", "ask"] },
    ],
    failure: "Visualization without proof reads as hype. Back it with traction.",
  },
  {
    id: "story-spine",
    name: "Story spine",
    author: "Kenn Adams, Pixar",
    fits: "Founder stories, consumer launches, nonprofits: when the audience must feel it before they analyze it.",
    stages: [
      { name: "once upon a time", job: "The people and their world.", beats: ["hook"] },
      { name: "until one day", job: "What broke or changed.", beats: ["problem", "why-now"] },
      { name: "because of that", job: "What we did about it.", beats: ["solution", "product"] },
      { name: "until finally", job: "Where it got us, with proof.", beats: ["traction", "market", "business-model", "competition", "go-to-market", "team", "financials", "roadmap", "risks"] },
      { name: "and ever since", job: "The new normal we ask them to join.", beats: ["decision", "ask"] },
    ],
    failure: "Charming but unproven. The until finally stage needs numbers.",
  },
  {
    id: "sparkline",
    name: "What is and what could be",
    author: "Nancy Duarte",
    fits: "Vision, keynotes, launches and change inside a company: contrast pulls the audience out of the status quo.",
    stages: [
      { name: "what is", job: "The status quo, recognizable.", beats: ["hook", "problem"] },
      { name: "what could be", job: "The better world, then back and forth between the two.", beats: ["solution", "product", "why-now", "traction", "market", "competition", "business-model", "go-to-market", "team", "financials", "roadmap", "risks"] },
      { name: "call to action", job: "The step that starts the change.", beats: ["decision", "ask"] },
      { name: "new bliss", job: "The world after, as the last image.", beats: [] },
    ],
    failure: "Only what could be: a dream without the pain of what is. Keep returning to the contrast.",
  },
  {
    id: "toulmin",
    name: "Claim, grounds, warrant, rebuttal",
    author: "Stephen Toulmin",
    fits: "Skeptical analysts, due diligence, financial and technical reviews: every claim carries its proof and its limits.",
    stages: [
      { name: "claim", job: "The conclusion, stated plainly.", beats: ["hook", "solution", "decision"] },
      { name: "grounds", job: "The data that supports it.", beats: ["problem", "traction", "market", "financials", "business-model"] },
      { name: "warrant", job: "Why the data supports the claim, and who stands behind it.", beats: ["why-now", "product", "go-to-market", "team", "roadmap"] },
      { name: "rebuttal", job: "Where the claim could fail.", beats: ["competition", "risks"] },
      { name: "qualified claim", job: "The conclusion again, with its conditions, and the ask.", beats: ["decision", "ask"] },
    ],
    failure: "A list of data without the warrant: the audience sees numbers but not why they matter.",
  },
];

export const FRAME_IDS = NARRATIVE_FRAMES.map((f) => f.id) as [string, ...string[]];

export function getFrame(id: string): NarrativeFrame | undefined {
  return NARRATIVE_FRAMES.find((f) => f.id === id);
}

/** Order of the stages a beat sits in within a frame (a beat may serve two stages, e.g. decision at the start and at the end). */
export function stagesOf(frame: NarrativeFrame, beat: string): number[] {
  return frame.stages.flatMap((s, i) => (s.beats.includes(beat) ? [i] : []));
}

export const NARRATIVE_GUIDANCE = {
  choose: "Pick one frame for the audience and goal and set brief.frame. Give every slide its beat. The frame decides the order, the beats decide the content.",
  elicit:
    "Before building, check every beat you plan against the brief. When a beat needs evidence the user has not given (askUser), ask the user in one message: at most five questions, the most important first, each with a suggested default they can accept. Never invent numbers, names or quotes and never put a placeholder on a slide. A beat without its evidence is left out. Ask for visual material in the same message, as one question: a logo, screenshots, photos. The default answer is no images, a typographic deck whose title and chapters use a brand background.",
  close: "Open with the hook and end with the ask or the decision. The last slide calls back to the hook.",
} as const;
