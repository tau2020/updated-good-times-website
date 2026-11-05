/**
 * The PGlite driver: in-process Postgres for local development and tests.
 *
 * Node only. lib/db/index.mjs loads it through the `#pglite-driver` import
 * (package.json › imports), which resolves here under Node and to
 * pglite.workers.mjs under the Cloudflare bundler's "workerd" condition, so
 * PGlite (half a megabyte of code that needs a local disk) never reaches the
 * deployed Function.
 */
import { mkdir, rm } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** `pglite://memory` (throwaway) or `pglite://<path>` (persisted; relative paths are anchored to the repo root). */
export async function pgliteDriver(url) {
  const { PGlite } = await import('@electric-sql/pglite');
  const target = url.slice('pglite://'.length);
  let db;
  if (target === 'memory' || target === '') db = new PGlite();
  else {
    // The parent must exist before PGlite opens the directory.
    const dir = resolve(ROOT, target);
    await mkdir(dirname(dir), { recursive: true });
    // PGlite is single-process per directory; a postmaster.pid is only ever a
    // leftover from a process that was killed, and makes the next open abort.
    await rm(join(dir, 'postmaster.pid'), { force: true });
    db = new PGlite(dir);
  }
  // Close cleanly on Ctrl-C / SIGTERM so the data directory is left tidy.
  for (const sig of ['SIGINT', 'SIGTERM']) {
    process.once(sig, () => {
      db.close().finally(() => process.exit(sig === 'SIGINT' ? 130 : 143));
    });
  }
  await db.waitReady;
  return {
    kind: 'pglite',
    async query(text, params = []) {
      const res = await db.query(text, params);
      return { rows: res.rows, rowCount: res.affectedRows ?? res.rows.length };
    },
    async close() {
      await db.close();
    },
  };
}
