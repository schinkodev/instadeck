/**
 * Testovací hostitel MCP App (jako claude.ai): načte aplikaci do iframe, pošle výsledek toolu
 * a zaznamená, co aplikace pošle zpět (kontext pro model, režim zobrazení, odkazy).
 * Bundluje se esbuildem v testu a běží v headless Chromiu.
 */
import { AppBridge, PostMessageTransport } from "@modelcontextprotocol/ext-apps/app-bridge";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

declare global {
  interface Window {
    hostLog: { context: unknown[]; displayModes: string[]; links: string[]; messages: unknown[]; initialized: boolean };
    startHost(html: string, toolResult: Record<string, unknown>, mcpUrl: string): Promise<void>;
  }
}

window.hostLog = { context: [], displayModes: [], links: [], messages: [], initialized: false };

window.startHost = async (html, toolResult, mcpUrl) => {
  // Jako skutečný hostitel: volání tools z aplikace jdou na MCP server.
  const client = new Client({ name: "TestHost", version: "1.0.0" });
  await client.connect(new StreamableHTTPClientTransport(new URL(mcpUrl)));
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "width:960px;height:540px;border:0";
  document.body.appendChild(iframe);
  const bridge = new AppBridge(client, { name: "TestHost", version: "1.0.0" }, { openLinks: {}, updateModelContext: { text: {} }, message: { text: {} }, serverTools: {} });
  bridge.onmessage = async (p) => {
    window.hostLog.messages.push(p);
    return {};
  };
  bridge.onupdatemodelcontext = async (p) => {
    window.hostLog.context.push(p);
    return {};
  };
  bridge.onrequestdisplaymode = async (p) => {
    window.hostLog.displayModes.push(p.mode);
    return { mode: p.mode };
  };
  bridge.onopenlink = async (p) => {
    window.hostLog.links.push(p.url);
    return {};
  };
  bridge.oninitialized = () => {
    window.hostLog.initialized = true;
    void bridge.sendToolResult(toolResult as never);
  };
  // Jako skutečný hostitel: naslouchat dřív, než aplikace pošle initialize.
  await bridge.connect(new PostMessageTransport(iframe.contentWindow!, iframe.contentWindow!));
  iframe.srcdoc = html;
};
