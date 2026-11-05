/**
 * Guardrail: the inherited identity (and its integrations and service
 * promises) must not creep back into the enquiry system. Scans the files this
 * workstream owns: the framework's earlier operators, their identifiers and
 * their service promises are banned.
 * Migrations 001/002 are historical and immutable (renaming them would break
 * the migration chain), so they are not scanned.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TARGETS = ['lib', 'api', 'scripts', 'src/assets/js/enquiry.js', 'src/assets/js/enquiry-schema.js', 'src/assets/css/enquiry.css', 'src/pages/enquire.mjs', 'src/tools/serve.mjs', '.env.example', 'vercel.json'];
const SKIP = new Set(['lib/db/migrations/001_init.sql', 'lib/db/migrations/002_journey_first.sql']);
// 003 has to name the legacy status values it migrates away from.
const ALLOW = { 'lib/db/migrations/003_gt_two_path.sql': [/'CONSULTATION_SCHEDULED'/g] };
const BANNED = [
  /\bJAP\b/,
  /jap[-_ ]?shuttles|japshuttlesandtours|shuttlejap/i,
  /\banesu\b/i,
  /best above the rest/i,
  /safari\s*(and|&|&amp;)\s*soul/i,
  /safariandsoul/i,
  /\bSJ-/,
  /\bssj\b/i,
  /SAFARI_ENQUIRY_EMAIL/,
  /journey/i,
  /consultation/i,
  /cal\.com|calcom/i,
  /follow-ups?\b/i,
  /CRON_SECRET/,
  /one working day/i,
  /travel designer/i,
];

async function files(path) {
  const abs = join(ROOT, path);
  const s = await stat(abs);
  if (s.isFile()) return [abs];
  const out = [];
  for (const e of await readdir(abs, { withFileTypes: true })) out.push(...(await files(join(path, e.name))));
  return out;
}

test('no inherited brand, identifiers, integrations or service promises in the enquiry system', async () => {
  const hits = [];
  for (const t of TARGETS) {
    for (const file of await files(t)) {
      const rel = relative(ROOT, file);
      if (SKIP.has(rel)) continue;
      // A line that names an old identifier only to keep it out says so (the brand guard's own convention).
      let src = (await readFile(file, 'utf8')).split('\n').filter((l) => !l.includes('brand-guard-allow')).join('\n');
      for (const re of ALLOW[rel] || []) src = src.replace(re, '');
      for (const re of BANNED) {
        const m = re.exec(src);
        if (m) hits.push(`${rel}: ${m[0]}`);
      }
    }
  }
  assert.deepEqual(hits, []);
});

test('package.json carries no inherited brand or identifiers', async () => {
  const pkg = await readFile(join(ROOT, 'package.json'), 'utf8');
  for (const re of BANNED.slice(0, 9)) assert.doesNotMatch(pkg, re);
});

test('the draft key and reference prefix are Good Times’', async () => {
  const js = await readFile(join(ROOT, 'src/assets/js/enquiry.js'), 'utf8');
  assert.match(js, /'gt:enquiry:draft'/);
  const ref = await readFile(join(ROOT, 'lib/enquiries/reference.mjs'), 'utf8');
  assert.match(ref, /REFERENCE_PREFIX = 'GT-'/);
});

test('no scheduled jobs remain in vercel.json', async () => {
  const v = JSON.parse(await readFile(join(ROOT, 'vercel.json'), 'utf8'));
  assert.equal(v.crons, undefined);
});

test('the browser scripts parse (a syntax error would only show up in a browser otherwise)', () => {
  for (const f of ['src/assets/js/enquiry.js', 'src/assets/js/enquiry-schema.js']) {
    execFileSync(process.execPath, ['--check', join(ROOT, f)], { stdio: 'pipe' });
  }
});
