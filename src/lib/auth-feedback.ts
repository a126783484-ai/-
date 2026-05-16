export const authMessageText: Record<string, string> = {
  check_email: "帳號已建立，請到信箱完成驗證；驗證後再回來登入，即可進入 Dashboard。",
  signed_out: "已安全登出。"
};

export const authErrorText: Record<string, string> = {
  auth_bootstrap_failed: "帳號驗證成功，但店鋪 workspace 初始化失敗。請重新登入；若仍失敗請聯絡管理員。",
  auth_callback_failed: "Email 驗證連結已失效或無法建立登入 session，請重新登入或重新註冊。",
  auth_config_missing: "系統登入設定尚未完成，請聯絡管理員檢查 Supabase 環境變數。",
  invalid_login: "Email 或密碼不正確，或帳號尚未完成 email 驗證。",
  signup_failed: "帳號建立失敗，請確認 email 尚未註冊且密碼符合規則。",
  workspace_bootstrap_failed: "帳號已建立，但店鋪 workspace 初始化失敗。請完成 email 驗證後登入；若仍失敗請聯絡管理員。"
};

export function readAuthParam(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export function getAuthMessage(code: string | undefined) {
  if (!code) return undefined;
  return authMessageText[code] ?? authMessageText.signed_out;
}

export function getAuthError(code: string | undefined) {
  if (!code) return undefined;
  return authErrorText[code] ?? authErrorText.signup_failed;
}
