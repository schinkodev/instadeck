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
// Pro vyhledávače a nástroje pro indexaci: robots, sitemap a llms.txt.
writeFileSync(`${out}/robots.txt`, "User-agent: *\nAllow: /\n\nSitemap: https://instadeck.app/sitemap.xml\n");
writeFileSync(
  `${out}/sitemap.xml`,
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>https://instadeck.app/</loc></url>\n  <url><loc>https://instadeck.app/demo/deck.html</loc></url>\n</urlset>\n`,
);
writeFileSync(
  `${out}/llms.txt`,
  `# InstaDeck

> Branded, animated pitch decks built by your own Claude. Free, open source (MIT), no account.

InstaDeck is an MCP server. You describe your company and add your logo, Claude writes the story and the design, InstaDeck renders a branded presentation with motion, checks every slide and gives you a link, a PDF, a PowerPoint file or a single HTML file.

## Use it

- Hosted connector (nothing to install): https://instadeck.app/mcp
- Local server: \`npx -y instadeck\`
- Claude Desktop extension: https://github.com/schinkodev/instadeck/releases/latest

## Links

- [Website](https://instadeck.app/)
- [Live demo deck](https://instadeck.app/demo/deck.html)
- [Source code, MIT license](https://github.com/schinkodev/instadeck)
- [npm package](https://www.npmjs.com/package/instadeck)
`,
);
await closeBrowser();
console.log(`${out}/index.html`);
