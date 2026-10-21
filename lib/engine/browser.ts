/**
 * Prohlížeč uživatele pro měření layoutu, PDF a PNG. InstaDeck běží lokálně a používá nainstalovaný
 * Chrome, Edge nebo Chromium (všechny mluví DevTools protokolem). Žádné stahování prohlížeče.
 *
 *   INSTADECK_CHROME              cesta k prohlížeči, má přednost
 *   INSTADECK_CHROME_NO_SANDBOX=1 vypne sandbox (CI runnery, kde ho jádro nepovolí)
 *
 * Puppeteer se načítá až při prvním použití: hostovaný konektor (Lambda) prohlížeč nemá ani nepotřebuje.
 */
import { existsSync } from "node:fs";
import type { Browser, Page } from "puppeteer-core";
import { SLIDE } from "@/lib/domain";

/** Známá umístění prohlížečů podle systému, v pořadí, ve kterém je zkoušíme. */
async function candidates(): Promise<string[]> {
  const { Browser: BrowserKind, ChromeReleaseChannel, computeSystemExecutablePath } = await import("@puppeteer/browsers");
  const chrome = [ChromeReleaseChannel.STABLE, ChromeReleaseChannel.BETA, ChromeReleaseChannel.CANARY].flatMap((channel) => {
    try {
      return [computeSystemExecutablePath({ browser: BrowserKind.CHROME, channel })];
    } catch {
      // Kanál na tomto systému neexistuje (např. Canary na Linuxu).
      return [];
    }
  });
  const byPlatform: Record<string, string[]> = {
    darwin: ["/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge", "/Applications/Chromium.app/Contents/MacOS/Chromium", "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"],
    win32: [
      `${process.env["PROGRAMFILES(X86)"] ?? "C:\\Program Files (x86)"}\\Microsoft\\Edge\\Application\\msedge.exe`,
      `${process.env.PROGRAMFILES ?? "C:\\Program Files"}\\Microsoft\\Edge\\Application\\msedge.exe`,
    ],
    linux: ["/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/microsoft-edge", "/snap/bin/chromium"],
  };
  return [...chrome, ...(byPlatform[process.platform] ?? [])];
}

export class BrowserNotFoundError extends Error {
  constructor(tried: string[]) {
    super(
      `InstaDeck needs Google Chrome, Microsoft Edge or Chromium to measure layouts and render previews and PDFs. None was found (looked in: ${tried.join(", ")}). Install Chrome, or set INSTADECK_CHROME to the browser executable.`,
    );
  }
}

export async function findBrowser(): Promise<string> {
  const explicit = process.env.INSTADECK_CHROME;
  if (explicit) {
    if (!existsSync(explicit)) throw new Error(`INSTADECK_CHROME points to ${explicit}, which does not exist`);
    return explicit;
  }
  const all = await candidates();
  const found = all.find((p) => existsSync(p));
  if (!found) throw new BrowserNotFoundError(all);
  return found;
}

let browser: Promise<Browser> | undefined;

async function launch(): Promise<Browser> {
  const { default: puppeteer } = await import("puppeteer-core");
  const args = process.env.INSTADECK_CHROME_NO_SANDBOX === "1" ? ["--no-sandbox", "--disable-setuid-sandbox"] : [];
  return puppeteer.launch({ executablePath: await findBrowser(), headless: true, args });
}

export async function withPage<T>(html: string, fn: (page: Page) => Promise<T>, opts: { scale?: number } = {}): Promise<T> {
  browser ??= launch().catch((e) => {
    browser = undefined;
    throw e;
  });
  const page = await (await browser).newPage();
  try {
    await page.setViewport({ width: SLIDE.width, height: SLIDE.height, deviceScaleFactor: opts.scale ?? 1 });
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    return await fn(page);
  } finally {
    await page.close();
  }
}

export async function closeBrowser(): Promise<void> {
  if (!browser) return;
  const b = await browser.catch(() => undefined);
  browser = undefined;
  await b?.close();
}
