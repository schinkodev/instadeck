/** Renders the sample deck into out/sample (HTML presentation, PDF, PNG) for a manual check. */
import { mkdirSync, writeFileSync } from "node:fs";
import { closeBrowser, exportPdf, measureDeck, renderDeckHtml, renderPng, validateDeck } from "@/lib/engine";
import { SAMPLE_ASSET_INDEX, SAMPLE_ASSETS, sampleDeck } from "@/tests/fixtures/sample-deck";

const deck = sampleDeck();
const dir = "out/sample";
mkdirSync(dir, { recursive: true });
writeFileSync(`${dir}/deck.html`, renderDeckHtml(deck, SAMPLE_ASSETS, "present"));
writeFileSync(`${dir}/static.html`, renderDeckHtml(deck, SAMPLE_ASSETS, "static"));
writeFileSync(`${dir}/deck.pdf`, await exportPdf(deck, SAMPLE_ASSETS));
const pngs = await renderPng(deck, SAMPLE_ASSETS, deck.slides.map((_, i) => i), 0.5);
pngs.forEach((p, i) => writeFileSync(`${dir}/slide-${String(i + 1).padStart(2, "0")}.png`, p));
const findings = [...validateDeck(deck, SAMPLE_ASSET_INDEX), ...(await measureDeck(deck, SAMPLE_ASSETS))];
console.log(JSON.stringify(findings, null, 2));
await closeBrowser();
