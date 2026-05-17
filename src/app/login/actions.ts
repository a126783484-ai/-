"use server";

import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { ensureOwnerWorkspaceForUser } from "@/lib/workspace";
import { isMissingStaffInviteTableError, loadPendingStaffInvitesForEmail } from "@/lib/staff-invites";

export type LoginBootstrapResult =
  | { ok: true }
  | { ok: false; error: "auth_config_missing" | "auth_bootstrap_failed" };

export async function bootstrapLoggedInWorkspaceAction(
  supabase?: Awaited<ReturnType<typeof createSupabaseServerClient>> | null,
  user?: User
): Promise<LoginBootstrapResult> {
  const client = supabase ?? (await createSupabaseServerClient().catch(() => null));

  if (!client) {
    return { ok: false, error: "auth_config_missing" };
  }

  const dataUser = user ?? (await client.auth.getUser()).data.user;

  if (!dataUser) {
    return { ok: false, error: "auth_bootstrap_failed" };
  }

  try {
    let pendingInvites: Awaited<ReturnType<typeof loadPendingStaffInvitesForEmail>> = [];
    try {
      pendingInvites = await loadPendingStaffInvitesForEmail(client, dataUser.email ?? "");
    } catch (inviteError) {
      if (!isMissingStaffInviteTableError(inviteError as { code?: string; message?: string } | null | undefined)) {
        console.error("pending invite lookup failed", inviteError);
      }
    }

    if (pendingInvites.length > 0) {
      return { ok: true };
    }

    await ensureOwnerWorkspaceForUser(dataUser, client);
  } catch {
    return { ok: false, error: "auth_bootstrap_failed" };
  }

  return { ok: true };
}
