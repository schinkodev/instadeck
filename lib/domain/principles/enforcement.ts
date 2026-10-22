/**
 * Enforcement layers of principles (V008). Every principle says where it is guarded, or what it lacks.
 *   1 schema    a wrong state cannot be written
 *   2 tokens    the model chooses the intent, the engine derives the numbers (or the renderer decides for it)
 *   3 lint      validation or browser measurement reports a violation (`by` is the rule id in findings)
 *   4 critique  only the model's judgement, no measurement
 * A principle without a layer 1 to 3 is a gap and must state `gap`: what should be measured.
 */
export interface Enforcement {
  layer: 1 | 2 | 3 | 4;
  by: string;
}

export interface Enforced {
  enforced: readonly Enforcement[];
  /** What the principle does not guard and should be measured. Required when there is no layer 1 to 3. */
  gap?: string;
}

export const LAYER_NAMES = { 1: "schema", 2: "tokens", 3: "lint", 4: "critique" } as const;

/** A principle is covered when the schema, tokens or a measurement guards it. Critique alone is only judgement. */
export const isCovered = (p: Enforced) => p.enforced.some((e) => e.layer <= 3);
