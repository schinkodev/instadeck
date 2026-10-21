/**
 * Slide do HTML: layout z domény jako CSS mřížka, bloky v zónách, tón a pohyb jako data atributy
 * (vstup slidu, případně vstup zóny, přechod do slidu).
 */
import { HERO_PRIORITY, getLayout, type Deck, type Slide, type Tokens } from "@/lib/domain";
import { esc } from "../text";
import { sharedKeys, slideEntrance, slideTransition } from "../motion";
import { renderBlock, type AssetData, type RenderContext } from "./blocks";

export interface SlideRenderInput {
  deck: Deck;
  tokens: Tokens;
  assets: Record<string, AssetData>;
}

/** Hero pohyb má nejvýše jeden blok na slide: podle priority typu (HERO_PRIORITY), při shodě první v pořadí zón. */
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
      return `<div class="zone zone-${zone.name} align-${zone.align ?? "start"}" style="grid-area:${zone.name}" data-zone="${zone.name}"${enter}>${html}</div>`;
    })
    .join("");

  const grid = `grid-template-areas:${layout.grid.areas.map((a) => `'${a}'`).join(" ")};grid-template-columns:${layout.grid.columns};grid-template-rows:${layout.grid.rows}`;
  return `<section class="slide tone-${tone} layout-${layout.id}${bleed ? " has-bleed" : ""}" id="slide-${index + 1}" data-slide-id="${esc(slide.id)}" data-index="${index}" data-entrance="${esc(entrance)}" data-transition="${esc(transition)}">
${bleed}<div class="grid" style="${grid}">${zones}</div>
</section>`;
}
