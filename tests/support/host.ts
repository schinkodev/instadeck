/**
 * MCP App test host (like claude.ai): loads the app into an iframe, sends the tool result
 * and records what the app sends back (context for the model, display mode, links).
 * Bundled with esbuild in the test and runs in headless Chromium.
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
  // Like a real host: tool calls from the app go to the MCP server.
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
  // Like a real host: listen before the app sends initialize.
  await bridge.connect(new PostMessageTransport(iframe.contentWindow!, iframe.contentWindow!));
  iframe.srcdoc = html;
};
