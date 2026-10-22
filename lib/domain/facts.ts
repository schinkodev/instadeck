/**
 * Fakta decku: jeden zdroj čísel. Model zapíše každé číslo od uživatele jako fakt se zdrojem, statistika
 * na fakt odkáže a odvozená čísla (změna, růst, CAGR, podíl) přepočítá engine. Model v aritmetice chybuje,
 * engine ne: hodnotu na slidu píše model, validace ji porovná s výpočtem (V008, integrita čísel).
 */
import { z } from "zod";

export const factSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(40).describe("Short id, e.g. arr-2024"),
  label: z.string().min(1).max(80).describe("What the number is, e.g. ARR, December 2024"),
  value: z.number(),
  unit: z.string().max(12).optional().describe("e.g. EUR M, %, customers"),
  period: z.string().max(24).optional().describe("e.g. 2024, Q3 2026, Dec 2024"),
  status: z.enum(["actual", "estimate"]).optional().describe("actual (default) or estimate, a plan or a forecast"),
  source: z.string().max(120).optional().describe("Where the number comes from: the user, a report, a filing"),
});
export type Fact = z.infer<typeof factSchema>;

export const DERIVE_OPS = ["change", "growth", "cagr", "share"] as const;

export const deriveSchema = z
  .strictObject({
    op: z.enum(DERIVE_OPS).describe("change = to minus from, growth = percent change, cagr = compound annual growth in percent over years, share = from as percent of to"),
    from: z.string().describe("Fact id"),
    to: z.string().describe("Fact id"),
    years: z.number().positive().optional().describe("Number of years, required for cagr"),
  })
  .describe("The number is computed from two facts. InstaDeck checks your value against the computation");
export type Derive = z.infer<typeof deriveSchema>;

/** Výsledek odvození, nebo důvod, proč nejde spočítat. */
export function derive(d: Derive, facts: readonly Fact[]): { value: number } | { error: string } {
  const from = facts.find((f) => f.id === d.from);
  const to = facts.find((f) => f.id === d.to);
  if (!from || !to) return { error: `fact ${!from ? d.from : d.to} does not exist` };
  switch (d.op) {
    case "change":
      return { value: to.value - from.value };
    case "growth":
      return from.value === 0 ? { error: "growth from zero is undefined" } : { value: (to.value / from.value - 1) * 100 };
    case "share":
      return to.value === 0 ? { error: "share of zero is undefined" } : { value: (from.value / to.value) * 100 };
    case "cagr":
      if (!d.years) return { error: "cagr needs years" };
      if (from.value <= 0 || to.value <= 0) return { error: "cagr needs positive values" };
      return { value: ((to.value / from.value) ** (1 / d.years) - 1) * 100 };
  }
}

export const FACTS_GUIDANCE =
  "Record every number the user gives as a fact (facts: value, unit, period, source, actual or estimate). A stat that shows a fact names it (fact), a stat that is computed from two facts names the computation (derive: change, growth, cagr, share) and InstaDeck checks your value. Never show a number that is not a fact or derived from facts. Show each fact where it proves the slide, not on every slide.";
