/**
 * Generated files (a test checks they are up to date):
 *   lib/engine/render/player-source.ts  the player as a string, so the engine does not need fs (Lambda, browser)
 *   lib/engine/render/measure-source.ts overflow measurement as a string (Chromium and the MCP App)
 *   skills/instadeck/SKILL.md           the Claude Code skill from the domain
 *   docs/principles-audit.md            audit of principles by enforcement layer (V008)
 *   server/app/view-source.ts           the MCP App (view.html + bundle of view.ts) as a string
 */
import { readFileSync, writeFileSync } from "node:fs";
import { measureModule, playerModule } from "@/lib/engine/render/player-module";
import { auditMarkdown } from "@/lib/tools/audit";
import { skillMarkdown } from "@/lib/tools/skill";
import { buildView } from "@/server/app/build";

writeFileSync("lib/engine/render/player-source.ts", playerModule(readFileSync("lib/engine/render/player.js", "utf8")));
writeFileSync("lib/engine/render/measure-source.ts", measureModule(readFileSync("lib/engine/render/measure.js", "utf8")));
writeFileSync("skills/instadeck/SKILL.md", skillMarkdown());
writeFileSync("server/app/view-source.ts", buildView());
writeFileSync("docs/principles-audit.md", auditMarkdown());
