// Browser end-to-end tests: `npm run test:e2e` (builds the site and serves it on :8091).
// Against a deployed preview: E2E_BASE_URL=https://<staging>.pages.dev npm run test:e2e
// (behind Cloudflare Access: also set CF_ACCESS_CLIENT_ID / CF_ACCESS_CLIENT_SECRET from a Zero Trust service token)
import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT || 8091);
const REMOTE = process.env.E2E_BASE_URL?.replace(/\/$/, '');

export default defineConfig({
  testDir: 'test/e2e',
  testMatch: /.*\.spec\.mjs/,
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : [['list']],
  use: {
    baseURL: REMOTE || `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
    // Environments with a pre-installed Chromium (no `playwright install`): PW_CHROMIUM_PATH=/path/to/chrome
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
    // The deployed preview is behind Cloudflare Access: pass a service token to test it remotely.
    extraHTTPHeaders:
      REMOTE && process.env.CF_ACCESS_CLIENT_ID
        ? { 'CF-Access-Client-Id': process.env.CF_ACCESS_CLIENT_ID, 'CF-Access-Client-Secret': process.env.CF_ACCESS_CLIENT_SECRET || '' }
        : undefined,
    // The enquiry test project's door (ENQUIRY_ACCESS_KEY, lib/http/app.mjs): a cookie for that host only, so the key
    // never travels to another site. E2E_ACCESS_KEY=… E2E_BASE_URL=https://test.good-times-enquiry-test.pages.dev
    storageState:
      REMOTE && process.env.E2E_ACCESS_KEY
        ? { cookies: [{ name: 'gt_access', value: process.env.E2E_ACCESS_KEY, domain: new URL(REMOTE).hostname, path: '/', expires: -1, httpOnly: true, secure: true, sameSite: 'Strict' }], origins: [] }
        : undefined,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
    // Mobile Safari (WebKit) for the booking wizard, the launch checks and the currency selector, where WebKit is installed (CI and the deploy workflow set PW_WEBKIT=1).
    ...(process.env.PW_WEBKIT ? [{ name: 'mobile-safari', use: { ...devices['iPhone 13'] }, testMatch: /(enquiry|launch|currency|consent)\.spec\.mjs/ }] : []),
  ],
  webServer: REMOTE
    ? undefined
    : {
        command: `npm run build && PORT=${PORT} node src/tools/serve.mjs`,
        url: `http://127.0.0.1:${PORT}/`,
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
});
