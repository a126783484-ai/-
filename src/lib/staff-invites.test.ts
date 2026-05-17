import { describe, expect, it, vi } from "vitest";
import { buildStaffInvitePath, hasPendingStaffInviteForEmail } from "./staff-invites";

function createInviteClientStub(found: boolean) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    limit: vi.fn(() => query),
    maybeSingle: vi.fn(async () => ({
      data: found ? { id: "invite-1" } : null,
      error: null
    }))
  };

  return {
    from: vi.fn(() => query)
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
