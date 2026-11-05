/**
 * A display currency never becomes part of a booking (D75): the request form
 * sends no price or currency, and anything of the kind added to a request by
 * hand is ignored. Nothing is stored or emailed from it.
 */
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { one, closeDb, post, validTour, key, OUTBOX, decodeEml } from './helpers/env.mjs';
import { handle } from '../lib/http/app.mjs';
import { FIELDS } from '../lib/enquiries/schema.mjs';

after(() => closeDb());

test('the request schema has no price, total or currency field', () => {
  for (const name of Object.keys(FIELDS)) assert.doesNotMatch(name, /price|total|currency|amount|rate/i, name);
});

test('price and currency fields added to a request are ignored: not stored, not emailed', async () => {
  const forged = { ...validTour(), email: 'currency.forger@example.com', currency: 'USD', display_currency: 'USD', price: 1, total: 1, amount_due: 0, rate: '99' };
  const res = await handle(...post('/api/enquiries', forged, { headers: { 'idempotency-key': key() } }));
  assert.equal(res.status, 201);
  const { reference } = await res.json();
  const row = await one('SELECT * FROM enquiries WHERE reference_number = $1', [reference]);
  for (const column of Object.keys(row)) assert.doesNotMatch(column, /price|total|currency|amount|rate/i, column);
  assert.doesNotMatch(JSON.stringify(row), /USD|"99"/, 'no forged value stored in any column');
  const mails = readdirSync(OUTBOX)
    .map((f) => readFileSync(join(OUTBOX, f), 'utf8'))
    .filter((eml) => decodeEml(eml).join('').includes(reference));
  assert.equal(mails.length, 2, 'the team copy and the acknowledgement');
  for (const eml of mails) assert.doesNotMatch(decodeEml(eml).join('\n'), /USD|US\$|≈/);
});
