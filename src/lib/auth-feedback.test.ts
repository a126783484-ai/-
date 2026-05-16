import { describe, expect, it } from "vitest";
import { getAuthError, getAuthMessage, readAuthParam } from "@/lib/auth-feedback";

describe("auth feedback helpers", () => {
  it("maps email confirmation state to an explicit next step", () => {
    expect(getAuthMessage("check_email")).toContain("完成驗證");
    expect(getAuthMessage("check_email")).toContain("登入");
  });

  it("maps invalid login without exposing raw provider errors", () => {
    expect(getAuthError("invalid_login")).toContain("Email 或密碼不正確");
    expect(getAuthError("invalid_login")).toContain("email 驗證");
  });

  it("ignores array search params during server render", () => {
    expect(readAuthParam(["%E0%A4%A"])).toBeUndefined();
  });
});
