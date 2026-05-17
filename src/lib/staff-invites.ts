import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { StaffInvite } from "@/lib/types";

type AppSupabaseClient = SupabaseClient<Database, "public">;
type StaffInviteRow = Database["public"]["Tables"]["workspace_member_invites"]["Row"];

export function toStaffInvite(row: StaffInviteRow): StaffInvite {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    email: row.email,
    displayName: row.display_name,
    phone: row.phone ?? "",
    role: row.role as StaffInvite["role"],
    commissionRate: Number(row.commission_rate),
    specialties: row.specialties ?? [],
    token: row.token,
    status: row.status,
    invitedBy: row.invited_by ?? undefined,
    createdAt: row.created_at,
    acceptedAt: row.accepted_at ?? undefined
  };
}

export async function loadPendingStaffInvitesForEmail(supabase: AppSupabaseClient, email: string) {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    return [];
  }

  const { data, error } = await supabase
    .from("workspace_member_invites")
    .select("*")
    .eq("email", normalizedEmail)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map(toStaffInvite);
}

export function isMissingStaffInviteTableError(error: { code?: string; message?: string } | null | undefined) {
  return error?.code === "PGRST205" || error?.message?.includes("workspace_member_invites") === true;
}

export function buildStaffInvitePath(token: string) {
  return `/staff/invite/${encodeURIComponent(token)}`;
}
