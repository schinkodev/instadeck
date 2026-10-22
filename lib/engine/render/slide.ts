/**
 * Slide to HTML: the domain layout as a CSS grid, blocks in zones, tone and motion as data attributes
 * (slide entrance, optionally a zone entrance, the transition into the slide).
 */
import { HERO_PRIORITY, getLayout, resolveGrid, schoolComposition, type Deck, type Slide, type Tokens } from "@/lib/domain";
import { esc } from "../text";
import { sharedKeys, slideEntrance, slideTransition } from "../motion";
import { renderBrandVisual } from "./brand-visual";
import { renderBlock, type AssetData, type RenderContext } from "./blocks";

export interface SlideRenderInput {
  deck: Deck;
  tokens: Tokens;
  assets: Record<string, AssetData>;
}

/** At most one block per slide has a hero motion: by type priority (HERO_PRIORITY), on a tie the first in zone order. */
export function heroBlockOf(slide: Slide, deck: Deck) {
  if (!deck.motion.heroes) return undefined;
  const layout = getLayout(slide.layout);
  if (!layout) throw new Error(`Unknown layout ${slide.layout}`);
  const inOrder = layout.zones.flatMap((z) => (slide.blocks[z.name] ? [slide.blocks[z.name]!] : []));
  for (const type of HERO_PRIORITY) {
    const b = inOrder.find((x) => x.type === type);
    if (b) return b;
  }
  return undefined;
}

export function renderSlide(slide: Slide, index: number, input: SlideRenderInput): string {
  const layout = getLayout(slide.layout);
  if (!layout) throw new Error(`Unknown layout ${slide.layout}`);
  const tone = slide.tone ?? "default";
  const ctx: RenderContext = {
    palette: input.tokens.palette[tone],
    assets: input.assets,
    locale: input.deck.brief.language,
    heroBlock: heroBlockOf(slide, input.deck),
    shared: sharedKeys(slide),
  };
  const geometry = resolveGrid(layout, slide.composition, schoolComposition(input.deck.brief.concept?.school));
  const entrance = slideEntrance(slide, input.deck);
  const transition = slideTransition(slide, input.deck);

  let bleed = "";
  const zones = layout.zones
    .map((zone) => {
      const block = slide.blocks[zone.name];
      if (!block) return "";
      const html = renderBlock(block, ctx);
      const own = slide.motion?.zones?.[zone.name];
      const enter = own ? ` data-entrance="${esc(own)}"` : "";
      if (layout.bleed?.zone === zone.name) {
        bleed = `<div class="bleed"${enter}>${html}<div class="scrim"></div></div>`;
        return "";
      }
      const figure = `${zone.figure ? " data-figure" : ""}${geometry.dominant === zone.name ? " data-dominant" : ""}`;
      return `<div class="zone zone-${zone.name} align-${zone.align ?? "start"}" style="grid-area:${zone.name}" data-zone="${zone.name}"${figure}${enter}>${html}</div>`;
    })
    .join("");

  const visual = slide.background ? renderBrandVisual(slide.background, input.deck, slide, index, ctx.palette) : "";
  const grid = `grid-template-areas:${geometry.areas.map((a) => `'${a}'`).join(" ")};grid-template-columns:${geometry.columns};grid-template-rows:${geometry.rows}`;
  return `<section class="slide tone-${tone} layout-${layout.id} axis-${geometry.axis}${bleed ? " has-bleed" : ""}${visual ? " has-brand-visual" : ""}" id="slide-${index + 1}" data-slide-id="${esc(slide.id)}" data-index="${index}" data-entrance="${esc(entrance)}" data-transition="${esc(transition)}">
${visual}${bleed}<div class="grid" style="${grid}">${zones}</div>
</section>`;
}
