export const staffMessageText: Record<string, string> = {
  staff_updated: "員工資料已更新。"
};

export const staffErrorText: Record<string, string> = {
  staff_config_missing: "系統登入設定尚未完成，無法更新員工資料。",
  staff_forbidden: "你沒有權限更新員工資料。",
  staff_invalid_input: "員工資料格式不正確，請檢查欄位內容。",
  staff_update_failed: "員工資料更新失敗，請稍後再試。"
};

export function readStaffParam(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export function getStaffMessage(code: string | undefined) {
  if (!code) return undefined;
  return staffMessageText[code] ?? staffMessageText.staff_updated;
}

export function getStaffError(code: string | undefined) {
  if (!code) return undefined;
  return staffErrorText[code] ?? staffErrorText.staff_update_failed;
}
