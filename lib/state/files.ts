/**
 * Soubory pod klíči ("<deck>/deck.json", ".assets/<id>.bin"). Lokálně složka na disku, hostovaně S3.
 * Výhradní zápis (exclusive) je jediný zámek úložiště: druhý zápis stejného klíče selže ExistsError.
 * Lokálně link() na existující cestu selže, v S3 podmíněný PutObject s If-None-Match: *.
 */
import { randomBytes } from "node:crypto";
import { link, mkdir, readFile, readdir, rename, rm, stat, unlink, writeFile } from "node:fs/promises";
import { dirname, join, sep } from "node:path";
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from "@aws-sdk/client-s3";

export class ExistsError extends Error {
  constructor(readonly key: string) {
    super(`${key} already exists`);
  }
}

export interface PutOptions {
  /** Zapsat jen pokud klíč ještě neexistuje, jinak ExistsError. */
  exclusive?: boolean;
  contentType?: string;
}

export interface Files {
  get(key: string): Promise<Uint8Array | undefined>;
  put(key: string, data: Uint8Array | string, opts?: PutOptions): Promise<void>;
  exists(key: string): Promise<boolean>;
  /** Jména přímých potomků pod prefixem (soubory i „složky“), bez prefixu. */
  list(prefix: string): Promise<string[]>;
  /** Smaže klíč a vše pod ním. */
  remove(prefix: string): Promise<void>;
  /** Cesta na disku, pokud úložiště je disk (výstupy pro lokálního uživatele). */
  localPath?(key: string): string;
}

const bytes = (d: Uint8Array | string) => (typeof d === "string" ? new TextEncoder().encode(d) : d);

/** Klíč z neprázdných částí bez "..", prefix smí končit lomítkem. Prázdný klíč je kořen. */
function checkKey(key: string) {
  const k = key.endsWith("/") ? key.slice(0, -1) : key;
  if (k !== "" && k.split("/").some((p) => p === ".." || p === "")) throw new Error(`Invalid key ${key}`);
}

export class LocalFiles implements Files {
  constructor(readonly root: string) {}

  localPath(key: string): string {
    checkKey(key);
    return join(this.root, ...key.split("/"));
  }

  async get(key: string) {
    try {
      return new Uint8Array(await readFile(this.localPath(key)));
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return undefined;
      throw e;
    }
  }

  async put(key: string, data: Uint8Array | string, opts: PutOptions = {}) {
    const target = this.localPath(key);
    await mkdir(dirname(target), { recursive: true });
    const tmp = `${target}.${randomBytes(4).toString("hex")}.tmp`;
    await writeFile(tmp, bytes(data));
    if (!opts.exclusive) return rename(tmp, target);
    try {
      await link(tmp, target);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "EEXIST") throw new ExistsError(key);
      throw e;
    } finally {
      await unlink(tmp);
    }
  }

  async exists(key: string) {
    return stat(this.localPath(key)).then(
      () => true,
      () => false,
    );
  }

  async list(prefix: string) {
    const dir = prefix ? this.localPath(prefix.replace(/\/$/, "")) : this.root;
    const names = await readdir(dir).catch(() => [] as string[]);
    return names.filter((n) => !n.endsWith(".tmp") && !n.includes(sep));
  }

  async remove(prefix: string) {
    await rm(this.localPath(prefix.replace(/\/$/, "")), { recursive: true, force: true });
  }
}

export class S3Files implements Files {
  constructor(
    readonly bucket: string,
    readonly prefix: string,
    readonly client: S3Client = new S3Client({}),
  ) {}

  private k(key: string) {
    checkKey(key);
    return `${this.prefix}${key}`;
  }

  async get(key: string) {
    try {
      const r = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: this.k(key) }));
      return r.Body ? new Uint8Array(await r.Body.transformToByteArray()) : new Uint8Array();
    } catch (e) {
      if (e instanceof S3ServiceException && (e.name === "NoSuchKey" || e.$metadata.httpStatusCode === 404)) return undefined;
      throw e;
    }
  }

  async put(key: string, data: Uint8Array | string, opts: PutOptions = {}) {
    try {
      await this.client.send(
        new PutObjectCommand({ Bucket: this.bucket, Key: this.k(key), Body: bytes(data), ContentType: opts.contentType, ...(opts.exclusive && { IfNoneMatch: "*" }) }),
      );
    } catch (e) {
      // 412: klíč existuje. 409: souběžný podmíněný zápis téhož klíče, druhý prohrál.
      if (opts.exclusive && e instanceof S3ServiceException && [409, 412].includes(e.$metadata.httpStatusCode ?? 0)) throw new ExistsError(key);
      throw e;
    }
  }

  async exists(key: string) {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: this.k(key) }));
      return true;
    } catch (e) {
      if (e instanceof S3ServiceException && e.$metadata.httpStatusCode === 404) return false;
      throw e;
    }
  }

  async list(prefix: string) {
    const p = this.k(prefix);
    const out: string[] = [];
    let token: string | undefined;
    do {
      const r = await this.client.send(new ListObjectsV2Command({ Bucket: this.bucket, Prefix: p, Delimiter: "/", ContinuationToken: token }));
      for (const c of r.CommonPrefixes ?? []) out.push(c.Prefix!.slice(p.length).replace(/\/$/, ""));
      for (const c of r.Contents ?? []) out.push(c.Key!.slice(p.length));
      token = r.NextContinuationToken;
    } while (token);
    return out;
  }

  async remove(prefix: string) {
    const p = this.k(prefix);
    let token: string | undefined;
    do {
      const r = await this.client.send(new ListObjectsV2Command({ Bucket: this.bucket, Prefix: p, ContinuationToken: token }));
      const keys = (r.Contents ?? []).map((c) => ({ Key: c.Key! }));
      if (keys.length) await this.client.send(new DeleteObjectsCommand({ Bucket: this.bucket, Delete: { Objects: keys } }));
      token = r.NextContinuationToken;
    } while (token);
  }
}
