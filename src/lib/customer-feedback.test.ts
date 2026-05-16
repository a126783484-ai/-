import { describe, expect, it } from "vitest";
import { getCustomerError, getCustomerMessage, readCustomerParam } from "./customer-feedback";

describe("customer feedback helpers", () => {
  it("maps success and error codes", () => {
    expect(getCustomerMessage("customer_created")).toContain("已建立");
    expect(getCustomerError("customer_forbidden")).toContain("沒有權限");
  });

  it("ignores array search params", () => {
    expect(readCustomerParam(["customer_created"])).toBeUndefined();
  });
});
