import { describe, expect, it } from "vitest";
import { buildMissingOrderLineServiceMessage } from "./order-line-errors";

describe("order line errors", () => {
  it("formats a traditional Chinese validation error for missing workspace services", () => {
    expect(buildMissingOrderLineServiceMessage(["svc-1", "svc-2"])).toBe(
      "訂單明細中的服務不存在於目前工作區，請重新選擇：svc-1、svc-2",
    );
  });

  it("deduplicates missing service ids and falls back to a plain message when empty", () => {
    expect(buildMissingOrderLineServiceMessage(["svc-1", "svc-1", ""])).toBe(
      "訂單明細中的服務不存在於目前工作區，請重新選擇：svc-1",
    );
    expect(buildMissingOrderLineServiceMessage([])).toBe(
      "訂單明細中的服務不存在於目前工作區，請重新選擇。",
    );
  });
});
