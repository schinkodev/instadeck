/**
 * Sloupcové grafy se škálou hodnot: column (seskupené série), stacked a waterfall (bridge).
 * Sloupce leží absolutně na škále od minima k maximu, takže fungují i záporné hodnoty. Nula je výrazná
 * linka, osa s mřížkou jen na přání (Tufte: popisky u sloupců většinou stačí). Hezké dílky dává d3-array.
 *
 * Výchozí HTML je koncový stav. Pohyb (chart-grow) roste z nuly: kladné sloupce nahoru, záporné dolů
 * (transform-origin u každého sloupce), viz player.js.
 *
 * Barvy podle IBCS a principu signální barvy: zvýraznění = akcent, ostatní linka. Waterfall: součty tlumeně,
 * přírůstky akcentem, úbytky barvou textu. Odhad (estimate) šrafovaně.
 */
import { nice, ticks } from "d3-array";
import { bestContrast, type Block } from "@/lib/domain";
import { esc, formatNumber } from "../text";
import type { RenderContext } from "./blocks";

type Chart = Extract<Block, { type: "chart" }>;

interface Bar {
  ci: number;
  si: number;
  from: number;
  to: number;
  color: string;
  /** Hodnota v popisku (u waterfallu změna, ne pozice). */
  value: number;
  label: "outside" | "inside" | "none";
}

const pct = (v: number) => `${v.toFixed(2)}%`;

function bars(b: Chart, ctx: RenderContext): Bar[] {
  const p = ctx.palette;
  const out: Bar[] = [];
  if (b.kind === "waterfall") {
    const v = b.series[0]!.values;
    let running = 0;
    v.forEach((x, ci) => {
      const total = ci === 0 || ci === v.length - 1;
      const from = total ? 0 : running;
      const to = total ? x : running + x;
      running = to;
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
        out.push({ ci, si, from: at, to: at + x, color: [p.accent, p.accent2, p.muted][si]!, value: x, label: "inside" });
        at += x;
      });
    });
    return out;
  }
  b.categories.forEach((_, ci) =>
    b.series.forEach((s, si) => {
      const color = b.highlight !== undefined ? (ci === b.highlight ? p.accent : p.line) : [p.accent, p.accent2, p.muted][si]!;
      out.push({ ci, si, from: 0, to: s.values[ci]!, color, value: s.values[ci]!, label: "outside" });
    }),
  );
  return out;
}

export function plotChart(b: Chart, ctx: RenderContext): string {
  const n = b.categories.length;
  const list = bars(b, ctx);
  const stackTotals = b.kind === "stacked" ? b.categories.map((_, ci) => b.series.reduce((a, s) => a + s.values[ci]!, 0)) : [];
  const values = [0, ...list.flatMap((x) => [x.from, x.to]), ...(b.reference ? [b.reference.value] : [])];
  const [lo, hi] = nice(Math.min(...values), Math.max(...values), 5);
  const span = hi - lo || 1;
  const y = (v: number) => ((v - lo) / span) * 100;
  const unit = b.unit ? esc(b.unit) : "";
  const fmt = (v: number, sign = false) => `${sign && v > 0 ? "+" : ""}${formatNumber(v, Number.isInteger(v) ? 0 : 1, ctx.locale)}${unit}`;

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
      const bottom = y(Math.min(x.from, x.to));
      const height = Math.abs(y(x.to) - y(x.from));
      const down = x.to < x.from;
      const estimate = b.estimate !== undefined && x.ci >= b.estimate;
      const fill = estimate ? `background:repeating-linear-gradient(135deg,${x.color} 0 5px,transparent 5px 10px);box-shadow:inset 0 0 0 2px ${x.color}` : `background:${x.color}`;
      const sign = b.kind === "waterfall" && x.ci > 0 && x.ci < n - 1;
      let label = "";
      if (x.label === "outside") label = `<span class="bar-value${down ? " is-below" : ""}">${fmt(x.value, sign)}</span>`;
      else if (x.label === "inside" && height > 7) label = `<span class="bar-inside" style="color:${bestContrast(x.color, [ctx.palette.fg, ctx.palette.bg])}">${fmt(x.value)}</span>`;
      const hl = b.highlight === x.ci ? " is-highlight" : "";
      return `<div class="plot-bar${down ? " is-down" : ""}${hl}" data-part="bar" style="left:${pct(left)};width:${pct(width)};bottom:${pct(bottom)};height:${pct(height)};${fill};transform-origin:${down ? "top" : "bottom"}">${label}</div>`;
    })
    .join("");

  const totals = stackTotals.map((t, ci) => `<span class="plot-total" style="left:${pct(ci * slot)};width:${pct(slot)};bottom:${pct(y(t))}">${fmt(t)}</span>`).join("");

  // Spojnice waterfallu: vodorovně od vršku sloupce k dalšímu, čtenář vidí, odkud změna navazuje.
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

  const zero = `<i class="plot-zero" style="bottom:${pct(y(0))}"></i>`;
  const cats = b.categories
    .map((c, ci) => `<span class="${b.highlight === ci ? "is-highlight" : ""}${b.estimate !== undefined && ci >= b.estimate ? " is-estimate" : ""}" style="left:${pct(ci * slot)};width:${pct(slot)}">${esc(c)}</span>`)
    .join("");

  return `<div class="chart chart-plot chart-${b.kind}${b.axis ? " has-axis" : ""}"><div class="plot">${grid}${zero}${links}${barsHtml}${totals}${reference}</div><div class="plot-cats">${cats}</div></div>`;
}
