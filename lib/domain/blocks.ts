/**
 * Blocks: the content building blocks of a slide. Item counts are hard schema limits
 * (a cognitive limit of about 4 items, Miller and Cowan). Text lengths are recommendations,
 * the engine measures real overflow in a browser.
 *
 * Highlighting in text: ==word== renders in the accent (only in headings, statements and numbers).
 */
import { z } from "zod";
import { ICON_NAMES } from "./icons";

const text = (max: number, what: string) => z.string().min(1).describe(`${what}. Aim for at most ${max} characters`);

/** When a block appears: 0 = with the slide entrance, 1 and up = on click, in that order. */
const step = z.number().int().min(0).max(5).optional().describe("Reveal step: 0 or omitted = with slide entrance, 1..5 = on click, in order");
/** For lists: all items at once, or each on its own click. */
const build = z.enum(["together", "items"]).optional().describe("together = all items with the block, items = one item per click");

const statItem = z.strictObject({
  value: z.number().describe("The number itself, animated as a count up"),
  decimals: z.number().int().min(0).max(2).optional(),
  prefix: z.string().max(3).optional().describe("e.g. $, €"),
  suffix: z.string().max(4).optional().describe("e.g. %, x, M, k"),
  label: text(48, "What the number means"),
  detail: text(90, "Optional context or source").optional(),
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
    decimals: z
      .number()
      .int()
      .min(0)
      .max(3)
      .optional()
      .describe("Decimal places of the value labels. Omit it: labels keep the decimals the values have (at most 3), the same for every label"),
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
    items: z
      .array(
        z.strictObject({
          title: text(32, "Card title"),
          text: text(110, "Card text"),
          icon: z.enum(ICON_NAMES).optional().describe("An icon that carries the meaning of the card (the kind of risk, the step of a process). All cards have one or none, and no two cards share the same"),
        }),
      )
      .min(2)
      .max(4),
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
  /** Default hero motion of the block (see motion.ts), if it has one. */
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
  cards: { purpose: "Two to four parallel ideas with a title and a sentence: features, pillars, use cases. A card may carry an icon for what it means (the kind of risk, the step of a process); all cards have one or none, never as decoration." },
  table: { purpose: "Small structured comparison. Keep it under six rows." },
  cta: { purpose: "The ask: amount, use of funds headline, or next step with contact." },
};

/**
 * When a slide has several blocks with a hero motion, only one animates (MOTION_BUDGET.heroesPerSlide):
 * the one with the highest priority. A chart or timeline carries the data story, numbers complement it.
 */
export const HERO_PRIORITY: readonly BlockType[] = ["chart", "timeline", "stats", "stat"];

/** Hero motion type of a block, taking the chart kind into account. */
export function heroMotionOf(block: Block): BlockInfo["hero"] {
  if (block.type === "chart") return block.kind === "line" ? "line-draw" : block.kind === "donut" ? "donut-sweep" : "chart-grow";
  return BLOCK_INFO[block.type].hero;
}

/**
 * Recommended text lengths in characters (without highlight marks). Longer text often fits,
 * but then the slide reads for the presenter instead of the audience. The engine measures real overflow.
 */
export const TEXT_LIMITS = {
  heading: { display: 40, h1: 70, h2: 90 },
  text: { lead: 160, body: 260, small: 200 },
  bullet: 100,
  quote: 200,
  cta: 70,
  cardText: 110,
} as const;


/**
 * Levels of a waterfall bridge: the first and the last value are totals standing on zero, every value between is a
 * change from the running level. One definition for the renderer, the PowerPoint export and validation.
 */
export function bridgeSteps(values: readonly number[]): { from: number; to: number; total: boolean }[] {
  let running = 0;
  return values.map((x, i) => {
    const total = i === 0 || i === values.length - 1;
    const from = total ? 0 : running;
    const to = total ? x : running + x;
    running = to;
    return { from, to, total };
  });
}

/** Most decimal places a label shows. More is false precision on a slide; scale the unit instead (bp, thousands). */
export const MAX_DECIMALS = 3;

/** Decimal places a value is written with (0.48 has 2), at most MAX_DECIMALS. */
export const placesOf = (v: number) => {
  for (let p = 0; p < MAX_DECIMALS; p++) if (Math.abs(Math.round(v * 10 ** p) - v * 10 ** p) < 1e-9) return p;
  return MAX_DECIMALS;
};

/**
 * Values of a chart that appear as labels: what each kind draws. A line labels only the end of its first series, a
 * stacked chart its segments and their totals, the others every value; a reference line carries its value too.
 */
export function chartValues(b: Extract<Block, { type: "chart" }>): number[] {
  const reference = b.reference ? [b.reference.value] : [];
  if (b.kind === "line") return [b.series[0]!.values.at(-1)!, ...reference];
  const values = b.series.flatMap((s) => s.values);
  if (b.kind === "stacked") return [...values, ...b.categories.map((_, ci) => b.series.reduce((a, s) => a + (s.values[ci] ?? 0), 0)), ...reference];
  return [...values, ...reference];
}

/** Rounds like the labels do (Intl, half away from zero), so the check sees what the audience sees. */
const label = (v: number, p: number) => new Intl.NumberFormat("en", { minimumFractionDigits: p, maximumFractionDigits: p, useGrouping: false }).format(v);

/** Labels at `p` decimals lose a difference the chart shows: two different values read the same, or a value that is not zero reads 0. */
export function labelsCollide(values: readonly number[], p: number): boolean {
  const seen = new Map<string, number>();
  for (const v of values) {
    const text = label(v, p);
    if (v !== 0 && Number(text) === 0) return true;
    const other = seen.get(text);
    if (other !== undefined && Math.abs(other - v) > 1e-9) return true;
    seen.set(text, v);
  }
  return false;
}

/**
 * Decimal places of the value labels of a chart, the same for every label (tabular figures line up). The block's
 * `decimals` when set; otherwise the precision the values have (at most MAX_DECIMALS). A label must not lose a difference the
 * chart shows: 1.55 and 1.62 both shown as 1.6 make a rising chart look flat, 10.9 and 11.8 shown as 11 and 12
 * contradict a headline about +0.9 points.
 */
export function chartDecimals(b: Extract<Block, { type: "chart" }>): number {
  return b.decimals ?? Math.max(0, ...chartValues(b).map(placesOf));
}

/** The decimals a chart is drawn with when its labels lose a difference there, otherwise undefined. */
export function chartLabelsCollide(b: Extract<Block, { type: "chart" }>): number | undefined {
  const d = chartDecimals(b);
  return labelsCollide(chartValues(b), d) ? d : undefined;
}
