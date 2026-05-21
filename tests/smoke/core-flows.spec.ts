import { expect, test, type Page } from '@playwright/test';

const email = process.env.TEST_USER_EMAIL;
const password = process.env.TEST_USER_PASSWORD;

async function login(page: Page) {
  await page.goto('/login?next=/dashboard');
  await page.getByPlaceholder('Email').fill(email!);
  await page.getByPlaceholder('密碼').fill(password!);
  await page.getByRole('button', { name: /登入 Workspace/i }).click();
  await expect(page).toHaveURL(/dashboard/, { timeout: 15_000 });
}

test.describe('core demo flows', () => {
  test.skip(
    !email || !password,
    'TEST_USER_EMAIL and TEST_USER_PASSWORD are required for browser smoke coverage',
  );

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('services page renders the seeded catalog', async ({ page }) => {
    const response = await page.goto('/services');
    expect(response?.status(), '/services should not return a server error').toBeLessThan(500);

    await expect(page.getByRole('heading', { name: '服務項目管理' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '新增服務' })).toBeVisible();
    await expect(page.getByText('單色凝膠美甲')).toBeVisible();
  });

  test('services edit flow repopulates the selected record', async ({ page }) => {
    const response = await page.goto('/services');
    expect(response?.status(), '/services should not return a server error').toBeLessThan(500);

    const serviceRow = page.getByRole('row', { name: /單色凝膠美甲/ });
    await serviceRow.getByRole('button', { name: '編輯' }).click();

    await expect(page.getByRole('heading', { name: '編輯服務' })).toBeVisible();
    await expect(page.getByLabel('服務名稱')).toHaveValue('單色凝膠美甲');
    await expect(page.getByLabel('分類')).toHaveValue('美甲');
  });

  test('inventory page renders stock controls and sample items', async ({ page }) => {
    const response = await page.goto('/inventory');
    expect(response?.status(), '/inventory should not return a server error').toBeLessThan(500);

    await expect(page.getByRole('heading', { name: '庫存管理' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '建立庫存品項' })).toBeVisible();
    await expect(page.getByText('裸玫瑰凝膠 #R12')).toBeVisible();
    await expect(page.getByRole('heading', { name: '新增庫存異動' })).toBeVisible();
  });

  test('staff page renders people, shifts, and staffing forms', async ({ page }) => {
    const response = await page.goto('/staff');
    expect(response?.status(), '/staff should not return a server error').toBeLessThan(500);

    await expect(page.getByRole('heading', { name: '員工 / 技師管理' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '新增員工 / 邀請' })).toBeVisible();
    await expect(page.getByText('Mia 林')).toBeVisible();
    await expect(page.getByRole('heading', { name: '新增班表' })).toBeVisible();
  });

  test('appointments page renders booking controls and seeded appointments', async ({ page }) => {
    const response = await page.goto('/appointments');
    expect(response?.status(), '/appointments should not return a server error').toBeLessThan(500);

    await expect(page.getByRole('heading', { name: '預約系統' })).toBeVisible();
    await expect(page.getByText('預約資料會即時持久化')).toBeVisible();
    await expect(page.getByText('陳怡君')).toBeVisible();
    await expect(page.getByRole('heading', { name: '新增預約' })).toBeVisible();
  });

  test('checkout page renders order creation and seeded sales data', async ({ page }) => {
    const response = await page.goto('/checkout');
    expect(response?.status(), '/checkout should not return a server error').toBeLessThan(500);

    await expect(page.getByRole('heading', { name: '訂單 / 結帳 / 收款' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '新增訂單 / 預約轉結帳' })).toBeVisible();
    await expect(page.getByText('即時預覽')).toBeVisible();
    await expect(page.getByText('ord_9001')).toBeVisible();
  });
});
