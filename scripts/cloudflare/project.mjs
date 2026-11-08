/**
 * Good Times in Cape Town's Cloudflare Pages project, as code.
 *
 * The one place the project's account, name, branches, runtime settings and
 * the plain-text variables of its two environments are written down:
 *   - scripts/cloudflare/setup.mjs compares them with the live project through
 *     the Cloudflare API and applies the difference (--apply);
 *   - a deployment builds with the same variables (scripts/cloudflare/env.mjs),
 *     so the static build and the Functions agree;
 *   - test/helpers/pages-dev.mjs runs the Functions locally with the same
 *     compatibility settings.
 * Secrets are never written here, only their names: setup.mjs checks that they
 * exist before an environment may go live.
 *
 * STAGING ONLY. This project is separate from every other site and project:
 * nothing here deploys over the current goodtimesincapetown.co.za website,
 * attaches a domain or changes DNS. The production environment stays empty,
 * and in preview mode, until the owner approves the release
 * (docs/APPROVAL_REGISTER.md): `RELEASE.approved` and `DOMAIN.approved` are the
 * recorded approvals, and setup.mjs and the deploy commands refuse without them.
 */

/**
 * The Good Times Cloudflare account. setup.mjs refuses any other: the account's
 * name, or its owner's address, must contain this.
 */
export const ACCOUNT = { match: 'goodtimesincapetown' };

export const PROJECT = {
  name: 'good-times-in-cape-town',
  // Production is not released. Nothing deploys to this branch until RELEASE.approved is set on the owner's word.
  productionBranch: 'main',
  /** Branches with a preview address of their own, https://<branch>.good-times-in-cape-town.pages.dev. */
  previewBranches: ['preview'],
  /** Deployments from any other branch go to this preview alias, the stable staging address. */
  stagingBranch: 'staging',
  compatibilityDate: '2026-10-01',
  // node:crypto, Buffer and process for the enquiry API (functions/api/[[path]].js).
  compatibilityFlags: ['nodejs_compat'],
};

/**
 * The go-ahead for a production release (date and name, recorded in the approval register, A1). Given on 7 Nov 2026 by
 * tau2020, the repository's owner, for the project's own production address (https://good-times-in-cape-town.pages.dev)
 * only, under a recorded override of the open legal items (site.legal.releaseOverride). It does not approve the domain
 * cutover: goodtimesincapetown.co.za keeps the current website until DOMAIN.approved.
 */
export const RELEASE = { approved: true, date: '2026-11-07', by: 'tau2020 (repository owner)', scope: 'https://good-times-in-cape-town.pages.dev only; not the domain' };

export const DOMAIN = {
  // Good Times' existing domain, serving the current website. Its DNS zone is active in this Cloudflare account
  // (setup.mjs check, 8 Nov 2026), but nothing may point it here before the owner approves the cutover (DOMAIN.approved).
  apex: 'goodtimesincapetown.co.za',
  www: 'www.goodtimesincapetown.co.za',
  approved: false,
};

/**
 * The go-ahead for the transactional sending domain, separate from the cutover: the owner's live enquiry pipeline brief
 * of 8 Nov 2026 permits configuring Resend's sending authentication and adding its non-conflicting DNS records.
 * `setup.mjs resend --apply` may then add exactly the records Resend asks for, all on subdomains (on 8 Nov 2026: DKIM at
 * resend._domainkey, the return path's MX and SPF at send., and a CNAME at rsend.); it refuses any at the apex, never
 * touches the apex's MX, SPF or address records, the nameservers or inbound mail, and DOMAIN.approved (the website's
 * cutover) stays as it is. The domain was added to Resend on 8 Nov 2026 (sending only, receiving and tracking off);
 * `verified` records Resend's own verdict once its records resolve.
 */
export const SENDING_DOMAIN = { approved: true, date: '2026-11-08', by: 'the owner (live enquiry pipeline brief)', region: 'eu-west-1', verified: false };

/**
 * Good Times' public address is hello@ (the owner's instruction of 6 Nov 2026): the site shows it, and the emails are
 * sent from it. Where mail is delivered (new enquiries, customers' replies, the dashboard's sign-in links) stays the
 * mailbox that receives mail today, info@, until Good Times confirms hello@ is set up to receive it: the brief of
 * 6 Nov 2026 asks that form delivery never move to an unconfirmed mailbox (docs/APPROVAL_REGISTER.md › A4). stuart@, the
 * additional public address, is a personal mailbox and is not routed here.
 */
export const PUBLIC_ADDRESS = `hello@${DOMAIN.apex}`;
export const MAILBOXES = {
  info: `info@${DOMAIN.apex}`,
};

/**
 * Where new enquiry notifications would go, and where customers' replies come
 * back: the mailbox that receives mail today. Pending the owner's confirmation; it is
 * used only once an environment is live, and none is.
 */
export const TEAM_INBOX = MAILBOXES.info;

export const SECRETS = ['DATABASE_URL', 'RESEND_API_KEY', 'ENQUIRY_SIGNING_SECRET'];

/**
 * Plain-text variables per Pages environment. The same values reach the static
 * build and the Functions at runtime (the project's settings), and
 * lib/config.mjs and src/data/site.mjs read them.
 */
export const ENVIRONMENTS = {
  production: {
    branch: PROJECT.productionBranch,
    url: `https://${DOMAIN.apex}`,
    vars: {
      SITE_ENV: 'production',
      // The apex, with www redirected to it (setup.mjs › domain). The current website uses www: which host is
      // canonical after the cutover is the owner's decision (docs/APPROVAL_REGISTER.md).
      PUBLIC_SITE_URL: `https://${DOMAIN.apex}`,
      // THE LIVE SWITCH. 'preview' makes the form say plainly that nothing is sent. It stays so until Good Times
      // has its own database, sending domain and secrets, a controlled test has passed, and the owner approves;
      // setup.mjs refuses 'live' while a secret is missing.
      ENQUIRY_MODE: 'preview',
      ENQUIRY_SYSTEM_ENABLED: 'true',
      EMAIL_PROVIDER: 'resend',
      FROM_EMAIL: `Good Times in Cape Town <${PUBLIC_ADDRESS}>`,
      ENQUIRY_TEAM_EMAIL: TEAM_INBOX,
      REPLY_TO_EMAIL: TEAM_INBOX,
      // Staff who may sign in to the bookings dashboard (/admin/), comma-separated.
      ADMIN_EMAILS: TEAM_INBOX,
      RATE_LIMIT_PER_MINUTE: '10',
      SHOW_INDICATIVE_PRICES: 'true',
    },
  },
  preview: {
    branch: PROJECT.stagingBranch,
    url: `https://${PROJECT.stagingBranch}.${PROJECT.name}.pages.dev`,
    vars: {
      SITE_ENV: 'preview',
      PUBLIC_SITE_URL: `https://${PROJECT.stagingBranch}.${PROJECT.name}.pages.dev`,
      // Preview: the form works and validates, and says plainly that nothing is sent. No database, email
      // or secret is connected, so no test enquiry can reach Good Times or a real traveller.
      ENQUIRY_MODE: 'preview',
      ENQUIRY_SYSTEM_ENABLED: 'true',
      RATE_LIMIT_PER_MINUTE: '10',
      SHOW_INDICATIVE_PRICES: 'true',
    },
  },
};

/** 'production' for the production branch, otherwise 'preview' (how Pages itself decides). */
export const environmentFor = (branch) => (branch === PROJECT.productionBranch ? 'production' : 'preview');

/**
 * Where a deployment of `branch` goes: the environment, and the branch name it
 * deploys as (Cloudflare's alias, <alias>.good-times-in-cape-town.pages.dev).
 * Only the production branch deploys as itself to production, and only once the
 * owner has approved the release; the preview branches keep their own address
 * and everything else shares staging's.
 */
export function deployTarget(branch, { release = RELEASE } = {}) {
  if (branch === PROJECT.productionBranch) {
    if (!release.approved) throw new Error(`"${branch}" deploys to production, which the owner has not approved (RELEASE in scripts/cloudflare/project.mjs). Deploy to "${PROJECT.stagingBranch}" instead.`);
    return { environment: 'production', alias: branch };
  }
  const alias = PROJECT.previewBranches.includes(branch) ? branch : PROJECT.stagingBranch;
  return { environment: 'preview', alias, url: `https://${alias}.${PROJECT.name}.pages.dev` };
}

/**
 * The isolated test project of the live enquiry pipeline (8 Nov 2026). A Pages project of its own, because a project's
 * preview variables are shared by every preview branch: making them live here would make staging live too. Deployed
 * only to its `test` branch and never given a domain; a preview build (noindex, the preview bar). Its preview
 * environment takes live enquiries into the Neon branch `enquiry-test`, only from requests that carry
 * ENQUIRY_ACCESS_KEY (lib/http/app.mjs), and sends every email to Resend's test inbox except the addresses in
 * EMAIL_TEST_RECIPIENTS (lib/email/send.mjs). Until Resend has verified the domain it sends as Resend's own test sender,
 * which can reach only that test inbox. Its production environment is never deployed and stays in preview mode.
 */
export const TEST_PROJECT = { ...PROJECT, name: 'good-times-enquiry-test', previewBranches: ['test'], stagingBranch: 'test' };
export const TEST_SECRETS = [...SECRETS, 'ENQUIRY_ACCESS_KEY'];
const TEST_URL = `https://test.${TEST_PROJECT.name}.pages.dev`;
export const TEST_ENVIRONMENTS = {
  production: {
    branch: TEST_PROJECT.productionBranch,
    url: `https://${TEST_PROJECT.name}.pages.dev`,
    vars: { SITE_ENV: 'preview', PUBLIC_SITE_URL: `https://${TEST_PROJECT.name}.pages.dev`, ENQUIRY_MODE: 'preview', ENQUIRY_SYSTEM_ENABLED: 'true', RATE_LIMIT_PER_MINUTE: '10', SHOW_INDICATIVE_PRICES: 'true' },
  },
  preview: {
    branch: 'test',
    url: TEST_URL,
    vars: {
      SITE_ENV: 'preview',
      PUBLIC_SITE_URL: TEST_URL,
      ENQUIRY_MODE: 'live',
      ENQUIRY_SYSTEM_ENABLED: 'true',
      EMAIL_PROVIDER: 'resend',
      FROM_EMAIL: SENDING_DOMAIN.verified ? `Good Times in Cape Town <${PUBLIC_ADDRESS}>` : 'Good Times in Cape Town (test) <onboarding@resend.dev>',
      ENQUIRY_TEAM_EMAIL: TEAM_INBOX,
      REPLY_TO_EMAIL: TEAM_INBOX,
      ADMIN_EMAILS: TEAM_INBOX,
      // The staff inbox receives real test mail only once the domain is verified; every other address, the test inbox.
      ...(SENDING_DOMAIN.verified ? { EMAIL_TEST_RECIPIENTS: TEAM_INBOX } : {}),
      RATE_LIMIT_PER_MINUTE: '10',
      SHOW_INDICATIVE_PRICES: 'true',
    },
  },
};
