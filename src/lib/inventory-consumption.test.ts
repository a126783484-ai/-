import { describe, expect, it } from "vitest";
import { buildInventoryConsumptionPlan, validateInventoryConsumption } from "./inventory-consumption";
import type { InventoryItem } from "./types";

const inventory: InventoryItem[] = [
  {
    id: "gel",
    workspaceId: "ws",
    brand: "Beauty Pro",
    category: "凝膠",
    name: "底膠",
    cost: 180,
    retailPrice: 380,
    quantity: 12,
    lowStockThreshold: 5,
  },
  {
    id: "cotton",
    workspaceId: "ws",
    brand: "Beauty Pro",
    category: "耗材",
    name: "棉片",
    cost: 60,
    retailPrice: 120,
    quantity: 18,
    lowStockThreshold: 8,
  },
];

describe("inventory consumption planning", () => {
  it("plans deterministic stock deductions for a nail checkout", () => {
    const plan = buildInventoryConsumptionPlan(
      [{ serviceId: "svc", name: "單色凝膠", category: "凝膠美甲", quantity: 1 }],
      inventory,
    );

    expect(plan).toEqual([
      expect.objectContaining({ itemId: "gel", quantity: 1 }),
      expect.objectContaining({ itemId: "cotton", quantity: 1 }),
    ]);
    expect(validateInventoryConsumption(plan, inventory).ok).toBe(true);
  });

  it("blocks checkout when projected consumption exceeds stock", () => {
    const plan = buildInventoryConsumptionPlan(
      [{ serviceId: "svc", name: "單色凝膠", category: "凝膠美甲", quantity: 20 }],
      inventory,
    );

    const result = validateInventoryConsumption(plan, inventory);
    expect(result.ok).toBe(false);
    expect(result.message).toContain("庫存不足");
  });

  it("deducts directly sold inventory items by exact name", () => {
    const plan = buildInventoryConsumptionPlan(
      [{ serviceId: "", name: "棉片", quantity: 2 }],
      inventory,
    );

    expect(plan).toEqual([expect.objectContaining({ itemId: "cotton", quantity: 2 })]);
  });
});
