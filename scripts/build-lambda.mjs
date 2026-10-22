// Package for AWS Lambda: dist-lambda/index.mjs (handler index.handle) and instadeck-lambda.zip.
// No browser: puppeteer does not load in hosted mode (lib/engine/browser.ts).
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, statSync } from "node:fs";
import { build } from "esbuild";

rmSync("dist-lambda", { recursive: true, force: true });
mkdirSync("dist-lambda");
await build({
  entryPoints: ["server/lambda.ts"],
  outfile: "dist-lambda/index.mjs",
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  minify: true,
  legalComments: "none",
  external: ["puppeteer-core", "@puppeteer/browsers"],
  // Some dependencies are CommonJS and call require.
  banner: { js: "import{createRequire as __cr}from'module';const require=__cr(import.meta.url);" },
  logLevel: "warning",
});
execFileSync("zip", ["-q", "-j", "dist-lambda/instadeck-lambda.zip", "dist-lambda/index.mjs"]);
console.log(`dist-lambda/instadeck-lambda.zip ${Math.round(statSync("dist-lambda/instadeck-lambda.zip").size / 1024)} kB`);
