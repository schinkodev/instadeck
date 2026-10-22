/**
 * Column charts with a value scale: column (grouped series), stacked and waterfall (bridge).
 * Columns sit absolutely on a scale from the minimum to the maximum, so negative values work too. Zero is a strong
 * line, an axis with gridlines only on request (Tufte: labels at the columns are usually enough). d3-array gives nice ticks.
 *
 * The default HTML is the final state. Motion (chart-grow) grows from zero: positive columns up, negative down
 * (transform-origin on every column), see player.js.
 *
 * Colors by IBCS and the signal color principle: highlight = accent, the rest line. Waterfall: totals muted,
 * increases in the accent, decreases in the text color. Estimates hatched.
 */
import { nice, ticks } from "d3-array";
import { bestContrast, bridgeSteps, chartDecimals, type Block } from "@/lib/domain";
import { esc, formatNumber } from "../text";
import type { RenderContext } from "./blocks";

type Chart = Extract<Block, { type: "chart" }>;

interface Bar {
  ci: number;
  si: number;
  from: number;
  to: number;
  color: string;
  /** Value in the label (for a waterfall the change, not the position). */
  value: number;
  label: "outside" | "inside" | "none";
}

const pct = (v: number) => `${v.toFixed(2)}%`;

/** Series color, shared by every chart: with a highlight the accent and the line color, otherwise accent, second accent, muted. */
export function seriesColor(ctx: RenderContext, seriesIndex: number, categoryIndex: number, highlight: number | undefined): string {
  if (highlight !== undefined) return categoryIndex === highlight ? ctx.palette.accent : ctx.palette.line;
  return [ctx.palette.accent, ctx.palette.accent2, ctx.palette.muted][seriesIndex]!;
}

function bars(b: Chart, ctx: RenderContext): Bar[] {
  const p = ctx.palette;
  const out: Bar[] = [];
  if (b.kind === "waterfall") {
    const v = b.series[0]!.values;
    bridgeSteps(v).forEach(({ from, to, total }, ci) => {
      const x = v[ci]!;
      const color = b.highlight !== undefined ? (ci === b.highlight ? p.accent : p.line) : total ? p.muted : x >= 0 ? p.accent : p.fg;
      out.push({ ci, si: 0, from, to, color, value: x, label: "outside" });
    });
    return out;
  }
  if (b.kind === "stacked") {
    b.categories.forEach((_, ci) => {
      let at = 0;
      b.series.forEach((s, si) => {
        const x = s.values[ci]!;
        out.push({ ci, si, from: at, to: at + x, color: seriesColor(ctx, si, ci, undefined), value: x, label: "inside" });
        at += x;
      });
    });
    return out;
  }
  b.categories.forEach((_, ci) =>
    b.series.forEach((s, si) => {
      out.push({ ci, si, from: 0, to: s.values[ci]!, color: seriesColor(ctx, si, ci, b.highlight), value: s.values[ci]!, label: "outside" });
    }),
  );
  return out;
}

export function plotChart(b: Chart, ctx: RenderContext): string {
  const n = b.categories.length;
  const list = bars(b, ctx);
  const stackTotals = b.kind === "stacked" ? b.categories.map((_, ci) => b.series.reduce((a, s) => a + s.values[ci]!, 0)) : [];
  const values = [0, ...list.flatMap((x) => [x.from, x.to]), ...(b.reference ? [b.reference.value] : [])];
  let [lo, hi] = nice(Math.min(...values), Math.max(...values), 5);
  // Bridge: changes are often small against the totals and from zero they would be slivers. So the axis starts below the lowest
  // level of the bridge and the total columns carry a break mark (IBCS), so it is not hidden that they do not start at zero.
  let broken = false;
  if (b.kind === "waterfall") {
    // The reference line is a level too: a cut axis must still show it inside the plot.
    const levels = [...list.flatMap((x, i) => (i === 0 || i === list.length - 1 ? [x.to] : [x.from, x.to])), ...(b.reference ? [b.reference.value] : [])];
    const low = Math.min(...levels);
    const high = Math.max(...levels);
    if (low > 0 && high - low < low * 0.5) {
      [lo, hi] = nice(Math.max(0, low - (high - low) * 0.8), high, 5);
      broken = lo > 0;
    }
  }
  const span = hi - lo || 1;
  const y = (v: number) => ((v - lo) / span) * 100;
  const unit = b.unit ? esc(b.unit) : "";
  const decimals = chartDecimals(b);
  const fmt = (v: number, sign = false) => `${sign && v > 0 ? "+" : ""}${formatNumber(v, decimals, ctx.locale)}${unit}`;

  const slot = 100 / n;
  const group = slot * 0.72;
  const perSeries = b.kind === "column" ? b.series.length : 1;
  const width = group / perSeries;

  const grid = b.axis
    ? ticks(lo, hi, 5)
        .map((t) => `<i class="plot-grid" style="bottom:${pct(y(t))}"></i><span class="plot-tick" style="bottom:${pct(y(t))}">${fmt(t)}</span>`)
        .join("")
    : "";

  const barsHtml = list
    .map((x) => {
      const left = x.ci * slot + (slot - group) / 2 + (b.kind === "column" ? x.si * width : 0);
      const bottom = Math.max(0, y(Math.min(x.from, x.to)));
      const height = Math.min(y(Math.max(x.from, x.to)), 100) - bottom;
      const isTotal = b.kind === "waterfall" && (x.ci === 0 || x.ci === n - 1);
      const down = x.to < x.from;
      const estimate = b.estimate !== undefined && x.ci >= b.estimate;
      const fill = estimate ? `background:repeating-linear-gradient(135deg,${x.color} 0 5px,transparent 5px 10px);box-shadow:inset 0 0 0 2px ${x.color}` : `background:${x.color}`;
      const sign = b.kind === "waterfall" && x.ci > 0 && x.ci < n - 1;
      let label = "";
      if (x.label === "outside") label = `<span class="bar-value${down ? " is-below" : ""}">${fmt(x.value, sign)}</span>`;
      else if (x.label === "inside" && height > 7) label = `<span class="bar-inside" style="color:${bestContrast(x.color, [ctx.palette.fg, ctx.palette.bg])}">${fmt(x.value)}</span>`;
      const hl = b.highlight === x.ci ? " is-highlight" : "";
      return `<div class="plot-bar${down ? " is-down" : ""}${hl}${broken && isTotal ? " is-broken" : ""}" data-part="bar" style="left:${pct(left)};width:${pct(width)};bottom:${pct(bottom)};height:${pct(height)};${fill};transform-origin:${down ? "top" : "bottom"}">${label}</div>`;
    })
    .join("");

  const totals = stackTotals.map((t, ci) => `<span class="plot-total" style="left:${pct(ci * slot)};width:${pct(slot)};bottom:${pct(y(t))}">${fmt(t)}</span>`).join("");

  // Waterfall links: horizontal from the top of a column to the next, the reader sees where a change continues from.
  const links =
    b.kind === "waterfall"
      ? list
          .slice(0, -1)
          .map((x) => `<i class="plot-link" style="left:${pct(x.ci * slot + (slot - group) / 2 + group)};width:${pct(slot - group)};bottom:${pct(y(x.to))}"></i>`)
          .join("")
      : "";

  const reference = b.reference
    ? `<i class="plot-ref" style="bottom:${pct(y(b.reference.value))}"></i><span class="plot-ref-label" style="bottom:${pct(y(b.reference.value))}">${esc(b.reference.label)} ${fmt(b.reference.value)}</span>`
    : "";

  const zero = lo <= 0 ? `<i class="plot-zero" style="bottom:${pct(y(0))}"></i>` : `<i class="plot-zero"></i>`;
  const cats = b.categories
    .map((c, ci) => `<span class="${b.highlight === ci ? "is-highlight" : ""}${b.estimate !== undefined && ci >= b.estimate ? " is-estimate" : ""}" style="left:${pct(ci * slot)};width:${pct(slot)}">${esc(c)}</span>`)
    .join("");

  return `<div class="chart chart-plot chart-${b.kind}${b.axis ? " has-axis" : ""}${b.reference ? " has-ref" : ""}"><div class="plot">${grid}${zero}${links}${barsHtml}${totals}${reference}</div><div class="plot-cats">${cats}</div></div>`;
}
