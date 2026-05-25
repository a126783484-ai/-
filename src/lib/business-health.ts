import type { AppData } from "./app-data-client";
import { orderPaymentState, orderTotal } from "./orders";
import { formatDate } from "./utils";

export type BusinessHealthStatus = "ready" | "watch" | "blocked";

export type BusinessHealthArea = {
  key: string;
  label: string;
  status: BusinessHealthStatus;
  summary: string;
  action: string;
};

export type BusinessHealthReport = {
  score: number;
  status: BusinessHealthStatus;
  title: string;
  summary: string;
  areas: BusinessHealthArea[];
  managerBrief: string[];
  operatingRules: string[];
};

function statusWeight(status: BusinessHealthStatus) {
  if (status === "ready") return 1;
  if (status === "watch") return 0.55;
  return 0;
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function hasBusinessHours(value: string) {
  const normalized = value.trim();
  if (!normalized || normalized === "{}" || normalized === "\"{}\"") return false;
  try {
    const parsed = JSON.parse(normalized);
    if (typeof parsed === "string") return parsed.trim().length > 2;
    if (parsed && typeof parsed === "object") return Object.keys(parsed).length > 0;
  } catch {
    return normalized.length > 2;
  }
  return false;
}

function hasInventoryMatch(data: AppData, keywords: string[]) {
  return data.inventory.some((item) => {
    const haystack = `${item.name} ${item.category} ${item.brand}`.toLowerCase();
    return keywords.some((keyword) => haystack.includes(keyword.toLowerCase()));
  });
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function nextDateKeys(days: number, now: Date) {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() + index);
    return dateKey(date);
  });
}

export function buildBusinessHealthReport(data: AppData, now = new Date()): BusinessHealthReport {
  const serviceProviders = data.staff.filter(
    (member) => member.active && ["owner", "admin", "technician"].includes(member.role),
  );
  const frontDesk = data.staff.filter(
    (member) => member.active && ["owner", "admin", "front_desk"].includes(member.role),
  );
  const activeServices = data.services.filter((service) => service.enabled);
  const badPriceServices = activeServices.filter((service) => service.price <= 0 || service.durationMin <= 0);
  const lowStock = data.inventory.filter((item) => item.quantity <= item.lowStockThreshold);
  const orderMismatch = data.orders.filter((order) => {
    const total = orderTotal(order);
    const expected = orderPaymentState(order);
    if (order.status === "refunded") return false;
    return expected !== order.status || order.paidAmount > total + 1;
  });
  const orderIdsWithMovements = new Set(data.inventoryMovements.map((movement) => movement.orderId).filter(Boolean));
  const paidOrdersWithoutStockTrace = data.orders.filter((order) => {
    if (orderPaymentState(order) !== "paid") return false;
    const shouldConsume = order.lines.some((line) => {
      const name = line.name.toLowerCase();
      return ["凝膠", "美甲", "卸甲", "保養", "美睫", "睫毛"].some((keyword) => name.includes(keyword));
    });
    return shouldConsume && !orderIdsWithMovements.has(order.id);
  });
  const next7 = nextDateKeys(7, now);
  const shiftsNext7 = data.shifts.filter((shift) => next7.includes(shift.date));
  const workShiftsNext7 = shiftsNext7.filter((shift) => !shift.leave);
  const leaveShiftsNext7 = shiftsNext7.filter((shift) => shift.leave);
  const uncoveredStaffDays = serviceProviders.reduce((count, member) => {
    return count + next7.filter((date) => !data.shifts.some((shift) => shift.staffId === member.id && shift.date === date)).length;
  }, 0);
  const hasNailServices = activeServices.some((service) => /凝膠|美甲|卸甲|延甲|手繪/.test(service.name + service.category));
  const hasLashServices = activeServices.some((service) => /美睫|睫毛/.test(service.name + service.category));
  const hasCareServices = activeServices.some((service) => /保養|護理|手足/.test(service.name + service.category));
  const inventoryCoverageMissing = [
    hasNailServices && (!hasInventoryMatch(data, ["凝膠", "底膠", "色膠"]) || !hasInventoryMatch(data, ["棉片", "耗材", "清潔"])),
    hasLashServices && !hasInventoryMatch(data, ["睫", "膠"]),
    hasCareServices && !hasInventoryMatch(data, ["護手", "保養", "乳液", "指緣"]),
  ].filter(Boolean).length;

  const areas: BusinessHealthArea[] = [
    {
      key: "schema",
      label: "資料庫結構",
      status: data.schemaHealth?.shiftLeaveTypeColumn === false ? "watch" : "ready",
      summary:
        data.schemaHealth?.shiftLeaveTypeColumn === false
          ? "正式 DB 缺 shifts.leave_type，系統正在用 legacy 時間編碼解讀休假"
          : "班表休假欄位已可用",
      action: "正式營業前執行 SUPABASE_DB_URL=... npm run db:apply-shift-leave-type，避免休假類型長期依賴相容模式。",
    },
    {
      key: "workspace",
      label: "店鋪主檔",
      status: data.workspace.name && data.workspace.phone && data.workspace.address && hasBusinessHours(data.workspace.businessHours) ? "ready" : "blocked",
      summary: `${data.workspace.name || "未命名"}｜電話 ${data.workspace.phone || "未填"}｜地址 ${data.workspace.address || "未填"}`,
      action: "店名、電話、地址、營業時間是所有收據、報表、預約提醒的共同來源。",
    },
    {
      key: "people",
      label: "人員與角色",
      status: serviceProviders.length >= 2 && frontDesk.length >= 1 ? "ready" : serviceProviders.length >= 1 ? "watch" : "blocked",
      summary: `可服務人員 ${serviceProviders.length} 位，櫃台/管理 ${frontDesk.length} 位`,
      action: "至少要有可服務人員與櫃台/管理角色，班表、抽成與權限才完整。",
    },
    {
      key: "services",
      label: "服務與價格",
      status: activeServices.length >= 5 && badPriceServices.length === 0 ? "ready" : activeServices.length ? "watch" : "blocked",
      summary: `啟用服務 ${activeServices.length} 項，價格/時長異常 ${badPriceServices.length} 項`,
      action: "服務名稱、價格、時長是預約時長、結帳金額、抽成計算的底層規則。",
    },
    {
      key: "customers",
      label: "客戶來源",
      status: data.customers.length >= 5 ? "ready" : data.customers.length ? "watch" : "blocked",
      summary: `客戶 ${data.customers.length} 位，已留回訪 ${data.customers.filter((customer) => customer.nextReminder).length} 位`,
      action: "客戶電話、偏好、禁忌、回訪日要能支撐接待與售後提醒。",
    },
    {
      key: "inventory",
      label: "庫存與耗材",
      status: data.inventory.length >= 5 && inventoryCoverageMissing === 0 ? (lowStock.length ? "watch" : "ready") : data.inventory.length ? "watch" : "blocked",
      summary: `庫存 ${data.inventory.length} 項，低庫存 ${lowStock.length} 項，服務耗材缺口 ${inventoryCoverageMissing} 類`,
      action: "結帳扣庫存只能依可靠耗材來源執行；缺耗材來源時要先補資料。",
    },
    {
      key: "schedule",
      label: "班表與休假",
      status: workShiftsNext7.length >= serviceProviders.length * 5 && uncoveredStaffDays === 0 ? "ready" : workShiftsNext7.length ? "watch" : "blocked",
      summary: `未來 7 天工作班 ${workShiftsNext7.length} 筆、休假 ${leaveShiftsNext7.length} 筆、未覆蓋 ${uncoveredStaffDays} 格`,
      action: `先看 ${formatDate(next7[0])} 起 7 天，確保人力覆蓋預約與休假。`,
    },
    {
      key: "orders",
      label: "收款與扣庫存",
      status: orderMismatch.length === 0 && paidOrdersWithoutStockTrace.length === 0 ? "ready" : "watch",
      summary: `訂單 ${data.orders.length} 筆，金額狀態異常 ${orderMismatch.length} 筆，已結清未見扣庫存 ${paidOrdersWithoutStockTrace.length} 筆`,
      action: "訂單總額、實收、狀態、庫存異動必須互相對得上，報表才可信。",
    },
  ];

  const score = Math.round((areas.reduce((sum, area) => sum + statusWeight(area.status), 0) / areas.length) * 100);
  const blocked = areas.filter((area) => area.status === "blocked");
  const watch = areas.filter((area) => area.status === "watch");
  const status: BusinessHealthStatus = blocked.length ? "blocked" : watch.length ? "watch" : "ready";
  const title =
    status === "ready"
      ? "可進入穩定營業"
      : status === "watch"
        ? "可營業，但要盯風險"
        : "來源不足，先補營業底座";
  const summary = blocked.length
    ? `先處理 ${blocked.map((area) => area.label).join("、")}，再擴大自動化。`
    : watch.length
      ? `目前主要風險在 ${watch.map((area) => area.label).join("、")}。`
      : "主檔、交易、庫存、班表已形成閉環。";

  const managerBrief = [
    `健康度 ${score}%｜${title}`,
    summary,
    areas
      .filter((area) => area.status !== "ready")
      .slice(0, 3)
      .map((area) => `${area.label}：${area.summary}，下一步 ${area.action}`)
      .join("；") || "今天沒有阻塞項，下一步可以優化會員經營與排班效率。",
  ];

  const operatingRules = [
    "價格、折扣、小費、實收、訂單狀態只以訂單明細計算，不能人工猜。",
    "會耗材的服務結帳後必須留下 inventory_movements，否則報表不可視為完整。",
    "班表列印與匯出以 shifts 為唯一來源；休假要和工作班分色。",
    "資料庫 migration 狀態要顯示在營業稽核；不能讓 fallback 隱藏正式環境缺口。",
    "AI 只能做排班建議、異常摘要、補資料提醒，不直接改金額與庫存。",
  ];

  return {
    score,
    status,
    title,
    summary,
    areas,
    managerBrief,
    operatingRules,
  };
}
