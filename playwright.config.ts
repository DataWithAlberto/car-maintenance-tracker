import { defineConfig, devices } from '@playwright/test';

// Playwright config for FocusHub.
//
// `npm run e2e`           → runs all tests headless against the local dev server.
// `npm run e2e -- --ui`   → opens the Playwright UI for debugging.
//
// CI: GitHub Actions can run `npm run build && npm run preview & npm run e2e -- --reporter=list`.
//
// Most pages require auth. The included smoke tests exercise public surfaces
// (login, empty dashboard with mocked storage) and the i18n bootstrap.

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
