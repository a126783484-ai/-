export const customerMessageText: Record<string, string> = {
  customer_created: "客戶資料已建立。"
};

export const customerErrorText: Record<string, string> = {
  customer_config_missing: "系統登入設定尚未完成，無法建立客戶。",
  customer_forbidden: "你沒有權限建立客戶資料。",
  customer_create_failed: "客戶資料建立失敗，請稍後再試。"
};

export function readCustomerParam(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export function getCustomerMessage(code: string | undefined) {
  if (!code) return undefined;
  return customerMessageText[code] ?? customerMessageText.customer_created;
}

export function getCustomerError(code: string | undefined) {
  if (!code) return undefined;
  return customerErrorText[code] ?? customerErrorText.customer_create_failed;
}
