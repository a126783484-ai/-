export const serviceUpdateMessageText: Record<string, string> = {
  service_updated: "服務項目已更新，價格、時間與啟用狀態已同步。"
};

export const serviceUpdateErrorText: Record<string, string> = {
  service_update_failed: "服務項目更新失敗，請重新整理後再試。",
  service_update_forbidden: "請聯絡店主或管理員，開啟你更新服務項目的權限。",
  service_update_invalid_input: "服務項目資料格式不正確，請重新檢查價格、時間與分類後再儲存。",
  service_update_config_missing: "更新服務前，請先完成 Supabase 連線與服務必要設定，再回來重試。"
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
