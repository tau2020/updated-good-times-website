/**
 * A local stand-in for Resend's send endpoint (POST /emails), so the Resend
 * provider can be exercised from the Pages Functions in workerd without a
 * network. Point RESEND_API_URL at `url` (lib/config.mjs refuses that in
 * production).
 *
 * Mirrors the parts of the API the provider relies on: a Bearer key, the JSON
 * fields from / to / subject / html / text / reply_to / headers, `{ id }` on
 * success, and `{ statusCode, message, name }` errors. Every accepted message
 * is kept in `messages` (and written to `outbox` as JSON when given).
 */
import { createServer } from 'node:http';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

/**
 * @param {{ apiKey?: string, outbox?: string, port?: number }} [opts]
 */
export async function startResendStandIn({ apiKey = 're_test_local', outbox = '', port = 0 } = {}) {
  const messages = [];
  const failures = [];
  if (outbox) mkdirSync(outbox, { recursive: true });

  const server = createServer(async (req, res) => {
    const send = (status, body) => {
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(body));
    };
    let raw = '';
    for await (const chunk of req) raw += chunk;
    if (req.method !== 'POST' || req.url !== '/emails') return send(404, { statusCode: 404, message: 'Not found', name: 'not_found' });
    if (req.headers.authorization !== `Bearer ${apiKey}`) return send(401, { statusCode: 401, message: 'API key is invalid', name: 'validation_error' });
    const plan = failures.shift();
    if (plan === 'hang') return; // never answers: the provider's own timeout must fire
    if (plan) return send(plan, { statusCode: plan, message: 'stand-in: provider failure', name: 'application_error' });
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return send(400, { statusCode: 400, message: 'Invalid JSON', name: 'validation_error' });
    }
    for (const k of ['from', 'to', 'subject']) if (!msg[k]) return send(422, { statusCode: 422, message: `Missing \`${k}\` field.`, name: 'missing_required_field' });
    if (!msg.html && !msg.text) return send(422, { statusCode: 422, message: 'Missing `html` or `text` field.', name: 'missing_required_field' });
    const id = randomUUID();
    messages.push({ id, ...msg });
    if (outbox) writeFileSync(join(outbox, `${Date.now()}-${id}.json`), JSON.stringify({ id, ...msg }, null, 2));
    send(200, { id });
  });
  await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));
  return {
    url: `http://127.0.0.1:${server.address().port}/emails`,
    apiKey,
    messages,
    /** Queue failures for the next sends: an HTTP status (e.g. 500) or 'hang'. */
    fail(...plans) {
      failures.push(...plans);
    },
    async close() {
      server.closeAllConnections?.();
      await new Promise((resolve) => server.close(resolve));
    },
  };
}
