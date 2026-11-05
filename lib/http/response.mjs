/** Small Response builders shared by every handler. */

const SECURITY = {
  // The static pages get it from site/_headers, which does not reach Functions' responses (browsers ignore it over http://).
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cache-Control': 'no-store',
};

export function json(status, body, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...SECURITY, 'Content-Type': 'application/json; charset=utf-8', ...headers },
  });
}

export function html(status, body, headers = {}) {
  return new Response(body, {
    status,
    headers: { ...SECURITY, 'Content-Type': 'text/html; charset=utf-8', ...headers },
  });
}

export function text(status, body, headers = {}) {
  return new Response(body, {
    status,
    headers: { ...SECURITY, 'Content-Type': 'text/plain; charset=utf-8', ...headers },
  });
}

export function empty(status = 204, headers = {}) {
  return new Response(null, { status, headers: { ...SECURITY, ...headers } });
}

/**
 * Read a request body as text with a hard byte cap, enforced while
 * streaming: a body without Content-Length (chunked) is cut off as soon as it
 * passes the cap instead of being buffered whole. Returns
 * { ok, text } or { ok:false, status: 413|400, error }.
 */
export async function readText(request, maxBytes) {
  const declared = Number(request.headers.get('content-length') || 0);
  if (declared > maxBytes) return { ok: false, status: 413, error: 'Request too large' };
  if (!request.body) return { ok: true, text: '' };
  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => {});
        return { ok: false, status: 413, error: 'Request too large' };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, status: 400, error: 'Could not read request' };
  }
  const buf = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    buf.set(c, offset);
    offset += c.byteLength;
  }
  return { ok: true, text: new TextDecoder().decode(buf) };
}

/** Read a JSON object body with a hard byte cap. Returns { ok, body } or { ok:false, status, error }. */
export async function readJson(request, maxBytes) {
  const type = request.headers.get('content-type') || '';
  if (!/^application\/json\b/i.test(type)) return { ok: false, status: 415, error: 'Send JSON' };
  const r = await readText(request, maxBytes);
  if (!r.ok) return r;
  try {
    const body = JSON.parse(r.text);
    if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, status: 400, error: 'Invalid JSON' };
    return { ok: true, body, raw: r.text };
  } catch {
    return { ok: false, status: 400, error: 'Invalid JSON' };
  }
}

/** Read an application/x-www-form-urlencoded body (small forms only). */
export async function readForm(request, maxBytes) {
  const type = request.headers.get('content-type') || '';
  if (!/^application\/x-www-form-urlencoded\b/i.test(type)) return { ok: false, status: 415, error: 'Send a form' };
  const r = await readText(request, maxBytes);
  if (!r.ok) return r;
  return { ok: true, form: new URLSearchParams(r.text) };
}
