export const staffMessageText: Record<string, string> = {
  staff_invite_created: "員工邀請已建立，請將邀請連結分享給對方。",
  staff_created: "員工邀請已建立，請提醒對方到信箱接受邀請。",
  staff_invite_accepted: "員工邀請已接受，已加入目前店鋪。",
  staff_updated: "員工資料已更新。",
  staff_shift_saved: "班表已儲存。"
};

export const staffErrorText: Record<string, string> = {
  staff_config_missing: "系統登入設定尚未完成，無法更新員工資料。",
  staff_create_failed: "員工邀請建立失敗，請稍後再試。",
  staff_invite_config_missing: "尚未設定 Supabase service role key，無法寄送員工邀請。",
  staff_invite_unavailable: "員工邀請功能尚未啟用，請先完成資料庫更新。",
  staff_invite_invalid: "邀請連結無效或已失效，請向店家重新索取。",
  staff_duplicate: "這個 email 已經是目前工作區的員工。",
  staff_forbidden: "你沒有權限更新員工資料。",
  staff_invalid_input: "員工資料格式不正確，請檢查欄位內容。",
  staff_owner_required: "只有店主可以建立或調整店主 / 管理員角色。",
  staff_self_update_forbidden: "不能停用自己的帳號或移除自己的管理權限。",
  staff_last_owner: "至少要保留一位啟用中的店主。",
  staff_invite_failed: "員工邀請寄送失敗，請確認 email 或稍後再試。",
  staff_update_failed: "員工資料更新失敗，請稍後再試。",
  staff_shift_forbidden: "你沒有權限編輯班表。",
  staff_shift_invalid_input: "班表資料格式不正確，請檢查欄位內容。",
  staff_shift_failed: "班表儲存失敗，請稍後再試。"
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
