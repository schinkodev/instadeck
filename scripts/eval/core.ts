/**
 * Pure eval logic (no model, no disk): building prompts, the order of pairs, merging verdicts,
 * results and the report. Tested in vitest. The CLI is in run.ts.
 */
import { BEAT_IDS } from "@/lib/domain/pitch";
import type { EvalBrief } from "./briefs";

export const CRITERIA = ["focus", "hierarchy", "concept", "rhythm", "legibility", "polish"] as const;
export type Criterion = (typeof CRITERIA)[number];

export const RUBRIC: Record<Criterion, string> = {
  focus: "Does every slide have one clear focal point that is seen in about three seconds?",
  hierarchy: "Is it obvious what is most important, second, third? Is there a clear size, weight and color order?",
  concept: "Does the deck feel like one designed thing with a point of view, not a template filled with text?",
  rhythm: "Do dense and airy slides alternate, is there a memorable peak moment and a deliberate ending?",
  legibility: "Is text readable from the back of a room, is contrast sufficient, is nothing cramped or cut off?",
  polish: "Alignment, spacing, consistent treatment, no awkward breaks. Would a designer ship it?",
};

export function generationPrompt(b: EvalBrief, school?: string): string {
  const lang = b.language === "cs" ? "Czech" : "English";
  // A fixed school takes the choice of the school out of the comparison: otherwise two decks of one brief may follow different schools.
  const fixed = school ? ` Use the design school "${school}": set brief.concept.school to "${school}" in create_deck and follow the school.` : "";
  return `Create a presentation with the InstaDeck tools for this brief. Write all slide content in ${lang}. No logo or image files are available, so do not ask for them. Decide everything yourself, do not ask questions and do not wait for anyone to confirm a storyline: build the deck directly.${fixed} Finish when the deck exists and every error finding is fixed.

Brief: ${b.text}`;
}

/** `<brief>-r<n>`: the id of run n of a brief, n from 2. */
export const RUN_ID = /^(.+)-r(\d+)$/;

/**
 * Several generations per brief, because one deck per brief cannot tell a change from run to run variance. Run 1 keeps the id
 * of the brief, so earlier results stay valid, run n gets `<id>-r<n>`.
 */
export function expandRuns(briefs: readonly EvalBrief[], runs: number): EvalBrief[] {
  if (!Number.isInteger(runs) || runs < 1) throw new Error(`--runs must be a whole number of at least 1, got ${runs}`);
  const clash = briefs.find((b) => RUN_ID.test(b.id));
  if (clash) throw new Error(`The brief id ${clash.id} looks like a run (<id>-r<n>), pick another id`);
  return briefs.flatMap((b) => Array.from({ length: runs }, (_, i) => (i === 0 ? b : { ...b, id: `${b.id}-r${i + 1}` })));
}

/** Prompt of the asking eval: unlike generationPrompt the model may and should ask before building. */
export function askPrompt(b: EvalBrief): string {
  const lang = b.language === "cs" ? "Czech" : "English";
  return `Create a presentation with the InstaDeck tools for this brief. Write all slide content in ${lang}. No logo or image files are available. Follow the InstaDeck workflow. If it tells you to ask the user or to show something before building, do that in your reply and stop there: do not build until the user answers.

Brief: ${b.text}`;
}

/** Answer to the first round of questions: accept the defaults, and pick an answer where there is none (a person would). */
export const ASK_REPLY = "Yes, use your suggested defaults. Where there is no default, pick the most plausible answer yourself and tell me what you picked.";

export interface AskResult {
  /** The model created a deck before the user could confirm anything. */
  builtEarly: boolean;
  /** Round one: the reply asks about live versus pre-read delivery. */
  askedDelivery: boolean;
  /** Round one: the reply asks about the big idea, the takeaway or the audience action. */
  askedBigIdea: boolean;
  /** Round one: at most five questions. */
  questions: number;
  /** Round two: the reply lists at least five slides (headlines with beats) before building. */
  showedStoryline: boolean;
  pass: boolean;
}

const LISTED = /^\s*(?:\d+[.)]|[-*\u2022]|\|\s*\d+\s*\|)\s*\S/;

/** Judges the two replies of the asking eval by what they contain. Deterministic, so it can be tested. */
export function scoreAsk(first: string, second: string, deckCreated: boolean): AskResult {
  // Only a line that asks counts: "I'll treat this as a pre-read" decides, it does not ask.
  const asking = first.split("\n").filter((l) => l.includes("?"));
  const askedDelivery = asking.some((l) => /\b(?:live|pre-?read|read (?:alone|beforehand|in advance)|in person)\b/i.test(l));
  const askedBigIdea = asking.some((l) => /\b(?:big idea|take ?away|one sentence|should (?:do|believe|decide))\b/i.test(l));
  const questions = asking.length;
  // A storyline lists the slides with their story beats. A list of picked answers or of concepts has no beats.
  const beats = new RegExp(`\\b(?:${BEAT_IDS.join("|")})\\b`, "i");
  const showedStoryline = second.split("\n").filter((l) => LISTED.test(l) && beats.test(l)).length >= 4;
  return { builtEarly: deckCreated, askedDelivery, askedBigIdea, questions, showedStoryline, pass: !deckCreated && askedDelivery && askedBigIdea && questions >= 1 && questions <= 5 && showedStoryline };
}

export interface DeckRef {
  label: string;
  briefId: string;
  /** Paths to slide PNGs in order. */
  slides: string[];
}

export function judgePrompt(first: DeckRef, second: DeckRef): string {
  const list = (d: DeckRef) => d.slides.map((p, i) => `  ${i + 1}. ${p}`).join("\n");
  return `You are a senior presentation designer judging two decks made for the same brief. Open every image with the Read tool before you judge. Judge only what you see.

Deck 1 slides in order:
${list(first)}

Deck 2 slides in order:
${list(second)}

Criteria, scored for each deck from 1 to 5:
${CRITERIA.map((c) => `- ${c}: ${RUBRIC[c]}`).join("\n")}

Then choose the better deck overall as a designer would, not by the sum of scores. Answer with one JSON object and nothing else:
{"scores":{"first":{${CRITERIA.map((c) => `"${c}":0`).join(",")}},"second":{${CRITERIA.map((c) => `"${c}":0`).join(",")}}},"winner":"first"|"second"|"tie","reason":"two sentences"}`;
}

export interface Verdict {
  scores: { first: Record<Criterion, number>; second: Record<Criterion, number> };
  winner: "first" | "second" | "tie";
  reason: string;
}

/** Extracts the first JSON object from the model's answer and checks its shape. */
export function parseVerdict(text: string): Verdict {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("No JSON object in the judge answer");
  const v = JSON.parse(text.slice(start, end + 1)) as Verdict;
  if (!["first", "second", "tie"].includes(v.winner)) throw new Error(`Unknown winner ${String(v.winner)}`);
  for (const side of ["first", "second"] as const) {
    for (const c of CRITERIA) {
      const n = v.scores?.[side]?.[c];
      if (typeof n !== "number" || n < 1 || n > 5) throw new Error(`Missing or invalid score ${side}.${c}`);
    }
  }
  return v;
}

export type Side = "a" | "b" | "tie";
export interface Outcome {
  winner: Side;
  /** strong: both orders agree. weak: one order is a tie. contested: the orders contradict each other (a person decides). */
  strength: "strong" | "weak" | "contested";
}

/** Two judgements of the same pair with swapped order: ab has A as first, ba has B as first. */
export function reconcile(ab: Verdict, ba: Verdict): Outcome {
  const one: Side = ab.winner === "first" ? "a" : ab.winner === "second" ? "b" : "tie";
  const two: Side = ba.winner === "first" ? "b" : ba.winner === "second" ? "a" : "tie";
  if (one === two) return { winner: one, strength: "strong" };
  if (one === "tie") return { winner: two, strength: "weak" };
  if (two === "tie") return { winner: one, strength: "weak" };
  return { winner: "tie", strength: "contested" };
}

/** Average criterion scores for A and B across both orders. */
export function meanScores(ab: Verdict, ba: Verdict): { a: Record<Criterion, number>; b: Record<Criterion, number> } {
  const a = {} as Record<Criterion, number>;
  const b = {} as Record<Criterion, number>;
  for (const c of CRITERIA) {
    a[c] = (ab.scores.first[c] + ba.scores.second[c]) / 2;
    b[c] = (ab.scores.second[c] + ba.scores.first[c]) / 2;
  }
  return { a, b };
}

export interface PairResult {
  briefId: string;
  outcome: Outcome;
  scores: { a: Record<Criterion, number>; b: Record<Criterion, number> };
  reasons: [string, string];
}

export interface DeckStats {
  briefId: string;
  errors: number;
  warnings: number;
  slides: number;
  costUsd?: number;
  /** The school the run asked for (--school). */
  school?: string;
  /** What the deck really declares as `concept.school`, when a school was asked for. */
  deckSchool?: string;
  /** The deck does not follow the school that was asked for, so it must not be compared as a fixed school run. */
  schoolMismatch?: true;
}

export function tally(results: readonly PairResult[]) {
  const wins = { a: 0, b: 0, tie: 0 };
  for (const r of results) wins[r.outcome.winner]++;
  const mean = (side: "a" | "b") => Object.fromEntries(CRITERIA.map((c) => [c, results.length ? results.reduce((s, r) => s + r.scores[side][c], 0) / results.length : 0])) as Record<Criterion, number>;
  return { wins, meanA: mean("a"), meanB: mean("b"), contested: results.filter((r) => r.outcome.strength === "contested").map((r) => r.briefId) };
}

const f1 = (n: number) => n.toFixed(1);

export function reportMarkdown(a: string, b: string, results: readonly PairResult[], stats: { a: DeckStats[]; b: DeckStats[] }): string {
  const t = tally(results);
  const sum = (s: DeckStats[], k: "errors" | "warnings") => s.reduce((n, x) => n + x[k], 0);
  const lines = [
    `# Eval: ${a} vs ${b}`,
    "",
    `Wins: ${a} ${t.wins.a}, ${b} ${t.wins.b}, tie ${t.wins.tie} (${results.length} briefs, each judged in both orders).`,
    "",
    `| Criterion | ${a} | ${b} |`,
    "|---|---|---|",
    ...CRITERIA.map((c) => `| ${c} | ${f1(t.meanA[c])} | ${f1(t.meanB[c])} |`),
    "",
    `Findings: ${a} ${sum(stats.a, "errors")} errors, ${sum(stats.a, "warnings")} warnings. ${b} ${sum(stats.b, "errors")} errors, ${sum(stats.b, "warnings")} warnings.`,
    "",
    "| Brief | Winner | Agreement |",
    "|---|---|---|",
    ...results.map((r) => `| ${r.briefId} | ${r.outcome.winner === "a" ? a : r.outcome.winner === "b" ? b : "tie"} | ${r.outcome.strength} |`),
  ];
  if (t.contested.length) lines.push("", `Needs a human: ${t.contested.join(", ")} (the two orders disagree).`);
  lines.push("", "## Reasons", "", ...results.flatMap((r) => [`- ${r.briefId}: ${r.reasons[0]} / ${r.reasons[1]}`]));
  return lines.join("\n") + "\n";
}
