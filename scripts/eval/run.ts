/**
 * Eval kvality decků (V008). Volá model přes `claude -p`, proto je mimo `npm test` a stojí peníze.
 *
 *   npm run eval -- generate <label> [--brief id] [--model name] [--repo path]
 *       Pro každý brief nechá model vytvořit deck přes InstaDeck z TOHOTO checkoutu a uloží PNG slidů,
 *       nálezy a cenu do out/eval/<label>/<brief>/. Verze porovnáváš tak, že generuješ z různých větví
 *       (worktree) pod různými štítky: --repo ukáže na checkout, jehož server se použije.
 *   npm run eval -- compare <labelA> <labelB> [--brief id] [--model name]
 *       Vision model posoudí dvojice decků podle rubriky, každou dvakrát s prohozeným pořadím.
 *       Zpráva je v out/eval/report-<A>-vs-<B>.md. Nejednoznačné dvojice rozhoduje člověk.
 */
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { closeBrowser, measureDeck, renderPng, validateDeck } from "@/lib/engine";
import { Store } from "@/lib/state";
import { BRIEFS } from "./briefs";
import { generationPrompt, judgePrompt, meanScores, parseVerdict, reconcile, reportMarkdown, type DeckRef, type DeckStats, type PairResult, type Verdict } from "./core";

const ROOT = resolve(import.meta.dirname, "../..");
const OUT = join(ROOT, "out/eval");
/** Checkout, jehož InstaDeck se měří (--repo). Výchozí tento. Výstupy evalu zůstávají tady, aby šly porovnat. */
const repoArg = process.argv.indexOf("--repo");
const REPO = repoArg >= 0 ? resolve(process.argv[repoArg + 1]!) : ROOT;
const GEN_TIMEOUT_MS = 20 * 60_000;
const JUDGE_TIMEOUT_MS = 10 * 60_000;

interface ClaudeResult {
  result: string;
  is_error: boolean;
  total_cost_usd?: number;
  num_turns?: number;
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
    const store = Store.local(home);
    // Navázání po přerušení: deck, který model už vytvořil, se jen vykreslí, negeneruje se znovu.
    let run: ClaudeResult;
    const metaPath = join(dir, "run.json");
    if ((await store.listDecks()).length && existsSync(metaPath) && !process.argv.includes("--force")) {
      run = JSON.parse(readFileSync(metaPath, "utf8")) as ClaudeResult;
      console.error(`[${label}] ${brief.id}: deck exists, rendering only`);
    } else {
      const work = mkdtempSync(join(tmpdir(), "instadeck-eval-"));
      console.error(`[${label}] ${brief.id}: generating`);
      run = await claude(["--mcp-config", config, "--strict-mcp-config", "--allowedTools", "mcp__instadeck", "--max-turns", "60", ...(model ? ["--model", model] : []), generationPrompt(brief)], work, GEN_TIMEOUT_MS);
      writeFileSync(metaPath, JSON.stringify(run));
    }

    const decks = await store.listDecks();
    if (!decks.length) {
      console.error(`[${label}] ${brief.id}: no deck created (${run.is_error ? "error" : run.result.slice(0, 120)})`);
      writeFileSync(join(dir, "stats.json"), JSON.stringify({ briefId: brief.id, errors: 0, warnings: 0, slides: 0, costUsd: run.total_cost_usd, failed: true }));
      continue;
    }
    const deck = await store.getDeck(decks[0]!.id);
    const assets = await store.assetsFor(deck);
    const findings = [...validateDeck(deck, await store.assetIndex(deck)), ...(await measureDeck(deck, assets))];
    const pngs = await renderPng(deck, assets, deck.slides.map((_, i) => i), 0.5);
    const slidesDir = join(dir, "slides");
    mkdirSync(slidesDir, { recursive: true });
    pngs.forEach((p, i) => writeFileSync(join(slidesDir, `${String(i + 1).padStart(2, "0")}.png`), p));
    writeFileSync(join(dir, "findings.json"), JSON.stringify(findings, null, 2));
    const stats: DeckStats = { briefId: brief.id, errors: findings.filter((f) => f.severity === "error").length, warnings: findings.filter((f) => f.severity === "warning").length, slides: deck.slides.length, costUsd: run.total_cost_usd };
    writeFileSync(join(dir, "stats.json"), JSON.stringify(stats));
    console.error(`[${label}] ${brief.id}: ${stats.slides} slides, ${stats.errors} errors, ${stats.warnings} warnings, ${run.num_turns ?? "?"} turns`);
  }
  await closeBrowser();
}

function deckRef(label: string, briefId: string): DeckRef | undefined {
  const dir = join(OUT, label, briefId, "slides");
  if (!existsSync(dir)) return undefined;
  return { label, briefId, slides: readdirSync(dir).sort().map((f) => join(dir, f)) };
}

async function judge(first: DeckRef, second: DeckRef): Promise<Verdict> {
  const run = await claude(["--allowedTools", "Read", "--max-turns", "60", ...(flag("model") ? ["--model", flag("model")!] : []), judgePrompt(first, second)], ROOT, JUDGE_TIMEOUT_MS);
  return parseVerdict(run.result);
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
    const [ab, ba] = await Promise.all([judge(da, db), judge(db, da)]);
    results.push({ briefId: brief.id, outcome: reconcile(ab, ba), scores: meanScores(ab, ba), reasons: [ab.reason, ba.reason] });
  }
  const report = reportMarkdown(a, b, results, stats);
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, `report-${a}-vs-${b}.md`), report);
  console.log(report);
}

const [cmd, x, y] = process.argv.slice(2);
if (cmd === "generate" && x) await generate(x);
else if (cmd === "compare" && x && y) await compare(x, y);
else {
  console.error("Usage: npm run eval -- generate <label> | compare <labelA> <labelB>  [--brief id] [--model name]");
  process.exit(1);
}
