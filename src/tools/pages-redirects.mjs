/**
 * Cloudflare Pages' _redirects, read and applied the way Pages does it (wrangler 4's parser, parseRedirects, and the
 * matcher of Pages' asset handler, pages-shared), so the build's checks (src/data/redirects.mjs), the local server
 * (src/tools/serve.mjs) and the tests agree with Pages itself:
 *
 *  - a line is `from to [status]` (302 by default); # starts a comment;
 *  - a rule is static only while no earlier rule had a splat (*) or a placeholder (:name): from the first dynamic rule
 *    on, every rule is dynamic and counts against the 100 dynamic rules, so static rules must all come first;
 *  - at most 2,000 static and 100 dynamic rules, and 1,000 characters a line (Cloudflare's documented limit; wrangler
 *    itself allows 2,000);
 *  - a source keeps only its path: a query string in it is dropped, so a rule for "/?p=13" would be a rule for "/";
 *  - the first rule for a source wins; later duplicates are ignored;
 *  - a static rule matches the exact, undecoded path and always wins; dynamic rules are tried in file order;
 *  - the Location keeps the destination's own query if it has one, and otherwise passes on the request's.
 */

export const LIMITS = Object.freeze({ static: 2000, dynamic: 100, line: 1000 });
export const STATUSES = new Set([200, 301, 302, 303, 307, 308]);
const SPLAT = /\*/;
const PLACEHOLDER = /:[A-Za-z]\w*/;
const escapeRegex = (s) => s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');

/** The path Pages keeps from a rule's source or a relative destination (its own URL parsing). */
function extractPath(token, { search = false, hash = false } = {}) {
  const path = token.startsWith('/') ? token : `/${token}`;
  const url = new URL(`//${path}`, 'relative://');
  return `${url.pathname}${search ? url.search : ''}${hash ? url.hash : ''}`;
}

/** A dynamic rule's pattern: * becomes the splat, :name a single segment. */
export function ruleRegExp(from) {
  let rule = from.split('*').map(escapeRegex).join('(?<splat>.*)');
  for (const m of [...rule.matchAll(/:([A-Za-z]\w*)/g)]) rule = rule.split(m[0]).join(`(?<${m[1]}>[^/]+)`);
  return new RegExp(`^${rule}$`);
}

/**
 * Parse a _redirects file.
 * @returns {{ staticRules: Map<string, object>, dynamicRules: object[], invalid: object[], counts: { static: number, dynamic: number } }}
 */
export function parseRedirects(text, { limits = LIMITS } = {}) {
  const staticRules = new Map();
  const dynamicRules = [];
  const invalid = [];
  const seen = new Set();
  const counts = { static: 0, dynamic: 0 };
  let canBeStatic = true;
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = (lines[i] || '').trim();
    const lineNumber = i + 1;
    if (!line || line.startsWith('#')) continue;
    if (line.length > limits.line) {
      invalid.push({ lineNumber, line, message: `longer than ${limits.line} characters` });
      continue;
    }
    const tokens = line.replace(/\s+#.*$/, '').split(/\s+/);
    if (tokens.length < 2 || tokens.length > 3) {
      invalid.push({ lineNumber, line, message: `expected 2 or 3 tokens, got ${tokens.length}` });
      continue;
    }
    const [rawFrom, rawTo, rawStatus = '302'] = tokens;
    if (/^https:\/\//.test(rawFrom)) {
      invalid.push({ lineNumber, line, message: 'only relative sources are allowed' });
      continue;
    }
    const from = extractPath(rawFrom);
    let dynamic = false;
    if (canBeStatic && !SPLAT.test(from) && !PLACEHOLDER.test(from)) {
      counts.static += 1;
      if (counts.static > limits.static) {
        invalid.push({ lineNumber, line, message: `more than ${limits.static} static rules` });
        continue;
      }
    } else {
      dynamic = true;
      canBeStatic = false;
      counts.dynamic += 1;
      if (counts.dynamic > limits.dynamic) {
        invalid.push({ lineNumber, line, message: `more than ${limits.dynamic} dynamic rules: the rest of the file is skipped` });
        break;
      }
    }
    let to;
    if (/^https:\/\//.test(rawTo)) to = rawTo;
    else if (rawTo.startsWith('/')) to = extractPath(rawTo, { search: true, hash: true });
    else {
      invalid.push({ lineNumber, line, message: 'a destination must be relative (/…) or https://' });
      continue;
    }
    const status = Number(rawStatus);
    if (!STATUSES.has(status)) {
      invalid.push({ lineNumber, line, message: `status ${rawStatus} is not one of ${[...STATUSES].join(', ')}` });
      continue;
    }
    const relative = !/^https:\/\//.test(to);
    if (relative && ((from.endsWith('/*') && /\/index(\.html)?$/.test(to)) || (from.endsWith('/') && /\/index(\.html)?$/.test(to)))) {
      invalid.push({ lineNumber, line, message: 'infinite loop: a redirect to /index' });
      continue;
    }
    if (seen.has(from)) {
      invalid.push({ lineNumber, line, message: `duplicate rule for ${from}` });
      continue;
    }
    seen.add(from);
    const rule = { from, to, status, lineNumber, dynamic };
    if (dynamic) dynamicRules.push({ ...rule, regex: ruleRegExp(from) });
    else staticRules.set(from, rule);
  }
  return { staticRules, dynamicRules, invalid, counts };
}

/**
 * The rule Pages applies to a request path (undecoded), with its destination filled in, or null. As Pages' own
 * handler (pages-shared, which `wrangler pages dev` runs too): placeholders are replaced and nothing else is done to
 * the destination (Workers' asset worker also trims it and collapses "//"; Pages does not). The rules are the ones
 * parseRedirects kept; Pages builds its table without the lines that parser rejects, which the build forbids anyway.
 */
export function matchRedirect(rules, pathname) {
  const hit = rules.staticRules.get(pathname);
  if (hit) return hit;
  for (const rule of rules.dynamicRules) {
    const m = rule.regex.exec(pathname);
    if (!m) continue;
    let to = rule.to;
    for (const [k, v] of Object.entries(m.groups || {})) to = to.replaceAll(`:${k}`, v);
    return { ...rule, to };
  }
  return null;
}

/** The Location header Pages sends for a match on `requestUrl`. */
export function locationFor(match, requestUrl) {
  const req = new URL(requestUrl);
  const dest = new URL(match.to, requestUrl);
  const search = dest.search || req.search;
  if (dest.origin === req.origin) return `${dest.pathname}${search}${dest.hash}`;
  return `${dest.href.slice(0, dest.href.length - (dest.search.length + dest.hash.length))}${search}${dest.hash}`;
}
