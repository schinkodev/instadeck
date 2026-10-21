/**
 * Pohyb v prezentaci. Prezentace, ne video: čas neběží sám, kroky posouvá řečník.
 *
 * Pohybový jazyk navrhuje model pro každý deck (V006): intenzitu, zdůvodnění a vlastní slovník vstupů
 * a přechodů jako keyframes Web Animations. Presety níže jsou zapsané ve stejném formátu a slouží
 * jako výchozí bod. Engine animaci vždy končí v klidovém stavu slidu, takže HTML v koncovém stavu
 * platí pro tisk i PDF. Co je dobrý pohyb, hlídají měřené principy (motion-limits.ts), ne výčty.
 */
import { z } from "zod";
import { INTENSITIES } from "./motion-limits";

export const EASINGS = {
  "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
  "out-cubic": "cubic-bezier(0.33, 1, 0.68, 1)",
  "in-out": "cubic-bezier(0.65, 0, 0.35, 1)",
  "in-cubic": "cubic-bezier(0.32, 0, 0.67, 0)",
  "out-back": "cubic-bezier(0.34, 1.56, 0.64, 1)",
} as const;
export type EasingName = keyof typeof EASINGS;

const NUM = String.raw`\s*-?(?:\d+\.?\d*|\.\d+)\s*`;
const EASING_PATTERNS = [
  /^(linear|ease|ease-in|ease-out|ease-in-out)$/,
  new RegExp(`^cubic-bezier\\(${NUM}(,${NUM}){3}\\)$`),
  /^linear\([\d.\s%,-]+\)$/,
];

export function isEasing(v: string): boolean {
  return v in EASINGS || EASING_PATTERNS.some((p) => p.test(v));
}

/** Křivka jako CSS hodnota: pojmenovaná z EASINGS, jinak tak, jak ji model napsal. */
export function cssEasing(v: string): string {
  return v in EASINGS ? EASINGS[v as EasingName] : v;
}

const easing = z
  .string()
  .refine(isEasing, "Use a named easing (out-expo, out-cubic, in-out, in-cubic, out-back), a CSS keyword, cubic-bezier(x1, y1, x2, y2) or linear(...)")
  .describe("Named easing (out-expo, out-cubic, in-out, in-cubic, out-back), CSS keyword, cubic-bezier(...) or linear(...) for springs");

/** Hodnota CSS vlastnosti v keyframe: jen funkce s čísly, žádné url() ani řetězce. */
const cssValue = (example: string) =>
  z
    .string()
    .max(200)
    .regex(/^[a-zA-Z0-9\s().,%+-]*$/, "Only CSS functions with numbers and units")
    .refine((v) => !/url\s*\(/i.test(v), "url() is not allowed")
    .describe(example);

export const keyframeSchema = z.strictObject({
  offset: z.number().min(0).max(1).optional().describe("Position in time 0 to 1, default evenly spaced"),
  opacity: z.number().min(0).max(1).optional(),
  transform: cssValue("CSS transform, e.g. translateY(40px) scale(0.96)").optional(),
  filter: cssValue("CSS filter, e.g. blur(8px)").optional(),
  clipPath: cssValue("CSS clip-path, e.g. inset(0 0 100% 0)").optional(),
  easing: easing.optional().describe("Easing from this keyframe to the next"),
});
export type Keyframe = z.infer<typeof keyframeSchema>;

const keyframes = (what: string) => z.array(keyframeSchema).max(6).describe(what);
const duration = (max: number) => z.number().int().min(0).max(max).describe("Milliseconds at tempo confident, the deck tempo scales it. 0 = no motion");
const purpose = z.string().min(1).max(160).describe("What this motion is for, one sentence");

export const entranceSpecSchema = z.strictObject({
  purpose,
  keyframes: keyframes("States from hidden towards rest. The element always ends in its natural place, so never write the final resting keyframe"),
  duration: duration(3000),
  easing,
  stagger: z.number().int().min(0).max(600).optional().describe("Milliseconds between blocks that enter together, default from the tempo"),
});
export type EntranceSpec = z.infer<typeof entranceSpecSchema>;

export const transitionSpecSchema = z.strictObject({
  purpose,
  duration: duration(2000),
  easing,
  exit: keyframes("Outgoing slide: states after rest, e.g. [{ opacity: 0, transform: 'scale(0.96)' }]. Rest is the implicit start").optional(),
  enter: keyframes("Incoming slide: states before rest, e.g. [{ transform: 'translateX(1920px)' }]. Rest is the implicit end").optional(),
  over: z.enum(["exit", "enter"]).optional().describe("Which slide lies on top during the transition, default exit"),
  shared: z.boolean().optional().describe("Elements on both slides (the headline, a logo, the same image) glide from their old place and size to the new one"),
});
export type TransitionSpec = z.infer<typeof transitionSpecSchema>;

export const ENTRANCES = {
  none: { purpose: "Appears instantly.", keyframes: [], duration: 0, easing: "out-cubic" },
  fade: { purpose: "Quiet, works everywhere. Calm and premium brands.", keyframes: [{ opacity: 0 }], duration: 520, easing: "out-cubic" },
  rise: { purpose: "Fade with a short upward move. The confident default.", keyframes: [{ opacity: 0, transform: "translateY(28px)" }], duration: 640, easing: "out-expo" },
  reveal: {
    purpose: "Content is uncovered from below as if a mask lifts. Editorial, strong headlines.",
    keyframes: [{ opacity: 0, clipPath: "inset(0 0 100% 0)", transform: "translateY(18px)" }],
    duration: 760,
    easing: "out-expo",
  },
  wipe: { purpose: "Uncovered left to right. Technical, data heavy decks.", keyframes: [{ clipPath: "inset(0 100% 0 0)" }], duration: 700, easing: "in-out" },
  focus: { purpose: "Sharpens from a soft blur and slight scale. Vision and product moments.", keyframes: [{ opacity: 0, filter: "blur(12px)", transform: "scale(1.03)" }], duration: 820, easing: "out-expo" },
} as const satisfies Record<string, EntranceSpec>;

export const TRANSITIONS = {
  cut: { purpose: "No transition. Fast, factual.", duration: 0, easing: "out-cubic" },
  fade: { purpose: "Cross fade. The safe default.", duration: 450, easing: "in-out", exit: [{ opacity: 0 }] },
  slide: {
    purpose: "New slide slides in from the right, old one moves left. Sense of progress.",
    duration: 600,
    easing: "out-expo",
    enter: [{ transform: "translateX(1920px)" }],
    exit: [{ transform: "translateX(-480px)", opacity: 0 }],
  },
  lift: {
    purpose: "Old slide drops back and fades, new one rises. Calm depth.",
    duration: 650,
    easing: "out-expo",
    exit: [{ transform: "scale(0.94)", opacity: 0 }],
    enter: [{ transform: "translateY(48px)", opacity: 0 }],
  },
  morph: {
    purpose: "Shared elements (headline, logo, same image) glide to their new place while the rest cross fades. Feels like one continuous canvas.",
    duration: 700,
    easing: "out-expo",
    exit: [{ opacity: 0 }],
    shared: true,
  },
  wipe: {
    purpose: "The new slide is uncovered left to right over the old one. A clean chapter change, works at any intensity because nothing travels.",
    duration: 650,
    easing: "out-expo",
    enter: [{ clipPath: "inset(0 100% 0 0)" }, { offset: 0.999, clipPath: "inset(0 0 0 0)" }],
    over: "enter",
  },
  curtain: {
    purpose: "The new slide rises from below like a curtain while the old one drifts up. Editorial, a new section or a turn in the story.",
    duration: 700,
    easing: "out-expo",
    enter: [{ clipPath: "inset(100% 0 0 0)" }, { offset: 0.999, clipPath: "inset(0 0 0 0)" }],
    exit: [{ transform: "translateY(-96px)", opacity: 0.4 }],
    over: "enter",
  },
  iris: {
    purpose: "The new slide opens from the center as a growing circle. The hook, the reveal, the big moment.",
    duration: 800,
    easing: "out-expo",
    enter: [{ clipPath: "circle(0% at 50% 50%)" }, { offset: 0.999, clipPath: "circle(75% at 50% 50%)" }],
    over: "enter",
  },
  zoom: {
    purpose: "The camera pushes through: the old slide grows past the viewer and fades while the new one settles in from slightly far. Product and vision moments.",
    duration: 750,
    easing: "out-expo",
    exit: [{ transform: "scale(1.12)", opacity: 0 }],
    enter: [{ transform: "scale(0.92)", opacity: 0 }],
  },
} as const satisfies Record<string, TransitionSpec>;

/**
 * Přechod podle místa v příběhu. Pohyb mezi slidy je znamení: co se opakuje, je neviditelné a nese
 * obsah, výjimka označí zlom. Jazyk decku (výchozí přechod) tedy nese kontinuitu a výjimky zlomy.
 */
export const TRANSITION_BY_BEAT = {
  continues: { use: "The same headline, logo, image or number lives on to the next slide.", transition: "morph" },
  chapter: { use: "A new section starts, the story turns to a different topic.", transition: "wipe or curtain" },
  hook: { use: "The opening claim, the reveal of the product, the big number, the ask.", transition: "iris or zoom" },
  progress: { use: "Steps of a sequence, a roadmap, a timeline, a flow from left to right.", transition: "slide" },
  proof: { use: "Evidence, data and quotes that should be read, not watched.", transition: "fade" },
} as const;

export interface HeroDef {
  purpose: string;
  duration: number;
  easing: EasingName;
}

/** Zvýrazňující pohyby bloků (přiřazuje je doména podle typu bloku, viz blocks.ts). */
export const HERO_MOTIONS = {
  "count-up": { purpose: "Number counts from zero to its value.", duration: 1400, easing: "out-expo" },
  "chart-grow": { purpose: "Bars grow from the baseline, one after another.", duration: 1000, easing: "out-expo" },
  "line-draw": { purpose: "Line draws from left to right, points pop in.", duration: 1300, easing: "in-out" },
  "donut-sweep": { purpose: "Segments sweep around the ring.", duration: 1200, easing: "out-expo" },
  "timeline-draw": { purpose: "The axis draws and milestones appear in order.", duration: 1200, easing: "in-out" },
} as const satisfies Record<string, HeroDef>;
export type HeroMotion = keyof typeof HERO_MOTIONS;

/** Temperament decku: škáluje všechna trvání a rozestupy, presety i vlastní slovník. */
export const TEMPOS = {
  calm: { duration: 1.25, stagger: 140 },
  confident: { duration: 1, stagger: 100 },
  brisk: { duration: 0.8, stagger: 70 },
} as const;
export type Tempo = keyof typeof TEMPOS;

const motionName = z.string().regex(/^[a-z][a-z0-9-]{0,31}$/, "Lowercase name with dashes, e.g. soft-rise");

export const motionVocabularySchema = z
  .strictObject({
    entrances: z.record(motionName, entranceSpecSchema).optional(),
    transitions: z.record(motionName, transitionSpecSchema).optional(),
  })
  .describe("Your own entrances and transitions for this deck, used by name like presets. Names must differ from the presets");
export type MotionVocabulary = z.infer<typeof motionVocabularySchema>;

const motionFields = {
  intensity: z.enum(INTENSITIES).describe("How much this deck moves: still (nothing moves), subtle, expressive, kinetic. Measured against what the motion really does"),
  rationale: z.string().min(1).max(240).optional().describe("Why this motion language fits the audience and brand, one or two sentences"),
  entrance: motionName.describe("Default entrance of slide content: a preset or a name from vocabulary.entrances"),
  transition: motionName.describe("Default transition between slides: a preset or a name from vocabulary.transitions"),
  tempo: z.enum(Object.keys(TEMPOS) as [Tempo, ...Tempo[]]).describe("Scales every duration: calm 1.25x, confident 1x, brisk 0.8x"),
  heroes: z.boolean().describe("Animate numbers, charts and timelines (count up, grow, draw)"),
};

export const deckMotionSchema = z.strictObject({ ...motionFields, vocabulary: motionVocabularySchema.optional() });
export type DeckMotion = z.infer<typeof deckMotionSchema>;

/** Změna pohybu decku (op set_motion): uvedená pole se přepíšou, slovník se slučuje po položkách. */
export const deckMotionPatchSchema = z.strictObject({
  intensity: motionFields.intensity.optional(),
  rationale: motionFields.rationale,
  entrance: motionFields.entrance.optional(),
  transition: motionFields.transition.optional(),
  tempo: motionFields.tempo.optional(),
  heroes: motionFields.heroes.optional(),
  vocabulary: z
    .strictObject({
      entrances: z.record(motionName, entranceSpecSchema.nullable()).optional(),
      transitions: z.record(motionName, transitionSpecSchema.nullable()).optional(),
    })
    .optional()
    .describe("Entries to add or replace, null removes one. Unlisted entries stay"),
});
export type DeckMotionPatch = z.infer<typeof deckMotionPatchSchema>;

export const slideMotionSchema = z.strictObject({
  entrance: motionName.optional().describe("Entrance of this slide's content, overrides the deck default. An exception that marks a key moment"),
  transition: motionName.optional().describe("Transition INTO this slide, overrides the deck default"),
  zones: z.record(z.string(), motionName).optional().describe("Entrance per zone, e.g. { \"image\": \"focus\" }, for the one element that should arrive differently"),
});
export type SlideMotion = z.infer<typeof slideMotionSchema>;

export const DEFAULT_MOTION: DeckMotion = { intensity: "subtle", entrance: "rise", transition: "fade", tempo: "confident", heroes: true };

/** Decky z doby před V006 nemají intenzitu. Měly jen presety, kterým odpovídá subtle. */
export const storedDeckMotionSchema = z.preprocess(
  (m) => (m && typeof m === "object" && !("intensity" in m) ? { intensity: "subtle", ...m } : m),
  deckMotionSchema,
);

export function entranceOf(motion: DeckMotion, name: string): EntranceSpec | undefined {
  return motion.vocabulary?.entrances?.[name] ?? (ENTRANCES as Record<string, EntranceSpec>)[name];
}

export function transitionOf(motion: DeckMotion, name: string): TransitionSpec | undefined {
  return motion.vocabulary?.transitions?.[name] ?? (TRANSITIONS as Record<string, TransitionSpec>)[name];
}

/** Sloučí změnu do pohybu decku (op set_motion). */
export function patchMotion(motion: DeckMotion, patch: DeckMotionPatch): DeckMotion {
  const { vocabulary: vp, ...rest } = patch;
  const out: DeckMotion = { ...motion, ...Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined)) };
  if (vp) {
    const merge = <T>(base: Record<string, T> | undefined, p: Record<string, T | null> | undefined) => {
      const m: Record<string, T> = { ...base };
      for (const [k, v] of Object.entries(p ?? {})) {
        if (v === null) delete m[k];
        else m[k] = v;
      }
      return Object.keys(m).length ? m : undefined;
    };
    const entrances = merge(motion.vocabulary?.entrances, vp.entrances);
    const transitions = merge(motion.vocabulary?.transitions, vp.transitions);
    out.vocabulary = entrances || transitions ? { ...(entrances && { entrances }), ...(transitions && { transitions }) } : undefined;
    if (!out.vocabulary) delete out.vocabulary;
  }
  return out;
}

