/**
 * Deck quality eval (V008). Calls the model through `claude -p`, so it is outside `npm test` and costs money.
 *
 *   npm run eval -- generate <label> [--brief id] [--model name] [--repo path]
 *       For every brief the model creates a deck through InstaDeck from THIS checkout, and the slide PNGs,
 *       findings and cost are saved to out/eval/<label>/<brief>/. Compare versions by generating from different branches
 *       (worktrees) under different labels: --repo points at the checkout whose server is used.
 *   npm run eval -- ask <label> [--runs n] [--model name] [--repo path]
 *       Sparse briefs: does the model ask about delivery and the big idea instead of building, and after "use your
 *       defaults" show the storyline before building? Two replies per run, scored by content, results in out/eval/<label>/ask.json.
 *   npm run eval -- compare <labelA> <labelB> [--brief id] [--model name]
 *       A vision model judges pairs of decks by a rubric, each twice with the order swapped.
 *       The report is in out/eval/report-<A>-vs-<B>.md. A person decides the ambiguous pairs.
 */
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { BRIEFS, SPARSE_BRIEFS } from "./briefs";
import { ASK_REPLY, askPrompt, generationPrompt, scoreAsk, judgePrompt, meanScores, parseVerdict, reconcile, reportMarkdown, type DeckRef, type DeckStats, type PairResult, type Verdict } from "./core";

const ROOT = resolve(import.meta.dirname, "../..");
const OUT = join(ROOT, "out/eval");
/** The checkout whose InstaDeck is measured (--repo). Default this one. Eval outputs stay here so they can be compared. */
const repoArg = process.argv.indexOf("--repo");
const REPO = repoArg >= 0 ? resolve(process.argv[repoArg + 1]!) : ROOT;
const GEN_TIMEOUT_MS = 20 * 60_000;
const JUDGE_TIMEOUT_MS = 10 * 60_000;

interface ClaudeResult {
  result: string;
  is_error: boolean;
  total_cost_usd?: number;
  num_turns?: number;
  session_id?: string;
}

function claude(args: string[], cwd: string, timeoutMs: number): Promise<ClaudeResult> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn("claude", ["-p", "--output-format", "json", ...args], { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    const timer = setTimeout(() => child.kill("SIGTERM"), timeoutMs);
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("close", (code) => {
      clearTimeout(timer);
      try {
        resolvePromise(JSON.parse(out) as ClaudeResult);
      } catch {
        reject(new Error(`claude exited with ${code}: ${err.slice(0, 400) || out.slice(0, 400)}`));
      }
    });
  });
}

/** Renders and measures a deck with the code of the measured checkout (render.ts in a subprocess with its tsconfig). */
function renderIn(home: string, out: string): Promise<{ slides: number; errors?: number; warnings?: number }> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(join(REPO, "node_modules/.bin/tsx"), ["--tsconfig", join(REPO, "tsconfig.json"), join(ROOT, "scripts/eval/render.ts"), home, out], { cwd: REPO, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("close", (code) => {
      try {
        resolvePromise(JSON.parse(stdout.trim().split("\n").at(-1)!));
      } catch {
        reject(new Error(`Rendering failed with ${code}: ${stderr.slice(0, 600)}`));
      }
    });
  });
}

function flag(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const selected = () => {
  const only = flag("brief");
  const list = only ? BRIEFS.filter((b) => b.id === only) : BRIEFS;
  if (!list.length) throw new Error(`Unknown brief ${only}`);
  return list;
};

async function generate(label: string) {
  const model = flag("model");
  for (const brief of selected()) {
    const dir = join(OUT, label, brief.id);
    const home = join(dir, "home");
    mkdirSync(home, { recursive: true });
    const config = join(dir, "mcp.json");
    writeFileSync(config, JSON.stringify({ mcpServers: { instadeck: { command: join(REPO, "node_modules/.bin/tsx"), args: ["--tsconfig", join(REPO, "tsconfig.json"), join(REPO, "server/stdio.ts")], env: { INSTADECK_HOME: home } } } }));
    if (existsSync(join(dir, "stats.json")) && !process.argv.includes("--force")) {
      console.error(`[${label}] ${brief.id}: done before, skipped (--force to redo)`);
      continue;
    }
    // Resuming after an interruption: a deck the model already created is only rendered, not generated again.
    let run: ClaudeResult;
    const metaPath = join(dir, "run.json");
    if (readdirSync(home).length && existsSync(metaPath) && !process.argv.includes("--force")) {
      run = JSON.parse(readFileSync(metaPath, "utf8")) as ClaudeResult;
      console.error(`[${label}] ${brief.id}: deck exists, rendering only`);
    } else {
      const work = mkdtempSync(join(tmpdir(), "instadeck-eval-"));
      console.error(`[${label}] ${brief.id}: generating`);
      run = await claude(["--mcp-config", config, "--strict-mcp-config", "--allowedTools", "mcp__instadeck", "--max-turns", "60", ...(model ? ["--model", model] : []), generationPrompt(brief)], work, GEN_TIMEOUT_MS);
      writeFileSync(metaPath, JSON.stringify(run));
    }

    const rendered = await renderIn(home, dir);
    if (!rendered.slides) {
      console.error(`[${label}] ${brief.id}: no deck created (${run.is_error ? "error" : run.result.slice(0, 120)})`);
      writeFileSync(join(dir, "stats.json"), JSON.stringify({ briefId: brief.id, errors: 0, warnings: 0, slides: 0, costUsd: run.total_cost_usd, failed: true }));
      continue;
    }
    const stats: DeckStats = { briefId: brief.id, errors: rendered.errors!, warnings: rendered.warnings!, slides: rendered.slides, costUsd: run.total_cost_usd };
    writeFileSync(join(dir, "stats.json"), JSON.stringify(stats));
    console.error(`[${label}] ${brief.id}: ${stats.slides} slides, ${stats.errors} errors, ${stats.warnings} warnings, ${run.num_turns ?? "?"} turns`);
  }
}


function deckRef(label: string, briefId: string): DeckRef | undefined {
  const dir = join(OUT, label, briefId, "slides");
  if (!existsSync(dir)) return undefined;
  return { label, briefId, slides: readdirSync(dir).sort().map((f) => join(dir, f)) };
}

/**
 * Judgement of one pair in one order. It is saved to disk, so a repeated compare skips a finished pair.
 * An answer without valid JSON is retried once (the model sometimes answers in prose), the raw text stays in .raw.txt.
 */
async function judge(first: DeckRef, second: DeckRef, cache: string): Promise<Verdict> {
  if (existsSync(cache)) return JSON.parse(readFileSync(cache, "utf8")) as Verdict;
  for (let attempt = 0; attempt < 2; attempt++) {
    const run = await claude(["--allowedTools", "Read", "--max-turns", "60", ...(flag("model") ? ["--model", flag("model")!] : []), judgePrompt(first, second)], ROOT, JUDGE_TIMEOUT_MS);
    const last = run.result ?? "";
    try {
      const v = parseVerdict(last);
      writeFileSync(cache, JSON.stringify(v));
      return v;
    } catch {
      writeFileSync(`${cache}.raw.txt`, last);
    }
  }
  throw new Error(`The judge gave no valid verdict twice, see ${cache}.raw.txt`);
}

async function compare(a: string, b: string) {
  const results: PairResult[] = [];
  const stats = { a: [] as DeckStats[], b: [] as DeckStats[] };
  for (const brief of selected()) {
    const da = deckRef(a, brief.id);
    const db = deckRef(b, brief.id);
    if (!da || !db) {
      console.error(`${brief.id}: missing deck for ${!da ? a : b}, skipped`);
      continue;
    }
    stats.a.push(JSON.parse(readFileSync(join(OUT, a, brief.id, "stats.json"), "utf8")));
    stats.b.push(JSON.parse(readFileSync(join(OUT, b, brief.id, "stats.json"), "utf8")));
    console.error(`${brief.id}: judging both orders`);
    const dir = join(OUT, "judge", `${a}-vs-${b}`);
    mkdirSync(dir, { recursive: true });
    const [ab, ba] = await Promise.all([judge(da, db, join(dir, `${brief.id}-ab.json`)), judge(db, da, join(dir, `${brief.id}-ba.json`))]);
    results.push({ briefId: brief.id, outcome: reconcile(ab, ba), scores: meanScores(ab, ba), reasons: [ab.reason, ba.reason] });
  }
  const report = reportMarkdown(a, b, results, stats);
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, `report-${a}-vs-${b}.md`), report);
  console.log(report);
}

/** Asking eval: round one must ask and not build, round two (after accepting the defaults) must show the storyline and not build yet. */
async function ask(label: string) {
  const runs = Number(flag("runs") ?? 3);
  const model = flag("model");
  const results: unknown[] = [];
  const only = flag("brief");
  for (const brief of SPARSE_BRIEFS.filter((b) => !only || b.id === only)) {
    for (let i = 1; i <= runs; i++) {
      const dir = join(OUT, label, "ask", `${brief.id}-${i}`);
      const home = join(dir, "home");
      // A run starts clean: a deck left by an earlier or interrupted run would score as built too early.
      rmSync(dir, { recursive: true, force: true });
      mkdirSync(home, { recursive: true });
      const config = join(dir, "mcp.json");
      writeFileSync(config, JSON.stringify({ mcpServers: { instadeck: { command: join(REPO, "node_modules/.bin/tsx"), args: ["--tsconfig", join(REPO, "tsconfig.json"), join(REPO, "server/stdio.ts")], env: { INSTADECK_HOME: home } } } }));
      const base = ["--mcp-config", config, "--strict-mcp-config", "--allowedTools", "mcp__instadeck", "--max-turns", "30", ...(model ? ["--model", model] : [])];
      const work = mkdtempSync(join(tmpdir(), "instadeck-eval-"));
      console.error(`[${label}] ${brief.id} #${i}: round one`);
      const one = await claude([...base, askPrompt(brief)], work, GEN_TIMEOUT_MS);
      // A round that failed is a failure of the harness, not an answer of the model: do not score it.
      if (one.is_error || !one.result || !one.session_id) throw new Error(`Round one of ${brief.id} #${i} gave no answer (${one.is_error ? "error" : "no result or session"}). See ${dir}`);
      console.error(`[${label}] ${brief.id} #${i}: round two`);
      const two = await claude([...base, "--resume", one.session_id, ASK_REPLY], work, GEN_TIMEOUT_MS);
      if (two.is_error || !two.result) throw new Error(`Round two of ${brief.id} #${i} gave no answer. See ${dir}`);
      // Locally every deck is a folder with a deck.json directly in the home, next to hidden folders for assets and brand kits.
      const deckCreated = readdirSync(home, { withFileTypes: true }).some((e) => e.isDirectory() && !e.name.startsWith(".") && existsSync(join(home, e.name, "deck.json")));
      const score = scoreAsk(one.result, two.result, deckCreated);
      writeFileSync(join(dir, "replies.json"), JSON.stringify({ first: one.result, second: two.result, score }, null, 2));
      results.push({ briefId: brief.id, run: i, ...score, costUsd: (one.total_cost_usd ?? 0) + (two.total_cost_usd ?? 0) });
      // Written after every run, so an interruption keeps what was measured.
      mkdirSync(join(OUT, label), { recursive: true });
      writeFileSync(join(OUT, label, "ask.json"), JSON.stringify(results, null, 2));
      console.error(`[${label}] ${brief.id} #${i}: ${score.pass ? "pass" : "fail"} ${JSON.stringify(score)}`);
    }
  }
  mkdirSync(join(OUT, label), { recursive: true });
  writeFileSync(join(OUT, label, "ask.json"), JSON.stringify(results, null, 2));
  const passed = (results as { pass: boolean }[]).filter((r) => r.pass).length;
  console.log(`${label}: ${passed} of ${results.length} runs asked first and showed the storyline before building`);
}

const [cmd, x, y] = process.argv.slice(2);
if (cmd === "ask" && x) await ask(x);
else if (cmd === "generate" && x) await generate(x);
else if (cmd === "compare" && x && y) await compare(x, y);
else {
  console.error("Usage: npm run eval -- generate <label> | ask <label> | compare <labelA> <labelB>  [--brief id] [--model name]");
  process.exit(1);
}
