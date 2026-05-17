import { describe, expect, it } from "vitest";
import { getServiceError, getServiceMessage, readServiceParam } from "./service-feedback";

describe("service feedback helpers", () => {
  it("maps success and error codes", () => {
    expect(getServiceMessage("service_created")).toContain("已建立");
    expect(getServiceError("service_forbidden")).toContain("沒有權限");
  });

  it("ignores array search params", () => {
    expect(readServiceParam(["service_created"])).toBeUndefined();
  });
});
