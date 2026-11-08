#!/usr/bin/env node
/**
 * The restricted application role: the website's Functions connect as it, the migrations as the owner.
 *
 *   OWNER_DATABASE_URL=… APP_ROLE_PASSWORD=… node scripts/db/app-role.mjs [--role gt_app]
 *
 * Creates the role if it is missing (or sets its password when it exists) and grants exactly what the enquiry API
 * needs: CONNECT on the database, USAGE on the public schema, SELECT/INSERT/UPDATE/DELETE on its tables (and on tables
 * the owner creates later, so a new migration needs no new grant), USAGE/SELECT on sequences. No CREATE, no DDL, no
 * superuser, no membership of Neon's neon_superuser (roles made through Neon's console or API get that; a role made in
 * SQL does not). Then it proves the role can read and cannot create a table.
 *
 * The password comes from the environment (generate one: node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))");
 * nothing secret is printed. The application's DATABASE_URL is the owner URL with this role and password in it.
 */
import { neon } from '@neondatabase/serverless';

const ROLE_RE = /^[a-z_][a-z0-9_]{1,30}$/;
const PASSWORD_RE = /^[A-Za-z0-9_-]{24,128}$/;

export async function ensureAppRole({ ownerUrl, role = 'gt_app', password, log = console.log, sqlFor = neon }) {
  if (!ROLE_RE.test(role)) throw new Error(`role name "${role}" must be lower-case letters, digits and _`);
  if (!PASSWORD_RE.test(password || '')) throw new Error('APP_ROLE_PASSWORD must be 24–128 characters of A–Z, a–z, 0–9, _ or - (base64url)');
  const url = new URL(ownerUrl);
  const owner = decodeURIComponent(url.username);
  const database = decodeURIComponent(url.pathname.replace(/^\//, '')) || 'neondb';
  const q = (s) => `"${s.replace(/"/g, '""')}"`;
  const sql = sqlFor(ownerUrl);
  const exists = (await sql.query('SELECT 1 FROM pg_roles WHERE rolname = $1', [role])).length > 0;
  // DDL takes no parameters: the role name and the password are checked against strict patterns above.
  await sql.query(`${exists ? 'ALTER' : 'CREATE'} ROLE ${q(role)} WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT PASSWORD '${password}'`);
  log(`${exists ? 'updated' : 'created'} role ${role}`);
  for (const stmt of [
    `GRANT CONNECT ON DATABASE ${q(database)} TO ${q(role)}`,
    `GRANT USAGE ON SCHEMA public TO ${q(role)}`,
    `REVOKE CREATE ON SCHEMA public FROM ${q(role)}`,
    `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${q(role)}`,
    `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${q(role)}`,
    `ALTER DEFAULT PRIVILEGES FOR ROLE ${q(owner)} IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${q(role)}`,
    `ALTER DEFAULT PRIVILEGES FOR ROLE ${q(owner)} IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO ${q(role)}`,
  ]) await sql.query(stmt);
  log(`granted ${role}: CONNECT on ${database}; USAGE on public; SELECT, INSERT, UPDATE, DELETE on its tables (and future ones by ${owner})`);

  // Prove it: the role reads the tables and cannot create one.
  url.username = role;
  url.password = password;
  const app = sqlFor(url.toString());
  const who = await app.query('SELECT current_user AS u, (SELECT count(*)::int FROM schema_migrations) AS migrations');
  let canCreate = true;
  try {
    await app.query('CREATE TABLE gt_app_probe (x int)');
    await sql.query('DROP TABLE IF EXISTS gt_app_probe');
  } catch {
    canCreate = false;
  }
  if (canCreate) throw new Error(`${role} could create a table: its privileges are wider than intended`);
  log(`checked: connects as ${who[0].u}, reads ${who[0].migrations} applied migrations, cannot create tables`);
  return { role, created: !exists };
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const i = process.argv.indexOf('--role');
  ensureAppRole({ ownerUrl: process.env.OWNER_DATABASE_URL || '', role: i > -1 ? process.argv[i + 1] : 'gt_app', password: process.env.APP_ROLE_PASSWORD })
    .catch((err) => {
      // Never echo a connection string.
      console.error(`Failed: ${String(err.message).replace(/postgres(ql)?:\/\/\S+/g, '[redacted]')}`);
      process.exitCode = 1;
    });
}
