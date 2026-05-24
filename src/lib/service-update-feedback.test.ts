import { describe, expect, it } from "vitest";
import { getServiceUpdateError, getServiceUpdateMessage, readServiceUpdateParam } from "./service-update-feedback";

describe("service update feedback helpers", () => {
  it("maps success and error codes", () => {
    expect(getServiceUpdateMessage("service_updated")).toContain("價格、時間與啟用狀態");
    expect(getServiceUpdateError("service_update_failed")).toContain("重新整理");
    expect(getServiceUpdateError("service_update_invalid_input")).toContain("重新檢查");
  });

  it("ignores array search params", () => {
    expect(readServiceUpdateParam(["service_updated"])).toBeUndefined();
  });
});
