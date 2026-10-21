/**
 * Barvy z loga, deterministicky. SVG: barvy zapsané v souboru podle četnosti.
 * Rastr: pixely z prohlížeče (canvas), kvantizace do přihrádek a sloučení blízkých barev.
 * Co je primární barva značky, rozhoduje model, kód jen vrací kandidáty s podílem.
 */
import { luminance, mix, parseHex, toHex } from "@/lib/domain";
import { withPage } from "../browser";

export interface ColorCandidate {
  hex: string;
  /** Podíl 0 až 1 (u SVG podíl výskytů, u rastru podíl neprůhledných pixelů). */
  share: number;
  /** Téměř bílá, téměř černá nebo šedá: spíš pozadí nebo text než brand barva. */
  neutral: boolean;
}

const NAMED: Record<string, string> = { white: "#FFFFFF", black: "#000000" };

function normalize(raw: string): string | undefined {
  const v = raw.trim().toLowerCase();
  if (NAMED[v]) return NAMED[v];
  let m = /^#([0-9a-f]{3})$/.exec(v);
  if (m) return `#${m[1]!.split("").map((c) => c + c).join("")}`.toUpperCase();
  m = /^#([0-9a-f]{6})$/.exec(v);
  if (m) return `#${m[1]}`.toUpperCase();
  m = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/.exec(v);
  if (m) return toHex({ r: Number(m[1]), g: Number(m[2]), b: Number(m[3]) });
  return undefined;
}

export function isNeutral(hex: string): boolean {
  const { r, g, b } = parseHex(hex);
  const chroma = Math.max(r, g, b) - Math.min(r, g, b);
  const l = luminance(hex);
  return chroma < 24 || l > 0.92 || l < 0.008;
}

const distance = (a: string, b: string) => {
  const x = parseHex(a);
  const y = parseHex(b);
  return Math.hypot(x.r - y.r, x.g - y.g, x.b - y.b);
};

/** Sloučí barvy bližší než `minDistance` (vážený průměr podle podílu). */
function merge(colors: { hex: string; weight: number }[], minDistance: number, limit: number): ColorCandidate[] {
  const total = colors.reduce((a, c) => a + c.weight, 0);
  const groups: { hex: string; weight: number }[] = [];
  for (const c of [...colors].sort((a, b) => b.weight - a.weight)) {
    const g = groups.find((x) => distance(x.hex, c.hex) < minDistance);
    if (g) {
      g.hex = mix(g.hex, c.hex, c.weight / (g.weight + c.weight));
      g.weight += c.weight;
    } else groups.push({ ...c });
  }
  return groups
    .sort((a, b) => b.weight - a.weight)
    .slice(0, limit)
    .map((g) => ({ hex: g.hex, share: Math.round((g.weight / total) * 1000) / 1000, neutral: isNeutral(g.hex) }));
}

export function colorsFromSvg(svg: string, limit = 6): ColorCandidate[] {
  const counts = new Map<string, number>();
  const re = /(?:fill|stroke|stop-color|color)\s*[:=]\s*["']?\s*(#[0-9a-fA-F]{3,6}\b|rgba?\([^)]*\)|white|black)/g;
  for (const m of svg.matchAll(re)) {
    const hex = normalize(m[1]!);
    if (hex) counts.set(hex, (counts.get(hex) ?? 0) + 1);
  }
  return merge([...counts].map(([hex, weight]) => ({ hex, weight })), 18, limit);
}

/** Kvantizace RGBA pixelů: 4 bity na kanál, průhledné pixely se ignorují. */
export function quantize(rgba: Uint8Array | number[], limit = 6): ColorCandidate[] {
  const bins = new Map<number, { r: number; g: number; b: number; n: number }>();
  for (let i = 0; i + 3 < rgba.length; i += 4) {
    if (rgba[i + 3]! < 128) continue;
    const r = rgba[i]!;
    const g = rgba[i + 1]!;
    const b = rgba[i + 2]!;
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const bin = bins.get(key) ?? { r: 0, g: 0, b: 0, n: 0 };
    bin.r += r;
    bin.g += g;
    bin.b += b;
    bin.n += 1;
    bins.set(key, bin);
  }
  const colors = [...bins.values()].map((x) => ({ hex: toHex({ r: x.r / x.n, g: x.g / x.n, b: x.b / x.n }), weight: x.n }));
  return merge(colors, 40, limit);
}

export async function colorsFromRaster(dataUri: string, limit = 6): Promise<ColorCandidate[]> {
  const pixels = await withPage(`<!doctype html><img id="i" src="${dataUri}">`, (page) =>
    page.evaluate(async () => {
      const img = document.getElementById("i") as HTMLImageElement;
      await img.decode();
      const k = Math.min(1, 160 / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.max(1, Math.round(img.naturalWidth * k));
      const h = Math.max(1, Math.round(img.naturalHeight * k));
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);
      return Array.from(ctx.getImageData(0, 0, w, h).data);
    }),
  );
  return quantize(pixels, limit);
}
