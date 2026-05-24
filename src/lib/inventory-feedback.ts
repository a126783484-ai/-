export const inventoryMessageText: Record<string, string> = {
  inventory_item_saved: "庫存品項已儲存。",
  inventory_movement_recorded: "庫存異動已記錄。"
};

export const inventoryErrorText: Record<string, string> = {
  inventory_config_missing: "處理庫存前，請先完成 Supabase 連線與庫存必要設定，再回來重試。",
  inventory_item_failed: "庫存品項儲存失敗，請重新整理後再試。",
  inventory_item_forbidden: "請聯絡店主或管理員，開啟你建立或編輯庫存品項的權限。",
  inventory_item_invalid_input: "庫存品項資料格式不正確，請重新檢查品名、分類與數量後再儲存。",
  inventory_forbidden: "請聯絡店主或管理員，開啟你建立品項或調整庫存的權限。",
  inventory_invalid_input: "庫存異動資料格式不正確，請重新檢查品項、類型與數量後再送出。",
  inventory_insufficient_stock: "庫存不足，無法完成出庫，請先補貨或改成數量調整後再試。",
  inventory_movement_failed: "庫存異動失敗，請重新整理後再試。"
};

export function readInventoryParam(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

function formatInventoryUnits(value: number) {
  const text = Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, "");
  return `${text} 件`;
}

export function formatInventoryStock(quantity: number, lowStockThreshold: number) {
  const quantityText = formatInventoryUnits(quantity);
  const thresholdText = formatInventoryUnits(lowStockThreshold);
  return quantity <= lowStockThreshold
    ? `剩 ${quantityText} / 警戒 ${thresholdText}`
    : `${quantityText} / 警戒 ${thresholdText}`;
}

export function formatInventoryMovementQuantity(quantity: number) {
  const prefix = quantity > 0 ? "+" : "";
  return `${prefix}${formatInventoryUnits(quantity)}`;
}

export function getInventoryMessage(code: string | undefined) {
  if (!code) return undefined;
  return inventoryMessageText[code] ?? inventoryMessageText.inventory_movement_recorded;
}

export function getInventoryError(code: string | undefined) {
  if (!code) return undefined;
  return inventoryErrorText[code] ?? inventoryErrorText.inventory_movement_failed;
}
