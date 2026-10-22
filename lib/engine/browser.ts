/**
 * The user's browser for layout measurement, PDF and PNG. InstaDeck runs locally and uses an installed
 * Chrome, Edge or Chromium (all of them speak the DevTools protocol). No browser download.
 *
 *   INSTADECK_CHROME              path to the browser, takes precedence
 *   INSTADECK_CHROME_NO_SANDBOX=1 turns the sandbox off (CI runners where the kernel does not allow it)
 *
 * Puppeteer loads on first use: the hosted connector (Lambda) has no browser and needs none.
 */
import { existsSync } from "node:fs";
import type { Browser, Page } from "puppeteer-core";
import { SLIDE } from "@/lib/domain";

/** Known browser locations per system, in the order we try them. */
async function candidates(): Promise<string[]> {
  const { Browser: BrowserKind, ChromeReleaseChannel, computeSystemExecutablePath } = await import("@puppeteer/browsers");
  const chrome = [ChromeReleaseChannel.STABLE, ChromeReleaseChannel.BETA, ChromeReleaseChannel.CANARY].flatMap((channel) => {
    try {
      return [computeSystemExecutablePath({ browser: BrowserKind.CHROME, channel })];
    } catch {
      // The channel does not exist on this system (e.g. Canary on Linux).
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
