export const serviceMessageText: Record<string, string> = {
  service_created: "服務項目已建立，可直接用於預約與報價。",
  service_updated: "服務項目已更新，價格、時間與啟用狀態已同步。",
  service_enabled_toggled: "服務啟用狀態已更新。",
};

export const serviceErrorText: Record<string, string> = {
  service_config_missing: "建立服務前，請先完成 Supabase 連線與服務必要設定，再回來重試。",
  service_forbidden: "請聯絡店主或管理員，開啟你建立服務項目的權限。",
  service_invalid_input: "服務項目資料格式不正確，請重新檢查價格、時間與分類後再送出。",
  service_create_failed: "服務項目建立失敗，請重新整理後再試。"
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
