import { addMinutes, areIntervalsOverlapping, parseISO } from "date-fns";
import type { AppointmentStatus, ServiceItem } from "./types";

type AppointmentService = Pick<ServiceItem, "id" | "durationMin">;
type ConflictAppointment = {
  id: string;
  technicianId: string;
  startAt: string;
  endAt: string;
  status: AppointmentStatus;
};

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

export function statusLabel(status: AppointmentStatus) {
  return ({ pending: "待確認", confirmed: "已確認", in_service: "服務中", completed: "已完成", cancelled: "已取消", no_show: "未到" } as const)[status];
}
