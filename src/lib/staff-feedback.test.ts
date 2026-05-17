import { describe, expect, it } from "vitest";
import { getStaffError, getStaffMessage, readStaffParam } from "./staff-feedback";

describe("staff feedback helpers", () => {
  it("maps success and error codes", () => {
    expect(getStaffMessage("staff_updated")).toContain("已更新");
    expect(getStaffMessage("staff_invite_created")).toContain("邀請");
    expect(getStaffError("staff_update_failed")).toContain("失敗");
    expect(getStaffError("staff_invite_invalid")).toContain("失效");
    expect(getStaffError("staff_invite_unavailable")).toContain("尚未啟用");
  });

  it("ignores array search params", () => {
    expect(readStaffParam(["staff_updated"])).toBeUndefined();
  });
});
