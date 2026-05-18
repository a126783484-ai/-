import { describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const mocks = vi.hoisted(() => ({
  createSupabaseServerClientMock: vi.fn(),
  ensureOwnerWorkspaceForUserMock: vi.fn(),
  hasPendingStaffInviteForEmailMock: vi.fn(),
}));

vi.mock("@/lib/supabase-server", () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClientMock,
}));

vi.mock("@/lib/workspace", () => ({
  ensureOwnerWorkspaceForUser: mocks.ensureOwnerWorkspaceForUserMock,
}));

vi.mock("@/lib/staff-invites", () => ({
  hasPendingStaffInviteForEmail: mocks.hasPendingStaffInviteForEmailMock,
  isMissingStaffInviteTableError: () => false,
}));

describe("auth callback route", () => {
  it("skips owner workspace bootstrap when a pending invite exists", async () => {
    const supabase = {
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1", email: "owner@example.com" }, session: { access_token: "token" } },
          error: null,
        }),
      },
    };

    mocks.createSupabaseServerClientMock.mockResolvedValue(supabase);
    mocks.hasPendingStaffInviteForEmailMock.mockResolvedValue(true);

    const response = await GET({
      url: "http://localhost/auth/callback?code=abc&next=/staff",
    } as never);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/staff");
    expect(mocks.ensureOwnerWorkspaceForUserMock).not.toHaveBeenCalled();
  });

  it("clears the session when workspace bootstrap fails", async () => {
    const supabase = {
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1", email: "owner@example.com" }, session: { access_token: "token" } },
          error: null,
        }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
      },
    };

    mocks.createSupabaseServerClientMock.mockResolvedValue(supabase);
    mocks.hasPendingStaffInviteForEmailMock.mockResolvedValue(false);
    mocks.ensureOwnerWorkspaceForUserMock.mockRejectedValue(new Error("boom"));

    const response = await GET({
      url: "http://localhost/auth/callback?code=abc&next=/staff",
    } as never);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/login?error=auth_bootstrap_failed");
    expect(supabase.auth.signOut).toHaveBeenCalledTimes(1);
  });
});
