import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateReference, uniqueReference, isReference, REFERENCE_ALPHABET, REFERENCE_PREFIX } from '../lib/enquiries/reference.mjs';
import { site } from '../src/data/site.mjs';

test('references are GT- plus six characters from the phone-safe alphabet', () => {
  assert.equal(REFERENCE_PREFIX, 'GT-');
  assert.equal(REFERENCE_PREFIX, site.enquiry.referencePrefix, 'the page and the API agree on the prefix');
  for (let i = 0; i < 500; i++) {
    const ref = generateReference();
    assert.ok(isReference(ref), ref);
    assert.doesNotMatch(ref.slice(4), /[ILO01]/);
  }
  assert.equal(REFERENCE_ALPHABET.length, 31);
});

test('uniqueReference retries on collision and gives up after maxAttempts', async () => {
  const seen = new Set(['GT-AAAAAA']);
  let calls = 0;
  const rng = () => (calls++ < 6 ? 0 : 1); // first candidate is all-A (taken), second is all-B
  const ref = await uniqueReference(async (r) => seen.has(r), { rng });
  assert.equal(ref, 'GT-BBBBBB');
  await assert.rejects(uniqueReference(async () => true, { maxAttempts: 3 }), /3 attempts/);
});

test('isReference rejects lookalikes', () => {
  assert.equal(isReference('GT-ABC123'), false); // 1 not allowed
  assert.equal(isReference('gt-ABCDEF'), false);
  assert.equal(isReference('GT-ABCDEFG'), false);
  assert.equal(isReference('SJ-ABCDEF'), false); // brand-guard-allow: proves the old prefix is rejected
  assert.equal(isReference('GT-ABCDEF'), true);
});
