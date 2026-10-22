/**
 * Promotes a deck that turned out well to a golden example in lib/domain/examples.json.
 *
 *   npm run example -- <zdroj> <id> --title "..." --purpose "..." --audience "..." --why "a|b|c" --content-is-public
 *
 * The source is a path to deck.json (local server) or a link instadeck.app/d/<id> (hosted connector,
 * the deck is read through the MCP tool get_deck). Every user of the server sees the example, so the content must
 * have no real names and numbers, which --content-is-public confirms. The deck must have no assets and no
 * validation warnings, otherwise the example is refused.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { deckSchema, exampleSchema, type Block, type Deck } from "@/lib/domain";
import { validateDeck } from "@/lib/engine";

const FILE = "lib/domain/examples.json";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    title: { type: "string" },
    purpose: { type: "string" },
    audience: { type: "string" },
    why: { type: "string", description: "Reasons it works, separated by |" },
    connector: { type: "string", default: "https://instadeck.app/mcp" },
    "content-is-public": { type: "boolean", default: false },
  },
});
const [source, id] = positionals;
const fail = (msg: string): never => {
  console.error(msg);
  process.exit(1);
};

if (!source || !id) fail("Usage: npm run example -- <deck.json | https://instadeck.app/d/ID> <example-id> --title ... --purpose ... --audience ... --why 'a|b' --content-is-public");
if (!values["content-is-public"]) fail("Examples are shown to every user. Replace real names and numbers, then pass --content-is-public.");
for (const k of ["title", "purpose", "audience", "why"] as const) if (!values[k]) fail(`Missing --${k}`);

async function load(src: string): Promise<Deck> {
  const hosted = src.match(/^https?:\/\/[^/]+\/d\/([a-z0-9]+)/);
  if (!hosted) return deckSchema.parse(JSON.parse(readFileSync(src, "utf8")));
  const client = new Client({ name: "instadeck-promote", version: "1.0.0" });
  await client.connect(new StreamableHTTPClientTransport(new URL(values.connector!)));
  try {
    const r = await client.callTool({ name: "get_deck", arguments: { deck_id: hosted[1] } });
    if (r.isError) fail(`get_deck failed: ${JSON.stringify(r.structuredContent)}`);
    return deckSchema.parse((r.structuredContent as { deck: unknown }).deck);
  } finally {
    await client.close();
  }
}

const assetIds = (b: Block): string[] =>
  b.type === "image" || b.type === "logo" ? [b.assetId] : b.type === "logos" ? b.items.map((i) => i.assetId) : b.type === "team" ? b.people.flatMap((p) => (p.photoAssetId ? [p.photoAssetId] : [])) : [];

const deck = await load(source!);
const withAssets = deck.slides.flatMap((s, i) => Object.values(s.blocks).some((b) => assetIds(b).length) ? [i + 1] : []);
if (withAssets.length) fail(`Slides ${withAssets.join(", ")} use image or logo assets. Examples carry no assets: remove those blocks and promote the deck again.`);
if (deck.design.fonts.heading.source === "asset" || deck.design.fonts.body.source === "asset") fail("The deck uses an uploaded font. Examples use curated Google Fonts only.");

if (!deck.brief.concept) fail("A golden example declares its design concept: set brief.concept, then promote the deck again.");
if (!deck.brief.frame) fail("A golden example declares its narrative frame: set brief.frame and give the slides their beats, then promote the deck again.");

const findings = validateDeck(deck, {}).filter((f) => f.severity !== "info");
if (findings.length) fail(`The deck has findings, a golden example has none:\n${findings.map((f) => `  ${f.severity} ${f.rule}${f.slideId ? ` (${f.slideId})` : ""}: ${f.message}`).join("\n")}`);

const example = exampleSchema.parse({
  id,
  title: values.title,
  purpose: values.purpose,
  audience: values.audience,
  frame: deck.brief.frame,
  concept: deck.brief.concept,
  why: values.why!.split("|").map((x) => x.trim()),
  design: deck.design,
  motion: deck.motion,
  slides: deck.slides.map(({ id: _slideId, ...slide }) => slide),
});

const all = JSON.parse(readFileSync(FILE, "utf8")) as { id: string }[];
const at = all.findIndex((e) => e.id === id);
if (at >= 0) all[at] = example;
else all.push(example);
writeFileSync(FILE, `${JSON.stringify(all, null, 2)}\n`);
console.log(`${at >= 0 ? "Updated" : "Added"} example ${id} (${example.slides.length} slides) in ${FILE}. Run npm test.`);
