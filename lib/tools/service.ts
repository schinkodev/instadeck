/**
 * Service: deterministické jádro tools nad state a engine, bez modelu.
 * Po každém zápisu vykreslí prezentaci do <deck>/deck.html v úložišti.
 *
 * Lokálně (prohlížeč uživatele k dispozici): prezentace je soubor, přetečení a pohyb se měří v Chromiu,
 * model dostane PNG náhledy, PDF exportuje server.
 * Hostovaně (bez prohlížeče): prezentace je na veřejné URL, měří ji MCP App v prohlížeči uživatele.
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
  /** Kde prezentaci otevřít: file:// lokálně, https:// hostovaně. */
  url: string;
  /** Cesta na disku (jen lokálně). */
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
  /** Veřejná adresa hostované části (https://instadeck.app). Bez ní je prezentace lokální soubor. */
  publicUrl?: string;
  /** Je k dispozici prohlížeč pro měření, náhledy a PDF (lokální server). */
  browser: boolean;
}

/** Kolik náhledů nejvýš vrátit po zápisu (obrázky stojí kontext klienta). */
export const MAX_PREVIEWS = 4;
const PREVIEW_SCALE = 0.4;

/** Snímek z prohlížeče patří ke starší revizi decku: stránku je potřeba načíst znovu. */
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

  /** Části decku pro MCP App v chatu. Hostovaně assety jako URL (menší než data URI), lokálně data URI. */
  async viewParts(deck: Deck): Promise<DeckParts> {
    const base = this.opts.publicUrl;
    return renderDeckParts(deck, base ? await this.store.assetsFor(deck, (m) => `${base}/a/${m.id}`) : await this.store.assetsFor(deck));
  }

  /** Samostatná prezentace s assety jako data URI: funguje offline, jde vytisknout. */
  async presentationHtml(deck: Deck): Promise<string> {
    return renderDeckHtml(deck, await this.store.assetsFor(deck), "present");
  }

  private async publish(deck: Deck): Promise<Presentation> {
    await this.store.files.put(this.store.deckKey(deck.id, "deck.html"), await this.presentationHtml(deck), { contentType: "text/html; charset=utf-8" });
    return this.presentation(deck.id);
  }

  /** Statická pravidla a (s prohlížečem) měření přetečení a pohybu. */
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

  /** Po zápisu: pohled, nálezy a (s prohlížečem) měření a náhledy změněných slidů. */
  async afterWrite(r: WriteResult, previews: boolean): Promise<{ view: DeckView; previews: Preview[] }> {
    if (!this.opts.browser) return { view: await this.view(r.deck, r.findings), previews: [] };
    const measured = await measureDeck(r.deck, await this.store.assetsFor(r.deck));
    const view = await this.view(r.deck, [...r.findings, ...measured]);
    if (!previews) return { view, previews: [] };
    // Přednost mají slidy s chybou, potom změněné. Při změně celého decku první slidy.
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

  /** PDF do souboru (lokální server). Výchozí cesta: deck.pdf ve složce decku. */
  async exportPdf(deck: Deck, path?: string): Promise<string> {
    const pdf = await exportPdf(deck, await this.store.assetsFor(deck));
    return this.writeOut(deck, "deck.pdf", pdf, path);
  }

  /** PPTX do souboru (lokální server): geometrie z Chromia. */
  async exportPptx(deck: Deck, path?: string): Promise<string> {
    const pptx = await exportPptx(deck, await this.store.assetsFor(deck));
    return this.writeOut(deck, "deck.pptx", pptx, path);
  }

  /** PPTX ze snímku, který změřil prohlížeč diváka (hostovaný odkaz). Snímek musí patřit k aktuální revizi. */
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
