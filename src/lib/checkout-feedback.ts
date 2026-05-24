export const checkoutMessageText: Record<string, string> = {};

export const checkoutErrorText: Record<string, string> = {
  order_config_missing: "建立訂單前，請先完成 Supabase 連線與結帳必要設定，再回來重試。",
  order_forbidden: "請聯絡店主或管理員，開啟你建立訂單的權限。",
  order_invalid_input: "訂單資料不完整，請重新檢查客戶、技師、已收金額與明細總額是否一致。",
  order_create_failed: "訂單建立或更新失敗，請重新整理後再試；若仍失敗，先確認資料是否完整。"
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
