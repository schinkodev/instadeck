/**
 * Bloky: obsahové stavební kameny slidu. Počty položek jsou tvrdé limity schématu
 * (kognitivní limit kolem 4 položek, Miller a Cowan). Délky textu jsou doporučení,
 * skutečné přetečení měří engine v prohlížeči.
 *
 * Zvýraznění v textu: ==slovo== se vykreslí akcentem (jen u nadpisů, výroků a čísel).
 */
import { z } from "zod";
import { deriveSchema } from "./facts";

const text = (max: number, what: string) => z.string().min(1).describe(`${what}. Aim for at most ${max} characters`);

/** Kdy se blok objeví: 0 = se vstupem slidu, 1 a výš = na kliknutí v daném pořadí. */
const step = z.number().int().min(0).max(5).optional().describe("Reveal step: 0 or omitted = with slide entrance, 1..5 = on click, in order");
/** U seznamů: položky naráz, nebo každá na své kliknutí. */
const build = z.enum(["together", "items"]).optional().describe("together = all items with the block, items = one item per click");

const statItem = z.strictObject({
  value: z.number().describe("The number itself, animated as a count up"),
  decimals: z.number().int().min(0).max(2).optional(),
  prefix: z.string().max(3).optional().describe("e.g. $, €"),
  suffix: z.string().max(4).optional().describe("e.g. %, x, M, k"),
  label: text(48, "What the number means"),
  detail: text(90, "Optional context or source").optional(),
  fact: z.string().optional().describe("Id of the fact this number shows. InstaDeck checks they match"),
  derive: deriveSchema.optional(),
});

export const blockSchema = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("heading"),
    text: text(70, "Heading. Wrap the key words in ==double equals== to highlight them"),
    level: z.enum(["display", "h1", "h2"]).describe("display = title and statement slides, h1 = slide heading, h2 = sub heading"),
    step,
  }),
  z.strictObject({
    type: z.literal("text"),
    text: text(260, "Paragraph"),
    size: z.enum(["lead", "body", "small"]),
    step,
  }),
  z.strictObject({
    type: z.literal("bullets"),
    items: z.array(text(100, "One point, a short sentence, no bullet character")).min(2).max(5),
    build,
    step,
  }),
  z.strictObject({ type: z.literal("stat"), ...statItem.shape, step }),
  z.strictObject({
    type: z.literal("stats"),
    items: z.array(statItem).min(2).max(4),
    build,
    step,
  }),
  z.strictObject({
    type: z.literal("chart"),
    kind: z
      .enum(["column", "bar", "line", "donut", "stacked", "waterfall"])
      .describe("column, bar (horizontal), line, donut (share of a whole, at most 4 segments read well), stacked (columns split into series), waterfall (bridge: first and last categories are totals, the ones between are changes that add up)"),
    categories: z.array(z.string().min(1).max(24)).min(2).max(10).describe("X axis labels (column, stacked, waterfall, line), rows (bar) or segments (donut)"),
    series: z
      .array(z.strictObject({ name: z.string().min(1).max(30), values: z.array(z.number()) }))
      .min(1)
      .max(3)
      .describe("One value per category. Donut takes exactly one series"),
    unit: z.string().max(6).optional().describe("Shown after values, e.g. %, $M"),
    estimate: z.number().int().min(0).optional().describe("Index of the first category that is an estimate or plan (IBCS): from there bars are hatched. Name those categories e.g. 2025E"),
    axis: z.boolean().optional().describe("Show a value axis with gridlines. Only when the audience must read values off the chart, labels on the bars usually suffice (Tufte)"),
    reference: z
      .strictObject({ value: z.number(), label: text(24, "What the line marks, e.g. Target, Plan, Average") })
      .optional()
      .describe("A horizontal line at a reference value: target, plan or average"),
    highlight: z.number().int().min(0).optional().describe("Index of the category to draw in the accent color, the rest stays muted"),
    caption: text(90, "Source or footnote").optional(),
    step,
  }),
  z.strictObject({
    type: z.literal("image"),
    assetId: z.string().min(1),
    alt: text(120, "What the image shows"),
    fit: z.enum(["cover", "contain"]),
    focus: z.strictObject({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) }).optional().describe("Focal point for cover crops"),
    step,
  }),
  z.strictObject({
    type: z.literal("logo"),
    assetId: z.string().min(1),
    alt: z.string().min(1),
    step,
  }),
  z.strictObject({
    type: z.literal("logos"),
    items: z.array(z.strictObject({ assetId: z.string().min(1), alt: z.string().min(1) })).min(3).max(8).describe("Customer, partner or press logos"),
    step,
  }),
  z.strictObject({
    type: z.literal("quote"),
    text: text(200, "The quote, without quotation marks"),
    author: z.string().min(1).max(40),
    role: z.string().max(60).optional(),
    step,
  }),
  z.strictObject({
    type: z.literal("timeline"),
    items: z
      .array(z.strictObject({ label: z.string().min(1).max(16).describe("Date or phase, e.g. Q3 2026"), title: text(36, "Milestone"), text: text(80, "Detail").optional() }))
      .min(3)
      .max(6),
    current: z.number().int().min(0).optional().describe("Index of the milestone that represents now"),
    build,
    step,
  }),
  z.strictObject({
    type: z.literal("team"),
    people: z
      .array(z.strictObject({ name: z.string().min(1).max(32), role: z.string().min(1).max(40), photoAssetId: z.string().optional(), bio: text(80, "One line of credibility").optional() }))
      .min(1)
      .max(6),
    step,
  }),
  z.strictObject({
    type: z.literal("comparison"),
    columns: z
      .array(z.strictObject({ title: z.string().min(1).max(28), items: z.array(text(60, "Point")).min(1).max(5), highlight: z.boolean().optional().describe("Our column, drawn with the accent") }))
      .min(2)
      .max(3),
    build,
    step,
  }),
  z.strictObject({
    type: z.literal("cards"),
    items: z.array(z.strictObject({ title: text(32, "Card title"), text: text(110, "Card text") })).min(2).max(4),
    build,
    step,
  }),
  z.strictObject({
    type: z.literal("table"),
    columns: z.array(z.string().min(1).max(24)).min(2).max(5),
    rows: z.array(z.array(z.string().max(40))).min(1).max(6).describe("Each row has one cell per column"),
    highlightColumn: z.number().int().min(0).optional(),
    step,
  }),
  z.strictObject({
    type: z.literal("cta"),
    text: text(70, "The ask or call to action. ==Highlight== the amount or key words"),
    detail: text(80, "Contact, link or next step").optional(),
    step,
  }),
]);

export type Block = z.infer<typeof blockSchema>;
export type BlockType = Block["type"];
export const BLOCK_TYPES = blockSchema.options.map((o) => o.shape.type.value) as BlockType[];

export interface BlockInfo {
  purpose: string;
  /** Výchozí zvýrazňující pohyb bloku (viz motion.ts), pokud nějaký má. */
  hero?: "count-up" | "chart-grow" | "line-draw" | "donut-sweep" | "timeline-draw";
}

export const BLOCK_INFO: Record<BlockType, BlockInfo> = {
  heading: { purpose: "Slide headline. On content slides it states the takeaway as a sentence, not a topic label." },
  text: { purpose: "Short paragraph. Use lead for the one supporting sentence under a headline." },
  bullets: { purpose: "Two to five parallel points. Prefer cards or stats when points have a title or a number." },
  stat: { purpose: "One hero number with its meaning. The strongest proof point of the slide.", hero: "count-up" },
  stats: { purpose: "Two to four numbers side by side. Traction, market size, unit economics.", hero: "count-up" },
  chart: { purpose: "Data that shows a trend, a share, a composition or a bridge. Highlight the one category the slide is about, state the finding in the heading, name the source in the caption.", hero: "chart-grow" },
  image: { purpose: "Product screenshot, photo or illustration added as an asset." },
  logo: { purpose: "The company logo from the brand kit." },
  logos: { purpose: "Row of customer, partner or press logos. Social proof." },
  quote: { purpose: "Customer or expert voice. One quote per slide." },
  timeline: { purpose: "Roadmap or history. Three to six milestones, mark where we are now.", hero: "timeline-draw" },
  team: { purpose: "Founders and key people with one line of credibility each." },
  comparison: { purpose: "Us versus alternatives, before versus after. Highlight our column." },
  cards: { purpose: "Two to four parallel ideas with a title and a sentence: features, pillars, use cases." },
  table: { purpose: "Small structured comparison. Keep it under six rows." },
  cta: { purpose: "The ask: amount, use of funds headline, or next step with contact." },
};

/**
 * Když má slide víc bloků s hero pohybem, animuje se jen jeden (MOTION_BUDGET.heroesPerSlide):
 * ten s nejvyšší prioritou. Graf a osa nesou příběh dat, čísla je doplňují.
 */
export const HERO_PRIORITY: readonly BlockType[] = ["chart", "timeline", "stats", "stat"];

/** Typ zvýrazňujícího pohybu bloku, s ohledem na druh grafu. */
export function heroMotionOf(block: Block): BlockInfo["hero"] {
  if (block.type === "chart") return block.kind === "line" ? "line-draw" : block.kind === "donut" ? "donut-sweep" : "chart-grow";
  return BLOCK_INFO[block.type].hero;
}

/**
 * Doporučené délky textu ve znacích (bez značek zvýraznění). Delší text se často vejde,
 * ale slide pak čte řečník za publikum. Skutečné přetečení měří engine.
 */
export const TEXT_LIMITS = {
  heading: { display: 40, h1: 70, h2: 90 },
  text: { lead: 160, body: 260, small: 200 },
  bullet: 100,
  quote: 200,
  cta: 70,
  cardText: 110,
} as const;

