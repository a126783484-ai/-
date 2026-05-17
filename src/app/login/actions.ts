"use server";

import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { ensureOwnerWorkspaceForUser, hasActiveWorkspaceMembership } from "@/lib/workspace";
import { hasPendingStaffInviteForEmail, isMissingStaffInviteTableError } from "@/lib/staff-invites";

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
    if (await hasActiveWorkspaceMembership(dataUser.id, client)) {
      return { ok: true };
    }

    try {
      if (await hasPendingStaffInviteForEmail(client, dataUser.email ?? "")) {
        return { ok: true };
      }
    } catch (inviteError) {
      if (!isMissingStaffInviteTableError(inviteError as { code?: string; message?: string } | null | undefined)) {
        console.error("pending invite lookup failed", inviteError);
      }
    }

    await ensureOwnerWorkspaceForUser(dataUser, client, true);
  } catch {
    return { ok: false, error: "auth_bootstrap_failed" };
  }

  return { ok: true };
}
