/** The hosted connector over HTTP: MCP client, presentation, assets, protection and the Lambda adapter. */
import { mkdtemp, rm } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { LocalFiles, Store } from "@/lib/state";
import { Service } from "@/lib/tools";
import { createHandler, RateLimiter } from "@/server/http";
import { LOGO_SVG, SAMPLE_CONCEPT } from "./fixtures/sample-deck";

let dir: string;
let server: Server;
let base: string;

function listen(handler: (r: Request) => Promise<Response>): Promise<Server> {
  const s = createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const c of req) chunks.push(c as Buffer);
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) if (typeof v === "string") headers.set(k, v);
    const r = await handler(new Request(`http://localhost${req.url}`, { method: req.method, headers, body: chunks.length ? Buffer.concat(chunks) : undefined }));
    res.writeHead(r.status, Object.fromEntries(r.headers));
    res.end(Buffer.from(await r.arrayBuffer()));
  });
  return new Promise((ok) => s.listen(0, () => ok(s)));
}

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "instadeck-http-"));
  const service = new Service(new Store(new LocalFiles(dir), { mode: "hosted" }), { browser: false, publicUrl: "https://instadeck.test" });
  server = await listen(createHandler({ service, ratePerMinute: 1000, maxBodyBytes: 512 * 1024 }));
  base = `http://localhost:${(server.address() as AddressInfo).port}`;
});
afterAll(async () => {
  server.close();
  await rm(dir, { recursive: true, force: true });
});

async function client() {
  const c = new Client({ name: "http-test", version: "1.0.0" });
  await c.connect(new StreamableHTTPClientTransport(new URL(`${base}/mcp`)));
  return c;
}

describe("hosted connector over HTTP", () => {
  it("speaks MCP, creates a deck and serves it with its assets", async () => {
    const c = await client();
    expect(c.getServerVersion()?.name).toBe("InstaDeck");
    const logo = (await c.callTool({ name: "add_asset", arguments: { name: "logo.svg", data_base64: Buffer.from(LOGO_SVG).toString("base64") } })) as CallToolResult;
    const assetId = (logo.structuredContent as { asset: { id: string } }).asset.id;
    const r = (await c.callTool({
      name: "create_deck",
      arguments: {
        title: "HTTP deck",
        brief: { company: "A", topic: "B", language: "en", concept: SAMPLE_CONCEPT },
        slides: [{ layout: "title", intent: "x", blocks: { logo: { type: "logo", assetId, alt: "A" }, title: { type: "heading", level: "display", text: "Hello" } } }],
      },
    })) as CallToolResult;
    expect(r.isError).toBeFalsy();
    const deckId = (r.structuredContent as { deckId: string }).deckId;
    await c.close();

    const page = await fetch(`${base}/d/${deckId}`);
    expect(page.status).toBe(200);
    expect(page.headers.get("content-type")).toContain("text/html");
    expect(await page.text()).toContain("mountInstaDeck");

    const a = await fetch(`${base}/a/${assetId}`);
    expect(a.headers.get("content-type")).toBe("image/svg+xml");
    expect(a.headers.get("access-control-allow-origin")).toBe("*");
    expect(await a.text()).toBe(LOGO_SVG);

    const missing = await fetch(`${base}/d/dnope`);
    expect(missing.status).toBe(404);
    expect(await missing.text()).toContain("This deck is not here");
    expect((await fetch(`${base}/health`)).status).toBe(200);
    expect((await fetch(`${base}/mcp`)).status).toBe(405);
  });

  it("refuses oversized requests", async () => {
    const r = await fetch(`${base}/mcp`, { method: "POST", headers: { "content-type": "application/json" }, body: "x".repeat(600 * 1024) });
    expect(r.status).toBe(413);
  });
});

describe("rate limiter", () => {
  it("allows the limit per minute per key", () => {
    const l = new RateLimiter(2);
    expect([l.allow("a", 0), l.allow("a", 1), l.allow("a", 2), l.allow("b", 2)]).toEqual([true, true, false, true]);
    expect(l.allow("a", 60_001)).toBe(true);
  });
});

describe("lambda adapter", () => {
  it("turns function url events into the same handler", async () => {
    process.env.STATE_BACKEND = "local";
    process.env.INSTADECK_HOSTED_DIR = dir;
    process.env.INSTADECK_PUBLIC_URL = "https://instadeck.test";
    const { handle } = await import("@/server/lambda");
    const event = (method: string, path: string, body?: string) => ({
      rawPath: path,
      rawQueryString: "",
      headers: { host: "abc.lambda-url.eu-central-1.on.aws", "content-type": "application/json", accept: "application/json, text/event-stream" },
      body,
      isBase64Encoded: false,
      requestContext: { http: { method, sourceIp: "1.2.3.4" } },
    });
    const health = await handle(event("GET", "/health"));
    expect(health.statusCode).toBe(200);
    expect(JSON.parse(health.body).status).toBe("ok");
    const init = await handle(
      event("POST", "/mcp", JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "t", version: "1" } } })),
    );
    expect(init.statusCode).toBe(200);
    expect(JSON.parse(init.body).result.serverInfo.name).toBe("InstaDeck");
  });
});
