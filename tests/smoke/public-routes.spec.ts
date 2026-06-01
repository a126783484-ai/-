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
    await expect(page.getByRole('heading', { name: '登入店鋪後台' })).toBeVisible();
    await expect(page.getByPlaceholder('Email')).toBeVisible();
    await expect(page.getByPlaceholder('密碼')).toBeVisible();
    await expect(page.getByRole('button', { name: /登入 Workspace/i })).toBeVisible();
  });

  test('dashboard route does not server-error for anonymous visitor', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status(), 'dashboard should not return a server error').toBeLessThan(500);
  });

  test('core module routes redirect anonymous visitors to login', async ({ page }) => {
    const coreRoutes = ['/services', '/inventory', '/staff', '/appointments', '/checkout'];

    for (const route of coreRoutes) {
      const response = await page.goto(route);
      expect(response?.status(), `${route} should not return a server error`).toBeLessThan(500);
      await expect(page).toHaveURL(/\/login/);
      await expect(page.getByRole('heading', { name: '登入店鋪後台' })).toBeVisible();
    }
  });
});
