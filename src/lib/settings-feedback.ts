export const settingsMessageText: Record<string, string> = {
  workspace_saved: "店鋪設定已儲存，營業規則與品牌色已同步更新。",
  settings_setup_hint:
    "先把店名、聯絡方式、營業規則與品牌色補齊，再建立服務、員工與客戶，後續頁面才會完整。",
  settings_setup_incomplete:
    "店鋪已建立，但店名、聯絡方式、營業規則或品牌色還沒補齊。先完成這些基本設定，再往下建立服務、員工與客戶。"
};

export const settingsErrorText: Record<string, string> = {
  settings_config_missing: "儲存店鋪設定前，請先完成 Supabase 連線與設定必要項目，再回來重試。",
  settings_forbidden: "請聯絡店主或管理員，開啟你修改店鋪設定的權限。",
  settings_save_failed: "店鋪設定儲存失敗，請重新整理後再試。"
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
