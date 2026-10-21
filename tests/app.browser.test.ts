/**
 * MCP App end to end: hostovaný konektor na localhostu, testovací hostitel (AppBridge) v Chromiu,
 * aplikace v iframe stáhne části decku, vykreslí je, změří přetečení a pošle výsledek modelu.
 */
import { mkdtemp, rm } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildSync } from "esbuild";
import puppeteer, { type Browser } from "puppeteer-core";
import { afterAll, beforeAll, expect, it } from "vitest";
import { findBrowser } from "@/lib/engine/browser";
import { LocalFiles, Store } from "@/lib/state";
import { Service } from "@/lib/tools";
import { VIEW_HTML } from "@/server/app/view-source";
import { createHandler } from "@/server/http";

let dir: string;
let server: Server;
let browser: Browser;
let service: Service;

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "instadeck-app-"));
  let handler: (r: Request) => Promise<Response> = async () => new Response("starting", { status: 503 });
  server = createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const c of req) chunks.push(c as Buffer);
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) if (typeof v === "string") headers.set(k, v);
    const r = await handler(new Request(`http://localhost${req.url}`, { method: req.method, headers, body: chunks.length ? Buffer.concat(chunks) : undefined }));
    res.writeHead(r.status, Object.fromEntries(r.headers));
    res.end(Buffer.from(await r.arrayBuffer()));
  });
  await new Promise<void>((ok) => server.listen(0, ok));
  const publicUrl = `http://localhost:${(server.address() as AddressInfo).port}`;
  service = new Service(new Store(new LocalFiles(dir), { mode: "hosted" }), { browser: false, publicUrl });
  handler = createHandler({ service });
  browser = await puppeteer.launch({ executablePath: await findBrowser(), args: process.env.INSTADECK_CHROME_NO_SANDBOX === "1" ? ["--no-sandbox"] : [] });
});

afterAll(async () => {
  await browser?.close();
  server.close();
  await rm(dir, { recursive: true, force: true });
});

it("renders the deck in the chat, reports overflow and motion to the model and plays", async () => {
  const long = "Northwind turns curtailed wind into revenue for grid operators across every European market ".repeat(6);
  const r = await service.store.createDeck(
    {
      title: "App deck",
      brief: { company: "Northwind", topic: "Seed", language: "en" },
      slides: [
        { layout: "statement", intent: "hook", blocks: { statement: { type: "heading", level: "display", text: "Every green ==electron==, used." } } },
        { layout: "points", intent: "too long", blocks: { title: { type: "heading", level: "h1", text: long }, body: { type: "text", size: "body", text: "x" } } },
      ],
    },
    "mcp",
  );
  const view = await service.view(r.deck);
  const host = buildSync({ entryPoints: ["tests/support/host.ts"], bundle: true, write: false, format: "iife", platform: "browser", logLevel: "warning" }).outputFiles[0]!.text;

  const page = await browser.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.setContent(`<!doctype html><html><body><script>${host}</script></body></html>`);
  await page.evaluate(
    (html, result, mcp) => window.startHost(html, result, mcp),
    VIEW_HTML,
    { content: [{ type: "text", text: "created" }], structuredContent: { deckId: view.deckId, revision: view.revision, presentation: view.presentation } },
    `${new URL(view.presentation.url).origin}/mcp`,
  );
  await page.waitForFunction(() => window.hostLog.context.length > 0, { timeout: 20_000 });
  const log = await page.evaluate(() => window.hostLog);
  expect(log.initialized).toBe(true);
  const ctx = log.context[0] as { content: { text: string }[]; structuredContent: { overflow: { slideId: string }[]; motion: unknown[] } };
  expect(ctx.content[0]!.text).toContain("Fix these with apply_ops");
  expect(ctx.content[0]!.text).toMatch(/- error overflow, slide /);
  expect(ctx.structuredContent.motion).toEqual([]);
  expect(ctx.content[0]!.text).toContain("zone title");
  expect(new Set(ctx.structuredContent.overflow.map((o) => o.slideId))).toEqual(new Set([r.deck.slides[1]!.id]));

  const frame = page.frames().find((f) => f !== page.mainFrame())!;
  await frame.waitForSelector(".slide.is-active");
  expect(await frame.$$eval(".slide", (s) => s.length)).toBe(2);
  expect(await frame.$eval("#status", (s) => (s as HTMLElement).hidden)).toBe(true);

  // V chatu ovládání playeru: celá obrazovka přes hostitele, úprava slidu zprávou, bez okna řečníka a bez stahování.
  expect(await frame.$$eval(".controls .ctl", (b) => b.map((x) => x.getAttribute("aria-label")))).toEqual(["Previous (Left arrow)", "Next (Right arrow)", "All slides (G)", "Speaker notes (N)", "Full screen (F)", "Change this slide"]);
  await frame.$eval(".ctl-full", (b) => (b as HTMLButtonElement).click());
  await frame.click("#open");
  // Upravit slide z chatu: zpráva modelu s deckem a slidem.
  await frame.$eval(".ctl-edit", (b) => (b as HTMLButtonElement).click());
  await frame.type(".ask textarea", "Shorten the headline");
  await frame.$eval(".ask button[type=submit]", (b) => (b as HTMLButtonElement).click());
  await page.waitForFunction(() => window.hostLog.messages.length > 0);
  const message = (await page.evaluate(() => window.hostLog.messages[0])) as { role: string; content: { text: string }[] };
  expect(message.role).toBe("user");
  expect(message.content[0]!.text).toBe(`Change slide 1 of deck ${view.deckId} (slide_id ${r.deck.slides[0]!.id}): Shorten the headline`);
  await page.waitForFunction(() => window.hostLog.links.length > 0);
  const after = await page.evaluate(() => window.hostLog);
  expect(after.displayModes).toEqual(["fullscreen"]);
  expect(after.links).toEqual([view.presentation.url]);
  expect(errors).toEqual([]);
});

it("downloads a PowerPoint from the shared link, measured in the viewer's browser", async () => {
  const r = await service.store.createDeck(
    {
      title: "Link deck",
      brief: { company: "Northwind", topic: "Seed", language: "en" },
      slides: [
        { layout: "statement", intent: "hook", blocks: { statement: { type: "heading", level: "display", text: "Every green ==electron==, used." } } },
        { layout: "chart", intent: "growth", notes: "Say the number.", blocks: { title: { type: "heading", level: "h1", text: "Revenue tripled" }, chart: { type: "chart", kind: "column", categories: ["Q1", "Q2", "Q3"], series: [{ name: "ARR", values: [1, 2, 3] }], highlight: 2 } } },
      ],
    },
    "mcp",
  );
  const view = await service.view(r.deck);
  const page = await browser.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(view.presentation.url);
  await page.waitForFunction(() => document.querySelector(".slide.is-active"));
  const labels = await page.$$eval(".ctl-menu b", (b) => b.map((x) => x.textContent));
  expect(labels).toEqual(["PDF", "PowerPoint", "HTML"]);
  // Soubor se neukládá: zachytí se blob, který by stránka stáhla.
  await page.evaluate(() => {
    const w = window as unknown as { saved: { size: number; type: string; name: string }[] };
    w.saved = [];
    let last: Blob | undefined;
    const create = URL.createObjectURL;
    URL.createObjectURL = (b: Blob | MediaSource) => {
      last = b as Blob;
      return create(b);
    };
    HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
      if (last) w.saved.push({ size: last.size, type: last.type, name: this.download });
    };
  });
  const response = page.waitForResponse((res) => res.url().endsWith("/deck.pptx"));
  await page.$$eval(".ctl-menu button", (b) => (b[1] as HTMLButtonElement).click());
  const res = await response;
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("presentationml");
  await page.waitForFunction(() => (window as unknown as { saved: unknown[] }).saved.length > 0);
  const saved = await page.evaluate(() => (window as unknown as { saved: { size: number; type: string; name: string }[] }).saved[0]!);
  expect(saved.name).toBe("link-deck.pptx");
  expect(saved.type).toContain("presentationml");
  expect(saved.size).toBeGreaterThan(10_000);
  expect(errors).toEqual([]);
  await page.close();
});
