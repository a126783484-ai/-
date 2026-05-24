export const appointmentMessageText: Record<string, string> = {
  appointment_created: "預約已建立，客戶、技師與服務都已寫入。",
  appointment_updated: "預約已更新，內容已同步保存。",
  appointment_status_updated: "預約狀態已更新。",
  appointment_status_updated_pending: "預約狀態已改為「待確認」。",
  appointment_status_updated_confirmed: "預約狀態已改為「已確認」。",
  appointment_status_updated_in_service: "預約狀態已改為「服務中」。",
  appointment_status_updated_completed: "預約狀態已改為「已完成」。",
  appointment_status_updated_cancelled: "預約狀態已改為「已取消」。",
  appointment_status_updated_no_show: "預約狀態已改為「未到」。",
  appointment_cancelled: "預約已取消，且不再占用技師時段。"
};

export const appointmentErrorText: Record<string, string> = {
  appointment_config_missing: "建立或更新預約前，請先完成 Supabase 連線與預約必要設定，再回來重試。",
  appointment_forbidden: "請聯絡店主或管理員，開啟你建立、編輯預約的權限。",
  appointment_missing_customers: "目前沒有客戶，請先新增至少 1 位客戶後再建立預約。",
  appointment_missing_services: "目前沒有可用服務，請先新增並啟用至少 1 項服務。",
  appointment_missing_staff: "目前沒有可指派的在職員工，請先新增至少 1 位在職員工。",
  appointment_invalid_input: "預約資料不完整，請重新檢查客戶、技師、開始時間與服務後再送出。",
  appointment_conflict: "同一位技師在這段時間已有重疊預約，請改時間或改派其他技師。",
  appointment_create_failed: "預約建立失敗，請重新整理後再試；若仍失敗，先確認資料是否填完整。",
  appointment_update_invalid_input: "預約更新資料不完整，請重新檢查客戶、技師、開始時間與服務後再送出。",
  appointment_invalid_status: "請改選有效的預約狀態後再送出。",
  appointment_not_found: "找不到這筆預約，可能已被刪除或更新，請重新整理後再操作。",
  appointment_update_failed: "預約更新失敗，請重新整理後再試。",
  appointment_update_conflict: "同一位技師在這段時間已有重疊預約，請改時間或改派其他技師後再儲存。"
};

export function readAppointmentParam(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export function getAppointmentMessage(code: string | undefined) {
  if (!code) return undefined;
  return appointmentMessageText[code] ?? appointmentMessageText.appointment_created;
}

export function getAppointmentError(code: string | undefined) {
  if (!code) return undefined;
  return appointmentErrorText[code] ?? appointmentErrorText.appointment_create_failed;
}
