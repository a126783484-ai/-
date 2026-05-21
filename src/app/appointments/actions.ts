"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { can } from "@/lib/permissions";
import type { AppointmentStatus, Role } from "@/lib/types";
import { buildAppointmentEnd, hasTechnicianConflict } from "@/lib/appointments";
import { getCurrentWorkspaceContext } from "@/lib/workspace";

type QueryResult<T> = {
  data: T | null;
  error: { message?: string } | null;
};

type CustomerLookupRow = {
  id: string;
};

type StaffLookupRow = {
  id: string;
  role: string;
  active: boolean;
};

type ServiceLookupRow = {
  id: string;
  duration_min: number;
};

type AppointmentDbRow = {
  id: string;
  technician_id: string;
  start_at: string;
  end_at: string;
  status: AppointmentStatus;
};

type CountResult = {
  count: number | null;
  error: { message?: string } | null;
};


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
  const normalized = value.trim();
  const parsed = new Date(`${normalized}:00+08:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function buildSearchParams(input: Record<string, string>) {
  return new URLSearchParams(input).toString();
}

function fail(code: string): never {
  redirect(`/appointments?${buildSearchParams({ error: code })}`);
}

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readOptionalText(formData: FormData, key: string) {
  const value = readText(formData, key);
  return value.length > 0 ? value : null;
}

export async function createAppointmentAction(formData: FormData) {
  const customerId = readOptionalText(formData, "customerId");
  const technicianId = readOptionalText(formData, "technicianId");
  const startAtRaw = readOptionalText(formData, "startAt");
  const source = readOptionalText(formData, "source");
  const note = readOptional(formData, "note");
  const serviceIds = readCheckedValues(formData, "serviceIds");

  const supabase = await createSupabaseServerClient().catch(() => null);

  if (!supabase) {
    fail("appointment_config_missing");
  }

  let workspaceId = "";
  let role: Role = "staff";
  let userId = "";

  try {
    const context = await getCurrentWorkspaceContext(supabase);
    workspaceId = context.workspace.id;
    role = context.membership.role;
    userId = context.user.id;
  } catch {
    fail("appointment_create_failed");
  }

  if (!can(role, "appointments")) {
    fail("appointment_forbidden");
  }

  let customersCount: CountResult | null = null;
  let servicesCount: CountResult | null = null;
  let staffCount: CountResult | null = null;
  try {
    [customersCount, servicesCount, staffCount] = await Promise.all([
      supabase.from("customers").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId),
      supabase.from("services").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId),
      supabase
        .from("workspace_members")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .eq("active", true),
    ]);
  } catch (error) {
    console.error("appointment dependency count failed", error);
    fail("appointment_create_failed");
  }

  const dependencyError = [customersCount, servicesCount, staffCount].find((result) => result?.error)?.error;
  if (dependencyError) {
    console.error("appointment dependency count failed", dependencyError);
    fail("appointment_create_failed");
  }

  if ((customersCount?.count ?? 0) === 0) {
    fail("appointment_missing_customers");
  }

  if ((servicesCount?.count ?? 0) === 0) {
    fail("appointment_missing_services");
  }

  if ((staffCount?.count ?? 0) === 0) {
    fail("appointment_missing_staff");
  }

  if (!customerId || !technicianId || !startAtRaw || !source) {
    fail("appointment_invalid_input");
  }

  if (serviceIds.length === 0) {
    fail("appointment_invalid_input");
  }

  const startAt = parseDateTimeLocal(startAtRaw);
  if (!startAt) {
    fail("appointment_invalid_input");
  }

  let customersResult: QueryResult<CustomerLookupRow | null> | null = null;
  let staffResult: QueryResult<StaffLookupRow | null> | null = null;
  let servicesResult: QueryResult<ServiceLookupRow[]> | null = null;
  let appointmentsResult: QueryResult<AppointmentDbRow[]> | null = null;
  try {
    [customersResult, staffResult, servicesResult, appointmentsResult] = await Promise.all([
      supabase.from("customers").select("id").eq("workspace_id", workspaceId).eq("id", customerId).maybeSingle(),
      supabase.from("workspace_members").select("id, role, active").eq("workspace_id", workspaceId).eq("id", technicianId).maybeSingle(),
      supabase.from("services").select("id, duration_min").eq("workspace_id", workspaceId).in("id", serviceIds),
      supabase.from("appointments").select("id, technician_id, start_at, end_at, status").eq("workspace_id", workspaceId)
    ]);
  } catch (error) {
    console.error("appointment create failed", error);
    fail("appointment_create_failed");
  }

  const lookupError = [customersResult, staffResult, servicesResult, appointmentsResult]
    .filter((result): result is NonNullable<typeof result> => Boolean(result))
    .find((result) => result.error)?.error;

  if (lookupError) {
    console.error("appointment lookup failed", lookupError);
    fail("appointment_create_failed");
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
    fail("appointment_invalid_input");
  }

  const endAt = buildAppointmentEnd(startAt.toISOString(), serviceIds, selectedServices);
  const appointments = (appointmentsResult?.data ?? []).map((appointment) => ({
    id: appointment.id,
    technicianId: appointment.technician_id,
    startAt: appointment.start_at,
    endAt: appointment.end_at,
    status: appointment.status
  }));

  if (hasTechnicianConflict({ technicianId, startAt: startAt.toISOString(), endAt }, appointments)) {
    fail("appointment_conflict");
  }

  try {
    const { data: createdAppointment, error: appointmentError } = await supabase
      .from("appointments")
      .insert({
        workspace_id: workspaceId,
        customer_id: customerId,
        technician_id: technicianId,
        start_at: startAt.toISOString(),
        end_at: endAt,
        source,
        note,
        status: "pending",
        created_by: userId
      })
      .select("id")
      .single();

    if (appointmentError || !createdAppointment) {
      throw appointmentError ?? new Error("Appointment insert failed.");
    }

    const { error: appointmentServicesInsertError } = await supabase.from("appointment_services").insert(
      serviceIds.map((serviceId) => ({
        appointment_id: createdAppointment.id,
        service_id: serviceId
      }))
    );

    if (appointmentServicesInsertError) {
      throw appointmentServicesInsertError;
    }
  } catch (error) {
    console.error("appointment insert failed", error);
    fail("appointment_create_failed");
  }

  redirect(`/appointments?${buildSearchParams({ message: "appointment_created" })}`);
}
