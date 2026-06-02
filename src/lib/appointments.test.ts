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

  it("fails closed when appointment timestamps are malformed", () => {
    expect(
      buildAppointmentEnd("not-a-date", ["svc_art", "addon_remove"], services),
    ).toBe("");
    expect(
      hasTechnicianConflict(
        { technicianId: "st_ava", startAt: "not-a-date", endAt: "still-not-a-date" },
        appointments,
      ),
    ).toBe(false);
    expect(
      hasTechnicianConflict(
        { technicianId: "st_ava", startAt: "2026-05-15T12:00:00+08:00", endAt: "2026-05-15T13:00:00+08:00" },
        [
          {
            id: "appt_bad",
            technicianId: "st_ava",
            startAt: "bad",
            endAt: "data",
            status: "confirmed",
          },
        ],
      ),
    ).toBe(false);
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

  it("reports missingServices when all services are disabled", () => {
    const result = summarizeAppointmentDependencies({
      customers: [{ id: "cus_1" }],
      services: [
        { id: "svc_1", enabled: false },
        { id: "svc_2", enabled: false },
      ],
      staff: [{ id: "st_1", active: true }],
    });
    expect(result.missingServices).toBe(true);
    expect(result.missingCustomers).toBe(false);
    expect(result.missingStaff).toBe(false);
    expect(result.ready).toBe(false);
    expect(result.serviceCount).toBe(2);
    expect(result.activeServiceCount).toBe(0);
  });

  it("reports missingStaff when all staff are inactive", () => {
    const result = summarizeAppointmentDependencies({
      customers: [{ id: "cus_1" }],
      services: [{ id: "svc_1", enabled: true }],
      staff: [
        { id: "st_1", active: false },
        { id: "st_2", active: false },
      ],
    });
    expect(result.missingStaff).toBe(true);
    expect(result.missingCustomers).toBe(false);
    expect(result.missingServices).toBe(false);
    expect(result.ready).toBe(false);
    expect(result.staffCount).toBe(2);
    expect(result.activeStaffCount).toBe(0);
  });

  it("reports ready only when all three dependencies are satisfied", () => {
    const scenarios = [
      { customers: [], services: [{ id: "svc_1", enabled: true }], staff: [{ id: "st_1", active: true }], expected: false },
      { customers: [{ id: "cus_1" }], services: [], staff: [{ id: "st_1", active: true }], expected: false },
      { customers: [{ id: "cus_1" }], services: [{ id: "svc_1", enabled: true }], staff: [], expected: false },
      { customers: [{ id: "cus_1" }], services: [{ id: "svc_1", enabled: true }], staff: [{ id: "st_1", active: true }], expected: true },
    ];
    for (const scenario of scenarios) {
      expect(summarizeAppointmentDependencies(scenario).ready).toBe(scenario.expected);
    }
  });

  it("describes missing dependencies with correct labels", () => {
    const result = describeAppointmentDependencies({
      customerCount: 0,
      serviceCount: 0,
      activeServiceCount: 0,
      staffCount: 1,
      activeStaffCount: 1,
      missingCustomers: true,
      missingServices: true,
      missingStaff: false,
      ready: false,
    });
    expect(result.detail).toContain("客戶");
    expect(result.detail).toContain("可用服務");
    expect(result.detail).not.toContain("可指派員工");
  });

  it("describes all-missing state clearly", () => {
    const result = describeAppointmentDependencies({
      customerCount: 0,
      serviceCount: 0,
      activeServiceCount: 0,
      staffCount: 0,
      activeStaffCount: 0,
      missingCustomers: true,
      missingServices: true,
      missingStaff: true,
      ready: false,
    });
    expect(result.detail).toContain("客戶");
    expect(result.detail).toContain("可用服務");
    expect(result.detail).toContain("可指派員工");
  });

  it("describes ready state with correct counts", () => {
    const result = describeAppointmentDependencies({
      customerCount: 5,
      serviceCount: 8,
      activeServiceCount: 6,
      staffCount: 4,
      activeStaffCount: 3,
      missingCustomers: false,
      missingServices: false,
      missingStaff: false,
      ready: true,
    });
    expect(result.title).toBe("預約基礎資料已齊全");
    expect(result.detail).toContain("5 位客戶");
    expect(result.detail).toContain("6 項可用服務");
    expect(result.detail).toContain("3 位啟用員工");
  });
});
