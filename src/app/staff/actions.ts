"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseConfig } from "@/lib/supabase";
import { can } from "@/lib/permissions";
import type { Role } from "@/lib/types";
import { getCurrentWorkspaceContext } from "@/lib/workspace";
import type { Database } from "@/lib/database.types";
import { isMissingStaffInviteTableError } from "@/lib/staff-invites";

type AppSupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;
type AdminSupabaseClient = NonNullable<ReturnType<typeof createSupabaseAdminClient>>;

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
        .split(/[,\n、]/)
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

function parseCommissionRate(value: string) {
  const normalized = value.trim().replace(/%$/, "");
  const parsed = Number.parseFloat(normalized);

  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) return null;
  if (parsed > 1) return parsed / 100;

  return parsed;
}

function readDate(formData: FormData, key: string) {
  const value = readRequired(formData, key);
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function readTime(formData: FormData, key: string) {
  const value = readRequired(formData, key);
  return /^\d{2}:\d{2}$/.test(value) ? value : null;
}

function readRole(formData: FormData) {
  const role = readRequired(formData, "role");
  const validRoles: Role[] = ["owner", "admin", "technician", "front_desk", "staff"];

  if (!validRoles.includes(role as Role)) {
    fail("staff_invalid_input");
  }

  return role as Role;
}

function readEmail(formData: FormData) {
  const email = readRequired(formData, "email").toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function createSupabaseAdminClient() {
  const config = getSupabaseConfig();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!config.url || !serviceRoleKey) {
    return null;
  }

  return createClient<Database>(config.url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function appUrl() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) return `https://${vercelUrl}`;

  return "http://localhost:3000";
}

function buildSearchParams(input: Record<string, string>) {
  return new URLSearchParams(input).toString();
}

function fail(code: string): never {
  redirect(`/staff?${buildSearchParams({ error: code })}`);
}

async function requireStaffAdminContext(supabase: AppSupabaseClient) {
  let context: Awaited<ReturnType<typeof getCurrentWorkspaceContext>>;

  try {
    context = await getCurrentWorkspaceContext(supabase);
  } catch {
    fail("staff_update_failed");
  }

  if (!can(context.membership.role as Role, "staff")) {
    fail("staff_forbidden");
  }

  return context;
}

async function requireShiftAdminContext(supabase: AppSupabaseClient) {
  let context: Awaited<ReturnType<typeof getCurrentWorkspaceContext>>;

  try {
    context = await getCurrentWorkspaceContext(supabase);
  } catch {
    fail("staff_shift_failed");
  }

  if (!can(context.membership.role as Role, "staff")) {
    fail("staff_shift_forbidden");
  }

  return context;
}

function assertRoleAssignable(currentRole: Role, targetRole: Role) {
  if ((targetRole === "owner" || targetRole === "admin") && currentRole !== "owner") {
    fail("staff_owner_required");
  }
}

async function findAuthUserByEmail(admin: AdminSupabaseClient, email: string) {
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;

    const user = data.users.find((item) => item.email?.toLowerCase() === email);
    if (user) return user;
    if (data.users.length < 100) return null;
  }

  return null;
}

async function assertCanRemoveOwnerRole(supabase: AppSupabaseClient, workspaceId: string, memberId: string, nextRole: Role, nextActive: boolean) {
  const { data: member, error: memberError } = await supabase
    .from("workspace_members")
    .select("id, role, active")
    .eq("workspace_id", workspaceId)
    .eq("id", memberId)
    .maybeSingle();

  if (memberError) throw memberError;
  if (!member) fail("staff_invalid_input");

  const isRemovingActiveOwner = member.role === "owner" && member.active && (nextRole !== "owner" || !nextActive);
  if (!isRemovingActiveOwner) return;

  const { count, error } = await supabase
    .from("workspace_members")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("role", "owner")
    .eq("active", true);

  if (error) throw error;
  if ((count ?? 0) <= 1) fail("staff_last_owner");
}

async function hasShiftStaffInWorkspace(supabase: AppSupabaseClient, workspaceId: string, staffId: string) {
  const { data: member, error } = await supabase
    .from("workspace_members")
    .select("id, active")
    .eq("workspace_id", workspaceId)
    .eq("id", staffId)
    .maybeSingle();

  if (error) throw error;
  return member ?? null;
}

async function shiftExists(supabase: AppSupabaseClient, workspaceId: string, shiftId: string) {
  const { data: shift, error } = await supabase
    .from("shifts")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("id", shiftId)
    .maybeSingle();

  if (error) throw error;
  return Boolean(shift);
}

export async function createStaffAction(formData: FormData) {
  const email = readEmail(formData);
  const displayName = readRequired(formData, "displayName");
  const phone = readOptional(formData, "phone");
  const role = readRole(formData);
  const commissionRateRaw = readOptional(formData, "commissionRate") ?? "0";
  const specialties = splitList(readOptional(formData, "specialties"));

  if (!email) {
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

  const context = await requireStaffAdminContext(supabase);
  const currentRole = context.membership.role as Role;
  assertRoleAssignable(currentRole, role);

  const admin = createSupabaseAdminClient();
  if (!admin) {
    fail("staff_invite_config_missing");
  }

  try {
    let user = await findAuthUserByEmail(admin, email);

    if (!user) {
      const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
        data: {
          display_name: displayName,
          workspace_id: context.workspace.id,
          workspace_role: role,
        },
        redirectTo: `${appUrl()}/auth/callback`,
      });

      if (error || !data.user) {
        throw error ?? new Error("INVITE_USER_FAILED");
      }

      user = data.user;
    }

    const { count: existingCount, error: existingError } = await supabase
      .from("workspace_members")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", context.workspace.id)
      .eq("user_id", user.id)
      ;

    if (existingError) {
      throw existingError;
    }

    if ((existingCount ?? 0) > 0) {
      fail("staff_duplicate");
    }

    const { error } = await supabase.from("workspace_members").insert({
      workspace_id: context.workspace.id,
      user_id: user.id,
      display_name: displayName,
      phone,
      role,
      active: true,
      commission_rate: commissionRate,
      specialties,
    });

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error("staff create failed", error);
    fail("staff_invite_failed");
  }

  revalidatePath("/staff");
  redirect(`/staff?${buildSearchParams({ message: "staff_created" })}`);
}

export async function updateStaffAction(formData: FormData) {
  const memberId = readRequired(formData, "memberId");
  const displayName = readRequired(formData, "displayName");
  const phone = readOptional(formData, "phone");
  const role = readRole(formData);
  const active = readBoolean(formData, "active");
  const commissionRateRaw = readOptional(formData, "commissionRate") ?? "0";
  const specialties = splitList(readOptional(formData, "specialties"));

  const commissionRate = parseCommissionRate(commissionRateRaw);
  if (commissionRate === null) {
    fail("staff_invalid_input");
  }

  const supabase = await createSupabaseServerClient().catch(() => null);
  if (!supabase) {
    fail("staff_config_missing");
  }

  const context = await requireStaffAdminContext(supabase);
  const workspaceId = context.workspace.id;
  const currentRole = context.membership.role as Role;
  assertRoleAssignable(currentRole, role);

  if (memberId === context.membership.id && (!active || role !== currentRole)) {
    fail("staff_self_update_forbidden");
  }

  try {
    await assertCanRemoveOwnerRole(supabase, workspaceId, memberId, role, active);

    const { error } = await supabase
      .from("workspace_members")
      .update({
        display_name: displayName,
        phone,
        role,
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

  revalidatePath("/staff");
  redirect(`/staff?${buildSearchParams({ message: "staff_updated" })}`);
}

export async function saveStaffShiftAction(formData: FormData) {
  const shiftId = readOptional(formData, "id");
  const staffId = readRequired(formData, "staffId");
  const shiftDate = readDate(formData, "shiftDate");
  const startTime = readTime(formData, "startTime");
  const endTime = readTime(formData, "endTime");
  const leave = readBoolean(formData, "leave");

  if (!shiftDate || !startTime || !endTime) {
    fail("staff_shift_invalid_input");
  }

  if (!leave && startTime >= endTime) {
    fail("staff_shift_invalid_input");
  }

  const supabase = await createSupabaseServerClient().catch(() => null);
  if (!supabase) {
    fail("staff_config_missing");
  }

  const context = await requireShiftAdminContext(supabase);

  const staffInWorkspace = await hasShiftStaffInWorkspace(supabase, context.workspace.id, staffId);
  if (!staffInWorkspace) {
    fail("staff_shift_invalid_input");
  }
  if (!staffInWorkspace.active && !shiftId) {
    fail("staff_shift_inactive");
  }

  if (shiftId) {
    const existingShift = await shiftExists(supabase, context.workspace.id, shiftId);
    if (!existingShift) {
      fail("staff_shift_invalid_input");
    }
  }

  try {
    const payload = {
      workspace_id: context.workspace.id,
      staff_id: staffId,
      shift_date: shiftDate,
      start_time: startTime,
      end_time: endTime,
      leave,
    };

    const result = shiftId
      ? await supabase
          .from("shifts")
          .update(payload)
          .eq("workspace_id", context.workspace.id)
          .eq("id", shiftId)
      : await supabase.from("shifts").insert({
          id: crypto.randomUUID(),
          ...payload,
        });

    if (result.error) {
      throw result.error;
    }
  } catch (error) {
    console.error("staff shift save failed", error);
    fail("staff_shift_failed");
  }

  revalidatePath("/staff");
  redirect(`/staff?${buildSearchParams({ message: "staff_shift_saved" })}`);
}

export async function createStaffInviteAction(formData: FormData) {
  const email = readEmail(formData);
  const displayName = readRequired(formData, "displayName");
  const phone = readOptional(formData, "phone");
  const role = readRole(formData);
  const commissionRateRaw = readOptional(formData, "commissionRate") ?? "0";
  const specialties = splitList(readOptional(formData, "specialties"));

  if (!email) {
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

  const context = await requireStaffAdminContext(supabase);
  const currentRole = context.membership.role as Role;
  assertRoleAssignable(currentRole, role);

  try {
    const { data: existingInvite, error: inviteLookupError } = await supabase
      .from("workspace_member_invites")
      .select("id, token")
      .eq("workspace_id", context.workspace.id)
      .eq("email", email)
      .eq("status", "pending")
      .maybeSingle();

    if (inviteLookupError) {
      if (isMissingStaffInviteTableError(inviteLookupError)) {
        fail("staff_invite_unavailable");
      }
      throw inviteLookupError;
    }

    const token = existingInvite?.token ?? crypto.randomUUID();
    const invitePayload = {
      workspace_id: context.workspace.id,
      email,
      display_name: displayName,
      phone,
      role,
      commission_rate: commissionRate,
      specialties,
      token,
      status: "pending" as const,
      invited_by: context.user.id,
      accepted_at: null,
    };

    const result = existingInvite
      ? await supabase
          .from("workspace_member_invites")
          .update(invitePayload)
          .eq("workspace_id", context.workspace.id)
          .eq("id", existingInvite.id)
      : await supabase.from("workspace_member_invites").insert(invitePayload);

    if (result.error) {
      throw result.error;
    }
  } catch (error) {
    if (isMissingStaffInviteTableError(error as { code?: string; message?: string } | null | undefined)) {
      fail("staff_invite_unavailable");
    }
    console.error("staff invite create failed", error);
    fail("staff_create_failed");
  }

  revalidatePath("/staff");
  redirect(`/staff?${buildSearchParams({ message: "staff_invite_created" })}`);
}
