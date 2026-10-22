// Načte postavený balíček pro Lambdu a zavolá ho jako Function URL: /health, MCP initialize a tools/list,
// založení decku a /d/<id>. Úložiště na disku, bez AWS.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const dir = mkdtempSync(join(tmpdir(), "instadeck-lambda-"));
process.env.STATE_BACKEND = "local";
process.env.INSTADECK_HOSTED_DIR = dir;
process.env.INSTADECK_PUBLIC_URL = "https://instadeck.example";
const { handle } = await import(pathToFileURL("dist-lambda/index.mjs").href);

const event = (method, path, body) => ({
  rawPath: path,
  rawQueryString: "",
  headers: { host: "x.lambda-url.eu-central-1.on.aws", "content-type": "application/json", accept: "application/json, text/event-stream" },
  body: body === undefined ? undefined : JSON.stringify(body),
  isBase64Encoded: false,
  requestContext: { http: { method, sourceIp: "1.2.3.4" } },
});
const rpc = async (id, method, params) => {
  const r = await handle(event("POST", "/mcp", { jsonrpc: "2.0", id, method, params }));
  if (r.statusCode !== 200) throw new Error(`${method}: HTTP ${r.statusCode} ${r.body}`);
  return JSON.parse(r.body).result;
};
try {
  const health = await handle(event("GET", "/health"));
  if (health.statusCode !== 200) throw new Error(`health ${health.statusCode}`);
  await rpc(1, "initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "smoke", version: "1" } });
  const { tools } = await rpc(2, "tools/list", {});
  const created = await rpc(3, "tools/call", {
    name: "create_deck",
    arguments: { title: "Smoke", brief: { company: "S", topic: "t", language: "en", concept: { idea: "A plain smoke test deck with one statement", avoid: "Anything decorative", signature: "One statement" } }, slides: [{ layout: "statement", intent: "x", blocks: { statement: { type: "heading", level: "display", text: "Hi" } } }] },
  });
  if (created.isError) throw new Error(JSON.stringify(created.content));
  const page = await handle(event("GET", `/d/${created.structuredContent.deckId}`));
  if (page.statusCode !== 200 || !page.body.includes("mountInstaDeck")) throw new Error(`deck page ${page.statusCode}`);
  console.log(`ok: lambda bundle, ${tools.length} tools, deck ${created.structuredContent.deckId}`);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
