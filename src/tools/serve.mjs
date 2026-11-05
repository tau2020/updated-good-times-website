#!/usr/bin/env node
/**
 * Good Times in Cape Town: plain local web server (no containers, no dependencies)
 *
 *   node src/tools/serve.mjs            → http://127.0.0.1:8080
 *   PORT=3000 HOST=0.0.0.0 node src/tools/serve.mjs
 *
 * Serves ./site with gzip, caching, byte ranges for video, clean URLs and a
 * 404 page, and mounts the enquiry API (lib/http/app.mjs) on /api/*: the
 * same handlers Vercel runs from api/*.mjs. With ENQUIRY_MODE=preview (the
 * default) the API refuses enquiries; set ENQUIRY_MODE=live plus a local
 * database and the file email provider in .env to exercise it end to end.
 */
import http from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { join, extname, normalize, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createGzip } from 'node:zlib';
import { handle as enquiryApi, matches as isEnquiryApi } from '../../lib/http/app.mjs';
import { toRequest, sendResponse } from '../../lib/http/node.mjs';
import { loadDotEnv } from '../../lib/config.mjs';

loadDotEnv(); // so the startup line and the API see ENQUIRY_MODE etc. from .env

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
// SITE_DIR serves another build (a frozen copy for a long browser run, say); ./site by default.
const SITE = process.env.SITE_DIR ? resolve(process.env.SITE_DIR) : join(ROOT, 'site');
const PORT = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || '127.0.0.1';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.webmanifest': 'application/manifest+json',
};
const COMPRESSIBLE = new Set(['.html', '.css', '.js', '.mjs', '.json', '.xml', '.txt', '.svg', '.webmanifest']);
const LONG_CACHE = new Set(['.css', '.js', '.png', '.jpg', '.jpeg', '.webp', '.avif', '.svg', '.woff2', '.woff', '.ico', '.mp4', '.webm']);

const SECURITY = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, { ...SECURITY, ...headers });
  res.end(body);
}

function json(res, status, obj) {
  send(res, status, JSON.stringify(obj), { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
}

/* ---------- static files ---------- */
function resolveStatic(urlPath) {
  let p = decodeURIComponent(urlPath.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const bare = p.replace(/\/index\.html$/, '');
  const candidates = [p, `${p}.html`, `${p}/index.html`, `${bare}.html`];
  for (const c of candidates) {
    const abs = normalize(join(SITE, c));
    if (!abs.startsWith(SITE)) return null; // path traversal guard
    if (existsSync(abs) && statSync(abs).isFile()) return abs;
  }
  return null;
}

function serveFile(req, res, file, status = 200) {
  const ext = extname(file).toLowerCase();
  const type = MIME[ext] || 'application/octet-stream';
  const st = statSync(file);
  const headers = {
    'Content-Type': type,
    'Cache-Control': LONG_CACHE.has(ext) ? 'public, max-age=604800' : 'public, max-age=3600',
    'Last-Modified': st.mtime.toUTCString(),
    Vary: 'Accept-Encoding',
  };
  if (req.headers['if-modified-since'] === headers['Last-Modified']) return send(res, 304, '', headers);
  // Byte ranges for media (Safari will not play a <video> without them). Single range only.
  if (/^video\//.test(type)) {
    headers['Accept-Ranges'] = 'bytes';
    const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
    if (m && (m[1] || m[2])) {
      const start = m[1] ? Number(m[1]) : Math.max(0, st.size - Number(m[2]));
      const end = m[1] && m[2] ? Math.min(Number(m[2]), st.size - 1) : st.size - 1;
      if (start >= st.size || start > end) return send(res, 416, '', { ...headers, 'Content-Range': `bytes */${st.size}` });
      res.writeHead(206, { ...SECURITY, ...headers, 'Content-Range': `bytes ${start}-${end}/${st.size}`, 'Content-Length': end - start + 1 });
      if (req.method === 'HEAD') return res.end();
      return createReadStream(file, { start, end }).pipe(res);
    }
  }
  const gzip = COMPRESSIBLE.has(ext) && /\bgzip\b/.test(req.headers['accept-encoding'] || '');
  if (gzip) headers['Content-Encoding'] = 'gzip';
  else headers['Content-Length'] = st.size;
  res.writeHead(status, { ...SECURITY, ...headers });
  if (req.method === 'HEAD') return res.end();
  const stream = createReadStream(file);
  (gzip ? stream.pipe(createGzip({ level: 6 })) : stream).pipe(res);
}

const server = http.createServer(async (req, res) => {
  try {
    const path = req.url.split('?')[0];
    // Enquiry API (lib/http): the same handlers Vercel mounts from api/*.mjs
    if (isEnquiryApi(path)) {
      const origin = `http://${req.headers.host || `${HOST}:${PORT}`}`;
      return await sendResponse(res, await enquiryApi(toRequest(req, { origin }), { ip: req.socket.remoteAddress }));
    }
    if (path.startsWith('/api/')) return json(res, 404, { ok: false, error: 'Not found' });
    if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 405, { ok: false, error: 'Method not allowed' });

    const file = resolveStatic(path);
    if (file) return serveFile(req, res, file);
    const nf = join(SITE, '404.html');
    if (existsSync(nf)) return serveFile(req, res, nf, 404);
    return send(res, 404, 'Not found', { 'Content-Type': 'text/plain; charset=utf-8' });
  } catch (err) {
    console.error(err);
    return json(res, 500, { ok: false, error: 'Server error' });
  }
});

if (!existsSync(SITE)) {
  console.error('site/ not found — run `npm run build` first');
  process.exit(1);
}
server.listen(PORT, HOST, () => {
  console.log(`Good Times in Cape Town → http://${HOST}:${PORT}  (serving ${SITE})`);
  console.log(`enquiry API: POST /api/enquiries · ENQUIRY_MODE=${process.env.ENQUIRY_MODE || 'preview (default)'}`);
});
