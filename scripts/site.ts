/**
 * Landing page into site/dist: index.html, the example decks live (demo/<id>.html) with their covers and the slides
 * of the wall, the icon and the OG image. Static files for S3 behind CloudFront (instadeck.app, deploy workflow).
 * Publishes nothing.
 */
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { EXAMPLES, type Deck } from "@/lib/domain";
import { closeBrowser, renderDeckHtml, renderPng } from "@/lib/engine";
import { LocalFiles, Store } from "@/lib/state";
import { IMAGE_SCALE, deckFiles, landingHtml } from "@/site/page";
import { SHOWCASE, WALL } from "@/site/showcase";

const out = "site/dist";
const version = JSON.parse(readFileSync("package.json", "utf8")).version;
rmSync(out, { recursive: true, force: true });

// The decks go through the same createDeck as a deck from create_deck, so the landing shows exactly what a user gets.
const home = mkdtempSync(join(tmpdir(), "instadeck-site-"));
const store = new Store(new LocalFiles(home), { mode: "local" });
const decks = new Map<string, Deck>();
for (const { id } of SHOWCASE) {
  const e = EXAMPLES.find((x) => x.id === id)!;
  const r = await store.createDeck(
    { title: e.title, brief: { company: "Example", topic: e.purpose, audience: e.audience, language: "en", frame: e.frame, concept: e.concept }, design: e.design, motion: e.motion, slides: e.slides },
    "mcp",
  );
  decks.set(id, r.deck);
}
rmSync(home, { recursive: true, force: true });

for (const [id, deck] of decks) {
  const files = deckFiles(id);
  mkdirSync(`${out}/demo/${id}`, { recursive: true });
  writeFileSync(`${out}/${files.html}`, renderDeckHtml(deck, {}, "present"));
  const [cover] = await renderPng(deck, {}, [0], IMAGE_SCALE.cover);
  writeFileSync(`${out}/${files.cover}`, cover!);
  const wall = WALL.filter((w) => w.deck === id);
  const shots = await renderPng(deck, {}, wall.map((w) => w.slide), IMAGE_SCALE.slide);
  wall.forEach((w, i) => writeFileSync(`${out}/${files.slide(w.slide)}`, shots[i]!));
}
// The old address of the demo stays: it is in the sitemap, in llms.txt and in links shared before.
copyFileSync(`${out}/${deckFiles(SHOWCASE[0]!.id).html}`, `${out}/demo/deck.html`);
writeFileSync(`${out}/index.html`, landingHtml(version));
// 1200x675 for the link preview (og:image)
const [og] = await renderPng(decks.get(SHOWCASE[0]!.id)!, {}, [0], 0.625);
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
