"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { can } from "@/lib/permissions";
import type { Appointment, Role } from "@/lib/types";
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

type AppointmentLookupRow = {
  id: string;
  customer_id: string;
  technician_id: string;
  start_at: string;
  end_at: string;
  status: Appointment["status"];
  source: Appointment["source"] | string;
  note: string | null;
};

type AppointmentServiceLookupRow = {
  appointment_id: string;
  service_id: string;
};

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

export async function createAppointmentAction(formData: FormData) {
  const customerId = readRequired(formData, "customerId");
  const technicianId = readRequired(formData, "technicianId");
  const startAtRaw = readRequired(formData, "startAt");
  const source = readRequired(formData, "source");
  const note = readOptional(formData, "note");
  const serviceIds = readCheckedValues(formData, "serviceIds");

  if (serviceIds.length === 0) {
    fail("appointment_invalid_input");
  }

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

  const startAt = parseDateTimeLocal(startAtRaw);
  if (!startAt) {
    fail("appointment_invalid_input");
  }

  let customersResult: QueryResult<CustomerLookupRow | null> | null = null;
  let staffResult: QueryResult<StaffLookupRow | null> | null = null;
  let servicesResult: QueryResult<ServiceLookupRow[]> | null = null;
  let appointmentsResult: QueryResult<AppointmentLookupRow[]> | null = null;
  try {
    [customersResult, staffResult, servicesResult, appointmentsResult] = await Promise.all([
      supabase.from("customers").select("id").eq("workspace_id", workspaceId).eq("id", customerId).maybeSingle(),
      supabase.from("workspace_members").select("id, role, active").eq("workspace_id", workspaceId).eq("id", technicianId).maybeSingle(),
      supabase.from("services").select("id, duration_min").eq("workspace_id", workspaceId).in("id", serviceIds),
      supabase.from("appointments").select("id, customer_id, technician_id, start_at, end_at, status, source, note").eq("workspace_id", workspaceId)
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
    serviceIds: []
  }));

  const appointmentIds = (appointmentsResult?.data ?? []).map((appointment) => appointment.id);
  let appointmentServicesResult: QueryResult<AppointmentServiceLookupRow[]> | null = null;

  try {
    appointmentServicesResult = appointmentIds.length
      ? await supabase
          .from("appointment_services")
          .select("appointment_id, service_id")
          .in("appointment_id", appointmentIds)
      : { data: [], error: null };
  } catch (error) {
    console.error("appointment service lookup failed", error);
    fail("appointment_create_failed");
  }

  if (appointmentServicesResult?.error) {
    console.error("appointment service lookup failed", appointmentServicesResult.error);
    fail("appointment_create_failed");
  }

  const appointmentServices = appointmentServicesResult?.data ?? [];
  for (const appointment of appointments) {
    appointment.serviceIds = appointmentServices
      .filter((item) => item.appointment_id === appointment.id)
      .map((item) => item.service_id);
  }

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
