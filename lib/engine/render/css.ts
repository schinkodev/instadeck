/**
 * Deck CSS from tokens. Every size, gap and color comes from tokens (--* variables),
 * block rules have no ad hoc values except fine optical corrections.
 */
import { findGoogleFont, type FontRef, type Palette, type Tokens, type Tone } from "@/lib/domain";

function familyCss(f: FontRef): string {
  const generic = f.source === "google" ? ({ sans: "sans-serif", serif: "serif", display: "sans-serif", mono: "monospace" } as const)[findGoogleFont(f.family)!.category] : "sans-serif";
  return `"${f.family}", ${generic}`;
}

function toneVars(p: Palette): string {
  return `--bg:${p.bg};--fg:${p.fg};--accent:${p.accent};--accent2:${p.accent2};--muted:${p.muted};--surface:${p.surface};--line:${p.line};`;
}

export function deckCss(t: Tokens): string {
  const s = t.size;
  const tones = (Object.keys(t.palette) as Tone[]).map((tone) => `.tone-${tone}{${toneVars(t.palette[tone])}}`).join("\n");
  const card =
    t.cards === "filled"
      ? "background:var(--surface);padding:var(--sp-lg);border-radius:var(--radius);"
      : t.cards === "outline"
        ? "border:2px solid var(--line);padding:var(--sp-lg);border-radius:var(--radius);"
        : "border-top:2px solid var(--fg);padding-top:var(--sp-md);";
  return `:root{
--deck-bg:${t.palette.default.bg};
--font-heading:${familyCss(t.fonts.heading)};--font-body:${familyCss(t.fonts.body)};
--fs-display:${s.display}px;--fs-h1:${s.h1}px;--fs-h2:${s.h2}px;--fs-h3:${s.h3}px;--fs-lead:${s.lead}px;--fs-body:${s.body}px;--fs-small:${s.small}px;--fs-caption:${s.caption}px;--fs-stat:${s.stat}px;
--lh-heading:${t.lineHeight.heading};--lh-body:${t.lineHeight.body};
--hw:${t.heading.weight};--ht:${t.heading.tracking}em;--hcase:${t.heading.case === "upper" ? "uppercase" : "none"};
--sp-xs:${t.space.xs}px;--sp-sm:${t.space.sm}px;--sp-md:${t.space.md}px;--sp-lg:${t.space.lg}px;--sp-xl:${t.space.xl}px;--sp-xxl:${t.space.xxl}px;
--mx:${t.margin.x}px;--my:${t.margin.y}px;--radius:${t.radius}px;
}
${tones}
*{box-sizing:border-box}
html,body{margin:0;padding:0}
body{-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
.slide{position:absolute;inset:0;width:1920px;height:1080px;overflow:hidden;background:var(--bg);color:var(--fg);font-family:var(--font-body);font-size:var(--fs-body);line-height:var(--lh-body)}
.grid{position:absolute;inset:var(--my) var(--mx);display:grid;column-gap:var(--sp-xl);row-gap:var(--sp-md)}
.zone{display:flex;flex-direction:column;min-width:0;min-height:0}
.align-start{justify-content:flex-start}.align-center{justify-content:center}.align-end{justify-content:flex-end}
.heading{margin:0;font-family:var(--font-heading);font-weight:var(--hw);letter-spacing:var(--ht);line-height:var(--lh-heading);text-transform:var(--hcase);text-wrap:balance}
.layout-points .zone-body,.layout-cards .zone-cards,.layout-comparison .zone-comparison,.layout-timeline .zone-timeline,.layout-team .zone-team,.layout-table .zone-table{padding-top:var(--sp-lg)}
.layout-points .bullets{font-size:var(--fs-lead);max-width:36em}
.heading-display{font-size:var(--fs-display);max-width:15ch}
.heading-h1{font-size:var(--fs-h1);max-width:26ch}
.heading-h2{font-size:var(--fs-h2);max-width:30ch}
.hl{font-style:normal;color:var(--accent)}
.text{margin:0;max-width:36em;text-wrap:pretty}
.text-lead{font-size:var(--fs-lead);color:var(--muted);max-width:30em}
.text-small{font-size:var(--fs-small);color:var(--muted)}
.bullets{margin:0;padding:0;list-style:none;max-width:44em}
.bullets li{padding:var(--sp-sm) 0;border-top:1px solid var(--line);text-wrap:pretty}
.bullets li:last-child{border-bottom:1px solid var(--line)}
.stat-value{font-family:var(--font-heading);font-weight:var(--hw);font-size:var(--fs-stat);line-height:.92;letter-spacing:-0.03em;color:var(--accent);font-variant-numeric:tabular-nums;white-space:nowrap}
.stat-value .affix{font-size:.62em;margin:0 .04em}
.stat-label{margin-top:var(--sp-sm);font-size:var(--fs-lead);line-height:1.25;max-width:18em}
.stat-detail{margin-top:var(--sp-xs);font-size:var(--fs-small);color:var(--muted);max-width:24em}
.block-stats{display:grid;grid-template-columns:repeat(var(--n),minmax(0,1fr));column-gap:var(--sp-xl)}
.block-stats .stat-value{font-size:calc(var(--fs-stat) * .6)}
.block-stats .stats-item{border-top:2px solid var(--line);padding-top:var(--sp-md)}
.block-chart{margin:0;flex:1;display:flex;flex-direction:column;min-height:0}
.block-chart figcaption{margin-top:var(--sp-sm);font-size:var(--fs-caption);color:var(--muted)}
.chart{flex:1;min-height:0}
.series-legend{display:flex;gap:var(--sp-md);margin:0 0 var(--sp-md);padding:0;list-style:none;font-size:var(--fs-small);color:var(--muted)}
.series-legend i,.legend i{display:inline-block;width:14px;height:14px;border-radius:3px;margin-right:10px;vertical-align:-1px}
.chart-column{display:flex;align-items:stretch;gap:var(--sp-md);padding-top:calc(var(--fs-small) * 2.4)}
.chart-column .bar-group{flex:1;display:flex;flex-direction:column;min-width:0}
.chart-column .bars{flex:1;display:flex;align-items:flex-end;gap:8px;border-bottom:2px solid var(--line)}
.chart-column .bar-wrap{flex:1;height:100%;display:flex;align-items:flex-end}
.chart-column .bar{width:100%;position:relative;border-radius:min(var(--radius),10px) min(var(--radius),10px) 0 0;transform-origin:bottom}
.chart-column .bar-value{position:absolute;bottom:100%;left:50%;transform:translateX(-50%);padding-bottom:10px;font-size:var(--fs-small);font-weight:600;white-space:nowrap;font-variant-numeric:tabular-nums}
.bar-label{font-size:var(--fs-small);color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.chart-column .bar-label{padding-top:var(--sp-sm);text-align:center}
.is-highlight .bar-label{color:var(--fg);font-weight:600}
.chart-bar{display:flex;flex-direction:column;justify-content:center;gap:var(--sp-sm);padding-right:calc(var(--fs-small) * 5)}
.chart-bar .bar-group{display:flex;flex-direction:row-reverse;align-items:center;gap:var(--sp-md)}
.chart-bar .bar-label{width:26%;text-align:right}
.chart-bar .bars{flex:1;display:flex;flex-direction:column;gap:6px;border-left:2px solid var(--line)}
.chart-bar .bar{height:calc(var(--fs-small) * 1.6);position:relative;border-radius:0 min(var(--radius),10px) min(var(--radius),10px) 0;transform-origin:left}
.chart-bar .bar-value{position:absolute;left:100%;top:50%;transform:translateY(-50%);padding-left:12px;font-size:var(--fs-small);font-weight:600;white-space:nowrap}
.chart-line{display:flex;flex-direction:column;padding:var(--fs-lead) calc(var(--fs-lead) * 4) 0 calc(var(--fs-small) * 2)}
.line-plot{position:relative;flex:1;min-height:0;border-bottom:2px solid var(--line)}
.line-plot svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.line-dot{position:absolute;width:16px;height:16px;margin:-8px 0 0 -8px;border-radius:50%}
.line-dot.is-highlight{width:24px;height:24px;margin:-12px 0 0 -12px;box-shadow:0 0 0 6px var(--bg)}
.line-end{position:absolute;left:100%;transform:translate(24px,-50%);font-family:var(--font-heading);font-weight:var(--hw);font-size:var(--fs-lead);color:var(--accent);white-space:nowrap}
.line-labels{position:relative;height:calc(var(--sp-sm) + var(--fs-small) * 1.5)}
.line-labels span{position:absolute;top:var(--sp-sm);line-height:1.5;transform:translateX(-50%);font-size:var(--fs-small);color:var(--muted);white-space:nowrap}
.chart-donut{display:flex;align-items:center;gap:var(--sp-xl)}
.chart-donut svg{height:100%;max-height:620px;aspect-ratio:1}
.legend{margin:0;padding:0;list-style:none;display:grid;gap:var(--sp-sm);font-size:var(--fs-body)}
.legend li{display:grid;grid-template-columns:auto 1fr auto;align-items:center;column-gap:var(--sp-md)}
.legend b{font-variant-numeric:tabular-nums}
.legend .is-highlight{font-weight:700}
.legend .is-highlight b{color:var(--accent)}
.block-image{flex:1;min-height:0;height:100%;border-radius:var(--radius);overflow:hidden}
.block-image img{display:block;width:100%;height:100%}
.fit-cover img{object-fit:cover}.fit-contain img{object-fit:contain}
.block-logo img{display:block;height:72px;max-width:420px;object-fit:contain;object-position:left center}
.block-logos{display:grid;grid-template-columns:repeat(var(--cols),minmax(0,1fr));gap:var(--sp-md)}
.logos-item{display:flex;align-items:center;justify-content:center;height:144px;border-radius:var(--radius);background:var(--surface)}
.logos-item img{max-height:64px;max-width:70%;object-fit:contain;filter:grayscale(1);opacity:.8}
.block-quote{margin:0}
.block-quote blockquote{margin:0;font-family:var(--font-heading);font-weight:500;font-size:var(--fs-h2);line-height:1.18;letter-spacing:-0.01em;text-wrap:balance;text-indent:-.42em}
.block-quote blockquote::before{content:"\\201C";color:var(--accent)}
.block-quote blockquote::after{content:"\\201D";color:var(--accent)}
.block-quote figcaption{margin-top:var(--sp-lg);font-size:var(--fs-body)}
.block-quote figcaption span{display:block;color:var(--muted);font-size:var(--fs-small)}
.block-timeline{position:relative;display:grid;grid-template-columns:repeat(var(--n),minmax(0,1fr));column-gap:var(--sp-md);padding-top:64px}
.timeline-axis{position:absolute;top:20px;left:0;right:0;height:2px;background:var(--line);transform-origin:left}
.timeline-item{position:relative}
.timeline-dot{position:absolute;top:-55px;left:0;width:24px;height:24px;border-radius:50%;background:var(--bg);border:3px solid var(--line)}
.timeline-item.is-past .timeline-dot{background:var(--line)}
.timeline-item.is-current .timeline-dot{background:var(--accent);border-color:var(--accent);box-shadow:0 0 0 8px var(--bg)}
.timeline-label{font-size:var(--fs-small);font-weight:600;color:var(--muted);font-variant-numeric:tabular-nums}
.is-current .timeline-label{color:var(--accent)}
.timeline-title{margin-top:var(--sp-xs);font-family:var(--font-heading);font-weight:var(--hw);font-size:var(--fs-h3);line-height:1.15}
.timeline-text{margin-top:var(--sp-xs);font-size:var(--fs-small);color:var(--muted)}
.block-team{display:grid;grid-template-columns:repeat(var(--cols),minmax(0,1fr));gap:var(--sp-lg) var(--sp-md)}
.person-photo{width:168px;height:168px;border-radius:50%;overflow:hidden;background:var(--surface);display:flex;align-items:center;justify-content:center;font-family:var(--font-heading);font-weight:var(--hw);font-size:var(--fs-h2);color:var(--muted)}
.person-photo img{width:100%;height:100%;object-fit:cover}
.person-name{margin-top:var(--sp-md);font-family:var(--font-heading);font-weight:var(--hw);font-size:var(--fs-h3);line-height:1.15}
.person-role{color:var(--accent);font-size:var(--fs-small);font-weight:600;margin-top:4px}
.person-bio{color:var(--muted);font-size:var(--fs-small);margin-top:var(--sp-xs);max-width:20em}
.block-comparison{display:grid;grid-template-columns:repeat(var(--n),minmax(0,1fr));gap:var(--sp-md);align-items:stretch}
.comparison-col{${card}}
.comparison-col.is-highlight{background:var(--fg);color:var(--bg);border-color:var(--fg)}
.comparison-col.is-highlight .comparison-title{color:var(--accent)}
.comparison-title{font-family:var(--font-heading);font-weight:var(--hw);font-size:var(--fs-h3);margin-bottom:var(--sp-sm)}
.comparison-col ul{margin:0;padding:0;list-style:none}
.comparison-col li{padding:var(--sp-xs) 0;border-top:1px solid color-mix(in srgb, currentColor 18%, transparent);font-size:var(--fs-body)}
.block-cards{display:grid;grid-template-columns:repeat(var(--n),minmax(0,1fr));gap:var(--sp-md);align-items:stretch}
.card{${card}}
.card-title{font-family:var(--font-heading);font-weight:var(--hw);font-size:var(--fs-h3);line-height:1.15;text-wrap:balance}
.card-text{margin-top:var(--sp-sm);color:var(--muted);text-wrap:pretty}
.block-table table{width:100%;border-collapse:collapse;font-size:var(--fs-body)}
.block-table th{text-align:left;font-size:var(--fs-small);font-weight:600;color:var(--muted);padding:0 var(--sp-sm) var(--sp-sm) 0;border-bottom:2px solid var(--fg)}
.block-table td{padding:var(--sp-sm) var(--sp-sm) var(--sp-sm) 0;border-bottom:1px solid var(--line);font-variant-numeric:tabular-nums}
.block-table .is-highlight{color:var(--accent);font-weight:700}
.cta-text{font-family:var(--font-heading);font-weight:var(--hw);font-size:var(--fs-h3);color:var(--accent);line-height:var(--lh-heading);letter-spacing:var(--ht);max-width:28ch;text-wrap:balance}
.layout-headline-stat .zone-stat{max-width:15em;padding-top:var(--sp-lg)}
.layout-headline-stat .zone-support{padding-top:var(--sp-lg)}
/* Closing: one dominant element. A display heading is the callback and the ask supports it; an h1 or h2 heading is a
   label: it steps down to h2 and the ask becomes the figure of the slide (peak and end, Kahneman), at least three steps
   apart on any scale. */
.layout-closing:has(.zone-title .heading-h1, .zone-title .heading-h2) .zone-title .heading{font-size:var(--fs-h2)}
.layout-closing:has(.zone-title .heading-h1, .zone-title .heading-h2) .cta-text{font-size:var(--fs-display);max-width:20ch}
.cta-detail{margin-top:var(--sp-md);font-size:var(--fs-lead);color:var(--muted)}
.bleed{position:absolute;inset:0}
.bleed .block-image{position:absolute;inset:0;border-radius:0}
.scrim{position:absolute;inset:0;background:linear-gradient(90deg,rgba(0,0,0,.74) 0%,rgba(0,0,0,.4) 50%,rgba(0,0,0,0) 82%)}
.has-bleed .grid{color:#FFFFFF}
.has-bleed .text{color:rgba(255,255,255,.86)}
`;
}

/** Display mode: presentation (one slide across the whole window) or static pages (PDF, PNG, viewing). */
/** Player rules: slide visibility, hidden steps, the notes panel. They apply in the presentation and in the chat. The stage carries the deck background, so a fade through passes the deck color, not the dark window around it. */
const PLAYER_CSS = `.stage{background:var(--deck-bg)}.slide{visibility:hidden}.slide.is-active,.slide.is-leaving{visibility:visible}.slide.is-leaving{z-index:1}.slide.is-over{z-index:2}
.pending{opacity:0}
.hud{position:absolute;left:0;right:0;bottom:0;z-index:2;display:none;gap:24px;align-items:flex-start;padding:16px 24px;background:rgba(11,11,12,.94);color:#E8E8EA;font:15px/1.5 system-ui,sans-serif;max-height:32%;overflow:auto}
.show-notes .hud{display:flex}
.hud-count{font-variant-numeric:tabular-nums;color:#9A9AA2;white-space:nowrap}
.hud-notes{white-space:pre-wrap}
.hud-keys{margin-left:auto;color:#9A9AA2;white-space:nowrap}
.cursor-hidden{cursor:none}
@media (prefers-reduced-motion: reduce){.pending{opacity:1}}
.controls{position:absolute;left:50%;bottom:20px;z-index:3;display:flex;align-items:center;gap:2px;padding:5px;border-radius:999px;background:rgba(17,17,20,.86);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);box-shadow:0 8px 32px rgba(0,0,0,.28);transform:translate(-50%,8px);opacity:0;pointer-events:none;transition:opacity .2s,transform .2s;font:500 13px/1 system-ui,sans-serif;color:#E8E8EA;cursor:default}
.show-controls .controls,.controls.is-open,.controls:focus-within{opacity:1;transform:translate(-50%,0);pointer-events:auto}
.show-notes .controls{bottom:auto;top:20px}
.ctl{display:flex;align-items:center;justify-content:center;width:36px;height:36px;padding:0;border:0;border-radius:999px;background:transparent;color:inherit;cursor:pointer}
.ctl:hover,.ctl:focus-visible,.is-open .ctl-download{background:rgba(255,255,255,.14);outline:none}
.ctl svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
.ctl-count{min-width:64px;text-align:center;font-variant-numeric:tabular-nums;color:#C9C9CF}
.ctl-sep{width:1px;height:20px;margin:0 6px;background:rgba(255,255,255,.18)}
.ctl-menu{position:absolute;right:0;bottom:calc(100% + 8px);display:none;min-width:240px;padding:6px;border-radius:14px;background:rgba(17,17,20,.94);box-shadow:0 8px 32px rgba(0,0,0,.32)}
.show-notes .ctl-menu{bottom:auto;top:calc(100% + 8px)}
.is-open .ctl-menu{display:block}
.ctl-menu button{display:block;width:100%;padding:10px 12px;border:0;border-radius:9px;background:transparent;color:#E8E8EA;text-align:left;cursor:pointer;font:inherit}
.ctl-menu button:hover,.ctl-menu button:focus-visible{background:rgba(255,255,255,.12);outline:none}
.ctl-menu b{display:block;font-weight:600}
.ctl-menu span{display:block;margin-top:4px;font-weight:400;font-size:12px;color:#9A9AA2;line-height:1.35}
.overview{position:absolute;inset:0;z-index:4;overflow:auto;padding:48px 40px;background:rgba(11,11,12,.97);cursor:default}
.overview-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:28px 24px;max-width:1600px;margin:0 auto}
.thumb{padding:0;border:0;background:transparent;color:#9A9AA2;text-align:left;cursor:pointer;font:500 12px system-ui,sans-serif}
.thumb .snap{border-radius:6px;outline:2px solid transparent;outline-offset:3px;transition:outline-color .15s}
.thumb:hover .snap,.thumb:focus-visible .snap{outline-color:rgba(255,255,255,.45)}
.thumb:focus-visible{outline:none}
.thumb.is-current .snap{outline-color:#FFFFFF}
.thumb.is-current{color:#FFFFFF}
.thumb-n{display:block;margin-top:10px;font-variant-numeric:tabular-nums}
.snap{position:relative;width:100%;aspect-ratio:16/9;overflow:hidden;background:#000}
.snap .is-snapshot{visibility:visible!important;position:absolute;left:0;top:0;transform:scale(var(--snap-scale,.15));transform-origin:0 0;pointer-events:none}
body.presenter{margin:0;height:100vh;display:flex;flex-direction:column;overflow:hidden;background:#0B0B0C;color:#E8E8EA;font:15px/1.5 system-ui,sans-serif}
.p-top{display:flex;justify-content:space-between;align-items:baseline;padding:14px 24px;color:#9A9AA2;font-variant-numeric:tabular-nums}
.p-time{font-size:30px;font-weight:600;color:#FFFFFF}
.p-main{flex:1;display:grid;grid-template-columns:minmax(0,1.7fr) minmax(0,1fr);gap:24px;padding:0 24px 24px;min-height:0}
.p-now{align-self:start}
.p-now .snap,.p-next .snap{border-radius:6px}
.p-side{display:flex;flex-direction:column;gap:10px;min-height:0}
.p-label{font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#9A9AA2}
.p-next{color:#9A9AA2}
.p-notes{flex:1;overflow:auto;font-size:21px;line-height:1.5;white-space:pre-wrap;color:#FFFFFF}
.ask{position:absolute;left:50%;bottom:76px;z-index:4;width:min(560px,calc(100% - 32px));transform:translateX(-50%);padding:14px;border-radius:16px;background:rgba(17,17,20,.94);box-shadow:0 8px 32px rgba(0,0,0,.32);color:#E8E8EA;font:14px/1.4 system-ui,sans-serif;cursor:default}
.ask label{display:block;margin-bottom:8px;font-weight:600}
.ask textarea{display:block;width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid rgba(255,255,255,.18);border-radius:10px;background:rgba(255,255,255,.06);color:#FFFFFF;font:inherit;resize:none}
.ask textarea:focus{outline:none;border-color:rgba(255,255,255,.5)}
.ask-row{display:flex;justify-content:flex-end;gap:8px;margin-top:10px}
.ask-row button{height:32px;padding:0 14px;border:0;border-radius:999px;background:#FFFFFF;color:#111114;font:600 13px system-ui,sans-serif;cursor:pointer}
.ask-row .ask-cancel{background:transparent;color:#C9C9CF}
.snap-export{position:fixed;left:-40000px;top:0;width:1920px;height:1080px;pointer-events:none}
.snap-export .is-snapshot{visibility:visible!important;left:0;top:0}
@media print{.controls,.overview,.snap-export,.ask{display:none!important}}`;

/**
 * Display modes:
 *   present  presentation across the whole window (standalone deck.html)
 *   embed    a 16:9 .embed container inside another page (MCP App in the chat), .embed.is-fullscreen fills the screen
 *   static   all slides one below another in their final state (PDF, PNG, measurement)
 */
export const MODE_CSS = {
  present: `body{background:#0B0B0C;overflow:hidden;height:100vh;position:relative}
.stage{position:fixed;left:50%;top:50%;width:1920px;height:1080px;transform:translate(-50%,-50%) scale(var(--scale,1));transform-origin:center}
${PLAYER_CSS}
.present .hud,.present .controls,.present .overview{position:fixed}
@page{size:1920px 1080px;margin:0}
@media print{body{background:none;overflow:visible;height:auto}.stage{position:static;transform:none;width:auto;height:auto}.slide{position:relative;visibility:visible!important;opacity:1!important;transform:none!important;break-after:page}.pending{opacity:1!important}.hud{display:none!important}}`,
  embed: `.embed{position:relative;width:100%;aspect-ratio:16/9;overflow:hidden;background:#0B0B0C}
.embed.is-fullscreen{aspect-ratio:auto;height:100vh}
.embed .stage{position:absolute;left:50%;top:50%;width:1920px;height:1080px;transform:translate(-50%,-50%) scale(var(--scale,1));transform-origin:center}
${PLAYER_CSS}`,
  static: `body{background:#E9E9EC}
.stage{display:flex;flex-direction:column;align-items:center;gap:40px;padding:40px 0}
.slide{position:relative;flex:none}
@page{size:1920px 1080px;margin:0}
@media print{body{background:none}.stage{display:block;padding:0}.slide{break-after:page}}`,
} as const;
