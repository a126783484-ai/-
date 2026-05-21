export const settingsMessageText: Record<string, string> = {
  workspace_saved: "店鋪設定已儲存。",
  settings_setup_hint: "先完成店鋪設定，再建立服務、員工與客戶，就能開始看到營運指標。",
  settings_setup_incomplete: "店鋪已建立，但核心資料還不完整。先補服務、員工與客戶，後續頁面才會開始有內容。"
};

export const settingsErrorText: Record<string, string> = {
  settings_config_missing: "系統登入設定尚未完成，無法儲存店鋪設定。",
  settings_forbidden: "你沒有權限修改店鋪設定。",
  settings_save_failed: "店鋪設定儲存失敗，請稍後再試。"
};

export function readSettingsParam(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export function getSettingsMessage(code: string | undefined) {
  if (!code) return undefined;
  return settingsMessageText[code] ?? settingsMessageText.workspace_saved;
}

export function getSettingsError(code: string | undefined) {
  if (!code) return undefined;
  return settingsErrorText[code] ?? settingsErrorText.settings_save_failed;
}
