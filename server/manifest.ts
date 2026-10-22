/**
 * Extension manifest for Claude Desktop (MCP Bundle, manifest 0.3), generated from the tool registry.
 * At install the user picks a folder for decks, it goes to INSTADECK_HOME.
 */
import { TOOLS } from "@/lib/tools";

export function buildManifest(version: string) {
  return {
    manifest_version: "0.3",
    name: "instadeck",
    display_name: "InstaDeck",
    version,
    description: "Branded, animated pitch decks. Claude writes the story and design, InstaDeck renders, validates and exports.",
    long_description:
      "Describe your company and topic, add your logo and brand fonts, and Claude builds a pitch deck with InstaDeck: a presentation file with slide transitions, click by click reveals, counting numbers and growing charts, plus a PDF. Everything runs on your computer, decks are folders you own.",
    author: { name: "Jakub Schinko", url: "https://instadeck.app" },
    homepage: "https://instadeck.app",
    repository: { type: "git", url: "https://github.com/schinkodev/instadeck" },
    license: "MIT",
    icon: "icon.png",
    keywords: ["pitch deck", "presentation", "slides", "brand"],
    server: {
      type: "node",
      entry_point: "dist/instadeck.js",
      mcp_config: {
        command: "node",
        args: ["${__dirname}/dist/instadeck.js"],
        env: { INSTADECK_HOME: "${user_config.decks_folder}" },
      },
    },
    user_config: {
      decks_folder: {
        type: "directory",
        title: "Decks folder",
        description: "Where InstaDeck keeps your decks. Every deck is a folder with the presentation, the PDF and its history.",
        default: "${HOME}/InstaDeck",
        required: true,
      },
    },
    tools: TOOLS.map((t) => ({ name: t.name, description: t.description })),
    tools_generated: false,
    compatibility: { platforms: ["darwin", "win32", "linux"], runtimes: { node: ">=20.0.0" } },
  };
}
