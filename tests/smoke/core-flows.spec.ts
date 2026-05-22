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

async function expectNoServerError(page: Page, route: string) {
  const response = await page.goto(route);
  expect(response?.status(), `${route} should not return a server error`).toBeLessThan(500);
}

async function exerciseOptionalEditFlow(page: Page, editHeading: string, createHeading: string) {
  const editButtons = page.getByRole('button', { name: '編輯' });
  if ((await editButtons.count()) === 0) return;

  await editButtons.first().click();
  await expect(page.getByRole('heading', { name: editHeading })).toBeVisible();
  await page.getByRole('button', { name: '取消編輯' }).click();
  await expect(page.getByRole('heading', { name: createHeading })).toBeVisible();
}

test.describe('core demo flows', () => {
  test.skip(
    !email || !password,
    'TEST_USER_EMAIL and TEST_USER_PASSWORD are required for browser smoke coverage',
  );

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('services page renders management controls', async ({ page }) => {
    await expectNoServerError(page, '/services');
    await expect(page.getByRole('heading', { name: '服務項目管理' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '新增服務' })).toBeVisible();
    await exerciseOptionalEditFlow(page, '編輯服務', '新增服務');
  });

  test('customers edit flow can be cleared back to create mode when data exists', async ({ page }) => {
    await expectNoServerError(page, '/customers');
    await expect(page.getByRole('heading', { name: '客戶 CRM' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '新增客戶' })).toBeVisible();
    await exerciseOptionalEditFlow(page, '編輯客戶', '新增客戶');
  });

  test('inventory page renders stock controls', async ({ page }) => {
    await expectNoServerError(page, '/inventory');
    await expect(page.getByRole('heading', { name: '庫存管理' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '建立庫存品項' })).toBeVisible();
    await exerciseOptionalEditFlow(page, '編輯庫存品項', '建立庫存品項');
  });

  test('staff page renders people and schedule controls', async ({ page }) => {
    await expectNoServerError(page, '/staff');
    await expect(page.getByRole('heading', { name: '員工 / 技師管理' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '新增員工 / 邀請' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '新增班表' })).toBeVisible();
    await exerciseOptionalEditFlow(page, '編輯員工', '新增員工 / 邀請');
  });

  test('appointments page renders booking controls', async ({ page }) => {
    await expectNoServerError(page, '/appointments');
    await expect(page.getByRole('heading', { name: '預約系統' })).toBeVisible();
    await expect(page.getByText('預約資料會即時寫入資料庫')).toBeVisible();
    await expect(page.getByRole('heading', { name: '新增預約' })).toBeVisible();
    await exerciseOptionalEditFlow(page, '編輯預約', '新增預約');
  });

  test('checkout page renders order creation controls', async ({ page }) => {
    await expectNoServerError(page, '/checkout');
    await expect(page.getByRole('heading', { name: '訂單 / 結帳 / 收款' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '新增訂單 / 預約轉結帳' })).toBeVisible();
    await expect(page.getByText('即時預覽')).toBeVisible();
    await page.getByLabel('自訂項目').fill('測試草稿');
    await page.getByLabel('自訂單價').fill('250');
    await page.getByRole('button', { name: '清空草稿' }).click();
    await expect(page.getByLabel('自訂項目')).toHaveValue('');
    await expect(page.getByLabel('自訂單價')).toHaveValue('0');
  });

  test('operations page renders the command center', async ({ page }) => {
    await expectNoServerError(page, '/operations');
    await expect(page.getByRole('heading', { name: '營運指揮中心' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '今日處理清單' })).toBeVisible();
  });

  test('reports page renders analytics sections', async ({ page }) => {
    await expectNoServerError(page, '/reports');
    await expect(page.getByRole('heading', { name: '報表分析' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '本月跟進焦點' })).toBeVisible();
  });

  test('settings page renders workspace configuration', async ({ page }) => {
    await expectNoServerError(page, '/settings');
    await expect(page.getByRole('heading', { name: '設定頁' })).toBeVisible();
    await expect(page.getByRole('button', { name: '儲存設定' })).toBeVisible();
  });
});
