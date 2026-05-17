export const serviceUpdateMessageText: Record<string, string> = {
  service_updated: "服務項目已更新。"
};

export const serviceUpdateErrorText: Record<string, string> = {
  service_update_failed: "服務項目更新失敗，請稍後再試。",
  service_update_forbidden: "你沒有權限更新服務項目。",
  service_update_invalid_input: "服務項目資料格式不正確，請檢查價格與時間是否為有效數字。",
  service_update_config_missing: "系統登入設定尚未完成，無法更新服務項目。"
};

export function readServiceUpdateParam(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export function getServiceUpdateMessage(code: string | undefined) {
  if (!code) return undefined;
  return serviceUpdateMessageText[code] ?? serviceUpdateMessageText.service_updated;
}

export function getServiceUpdateError(code: string | undefined) {
  if (!code) return undefined;
  return serviceUpdateErrorText[code] ?? serviceUpdateErrorText.service_update_failed;
}
