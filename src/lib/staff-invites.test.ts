import { describe, expect, it } from "vitest";
import { buildStaffInvitePath } from "./staff-invites";

describe("staff invite helpers", () => {
  it("builds a stable invite path", () => {
    expect(buildStaffInvitePath("abc-123")).toBe("/staff/invite/abc-123");
  });
});
