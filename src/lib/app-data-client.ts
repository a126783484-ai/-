import {
  appointmentHandoffSummary,
  dateKey,
  daysSince,
  isUnfinishedAppointment,
  reminderDisplay,
} from "./appointments";
import {
  orderCloseoutSummary,
  orderAgeInDays,
  orderHandoffSummary,
  orderPaymentMethodBreakdown,
  orderStatusTone,
} from "./orders";
import { currency, formatDate, formatTime } from "./utils";
export { dateKey } from "./appointments";

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

export type CloseoutAttentionItem = {
  kind: "appointment" | "order" | "reminder" | "inventory";
  title: string;
  detail: string;
  tone: "rose" | "sage" | "amber" | "plum";
  href: string;
  handoffFor: string;
};

export interface DailyCloseoutSummary {
  todayKey: string;
  tomorrowKey: string;
  unfinishedAppointments: Appointment[];
  unpaidOrders: Array<{
    order: Order;
    outstanding: number;
    ageDays: number;
    paymentState: ReturnType<typeof orderCloseoutSummary>["paymentState"];
  }>;
  refundedOrders: Array<{
    order: Order;
    ageDays: number;
  }>;
  paymentMethodBreakdown: ReturnType<typeof orderPaymentMethodBreakdown>;
  lowStockItems: InventoryItem[];
  tomorrowAppointments: Appointment[];
  tomorrowShifts: Shift[];
  handoffItems: CloseoutAttentionItem[];
  auditLines: string[];
  totalOutstanding: number;
}

export function buildDailyCloseoutSummary(
  data: Pick<AppData, "appointments" | "orders" | "inventory" | "shifts" | "customers" | "staff">,
  now = new Date(),
): DailyCloseoutSummary {
  const todayKey = dateKey(now);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = dateKey(tomorrow);

  const unfinishedAppointments = data.appointments
    .filter((appointment) => dateKey(appointment.startAt) === todayKey && isUnfinishedAppointment(appointment))
    .sort((left, right) => left.startAt.localeCompare(right.startAt));

  const unpaidOrders = data.orders
    .map((order) => ({
      order,
      ...orderCloseoutSummary(order, now),
    }))
    .filter((order) => order.outstanding > 0)
    .sort(
      (left, right) =>
        right.outstanding - left.outstanding ||
        right.ageDays - left.ageDays ||
        new Date(left.order.createdAt).getTime() - new Date(right.order.createdAt).getTime(),
    );

  const refundedOrders = [...data.orders]
    .filter((order) => order.status === "refunded")
    .map((order) => ({
      order,
      ageDays: orderAgeInDays({ createdAt: order.createdAt }, now),
    }))
    .sort(
      (left, right) =>
        new Date(right.order.createdAt).getTime() - new Date(left.order.createdAt).getTime() ||
        right.ageDays - left.ageDays ||
        left.order.id.localeCompare(right.order.id),
    );

  const paymentMethodBreakdown = orderPaymentMethodBreakdown(data.orders);

  const lowStockItems = [...data.inventory]
    .filter((item) => item.quantity <= item.lowStockThreshold)
    .sort((left, right) => {
      const leftUrgent = left.quantity <= 1;
      const rightUrgent = right.quantity <= 1;
      if (leftUrgent !== rightUrgent) {
        return leftUrgent ? -1 : 1;
      }

      const leftGap = Math.max(left.lowStockThreshold - left.quantity, 0);
      const rightGap = Math.max(right.lowStockThreshold - right.quantity, 0);
      if (leftGap !== rightGap) {
        return rightGap - leftGap;
      }

      return left.quantity - right.quantity || left.name.localeCompare(right.name);
    });
  const urgentLowStockCount = lowStockItems.filter((item) => item.quantity <= 1).length;

  const followUpCustomers = data.customers
    .map((customer) => {
      const reminder = reminderDisplay(customer.nextReminder, now);
      const reminderDays = customer.nextReminder ? daysSince(customer.nextReminder, now) : null;

      if (reminder?.due) {
        return {
          customer,
          tone: reminder.tone,
          label: reminder.label,
          detail: `提醒日 ${formatDate(customer.nextReminder!)}`,
          sortKey: customer.nextReminder ?? "",
          ageDays: reminderDays ?? 0,
        };
      }

      const visitDaysRaw = customer.lastVisit ? daysSince(customer.lastVisit, now) : null;
      if (visitDaysRaw === null) {
        return null;
      }

      const visitDays = Math.max(0, visitDaysRaw);
      if (visitDays < 60) {
        return null;
      }

      return {
        customer,
        tone: visitDays >= 90 ? ("rose" as const) : ("amber" as const),
        label: `${formatDate(customer.lastVisit!)}（最後到店）`,
        detail: visitDays === 0 ? "今天有回訪紀錄" : `距上次到店 ${visitDays} 天`,
        sortKey: customer.lastVisit ?? "",
        ageDays: visitDays,
      };
    })
    .filter((item): item is {
      customer: Customer;
      tone: "rose" | "amber" | "sage";
      label: string;
      detail: string;
      sortKey: string;
      ageDays: number;
    } => item !== null)
    .sort(
      (left, right) =>
        (left.customer.nextReminder ?? left.sortKey).localeCompare(right.customer.nextReminder ?? right.sortKey) ||
        right.ageDays - left.ageDays ||
        left.customer.name.localeCompare(right.customer.name),
    )
    .slice(0, 3);

  const handoffItems: CloseoutAttentionItem[] = [
    ...unfinishedAppointments.slice(0, 2).map((appointment) => {
      const customer = data.customers.find((item) => item.id === appointment.customerId);
      const technician = data.staff.find((item) => item.id === appointment.technicianId);

      return {
        kind: "appointment" as const,
        title: `${formatTime(appointment.startAt)} · ${customer?.name ?? "未命名客戶"}`,
        detail: appointmentHandoffSummary(appointment, customer?.name, technician?.name, now),
        handoffFor: "櫃台 / 下一班技師",
        tone:
          appointment.status === "in_service"
            ? ("plum" as const)
            : appointment.status === "confirmed"
              ? ("amber" as const)
              : ("rose" as const),
        href: "/appointments",
      };
    }),
    ...unpaidOrders.slice(0, 2).map(({ order, outstanding, paymentState }) => {
      const customer = data.customers.find((item) => item.id === order.customerId);
      const technician = data.staff.find((item) => item.id === order.technicianId);

      return {
        kind: "order" as const,
        title: `${customer?.name ?? "未命名客戶"} · ${currency.format(outstanding)} 待收`,
        detail: orderHandoffSummary(order, customer?.name, technician?.name, now),
        handoffFor: "櫃台 / 店長",
        tone: orderStatusTone(paymentState),
        href: "/checkout",
      };
    }),
    ...followUpCustomers.slice(0, 2).map(({ customer, tone, label, detail }) => ({
      kind: "reminder" as const,
      title: customer.name,
      detail: `${label} · ${detail}${customer.phone ? ` · ${customer.phone}` : ""}`,
      handoffFor: "櫃台 / 前台",
      tone,
      href: "/customers",
    })),
    ...lowStockItems.slice(0, 2).map((item) => ({
      kind: "inventory" as const,
      title: item.name,
      detail: `剩 ${item.quantity}/${item.lowStockThreshold}${item.quantity <= 1 ? "，需要立即補貨" : "，請安排補貨"}`,
      handoffFor: "店長 / 管理員",
      tone: "amber" as const,
      href: "/inventory",
    })),
  ];

  const tomorrowAppointments = data.appointments
    .filter(
      (appointment) =>
        dateKey(appointment.startAt) === tomorrowKey &&
        isUnfinishedAppointment(appointment),
    )
    .sort((left, right) => left.startAt.localeCompare(right.startAt));

  const tomorrowShifts = [...data.shifts]
    .filter((shift) => shift.date === tomorrowKey)
    .sort((left, right) => left.startTime.localeCompare(right.startTime));

  const auditLines = [
    `今天優先處理：未完成預約 ${unfinishedAppointments.length} 筆、待收訂單 ${unpaidOrders.length} 筆（${currency.format(
      unpaidOrders.reduce((sum, item) => sum + item.outstanding, 0),
    )}）、已退款 ${refundedOrders.length} 筆、低庫存 ${lowStockItems.length} 項${urgentLowStockCount ? `（${urgentLowStockCount} 項只剩 1 件或以下）` : ""}`,
    paymentMethodBreakdown.length
      ? `付款方式：${paymentMethodBreakdown
          .map((item) => `${item.label} ${item.count} 筆`)
          .join("、")}`
      : "付款方式：目前沒有訂單",
    `可以排後面：回訪提醒 ${followUpCustomers.length} 位、明日預約 ${tomorrowAppointments.length} 筆、明日班表 ${tomorrowShifts.length} 筆`,
    handoffItems.length
      ? `交接給下一班：${handoffItems
          .slice(0, 4)
          .map((item) => `${item.handoffFor}｜${item.title}｜${item.detail}`)
          .join("；")}`
      : "交接給下一班：目前沒有待交接項目",
  ];

  return {
    todayKey,
    tomorrowKey,
    unfinishedAppointments,
    unpaidOrders,
    refundedOrders,
    paymentMethodBreakdown,
    lowStockItems,
    tomorrowAppointments,
    tomorrowShifts,
    handoffItems,
    auditLines,
    totalOutstanding: unpaidOrders.reduce((sum, item) => sum + item.outstanding, 0),
  };
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
    data.staff.length === 0
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
    title: data.needsWorkspace ? "先完成店鋪初始化" : "這個工作區還有幾個核心設定缺口",
    action:
      missingAreas.length === 1
        ? `先補 ${missingAreas[0]}，完成後其他頁面就會開始有可操作內容。`
        : `先補 ${missingAreas.slice(0, 2).join("、")}，其他項目可以後補；完成這些核心設定後，預約、收款與報表才會開始可靠。`,
    links,
  };
}
