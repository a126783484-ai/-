"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Database, Json } from "@/lib/database.types";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type ActionState = { ok: boolean; message: string };
type SupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

const modulePaths = ["/", "/customers", "/appointments", "/services", "/checkout", "/settings"];
const appointmentStatuses = ["pending", "confirmed", "in_service", "completed", "cancelled", "no_show"] as const;
const orderStatuses = ["unpaid", "partial", "paid", "refunded"] as const;
const paymentMethods = ["cash", "card", "transfer", "line_pay", "other"] as const;

async function currentWorkspace(supabase: SupabaseClient) {
  const { data: userResult, error: userError } = await supabase.auth.getUser();
  if (userError || !userResult.user) throw new Error("請先登入後再操作。");

  const { data: membership, error } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userResult.user.id)
    .eq("active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !membership) throw new Error("找不到可操作的 workspace，請重新登入。");
  return { workspaceId: membership.workspace_id, userId: userResult.user.id };
}

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optionalText(formData: FormData, key: string) {
  const value = text(formData, key);
  return value.length ? value : null;
}

function numberField(formData: FormData, key: string, fallback = 0) {
  const value = Number(text(formData, key));
  return Number.isFinite(value) ? value : fallback;
}

function stringList(formData: FormData, key: string) {
  return text(formData, key).split(/[，,\n]/).map((item) => item.trim()).filter(Boolean);
}

function selectedIds(formData: FormData, key: string) {
  return formData.getAll(key).filter((value): value is string => typeof value === "string" && value.length > 0);
}

function revalidateModules() {
  for (const path of modulePaths) revalidatePath(path);
}

async function ensureCustomerPhoneUnique(supabase: SupabaseClient, workspaceId: string, phone: string, customerId?: string) {
  const { data, error } = await supabase
    .from("customers")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("phone", phone)
    .limit(1);
  if (error) throw new Error("檢查電話是否重複時發生錯誤。");
  const duplicated = data?.some((customer) => customer.id !== customerId);
  if (duplicated) throw new Error("此電話已存在於目前 workspace，請改用其他電話或編輯原客戶。");
}

export async function saveCustomerAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const supabase = await createSupabaseServerClient();
    const { workspaceId } = await currentWorkspace(supabase);
    const id = optionalText(formData, "id") ?? undefined;
    const payload = z.object({
      name: z.string().min(1, "請輸入客戶姓名。"),
      phone: z.string().min(3, "請輸入可辨識的電話。"),
      birthday: z.string().nullable(),
      line_id: z.string().nullable(),
      tier: z.enum(["新客", "一般", "VIP", "VVIP"]),
      note: z.string().nullable(),
      next_reminder: z.string().nullable(),
      preferences: z.array(z.string()),
      cautions: z.array(z.string()),
      tags: z.array(z.string())
    }).parse({
      name: text(formData, "name"),
      phone: text(formData, "phone"),
      birthday: optionalText(formData, "birthday"),
      line_id: optionalText(formData, "line_id"),
      tier: text(formData, "tier") || "一般",
      note: optionalText(formData, "note"),
      next_reminder: optionalText(formData, "next_reminder"),
      preferences: stringList(formData, "preferences"),
      cautions: stringList(formData, "cautions"),
      tags: stringList(formData, "tags")
    });

    await ensureCustomerPhoneUnique(supabase, workspaceId, payload.phone, id);
    const request = id
      ? supabase.from("customers").update(payload).eq("id", id).eq("workspace_id", workspaceId)
      : supabase.from("customers").insert({ ...payload, workspace_id: workspaceId });
    const { error } = await request;
    if (error) throw new Error(error.message);
    revalidateModules();
    return { ok: true, message: id ? "客戶資料已更新。" : "已建立新客戶。" };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "儲存客戶失敗。" };
  }
}

export async function archiveCustomerAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const supabase = await createSupabaseServerClient();
    const { workspaceId } = await currentWorkspace(supabase);
    const id = text(formData, "id");
    if (!id) throw new Error("缺少客戶 ID。");

    const [{ data: appointments }, { data: orders }] = await Promise.all([
      supabase.from("appointments").select("id").eq("workspace_id", workspaceId).eq("customer_id", id).limit(1),
      supabase.from("orders").select("id").eq("workspace_id", workspaceId).eq("customer_id", id).limit(1)
    ]);

    if (!appointments?.length && !orders?.length) {
      const { error } = await supabase.from("customers").delete().eq("id", id).eq("workspace_id", workspaceId);
      if (error) throw new Error(error.message);
      revalidateModules();
      return { ok: true, message: "已刪除尚未產生交易紀錄的客戶。" };
    }

    const { data: customer, error: readError } = await supabase.from("customers").select("tags,note").eq("id", id).eq("workspace_id", workspaceId).maybeSingle();
    if (readError || !customer) throw new Error("讀取客戶資料失敗。");
    const tags = Array.from(new Set([...(customer.tags ?? []), "已封存"]));
    const note = customer.note?.includes("【已封存】") ? customer.note : `【已封存】${customer.note ? `\n${customer.note}` : ""}`;
    const { error } = await supabase.from("customers").update({ tags, note }).eq("id", id).eq("workspace_id", workspaceId);
    if (error) throw new Error(error.message);
    revalidateModules();
    return { ok: true, message: "此客戶已有預約或訂單，已改以標籤封存。" };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "封存客戶失敗。" };
  }
}

async function serviceCategoryId(supabase: SupabaseClient, workspaceId: string, rawCategoryId: string, categoryName: string) {
  if (rawCategoryId) return rawCategoryId;
  const name = categoryName.trim();
  if (!name) return null;
  const { data: existing, error: existingError } = await supabase.from("service_categories").select("id").eq("workspace_id", workspaceId).eq("name", name).maybeSingle();
  if (existingError) throw new Error(existingError.message);
  if (existing) return existing.id;
  const { data, error } = await supabase.from("service_categories").insert({ workspace_id: workspaceId, name }).select("id").single();
  if (error) throw new Error(error.message);
  return data.id;
}

export async function saveServiceAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const supabase = await createSupabaseServerClient();
    const { workspaceId } = await currentWorkspace(supabase);
    const id = optionalText(formData, "id") ?? undefined;
    const category_id = await serviceCategoryId(supabase, workspaceId, text(formData, "category_id"), text(formData, "category_name"));
    const payload = z.object({
      name: z.string().min(1, "請輸入服務名稱。"),
      category_id: z.string().nullable(),
      price: z.number().min(0, "價格不可小於 0。"),
      duration_min: z.number().int().min(5, "時間至少 5 分鐘。"),
      description: z.string().nullable(),
      enabled: z.boolean(),
      is_add_on: z.boolean()
    }).parse({
      name: text(formData, "name"),
      category_id,
      price: numberField(formData, "price"),
      duration_min: numberField(formData, "duration_min", 60),
      description: optionalText(formData, "description"),
      enabled: formData.get("enabled") === "on",
      is_add_on: formData.get("is_add_on") === "on"
    });
    const request = id
      ? supabase.from("services").update(payload).eq("id", id).eq("workspace_id", workspaceId)
      : supabase.from("services").insert({ ...payload, workspace_id: workspaceId });
    const { error } = await request;
    if (error) throw new Error(error.message);
    revalidateModules();
    return { ok: true, message: id ? "服務已更新。" : "已建立新服務。" };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "儲存服務失敗。" };
  }
}

export async function saveAppointmentAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const supabase = await createSupabaseServerClient();
    const { workspaceId, userId } = await currentWorkspace(supabase);
    const id = optionalText(formData, "id") ?? undefined;
    const serviceIds = selectedIds(formData, "service_ids");
    if (!serviceIds.length) throw new Error("請至少選擇一項服務。");
    const status = z.enum(appointmentStatuses).parse(text(formData, "status") || "pending");
    const startAt = new Date(text(formData, "start_at"));
    if (Number.isNaN(startAt.getTime())) throw new Error("請選擇正確的預約開始時間。");
    const durationMin = numberField(formData, "duration_min", 60);
    const endAt = new Date(startAt.getTime() + durationMin * 60_000);
    const technicianId = text(formData, "technician_id");

    const { data: conflict, error: conflictError } = await supabase
      .from("appointments")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("technician_id", technicianId)
      .neq("status", "cancelled")
      .lt("start_at", endAt.toISOString())
      .gt("end_at", startAt.toISOString());
    if (conflictError) throw new Error(conflictError.message);
    if (conflict?.some((appointment) => appointment.id !== id)) throw new Error("此技師在該時段已有重疊預約，請調整時間或改派技師。");

    const payload = {
      customer_id: text(formData, "customer_id"),
      technician_id: technicianId,
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      status,
      source: text(formData, "source") || "現場",
      note: optionalText(formData, "note")
    };

    let appointmentId = id;
    if (id) {
      const { error } = await supabase.from("appointments").update(payload).eq("id", id).eq("workspace_id", workspaceId);
      if (error) throw new Error(error.message);
      await supabase.from("appointment_services").delete().eq("appointment_id", id);
    } else {
      const { data, error } = await supabase.from("appointments").insert({ ...payload, workspace_id: workspaceId, created_by: userId }).select("id").single();
      if (error) throw new Error(error.message);
      appointmentId = data.id;
    }

    const { error: serviceError } = await supabase.from("appointment_services").insert(serviceIds.map((service_id) => ({ appointment_id: appointmentId!, service_id })));
    if (serviceError) throw new Error(serviceError.message);
    revalidateModules();
    return { ok: true, message: id ? "預約已更新。" : "已建立新預約。" };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "儲存預約失敗。" };
  }
}

export async function updateAppointmentStatusAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const supabase = await createSupabaseServerClient();
    const { workspaceId } = await currentWorkspace(supabase);
    const status = z.enum(appointmentStatuses).parse(text(formData, "status"));
    const { error } = await supabase.from("appointments").update({ status }).eq("id", text(formData, "id")).eq("workspace_id", workspaceId);
    if (error) throw new Error(error.message);
    revalidateModules();
    return { ok: true, message: "預約狀態已更新。" };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "更新預約狀態失敗。" };
  }
}

function computeOrderStatus(total: number, paid: number): Database["public"]["Enums"]["order_status"] {
  if (paid <= 0) return "unpaid";
  if (paid >= total) return "paid";
  return "partial";
}

export async function saveOrderAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const supabase = await createSupabaseServerClient();
    const { workspaceId } = await currentWorkspace(supabase);
    const id = optionalText(formData, "id") ?? undefined;
    const appointmentId = optionalText(formData, "appointment_id");
    let customerId = text(formData, "customer_id");
    let technicianId = text(formData, "technician_id");
    let serviceIds = selectedIds(formData, "service_ids");

    if (appointmentId) {
      const { data: appointment, error } = await supabase.from("appointments").select("customer_id,technician_id").eq("id", appointmentId).eq("workspace_id", workspaceId).maybeSingle();
      if (error || !appointment) throw new Error("找不到要轉結帳的預約。");
      customerId = appointment.customer_id;
      technicianId = appointment.technician_id;
      if (!serviceIds.length) {
        const { data: linkedServices, error: linkError } = await supabase.from("appointment_services").select("service_id").eq("appointment_id", appointmentId);
        if (linkError) throw new Error(linkError.message);
        serviceIds = linkedServices?.map((item) => item.service_id) ?? [];
      }
    }

    const { data: services, error: servicesError } = serviceIds.length
      ? await supabase.from("services").select("id,name,price").eq("workspace_id", workspaceId).in("id", serviceIds)
      : { data: [], error: null };
    if (servicesError) throw new Error(servicesError.message);

    const lines: Database["public"]["Tables"]["order_lines"]["Insert"][] = (services ?? []).map((service) => ({ service_id: service.id, name: service.name, quantity: 1, unit_price: service.price, order_id: "" }));
    const customName = text(formData, "custom_name");
    const customPrice = numberField(formData, "custom_price");
    if (customName && customPrice > 0) lines.push({ service_id: null, name: customName, quantity: numberField(formData, "custom_quantity", 1), unit_price: customPrice, order_id: "" });
    if (!lines.length && !id) throw new Error("請選擇服務或新增自訂項目。");

    const discount = numberField(formData, "discount");
    const tip = numberField(formData, "tip");
    const paid_amount = numberField(formData, "paid_amount");
    const total = lines.reduce((sum, line) => sum + (line.quantity ?? 1) * line.unit_price, 0) - discount + tip;
    const status = (text(formData, "status") as Database["public"]["Enums"]["order_status"]) || computeOrderStatus(total, paid_amount);
    z.enum(orderStatuses).parse(status);
    const payment_method = z.enum(paymentMethods).parse(text(formData, "payment_method") || "cash");
    const payload = { appointment_id: appointmentId, customer_id: customerId, technician_id: technicianId, discount, tip, paid_amount, payment_method, status };

    let orderId = id;
    if (id) {
      const { error } = await supabase.from("orders").update(payload).eq("id", id).eq("workspace_id", workspaceId);
      if (error) throw new Error(error.message);
      if (lines.length) await supabase.from("order_lines").delete().eq("order_id", id);
    } else {
      const { data, error } = await supabase.from("orders").insert({ ...payload, workspace_id: workspaceId }).select("id").single();
      if (error) throw new Error(error.message);
      orderId = data.id;
    }
    if (lines.length) {
      const { error } = await supabase.from("order_lines").insert(lines.map((line) => ({ ...line, order_id: orderId! })));
      if (error) throw new Error(error.message);
    }
    revalidateModules();
    return { ok: true, message: id ? "訂單已更新。" : "已建立訂單。" };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "儲存訂單失敗。" };
  }
}

export async function addOrderLineAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const supabase = await createSupabaseServerClient();
    await currentWorkspace(supabase);
    const serviceId = optionalText(formData, "service_id");
    let name = text(formData, "name");
    let unit_price = numberField(formData, "unit_price");
    if (serviceId) {
      const { data: service, error } = await supabase.from("services").select("name,price").eq("id", serviceId).maybeSingle();
      if (error || !service) throw new Error("找不到服務項目。");
      name = service.name;
      unit_price = service.price;
    }
    if (!name) throw new Error("請輸入明細名稱或選擇服務。");
    const orderId = text(formData, "order_id");
    const { data: order, error: orderError } = await supabase.from("orders").select("id").eq("id", orderId).maybeSingle();
    if (orderError || !order) throw new Error("找不到可操作的訂單。");
    const { error } = await supabase.from("order_lines").insert({ order_id: orderId, service_id: serviceId, name, quantity: numberField(formData, "quantity", 1), unit_price });
    if (error) throw new Error(error.message);
    revalidateModules();
    return { ok: true, message: "已新增訂單明細。" };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "新增訂單明細失敗。" };
  }
}

export async function removeOrderLineAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const supabase = await createSupabaseServerClient();
    await currentWorkspace(supabase);
    const { data: line, error: lineError } = await supabase.from("order_lines").select("id,order_id").eq("id", text(formData, "line_id")).maybeSingle();
    if (lineError || !line) throw new Error("找不到要移除的訂單明細。");
    const { data: order, error: orderError } = await supabase.from("orders").select("id").eq("id", line.order_id).maybeSingle();
    if (orderError || !order) throw new Error("找不到可操作的訂單。");
    const { error } = await supabase.from("order_lines").delete().eq("id", line.id);
    if (error) throw new Error(error.message);
    revalidateModules();
    return { ok: true, message: "已移除訂單明細。" };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "移除訂單明細失敗。" };
  }
}

export async function saveWorkspaceSettingsAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const supabase = await createSupabaseServerClient();
    const { workspaceId } = await currentWorkspace(supabase);
    let businessHours: Json | null = null;
    const rawBusinessHours = text(formData, "business_hours");
    if (rawBusinessHours) {
      try {
        businessHours = JSON.parse(rawBusinessHours) as Json;
      } catch {
        throw new Error("營業時間必須是有效 JSON，例如 {\"mon\":\"10:00-20:00\"}。");
      }
    }
    const payload = z.object({
      name: z.string().min(1, "請輸入店鋪名稱。"),
      phone: z.string().nullable(),
      address: z.string().nullable(),
      brand_color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "品牌色請使用 #RRGGBB 格式。"),
      business_hours: z.any().nullable()
    }).parse({
      name: text(formData, "name"),
      phone: optionalText(formData, "phone"),
      address: optionalText(formData, "address"),
      brand_color: text(formData, "brand_color") || "#C87486",
      business_hours: businessHours
    });
    const { error } = await supabase.from("workspaces").update(payload).eq("id", workspaceId);
    if (error) throw new Error(error.message);
    revalidateModules();
    return { ok: true, message: "Workspace 設定已儲存。" };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "儲存設定失敗。" };
  }
}
