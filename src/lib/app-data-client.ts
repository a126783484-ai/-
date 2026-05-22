import type {
  Appointment,
  Customer,
  InventoryItem,
  InventoryMovement,
  Order,
  ServiceCategory,
  ServiceItem,
  Shift,
  StaffInvite,
  StaffMember,
  Workspace,
} from "./types";
import { seedWorkspaceSetupSteps } from "./seed";

export interface AppData {
  user: { id: string; email: string | null };
  workspace: Workspace;
  currentMember: StaffMember | null;
  staff: StaffMember[];
  categories: ServiceCategory[];
  staffInvites: StaffInvite[];
  staffInviteFeatureEnabled: boolean;
  services: ServiceItem[];
  customers: Customer[];
  appointments: Appointment[];
  orders: Order[];
  inventory: InventoryItem[];
  inventoryMovements: InventoryMovement[];
  shifts: Shift[];
  needsWorkspace: boolean;
  demoMode: boolean;
}

export interface WorkspaceSetupGuide {
  title: string;
  action: string;
  links: Array<{ href: string; label: string }>;
}

export function isWorkspaceEmpty(data: Pick<AppData, "staff" | "categories" | "services" | "customers" | "appointments" | "orders" | "inventory" | "inventoryMovements" | "shifts">) {
  return (
    data.staff.length === 0 &&
    data.categories.length === 0 &&
    data.services.length === 0 &&
    data.customers.length === 0 &&
    data.appointments.length === 0 &&
    data.orders.length === 0 &&
    data.inventory.length === 0 &&
    data.inventoryMovements.length === 0 &&
    data.shifts.length === 0
  );
}

function isWorkspaceSetupIncomplete(
  data: Pick<
    AppData,
    | "needsWorkspace"
    | "workspace"
    | "categories"
    | "services"
    | "staff"
    | "customers"
    | "appointments"
    | "orders"
    | "inventory"
    | "shifts"
  >,
) {
  return (
    data.needsWorkspace ||
    data.workspace.name.trim() === "" ||
    data.workspace.name === "尚未建立 workspace" ||
    data.workspace.phone.trim() === "" ||
    data.workspace.address.trim() === "" ||
    data.workspace.businessHours.trim() === "{}" ||
    data.categories.length === 0 ||
    data.services.length === 0 ||
    data.staff.length === 0 ||
    data.customers.length === 0 ||
    data.appointments.length === 0 ||
    data.orders.length === 0 ||
    data.inventory.length === 0 ||
    (data.staff.length > 0 && data.shifts.length === 0)
  );
}

export function getWorkspaceSetupGuide(
  data: Pick<
    AppData,
    | "needsWorkspace"
    | "workspace"
    | "categories"
    | "services"
    | "staff"
    | "customers"
    | "appointments"
    | "orders"
    | "inventory"
    | "shifts"
  >,
): WorkspaceSetupGuide | null {
  if (!isWorkspaceSetupIncomplete(data)) {
    return null;
  }

  const links = seedWorkspaceSetupSteps
    .filter((step) => step.matches(data))
    .reduce<Array<{ href: string; label: string }>>((items, step) => {
      const href = typeof step.href === "function" ? step.href(data) : step.href;
      if (!items.some((item) => item.href === href)) {
        items.push({ href, label: step.label });
      }
      return items;
    }, [])
    .slice(0, 3);

  const missingAreas = seedWorkspaceSetupSteps
    .filter((step) => step.matches(data))
    .map((step) => step.area);

  return {
    title: data.needsWorkspace
      ? "尚未完成 workspace 初始化"
      : "這個工作區還有幾個核心資料缺口",
    action:
      missingAreas.length === 1
        ? `先補 ${missingAreas[0]}，後續頁面就會更完整。`
        : `目前還缺 ${missingAreas.slice(0, 3).join("、")}${missingAreas.length > 3 ? " 等" : ""}。先從前幾步開始，其他模組就會慢慢有內容。`,
    links,
  };
}
