/**
 * Adapter between node:http and the Web Request/Response used by the
 * handlers, so src/tools/serve.mjs can mount exactly the code Vercel runs.
 */
import { Readable } from 'node:stream';

export function toRequest(req, { origin }) {
  const url = new URL(req.url, origin);
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (Array.isArray(v)) v.forEach((x) => headers.append(k, x));
    else if (v !== undefined) headers.set(k, v);
  }
  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  return new Request(url, {
    method: req.method,
    headers,
    body: hasBody ? Readable.toWeb(req) : undefined,
    duplex: hasBody ? 'half' : undefined,
  });
}

export async function sendResponse(res, response) {
  const headers = {};
  response.headers.forEach((v, k) => (headers[k] = v));
  const body = Buffer.from(await response.arrayBuffer());
  headers['content-length'] = String(body.length);
  res.writeHead(response.status, headers);
  res.end(body);
}
