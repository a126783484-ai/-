import { addMinutes, areIntervalsOverlapping, parseISO } from "date-fns";
import { formatDate, formatTime } from "./utils";
import type { Appointment, AppointmentStatus, ServiceItem, StaffMember } from "./types";

type AppointmentService = Pick<ServiceItem, "id" | "durationMin">;
type ConflictAppointment = {
  id: string;
  technicianId: string;
  startAt: string;
  endAt: string;
  status: AppointmentStatus;
};

type AppointmentDependencyInput = {
  customers: Array<{ id: string }>;
  services: Array<Pick<ServiceItem, "id" | "enabled">>;
  staff: Array<Pick<StaffMember, "id" | "active">>;
};

export type AppointmentDependencySummary = {
  customerCount: number;
  serviceCount: number;
  activeServiceCount: number;
  staffCount: number;
  activeStaffCount: number;
  missingCustomers: boolean;
  missingServices: boolean;
  missingStaff: boolean;
  ready: boolean;
};

export type AppointmentDependencyCopy = {
  title: string;
  detail: string;
};

export const appointmentStatusDescriptions: Record<AppointmentStatus, string> = {
  pending: "等待確認中的預約，尚未排定完成。",
  confirmed: "已確認，客戶與技師都已對上時段。",
  in_service: "服務進行中，現場已開始處理。",
  completed: "已完成，這筆預約已結案。",
  cancelled: "已取消，不再占用技師時段。",
  no_show: "客戶未到，這筆預約不再占用技師時段。",
};

export const openAppointmentStatuses = ["pending", "confirmed", "in_service"] as const;

export function isOpenAppointmentStatus(status: AppointmentStatus) {
  return openAppointmentStatuses.includes(status as (typeof openAppointmentStatuses)[number]);
}

export function dateKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function appointmentDuration(serviceIds: string[], services: AppointmentService[]) {
  return serviceIds.reduce((total, id) => total + (services.find((service) => service.id === id)?.durationMin ?? 0), 0);
}

export function buildAppointmentEnd(startAt: string, serviceIds: string[], services: AppointmentService[]) {
  return addMinutes(parseISO(startAt), appointmentDuration(serviceIds, services)).toISOString();
}

export function hasTechnicianConflict(candidate: Pick<ConflictAppointment, "technicianId" | "startAt" | "endAt">, appointments: ConflictAppointment[], ignoreId?: string) {
  return appointments.some((appointment) => {
    if (appointment.id === ignoreId || appointment.technicianId !== candidate.technicianId) return false;
    if (["cancelled", "no_show"].includes(appointment.status)) return false;
    return areIntervalsOverlapping(
      { start: parseISO(candidate.startAt), end: parseISO(candidate.endAt) },
      { start: parseISO(appointment.startAt), end: parseISO(appointment.endAt) },
      { inclusive: false }
    );
  });
}

export function summarizeAppointmentDependencies(data: AppointmentDependencyInput): AppointmentDependencySummary {
  const activeServiceCount = data.services.filter((service) => service.enabled).length;
  const activeStaffCount = data.staff.filter((member) => member.active).length;

  return {
    customerCount: data.customers.length,
    serviceCount: data.services.length,
    activeServiceCount,
    staffCount: data.staff.length,
    activeStaffCount,
    missingCustomers: data.customers.length === 0,
    missingServices: activeServiceCount === 0,
    missingStaff: activeStaffCount === 0,
    ready: data.customers.length > 0 && activeServiceCount > 0 && activeStaffCount > 0,
  };
}

export function daysSince(value?: string, now = new Date()) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || Number.isNaN(now.getTime())) return null;
  return Math.floor((now.getTime() - date.getTime()) / 86_400_000);
}

export function reminderDisplay(value?: string, now = new Date()) {
  if (!value) return null;

  const reminderKey = dateKey(value);
  const todayKey = dateKey(now);
  if (!reminderKey) return null;

  if (reminderKey < todayKey) {
    return { tone: "rose" as const, label: `${formatDate(value)}（逾期）`, due: true };
  }
  if (reminderKey === todayKey) {
    return { tone: "amber" as const, label: `${formatDate(value)}（今天）`, due: true };
  }
  return { tone: "sage" as const, label: formatDate(value), due: false };
}

export function describeAppointmentDependencies(summary: AppointmentDependencySummary): AppointmentDependencyCopy {
  if (summary.ready) {
    return {
      title: "預約基礎資料已齊全",
      detail: `目前有 ${summary.customerCount} 位客戶、${summary.activeServiceCount} 項可用服務、${summary.activeStaffCount} 位啟用員工，可以建立或更新預約。`,
    };
  }

  const missing = [
    summary.missingCustomers ? "客戶" : null,
    summary.missingServices ? "可用服務" : null,
    summary.missingStaff ? "可指派員工" : null,
  ].filter(Boolean);

  return {
    title: "先補齊預約基礎資料",
    detail: `目前缺少：${missing.join("、")}。建立這些資料後，才可以建立或更新預約。`,
  };
}

export function describeAppointmentConflict() {
  return "同一位技師在重疊時段只能有一筆有效預約；已取消與未到的預約不算衝突。";
}

export function isUnfinishedAppointment(appointment: Pick<Appointment, "status">) {
  return isOpenAppointmentStatus(appointment.status);
}

export function statusLabel(status: AppointmentStatus) {
  return ({ pending: "待確認", confirmed: "已確認", in_service: "服務中", completed: "已完成", cancelled: "已取消", no_show: "未到" } as const)[status];
}

export function appointmentCloseoutLabel(appointment: Pick<Appointment, "startAt" | "status">, now = new Date()) {
  const appointmentKey = dateKey(appointment.startAt);
  const todayKey = dateKey(now);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = dateKey(tomorrow);

  const dayLabel =
    appointmentKey === todayKey
      ? "今天"
      : appointmentKey === tomorrowKey
        ? "明天"
        : formatDate(appointment.startAt);

  return `${dayLabel} ${formatTime(appointment.startAt)} · ${statusLabel(appointment.status)}`;
}

export function appointmentHandoffSummary(
  appointment: Pick<Appointment, "serviceIds" | "startAt" | "status" | "source" | "note">,
  customerName?: string,
  technicianName?: string,
  now = new Date(),
) {
  const parts = [
    "今天要處理",
    appointmentCloseoutLabel(appointment, now),
    `${customerName ?? "未命名客戶"}／${technicianName ?? "未指派"}`,
    `來源 ${appointment.source}`,
    `${appointment.serviceIds.length} 項服務`,
    appointment.note?.trim() ? "有備註" : null,
  ].filter((part): part is string => Boolean(part));

  return parts.join(" · ");
}
