/**
 * Motion language of the deck for the player and validation: which entrance and transition applies where, shared elements
 * between slides and translating domain definitions into Web Animations configuration (tempo, easings).
 */
import {
  CONTENT_DELAY,
  ENTRANCES,
  HERO_MOTIONS,
  TEMPOS,
  TRANSITIONS,
  cssEasing,
  getLayout,
  type Block,
  type Deck,
  type EntranceSpec,
  type Keyframe,
  type Slide,
  type TransitionSpec,
} from "@/lib/domain";

/**
 * Key of an element that may glide to the next slide (transition with `shared`): the first heading of the slide,
 * a logo and an image by asset, a standalone number by value.
 */
export function sharedKeys(slide: Slide): Map<Block, string> {
  const out = new Map<Block, string>();
  const layout = getLayout(slide.layout);
  if (!layout) return out;
  let heading = false;
  for (const z of layout.zones) {
    const b = slide.blocks[z.name];
    if (!b) continue;
    if (b.type === "heading" && !heading) {
      out.set(b, "heading");
      heading = true;
    } else if (b.type === "logo" || b.type === "image") out.set(b, `${b.type}:${b.assetId}`);
    else if (b.type === "stat") out.set(b, `stat:${b.value}`);
  }
  return out;
}

export const slideEntrance = (slide: Slide, deck: Deck) => slide.motion?.entrance ?? deck.motion.entrance;
export const slideTransition = (slide: Slide, deck: Deck) => slide.motion?.transition ?? deck.motion.transition;

/** Entrance of every slide zone with content: the zone override, otherwise the slide entrance. */
export function zoneEntrances(slide: Slide, deck: Deck): Record<string, string> {
  const base = slideEntrance(slide, deck);
  return Object.fromEntries(Object.keys(slide.blocks).map((z) => [z, slide.motion?.zones?.[z] ?? base]));
}

/** Where each entrance and transition is used (slide ids), in deck order. The transition into the first slide does not play. */
export function motionUsage(deck: Deck): { entrances: Record<string, string[]>; transitions: Record<string, string[]> } {
  const entrances: Record<string, string[]> = {};
  const transitions: Record<string, string[]> = {};
  const add = (m: Record<string, string[]>, name: string, id: string) => {
    const list = (m[name] ??= []);
    if (!list.includes(id)) list.push(id);
  };
  deck.slides.forEach((s, i) => {
    for (const name of Object.values(zoneEntrances(s, deck))) add(entrances, name, s.id);
    if (i > 0) add(transitions, slideTransition(s, deck), s.id);
  });
  return { entrances, transitions };
}

const scaled = (deck: Deck) => {
  const t = TEMPOS[deck.motion.tempo];
  return { t, ms: (v: number) => Math.round(v * t.duration) };
};

/**
 * Keyframes for Web Animations with the easing on every keyframe and none on the effect. The domain describes `offset`
 * as a position in time; with an effect level easing it would be a position in eased progress, and an exit at offset
 * 0.5 under out-expo would be gone after a tenth of the time. The player and the measurement run the effect linear.
 */
const compileKeyframes = (k: readonly Keyframe[], easing: string) => k.map((f) => ({ ...f, easing: cssEasing(f.easing ?? easing) }));

/**
 * The resting keyframe the player adds to the keyframes the model wrote. Mostly empty: the element's own style. A
 * clip-path inset needs an inset at rest, since inset() to none does not interpolate and the element would jump
 * into place at half time instead of being uncovered.
 */
function restOf(...lists: (readonly Keyframe[])[]): Keyframe {
  return lists.some((k) => k.some((f) => f.clipPath?.trim().startsWith("inset("))) ? { clipPath: "inset(0% 0% 0% 0%)" } : {};
}

/**
 * Explicit offsets of keyframes followed by the implicit resting keyframe at 1, spaced like Web Animations does:
 * missing offsets are spread evenly between the known ones, the first defaults to 0.
 */
function offsets(k: readonly Keyframe[]): number[] {
  const all = [...k.map((f) => f.offset), 1];
  if (all[0] === undefined) all[0] = 0;
  for (let i = 1; i < all.length; i++) {
    if (all[i] !== undefined) continue;
    let j = i;
    while (all[j] === undefined) j++;
    const a = all[i - 1]!;
    const b = all[j]!;
    for (let n = i; n < j; n++) all[n] = a + ((b - a) * (n - i + 1)) / (j - i + 1);
  }
  return all as number[];
}

/**
 * When the content entrance of the incoming slide starts, as a share of the transition. At CONTENT_DELAY, or later when
 * the incoming slide is still invisible then (a fade through holds opacity 0 until the old slide is gone), so the
 * entrance plays where the audience sees it.
 */
function contentDelay(enter: readonly Keyframe[]): number {
  const at = offsets(enter);
  const hidden = enter.reduce((m, f, i) => (f.opacity === 0 ? Math.max(m, at[i]!) : m), 0);
  return Math.max(CONTENT_DELAY, hidden);
}

/** Every entrance of the deck (presets and vocabulary) with its duration by tempo. */
export function compiledEntrances(deck: Deck) {
  const { t, ms } = scaled(deck);
  const all: Record<string, EntranceSpec> = { ...ENTRANCES, ...deck.motion.vocabulary?.entrances };
  return Object.fromEntries(
    Object.entries(all).map(([k, e]) => [
      k,
      { keyframes: compileKeyframes(e.keyframes, e.easing), rest: restOf(e.keyframes), duration: ms(e.duration), easing: cssEasing(e.easing), stagger: e.stagger === undefined ? t.stagger : ms(e.stagger) },
    ]),
  );
}

export function compiledTransitions(deck: Deck) {
  const { ms } = scaled(deck);
  const all: Record<string, TransitionSpec> = { ...TRANSITIONS, ...deck.motion.vocabulary?.transitions };
  return Object.fromEntries(
    Object.entries(all).map(([k, s]) => [
      k,
      {
        duration: ms(s.duration),
        easing: cssEasing(s.easing),
        exit: compileKeyframes(s.exit ?? [], s.easing),
        enter: compileKeyframes(s.enter ?? [], s.easing),
        rest: restOf(s.exit ?? [], s.enter ?? []),
        over: s.over ?? "exit",
        shared: s.shared ?? false,
        contentDelay: contentDelay(s.enter ?? []),
      },
    ]),
  );
}

export type CompiledEntrance = ReturnType<typeof compiledEntrances>[string];
export type CompiledTransition = ReturnType<typeof compiledTransitions>[string];

/** What to measure in the browser and whom a finding belongs to (motionFindings). */
export interface MotionMeasureInput {
  intensity: Deck["motion"]["intensity"];
  usage: ReturnType<typeof motionUsage>;
}

/** Configuration of the player and measurement (JSON into the page). */
export function playerConfig(deck: Deck) {
  const { t, ms } = scaled(deck);
  return {
    title: deck.title,
    revision: deck.revision,
    locale: deck.brief.language,
    stagger: t.stagger,
    entrances: compiledEntrances(deck),
    transitions: compiledTransitions(deck),
    heroes: Object.fromEntries(Object.entries(HERO_MOTIONS).map(([k, h]) => [k, { duration: ms(h.duration), easing: cssEasing(h.easing) }])),
    easings: { "out-expo": cssEasing("out-expo") },
    measure: { intensity: deck.motion.intensity, usage: motionUsage(deck) } satisfies MotionMeasureInput,
    notes: deck.slides.map((s) => s.notes ?? ""),
  };
}
export type PlayerConfig = ReturnType<typeof playerConfig>;
