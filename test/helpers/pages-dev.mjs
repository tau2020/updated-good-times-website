/**
 * Run a directory and this repository's functions/ under `wrangler pages dev`:
 * the real Workers runtime (workerd), with the compatibility settings of the
 * production project (scripts/cloudflare/project.mjs) and the given variables
 * as bindings. Used by test/pages-functions.test.mjs and
 * scripts/cloudflare/local-pages.mjs.
 */
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PROJECT } from '../../scripts/cloudflare/project.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** A free local TCP port. */
export function freePort() {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

/**
 * @param {{ dir: string, bindings?: Record<string,string>, port?: number, timeoutMs?: number }} opts
 * @returns {Promise<{ url: string, output: () => string, stop: () => Promise<void> }>}
 */
export async function startPagesDev({ dir, bindings = {}, port, timeoutMs = 120_000 }) {
  port ??= await freePort();
  const args = [
    'wrangler', 'pages', 'dev', dir,
    '--port', String(port), '--ip', '127.0.0.1',
    '--compatibility-date', PROJECT.compatibilityDate,
    ...PROJECT.compatibilityFlags.flatMap((f) => ['--compatibility-flags', f]),
    '--show-interactive-dev-session=false',
    ...Object.entries(bindings).flatMap(([k, v]) => ['--binding', `${k}=${v}`]),
  ];
  // Its own process group, so stop() also ends the workerd children.
  const child = spawn('npx', args, { cwd: ROOT, detached: true, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, WRANGLER_SEND_METRICS: 'false', CI: 'true' } });
  let output = '';
  child.stdout.on('data', (d) => (output += d));
  child.stderr.on('data', (d) => (output += d));
  const url = `http://127.0.0.1:${port}`;
  const stop = async () => {
    if (child.exitCode !== null) return;
    const exited = new Promise((resolve) => child.once('exit', resolve));
    try {
      process.kill(-child.pid, 'SIGTERM');
    } catch {
      /* already gone */
    }
    await Promise.race([exited, new Promise((r) => setTimeout(r, 5000))]);
    try {
      process.kill(-child.pid, 'SIGKILL');
    } catch {
      /* already gone */
    }
  };
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    if (child.exitCode !== null) throw new Error(`wrangler pages dev exited (${child.exitCode}):\n${output}`);
    try {
      const res = await fetch(`${url}/`, { signal: AbortSignal.timeout(2000) });
      await res.arrayBuffer();
      break;
    } catch {
      if (Date.now() > deadline) {
        await stop();
        throw new Error(`wrangler pages dev did not start within ${timeoutMs} ms:\n${output}`);
      }
      await new Promise((r) => setTimeout(r, 300));
    }
  }
  return { url, output: () => output, stop };
}
