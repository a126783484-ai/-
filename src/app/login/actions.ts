"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { ensureOwnerWorkspaceForUser } from "@/lib/workspace";

export type LoginBootstrapResult =
  | { ok: true }
  | { ok: false; error: "auth_config_missing" | "auth_bootstrap_failed" };

export async function bootstrapLoggedInWorkspaceAction(): Promise<LoginBootstrapResult> {
  const supabase = await createSupabaseServerClient().catch(() => null);

  if (!supabase) {
    return { ok: false, error: "auth_config_missing" };
  }

  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return { ok: false, error: "auth_bootstrap_failed" };
  }

  try {
    await ensureOwnerWorkspaceForUser(data.user, supabase);
  } catch {
    return { ok: false, error: "auth_bootstrap_failed" };
  }

  return { ok: true };
}
