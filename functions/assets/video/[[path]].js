/**
 * Cloudflare Pages Function: serves the hero film with HTTP byte ranges.
 *
 * Pages answers Range requests for static assets with a full 200, and Safari
 * (macOS and iOS) refuses to play <video> without 206 Partial Content. This
 * function fetches the asset and returns the requested slice. Only
 * /assets/video/* is routed here; everything else stays a static asset.
 */
const TYPES = { mp4: 'video/mp4', webm: 'video/webm' };

function parseRange(header, size) {
  const m = /^bytes=(\d*)-(\d*)$/.exec(header || '');
  if (!m || (m[1] === '' && m[2] === '')) return null;
  let start;
  let end;
  if (m[1] === '') {
    start = Math.max(0, size - Number(m[2])); // suffix range: the last N bytes
    end = size - 1;
  } else {
    start = Number(m[1]);
    end = m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1);
  }
  return start <= end && start < size ? { start, end } : 'invalid';
}

async function serve({ request, env }, head) {
  const url = new URL(request.url);
  const asset = await env.ASSETS.fetch(new Request(url.toString(), { method: 'GET' }));
  if (!asset.ok) return asset;
  const ext = url.pathname.split('.').pop().toLowerCase();
  const body = await asset.arrayBuffer();
  const size = body.byteLength;
  const headers = {
    'Content-Type': TYPES[ext] || asset.headers.get('Content-Type') || 'application/octet-stream',
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'public, max-age=604800',
    'X-Content-Type-Options': 'nosniff',
  };
  const range = parseRange(request.headers.get('Range'), size);
  if (range === 'invalid') return new Response(null, { status: 416, headers: { ...headers, 'Content-Range': `bytes */${size}` } });
  if (!range) return new Response(head ? null : body, { status: 200, headers: { ...headers, 'Content-Length': String(size) } });
  const { start, end } = range;
  return new Response(head ? null : body.slice(start, end + 1), {
    status: 206,
    headers: { ...headers, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': String(end - start + 1) },
  });
}

export const onRequestGet = (ctx) => serve(ctx, false);
export const onRequestHead = (ctx) => serve(ctx, true);
