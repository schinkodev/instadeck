/**
 * Motion thresholds derived from perception (see principles/motion.ts). No zod: the module is also bundled into the MCP App,
 * where motion is measured in the user's browser.
 *
 * Intensity is the model's declaration of how much the deck may move. Measurement in the browser compares the real
 * energy of the motion (travel, scale, blur, rotation, overshoot) with the declaration.
 *
 * Intensity covers decoration only: entrances and transitions. Data motion (numbers that count, charts that grow) is
 * information, not decoration, so the deck declares it separately (DeckMotion.heroes) at any intensity.
 */

export const INTENSITIES = ["still", "subtle", "expressive", "kinetic"] as const;
export type Intensity = (typeof INTENSITIES)[number];

export interface IntensityDef {
  purpose: string;
  /** Largest content offset on entrance, in slide px (1920x1080). */
  travelPx: number;
  /** Largest deviation of scale from 1 on entrance. */
  scale: number;
  blurPx: number;
  rotateDeg: number;
  /** Largest slide offset during a transition (shared elements do not count, they carry continuity). */
  transitionTravelPx: number;
  /** Whether motion may overshoot the resting state (spring, bounce). */
  overshoot: boolean;
}

export const INTENSITY: Record<Intensity, IntensityDef> = {
  still: {
    purpose: "Nothing moves. Content appears with a quiet fade or a cut. Board updates, reports, legal, minimalist professional decks where the content is the event.",
    travelPx: 0,
    scale: 0,
    blurPx: 0,
    rotateDeg: 0,
    transitionTravelPx: 0,
    overshoot: false,
  },
  subtle: {
    purpose: "Short moves that guide the eye and settle fast. Investors, enterprise buyers and most business decks.",
    travelPx: 48,
    scale: 0.05,
    blurPx: 6,
    rotateDeg: 0,
    transitionTravelPx: 120,
    overshoot: false,
  },
  expressive: {
    purpose: "Bigger moves, depth, slides that travel, elements that fly between slides. Product launches, vision, keynotes.",
    travelPx: 240,
    scale: 0.15,
    blurPx: 16,
    rotateDeg: 4,
    transitionTravelPx: 1920,
    overshoot: false,
  },
  kinetic: {
    purpose: "Energetic and springy, motion is part of the brand. Consumer apps, events, creative work. Still one focal motion at a time.",
    travelPx: 1080,
    scale: 0.5,
    blurPx: 32,
    rotateDeg: 20,
    transitionTravelPx: 3840,
    overshoot: true,
  },
};

/** Thresholds of perception and attention, valid for every intensity. */
export const MOTION_LIMITS = {
  /** The eye sees a shorter motion not as motion but as a jump (perception cycle around 100 ms). 0 ms is a cut. */
  minMs: 120,
  /** A longer entrance of one element keeps the audience waiting. */
  maxEntranceMs: 1200,
  /** A longer transition holds up the presenter. */
  maxTransitionMs: 1000,
  /** All content of a slide entrance is still and readable by this time. */
  readableMs: 2400,
  /** How many slides one exception from the motion language may cover (a different entrance or transition). */
  slidesPerException: 5,
  /** Clicks to reveal the content of one slide. */
  stepsPerSlide: 4,
  /** Hero motions (numbers, charts, timelines) per slide. */
  heroesPerSlide: 1,
  /** Overshoot: offset past the resting state in px, or scale past 1. */
  overshootPx: 2,
  overshootScale: 0.005,
  /** How much motion remains at half time. More means the element speeds up into rest instead of slowing down. */
  remainingAtHalf: 0.6,
  /**
   * How long the text of two slides may be legible at once during a transition. Two texts in one place compete for the
   * same figure (figure and ground, Gestalt) and read as a glitch, so it may last no longer than a jump the eye does
   * not perceive as motion (minMs).
   */
  overlapMs: 120,
} as const;

/** Share of the transition duration after which the content entrance of the new slide starts. */
export const CONTENT_DELAY = 0.45;

/**
 * Measured motion of one definition (measure.js, sampling the animation on a probe in the browser).
 * part: entrance (content entrance), enter (incoming slide), exit (outgoing slide).
 */
export interface MotionSample {
  name: string;
  part: "entrance" | "enter" | "exit";
  travelPx: number;
  scale: number;
  blurPx: number;
  rotateDeg: number;
  overshoot: boolean;
  /** Share of the motion remaining at half time (0 to 1), half of the active time. Only for entrance and enter. */
  remainingAtHalf: number;
  /** How long the element really moves, from its first change to its rest, in ms. Only for entrance and enter. */
  activeMs: number;
}

/** Measured transition (measure.js): how long the text of both slides is legible at once, in ms. */
export interface MotionOverlap {
  name: string;
  overlapMs: number;
}
