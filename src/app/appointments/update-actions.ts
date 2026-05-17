"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { can } from "@/lib/permissions";
import type { Appointment, AppointmentStatus, Role } from "@/lib/types";
import { buildAppointmentEnd, hasTechnicianConflict } from "@/lib/appointments";
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

function readCheckedValues(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map((value) => value.trim());
}

function parseDateTimeLocal(value: string) {
  const parsed = new Date(`${value.trim()}:00+08:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
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

type QueryResult<T> = {
  data: T | null;
  error: { message?: string } | null;
};

type CustomerLookupRow = { id: string };
type StaffLookupRow = { id: string; role: string; active: boolean };
type ServiceLookupRow = { id: string; duration_min: number };
type AppointmentLookupRow = {
  id: string;
  customer_id: string;
  technician_id: string;
  start_at: string;
  end_at: string;
  status: AppointmentStatus;
  source: string;
  note: string | null;
};
type AppointmentServiceLookupRow = { appointment_id: string; service_id: string };

async function loadContext(client: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  const context = await getCurrentWorkspaceContext(client);
  return {
    supabase: client,
    workspaceId: context.workspace.id,
    role: context.membership.role
  };
}

export async function updateAppointmentAction(formData: FormData) {
  const appointmentId = readRequired(formData, "appointmentId");
  const customerId = readRequired(formData, "customerId");
  const technicianId = readRequired(formData, "technicianId");
  const startAtRaw = readRequired(formData, "startAt");
  const source = readRequired(formData, "source");
  const note = readOptional(formData, "note");
  const serviceIds = readCheckedValues(formData, "serviceIds");

  if (serviceIds.length === 0) {
    fail("appointment_update_invalid_input");
  }

  const supabase = await createSupabaseServerClient().catch(() => null);
  if (!supabase) {
    fail("appointment_config_missing");
  }

  let workspaceId = "";
  let role: Role = "staff";

  try {
    const context = await loadContext(supabase);
    workspaceId = context.workspaceId;
    role = context.role;
  } catch {
    fail("appointment_update_failed");
  }

  if (!can(role, "appointments")) {
    fail("appointment_forbidden");
  }

  const startAt = parseDateTimeLocal(startAtRaw);
  if (!startAt) {
    fail("appointment_update_invalid_input");
  }

  let customersResult: QueryResult<CustomerLookupRow | null> | null = null;
  let staffResult: QueryResult<StaffLookupRow | null> | null = null;
  let servicesResult: QueryResult<ServiceLookupRow[]> | null = null;
  let appointmentsResult: QueryResult<AppointmentLookupRow[]> | null = null;
  let appointmentServicesResult: QueryResult<AppointmentServiceLookupRow[]> | null = null;

  try {
    [customersResult, staffResult, servicesResult, appointmentsResult, appointmentServicesResult] = await Promise.all([
      supabase.from("customers").select("id").eq("workspace_id", workspaceId).eq("id", customerId).maybeSingle(),
      supabase.from("workspace_members").select("id, role, active").eq("workspace_id", workspaceId).eq("id", technicianId).maybeSingle(),
      supabase.from("services").select("id, duration_min").eq("workspace_id", workspaceId).in("id", serviceIds),
      supabase.from("appointments").select("id, customer_id, technician_id, start_at, end_at, status, source, note").eq("workspace_id", workspaceId),
      supabase.from("appointment_services").select("appointment_id, service_id")
    ]);
  } catch (error) {
    console.error("appointment update lookup failed", error);
    fail("appointment_update_failed");
  }

  const lookupError = [customersResult, staffResult, servicesResult, appointmentsResult, appointmentServicesResult]
    .filter((result): result is NonNullable<typeof result> => Boolean(result))
    .find((result) => result.error)?.error;

  if (lookupError) {
    console.error("appointment update lookup failed", lookupError);
    fail("appointment_update_failed");
  }

  const selectedServices = (servicesResult?.data ?? []).map((service) => ({
    id: service.id,
    durationMin: service.duration_min
  }));

  if (
    !customersResult?.data
    || !staffResult?.data
    || !staffResult.data.active
    || selectedServices.length !== serviceIds.length
  ) {
    fail("appointment_update_invalid_input");
  }

  const endAt = buildAppointmentEnd(startAt.toISOString(), serviceIds, selectedServices);
  const appointments: Appointment[] = (appointmentsResult?.data ?? []).map((appointment) => ({
    id: appointment.id,
    workspaceId,
    customerId: appointment.customer_id,
    technicianId: appointment.technician_id,
    startAt: appointment.start_at,
    endAt: appointment.end_at,
    status: appointment.status,
    source: appointment.source as Appointment["source"],
    note: appointment.note ?? undefined,
    serviceIds: (appointmentServicesResult?.data ?? [])
      .filter((item) => item.appointment_id === appointment.id)
      .map((item) => item.service_id)
  }));

  if (hasTechnicianConflict({ technicianId, startAt: startAt.toISOString(), endAt }, appointments, appointmentId)) {
    fail("appointment_update_conflict");
  }

  try {
    const { error: updateError } = await supabase
      .from("appointments")
      .update({
        customer_id: customerId,
        technician_id: technicianId,
        start_at: startAt.toISOString(),
        end_at: endAt,
        source,
        note
      })
      .eq("workspace_id", workspaceId)
      .eq("id", appointmentId);

    if (updateError) {
      throw updateError;
    }

    const { error: deleteError } = await supabase
      .from("appointment_services")
      .delete()
      .eq("appointment_id", appointmentId);

    if (deleteError) {
      throw deleteError;
    }

    const { error: insertError } = await supabase.from("appointment_services").insert(
      serviceIds.map((serviceId) => ({
        appointment_id: appointmentId,
        service_id: serviceId
      }))
    );

    if (insertError) {
      throw insertError;
    }
  } catch (error) {
    console.error("appointment update failed", error);
    fail("appointment_update_failed");
  }

  redirect(`/appointments?${buildSearchParams({ message: "appointment_updated" })}`);
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
