/**
 * Landing page do site/dist: index.html, živý ukázkový deck (demo/deck.html), ikona a OG obrázek.
 * Statické soubory pro S3 za CloudFrontem (instadeck.app, deploy workflow). Nic nepublikuje.
 */
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { closeBrowser, renderDeckHtml, renderPng } from "@/lib/engine";
import { SAMPLE_ASSETS, sampleDeck } from "@/tests/fixtures/sample-deck";
import { landingHtml } from "@/site/page";

const out = "site/dist";
const version = JSON.parse(readFileSync("package.json", "utf8")).version;
rmSync(out, { recursive: true, force: true });
mkdirSync(`${out}/demo`, { recursive: true });

const deck = sampleDeck();
// Demo na landingu ukazuje pohybový jazyk z V006: nadpis plyne ze slidu na slide (morph), obsah vstupuje po blocích.
deck.motion = {
  intensity: "expressive",
  rationale: "A seed pitch that should feel like one continuous story: the headline glides from slide to slide and each number counts up once.",
  entrance: "rise",
  transition: "morph",
  tempo: "confident",
  heroes: true,
};
// Slidy bez společného nadpisu, loga nebo obrázku s předchozím se krájí prolnutím, morph tam nemá co nést.
for (const s of deck.slides) if (["quote", "image-full"].includes(s.layout)) s.motion = { transition: "fade" };
writeFileSync(`${out}/index.html`, landingHtml(version));
writeFileSync(`${out}/demo/deck.html`, renderDeckHtml(deck, SAMPLE_ASSETS, "present"));
// 1200x675 pro náhled odkazu (og:image)
const [og] = await renderPng(deck, SAMPLE_ASSETS, [0], 0.625);
writeFileSync(`${out}/og.png`, og!);
copyFileSync("brand/mark.svg", `${out}/icon.svg`);
await closeBrowser();
console.log(`${out}/index.html`);
