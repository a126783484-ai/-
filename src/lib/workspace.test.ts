import { describe, expect, it, vi } from "vitest";
import { ensureOwnerWorkspaceForUser } from "./workspace";

function createSupabaseStub() {
  const rpc = vi.fn();
  const from = vi.fn((table: string) => {
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      order: vi.fn(() => query),
      limit: vi.fn(() => query),
      maybeSingle: vi.fn(async () => {
        if (table === "workspace_members") {
          return {
            data: [
              {
                workspace_id: "workspace-1",
                user_id: "user-1",
                active: true
              }
            ],
            error: null
          };
        }

        if (table === "workspaces") {
          return {
            data: {
              id: "workspace-1",
              name: "Test Shop",
              phone: null,
              address: null,
              brand_color: null,
              business_hours: {}
            },
            error: null
          };
        }

        return { data: null, error: null };
      })
    };

    return query;
  });

  return { rpc, from };
}

describe("workspace bootstrap", () => {
  it("returns the existing workspace without calling bootstrap RPC when membership already exists", async () => {
    const supabase = createSupabaseStub();
    const user = { id: "user-1", email: "owner@example.com", user_metadata: {} } as never;

    await expect(ensureOwnerWorkspaceForUser(user, supabase as never)).resolves.toMatchObject({
      id: "workspace-1"
    });
    expect(supabase.rpc).not.toHaveBeenCalled();
  });
});
