import { beforeEach, describe, expect, it, vi } from "vitest";
import { bootstrapLoggedInWorkspaceAction } from "./actions";

const mocks = vi.hoisted(() => ({
  ensureOwnerWorkspaceForUserMock: vi.fn(),
  loadPendingStaffInvitesForEmailMock: vi.fn(),
  hasActiveWorkspaceMembershipMock: vi.fn(),
  createSupabaseServerClientMock: vi.fn()
}));

vi.mock("@/lib/workspace", () => ({
  ensureOwnerWorkspaceForUser: mocks.ensureOwnerWorkspaceForUserMock,
  hasActiveWorkspaceMembership: mocks.hasActiveWorkspaceMembershipMock
}));

vi.mock("@/lib/staff-invites", () => ({
  isMissingStaffInviteTableError: () => false,
  loadPendingStaffInvitesForEmail: mocks.loadPendingStaffInvitesForEmailMock
}));

vi.mock("@/lib/supabase-server", () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClientMock
}));

function createSupabaseStub(user: { id: string; email: string | null }) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null })
    }
  } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("bootstrapLoggedInWorkspaceAction", () => {
  it("returns auth_config_missing when the server client cannot be created", async () => {
    mocks.createSupabaseServerClientMock.mockResolvedValue(null);

    await expect(bootstrapLoggedInWorkspaceAction()).resolves.toEqual({
      ok: false,
      error: "auth_config_missing"
    });
  });

  it("skips workspace bootstrap when there is a pending invite", async () => {
    const supabase = createSupabaseStub({ id: "user-1", email: "owner@example.com" });
    mocks.createSupabaseServerClientMock.mockResolvedValue(supabase);
    mocks.hasActiveWorkspaceMembershipMock.mockResolvedValue(false);
    mocks.loadPendingStaffInvitesForEmailMock.mockResolvedValue([{ id: "invite-1" }]);

    await expect(bootstrapLoggedInWorkspaceAction(supabase, { id: "user-1", email: "owner@example.com" } as never)).resolves.toEqual({
      ok: true
    });
    expect(mocks.ensureOwnerWorkspaceForUserMock).not.toHaveBeenCalled();
  });

  it("bootstraps the workspace when there is no pending invite", async () => {
    const supabase = createSupabaseStub({ id: "user-2", email: "owner@example.com" });
    mocks.createSupabaseServerClientMock.mockResolvedValue(supabase);
    mocks.hasActiveWorkspaceMembershipMock.mockResolvedValue(false);
    mocks.loadPendingStaffInvitesForEmailMock.mockResolvedValue([]);
    mocks.ensureOwnerWorkspaceForUserMock.mockResolvedValue({ id: "workspace-1" });

    await expect(bootstrapLoggedInWorkspaceAction(supabase, { id: "user-2", email: "owner@example.com" } as never)).resolves.toEqual({
      ok: true
    });
    expect(mocks.ensureOwnerWorkspaceForUserMock).toHaveBeenCalledWith(
      { id: "user-2", email: "owner@example.com" },
      supabase
    );
  });

  it("short-circuits when the user already has an active membership", async () => {
    const supabase = createSupabaseStub({ id: "user-3", email: "owner@example.com" });
    mocks.createSupabaseServerClientMock.mockResolvedValue(supabase);
    mocks.hasActiveWorkspaceMembershipMock.mockResolvedValue(true);

    await expect(bootstrapLoggedInWorkspaceAction(supabase, { id: "user-3", email: "owner@example.com" } as never)).resolves.toEqual({
      ok: true
    });
    expect(mocks.loadPendingStaffInvitesForEmailMock).not.toHaveBeenCalled();
    expect(mocks.ensureOwnerWorkspaceForUserMock).not.toHaveBeenCalled();
  });
});
