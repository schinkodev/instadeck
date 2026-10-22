import { describe, expect, it } from "vitest";
import type { Deck, Slide } from "@/lib/domain";
import { deckMotionSchema, keyframeSchema } from "@/lib/domain";
import { blockSteps, colorsFromSvg, hasErrors, isNeutral, motionFindings, playerConfig, quantize, renderDeckHtml, slideSteps, validateDeck, type Finding } from "@/lib/engine";
import { LOGO_SVG, SAMPLE_ASSET_INDEX, SAMPLE_ASSETS, sampleDeck } from "./fixtures/sample-deck";

const rules = (f: Finding[], severity?: Finding["severity"]) => f.filter((x) => !severity || x.severity === severity).map((x) => x.rule);

function withSlide(patch: Partial<Slide>, at = 2): Deck {
  const d = sampleDeck();
  d.slides[at] = { ...d.slides[at]!, ...patch };
  return d;
}

describe("render", () => {
  it("renders every slide and the player only in present mode", () => {
    const deck = sampleDeck();
    const present = renderDeckHtml(deck, SAMPLE_ASSETS, "present");
    const stat = renderDeckHtml(deck, SAMPLE_ASSETS, "static");
    expect(present.match(/<section class="slide/g)).toHaveLength(deck.slides.length);
    expect(present).toContain('id="deck-config"');
    expect(stat).not.toContain("<script");
    expect(present).toContain("fonts.googleapis.com/css2?family=Manrope:wght@500;700&family=Inter:wght@400;600;700");
  });

  it("escapes user text and highlights marked words", () => {
    const deck = withSlide({ blocks: { title: { type: "heading", level: "h1", text: "<script>alert(1)</script> ==fast==" }, stat: { type: "stat", value: 1, label: "x" } }, layout: "headline-stat" });
    const html = renderDeckHtml(deck, SAMPLE_ASSETS, "static");
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt; <em class=\"hl\">fast</em>");
  });

  it("keeps notes from closing the config script", () => {
    const deck = withSlide({ notes: "</script><b>x" });
    const html = renderDeckHtml(deck, SAMPLE_ASSETS, "present");
    expect(html).not.toContain("</script><b>x");
  });

  it("gives the hero motion to one block per slide, by priority", () => {
    const html = renderDeckHtml(sampleDeck(), SAMPLE_ASSETS, "present");
    const slide6 = html.split('<section class="slide')[6]!; // chart-insight: stat (insight) a graf
    expect(slide6.match(/data-hero=/g)).toHaveLength(1);
    expect(slide6).toContain('data-hero="chart-grow"');
    const off = sampleDeck();
    off.motion.heroes = false;
    expect(renderDeckHtml(off, SAMPLE_ASSETS, "present")).not.toContain("data-hero=");
  });

  it("renders final values for static output", () => {
    const html = renderDeckHtml(sampleDeck(), SAMPLE_ASSETS, "static");
    expect(html).toContain(">4.2</span>");
    expect(html).toContain('data-value="38"');
  });

  it("fails loudly on a missing asset", () => {
    const deck = withSlide({ layout: "text-image", blocks: { title: { type: "heading", level: "h1", text: "x" }, image: { type: "image", assetId: "nope", alt: "x", fit: "cover" } } });
    expect(() => renderDeckHtml(deck, SAMPLE_ASSETS, "static")).toThrow(/nope/);
  });
});

describe("validate highlight", () => {
  const hits = (d: Deck) => validateDeck(d, SAMPLE_ASSET_INDEX).filter((f) => f.rule === "highlight-on-accent" && f.slideId === d.slides[2]!.id);
  const statement = { statement: { type: "heading", level: "display", text: "Ask for ==more==" } } as const;

  it("warns about highlight markers on the accent tone", () => {
    expect(hits(withSlide({ tone: "accent", layout: "statement", blocks: statement }))).toHaveLength(1);
    expect(hits(withSlide({ tone: "default", layout: "statement", blocks: statement }))).toHaveLength(0);
  });
});

describe("steps", () => {
  it("counts build items as click steps", () => {
    const deck = sampleDeck();
    const s4 = deck.slides[3]!; // bullets s build: items, 3 položky
    expect(slideSteps(s4)).toBe(2);
    expect(blockSteps({ type: "bullets", items: ["a", "b", "c"], build: "items", step: 1 })).toEqual({ first: 1, last: 3 });
  });
});

describe("validate", () => {
  it("accepts the sample deck without errors", () => {
    const f = validateDeck(sampleDeck(), SAMPLE_ASSET_INDEX);
    expect(rules(f, "error")).toEqual([]);
  });

  it("rejects structure problems", () => {
    const wrongZone = withSlide({ blocks: { ...sampleDeck().slides[2]!.blocks, sidebar: { type: "text", size: "body", text: "x" } } });
    expect(rules(validateDeck(wrongZone, SAMPLE_ASSET_INDEX), "error")).toContain("zone");

    const wrongType = withSlide({ blocks: { ...sampleDeck().slides[2]!.blocks, stat: { type: "text", size: "body", text: "x" } } });
    expect(rules(validateDeck(wrongType, SAMPLE_ASSET_INDEX), "error")).toContain("zone-type");

    const missing = withSlide({ blocks: { title: { type: "heading", level: "h1", text: "x" } } });
    expect(rules(validateDeck(missing, SAMPLE_ASSET_INDEX), "error")).toContain("zone-required");

    const asset = withSlide({ layout: "text-image", blocks: { title: { type: "heading", level: "h1", text: "x" }, image: { type: "image", assetId: "nope", alt: "x", fit: "cover" } } });
    expect(rules(validateDeck(asset, SAMPLE_ASSET_INDEX), "error")).toContain("asset");
  });

  it("rejects inconsistent data", () => {
    const chart = withSlide({
      layout: "chart",
      blocks: { title: { type: "heading", level: "h1", text: "x" }, chart: { type: "chart", kind: "column", categories: ["a", "b"], series: [{ name: "s", values: [1, 2, 3] }] } },
    });
    expect(rules(validateDeck(chart, SAMPLE_ASSET_INDEX), "error")).toContain("chart-shape");
    const donut = withSlide({
      layout: "chart",
      blocks: { title: { type: "heading", level: "h1", text: "x" }, chart: { type: "chart", kind: "donut", categories: ["a", "b"], series: [{ name: "s", values: [1, 2] }, { name: "t", values: [1, 2] }] } },
    });
    expect(rules(validateDeck(donut, SAMPLE_ASSET_INDEX), "error")).toContain("chart-donut");
  });

  it("flags low contrast as an error", () => {
    const d = sampleDeck();
    d.design.colors.fg = "#DDDDDD";
    expect(rules(validateDeck(d, SAMPLE_ASSET_INDEX), "error")).toContain("contrast");
  });

  it("flags font weights the font does not have", () => {
    const d = sampleDeck();
    d.design.fonts.heading = { source: "google", family: "Instrument Serif" };
    expect(rules(validateDeck(d, SAMPLE_ASSET_INDEX), "error")).toContain("font-weight");
    d.design.type.headingWeight = 400;
    expect(rules(validateDeck(d, SAMPLE_ASSET_INDEX), "error")).not.toContain("font-weight");
  });

  it("warns about motion budget and rhythm", () => {
    const steps = withSlide({
      layout: "points",
      blocks: { title: { type: "heading", level: "h1", text: "x" }, body: { type: "bullets", items: ["a", "b", "c", "d", "e"], build: "items", step: 1 } },
    });
    expect(rules(validateDeck(steps, SAMPLE_ASSET_INDEX), "warning")).toContain("motion-steps");

    const d = sampleDeck();
    d.slides[1] = { ...d.slides[1]!, layout: d.slides[0]!.layout, blocks: d.slides[0]!.blocks };
    expect(rules(validateDeck(d, SAMPLE_ASSET_INDEX), "warning")).toContain("rhythm");

    // 15 slidů snese 3 výjimky z pohybového jazyka, čtvrtá už rozbíjí koherenci.
    const m = sampleDeck();
    m.slides[2]!.motion = { entrance: "focus" };
    m.slides[3]!.motion = { entrance: "wipe" };
    m.slides[5]!.motion = { transition: "lift" };
    expect(rules(validateDeck(m, SAMPLE_ASSET_INDEX), "warning")).not.toContain("motion-consistency");
    m.slides[7]!.motion = { zones: { title: "reveal" } };
    expect(rules(validateDeck(m, SAMPLE_ASSET_INDEX), "warning")).toContain("motion-consistency");
  });

  it("hasErrors only reacts to errors", () => {
    expect(hasErrors([{ severity: "warning", rule: "x", message: "x" }])).toBe(false);
    expect(hasErrors([{ severity: "error", rule: "x", message: "x" }])).toBe(true);
  });
});

describe("motion language", () => {
  const vocab = (d: Deck) => {
    d.motion.vocabulary = {
      entrances: { "soft-rise": { purpose: "x", keyframes: [{ opacity: 0, transform: "translateY(36px)" }], duration: 800, easing: "out-expo", stagger: 200 } },
      transitions: { push: { purpose: "x", duration: 700, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)", enter: [{ transform: "translateX(1920px)" }], over: "enter", shared: true } },
    };
    return d;
  };

  it("compiles presets and the deck vocabulary for the player, scaled by tempo", () => {
    const d = vocab(sampleDeck());
    d.motion.tempo = "calm";
    const c = playerConfig(d);
    expect(c.entrances["soft-rise"]).toEqual({ keyframes: [{ opacity: 0, transform: "translateY(36px)" }], duration: 1000, easing: "cubic-bezier(0.16, 1, 0.3, 1)", stagger: 250 });
    expect(c.entrances.rise!.duration).toBe(800);
    expect(c.transitions.push).toMatchObject({ duration: 875, over: "enter", shared: true, exit: [], easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" });
    expect(c.transitions.fade!.exit).toEqual([{ opacity: 0 }]);
  });

  it("uses vocabulary names on slides and zones", () => {
    const d = vocab(sampleDeck());
    d.motion.intensity = "expressive";
    d.slides[2]!.motion = { transition: "push", zones: { title: "soft-rise" } };
    const html = renderDeckHtml(d, SAMPLE_ASSETS, "present");
    const slide3 = html.split('<section class="slide')[3]!;
    expect(slide3).toContain('data-transition="push"');
    expect(slide3).toContain('data-zone="title" data-entrance="soft-rise"');
    expect(validateDeck(d, SAMPLE_ASSET_INDEX).filter((f) => f.rule.startsWith("motion"))).toEqual([]);
  });

  it("rejects unknown names, shadowed presets and zones without a block", () => {
    const d = vocab(sampleDeck());
    d.slides[2]!.motion = { entrance: "nope", zones: { nowhere: "rise" } };
    d.motion.vocabulary!.entrances!.fade = { purpose: "x", keyframes: [], duration: 0, easing: "linear" };
    const errors = validateDeck(d, SAMPLE_ASSET_INDEX).filter((f) => f.severity === "error");
    expect(errors.map((f) => f.rule).sort()).toEqual(["motion-name", "motion-name", "motion-zone"]);
    expect(errors.find((f) => f.message.includes("nope"))!.message).toContain("soft-rise");
  });

  it("accepts CSS motion values and rejects url() and other strings", () => {
    expect(keyframeSchema.safeParse({ transform: "translate3d(0, 40px, 0) rotate(-2deg) scale(.96)", filter: "blur(8px) saturate(120%)", clipPath: "inset(0 0 100% 0 round 24px)" }).success).toBe(true);
    expect(keyframeSchema.safeParse({ filter: "url(https://x.test/a.svg#f)" }).success).toBe(false);
    expect(keyframeSchema.safeParse({ transform: "translateX(1px); background: red" }).success).toBe(false);
    expect(keyframeSchema.safeParse({ easing: "linear(0, 1.1 60%, 1)" }).success).toBe(true);
    expect(keyframeSchema.safeParse({ easing: "steps(4)" }).success).toBe(false);
    expect(deckMotionSchema.safeParse({ intensity: "loud", entrance: "rise", transition: "fade", tempo: "calm", heroes: true }).success).toBe(false);
  });

  it("checks durations against perception and the readable time of a slide", () => {
    const d = vocab(sampleDeck());
    d.motion.vocabulary!.entrances!["soft-rise"]!.duration = 2300;
    d.motion.entrance = "soft-rise";
    const w = validateDeck(d, SAMPLE_ASSET_INDEX).filter((f) => f.severity === "warning").map((f) => f.rule);
    expect(w).toContain("motion-duration");
    expect(w).toContain("motion-readable");
    d.motion.vocabulary!.entrances!["soft-rise"]!.duration = 60;
    expect(validateDeck(d, SAMPLE_ASSET_INDEX).find((f) => f.rule === "motion-duration")!.message).toContain("jump");
  });

  it("keeps still decks still and shared transitions meaningful", () => {
    const d = sampleDeck();
    d.motion.intensity = "still";
    expect(rules(validateDeck(d, SAMPLE_ASSET_INDEX), "warning")).toContain("motion-intensity");
    d.motion.heroes = false;
    expect(rules(validateDeck(d, SAMPLE_ASSET_INDEX), "warning")).not.toContain("motion-intensity");

    const s = sampleDeck();
    s.motion.transition = "morph";
    const shared = validateDeck(s, SAMPLE_ASSET_INDEX).filter((f) => f.rule === "motion-shared");
    // Bez sdíleného prvku jsou jen přechody na slidy bez nadpisu (citace).
    expect(shared.length).toBeGreaterThan(0);
    expect(shared.every((f) => s.slides.find((x) => x.id === f.slideId)!.layout === "quote" || s.slides[s.slides.findIndex((x) => x.id === f.slideId) - 1]!.layout === "quote")).toBe(true);
  });

  it("judges measured motion against the declared intensity", () => {
    const usage = { entrances: { big: ["s2"] }, transitions: { push: ["s3"] } };
    const sample = { name: "big", part: "entrance" as const, travelPx: 300, scale: 0, blurPx: 0, rotateDeg: 0, overshoot: true, remainingAtHalf: 0.8 };
    const subtle = motionFindings({ intensity: "subtle", usage }, [sample]);
    expect(subtle.map((f) => f.rule)).toEqual(["motion-intensity", "motion-overshoot", "motion-easing"]);
    expect(subtle[0]!.message).toContain("slides s2");
    expect(motionFindings({ intensity: "kinetic", usage }, [{ ...sample, remainingAtHalf: 0.3 }])).toEqual([]);
    const slide = { name: "push", part: "enter" as const, travelPx: 1920, scale: 0, blurPx: 0, rotateDeg: 0, overshoot: false, remainingAtHalf: 0.1 };
    expect(motionFindings({ intensity: "subtle", usage }, [slide]).map((f) => f.rule)).toEqual(["motion-intensity"]);
    expect(motionFindings({ intensity: "expressive", usage }, [slide])).toEqual([]);
  });
});

describe("brand colors", () => {
  it("reads colors from SVG by frequency", () => {
    const c = colorsFromSvg(LOGO_SVG);
    expect(c.map((x) => x.hex)).toEqual(["#0E7C66", "#F4B942", "#0F1A17"]);
    expect(c[2]!.neutral).toBe(true);
  });

  it("quantizes pixels deterministically and ignores transparency", () => {
    const px = (r: number, g: number, b: number, a = 255, n = 1) => Array.from({ length: n }, () => [r, g, b, a]).flat();
    const pixels = [...px(14, 124, 102, 255, 70), ...px(255, 255, 255, 255, 25), ...px(240, 180, 60, 255, 5), ...px(0, 0, 0, 0, 500)];
    const c = quantize(pixels);
    expect(c[0]).toEqual({ hex: "#0E7C66", share: 0.7, neutral: false });
    expect(c[1]!.neutral).toBe(true);
    expect(quantize(pixels)).toEqual(c);
    expect(isNeutral("#808080")).toBe(true);
  });
});

describe("principle rules", () => {
  it("flags a topic label as heading on a content slide, not a sentence or a title", () => {
    const label = withSlide({ layout: "points", blocks: { title: { type: "heading", level: "h1", text: "Náš tým" }, body: { type: "bullets", items: ["a", "b"] } } });
    expect(rules(validateDeck(label, SAMPLE_ASSET_INDEX), "warning")).toContain("heading-label");
    const sentence = withSlide({ layout: "points", blocks: { title: { type: "heading", level: "h1", text: "Tým doručil první verzi za šest týdnů" }, body: { type: "bullets", items: ["a", "b"] } } });
    expect(rules(validateDeck(sentence, SAMPLE_ASSET_INDEX))).not.toContain("heading-label");
    const number = withSlide({ layout: "points", blocks: { title: { type: "heading", level: "h1", text: "Růst 3x" }, body: { type: "bullets", items: ["a", "b"] } } });
    expect(rules(validateDeck(number, SAMPLE_ASSET_INDEX))).not.toContain("heading-label");
    const title = withSlide({ layout: "statement", blocks: { statement: { type: "heading", level: "display", text: "Vize" } } });
    expect(rules(validateDeck(title, SAMPLE_ASSET_INDEX))).not.toContain("heading-label");
  });

  it("counts highlights per slide", () => {
    const many = withSlide({ layout: "points", blocks: { title: { type: "heading", level: "h1", text: "==One== sentence with ==two== and ==three== highlights" }, body: { type: "bullets", items: ["a", "b"] } } });
    expect(rules(validateDeck(many, SAMPLE_ASSET_INDEX), "warning")).toContain("highlight-count");
    const two = withSlide({ layout: "points", blocks: { title: { type: "heading", level: "h1", text: "==One== sentence with ==two== highlights" }, body: { type: "bullets", items: ["a", "b"] } } });
    expect(rules(validateDeck(two, SAMPLE_ASSET_INDEX))).not.toContain("highlight-count");
  });

  it("checks secondary text on filled cards", () => {
    const d = sampleDeck();
    d.design.shape.cards = "filled";
    d.design.colors = { ...d.design.colors, muted: "#C8CCD8", surface: "#EEF0F5" };
    const f = validateDeck(d, SAMPLE_ASSET_INDEX).filter((x) => x.rule === "contrast" && x.message.includes("on cards"));
    expect(f.length).toBeGreaterThan(0);
  });
});
