/**
 * Kontrakt úložiště: disk vždy, S3 když běží emulátor nebo je dané S3_TEST_ENDPOINT
 * (lokálně: docker run -p 9090:9090 -e COM_ADOBE_TESTING_S3MOCK_STORE_INITIAL_BUCKETS=test adobe/s3mock).
 */
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { S3Client } from "@aws-sdk/client-s3";
import { afterAll, describe, expect, it } from "vitest";
import { ExistsError, LocalFiles, S3Files, Store, type Files } from "@/lib/state";

const dirs: string[] = [];
afterAll(() => Promise.all(dirs.map((d) => rm(d, { recursive: true, force: true }))));

const endpoint = process.env.S3_TEST_ENDPOINT;
const backends: [string, () => Promise<Files>][] = [
  [
    "local",
    async () => {
      const d = await mkdtemp(join(tmpdir(), "instadeck-files-"));
      dirs.push(d);
      return new LocalFiles(d);
    },
  ],
];
if (endpoint) {
  const client = new S3Client({ endpoint, region: "us-east-1", forcePathStyle: true, credentials: { accessKeyId: "test", secretAccessKey: "test" } });
  backends.push(["s3", async () => new S3Files(process.env.S3_TEST_BUCKET ?? "test", `t${Date.now()}${Math.random().toString(36).slice(2)}/`, client)]);
}

describe.each(backends)("files: %s", (name, make) => {
  it("reads, writes, lists and removes", async () => {
    const f = await make();
    await f.put("d1/deck.json", "{}");
    await f.put("d1/.revisions/1.json", "1");
    await f.put(".assets/a.bin", new Uint8Array([1, 2, 3]));
    expect(new TextDecoder().decode(await f.get("d1/deck.json"))).toBe("{}");
    expect(await f.get("nope")).toBeUndefined();
    expect(await f.exists("d1/deck.json")).toBe(true);
    expect(await f.exists("d2/deck.json")).toBe(false);
    expect((await f.list("")).sort()).toEqual([".assets", "d1"]);
    expect((await f.list("d1/")).sort()).toEqual([".revisions", "deck.json"]);
    expect(await f.list("d1/.revisions/")).toEqual(["1.json"]);
    await f.remove("d1/");
    expect(await f.list("")).toEqual([".assets"]);
    expect(Array.from((await f.get(".assets/a.bin"))!)).toEqual([1, 2, 3]);
  });

  it("lets exactly one exclusive write win", async () => {
    const f = await make();
    if (name === "s3") {
      // Atomicitu souběžných podmíněných zápisů garantuje S3, emulátor ji nedrží (kontrola a zápis ve dvou krocích).
      // Tady se ověřuje mapování: druhý výhradní zápis skončí ExistsError. Souběh se ověří proti skutečnému S3.
      await f.put("d/.revisions/2.json", "1", { exclusive: true });
      await expect(f.put("d/.revisions/2.json", "2", { exclusive: true })).rejects.toBeInstanceOf(ExistsError);
    } else {
      const results = await Promise.allSettled([1, 2, 3, 4].map((i) => f.put("d/.revisions/2.json", String(i), { exclusive: true })));
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      for (const r of results) if (r.status === "rejected") expect(r.reason).toBeInstanceOf(ExistsError);
    }
    await f.put("d/.revisions/2.json", "overwrite");
    expect(new TextDecoder().decode(await f.get("d/.revisions/2.json"))).toBe("overwrite");
  });

  it("rejects keys that escape", async () => {
    const f = await make();
    await expect(f.put("../x", "y")).rejects.toThrow(/Invalid key/);
  });

  it("serves a hosted store with unguessable ids and no listings", async () => {
    const store = new Store(await make(), { mode: "hosted" });
    const { deck } = await store.createDeck({ title: "Pitch", brief: { company: "A", topic: "B", language: "en" }, slides: [{ layout: "statement", intent: "x", blocks: { statement: { type: "heading", level: "display", text: "Hi" } } }] }, "mcp");
    expect(deck.id).toMatch(/^d[a-z0-9]{20}$/);
    expect((await store.getDeck(deck.id)).revision).toBe(1);
    await expect(store.listDecks()).rejects.toThrow(/local InstaDeck server/);
    const writes = await Promise.allSettled([0, 1].map(() => store.applyOps(deck.id, 1, [{ op: "set_title", title: "X" }], "mcp", "x")));
    expect(writes.filter((w) => w.status === "fulfilled")).toHaveLength(1);
  });
});
