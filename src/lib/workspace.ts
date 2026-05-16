import type { User } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type WorkspaceRow = Database["public"]["Tables"]["workspaces"]["Row"];
type WorkspaceInsert = Database["public"]["Tables"]["workspaces"]["Insert"];
type WorkspaceMemberInsert = Database["public"]["Tables"]["workspace_members"]["Insert"];

function metadataString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function defaultWorkspaceName(user: User) {
  const emailPrefix = user.email?.split("@")[0]?.trim();
  return emailPrefix ? `${emailPrefix} 的店鋪` : "我的店鋪";
}

export async function createWorkspace(input: WorkspaceInsert): Promise<WorkspaceRow> {
  const supabase = await createSupabaseServerClient();

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

export async function createWorkspaceOwner(input: WorkspaceMemberInsert) {
  const supabase = await createSupabaseServerClient();

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

export async function bootstrapOwnerWorkspace(params: {
  user: User;
  workspaceName: string;
  phone?: string | null;
  displayName?: string | null;
}) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("bootstrap_owner_workspace", {
    workspace_name: params.workspaceName,
    owner_display_name: params.displayName || params.user.email || "Owner",
    owner_phone: params.phone ?? null
  });

  if (error) {
    throw error;
  }

  return data as WorkspaceRow;
}

export async function ensureOwnerWorkspaceForUser(user: User) {
  const workspaceName = metadataString(user.user_metadata?.workspace_name) ?? defaultWorkspaceName(user);

  return bootstrapOwnerWorkspace({
    user,
    workspaceName,
    phone: metadataString(user.user_metadata?.phone),
    displayName: metadataString(user.user_metadata?.display_name) ?? user.email ?? "Owner"
  });
}

export async function listWorkspaces() {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("workspaces")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}
