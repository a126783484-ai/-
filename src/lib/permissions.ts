import type { Role } from "./types";

const permissions = {
  owner: ["*"] ,
  admin: ["dashboard", "appointments", "customers", "services", "checkout", "inventory", "staff", "reports", "settings"],
  technician: ["technician", "appointments:own", "customers:read", "services:read"],
  front_desk: ["dashboard", "appointments", "customers", "checkout", "services:read"],
  staff: ["technician", "appointments:own"]
} satisfies Record<Role, string[]>;

export function can(role: Role, action: string) {
  const grants = permissions[role];
  return grants.includes("*") || grants.includes(action);
}

export function roleLabel(role: Role) {
  return ({ owner: "店主", admin: "管理員", technician: "技師", front_desk: "櫃台", staff: "員工" } as const)[role];
}
