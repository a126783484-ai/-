import { addMinutes, areIntervalsOverlapping, parseISO } from "date-fns";
import type { Appointment, ServiceItem } from "./types";

export function appointmentDuration(serviceIds: string[], services: ServiceItem[]) {
  return serviceIds.reduce((total, id) => total + (services.find((service) => service.id === id)?.durationMin ?? 0), 0);
}

export function buildAppointmentEnd(startAt: string, serviceIds: string[], services: ServiceItem[]) {
  return addMinutes(parseISO(startAt), appointmentDuration(serviceIds, services)).toISOString();
}

export function hasTechnicianConflict(candidate: Pick<Appointment, "technicianId" | "startAt" | "endAt">, appointments: Appointment[], ignoreId?: string) {
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

export function statusLabel(status: Appointment["status"]) {
  return ({ pending: "待確認", confirmed: "已確認", in_service: "服務中", completed: "已完成", cancelled: "已取消", no_show: "未到" } as const)[status];
}
