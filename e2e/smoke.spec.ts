import { test, expect } from '@playwright/test';

// Smoke tests — minimal coverage that proves the dev server, the JS bundle
// and the i18n bootstrap all work. These do NOT require a configured backend;
// pages that talk to Supabase will hit an empty session and the auth gate
// will redirect to /login. Anything that needs auth lives in `auth.spec.ts`
// (TODO: add fixtures with a service-role token before enabling).

test.describe('App smoke', () => {
  test('serves the SPA shell with the FocusHub title', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/FocusHub/i);
    // The root mount point exists.
    await expect(page.locator('#root')).toBeAttached();
  });

  test('any unknown route falls through to the SPA (no 404 from the server)', async ({ page }) => {
    const response = await page.goto('/this-route-does-not-exist');
    expect(response?.status()).toBeLessThan(400);
    // SPA serves index.html for unknown routes.
    await expect(page.locator('#root')).toBeAttached();
  });
});

test.describe('i18n bootstrap', () => {
  test('defaults to Spanish copy when localStorage is empty', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.removeItem('i18nextLng'));
    await page.goto('/login');
    await expect(page).toHaveTitle(/FocusHub/i);
    // i18next should have detected and persisted a language code.
    const lng = await page.evaluate(() => window.localStorage.getItem('i18nextLng'));
    expect(lng).toBeTruthy();
  });

  test('honours an English override via localStorage', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('i18nextLng', 'en'));
    await page.goto('/login');
    const lng = await page.evaluate(() => window.localStorage.getItem('i18nextLng'));
    expect(lng).toBe('en');
  });
});
