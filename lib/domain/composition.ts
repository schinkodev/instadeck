/**
 * Composition of a slide (V009): the model decides the intent, the engine derives the grid.
 *
 * A layout keeps its zones and its purpose. A `composition` changes the geometry of its grid in a closed set of ways:
 *   axis      where the content sits: `left` (the default), `center`, or `asymmetric` (the content is pushed to the right
 *             and the left side stays empty on purpose)
 *   split     the ratio of the two columns of a two column layout
 *   dominant  the zone that leads: it gets the larger column
 *
 * No zod: the module is also bundled into the MCP App.
 */
import type { LayoutDef } from "./layouts";

export const COMPOSITION_AXES = ["left", "center", "asymmetric"] as const;
export type Axis = (typeof COMPOSITION_AXES)[number];

export const COMPOSITION_SPLITS = ["1:3", "1:2", "1:1", "2:1", "3:1"] as const;
export type Split = (typeof COMPOSITION_SPLITS)[number];

export interface Composition {
  axis?: Axis;
  split?: Split;
  dominant?: string;
}

/** The grid of a slide after its composition: what the renderer puts in grid-template-*. */
export interface ResolvedGrid {
  areas: string[];
  columns: string;
  rows: string;
  axis: Axis;
  dominant?: string;
}

/** Share of the empty lead track of an asymmetric slide, in fr against the content track. */
const ASYMMETRIC_LEAD = 0.4;
/** The split of an asymmetric two column slide when none is given (the content column leads). */
const ASYMMETRIC_SPLIT: Split = "1:2";

/** Tracks of a grid-template value. A track with a function (minmax(30%, 1fr)) has spaces inside, so split outside brackets. */
function tracks(value: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of value.trim()) {
    if (ch === "(") depth += 1;
    if (ch === ")") depth -= 1;
    if (ch === " " && depth === 0) {
      if (cur) out.push(cur);
      cur = "";
    } else cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}

const isFr = (track: string) => /^\d*\.?\d+fr$/.test(track);

/** A two column layout whose columns are plain fr tracks (headline-stat has an auto column and a full bleed layout has one image). */
export function isSplittable(layout: LayoutDef): boolean {
  const cols = tracks(layout.grid.columns);
  return !layout.bleed && cols.length === 2 && cols.every(isFr);
}

/** Dense layouts keep a left edge to read along (Müller-Brockmann), so their text is not centered. */
export function allowsCenter(layout: LayoutDef): boolean {
  return layout.density === "low" && tracks(layout.grid.columns).length === 1;
}

/** Column (0 or 1) that a zone occupies in a two column layout, or null when it spans both or is not there. */
function columnOf(layout: LayoutDef, zone: string): number | null {
  const found = new Set<number>();
  for (const row of layout.grid.areas) row.split(" ").forEach((name, i) => name === zone && found.add(i));
  return found.size === 1 ? [...found][0]! : null;
}

/** Why a composition cannot be applied to a layout, one sentence each. Empty when it can. */
export function compositionProblems(layout: LayoutDef, c: Composition): string[] {
  const out: string[] = [];
  const two = isSplittable(layout);
  if (c.split && !two) out.push(`split needs a two column layout (title-image, text-image, image-text, chart-insight), ${layout.id} has ${tracks(layout.grid.columns).length === 1 ? "one column" : "columns that cannot be split"}`);
  if (c.dominant) {
    if (!layout.zones.some((z) => z.name === c.dominant)) out.push(`dominant "${c.dominant}" is not a zone of ${layout.id}. Zones: ${layout.zones.map((z) => z.name).join(", ")}`);
    else if (!two) out.push(`dominant needs a two column layout, ${layout.id} has no columns to share`);
    else if (columnOf(layout, c.dominant) === null) out.push(`dominant "${c.dominant}" spans both columns of ${layout.id}. Pick a zone that sits in one column`);
  }
  if (c.axis === "center" && !allowsCenter(layout)) out.push(`axis center needs a one column layout with little content, ${layout.id} is ${tracks(layout.grid.columns).length === 1 ? layout.density : "two columns"}. Dense content keeps a left edge`);
  return out;
}

/** The ratio of a split as the two fr values, the larger one on the dominant side. */
function frOf(split: Split, dominantColumn: number | null): [number, number] {
  const [a, b] = split.split(":").map(Number) as [number, number];
  if (dominantColumn === null || a === b) return [a, b];
  const [big, small] = a > b ? [a, b] : [b, a];
  return dominantColumn === 0 ? [big, small] : [small, big];
}

/**
 * The grid of a slide. `c` is the composition the slide asks for and `defaults` the composition of its school: a default
 * applies only where the layout can take it, an explicit choice that cannot be applied is reported by compositionProblems.
 */
export function resolveGrid(layout: LayoutDef, c: Composition | undefined, defaults: Composition | undefined): ResolvedGrid {
  const want = c ?? {};
  const two = isSplittable(layout);
  // A school default of center applies only where center is allowed. An explicit choice is reported by compositionProblems.
  const fromSchool = defaults?.axis === "center" && !allowsCenter(layout) ? undefined : defaults?.axis;
  const axis: Axis = want.axis ?? fromSchool ?? "left";
  const split = want.split ?? (two ? defaults?.split : undefined);
  const dominant = want.dominant;
  let areas = [...layout.grid.areas];
  let columns = layout.grid.columns;
  if (two) {
    const lead = dominant ? columnOf(layout, dominant) : null;
    const given = split ?? (axis === "asymmetric" ? ASYMMETRIC_SPLIT : dominant ? ASYMMETRIC_SPLIT : undefined);
    if (given) columns = frOf(given, lead).map((n) => `${n}fr`).join(" ");
  } else if (axis === "asymmetric") {
    columns = `${ASYMMETRIC_LEAD}fr ${tracks(columns)[0]}`;
    areas = areas.map((row) => `. ${row}`);
  }
  return { areas, columns, rows: layout.grid.rows, axis, ...(dominant && { dominant }) };
}
