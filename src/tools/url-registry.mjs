#!/usr/bin/env node
/**
 * Writes the historical URL registry (src/data/legacy-urls.mjs) as the tables people read:
 *   docs/seo/historical-url-registry.csv   one row per entry
 *   docs/seo/HISTORICAL_URL_REGISTRY.md    the same, grouped, with the totals and the evidence key
 *   docs/seo/_redirects.production.txt     a copy of the production build's site/_redirects, for review (never deployed)
 *
 *   node src/tools/url-registry.mjs          (npm run seo:registry) write both
 *   node src/tools/url-registry.mjs --check  exit 1 if either is out of date (test/legacy-registry.test.mjs runs it)
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { legacyUrls, concreteUrls, ERAS, SOURCES, ACTIONS, OWNERS, PRIORITIES, REGISTRY_DATE } from '../data/legacy-urls.mjs';
import { redirectsFile } from '../data/redirects.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const CSV_PATH = join(ROOT, 'docs', 'seo', 'historical-url-registry.csv');
export const MD_PATH = join(ROOT, 'docs', 'seo', 'HISTORICAL_URL_REGISTRY.md');
export const REDIRECTS_PATH = join(ROOT, 'docs', 'seo', '_redirects.production.txt');

const FIRST = { keep: '200', page: '200', asset: '200', query: '200', redirect: '301', prefix: '301', platform: '308', host: '301 (at cutover)', retire: '404', hold: '404 (until decided)' };
const finalOf = (e) => (['redirect', 'prefix', 'platform', 'host'].includes(e.action) ? e.to : e.action === 'query' ? '/' : ['retire', 'hold'].includes(e.action) ? '' : e.path);
const csvCell = (v) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

export function registryCsv() {
  const head = ['path', 'group', 'era', 'priority', 'action', 'first_response', 'final_destination', 'owner', 'decision', 'evidence', 'covers', 'note'];
  const rows = legacyUrls.map((e) => [
    e.path,
    e.group,
    e.era.join(' '),
    e.priority,
    e.action,
    FIRST[e.action],
    finalOf(e),
    e.owner,
    e.decision || '',
    e.sources.join(' '),
    String(concreteUrls(e).length || (e.action === 'host' ? 'host' : 0)),
    e.note || '',
  ]);
  return `${[head, ...rows].map((r) => r.map((c) => csvCell(String(c))).join(',')).join('\n')}\n`;
}

const md = (s) => String(s).replace(/\|/g, '\\|');
const code = (s) => (s ? `\`${md(s)}\`` : '');

export function registryMarkdown() {
  const count = (k, v) => legacyUrls.filter((e) => e[k] === v).length;
  const concrete = new Set(legacyUrls.flatMap(concreteUrls)).size;
  const out = [
    '# Historical URL registry',
    '',
    `Generated from \`src/data/legacy-urls.mjs\` (${REGISTRY_DATE}) by \`npm run seo:registry\`: edit the registry, never this file. The same entries build \`site/_redirects\` (\`src/data/redirects.mjs\`), the restored pages and the preserved files, and drive the tests (\`test/legacy-registry.test.mjs\`, \`test/legacy-urls.test.mjs\`) and the suite for any deployment (\`node qa/legacy-urls.mjs --base=<url> --env=<env>\`). The CSV beside it has the same rows.`,
    '',
    `**${legacyUrls.length} entries** covering **${concrete} concrete addresses** (patterns expanded through their samples), plus the two host redirects.`,
    '',
    'Search Console figures are private and are not in this public repository: the evidence column names the sources (key below), and the figures are in the owner’s Drive (Good Times Web Migration).',
    '',
    '## Totals',
    '',
    '| Action | Entries | | Priority | Entries | | Owner | Entries |',
    '|---|---|---|---|---|---|---|---|',
  ];
  const actions = Object.keys(ACTIONS);
  const owners = Object.keys(OWNERS);
  for (let i = 0; i < Math.max(actions.length, PRIORITIES.length, owners.length); i++) {
    const a = actions[i];
    const p = PRIORITIES[i];
    const o = owners[i];
    out.push(`| ${a ? `${a}` : ''} | ${a ? count('action', a) : ''} | | ${p || ''} | ${p ? count('priority', p) : ''} | | ${o || ''} | ${o ? count('owner', o) : ''} |`);
  }
  out.push('', '## Key', '', '| Action | Meaning |', '|---|---|', ...actions.map((a) => `| ${a} | ${md(ACTIONS[a])} |`));
  out.push('', '| Owner | Meaning |', '|---|---|', ...owners.map((o) => `| ${o} | ${md(OWNERS[o])} |`));
  out.push('', '| Evidence | Source |', '|---|---|', ...Object.entries(SOURCES).map(([k, s]) => `| ${k} | ${md(s.label)}${s.private ? ' (figures private)' : ''} |`));
  out.push('', '| Era | Site |', '|---|---|', ...Object.entries(ERAS).map(([k, v]) => `| ${k} | ${md(v)} |`));
  let group = '';
  for (const e of legacyUrls) {
    if (e.group !== group) {
      group = e.group;
      out.push('', `## ${group}`, '', '| Address | Priority | Action | First response | Final destination | Owner | Evidence | Note |', '|---|---|---|---|---|---|---|---|');
    }
    const covers = concreteUrls(e).filter((u) => u !== e.path);
    const samples = covers.length ? ` (${covers.length} addresses, e.g. ${covers.slice(0, 2).map(code).join(', ')})` : '';
    out.push(
      `| ${code(e.path)} | ${e.priority} | ${e.action} | ${FIRST[e.action]} | ${code(finalOf(e))} | ${e.owner}${e.decision ? ` (${e.decision})` : ''} | ${e.sources.join(', ')} | ${md(e.note || '')}${samples} |`,
    );
  }
  return `${out.join('\n')}\n`;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const files = [
    [CSV_PATH, registryCsv()],
    [MD_PATH, registryMarkdown()],
    [REDIRECTS_PATH, redirectsFile({ env: 'production' })],
  ];
  if (process.argv.includes('--check')) {
    const stale = files.filter(([p, body]) => !existsSync(p) || readFileSync(p, 'utf8') !== body).map(([p]) => p);
    if (stale.length) {
      console.error(`out of date (run npm run seo:registry): ${stale.join(', ')}`);
      process.exit(1);
    }
    console.log('the registry tables are up to date');
  } else {
    mkdirSync(dirname(CSV_PATH), { recursive: true });
    for (const [p, body] of files) writeFileSync(p, body);
    console.log(`wrote ${files.map(([p]) => p).join(', ')}`);
  }
}
