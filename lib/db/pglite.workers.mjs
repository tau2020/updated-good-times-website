/**
 * What `#pglite-driver` resolves to in the Cloudflare bundle (the "workerd"
 * condition in package.json › imports): PGlite needs a local disk, so the
 * Function carries this stub instead. lib/config.mjs already refuses a
 * pglite:// DATABASE_URL on Cloudflare; this is the backstop.
 */
export async function pgliteDriver() {
  throw new Error('DATABASE_URL=pglite://… works only under Node (local development and tests). On Cloudflare use a postgres:// connection string.');
}
