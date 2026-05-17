"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { can } from "@/lib/permissions";
import type { AppointmentStatus, Role } from "@/lib/types";
import { getCurrentWorkspaceContext } from "@/lib/workspace";

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

function fail(code: string): never {
  redirect(`/appointments?${buildSearchParams({ error: code })}`);
}

function isAppointmentStatus(value: string): value is AppointmentStatus {
  return ["pending", "confirmed", "in_service", "completed", "cancelled", "no_show"].includes(value);
}

async function updateStatus(formData: FormData, status: AppointmentStatus, successCode: string) {
  const appointmentId = readRequired(formData, "appointmentId");

  const supabase = await createSupabaseServerClient().catch(() => null);
  if (!supabase) {
    fail("appointment_config_missing");
  }

  let workspaceId = "";
  let role: Role = "staff";

  try {
    const context = await getCurrentWorkspaceContext(supabase);
    workspaceId = context.workspace.id;
    role = context.membership.role;
  } catch {
    fail("appointment_update_failed");
  }

  if (!can(role, "appointments")) {
    fail("appointment_forbidden");
  }

  try {
    const { data: appointment, error: lookupError } = await supabase
      .from("appointments")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("id", appointmentId)
      .maybeSingle();

    if (lookupError) {
      throw lookupError;
    }

    if (!appointment) {
      fail("appointment_invalid_input");
    }

    const { error } = await supabase
      .from("appointments")
      .update({ status })
      .eq("workspace_id", workspaceId)
      .eq("id", appointmentId);

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error("appointment status update failed", error);
    fail("appointment_update_failed");
  }

  redirect(`/appointments?${buildSearchParams({ message: successCode })}`);
}

export async function updateAppointmentStatusAction(formData: FormData) {
  const statusRaw = readRequired(formData, "status");
  if (!isAppointmentStatus(statusRaw)) {
    fail("appointment_invalid_status");
  }

  await updateStatus(formData, statusRaw, "appointment_status_updated");
}

export async function cancelAppointmentAction(formData: FormData) {
  await updateStatus(formData, "cancelled", "appointment_cancelled");
}
