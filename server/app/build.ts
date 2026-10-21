/**
 * Sestaví MCP App: view.html s CSS režimu embed a bundlem view.ts (esbuild, IIFE, bez CDN).
 * Výsledek je modul s jedním řetězcem, server ho vrací jako resource ui://instadeck/deck.html.
 */
import { readFileSync } from "node:fs";
import { buildSync } from "esbuild";
import { MODE_CSS } from "@/lib/engine";

export function buildView(): string {
  const js = buildSync({
    entryPoints: ["server/app/view.ts"],
    bundle: true,
    write: false,
    format: "iife",
    platform: "browser",
    target: "es2022",
    minify: true,
    legalComments: "none",
    logLevel: "warning",
  }).outputFiles[0]!.text;
  const html = readFileSync("server/app/view.html", "utf8")
    .replace("/*EMBED_CSS*/", () => MODE_CSS.embed)
    // Skript nesmí ukončit vlastní <script> tag.
    .replace("/*VIEW_JS*/", () => js.replace(/<\/script/gi, "<\\/script"));
  return `// Generováno příkazem npm run gen ze server/app/view.html a view.ts. Needitovat.\nexport const VIEW_HTML = ${JSON.stringify(html)};\n`;
}
