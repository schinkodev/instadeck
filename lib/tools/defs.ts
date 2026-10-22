/**
 * Tools v MCP tvaru: ID v argumentech, žádný stav v procesu, strukturovaný výstup.
 * Definice nezávislá na transportu, adaptér je v server/mcp.ts.
 * Popisy říkají, co tool dělá. Znalost o tvorbě decku je v get_design_guide a resources.
 */
import { readFile } from "node:fs/promises";
import { isAbsolute } from "node:path";
import { z, type ZodRawShape } from "zod";
import { EXAMPLES, EXAMPLE_NOTE, brandKitInputSchema, createBriefSchema, deckMotionSchema, factSchema, designPatchSchema, exampleSummary, findExample, opSchema, slideInputSchema } from "@/lib/domain";
import { MOODS, MOOD_NAMES, checkBrandKit, colorsFromRaster, colorsFromSvg, suggestBrandSystem } from "@/lib/engine";
import { dataUri, MAX_ASSET_BYTES, type StoreMode } from "@/lib/state";
import { designGuide, GUIDE_SECTIONS } from "./guide";
import type { Preview, Service } from "./service";

export interface ToolContext {
  service: Service;
  /** local: stdio server u uživatele (cesty na disku, prohlížeč). hosted: konektor (URL, bez prohlížeče). */
  mode: StoreMode;
}

export interface ToolImage {
  png: Uint8Array;
  caption: string;
}

export interface ToolOutput {
  data: Record<string, unknown>;
  /** Textová kopie výsledku, když celá data nepatří do kontextu (části decku pro aplikaci). Výchozí JSON dat. */
  text?: string;
  images?: ToolImage[];
}

export interface Annotations {
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
}

export interface ToolDef<S extends ZodRawShape = ZodRawShape> {
  name: string;
  title: string;
  description: string;
  input: S;
  annotations: Annotations;
  /** Režimy, ve kterých tool existuje. Výchozí oba. */
  modes?: readonly StoreMode[];
  /** Výsledek ukazuje deck: klienti s MCP Apps ho vykreslí v chatu. */
  view?: true;
  /** Tool volá jen aplikace v chatu (MCP Apps visibility app), model ho nepotřebuje. */
  audience?: "app";
  run: (args: z.infer<z.ZodObject<S>>, ctx: ToolContext) => Promise<ToolOutput>;
}

const define = <S extends ZodRawShape>(t: ToolDef<S>) => t as unknown as ToolDef;

const READ: Annotations = { readOnlyHint: true, idempotentHint: true, openWorldHint: false };
const WRITE: Annotations = { readOnlyHint: false, destructiveHint: false, openWorldHint: false };

const deckId = z.string().describe("Deck id from create_deck or list_decks");
const previews = z.boolean().default(true).describe("Local server: return PNG previews of changed slides and slides with errors (up to 4)");
const LOCAL: readonly StoreMode[] = ["local"];
const HOSTED: readonly StoreMode[] = ["hosted"];

const images = (p: Preview[]): ToolImage[] => p.map((x) => ({ png: x.png, caption: `Slide ${x.index + 1} (${x.slideId})` }));

const NEXT_WRITE =
  "Give the user presentation.url to present. Fix every finding with severity error using apply_ops and the returned revision as expected_revision. Warnings are taste rules worth fixing.";

function requireLocal(ctx: ToolContext, what: string) {
  if (ctx.mode !== "local") throw new Error(`${what} works only with the local InstaDeck server`);
}

/** Stáhne asset z veřejné https adresy (logo z webu firmy). Limit velikosti a času. */
async function fetchAsset(url: string): Promise<Uint8Array> {
  const u = new URL(url);
  if (u.protocol !== "https:") throw new Error("url must start with https://");
  const res = await fetch(u, { signal: AbortSignal.timeout(10_000), redirect: "follow" });
  if (!res.ok) throw new Error(`Downloading ${url} failed with HTTP ${res.status}`);
  const declared = Number(res.headers.get("content-length") ?? 0);
  if (declared > MAX_ASSET_BYTES) throw new Error(`${url} is larger than 15 MB`);
  const body = new Uint8Array(await res.arrayBuffer());
  if (body.byteLength > MAX_ASSET_BYTES) throw new Error(`${url} is larger than 15 MB`);
  return body;
}

async function addAsset(a: { name: string; path?: string; url?: string; data_base64?: string }, ctx: ToolContext): Promise<ToolOutput> {
  const sources = [a.path, a.url, a.data_base64].filter((x) => x !== undefined).length;
  if (sources !== 1) throw new Error("Send exactly one source for the file");
  let bytes: Uint8Array;
  if (a.path !== undefined) {
    requireLocal(ctx, "path");
    if (!isAbsolute(a.path)) throw new Error("path must be absolute");
    bytes = new Uint8Array(await readFile(a.path));
  } else if (a.url !== undefined) bytes = await fetchAsset(a.url);
  else bytes = new Uint8Array(Buffer.from(a.data_base64!, "base64"));
  const meta = await ctx.service.store.addAsset(a.name, bytes);
  return { data: { asset: meta, next: meta.kind === "image" ? "For a logo, call extract_brand_colors next." : "Use it in a brand kit or design as a font with source asset." } };
}

const ASSET_TYPES = "Images: PNG, JPEG, WebP, GIF, SVG. Fonts: WOFF2, WOFF, TTF, OTF. Up to 15 MB.";

export const TOOLS: ToolDef[] = [
  define({
    name: "get_design_guide",
    title: "Design guide",
    description:
      "How to build an InstaDeck: workflow, layouts with their zones, block types, motion presets, design system rules, fonts, pitch story beats and the design and storytelling principles behind them. Call it before creating or restyling a deck.",
    input: {
      sections: z.array(z.enum(GUIDE_SECTIONS)).optional().describe("Sections to return. Default: workflow, layouts, blocks, motion, design, pitch"),
    },
    annotations: READ,
    run: async (a, ctx) => ({ data: designGuide(a.sections, ctx.mode) }),
  }),

  define({
    name: "add_asset",
    title: "Add asset",
    description: `Stores a logo, image, photo or font file so slides and brand kits can use it by asset id. ${ASSET_TYPES}`,
    input: {
      name: z.string().min(1).describe("File name, e.g. logo.svg"),
      path: z.string().optional().describe("Absolute path of a file on this machine"),
      url: z.string().optional().describe("Public https address of the file, e.g. the logo on the company website"),
      data_base64: z.string().optional().describe("File content as base64, for small files without a path or address"),
    },
    annotations: WRITE,
    modes: LOCAL,
    run: addAsset,
  }),

  define({
    name: "add_asset",
    title: "Add asset",
    description: `Stores a logo, image, photo or font so slides and brand kits can use it by asset id. ${ASSET_TYPES} Prefer url (for example the logo on the company website). An image the user pasted into the chat can be sent as data_base64 when it is small, otherwise read its colors yourself and skip the file.`,
    input: {
      name: z.string().min(1).describe("File name, e.g. logo.svg"),
      url: z.string().optional().describe("Public https address of the file, e.g. the logo on the company website"),
      data_base64: z.string().optional().describe("File content as base64, for small files"),
    },
    annotations: { ...WRITE, openWorldHint: true },
    modes: HOSTED,
    run: addAsset,
  }),

  define({
    name: "list_assets",
    title: "List assets",
    description: "Lists stored logos, images and fonts with their ids.",
    input: {},
    annotations: READ,
    modes: LOCAL,
    run: async (_a, ctx) => ({ data: { assets: await ctx.service.store.listAssets() } }),
  }),

  define({
    name: "extract_brand_colors",
    title: "Brand colors from logo",
    description:
      "Reads the colors of a logo or brand image and returns candidates with their share and whether they are neutral (white, black, gray). You decide which one is the brand color. The hosted connector reads SVG only, for PNG or JPEG logos read the colors from the image yourself.",
    input: { asset_id: z.string() },
    annotations: READ,
    run: async (a, ctx) => {
      const { meta, bytes } = await ctx.service.store.getAsset(a.asset_id);
      if (meta.kind !== "image") throw new Error(`Asset ${a.asset_id} is a ${meta.kind}, not an image`);
      if (meta.mime !== "image/svg+xml" && ctx.mode !== "local") throw new Error("The hosted connector reads colors from SVG only. Read the colors from the image yourself");
      const colors = meta.mime === "image/svg+xml" ? colorsFromSvg(new TextDecoder().decode(bytes)) : await colorsFromRaster(dataUri(meta.mime, bytes));
      return { data: { asset_id: a.asset_id, colors, note: "share = how much of the logo the color covers. Brand color is usually the strongest non neutral one." } };
    },
  }),

  define({
    name: "create_brand_kit",
    title: "Create brand kit",
    description: "Saves a brand: primary and secondary colors, dark and light, fonts, logos and tone. Decks created with the brand kit take its colors and fonts.",
    input: brandKitInputSchema.shape,
    annotations: WRITE,
    run: async (a, ctx) => ({ data: { brand_kit: await ctx.service.store.createBrandKit(a), findings: checkBrandKit(a) } }),
  }),

  define({
    name: "suggest_brand_system",
    title: "Suggest brand system",
    description:
      "Turns a primary color and a mood into a coherent, readable brand system: palette with verified contrast, a font pair, type scale, corner radius, tempo and a starting motion intensity. Returns brand_kit (pass to create_brand_kit with a name and logos) and design and motion (pass to create_deck). Every change to your colors is listed in adjustments.",
    input: {
      primary: brandKitInputSchema.shape.colors.shape.primary,
      mood: z.enum(MOOD_NAMES).describe(`Personality of the brand. ${MOOD_NAMES.map((m) => `${m}: ${MOODS[m].character}`).join(" ")}`),
      secondary: brandKitInputSchema.shape.colors.shape.secondary,
      dark: brandKitInputSchema.shape.colors.shape.dark,
      light: brandKitInputSchema.shape.colors.shape.light,
    },
    annotations: READ,
    run: async (a) => ({ data: { ...suggestBrandSystem(a), next: "Pass brand_kit to create_brand_kit (add name and logos), then pass design and motion to create_deck." } }),
  }),

  define({
    name: "get_brand_kit",
    title: "Get brand kit",
    description: "Returns a brand kit by id.",
    input: { brand_kit_id: z.string() },
    annotations: READ,
    run: async (a, ctx) => ({ data: { brand_kit: await ctx.service.store.getBrandKit(a.brand_kit_id) } }),
  }),

  define({
    name: "list_brand_kits",
    title: "List brand kits",
    description: "Lists saved brand kits.",
    input: {},
    annotations: READ,
    modes: LOCAL,
    run: async (_a, ctx) => ({ data: { brand_kits: await ctx.service.store.listBrandKits() } }),
  }),

  define({
    name: "get_example",
    title: "Get example deck",
    description:
      "Returns a proven example deck. Without id it lists the examples with purpose, audience and layouts. With id it returns the full deck in the shape create_deck takes (slides, design, motion) and why it works. Read the example closest to the brief before choosing layouts, then keep its structure, rhythm and text lengths and replace all content.",
    input: { id: z.enum(EXAMPLES.map((e) => e.id) as [string, ...string[]]).optional().describe("Example id. Omit to list all") },
    annotations: READ,
    run: async (a) => {
      if (!a.id) return { data: { examples: EXAMPLES.map(exampleSummary), note: EXAMPLE_NOTE } };
      return { data: { example: findExample(a.id)!, note: EXAMPLE_NOTE } };
    },
  }),

  define({
    name: "create_deck",
    title: "Create deck",
    description:
      "Creates a deck with all its slides in one call and renders it as a presentation file with animations. Returns the deck id, revision, findings (validation and measured overflow) and previews. Nothing is saved when the slides have errors.",
    input: {
      title: z.string().min(1),
      brief: createBriefSchema,
      brand_kit_id: z.string().optional(),
      design: designPatchSchema.optional().describe("Design fields to set on top of the brand kit or default design"),
      motion: deckMotionSchema.partial().optional().describe("The motion language of this deck: intensity, rationale, default entrance and transition, tempo, heroes and your own vocabulary (section motion)"),
      facts: z.array(factSchema).max(60).optional().describe("Every number of the deck with its unit, period and source. Stats point at them with fact or derive"),
      slides: z.array(slideInputSchema).min(1),
      previews,
    },
    annotations: WRITE,
    view: true,
    run: async (a, ctx) => {
      const r = await ctx.service.store.createDeck(
        { title: a.title, brief: a.brief, brandKitId: a.brand_kit_id, design: a.design, motion: a.motion, facts: a.facts, slides: a.slides },
        "mcp",
      );
      const out = await ctx.service.afterWrite(r, a.previews);
      return { data: { ...out.view, next: NEXT_WRITE }, images: images(out.previews) };
    },
  }),

  define({
    name: "get_deck",
    title: "Get deck",
    description: "Returns the full deck: brief, design, motion and every slide with its blocks, plus the revision to pass to apply_ops.",
    input: { deck_id: deckId },
    annotations: READ,
    view: true,
    run: async (a, ctx) => {
      const deck = await ctx.service.store.getDeck(a.deck_id);
      return { data: { deckId: deck.id, revision: deck.revision, deck, presentation: ctx.service.presentation(deck.id) } };
    },
  }),

  define({
    name: "get_deck_view",
    title: "Deck view",
    description: "Used by the InstaDeck view in the chat to render a deck. You never need to call it: create_deck, apply_ops and get_deck already show the deck.",
    input: { deck_id: deckId },
    annotations: READ,
    audience: "app",
    run: async (a, ctx) => {
      const deck = await ctx.service.store.getDeck(a.deck_id);
      return {
        data: { deckId: deck.id, revision: deck.revision, parts: await ctx.service.viewParts(deck) },
        text: `Rendered parts of deck ${deck.id} revision ${deck.revision} for the deck view.`,
      };
    },
  }),

  define({
    name: "list_decks",
    title: "List decks",
    description: "Lists decks with title, company, number of slides and last change.",
    input: {},
    annotations: READ,
    modes: LOCAL,
    run: async (_a, ctx) => ({ data: { decks: await ctx.service.store.listDecks() } }),
  }),

  define({
    name: "apply_ops",
    title: "Edit deck",
    description:
      "The only way to change a deck. Applies operations in order (add, update, remove or move slides, set design, motion, title, brief, apply a brand kit). All operations succeed or none is saved. Fails when expected_revision is not the current revision.",
    input: {
      deck_id: deckId,
      expected_revision: z.number().int().min(0).describe("Revision you read last"),
      ops: z.array(opSchema).min(1),
      summary: z.string().min(1).max(120).describe("What changed, for the history"),
      previews,
    },
    annotations: WRITE,
    view: true,
    run: async (a, ctx) => {
      const r = await ctx.service.store.applyOps(a.deck_id, a.expected_revision, a.ops, "mcp", a.summary);
      const out = await ctx.service.afterWrite(r, a.previews);
      return { data: { ...out.view, next: NEXT_WRITE }, images: images(out.previews) };
    },
  }),

  define({
    name: "validate_deck",
    title: "Validate deck",
    description:
      "Checks a deck: structure, data, contrast, text length, motion budget and visual rhythm. The local server also measures text that overflows its space in a browser, on the hosted connector the deck view reports overflow when it renders.",
    input: { deck_id: deckId },
    annotations: READ,
    run: async (a, ctx) => {
      const deck = await ctx.service.store.getDeck(a.deck_id);
      return { data: { deck_id: deck.id, revision: deck.revision, findings: await ctx.service.findings(deck) } };
    },
  }),

  define({
    name: "render_preview",
    title: "Preview slides",
    description: "PNG images of slides in their final state (all steps revealed). Use it to check the design visually.",
    input: {
      deck_id: deckId,
      slide_ids: z.array(z.string()).min(1).max(6).optional().describe("Slides to render, default the first four"),
    },
    annotations: READ,
    modes: LOCAL,
    run: async (a, ctx) => {
      const deck = await ctx.service.store.getDeck(a.deck_id);
      const ids = a.slide_ids ?? deck.slides.slice(0, 4).map((s) => s.id);
      const p = await ctx.service.previews(deck, ids);
      return { data: { deck_id: deck.id, revision: deck.revision, slides: p.map((x) => ({ id: x.slideId, index: x.index })) }, images: images(p) };
    },
  }),

  define({
    name: "export_deck",
    title: "Export deck",
    description: "Exports the deck as a presentation HTML file (animations, one file, opens in any browser), a PDF with selectable text, or a PowerPoint file (editable text, native charts and tables, speaker notes, no animations).",
    input: {
      deck_id: deckId,
      format: z.enum(["html", "pdf", "pptx"]),
      path: z.string().optional().describe("Absolute target path on this machine (local server only). Default: deck.html, deck.pdf or deck.pptx in the deck folder"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    modes: LOCAL,
    run: async (a, ctx) => {
      if (a.path) {
        requireLocal(ctx, "path");
        if (!isAbsolute(a.path)) throw new Error("path must be absolute");
      }
      const deck = await ctx.service.store.getDeck(a.deck_id);
      const path =
        a.format === "pdf" ? await ctx.service.exportPdf(deck, a.path) : a.format === "pptx" ? await ctx.service.exportPptx(deck, a.path) : await ctx.service.exportHtml(deck, a.path);
      return { data: { deck_id: deck.id, revision: deck.revision, format: a.format, path } };
    },
  }),

  define({
    name: "get_history",
    title: "Deck history",
    description: "Lists the revisions of a deck with author, summary and operations.",
    input: { deck_id: deckId },
    annotations: READ,
    run: async (a, ctx) => ({ data: { deck_id: a.deck_id, revisions: await ctx.service.store.history(a.deck_id) } }),
  }),

  define({
    name: "revert_deck",
    title: "Revert deck",
    description: "Restores an earlier revision as a new revision. History is kept.",
    input: { deck_id: deckId, expected_revision: z.number().int().min(0), to_revision: z.number().int().min(1), previews },
    annotations: WRITE,
    view: true,
    run: async (a, ctx) => {
      const r = await ctx.service.store.revert(a.deck_id, a.expected_revision, a.to_revision, "mcp");
      const out = await ctx.service.afterWrite(r, a.previews);
      return { data: { ...out.view }, images: images(out.previews) };
    },
  }),

  define({
    name: "delete_deck",
    title: "Delete deck",
    description: "Deletes the deck folder with its history, presentation and PDF. Cannot be undone. Ask the user first and pass confirm: true.",
    input: { deck_id: deckId, confirm: z.literal(true).describe("Must be true, after the user confirmed") },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
    run: async (a, ctx) => {
      await ctx.service.store.deleteDeck(a.deck_id);
      return { data: { deleted: a.deck_id } };
    },
  }),
];

export function getTool(name: string): ToolDef {
  const t = TOOLS.find((x) => x.name === name);
  if (!t) throw new Error(`Unknown tool ${name}`);
  return t;
}
