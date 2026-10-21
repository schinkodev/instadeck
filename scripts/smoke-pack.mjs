// Ověří balíček jako uživatel: npm pack, instalace do prázdné složky, spuštění bin přes MCP klienta,
// vytvoření decku a kontrola, že vznikla složka s deck.html.
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const work = mkdtempSync(join(tmpdir(), "instadeck-pack-"));
const home = join(work, "decks");
try {
  const tgz = execFileSync("npm", ["pack", "--pack-destination", work, "--silent"], { encoding: "utf8" }).trim().split("\n").at(-1);
  writeFileSync(join(work, "package.json"), JSON.stringify({ name: "smoke", private: true }));
  execFileSync("npm", ["install", "--silent", "--no-audit", "--no-fund", join(work, tgz)], { cwd: work, stdio: "inherit" });

  const transport = new StdioClientTransport({ command: join(work, "node_modules/.bin/instadeck"), env: { ...process.env, INSTADECK_HOME: home }, stderr: "inherit" });
  const client = new Client({ name: "smoke-pack", version: "1.0.0" });
  await client.connect(transport);
  const { tools } = await client.listTools();
  const r = await client.callTool({
    name: "create_deck",
    arguments: {
      title: "Smoke Test",
      brief: { company: "Smoke", topic: "Package check", language: "en" },
      slides: [{ layout: "statement", intent: "x", blocks: { statement: { type: "heading", level: "display", text: "It ==works==." } } }],
      previews: true,
    },
  });
  if (r.isError) throw new Error(JSON.stringify(r.content));
  const file = join(home, "smoke-test", "deck.html");
  if (!existsSync(file)) throw new Error(`${file} missing`);
  const images = r.content.filter((c) => c.type === "image").length;
  console.log(`ok: ${tgz}, ${tools.length} tools, ${file}, ${images} preview`);
  await client.close();
} finally {
  rmSync(work, { recursive: true, force: true });
}
