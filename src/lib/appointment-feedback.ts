export const appointmentMessageText: Record<string, string> = {
  appointment_created: "預約已建立。",
  appointment_updated: "預約已更新。",
  appointment_status_updated: "預約狀態已更新。",
  appointment_cancelled: "預約已取消。"
};

export const appointmentErrorText: Record<string, string> = {
  appointment_config_missing: "系統登入設定尚未完成，無法建立預約。",
  appointment_forbidden: "你沒有權限建立預約。",
  appointment_missing_customers: "目前沒有客戶資料，請先建立至少一位客戶。",
  appointment_missing_services: "目前沒有可用服務，請先建立至少一項服務。",
  appointment_missing_staff: "目前沒有可指派的員工，請先建立至少一位啟用的員工。",
  appointment_invalid_input: "預約資料格式不正確，請檢查時間與服務項目。",
  appointment_conflict: "同一位技師在這段時間已有衝突的預約。",
  appointment_create_failed: "預約建立失敗，請稍後再試。",
  appointment_update_invalid_input: "預約更新資料格式不正確，請檢查欄位內容。",
  appointment_invalid_status: "預約狀態不正確，請重新操作。",
  appointment_update_failed: "預約更新失敗，請稍後再試。",
  appointment_update_conflict: "同一位技師在這段時間已有衝突的預約。"
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
