/**
 * The engine in headless Chromium: overflow measurement, PDF, PNG and the presentation player.
 */
import { afterAll, describe, expect, it } from "vitest";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import JSZip from "jszip";
import { closeBrowser, colorsFromRaster, exportPdf, exportPptx, measureDeck, renderDeckHtml, renderPng, snapshotDeck } from "@/lib/engine";
import { withPage } from "@/lib/engine/browser";
import { EXAMPLES, DEFAULT_DESIGN, type Deck } from "@/lib/domain";
import { SAMPLE_ASSETS, sampleDeck } from "./fixtures/sample-deck";

afterAll(() => closeBrowser());

describe("overflow", () => {
  it("finds no overflow in the sample deck", async () => {
    expect(await measureDeck(sampleDeck(), SAMPLE_ASSETS)).toEqual([]);
  });

  it("finds a heading that does not fit", async () => {
    const deck = sampleDeck();
    const long = "Northwind turns curtailed wind into revenue for grid operators across every European market ".repeat(3);
    deck.slides[2]!.blocks.title = { type: "heading", level: "h1", text: long };
    const f = await measureDeck(deck, SAMPLE_ASSETS);
    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({ rule: "overflow", slideId: "s3", severity: "error" });
  });
});

describe("layout measurement", () => {
  const layoutRules = async (d: Deck) => (await measureDeck(d, SAMPLE_ASSETS)).filter((f) => f.rule === "layout-balance" || f.rule === "type-contrast");

  it("finds a points slide whose short content leaves the lower part empty", async () => {
    const d = sampleDeck();
    d.slides[2] = { ...d.slides[2]!, layout: "points", blocks: { title: { type: "heading", level: "h1", text: "Three steps from inbox to approved payment" }, body: { type: "bullets", items: ["Connect", "Match", "Review"] } } };
    const f = await layoutRules(d);
    expect(f.map((x) => [x.rule, x.slideId])).toContainEqual(["layout-balance", d.slides[2]!.id]);
  });

  it("leaves intentionally sparse layouts alone", async () => {
    const d = sampleDeck();
    d.slides[2] = { ...d.slides[2]!, layout: "statement", blocks: { statement: { type: "heading", level: "display", text: "Finance teams lose a week every month" } } };
    expect((await layoutRules(d)).filter((x) => x.slideId === d.slides[2]!.id)).toEqual([]);
  });

  it("flags a heading that is barely larger than its text", async () => {
    const d = sampleDeck();
    d.design.type = { ...d.design.type, scale: "minor-third", base: 30 };
    d.slides[2] = { ...d.slides[2]!, layout: "points", blocks: { title: { type: "heading", level: "h2", text: "Matching takes three steps and no migration" }, body: { type: "bullets", items: ["Connect your ERP and the invoice inbox", "Every invoice is checked against its order", "Your team reviews only the exceptions", "Payments go out on the same day"] } } };
    const f = await layoutRules(d);
    expect(f.map((x) => x.rule)).toContain("type-contrast");
  });
});

describe("motion measurement", () => {
  const withEntrance = (patch: Partial<Deck["motion"]>, spec: { keyframes: object[]; easing: string; duration?: number }) => {
    const d = sampleDeck();
    d.motion = { ...d.motion, ...patch, entrance: "probe", vocabulary: { entrances: { probe: { purpose: "x", duration: 600, ...spec } as never } } };
    return d;
  };
  const motionRules = async (d: Deck) => (await measureDeck(d, SAMPLE_ASSETS)).filter((f) => f.rule.startsWith("motion")).map((f) => f.rule);

  it("measures how far, how springy and how eased a custom entrance really is", async () => {
    expect(await motionRules(withEntrance({}, { keyframes: [{ opacity: 0, transform: "translateY(24px)" }], easing: "out-expo" }))).toEqual([]);
    expect(await motionRules(withEntrance({}, { keyframes: [{ opacity: 0, transform: "translateY(400px) rotate(-6deg)" }], easing: "out-expo" }))).toEqual(["motion-intensity"]);
    expect(await motionRules(withEntrance({}, { keyframes: [{ transform: "translateY(40px)" }], easing: "out-back" }))).toContain("motion-overshoot");
    expect(await motionRules(withEntrance({ intensity: "kinetic" }, { keyframes: [{ transform: "translateY(40px)" }], easing: "out-back" }))).toEqual([]);
    expect(await motionRules(withEntrance({}, { keyframes: [{ opacity: 0, transform: "translateY(20px)" }], easing: "in-cubic" }))).toEqual(["motion-easing"]);
  });

  it("measures transitions against the intensity", async () => {
    const d = sampleDeck();
    d.motion.transition = "slide";
    // Both the incoming and the outgoing slide travel further than subtle allows.
    expect(await motionRules(d)).toEqual(["motion-intensity", "motion-intensity"]);
    d.motion.intensity = "expressive";
    expect(await motionRules(d)).toEqual([]);
  });

  it("measures how long two slides of text are legible at once", async () => {
    const overlap = async (d: Deck) => (await motionRules(d)).filter((r) => r === "motion-overlap");
    const d = sampleDeck();
    d.motion = { ...d.motion, intensity: "kinetic", tempo: "calm" };
    for (const t of ["fade", "lift", "morph", "slide"]) {
      d.motion.transition = t;
      expect(await overlap(d), t).toEqual([]);
    }
    // A plain cross fade: the old slide fades out on top of the new one and both headlines read at once.
    d.motion.transition = "blend";
    d.motion.vocabulary = { transitions: { blend: { purpose: "Cross fade", duration: 450, easing: "in-out", exit: [{ opacity: 0 }] } } };
    expect(await overlap(d)).toEqual(["motion-overlap"]);
  });

  it.each(EXAMPLES.map((e) => [e.id, e] as const))("example %s moves the way it declares", async (_id, e) => {
    const deck: Deck = { ...sampleDeck(), design: { ...DEFAULT_DESIGN, ...e.design } as Deck["design"], motion: e.motion, slides: e.slides.map((s, i) => ({ ...s, id: `x${i}` })) };
    expect(await motionRules(deck)).toEqual([]);
  });
});

describe("exports", () => {
  it("exports a vector PDF with selectable text, one page per slide", async () => {
    const deck = sampleDeck();
    const pdf = await getDocument({ data: await exportPdf(deck, SAMPLE_ASSETS) }).promise;
    expect(pdf.numPages).toBe(deck.slides.length);
    const page = await pdf.getPage(1);
    const text = (await page.getTextContent()).items.map((i) => ("str" in i ? i.str : "")).join(" ");
    expect(text).toContain("Northwind");
    const [, , w, h] = page.view;
    expect(Math.round((w! / h!) * 100)).toBe(178);
  });

  it("prints the presentation itself: one page per slide, every step revealed", async () => {
    const deck = sampleDeck();
    const bytes = await withPage(renderDeckHtml(deck, SAMPLE_ASSETS, "present"), (page) => page.pdf({ printBackground: true, preferCSSPageSize: true }));
    const pdf = await getDocument({ data: bytes }).promise;
    expect(pdf.numPages).toBe(deck.slides.length);
    // slide 4 has bullets on click: in print all of them must be there
    const text = (await (await pdf.getPage(4)).getTextContent()).items.map((i) => ("str" in i ? i.str : "")).join(" ");
    expect(text).toContain("Plugs into existing SCADA");
  });

  it("exports PowerPoint from the slides as Chromium rendered them", async () => {
    const deck = sampleDeck();
    const snap = await snapshotDeck(deck, SAMPLE_ASSETS);
    expect(snap).toHaveLength(deck.slides.length);
    const kinds = new Set(snap.flatMap((s) => s.items.map((i) => i.kind)));
    for (const k of ["text", "box", "line", "image", "chart", "scrim"]) expect(kinds, k).toContain(k);
    // Initials in a circle: one line, positioned by the text, not by the circle.
    const quote = snap.find((s) => s.slideId === deck.slides.find((x) => x.layout === "quote")!.id)!;
    expect(quote.items.some((i) => i.kind === "text" && i.runs.some((r) => r.text.includes("\u201C")))).toBe(true);
    const zip = await JSZip.loadAsync(await exportPptx(deck, SAMPLE_ASSETS));
    expect(Object.keys(zip.files).filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f))).toHaveLength(deck.slides.length);
    expect(Object.keys(zip.files).some((f) => f.startsWith("ppt/media/"))).toBe(true);
    const all = (await Promise.all(Object.keys(zip.files).filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f)).map((f) => zip.file(f)!.async("string")))).join("");
    const author = (deck.slides.find((x) => x.layout === "quote")!.blocks.quote as { author: string }).author;
    expect(all).toContain(author);
  });

  it("renders PNG previews at the requested scale", async () => {
    const [png] = await renderPng(sampleDeck(), SAMPLE_ASSETS, [0], 0.5);
    const b = Buffer.from(png!);
    expect(b.subarray(1, 4).toString()).toBe("PNG");
    expect([b.readUInt32BE(16), b.readUInt32BE(20)]).toEqual([960, 540]);
  });

  it("reads colors from a raster logo", async () => {
    const c = await colorsFromRaster(SAMPLE_ASSETS.logo!.src);
    expect(c[0]!.neutral).toBe(false);
    expect(c.some((x) => x.hex === "#0E7C66")).toBe(true);
  });
});

describe("player", () => {
  it("steps through reveals and slides without errors", async () => {
    const deck = sampleDeck();
    const html = renderDeckHtml(deck, SAMPLE_ASSETS, "present");
    const result = await withPage(html, async (page) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(String(e)));
      await page.waitForFunction(() => document.querySelector(".slide.is-active"));
      const state = () =>
        page.evaluate(() => ({
          active: document.querySelector(".slide.is-active")!.id,
          hash: location.hash,
          pending: document.querySelectorAll(".slide.is-active .pending").length,
        }));
      const seen = [await state()];
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press("ArrowRight");
        seen.push(await state());
      }
      await page.keyboard.press("ArrowLeft");
      seen.push(await state());
      await page.keyboard.press("End");
      seen.push(await state());
      return { seen, errors };
    });
    expect(result.errors).toEqual([]);
    const ids = result.seen.map((s) => s.active);
    // slide 4 has bullets on click: two clicks stay on slide 4
    expect(ids).toEqual(["slide-1", "slide-2", "slide-3", "slide-4", "slide-4", "slide-4", "slide-4", "slide-15"]);
    expect(result.seen[3]!.pending).toBe(2);
    expect(result.seen[5]!.pending).toBe(0);
    expect(result.seen[6]!.pending).toBe(1);
    expect(result.seen.at(-1)!.hash).toBe("#15");
  });

  it("shows controls, an overview of all slides and a presenter window", async () => {
    const deck = sampleDeck();
    deck.slides[3]!.notes = "Pause here and ask about their grid.";
    const html = renderDeckHtml(deck, SAMPLE_ASSETS, "present");
    const result = await withPage(html, async (page) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(String(e)));
      await page.waitForFunction(() => document.querySelector(".slide.is-active"));
      const bar = await page.evaluate(() => ({
        buttons: Array.from(document.querySelectorAll(".controls .ctl")).map((b) => b.getAttribute("aria-label")),
        // A page from setContent has no http address: HTML download is not offered, PDF through print is.
        downloads: Array.from(document.querySelectorAll(".ctl-menu b")).map((b) => b.textContent),
      }));
      await page.keyboard.press("g");
      const overview = await page.evaluate(() => ({
        thumbs: document.querySelectorAll(".overview .thumb").length,
        current: document.querySelector(".thumb.is-current .thumb-n")!.textContent,
        visible: getComputedStyle(document.querySelector(".thumb .is-snapshot")!).visibility,
        scale: Number(getComputedStyle(document.querySelector(".thumb .snap")!).getPropertyValue("--snap-scale")),
        pending: document.querySelectorAll(".overview .pending").length,
      }));
      await page.click(".overview .thumb:nth-child(4)");
      const jumped = await page.evaluate(() => ({ active: document.querySelector(".slide.is-active")!.id, overview: !!document.querySelector(".overview") }));
      const popup = new Promise<import("puppeteer-core").Page | null>((resolve) => page.browser().once("targetcreated", (t) => resolve(t.page())));
      await page.keyboard.press("p");
      const p = (await popup)!;
      await p.waitForFunction(() => document.querySelector(".p-notes")?.textContent !== "");
      const presenter = await p.evaluate(() => ({
        notes: document.querySelector(".p-notes")!.textContent,
        count: document.querySelector(".p-count")!.textContent,
        now: !!document.querySelector(".p-now .is-snapshot"),
        next: !!document.querySelector(".p-next .is-snapshot"),
      }));
      await p.keyboard.press("ArrowRight");
      await p.keyboard.press("ArrowRight");
      await p.keyboard.press("ArrowRight");
      const followed = await p.evaluate(() => document.querySelector(".p-count")!.textContent);
      await p.close();
      return { errors, bar, overview, jumped, presenter, followed };
    });
    expect(result.errors).toEqual([]);
    expect(result.bar.buttons).toEqual(["Previous (Left arrow)", "Next (Right arrow)", "All slides (G)", "Speaker notes (N)", "Presenter view (P)", "Full screen (F)", "Download"]);
    expect(result.bar.downloads).toEqual(["PDF"]);
    expect(result.overview).toMatchObject({ thumbs: 15, current: "1", visible: "visible", pending: 0 });
    expect(result.overview.scale).toBeGreaterThan(0.05);
    expect(result.jumped).toEqual({ active: "slide-4", overview: false });
    expect(result.presenter).toEqual({ notes: "Pause here and ask about their grid.", count: "Slide 4 of 15, step 0 of 2", now: true, next: true });
    expect(result.followed).toBe("Slide 5 of 15");
  });

  it("plays a custom vocabulary and glides shared elements to the next slide", async () => {
    const deck = sampleDeck();
    deck.motion = {
      ...deck.motion,
      intensity: "expressive",
      transition: "push",
      vocabulary: {
        entrances: { drift: { purpose: "x", keyframes: [{ opacity: 0, transform: "translateX(-40px)" }], duration: 500, easing: "out-cubic" } },
        transitions: { push: { purpose: "x", duration: 800, easing: "out-expo", enter: [{ transform: "translateX(1920px)" }], exit: [{ opacity: 0 }], over: "enter", shared: true } },
      },
    };
    deck.slides[1]!.motion = { zones: { statement: "drift" } };
    const html = renderDeckHtml(deck, SAMPLE_ASSETS, "present");
    const result = await withPage(html, async (page) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(String(e)));
      await page.waitForFunction(() => document.querySelector(".slide.is-active"));
      await page.keyboard.press("ArrowRight");
      const during = await page.evaluate(() => {
        const next = document.querySelector(".slide.is-active")!;
        const shared = next.querySelector("[data-shared]");
        return { over: next.classList.contains("is-over"), slideAnims: next.getAnimations().length, sharedAnims: shared ? shared.getAnimations().length : -1 };
      });
      await page.keyboard.press("ArrowRight");
      return { errors, during };
    });
    expect(result.errors).toEqual([]);
    expect(result.during.over).toBe(true);
    expect(result.during.slideAnims).toBeGreaterThan(0);
    expect(result.during.sharedAnims).toBeGreaterThan(0);
  });
});
