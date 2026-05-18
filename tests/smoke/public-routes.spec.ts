import { expect, test } from '@playwright/test';

test.describe('public smoke routes', () => {
  test('homepage loads', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status(), 'homepage should not return a server error').toBeLessThan(500);
    await expect(page).toHaveTitle(/Beauty|美|Nail|OS/i);
  });

  test('login route responds', async ({ page }) => {
    const response = await page.goto('/login');
    expect(response?.status(), 'login page should not return a server error').toBeLessThan(500);
  });

  test('dashboard route does not server-error for anonymous visitor', async ({ page }) => {
    const response = await page.goto('/dashboard');
    expect(response?.status(), 'dashboard should not return a server error').toBeLessThan(500);
  });
});
