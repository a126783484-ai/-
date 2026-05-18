import { expect, test } from '@playwright/test';

test.describe('public smoke routes', () => {
  test('homepage loads', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Beauty|美|Nail|OS/i);
  });

  test('login route responds', async ({ page }) => {
    const response = await page.goto('/login');
    expect(response?.status()).toBeLessThan(500);
  });

  test('protected dashboard redirects unauthenticated user', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/login|auth/i);
  });
});
