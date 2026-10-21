// Build balíčku pro npm: jeden ESM soubor dist/instadeck.js (bin).
// Závislosti zůstávají v node_modules (--packages=external), npm je nainstaluje s balíčkem.
import { chmodSync, mkdirSync, rmSync } from "node:fs";
import { build } from "esbuild";

rmSync("dist", { recursive: true, force: true });
mkdirSync("dist");
await build({
  entryPoints: ["server/stdio.ts"],
  outfile: "dist/instadeck.js",
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  packages: "external",
  banner: { js: "#!/usr/bin/env node" },
  logLevel: "warning",
});
chmodSync("dist/instadeck.js", 0o755);
console.log("dist/instadeck.js");
