#!/usr/bin/env node
/**
 * Render every email template (tour, transfer and multi-day package variants)
 * and send each to one address, so rendering can be checked.
 *
 *   node scripts/send-test-email.mjs you@example.com              # uses EMAIL_PROVIDER from .env (default: file)
 *   node scripts/send-test-email.mjs you@example.com --only enquiry-received
 *
 * With EMAIL_PROVIDER=file (the default) the messages are written as .eml
 * files to data/outbox/ and nothing leaves the machine. Only an operator with
 * a verified sending domain should ever run this with EMAIL_PROVIDER=resend.
 * Nothing is written to the database.
 */
import { config } from '../lib/config.mjs';
import { getProvider } from '../lib/email/provider.mjs';
import { renderTemplate, TEMPLATE_NAMES } from '../lib/email/templates/index.mjs';
import { safeReplyTo } from '../lib/email/sanitise.mjs';

const args = process.argv.slice(2);
const to = args.find((a) => !a.startsWith('--'));
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;

if (!safeReplyTo(to || '')) {
  console.error('usage: node scripts/send-test-email.mjs <address> [--only <template>]');
  process.exit(1);
}

const inDays = (n) => new Date(Date.now() + n * 86400000 + 2 * 3600000).toISOString().slice(0, 10);
const common = {
  id: '00000000-0000-4000-8000-000000000000',
  name: 'Amara Okafor',
  email: to,
  phone: '+44 20 7946 0958',
  country: 'United Kingdom',
  status: 'NEW',
  created_at: new Date().toISOString(),
  page_url: `${config.siteUrl}/enquire/`,
};
const samples = {
  tour: {
    ...common,
    reference_number: 'GT-TEST42',
    enquiry_type: 'tour',
    preferred_contact_method: 'email',
    tour_slug: 'cape-peninsula-private-tour',
    preferred_date: inDays(30),
    dates_flexible: false,
    flexible_dates: '',
    adults: 2,
    children: 1,
    children_ages: '6',
    pickup_area: 'Hotel in Sea Point',
    special_requests: 'A relaxed pace, please. Our son loves penguins.',
    special_requirements: 'A relaxed pace, please. Our son loves penguins.',
  },
  transfer: {
    ...common,
    reference_number: 'GT-TEST43',
    enquiry_type: 'transfer',
    preferred_contact_method: 'whatsapp',
    transfer_type: 'airport-arrival',
    pickup_location: 'Cape Town International Airport (CPT)',
    destination: 'Camps Bay, Victoria Road',
    pickup_date_sast: inDays(20),
    pickup_time_sast: '14:30',
    flight_number: 'BA 59',
    adults: 2,
    children: 1,
    child_seats: '1 seat, age 4',
    suitcases: 3,
    oversized_items: '1 golf bag',
    return_trip: true,
    return_date_sast: inDays(27),
    return_time_sast: '09:00',
    special_requirements: 'We land late afternoon; please wait at arrivals.',
  },
  package: {
    ...common,
    reference_number: 'GT-TEST44',
    enquiry_type: 'tour',
    preferred_contact_method: 'email',
    tour_slug: 'garden-route-private-tour',
    preferred_date: inDays(60),
    dates_flexible: false,
    flexible_dates: '',
    nights: 6,
    adults: 2,
    children: 0,
    children_ages: '',
    pickup_area: 'Cape Town International Airport',
    special_requirements: 'We would love two nights in Knysna.',
  },
};

const actionBase = `${config.siteUrl}/api/enquiries/${common.id}/status?token=EXAMPLE`;
const actions = { CONTACTED: `${actionBase}.c`, QUOTED: `${actionBase}.q`, CONFIRMED: `${actionBase}.f`, CLOSED: `${actionBase}.x` };

const provider = await getProvider();
console.log(`provider: ${provider.name} · from: ${config.email.from || '(FROM_EMAIL not set)'} · to: ${to}`);
for (const name of TEMPLATE_NAMES) {
  if (only && only !== name) continue;
  for (const [kind, enquiry] of Object.entries(samples)) {
    const msg = renderTemplate(name, { enquiry, actions });
    const { id } = await provider.send({ to, subject: `[test] ${msg.subject}`, html: msg.html, text: msg.text, replyTo: config.email.replyTo || undefined });
    console.log(`  ${name.padEnd(22)} ${kind.padEnd(9)} id=${id}`);
  }
}
