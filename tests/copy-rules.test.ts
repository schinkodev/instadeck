import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Pravidla z CLAUDE.md: v uživatelských textech žádné slovo "AI", nikde em dash.
const ROOT = new URL("..", import.meta.url).pathname;
const SKIP = new Set(["node_modules", ".git", ".data", "dist", "dist-bundle", "dist-lambda", "out"]);

function walk(dir: string, exts: string[]): string[] {
  return readdirSync(dir).flatMap((name) => {
    if (SKIP.has(name)) return [];
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return walk(path, exts);
    return exts.some((e) => name.endsWith(e)) ? [path] : [];
  });
}

describe("copy rules", () => {
  it("no em dash in source files", () => {
    const offenders = walk(ROOT, [".ts", ".js", ".md", ".css", ".json", ".mjs", ".yml"])
      .filter((f) => !f.endsWith("copy-rules.test.ts") && !f.endsWith("CLAUDE.md"))
      .filter((f) => readFileSync(f, "utf8").includes("—"));
    expect(offenders).toEqual([]);
  });

  it("no word AI in user facing sources", () => {
    const dirs = ["lib", "server", "skills", "site"].map((d) => join(ROOT, d)).filter((d) => { try { return statSync(d).isDirectory(); } catch { return false; } });
    const offenders = dirs.flatMap((d) => walk(d, [".ts", ".js", ".md"])).filter((f) => /\bAI\b/.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });
});
