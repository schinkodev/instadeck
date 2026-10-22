/**
 * Deck storage over Files (locally the INSTADECK_HOME folder, hosted S3). Keys:
 *
 *   <deck>/deck.json                  current state (hosted under decks/, because of the S3 expiration rule)
 *   <deck>/.revisions/<n>.json        every revision: deck + operations + author
 *   <deck>/deck.html, deck.pdf        outputs (written by lib/tools)
 *   .brand-kits/<id>.json
 *   .assets/<id>.bin + <id>.json
 *
 * Local mode: the deck id is a folder name from the title, decks, brand kits and assets can be listed.
 * Hosted mode: ids are unguessable (capability), there are no listings, so nobody sees other people's data.
 *
 * The only write path of a deck is commit(): validation (errors refuse the write), an exclusive write
 * of the revision file (a second concurrent write of the same revision fails with a conflict), then deck.json.
 */
import { randomBytes } from "node:crypto";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  DEFAULT_DESIGN,
  DEFAULT_MOTION,
  brandKitInputSchema,
  brandKitSchema,
  deckSchema,
  designFromBrand,
  type Block,
  type BrandKit,
  type BrandKitInput,
  type Brief,
  type Deck,
  type DeckMotionPatch,
  type DesignPatch,
  type Op,
  type SlideInput,
} from "@/lib/domain";
import { hasErrors, validateDeck, type AssetData, type AssetIndex, type Finding } from "@/lib/engine";
import { dataUri, MAX_ASSET_BYTES, sniff, type AssetMeta } from "./assets";
import { ExistsError, LocalFiles, type Files } from "./files";
import { applyOpsToDeck, OpError } from "./ops";

export type Author = "mcp" | "user";
export type StoreMode = "local" | "hosted";

export interface RevisionRecord {
  revision: number;
  at: string;
  author: Author;
  summary: string;
  ops: Op[];
  /** For a revert: which revision the deck went back to. */
  revertedTo?: number;
}

export interface WriteResult {
  deck: Deck;
  findings: Finding[];
  /** Slides added or changed by the write. */
  touched: string[];
  /** The write changed the look of the whole deck. */
  global: boolean;
}

export class NotFoundError extends Error {}
export class RevisionConflictError extends Error {
  constructor(
    readonly expected: number,
    readonly actual: number,
  ) {
    super(`Deck is at revision ${actual}, not ${expected}. Read it again with get_deck and reapply your change`);
  }
}
export class ValidationError extends Error {
  constructor(readonly findings: Finding[]) {
    super(`The change was not saved, it has ${findings.filter((f) => f.severity === "error").length} errors`);
  }
}
export class NotAvailableError extends Error {}
export { OpError };

export interface CreateDeckInput {
  title: string;
  brief: Brief;
  brandKitId?: string;
  design?: DesignPatch;
  motion?: DeckMotionPatch;
  slides?: SlideInput[];
}

export interface DeckSummary {
  id: string;
  title: string;
  company: string;
  slides: number;
  revision: number;
  updatedAt: string;
}

export interface StoreOptions {
  mode?: StoreMode;
  /** Id generator (tests replace it with a deterministic one). */
  id?: (prefix: string) => string;
  now?: () => string;
}

const ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";
const randomString = (n: number) => Array.from(randomBytes(n), (b) => ALPHABET[b % ALPHABET.length]).join("");
/** A short id for slides, a long one (about 100 bits) for decks, assets and brand kits, which are capabilities when hosted. */
const randomId = (prefix: string) => prefix + randomString(prefix === "s" ? 6 : 20);
const SAFE_ID = /^[a-z0-9][a-z0-9_-]{0,79}$/i;

export function defaultHome(): string {
  return process.env.INSTADECK_HOME ?? join(homedir(), "InstaDeck");
}

/** Folder name from a title: lowercase without diacritics, words joined by a hyphen. */
export function slug(title: string): string {
  const s = title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
  if (!s) throw new Error(`Title "${title}" has no letters or digits to name the deck folder`);
  return s;
}

function assetRefs(deck: Deck): Set<string> {
  const ids = new Set<string>();
  const add = (b: Block) => {
    if (b.type === "image" || b.type === "logo") ids.add(b.assetId);
    if (b.type === "logos") for (const l of b.items) ids.add(l.assetId);
    if (b.type === "team") for (const p of b.people) if (p.photoAssetId) ids.add(p.photoAssetId);
  };
  for (const s of deck.slides) for (const b of Object.values(s.blocks)) add(b);
  for (const f of [deck.design.fonts.heading, deck.design.fonts.body]) if (f.source === "asset") ids.add(f.assetId);
  return ids;
}

export class Store {
  readonly mode: StoreMode;
  /** Prefix of deck folders: locally none (folders directly in INSTADECK_HOME), hosted decks/. */
  private readonly deckPrefix: string;
  private readonly id: (prefix: string) => string;
  private readonly now: () => string;
  private readonly queues = new Map<string, Promise<unknown>>();

  constructor(
    readonly files: Files,
    opts: StoreOptions = {},
  ) {
    this.mode = opts.mode ?? "local";
    this.deckPrefix = this.mode === "hosted" ? "decks/" : "";
    this.id = opts.id ?? randomId;
    this.now = opts.now ?? (() => new Date().toISOString());
  }

  /** Local storage in a folder. */
  static local(home: string, opts: Omit<StoreOptions, "mode"> = {}): Store {
    return new Store(new LocalFiles(home), { ...opts, mode: "local" });
  }

  // --- keys ---

  deckKey(id: string, ...rest: string[]): string {
    if (!SAFE_ID.test(id)) throw new NotFoundError(`Deck ${id} does not exist`);
    return this.deckPrefix + [id, ...rest].join("/");
  }

  private sharedKey(dir: ".assets" | ".brand-kits", id: string, ext: "json" | "bin"): string {
    if (!SAFE_ID.test(id)) throw new NotFoundError(`Invalid id ${id}`);
    return `${dir}/${id}.${ext}`;
  }

  private async readJson<T>(key: string): Promise<T | undefined> {
    const b = await this.files.get(key);
    return b ? (JSON.parse(new TextDecoder().decode(b)) as T) : undefined;
  }

  private writeJson(key: string, data: unknown, exclusive = false): Promise<void> {
    return this.files.put(key, JSON.stringify(data, null, 2), { exclusive, contentType: "application/json" });
  }

  private requireLocal(what: string) {
    if (this.mode !== "local") throw new NotAvailableError(`${what} is only available on the local InstaDeck server`);
  }

  /** Writes of one deck in this process run one after another (the lock between processes is the exclusive revision write). */
  private serial<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const prev = this.queues.get(key) ?? Promise.resolve();
    const next = prev.then(fn, fn);
    this.queues.set(
      key,
      next.catch(() => undefined),
    );
    return next;
  }

  // --- decky ---

  async getDeck(id: string): Promise<Deck> {
    const raw = await this.readJson<unknown>(this.deckKey(id, "deck.json"));
    if (!raw) throw new NotFoundError(`Deck ${id} does not exist`);
    return deckSchema.parse(raw);
  }

  async listDecks(): Promise<DeckSummary[]> {
    this.requireLocal("Listing decks");
    const names = (await this.files.list("")).filter((n) => SAFE_ID.test(n));
    const ids = (await Promise.all(names.map(async (n) => ((await this.files.exists(`${n}/deck.json`)) ? n : undefined)))).filter((n): n is string => !!n);
    const decks = await Promise.all(ids.map((i) => this.getDeck(i)));
    return decks
      .map((d) => ({ id: d.id, title: d.title, company: d.brief.company, slides: d.slides.length, revision: d.revision, updatedAt: d.updatedAt }))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async history(id: string): Promise<RevisionRecord[]> {
    await this.getDeck(id);
    const files = (await this.files.list(`${this.deckKey(id, ".revisions")}/`)).filter((f) => /^\d+\.json$/.test(f));
    const records = await Promise.all(files.map((f) => this.readJson<{ record: RevisionRecord }>(this.deckKey(id, ".revisions", f))));
    return records.map((r) => r!.record).sort((a, b) => a.revision - b.revision);
  }

  async getRevision(id: string, revision: number): Promise<Deck> {
    const r = await this.readJson<{ deck: unknown }>(this.deckKey(id, ".revisions", `${revision}.json`));
    if (!r) throw new NotFoundError(`Deck ${id} has no revision ${revision}`);
    return deckSchema.parse(r.deck);
  }

  /** The only write path of a deck. */
  private async commit(next: Deck, record: Omit<RevisionRecord, "revision" | "at">, touched: string[], global: boolean): Promise<WriteResult> {
    const at = this.now();
    const deck: Deck = { ...next, revision: next.revision + 1, updatedAt: at };
    deckSchema.parse(deck);
    const findings = validateDeck(deck, await this.assetIndex(deck));
    if (hasErrors(findings)) throw new ValidationError(findings);
    try {
      await this.writeJson(this.deckKey(deck.id, ".revisions", `${deck.revision}.json`), { record: { ...record, revision: deck.revision, at }, deck }, true);
    } catch (e) {
      if (e instanceof ExistsError) throw new RevisionConflictError(next.revision, deck.revision);
      throw e;
    }
    await this.writeJson(this.deckKey(deck.id, "deck.json"), deck);
    return { deck, findings, touched, global };
  }

  private async brandKitsFor(ops: Op[]): Promise<Map<string, BrandKit>> {
    const ids = new Set(ops.flatMap((o) => (o.op === "apply_brand" ? [o.brand_kit_id] : [])));
    const kits = await Promise.all([...ids].map((id) => this.getBrandKit(id).catch(() => undefined)));
    return new Map(kits.filter((k): k is BrandKit => !!k).map((k) => [k.id, k]));
  }

  private opContext(brands: Map<string, BrandKit>, deck: Deck) {
    const used = new Set(deck.slides.map((s) => s.id));
    return {
      newSlideId: () => {
        let id: string;
        do id = this.id("s").slice(0, 7);
        while (used.has(id));
        used.add(id);
        return id;
      },
      brandKit: (bid: string) => brands.get(bid),
    };
  }

  /** Candidate ids for a new deck: locally the title slug and its numbered variants, hosted random. */
  private *deckIds(title: string): Generator<string> {
    if (this.mode === "hosted") {
      for (;;) yield this.id("d");
    }
    const base = slug(title);
    for (let n = 1; ; n++) yield n === 1 ? base : `${base}-${n}`;
  }

  async createDeck(input: CreateDeckInput, author: Author): Promise<WriteResult> {
    const brand = input.brandKitId ? await this.getBrandKit(input.brandKitId) : undefined;
    const ops: Op[] = [
      ...(input.design ? [{ op: "set_design" as const, design: input.design }] : []),
      ...(input.motion ? [{ op: "set_motion" as const, motion: input.motion }] : []),
      ...(input.slides ?? []).map((slide) => ({ op: "add_slide" as const, slide })),
    ];
    const brands = await this.brandKitsFor(ops);
    const at = this.now();
    for (const id of this.deckIds(input.title)) {
      // A taken id (another deck with the same title) is cheap to detect up front, a race is settled by the exclusive write of revision 1.
      if (await this.files.exists(this.deckKey(id, ".revisions", "1.json"))) continue;
      const empty: Deck = {
        id,
        title: input.title,
        brief: input.brief,
        ...(brand && { brandKitId: brand.id }),
        design: brand ? designFromBrand(brand, DEFAULT_DESIGN) : structuredClone(DEFAULT_DESIGN),
        motion: structuredClone(DEFAULT_MOTION),
        slides: [],
        revision: 0,
        createdAt: at,
        updatedAt: at,
      };
      try {
        return await this.serial(id, async () => {
          const applied = applyOpsToDeck(empty, ops, this.opContext(brands, empty));
          return this.commit(applied.deck, { author, summary: "Created", ops }, applied.touched, true);
        });
      } catch (e) {
        if (e instanceof RevisionConflictError) continue;
        throw e;
      }
    }
    throw new Error("unreachable");
  }

  async applyOps(id: string, expectedRevision: number, ops: Op[], author: Author, summary: string): Promise<WriteResult> {
    return this.serial(id, async () => {
      const deck = await this.getDeck(id);
      if (deck.revision !== expectedRevision) throw new RevisionConflictError(expectedRevision, deck.revision);
      const applied = applyOpsToDeck(deck, ops, this.opContext(await this.brandKitsFor(ops), deck));
      return this.commit(applied.deck, { author, summary, ops }, applied.touched, applied.global);
    });
  }

  async revert(id: string, expectedRevision: number, toRevision: number, author: Author): Promise<WriteResult> {
    return this.serial(id, async () => {
      const deck = await this.getDeck(id);
      if (deck.revision !== expectedRevision) throw new RevisionConflictError(expectedRevision, deck.revision);
      const old = await this.getRevision(id, toRevision);
      const next: Deck = { ...old, revision: deck.revision, createdAt: deck.createdAt };
      return this.commit(next, { author, summary: `Reverted to revision ${toRevision}`, ops: [], revertedTo: toRevision }, next.slides.map((s) => s.id), true);
    });
  }

  async deleteDeck(id: string): Promise<void> {
    await this.serial(id, async () => {
      await this.getDeck(id);
      await this.files.remove(`${this.deckKey(id)}/`);
    });
  }

  // --- brand kity ---

  async createBrandKit(input: BrandKitInput): Promise<BrandKit> {
    const parsed = brandKitInputSchema.parse(input);
    for (const l of parsed.logos) {
      if ((await this.getAssetMeta(l.assetId).catch(() => undefined))?.kind !== "image") throw new NotFoundError(`Logo asset ${l.assetId} does not exist or is not an image`);
    }
    for (const f of [parsed.fonts?.heading, parsed.fonts?.body]) {
      if (f?.source === "asset" && (await this.getAssetMeta(f.assetId).catch(() => undefined))?.kind !== "font") {
        throw new NotFoundError(`Font asset ${f.assetId} does not exist or is not a font`);
      }
    }
    const kit: BrandKit = { ...parsed, id: this.id("b"), createdAt: this.now() };
    await this.writeJson(this.sharedKey(".brand-kits", kit.id, "json"), kit);
    return kit;
  }

  async getBrandKit(id: string): Promise<BrandKit> {
    const raw = await this.readJson<unknown>(this.sharedKey(".brand-kits", id, "json"));
    if (!raw) throw new NotFoundError(`Brand kit ${id} does not exist`);
    return brandKitSchema.parse(raw);
  }

  async listBrandKits(): Promise<BrandKit[]> {
    this.requireLocal("Listing brand kits");
    const files = (await this.files.list(".brand-kits/")).filter((f) => f.endsWith(".json"));
    return Promise.all(files.map((f) => this.getBrandKit(f.slice(0, -5))));
  }

  // --- assety ---

  async addAsset(name: string, bytes: Uint8Array): Promise<AssetMeta> {
    if (bytes.byteLength > MAX_ASSET_BYTES) throw new Error(`File is ${Math.round(bytes.byteLength / 1024 / 1024)} MB, the limit is 15 MB`);
    const { mime, kind } = sniff(bytes);
    const meta: AssetMeta = { id: this.id("a"), name, mime, kind, bytes: bytes.byteLength, createdAt: this.now() };
    await this.files.put(this.sharedKey(".assets", meta.id, "bin"), bytes, { contentType: mime });
    await this.writeJson(this.sharedKey(".assets", meta.id, "json"), meta);
    return meta;
  }

  async getAssetMeta(id: string): Promise<AssetMeta> {
    const meta = await this.readJson<AssetMeta>(this.sharedKey(".assets", id, "json"));
    if (!meta) throw new NotFoundError(`Asset ${id} does not exist`);
    return meta;
  }

  async getAsset(id: string): Promise<{ meta: AssetMeta; bytes: Uint8Array }> {
    const meta = await this.getAssetMeta(id);
    const bytes = await this.files.get(this.sharedKey(".assets", id, "bin"));
    if (!bytes) throw new NotFoundError(`Asset ${id} has no content`);
    return { meta, bytes };
  }

  async listAssets(): Promise<AssetMeta[]> {
    this.requireLocal("Listing assets");
    const files = (await this.files.list(".assets/")).filter((f) => f.endsWith(".json"));
    const metas = await Promise.all(files.map((f) => this.getAssetMeta(f.slice(0, -5))));
    return metas.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  /** Asset types the deck uses. Missing ones are not in the index, validation reports them. */
  async assetIndex(deck: Deck): Promise<AssetIndex> {
    const metas = await Promise.all([...assetRefs(deck)].map((id) => this.getAssetMeta(id).catch(() => undefined)));
    return Object.fromEntries(metas.filter((m): m is AssetMeta => !!m).map((m) => [m.id, { kind: m.kind }]));
  }

  /** Data of the assets the deck uses, for the renderer: a data URI (file, PDF), or a URL when `url` is given. */
  async assetsFor(deck: Deck, url?: (meta: AssetMeta) => string): Promise<Record<string, AssetData>> {
    const out: Record<string, AssetData> = {};
    for (const id of assetRefs(deck)) {
      if (url) {
        const meta = await this.getAssetMeta(id);
        out[id] = { mime: meta.mime, src: url(meta) };
      } else {
        const { meta, bytes } = await this.getAsset(id);
        out[id] = { mime: meta.mime, src: dataUri(meta.mime, bytes) };
      }
    }
    return out;
  }
}
