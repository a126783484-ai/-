import { describe, expect, it, vi } from "vitest";
import { ensureOwnerWorkspaceForUser, getCurrentWorkspaceContext } from "./workspace";

function createSupabaseStub(options: { ownerMembership?: boolean }) {
  const rpc = vi.fn();
  const auth = {
    getUser: vi.fn(async () => ({
      data: { user: { id: "user-1", email: "owner@example.com", user_metadata: {} } },
      error: null
    }))
  };

  const from = vi.fn((table: string) => {
    const state = { role: null as string | null, workspaceId: null as string | null };

    const query = {
      select: vi.fn(() => query),
      eq: vi.fn((column: string, value: string) => {
        if (table === "workspace_members" && column === "role") {
          state.role = value;
        }

        if (table === "workspaces" && column === "id") {
          state.workspaceId = value;
        }

        return query;
      }),
      order: vi.fn(() => query),
      limit: vi.fn(() => query),
      maybeSingle: vi.fn(async () => {
        if (table === "workspace_members") {
          if (state.role === "owner" && options.ownerMembership) {
            return {
              data: {
                id: "membership-owner",
                workspace_id: "workspace-owner",
                role: "owner",
                active: true
              },
              error: null
            };
          }

          return {
            data: {
              id: "membership-fallback",
              workspace_id: "workspace-fallback",
              role: "staff",
              active: true
            },
            error: null
          };
        }

        if (table === "workspaces" && state.workspaceId === "workspace-fallback") {
          return {
            data: {
              id: "workspace-fallback",
              name: "Fallback Shop",
              phone: null,
              address: null,
              brand_color: null,
              business_hours: {}
            },
            error: null
          };
        }

        return {
          data: {
            id: "workspace-owner",
            name: "Owner Shop",
            phone: null,
            address: null,
            brand_color: null,
            business_hours: {}
          },
          error: null
        };
      })
    };

    return query;
  });

  return { rpc, from, auth };
}

describe("workspace bootstrap", () => {
  it("returns the existing workspace without calling bootstrap RPC when membership already exists", async () => {
    const supabase = createSupabaseStub({ ownerMembership: true });
    const user = { id: "user-1", email: "owner@example.com", user_metadata: {} } as never;

    await expect(ensureOwnerWorkspaceForUser(user, supabase as never)).resolves.toMatchObject({
      id: "workspace-owner"
    });
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("uses the owner workspace first and falls back to the oldest active membership", async () => {
    const ownerSupabase = createSupabaseStub({ ownerMembership: true });

    await expect(getCurrentWorkspaceContext(ownerSupabase as never)).resolves.toMatchObject({
      workspace: { id: "workspace-owner" },
      membership: {
        id: "membership-owner",
        workspace_id: "workspace-owner",
        role: "owner",
        active: true
      }
    });

    const fallbackSupabase = createSupabaseStub({ ownerMembership: false });

    await expect(getCurrentWorkspaceContext(fallbackSupabase as never)).resolves.toMatchObject({
      workspace: { id: "workspace-fallback" },
      membership: {
        id: "membership-fallback",
        workspace_id: "workspace-fallback",
        role: "staff",
        active: true
      }
    });
  });
});
