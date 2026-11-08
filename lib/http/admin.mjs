/**
 * The staff bookings dashboard under /admin/ (lib/admin/views.mjs renders it).
 *
 *   GET  /admin/                          bookings (?view=upcoming|new|past|cancelled|all, ?q=)
 *   GET  /admin/bookings/:id              one request: details, status, team note, history, emails
 *   POST /admin/bookings/:id/status       set any status (reopening checks the vehicles again)
 *   POST /admin/bookings/:id/note         the team note
 *   GET  /admin/availability              the next six weeks, vehicles per day
 *   POST /admin/availability              change one day's vehicles (0 closes it)
 *   POST /admin/emails/retry              resend emails that failed
 *   GET  /admin/sign-in · POST            ask for a sign-in link (ADMIN_EMAILS only; same answer for anyone)
 *   GET  /admin/sign-in/confirm · POST    the link's page; its button starts the session
 *   POST /admin/sign-out
 *
 * Every POST needs the session (SameSite=Lax cookie), the page's form
 * token and a same-origin request; every change is recorded in the
 * request's history with the staff address. Works only where bookings are
 * live (it needs the database).
 */
import { config } from '../config.mjs';
import { html, readForm } from './response.mjs';
import { isUniqueViolation, query } from '../db/index.mjs';
import { checkRateLimit } from '../security/ratelimit.mjs';
import { hashIp, keyedHash, clientIp } from '../security/hash.mjs';
import { isValidDate, todayInSast, BOOKING_RULES, isValidEmail } from '../enquiries/schema.mjs';
import { STATUS_LABELS } from '../enquiries/status.mjs';
import { getEnquiry, listEnquiries, viewCounts, VIEWS, eventsFor, emailsFor, setStatus, setStaffNote, dayCapacities, setDayCapacity } from '../enquiries/store.mjs';
import { notifyCustomerOfStatus } from '../enquiries/notify.mjs';
import { retryFailedEmails, failedEmailSummary, routed } from '../email/send.mjs';
import { getProvider } from '../email/provider.mjs';
import { renderTemplate } from '../email/templates/index.mjs';
import { holdsBetween, capacityBetween, loadAt, dayStart, addDays, DAY_MS } from '../bookings/availability.mjs';
import { isAdminEmail, signInToken, readSignInToken, sessionToken, readSession, formToken, checkFormToken, sameOrigin, sessionCookie, clearedCookie, safeNext } from '../admin/auth.mjs';
import * as V from '../admin/views.mjs';

const ID = '(?<id>[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})';
const HEADERS = {
  'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; img-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
  // Not no-referrer: under it browsers send `Origin: null` on every form post, which locked staff out.
  // same-origin still keeps sign-in tokens in page URLs from reaching any other site.
  'Referrer-Policy': 'same-origin',
  'X-Robots-Tag': 'noindex, nofollow',
};

const page = (body, status = 200, headers = {}) => html(status, body, { ...HEADERS, ...headers });
const redirect = (location, headers = {}) => new Response(null, { status: 303, headers: { Location: location, 'Cache-Control': 'no-store', ...HEADERS, ...headers } });
const message = ({ status, html: body }) => page(body, status);

/** Only where bookings are live and staff addresses are set. */
const available = () => config.accepting && config.adminEmails.length > 0;

/**
 * Wrap a handler that needs a signed-in member of staff. POSTs also need the
 * form token and a same-origin request.
 */
function staff(handler, { post = false } = {}) {
  return async (request, ctx = {}) => {
    if (!available()) return page(V.signInPage({ disabled: true }), 503);
    const session = readSession(request);
    if (!session) {
      // Signed out on a link (e.g. from the team email): come back to it after signing in.
      const url = new URL(request.url);
      const next = safeNext(`${url.pathname}${url.search}`);
      return redirect(post || next === '/admin/' ? '/admin/sign-in' : `/admin/sign-in?next=${encodeURIComponent(next)}`);
    }
    let form = null;
    if (post) {
      if (!sameOrigin(request)) return message(V.messagePage({ title: 'Not allowed', text: 'That request did not come from the dashboard.', status: 403 }));
      const body = await readForm(request, 16 * 1024);
      if (!body.ok) return message(V.messagePage({ title: 'Not allowed', text: 'That form could not be read.', status: body.status }));
      if (!checkFormToken(session, body.form.get('form'))) return message(V.messagePage({ title: 'Page expired', text: 'The page was open too long or from an old session. Go back, reload it and try again.', status: 403 }));
      form = body.form;
    }
    return handler(request, { ...ctx, session, form, token: formToken(session) });
  };
}

/* ---------- messages after a change (codes only: no text from the URL reaches the page) ---------- */

function messageFrom(url) {
  const m = url.searchParams.get('m') || '';
  const [code, a, b] = m.split('.');
  switch (code) {
    case 'status':
      return Object.hasOwn(STATUS_LABELS, a) ? { text: `Status set to ${STATUS_LABELS[a]}.${b === 'emailed' ? ' The customer has been emailed.' : b === 'emailfailed' ? ' The customer email could not be sent; it will be retried from the bookings page.' : ''}` } : null;
    case 'unavailable':
      return { error: true, text: 'Not changed: the vehicles are taken on that date, so this booking cannot be reopened. Free a vehicle or change the day’s vehicles first.' };
    case 'note':
      return { text: 'Note saved.' };
    case 'same':
      return { text: 'Nothing changed: it already had that status.' };
    case 'day':
      return { text: 'Day saved.' };
    case 'dayinvalid':
      return { error: true, text: 'Not saved: choose a date from today on, and a number of vehicles from 0 to 50 (or leave it empty).' };
    case 'retried':
      return { text: `Email retry: ${Number(a) || 0} sent, ${Number(b) || 0} still failing.` };
    case 'signedin':
      return { text: 'Signed in.' };
    default:
      return null;
  }
}

/* ---------- sign-in ---------- */

async function getSignIn(request) {
  if (!available()) return page(V.signInPage({ disabled: true }), 503);
  const next = safeNext(new URL(request.url).searchParams.get('next'));
  if (readSession(request)) return redirect(next);
  return page(V.signInPage({ next }));
}

async function postSignIn(request, ctx = {}) {
  if (!available()) return page(V.signInPage({ disabled: true }), 503);
  if (!sameOrigin(request)) return message(V.messagePage({ title: 'Not allowed', text: 'That request did not come from the dashboard.', status: 403 }));
  const body = await readForm(request, 2048);
  if (!body.ok) return page(V.signInPage({ message: { error: true, text: 'That form could not be read. Try again.' } }), body.status);
  const email = String(body.form.get('email') || '').trim().toLowerCase();
  const next = safeNext(body.form.get('next'));
  if (!isValidEmail(email)) return page(V.signInPage({ message: { error: true, text: 'Enter a valid email address.' }, next }), 400);
  const ip = hashIp(clientIp(request.headers, ctx.ip));
  // Per connection, and per address from that connection: nobody else's requests can use up a member of staff's links.
  const byIp = await checkRateLimit(`admin-sign-in:${ip}`, { limit: config.limits.signInPerMinute });
  const byEmail = await checkRateLimit(`admin-sign-in-email:${keyedHash(email)}:${ip}`, { limit: 3, windowSeconds: 600 });
  if (!byIp.allowed || !byEmail.allowed) return page(V.signInPage({ message: { error: true, text: 'Too many sign-in requests. Wait a few minutes and try again.' }, next }), 429);
  // The same answer, as fast, whether or not the address is staff, so the form cannot be used to find out:
  // on Cloudflare the email is sent after the answer (waitUntil); elsewhere it is awaited.
  if (isAdminEmail(email)) {
    const url = `${config.siteUrl}/admin/sign-in/confirm?token=${signInToken(email)}${next === '/admin/' ? '' : `&next=${encodeURIComponent(next)}`}`;
    const sending = sendSignInLink(email, url);
    if (typeof ctx.waitUntil === 'function') ctx.waitUntil(sending);
    else await sending;
  } else {
    console.warn(`[admin] sign-in refused for an address not in ADMIN_EMAILS`);
  }
  return page(V.signInSentPage());
}

/**
 * Sent directly, not through email_log: the link must not be stored anywhere. Never throws. Routed like every other
 * email, so a test deployment's link reaches only its test inbox or an allowlisted owned inbox (lib/email/send.mjs).
 */
async function sendSignInLink(email, url) {
  try {
    const msg = renderTemplate('admin-sign-in', { url, minutes: config.limits.signInLinkMinutes });
    await (await getProvider()).send({ to: routed(email), subject: msg.subject, html: msg.html, text: msg.text, replyTo: config.email.replyTo });
    console.log(`[admin] sign-in link sent to ${email}`);
  } catch (err) {
    console.error(`[admin] sign-in link to ${email} failed: ${err.message}`);
  }
}

const SIGN_IN_REFUSED = {
  invalid: 'This sign-in link is not valid. Ask for a new one.',
  expired: 'This sign-in link has expired. Ask for a new one.',
  'not-staff': 'This address can no longer sign in.',
  used: 'This sign-in link has already been used. Ask for a new one.',
};
const refused = (reason) => message(V.messagePage({ title: 'Cannot sign in', text: SIGN_IN_REFUSED[reason] || SIGN_IN_REFUSED.invalid, status: 400 }));

async function getConfirm(request) {
  if (!available()) return page(V.signInPage({ disabled: true }), 503);
  const url = new URL(request.url);
  const token = url.searchParams.get('token') || '';
  const t = readSignInToken(token);
  if (!t.ok) return refused(t.reason);
  // Opening the link changes nothing (mail scanners open links); the button does.
  return page(V.confirmSignInPage({ token, email: t.email, next: safeNext(url.searchParams.get('next')) }));
}

async function postConfirm(request) {
  if (!available()) return page(V.signInPage({ disabled: true }), 503);
  if (!sameOrigin(request)) return message(V.messagePage({ title: 'Not allowed', text: 'That request did not come from the dashboard.', status: 403 }));
  const body = await readForm(request, 2048);
  if (!body.ok) return refused('invalid');
  const t = readSignInToken(body.form.get('token') || '');
  if (!t.ok) return refused(t.reason);
  try {
    await query('INSERT INTO admin_sign_ins (jti, email) VALUES ($1, $2)', [t.jti, t.email]);
  } catch (err) {
    if (isUniqueViolation(err)) return refused('used');
    throw err;
  }
  console.log(`[admin] ${t.email} signed in`);
  const next = safeNext(body.form.get('next'));
  return redirect(next === '/admin/' ? '/admin/?m=signedin' : next, { 'Set-Cookie': sessionCookie(sessionToken(t.email)) });
}

const postSignOut = staff(async () => redirect('/admin/sign-in', { 'Set-Cookie': clearedCookie() }), { post: true });

/* ---------- bookings ---------- */

const getList = staff(async (request, { session, token }) => {
  const url = new URL(request.url);
  const view = Object.hasOwn(VIEWS, url.searchParams.get('view') ?? '') ? url.searchParams.get('view') : 'upcoming';
  const q = (url.searchParams.get('q') || '').slice(0, 100);
  const [rows, counts, failed] = await Promise.all([listEnquiries({ view, q }), viewCounts(), failedEmailSummary()]);
  return page(V.listPage({ session, form: token, views: VIEWS, view, counts, rows, q, message: messageFrom(url), failed }));
});

const getDetail = staff(async (request, { session, token, params }) => {
  const e = await getEnquiry(params.id);
  if (!e) return message(V.messagePage({ title: 'Not found', text: 'There is no booking with that id.', status: 404 }));
  const [events, emails] = await Promise.all([eventsFor(e.id), emailsFor(e.id)]);
  return page(V.detailPage({ session, form: token, e, events, emails, message: messageFrom(new URL(request.url)) }));
});

const postStatus = staff(
  async (request, { session, form, params }) => {
    const to = String(form.get('status') || '');
    const back = `/admin/bookings/${params.id}`;
    const r = await setStatus(params.id, to, { actor: session.email });
    if (!r.ok) {
      if (r.reason === 'missing') return message(V.messagePage({ title: 'Not found', text: 'There is no booking with that id.', status: 404 }));
      if (r.reason === 'unavailable') return redirect(`${back}?m=unavailable`);
      if (r.reason === 'already') return redirect(`${back}?m=same`);
      return message(V.messagePage({ title: 'Not changed', text: 'That is not a valid status.', status: 400 }));
    }
    let mailed = '';
    if (form.get('notify') === 'on' && (to === 'CONFIRMED' || to === 'CANCELLED')) {
      const sent = await notifyCustomerOfStatus(r.enquiry, to);
      mailed = sent.ok ? '.emailed' : '.emailfailed';
    }
    return redirect(`${back}?m=status.${to}${mailed}`);
  },
  { post: true },
);

const postNote = staff(
  async (request, { session, form, params }) => {
    const updated = await setStaffNote(params.id, String(form.get('note') || '').replace(/\r\n?/g, '\n').trim(), { actor: session.email });
    if (!updated) return message(V.messagePage({ title: 'Not found', text: 'There is no booking with that id.', status: 404 }));
    return redirect(`/admin/bookings/${params.id}?m=note`);
  },
  { post: true },
);

const postRetry = staff(
  async () => {
    const r = await retryFailedEmails({ limit: 20, log: () => {} });
    return redirect(`/admin/?m=retried.${r.sent}.${r.failed}`);
  },
  { post: true },
);

/* ---------- availability ---------- */

const WEEKS = 6;

const getAvailabilityPage = staff(async (request, { session, token }) => {
  const url = new URL(request.url);
  const today = todayInSast();
  const asked = url.searchParams.get('from') || '';
  const from = isValidDate(asked) ? asked : today;
  const until = addDays(from, WEEKS * 7);
  const [holds, capacity, overrides, dayRows] = await Promise.all([
    holdsBetween(dayStart(from), dayStart(until)),
    capacityBetween(from, until),
    dayCapacities(today),
    query('SELECT day::text AS day, note FROM day_capacity WHERE day >= $1::date AND day < $2::date', [from, until]).then((r) => r.rows),
  ]);
  const notes = new Map(dayRows.map((r) => [r.day, r.note]));
  const days = [];
  for (let date = from; date < until; date = addDays(date, 1)) {
    const start = dayStart(date);
    const end = start + DAY_MS;
    const inDay = holds.filter((x) => x.start < end && x.end > start);
    const points = [start, ...inDay.map((x) => x.start).filter((t) => t > start)];
    days.push({
      date,
      requests: new Set(inDay.map((x) => x.id)).size,
      peak: Math.max(0, ...points.map((t) => loadAt(inDay, t))),
      vehicles: capacity(date),
      override: notes.has(date),
      note: notes.get(date) || '',
    });
  }
  return page(V.availabilityPage({ session, form: token, days, from, prev: addDays(from, -WEEKS * 7), next: until, overrides, defaultVehicles: BOOKING_RULES.vehicles, message: messageFrom(url) }));
});

const postAvailabilityDay = staff(
  async (request, { session, form }) => {
    const day = String(form.get('day') || '');
    const raw = String(form.get('vehicles') ?? '').trim();
    const vehicles = raw === '' ? null : Number(raw);
    if (!isValidDate(day) || day < todayInSast() || (vehicles !== null && !(Number.isInteger(vehicles) && vehicles >= 0 && vehicles <= 50))) {
      return redirect('/admin/availability?m=dayinvalid');
    }
    await setDayCapacity(day, vehicles, { note: String(form.get('note') || '').trim(), actor: session.email });
    console.log(`[admin] ${session.email} set ${day} to ${vehicles === null ? 'normal' : `${vehicles} vehicles`}`);
    return redirect(`/admin/availability?from=${day}&m=day`);
  },
  { post: true },
);

/* ---------- routes ---------- */

const notFound = async () => message(V.messagePage({ title: 'Not found', text: 'There is no such page in the dashboard.', status: 404 }));

export const ADMIN_ROUTES = [
  { method: 'GET', pattern: /^\/admin\/?$/, handler: getList },
  { method: 'GET', pattern: /^\/admin\/sign-in\/?$/, handler: getSignIn },
  { method: 'POST', pattern: /^\/admin\/sign-in\/?$/, handler: postSignIn },
  { method: 'GET', pattern: /^\/admin\/sign-in\/confirm\/?$/, handler: getConfirm },
  { method: 'POST', pattern: /^\/admin\/sign-in\/confirm\/?$/, handler: postConfirm },
  { method: 'POST', pattern: /^\/admin\/sign-out\/?$/, handler: postSignOut },
  { method: 'GET', pattern: new RegExp(`^/admin/bookings/${ID}/?$`), handler: getDetail },
  { method: 'POST', pattern: new RegExp(`^/admin/bookings/${ID}/status/?$`), handler: postStatus },
  { method: 'POST', pattern: new RegExp(`^/admin/bookings/${ID}/note/?$`), handler: postNote },
  { method: 'GET', pattern: /^\/admin\/availability\/?$/, handler: getAvailabilityPage },
  { method: 'POST', pattern: /^\/admin\/availability\/?$/, handler: postAvailabilityDay },
  { method: 'POST', pattern: /^\/admin\/emails\/retry\/?$/, handler: postRetry },
  { method: 'GET', pattern: /^\/admin\/.+$/, handler: notFound },
];

