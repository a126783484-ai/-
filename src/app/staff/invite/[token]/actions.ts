"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { isMissingStaffInviteTableError } from "@/lib/staff-invites";

function readRequired(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${key} is required.`);
  }
  return value.trim();
}

function buildSearchParams(input: Record<string, string>) {
  return new URLSearchParams(input).toString();
}

function isUniqueViolation(error: { code?: string; message?: string }) {
  return error.code === "23505" || error.message?.toLowerCase().includes("duplicate key") === true;
}

export async function acceptStaffInviteAction(formData: FormData) {
  const token = readRequired(formData, "token");
  const supabase = await createSupabaseServerClient().catch(() => null);

  if (!supabase) {
    redirect(`/login?${buildSearchParams({ error: "auth_config_missing", next: `/staff/invite/${token}` })}`);
  }

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    redirect(`/login?${buildSearchParams({ next: `/staff/invite/${token}` })}`);
  }

  const inviteEmail = (authData.user.email ?? "").trim().toLowerCase();
  if (!inviteEmail) {
    redirect(`/staff/invite/${token}?${buildSearchParams({ error: "staff_invite_invalid" })}`);
  }

  const { data: invite, error: lookupError } = await supabase
    .from("workspace_member_invites")
    .select("id, workspace_id, email, display_name, phone, role, commission_rate, specialties, token, status, invited_by, created_at, accepted_at")
    .eq("token", token)
    .maybeSingle();

  if (isMissingStaffInviteTableError(lookupError)) {
    redirect(`/staff/invite/${token}?${buildSearchParams({ error: "staff_invite_unavailable" })}`);
  }

  if (lookupError || !invite || invite.status !== "pending" || invite.email.trim().toLowerCase() !== inviteEmail) {
    redirect(`/staff/invite/${token}?${buildSearchParams({ error: "staff_invite_invalid" })}`);
  }

  try {
    const { error: insertError } = await supabase.from("workspace_members").insert({
      workspace_id: invite.workspace_id,
      user_id: authData.user.id,
      role: invite.role,
      display_name: invite.display_name,
      phone: invite.phone,
      commission_rate: invite.commission_rate,
      specialties: invite.specialties,
      active: true
    });

    if (insertError && !isUniqueViolation(insertError)) {
      throw insertError;
    }

    const { error: updateError } = await supabase
      .from("workspace_member_invites")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString()
      })
      .eq("id", invite.id);

    if (updateError) {
      throw updateError;
    }
  } catch (error) {
    console.error("acceptStaffInviteAction failed", error);
    redirect(`/staff/invite/${token}?${buildSearchParams({ error: "staff_invite_failed" })}`);
  }

  redirect(`/staff?${buildSearchParams({ message: "staff_invite_accepted" })}`);
}
