/**
 * Lokální MCP server přes stdio (Claude Code, Claude Desktop).
 *   claude mcp add instadeck -- npx tsx /cesta/k/instadeck/server/stdio.ts
 * Data v INSTADECK_HOME (výchozí ~/InstaDeck). Stdout patří protokolu, logy jdou na stderr.
 */
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { closeBrowser } from "@/lib/engine";
import { Store, defaultHome } from "@/lib/state";
import { Service } from "@/lib/tools";
import { createMcpServer } from "./mcp";

const home = defaultHome();
const service = new Service(Store.local(home), { browser: true });
const server = createMcpServer({ service, mode: "local" });
await server.connect(new StdioServerTransport());
console.error(`InstaDeck MCP server on stdio, data in ${home}`);

const shutdown = async () => {
  await closeBrowser();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
process.stdin.on("close", shutdown);
