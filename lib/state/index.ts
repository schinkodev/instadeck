// Layer: lib/state. Úložiště decků s revizemi, jediná cesta zápisu. See docs/vision/V004-konektor-a-lokalni-server.md
export * from "./store";
export { applyOpsToDeck, type Applied, type OpContext } from "./ops";
export { sniff, dataUri, MAX_ASSET_BYTES, type AssetKind, type AssetMeta } from "./assets";
export { ExistsError, LocalFiles, S3Files, type Files, type PutOptions } from "./files";
