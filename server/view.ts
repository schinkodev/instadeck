/**
 * MCP App: a resource with the app HTML and a link from the tools that show a deck. The hosted connector and the local
 * server (Claude Desktop). The app loads the deck with the tool get_deck_view.
 * Klienti bez MCP Apps (Claude Code) dostanou jen text s odkazem presentation.url.
 */
import { RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Service } from "@/lib/tools";
import { VIEW_HTML } from "./app/view-source";

export const VIEW_URI = "ui://instadeck/deck.html";

/** _meta of a tool: link to the app (the new and the older key per MCP Apps). */
export function viewMeta() {
  return { ui: { resourceUri: VIEW_URI }, "ui/resourceUri": VIEW_URI };
}

export function registerView(mcp: McpServer, service: Service): void {
  const origin = service.opts.publicUrl;
  const csp = {
    // Assets from the hosted part (locally they are in the deck as data URIs), fonts from Google Fonts.
    resourceDomains: [...(origin ? [origin] : []), "https://fonts.googleapis.com", "https://fonts.gstatic.com"],
  };
  mcp.registerResource("deck-view", VIEW_URI, { description: "Plays an InstaDeck presentation in the chat", mimeType: RESOURCE_MIME_TYPE }, async () => ({
    contents: [{ uri: VIEW_URI, mimeType: RESOURCE_MIME_TYPE, text: VIEW_HTML, _meta: { ui: { csp, prefersBorder: false } } }],
  }));
}
