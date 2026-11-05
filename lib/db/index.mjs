/**
 * Database access — one function, two drivers.
 *
 *   query(text, params) → { rows, rowCount }
 *
 * DATABASE_URL decides the driver:
 *   postgres://… | postgresql://…  Neon serverless (HTTP). Production (Cloudflare Pages Functions).
 *   pglite://memory                 PGlite in-process, throwaway. Tests.
 *   pglite://<path>                 PGlite persisted to a directory. Local dev.
 *
 * Both are real Postgres, so migrations and queries are written once. Keep
 * every statement single-purpose and parameterised ($1, $2 …); never build
 * SQL from visitor input.
 */
import { config } from '../config.mjs';

let driver;

async function neonDriver(url) {
  const { neon, neonConfig } = await import('@neondatabase/serverless');
  // Local tests only (lib/config.mjs refuses it in production): a Neon-compatible stand-in.
  if (config.databaseHttpEndpoint) neonConfig.fetchEndpoint = config.databaseHttpEndpoint;
  const sql = neon(url);
  return {
    kind: 'neon',
    async query(text, params = []) {
      const rows = await sql.query(text, params);
      return { rows, rowCount: rows.length };
    },
    async close() {},
  };
}

async function open() {
  const url = config.databaseUrl;
  if (/^postgres(ql)?:\/\//.test(url)) return neonDriver(url);
  // Node only (lib/db/pglite.mjs); the Cloudflare bundle resolves this import to a stub.
  if (url.startsWith('pglite://')) return (await import('#pglite-driver')).pgliteDriver(url);
  throw new Error('DATABASE_URL must start with postgres:// or pglite://');
}

/** Run one parameterised statement. */
export async function query(text, params = []) {
  driver ??= await open();
  return driver.query(text, params);
}

/** Convenience: first row or null. */
export async function one(text, params = []) {
  const { rows } = await query(text, params);
  return rows[0] ?? null;
}

/** Close the connection (tests, scripts). The next query reopens. */
export async function closeDb() {
  const d = driver;
  driver = undefined;
  if (d) await d.close();
}

/** True when a Postgres error is a unique-constraint violation, optionally on a named constraint/index. */
export function isUniqueViolation(err, constraint) {
  const code = err?.code ?? err?.cause?.code;
  const msg = String(err?.message ?? '');
  const unique = code === '23505' || /duplicate key value violates unique constraint/i.test(msg);
  if (!unique) return false;
  return constraint ? msg.includes(constraint) || err?.constraint === constraint : true;
}
