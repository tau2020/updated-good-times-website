/**
 * Test environment: a throwaway in-memory Postgres (PGlite), the file email
 * provider pointed at a temp directory, live mode and deterministic secrets.
 * Nothing here reaches the network. Import this BEFORE anything that touches
 * lib/config.mjs.
 */
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const OUTBOX = mkdtempSync(join(tmpdir(), 'gt-outbox-'));

Object.assign(process.env, {
  ENQUIRY_SYSTEM_ENABLED: 'true',
  ENQUIRY_MODE: 'live',
  DATABASE_URL: 'pglite://memory',
  EMAIL_PROVIDER: 'file',
  EMAIL_OUTBOX_DIR: OUTBOX,
  FROM_EMAIL: 'Good Times in Cape Town <enquiries@test.invalid>',
  ENQUIRY_TEAM_EMAIL: 'team@test.invalid',
  REPLY_TO_EMAIL: 'reply@test.invalid',
  ENQUIRY_SIGNING_SECRET: 'test-signing-secret-0123456789abcdef0123456789',
  PUBLIC_SITE_URL: 'http://test.local',
});
delete process.env.RESEND_API_KEY;
delete process.env.VERCEL;
delete process.env.VERCEL_ENV;
delete process.env.NODE_ENV;

const { migrate } = await import('../../lib/db/migrate.mjs');
await migrate({ log: () => {} });

export const { query, one, closeDb } = await import('../../lib/db/index.mjs');

/**
 * Tests send many requests for the same few dates, so every date gets 50
 * vehicles (the most a day can have) unless a test sets its own: the vehicle
 * limit is tested on purpose (test/availability.test.mjs), never by accident.
 */
export async function roomyDays() {
  await query(`INSERT INTO day_capacity (day, vehicles, note) SELECT d::date, 50, 'test' FROM generate_series(current_date - 1, current_date + 1200, interval '1 day') d ON CONFLICT (day) DO UPDATE SET vehicles = 50`);
}
await roomyDays();

const { todayInSast } = await import('../../lib/enquiries/schema.mjs');

/** A Cape Town date `n` days from today, as YYYY-MM-DD. */
export const inDays = (n) => todayInSast(Date.now() + n * 86400000);

/** Each call gets a fresh IP unless the test pins one, so tests never trip each other's rate limit. */
let ipCounter = 0;
export const nextIp = () => `203.0.${Math.floor(ipCounter / 250)}.${(ipCounter++ % 250) + 1}`;

/** Build a JSON POST Request against the router. */
export function post(path, body, { headers = {}, ip = nextIp() } = {}) {
  return [
    new Request(`http://test.local${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': ip, 'user-agent': 'node-test', ...headers },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
    { ip },
  ];
}

const contact = () => ({
  name: 'Amara Okafor',
  email: 'amara@example.com',
  phone: '+44 20 7946 0958',
  preferred_contact_method: 'email',
  country: 'United Kingdom',
  consent: true,
  terms: true,
  elapsed_ms: 60_000,
  gt_hp_check: '',
  page_url: 'http://test.local/enquire/?type=tour',
});

export const validTour = () => ({
  enquiry_type: 'tour',
  tour_slug: 'cape-peninsula-private-tour',
  preferred_date: inDays(30),
  dates_flexible: false,
  flexible_dates: '',
  adults: 2,
  children: 1,
  children_ages: '6',
  pickup_area: 'Hotel in Sea Point',
  special_requests: 'A relaxed pace, please.',
  ...contact(),
});

export const validTransfer = () => ({
  enquiry_type: 'transfer',
  transfer_type: 'airport-arrival',
  pickup_location: 'Cape Town International Airport (CPT)',
  destination: 'Camps Bay, Victoria Road',
  transfer_date: inDays(20),
  transfer_time: '14:30',
  flight_number: 'ba59',
  adults: 2,
  children: 1,
  child_seats: 'age 4',
  suitcases: 3,
  oversized_items: '1 golf bag',
  return_trip: true,
  return_date: inDays(27),
  return_time: '09:00',
  notes: 'Please wait at arrivals.',
  ...contact(),
  preferred_contact_method: 'whatsapp',
});

let n = 0;
export const key = () => `test-key-${Date.now()}-${n++}-${'x'.repeat(8)}`;

/** Decode the two base64 parts (text, html) of an .eml written by the file provider. */
export function decodeEml(eml) {
  const parts = eml.split(/------=_gt_[0-9a-f]+/).slice(1, 3);
  return parts.map((p) => Buffer.from(p.split(/\r\n\r\n/)[1].replace(/\r\n/g, ''), 'base64').toString('utf8'));
}

/** The decoded subject of an .eml. */
export function emlSubject(eml) {
  const m = /^Subject: =\?UTF-8\?B\?([^?]+)\?=$/m.exec(eml);
  return m ? Buffer.from(m[1], 'base64').toString('utf8') : '';
}
