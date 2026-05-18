import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type AppSupabaseClient = SupabaseClient<Database, "public">;
type WorkspaceRow = Database["public"]["Tables"]["workspaces"]["Row"];
type WorkspaceSummaryRow = Pick<
  WorkspaceRow,
  "id" | "name" | "phone" | "address" | "brand_color" | "business_hours"
>;
type WorkspaceInsert = Database["public"]["Tables"]["workspaces"]["Insert"];
type WorkspaceMemberRow = Database["public"]["Tables"]["workspace_members"]["Row"];
type WorkspaceMemberInsert = Database["public"]["Tables"]["workspace_members"]["Insert"];
type WorkspaceMembershipPointer = Pick<WorkspaceMemberRow, "workspace_id">;

export interface WorkspaceContext {
  user: User;
  workspace: WorkspaceRow;
  membership: WorkspaceMemberRow;
}

async function getClient(client?: AppSupabaseClient) {
  return client ?? createSupabaseServerClient();
}

function metadataString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function isMissingRpcError(error: { code?: string; message?: string }) {
  const message = error.message?.toLowerCase() ?? "";
  return (
    error.code === "PGRST202"
    || message.includes("could not find the function")
    || (message.includes("bootstrap_owner_workspace") && message.includes("not found"))
  );
}

function defaultWorkspaceName(user: User) {
  const emailPrefix = user.email?.split("@")[0]?.trim();
  return emailPrefix ? `${emailPrefix} 的店鋪` : "我的店鋪";
}

export async function createWorkspace(input: WorkspaceInsert, client?: AppSupabaseClient): Promise<WorkspaceRow> {
  const supabase = await getClient(client);

  const { data, error } = await supabase
    .from("workspaces")
    .insert(input)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as WorkspaceRow;
}

export async function createWorkspaceOwner(input: WorkspaceMemberInsert, client?: AppSupabaseClient) {
  const supabase = await getClient(client);

  const { data, error } = await supabase
    .from("workspace_members")
    .insert(input)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function getFirstActiveMembership(userId: string, client?: AppSupabaseClient): Promise<WorkspaceMembershipPointer | null> {
  const supabase = await getClient(client);
  const { data, error } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId)
    .eq("active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as WorkspaceMembershipPointer | null;
}

export async function hasActiveWorkspaceMembership(userId: string, client?: AppSupabaseClient) {
  return (await getFirstActiveMembership(userId, client)) !== null;
}

async function bootstrapOwnerWorkspaceWithAuthenticatedInserts(params: {
  user: User;
  workspaceName: string;
  phone?: string | null;
  displayName?: string | null;
  client?: AppSupabaseClient;
  skipMembershipCheck?: boolean;
}) {
  if (!params.skipMembershipCheck) {
    const existingMembership = await getFirstActiveMembership(params.user.id, params.client);

    if (existingMembership) {
      const supabase = await getClient(params.client);
      const { data, error } = await supabase
        .from("workspaces")
        .select("id, name, phone, address, brand_color, business_hours")
        .eq("id", existingMembership.workspace_id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (data) {
        return data as WorkspaceRow;
      }
    }
  }

  const workspace = await createWorkspace({
    name: params.workspaceName,
    phone: params.phone ?? null
  }, params.client);

  await createWorkspaceOwner({
    workspace_id: workspace.id,
    user_id: params.user.id,
    role: "owner",
    display_name: params.displayName || params.user.email || "Owner",
    phone: params.phone ?? null
  }, params.client);

  return workspace;
}

export async function bootstrapOwnerWorkspace(params: {
  user: User;
  workspaceName: string;
  phone?: string | null;
  displayName?: string | null;
  client?: AppSupabaseClient;
  skipMembershipCheck?: boolean;
}) {
  const supabase = await getClient(params.client);
  const { data, error } = await supabase.rpc("bootstrap_owner_workspace", {
    workspace_name: params.workspaceName,
    owner_display_name: params.displayName || params.user.email || "Owner",
    owner_phone: params.phone ?? null
  });

  if (error) {
    if (isMissingRpcError(error)) {
      return bootstrapOwnerWorkspaceWithAuthenticatedInserts(params);
    }

    throw error;
  }

  return data as WorkspaceRow;
}

export async function ensureOwnerWorkspaceForUser(
  user: User,
  client?: AppSupabaseClient,
  skipMembershipCheck = false
) {
  const workspaceName = metadataString(user.user_metadata?.workspace_name) ?? defaultWorkspaceName(user);
  const supabase = await getClient(client);
  if (!skipMembershipCheck) {
    const existingMembership = await getFirstActiveMembership(user.id, supabase);

    if (existingMembership) {
      const { data: workspace, error: workspaceError } = await supabase
        .from("workspaces")
        .select("id, name, phone, address, brand_color, business_hours")
        .eq("id", existingMembership.workspace_id)
        .maybeSingle();

      if (workspaceError) {
        throw workspaceError;
      }

      if (workspace) {
        return workspace as WorkspaceSummaryRow as WorkspaceRow;
      }
    }
  }

  return bootstrapOwnerWorkspace({
    user,
    workspaceName,
    phone: metadataString(user.user_metadata?.phone),
    displayName: metadataString(user.user_metadata?.display_name) ?? user.email ?? "Owner",
    client,
    skipMembershipCheck: true
  });
}

export async function listWorkspaces() {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("workspaces")
    .select("id, name, phone, address, brand_color, business_hours")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}

export async function getCurrentWorkspaceContext(client?: AppSupabaseClient): Promise<WorkspaceContext> {
  const supabase = await getClient(client);
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    throw new Error("AUTH_REQUIRED");
  }

  const { data: memberships, error: membershipError } = await supabase
    .from("workspace_members")
    .select("id, workspace_id, role, active")
    .eq("user_id", authData.user.id)
    .eq("active", true)
    .order("created_at", { ascending: true })
    .limit(1);

  if (membershipError) {
    throw membershipError;
  }

  const membership = memberships?.[0];

  if (!membership) {
    throw new Error("WORKSPACE_MEMBER_MISSING");
  }

  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select("id, name, phone, address, brand_color, business_hours")
    .eq("id", membership.workspace_id)
    .maybeSingle();

  if (workspaceError) {
    throw workspaceError;
  }

  if (!workspace) {
    throw new Error("WORKSPACE_MISSING");
  }

  return {
    user: authData.user,
    workspace: workspace as WorkspaceRow,
    membership: membership as WorkspaceMemberRow
  };
}
