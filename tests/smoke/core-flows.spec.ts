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
    await page.getByRole('button', { name: '取消編輯' }).click();
    await expect(page.getByRole('heading', { name: '新增服務' })).toBeVisible();
  });

  test('customers edit flow can be cleared back to create mode', async ({ page }) => {
    const response = await page.goto('/customers');
    expect(response?.status(), '/customers should not return a server error').toBeLessThan(500);

    await expect(page.getByRole('heading', { name: '客戶 CRM' })).toBeVisible();
    const customerRow = page.getByRole('row', { name: /陳怡君/ });
    await customerRow.getByRole('button', { name: '編輯' }).click();

    await expect(page.getByRole('heading', { name: '編輯客戶' })).toBeVisible();
    await page.getByRole('button', { name: '取消編輯' }).click();
    await expect(page.getByRole('heading', { name: '新增客戶' })).toBeVisible();
  });

  test('inventory page renders stock controls and sample items', async ({ page }) => {
    const response = await page.goto('/inventory');
    expect(response?.status(), '/inventory should not return a server error').toBeLessThan(500);

    await expect(page.getByRole('heading', { name: '庫存管理' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '建立庫存品項' })).toBeVisible();
    await expect(page.getByText('裸玫瑰凝膠 #R12')).toBeVisible();
    await expect(page.getByRole('heading', { name: '新增庫存異動' })).toBeVisible();
    const inventoryRow = page.getByRole('row', { name: /裸玫瑰凝膠 #R12/ });
    await inventoryRow.getByRole('button', { name: '編輯' }).click();
    await expect(page.getByRole('heading', { name: '編輯庫存品項' })).toBeVisible();
    await page.getByRole('button', { name: '取消編輯' }).click();
    await expect(page.getByRole('heading', { name: '建立庫存品項' })).toBeVisible();
  });

  test('staff page renders people, shifts, and staffing forms', async ({ page }) => {
    const response = await page.goto('/staff');
    expect(response?.status(), '/staff should not return a server error').toBeLessThan(500);

    await expect(page.getByRole('heading', { name: '員工 / 技師管理' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '新增員工 / 邀請' })).toBeVisible();
    await expect(page.getByText('Mia 林')).toBeVisible();
    await expect(page.getByRole('heading', { name: '新增班表' })).toBeVisible();
    const staffRow = page.getByRole('row', { name: /Mia 林/ });
    await staffRow.getByRole('button', { name: '編輯' }).click();
    await expect(page.getByRole('heading', { name: '編輯員工' })).toBeVisible();
    await page.getByRole('button', { name: '取消編輯' }).click();
    await expect(page.getByRole('heading', { name: '新增員工 / 邀請' })).toBeVisible();
  });

  test('appointments page renders booking controls and seeded appointments', async ({ page }) => {
    const response = await page.goto('/appointments');
    expect(response?.status(), '/appointments should not return a server error').toBeLessThan(500);

    await expect(page.getByRole('heading', { name: '預約系統' })).toBeVisible();
    await expect(page.getByText('預約資料會即時持久化')).toBeVisible();
    await expect(page.getByText('陳怡君')).toBeVisible();
    await expect(page.getByRole('heading', { name: '新增預約' })).toBeVisible();
    const appointmentRow = page.getByRole('row', { name: /陳怡君/ });
    await appointmentRow.getByRole('button', { name: '編輯' }).click();
    await expect(page.getByRole('heading', { name: '編輯預約' })).toBeVisible();
    await page.getByRole('button', { name: '取消編輯' }).click();
    await expect(page.getByRole('heading', { name: '新增預約' })).toBeVisible();
  });

  test('checkout page renders order creation and seeded sales data', async ({ page }) => {
    const response = await page.goto('/checkout');
    expect(response?.status(), '/checkout should not return a server error').toBeLessThan(500);

    await expect(page.getByRole('heading', { name: '訂單 / 結帳 / 收款' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '新增訂單 / 預約轉結帳' })).toBeVisible();
    await expect(page.getByText('即時預覽')).toBeVisible();
    await expect(page.getByText('ord_9001')).toBeVisible();
    await page.getByLabel('自訂項目').fill('測試草稿');
    await page.getByLabel('自訂單價').fill('250');
    await page.getByRole('button', { name: '清空草稿' }).click();
    await expect(page.getByLabel('自訂項目')).toHaveValue('');
    await expect(page.getByLabel('自訂單價')).toHaveValue('0');
  });
});
