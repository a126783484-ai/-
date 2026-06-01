import { describe, expect, it } from "vitest";
import { getStaffError, getStaffMessage, readStaffParam } from "./staff-feedback";

describe("staff feedback helpers", () => {
  describe("getStaffMessage", () => {
    it("maps staff_invite_created", () => {
      expect(getStaffMessage("staff_invite_created")).toContain("邀請");
    });

    it("maps staff_created", () => {
      expect(getStaffMessage("staff_created")).toContain("邀請");
    });

    it("maps staff_invite_accepted", () => {
      expect(getStaffMessage("staff_invite_accepted")).toContain("已接受");
    });

    it("maps staff_updated", () => {
      expect(getStaffMessage("staff_updated")).toContain("已更新");
    });

    it("maps staff_shift_saved", () => {
      expect(getStaffMessage("staff_shift_saved")).toContain("班表");
    });

    it("returns fallback message for unknown code", () => {
      expect(getStaffMessage("unknown_code")).toContain("已更新");
    });

    it("returns undefined for undefined input", () => {
      expect(getStaffMessage(undefined)).toBeUndefined();
    });
  });

  describe("getStaffError", () => {
    it("maps staff_config_missing", () => {
      expect(getStaffError("staff_config_missing")).toContain("Supabase");
    });

    it("maps staff_create_failed", () => {
      expect(getStaffError("staff_create_failed")).toContain("重新整理");
    });

    it("maps staff_invite_config_missing", () => {
      expect(getStaffError("staff_invite_config_missing")).toContain("service role key");
    });

    it("maps staff_invite_unavailable", () => {
      expect(getStaffError("staff_invite_unavailable")).toContain("資料庫更新");
    });

    it("maps staff_invite_invalid", () => {
      expect(getStaffError("staff_invite_invalid")).toContain("無效");
    });

    it("maps staff_duplicate", () => {
      expect(getStaffError("staff_duplicate")).toContain("重複邀請");
    });

    it("maps staff_forbidden", () => {
      expect(getStaffError("staff_forbidden")).toContain("開啟你");
    });

    it("maps staff_invalid_input", () => {
      expect(getStaffError("staff_invalid_input")).toContain("重新檢查");
    });

    it("maps staff_owner_required", () => {
      expect(getStaffError("staff_owner_required")).toContain("店主");
    });

    it("maps staff_self_update_forbidden", () => {
      expect(getStaffError("staff_self_update_forbidden")).toContain("停用");
    });

    it("maps staff_last_owner", () => {
      expect(getStaffError("staff_last_owner")).toContain("啟用中的店主");
    });

    it("maps staff_shift_inactive", () => {
      expect(getStaffError("staff_shift_inactive")).toContain("恢復在職");
    });

    it("maps staff_invite_failed", () => {
      expect(getStaffError("staff_invite_failed")).toContain("寄送失敗");
    });

    it("maps staff_update_failed", () => {
      expect(getStaffError("staff_update_failed")).toContain("重新整理");
    });

    it("maps staff_shift_forbidden", () => {
      expect(getStaffError("staff_shift_forbidden")).toContain("開啟權限");
    });

    it("maps staff_shift_invalid_input", () => {
      expect(getStaffError("staff_shift_invalid_input")).toContain("重新檢查");
    });

    it("maps staff_shift_failed", () => {
      expect(getStaffError("staff_shift_failed")).toContain("重新整理");
    });

    it("returns fallback error for unknown code", () => {
      expect(getStaffError("unknown_code")).toContain("更新失敗");
    });

    it("returns undefined for undefined input", () => {
      expect(getStaffError(undefined)).toBeUndefined();
    });
  });

  describe("readStaffParam", () => {
    it("returns a string value as-is", () => {
      expect(readStaffParam("staff_updated")).toBe("staff_updated");
    });

    it("returns undefined for array values", () => {
      expect(readStaffParam(["staff_updated"])).toBeUndefined();
    });

    it("returns undefined for undefined", () => {
      expect(readStaffParam(undefined)).toBeUndefined();
    });
  });
});
