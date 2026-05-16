import { describe, expect, it } from "vitest";
import { getAppointmentError, getAppointmentMessage, readAppointmentParam } from "./appointment-feedback";

describe("appointment feedback helpers", () => {
  it("maps success and error codes", () => {
    expect(getAppointmentMessage("appointment_created")).toContain("已建立");
    expect(getAppointmentError("appointment_conflict")).toContain("衝突");
  });

  it("ignores array search params", () => {
    expect(readAppointmentParam(["appointment_created"])).toBeUndefined();
  });
});
