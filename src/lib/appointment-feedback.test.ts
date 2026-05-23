import { describe, expect, it } from "vitest";
import { getAppointmentError, getAppointmentMessage, readAppointmentParam } from "./appointment-feedback";

describe("appointment feedback helpers", () => {
  it("maps success and error codes", () => {
    expect(getAppointmentMessage("appointment_created")).toContain("已建立");
    expect(getAppointmentMessage("appointment_updated")).toContain("已更新");
    expect(getAppointmentMessage("appointment_status_updated")).toContain("已更新");
    expect(getAppointmentMessage("appointment_cancelled")).toContain("已取消");
    expect(getAppointmentError("appointment_conflict")).toContain("重疊");
    expect(getAppointmentError("appointment_update_conflict")).toContain("重疊");
    expect(getAppointmentError("appointment_invalid_status")).toContain("可選");
  });

  it("ignores array search params", () => {
    expect(readAppointmentParam(["appointment_created"])).toBeUndefined();
  });
});
