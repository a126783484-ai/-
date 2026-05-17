import { describe, expect, it } from "vitest";
import { getInventoryError, getInventoryMessage, readInventoryParam } from "./inventory-feedback";

describe("inventory feedback helpers", () => {
  it("maps success and error codes", () => {
    expect(getInventoryMessage("inventory_movement_recorded")).toContain("已記錄");
    expect(getInventoryError("inventory_movement_failed")).toContain("失敗");
    expect(getInventoryError("inventory_insufficient_stock")).toContain("庫存不足");
  });

  it("ignores array search params", () => {
    expect(readInventoryParam(["inventory_movement_recorded"])).toBeUndefined();
  });
});
