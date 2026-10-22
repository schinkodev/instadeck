// Layer: lib/state. Deck storage with revisions, the only write path. See docs/vision/V004-connector-and-local-server.md
export * from "./store";
export { applyOpsToDeck, type Applied, type OpContext } from "./ops";
export { sniff, dataUri, MAX_ASSET_BYTES, type AssetKind, type AssetMeta } from "./assets";
export { ExistsError, LocalFiles, S3Files, type Files, type PutOptions } from "./files";
