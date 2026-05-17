export const inventoryMessageText: Record<string, string> = {
  inventory_movement_recorded: "庫存異動已記錄。"
};

export const inventoryErrorText: Record<string, string> = {
  inventory_config_missing: "系統登入設定尚未完成，無法處理庫存異動。",
  inventory_forbidden: "你沒有權限調整庫存。",
  inventory_invalid_input: "庫存異動資料格式不正確，請檢查品項、類型與數量。",
  inventory_insufficient_stock: "庫存不足，無法完成出庫。",
  inventory_movement_failed: "庫存異動失敗，請稍後再試。"
};

export function readInventoryParam(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export function getInventoryMessage(code: string | undefined) {
  if (!code) return undefined;
  return inventoryMessageText[code] ?? inventoryMessageText.inventory_movement_recorded;
}

export function getInventoryError(code: string | undefined) {
  if (!code) return undefined;
  return inventoryErrorText[code] ?? inventoryErrorText.inventory_movement_failed;
}
