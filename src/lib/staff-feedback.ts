export const staffMessageText: Record<string, string> = {
  staff_invite_created: "員工邀請已建立，請將邀請連結分享給對方。",
  staff_created: "員工邀請已建立，請提醒對方到信箱接受邀請。",
  staff_invite_accepted: "員工邀請已接受，已加入目前店鋪。",
  staff_updated: "員工資料已更新。",
  staff_shift_saved: "班表已儲存。"
};

export const staffErrorText: Record<string, string> = {
  staff_config_missing: "更新員工資料前，請先完成 Supabase 連線與員工必要設定。",
  staff_create_failed: "員工邀請建立失敗，請重新整理後再試。",
  staff_invite_config_missing: "先設定 Supabase service role key，才能寄送員工邀請。",
  staff_invite_unavailable: "先完成資料庫更新並啟用員工邀請功能，再重新送出邀請。",
  staff_invite_invalid: "邀請連結無效或已失效，請重新產生或向店家索取新的連結。",
  staff_duplicate: "這個 email 已經是目前工作區的員工，請改用現有帳號或確認是否重複邀請。",
  staff_forbidden: "請聯絡店主或管理員，開啟你更新員工資料的權限。",
  staff_invalid_input: "員工資料格式不正確，請重新檢查姓名、email、角色後再送出。",
  staff_owner_required: "只有店主可以建立或調整店主 / 管理員角色，請改由店主操作。",
  staff_self_update_forbidden: "不能停用自己的帳號或移除自己的管理權限，請改由其他管理員協助。",
  staff_last_owner: "至少要保留一位啟用中的店主，請先指定另一位店主再停用目前帳號。",
  staff_shift_inactive: "停用中的員工不能建立新班表，請先恢復在職或改選其他人員。",
  staff_invite_failed: "員工邀請寄送失敗，請確認 email 正確後再試一次。",
  staff_update_failed: "員工資料更新失敗，請重新整理後再試。",
  staff_shift_forbidden: "你沒有權限編輯班表，請聯絡店主或管理員開啟權限。",
  staff_shift_invalid_input: "班表資料格式不正確，請重新檢查員工、日期與時間後再儲存。",
  staff_shift_failed: "班表儲存失敗，請重新整理後再試。"
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
