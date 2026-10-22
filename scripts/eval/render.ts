/**
 * Rendering a deck for the eval: run.ts runs it in a subprocess with the tsconfig of the measured checkout (--repo), so
 * the @/ aliases point into it and the deck is read, measured and drawn by the same code that created it.
 *   tsx --tsconfig <repo>/tsconfig.json scripts/eval/render.ts <home> <out-dir>
 * Prints JSON { slides, errors, warnings } to stdout, or { slides: 0 } when no deck was created.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { closeBrowser, measureDeck, renderPng, validateDeck } from "@/lib/engine";
import { Store } from "@/lib/state";

const [home, out] = process.argv.slice(2);
if (!home || !out) throw new Error("Usage: render.ts <home> <out-dir>");
const store = Store.local(home);
const decks = await store.listDecks();
if (!decks.length) {
  console.log(JSON.stringify({ slides: 0 }));
} else {
  const deck = await store.getDeck(decks[0]!.id);
  const assets = await store.assetsFor(deck);
  const findings = [...validateDeck(deck, await store.assetIndex(deck)), ...(await measureDeck(deck, assets))];
  const pngs = await renderPng(deck, assets, deck.slides.map((_, i) => i), 0.5);
  mkdirSync(join(out, "slides"), { recursive: true });
  pngs.forEach((p, i) => writeFileSync(join(out, "slides", `${String(i + 1).padStart(2, "0")}.png`), p));
  writeFileSync(join(out, "findings.json"), JSON.stringify(findings, null, 2));
  console.log(JSON.stringify({ slides: deck.slides.length, errors: findings.filter((f) => f.severity === "error").length, warnings: findings.filter((f) => f.severity === "warning").length }));
}
await closeBrowser();
