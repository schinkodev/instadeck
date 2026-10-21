/**
 * Prahy pohybu odvozené z vnímání (viz principles/motion.ts). Bez zod: modul se bundluje i do MCP App,
 * kde se měří pohyb v prohlížeči uživatele.
 *
 * Intenzita je deklarace modelu, jak moc se deck smí hýbat. Měření v prohlížeči porovná skutečnou
 * energii pohybu (dráha, měřítko, rozmazání, rotace, překmit) s deklarací.
 */

export const INTENSITIES = ["still", "subtle", "expressive", "kinetic"] as const;
export type Intensity = (typeof INTENSITIES)[number];

export interface IntensityDef {
  purpose: string;
  /** Největší posun obsahu při vstupu v px slidu (1920x1080). */
  travelPx: number;
  /** Největší odchylka měřítka od 1 při vstupu. */
  scale: number;
  blurPx: number;
  rotateDeg: number;
  /** Největší posun slidu při přechodu (sdílené prvky se nepočítají, ty nesou kontinuitu). */
  transitionTravelPx: number;
  /** Smí pohyb přestřelit klidový stav (pružina, bounce). */
  overshoot: boolean;
  /** Smí deck animovat čísla, grafy a osy. */
  heroes: boolean;
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
    heroes: false,
  },
  subtle: {
    purpose: "Short moves that guide the eye and settle fast. Investors, enterprise buyers and most business decks.",
    travelPx: 48,
    scale: 0.05,
    blurPx: 6,
    rotateDeg: 0,
    transitionTravelPx: 120,
    overshoot: false,
    heroes: true,
  },
  expressive: {
    purpose: "Bigger moves, depth, slides that travel, elements that fly between slides. Product launches, vision, keynotes.",
    travelPx: 240,
    scale: 0.15,
    blurPx: 16,
    rotateDeg: 4,
    transitionTravelPx: 1920,
    overshoot: false,
    heroes: true,
  },
  kinetic: {
    purpose: "Energetic and springy, motion is part of the brand. Consumer apps, events, creative work. Still one focal motion at a time.",
    travelPx: 1080,
    scale: 0.5,
    blurPx: 32,
    rotateDeg: 20,
    transitionTravelPx: 3840,
    overshoot: true,
    heroes: true,
  },
};

/** Prahy vnímání a pozornosti, platí pro každou intenzitu. */
export const MOTION_LIMITS = {
  /** Kratší pohyb oko nevidí jako pohyb, ale jako skok (cyklus vnímání kolem 100 ms). 0 ms je střih. */
  minMs: 120,
  /** Delší vstup jednoho prvku nechá publikum čekat. */
  maxEntranceMs: 1200,
  /** Delší přechod zdržuje řečníka. */
  maxTransitionMs: 1000,
  /** Všechen obsah vstupu slidu stojí a jde číst do této doby. */
  readableMs: 2400,
  /** Na kolik slidů připadá jedna výjimka z pohybového jazyka (jiný vstup nebo přechod). */
  slidesPerException: 5,
  /** Kliknutí na odkrytí obsahu jednoho slidu. */
  stepsPerSlide: 4,
  /** Hero pohyby (čísla, grafy, osy) na slide. */
  heroesPerSlide: 1,
  /** Překmit: posun za klidový stav v px, nebo měřítko za 1. */
  overshootPx: 2,
  overshootScale: 0.005,
  /** Kolik pohybu zbývá v polovině času. Víc znamená, že prvek do klidu zrychluje místo zpomalení. */
  remainingAtHalf: 0.6,
} as const;

/** Podíl trvání přechodu, po kterém začne vstup obsahu nového slidu. */
export const CONTENT_DELAY = 0.45;

/**
 * Změřený pohyb jedné definice (measure.js, vzorkování animace na sondě v prohlížeči).
 * part: entrance (vstup obsahu), enter (přicházející slide), exit (odcházející slide).
 */
export interface MotionSample {
  name: string;
  part: "entrance" | "enter" | "exit";
  travelPx: number;
  scale: number;
  blurPx: number;
  rotateDeg: number;
  overshoot: boolean;
  /** Podíl pohybu, který zbývá v polovině času (0 až 1). Jen u entrance a enter. */
  remainingAtHalf: number;
}
