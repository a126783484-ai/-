export const settingsMessageText: Record<string, string> = {
  workspace_saved: "店鋪設定已儲存。"
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
