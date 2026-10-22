/**
 * Design schools: the formal language of a deck next to the mood of the brand (mood in suggest_brand_system). The mood says what
 * the brand is, the school says how the deck looks. The model combines schools or names its own references,
 * none of it is a restriction: they are recommendations with reasons, from which it derives the deck design.
 * Fonts only from the curated list (fonts.ts), a test guards it.
 */
import type { Composition } from "./composition";
import type { Intensity } from "./motion-limits";
import type { Tempo } from "./motion";
import type { TYPE_SCALES } from "./tokens";

export interface DesignSchool {
  id: string;
  name: string;
  masters: string;
  /** The idea of the school in one sentence. */
  idea: string;
  /** How to think about a deck in this school. */
  think: string;
  fits: string;
  type: { heading: readonly string[]; body: readonly string[]; scale: keyof typeof TYPE_SCALES; weight: number; case: "none" | "upper" };
  color: string;
  space: { density: "airy" | "balanced" | "compact"; radius: number; cards: "flat" | "outline" | "filled" };
  imagery: string;
  motion: { intensity: Intensity; tempo: Tempo; note: string };
  /** The default geometry of a slide in this school (V009). A slide may override it. */
  composition?: Composition;
  avoid: string;
}

export const DESIGN_SCHOOLS: readonly DesignSchool[] = [
  {
    id: "swiss",
    name: "International Typographic Style",
    masters: "Josef Müller-Brockmann, Armin Hofmann, Emil Ruder",
    idea: "Objective clarity: a strict grid, flush left type and one signal color carry the message without decoration.",
    think: "Every element sits on the grid and shares edges. Hierarchy comes from size and position, never from ornament. Empty space is part of the composition.",
    fits: "Investors, enterprise, consulting, any audience that values precision.",
    type: { heading: ["Inter Tight", "Archivo", "Schibsted Grotesk"], body: ["Inter"], scale: "perfect-fourth", weight: 700, case: "none" },
    color: "Black and white with one strong signal color (red or blue) used only for the key number or word.",
    space: { density: "balanced", radius: 0, cards: "flat" },
    imagery: "Objective photography, tightly cropped, often grayscale. Images align to the grid like text.",
    motion: { intensity: "subtle", tempo: "confident", note: "Cuts and wipes, nothing decorative. Motion reveals structure." },
    composition: { axis: "asymmetric", split: "1:2" },
    avoid: "Centered body text, rounded corners, more than one accent color, decoration.",
  },
  {
    id: "editorial",
    name: "Editorial magazine",
    masters: "Alexey Brodovitch, Bloomberg Businessweek, Pentagram",
    idea: "Each slide is a spread: a dramatic headline, strong contrast of scale and one image or number that carries the story.",
    think: "Write headlines like a magazine editor and size them like a cover. Contrast huge and small. Let one element dominate each slide.",
    fits: "Brand stories, advisory, vision decks, launches with a point of view.",
    type: { heading: ["Fraunces", "Playfair Display", "Instrument Serif", "DM Serif Display"], body: ["Inter", "Source Serif 4"], scale: "golden", weight: 400, case: "none" },
    color: "Mostly paper and ink, one rich accent from the brand, occasional full color slides for emphasis.",
    space: { density: "airy", radius: 0, cards: "flat" },
    imagery: "Full bleed photography with short captions. Pull quotes set large.",
    motion: { intensity: "subtle", tempo: "calm", note: "Reveal and fade, like turning a page." },
    composition: { split: "1:2" },
    avoid: "Uniform sizes, bullet lists, many small elements competing.",
  },
  {
    id: "ma",
    name: "Ma, the meaningful void",
    masters: "Kenya Hara, Ikko Tanaka, Muji",
    idea: "Emptiness is the material: one quiet element per slide, surrounded by space that gives it weight.",
    think: "Remove until only the essential remains. One idea, one element, a lot of air. Restraint signals confidence.",
    fits: "Premium products, design led brands, calm and trustworthy audiences.",
    type: { heading: ["DM Sans", "Manrope", "Newsreader"], body: ["Inter", "DM Sans"], scale: "major-third", weight: 500, case: "none" },
    color: "Warm whites and soft grays, one muted natural accent.",
    space: { density: "airy", radius: 4, cards: "flat" },
    imagery: "Single objects on calm backgrounds, natural light, lots of negative space.",
    motion: { intensity: "still", tempo: "calm", note: "Fades only, or nothing at all." },
    composition: { axis: "asymmetric" },
    avoid: "Filling space, more than three items on a slide, saturated colors.",
  },
  {
    id: "keynote",
    name: "Product keynote",
    masters: "Apple keynotes, Steve Jobs and Duarte",
    idea: "One idea per slide at enormous size, on a dark stage, with the product as the hero.",
    think: "If it can be said in five words, use five words. Numbers and product shots fill the slide. Build to one reveal.",
    fits: "Product launches, events, consumer and hardware.",
    type: { heading: ["Inter Tight", "Geist", "Sora"], body: ["Inter", "Geist"], scale: "golden", weight: 700, case: "none" },
    color: "Dark background, white type, one bright accent for the reveal.",
    space: { density: "airy", radius: 24, cards: "filled" },
    imagery: "Product shots on black, large and centered, or full bleed.",
    motion: { intensity: "expressive", tempo: "confident", note: "Morph between slides, a focus entrance for the reveal." },
    composition: { axis: "center" },
    avoid: "Bullet lists, small text, more than one message per slide.",
  },
  {
    id: "product-tech",
    name: "Technical product",
    masters: "Stripe, Linear, Vercel",
    idea: "Precision and craft: a dark, quiet interface language with exact numbers and small mono details.",
    think: "Show the product working. Use real numbers with units. Small labels in mono make it feel engineered.",
    fits: "Developer tools, infrastructure, data and security products.",
    type: { heading: ["Geist", "Inter Tight", "Space Grotesk"], body: ["Inter", "Geist"], scale: "major-third", weight: 600, case: "none" },
    color: "Near black or deep navy surfaces, light text, one luminous accent.",
    space: { density: "balanced", radius: 12, cards: "outline" },
    imagery: "Screenshots and code, cropped to the part that matters.",
    motion: { intensity: "subtle", tempo: "brisk", note: "Fast, precise entrances, a shared transition for the product view." },
    avoid: "Stock photos, playful shapes, vague claims without numbers.",
  },
  {
    id: "brutalist",
    name: "Brutalist",
    masters: "Experimental Jetset, contemporary web brutalism",
    idea: "Raw and loud: oversized type, hard edges and honest structure that refuses polish.",
    think: "Make the type the image. Use contrast, scale and capitals. Edges are visible, nothing is softened.",
    fits: "Creative studios, culture, events, brands that want to provoke.",
    type: { heading: ["Space Grotesk", "Archivo", "Big Shoulders Display"], body: ["Work Sans", "IBM Plex Sans"], scale: "augmented-fourth", weight: 700, case: "upper" },
    color: "Black, white and one aggressive color, used in large fields.",
    space: { density: "compact", radius: 0, cards: "outline" },
    imagery: "High contrast photos, hard crops, sometimes none at all.",
    motion: { intensity: "kinetic", tempo: "brisk", note: "Cuts and fast wipes. Abrupt is the point, still one focal motion." },
    avoid: "Soft shadows, rounded corners, gentle pastel palettes.",
  },
  {
    id: "bauhaus",
    name: "Bauhaus and constructivism",
    masters: "Herbert Bayer, El Lissitzky, László Moholy-Nagy",
    idea: "Geometry and primary color as structure: bold type and simple shapes build the message.",
    think: "Use strong blocks of color as composition. Type is set bold and large. Every shape has a job.",
    fits: "Education, culture, bold consumer brands, events.",
    type: { heading: ["Syne", "Unbounded", "Archivo"], body: ["Work Sans", "Figtree"], scale: "perfect-fifth", weight: 700, case: "none" },
    color: "Primary red, yellow and blue with black, used as large flat fields and accent tone slides.",
    space: { density: "balanced", radius: 0, cards: "filled" },
    imagery: "Graphic shapes over photography, or photography in a single color.",
    motion: { intensity: "expressive", tempo: "confident", note: "Slide and wipe like moving planes." },
    avoid: "Gradients, soft colors, decoration that is not structural.",
  },
  {
    id: "functional",
    name: "Functional design",
    masters: "Dieter Rams, Braun, Otl Aicher",
    idea: "Less but better: order, neutrality and one functional color make the content effortless to read.",
    think: "Every element must be useful. Small, orderly type, gray tones and a single orange or green for what matters.",
    fits: "Industrial, engineering, B2B, internal strategy and board decks.",
    type: { heading: ["Inter", "IBM Plex Sans", "Work Sans"], body: ["Inter", "IBM Plex Sans"], scale: "minor-third", weight: 600, case: "none" },
    color: "Warm grays and white, one functional accent.",
    space: { density: "balanced", radius: 6, cards: "outline" },
    imagery: "Product and process photos, neutral and well lit.",
    motion: { intensity: "still", tempo: "calm", note: "Motion only where order matters." },
    avoid: "Anything decorative, large color fields, expressive type.",
  },
  {
    id: "data-editorial",
    name: "Data journalism",
    masters: "The Economist, Financial Times, Edward Tufte",
    idea: "The chart is the story: a sentence headline states the finding, the chart proves it, the source line earns trust.",
    think: "Headline the finding, not the topic. Highlight the one series that matters, mute the rest. Label directly, add an axis only when values must be read off, mark a target with a reference line, cite the source.",
    fits: "Analysts, finance, research, policy, board updates with numbers.",
    type: { heading: ["Source Serif 4", "Newsreader", "Libre Caslon Text"], body: ["Inter", "IBM Plex Sans"], scale: "major-third", weight: 600, case: "none" },
    color: "White or light paper, ink text, one strong data color and grays for everything else.",
    space: { density: "balanced", radius: 0, cards: "flat" },
    imagery: "Charts and tables, rarely photos.",
    motion: { intensity: "still", tempo: "calm", note: "Charts may grow once, nothing else moves." },
    avoid: "Chart junk, 3D, legends where direct labels fit, decorative color.",
  },
  {
    id: "ibcs",
    name: "IBCS notation",
    masters: "Rolf Hichert, International Business Communication Standards",
    idea: "Business numbers in one consistent notation: same meaning, same look, across every chart and table.",
    think: "Actuals solid, plan and forecast hatched (chart.estimate). Changes as a waterfall bridge. Same scale for charts that are compared. Units and period in every title. The message is the title.",
    fits: "Finance, controlling, investor reporting, board packs.",
    type: { heading: ["IBM Plex Sans", "Inter"], body: ["IBM Plex Sans", "Inter"], scale: "minor-third", weight: 600, case: "none" },
    color: "Grayscale for data, one highlight color for the message, red and green only for good and bad variance.",
    space: { density: "compact", radius: 0, cards: "flat" },
    imagery: "None. Charts and tables carry the deck.",
    motion: { intensity: "still", tempo: "calm", note: "No motion. Numbers appear at their final value." },
    composition: { axis: "left", split: "1:1" },
    avoid: "Pies, decorative color, inconsistent scales, charts without units.",
  },
  {
    id: "humanist",
    name: "Warm humanist",
    masters: "Mailchimp, Airbnb, charity storytelling",
    idea: "People first: warm color, soft shapes and faces make the audience feel the story before they analyze it.",
    think: "Show the people the story is about. Speak plainly and warmly. Let one emotional number carry the proof.",
    fits: "Nonprofits, community, consumer apps, health and education.",
    type: { heading: ["Fraunces", "Outfit", "Bricolage Grotesque"], body: ["Figtree", "DM Sans"], scale: "perfect-fourth", weight: 600, case: "none" },
    color: "Warm off whites, one warm brand accent, gentle secondary tints.",
    space: { density: "balanced", radius: 20, cards: "filled" },
    imagery: "Photos of real people in context, natural light.",
    motion: { intensity: "subtle", tempo: "calm", note: "Gentle rises and fades." },
    avoid: "Cold corporate gray, stock photos of handshakes, dense data slides.",
  },
];

export const SCHOOL_IDS = DESIGN_SCHOOLS.map((s) => s.id) as [string, ...string[]];

export function getSchool(id: string): DesignSchool | undefined {
  return DESIGN_SCHOOLS.find((s) => s.id === id);
}

export const CONCEPT_GUIDANCE =
  "Before choosing colors and fonts, write the concept of the deck: the visual idea in one sentence, a school (section schools) or your own named references, what the deck must not look like, and one signature device that recurs (a rule, a crop, a number style, a color field). Then derive the design from it. Schools are recommendations with reasons, combine them or name your own references.";

/** The default composition of a school, for slides that set none (V009). */
export function schoolComposition(id: string | undefined): Composition | undefined {
  return DESIGN_SCHOOLS.find((s) => s.id === id)?.composition;
}
