import { expect, test } from '@playwright/test';

const email = process.env.TEST_USER_EMAIL;
const password = process.env.TEST_USER_PASSWORD;
const authSmokeRequired = process.env.SMOKE_AUTH_REQUIRED === 'true';

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login?next=/');
  await page.getByPlaceholder('Email').fill(email!);
  await page.getByPlaceholder('密碼').fill(password!);
  await page.getByRole('button', { name: /登入 Workspace/i }).click();
  await expect(async () => {
    const isStillOnLogin = new URL(page.url()).pathname === '/login';
    const alert = page.getByRole('alert').first();
    const alertText = (await alert.innerText().catch(() => '')).trim();
    if (isStillOnLogin && alertText) {
      throw new Error(`Login failed: ${await alert.innerText()}`);
    }

    await expect(page).toHaveURL(/\/$/, { timeout: 1_000 });
    await expect(page.getByRole('heading', { name: '營運總覽' })).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
}

test.describe('authenticated smoke flow', () => {
  test.skip(
    !authSmokeRequired || !email || !password,
    'SMOKE_AUTH_REQUIRED=true with TEST_USER_EMAIL and TEST_USER_PASSWORD is required for authenticated smoke tests',
  );

  test('test user can login and reach dashboard', async ({ page }) => {
    await login(page);
    const response = await page.goto('/');
    expect(response?.status(), 'dashboard should not return a server error after login').toBeLessThan(500);
  });

  test('authenticated test user can access core pages without server errors', async ({ page }) => {
    await login(page);

    for (const route of ['/', '/appointments', '/inventory', '/staff']) {
      const response = await page.goto(route);
      expect(response?.status(), `${route} should not return a server error`).toBeLessThan(500);
      expect(new URL(page.url()).pathname, `${route} should stay on the requested authenticated route`).toBe(route);
    }
  });
});
