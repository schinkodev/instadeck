/**
 * Sample pitch deck of the fictional company Northwind Grid: covers every block type and most layouts.
 */
import { DEFAULT_DESIGN, DEFAULT_MOTION, type Deck, type SlideInput } from "@/lib/domain";
import type { AssetData, AssetIndex } from "@/lib/engine";

const svg = (body: string, w = 400, h = 120) =>
  `data:image/svg+xml;base64,${Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`).toString("base64")}`;

export const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="120" viewBox="0 0 400 120"><rect x="0" y="20" width="80" height="80" rx="18" fill="#0E7C66"/><rect x="22" y="42" width="36" height="36" rx="6" fill="#F4B942"/><text x="100" y="78" font-family="Arial" font-weight="700" font-size="44" fill="#0F1A17">Northwind</text></svg>`;

export const SAMPLE_ASSETS: Record<string, AssetData> = {
  logo: { mime: "image/svg+xml", src: `data:image/svg+xml;base64,${Buffer.from(LOGO_SVG).toString("base64")}` },
  product: {
    mime: "image/svg+xml",
    src: svg(
      `<rect width="1200" height="900" fill="#E7F2EE"/><rect x="80" y="80" width="1040" height="740" rx="28" fill="#FFFFFF"/><rect x="140" y="150" width="420" height="40" rx="8" fill="#0E7C66"/><rect x="140" y="230" width="920" height="300" rx="16" fill="#CFE6DE"/><rect x="140" y="580" width="280" height="180" rx="16" fill="#F4B942"/><rect x="460" y="580" width="280" height="180" rx="16" fill="#CFE6DE"/><rect x="780" y="580" width="280" height="180" rx="16" fill="#CFE6DE"/>`,
      1200,
      900,
    ),
  },
  field: {
    mime: "image/svg+xml",
    src: svg(`<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2D5B4F"/><stop offset="1" stop-color="#0B1F1A"/></linearGradient></defs><rect width="1920" height="1080" fill="url(#g)"/><circle cx="1500" cy="300" r="220" fill="#F4B942" opacity="0.85"/>`, 1920, 1080),
  },
  acme: { mime: "image/svg+xml", src: svg(`<text x="0" y="80" font-family="Arial" font-weight="700" font-size="64" fill="#333">ACME</text>`, 300, 120) },
  globex: { mime: "image/svg+xml", src: svg(`<text x="0" y="80" font-family="Georgia" font-size="64" fill="#333">Globex</text>`, 300, 120) },
  initech: { mime: "image/svg+xml", src: svg(`<text x="0" y="80" font-family="Courier" font-weight="700" font-size="56" fill="#333">INITECH</text>`, 320, 120) },
  umbrella: { mime: "image/svg+xml", src: svg(`<text x="0" y="80" font-family="Arial" font-size="56" fill="#333">umbrella</text>`, 320, 120) },
};

export const SAMPLE_ASSET_INDEX: AssetIndex = Object.fromEntries(Object.keys(SAMPLE_ASSETS).map((id) => [id, { kind: "image" as const }]));

export const SAMPLE_SLIDES: SlideInput[] = [
  {
    layout: "title",
    intent: "Who we are and the promise",
    blocks: {
      logo: { type: "logo", assetId: "logo", alt: "Northwind" },
      title: { type: "heading", level: "display", text: "The grid runs on ==Northwind==" },
      subtitle: { type: "text", size: "lead", text: "Real time balancing for renewable heavy power grids." },
      meta: { type: "text", size: "small", text: "Seed round, October 2026" },
    },
  },
  {
    layout: "statement",
    intent: "Hook: renewables are wasted",
    tone: "inverse",
    blocks: {
      statement: { type: "heading", level: "display", text: "Europe threw away ==7 percent== of its wind power last year." },
      support: { type: "text", size: "lead", text: "Not because it was not needed. Because the grid could not move it in time." },
    },
  },
  {
    layout: "headline-stat",
    intent: "Problem is big and costly",
    blocks: {
      title: { type: "heading", level: "h1", text: "Curtailment costs operators billions every year" },
      stat: { type: "stat", value: 4.2, decimals: 1, prefix: "€", suffix: "B", label: "lost to curtailment in the EU in 2025", detail: "ENTSO-E annual report" },
      support: { type: "text", size: "body", text: "And the number doubles by 2030 as more wind and solar comes online." },
    },
  },
  {
    layout: "text-image",
    intent: "Solution in one sentence",
    blocks: {
      title: { type: "heading", level: "h1", text: "Northwind predicts congestion ==hours ahead==" },
      body: { type: "bullets", build: "items", items: ["Forecasts line load from weather and market data", "Suggests redispatch before the bottleneck forms", "Plugs into existing SCADA in weeks, not years"] },
      image: { type: "image", assetId: "product", alt: "Northwind control room dashboard", fit: "cover" },
    },
  },
  {
    layout: "stats",
    intent: "Traction",
    blocks: {
      title: { type: "heading", level: "h1", text: "Live with three operators, growing every month" },
      stats: {
        type: "stats",
        items: [
          { value: 3, label: "grid operators in production" },
          { value: 38, suffix: "%", label: "less curtailment on managed lines" },
          { value: 1.9, decimals: 1, prefix: "€", suffix: "M", label: "annual recurring revenue" },
        ],
      },
    },
  },
  {
    layout: "chart-insight",
    intent: "Revenue growth",
    blocks: {
      title: { type: "heading", level: "h1", text: "Revenue tripled in twelve months" },
      insight: { type: "stat", value: 3.1, decimals: 1, suffix: "x", label: "year over year growth" },
      chart: { type: "chart", kind: "column", categories: ["Q4 25", "Q1 26", "Q2 26", "Q3 26"], series: [{ name: "ARR", values: [0.6, 0.9, 1.3, 1.9] }], unit: "M", highlight: 3, caption: "ARR in million euro" },
    },
  },
  {
    layout: "chart",
    intent: "Market share",
    blocks: {
      title: { type: "heading", level: "h1", text: "Wind and solar will carry most of the grid" },
      chart: { type: "chart", kind: "line", categories: ["2020", "2022", "2024", "2026", "2028", "2030"], series: [{ name: "Share", values: [22, 27, 33, 39, 46, 54] }], unit: "%", highlight: 5 },
    },
  },
  {
    layout: "cards",
    intent: "Business model",
    blocks: {
      title: { type: "heading", level: "h1", text: "Three ways we earn" },
      cards: {
        type: "cards",
        items: [
          { title: "Platform license", text: "Annual license per managed grid region, priced on line kilometers." },
          { title: "Savings share", text: "A share of verified curtailment savings, aligned with the operator." },
          { title: "Integration", text: "One time integration and training for each new region." },
        ],
      },
    },
  },
  {
    layout: "comparison",
    intent: "Competition",
    blocks: {
      title: { type: "heading", level: "h1", text: "Built for operators, not for traders" },
      comparison: {
        type: "comparison",
        columns: [
          { title: "Legacy EMS", items: ["Reactive alarms", "Year long rollouts", "No market data"] },
          { title: "Northwind", items: ["Hours ahead forecasts", "Live in weeks", "Weather and market fused"], highlight: true },
          { title: "Trading tools", items: ["Price only view", "No grid topology", "Not for operators"] },
        ],
      },
    },
  },
  {
    layout: "logos",
    intent: "Social proof",
    blocks: {
      title: { type: "heading", level: "h1", text: "Trusted by operators and their partners" },
      logos: {
        type: "logos",
        items: [
          { assetId: "acme", alt: "Acme" },
          { assetId: "globex", alt: "Globex" },
          { assetId: "initech", alt: "Initech" },
          { assetId: "umbrella", alt: "Umbrella" },
        ],
      },
    },
  },
  {
    layout: "timeline",
    intent: "Roadmap",
    blocks: {
      title: { type: "heading", level: "h1", text: "From three regions to the whole continent" },
      timeline: {
        type: "timeline",
        current: 1,
        items: [
          { label: "2024", title: "First pilot", text: "One region in Denmark" },
          { label: "2026", title: "Three operators", text: "Production in DK, NL, DE" },
          { label: "2027", title: "Ten regions", text: "Nordics and Benelux" },
          { label: "2029", title: "Pan European", text: "ENTSO-E wide coverage" },
        ],
      },
    },
  },
  {
    layout: "team",
    intent: "Team",
    blocks: {
      title: { type: "heading", level: "h1", text: "Grid engineers and forecasters" },
      team: {
        type: "team",
        people: [
          { name: "Ingrid Holm", role: "CEO", bio: "Ran control rooms at Energinet for 9 years" },
          { name: "Tomas Berg", role: "CTO", bio: "Built weather models at DMI" },
          { name: "Lea Vos", role: "Head of Sales", bio: "Sold EMS to 12 operators at Siemens" },
        ],
      },
    },
  },
  {
    layout: "quote",
    intent: "Customer voice",
    blocks: {
      quote: { type: "quote", text: "Northwind saw the bottleneck before our own dispatchers did. That changed how we plan the day.", author: "Pieter de Wit", role: "Head of Operations, a Dutch TSO" },
    },
  },
  {
    layout: "image-full",
    intent: "Vision",
    blocks: {
      image: { type: "image", assetId: "field", alt: "Wind farm at dusk", fit: "cover" },
      title: { type: "heading", level: "display", text: "Every green electron, used." },
      support: { type: "text", size: "lead", text: "That is the grid we are building." },
    },
  },
  {
    layout: "closing",
    intent: "The ask",
    tone: "accent",
    blocks: {
      title: { type: "heading", level: "h1", text: "Join us in balancing the grid" },
      cta: { type: "cta", text: "Raising ==€6M== seed to reach ten regions", detail: "ingrid@northwind.energy" },
    },
  },
];

/** Deep copy: tests change the deck and must not affect shared domain constants. */
export function sampleDeck(): Deck {
  return structuredClone({
    id: "deck_sample",
    title: "Northwind Grid seed pitch",
    brief: { company: "Northwind Grid", topic: "Seed round pitch", audience: "Seed investors", language: "en" },
    design: {
      ...DEFAULT_DESIGN,
      colors: { bg: "#FBFAF7", fg: "#0F1A17", accent: "#0E7C66", accent2: "#F4B942", muted: "#56635F", surface: "#EFF2EF" },
      fonts: { heading: { source: "google", family: "Manrope" }, body: { source: "google", family: "Inter" } },
      type: { ...DEFAULT_DESIGN.type, headingWeight: 700 },
    },
    motion: DEFAULT_MOTION,
    slides: SAMPLE_SLIDES.map((s, i) => ({ ...s, id: `s${i + 1}` })),
    revision: 1,
    createdAt: "2026-10-18T00:00:00.000Z",
    updatedAt: "2026-10-18T00:00:00.000Z",
  });
}

/** Deck concept for create_deck tests (required in create_deck). */
export const SAMPLE_CONCEPT = { idea: "A calm investor deck where one number per slide makes the case", school: "swiss", avoid: "Stock photos and gradients", signature: "One accent number per slide" } as const;
