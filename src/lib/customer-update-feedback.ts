export const customerUpdateMessageText: Record<string, string> = {
  customer_updated: "客戶資料已更新。"
};

export const customerUpdateErrorText: Record<string, string> = {
  customer_update_failed: "客戶資料更新失敗，請稍後再試。",
  customer_update_forbidden: "你沒有權限更新客戶資料。",
  customer_update_invalid_input: "客戶資料格式不正確，請檢查欄位內容。",
  customer_update_config_missing: "系統登入設定尚未完成，無法更新客戶資料。"
};

export function readCustomerUpdateParam(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export function getCustomerUpdateMessage(code: string | undefined) {
  if (!code) return undefined;
  return customerUpdateMessageText[code] ?? customerUpdateMessageText.customer_updated;
}

export function getCustomerUpdateError(code: string | undefined) {
  if (!code) return undefined;
  return customerUpdateErrorText[code] ?? customerUpdateErrorText.customer_update_failed;
}
