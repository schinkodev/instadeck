import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closeBrowser } from "@/lib/engine";
import { LocalFiles, Store } from "@/lib/state";
import { Service, TOOLS, type Mode } from "@/lib/tools";
import { CAPABILITIES, capabilitiesFor } from "@/server/capabilities";
import { instructions } from "@/server/instructions";
import { createMcpServer, toolsFor } from "@/server/mcp";
import { GUIDE_RESOURCES } from "@/server/resources";
import { LOGO_SVG, SAMPLE_SLIDES, SAMPLE_CONCEPT } from "./fixtures/sample-deck";

let home: string;
let client: Client;

async function connect(mode: Mode, dir = home) {
  const store = mode === "local" ? Store.local(dir) : new Store(new LocalFiles(dir), { mode: "hosted" });
  const service = new Service(store, mode === "local" ? { browser: true } : { browser: false, publicUrl: "https://instadeck.test" });
  const server = createMcpServer({ service, mode });
  const [a, b] = InMemoryTransport.createLinkedPair();
  const c = new Client({ name: "test", version: "1.0.0" });
  await Promise.all([server.connect(a), c.connect(b)]);
  return c;
}

beforeAll(async () => {
  home = await mkdtemp(join(tmpdir(), "instadeck-mcp-"));
  client = await connect("local");
});
afterAll(async () => {
  await client.close();
  await closeBrowser();
  await rm(home, { recursive: true, force: true });
});

const call = async (name: string, args: Record<string, unknown> = {}) => (await client.callTool({ name, arguments: args })) as CallToolResult;
const data = (r: CallToolResult) => r.structuredContent as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

describe("contract", () => {
  it("lists every tool with a title and annotations", async () => {
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(toolsFor("local").map((t) => t.name).sort());
    for (const t of tools) {
      expect(t.title, t.name).toBeTruthy();
      expect(t.annotations, t.name).toBeDefined();
      expect(t.inputSchema.type).toBe("object");
    }
    expect(tools.find((t) => t.name === "delete_deck")!.annotations!.destructiveHint).toBe(true);
    expect(tools.find((t) => t.name === "get_deck")!.annotations!.readOnlyHint).toBe(true);
    const create = tools.find((t) => t.name === "create_deck")!;
    expect(JSON.stringify(create.inputSchema)).toContain("headline-stat");
  });

  it("keeps the capability registry honest", async () => {
    const registered = new Set(TOOLS.map((t) => t.name));
    for (const mode of ["local", "hosted"] as const) expect(new Set(toolsFor(mode).map((t) => t.name)).size, `${mode}: duplicate tool names`).toBe(toolsFor(mode).length);
    const claimed = new Set(CAPABILITIES.flatMap((c) => c.tools ?? []));
    for (const t of registered) expect(claimed, `tool ${t} missing in CAPABILITIES`).toContain(t);
    for (const t of claimed) expect(registered, `capability references unknown tool ${t}`).toContain(t);
    const { resources } = await client.listResources();
    const { resourceTemplates } = await client.listResourceTemplates();
    const uris = new Set([...resources.map((r) => r.uri), ...resourceTemplates.map((r) => r.uriTemplate)]);
    for (const c of CAPABILITIES) {
      if (c.status === "planned") expect(c.tools ?? [], c.id).toEqual([]);
      if (c.status === "partial") expect(c.now, c.id).toBeTruthy();
      for (const r of c.resources ?? []) expect(uris, `${c.id}: ${r}`).toContain(r);
      const modes = c.modes ?? (["local", "hosted"] as const);
      for (const mode of modes) {
        expect(instructions(mode)).toContain(c.claim);
        const tools = toolsFor(mode).map((t) => t.name);
        if (c.tools?.length) expect(c.tools.some((t) => tools.includes(t)), `${c.id} has no tool in ${mode}`).toBe(true);
      }
      for (const t of c.tools ?? []) expect(modes.some((m) => toolsFor(m).some((x) => x.name === t)), `${c.id}: ${t} exists in none of its modes`).toBe(true);
    }
    for (const uri of Object.keys(GUIDE_RESOURCES)) expect(uris).toContain(uri);
    // The player in the chat is offered by the hosted connector and the local server (Claude Desktop).
    expect(instructions("local")).toContain(capabilitiesFor("hosted").find((c) => c.id === "in-chat")!.claim);
  });

  it("serves instructions, resources and the prompt", async () => {
    expect(client.getInstructions()).toBe(instructions("local"));
    const layouts = await client.readResource({ uri: "instadeck://layouts" });
    const parsed = JSON.parse((layouts.contents[0] as { text: string }).text);
    expect(parsed.length).toBeGreaterThanOrEqual(20);
    const p = await client.getPrompt({ name: "create_pitch_deck", arguments: { company: "Acme", topic: "Seed" } });
    expect(JSON.stringify(p.messages)).toContain("Acme");
  });

  it("rejects unknown arguments instead of dropping them", async () => {
    const r = await call("create_brand_kit", { name: "Acme", colors: { primary: "#112233" }, logo_asset_id: "x" });
    expect(r.isError).toBe(true);
    expect(JSON.stringify(r.content)).toContain("logo_asset_id");
  });

  it("returns errors as isError, not exceptions", async () => {
    const r = await call("get_deck", { deck_id: "dmissing" });
    expect(r.isError).toBe(true);
    expect(data(r).error).toContain("does not exist");
  });
});

describe("end to end", () => {
  it("builds a branded deck, edits it and deletes it", async () => {
    const asset = data(await call("add_asset", { name: "logo.svg", data_base64: Buffer.from(LOGO_SVG).toString("base64") })).asset;
    expect(asset.kind).toBe("image");

    const colors = data(await call("extract_brand_colors", { asset_id: asset.id })).colors;
    expect(colors[0].hex).toBe("#0E7C66");

    const kit = data(
      await call("create_brand_kit", { name: "Northwind", colors: { primary: colors[0].hex, secondary: colors[1].hex, dark: "#0F1A17" }, logos: [{ assetId: asset.id, variant: "full", on: "light" }] }),
    ).brand_kit;

    const slides = SAMPLE_SLIDES.filter((s) => !JSON.stringify(s).includes("assetId"));
    slides.unshift({
      layout: "title",
      intent: "Open",
      blocks: { logo: { type: "logo", assetId: asset.id, alt: "Northwind" }, title: { type: "heading", level: "display", text: "Northwind" } },
    });
    const created = await call("create_deck", {
      title: "Northwind seed",
      brief: { company: "Northwind Grid", topic: "Seed round", language: "en", concept: SAMPLE_CONCEPT },
      brand_kit_id: kit.id,
      motion: { tempo: "calm" },
      slides,
    });
    expect(created.isError).toBeFalsy();
    const deck = data(created);
    expect(deck.revision).toBe(1);
    expect(deck.findings.filter((f: { severity: string }) => f.severity === "error")).toEqual([]);
    expect(existsSync(deck.presentation.path)).toBe(true);
    expect(deck.presentation.url.startsWith("file://")).toBe(true);
    expect(await readFile(deck.presentation.path, "utf8")).toContain("deck-config");
    expect(created.content.filter((c) => c.type === "image")).toHaveLength(4);

    const edited = await call("apply_ops", {
      deck_id: deck.deckId,
      expected_revision: 1,
      ops: [{ op: "set_design", design: { colors: { accent: "#C8102E" } } }],
      summary: "Red accent",
      previews: false,
    });
    expect(data(edited).revision).toBe(2);
    expect(edited.content.filter((c) => c.type === "image")).toHaveLength(0);

    const stale = await call("apply_ops", { deck_id: deck.deckId, expected_revision: 1, ops: [{ op: "set_title", title: "x" }], summary: "x" });
    expect(stale.isError).toBe(true);
    expect(data(stale).error).toContain("revision 2");

    const invalid = await call("apply_ops", { deck_id: deck.deckId, expected_revision: 2, ops: [{ op: "set_design", design: { colors: { fg: "#FFFFFE" } } }], summary: "x" });
    expect(invalid.isError).toBe(true);
    expect(data(invalid).findings[0].rule).toBe("contrast");

    const pdf = data(await call("export_deck", { deck_id: deck.deckId, format: "pdf" }));
    expect((await readFile(pdf.path)).subarray(0, 4).toString()).toBe("%PDF");

    const preview = await call("render_preview", { deck_id: deck.deckId, slide_ids: [deck.slides[0].id] });
    expect(preview.content.filter((c) => c.type === "image")).toHaveLength(1);

    expect((await call("get_history", { deck_id: deck.deckId })).isError).toBeFalsy();
    expect((await call("delete_deck", { deck_id: deck.deckId })).isError).toBe(true);
    expect(data(await call("delete_deck", { deck_id: deck.deckId, confirm: true })).deleted).toBe(deck.deckId);
    expect(existsSync(deck.presentation.path)).toBe(false);
    expect(data(await call("list_decks")).decks).toEqual([]);
  });

  it("refuses local paths on a hosted server", async () => {
    const hosted = await connect("hosted");
    const r = (await hosted.callTool({ name: "add_asset", arguments: { name: "x.svg", path: "/etc/hosts" } })) as CallToolResult;
    expect(r.isError).toBe(true);
    await hosted.close();
  });
});

describe("hosted connector", () => {
  it("offers no listings and no local only tools", async () => {
    const hosted = await connect("hosted");
    const names = (await hosted.listTools()).tools.map((t) => t.name);
    for (const t of ["list_decks", "list_assets", "list_brand_kits", "render_preview", "export_deck"]) expect(names).not.toContain(t);
    expect(names).toContain("create_deck");
    expect((await hosted.listTools()).tools.find((t) => t.name === "add_asset")!.inputSchema.properties).not.toHaveProperty("path");
    expect(hosted.getInstructions()).toBe(instructions("hosted"));
    await hosted.close();
  });

  it("links deck tools to the MCP App with a content security policy", async () => {
    const hosted = await connect("hosted");
    const tools = (await hosted.listTools()).tools;
    for (const name of ["create_deck", "apply_ops", "get_deck", "revert_deck"]) {
      expect((tools.find((t) => t.name === name)!._meta as { ui: { resourceUri: string } }).ui.resourceUri, name).toBe("ui://instadeck/deck.html");
    }
    expect(tools.find((t) => t.name === "add_asset")!._meta).toBeUndefined();
    const res = await hosted.readResource({ uri: "ui://instadeck/deck.html" });
    const c = res.contents[0] as unknown as { mimeType: string; text: string; _meta: { ui: { csp: { connectDomains: string[]; resourceDomains: string[] } } } };
    expect(c.mimeType).toBe("text/html;profile=mcp-app");
    expect(c.text).toContain('id="deck"');
    expect(c._meta.ui.csp.resourceDomains).toEqual(["https://instadeck.test", "https://fonts.googleapis.com", "https://fonts.gstatic.com"]);
    // The app takes the deck parts through an app only tool, the model does not see it.
    expect(tools.find((t) => t.name === "get_deck_view")!._meta).toEqual({ ui: { visibility: ["app"] } });
    // The local server offers the same app (Claude Desktop), assets are in the deck.
    const local = (await client.listTools()).tools;
    expect((local.find((t) => t.name === "create_deck")!._meta as { ui: { resourceUri: string } }).ui.resourceUri).toBe("ui://instadeck/deck.html");
    const lc = (await client.readResource({ uri: "ui://instadeck/deck.html" })).contents[0] as unknown as { _meta: { ui: { csp: { resourceDomains: string[] } } } };
    expect(lc._meta.ui.csp.resourceDomains).toEqual(["https://fonts.googleapis.com", "https://fonts.gstatic.com"]);
    await hosted.close();
  });

  it("creates a deck with an unguessable id and a public presentation url", async () => {
    const dir = await mkdtemp(join(tmpdir(), "instadeck-hosted-"));
    const hosted = await connect("hosted", dir);
    const logo = (await hosted.callTool({ name: "add_asset", arguments: { name: "logo.svg", data_base64: Buffer.from(LOGO_SVG).toString("base64") } })) as CallToolResult;
    const assetId = data(logo).asset.id as string;
    expect(assetId).toMatch(/^a[a-z0-9]{20}$/);
    const r = (await hosted.callTool({
      name: "create_deck",
      arguments: {
        title: "Northwind seed",
        brief: { company: "Northwind", topic: "Seed", language: "en", concept: SAMPLE_CONCEPT },
        slides: [{ layout: "title", intent: "Open", blocks: { logo: { type: "logo", assetId, alt: "Northwind" }, title: { type: "heading", level: "display", text: "Northwind" } } }],
      },
    })) as CallToolResult;
    expect(r.isError).toBeFalsy();
    const d = data(r);
    expect(d.deckId).toMatch(/^d[a-z0-9]{20}$/);
    expect(d.presentation).toEqual({ url: `https://instadeck.test/d/${d.deckId}` });
    expect(r.content.filter((c) => c.type === "image")).toHaveLength(0);
    // the rendered presentation is in the storage and has assets as data URIs (works offline and in print too)
    const html = await readFile(join(dir, "decks", d.deckId, "deck.html"), "utf8");
    expect(html).toContain("data:image/svg+xml;base64,");
    const colors = (await hosted.callTool({ name: "extract_brand_colors", arguments: { asset_id: assetId } })) as CallToolResult;
    expect(colors.isError).toBeFalsy();
    await hosted.close();
    await rm(dir, { recursive: true, force: true });
  });
});

describe("generated files (npm run gen)", () => {
  it("skill matches the current domain", async () => {
    const { skillMarkdown } = await import("@/lib/tools/skill");
    expect(await readFile("skills/instadeck/SKILL.md", "utf8")).toBe(skillMarkdown());
  });

  it("MCP App bundle matches view.html and view.ts", async () => {
    const { buildView } = await import("@/server/app/build");
    expect(await readFile("server/app/view-source.ts", "utf8")).toBe(buildView());
  });

  it("browser script modules match their sources", async () => {
    const { playerModule, measureModule } = await import("@/lib/engine/render/player-module");
    expect(await readFile("lib/engine/render/player-source.ts", "utf8")).toBe(playerModule(await readFile("lib/engine/render/player.js", "utf8")));
    expect(await readFile("lib/engine/render/measure-source.ts", "utf8")).toBe(measureModule(await readFile("lib/engine/render/measure.js", "utf8")));
  });
});

describe("claude desktop manifest", () => {
  it("lists every tool and lets the user pick the decks folder", async () => {
    const { buildManifest } = await import("@/server/manifest");
    const m = buildManifest("1.2.3");
    expect(m.version).toBe("1.2.3");
    expect(m.tools.map((t) => t.name)).toEqual(TOOLS.map((t) => t.name));
    expect(m.server.mcp_config.env.INSTADECK_HOME).toBe("${user_config.decks_folder}");
    expect(m.user_config.decks_folder.type).toBe("directory");
  });
});
