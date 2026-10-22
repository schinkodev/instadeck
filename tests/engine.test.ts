import { describe, expect, it } from "vitest";
import type { Deck, Slide } from "@/lib/domain";
import { chartDecimals, deckMotionSchema, keyframeSchema } from "@/lib/domain";
import { blockSteps, colorsFromSvg, hasErrors, isNeutral, layoutFindings, motionFindings, playerConfig, quantize, renderDeckHtml, slideSteps, validateDeck, type Finding } from "@/lib/engine";
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
    const s4 = deck.slides[3]!; // bullets with build: items, 3 items
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

    // 15 slides allow 3 exceptions from the motion language, a fourth breaks coherence.
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
    expect(c.entrances["soft-rise"]).toEqual({ keyframes: [{ opacity: 0, transform: "translateY(36px)", easing: "cubic-bezier(0.16, 1, 0.3, 1)" }], duration: 1000, easing: "cubic-bezier(0.16, 1, 0.3, 1)", stagger: 250 });
    expect(c.entrances.rise!.duration).toBe(800);
    expect(c.transitions.push).toMatchObject({ duration: 875, over: "enter", shared: true, exit: [], easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" });
    expect(c.transitions.fade).toMatchObject({ exit: [{ opacity: 0, offset: 0.5 }, { opacity: 0 }], enter: [{ opacity: 0 }, { opacity: 0, offset: 0.5 }] });
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
    // Without a shared element only the transitions to slides without a heading (quote) remain.
    expect(shared.length).toBeGreaterThan(0);
    expect(shared.every((f) => s.slides.find((x) => x.id === f.slideId)!.layout === "quote" || s.slides[s.slides.findIndex((x) => x.id === f.slideId) - 1]!.layout === "quote")).toBe(true);
  });

  it("judges a figure that competes with the heading and a zone that lines up with nothing", () => {
    const m = { slideId: "s1", layout: "closing", fill: 1, headingPx: 64, bodyPx: 0, figurePx: 70, unaligned: [] as string[] };
    expect(layoutFindings([m]).map((f) => f.rule)).toEqual(["layout-dominance"]);
    expect(layoutFindings([{ ...m, figurePx: 110 }])).toEqual([]);
    expect(layoutFindings([{ ...m, figurePx: 40 }])).toEqual([]);
    expect(layoutFindings([{ ...m, layout: "headline-stat", figurePx: 110, unaligned: ["stat"] }]).map((f) => [f.rule, f.message.includes('"stat"')])).toEqual([["layout-alignment", true]]);
  });

  it("judges measured motion against the declared intensity", () => {
    const usage = { entrances: { big: ["s2"] }, transitions: { push: ["s3"] } };
    const sample = { name: "big", part: "entrance" as const, travelPx: 300, scale: 0, blurPx: 0, rotateDeg: 0, overshoot: true, remainingAtHalf: 0.8, activeMs: 600 };
    const subtle = motionFindings({ intensity: "subtle", usage }, [sample]);
    expect(subtle.map((f) => f.rule)).toEqual(["motion-intensity", "motion-overshoot", "motion-easing"]);
    expect(subtle[0]!.message).toContain("slides s2");
    expect(motionFindings({ intensity: "kinetic", usage }, [{ ...sample, remainingAtHalf: 0.3 }])).toEqual([]);
    const slide = { name: "push", part: "enter" as const, travelPx: 1920, scale: 0, blurPx: 0, rotateDeg: 0, overshoot: false, remainingAtHalf: 0.1, activeMs: 600 };
    expect(motionFindings({ intensity: "subtle", usage }, [slide]).map((f) => f.rule)).toEqual(["motion-intensity"]);
    expect(motionFindings({ intensity: "expressive", usage }, [slide])).toEqual([]);
    // Holding still and then snapping into place in 40 ms reads as a jump, however the easing looks.
    expect(motionFindings({ intensity: "kinetic", usage }, [{ ...sample, overshoot: false, remainingAtHalf: 0.5, activeMs: 40 }]).map((f) => f.rule)).toEqual(["motion-duration"]);
    const overlap = motionFindings({ intensity: "subtle", usage }, [], [{ name: "push", overlapMs: 200 }]);
    expect(overlap.map((f) => [f.rule, f.message.includes("slides s3")])).toEqual([["motion-overlap", true]]);
    expect(motionFindings({ intensity: "subtle", usage }, [], [{ name: "push", overlapMs: 100 }])).toEqual([]);
  });

  it("plays keyframe offsets as positions in time and starts content when the slide appears", () => {
    const c = playerConfig(sampleDeck());
    // The easing sits on every keyframe, the effect runs linear (player.js, measure.js).
    expect(c.transitions.fade!.exit.every((k) => k.easing === "cubic-bezier(0.65, 0, 0.35, 1)")).toBe(true);
    expect(c.entrances.rise!.keyframes[0]!.easing).toBe("cubic-bezier(0.16, 1, 0.3, 1)");
    // A fade through shows the new slide from half time, its content enters from there.
    expect(c.transitions.fade!.contentDelay).toBe(0.5);
    expect(c.transitions.slide!.contentDelay).toBe(0.45);
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

describe("typesetting and placeholders", () => {
  it("keeps numbers, units and Czech one-letter prepositions on one line", () => {
    const d = withSlide({ layout: "points", blocks: { title: { type: "heading", level: "h1", text: "14 000 uživatelů v Praze ušetří 87 Kč a 45 % času" }, body: { type: "bullets", items: ["EUR 690M v roce 2025", "k ceně 7 800 USD"] } } });
    d.brief = { ...d.brief, language: "cs" };
    const html = renderDeckHtml(d, SAMPLE_ASSETS, "static");
    for (const s of ["14 000", "v Praze", "87 Kč", "a 45 %", "EUR 690M", "k ceně", "7 800 USD"]) expect(html).toContain(s);
  });

  it("leaves one-letter words alone outside Czech and Slovak", () => {
    const d = withSlide({ layout: "points", blocks: { title: { type: "heading", level: "h1", text: "A plan for 12 000 teams" }, body: { type: "bullets", items: ["a", "b"] } } });
    const html = renderDeckHtml(d, SAMPLE_ASSETS, "static");
    expect(html).toContain("A plan");
    expect(html).toContain("12 000");
  });

  it("flags placeholders left on a slide, in any text of any block", () => {
    const hits = (blocks: Slide["blocks"], layout = "points") => rules(validateDeck(withSlide({ layout, blocks }), SAMPLE_ASSET_INDEX)).filter((r) => r === "placeholder").length;
    expect(hits({ title: { type: "heading", level: "h1", text: "Revenue grew [X]% last year" }, body: { type: "bullets", items: ["a", "b"] } })).toBe(1);
    expect(hits({ title: { type: "heading", level: "h1", text: "Revenue grew fast last year" }, body: { type: "bullets", items: ["TBD", "replace with sourced figure"] } })).toBe(1);
    expect(hits({ title: { type: "heading", level: "h1", text: "Tržby rostou" }, body: { type: "text", size: "body", text: "Doplnit číslo za Q3" } })).toBe(1);
    expect(hits({ title: { type: "heading", level: "h1", text: "Revenue grew 3x in two years" }, body: { type: "bullets", items: ["Replaced spreadsheets in 40 teams", "Add-ons sold to 12 customers"] } })).toBe(0);
  });
});

describe("story", () => {
  const story = (beats: (string | undefined)[], frame?: string) => {
    const d = sampleDeck();
    d.slides = d.slides.slice(0, beats.length).map((s, i) => ({ ...s, beat: beats[i] }));
    if (frame) d.brief = { ...d.brief, frame };
    return rules(validateDeck(d, SAMPLE_ASSET_INDEX)).filter((r) => r.startsWith("story"));
  };

  it("checks nothing when slides carry no beats", () => {
    expect(story([undefined, undefined, undefined])).toEqual([]);
  });

  it("wants a hook first and the ask or a decision last", () => {
    expect(story(["problem", "solution", "traction"])).toEqual(expect.arrayContaining(["story-open", "story-close"]));
    expect(story(["hook", "problem", "ask"])).not.toContain("story-open");
    expect(story(["hook", "problem", "decision"])).not.toContain("story-close");
  });

  it("follows the stages of the declared frame", () => {
    // classical: refutatio (competition) before narratio (problem) goes backwards
    expect(story(["hook", "competition", "problem", "ask"], "classical")).toContain("story-order");
    expect(story(["hook", "problem", "solution", "competition", "ask"], "classical")).not.toContain("story-order");
  });
});

describe("story evidence", () => {
  it("flags a beat that needs proof but has text only", () => {
    const text = withSlide({ layout: "points", beat: "traction", blocks: { title: { type: "heading", level: "h1", text: "Customers love the product and keep using it" }, body: { type: "bullets", items: ["Strong growth", "High retention"] } } });
    const f = validateDeck(text, SAMPLE_ASSET_INDEX).find((x) => x.rule === "story-evidence");
    expect(f?.slideId).toBe(text.slides[2]!.id);
    const proof = withSlide({ layout: "headline-stat", beat: "traction", blocks: { title: { type: "heading", level: "h1", text: "Revenue tripled in twelve months" }, stat: { type: "stat", value: 3, suffix: "x", label: "revenue growth" } } });
    expect(rules(validateDeck(proof, SAMPLE_ASSET_INDEX))).not.toContain("story-evidence");
  });
});

describe("analytic charts", () => {
  const chartSlide = (chart: Record<string, unknown>) =>
    withSlide({ layout: "chart", blocks: { title: { type: "heading", level: "h1", text: "Revenue grew 72 M EUR in 2024" }, chart: { type: "chart", ...chart } as Slide["blocks"][string] } });
  const chartRules = (chart: Record<string, unknown>) => rules(validateDeck(chartSlide(chart), SAMPLE_ASSET_INDEX)).filter((r) => r.startsWith("chart"));
  const bridge = { kind: "waterfall", categories: ["2023", "Robotics", "Sensors", "FX", "2024"], series: [{ name: "Revenue", values: [540, 48, 17, -2, 603] }] };

  it("checks that a bridge adds up", () => {
    expect(chartRules(bridge)).toEqual([]);
    expect(chartRules({ ...bridge, series: [{ name: "Revenue", values: [540, 48, 17, -2, 612] }] })).toContain("chart-bridge");
    expect(chartRules({ ...bridge, series: [{ name: "A", values: [1, 2, 3, 4, 10] }, { name: "B", values: [1, 2, 3, 4, 10] }] })).toContain("chart-bridge");
  });

  it("allows negative values where they make sense, not in parts of a whole", () => {
    expect(chartRules({ kind: "column", categories: ["2023", "2024"], series: [{ name: "EBIT", values: [-12, 8] }] })).toEqual([]);
    expect(chartRules({ kind: "stacked", categories: ["Q1", "Q2"], series: [{ name: "A", values: [-1, 2] }] })).toContain("chart-negative");
    expect(chartRules({ kind: "donut", categories: ["a", "b"], series: [{ name: "A", values: [-1, 2] }] })).toContain("chart-negative");
  });

  it("warns when a donut has more segments than the eye compares by angle", () => {
    expect(chartRules({ kind: "donut", categories: ["a", "b", "c", "d", "e"], series: [{ name: "A", values: [1, 2, 3, 4, 5] }] })).toContain("chart-donut");
  });

  it("keeps estimate, axis and reference to the charts that draw them", () => {
    expect(chartRules({ kind: "line", categories: ["a", "b"], series: [{ name: "A", values: [1, 2] }], axis: true })).toContain("chart-option");
    expect(chartRules({ kind: "column", categories: ["a", "b"], series: [{ name: "A", values: [1, 2] }], estimate: 5 })).toContain("chart-option");
  });

  it("labels values with the decimals the data has, the same in every label", () => {
    const tvpi = { kind: "column", categories: ["Q4 25", "Q1 26", "Q2 26", "Q3 26"], series: [{ name: "TVPI", values: [1.41, 1.47, 1.55, 1.62] }], unit: "x" };
    const html = renderDeckHtml(chartSlide(tvpi), SAMPLE_ASSETS, "static");
    for (const v of ["1.41x", "1.47x", "1.55x", "1.62x"]) expect(html).toContain(v);
    expect(chartDecimals(tvpi as never)).toBe(2);
    // The data has one decimal, so whole numbers are written with it too and the labels line up.
    expect(chartDecimals({ ...tvpi, series: [{ name: "Revenue", values: [2.6, 3, 3.5, 4.1] }] } as never)).toBe(1);
    expect(chartDecimals({ ...tvpi, series: [{ name: "Deals", values: [12, 15, 19, 24] }] } as never)).toBe(0);
    // Margins of 10.9% and 11.8% stay 10.9 and 11.8, not 11 and 12 under a headline about +0.9 points.
    expect(chartDecimals({ ...tvpi, series: [{ name: "Margin", values: [10.9, 11.8] }] } as never)).toBe(1);
    // A value that is not zero never reads 0 when decimals are set by hand.
    expect(chartRules({ ...tvpi, series: [{ name: "DPI", values: [0.04, 1, 2, 3] }], decimals: 0 })).toContain("chart-labels");
    expect(chartRules(tvpi)).toEqual([]);
    expect(chartRules({ ...tvpi, decimals: 1 })).toContain("chart-labels");
  });

  it("draws horizontal bars left of zero for negative values", () => {
    const html = renderDeckHtml(chartSlide({ kind: "bar", categories: ["EBIT", "Cash"], series: [{ name: "M EUR", values: [-12, 8] }] }), SAMPLE_ASSETS, "static");
    // Zero sits at 60% of the scale from -12 to 8: the negative bar ends there, the positive one starts there.
    expect(html).toContain('class="bar-zero" style="left:60.00%"');
    expect(html).toContain('class="bar is-negative" data-part="bar" style="margin-left:0.00%;width:60.00%');
    expect(html).toContain('style="margin-left:60.00%;width:40.00%');
    expect(html).toContain("chart-bar has-negative");
  });

  it("keeps the reference line inside a bridge whose axis starts above zero", () => {
    const html = renderDeckHtml(chartSlide({ ...bridge, reference: { value: 650, label: "Target" } }), SAMPLE_ASSETS, "static");
    const at = Number(html.match(/class="plot-ref" style="bottom:([\d.-]+)%/)![1]);
    expect(at).toBeGreaterThanOrEqual(0);
    expect(at).toBeLessThanOrEqual(100);
  });

  it("draws negative bars down from zero, the bridge with links and estimates hatched", () => {
    const html = renderDeckHtml(chartSlide({ ...bridge, estimate: 4, axis: true, reference: { value: 600, label: "Plan" } }), SAMPLE_ASSETS, "static");
    expect(html).toContain("chart-waterfall");
    expect(html.match(/class="plot-link"/g)).toHaveLength(4);
    expect(html).toContain("is-down");
    expect(html).toContain("transform-origin:top");
    expect(html).toContain("repeating-linear-gradient");
    expect(html).toContain("plot-ref-label");
    expect(html).toContain("+48");
    // A bridge with small changes against the totals: the axis does not start at zero and the totals carry a break mark (IBCS).
    expect(html.match(/class="plot-bar[^"]*is-broken/g)).toHaveLength(2);
    const neg = renderDeckHtml(chartSlide({ kind: "column", categories: ["2023", "2024"], series: [{ name: "EBIT", values: [-12, 8] }] }), SAMPLE_ASSETS, "static");
    expect(neg).toContain("is-down");
  });
});
