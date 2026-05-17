import type { Appointment, Customer, InventoryItem, Order, ServiceItem, Shift, StaffMember, Workspace } from "./types";

// Shared fixtures for unit tests.

export const workspace: Workspace = {
  id: "ws_test_luxe",
  name: "Lumière Nail & Beauty",
  phone: "02-2722-1688",
  address: "台北市信義區香檳路 18 號 2F",
  brandColor: "#C87486",
  businessHours: "週一至週六 11:00–21:00，週日預約制"
};

export const staff: StaffMember[] = [
  { id: "st_owner", workspaceId: workspace.id, name: "Mia 林", role: "owner", phone: "0911-111-111", active: true, commissionRate: 0.12, specialties: ["凝膠美甲", "品牌營運"] },
  { id: "st_ava", workspaceId: workspace.id, name: "Ava", role: "technician", phone: "0922-222-222", active: true, commissionRate: 0.28, specialties: ["日式凝膠", "手繪設計"] },
  { id: "st_nina", workspaceId: workspace.id, name: "Nina", role: "technician", phone: "0933-333-333", active: true, commissionRate: 0.25, specialties: ["美睫", "眉型設計"] },
  { id: "st_lulu", workspaceId: workspace.id, name: "Lulu", role: "front_desk", phone: "0944-444-444", active: true, commissionRate: 0.05, specialties: ["顧客接待", "結帳"] }
];

export const services: ServiceItem[] = [
  { id: "svc_gel", workspaceId: workspace.id, category: "美甲", name: "單色凝膠美甲", price: 1680, durationMin: 90, description: "含基礎修型、甘皮保養與凝膠上色。", enabled: true, addOn: false },
  { id: "svc_art", workspaceId: workspace.id, category: "美甲", name: "精緻手繪設計", price: 2600, durationMin: 150, description: "客製化手繪、暈染、貼鑽設計。", enabled: true, addOn: false },
  { id: "svc_lash", workspaceId: workspace.id, category: "美睫", name: "日式自然美睫 120 根", price: 1980, durationMin: 120, description: "自然放大眼型，含睫毛清潔。", enabled: true, addOn: false },
  { id: "svc_brow", workspaceId: workspace.id, category: "霧眉", name: "韓式柔霧眉", price: 6800, durationMin: 180, description: "含眉型設計與術後照護說明。", enabled: true, addOn: false },
  { id: "svc_spa", workspaceId: workspace.id, category: "SPA", name: "手足深層保養", price: 1280, durationMin: 60, description: "去角質、熱敷、按摩與保濕。", enabled: true, addOn: false },
  { id: "addon_remove", workspaceId: workspace.id, category: "加購", name: "卸甲加購", price: 400, durationMin: 30, description: "他店凝膠卸除與甲面整理。", enabled: true, addOn: true },
  { id: "addon_extend", workspaceId: workspace.id, category: "加購", name: "延甲加購", price: 900, durationMin: 45, description: "十指建構延長。", enabled: true, addOn: true }
];

export const customers: Customer[] = [
  { id: "cus_ivy", workspaceId: workspace.id, name: "陳怡君", phone: "0912-345-678", birthday: "1992-08-12", lineId: "ivychen", note: "偏好裸粉與短方圓。", preferences: ["裸粉", "短甲"], cautions: ["對酒精氣味敏感"], tier: "VIP", tags: ["高價值客戶"], lastVisit: "2026-05-02", nextReminder: "2026-06-02" },
  { id: "cus_yu", workspaceId: workspace.id, name: "王語柔", phone: "0988-222-321", birthday: "1996-11-20", lineId: "yuru.w", note: "第一次到店，從 IG 預約。", preferences: ["自然款美睫"], cautions: [], tier: "新客", tags: ["新客"], nextReminder: "2026-05-29" },
  { id: "cus_may", workspaceId: workspace.id, name: "李美安", phone: "0977-888-777", birthday: "1988-03-05", lineId: "maylee", note: "術後需加強保濕提醒。", preferences: ["霧眉自然色"], cautions: ["蟹足腫體質需評估"], tier: "VVIP", tags: ["高價值客戶"], lastVisit: "2026-04-22" }
];

export const appointments: Appointment[] = [
  { id: "apt_1001", workspaceId: workspace.id, customerId: "cus_ivy", serviceIds: ["svc_art", "addon_remove"], technicianId: "st_ava", startAt: "2026-05-15T11:00:00+08:00", endAt: "2026-05-15T14:00:00+08:00", status: "confirmed", source: "LINE", note: "客人想做婚禮香檳金款式。" },
  { id: "apt_1002", workspaceId: workspace.id, customerId: "cus_yu", serviceIds: ["svc_lash"], technicianId: "st_nina", startAt: "2026-05-15T15:00:00+08:00", endAt: "2026-05-15T17:00:00+08:00", status: "pending", source: "Instagram", note: "需傳術前注意事項。" },
  { id: "apt_1003", workspaceId: workspace.id, customerId: "cus_may", serviceIds: ["svc_brow"], technicianId: "st_nina", startAt: "2026-05-16T12:00:00+08:00", endAt: "2026-05-16T15:00:00+08:00", status: "completed", source: "電話" },
  { id: "apt_1004", workspaceId: workspace.id, customerId: "cus_ivy", serviceIds: ["svc_spa"], technicianId: "st_ava", startAt: "2026-05-10T18:00:00+08:00", endAt: "2026-05-10T19:00:00+08:00", status: "no_show", source: "官網" }
];

export const orders: Order[] = [
  { id: "ord_9001", workspaceId: workspace.id, appointmentId: "apt_1003", customerId: "cus_may", technicianId: "st_nina", lines: [{ serviceId: "svc_brow", name: "韓式柔霧眉", quantity: 1, unitPrice: 6800 }], discount: 300, tip: 0, paidAmount: 6500, paymentMethod: "card", status: "paid", createdAt: "2026-05-15T16:20:00+08:00" },
  { id: "ord_9002", workspaceId: workspace.id, appointmentId: "apt_1001", customerId: "cus_ivy", technicianId: "st_ava", lines: [{ serviceId: "svc_art", name: "精緻手繪設計", quantity: 1, unitPrice: 2600 }, { serviceId: "addon_remove", name: "卸甲加購", quantity: 1, unitPrice: 400 }], discount: 0, tip: 200, paidAmount: 1600, paymentMethod: "line_pay", status: "partial", createdAt: "2026-05-15T14:10:00+08:00" }
];

export const inventory: InventoryItem[] = [
  { id: "inv_gel_rose", workspaceId: workspace.id, brand: "Leafgel", category: "美甲膠", name: "裸玫瑰凝膠 #R12", cost: 520, retailPrice: 780, quantity: 8, lowStockThreshold: 3 },
  { id: "inv_lash_c", workspaceId: workspace.id, brand: "LashPro", category: "睫毛材料", name: "C 翹 0.07 10mm", cost: 260, retailPrice: 420, quantity: 2, lowStockThreshold: 5 },
  { id: "inv_oil", workspaceId: workspace.id, brand: "SpaRitual", category: "保養品", name: "指緣油 15ml", cost: 180, retailPrice: 480, quantity: 16, lowStockThreshold: 4 }
];

export const shifts: Shift[] = [
  { id: "shift_ava", workspaceId: workspace.id, staffId: "st_ava", date: "2026-05-15", startTime: "11:00", endTime: "20:00", leave: false },
  { id: "shift_nina", workspaceId: workspace.id, staffId: "st_nina", date: "2026-05-15", startTime: "13:00", endTime: "21:00", leave: false },
  { id: "shift_lulu", workspaceId: workspace.id, staffId: "st_lulu", date: "2026-05-15", startTime: "10:30", endTime: "19:30", leave: false }
];
