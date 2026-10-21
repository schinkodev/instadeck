/**
 * MCP App: resource s HTML aplikace a odkaz z tools, které ukazují deck. Hostovaný konektor i lokální
 * server (Claude Desktop). Deck si aplikace načte toolem get_deck_view.
 * Klienti bez MCP Apps (Claude Code) dostanou jen text s odkazem presentation.url.
 */
import { RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Service } from "@/lib/tools";
import { VIEW_HTML } from "./app/view-source";

export const VIEW_URI = "ui://instadeck/deck.html";

/** _meta toolu: odkaz na aplikaci (nový i starší klíč podle MCP Apps). */
export function viewMeta() {
  return { ui: { resourceUri: VIEW_URI }, "ui/resourceUri": VIEW_URI };
}

export function registerView(mcp: McpServer, service: Service): void {
  const origin = service.opts.publicUrl;
  const csp = {
    // Assety z hostované části (lokálně jsou v decku jako data URI), písma z Google Fonts.
    resourceDomains: [...(origin ? [origin] : []), "https://fonts.googleapis.com", "https://fonts.gstatic.com"],
  };
  mcp.registerResource("deck-view", VIEW_URI, { description: "Plays an InstaDeck presentation in the chat", mimeType: RESOURCE_MIME_TYPE }, async () => ({
    contents: [{ uri: VIEW_URI, mimeType: RESOURCE_MIME_TYPE, text: VIEW_HTML, _meta: { ui: { csp, prefersBorder: false } } }],
  }));
}
