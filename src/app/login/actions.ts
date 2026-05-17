"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { ensureOwnerWorkspaceForUser } from "@/lib/workspace";
import { loadPendingStaffInvitesForEmail } from "@/lib/staff-invites";

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
    let pendingInvites: Awaited<ReturnType<typeof loadPendingStaffInvitesForEmail>> = [];
    try {
      pendingInvites = await loadPendingStaffInvitesForEmail(supabase, data.user.email ?? "");
    } catch (inviteError) {
      console.error("pending invite lookup failed", inviteError);
    }

    if (pendingInvites.length > 0) {
      return { ok: true };
    }

    await ensureOwnerWorkspaceForUser(data.user, supabase);
  } catch {
    return { ok: false, error: "auth_bootstrap_failed" };
  }

  return { ok: true };
}
