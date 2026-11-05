#!/usr/bin/env node
/**
 * Forward-only migration runner.
 *   node lib/db/migrate.mjs        apply every lib/db/migrations/*.sql not yet recorded
 *
 * Files are applied in name order, one statement at a time (the Neon HTTP
 * driver accepts a single statement per call), and recorded in
 * schema_migrations. Migrations must be idempotent (IF NOT EXISTS) so a
 * partial failure can simply be re-run.
 */
import { readdir, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { query, closeDb } from './index.mjs';

const DIR = join(dirname(fileURLToPath(import.meta.url)), 'migrations');

/** Split a .sql file into statements. Our migrations use no dollar-quoting or string literals containing ';'. */
export function splitStatements(sql) {
  return sql
    .split('\n')
    .filter((l) => !l.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function migrate({ log = console.log } = {}) {
  await query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
  const done = new Set((await query('SELECT name FROM schema_migrations')).rows.map((r) => r.name));
  const files = (await readdir(DIR)).filter((f) => f.endsWith('.sql')).sort();
  let applied = 0;
  for (const file of files) {
    if (done.has(file)) continue;
    const sql = await readFile(join(DIR, file), 'utf8');
    for (const stmt of splitStatements(sql)) await query(stmt);
    await query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
    log(`applied ${file}`);
    applied++;
  }
  if (!applied) log('database is up to date');
  return applied;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  migrate()
    .then(() => closeDb())
    .catch((e) => {
      console.error(e.message);
      process.exitCode = 1;
    });
}
