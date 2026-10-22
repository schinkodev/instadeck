/**
 * Service: the deterministic core of the tools over state and engine, without a model.
 * After every write it renders the presentation into <deck>/deck.html in the storage.
 *
 * Locally (the user's browser is available): the presentation is a file, overflow and motion are measured in Chromium,
 * the model gets PNG previews, the server exports PDF.
 * Hosted (no browser): the presentation is at a public URL, the MCP App measures it in the user's browser.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { pathToFileURL } from "node:url";
import type { Deck } from "@/lib/domain";
import { buildPptx, exportPdf, exportPptx, measureDeck, renderDeckHtml, renderDeckParts, renderPng, validateDeck, type DeckParts, type Finding, type SlideSnapshot } from "@/lib/engine";
import type { Store, WriteResult } from "@/lib/state";

export interface Preview {
  slideId: string;
  index: number;
  png: Uint8Array;
}

export interface Presentation {
  /** Where to open the presentation: file:// locally, https:// hosted. */
  url: string;
  /** Path on disk (local only). */
  path?: string;
}

export interface DeckView {
  deckId: string;
  title: string;
  revision: number;
  slides: { id: string; index: number; layout: string; intent: string }[];
  findings: Finding[];
  presentation: Presentation;
}

export interface ServiceOptions {
  /** Public address of the hosted part (https://instadeck.app). Without it the presentation is a local file. */
  publicUrl?: string;
  /** A browser is available for measurement, previews and PDF (local server). */
  browser: boolean;
}

/** How many previews to return at most after a write (images cost the client's context). */
export const MAX_PREVIEWS = 4;
const PREVIEW_SCALE = 0.4;

/** The browser snapshot belongs to an older deck revision: the page must be reloaded. */
export class StaleSnapshotError extends Error {
  constructor(readonly revision: number) {
    super(`The deck changed (now revision ${revision}). Reload the page and download again`);
  }
}

export class Service {
  constructor(
    readonly store: Store,
    readonly opts: ServiceOptions,
  ) {}

  presentation(deckId: string): Presentation {
    const key = this.store.deckKey(deckId, "deck.html");
    if (this.opts.publicUrl) return { url: `${this.opts.publicUrl}/d/${deckId}` };
    const path = this.store.files.localPath!(key);
    return { url: pathToFileURL(path).href, path };
  }

  /** Deck parts for the MCP App in the chat. Hosted assets as URLs (smaller than data URIs), locally data URIs. */
  async viewParts(deck: Deck): Promise<DeckParts> {
    const base = this.opts.publicUrl;
    return renderDeckParts(deck, base ? await this.store.assetsFor(deck, (m) => `${base}/a/${m.id}`) : await this.store.assetsFor(deck));
  }

  /** Standalone presentation with assets as data URIs: works offline, can be printed. */
  async presentationHtml(deck: Deck): Promise<string> {
    return renderDeckHtml(deck, await this.store.assetsFor(deck), "present");
  }

  private async publish(deck: Deck): Promise<Presentation> {
    await this.store.files.put(this.store.deckKey(deck.id, "deck.html"), await this.presentationHtml(deck), { contentType: "text/html; charset=utf-8" });
    return this.presentation(deck.id);
  }

  /** Static rules and (with a browser) measurement of overflow and motion. */
  async findings(deck: Deck): Promise<Finding[]> {
    const rules = validateDeck(deck, await this.store.assetIndex(deck));
    return this.opts.browser ? [...rules, ...(await measureDeck(deck, await this.store.assetsFor(deck)))] : rules;
  }

  async view(deck: Deck, findings?: Finding[]): Promise<DeckView> {
    return {
      deckId: deck.id,
      title: deck.title,
      revision: deck.revision,
      slides: deck.slides.map((s, index) => ({ id: s.id, index, layout: s.layout, intent: s.intent })),
      findings: findings ?? (await this.findings(deck)),
      presentation: await this.publish(deck),
    };
  }

  /** After a write: the view, findings and (with a browser) measurement and previews of changed slides. */
  async afterWrite(r: WriteResult, previews: boolean): Promise<{ view: DeckView; previews: Preview[] }> {
    if (!this.opts.browser) return { view: await this.view(r.deck, r.findings), previews: [] };
    const measured = await measureDeck(r.deck, await this.store.assetsFor(r.deck));
    const view = await this.view(r.deck, [...r.findings, ...measured]);
    if (!previews) return { view, previews: [] };
    // Slides with an error come first, then changed ones. When the whole deck changed, the first slides.
    const flagged = view.findings.filter((f) => f.severity === "error" && f.slideId).map((f) => f.slideId!);
    const changed = r.global && r.touched.length === 0 ? r.deck.slides.slice(0, 2).map((s) => s.id) : r.touched;
    const ids = [...new Set([...flagged, ...changed])].slice(0, MAX_PREVIEWS);
    return { view, previews: await this.previews(r.deck, ids) };
  }

  async previews(deck: Deck, slideIds: string[]): Promise<Preview[]> {
    const indexes = slideIds.map((id) => {
      const i = deck.slides.findIndex((s) => s.id === id);
      if (i < 0) throw new Error(`Slide ${id} is not in deck ${deck.id}`);
      return i;
    });
    if (indexes.length === 0) return [];
    const pngs = await renderPng(deck, await this.store.assetsFor(deck), indexes, PREVIEW_SCALE);
    return pngs.map((png, k) => ({ slideId: slideIds[k]!, index: indexes[k]!, png }));
  }

  /** PDF to a file (local server). Default path: deck.pdf in the deck folder. */
  async exportPdf(deck: Deck, path?: string): Promise<string> {
    const pdf = await exportPdf(deck, await this.store.assetsFor(deck));
    return this.writeOut(deck, "deck.pdf", pdf, path);
  }

  /** PPTX to a file (local server): geometry from Chromium. */
  async exportPptx(deck: Deck, path?: string): Promise<string> {
    const pptx = await exportPptx(deck, await this.store.assetsFor(deck));
    return this.writeOut(deck, "deck.pptx", pptx, path);
  }

  /** PPTX from a snapshot measured by the viewer's browser (hosted link). The snapshot must belong to the current revision. */
  async pptxFromSnapshot(deck: Deck, revision: number, slides: SlideSnapshot[]): Promise<Uint8Array> {
    if (revision !== deck.revision) throw new StaleSnapshotError(deck.revision);
    return buildPptx(deck, slides, await this.store.assetsFor(deck));
  }

  async exportHtml(deck: Deck, path?: string): Promise<string> {
    return this.writeOut(deck, "deck.html", await this.presentationHtml(deck), path);
  }

  private async writeOut(deck: Deck, name: string, data: Uint8Array | string, path?: string): Promise<string> {
    if (path) {
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, data);
      return path;
    }
    const key = this.store.deckKey(deck.id, name);
    await this.store.files.put(key, data);
    return this.store.files.localPath!(key);
  }
}
