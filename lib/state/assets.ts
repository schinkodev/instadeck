/**
 * Asset type by the file content (magic bytes), not by the extension or the client's claim.
 */

export type AssetKind = "image" | "font";

export interface AssetMeta {
  id: string;
  name: string;
  mime: string;
  kind: AssetKind;
  bytes: number;
  createdAt: string;
}

export const MAX_ASSET_BYTES = 15 * 1024 * 1024;

const starts = (b: Uint8Array, sig: number[], offset = 0) => sig.every((x, i) => b[offset + i] === x);
const ascii = (b: Uint8Array, s: string, offset = 0) => starts(b, [...s].map((c) => c.charCodeAt(0)), offset);

export function sniff(bytes: Uint8Array): { mime: string; kind: AssetKind } {
  if (starts(bytes, [0x89, 0x50, 0x4e, 0x47])) return { mime: "image/png", kind: "image" };
  if (starts(bytes, [0xff, 0xd8, 0xff])) return { mime: "image/jpeg", kind: "image" };
  if (ascii(bytes, "GIF8")) return { mime: "image/gif", kind: "image" };
  if (ascii(bytes, "RIFF") && ascii(bytes, "WEBP", 8)) return { mime: "image/webp", kind: "image" };
  if (ascii(bytes, "wOF2")) return { mime: "font/woff2", kind: "font" };
  if (ascii(bytes, "wOFF")) return { mime: "font/woff", kind: "font" };
  if (ascii(bytes, "OTTO")) return { mime: "font/otf", kind: "font" };
  if (starts(bytes, [0x00, 0x01, 0x00, 0x00]) || ascii(bytes, "true")) return { mime: "font/ttf", kind: "font" };
  const head = new TextDecoder().decode(bytes.subarray(0, 2048)).trimStart();
  if (/^(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*(<!DOCTYPE svg[^>]*>\s*)?<svg[\s>]/i.test(head)) return { mime: "image/svg+xml", kind: "image" };
  throw new Error("Unsupported file. Images: PNG, JPEG, WebP, GIF, SVG. Fonts: WOFF2, WOFF, TTF, OTF");
}

export function dataUri(mime: string, bytes: Uint8Array): string {
  return `data:${mime};base64,${Buffer.from(bytes).toString("base64")}`;
}
