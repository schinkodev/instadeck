/**
 * Capability registry: what the server says about itself and how far the implementation is (pattern from stavebak.cz).
 * The single source of truth for self-description. The instructions and the resource instadeck://capabilities are built from it.
 * A test checks: every tool is in the registry, planned entries have no tools, partial entries have `now`,
 * the tools of a capability exist in every mode in which the server offers it.
 */
import { ICON_NAMES } from "@/lib/domain";
import type { Mode } from "@/lib/tools";

export type CapabilityStatus = "done" | "partial" | "planned";

export interface Capability {
  id: string;
  claim: string;
  status: CapabilityStatus;
  /** What works now and what is missing. Required for partial. */
  now?: string;
  tools?: string[];
  resources?: string[];
  /** Modes in which the server offers the capability. Default both. */
  modes?: Mode[];
}

export const CAPABILITIES: Capability[] = [
  {
    id: "design-knowledge",
    claim: "Knows how great pitch decks are built: story beats and narrative frames (classical rhetoric, Minto, Duarte, Toulmin and more), design schools (Swiss, editorial, keynote, data journalism, IBCS and more), layouts, typography, color, motion and the design, storytelling and motion principles behind them. Asks you for the numbers and proof a story needs instead of inventing them.",
    status: "done",
    tools: ["get_design_guide"],
    resources: ["instadeck://guide", "instadeck://layouts", "instadeck://blocks", "instadeck://motion", "instadeck://fonts", "instadeck://pitch", "instadeck://schools", "instadeck://principles/design", "instadeck://principles/storytelling", "instadeck://principles/motion"],
  },
  {
    id: "brand",
    claim: "Turns a logo and brand files into a brand kit: colors read from the logo, brand fonts, logo variants and tone. Suggests a coherent system (readable palette, font pair, type scale) from a primary color and a mood, and checks the brand kit for contrast and fonts.",
    status: "done",
    tools: ["add_asset", "list_assets", "extract_brand_colors", "suggest_brand_system", "create_brand_kit", "get_brand_kit", "list_brand_kits"],
  },
  {
    id: "icons",
    claim: `Cards can carry an icon from a curated set of ${ICON_NAMES.length} (risk, growth, delivery, partnership and more) that stands for what the card means, drawn in the text color and exported to PowerPoint as pictures.`,
    status: "done",
    tools: ["create_deck", "apply_ops"],
  },
  {
    id: "examples",
    claim: "Shows proven example decks (seed pitch, enterprise sales deck, product launch, board update, consumer launch) with the reasons they work, from a deck that does not move to a kinetic one, so a new deck starts from a good structure and a fitting motion language.",
    status: "done",
    tools: ["get_example"],
    resources: ["instadeck://examples", "instadeck://examples/{id}"],
  },
  {
    id: "decks",
    claim: "Creates and edits branded pitch decks with revisions: every change is validated, versioned and can be reverted.",
    status: "done",
    tools: ["create_deck", "get_deck", "list_decks", "apply_ops", "get_history", "revert_deck", "delete_deck"],
    resources: ["instadeck://deck/{deck_id}"],
  },
  {
    id: "motion",
    claim: "Lets Claude design the motion language of each deck: from a deck that does not move to kinetic, with its own entrances and transitions as keyframes and elements that glide from slide to slide.",
    status: "done",
    tools: ["create_deck", "apply_ops"],
    resources: ["instadeck://motion", "instadeck://principles/motion"],
  },
  {
    id: "quality",
    claim: "Checks every deck for text that does not fit, low contrast, overlong text, motion that does not match its declared intensity, motion that speeds into place or overshoots, and repetitive layouts.",
    status: "done",
    tools: ["validate_deck"],
  },
  {
    id: "previews",
    claim: "Shows Claude a picture of every changed slide, so it can fix what looks off.",
    status: "done",
    tools: ["render_preview"],
    modes: ["local"],
  },
  {
    id: "in-chat",
    claim: "Plays the deck right in the chat in clients that show apps (claude.ai, Claude Desktop), full screen on request, measures every slide and its motion in your browser so Claude can fix what is off, and lets you pick a slide in the chat and say what to change.",
    status: "done",
    tools: ["create_deck", "apply_ops", "get_deck", "get_deck_view"],
  },
  {
    id: "presentation",
    claim: "Delivers the deck as one HTML file that presents with animations: slide transitions, click by click reveals, counting numbers, growing charts, an overview of all slides, a presenter view with notes and a timer, fullscreen.",
    status: "done",
    tools: ["export_deck"],
    modes: ["local"],
  },
  {
    id: "pptx",
    claim: "Exports the deck as a PowerPoint file with editable text, native charts and tables and speaker notes, laid out exactly as the browser rendered it.",
    status: "done",
    tools: ["export_deck"],
    modes: ["local"],
  },
  {
    id: "pdf",
    claim: "Exports the deck as a PDF with selectable text.",
    status: "done",
    tools: ["export_deck"],
    modes: ["local"],
  },
  {
    id: "link",
    claim: "Gives every deck a link that opens the animated presentation in any browser, with an overview of all slides and a presenter view, and downloads it as PDF, PowerPoint (editable text, native charts, speaker notes) or one HTML file. Decks are kept for 30 days.",
    status: "done",
    tools: ["create_deck"],
    modes: ["hosted"],
  },
  {
    id: "sharing",
    claim: "Shares a deck made on your computer by link, so anyone can watch the animated presentation in a browser.",
    status: "planned",
    modes: ["local"],
  },
];

const STATUS_LABEL: Record<CapabilityStatus, string> = { done: "done", partial: "partial", planned: "planned" };

export function capabilitiesFor(mode: Mode): Capability[] {
  return CAPABILITIES.filter((c) => !c.modes || c.modes.includes(mode));
}

export function renderCapabilities(mode: Mode): string {
  return capabilitiesFor(mode).map((c) => `- [${STATUS_LABEL[c.status]}] ${c.claim}${c.now ? ` Now: ${c.now}` : ""}`).join("\n");
}
