import type { Role } from "./types";

const permissions = {
  owner: ["*"],
  admin: ["dashboard", "appointments", "customers", "services", "checkout", "inventory", "staff", "reports", "settings"],
  technician: ["technician", "appointments:own", "customers:read", "services:read"],
  front_desk: ["dashboard", "appointments", "customers", "checkout", "services:read"],
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
    return `你目前只能查看${label}，但只有${moduleManagers[module]}可以新增、編輯或刪除。`;
  }
  return `你的角色目前無法存取${label}；這個區塊仍會顯示為參考資料，但編輯控制會隱藏。`;
}
