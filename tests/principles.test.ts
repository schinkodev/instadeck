import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DESIGN_PRINCIPLES, STORYTELLING_PRINCIPLES, contrastRatio, isCovered } from "@/lib/domain";
import { MOOD_NAMES, suggestBrandSystem } from "@/lib/engine";
import { auditMarkdown } from "@/lib/tools/audit";

const rulesSource = readFileSync(new URL("../lib/engine/validate/rules.ts", import.meta.url), "utf8");
const motionSource = readFileSync(new URL("../lib/engine/validate/motion.ts", import.meta.url), "utf8");
const all = [...DESIGN_PRINCIPLES, ...STORYTELLING_PRINCIPLES];

describe("principles audit", () => {
  it("every principle names where it is enforced or what it lacks", () => {
    for (const p of all) {
      expect(p.enforced.length > 0 || p.gap, p.id).toBeTruthy();
      if (!p.enforced.length) expect(p.gap, `${p.id} is enforced by nothing, it must say what to measure`).toBeTruthy();
      if (!isCovered(p)) expect(p.enforced.every((e) => e.layer === 4), p.id).toBe(true);
    }
  });

  it("a lint layer points at a rule that the validation emits", () => {
    for (const p of all) {
      for (const e of p.enforced.filter((x) => x.layer === 3)) {
        const rule = e.by.split(":")[0]!.trim();
        expect(rulesSource + motionSource, `${p.id}: rule ${rule}`).toContain(`"${rule}"`);
      }
    }
  });

  it("docs/principles-audit.md is generated from the domain (run npm run gen)", () => {
    expect(readFileSync(new URL("../docs/principles-audit.md", import.meta.url), "utf8")).toBe(auditMarkdown());
  });
});

describe("brand systems", () => {
  it("every mood gives secondary text a readable contrast on cards", () => {
    for (const mood of MOOD_NAMES) {
      const { palette } = suggestBrandSystem({ primary: "#2F5BFF", mood });
      expect(contrastRatio(palette.muted, palette.surface), mood).toBeGreaterThanOrEqual(3);
    }
  });
});
