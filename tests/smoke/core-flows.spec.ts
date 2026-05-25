import { expect, test, type Page } from '@playwright/test';

const email = process.env.TEST_USER_EMAIL;
const password = process.env.TEST_USER_PASSWORD;
const strictCoreFlows = process.env.SMOKE_STRICT_CORE_FLOWS === 'true';

async function login(page: Page) {
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

async function expectNoServerError(page: Page, route: string) {
  const response = await page.goto(route);
  expect(response?.status(), `${route} should not return a server error`).toBeLessThan(500);
  expect(new URL(page.url()).pathname, `${route} should stay on the requested authenticated route`).toBe(route);
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
    !strictCoreFlows || !email || !password,
    'SMOKE_STRICT_CORE_FLOWS=true with TEST_USER_EMAIL and TEST_USER_PASSWORD is required for strict core smoke coverage',
  );

  test('authenticated owner can operate the core modules', async ({ page }) => {
    await login(page);

    await expectNoServerError(page, '/services');
    await expect(page.getByRole('heading', { name: '服務項目管理' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '新增服務' })).toBeVisible();
    await exerciseOptionalEditFlow(page, '編輯服務', '新增服務');

    await expectNoServerError(page, '/customers');
    await expect(page.getByRole('heading', { name: '客戶 CRM' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '新增客戶' })).toBeVisible();
    await exerciseOptionalEditFlow(page, '編輯客戶', '新增客戶');

    await expectNoServerError(page, '/inventory');
    await expect(page.getByRole('heading', { name: '庫存管理' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '建立庫存品項' })).toBeVisible();
    await exerciseOptionalEditFlow(page, '編輯庫存品項', '建立庫存品項');

    await expectNoServerError(page, '/staff');
    await expect(page.getByRole('heading', { name: '員工 / 技師管理' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '新增員工 / 邀請' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '新增班表' })).toBeVisible();
    await expect(page.getByRole('button', { name: '新增班表' }).first()).toBeVisible();

    await expectNoServerError(page, '/appointments');
    await expect(page.getByRole('heading', { name: '預約系統' })).toBeVisible();
    await expect(page.getByText('預約資料會即時寫入資料庫')).toBeVisible();
    await expect(page.getByRole('heading', { name: '新增預約' })).toBeVisible();
    await exerciseOptionalEditFlow(page, '編輯預約', '新增預約');

    await expectNoServerError(page, '/checkout');
    await expect(page.getByRole('heading', { name: '訂單 / 結帳 / 收款' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '新增訂單 / 預約轉結帳' })).toBeVisible();
    await expect(page.getByText('即時預覽')).toBeVisible();
    await page.getByLabel('自訂項目').fill('測試草稿');
    await page.getByLabel('自訂單價').fill('250');
    await page.getByRole('button', { name: '清空草稿' }).click();
    await expect(page.getByLabel('自訂項目')).toHaveValue('');
    await expect(page.getByLabel('自訂單價')).toHaveValue('0');

    await expectNoServerError(page, '/operations');
    await expect(page.getByRole('heading', { name: '營運指揮中心' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '今天要交接' })).toBeVisible();

    await expectNoServerError(page, '/reports');
    await expect(page.getByRole('heading', { name: '報表分析' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '主管摘要 / 可列印版' })).toBeVisible();

    await expectNoServerError(page, '/settings');
    await expect(page.getByRole('heading', { name: '店鋪設定' })).toBeVisible();
    await expect(page.getByRole('button', { name: '儲存設定' })).toBeVisible();
  });
});
