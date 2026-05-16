import { describe, expect, it } from "vitest";
import { can } from "./permissions";

describe("role permissions", () => {
  it("allows owners to access all modules", () => {
    expect(can("owner", "settings")).toBe(true);
  });

  it("limits technicians to their workstation and own appointments", () => {
    expect(can("technician", "technician")).toBe(true);
    expect(can("technician", "reports")).toBe(false);
  });
});
