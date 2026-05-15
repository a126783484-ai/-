import { describe, expect, it } from "vitest";
import { appointments, services } from "./seed";
import { buildAppointmentEnd, hasTechnicianConflict } from "./appointments";

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
});
