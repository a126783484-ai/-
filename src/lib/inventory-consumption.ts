import type { InventoryItem, OrderLine } from "./types";

export type InventoryConsumptionLine = Pick<OrderLine, "serviceId" | "name" | "quantity"> & {
  category?: string;
};

export type InventoryConsumptionPlanItem = {
  itemId: string;
  itemName: string;
  quantity: number;
  reason: string;
};

function compact(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function includesAny(value: string, keywords: string[]) {
  return keywords.some((keyword) => value.includes(keyword.toLowerCase()));
}

function findInventoryItem(
  inventory: InventoryItem[],
  keywords: string[],
  excludedIds: Set<string>,
) {
  return inventory.find((item) => {
    if (excludedIds.has(item.id)) return false;
    const haystack = compact(`${item.name} ${item.category} ${item.brand}`);
    return includesAny(haystack, keywords);
  });
}

function findInventoryItemMatching(
  inventory: InventoryItem[],
  matches: (haystack: string) => boolean,
  excludedIds: Set<string>,
) {
  return inventory.find((item) => {
    if (excludedIds.has(item.id)) return false;
    return matches(compact(`${item.name} ${item.category} ${item.brand}`));
  });
}

function addConsumption(
  plan: Map<string, InventoryConsumptionPlanItem>,
  item: InventoryItem | undefined,
  quantity: number,
  reason: string,
  excludedIds: Set<string>,
) {
  if (!item || quantity <= 0) return;

  const current = plan.get(item.id);
  plan.set(item.id, {
    itemId: item.id,
    itemName: item.name,
    quantity: (current?.quantity ?? 0) + quantity,
    reason: current ? `${current.reason}、${reason}` : reason,
  });
  excludedIds.add(item.id);
}

export function buildInventoryConsumptionPlan(
  lines: InventoryConsumptionLine[],
  inventory: InventoryItem[],
) {
  const plan = new Map<string, InventoryConsumptionPlanItem>();

  for (const line of lines) {
    const quantity = Math.max(1, Math.round(line.quantity || 1));
    const text = compact(`${line.name} ${line.category ?? ""}`);
    const excludedIds = new Set<string>();

    const exactProduct = inventory.find((item) => {
      const itemName = compact(item.name);
      return itemName.length > 0 && (text.includes(itemName) || itemName.includes(text));
    });
    addConsumption(plan, exactProduct, quantity, `${line.name} 直接銷售`, excludedIds);

    if (includesAny(text, ["凝膠", "美甲", "單色", "手繪", "延甲"])) {
      addConsumption(
        plan,
        findInventoryItem(inventory, ["凝膠", "底膠", "建構", "色膠"], excludedIds),
        quantity,
        `${line.name} 基礎耗材`,
        excludedIds,
      );
      addConsumption(
        plan,
        findInventoryItem(inventory, ["棉片", "耗材", "清潔"], excludedIds),
        quantity,
        `${line.name} 清潔耗材`,
        excludedIds,
      );
    }

    if (includesAny(text, ["卸甲", "保養", "去角質", "手足"])) {
      addConsumption(
        plan,
        findInventoryItem(inventory, ["棉片", "耗材", "清潔"], excludedIds),
        quantity,
        `${line.name} 保養耗材`,
        excludedIds,
      );
    }

    if (includesAny(text, ["美睫", "睫毛"])) {
      addConsumption(
        plan,
        findInventoryItemMatching(inventory, (haystack) => includesAny(haystack, ["睫毛", "睫"]), excludedIds),
        quantity,
        `${line.name} 睫毛材料`,
        excludedIds,
      );
      addConsumption(
        plan,
        findInventoryItemMatching(inventory, (haystack) => haystack.includes("睫") && haystack.includes("膠"), excludedIds),
        quantity,
        `${line.name} 美睫膠材`,
        excludedIds,
      );
    }
  }

  return [...plan.values()].sort((left, right) => left.itemName.localeCompare(right.itemName, "zh-Hant"));
}

export function validateInventoryConsumption(
  plan: InventoryConsumptionPlanItem[],
  inventory: InventoryItem[],
) {
  const stockById = new Map(inventory.map((item) => [item.id, item.quantity]));
  const insufficient = plan.filter((item) => (stockById.get(item.itemId) ?? 0) < item.quantity);

  if (insufficient.length) {
    return {
      ok: false,
      message: `庫存不足：${insufficient.map((item) => `${item.itemName} 需 ${item.quantity}`).join("、")}`,
    };
  }

  return { ok: true, message: "" };
}
