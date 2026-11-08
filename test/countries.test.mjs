/**
 * The booking form's country data (src/assets/js/countries.js): every country real and once, calling codes as
 * ITU-T E.164 has them, search that finds people's own words, and numbers composed so the API accepts them and
 * nobody's number is sent with a code they did not choose.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COUNTRIES, PRIMARY, byIso, byName, searchCountries, splitNumber, withCode, guessCountry, flagOf } from '../src/assets/js/countries.js';
import { isValidPhone } from '../src/assets/js/enquiry-schema.js';

test('every country is a real region, listed once, with a calling code of digits; shared codes name a primary country', () => {
  const regions = new Intl.DisplayNames(['en'], { type: 'region' });
  const isos = COUNTRIES.map((c) => c.iso);
  assert.equal(new Set(isos).size, isos.length, 'no country twice');
  assert.ok(COUNTRIES.length >= 235, `${COUNTRIES.length} countries`);
  for (const c of COUNTRIES) {
    assert.match(c.iso, /^[A-Z]{2}$/);
    assert.notEqual(regions.of(c.iso), c.iso, `${c.iso} is a region Intl knows`);
    assert.match(c.dial, /^[1-9]\d{0,2}$/, `${c.iso} calling code`);
    assert.ok(c.name.trim(), `${c.iso} has a name`);
  }
  for (const [dial, iso] of Object.entries(PRIMARY)) assert.equal(byIso(iso).dial, dial, `PRIMARY ${dial} → ${iso}`);
  // The codes visitors to Cape Town use most, and the region's
  const known = { ZA: '27', GB: '44', US: '1', CA: '1', DE: '49', NL: '31', FR: '33', BE: '32', CH: '41', AT: '43', IT: '39', ES: '34', PT: '351', IE: '353', SE: '46', NO: '47', DK: '45', FI: '358', AU: '61', NZ: '64', IN: '91', CN: '86', JP: '81', BR: '55', AE: '971', NA: '264', BW: '267', ZW: '263', MZ: '258', ZM: '260', KE: '254', NG: '234', MU: '230' };
  for (const [iso, dial] of Object.entries(known)) assert.equal(byIso(iso).dial, dial, iso);
  assert.equal(flagOf('ZA'), '🇿🇦');
});

test('search finds a country by its name, another name, its letters or its calling code, best first', () => {
  const first = (q, opts) => searchCountries(q, opts)[0]?.iso;
  assert.equal(first('uk'), 'GB');
  assert.equal(first('england'), 'GB');
  assert.equal(first('united k'), 'GB');
  assert.equal(first('+44'), 'GB');
  assert.equal(first('44'), 'GB');
  assert.equal(first('za'), 'ZA');
  assert.equal(first('sou'), 'ZA');
  assert.equal(first('holland'), 'NL');
  assert.equal(first('ivory'), 'CI');
  assert.equal(first('cote'), 'CI', 'accents do not matter');
  assert.equal(first('usa'), 'US');
  assert.equal(first('+1'), 'US');
  assert.deepEqual(searchCountries('congo').map((c) => c.iso).sort(), ['CD', 'CG']);
  assert.deepEqual(searchCountries('xyzzy'), []);
  // Nothing typed: the suggestions first, then everyone
  const all = searchCountries('', { first: ['GB', 'ZA'] });
  assert.deepEqual(all.slice(0, 2).map((c) => c.iso), ['GB', 'ZA']);
  assert.equal(all.length, COUNTRIES.length);
  assert.equal(byName('Ivory Coast').iso, 'CI');
  assert.equal(byName('nowhere'), null);
});

test('a number with its code is read back to its country; a local number takes the chosen code without the trunk 0', () => {
  assert.equal(splitNumber('+44 7700 900123').country.iso, 'GB');
  assert.equal(splitNumber('+44 7700 900123').rest, '7700 900123');
  assert.equal(splitNumber('0027 82 123 4567').country.iso, 'ZA');
  assert.equal(splitNumber('+263 77 123 4567').country.iso, 'ZW', 'three-digit codes before shorter ones');
  assert.equal(splitNumber('+44 1534 123456', 'JE').country.iso, 'JE', 'the chosen country when it shares the code');
  assert.equal(splitNumber('082 123 4567'), null);

  assert.equal(withCode('07700 900123', byIso('GB')), '+44 7700 900123');
  assert.equal(withCode('82 123 4567', byIso('ZA')), '+27 82 123 4567');
  assert.equal(withCode('06 1234 5678', byIso('IT')), '+39 06 1234 5678', 'Italy keeps its 0');
  assert.equal(withCode('1 212 555 0100', byIso('US')), '+1 212 555 0100', 'no doubled 1');
  assert.equal(withCode('0044 20 7946 0958', byIso('ZA')), '+44 20 7946 0958', 'a number with its own code keeps it');
  assert.equal(withCode('082 123 4567', null), '082 123 4567', 'no code chosen: left for the form to ask');
  assert.equal(withCode('', byIso('ZA')), '');
  for (const [n, iso] of [['07700 900123', 'GB'], ['082 123 4567', 'ZA'], ['0151 23456789', 'DE'], ['212 555 0100', 'US']]) {
    assert.ok(isValidPhone(withCode(n, byIso(iso))), `${n} in ${iso} passes the API's check`);
  }
});

test('the browser language only suggests a country (en-GB, de); plain English suggests none', () => {
  assert.equal(guessCountry(['en-GB', 'en']).iso, 'GB');
  assert.equal(guessCountry(['de']).iso, 'DE');
  assert.equal(guessCountry(['zh-Hant-TW']).iso, 'TW');
  assert.equal(guessCountry(['en']), null);
  assert.equal(guessCountry([]), null);
});
