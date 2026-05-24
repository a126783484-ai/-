import type { Role } from "./types";

const permissions = {
  owner: ["*"],
  admin: ["dashboard", "appointments", "customers", "services", "checkout", "inventory", "staff", "reports", "settings"],
  technician: ["technician", "appointments:own", "customers:read", "services:read", "staff"],
  front_desk: ["dashboard", "appointments", "customers", "checkout", "services:read", "staff"],
  staff: ["technician", "appointments:own"]
} satisfies Record<Role, string[]>;

export function can(role: Role, action: string) {
  const grants = permissions[role];
  return grants.includes("*") || grants.some((grant) => grant === action || grant.startsWith(`${action}:`));
}

export function canManage(role: Role, action: string) {
  const grants = permissions[role];
  return grants.includes("*") || grants.includes(action);
}

export function roleLabel(role: Role) {
  return ({ owner: "店主", admin: "管理員", technician: "技師", front_desk: "櫃台", staff: "員工" } as const)[role];
}

const moduleLabels = {
  appointments: "預約",
  checkout: "訂單 / 結帳",
  customers: "客戶",
  inventory: "庫存",
  services: "服務",
  staff: "員工",
} as const;

type ModuleKey = keyof typeof moduleLabels;

const moduleManagers = {
  appointments: "店主、管理員與櫃台",
  checkout: "店主、管理員與櫃台",
  customers: "店主、管理員與櫃台",
  inventory: "店主與管理員",
  services: "店主與管理員",
  staff: "店主與管理員",
} as const satisfies Record<ModuleKey, string>;

const moduleViewCopy = {
  appointments: "你目前只能查看預約與流程狀態，但新增、編輯與更新狀態會隱藏。",
  checkout: "你目前只能查看訂單摘要，但開單、改單、收款與新增明細會隱藏。",
  customers: "你目前只能查看客戶資料，但新增、編輯與刪除會隱藏。",
  inventory: "你目前只能查看庫存與異動紀錄，但新增品項與記錄異動會隱藏。",
  services: "你目前只能查看服務清單與價格，但新增、編輯與停用會隱藏。",
  staff: "你目前只能查看員工資料、班表圖表與列印摘要，但新增員工、調整角色與排班會隱藏。",
} as const satisfies Record<ModuleKey, string>;

const moduleNoneCopy = {
  appointments: "這個區塊仍保留資料摘要，但新增、編輯與更新狀態控制會隱藏。",
  checkout: "這個區塊仍保留訂單摘要，但開單、改單、收款與新增明細控制會隱藏。",
  customers: "這個區塊仍保留客戶摘要，但新增、編輯與刪除控制會隱藏。",
  inventory: "這個區塊仍保留庫存摘要，但新增品項與記錄異動控制會隱藏。",
  services: "這個區塊仍保留服務摘要，但新增、編輯與停用控制會隱藏。",
  staff: "這個區塊仍保留員工摘要與班表圖表，但新增員工、調整角色與排班控制會隱藏。",
} as const satisfies Record<ModuleKey, string>;

export function permissionScope(role: Role, module: ModuleKey) {
  if (canManage(role, module)) return "manage" as const;
  if (can(role, module)) return "view" as const;
  return "none" as const;
}

export function moduleAccessMessage(role: Role, module: ModuleKey) {
  const scope = permissionScope(role, module);
  const label = moduleLabels[module];

  if (scope === "manage") return "";
  if (scope === "view") {
    return `${moduleViewCopy[module]} 只有${moduleManagers[module]}可以管理${label}。`;
  }
  return `你的角色目前無法存取${label}；${moduleNoneCopy[module]} 只有${moduleManagers[module]}可以管理${label}。`;
}
