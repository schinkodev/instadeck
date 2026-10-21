/**
 * Vrstvy vynucení principů (V008). Každý princip říká, kde se hlídá, nebo co mu chybí.
 *   1 schéma    špatný stav nejde zapsat
 *   2 tokeny    model volí záměr, engine odvodí čísla (nebo renderer rozhodne za něj)
 *   3 lint      validace nebo měření v prohlížeči hlásí porušení (`by` je id pravidla ve findings)
 *   4 kritika   jen úsudek modelu, bez měření
 * Princip bez vrstvy 1 až 3 je mezera a musí říct `gap`: co by se mělo změřit.
 */
export interface Enforcement {
  layer: 1 | 2 | 3 | 4;
  by: string;
}

export interface Enforced {
  enforced: readonly Enforcement[];
  /** Co princip nehlídá a mělo by se to změřit. Povinné, pokud není žádná vrstva 1 až 3. */
  gap?: string;
}

export const LAYER_NAMES = { 1: "schema", 2: "tokens", 3: "lint", 4: "critique" } as const;

/** Princip je pokrytý, když ho hlídá schéma, tokeny nebo měření. Samotná kritika je jen úsudek. */
export const isCovered = (p: Enforced) => p.enforced.some((e) => e.layer <= 3);
