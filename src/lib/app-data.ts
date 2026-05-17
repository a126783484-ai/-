import { redirect } from "next/navigation";
import type { Database } from "@/lib/database.types";
import type {
  Appointment,
  Customer,
  InventoryItem,
  InventoryMovement,
  Order,
  Role,
  ServiceCategory,
  ServiceItem,
  Shift,
  StaffInvite,
  StaffMember,
  Workspace,
} from "@/lib/types";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseConfig } from "@/lib/supabase";
import {
  isMissingStaffInviteTableError,
  loadPendingStaffInvitesForEmail,
  toStaffInvite,
} from "@/lib/staff-invites";
import { ensureOwnerWorkspaceForUser } from "@/lib/workspace";

type WorkspaceRow = Database["public"]["Tables"]["workspaces"]["Row"];
type WorkspaceMemberRow =
  Database["public"]["Tables"]["workspace_members"]["Row"];
type ServiceCategoryRow =
  Database["public"]["Tables"]["service_categories"]["Row"];
type ServiceRow = Database["public"]["Tables"]["services"]["Row"];
type CustomerRow = Database["public"]["Tables"]["customers"]["Row"];
type AppointmentRow = Database["public"]["Tables"]["appointments"]["Row"];
type AppointmentServiceRow =
  Database["public"]["Tables"]["appointment_services"]["Row"];
type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
type OrderLineRow = Database["public"]["Tables"]["order_lines"]["Row"];
type InventoryRow = Database["public"]["Tables"]["inventory_items"]["Row"];
type InventoryMovementRow =
  Database["public"]["Tables"]["inventory_movements"]["Row"];
type ShiftRow = Database["public"]["Tables"]["shifts"]["Row"];

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
}

function emptyWorkspace(): Workspace {
  return {
    id: "",
    name: "尚未建立 workspace",
    phone: "",
    address: "",
    brandColor: "#C87486",
    businessHours: "{}",
  };
}

function emptyAppData(user: { id: string; email: string | null }): AppData {
  return {
    user,
    workspace: emptyWorkspace(),
    currentMember: null,
    staff: [],
    categories: [],
    staffInvites: [],
    staffInviteFeatureEnabled: false,
    services: [],
    customers: [],
    appointments: [],
    orders: [],
    inventory: [],
    inventoryMovements: [],
    shifts: [],
    needsWorkspace: true,
  };
}

function toWorkspace(row: WorkspaceRow): Workspace {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone ?? "",
    address: row.address ?? "",
    brandColor: row.brand_color ?? "#C87486",
    businessHours: JSON.stringify(row.business_hours ?? {}),
  };
}

function toStaff(row: WorkspaceMemberRow): StaffMember {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.display_name,
    role: row.role as Role,
    phone: row.phone ?? "",
    active: row.active,
    commissionRate: Number(row.commission_rate),
    specialties: row.specialties ?? [],
  };
}

function toCustomer(row: CustomerRow): Customer {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    phone: row.phone,
    birthday: row.birthday ?? undefined,
    lineId: row.line_id ?? undefined,
    note: row.note ?? undefined,
    preferences: row.preferences ?? [],
    cautions: row.cautions ?? [],
    tier: row.tier as Customer["tier"],
    tags: row.tags ?? [],
    lastVisit: row.last_visit ?? undefined,
    nextReminder: row.next_reminder ?? undefined,
  };
}

function toCategory(row: ServiceCategoryRow): ServiceCategory {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    sortOrder: row.sort_order,
  };
}

function toService(
  row: ServiceRow,
  categories: ServiceCategoryRow[],
): ServiceItem {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    categoryId: row.category_id ?? undefined,
    category:
      categories.find((category) => category.id === row.category_id)?.name ??
      "未分類",
    name: row.name,
    price: row.price,
    durationMin: row.duration_min,
    description: row.description ?? "",
    enabled: row.enabled,
    addOn: row.is_add_on,
  };
}

function toAppointment(
  row: AppointmentRow,
  appointmentServices: AppointmentServiceRow[],
): Appointment {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    customerId: row.customer_id,
    serviceIds: appointmentServices
      .filter((item) => item.appointment_id === row.id)
      .map((item) => item.service_id),
    technicianId: row.technician_id,
    startAt: row.start_at,
    endAt: row.end_at,
    status: row.status,
    source: row.source as Appointment["source"],
    note: row.note ?? undefined,
  };
}

function toOrder(row: OrderRow, lines: OrderLineRow[]): Order {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    appointmentId: row.appointment_id ?? undefined,
    customerId: row.customer_id,
    technicianId: row.technician_id,
    lines: lines
      .filter((line) => line.order_id === row.id)
      .map((line) => ({
        id: line.id,
        serviceId: line.service_id ?? "",
        name: line.name,
        quantity: line.quantity,
        unitPrice: line.unit_price,
      })),
    discount: row.discount,
    tip: row.tip,
    paidAmount: row.paid_amount,
    paymentMethod: row.payment_method,
    status: row.status,
    createdAt: row.created_at,
  };
}

function toInventory(row: InventoryRow): InventoryItem {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    brand: row.brand ?? "",
    category: row.category,
    name: row.name,
    cost: Number(row.cost),
    retailPrice: Number(row.retail_price),
    quantity: Number(row.quantity),
    lowStockThreshold: Number(row.low_stock_threshold),
  };
}

function toInventoryMovement(row: InventoryMovementRow): InventoryMovement {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    itemId: row.item_id,
    orderId: row.order_id ?? undefined,
    movementType: row.movement_type,
    quantity: Number(row.quantity),
    note: row.note ?? undefined,
    createdAt: row.created_at,
  };
}

function toShift(row: ShiftRow): Shift {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    staffId: row.staff_id,
    date: row.shift_date,
    startTime: row.start_time,
    endTime: row.end_time,
    leave: row.leave,
  };
}

async function getUser() {
  const config = getSupabaseConfig();

  if (!config.url || !config.anonKey) {
    redirect("/login?error=auth_config_missing");
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    redirect("/login");
  }

  return { supabase, user: data.user };
}

export async function loadAppData(): Promise<AppData> {
  const { supabase, user } = await getUser();
  const userSummary = { id: user.id, email: user.email ?? null };

  const { data: memberships, error: membershipError } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .eq("active", true)
    .order("created_at", { ascending: true });

  if (membershipError) {
    console.error("workspace membership query failed", membershipError);
    return emptyAppData(userSummary);
  }

  let currentWorkspaceId = memberships?.[0]?.workspace_id ?? null;

  if (!currentWorkspaceId) {
    let pendingInvites: StaffInvite[] = [];

    try {
      pendingInvites = await loadPendingStaffInvitesForEmail(supabase, user.email ?? "");
    } catch (inviteError) {
      if (!isMissingStaffInviteTableError(inviteError as { code?: string; message?: string } | null | undefined)) {
        console.error("pending invite lookup failed", inviteError);
      }
    }

    if (pendingInvites.length > 0) {
      return {
        ...emptyAppData(userSummary),
        staffInvites: pendingInvites,
        staffInviteFeatureEnabled: true,
      };
    }

    try {
      await ensureOwnerWorkspaceForUser(user, supabase);
    } catch (error) {
      console.error("workspace bootstrap failed", error);
      return emptyAppData(userSummary);
    }

    const { data: refreshedMemberships, error: refreshedMembershipError } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", user.id)
      .eq("active", true)
      .order("created_at", { ascending: true });

    if (refreshedMembershipError) {
      console.error("workspace membership query failed", refreshedMembershipError);
      return emptyAppData(userSummary);
    }

    currentWorkspaceId = refreshedMemberships?.[0]?.workspace_id ?? null;

    if (!currentWorkspaceId) {
      return emptyAppData(userSummary);
    }
  }

  const workspaceId = currentWorkspaceId;
  const [
    workspaceResult,
    staffResult,
    categoriesResult,
    servicesResult,
    customersResult,
    appointmentsResult,
    ordersResult,
    inventoryResult,
    inventoryMovementsResult,
    shiftsResult,
    staffInvitesResult,
  ] = await Promise.all([
    supabase.from("workspaces").select("*").eq("id", workspaceId).maybeSingle(),
    supabase
      .from("workspace_members")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: true }),
    supabase
      .from("service_categories")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("services")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false }),
    supabase
      .from("customers")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false }),
    supabase
      .from("appointments")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("start_at", { ascending: true }),
    supabase
      .from("orders")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false }),
    supabase
      .from("inventory_items")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("name", { ascending: true }),
    supabase
      .from("inventory_movements")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("shifts")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("shift_date", { ascending: false }),
    supabase
      .from("workspace_member_invites")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false }),
  ]);

  const firstError = [
    workspaceResult,
    staffResult,
    categoriesResult,
    servicesResult,
    customersResult,
    appointmentsResult,
    ordersResult,
    inventoryResult,
    inventoryMovementsResult,
    shiftsResult,
  ].find((result) => result.error)?.error;

  if (firstError) {
    console.error("workspace data query failed", firstError);
    return emptyAppData(userSummary);
  }

  if (!workspaceResult.data) {
    return emptyAppData(userSummary);
  }

  const currentMemberRow = (staffResult.data ?? []).find((member) => member.user_id === user.id) ?? null;
  const appointmentIdList = (appointmentsResult.data ?? []).map((appointment) => appointment.id);
  const orderIdList = (ordersResult.data ?? []).map((order) => order.id);

  const [appointmentServicesResult, orderLinesResult] = await Promise.all([
    appointmentIdList.length
      ? supabase
          .from("appointment_services")
          .select("*")
          .in("appointment_id", appointmentIdList)
      : Promise.resolve({ data: [], error: null } as const),
    orderIdList.length
      ? supabase
          .from("order_lines")
          .select("*")
          .in("order_id", orderIdList)
      : Promise.resolve({ data: [], error: null } as const),
  ]);

  if (appointmentServicesResult.error) {
    console.error("workspace appointment services query failed", appointmentServicesResult.error);
    return emptyAppData(userSummary);
  }

  if (orderLinesResult.error) {
    console.error("workspace order lines query failed", orderLinesResult.error);
    return emptyAppData(userSummary);
  }

  let staffInviteFeatureEnabled = true;
  let staffInvites: StaffInvite[] = [];

  if (staffInvitesResult.error) {
    if (isMissingStaffInviteTableError(staffInvitesResult.error)) {
      staffInviteFeatureEnabled = false;
    } else {
      console.error("workspace invite query failed", staffInvitesResult.error);
      return emptyAppData(userSummary);
    }
  } else {
    staffInvites = (staffInvitesResult.data ?? []).map(toStaffInvite);
  }

  const appointmentIds = new Set(
    (appointmentsResult.data ?? []).map((appointment) => appointment.id),
  );
  const orderIds = new Set((ordersResult.data ?? []).map((order) => order.id));

  return {
    user: userSummary,
    workspace: toWorkspace(workspaceResult.data),
    currentMember: currentMemberRow ? toStaff(currentMemberRow) : null,
    staff: (staffResult.data ?? []).map(toStaff),
    categories: (categoriesResult.data ?? []).map(toCategory),
    staffInvites,
    staffInviteFeatureEnabled,
    services: (servicesResult.data ?? []).map((service) =>
      toService(service, categoriesResult.data ?? []),
    ),
    customers: (customersResult.data ?? []).map(toCustomer),
    appointments: (appointmentsResult.data ?? []).map((appointment) =>
      toAppointment(
        appointment,
        (appointmentServicesResult.data ?? []).filter((item) =>
          appointmentIds.has(item.appointment_id),
        ),
      ),
    ),
    orders: (ordersResult.data ?? []).map((order) =>
      toOrder(
        order,
        (orderLinesResult.data ?? []).filter((line) =>
          orderIds.has(line.order_id),
        ),
      ),
    ),
    inventory: (inventoryResult.data ?? []).map(toInventory),
    inventoryMovements: (inventoryMovementsResult.data ?? []).map(
      toInventoryMovement,
    ),
    shifts: (shiftsResult.data ?? []).map(toShift),
    needsWorkspace: false,
  };
}
