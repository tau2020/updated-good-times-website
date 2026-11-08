/**
 * Every historical address in the registry, against each environment's build as Pages serves it (`wrangler pages
 * dev`: the real asset worker, _redirects and _headers), through the same suite that checks a deployment
 * (qa/legacy-urls.mjs): the first response's status and Location, every hop, no loop, the final page, its canonical,
 * a topic word in its title or heading, the robots signals, preserved files byte for byte, retired addresses 404.
 *
 * The production build is served on 127.0.0.1, so its pages.dev-only noindex rules do not apply: the run proves that
 * the same files on the domain would be indexable, while preview builds stay noindex everywhere.
 *
 * The local server (src/tools/serve.mjs) applies the same _redirects, so `npm start` and the browser tests follow the
 * old addresses as Pages would.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { mkdtempSync, cpSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ENVIRONMENTS } from '../scripts/cloudflare/project.mjs';
import { startPagesDev, freePort } from './helpers/pages-dev.mjs';
import { runLegacySuite } from '../qa/legacy-urls.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function build(vars) {
  const work = mkdtempSync(join(tmpdir(), 'gt-legacy-'));
  for (const dir of ['src', 'lib']) cpSync(join(ROOT, dir), join(work, dir), { recursive: true });
  cpSync(join(ROOT, 'package.json'), join(work, 'package.json'));
  execFileSync(process.execPath, ['src/build.mjs'], { cwd: work, env: { ...process.env, ...vars, VERCEL: '1' }, stdio: 'pipe' });
  process.on('exit', () => rmSync(work, { recursive: true, force: true }));
  return join(work, 'site');
}

const dirs = {};
for (const env of ['preview', 'production']) {
  test(`the ${env} build answers every historical address as the registry says, on the Pages runtime`, async () => {
    dirs[env] = build(ENVIRONMENTS[env].vars);
    const dev = await startPagesDev({ dir: dirs[env], bindings: ENVIRONMENTS[env].vars });
    try {
      const report = await runLegacySuite({ base: dev.url, env });
      const failures = report.results.filter((r) => !r.ok).map((r) => `${r.url}: ${r.problems.join('; ')}`);
      assert.deepEqual(failures, []);
      assert.ok(report.total >= 400, `${report.total} checks`);
    } finally {
      await dev.stop();
    }
  });
}

test('the local server follows _redirects as Pages does, before any file', async () => {
  const dir = dirs.preview || build(ENVIRONMENTS.preview.vars);
  const port = await freePort();
  const child = spawn(process.execPath, [join(ROOT, 'src/tools/serve.mjs')], { env: { ...process.env, SITE_DIR: dir, PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'] });
  const base = `http://127.0.0.1:${port}`;
  try {
    for (let i = 0; ; i++) {
      try {
        await (await fetch(`${base}/`)).arrayBuffer();
        break;
      } catch (err) {
        if (i > 50) throw err;
        await new Promise((r) => setTimeout(r, 100));
      }
    }
    const loc = async (path) => {
      const res = await fetch(`${base}${path}`, { redirect: 'manual' });
      await res.arrayBuffer();
      return [res.status, res.headers.get('location')];
    };
    assert.deepEqual(await loc('/tour/cape-peninsula-private-tour/'), [301, '/tours/cape-peninsula-private-tour/']);
    assert.deepEqual(await loc('/tour/winelands-experience'), [301, '/tours/cape-winelands-private-tour/']);
    assert.deepEqual(await loc('/users/book/quad-biking/?utm_source=x'), [301, '/enquire/?type=tour&tour=quad-biking']);
    assert.deepEqual(await loc('/accounts/login/?next=/users/book/sky-diving/'), [301, '/enquire/?next=/users/book/sky-diving/']);
    assert.deepEqual(await loc('/tour/cape-town-city-tour/cape-town-city-private-tour-gallery-3/'), [301, '/tours/cape-town-city-private-tour/']);
    assert.deepEqual(await loc('/services/'), [200, null], 'a restored page is served, never redirected');
    assert.deepEqual(await loc('/media/gallery/33.png'), [404, null], 'a withdrawn original is not served');
  } finally {
    child.kill();
  }
});
