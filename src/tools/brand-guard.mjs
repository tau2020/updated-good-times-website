#!/usr/bin/env node
/**
 * Brand-leak guard: fails if identifiers of another business appear in tracked
 * code, tests, config or the built site. Good Times in Cape Town's site reuses a
 * framework built for other operators, so this check keeps any of their names,
 * domains, contact details, listing ids or reference formats from coming back.
 *
 *   node src/tools/brand-guard.mjs
 *
 * A line can opt out with a `brand-guard-allow: <reason>` comment (used only for
 * tests proving old identifiers are rejected).
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PATTERNS = [
  // Earlier operators of the framework: names, domains, ids and reference formats
  /\bjap\b|jap[-_ ]?shuttles|shuttlejap|japshuttlesandtours|\bJAP-[A-Z0-9]{3,}|\bjap[:_-]/i,
  /\banesu\b|best above the rest|d17736095|\+?27\s?74\s?639\s?9667|746399667|81\s?262\s?5437/i,
  // ... and their products' slugs and names, so a stale link, fixture or label cannot survive
  /cape-peninsula-penguins-cape-of-good-hope-chapmans-peak|table-mountain-penguins-cape-of-good-hope|penguins-cape-of-good-hope-and-winelands|stellenbosch-franschhoek-winelands-tour|hermanus-whale-watching|cape-agulhas-two-oceans-tour|\bcape-town-city-tour\b|cape-town-winelands-classic|garden[- ]route[- ]explorer|winelands classic|safari-transfer-from-cape-town|cape-town-airport-transfer|safari-reserve/i,
  /safari\s*(?:and|&|&amp;)\s*soul|safariandsoul|\bSJ-[A-Z0-9]{3,}|\bssj[:_\-A-Z]|SAFARI_ENQUIRY|cal\.com|calcom|consultation_scheduled|journey[-_ ]first/i,
];
/**
 * Good Times' own earlier addresses that happen to share a banned slug. The WordPress site of 5–7 Nov 2026 published
 * the city tour at /tour/cape-town-city-tour/ (the slug came from Good Times' booking site; the hosting backup and
 * Search Console both record it), and the historical URL registry has to name that address to redirect it
 * (src/data/legacy-urls.mjs, site/_redirects, docs/seo/). Only that exact address is exempt, standing on its own (not
 * inside another URL or host) and ending there or at a slash: the slug anywhere else, or extended ("…-tour-with-…",
 * "…-tour.html"), still fails.
 */
const OWN_HISTORY = [/(?<![\w.:/-])\/tour\/cape-town-city-tour(?=\/|\s|$)/g];
const SKIP = [/^licenses\//, /^package-lock\.json$/, /^src\/tools\/brand-guard\.mjs$/, /^test\/identity\.test\.mjs$/, /^src\/assets\/js\/vendor\//];
const TEXT = new Set(['.mjs', '.js', '.json', '.md', '.html', '.css', '.sql', '.yml', '.yaml', '.toml', '.txt', '.svg', '.example', '.webmanifest', '.xml', '']);

let tracked = [];
try {
  tracked = execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean);
} catch {
  tracked = [];
}
const built = [];
const walk = (d) => {
  for (const n of readdirSync(d)) {
    const p = join(d, n);
    if (statSync(p).isDirectory()) walk(p);
    else built.push(relative(ROOT, p));
  }
};
if (existsSync(join(ROOT, 'site'))) walk(join(ROOT, 'site'));

const hits = [];
for (const file of [...new Set([...tracked, ...built])]) {
  if (SKIP.some((re) => re.test(file)) || !TEXT.has(extname(file)) || !existsSync(join(ROOT, file))) continue;
  const lines = readFileSync(join(ROOT, file), 'utf8').split('\n');
  lines.forEach((line, i) => {
    const own = OWN_HISTORY.reduce((l, re) => l.replace(re, ''), line);
    if (PATTERNS.some((re) => re.test(own)) && !line.includes('brand-guard-allow')) hits.push(`${file}:${i + 1}: ${line.trim().slice(0, 120)}`);
  });
}
if (hits.length) {
  console.log(`brand guard: ${hits.length} reference(s) to another business found\n${hits.join('\n')}`);
  process.exit(1);
}
console.log(`brand guard: ${tracked.length + built.length} files clean`);
