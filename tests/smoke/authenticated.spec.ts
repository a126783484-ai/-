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

async function expectAnyVisible(page: import('@playwright/test').Page, locators: Array<ReturnType<import('@playwright/test').Page['locator']>>) {
  await expect
    .poll(async () => {
      const results = await Promise.all(locators.map((locator) => locator.isVisible().catch(() => false)));
      return results.some(Boolean);
    })
    .toBe(true);
}

async function verifyRoute(
  page: import('@playwright/test').Page,
  route: string,
  title: string,
  evidence: Array<ReturnType<import('@playwright/test').Page['locator']>>,
) {
  const response = await page.goto(route);
  expect(response?.status(), `${route} should not return a server error`).toBeLessThan(500);
  expect(new URL(page.url()).pathname, `${route} should stay on the requested authenticated route`).toBe(route);
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
  await expectAnyVisible(page, evidence);
}

test.describe('authenticated smoke flow', () => {
  test.beforeEach(() => {
    test.skip(
      !authSmokeRequired || !email || !password,
      'SMOKE_AUTH_REQUIRED=true with TEST_USER_EMAIL and TEST_USER_PASSWORD is required for authenticated smoke tests',
    );
  });

  test('test user can login and reach dashboard', async ({ page }) => {
    await login(page);
    const response = await page.goto('/');
    expect(response?.status(), 'dashboard should not return a server error after login').toBeLessThan(500);
  });

  test('authenticated test user can walk through every core function route', async ({ page }) => {
    await login(page);

    await verifyRoute(page, '/', '營運總覽', [
      page.getByRole('link', { name: /預約|收款|庫存|客戶/ }),
      page.getByRole('heading', { name: '營運指揮中心' }),
    ]);

    await verifyRoute(page, '/services', '服務項目管理', [
      page.getByRole('heading', { name: '新增服務' }),
      page.getByRole('button', { name: '新增服務' }),
      page.getByText('服務目前僅供查看'),
      page.getByText('你的角色無法管理服務'),
    ]);

    await verifyRoute(page, '/customers', '客戶 CRM', [
      page.getByRole('heading', { name: '新增客戶' }),
      page.getByRole('button', { name: '新增客戶' }),
      page.getByText('目前還沒有客戶資料'),
    ]);

    await verifyRoute(page, '/inventory', '庫存管理', [
      page.getByRole('heading', { name: '建立庫存品項' }),
      page.getByRole('button', { name: '建立庫存品項' }),
      page.getByRole('heading', { name: '新增庫存異動' }),
      page.getByText('庫存目前僅供查看'),
    ]);

    await verifyRoute(page, '/staff', '員工 / 技師管理', [
      page.getByRole('heading', { name: '新增員工 / 邀請' }),
      page.getByRole('button', { name: '新增員工 / 邀請' }),
      page.getByRole('heading', { name: '班表列印摘要' }),
      page.getByRole('button', { name: '列印班表' }),
      page.getByRole('heading', { name: '新增班表' }),
    ]);

    await verifyRoute(page, '/appointments', '預約系統', [
      page.getByRole('heading', { name: '新增預約' }),
      page.getByRole('button', { name: '新增預約' }),
      page.getByText('預約目前僅供查看'),
    ]);

    await verifyRoute(page, '/checkout', '訂單 / 結帳 / 收款', [
      page.getByRole('heading', { name: '新增訂單 / 預約轉結帳' }),
      page.getByRole('button', { name: '清空草稿' }),
      page.getByRole('button', { name: '建立訂單' }),
      page.getByText('訂單目前僅供查看'),
      page.getByText('你的角色無法使用結帳'),
    ]);

    await verifyRoute(page, '/operations', '營運指揮中心', [
      page.getByRole('heading', { name: '今天要交接' }),
      page.getByRole('link', { name: '預約' }),
      page.getByRole('link', { name: '收款' }),
      page.getByText('尚未完成 workspace 初始化'),
    ]);

    await verifyRoute(page, '/reports', '報表分析', [
      page.getByRole('heading', { name: '主管摘要 / 可列印版' }),
      page.getByRole('button', { name: '列印 / 匯出' }),
      page.getByText('你的角色無法查看報表分析'),
    ]);

    await verifyRoute(page, '/settings', '店鋪設定', [
      page.getByLabel('店鋪名稱'),
      page.getByRole('button', { name: '儲存設定' }),
    ]);
  });
});
