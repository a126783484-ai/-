"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { can } from "@/lib/permissions";
import { buildMissingOrderLineServiceMessage } from "@/lib/order-line-errors";
import {
  buildInventoryConsumptionPlan,
  validateInventoryConsumption,
  type InventoryConsumptionLine,
} from "@/lib/inventory-consumption";
import { resolveOrderStatus } from "@/lib/orders";
import { getCurrentWorkspaceContext } from "@/lib/workspace";
import type { Database, Json } from "@/lib/database.types";
import type {
  AppointmentStatus,
  OrderStatus,
  PaymentMethod,
} from "@/lib/types";

type AppSupabaseClient = SupabaseClient<Database, "public">;
type OrderLineDraft = Database["public"]["Tables"]["order_lines"]["Insert"] & {
  category?: string;
};
type ActiveWorkspace = {
  supabase: AppSupabaseClient;
  userId: string;
  role: "owner" | "admin" | "technician" | "front_desk" | "staff";
  workspaceId: string;
};

const pathsToRefresh = [
  "/",
  "/customers",
  "/appointments",
  "/services",
  "/checkout",
  "/inventory",
  "/operations",
  "/reports",
  "/settings",
];

function refreshApp() {
  pathsToRefresh.forEach((path) => revalidatePath(path));
}

function requirePermission(role: ActiveWorkspace["role"], action: string, message: string) {
  if (!can(role, action)) {
    throw new Error(message);
  }
}

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optionalText(formData: FormData, key: string) {
  const value = text(formData, key);
  return value.length ? value : null;
}

function numberValue(formData: FormData, key: string, fallback = 0) {
  const value = Number(text(formData, key));
  return Number.isFinite(value) ? value : fallback;
}

function integerValue(formData: FormData, key: string, fallback = 0) {
  return Math.max(0, Math.round(numberValue(formData, key, fallback)));
}

function listValue(formData: FormData, key: string) {
  return text(formData, key)
    .split(/[，、,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function checked(formData: FormData, key: string) {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

function selectedValues(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .map((value) => String(value))
    .filter(Boolean);
}

function nullableDate(formData: FormData, key: string) {
  return optionalText(formData, key);
}

function buildSearchParams(input: Record<string, string>) {
  return new URLSearchParams(input).toString();
}

function redirectWithError(path: string, code: string): never {
  redirect(`${path}?${buildSearchParams({ error: code })}`);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function isPermissionError(message: string) {
  return message.includes("沒有權限");
}

function isConfigError(message: string) {
  return message.includes("登入設定尚未完成")
    || message.includes("請先登入後再操作")
    || message.includes("找不到可操作的工作區")
    || message.includes("工作區")
    || message.includes("AUTH_REQUIRED")
    || message.includes("WORKSPACE_MEMBER_MISSING")
    || message.includes("WORKSPACE_MISSING");
}

function isInvalidInputError(message: string) {
  return message.includes("請")
    || message.includes("格式不正確")
    || message.includes("必須")
    || message.includes("重複")
    || message.includes("不存在")
    || message.includes("不屬於目前工作區")
    || message.includes("重疊")
    || message.includes("至少")
    || message.includes("無效")
    || message.includes("JSON");
}

function appointmentErrorCode(error: unknown) {
  const message = errorMessage(error);
  if (isPermissionError(message)) return "appointment_forbidden";
  if (message.includes("衝突")) return "appointment_conflict";
  if (isConfigError(message)) return "appointment_config_missing";
  if (isInvalidInputError(message)) return "appointment_invalid_input";
  return "appointment_create_failed";
}

function customerErrorCode(error: unknown) {
  const message = errorMessage(error);
  if (isPermissionError(message)) return "customer_forbidden";
  if (isConfigError(message)) return "customer_config_missing";
  return "customer_create_failed";
}

function serviceErrorCode(error: unknown) {
  const message = errorMessage(error);
  if (isPermissionError(message)) return "service_forbidden";
  if (isConfigError(message)) return "service_config_missing";
  if (isInvalidInputError(message)) return "service_invalid_input";
  return "service_create_failed";
}

function checkoutErrorCode(error: unknown) {
  const message = errorMessage(error);
  if (isPermissionError(message)) return "order_forbidden";
  if (isConfigError(message)) return "order_config_missing";
  if (isInvalidInputError(message)) return "order_invalid_input";
  return "order_create_failed";
}

function settingsErrorCode(error: unknown) {
  const message = errorMessage(error);
  if (isPermissionError(message)) return "settings_forbidden";
  if (isConfigError(message)) return "settings_config_missing";
  return "settings_save_failed";
}

async function getActiveWorkspace(): Promise<ActiveWorkspace> {
  const supabase = await createSupabaseServerClient();
  const context = await getCurrentWorkspaceContext(supabase);

  return {
    supabase,
    userId: context.user.id,
    role: context.membership.role as ActiveWorkspace["role"],
    workspaceId: context.workspace.id,
  };
}

async function assertWorkspaceRecord(
  table: "customers" | "services" | "appointments" | "orders",
  id: string,
  workspaceId: string,
  supabase: AppSupabaseClient,
) {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    ;
  if (error) {
    throw new Error(`資料權限檢查失敗：${error.message}`);
  }
  if ((count ?? 0) <= 0) {
    throw new Error("找不到此工作區內的資料，已取消操作。");
  }
}

async function assertWorkspaceMembership(
  table: "customers" | "services" | "appointments" | "orders",
  id: string,
  workspaceId: string,
  supabase: AppSupabaseClient,
) {
  await assertWorkspaceRecord(table, id, workspaceId, supabase);
}

async function assertWorkspaceReferences(
  supabase: AppSupabaseClient,
  workspaceId: string,
  customerId: string,
  technicianId: string,
  serviceIds: string[] = [],
) {
  const servicesPromise = serviceIds.length
    ? supabase
        .from("services")
        .select("id")
        .eq("workspace_id", workspaceId)
        .in("id", serviceIds)
    : Promise.resolve({ data: [], error: null } as const);

  const [customerResult, technicianResult, servicesResult] = await Promise.all([
    supabase.from("customers").select("id").eq("workspace_id", workspaceId).eq("id", customerId).maybeSingle(),
    supabase.from("workspace_members").select("id, role, active").eq("workspace_id", workspaceId).eq("id", technicianId).maybeSingle(),
    servicesPromise,
  ]);

  if (customerResult.error) {
    throw new Error(`驗證客戶失敗：${customerResult.error.message}`);
  }

  if (technicianResult.error) {
    throw new Error(`驗證技師失敗：${technicianResult.error.message}`);
  }

  if (servicesResult.error) {
    throw new Error(`驗證服務失敗：${servicesResult.error.message}`);
  }

  if (!customerResult.data) {
    throw new Error("客戶不屬於目前工作區，請重新選擇。");
  }

  if (!technicianResult.data || !technicianResult.data.active) {
    throw new Error("技師不屬於目前工作區，請重新選擇。");
  }

  if (serviceIds.length && (servicesResult.data ?? []).length !== serviceIds.length) {
    const found = new Set((servicesResult.data ?? []).map((service) => service.id));
    const missing = serviceIds.filter((serviceId) => !found.has(serviceId));
    throw new Error(`有服務不屬於目前工作區：${missing.join("、")}`);
  }
}

async function findOrCreateCategory(
  supabase: AppSupabaseClient,
  workspaceId: string,
  categoryInput: string,
) {
  const categoryName = categoryInput.trim() || "未分類";
  const { data: existing, error: existingError } = await supabase
    .from("service_categories")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("name", categoryName)
    .maybeSingle();

  if (existingError) {
    throw new Error(`讀取服務分類失敗：${existingError.message}`);
  }

  if (existing) {
    return existing.id;
  }

  const { data: created, error: createError } = await supabase
    .from("service_categories")
    .insert({ workspace_id: workspaceId, name: categoryName })
    .select("id")
    .single();

  if (createError) {
    throw new Error(`建立服務分類失敗：${createError.message}`);
  }

  return created.id;
}

export async function saveCustomer(formData: FormData) {
  try {
    const { supabase, workspaceId, role } = await getActiveWorkspace();
    requirePermission(role, "customers", "你沒有權限建立或更新客戶資料。");
    const id = optionalText(formData, "id");
    const name = text(formData, "name");
    const phone = text(formData, "phone");

    if (!name) throw new Error("請填寫客戶姓名。");
    if (!phone) throw new Error("請填寫客戶電話。");

    const { count: duplicateCount, error: duplicateError } = await supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("phone", phone)
      .neq("id", id ?? "00000000-0000-0000-0000-000000000000")
      ;

    if (duplicateError) throw new Error(`檢查電話是否重複失敗：${duplicateError.message}`);
    if ((duplicateCount ?? 0) > 0) throw new Error("此電話已存在於同一工作區，請改用編輯既有客戶。");

    const payload = {
      workspace_id: workspaceId,
      name,
      phone,
      birthday: nullableDate(formData, "birthday"),
      line_id: optionalText(formData, "line_id"),
      tier: text(formData, "tier") || "一般",
      preferences: listValue(formData, "preferences"),
      cautions: listValue(formData, "cautions"),
      tags: listValue(formData, "tags"),
      note: optionalText(formData, "note"),
      next_reminder: nullableDate(formData, "next_reminder"),
    };

    const result = id
      ? await supabase
          .from("customers")
          .update(payload)
          .eq("id", id)
          .eq("workspace_id", workspaceId)
      : await supabase.from("customers").insert(payload);

    if (result.error) throw new Error(`儲存客戶失敗：${result.error.message}`);
    refreshApp();
  } catch (error) {
    console.error("saveCustomer failed", error);
    redirectWithError("/customers", customerErrorCode(error));
  }
}

export async function deleteOrArchiveCustomer(formData: FormData) {
  try {
    const { supabase, workspaceId, role } = await getActiveWorkspace();
    requirePermission(role, "customers", "你沒有權限刪除或封存客戶資料。");
    const id = text(formData, "id");
    await assertWorkspaceRecord("customers", id, workspaceId, supabase);

    const [
      { count: appointmentCount, error: appointmentError },
      { count: orderCount, error: orderError },
    ] = await Promise.all([
      supabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .eq("customer_id", id),
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .eq("customer_id", id),
    ]);

    if (appointmentError) throw new Error(`檢查客戶預約失敗：${appointmentError.message}`);
    if (orderError) throw new Error(`檢查客戶訂單失敗：${orderError.message}`);

    if ((appointmentCount ?? 0) > 0 || (orderCount ?? 0) > 0) {
      const { data: customer, error: customerError } = await supabase
        .from("customers")
        .select("tags,note")
        .eq("id", id)
        .eq("workspace_id", workspaceId)
        .single();
      if (customerError) throw new Error(`讀取客戶封存資料失敗：${customerError.message}`);
      const tags = Array.from(new Set([...(customer.tags ?? []), "已封存"]));
      const note = [
        customer.note,
        `封存於 ${new Date().toISOString().slice(0, 10)}，保留歷史預約與訂單。`,
      ]
        .filter(Boolean)
        .join("\n");
      const { error } = await supabase
        .from("customers")
        .update({ tags, note })
        .eq("id", id)
        .eq("workspace_id", workspaceId);
      if (error) throw new Error(`封存客戶失敗：${error.message}`);
    } else {
      const { error } = await supabase
        .from("customers")
        .delete()
        .eq("id", id)
        .eq("workspace_id", workspaceId);
      if (error) throw new Error(`刪除客戶失敗：${error.message}`);
    }

    refreshApp();
  } catch (error) {
    console.error("deleteOrArchiveCustomer failed", error);
    redirectWithError("/customers", customerErrorCode(error));
  }
}

export async function saveService(formData: FormData) {
  try {
    const { supabase, workspaceId, role } = await getActiveWorkspace();
    requirePermission(role, "services", "你沒有權限建立或更新服務項目。");
    const id = optionalText(formData, "id");
    const name = text(formData, "name");
    const price = integerValue(formData, "price");
    const durationMin = integerValue(formData, "duration_min", 30);

    if (!name) throw new Error("請填寫服務名稱。");
    if (durationMin <= 0) throw new Error("服務時間必須大於 0 分鐘。");

    const categoryId = await findOrCreateCategory(
      supabase,
      workspaceId,
      text(formData, "category"),
    );
    const payload = {
      workspace_id: workspaceId,
      category_id: categoryId,
      name,
      price,
      duration_min: durationMin,
      description: optionalText(formData, "description"),
      enabled: checked(formData, "enabled"),
      is_add_on: checked(formData, "is_add_on"),
    };

    const result = id
      ? await supabase
          .from("services")
          .update(payload)
          .eq("id", id)
          .eq("workspace_id", workspaceId)
      : await supabase.from("services").insert(payload);

    if (result.error) throw new Error(`儲存服務失敗：${result.error.message}`);
    refreshApp();
  } catch (error) {
    console.error("saveService failed", error);
    redirectWithError("/services", serviceErrorCode(error));
  }
}

export async function setServiceEnabled(formData: FormData) {
  try {
    const { supabase, workspaceId, role } = await getActiveWorkspace();
    requirePermission(role, "services", "你沒有權限變更服務啟用狀態。");
    const id = text(formData, "id");
    const enabled = checked(formData, "enabled");
    const { error } = await supabase
      .from("services")
      .update({ enabled })
      .eq("id", id)
      .eq("workspace_id", workspaceId);
    if (error) throw new Error(`更新服務狀態失敗：${error.message}`);
    refreshApp();
  } catch (error) {
    console.error("setServiceEnabled failed", error);
    redirectWithError("/services", serviceErrorCode(error));
  }
}

async function appointmentPayload(
  formData: FormData,
  workspaceId: string,
  userId: string,
) {
  const customerId = text(formData, "customer_id");
  const technicianId = text(formData, "technician_id");
  const startAt = text(formData, "start_at");
  const endAt = text(formData, "end_at");

  if (!customerId) throw new Error("請選擇客戶。");
  if (!technicianId) throw new Error("請選擇技師。");
  if (!startAt || !endAt) throw new Error("請填寫預約開始與結束時間。");
  if (new Date(endAt) <= new Date(startAt))
    throw new Error("預約結束時間必須晚於開始時間。");

  return {
    workspace_id: workspaceId,
    customer_id: customerId,
    technician_id: technicianId,
    start_at: new Date(startAt).toISOString(),
    end_at: new Date(endAt).toISOString(),
    status: (text(formData, "status") || "pending") as AppointmentStatus,
    source: text(formData, "source") || "現場",
    note: optionalText(formData, "note"),
    created_by: userId,
  };
}

async function assertNoTechnicianConflict(
  supabase: AppSupabaseClient,
  workspaceId: string,
  technicianId: string,
  startAt: string,
  endAt: string,
  appointmentId?: string | null,
) {
  let query = supabase
    .from("appointments")
    .select("id,start_at,end_at")
    .eq("workspace_id", workspaceId)
    .eq("technician_id", technicianId)
    .not("status", "in", "(cancelled,no_show)")
    .lt("start_at", endAt)
    .gt("end_at", startAt)
    .limit(1);

  if (appointmentId) query = query.neq("id", appointmentId);
  const { data, error } = await query;
  if (error) throw new Error(`檢查技師時段衝突失敗：${error.message}`);
  if (data?.length)
    throw new Error("此技師在同一時段已有重疊預約，請調整時間或改派其他技師。");
}

export async function saveAppointment(formData: FormData) {
  try {
    const { supabase, workspaceId, userId, role } = await getActiveWorkspace();
    requirePermission(role, "appointments", "你沒有權限建立或更新預約。");
    const id = optionalText(formData, "id");
    const serviceIds = selectedValues(formData, "service_ids");
    if (!serviceIds.length) throw new Error("請至少選擇一項服務。");

    const payload = await appointmentPayload(formData, workspaceId, userId);
    await assertWorkspaceReferences(supabase, workspaceId, payload.customer_id, payload.technician_id, serviceIds);
    await assertNoTechnicianConflict(supabase, workspaceId, payload.technician_id, payload.start_at, payload.end_at, id);

    let appointmentId = id;
    if (appointmentId) {
      const { data: updatedAppointment, error } = await supabase
        .from("appointments")
        .update(payload)
        .eq("id", appointmentId)
        .eq("workspace_id", workspaceId)
        .select("id")
        .maybeSingle();
      if (error) throw new Error(`更新預約失敗：${error.message}`);
      if (!updatedAppointment) throw new Error("找不到此工作區內的資料，已取消操作。");
    } else {
      const { data, error } = await supabase
        .from("appointments")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw new Error(`建立預約失敗：${error.message}`);
      appointmentId = data.id;
    }

    const { error: deleteError } = await supabase
      .from("appointment_services")
      .delete()
      .eq("appointment_id", appointmentId);
    if (deleteError) throw new Error(`更新預約服務失敗：${deleteError.message}`);

    const { error: insertError } = await supabase
      .from("appointment_services")
      .insert(
        serviceIds.map((serviceId) => ({
          appointment_id: appointmentId!,
          service_id: serviceId,
        })),
      );
    if (insertError) throw new Error(`儲存預約服務失敗：${insertError.message}`);
    refreshApp();
  } catch (error) {
    console.error("saveAppointment failed", error);
    redirectWithError("/appointments", appointmentErrorCode(error));
  }
}

export async function updateAppointmentStatus(formData: FormData) {
  const { supabase, workspaceId, role } = await getActiveWorkspace();
  requirePermission(role, "appointments", "你沒有權限更新預約狀態。");
  const id = text(formData, "id");
  const status = text(formData, "status") as AppointmentStatus;
  const { error } = await supabase
    .from("appointments")
    .update({ status })
    .eq("id", id)
    .eq("workspace_id", workspaceId);
  if (error) throw new Error(`更新預約狀態失敗：${error.message}`);
  refreshApp();
}

function orderLineInput(formData: FormData) {
  const serviceIds = Array.from(new Set(selectedValues(formData, "line_service_ids")));
  const customName = text(formData, "custom_line_name");
  const customPrice = integerValue(formData, "custom_line_price");
  const customQuantity = Math.max(
    1,
    integerValue(formData, "custom_line_quantity", 1),
  );
  return { serviceIds, customName, customPrice, customQuantity };
}

async function buildOrderLines(
  supabase: AppSupabaseClient,
  workspaceId: string,
  formData: FormData,
) {
  const { serviceIds, customName, customPrice, customQuantity } =
    orderLineInput(formData);
  const lines: OrderLineDraft[] = [];

  if (serviceIds.length) {
    const { data: services, error } = await supabase
      .from("services")
      .select("id,name,price,category_id")
      .eq("workspace_id", workspaceId)
      .in("id", serviceIds);
    if (error) throw new Error(`讀取訂單服務明細失敗：${error.message}`);
    const found = services ?? [];
    if (found.length !== serviceIds.length) {
      const foundIds = new Set(found.map((service) => service.id));
      const missingServiceIds = serviceIds.filter((serviceId) => !foundIds.has(serviceId));
      throw new Error(buildMissingOrderLineServiceMessage(missingServiceIds));
    }
    const categoryIds = [...new Set(found.map((service) => service.category_id).filter(Boolean))] as string[];
    const categoryById = new Map<string, string>();
    if (categoryIds.length) {
      const { data: categories, error: categoryError } = await supabase
        .from("service_categories")
        .select("id,name")
        .eq("workspace_id", workspaceId)
        .in("id", categoryIds);
      if (categoryError) throw new Error(`讀取服務分類失敗：${categoryError.message}`);
      for (const category of categories ?? []) {
        categoryById.set(category.id, category.name);
      }
    }
    lines.push(
      ...found.map((service) => ({
        order_id: "",
        service_id: service.id,
        name: service.name,
        quantity: 1,
        unit_price: service.price,
        category: service.category_id ? categoryById.get(service.category_id) : undefined,
      })),
    );
  }

  if (customName) {
    lines.push({
      order_id: "",
      service_id: null,
      name: customName,
      quantity: customQuantity,
      unit_price: customPrice,
    });
  }

  if (!lines.length) throw new Error("請至少加入一筆訂單明細。");
  return lines;
}

async function loadInventoryForCheckout(
  supabase: AppSupabaseClient,
  workspaceId: string,
) {
  const { data, error } = await supabase
    .from("inventory_items")
    .select("id, workspace_id, brand, category, name, cost, retail_price, quantity, low_stock_threshold")
    .eq("workspace_id", workspaceId);

  if (error) {
    throw new Error(`讀取庫存失敗：${error.message}`);
  }

  return (data ?? []).map((item) => ({
    id: item.id,
    workspaceId: item.workspace_id,
    brand: item.brand ?? "",
    category: item.category,
    name: item.name,
    cost: Number(item.cost),
    retailPrice: Number(item.retail_price),
    quantity: Number(item.quantity),
    lowStockThreshold: Number(item.low_stock_threshold),
  }));
}

async function consumeInventoryForOrder(
  supabase: AppSupabaseClient,
  orderId: string,
  plan: ReturnType<typeof buildInventoryConsumptionPlan>,
) {
  for (const item of plan) {
    const { data, error } = await (supabase as AppSupabaseClient & {
      rpc: (
        fn: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: Array<{ movement_id: string }> | null; error: { message: string } | null }>;
    }).rpc("record_inventory_movement", {
      p_item_id: item.itemId,
      p_movement_type: "consume",
      p_quantity: item.quantity,
      p_note: `訂單 ${orderId.slice(0, 8)}｜${item.reason}`,
    });

    if (error) {
      throw new Error(`自動扣庫存失敗：${error.message}`);
    }

    const movementId = data?.[0]?.movement_id;
    if (movementId) {
      await supabase
        .from("inventory_movements")
        .update({ order_id: orderId })
        .eq("id", movementId);
    }
  }
}

async function buildSingleOrderLine(
  supabase: AppSupabaseClient,
  workspaceId: string,
  formData: FormData,
) {
  const { serviceIds, customName, customPrice, customQuantity } =
    orderLineInput(formData);

  if (serviceIds.length) {
    return buildOrderLines(supabase, workspaceId, formData).then((lines) =>
      lines.filter((line) => line.service_id !== null),
    );
  }

  if (customName) {
    return [
      {
        order_id: "",
        service_id: null,
        name: customName,
        quantity: customQuantity,
        unit_price: customPrice,
      },
    ];
  }

  throw new Error("請先選擇服務或輸入自訂項目。");
}

export async function saveOrder(formData: FormData) {
  try {
    const { supabase, workspaceId, role } = await getActiveWorkspace();
    requirePermission(role, "checkout", "你沒有權限建立或更新訂單。");
    const appointmentId = optionalText(formData, "appointment_id");
    const customerId = text(formData, "customer_id");
    const technicianId = text(formData, "technician_id");
    if (!customerId) throw new Error("請選擇訂單客戶。");
    if (!technicianId) throw new Error("請選擇服務技師。");
    if (appointmentId) {
      await assertWorkspaceMembership("appointments", appointmentId, workspaceId, supabase);
    }

    await assertWorkspaceReferences(supabase, workspaceId, customerId, technicianId);

    const lineTemplates = await buildOrderLines(supabase, workspaceId, formData);
    const discount = integerValue(formData, "discount");
    const tip = integerValue(formData, "tip");
    const paidAmount = integerValue(formData, "paid_amount");
    const statusRaw = text(formData, "status");
    const status = resolveOrderStatus(
      {
        lines: lineTemplates.map((line) => ({
          serviceId: line.service_id ?? "",
          name: line.name,
          quantity: line.quantity ?? 1,
          unitPrice: line.unit_price,
        })),
        discount,
        tip,
        paidAmount,
      },
      statusRaw ? (statusRaw as OrderStatus) : "",
    );
    const inventory = await loadInventoryForCheckout(supabase, workspaceId);
    const consumptionLines: InventoryConsumptionLine[] = lineTemplates.map((line) => ({
      serviceId: line.service_id ?? "",
      name: line.name,
      quantity: line.quantity ?? 1,
      category: line.category,
    }));
    const consumptionPlan = buildInventoryConsumptionPlan(consumptionLines, inventory);
    const inventoryValidation = validateInventoryConsumption(consumptionPlan, inventory);
    if (!inventoryValidation.ok) {
      throw new Error(inventoryValidation.message);
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        workspace_id: workspaceId,
        appointment_id: appointmentId,
        customer_id: customerId,
        technician_id: technicianId,
        discount,
        tip,
        paid_amount: paidAmount,
        payment_method: (text(formData, "payment_method") ||
          "cash") as PaymentMethod,
        status,
      })
      .select("id")
      .single();

    if (orderError) throw new Error(`建立訂單失敗：${orderError.message}`);

    const { error: linesError } = await supabase
      .from("order_lines")
      .insert(lineTemplates.map(({ category: _category, ...line }) => ({ ...line, order_id: order.id })));
    if (linesError) throw new Error(`建立訂單明細失敗：${linesError.message}`);

    if (consumptionPlan.length) {
      await consumeInventoryForOrder(supabase, order.id, consumptionPlan);
    }

    if (appointmentId) {
      await supabase
        .from("appointments")
        .update({ status: "completed" })
        .eq("id", appointmentId)
        .eq("workspace_id", workspaceId);
    }

    refreshApp();
  } catch (error) {
    console.error("saveOrder failed", error);
    redirectWithError("/checkout", checkoutErrorCode(error));
  }
}

export async function addOrderLine(formData: FormData) {
  try {
    const { supabase, workspaceId, role } = await getActiveWorkspace();
    requirePermission(role, "checkout", "你沒有權限新增訂單明細。");
    const orderId = text(formData, "order_id");
    await assertWorkspaceRecord("orders", orderId, workspaceId, supabase);
    const lines = await buildSingleOrderLine(supabase, workspaceId, formData);
    const inventory = await loadInventoryForCheckout(supabase, workspaceId);
    const consumptionPlan = buildInventoryConsumptionPlan(
      lines.map((line) => ({
        serviceId: line.service_id ?? "",
        name: line.name,
        quantity: line.quantity ?? 1,
        category: line.category,
      })),
      inventory,
    );
    const inventoryValidation = validateInventoryConsumption(consumptionPlan, inventory);
    if (!inventoryValidation.ok) {
      throw new Error(inventoryValidation.message);
    }

    const { error } = await supabase
      .from("order_lines")
      .insert(lines.map(({ category: _category, ...line }) => ({ ...line, order_id: orderId })));
    if (error) throw new Error(`新增訂單明細失敗：${error.message}`);
    if (consumptionPlan.length) {
      await consumeInventoryForOrder(supabase, orderId, consumptionPlan);
    }
    refreshApp();
  } catch (error) {
    console.error("addOrderLine failed", error);
    redirectWithError("/checkout", checkoutErrorCode(error));
  }
}

export async function removeOrderLine(formData: FormData) {
  try {
    const { supabase, workspaceId, role } = await getActiveWorkspace();
    requirePermission(role, "checkout", "你沒有權限移除訂單明細。");
    const orderId = text(formData, "order_id");
    const lineId = text(formData, "line_id");
    await assertWorkspaceRecord("orders", orderId, workspaceId, supabase);
    const { error } = await supabase
      .from("order_lines")
      .delete()
      .eq("id", lineId)
      .eq("order_id", orderId);
    if (error) throw new Error(`移除訂單明細失敗：${error.message}`);
    refreshApp();
  } catch (error) {
    console.error("removeOrderLine failed", error);
    redirectWithError("/checkout", checkoutErrorCode(error));
  }
}

export async function updateWorkspaceSettings(formData: FormData) {
  try {
    const { supabase, workspaceId, role } = await getActiveWorkspace();
    requirePermission(role, "settings", "你沒有權限更新店鋪設定。");
    let businessHours: Json = {};
    const businessHoursRaw = text(formData, "business_hours");
    if (businessHoursRaw) {
      try {
        businessHours = JSON.parse(businessHoursRaw) as Json;
      } catch {
        throw new Error('營業時間必須是有效 JSON，例如 {"mon":"10:00-20:00"}。');
      }
    }

    const name = text(formData, "name");
    if (!name) throw new Error("請填寫店鋪名稱。");

    const { error } = await supabase
      .from("workspaces")
      .update({
        name,
        phone: optionalText(formData, "phone"),
        address: optionalText(formData, "address"),
        brand_color: text(formData, "brand_color") || "#C87486",
        business_hours: businessHours,
      })
      .eq("id", workspaceId);

    if (error) throw new Error(`儲存店鋪設定失敗：${error.message}`);
    refreshApp();
  } catch (error) {
    console.error("updateWorkspaceSettings failed", error);
    redirectWithError("/settings", settingsErrorCode(error));
  }
}
