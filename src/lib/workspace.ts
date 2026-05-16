import type { Database } from "@/lib/database.types";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function createWorkspace(input: Database['public']['Tables']['workspaces']['Insert']) {
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
