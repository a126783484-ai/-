import { describe, expect, it } from "vitest";
import { getServiceError, getServiceMessage, readServiceParam } from "./service-feedback";

describe("service feedback helpers", () => {
  it("maps success and error codes", () => {
    expect(getServiceMessage("service_created")).toContain("預約與報價");
    expect(getServiceError("service_forbidden")).toContain("聯絡店主");
    expect(getServiceError("service_invalid_input")).toContain("重新檢查");
  });

  it("ignores array search params", () => {
    expect(readServiceParam(["service_created"])).toBeUndefined();
  });
});
