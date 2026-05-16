export const serviceMessageText: Record<string, string> = {
  service_created: "服務項目已建立。"
};

export const serviceErrorText: Record<string, string> = {
  service_config_missing: "系統登入設定尚未完成，無法建立服務項目。",
  service_forbidden: "你沒有權限建立服務項目。",
  service_invalid_input: "服務項目資料格式不正確，請檢查價格與時間是否為有效數字。",
  service_create_failed: "服務項目建立失敗，請稍後再試。"
};

export function readServiceParam(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export function getServiceMessage(code: string | undefined) {
  if (!code) return undefined;
  return serviceMessageText[code] ?? serviceMessageText.service_created;
}

export function getServiceError(code: string | undefined) {
  if (!code) return undefined;
  return serviceErrorText[code] ?? serviceErrorText.service_create_failed;
}
