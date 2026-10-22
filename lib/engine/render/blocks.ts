/**
 * Blocks to HTML. The default state of the HTML is the final state (everything revealed, numbers at their final value,
 * charts fully grown), so the same output serves as the static version for PDF and PNG.
 * The runtime adds animation by data attributes:
 *   data-step   reveal step of the element
 *   data-hero   hero motion (count-up, chart-grow, line-draw, donut-sweep, timeline-draw)
 *   data-part   parts of a hero motion (column, line, segment)
 *   data-shared element that glides to the same element of the next slide on a transition with `shared`
 */
import { chartDecimals, heroMotionOf, type Block, type Palette } from "@/lib/domain";
import { esc, formatNumber, inline } from "../text";
import { plotChart, seriesColor } from "./plot";

export interface AssetData {
  mime: string;
  /** data: URI (file, PDF) or URL (hosted connector, MCP App). */
  src: string;
}

export interface RenderContext {
  palette: Palette;
  assets: Record<string, AssetData>;
  locale: string;
  /** At most one block of a slide may have a hero motion, the order of zones decides (see slide.ts). */
  heroBlock: Block | undefined;
  /** Elements that may glide to the neighboring slide (sharedKeys in motion.ts). */
  shared: Map<Block, string>;
}

type StatItem = { value: number; decimals?: number; prefix?: string; suffix?: string; label: string; detail?: string };

const stepAttr = (n: number | undefined) => (n ? ` data-step="${n}"` : "");

function asset(ctx: RenderContext, id: string): AssetData {
  const a = ctx.assets[id];
  if (!a) throw new Error(`Asset ${id} is not available to the renderer`);
  return a;
}

function hero(block: Block, ctx: RenderContext): string {
  const h = heroMotionOf(block);
  return h && ctx.heroBlock === block ? ` data-hero="${h}"` : "";
}

function itemStep(block: Block & { build?: "together" | "items" }, i: number): string {
  if (block.build !== "items") return "";
  return stepAttr((block.step ?? 0) + i);
}

function statHtml(s: StatItem, ctx: RenderContext, counting: boolean): string {
  const decimals = s.decimals ?? 0;
  const value = formatNumber(s.value, decimals, ctx.locale);
  const count = counting ? ` data-part="count" data-value="${s.value}" data-decimals="${decimals}"` : "";
  return `<div class="stat">
<div class="stat-value">${s.prefix ? `<span class="affix">${esc(s.prefix)}</span>` : ""}<span class="num"${count}>${value}</span>${s.suffix ? `<span class="affix">${esc(s.suffix)}</span>` : ""}</div>
<div class="stat-label">${inline(s.label, ctx.locale)}</div>${s.detail ? `\n<div class="stat-detail">${inline(s.detail, ctx.locale)}</div>` : ""}
</div>`;
}

/** Horizontal bars on one scale from the smallest to the largest value with zero in it: negative bars grow left from zero. */
function barChart(b: Extract<Block, { type: "chart" }>, ctx: RenderContext): string {
  const all = b.series.flatMap((s) => s.values);
  const lo = Math.min(0, ...all);
  const span = Math.max(0, ...all) - lo || 1;
  const zero = (-lo / span) * 100;
  const unit = b.unit ? esc(b.unit) : "";
  const decimals = chartDecimals(b);
  const fmt = (v: number) => `${formatNumber(v, decimals, ctx.locale)}${unit}`;
  const groups = b.categories
    .map((cat, ci) => {
      const bars = b.series
        .map((s, si) => {
          const v = s.values[ci]!;
          const width = (Math.abs(v) / span) * 100;
          const left = v < 0 ? zero - width : zero;
          return `<div class="bar-wrap"><div class="bar${v < 0 ? " is-negative" : ""}" data-part="bar" style="margin-left:${left.toFixed(2)}%;width:${width.toFixed(2)}%;background:${seriesColor(ctx, si, ci, b.highlight)}"><span class="bar-value">${fmt(v)}</span></div></div>`;
        })
        .join("");
      const hl = b.highlight === ci ? " is-highlight" : "";
      return `<div class="bar-group${hl}"><div class="bars"><i class="bar-zero" style="left:${zero.toFixed(2)}%"></i>${bars}</div><div class="bar-label">${esc(cat)}</div></div>`;
    })
    .join("");
  return `<div class="chart chart-bar${lo < 0 ? " has-negative" : ""}">${groups}</div>`;
}

function lineChart(b: Extract<Block, { type: "chart" }>, ctx: RenderContext): string {
  const W = 1000;
  const H = 400;
  const all = b.series.flatMap((s) => s.values);
  const lo = Math.min(0, ...all);
  const span = Math.max(0, ...all) - lo || 1;
  const n = b.categories.length;
  const x = (i: number) => (i / (n - 1)) * W;
  const y = (v: number) => H - ((v - lo) / span) * H;
  const pct = (v: number, of: number) => `${((v / of) * 100).toFixed(2)}%`;
  const color = (si: number) => (b.highlight !== undefined ? (si === 0 ? ctx.palette.accent : ctx.palette.line) : seriesColor(ctx, si, 0, undefined));
  const paths = b.series
    .map((s, si) => {
      const d = s.values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
      return `<path data-part="line" d="${d}" fill="none" stroke="${color(si)}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" pathLength="1"/>`;
    })
    .join("");
  // Dots as HTML: the SVG stretches without keeping its aspect ratio and circles would deform.
  const dots = b.series
    .flatMap((s, si) =>
      s.values.map(
        (v, i) => `<i class="line-dot${b.highlight === i && si === 0 ? " is-highlight" : ""}" data-part="dot" style="left:${pct(x(i), W)};top:${pct(y(v), H)};background:${color(si)}"></i>`,
      ),
    )
    .join("");
  const last = b.series[0]!.values.at(-1)!;
  const unit = b.unit ? esc(b.unit) : "";
  const labels = b.categories.map((c, i) => `<span style="left:${pct(x(i), W)}">${esc(c)}</span>`).join("");
  return `<div class="chart chart-line">
<div class="line-plot"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${paths}</svg>${dots}
<div class="line-end" style="top:${pct(y(last), H)}">${formatNumber(last, chartDecimals(b), ctx.locale)}${unit}</div></div>
<div class="line-labels">${labels}</div>
</div>`;
}

function donutChart(b: Extract<Block, { type: "chart" }>, ctx: RenderContext): string {
  const values = b.series[0]!.values;
  const total = values.reduce((a, v) => a + v, 0);
  const R = 80;
  const C = 2 * Math.PI * R;
  let offset = 0;
  const colors = values.map((_, i) =>
    b.highlight !== undefined ? (i === b.highlight ? ctx.palette.accent : ctx.palette.line) : [ctx.palette.accent, ctx.palette.accent2, ctx.palette.muted, ctx.palette.line, ctx.palette.fg, ctx.palette.surface][i]!,
  );
  const segs = values
    .map((v, i) => {
      const len = total === 0 ? 0 : (v / total) * C;
      const seg = `<circle data-part="seg" r="${R}" cx="100" cy="100" fill="none" stroke="${colors[i]}" stroke-width="34" stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}" data-len="${len.toFixed(2)}" data-offset="${(-offset).toFixed(2)}"/>`;
      offset += len;
      return seg;
    })
    .join("");
  const unit = b.unit ? esc(b.unit) : "";
  const legend = b.categories
    .map((c, i) => `<li${b.highlight === i ? ' class="is-highlight"' : ""}><i style="background:${colors[i]}"></i><span>${esc(c)}</span><b>${formatNumber(values[i]!, chartDecimals(b), ctx.locale)}${unit}</b></li>`)
    .join("");
  return `<div class="chart chart-donut"><svg viewBox="0 0 200 200"><g transform="rotate(-90 100 100)">${segs}</g></svg><ul class="legend">${legend}</ul></div>`;
}

function chart(b: Extract<Block, { type: "chart" }>, ctx: RenderContext): string {
  const body = b.kind === "line" ? lineChart(b, ctx) : b.kind === "donut" ? donutChart(b, ctx) : b.kind === "bar" ? barChart(b, ctx) : plotChart(b, ctx);
  const legend =
    b.series.length > 1 && b.kind !== "donut"
      ? `<ul class="series-legend">${b.series.map((s, si) => `<li><i style="background:${seriesColor(ctx, si, 0, undefined)}"></i>${esc(s.name)}</li>`).join("")}</ul>`
      : "";
  return `<figure class="block block-chart"${stepAttr(b.step)}${hero(b, ctx)}>${legend}${body}${b.caption ? `<figcaption>${inline(b.caption, ctx.locale)}</figcaption>` : ""}</figure>`;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function renderBlock(block: Block, ctx: RenderContext): string {
  const shared = ctx.shared.get(block);
  const s = stepAttr(block.step) + (shared ? ` data-shared="${esc(shared)}"` : "");
  switch (block.type) {
    case "heading": {
      const tag = block.level === "h2" ? "h3" : "h2";
      return `<${tag} class="block heading heading-${block.level}"${s}>${inline(block.text, ctx.locale)}</${tag}>`;
    }
    case "text":
      return `<p class="block text text-${block.size}"${s}>${inline(block.text, ctx.locale)}</p>`;
    case "bullets":
      return `<ul class="block bullets"${s}>${block.items.map((t, i) => `<li${itemStep(block, i)}>${inline(t, ctx.locale)}</li>`).join("")}</ul>`;
    case "stat":
      return `<div class="block block-stat"${s}${hero(block, ctx)}>${statHtml(block, ctx, ctx.heroBlock === block)}</div>`;
    case "stats":
      return `<div class="block block-stats" style="--n:${block.items.length}"${s}${hero(block, ctx)}>${block.items
        .map((it, i) => `<div class="stats-item"${itemStep(block, i)}>${statHtml(it, ctx, ctx.heroBlock === block)}</div>`)
        .join("")}</div>`;
    case "chart":
      return chart(block, ctx);
    case "image": {
      const a = asset(ctx, block.assetId);
      const pos = block.focus ? `object-position:${(block.focus.x * 100).toFixed(1)}% ${(block.focus.y * 100).toFixed(1)}%;` : "";
      return `<div class="block block-image fit-${block.fit}"${s}><img src="${a.src}" data-asset="${esc(block.assetId)}" alt="${esc(block.alt)}" style="${pos}"/></div>`;
    }
    case "logo":
      return `<div class="block block-logo"${s}><img src="${asset(ctx, block.assetId).src}" data-asset="${esc(block.assetId)}" alt="${esc(block.alt)}"/></div>`;
    case "logos":
      return `<div class="block block-logos" style="--cols:${block.items.length <= 4 ? block.items.length : Math.ceil(block.items.length / 2)}"${s}>${block.items
        .map((l) => `<div class="logos-item"><img src="${asset(ctx, l.assetId).src}" data-asset="${esc(l.assetId)}" alt="${esc(l.alt)}"/></div>`)
        .join("")}</div>`;
    case "quote":
      return `<figure class="block block-quote"${s}><blockquote>${inline(block.text, ctx.locale)}</blockquote><figcaption><b>${esc(block.author)}</b>${block.role ? `<span>${esc(block.role)}</span>` : ""}</figcaption></figure>`;
    case "timeline":
      return `<div class="block block-timeline" style="--n:${block.items.length}"${s}${hero(block, ctx)}><div class="timeline-axis" data-part="axis"></div>${block.items
        .map(
          (it, i) =>
            `<div class="timeline-item${block.current === i ? " is-current" : ""}${block.current !== undefined && i < block.current ? " is-past" : ""}"${itemStep(block, i)} data-part="milestone"><i class="timeline-dot"></i><div class="timeline-label">${esc(it.label)}</div><div class="timeline-title">${inline(it.title, ctx.locale)}</div>${it.text ? `<div class="timeline-text">${inline(it.text, ctx.locale)}</div>` : ""}</div>`,
        )
        .join("")}</div>`;
    case "team":
      return `<div class="block block-team" style="--cols:${block.people.length <= 4 ? block.people.length : 3}"${s}>${block.people
        .map((p) => {
          const photo = p.photoAssetId ? `<img src="${asset(ctx, p.photoAssetId).src}" data-asset="${esc(p.photoAssetId)}" alt="${esc(p.name)}"/>` : `<span>${esc(initials(p.name))}</span>`;
          return `<div class="person"><div class="person-photo">${photo}</div><div class="person-name">${esc(p.name)}</div><div class="person-role">${esc(p.role)}</div>${p.bio ? `<div class="person-bio">${inline(p.bio, ctx.locale)}</div>` : ""}</div>`;
        })
        .join("")}</div>`;
    case "comparison":
      return `<div class="block block-comparison" style="--n:${block.columns.length}"${s}>${block.columns
        .map(
          (c, i) =>
            `<div class="comparison-col${c.highlight ? " is-highlight" : ""}"${itemStep(block, i)}><div class="comparison-title">${esc(c.title)}</div><ul>${c.items.map((t) => `<li>${inline(t, ctx.locale)}</li>`).join("")}</ul></div>`,
        )
        .join("")}</div>`;
    case "cards":
      return `<div class="block block-cards" style="--n:${block.items.length}"${s}>${block.items
        .map((c, i) => `<div class="card"${itemStep(block, i)}><div class="card-title">${inline(c.title, ctx.locale)}</div><div class="card-text">${inline(c.text, ctx.locale)}</div></div>`)
        .join("")}</div>`;
    case "table": {
      const hc = (i: number) => (block.highlightColumn === i ? ' class="is-highlight"' : "");
      return `<div class="block block-table"${s}><table><thead><tr>${block.columns.map((c, i) => `<th${hc(i)}>${esc(c)}</th>`).join("")}</tr></thead><tbody>${block.rows
        .map((r) => `<tr>${r.map((cell, i) => `<td${hc(i)}>${inline(cell, ctx.locale)}</td>`).join("")}</tr>`)
        .join("")}</tbody></table></div>`;
    }
    case "cta":
      return `<div class="block block-cta"${s}><div class="cta-text">${inline(block.text, ctx.locale)}</div>${block.detail ? `<div class="cta-detail">${inline(block.detail, ctx.locale)}</div>` : ""}</div>`;
  }
}

