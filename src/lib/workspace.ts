import type { User } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type WorkspaceInsert = Database['public']['Tables']['workspaces']['Insert'];
type WorkspaceMemberInsert = Database['public']['Tables']['workspace_members']['Insert'];

export async function createWorkspace(input: WorkspaceInsert) {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('workspaces')
    .insert(input)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function createWorkspaceOwner(input: WorkspaceMemberInsert) {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('workspace_members')
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
  const workspace = await createWorkspace({
    name: params.workspaceName,
    phone: params.phone ?? null
  });

  await createWorkspaceOwner({
    workspace_id: workspace.id,
    user_id: params.user.id,
    role: 'owner',
    display_name: params.displayName || params.user.email || 'Owner',
    phone: params.phone ?? null
  });

  return workspace;
}

export async function listWorkspaces() {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('workspaces')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}
