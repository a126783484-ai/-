import { describe, expect, it } from "vitest";
import {
  formatInventoryMovementQuantity,
  formatInventoryStock,
  getInventoryError,
  getInventoryMessage,
  readInventoryParam,
} from "./inventory-feedback";

describe("inventory feedback helpers", () => {
  it("maps success and error codes", () => {
    expect(getInventoryMessage("inventory_item_saved")).toContain("已儲存");
    expect(getInventoryMessage("inventory_movement_recorded")).toContain("已記錄");
    expect(getInventoryError("inventory_item_invalid_input")).toContain("品名、分類與數量");
    expect(getInventoryError("inventory_invalid_input")).toContain("品項、類型與數量");
    expect(getInventoryError("inventory_item_forbidden")).toContain("聯絡店主");
    expect(getInventoryError("inventory_movement_failed")).toContain("重新整理");
    expect(getInventoryError("inventory_insufficient_stock")).toContain("改成數量調整");
  });

  it("ignores array search params", () => {
    expect(readInventoryParam(["inventory_movement_recorded"])).toBeUndefined();
  });

  it("formats stock and movement quantities with units", () => {
    expect(formatInventoryStock(2, 5)).toBe("剩 2 件 / 警戒 5 件");
    expect(formatInventoryStock(8, 5)).toBe("8 件 / 警戒 5 件");
    expect(formatInventoryMovementQuantity(3)).toBe("+3 件");
    expect(formatInventoryMovementQuantity(-2)).toBe("-2 件");
  });
});
