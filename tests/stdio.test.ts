/** A real stdio process, as Claude Code or Claude Desktop starts it. */
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { expect, it } from "vitest";

it("starts over stdio and answers", async () => {
  const home = await mkdtemp(join(tmpdir(), "instadeck-stdio-"));
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ["--import", "tsx", "server/stdio.ts"],
    env: { ...process.env, INSTADECK_HOME: home } as Record<string, string>,
    stderr: "ignore",
  });
  const client = new Client({ name: "smoke", version: "1.0.0" });
  await client.connect(transport);
  expect(client.getServerVersion()?.name).toBe("InstaDeck");
  const { tools } = await client.listTools();
  expect(tools.length).toBeGreaterThan(10);
  const r = await client.callTool({ name: "list_decks", arguments: {} });
  expect(r.structuredContent).toEqual({ decks: [] });
  await client.close();
  await rm(home, { recursive: true, force: true });
});
