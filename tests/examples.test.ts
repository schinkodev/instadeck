import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CONTRAST, EXAMPLES, GOOGLE_FONTS, contrastRatio, exampleSchema } from "@/lib/domain";
import { MOODS, MOOD_NAMES, checkBrandKit, suggestBrandSystem } from "@/lib/engine";
import { LocalFiles, Store } from "@/lib/state";
import { Service } from "@/lib/tools";
import { createMcpServer } from "@/server/mcp";

let home: string;
let client: Client;

beforeAll(async () => {
  home = await mkdtemp(join(tmpdir(), "instadeck-examples-"));
  const service = new Service(new Store(new LocalFiles(home), { mode: "hosted" }), { browser: false, publicUrl: "https://instadeck.test" });
  const server = createMcpServer({ service, mode: "hosted" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  client = new Client({ name: "test", version: "1.0.0" });
  await Promise.all([server.connect(a), client.connect(b)]);
});
afterAll(async () => {
  await client.close();
  await rm(home, { recursive: true, force: true });
});

const call = async (name: string, args: Record<string, unknown> = {}) => (await client.callTool({ name, arguments: args })) as CallToolResult;
const data = (r: CallToolResult) => r.structuredContent as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

describe("examples", () => {
  it("has unique ids and a valid shape", () => {
    expect(new Set(EXAMPLES.map((e) => e.id)).size).toBe(EXAMPLES.length);
    for (const e of EXAMPLES) expect(exampleSchema.safeParse(e).success, e.id).toBe(true);
  });

  it.each(EXAMPLES.map((e) => [e.id, e] as const))("%s builds a deck without errors or warnings", async (_id, e) => {
    const r = await call("create_deck", {
      title: e.title,
      brief: { company: "Example", topic: e.purpose, language: "en" },
      design: e.design,
      motion: e.motion,
      slides: e.slides,
    });
    expect(r.isError, JSON.stringify(data(r))).toBeFalsy();
    expect(data(r).findings.filter((f: { severity: string }) => f.severity !== "info"), e.id).toEqual([]);
  });

  it("lists and returns examples through the tool", async () => {
    const list = data(await call("get_example"));
    expect(list.examples.map((x: { id: string }) => x.id)).toEqual(EXAMPLES.map((x) => x.id));
    const one = data(await call("get_example", { id: EXAMPLES[0]!.id }));
    expect(one.example.slides.length).toBe(EXAMPLES[0]!.slides.length);
    expect((await call("get_example", { id: "nope" })).isError).toBe(true);
  });

  it("serves examples as resources", async () => {
    const { resources } = await client.listResources();
    expect(resources.map((r) => r.uri)).toContain(`instadeck://examples/${EXAMPLES[0]!.id}`);
    const one = await client.readResource({ uri: `instadeck://examples/${EXAMPLES[0]!.id}` });
    expect(JSON.parse((one.contents[0] as { text: string }).text).example.id).toBe(EXAMPLES[0]!.id);
  });
});

describe("brand system", () => {
  it("only uses fonts that exist with the weight it asks for", () => {
    for (const m of Object.values(MOODS)) {
      for (const family of [m.heading, m.body]) expect(GOOGLE_FONTS.some((f) => f.family === family), family).toBe(true);
      expect(GOOGLE_FONTS.find((f) => f.family === m.heading)!.weights).toContain(m.weight);
    }
  });

  it.each(MOOD_NAMES)("suggests a readable system for the %s mood", (mood) => {
    for (const primary of ["#5E6AD2", "#FFD400", "#0E7C66", "#E5484D", "#9AD0F5"]) {
      const s = suggestBrandSystem({ primary, mood });
      expect(s.contrast.text).toBeGreaterThanOrEqual(CONTRAST.enhanced);
      expect(s.contrast.accent).toBeGreaterThanOrEqual(CONTRAST.largeText);
      expect(checkBrandKit({ name: "x", logos: [], ...s.brand_kit }, s.design).filter((f) => f.severity !== "info")).toEqual([]);
    }
  });

  it("keeps a readable primary and reports a darkened one", () => {
    expect(suggestBrandSystem({ primary: "#0E7C66", mood: "calm" }).brand_kit.colors.primary).toBe("#0E7C66");
    const s = suggestBrandSystem({ primary: "#FFD400", mood: "energetic" });
    expect(contrastRatio(s.brand_kit.colors.primary, "#FFFFFF")).toBeGreaterThanOrEqual(CONTRAST.largeText);
    expect(s.adjustments.join(" ")).toContain("#FFD400");
  });

  it("flags an unreadable brand kit", () => {
    const f = checkBrandKit({ name: "x", logos: [], colors: { primary: "#FFFF00", dark: "#EEEEEE" } });
    expect(f.filter((x) => x.severity === "error").map((x) => x.rule)).toContain("brand-contrast");
    const weight = checkBrandKit({ name: "x", logos: [], colors: { primary: "#0E7C66" }, fonts: { heading: { source: "google", family: "Instrument Serif" } } });
    expect(weight.map((x) => x.rule)).toContain("brand-font-weight");
  });

  it("returns the suggestion and the kit findings through the tools", async () => {
    const s = data(await call("suggest_brand_system", { primary: "#5E6AD2", mood: "technical" }));
    expect(s.brand_kit.fonts.heading.family).toBe("Space Grotesk");
    const kit = data(await call("create_brand_kit", { name: "Acme", ...{ colors: s.brand_kit.colors, fonts: s.brand_kit.fonts } }));
    expect(kit.findings.filter((f: { severity: string }) => f.severity === "warning" || f.severity === "error")).toEqual([]);
  });
});
