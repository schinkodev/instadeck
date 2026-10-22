import { describe, expect, it } from "vitest";
import { BRIEFS, SPARSE_BRIEFS } from "@/scripts/eval/briefs";
import { CRITERIA, RUN_ID, askPrompt, expandRuns, generationPrompt, judgePrompt, meanScores, parseVerdict, reconcile, reportMarkdown, scoreAsk, tally, type Criterion, type PairResult, type Verdict } from "@/scripts/eval/core";

const scores = (n: number) => Object.fromEntries(CRITERIA.map((c) => [c, n])) as Record<Criterion, number>;
const verdict = (winner: Verdict["winner"], first = 3, second = 3): Verdict => ({ scores: { first: scores(first), second: scores(second) }, winner, reason: "r" });

describe("eval briefs", () => {
  it("are unique, cover both languages and hold enough information to build a deck", () => {
    expect(new Set(BRIEFS.map((b) => b.id)).size).toBe(BRIEFS.length);
    expect(BRIEFS).toHaveLength(10);
    expect(new Set(BRIEFS.map((b) => b.language))).toEqual(new Set(["en", "cs"]));
    for (const b of BRIEFS) expect(b.text.length, b.id).toBeGreaterThan(150);
  });

  it("states the language and forbids questions in the generation prompt", () => {
    const cs = BRIEFS.find((b) => b.language === "cs")!;
    expect(generationPrompt(cs)).toContain("Czech");
    expect(generationPrompt(cs)).toContain("do not ask questions");
  });
});

describe("eval design", () => {
  it("can fix the school of every deck in the prompt", () => {
    const b = BRIEFS[0]!;
    expect(generationPrompt(b)).not.toContain("design school");
    expect(generationPrompt(b, "swiss")).toContain('design school "swiss"');
    expect(generationPrompt(b, "swiss")).toContain('brief.concept.school to "swiss"');
    expect(generationPrompt(b, "swiss")).toContain("do not ask questions");
  });

  it("generates several decks per brief and keeps the id of run one", () => {
    const two = expandRuns(BRIEFS.slice(0, 2), 3);
    expect(two.map((b) => b.id)).toEqual([BRIEFS[0]!.id, `${BRIEFS[0]!.id}-r2`, `${BRIEFS[0]!.id}-r3`, BRIEFS[1]!.id, `${BRIEFS[1]!.id}-r2`, `${BRIEFS[1]!.id}-r3`]);
    expect(two[1]!.text).toBe(BRIEFS[0]!.text);
    expect(expandRuns(BRIEFS, 1)).toEqual([...BRIEFS]);
    expect(() => expandRuns(BRIEFS, 0)).toThrow(/at least 1/);
    expect(() => expandRuns(BRIEFS, 1.5)).toThrow(/whole number/);
    // A brief id that looks like a run would collide with the ids of the runs.
    expect(() => expandRuns([{ ...BRIEFS[0]!, id: "devtools-r2" }], 2)).toThrow(/looks like a run/);
    for (const b of BRIEFS) expect(RUN_ID.test(b.id), b.id).toBe(false);
    expect("seed-saas-r2".replace(RUN_ID, "$1")).toBe("seed-saas");
  });
});

describe("asking eval", () => {
  const asks = "Before I build:\n1. Will you present this live or send it as a pre-read?\n2. What is the big idea: what should the audience take away?\n3. How long is the slot?";
  const storyline = ["1. Hook: Margins are thinning", "2. Problem: Cost drift", "3. Traction: Q3 bridge", "4. Risks: Fuel prices", "5. Ask: Approve budget"].join("\n");

  it("keeps sparse briefs out of the quality eval and lets the model ask", () => {
    expect(BRIEFS.some((b) => SPARSE_BRIEFS.some((s) => s.id === b.id))).toBe(false);
    expect(askPrompt(SPARSE_BRIEFS[0]!)).not.toContain("do not ask questions");
  });

  it("passes when the model asks first and shows the storyline before building", () => {
    expect(scoreAsk(asks, storyline, false)).toMatchObject({ askedDelivery: true, askedBigIdea: true, questions: 3, showedStoryline: true, pass: true });
  });

  it("reads a storyline given as a table", () => {
    const table = ["| # | Beat | Headline |", "|---|---|---|", ...[1, 2, 3, 4, 5].map((n) => `| ${n} | hook | Headline ${n} |`)].join("\n");
    expect(scoreAsk(asks, table, false).showedStoryline).toBe(true);
  });

  it("does not credit a statement, a list of picked answers or a list without beats", () => {
    expect(scoreAsk("I will treat this as a live talk, and the big idea is one sentence.", storyline, false).pass).toBe(false);
    expect(scoreAsk(asks, "I picked:\n1. live\n2. twelve minutes\n3. navy\n4. no logo\n5. yes", false).showedStoryline).toBe(false);
    expect(scoreAsk("Ready.", storyline, false).questions).toBe(0);
    expect(scoreAsk("Ready.", storyline, false).pass).toBe(false);
  });

  it("fails when the model builds early, skips delivery or skips the storyline", () => {
    expect(scoreAsk(asks, storyline, true).pass).toBe(false);
    expect(scoreAsk("What is the topic?", storyline, false).pass).toBe(false);
    expect(scoreAsk(asks, "I will build it now.", false).pass).toBe(false);
  });
});

describe("eval judging", () => {
  it("parses a verdict from text around the JSON and rejects an invalid one", () => {
    const json = JSON.stringify(verdict("first"));
    expect(parseVerdict(`Here is my answer:\n${json}\n`).winner).toBe("first");
    expect(() => parseVerdict("no json")).toThrow();
    expect(() => parseVerdict(JSON.stringify({ ...verdict("first"), winner: "both" }))).toThrow(/winner/);
    expect(() => parseVerdict(JSON.stringify({ ...verdict("first"), scores: { first: scores(3), second: { ...scores(3), focus: 9 } } }))).toThrow(/score/);
  });

  it("keeps the deck labels out of the judge prompt", () => {
    const prompt = judgePrompt({ label: "baseline", briefId: "x", slides: ["/p/01.png"] }, { label: "candidate", briefId: "x", slides: ["/p/02.png"] });
    expect(prompt).not.toContain("baseline");
    expect(prompt).not.toContain("candidate");
    expect(prompt).toContain("/p/01.png");
  });

  it("reconciles two orders: agreement, a weak win and a contested pair", () => {
    // ab: A is first. ba: B is first.
    expect(reconcile(verdict("first"), verdict("second"))).toEqual({ winner: "a", strength: "strong" });
    expect(reconcile(verdict("second"), verdict("first"))).toEqual({ winner: "b", strength: "strong" });
    expect(reconcile(verdict("first"), verdict("tie"))).toEqual({ winner: "a", strength: "weak" });
    expect(reconcile(verdict("tie"), verdict("first"))).toEqual({ winner: "b", strength: "weak" });
    // the judge prefers whatever comes first: contradicts itself
    expect(reconcile(verdict("first"), verdict("first"))).toEqual({ winner: "tie", strength: "contested" });
    expect(reconcile(verdict("tie"), verdict("tie"))).toEqual({ winner: "tie", strength: "strong" });
  });

  it("averages scores over both orders by deck, not by position", () => {
    const ab = verdict("first", 5, 1);
    const ba = verdict("first", 1, 5);
    const m = meanScores(ab, ba);
    expect(m.a.focus).toBe(5);
    expect(m.b.focus).toBe(1);
  });

  it("tallies wins and lists the pairs that need a human", () => {
    const r = (briefId: string, winner: "a" | "b" | "tie", strength: "strong" | "weak" | "contested"): PairResult => ({ briefId, outcome: { winner, strength }, scores: { a: scores(4), b: scores(3) }, reasons: ["x", "y"] });
    const results = [r("one", "a", "strong"), r("two", "b", "weak"), r("three", "tie", "contested")];
    const t = tally(results);
    expect(t.wins).toEqual({ a: 1, b: 1, tie: 1 });
    expect(t.meanA.focus).toBe(4);
    expect(t.contested).toEqual(["three"]);
    const md = reportMarkdown("base", "new", results, { a: [{ briefId: "one", errors: 1, warnings: 2, slides: 10 }], b: [{ briefId: "one", errors: 0, warnings: 1, slides: 11 }] });
    expect(md).toContain("Wins: base 1, new 1, tie 1");
    expect(md).toContain("Needs a human: three");
    expect(md).not.toContain("\u2014");
  });
});
