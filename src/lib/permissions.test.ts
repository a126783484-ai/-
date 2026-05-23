import { describe, expect, it } from "vitest";
import { can, canManage, moduleAccessMessage, permissionScope } from "./permissions";

describe("role permissions", () => {
  it("allows owners to access all modules", () => {
    expect(can("owner", "settings")).toBe(true);
  });

  it("limits technicians to their workstation and own appointments", () => {
    expect(can("technician", "technician")).toBe(true);
    expect(can("technician", "reports")).toBe(false);
  });

  it("lets read-only roles see the module without manage access", () => {
    expect(can("technician", "services")).toBe(true);
    expect(canManage("technician", "services")).toBe(false);
    expect(permissionScope("technician", "services")).toBe("view");
    expect(moduleAccessMessage("technician", "services")).toContain("只能查看服務清單與價格");
  });

  it("describes view-only and hidden controls consistently", () => {
    expect(permissionScope("technician", "appointments")).toBe("view");
    expect(moduleAccessMessage("technician", "appointments")).toContain("只能查看預約");
    expect(permissionScope("staff", "checkout")).toBe("none");
    expect(moduleAccessMessage("staff", "checkout")).toContain("無法存取訂單 / 結帳");
  });

  it("keeps write access explicit for managed modules", () => {
    expect(canManage("front_desk", "appointments")).toBe(true);
    expect(permissionScope("front_desk", "appointments")).toBe("manage");
  });
});
