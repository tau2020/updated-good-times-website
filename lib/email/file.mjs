/**
 * File provider: local development and tests only. Writes each message as an RFC 822
 * .eml (multipart/alternative, so both parts can be inspected) into
 * data/outbox/ (or EMAIL_OUTBOX_DIR) and prints one line. Nothing leaves
 * the machine. Open the .eml in Mail.app / Outlook to check rendering.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { config } from '../config.mjs';

const DEFAULT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'data', 'outbox');

const b64 = (s) => Buffer.from(s, 'utf8').toString('base64').replace(/(.{76})/g, '$1\r\n');

// Diagnostics go to stderr: this provider runs under the test runner, which streams its own serialised
// results over the child's stdout; plain stdout writes interleaved with that stream intermittently break
// its parser ("Unable to deserialize cloned data").
export function createFileProvider({ dir = process.env.EMAIL_OUTBOX_DIR || DEFAULT_DIR, log = console.error } = {}) {
  return {
    name: 'file',
    dir,
    async send({ to, subject, html, text, replyTo, headers = {} }) {
      const id = `file-${Date.now()}-${randomBytes(4).toString('hex')}`;
      const boundary = `----=_gt_${randomBytes(8).toString('hex')}`;
      const recipients = Array.isArray(to) ? to.join(', ') : to;
      const lines = [
        `From: ${config.email.from}`,
        `To: ${recipients}`,
        ...(replyTo ? [`Reply-To: ${replyTo}`] : []),
        `Subject: =?UTF-8?B?${Buffer.from(subject, 'utf8').toString('base64')}?=`,
        `Date: ${new Date().toUTCString()}`,
        `Message-ID: <${id}@goodtimesincapetown.local>`,
        ...Object.entries(headers).map(([k, v]) => `${k}: ${v}`),
        'MIME-Version: 1.0',
        `Content-Type: multipart/alternative; boundary="${boundary}"`,
        '',
        `--${boundary}`,
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: base64',
        '',
        b64(text),
        `--${boundary}`,
        'Content-Type: text/html; charset=UTF-8',
        'Content-Transfer-Encoding: base64',
        '',
        b64(html),
        `--${boundary}--`,
        '',
      ];
      await mkdir(dir, { recursive: true });
      const file = join(dir, `${id}.eml`);
      await writeFile(file, lines.join('\r\n'), 'utf8');
      log(`✉  [file] → ${recipients} · "${subject}" · ${file}`);
      return { id, file };
    },
  };
}
