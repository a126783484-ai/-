import { describe, expect, it } from "vitest";
import { getStaffError, getStaffMessage, readStaffParam } from "./staff-feedback";

describe("staff feedback helpers", () => {
  it("maps success and error codes", () => {
    expect(getStaffMessage("staff_invite_created")).toContain("邀請");
    expect(getStaffMessage("staff_created")).toContain("邀請");
    expect(getStaffMessage("staff_updated")).toContain("已更新");
    expect(getStaffMessage("staff_shift_saved")).toContain("班表");
    expect(getStaffError("staff_update_failed")).toContain("重新整理");
    expect(getStaffError("staff_invite_config_missing")).toContain("service role key");
    expect(getStaffError("staff_invite_unavailable")).toContain("資料庫更新");
    expect(getStaffError("staff_shift_invalid_input")).toContain("重新檢查");
    expect(getStaffError("staff_shift_forbidden")).toContain("開啟權限");
    expect(getStaffError("staff_shift_inactive")).toContain("恢復在職");
  });

  it("ignores array search params", () => {
    expect(readStaffParam(["staff_updated"])).toBeUndefined();
  });
});
