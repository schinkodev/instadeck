/**
 * Generované soubory (test hlídá, že jsou aktuální):
 *   lib/engine/render/player-source.ts  player jako řetězec, aby engine nepotřeboval fs (Lambda, prohlížeč)
 *   lib/engine/render/measure-source.ts měření přetečení jako řetězec (Chromium i MCP App)
 *   skills/instadeck/SKILL.md           skill pro Claude Code z domény
 *   docs/principles-audit.md            audit principů podle vrstev vynucení (V008)
 *   server/app/view-source.ts           MCP App (view.html + bundle view.ts) jako řetězec
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
