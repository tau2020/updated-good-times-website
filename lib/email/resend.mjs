/**
 * Resend provider — one POST to https://api.resend.com/emails using the
 * platform fetch. No SDK: the API is a single JSON endpoint and this keeps
 * the function bundle small. (config.email.resendApiUrl differs only in local
 * tests, which point it at a stand-in; production refuses that.)
 */
import { config } from '../config.mjs';

export class ResendError extends Error {
  constructor(status, detail) {
    super(`Resend responded ${status}: ${detail}`);
    this.name = 'ResendError';
    this.status = status;
  }
}

export function createResendProvider({ fetchImpl = fetch, timeoutMs = 10_000 } = {}) {
  return {
    name: 'resend',
    async send({ to, subject, html, text, replyTo, headers }) {
      const body = {
        from: config.email.from,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        text,
        ...(replyTo ? { reply_to: replyTo } : {}),
        ...(headers && Object.keys(headers).length ? { headers } : {}),
      };
      let res;
      try {
        res = await fetchImpl(config.email.resendApiUrl, {
          method: 'POST',
          headers: { Authorization: `Bearer ${config.email.resendApiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (err) {
        throw new ResendError(0, err?.name === 'TimeoutError' ? 'timed out' : err?.message || 'network error');
      }
      let payload = {};
      try {
        payload = await res.json();
      } catch {
        /* non-JSON error body */
      }
      if (!res.ok) throw new ResendError(res.status, payload?.message || payload?.name || res.statusText);
      if (!payload?.id) throw new ResendError(res.status, 'no message id in response');
      return { id: payload.id };
    },
  };
}
