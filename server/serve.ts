/**
 * The hosted connector locally (development, checking in clients through a tunnel):
 *   STATE_BACKEND=local INSTADECK_HOSTED_DIR=.data/hosted INSTADECK_PUBLIC_URL=http://localhost:3535 npm run serve
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { hostedHandler } from "./hosted";

const handler = hostedHandler();
const port = Number(process.env.PORT ?? 3535);

async function toRequest(req: IncomingMessage): Promise<Request> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) if (v !== undefined) headers.set(k, Array.isArray(v) ? v.join(", ") : v);
  const body = chunks.length && req.method !== "GET" && req.method !== "HEAD" ? Buffer.concat(chunks) : undefined;
  return new Request(`http://${req.headers.host ?? `localhost:${port}`}${req.url}`, { method: req.method, headers, body });
}

async function send(res: ServerResponse, r: Response) {
  res.writeHead(r.status, Object.fromEntries(r.headers));
  res.end(Buffer.from(await r.arrayBuffer()));
}

createServer((req, res) => {
  toRequest(req)
    .then(handler)
    .then((r) => send(res, r))
    .catch((e) => {
      console.error(e);
      res.writeHead(500).end();
    });
}).listen(port, () => console.error(`InstaDeck connector on http://localhost:${port}/mcp`));
