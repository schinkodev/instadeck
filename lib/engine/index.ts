// Layer: lib/engine. Deterministické renderování, validace a exporty, bez modelu. See docs/vision/V002-mcp-first.md
export { renderDeckHtml, renderDeckParts, HUD_HTML, type DeckParts, type RenderMode } from "./render/document";
export { MODE_CSS } from "./render/css";
export { PLAYER_JS } from "./render/player-source";
export type { AssetData } from "./render/blocks";
export { validateDeck, validateSlide, hasErrors, type Finding, type Severity, type AssetIndex } from "./validate/rules";
export { measureDeck, overflowFindings, exportPdf, exportPptx, snapshotDeck, renderPng, type OverflowMeasure } from "./export";
export { buildPptx } from "./pptx";
export { exportRequestSchema, slideSnapshotSchema, type SlideSnapshot, type SnapshotItem } from "./snapshot";
export { motionFindings, type MotionMeasureContext } from "./validate/motion";
export { playerConfig, sharedKeys, motionUsage, type PlayerConfig } from "./motion";
export { MEASURE_JS } from "./render/measure-source";
export { closeBrowser } from "./browser";
export { colorsFromSvg, colorsFromRaster, quantize, isNeutral, type ColorCandidate } from "./brand/extract";
export { slideSteps, blockSteps } from "./steps";
export { suggestBrandSystem, checkBrandKit, MOODS, MOOD_NAMES, type MoodName, type BrandSystemInput } from "./brand/system";
