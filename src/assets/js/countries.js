/* Good Times in Cape Town: countries for the booking form's pickers (enquire/ only)
   Loaded as an ES module by country-pickers.js; the tests import it too.

   Each row: ISO 3166-1 alpha-2 code, English name, international calling code (ITU-T E.164, digits only), and other
   names people search by. Countries sharing a calling code (+1, +7, +44, …) each keep their own row; reading a number
   back to a country prefers the one in PRIMARY. The +1 Caribbean countries take +1, their area code being part of
   the number people write. */

const ROWS = [
  ['AF', 'Afghanistan', '93'],
  ['AX', 'Åland Islands', '358', 'Aland'],
  ['AL', 'Albania', '355'],
  ['DZ', 'Algeria', '213'],
  ['AS', 'American Samoa', '1'],
  ['AD', 'Andorra', '376'],
  ['AO', 'Angola', '244'],
  ['AI', 'Anguilla', '1'],
  ['AG', 'Antigua and Barbuda', '1', 'Antigua|Barbuda'],
  ['AR', 'Argentina', '54'],
  ['AM', 'Armenia', '374'],
  ['AW', 'Aruba', '297'],
  ['AU', 'Australia', '61'],
  ['AT', 'Austria', '43', 'Österreich'],
  ['AZ', 'Azerbaijan', '994'],
  ['BS', 'Bahamas', '1'],
  ['BH', 'Bahrain', '973'],
  ['BD', 'Bangladesh', '880'],
  ['BB', 'Barbados', '1'],
  ['BY', 'Belarus', '375'],
  ['BE', 'Belgium', '32', 'België|Belgique'],
  ['BZ', 'Belize', '501'],
  ['BJ', 'Benin', '229'],
  ['BM', 'Bermuda', '1'],
  ['BT', 'Bhutan', '975'],
  ['BO', 'Bolivia', '591'],
  ['BQ', 'Caribbean Netherlands', '599', 'Bonaire|Saba|Sint Eustatius'],
  ['BA', 'Bosnia and Herzegovina', '387', 'Bosnia|Herzegovina'],
  ['BW', 'Botswana', '267'],
  ['BR', 'Brazil', '55', 'Brasil'],
  ['VG', 'British Virgin Islands', '1', 'Virgin Islands'],
  ['BN', 'Brunei', '673'],
  ['BG', 'Bulgaria', '359'],
  ['BF', 'Burkina Faso', '226'],
  ['BI', 'Burundi', '257'],
  ['KH', 'Cambodia', '855'],
  ['CM', 'Cameroon', '237'],
  ['CA', 'Canada', '1'],
  ['CV', 'Cape Verde', '238', 'Cabo Verde'],
  ['KY', 'Cayman Islands', '1'],
  ['CF', 'Central African Republic', '236', 'CAR'],
  ['TD', 'Chad', '235'],
  ['CL', 'Chile', '56'],
  ['CN', 'China', '86'],
  ['CX', 'Christmas Island', '61'],
  ['CC', 'Cocos (Keeling) Islands', '61', 'Cocos Islands|Keeling Islands'],
  ['CO', 'Colombia', '57'],
  ['KM', 'Comoros', '269'],
  ['CG', 'Congo (Republic)', '242', 'Republic of the Congo|Congo-Brazzaville|Congo'],
  ['CD', 'Congo (Democratic Republic)', '243', 'Democratic Republic of the Congo|DRC|DR Congo|Congo-Kinshasa|Congo'],
  ['CK', 'Cook Islands', '682'],
  ['CR', 'Costa Rica', '506'],
  ['CI', 'Côte d’Ivoire', '225', "Ivory Coast|Cote d'Ivoire"],
  ['HR', 'Croatia', '385', 'Hrvatska'],
  ['CU', 'Cuba', '53'],
  ['CW', 'Curaçao', '599', 'Curacao'],
  ['CY', 'Cyprus', '357'],
  ['CZ', 'Czechia', '420', 'Czech Republic'],
  ['DK', 'Denmark', '45', 'Danmark'],
  ['DJ', 'Djibouti', '253'],
  ['DM', 'Dominica', '1'],
  ['DO', 'Dominican Republic', '1'],
  ['EC', 'Ecuador', '593'],
  ['EG', 'Egypt', '20'],
  ['SV', 'El Salvador', '503', 'Salvador'],
  ['GQ', 'Equatorial Guinea', '240'],
  ['ER', 'Eritrea', '291'],
  ['EE', 'Estonia', '372'],
  ['SZ', 'Eswatini', '268', 'Swaziland'],
  ['ET', 'Ethiopia', '251'],
  ['FK', 'Falkland Islands', '500', 'Falklands|Malvinas'],
  ['FO', 'Faroe Islands', '298', 'Faroes'],
  ['FJ', 'Fiji', '679'],
  ['FI', 'Finland', '358', 'Suomi'],
  ['FR', 'France', '33'],
  ['GF', 'French Guiana', '594', 'Guyane'],
  ['PF', 'French Polynesia', '689', 'Tahiti'],
  ['GA', 'Gabon', '241'],
  ['GM', 'Gambia', '220', 'The Gambia'],
  ['GE', 'Georgia', '995'],
  ['DE', 'Germany', '49', 'Deutschland'],
  ['GH', 'Ghana', '233'],
  ['GI', 'Gibraltar', '350'],
  ['GR', 'Greece', '30', 'Hellas'],
  ['GL', 'Greenland', '299'],
  ['GD', 'Grenada', '1'],
  ['GP', 'Guadeloupe', '590'],
  ['GU', 'Guam', '1'],
  ['GT', 'Guatemala', '502'],
  ['GG', 'Guernsey', '44'],
  ['GN', 'Guinea', '224'],
  ['GW', 'Guinea-Bissau', '245'],
  ['GY', 'Guyana', '592'],
  ['HT', 'Haiti', '509'],
  ['HN', 'Honduras', '504'],
  ['HK', 'Hong Kong', '852'],
  ['HU', 'Hungary', '36', 'Magyarország'],
  ['IS', 'Iceland', '354', 'Ísland'],
  ['IN', 'India', '91', 'Bharat'],
  ['ID', 'Indonesia', '62'],
  ['IR', 'Iran', '98'],
  ['IQ', 'Iraq', '964'],
  ['IE', 'Ireland', '353', 'Eire|Éire'],
  ['IM', 'Isle of Man', '44'],
  ['IL', 'Israel', '972'],
  ['IT', 'Italy', '39', 'Italia'],
  ['JM', 'Jamaica', '1'],
  ['JP', 'Japan', '81'],
  ['JE', 'Jersey', '44'],
  ['JO', 'Jordan', '962'],
  ['KZ', 'Kazakhstan', '7'],
  ['KE', 'Kenya', '254'],
  ['KI', 'Kiribati', '686'],
  ['XK', 'Kosovo', '383'],
  ['KW', 'Kuwait', '965'],
  ['KG', 'Kyrgyzstan', '996'],
  ['LA', 'Laos', '856'],
  ['LV', 'Latvia', '371'],
  ['LB', 'Lebanon', '961'],
  ['LS', 'Lesotho', '266'],
  ['LR', 'Liberia', '231'],
  ['LY', 'Libya', '218'],
  ['LI', 'Liechtenstein', '423'],
  ['LT', 'Lithuania', '370'],
  ['LU', 'Luxembourg', '352'],
  ['MO', 'Macau', '853', 'Macao'],
  ['MG', 'Madagascar', '261'],
  ['MW', 'Malawi', '265'],
  ['MY', 'Malaysia', '60'],
  ['MV', 'Maldives', '960'],
  ['ML', 'Mali', '223'],
  ['MT', 'Malta', '356'],
  ['MH', 'Marshall Islands', '692'],
  ['MQ', 'Martinique', '596'],
  ['MR', 'Mauritania', '222'],
  ['MU', 'Mauritius', '230'],
  ['YT', 'Mayotte', '262'],
  ['MX', 'Mexico', '52', 'México'],
  ['FM', 'Micronesia', '691'],
  ['MD', 'Moldova', '373'],
  ['MC', 'Monaco', '377'],
  ['MN', 'Mongolia', '976'],
  ['ME', 'Montenegro', '382'],
  ['MS', 'Montserrat', '1'],
  ['MA', 'Morocco', '212', 'Maroc'],
  ['MZ', 'Mozambique', '258', 'Moçambique'],
  ['MM', 'Myanmar', '95', 'Burma'],
  ['NA', 'Namibia', '264'],
  ['NR', 'Nauru', '674'],
  ['NP', 'Nepal', '977'],
  ['NL', 'Netherlands', '31', 'Holland|Nederland|The Netherlands'],
  ['NC', 'New Caledonia', '687'],
  ['NZ', 'New Zealand', '64', 'Aotearoa'],
  ['NI', 'Nicaragua', '505'],
  ['NE', 'Niger', '227'],
  ['NG', 'Nigeria', '234'],
  ['NU', 'Niue', '683'],
  ['NF', 'Norfolk Island', '672'],
  ['KP', 'North Korea', '850', 'Korea'],
  ['MK', 'North Macedonia', '389', 'Macedonia'],
  ['MP', 'Northern Mariana Islands', '1', 'Saipan'],
  ['NO', 'Norway', '47', 'Norge'],
  ['OM', 'Oman', '968'],
  ['PK', 'Pakistan', '92'],
  ['PW', 'Palau', '680'],
  ['PS', 'Palestine', '970'],
  ['PA', 'Panama', '507'],
  ['PG', 'Papua New Guinea', '675', 'PNG'],
  ['PY', 'Paraguay', '595'],
  ['PE', 'Peru', '51'],
  ['PH', 'Philippines', '63'],
  ['PL', 'Poland', '48', 'Polska'],
  ['PT', 'Portugal', '351'],
  ['PR', 'Puerto Rico', '1'],
  ['QA', 'Qatar', '974'],
  ['RE', 'Réunion', '262', 'Reunion'],
  ['RO', 'Romania', '40'],
  ['RU', 'Russia', '7', 'Russian Federation'],
  ['RW', 'Rwanda', '250'],
  ['BL', 'Saint Barthélemy', '590', 'St Barts|St Barths|Saint Barthelemy'],
  ['SH', 'Saint Helena', '290', 'St Helena|Tristan da Cunha'],
  ['KN', 'Saint Kitts and Nevis', '1', 'St Kitts|Nevis'],
  ['LC', 'Saint Lucia', '1', 'St Lucia'],
  ['MF', 'Saint Martin (French part)', '590', 'St Martin|Saint-Martin'],
  ['PM', 'Saint Pierre and Miquelon', '508', 'St Pierre'],
  ['VC', 'Saint Vincent and the Grenadines', '1', 'St Vincent|Grenadines'],
  ['WS', 'Samoa', '685'],
  ['SM', 'San Marino', '378'],
  ['ST', 'São Tomé and Príncipe', '239', 'Sao Tome and Principe'],
  ['SA', 'Saudi Arabia', '966', 'KSA'],
  ['SN', 'Senegal', '221'],
  ['RS', 'Serbia', '381', 'Srbija'],
  ['SC', 'Seychelles', '248'],
  ['SL', 'Sierra Leone', '232'],
  ['SG', 'Singapore', '65'],
  ['SX', 'Sint Maarten (Dutch part)', '1', 'Sint Maarten|St Maarten'],
  ['SK', 'Slovakia', '421', 'Slovak Republic'],
  ['SI', 'Slovenia', '386'],
  ['SB', 'Solomon Islands', '677'],
  ['SO', 'Somalia', '252'],
  ['ZA', 'South Africa', '27', 'RSA|Suid-Afrika|Mzansi'],
  ['KR', 'South Korea', '82', 'Korea|Republic of Korea'],
  ['SS', 'South Sudan', '211'],
  ['ES', 'Spain', '34', 'España|Espana'],
  ['LK', 'Sri Lanka', '94'],
  ['SD', 'Sudan', '249'],
  ['SR', 'Suriname', '597'],
  ['SJ', 'Svalbard and Jan Mayen', '47', 'Svalbard'],
  ['SE', 'Sweden', '46', 'Sverige'],
  ['CH', 'Switzerland', '41', 'Schweiz|Suisse|Svizzera'],
  ['SY', 'Syria', '963'],
  ['TW', 'Taiwan', '886'],
  ['TJ', 'Tajikistan', '992'],
  ['TZ', 'Tanzania', '255', 'Zanzibar'],
  ['TH', 'Thailand', '66'],
  ['TL', 'Timor-Leste', '670', 'East Timor'],
  ['TG', 'Togo', '228'],
  ['TK', 'Tokelau', '690'],
  ['TO', 'Tonga', '676'],
  ['TT', 'Trinidad and Tobago', '1', 'Trinidad|Tobago'],
  ['TN', 'Tunisia', '216'],
  ['TR', 'Türkiye', '90', 'Turkey|Turkiye'],
  ['TM', 'Turkmenistan', '993'],
  ['TC', 'Turks and Caicos Islands', '1', 'Turks and Caicos'],
  ['TV', 'Tuvalu', '688'],
  ['UG', 'Uganda', '256'],
  ['UA', 'Ukraine', '380'],
  ['AE', 'United Arab Emirates', '971', 'UAE|Emirates|Dubai|Abu Dhabi'],
  ['GB', 'United Kingdom', '44', 'UK|Great Britain|Britain|England|Scotland|Wales|Northern Ireland'],
  ['US', 'United States', '1', 'USA|US|United States of America|America'],
  ['VI', 'US Virgin Islands', '1', 'United States Virgin Islands|Virgin Islands'],
  ['UY', 'Uruguay', '598'],
  ['UZ', 'Uzbekistan', '998'],
  ['VU', 'Vanuatu', '678'],
  ['VA', 'Vatican City', '39', 'Holy See|Vatican'],
  ['VE', 'Venezuela', '58'],
  ['VN', 'Vietnam', '84', 'Viet Nam'],
  ['WF', 'Wallis and Futuna', '681'],
  ['EH', 'Western Sahara', '212'],
  ['YE', 'Yemen', '967'],
  ['ZM', 'Zambia', '260'],
  ['ZW', 'Zimbabwe', '263'],
];

/** The country a shared calling code stands for when a number gives nothing else. */
export const PRIMARY = { 1: 'US', 7: 'RU', 39: 'IT', 44: 'GB', 47: 'NO', 61: 'AU', 212: 'MA', 262: 'RE', 290: 'SH', 358: 'FI', 590: 'GP', 599: 'CW' };

/** Countries where the leading 0 belongs to the number itself (it is not a trunk prefix to drop after the code). */
const KEEP_ZERO = new Set(['IT', 'SM', 'VA']);

/** Accents off, lower case, and only letters, digits, + and spaces left: "Côte d’Ivoire" → "cote divoire". */
export const fold = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9+ ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

export const COUNTRIES = ROWS.map(([iso, name, dial, aliases = '']) => ({
  iso,
  name,
  dial,
  aliases: aliases ? aliases.split('|') : [],
  keys: [name, ...(aliases ? aliases.split('|') : [])].map(fold),
})).sort((a, b) => a.name.localeCompare(b.name, 'en'));

const BY_ISO = new Map(COUNTRIES.map((c) => [c.iso, c]));
export const byIso = (iso) => BY_ISO.get(String(iso || '').toUpperCase()) || null;

/** A country by its name or another name for it ("uk", "Ivory Coast"), or null. */
export function byName(text) {
  const q = fold(text);
  if (!q) return null;
  return COUNTRIES.find((c) => c.keys.includes(q)) || null;
}

/** 🇿🇦 from 'ZA' (regional indicator letters; a system without flag emoji shows the two letters). */
export const flagOf = (iso) => String.fromCodePoint(...[...String(iso).toUpperCase()].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));

/**
 * Countries matching what someone typed, best first: a name or another name that starts with it, then a word in one
 * that starts with it, then one that contains it; "+44", "44" and "za" find by calling code and country code. An empty
 * query lists `first` (suggestions) and then everyone, alphabetically.
 */
export function searchCountries(query, { first = [] } = {}) {
  const q = fold(query);
  if (!q) {
    const top = first.map(byIso).filter(Boolean);
    return [...new Set([...top, ...COUNTRIES])];
  }
  const digits = q.replace(/^\+/, '');
  const scored = [];
  for (const c of COUNTRIES) {
    let score = 0;
    if (/^\d+$/.test(digits)) {
      if (c.dial === digits) score = 100;
      else if (c.dial.startsWith(digits)) score = 60;
    } else {
      for (const k of c.keys) {
        if (k === q) score = Math.max(score, 100);
        else if (k.startsWith(q)) score = Math.max(score, 80);
        else if (k.split(' ').some((w) => w.startsWith(q))) score = Math.max(score, 60);
        else if (k.includes(q)) score = Math.max(score, 30);
      }
      if (q.length === 2 && c.iso.toLowerCase() === q) score = Math.max(score, 90);
    }
    if (score) scored.push({ c, score: score + (first.includes(c.iso) ? 5 : 0) + (PRIMARY[c.dial] === c.iso ? 1 : 0) });
  }
  return scored.sort((a, b) => b.score - a.score || a.c.name.localeCompare(b.c.name, 'en')).map((s) => s.c);
}

/**
 * The calling code at the start of an international number ("+44 7700…", "0044…"), and the rest. Prefers
 * `prefer` (the country already chosen) when it shares the code; otherwise PRIMARY, or the only country with it.
 */
export function splitNumber(value, prefer = '') {
  const s = String(value ?? '').trim().replace(/^00/, '+');
  if (!s.startsWith('+')) return null;
  const digits = s.replace(/\D/g, '');
  for (const len of [3, 2, 1]) {
    const code = digits.slice(0, len);
    const matches = COUNTRIES.filter((c) => c.dial === code);
    if (!matches.length) continue;
    const pick = matches.find((c) => c.iso === prefer) || byIso(PRIMARY[code]) || matches[0];
    // The rest as written, after the code's digits.
    let seen = 0;
    let i = 0;
    const body = s.slice(1);
    while (i < body.length && seen < len) if (/\d/.test(body[i++])) seen++;
    return { country: pick, rest: body.slice(i).trim() };
  }
  return null;
}

/**
 * A number someone typed, as one international number: kept as it is when it already starts with + or 00 (00 → +),
 * otherwise the chosen country's code in front, without the trunk 0 ("07700 900123" in the UK → "+44 7700 900123").
 */
export function withCode(value, country) {
  const s = String(value ?? '').trim();
  if (!s) return '';
  if (/^(\+|00)/.test(s)) return s.replace(/^00/, '+');
  if (!country) return s;
  let rest = s;
  if (rest.startsWith('0') && !KEEP_ZERO.has(country.iso)) rest = rest.replace(/^0+\s*/, '');
  if (country.dial === '1' && /^1\D*\d{10}$/.test(rest.replace(/\s/g, ''))) rest = rest.replace(/^1\s*/, '');
  return `+${country.dial} ${rest}`;
}

/** The visitor's likely country from their browser's languages ("en-GB" → GB, "de" → DE), or null. */
const LANGUAGE_COUNTRY = { af: 'ZA', zu: 'ZA', xh: 'ZA', de: 'DE', nl: 'NL', fr: 'FR', it: 'IT', es: 'ES', pt: 'PT', sv: 'SE', da: 'DK', nb: 'NO', nn: 'NO', no: 'NO', fi: 'FI', pl: 'PL', cs: 'CZ', ja: 'JP', ko: 'KR', zh: 'CN', he: 'IL', tr: 'TR', el: 'GR', hu: 'HU' };
export function guessCountry(languages = []) {
  for (const tag of languages) {
    const region = /^[a-z]{2,3}(?:-[A-Za-z]{4})?-([A-Za-z]{2})\b/.exec(String(tag))?.[1];
    if (region && byIso(region)) return byIso(region);
  }
  for (const tag of languages) {
    const lang = String(tag).slice(0, 2).toLowerCase();
    if (LANGUAGE_COUNTRY[lang]) return byIso(LANGUAGE_COUNTRY[lang]);
  }
  return null;
}
