/**
 * Hostovaný konektor z proměnných prostředí. Chybějící povinná proměnná je chyba, ne výchozí hodnota.
 *
 *   INSTADECK_PUBLIC_URL   https://instadeck.app (odkazy na prezentace a assety)
 *   STATE_BACKEND          s3 | local
 *   S3_BUCKET, S3_PREFIX   pro s3 (prefix volitelný)
 *   INSTADECK_HOSTED_DIR   pro local (vývoj bez AWS)
 */
import { LocalFiles, S3Files, Store, type Files } from "@/lib/state";
import { Service } from "@/lib/tools";
import { createHandler } from "./http";

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable ${name}`);
  return v;
}

export function hostedFiles(): Files {
  const backend = required("STATE_BACKEND");
  if (backend === "s3") return new S3Files(required("S3_BUCKET"), process.env.S3_PREFIX ?? "");
  if (backend === "local") return new LocalFiles(required("INSTADECK_HOSTED_DIR"));
  throw new Error(`STATE_BACKEND must be s3 or local, got ${backend}`);
}

export function hostedHandler() {
  const publicUrl = required("INSTADECK_PUBLIC_URL").replace(/\/$/, "");
  const service = new Service(new Store(hostedFiles(), { mode: "hosted" }), { browser: false, publicUrl });
  return createHandler({ service });
}
