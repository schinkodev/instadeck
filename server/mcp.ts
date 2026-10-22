/**
 * MCP server: tools from lib/tools, resources from the domain, a prompt and instructions.
 * A generic MCP server by the standard, it assumes no particular client.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { ValidationError } from "@/lib/state";
import { TOOLS, type ToolContext, type ToolDef, type ToolOutput } from "@/lib/tools";
import pkg from "../package.json" with { type: "json" };
import { instructions } from "./instructions";
import { registerResources } from "./resources";
import { registerView, viewMeta } from "./view";

export const SERVER_VERSION: string = pkg.version;

export function toResult(out: ToolOutput): CallToolResult {
  return {
    content: [
      { type: "text", text: out.text ?? JSON.stringify(out.data, null, 2) },
      ...(out.images ?? []).flatMap((img) => [
        { type: "text" as const, text: img.caption },
        { type: "image" as const, data: Buffer.from(img.png).toString("base64"), mimeType: "image/png" },
      ]),
    ],
    structuredContent: out.data,
  };
}

export function toError(tool: string, err: unknown): CallToolResult {
  const body =
    err instanceof ValidationError
      ? { error: err.message, findings: err.findings.filter((f) => f.severity === "error") }
      : { error: `${tool}: ${err instanceof Error ? err.message : String(err)}` };
  return { isError: true, content: [{ type: "text", text: JSON.stringify(body, null, 2) }], structuredContent: body };
}

export async function callTool(t: ToolDef, args: unknown, ctx: ToolContext): Promise<CallToolResult> {
  try {
    return toResult(await t.run(args as never, ctx));
  } catch (err) {
    return toError(t.name, err);
  }
}

/** Tools available in a mode (local server, or hosted connector). */
export function toolsFor(mode: ToolContext["mode"]): ToolDef[] {
  return TOOLS.filter((t) => !t.modes || t.modes.includes(mode));
}

export function createMcpServer(ctx: ToolContext): McpServer {
  const mcp = new McpServer({ name: "InstaDeck", version: SERVER_VERSION }, { instructions: instructions(ctx.mode) });

  for (const t of toolsFor(ctx.mode)) {
    const meta = t.view ? { _meta: viewMeta() } : t.audience === "app" ? { _meta: { ui: { visibility: ["app"] } } } : {};
    mcp.registerTool(t.name, { title: t.title, description: t.description, inputSchema: z.strictObject(t.input), annotations: { title: t.title, ...t.annotations }, ...meta }, ((args: unknown) =>
      callTool(t, args, ctx)) as never);
  }

  registerResources(mcp, ctx.service, ctx.mode);
  registerView(mcp, ctx.service);

  mcp.registerPrompt(
    "create_pitch_deck",
    {
      title: "Create a pitch deck",
      description: "Start a branded pitch deck from a company and a topic",
      argsSchema: {
        company: z.string().describe("Company or product"),
        topic: z.string().describe("What the deck is for, e.g. seed round, sales pitch"),
        audience: z.string().optional(),
        language: z.string().optional().describe("Language of the slides, default English"),
      },
    },
    (a) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: [
              `Create a pitch deck for ${a.company}. Topic: ${a.topic}.${a.audience ? ` Audience: ${a.audience}.` : ""} Slide language: ${a.language ?? "en"}.`,
              "Follow the InstaDeck workflow: read get_design_guide, set up the brand from any logo or brand files I share, plan the story, create the deck, fix the findings, then hand me the presentation.",
            ].join("\n"),
          },
        },
      ],
    }),
  );

  return mcp;
}
