// Build of the npm package: one ESM file dist/instadeck.js (bin).
// Dependencies stay in node_modules (--packages=external), npm installs them with the package.
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
