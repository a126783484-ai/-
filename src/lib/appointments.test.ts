import { describe, expect, it } from "vitest";
import { appointments, services } from "./seed";
import {
  appointmentStatusDescriptions,
  buildAppointmentEnd,
  describeAppointmentConflict,
  describeAppointmentDependencies,
  hasTechnicianConflict,
  summarizeAppointmentDependencies,
} from "./appointments";

describe("appointment scheduling", () => {
  it("calculates end time from selected services and add-ons", () => {
    expect(buildAppointmentEnd("2026-05-15T11:00:00+08:00", ["svc_art", "addon_remove"], services)).toBe("2026-05-15T06:00:00.000Z");
  });

  it("blocks overlapping appointments for the same technician", () => {
    expect(hasTechnicianConflict({ technicianId: "st_ava", startAt: "2026-05-15T12:00:00+08:00", endAt: "2026-05-15T13:00:00+08:00" }, appointments)).toBe(true);
  });

  it("allows non-overlapping appointments for the same technician", () => {
    expect(hasTechnicianConflict({ technicianId: "st_ava", startAt: "2026-05-15T20:00:00+08:00", endAt: "2026-05-15T21:00:00+08:00" }, appointments)).toBe(false);
  });

  it("ignores cancelled and no-show appointments when checking conflicts", () => {
    const candidate = {
      technicianId: "st_temp",
      startAt: "2026-05-15T12:00:00+08:00",
      endAt: "2026-05-15T13:00:00+08:00",
    };

    expect(
      hasTechnicianConflict(candidate, [
        {
          id: "appt_cancelled",
          technicianId: "st_temp",
          startAt: "2026-05-15T12:15:00+08:00",
          endAt: "2026-05-15T12:45:00+08:00",
          status: "cancelled",
        },
        {
          id: "appt_no_show",
          technicianId: "st_temp",
          startAt: "2026-05-15T12:20:00+08:00",
          endAt: "2026-05-15T12:50:00+08:00",
          status: "no_show",
        },
      ]),
    ).toBe(false);
  });

  it("summarizes whether appointment dependencies are ready", () => {
    expect(
      summarizeAppointmentDependencies({
        customers: [{ id: "cus_1" }],
        services: [{ id: "svc_1", enabled: true }],
        staff: [{ id: "st_1", active: true }],
      }),
    ).toMatchObject({
      customerCount: 1,
      activeServiceCount: 1,
      activeStaffCount: 1,
      ready: true,
    });
  });

  it("flags missing appointment dependencies", () => {
    expect(
      summarizeAppointmentDependencies({
        customers: [],
        services: [{ id: "svc_1", enabled: false }],
        staff: [{ id: "st_1", active: false }],
      }),
    ).toMatchObject({
      missingCustomers: true,
      missingServices: true,
      missingStaff: true,
      ready: false,
    });
  });

  it("describes appointment dependencies in user-facing language", () => {
    expect(
      describeAppointmentDependencies({
        customerCount: 2,
        serviceCount: 3,
        activeServiceCount: 2,
        staffCount: 4,
        activeStaffCount: 3,
        missingCustomers: false,
        missingServices: false,
        missingStaff: false,
        ready: true,
      }),
    ).toMatchObject({
      title: "預約基礎資料已齊全",
      detail: "目前有 2 位客戶、2 項可用服務、3 位啟用員工，可以建立或更新預約。",
    });
  });

  it("describes the conflict rule clearly", () => {
    expect(describeAppointmentConflict()).toContain("同一位技師");
    expect(describeAppointmentConflict()).toContain("已取消與未到");
  });

  it("exposes clear status descriptions", () => {
    expect(appointmentStatusDescriptions.confirmed).toContain("已確認");
    expect(appointmentStatusDescriptions.cancelled).toContain("不再占用");
  });
});
