/**
 * Layouty: kompozice slidu 1920x1080. Každý layout má pojmenované zóny, které přijímají
 * určité typy bloků, a geometrii mřížky uvnitř okrajů. Engine geometrii jen vykreslí.
 */
import type { BlockType } from "./blocks";

export interface Zone {
  name: string;
  accepts: readonly BlockType[];
  required: boolean;
  /** Svislé zarovnání obsahu v buňce mřížky. */
  align?: "start" | "center" | "end";
}

export interface LayoutDef {
  id: string;
  purpose: string;
  zones: readonly Zone[];
  grid: { areas: readonly string[]; columns: string; rows: string };
  /** Obrázek přes celý slide (bez okrajů), text na něm s ochranným přechodem. */
  bleed?: { zone: string };
  density: "low" | "medium" | "high";
}

const H = ["heading"] as const;
const SUPPORT = ["text"] as const;
const BODY = ["bullets", "text", "cards", "stats"] as const;

export const LAYOUTS: readonly LayoutDef[] = [
  {
    id: "title",
    purpose: "Opening slide: company name or deck title, one line promise, logo.",
    zones: [
      { name: "logo", accepts: ["logo"], required: false, align: "start" },
      { name: "title", accepts: H, required: true, align: "end" },
      { name: "subtitle", accepts: SUPPORT, required: false, align: "start" },
      { name: "meta", accepts: SUPPORT, required: false, align: "end" },
    ],
    grid: { areas: ["logo", "title", "subtitle", "meta"], columns: "1fr", rows: "auto 1fr auto auto" },
    density: "low",
  },
  {
    id: "title-image",
    purpose: "Opening slide with a strong product or brand visual on the right half.",
    zones: [
      { name: "logo", accepts: ["logo"], required: false, align: "start" },
      { name: "title", accepts: H, required: true, align: "end" },
      { name: "subtitle", accepts: SUPPORT, required: false, align: "start" },
      { name: "image", accepts: ["image"], required: true, align: "center" },
    ],
    grid: { areas: ["logo image", "title image", "subtitle image"], columns: "1fr 1fr", rows: "auto 1fr 1fr" },
    density: "low",
  },
  {
    id: "statement",
    purpose: "One big sentence: the hook, the insight, the vision. Nothing else competes.",
    zones: [
      { name: "statement", accepts: H, required: true, align: "end" },
      { name: "support", accepts: SUPPORT, required: false, align: "start" },
    ],
    grid: { areas: ["statement", "support"], columns: "1fr", rows: "1.3fr 1fr" },
    density: "low",
  },
  {
    id: "section",
    purpose: "Chapter divider for longer decks. Use sparingly, a pitch deck rarely needs it.",
    zones: [
      { name: "title", accepts: H, required: true, align: "end" },
      { name: "support", accepts: SUPPORT, required: false, align: "start" },
    ],
    grid: { areas: ["title", "support"], columns: "1fr", rows: "1fr 1fr" },
    density: "low",
  },
  {
    id: "headline-stat",
    purpose: "One hero number proves the headline: market size, growth, savings.",
    zones: [
      { name: "title", accepts: H, required: true, align: "start" },
      { name: "stat", accepts: ["stat"], required: true, align: "center" },
      { name: "support", accepts: SUPPORT, required: false, align: "end" },
    ],
    grid: { areas: ["title stat", "support stat"], columns: "1fr 1.1fr", rows: "1fr auto" },
    density: "low",
  },
  {
    id: "stats",
    purpose: "Two to four numbers in a row: traction, unit economics, market.",
    zones: [
      { name: "title", accepts: H, required: true, align: "start" },
      { name: "stats", accepts: ["stats"], required: true, align: "center" },
      { name: "support", accepts: SUPPORT, required: false, align: "end" },
    ],
    grid: { areas: ["title", "stats", "support"], columns: "1fr", rows: "auto 1fr auto" },
    density: "medium",
  },
  {
    id: "points",
    purpose: "Headline with a short list or paragraph. The workhorse, but prefer more visual layouts when possible.",
    zones: [
      { name: "title", accepts: H, required: true, align: "start" },
      { name: "body", accepts: ["bullets", "text"], required: true, align: "start" },
    ],
    grid: { areas: ["title", "body"], columns: "1fr", rows: "auto 1fr" },
    density: "medium",
  },
  {
    id: "text-image",
    purpose: "Argument on the left, visual proof on the right: product, screenshot, photo.",
    zones: [
      { name: "title", accepts: H, required: true, align: "start" },
      { name: "body", accepts: BODY, required: false, align: "center" },
      { name: "image", accepts: ["image"], required: true, align: "center" },
    ],
    grid: { areas: ["title image", "body image"], columns: "1fr 1.15fr", rows: "auto 1fr" },
    density: "medium",
  },
  {
    id: "image-text",
    purpose: "Mirror of text-image, visual first. Alternate with text-image for rhythm.",
    zones: [
      { name: "image", accepts: ["image"], required: true, align: "center" },
      { name: "title", accepts: H, required: true, align: "start" },
      { name: "body", accepts: BODY, required: false, align: "center" },
    ],
    grid: { areas: ["image title", "image body"], columns: "1.15fr 1fr", rows: "auto 1fr" },
    density: "medium",
  },
  {
    id: "image-full",
    purpose: "Full bleed photo or product shot with a short headline. Emotional moments, the vision.",
    zones: [
      { name: "image", accepts: ["image"], required: true },
      { name: "title", accepts: H, required: true, align: "end" },
      { name: "support", accepts: SUPPORT, required: false, align: "start" },
    ],
    grid: { areas: ["title", "support"], columns: "minmax(0, 0.62fr)", rows: "1fr auto" },
    bleed: { zone: "image" },
    density: "low",
  },
  {
    id: "chart",
    purpose: "The chart is the slide. Headline states what the data shows.",
    zones: [
      { name: "title", accepts: H, required: true, align: "start" },
      { name: "chart", accepts: ["chart"], required: true, align: "center" },
      { name: "support", accepts: SUPPORT, required: false, align: "end" },
    ],
    grid: { areas: ["title", "chart", "support"], columns: "1fr", rows: "auto 1fr auto" },
    density: "medium",
  },
  {
    id: "chart-insight",
    purpose: "Insight next to the chart: a hero number or two points that explain it.",
    zones: [
      { name: "title", accepts: H, required: true, align: "start" },
      { name: "insight", accepts: ["stat", "stats", "text", "bullets"], required: true, align: "center" },
      { name: "chart", accepts: ["chart"], required: true, align: "center" },
    ],
    grid: { areas: ["title title", "insight chart"], columns: "0.8fr 1.4fr", rows: "auto 1fr" },
    density: "medium",
  },
  {
    id: "cards",
    purpose: "Two to four parallel ideas: product pillars, features, use cases, revenue streams.",
    zones: [
      { name: "title", accepts: H, required: true, align: "start" },
      { name: "cards", accepts: ["cards"], required: true, align: "start" },
      { name: "support", accepts: SUPPORT, required: false, align: "end" },
    ],
    grid: { areas: ["title", "cards", "support"], columns: "1fr", rows: "auto 1fr auto" },
    density: "medium",
  },
  {
    id: "comparison",
    purpose: "Us versus them, before versus after, old way versus new way.",
    zones: [
      { name: "title", accepts: H, required: true, align: "start" },
      { name: "comparison", accepts: ["comparison", "table"], required: true, align: "start" },
    ],
    grid: { areas: ["title", "comparison"], columns: "1fr", rows: "auto 1fr" },
    density: "high",
  },
  {
    id: "timeline",
    purpose: "Roadmap, milestones, or how we got here.",
    zones: [
      { name: "title", accepts: H, required: true, align: "start" },
      { name: "timeline", accepts: ["timeline"], required: true, align: "start" },
    ],
    grid: { areas: ["title", "timeline"], columns: "1fr", rows: "auto 1fr" },
    density: "medium",
  },
  {
    id: "team",
    purpose: "The people and why they win.",
    zones: [
      { name: "title", accepts: H, required: true, align: "start" },
      { name: "team", accepts: ["team"], required: true, align: "start" },
    ],
    grid: { areas: ["title", "team"], columns: "1fr", rows: "auto 1fr" },
    density: "medium",
  },
  {
    id: "quote",
    purpose: "A customer or expert voice, large, with attribution.",
    zones: [
      { name: "quote", accepts: ["quote"], required: true, align: "center" },
      { name: "logo", accepts: ["logo"], required: false, align: "end" },
    ],
    grid: { areas: ["quote", "logo"], columns: "minmax(0, 0.82fr)", rows: "1fr auto" },
    density: "low",
  },
  {
    id: "logos",
    purpose: "Social proof: who uses, backs or writes about us.",
    zones: [
      { name: "title", accepts: H, required: true, align: "start" },
      { name: "logos", accepts: ["logos"], required: true, align: "center" },
      { name: "support", accepts: SUPPORT, required: false, align: "end" },
    ],
    grid: { areas: ["title", "logos", "support"], columns: "1fr", rows: "auto 1fr auto" },
    density: "low",
  },
  {
    id: "table",
    purpose: "Structured detail: pricing tiers, use of funds, competitive features.",
    zones: [
      { name: "title", accepts: H, required: true, align: "start" },
      { name: "table", accepts: ["table"], required: true, align: "start" },
    ],
    grid: { areas: ["title", "table"], columns: "1fr", rows: "auto 1fr" },
    density: "high",
  },
  {
    id: "closing",
    purpose: "The ask and the way to reach you. Callback to the opening hook.",
    zones: [
      { name: "title", accepts: H, required: true, align: "end" },
      { name: "cta", accepts: ["cta", "stat"], required: true, align: "center" },
      { name: "logo", accepts: ["logo"], required: false, align: "end" },
    ],
    grid: { areas: ["title", "cta", "logo"], columns: "1fr", rows: "1fr auto auto" },
    density: "low",
  },
];

export type LayoutId = string;

export function getLayout(id: string): LayoutDef | undefined {
  return LAYOUTS.find((l) => l.id === id);
}

export const LAYOUT_IDS = LAYOUTS.map((l) => l.id) as [string, ...string[]];
