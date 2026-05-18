import { expect, test } from '@playwright/test';

const email = process.env.TEST_USER_EMAIL;
const password = process.env.TEST_USER_PASSWORD;

test.describe('authenticated smoke flow', () => {
  test.skip(!email || !password, 'TEST_USER_EMAIL and TEST_USER_PASSWORD are required for authenticated smoke tests');

  test('test user can login and reach dashboard', async ({ page }) => {
    await page.goto('/login?next=/dashboard');

    await page.getByPlaceholder('Email').fill(email!);
    await page.getByPlaceholder('密碼').fill(password!);
    await page.getByRole('button', { name: /登入 Workspace/i }).click();

    await expect(page).toHaveURL(/dashboard/);
    await expect(page.getByText(/Dashboard|儀表|工作區|今日|預約|營收/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test('authenticated test user can access core pages without server errors', async ({ page }) => {
    await page.goto('/login?next=/dashboard');
    await page.getByPlaceholder('Email').fill(email!);
    await page.getByPlaceholder('密碼').fill(password!);
    await page.getByRole('button', { name: /登入 Workspace/i }).click();
    await expect(page).toHaveURL(/dashboard/);

    for (const route of ['/dashboard', '/appointments', '/inventory', '/staff']) {
      const response = await page.goto(route);
      expect(response?.status(), `${route} should not return a server error`).toBeLessThan(500);
    }
  });
});
