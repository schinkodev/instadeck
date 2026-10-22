import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NotFoundError, OpError, RevisionConflictError, Store, ValidationError, sniff, type CreateDeckInput } from "@/lib/state";
import { deckSchema } from "@/lib/domain";
import { LOGO_SVG, SAMPLE_SLIDES, sampleDeck } from "./fixtures/sample-deck";

let home: string;
let store: Store;

beforeEach(async () => {
  home = await mkdtemp(join(tmpdir(), "instadeck-"));
  let n = 0;
  store = Store.local(home, { id: (p) => `${p}${String(++n).padStart(4, "0")}`, now: () => `2026-10-19T00:00:${String(n).padStart(2, "0")}.000Z` });
});
afterEach(() => rm(home, { recursive: true, force: true }));

const brief = { company: "Northwind Grid", topic: "Seed pitch", language: "en" };
const textSlides = SAMPLE_SLIDES.filter((s) => !JSON.stringify(s).includes("assetId"));

async function created(extra: Partial<CreateDeckInput> = {}) {
  return store.createDeck({ title: "Pitch", brief, slides: textSlides.slice(0, 3), ...extra }, "mcp");
}

describe("decks", () => {
  it("creates a deck as revision 1 with stable slide ids", async () => {
    const { deck, findings, touched } = await created();
    expect(deck.revision).toBe(1);
    expect(deck.slides.map((s) => s.id)).toEqual(touched);
    expect(new Set(touched).size).toBe(3);
    expect(findings.every((f) => f.severity !== "error")).toBe(true);
    expect((await store.getDeck(deck.id)).slides).toHaveLength(3);
  });

  it("applies ops atomically and bumps the revision", async () => {
    const { deck } = await created();
    const [a, b, c] = deck.slides.map((s) => s.id);
    const r = await store.applyOps(deck.id, 1, [{ op: "move_slide", slide_id: c!, to: 0 }, { op: "remove_slide", slide_id: b! }, { op: "set_title", title: "New" }], "mcp", "reorder");
    expect(r.deck.revision).toBe(2);
    expect(r.deck.slides.map((s) => s.id)).toEqual([c, a]);
    expect(r.deck.title).toBe("New");

    // druhá operace selže: nic se nezapíše
    await expect(store.applyOps(deck.id, 2, [{ op: "set_title", title: "X" }, { op: "remove_slide", slide_id: "nope" }], "mcp", "bad")).rejects.toBeInstanceOf(OpError);
    expect((await store.getDeck(deck.id)).title).toBe("New");
    expect((await store.getDeck(deck.id)).revision).toBe(2);
  });

  it("keeps facts from create_deck and replaces them with set_facts", async () => {
    const { deck } = await created({ facts: [{ id: "arr-2024", label: "ARR", value: 2.1, unit: "USD M" }] });
    expect(deck.facts).toEqual([{ id: "arr-2024", label: "ARR", value: 2.1, unit: "USD M" }]);
    const r = await store.applyOps(deck.id, 1, [{ op: "set_facts", facts: [{ id: "arr-2025", label: "ARR", value: 3, status: "estimate" }] }], "mcp", "facts");
    expect(r.deck.facts!.map((f) => f.id)).toEqual(["arr-2025"]);
  });

  it("rejects a stale revision", async () => {
    const { deck } = await created();
    await store.applyOps(deck.id, 1, [{ op: "set_title", title: "A" }], "mcp", "a");
    await expect(store.applyOps(deck.id, 1, [{ op: "set_title", title: "B" }], "mcp", "b")).rejects.toBeInstanceOf(RevisionConflictError);
  });

  it("serializes concurrent writes", async () => {
    const { deck } = await created();
    const results = await Promise.allSettled([1, 1, 1].map((rev, i) => store.applyOps(deck.id, rev, [{ op: "set_title", title: `T${i}` }], "mcp", "t")));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect((await store.getDeck(deck.id)).revision).toBe(2);
  });

  it("refuses writes with validation errors and keeps the deck", async () => {
    const { deck } = await created();
    const bad = store.applyOps(deck.id, 1, [{ op: "update_slide", slide_id: deck.slides[0]!.id, blocks: { statement: null } }], "mcp", "x");
    await expect(bad).rejects.toBeInstanceOf(ValidationError);
    await bad.catch((e: ValidationError) => expect(e.findings.map((f) => f.rule)).toContain("zone-required"));
    expect((await store.getDeck(deck.id)).revision).toBe(1);
    await expect(store.createDeck({ title: "x", brief, design: { colors: { fg: "#FEFEFE" } } }, "mcp")).rejects.toBeInstanceOf(ValidationError);
  });

  it("keeps history and reverts as a new revision", async () => {
    const { deck } = await created();
    await store.applyOps(deck.id, 1, [{ op: "set_title", title: "Changed" }], "user", "rename");
    const r = await store.revert(deck.id, 2, 1, "mcp");
    expect(r.deck.revision).toBe(3);
    expect(r.deck.title).toBe("Pitch");
    const h = await store.history(deck.id);
    expect(h.map((x) => [x.revision, x.author, x.summary])).toEqual([
      [1, "mcp", "Created"],
      [2, "user", "rename"],
      [3, "mcp", "Reverted to revision 1"],
    ]);
  });

  it("lists and deletes decks", async () => {
    const { deck } = await created();
    expect((await store.listDecks()).map((d) => d.id)).toEqual([deck.id]);
    await store.deleteDeck(deck.id);
    expect(await store.listDecks()).toEqual([]);
    await expect(store.getDeck(deck.id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(store.getDeck("../etc")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("does not share default design objects between decks", async () => {
    const a = await created();
    await store.applyOps(a.deck.id, 1, [{ op: "set_motion", motion: { heroes: false } }, { op: "set_design", design: { colors: { accent: "#0E7C66" } } }], "mcp", "x");
    const b = await created();
    expect(b.deck.motion.heroes).toBe(true);
    expect(b.deck.design.colors.accent).not.toBe("#0E7C66");
  });
});

describe("motion", () => {
  it("merges the motion vocabulary entry by entry and removes with null", async () => {
    const { deck } = await created();
    const spec = { purpose: "x", keyframes: [{ opacity: 0 }], duration: 500, easing: "out-cubic" };
    const a = await store.applyOps(deck.id, 1, [{ op: "set_motion", motion: { intensity: "expressive", vocabulary: { entrances: { one: spec, two: spec } } } }], "mcp", "x");
    expect(Object.keys(a.deck.motion.vocabulary!.entrances!)).toEqual(["one", "two"]);
    const b = await store.applyOps(deck.id, 2, [{ op: "set_motion", motion: { heroes: false, vocabulary: { entrances: { one: null } } } }], "mcp", "x");
    expect(b.deck.motion).toMatchObject({ intensity: "expressive", heroes: false, entrance: "rise" });
    expect(Object.keys(b.deck.motion.vocabulary!.entrances!)).toEqual(["two"]);
    const c = await store.applyOps(deck.id, 3, [{ op: "set_motion", motion: { vocabulary: { entrances: { two: null } } } }], "mcp", "x");
    expect(c.deck.motion.vocabulary).toBeUndefined();
  });

  it("reads decks saved before motion intensity existed", () => {
    const legacy = { ...sampleDeck(), motion: { entrance: "rise", transition: "fade", tempo: "calm", heroes: true } };
    expect(deckSchema.parse(legacy).motion.intensity).toBe("subtle");
  });
});

describe("deck folders", () => {
  it("names the folder after the title and avoids collisions, also when concurrent", async () => {
    const a = await store.createDeck({ title: "Northwind: Seed Pitch!", brief, slides: textSlides.slice(0, 1) }, "mcp");
    expect(a.deck.id).toBe("northwind-seed-pitch");
    const [b, c] = await Promise.all([1, 2].map(() => store.createDeck({ title: "Northwind seed pitch", brief, slides: textSlides.slice(0, 1) }, "mcp")));
    expect([b!.deck.id, c!.deck.id].sort()).toEqual(["northwind-seed-pitch-2", "northwind-seed-pitch-3"]);
    expect((await store.createDeck({ title: "Žluťoučký kůň", brief, slides: textSlides.slice(0, 1) }, "mcp")).deck.id).toBe("zlutoucky-kun");
  });

  it("releases the folder when creation fails and ignores foreign folders", async () => {
    await expect(store.createDeck({ title: "Bad", brief, design: { colors: { fg: "#FEFEFE" } }, slides: textSlides.slice(0, 1) }, "mcp")).rejects.toBeInstanceOf(ValidationError);
    expect(existsSync(join(home, "bad"))).toBe(false);
    await mkdir(join(home, "notes"));
    expect(await store.listDecks()).toEqual([]);
    await expect(store.createDeck({ title: "!!!", brief }, "mcp")).rejects.toThrow(/no letters/);
  });
});

describe("assets and brand kits", () => {
  it("sniffs file types from content", () => {
    expect(sniff(new TextEncoder().encode(LOGO_SVG)).mime).toBe("image/svg+xml");
    expect(sniff(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0, 0])).mime).toBe("image/png");
    expect(sniff(new TextEncoder().encode("wOF2....")).kind).toBe("font");
    expect(() => sniff(new TextEncoder().encode("%PDF-1.7"))).toThrow(/Unsupported/);
  });

  it("stores assets and builds brand kits that decks can apply", async () => {
    const logo = await store.addAsset("logo.svg", new TextEncoder().encode(LOGO_SVG));
    expect(logo.kind).toBe("image");
    const kit = await store.createBrandKit({ name: "Northwind", colors: { primary: "#0E7C66", dark: "#0F1A17" }, logos: [{ assetId: logo.id, variant: "full", on: "light" }] });
    await expect(store.createBrandKit({ name: "x", colors: { primary: "#000000" }, logos: [{ assetId: "nope", variant: "full", on: "any" }] })).rejects.toBeInstanceOf(NotFoundError);

    const { deck } = await created({ brandKitId: kit.id });
    expect(deck.design.colors.accent).toBe("#0E7C66");
    expect(deck.brandKitId).toBe(kit.id);

    const withLogo = await store.applyOps(deck.id, 1, [{ op: "add_slide", at: 0, slide: { layout: "title", intent: "Open", blocks: { logo: { type: "logo", assetId: logo.id, alt: "Northwind" }, title: { type: "heading", level: "display", text: "Northwind" } } } }], "mcp", "logo");
    const data = await store.assetsFor(withLogo.deck);
    expect(Object.keys(data)).toEqual([logo.id]);
    expect(data[logo.id]!.src.startsWith("data:image/svg+xml;base64,")).toBe(true);
  });

  it("applies a brand to an existing deck", async () => {
    const { deck } = await created({ design: { fonts: { heading: { source: "google", family: "Fraunces" } } } });
    const kit = await store.createBrandKit({ name: "Red", colors: { primary: "#C8102E" }, logos: [] });
    const r = await store.applyOps(deck.id, 1, [{ op: "apply_brand", brand_kit_id: kit.id }], "mcp", "brand");
    expect(r.deck.design.colors.accent).toBe("#C8102E");
    expect(r.deck.design.fonts.heading).toEqual({ source: "google", family: "Fraunces" });
    expect(r.global).toBe(true);
  });

  it("writes atomically without leftovers", async () => {
    const { deck } = await created();
    const files = await readdir(join(home, deck.id));
    expect(files.sort()).toEqual([".revisions", "deck.json"]);
  });
});
