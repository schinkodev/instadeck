/**
 * Barvy: parsování hex, relativní jas a kontrast podle WCAG 2.x, míchání.
 * Čistá matematika, kterou používá doména (odvození tokenů) i engine (validace).
 */

export type Rgb = { r: number; g: number; b: number };

const HEX = /^#([0-9a-f]{6})$/i;

export function isHex(value: string): boolean {
  return HEX.test(value);
}

export function parseHex(hex: string): Rgb {
  const m = HEX.exec(hex);
  if (!m) throw new Error(`Invalid color "${hex}", expected #RRGGBB`);
  const n = parseInt(m[1]!, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function toHex({ r, g, b }: Rgb): string {
  const c = (v: number) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`.toUpperCase();
}

/** Relativní jas podle WCAG 2.x. */
export function luminance(hex: string): number {
  const { r, g, b } = parseHex(hex);
  const lin = (v: number) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** Kontrastní poměr 1 až 21. */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Lineární smíchání v sRGB: t = 0 vrací a, t = 1 vrací b. */
export function mix(a: string, b: string, t: number): string {
  const x = parseHex(a);
  const y = parseHex(b);
  return toHex({ r: x.r + (y.r - x.r) * t, g: x.g + (y.g - x.g) * t, b: x.b + (y.b - x.b) * t });
}

export function withAlpha(hex: string, alpha: number): string {
  const { r, g, b } = parseHex(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Ze dvou kandidátů ten s vyšším kontrastem vůči pozadí. */
export function bestContrast(background: string, candidates: readonly [string, string]): string {
  return contrastRatio(background, candidates[0]) >= contrastRatio(background, candidates[1]) ? candidates[0] : candidates[1];
}

/** Prahy WCAG: běžný text AA, velký text (od 24 px, nebo 18,66 px tučně) AA, AAA běžný text. */
export const CONTRAST = { text: 4.5, largeText: 3, enhanced: 7 } as const;

/** Přimíchává černou (na světlém pozadí) nebo bílou (na tmavém), dokud barva nemá požadovaný kontrast vůči pozadí. */
export function reachContrast(color: string, against: string, min: number): { hex: string; changed: boolean } {
  if (contrastRatio(color, against) >= min) return { hex: color.toUpperCase(), changed: false };
  const target = luminance(against) > 0.5 ? "#000000" : "#FFFFFF";
  for (let t = 0.02; t < 1; t += 0.02) {
    const c = mix(color, target, t).toUpperCase();
    if (contrastRatio(c, against) >= min) return { hex: c, changed: true };
  }
  return { hex: target, changed: true };
}
