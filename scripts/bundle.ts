/**
 * Rozšíření pro Claude Desktop: dist-bundle/instadeck.mcpb.
 * Build, složka s produkčními závislostmi, manifest z registru tools, ikona z brand/mark.svg, validace a pack.
 */
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import puppeteer from "puppeteer-core";
import { findBrowser } from "@/lib/engine/browser";
import { buildManifest } from "@/server/manifest";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const stage = "dist-bundle/stage";
rmSync("dist-bundle", { recursive: true, force: true });
mkdirSync(stage, { recursive: true });

execFileSync("npm", ["run", "-s", "build"], { stdio: "inherit" });
cpSync("dist", `${stage}/dist`, { recursive: true });
cpSync("LICENSE", `${stage}/LICENSE`);
cpSync("package-lock.json", `${stage}/package-lock.json`);
writeFileSync(`${stage}/package.json`, JSON.stringify({ name: pkg.name, version: pkg.version, type: "module", license: pkg.license, dependencies: pkg.dependencies }, null, 2));
execFileSync("npm", ["ci", "--omit=dev", "--ignore-scripts", "--no-audit", "--no-fund", "--silent"], { cwd: stage, stdio: "inherit" });
writeFileSync(`${stage}/manifest.json`, JSON.stringify(buildManifest(pkg.version), null, 2));

const browser = await puppeteer.launch({ executablePath: await findBrowser(), headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 512, height: 512 });
await page.setContent(`<html><body style="margin:0;background:transparent">${readFileSync("brand/mark.svg", "utf8")}</body></html>`);
writeFileSync(`${stage}/icon.png`, await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: 512, height: 512 } }));
await browser.close();

const mcpb = "node_modules/.bin/mcpb";
execFileSync(mcpb, ["validate", `${stage}/manifest.json`], { stdio: "inherit" });
execFileSync(mcpb, ["pack", stage, "dist-bundle/instadeck.mcpb"], { stdio: "inherit" });
