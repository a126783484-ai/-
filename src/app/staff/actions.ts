"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { can } from "@/lib/permissions";
import type { Role } from "@/lib/types";
import { getCurrentWorkspaceContext } from "@/lib/workspace";

function readRequired(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${key} is required.`);
  }
  return value.trim();
}

function readOptional(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readBoolean(formData: FormData, key: string) {
  const value = formData.get(key);
  return value === "on" || value === "true";
}

function splitList(value: string | null) {
  return value
    ? value
        .split(/[,\n]/)
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

function parseCommissionRate(value: string) {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) return null;
  return parsed;
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function buildSearchParams(input: Record<string, string>) {
  return new URLSearchParams(input).toString();
}

function fail(code: string): never {
  redirect(`/staff?${buildSearchParams({ error: code })}`);
}

export async function createStaffInviteAction(formData: FormData) {
  const displayName = readRequired(formData, "displayName");
  const email = readRequired(formData, "email").toLowerCase();
  const phone = readOptional(formData, "phone");
  const role = readRequired(formData, "role");
  const commissionRateRaw = readOptional(formData, "commissionRate") ?? "0";
  const specialties = splitList(readOptional(formData, "specialties"));

  const validRoles: Role[] = ["owner", "admin", "technician", "front_desk", "staff"];
  if (!validRoles.includes(role as Role) || !isEmail(email)) {
    fail("staff_invalid_input");
  }

  const commissionRate = parseCommissionRate(commissionRateRaw);
  if (commissionRate === null) {
    fail("staff_invalid_input");
  }

  const supabase = await createSupabaseServerClient().catch(() => null);
  if (!supabase) {
    fail("staff_config_missing");
  }

  let workspaceId = "";
  let currentRole: Role = "staff";
  let userId = "";

  try {
    const context = await getCurrentWorkspaceContext(supabase);
    workspaceId = context.workspace.id;
    currentRole = context.membership.role;
    userId = context.user.id;
  } catch {
    fail("staff_create_failed");
  }

  if (!can(currentRole, "staff")) {
    fail("staff_forbidden");
  }

  try {
    const { data: existingInvite, error: inviteLookupError } = await supabase
      .from("workspace_member_invites")
      .select("id, token")
      .eq("workspace_id", workspaceId)
      .eq("email", email)
      .eq("status", "pending")
      .maybeSingle();

    if (inviteLookupError) {
      throw inviteLookupError;
    }

    const token = existingInvite?.token ?? crypto.randomUUID();
    const invitePayload = {
      workspace_id: workspaceId,
      email,
      display_name: displayName,
      phone,
      role: role as Role,
      commission_rate: commissionRate,
      specialties,
      token,
      status: "pending" as const,
      invited_by: userId,
      accepted_at: null
    };

    const result = existingInvite
      ? await supabase
          .from("workspace_member_invites")
          .update(invitePayload)
          .eq("workspace_id", workspaceId)
          .eq("id", existingInvite.id)
      : await supabase.from("workspace_member_invites").insert(invitePayload);

    if (result.error) {
      throw result.error;
    }
  } catch (error) {
    console.error("staff invite create failed", error);
    fail("staff_create_failed");
  }

  redirect(`/staff?${buildSearchParams({ message: "staff_invite_created" })}`);
}

export async function updateStaffAction(formData: FormData) {
  const memberId = readRequired(formData, "memberId");
  const displayName = readRequired(formData, "displayName");
  const phone = readOptional(formData, "phone");
  const role = readRequired(formData, "role");
  const active = readBoolean(formData, "active");
  const commissionRateRaw = readOptional(formData, "commissionRate") ?? "0";
  const specialties = splitList(readOptional(formData, "specialties"));

  const validRoles: Role[] = ["owner", "admin", "technician", "front_desk", "staff"];
  if (!validRoles.includes(role as Role)) {
    fail("staff_invalid_input");
  }

  const commissionRate = parseCommissionRate(commissionRateRaw);
  if (commissionRate === null) {
    fail("staff_invalid_input");
  }

  const supabase = await createSupabaseServerClient().catch(() => null);
  if (!supabase) {
    fail("staff_config_missing");
  }

  let workspaceId = "";
  let currentRole: Role = "staff";

  try {
    const context = await getCurrentWorkspaceContext(supabase);
    workspaceId = context.workspace.id;
    currentRole = context.membership.role;
  } catch {
    fail("staff_update_failed");
  }

  if (!can(currentRole, "staff")) {
    fail("staff_forbidden");
  }

  try {
    const { data: member, error: lookupError } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("id", memberId)
      .maybeSingle();

    if (lookupError) {
      throw lookupError;
    }

    if (!member) {
      fail("staff_invalid_input");
    }

    const { error } = await supabase
      .from("workspace_members")
      .update({
        display_name: displayName,
        phone,
        role: role as Role,
        active,
        commission_rate: commissionRate,
        specialties
      })
      .eq("workspace_id", workspaceId)
      .eq("id", memberId);

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error("staff update failed", error);
    fail("staff_update_failed");
  }

  redirect(`/staff?${buildSearchParams({ message: "staff_updated" })}`);
}
