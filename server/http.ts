/**
 * The hosted connector as one Request to Response handler (Web standard): the same code locally
 * (server/serve.ts) and in Lambda (server/lambda.ts).
 *
 *   POST /mcp      MCP Streamable HTTP, stateless (server and transport per request)
 *   GET  /d/<id>   deck presentation (standalone HTML, can be printed to PDF)
 *   POST /d/<id>/deck.pptx  PowerPoint from a snapshot measured by the viewer's browser (no browser on the server)
 *   GET  /a/<id>   asset (image, font) for the MCP App
 *   GET  /health   stav a verze
 *
 * No sign in: deck and asset ids are unguessable. Protection: a rate limit per IP, a body size limit.
 */
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { exportRequestSchema } from "@/lib/engine";
import { NotFoundError } from "@/lib/state";
import { StaleSnapshotError, type Service } from "@/lib/tools";
import { createMcpServer, SERVER_VERSION } from "./mcp";

export interface HttpOptions {
  service: Service;
  /** Allowed calls to /mcp per minute per IP address. */
  ratePerMinute?: number;
  /** Largest request body for /mcp (create_deck with slides and a small base64 logo). */
  maxBodyBytes?: number;
}

const WINDOW_MS = 60_000;

/** A sliding window in the instance memory. Lambda has several instances, so the limit is per instance (V004). */
export class RateLimiter {
  private readonly hits = new Map<string, number[]>();
  constructor(readonly limit: number) {}

  allow(key: string, now = Date.now()): boolean {
    const recent = (this.hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
    if (recent.length >= this.limit) {
      this.hits.set(key, recent);
      return false;
    }
    recent.push(now);
    this.hits.set(key, recent);
    if (this.hits.size > 10_000) for (const [k, v] of this.hits) if (v.every((t) => now - t >= WINDOW_MS)) this.hits.delete(k);
    return true;
  }
}

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });

const CORS = { "access-control-allow-origin": "*" };

function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

const NOT_FOUND_PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Deck not found | InstaDeck</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;color:#111;background:#FFF}main{max-width:480px;padding:24px}h1{font-size:28px;letter-spacing:-0.02em;margin:0 0 12px}p{color:#555E70;line-height:1.6}a{color:#B86B6B}</style></head>
<body><main><h1>This deck is not here</h1><p>The link may be mistyped, or the deck expired. Decks on the hosted connector are kept for 30 days. Ask Claude to build it again, or <a href="https://instadeck.app">learn about InstaDeck</a>.</p></main></body></html>`;

export function createHandler(opts: HttpOptions): (req: Request) => Promise<Response> {
  const { service } = opts;
  const limiter = new RateLimiter(opts.ratePerMinute ?? 60);
  const maxBody = opts.maxBodyBytes ?? 4 * 1024 * 1024;

  async function mcp(req: Request): Promise<Response> {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: { ...CORS, "access-control-allow-methods": "POST, OPTIONS", "access-control-allow-headers": "content-type, mcp-protocol-version, accept" } });
    }
    if (req.method !== "POST") return json(405, { error: "Use POST for MCP requests" }, { allow: "POST", ...CORS });
    if (!limiter.allow(clientIp(req))) return json(429, { error: "Too many requests, try again in a minute" }, { "retry-after": "60", ...CORS });
    const body = await req.arrayBuffer();
    if (body.byteLength > maxBody) return json(413, { error: `Request is larger than ${Math.round(maxBody / 1024 / 1024)} MB. Send large files by url` }, CORS);
    const server = createMcpServer({ service, mode: "hosted" });
    const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    await server.connect(transport);
    try {
      const res = await transport.handleRequest(new Request(req.url, { method: "POST", headers: req.headers, body }));
      const headers = new Headers(res.headers);
      for (const [k, v] of Object.entries(CORS)) headers.set(k, v);
      return new Response(await res.arrayBuffer(), { status: res.status, headers });
    } finally {
      await transport.close();
      await server.close();
    }
  }

  async function deck(id: string): Promise<Response> {
    try {
      const html = await service.store.files.get(service.store.deckKey(id, "deck.html"));
      if (!html) throw new NotFoundError(id);
      return new Response(Buffer.from(html), { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-cache", "x-robots-tag": "noindex" } });
    } catch (e) {
      if (e instanceof NotFoundError) return new Response(NOT_FOUND_PAGE, { status: 404, headers: { "content-type": "text/html; charset=utf-8" } });
      throw e;
    }
  }

  /**
   * PowerPoint: the viewer's browser measured the rendered slides (snapshotInstaDeck) and sends the snapshot,
   * the server assembles the file from it and the deck. Stateless, no Chromium.
   */
  async function pptx(req: Request, id: string): Promise<Response> {
    if (req.method !== "POST") return json(405, { error: "Use POST with the measured slides" }, { allow: "POST" });
    if (!limiter.allow(clientIp(req))) return json(429, { error: "Too many requests, try again in a minute" }, { "retry-after": "60" });
    const body = await req.arrayBuffer();
    if (body.byteLength > maxBody) return json(413, { error: "The measured slides are too large" });
    const parsed = exportRequestSchema.safeParse(JSON.parse(new TextDecoder().decode(body) || "null"));
    if (!parsed.success) return json(400, { error: "The measured slides are not valid", issues: parsed.error.issues.slice(0, 5) });
    try {
      const deck = await service.store.getDeck(id);
      const file = await service.pptxFromSnapshot(deck, parsed.data.revision, parsed.data.slides);
      return new Response(Buffer.from(file), {
        headers: {
          "content-type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          "content-disposition": `attachment; filename="${id}.pptx"`,
          "cache-control": "no-store",
        },
      });
    } catch (e) {
      if (e instanceof NotFoundError) return json(404, { error: "Deck not found" });
      if (e instanceof StaleSnapshotError) return json(409, { error: e.message });
      throw e;
    }
  }

  async function asset(id: string): Promise<Response> {
    try {
      const { meta, bytes } = await service.store.getAsset(id);
      return new Response(Buffer.from(bytes), { headers: { "content-type": meta.mime, "cache-control": "public, max-age=31536000, immutable", ...CORS } });
    } catch (e) {
      if (e instanceof NotFoundError) return json(404, { error: "Asset not found" }, CORS);
      throw e;
    }
  }

  return async (req: Request) => {
    const path = new URL(req.url).pathname;
    try {
      if (path === "/mcp") return await mcp(req);
      if (path === "/health") return json(200, { status: "ok", version: SERVER_VERSION });
      const x = /^\/d\/([a-z0-9-]+)\/deck\.pptx$/i.exec(path);
      if (x) return await pptx(req, x[1]!);
      if (req.method !== "GET" && req.method !== "HEAD") return json(405, { error: "Method not allowed" });
      const d = /^\/d\/([a-z0-9-]+)$/i.exec(path);
      if (d) return await deck(d[1]!);
      const a = /^\/a\/([a-z0-9]+)$/i.exec(path);
      if (a) return await asset(a[1]!);
      return json(404, { error: "Not found" });
    } catch (e) {
      console.error(`${req.method} ${path}`, e);
      return json(500, { error: "Internal error" });
    }
  };
}
