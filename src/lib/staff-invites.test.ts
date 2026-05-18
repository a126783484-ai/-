import { describe, expect, it, vi } from "vitest";
import { buildStaffInvitePath, hasPendingStaffInviteForEmail } from "./staff-invites";

function createInviteClientStub(found: boolean) {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(async () => ({
            count: found ? 1 : 0,
            error: null
          }))
        }))
      }))
    }))
  } as never;
}

describe("staff invite helpers", () => {
  it("builds a stable invite path", () => {
    expect(buildStaffInvitePath("abc-123")).toBe("/staff/invite/abc-123");
  });

  it("detects whether a pending invite exists", async () => {
    const client = createInviteClientStub(true);

    await expect(hasPendingStaffInviteForEmail(client, "owner@example.com")).resolves.toBe(true);
  });
});
