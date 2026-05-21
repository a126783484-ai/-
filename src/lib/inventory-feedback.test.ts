import { describe, expect, it } from "vitest";
import { getInventoryError, getInventoryMessage, readInventoryParam } from "./inventory-feedback";

describe("inventory feedback helpers", () => {
  it("maps success and error codes", () => {
    expect(getInventoryMessage("inventory_item_saved")).toContain("已儲存");
    expect(getInventoryMessage("inventory_movement_recorded")).toContain("已記錄");
    expect(getInventoryError("inventory_item_invalid_input")).toContain("資料格式不正確");
    expect(getInventoryError("inventory_item_forbidden")).toContain("沒有權限");
    expect(getInventoryError("inventory_movement_failed")).toContain("失敗");
    expect(getInventoryError("inventory_insufficient_stock")).toContain("庫存不足");
  });

  it("ignores array search params", () => {
    expect(readInventoryParam(["inventory_movement_recorded"])).toBeUndefined();
  });
});
