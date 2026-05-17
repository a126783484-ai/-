import { describe, expect, it } from "vitest";
import { getCustomerUpdateError, getCustomerUpdateMessage, readCustomerUpdateParam } from "./customer-update-feedback";

describe("customer update feedback helpers", () => {
  it("maps success and error codes", () => {
    expect(getCustomerUpdateMessage("customer_updated")).toContain("已更新");
    expect(getCustomerUpdateError("customer_update_failed")).toContain("失敗");
  });

  it("ignores array search params", () => {
    expect(readCustomerUpdateParam(["customer_updated"])).toBeUndefined();
  });
});
