/**
 * A local stand-in for Neon's HTTP query endpoint, backed by PGlite (real
 * Postgres compiled to WebAssembly), so the production database driver
 * (@neondatabase/serverless over fetch) can be exercised end to end without a
 * network: from Node, and from the Pages Functions running in workerd.
 *
 * Protocol (what the driver sends and expects, @neondatabase/serverless 1.x):
 *   POST /sql   headers Neon-Connection-String, Neon-Raw-Text-Output: true, Neon-Array-Mode: true
 *               body { query, params }   params already serialised to text (or null)
 *   200         { command, rowCount, fields: [{ name, dataTypeID }], rows: [[text|null, …]] }
 *   400         { message, code, constraint, … }   a Postgres error; the driver raises NeonDbError
 *   other       plain text; the driver raises "Server error (HTTP status N)"
 *
 * The driver parses the text values by type OID exactly as it does for Neon, so
 * timestamps, booleans and jsonb take the same path as in production. Point
 * DATABASE_HTTP_ENDPOINT at `url` (lib/config.mjs refuses that in production).
 */
import { createServer } from 'node:http';
import { PGlite } from '@electric-sql/pglite';

// Postgres error fields the driver copies onto NeonDbError.
const ERROR_FIELDS = ['severity', 'code', 'detail', 'hint', 'position', 'internalPosition', 'internalQuery', 'where', 'schema', 'table', 'column', 'dataType', 'constraint', 'file', 'line', 'routine'];
// Return every column as Postgres text, as Neon does with Neon-Raw-Text-Output.
const RAW_TEXT = Object.fromEntries(Array.from({ length: 4096 }, (_, oid) => [oid, (v) => v]));

/**
 * @returns {Promise<{ url: string, db: PGlite, requests: object[], fail: (n?: number, status?: number) => void, close: () => Promise<void> }>}
 */
export async function startNeonStandIn({ port = 0 } = {}) {
  const db = new PGlite();
  await db.waitReady;
  const requests = [];
  let failures = 0;
  let failStatus = 503;

  const server = createServer(async (req, res) => {
    const send = (status, body, type = 'application/json') => {
      res.writeHead(status, { 'content-type': type });
      res.end(type === 'application/json' ? JSON.stringify(body) : body);
    };
    let raw = '';
    for await (const chunk of req) raw += chunk;
    const entry = { method: req.method, path: req.url, headers: req.headers, body: raw };
    requests.push(entry);
    if (req.method !== 'POST' || req.url !== '/sql') return send(404, 'not found', 'text/plain');
    if (!req.headers['neon-connection-string']) return send(400, { message: 'missing Neon-Connection-String header' });
    if (failures > 0) {
      failures--;
      return send(failStatus, 'stand-in: database unavailable', 'text/plain');
    }
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      return send(400, { message: 'invalid JSON body' });
    }
    if (Array.isArray(body.queries)) return send(400, { message: 'transactions are not used by this application' });
    try {
      const r = await db.query(body.query, body.params ?? [], { rowMode: 'array', parsers: RAW_TEXT });
      const command = /^\s*(\w+)/.exec(body.query)?.[1]?.toUpperCase() ?? '';
      send(200, {
        command,
        rowCount: r.affectedRows ?? r.rows.length,
        fields: r.fields.map((f) => ({ name: f.name, dataTypeID: f.dataTypeID })),
        rows: r.rows,
        rowAsArray: true,
      });
    } catch (err) {
      const out = { message: err.message };
      for (const k of ERROR_FIELDS) if (err[k] !== undefined) out[k] = err[k];
      send(400, out);
    }
  });
  await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}/sql`;
  return {
    url,
    db,
    requests,
    /** The next `n` queries fail with HTTP `status` (a database outage). */
    fail(n = 1, status = 503) {
      failures = n;
      failStatus = status;
    },
    async close() {
      await new Promise((resolve) => server.close(resolve));
      await db.close();
    },
  };
}
