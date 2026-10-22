/**
 * Signature primitives (V009, step 4): the one device a deck repeats on every slide, drawn in the slide margin.
 *
 * The grid sits inset by the margins (--mx, --my), so a primitive centered in a margin never touches the content: the
 * folio is one small line, the band takes a quarter of the margin, a rule or the frame sits on the middle of it.
 * Only plain boxes, borders and one line of text: the PowerPoint snapshot reads the same DOM, so the signature exports
 * as shapes and text with no special case.
 */
import { SIGNATURE_BAND_STRENGTH, SIGNATURE_LINE_PX, mix, type Palette, type Signature } from "@/lib/domain";

export function renderSignature(signature: Signature, index: number, palette: Palette, accentSlide: boolean): string {
  const wrap = (inner: string) => `<div class="signature signature-${signature.kind}" aria-hidden="true">${inner}</div>`;
  switch (signature.kind) {
    case "none":
      return "";
    case "rule": {
      const w = SIGNATURE_LINE_PX[signature.weight ?? "hairline"];
      const place =
        signature.edge === "left"
          ? `left:calc(var(--mx) / 2 - ${w / 2}px);top:var(--my);bottom:var(--my);width:${w}px`
          : `left:var(--mx);right:var(--mx);${signature.edge}:calc(var(--my) / 2 - ${w / 2}px);height:${w}px`;
      return wrap(`<div style="${place};background:${palette.fg}"></div>`);
    }
    case "frame": {
      const w = SIGNATURE_LINE_PX[signature.weight ?? "hairline"];
      return wrap(`<div style="inset:calc(var(--my) / 2) calc(var(--mx) / 2);border:${w}px solid ${palette.fg}"></div>`);
    }
    case "folio": {
      // The cover carries the title, not a page number.
      if (index === 0) return "";
      const [v, h] = (signature.corner ?? "bottom-right").split("-") as ["top" | "bottom", "left" | "right"];
      const label = String(index + 1).padStart(2, "0");
      return wrap(`<div class="signature-folio-text" style="${h}:var(--mx);${v}:calc(var(--my) / 2);transform:translateY(${v === "top" ? "-50%" : "50%"});color:${palette.muted}">${label}</div>`);
    }
    case "band": {
      const tint = mix(palette.bg, accentSlide ? palette.fg : palette.accent, SIGNATURE_BAND_STRENGTH);
      const place = signature.edge === "left" ? "left:0;top:0;bottom:0;width:calc(var(--mx) / 4)" : `left:0;right:0;${signature.edge}:0;height:calc(var(--my) / 4)`;
      return wrap(`<div style="${place};background:${tint}"></div>`);
    }
  }
}
