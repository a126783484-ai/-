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

async function toggleFirstServiceAndRestore(page: Page) {
  const toggleButtons = page.getByRole('button', { name: /^(停用|啟用)$/ });
  if ((await toggleButtons.count()) === 0) return;

  const firstToggle = toggleButtons.first();
  const originalLabel = (await firstToggle.innerText()).trim();
  const restoreLabel = originalLabel === '停用' ? '啟用' : '停用';

  await firstToggle.click();
  await expect(page.getByText('服務啟用狀態已更新。')).toBeVisible();
  await expect(page.getByRole('button', { name: restoreLabel }).first()).toBeVisible();

  await page.getByRole('button', { name: restoreLabel }).first().click();
  await expect(page.getByText('服務啟用狀態已更新。')).toBeVisible();
}

async function recordAndRevertInventoryMovement(page: Page) {
  const movementButton = page.getByRole('button', { name: '記錄異動' });
  if ((await movementButton.count()) === 0) return;

  const itemSelect = page.getByLabel('品項');
  if (!(await itemSelect.count())) return;

  await itemSelect.selectOption({ index: 1 }).catch(() => undefined);
  const selectedItem = await itemSelect.inputValue().catch(() => '');
  if (!selectedItem) return;

  await page.getByLabel('類型').selectOption('purchase');
  await page.getByLabel('數量 / 異動量（調整可填負數）').fill('1');
  await page.getByLabel('備註').fill('smoke-increment');
  await movementButton.click();
  await expect(page.getByText('庫存異動已記錄。')).toBeVisible();
  await expect(page.getByText('smoke-increment')).toBeVisible();

  await page.getByLabel('類型').selectOption('adjust');
  await page.getByLabel('數量 / 異動量（調整可填負數）').fill('-1');
  await page.getByLabel('備註').fill('smoke-revert');
  await movementButton.click();
  await expect(page.getByText('庫存異動已記錄。')).toBeVisible();
  await expect(page.getByText('smoke-revert')).toBeVisible();
}

async function rotateAppointmentStatus(page: Page) {
  const statusForm = page.locator('form').filter({
    has: page.getByRole('button', { name: '更新狀態' }),
  }).first();
  if ((await statusForm.count()) === 0) return;

  const statusSelect = statusForm.locator('select[name="status"]');
  if ((await statusSelect.count()) === 0) return;

  const originalStatus = await statusSelect.inputValue().catch(() => '');
  if (!originalStatus) return;

  const statuses = ['pending', 'confirmed', 'in_service', 'completed', 'cancelled', 'no_show'];
  const nextStatus = statuses.find((status) => status !== originalStatus);
  if (!nextStatus) return;

  await statusSelect.selectOption(nextStatus);
  await statusForm.getByRole('button', { name: '更新狀態' }).click();
  await expect(page.getByText('預約狀態已更新。')).toBeVisible();

  await statusSelect.selectOption(originalStatus);
  await statusForm.getByRole('button', { name: '更新狀態' }).click();
  await expect(page.getByText('預約狀態已更新。')).toBeVisible();
}

async function saveAndRestoreWorkspaceColor(page: Page) {
  const brandColorInput = page.locator('input[name="brandColor"]');
  if ((await brandColorInput.count()) === 0) return;

  const originalColor = (await brandColorInput.inputValue().catch(() => '#c87486')).toLowerCase();
  const alternateColor = originalColor === '#c87486' ? '#4d3556' : '#c87486';

  await brandColorInput.fill(alternateColor);
  await page.getByRole('button', { name: '儲存設定' }).click();
  await expect(page.getByText('店鋪設定已儲存，營業規則與品牌色已同步更新。')).toBeVisible();

  await brandColorInput.fill(originalColor);
  await page.getByRole('button', { name: '儲存設定' }).click();
  await expect(page.getByText('店鋪設定已儲存，營業規則與品牌色已同步更新。')).toBeVisible();
}

async function assertNoticeBanner(page: Page, expected: string) {
  await expect(page.getByText(expected)).toBeVisible();
}

test.describe('core demo flows', () => {
  test.skip(
    !strictCoreFlows || !email || !password,
    'SMOKE_STRICT_CORE_FLOWS=true with TEST_USER_EMAIL and TEST_USER_PASSWORD is required for strict core smoke coverage',
  );

  test('core module notice banners render with correct text from search params', async ({ page }) => {
    await login(page);

    await page.goto('/services?message=service_created');
    await assertNoticeBanner(page, '服務項目已建立，可直接用於預約與報價。');

    await page.goto('/services?error=service_forbidden');
    await assertNoticeBanner(page, '請聯絡店主或管理員，開啟你建立服務項目的權限。');

    await page.goto('/inventory?message=inventory_item_saved');
    await assertNoticeBanner(page, '庫存品項已儲存。');

    await page.goto('/inventory?error=inventory_insufficient_stock');
    await assertNoticeBanner(page, '庫存不足，無法完成出庫，請先補貨或改成數量調整後再試。');

    await page.goto('/staff?message=staff_updated');
    await assertNoticeBanner(page, '員工資料已更新。');

    await page.goto('/staff?error=staff_forbidden');
    await assertNoticeBanner(page, '請聯絡店主或管理員，開啟你更新員工資料的權限。');

    await page.goto('/appointments?message=appointment_created');
    await assertNoticeBanner(page, '預約已建立，客戶、技師與服務都已寫入。');

    await page.goto('/appointments?error=appointment_conflict');
    await assertNoticeBanner(page, '同一位技師在這段時間已有重疊預約，請改時間或改派其他技師。');

    await page.goto('/checkout?message=order_created');
    await assertNoticeBanner(page, '訂單已成功建立。');

    await page.goto('/checkout?error=order_forbidden');
    await assertNoticeBanner(page, '請聯絡店主或管理員，開啟你建立訂單的權限。');
  });

  test('authenticated owner can operate the core modules', async ({ page }) => {
    await login(page);

    await expectNoServerError(page, '/services');
    await expect(page.getByRole('heading', { name: '服務項目管理' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '新增服務' })).toBeVisible();
    await exerciseOptionalEditFlow(page, '編輯服務', '新增服務');
    await toggleFirstServiceAndRestore(page);

    await expectNoServerError(page, '/customers');
    await expect(page.getByRole('heading', { name: '客戶 CRM' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '新增客戶' })).toBeVisible();
    await exerciseOptionalEditFlow(page, '編輯客戶', '新增客戶');

    await expectNoServerError(page, '/inventory');
    await expect(page.getByRole('heading', { name: '庫存管理' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '建立庫存品項' })).toBeVisible();
    await exerciseOptionalEditFlow(page, '編輯庫存品項', '建立庫存品項');
    await recordAndRevertInventoryMovement(page);

    await expectNoServerError(page, '/staff');
    await expect(page.getByRole('heading', { name: '員工 / 技師管理' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '新增員工 / 邀請' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '新增班表' })).toBeVisible();
    await expect(page.getByRole('button', { name: '新增班表' }).first()).toBeVisible();
    await exerciseOptionalEditFlow(page, '編輯員工', '新增員工 / 邀請');

    await expectNoServerError(page, '/appointments');
    await expect(page.getByRole('heading', { name: '預約系統' })).toBeVisible();
    await expect(page.getByText('預約資料會即時寫入資料庫')).toBeVisible();
    await expect(page.getByRole('heading', { name: '新增預約' })).toBeVisible();
    await exerciseOptionalEditFlow(page, '編輯預約', '新增預約');
    await rotateAppointmentStatus(page);

    await expectNoServerError(page, '/checkout');
    await expect(page.getByRole('heading', { name: '訂單 / 結帳 / 收款' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '新增訂單 / 預約轉結帳' })).toBeVisible();
    await expect(page.getByText('即時預覽')).toBeVisible();
    await expect(page.getByText('尚未加入明細')).toBeVisible();
    await page.getByLabel('自訂項目').fill('測試草稿');
    await page.getByLabel('自訂單價').fill('250');
    await expect(page.getByText('1 筆明細')).toBeVisible();
    await page.getByRole('button', { name: '清空草稿' }).click();
    await expect(page.getByText('尚未加入明細')).toBeVisible();
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
    await saveAndRestoreWorkspaceColor(page);
  });
});
