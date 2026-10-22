/**
 * AWS Lambda (Function URL, payload 2.0) to the same handler as locally.
 * Binary responses (assets) go as base64, text as text.
 */
import { hostedHandler } from "./hosted";

interface FunctionUrlEvent {
  rawPath: string;
  rawQueryString: string;
  headers: Record<string, string | undefined>;
  body?: string;
  isBase64Encoded: boolean;
  requestContext: { http: { method: string; sourceIp: string } };
}

interface FunctionUrlResult {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
  isBase64Encoded: boolean;
}

const handler = hostedHandler();
const TEXT = /^(text\/|application\/(json|javascript)|image\/svg\+xml)/;

export async function handle(event: FunctionUrlEvent): Promise<FunctionUrlResult> {
  const headers = new Headers();
  for (const [k, v] of Object.entries(event.headers)) if (v !== undefined) headers.set(k, v);
  // Behind CloudFront x-forwarded-for carries the client address, without it the caller address from requestContext.
  if (!headers.has("x-forwarded-for")) headers.set("x-forwarded-for", event.requestContext.http.sourceIp);
  const method = event.requestContext.http.method;
  const body = event.body === undefined ? undefined : event.isBase64Encoded ? Buffer.from(event.body, "base64") : event.body;
  const url = `https://${headers.get("host")}${event.rawPath}${event.rawQueryString ? `?${event.rawQueryString}` : ""}`;
  const res = await handler(new Request(url, { method, headers, body: method === "GET" || method === "HEAD" ? undefined : body }));
  const type = res.headers.get("content-type") ?? "";
  const bytes = Buffer.from(await res.arrayBuffer());
  const text = TEXT.test(type);
  return { statusCode: res.status, headers: Object.fromEntries(res.headers), body: text ? bytes.toString("utf8") : bytes.toString("base64"), isBase64Encoded: !text };
}
