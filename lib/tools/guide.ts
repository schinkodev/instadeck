/**
 * Průvodce tvorbou decku, generovaný z domény. Popisy tools ani instructions znalost nenesou,
 * odkazují sem (tool get_design_guide a resources instadeck://...).
 */
import {
  BLOCK_INFO,
  BLOCK_TYPES,
  DENSITY,
  DESIGN_PRINCIPLES,
  EASINGS,
  ENTRANCES,
  GOOGLE_FONTS,
  HERO_MOTIONS,
  INTENSITY,
  LAYOUTS,
  MAX_PX,
  MIN_FONT_PX,
  MOTION_LIMITS,
  MOTION_PRINCIPLES,
  NARRATIVE_FRAMES,
  NARRATIVE_GUIDANCE,
  PITCH_BEATS,
  PITCH_GUIDANCE,
  STORYTELLING_PRINCIPLES,
  TEMPOS,
  TEXT_LIMITS,
  TRANSITIONS,
  TYPE_SCALES,
} from "@/lib/domain";
import type { StoreMode } from "@/lib/state";

export const GUIDE_SECTIONS = ["workflow", "layouts", "blocks", "motion", "design", "fonts", "pitch", "design_principles", "storytelling_principles", "motion_principles"] as const;
export type GuideSection = (typeof GUIDE_SECTIONS)[number];

export type Mode = StoreMode;

/** Postup tvorby decku. Liší se jen kontrola a předání: lokálně náhledy a soubor, hostovaně zobrazení v chatu a odkaz. */
export function workflow(mode: Mode): string[] {
  const local = mode === "local";
  return [
    "1. Brief: company, topic, audience, goal and content language. Ask the user only for what you cannot infer.",
    local
      ? "2. Brand: add the logo and brand files with add_asset and read candidate colors with extract_brand_colors. Pick the primary color and a mood, call suggest_brand_system, then create_brand_kit with its brand_kit plus the name and logos. Read the findings it returns. Skip when the user has no brand."
      : "2. Brand: add the logo with add_asset from its url (or small data_base64) and read colors with extract_brand_colors for SVG or from the image yourself. Pick the primary color and a mood, call suggest_brand_system, then create_brand_kit with its brand_kit plus the name and logos. Read the findings it returns. Skip when the user has no brand.",
    "3. Story: read the example closest to the brief with get_example. Pick a narrative frame and the beats for this audience (section pitch: frames, beats). For every beat that needs evidence the user has not given, ask the user before building: at most five questions in one message, each with a suggested default. Never invent numbers, names or quotes. Write each slide intent as one sentence before choosing layouts, and give every slide its beat.",
    "4. Design: use the design and motion from suggest_brand_system, or choose colors, fonts, type scale and density yourself (sections design, fonts). Design the motion language for the audience: intensity, rationale, entrance, transition and, when the presets do not fit, your own vocabulary (section motion). Explain the choice to the user in two or three sentences.",
    "5. Build: call create_deck once with the brief, brand kit, design, motion and all slides. Keep the structure, rhythm and text lengths of the example, replace all of its content.",
    local
      ? "6. Review: read findings and look at the previews. Fix every error and the warnings that matter with apply_ops, passing expected_revision."
      : "6. Review: read findings. The deck view in the chat measures the slides and the motion and reports text that does not fit and motion that breaks the deck's intensity, fix those and every error with apply_ops, passing expected_revision.",
    local
      ? "7. Hand over: give the user the presentation file to open (arrow keys or click to advance, G all slides, P presenter view, F fullscreen, N speaker notes) and offer export_deck as PDF or PowerPoint."
      : "7. Hand over: the deck plays in the chat. Give the user presentation.url: it presents full screen with a presenter view and downloads the deck as PDF, PowerPoint (editable, native charts, speaker notes) or a single HTML file. It can be shared as is.",
  ];
}

const layouts = () =>
  LAYOUTS.map((l) => ({
    id: l.id,
    purpose: l.purpose,
    density: l.density,
    zones: l.zones.map((z) => ({ name: z.name, accepts: z.accepts, required: z.required })),
    ...(l.bleed && { fullBleed: l.bleed.zone }),
  }));

const blocks = () => ({
  types: BLOCK_TYPES.map((t) => ({ type: t, ...BLOCK_INFO[t] })),
  highlight: "Wrap key words in ==double equals== to draw them in the accent color. Use it on one or two words per slide, never whole sentences.",
  textLimits: TEXT_LIMITS,
  reveal: "step: 0 or omitted shows the block with the slide entrance, 1 to 5 reveals it on click. build: items reveals list items one per click.",
});

const motion = () => ({
  approach:
    "Design a motion language for this deck the way you design its type scale. Declare how much it moves (intensity) and why (rationale), pick one entrance and one transition that carry the deck, and mark a few key moments with exceptions. Use the presets or write your own entrances and transitions as Web Animations keyframes in vocabulary. Every motion ends in the slide's resting state, which is also what prints. InstaDeck measures what the motion really does and reports it.",
  intensity: Object.fromEntries(Object.entries(INTENSITY).map(([k, v]) => [k, { use: v.purpose, entranceTravelPx: v.travelPx, scale: v.scale, blurPx: v.blurPx, rotateDeg: v.rotateDeg, transitionTravelPx: v.transitionTravelPx, overshoot: v.overshoot, heroes: v.heroes }])),
  presets: { entrances: ENTRANCES, transitions: TRANSITIONS },
  vocabulary: {
    entrance: "{ purpose, keyframes: states from hidden towards rest (the resting keyframe is implicit), duration ms, easing, stagger? ms between blocks }",
    transition: "{ purpose, duration ms, easing, exit?: outgoing slide states after rest, enter?: incoming slide states before rest, over?: 'exit' | 'enter' (which slide is on top), shared?: true (headline, logo, same image or number glide to their new place) }",
    keyframe: "{ offset?, opacity?, transform?, filter?, clipPath?, easing? }. Values are CSS functions with numbers, no url(). The slide is 1920x1080 px.",
    easings: { named: EASINGS, also: "CSS keywords, cubic-bezier(x1, y1, x2, y2) and linear(...) for springs" },
    perSlide: "slide.motion.entrance and slide.motion.transition (the transition INTO the slide) use any preset or vocabulary name. slide.motion.zones gives one zone its own entrance, e.g. { image: 'focus' }.",
    example: {
      intensity: "expressive",
      rationale: "A product keynote: the product should feel fast, the story should feel like one continuous canvas.",
      entrance: "soft-rise",
      transition: "push",
      tempo: "confident",
      heroes: true,
      vocabulary: {
        entrances: { "soft-rise": { purpose: "Content floats up and sharpens.", keyframes: [{ opacity: 0, transform: "translateY(36px)", filter: "blur(6px)" }], duration: 700, easing: "out-expo" } },
        transitions: {
          push: { purpose: "The next slide pushes the old one away, headlines glide.", duration: 700, easing: "out-expo", enter: [{ transform: "translateX(1920px)" }], exit: [{ transform: "translateX(-640px)", opacity: 0 }], over: "enter", shared: true },
        },
      },
    },
  },
  heroes: Object.fromEntries(Object.entries(HERO_MOTIONS).map(([k, v]) => [k, v.purpose])),
  tempos: Object.fromEntries(Object.entries(TEMPOS).map(([k, v]) => [k, `durations x${v.duration}, ${v.stagger} ms between blocks`])),
  limits: MOTION_LIMITS,
  measured: [
    "Without a browser: names exist, durations between a jump and a wait, the time until a slide is readable, exceptions stay rare, still decks do not animate numbers, shared transitions have something to share.",
    "In a browser (the deck view in the chat, or the local server): how far, how big, how blurred and how rotated each motion really is against the declared intensity, overshoot outside kinetic decks, entrances that speed up into place instead of easing out.",
  ],
  rules: [
    "Motion must earn its place. A deck that does not move (intensity still, entrance none or fade, transition cut or fade, heroes false) is a strong choice for boards, reports and minimalist professional decks.",
    "One entrance and one transition carry the deck. Exceptions mark the hook, the reveal or the ask, about one per five slides.",
    "Each slide gets at most one hero motion. Priority: chart, timeline, stats, stat. Other numbers show their final value.",
    "Use click steps for arguments that build, not for decoration. Most slides need none.",
    "Text moves as whole blocks, never letter by letter.",
    "Read the motion principles (section motion_principles) for the reasons behind these rules.",
  ],
});

const design = () => ({
  colors: "bg and fg carry the deck. accent is a signal for numbers, highlights and chart focus only. accent2 is the second chart color. muted is for secondary text and must stay readable. surface is for cards.",
  contrast: "Text on background needs 4.5:1, accent on background 3:1. The accent tone slide uses the accent as background, the inverse tone swaps bg and fg.",
  typeScales: TYPE_SCALES,
  typeBase: "base is the body size in px on a 1920x1080 slide: 26 to 30 suits most decks.",
  limits: { minFontPx: MIN_FONT_PX, maxPx: MAX_PX },
  density: Object.keys(DENSITY),
  cards: "filled (surface background), outline (thin border) or flat (top rule only).",
});

export function designGuide(sections: readonly GuideSection[] = ["workflow", "layouts", "blocks", "motion", "design", "pitch"], mode: Mode = "local") {
  const all: Record<GuideSection, () => unknown> = {
    workflow: () => workflow(mode),
    layouts,
    blocks,
    motion,
    design,
    fonts: () => GOOGLE_FONTS.map((f) => ({ family: f.family, category: f.category, weights: f.weights, character: f.character })),
    pitch: () => ({ beats: PITCH_BEATS, frames: NARRATIVE_FRAMES, narrative: NARRATIVE_GUIDANCE, ...PITCH_GUIDANCE }),
    design_principles: () => DESIGN_PRINCIPLES.map((p) => ({ id: p.id, name: p.name, author: p.author, principle: p.principle, application: p.slideApplication })),
    storytelling_principles: () => STORYTELLING_PRINCIPLES.map((p) => ({ id: p.id, name: p.name, author: p.author, principle: p.principle, application: p.outlineApplication })),
    motion_principles: () => MOTION_PRINCIPLES.map((p) => ({ id: p.id, name: p.name, author: p.author, principle: p.principle, why: p.why, application: p.slideApplication })),
  };
  return Object.fromEntries(sections.map((s) => [s, all[s]()]));
}
