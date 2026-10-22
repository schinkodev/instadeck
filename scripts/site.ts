/**
 * Landing page into site/dist: index.html, a live sample deck (demo/deck.html), the icon and the OG image.
 * Static files for S3 behind CloudFront (instadeck.app, deploy workflow). Publishes nothing.
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
// The demo on the landing shows the motion language from V006: the headline flows from slide to slide (morph), content enters in blocks.
deck.motion = {
  intensity: "expressive",
  rationale: "A seed pitch that should feel like one continuous story: the headline glides from slide to slide and each number counts up once.",
  entrance: "rise",
  transition: "morph",
  tempo: "confident",
  heroes: true,
};
// Slides without a shared headline, logo or image with the previous one change with the fade, morph has nothing to carry there.
for (const s of deck.slides) if (["quote", "image-full"].includes(s.layout)) s.motion = { transition: "fade" };
writeFileSync(`${out}/index.html`, landingHtml(version));
writeFileSync(`${out}/demo/deck.html`, renderDeckHtml(deck, SAMPLE_ASSETS, "present"));
// 1200x675 for the link preview (og:image)
const [og] = await renderPng(deck, SAMPLE_ASSETS, [0], 0.625);
writeFileSync(`${out}/og.png`, og!);
copyFileSync("brand/mark.svg", `${out}/icon.svg`);
// For search engines and indexing tools: robots, sitemap and llms.txt.
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
