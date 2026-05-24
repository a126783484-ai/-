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
  {
    id: "lash",
    workspaceId: "ws",
    brand: "LashPro",
    category: "睫毛材料",
    name: "C 翹睫毛 0.07 10mm",
    cost: 260,
    retailPrice: 420,
    quantity: 6,
    lowStockThreshold: 5,
  },
  {
    id: "lash-glue",
    workspaceId: "ws",
    brand: "LashPro",
    category: "睫毛材料",
    name: "低敏睫毛膠",
    cost: 480,
    retailPrice: 680,
    quantity: 4,
    lowStockThreshold: 3,
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

  it("keeps lash services on lash materials instead of nail gel", () => {
    const plan = buildInventoryConsumptionPlan(
      [{ serviceId: "svc", name: "日式自然美睫 120 根", category: "美睫", quantity: 1 }],
      inventory,
    );

    expect(plan).toEqual(expect.arrayContaining([
      expect.objectContaining({ itemId: "lash", quantity: 1 }),
      expect.objectContaining({ itemId: "lash-glue", quantity: 1 }),
    ]));
    expect(plan).toHaveLength(2);
    expect(plan).not.toEqual(expect.arrayContaining([expect.objectContaining({ itemId: "gel" })]));
  });
});
