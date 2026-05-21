export const checkoutMessageText: Record<string, string> = {};

export const checkoutErrorText: Record<string, string> = {
  order_config_missing: "系統登入設定尚未完成，無法建立訂單。",
  order_forbidden: "你沒有權限建立訂單。",
  order_invalid_input: "訂單資料格式不正確，請檢查客戶、技師、付款金額與明細。",
  order_create_failed: "訂單建立或更新失敗，請稍後再試。"
};

export function readCheckoutParam(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export function getCheckoutMessage(code: string | undefined) {
  if (!code) return undefined;
  return checkoutMessageText[code];
}

export function getCheckoutError(code: string | undefined) {
  if (!code) return undefined;
  return checkoutErrorText[code] ?? checkoutErrorText.order_create_failed;
}
