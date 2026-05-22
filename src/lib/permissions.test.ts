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
    expect(moduleAccessMessage("technician", "services")).toContain("只能查看服務");
  });

  it("keeps write access explicit for managed modules", () => {
    expect(canManage("front_desk", "appointments")).toBe(true);
    expect(permissionScope("front_desk", "appointments")).toBe("manage");
  });
});
