"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  addOrderLine,
  deleteOrArchiveCustomer,
  removeOrderLine,
  saveAppointment,
  saveCustomer,
  saveOrder,
  saveService,
  setServiceEnabled,
  updateAppointmentStatus,
  updateWorkspaceSettings,
} from "@/app/crud-actions";
import { recordInventoryMovementAction, saveInventoryItemAction } from "@/app/inventory/actions";
import { createStaffAction, createStaffInviteAction, updateStaffAction, saveStaffShiftAction } from "@/app/staff/actions";
import { AppShell } from "@/components/AppShell";
import { FormNotice } from "@/components/FormNotice";
import { ModuleTable } from "@/components/ModuleTable";
import { MetricCard, StatusPill, EmptyState } from "@/components/ui";
import { statusLabel, summarizeAppointmentDependencies } from "@/lib/appointments";
import { dashboardMetrics } from "@/lib/analytics";
import {
  orderFinancialSummary,
  orderPaymentState,
  orderStatusLabel,
  orderStatusTone,
  orderSubtotal,
  orderTotal,
  outstandingAmount,
  resolveOrderStatus,
} from "@/lib/orders";
import { can, roleLabel } from "@/lib/permissions";
import type { AppData } from "@/lib/app-data-client";
import { getWorkspaceSetupGuide, isWorkspaceEmpty } from "@/lib/app-data-client";
import type { Appointment, Customer, InventoryItem, Order, ServiceItem, Shift, StaffMember } from "@/lib/types";
import { buildStaffInvitePath } from "@/lib/staff-invites";
import { currency, formatDate, formatTime } from "@/lib/utils";

const liveNotice =
  "正式資料模式：資料由 Supabase Auth + RLS 依 workspace 隔離。";
const sources = ["LINE", "Instagram", "電話", "現場", "官網"];

const appointmentStatuses = [
  "pending",
  "confirmed",
  "in_service",
  "completed",
  "cancelled",
  "no_show",
] as const;
const paymentMethods = [
  "cash",
  "card",
  "transfer",
  "line_pay",
  "other",
] as const;
const paymentMethodLabels: Record<(typeof paymentMethods)[number], string> = {
  cash: "現金",
  card: "信用卡",
  transfer: "轉帳",
  line_pay: "LINE Pay",
  other: "其他",
};
const orderStatuses = ["unpaid", "partial", "paid", "refunded"] as const;
const tiers = ["新客", "一般", "VIP", "VVIP"];
const staffRoles = ["owner", "admin", "technician", "front_desk", "staff"] as const;
const staffRoleHelpText =
  "技師可被排班與指派服務，櫃台負責接待與提醒，一般員工適合支援與行政，管理員 / 店主可管理設定。";
const inventoryMovementTypes = ["purchase", "consume", "adjust"] as const;
type Notice = { kind: "error" | "success"; message: string };
type LinkAction = { href: string; label: string };

function appointmentStatusTone(status: (typeof appointmentStatuses)[number]) {
  if (status === "confirmed") return "sage" as const;
  if (status === "in_service") return "plum" as const;
  if (status === "completed") return "sage" as const;
  if (status === "cancelled" || status === "no_show") return "rose" as const;
  return "amber" as const;
}

function NoticeBanner({ notice }: { notice?: Notice }) {
  if (!notice) return null;
  return <FormNotice kind={notice.kind}>{notice.message}</FormNotice>;
}

function SubmitButton({
  children,
  tone = "plum",
  disabled = false,
}: {
  children: React.ReactNode;
  tone?: "plum" | "white" | "danger";
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  const className =
    tone === "danger"
      ? "mobile-tap rounded-2xl bg-rose px-4 py-3 font-semibold text-white disabled:opacity-60"
      : tone === "white"
        ? "mobile-tap rounded-2xl bg-white px-4 py-3 font-semibold text-plum disabled:opacity-60"
      : "mobile-tap rounded-2xl bg-plum px-4 py-3 font-semibold text-white disabled:opacity-60";
  return (
    <button type="submit" disabled={pending || disabled} className={className}>
      {pending ? "儲存中…" : children}
    </button>
  );
}

function fieldClass() {
  return "mobile-tap mt-2 w-full rounded-2xl border border-champagne bg-white p-3 text-ink";
}

function compactDateTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function currentDateInput() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function shiftSummary(shift: Shift) {
  return shift.leave ? "休假 / 休息" : `${shift.startTime}–${shift.endTime}`;
}

function reminderDisplay(value?: string) {
  if (!value) return null;
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
    today.getDate(),
  ).padStart(2, "0")}`;
  const reminderKey = value.slice(0, 10);

  if (reminderKey < todayKey) {
    return { tone: "rose" as const, label: `${formatDate(value)}（逾期）` };
  }
  if (reminderKey === todayKey) {
    return { tone: "amber" as const, label: `${formatDate(value)}（今天）` };
  }
  return { tone: "sage" as const, label: formatDate(value) };
}

function namesFromIds(ids: string[], services: ServiceItem[]) {
  return (
    ids
      .map((id) => services.find((service) => service.id === id)?.name)
      .filter(Boolean)
      .join("、") || "-"
  );
}

function CustomerForm({
  customer,
  onCancel,
}: {
  customer?: Customer;
  onCancel?: () => void;
}) {
  return (
    <form action={saveCustomer} className="card p-5">
      <input type="hidden" name="id" value={customer?.id ?? ""} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-lg font-bold text-plum">
          {customer ? "編輯客戶" : "新增客戶"}
        </h2>
        {customer && onCancel ? (
          <button
            type="button"
            className="mobile-tap rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-plum"
            onClick={onCancel}
          >
            取消編輯
          </button>
        ) : null}
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="text-sm font-semibold text-plum">
          姓名
          <input
            required
            name="name"
            className={fieldClass()}
            defaultValue={customer?.name}
            placeholder="王小美"
          />
        </label>
        <label className="text-sm font-semibold text-plum">
          電話（同工作區不可重複）
          <input
            required
            name="phone"
            className={fieldClass()}
            defaultValue={customer?.phone}
            placeholder="0912-345-678"
          />
        </label>
        <label className="text-sm font-semibold text-plum">
          生日
          <input
            type="date"
            name="birthday"
            className={fieldClass()}
            defaultValue={customer?.birthday}
          />
        </label>
        <label className="text-sm font-semibold text-plum">
          LINE ID
          <input
            name="line_id"
            className={fieldClass()}
            defaultValue={customer?.lineId}
          />
        </label>
        <label className="text-sm font-semibold text-plum">
          會員等級
          <select
            name="tier"
            className={fieldClass()}
            defaultValue={customer?.tier ?? "一般"}
          >
            {tiers.map((tier) => (
              <option key={tier}>{tier}</option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold text-plum">
          下次提醒
          <input
            type="date"
            name="next_reminder"
            className={fieldClass()}
            defaultValue={customer?.nextReminder}
          />
        </label>
        <label className="text-sm font-semibold text-plum">
          偏好（逗號分隔）
          <input
            name="preferences"
            className={fieldClass()}
            defaultValue={customer?.preferences.join("、")}
            placeholder="裸色、短甲"
          />
        </label>
        <label className="text-sm font-semibold text-plum">
          注意事項（逗號分隔）
          <input
            name="cautions"
            className={fieldClass()}
            defaultValue={customer?.cautions.join("、")}
            placeholder="凝膠過敏"
          />
        </label>
        <label className="text-sm font-semibold text-plum md:col-span-2">
          標籤（逗號分隔）
          <input
            name="tags"
            className={fieldClass()}
            defaultValue={customer?.tags.join("、")}
            placeholder="高價值客戶、需回訪"
          />
        </label>
        <label className="text-sm font-semibold text-plum md:col-span-2">
          備註
          <textarea
            name="note"
            className={`${fieldClass()} min-h-24`}
            defaultValue={customer?.note}
          />
        </label>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <SubmitButton>{customer ? "更新客戶" : "建立客戶"}</SubmitButton>
      </div>
    </form>
  );
}

function ServiceForm({
  service,
  categories,
  onCancel,
}: {
  service?: ServiceItem;
  categories: AppData["categories"];
  onCancel?: () => void;
}) {
  return (
    <form action={saveService} className="card p-5">
      <input type="hidden" name="id" value={service?.id ?? ""} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-lg font-bold text-plum">
          {service ? "編輯服務" : "新增服務"}
        </h2>
        {service && onCancel ? (
          <button
            type="button"
            className="mobile-tap rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-plum"
            onClick={onCancel}
          >
            取消編輯
          </button>
        ) : null}
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="text-sm font-semibold text-plum">
          服務名稱
          <input
            required
            name="name"
            className={fieldClass()}
            defaultValue={service?.name}
          />
        </label>
        <label className="text-sm font-semibold text-plum">
          分類
          <input
            required
            list="service-categories"
            name="category"
            className={fieldClass()}
            defaultValue={service?.category ?? categories[0]?.name ?? "美甲"}
          />
          <datalist id="service-categories">
            {categories.map((category) => (
              <option key={category.id} value={category.name} />
            ))}
          </datalist>
        </label>
        <label className="text-sm font-semibold text-plum">
          價格
          <input
            required
            type="number"
            min="0"
            name="price"
            className={fieldClass()}
            defaultValue={service?.price ?? 0}
          />
        </label>
        <label className="text-sm font-semibold text-plum">
          時間（分鐘）
          <input
            required
            type="number"
            min="1"
            name="duration_min"
            className={fieldClass()}
            defaultValue={service?.durationMin ?? 60}
          />
        </label>
        <label className="text-sm font-semibold text-plum md:col-span-2">
          說明
          <textarea
            name="description"
            className={`${fieldClass()} min-h-20`}
            defaultValue={service?.description}
          />
        </label>
        <label className="flex items-start gap-3 rounded-2xl bg-blush p-4 font-semibold text-plum">
          <input
            type="checkbox"
            name="enabled"
            defaultChecked={service?.enabled ?? true}
          />{" "}
          啟用服務
        </label>
        <label className="flex items-start gap-3 rounded-2xl bg-blush p-4 font-semibold text-plum">
          <input
            type="checkbox"
            name="is_add_on"
            defaultChecked={service?.addOn ?? false}
          />{" "}
          加購項目
        </label>
      </div>
      <div className="mt-4">
        <SubmitButton>{service ? "更新服務" : "建立服務"}</SubmitButton>
      </div>
    </form>
  );
}

function AppointmentForm({
  data,
  appointment,
  onCancel,
}: {
  data: AppData;
  appointment?: Appointment;
  onCancel?: () => void;
}) {
  const fallbackStart = compactDateTime(new Date().toISOString());
  const dependencySummary = summarizeAppointmentDependencies({
    customers: data.customers,
    services: data.services,
    staff: data.staff,
  });
  const activeStaff = data.staff.filter((member) => member.active);
  const selectedServiceIds = new Set(appointment?.serviceIds ?? []);
  const missingDependencyLabels = [
    dependencySummary.missingCustomers ? "客戶" : null,
    dependencySummary.missingServices ? "可用服務" : null,
    dependencySummary.missingStaff ? "可指派員工" : null,
  ].filter(Boolean);
  return (
    <form action={saveAppointment} className="card p-5">
      <input type="hidden" name="id" value={appointment?.id ?? ""} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-lg font-bold text-plum">
          {appointment ? "編輯預約" : "新增預約"}
        </h2>
        {appointment && onCancel ? (
          <button
            type="button"
            className="mobile-tap rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-plum"
            onClick={onCancel}
          >
            取消編輯
          </button>
        ) : null}
      </div>
      {!dependencySummary.ready ? (
        <div className="mt-4 rounded-3xl border border-amber bg-amber/10 p-4">
          <p className="font-semibold text-plum">先補齊預約基礎資料</p>
          <p className="mt-1 text-sm text-ink/70">
            目前缺少：{missingDependencyLabels.join("、")}。先建立這些資料後，才能建立或更新預約。
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-sm font-semibold">
            <Link className="mobile-tap rounded-xl bg-white px-3 py-2 text-plum" href="/customers">
              前往客戶
            </Link>
            <Link className="mobile-tap rounded-xl bg-white px-3 py-2 text-plum" href="/services">
              前往服務
            </Link>
            <Link className="mobile-tap rounded-xl bg-white px-3 py-2 text-plum" href="/staff">
              前往員工
            </Link>
          </div>
          <div className="mt-3 grid gap-2 text-sm text-ink/70 sm:grid-cols-3">
            {dependencySummary.missingCustomers ? (
              <p>客戶：先建立 1 位常用客戶，例如「王小美」。</p>
            ) : (
              <p>客戶：已有 {dependencySummary.customerCount} 筆。</p>
            )}
            {dependencySummary.missingServices ? (
              <p>服務：先建立 1 個可用服務，例如「單色凝膠美甲」。</p>
            ) : (
              <p>服務：已有 {dependencySummary.activeServiceCount} 個可用服務。</p>
            )}
            {dependencySummary.missingStaff ? (
              <p>員工：先建立 1 位可排班員工，才能指派預約。</p>
            ) : (
              <p>員工：已有 {dependencySummary.activeStaffCount} 位啟用員工。</p>
            )}
          </div>
        </div>
      ) : null}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="text-sm font-semibold text-plum">
          客戶
          <select
            required
            name="customer_id"
            className={fieldClass()}
            defaultValue={appointment?.customerId ?? ""}
            disabled={data.customers.length === 0}
          >
            <option value="" disabled>
              {data.customers.length === 0 ? "請先建立客戶" : "請選擇"}
            </option>
            {data.customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}｜{customer.phone}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold text-plum">
          技師
          <select
            required
            name="technician_id"
            className={fieldClass()}
            defaultValue={
              appointment?.technicianId ??
              activeStaff[0]?.id ??
              ""
            }
            disabled={activeStaff.length === 0}
          >
            <option value="" disabled>
              {activeStaff.length === 0 ? "請先建立員工" : "請選擇"}
            </option>
            {activeStaff.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}｜{roleLabel(member.role)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold text-plum">
          開始時間
          <input
            required
            type="datetime-local"
            name="start_at"
            className={fieldClass()}
            defaultValue={
              compactDateTime(appointment?.startAt) || fallbackStart
            }
          />
        </label>
        <label className="text-sm font-semibold text-plum">
          結束時間
          <input
            required
            type="datetime-local"
            name="end_at"
            className={fieldClass()}
            defaultValue={compactDateTime(appointment?.endAt)}
          />
        </label>
        <label className="text-sm font-semibold text-plum">
          狀態
          <select
            name="status"
            className={fieldClass()}
            defaultValue={appointment?.status ?? "pending"}
          >
            {appointmentStatuses.map((status) => (
              <option key={status} value={status}>
                {statusLabel(status)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold text-plum">
          來源
          <select
            name="source"
            className={fieldClass()}
            defaultValue={appointment?.source ?? "現場"}
          >
            {sources.map((source) => (
              <option key={source}>{source}</option>
            ))}
          </select>
        </label>
        <fieldset className="md:col-span-2 rounded-3xl border border-champagne p-4">
          <legend className="px-2 text-sm font-bold text-plum">
            服務（可複選）
          </legend>
          {data.services.some((service) => service.enabled || selectedServiceIds.has(service.id)) ? (
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {data.services
                .filter((service) => service.enabled || selectedServiceIds.has(service.id))
                .map((service) => (
                  <label
                    key={service.id}
                    className="flex items-start gap-3 rounded-2xl bg-blush p-3"
                  >
                    <input
                      type="checkbox"
                      name="service_ids"
                      value={service.id}
                      defaultChecked={appointment?.serviceIds.includes(
                        service.id,
                      )}
                    />{" "}
                    <span>
                      {service.name}
                      <small className="ml-2 text-ink/50">
                        {currency.format(service.price)}
                      </small>
                      {!service.enabled ? <small className="ml-2 text-rose">(已停用)</small> : null}
                    </span>
                  </label>
                ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-ink/60">目前沒有可用服務，請先新增至少一項服務。</p>
          )}
        </fieldset>
        <label className="text-sm font-semibold text-plum md:col-span-2">
          備註
          <textarea
            name="note"
            className={`${fieldClass()} min-h-20`}
            defaultValue={appointment?.note}
          />
        </label>
      </div>
      <div className="mt-4">
        <SubmitButton disabled={!dependencySummary.ready}>{appointment ? "更新預約" : "建立預約"}</SubmitButton>
      </div>
    </form>
  );
}

function OrderForm({ data }: { data: AppData }) {
  const openAppointments = data.appointments.filter(
    (appointment) =>
      appointment.status !== "completed" &&
      appointment.status !== "cancelled" &&
      appointment.status !== "no_show",
  );
  const activeStaff = data.staff.filter((member) => member.active);
  const enabledServices = data.services.filter((service) => service.enabled);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState(0);
  const [customQuantity, setCustomQuantity] = useState(1);
  const [discount, setDiscount] = useState(0);
  const [tip, setTip] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [status, setStatus] = useState<(typeof orderStatuses)[number] | "">("");

  const selectedServices = useMemo(
    () => enabledServices.filter((service) => selectedServiceIds.includes(service.id)),
    [enabledServices, selectedServiceIds],
  );
  const draftLines = useMemo(
    () => [
      ...selectedServices.map((service) => ({
        serviceId: service.id,
        name: service.name,
        quantity: 1,
        unitPrice: service.price,
      })),
      ...(customName.trim()
        ? [
            {
              serviceId: "",
              name: customName.trim(),
              quantity: customQuantity,
              unitPrice: customPrice,
            },
          ]
        : []),
    ],
    [customName, customPrice, customQuantity, selectedServices],
  );
  const draftFinancials = orderFinancialSummary({
    lines: draftLines,
    discount,
    tip,
    paidAmount,
  });
  const draftState = resolveOrderStatus(
    {
      lines: draftLines,
      discount,
      tip,
      paidAmount,
    },
    status,
  ) as (typeof orderStatuses)[number];
  const canSubmit = activeStaff.length > 0 && data.customers.length > 0 && draftLines.length > 0;

  function toggleService(serviceId: string) {
    setSelectedServiceIds((current) =>
      current.includes(serviceId)
        ? current.filter((id) => id !== serviceId)
        : [...current, serviceId],
    );
  }

  function resetDraft() {
    setSelectedServiceIds([]);
    setCustomName("");
    setCustomPrice(0);
    setCustomQuantity(1);
    setDiscount(0);
    setTip(0);
    setPaidAmount(0);
    setStatus("");
  }

  return (
    <form action={saveOrder} className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-lg font-bold text-plum">新增訂單 / 預約轉結帳</h2>
        <button
          type="button"
          className="mobile-tap rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-plum"
          onClick={resetDraft}
        >
          清空草稿
        </button>
      </div>
      <p className="mt-1 text-sm text-ink/60">
        勾選既有服務或填寫自訂項目，就能先看到小計、總額與待收金額，再送出建立訂單。
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="text-sm font-semibold text-plum">
          轉換預約（選填）
          <select
            name="appointment_id"
            className={fieldClass()}
            defaultValue=""
          >
            <option value="">不綁定預約</option>
            {openAppointments.map((appointment) => (
              <option key={appointment.id} value={appointment.id}>
                {formatDate(appointment.startAt)}{" "}
                {data.customers.find(
                  (customer) => customer.id === appointment.customerId,
                )?.name ?? "未命名客戶"}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold text-plum">
          客戶
          <select
            required
            name="customer_id"
            className={fieldClass()}
            defaultValue=""
          >
            <option value="" disabled>
              請選擇
            </option>
            {data.customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold text-plum">
          技師
          <select
            required
            name="technician_id"
            className={fieldClass()}
            defaultValue={activeStaff[0]?.id ?? ""}
          >
            {activeStaff.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
          </select>
        </label>
        <label className="text-sm font-semibold text-plum">
          付款方式
          <select
            name="payment_method"
            className={fieldClass()}
            defaultValue="cash"
          >
            {paymentMethods.map((method) => (
              <option key={method} value={method}>
                {paymentMethodLabels[method]}
              </option>
            ))}
          </select>
        </label>
        <fieldset className="md:col-span-2 rounded-3xl border border-champagne p-4">
          <legend className="px-2 text-sm font-bold text-plum">服務明細</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {enabledServices.length ? enabledServices.map((service) => (
                <label
                  key={service.id}
                  className="flex items-start gap-3 rounded-2xl bg-blush p-3"
                >
                  <input
                    type="checkbox"
                    name="line_service_ids"
                    value={service.id}
                    checked={selectedServiceIds.includes(service.id)}
                    onChange={() => toggleService(service.id)}
                  />{" "}
                  <span>
                    {service.name}
                    <small className="ml-2 text-ink/50">
                      {currency.format(service.price)}
                    </small>
                  </span>
                </label>
              )) : (
              <div className="rounded-2xl border border-dashed border-champagne bg-white p-4 text-sm text-ink/60">
                目前沒有啟用中的服務，請改用自訂項目開單。
              </div>
            )}
          </div>
        </fieldset>
        <label className="text-sm font-semibold text-plum">
          自訂項目
          <input
            name="custom_line_name"
            className={fieldClass()}
            placeholder="卸甲 / 產品"
            value={customName}
            onChange={(event) => setCustomName(event.target.value)}
          />
        </label>
        <label className="text-sm font-semibold text-plum">
          自訂單價
          <input
            type="number"
            min="0"
            name="custom_line_price"
            className={fieldClass()}
            value={customPrice}
            onChange={(event) => setCustomPrice(Math.max(0, Number(event.target.value) || 0))}
          />
        </label>
        <label className="text-sm font-semibold text-plum">
          自訂數量
          <input
            type="number"
            min="1"
            name="custom_line_quantity"
            className={fieldClass()}
            value={customQuantity}
            onChange={(event) => setCustomQuantity(Math.max(1, Number(event.target.value) || 1))}
          />
        </label>
        <label className="text-sm font-semibold text-plum">
          折扣
          <input
            type="number"
            min="0"
            name="discount"
            className={fieldClass()}
            value={discount}
            onChange={(event) => setDiscount(Math.max(0, Number(event.target.value) || 0))}
          />
        </label>
        <label className="text-sm font-semibold text-plum">
          小費
          <input
            type="number"
            min="0"
            name="tip"
            className={fieldClass()}
            value={tip}
            onChange={(event) => setTip(Math.max(0, Number(event.target.value) || 0))}
          />
        </label>
        <label className="text-sm font-semibold text-plum">
          已收金額
          <input
            type="number"
            min="0"
            name="paid_amount"
            className={fieldClass()}
            value={paidAmount}
            onChange={(event) => setPaidAmount(Math.max(0, Number(event.target.value) || 0))}
          />
        </label>
        <label className="text-sm font-semibold text-plum">
          結帳狀態（未收 / 部分 / 已結清依金額自動判斷；僅退款可手動）
          <select
            name="status"
            className={fieldClass()}
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as (typeof orderStatuses)[number] | "")
            }
          >
            <option value="">自動判斷</option>
            {orderStatuses.map((status) => (
              <option key={status} value={status}>
                {orderStatusLabel(status)}
              </option>
            ))}
          </select>
        </label>
        <div className="md:col-span-2 rounded-3xl border border-champagne bg-blush p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-plum">即時預覽</p>
              <p className="mt-1 text-xs text-ink/60">
                {draftLines.length ? `${draftLines.length} 筆明細` : "尚未加入明細"}
              </p>
            </div>
            <StatusPill tone={orderStatusTone(draftState)}>{orderStatusLabel(draftState)}</StatusPill>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl bg-white p-3">
              <p className="text-xs text-ink/55">小計</p>
              <p className="mt-1 text-lg font-bold text-plum">{currency.format(draftFinancials.subtotal)}</p>
            </div>
            <div className="rounded-2xl bg-white p-3">
              <p className="text-xs text-ink/55">總額</p>
              <p className="mt-1 text-lg font-bold text-plum">{currency.format(draftFinancials.total)}</p>
            </div>
            <div className="rounded-2xl bg-white p-3">
              <p className="text-xs text-ink/55">實收</p>
              <p className="mt-1 text-lg font-bold text-plum">{currency.format(draftFinancials.paidAmount)}</p>
            </div>
            <div className="rounded-2xl bg-white p-3">
              <p className="text-xs text-ink/55">尚欠</p>
              <p className="mt-1 text-lg font-bold text-plum">{currency.format(draftFinancials.outstanding)}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-ink/60">
            <span>未收 = 尚未收到任何款項</span>
            <span>部分 = 已收但仍有尚欠金額</span>
            <span>已結清 = 實收金額已覆蓋總額</span>
          </div>
        </div>
      </div>
      <div className="mt-4">
        <SubmitButton disabled={!canSubmit}>建立訂單</SubmitButton>
      </div>
      {!canSubmit ? (
        <p className="mt-2 text-sm text-ink/60">
          {data.customers.length === 0
            ? "請先建立至少一位客戶。"
            : activeStaff.length === 0
              ? "請先建立至少一位可用技師。"
              : "請勾選至少一筆服務或輸入自訂項目。"}
        </p>
      ) : null}
    </form>
  );
}

function AddLineForm({
  order,
  services,
}: {
  order: Order;
  services: ServiceItem[];
}) {
  return (
    <form
      action={addOrderLine}
      className="mt-3 grid gap-2 rounded-2xl bg-blush p-3 sm:grid-cols-3"
    >
      <input type="hidden" name="order_id" value={order.id} />
      <select
        name="line_service_ids"
        className="mobile-tap w-full rounded-xl border border-champagne p-3"
      >
        <option value="">選擇服務</option>
        {services
          .filter((service) => service.enabled)
          .map((service) => (
            <option key={service.id} value={service.id}>
              {service.name}
            </option>
          ))}
      </select>
      <input
        name="custom_line_name"
        className="mobile-tap w-full rounded-xl border border-champagne p-3"
        placeholder="或輸入自訂項目"
      />
      <input
        type="number"
        min="0"
        name="custom_line_price"
        className="mobile-tap w-full rounded-xl border border-champagne p-3"
        defaultValue={0}
      />
      <input type="hidden" name="custom_line_quantity" value="1" />
      <SubmitButton tone="white">新增明細</SubmitButton>
    </form>
  );
}

function InventoryMovementForm({ data }: { data: AppData }) {
  return (
    <form action={recordInventoryMovementAction} className="card p-5">
      <h2 className="text-lg font-bold text-plum">新增庫存異動</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="text-sm font-semibold text-plum md:col-span-2">
          品項
          <select
            required
            name="item_id"
            className={fieldClass()}
            defaultValue={data.inventory[0]?.id ?? ""}
          >
            <option value="" disabled>
              請選擇品項
            </option>
            {data.inventory.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ｜ {item.brand}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold text-plum">
          類型
          <select name="movement_type" className={fieldClass()} defaultValue="purchase">
            {inventoryMovementTypes.map((type) => (
              <option key={type} value={type}>
                {type === "purchase" ? "入庫" : type === "consume" ? "出庫" : "調整"}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold text-plum">
          數量 / 異動量
          <input
            required
            type="number"
            name="quantity"
            inputMode="decimal"
            step="0.01"
            className={fieldClass()}
            placeholder="3 或 -2"
          />
        </label>
        <label className="text-sm font-semibold text-plum md:col-span-2">
          備註
          <input
            name="note"
            className={fieldClass()}
            placeholder="盤點補貨、耗材報廢、手動修正"
          />
        </label>
      </div>
      <div className="mt-4">
        <SubmitButton>記錄異動</SubmitButton>
      </div>
    </form>
  );
}

function InventoryItemForm({
  item,
  onCancel,
}: {
  item?: InventoryItem;
  onCancel?: () => void;
}) {
  return (
    <form action={saveInventoryItemAction} className="card p-5">
      <input type="hidden" name="id" value={item?.id ?? ""} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-plum">
            {item ? "編輯庫存品項" : "建立庫存品項"}
          </h2>
          <p className="mt-1 text-sm text-ink/65">
            建立第一筆品項後，就能在右側記錄入庫、出庫與調整。
          </p>
        </div>
        {item && onCancel ? (
          <button
            type="button"
            className="mobile-tap rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-plum"
            onClick={onCancel}
          >
            取消編輯
          </button>
        ) : null}
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="text-sm font-semibold text-plum">
          品牌
          <input
            name="brand"
            className={fieldClass()}
            defaultValue={item?.brand ?? ""}
            placeholder="Leafgel"
          />
        </label>
        <label className="text-sm font-semibold text-plum">
          分類
          <input
            required
            name="category"
            className={fieldClass()}
            defaultValue={item?.category ?? ""}
            placeholder="美甲膠 / 保養品 / 耗材"
          />
        </label>
        <label className="text-sm font-semibold text-plum md:col-span-2">
          品項名稱
          <input
            required
            name="name"
            className={fieldClass()}
            defaultValue={item?.name ?? ""}
            placeholder="裸玫瑰凝膠 #R12"
          />
        </label>
        <label className="text-sm font-semibold text-plum">
          成本
          <input
            required
            type="number"
            min="0"
            step="0.01"
            name="cost"
            className={fieldClass()}
            defaultValue={item?.cost ?? 0}
          />
        </label>
        <label className="text-sm font-semibold text-plum">
          售價
          <input
            required
            type="number"
            min="0"
            step="0.01"
            name="retail_price"
            className={fieldClass()}
            defaultValue={item?.retailPrice ?? 0}
          />
        </label>
        <label className="text-sm font-semibold text-plum">
          現有數量
          <input
            required
            type="number"
            min="0"
            step="0.01"
            name="quantity"
            className={fieldClass()}
            defaultValue={item?.quantity ?? 0}
          />
        </label>
        <label className="text-sm font-semibold text-plum">
          低庫存警戒
          <input
            required
            type="number"
            min="0"
            step="0.01"
            name="low_stock_threshold"
            className={fieldClass()}
            defaultValue={item?.lowStockThreshold ?? 0}
          />
        </label>
      </div>
      <div className="mt-4">
        <SubmitButton>{item ? "更新品項" : "建立品項"}</SubmitButton>
      </div>
    </form>
  );
}

function StaffForm({ staff }: { staff?: StaffMember }) {
  const action = staff ? updateStaffAction : createStaffAction;

  return (
    <form action={action} className="card p-5">
      <input type="hidden" name="memberId" value={staff?.id ?? ""} />
      <h2 className="text-lg font-bold text-plum">
        {staff ? "編輯員工" : "新增員工 / 邀請"}
      </h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {!staff ? (
          <label className="text-sm font-semibold text-plum">
            Email（登入帳號）
            <input
              required
              type="email"
              name="email"
              className={fieldClass()}
              placeholder="staff@example.com"
            />
          </label>
        ) : null}
        <label className="text-sm font-semibold text-plum">
          姓名
          <input
            required
            name="displayName"
            className={fieldClass()}
            defaultValue={staff?.name}
            placeholder="Fii"
          />
        </label>
        <label className="text-sm font-semibold text-plum">
          電話
          <input
            name="phone"
            className={fieldClass()}
            defaultValue={staff?.phone}
            placeholder="0912-345-678"
          />
        </label>
        <label className="text-sm font-semibold text-plum">
          角色
          <select name="role" className={fieldClass()} defaultValue={staff?.role ?? "technician"}>
            {staffRoles.map((role) => (
              <option key={role} value={role}>
                {roleLabel(role)}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs leading-5 text-ink/60">{staffRoleHelpText}</p>
        </label>
        <label className="text-sm font-semibold text-plum">
          抽成（0 到 1）
          <input
            name="commissionRate"
            inputMode="decimal"
            className={fieldClass()}
            defaultValue={staff?.commissionRate ?? 0.25}
            placeholder="0.25"
          />
        </label>
        <label className="text-sm font-semibold text-plum md:col-span-2">
          專長（逗號或換行分隔）
          <textarea
            name="specialties"
            className={fieldClass()}
            defaultValue={staff?.specialties.join("、")}
            placeholder="凝膠美甲、手足保養、美睫"
          />
        </label>
        {staff ? (
          <label className="flex items-center gap-3 text-sm font-semibold text-plum">
            <input
              type="checkbox"
              name="active"
              defaultChecked={staff.active}
              className="size-5 accent-plum"
            />
            在職 / 可被排班與指派
          </label>
        ) : null}
      </div>
      <div className="mt-4">
        <SubmitButton>{staff ? "儲存員工" : "新增並寄送邀請"}</SubmitButton>
      </div>
    </form>
  );
}

function ShiftForm({
  data,
  shift,
  defaultStaffId,
  onReset,
}: {
  data: AppData;
  shift?: Shift;
  defaultStaffId: string;
  onReset: () => void;
}) {
  const defaultDate = shift?.date ?? currentDateInput();
  const defaultStart = shift?.startTime ?? "10:00";
  const defaultEnd = shift?.endTime ?? "19:00";

  return (
    <form action={saveStaffShiftAction} className="mt-4 rounded-3xl border border-champagne bg-blush/40 p-5">
      <input type="hidden" name="id" value={shift?.id ?? ""} />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-bold text-plum">{shift ? "編輯班表" : "新增班表"}</h3>
          <p className="text-sm text-ink/60">勾選「休假 / 休息」可將這筆班表標記為離班狀態。</p>
        </div>
        {shift ? (
          <button type="button" className="mobile-tap rounded-2xl bg-white px-4 py-2 font-semibold text-plum" onClick={onReset}>
            取消編輯
          </button>
        ) : null}
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="text-sm font-semibold text-plum">
          員工
          <select
            required
            name="staffId"
            className={fieldClass()}
            defaultValue={shift?.staffId ?? defaultStaffId}
          >
            <option value="" disabled>
              請選擇
            </option>
            {data.staff.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}｜{roleLabel(member.role)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold text-plum">
          日期
          <input
            required
            type="date"
            name="shiftDate"
            className={fieldClass()}
            defaultValue={defaultDate}
          />
        </label>
        <label className="text-sm font-semibold text-plum">
          開始時間
          <input
            required
            type="time"
            name="startTime"
            className={fieldClass()}
            defaultValue={defaultStart}
          />
        </label>
        <label className="text-sm font-semibold text-plum">
          結束時間
          <input
            required
            type="time"
            name="endTime"
            className={fieldClass()}
            defaultValue={defaultEnd}
          />
        </label>
        <label className="flex items-start gap-3 rounded-2xl bg-white p-4 font-semibold text-plum md:col-span-2">
          <input
            type="checkbox"
            name="leave"
            defaultChecked={shift?.leave ?? false}
            className="size-5 accent-plum"
          />
          休假 / 休息
        </label>
      </div>
      <div className="mt-4">
        <SubmitButton>{shift ? "儲存班表" : "建立班表"}</SubmitButton>
      </div>
    </form>
  );
}

function shellProps(data: AppData) {
  return {
    workspace: data.workspace,
    role: data.currentMember?.role ?? "owner",
    notice: data.needsWorkspace
      ? "尚未完成 workspace 初始化，請重新登入或聯絡管理員。"
      : data.demoMode
        ? "預覽資料模式：目前顯示的是範例 seed 資料，Supabase 實際資料仍會優先顯示。"
        : liveNotice,
  };
}

function SetupGuide({
  title,
  action,
  links,
}: {
  title: string;
  action: string;
  links: LinkAction[];
}) {
  return (
    <div className="card p-5">
      <h2 className="text-lg font-bold text-plum">{title}</h2>
      <p className="mt-1 text-sm text-ink/60">{action}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="mobile-tap rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-plum"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function DashboardView({ data }: { data: AppData }) {
  const metrics = dashboardMetrics(
    new Date(),
    data.appointments,
    data.orders,
    data.customers,
    data.services,
    data.staff,
  );
  const workspaceEmpty = isWorkspaceEmpty(data);
  const setupGuide = !data.needsWorkspace ? getWorkspaceSetupGuide(data) : null;

  return (
    <AppShell
      title="營運總覽"
      subtitle="給美業老闆看的今日重點：預約轉換、現金流、技師產能與需要處理的風險。"
      {...shellProps(data)}
    >
      {data.needsWorkspace ? (
        <EmptyState
          title="尚未完成 workspace 初始化"
          action={
            data.staffInviteFeatureEnabled && data.staffInvites.length > 0
              ? "你有待加入的店鋪邀請，請先開啟邀請卡完成加入。"
              : "請重新登入，系統會依註冊資料補齊 workspace、owner profile 與 membership。"
          }
        />
      ) : null}
      {data.needsWorkspace && data.staffInviteFeatureEnabled && data.staffInvites.length > 0 ? (
        <div className="mt-4 card p-5">
          <h2 className="text-lg font-bold text-plum">你有待加入的店鋪邀請</h2>
          <p className="mt-1 text-sm text-ink/60">先接受邀請，再進入對應店鋪後台。</p>
          <div className="mt-4 space-y-3">
            {data.staffInvites.map((invite) => (
              <div key={invite.id} className="flex flex-col gap-3 rounded-2xl bg-blush p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <strong className="block text-plum">{invite.displayName}</strong>
                  <p className="text-sm text-ink/60">{invite.email} ｜ {roleLabel(invite.role)}</p>
                </div>
                <Link href={buildStaffInvitePath(invite.token)} className="mobile-tap rounded-2xl bg-plum px-4 py-2 text-center font-semibold text-white">
                  開啟邀請
                </Link>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {setupGuide ? (
        <div className="mt-4">
          <SetupGuide
            title={setupGuide.title}
            action={setupGuide.action}
            links={setupGuide.links}
          />
        </div>
      ) : null}
      {workspaceEmpty && !setupGuide ? (
        <SetupGuide
          title="先建立第一組營運資料"
          action="完成店鋪設定後，依序新增服務、員工與客戶，今日重點與 KPI 才會開始有意義。"
          links={[
            { href: "/settings?message=settings_setup_hint", label: "先去設定" },
            { href: "/services", label: "建立服務" },
            { href: "/staff", label: "建立員工" },
          ]}
        />
      ) : null}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="今日預約數"
          value={metrics.todayAppointments}
          hint="含待確認與已確認"
        />
        <MetricCard
          label="今日營收"
          value={currency.format(metrics.todayRevenue)}
          hint="依訂單建立日統計"
        />
        <MetricCard
          label="本月營收"
          value={currency.format(metrics.monthRevenue)}
          hint="可接正式報表週期"
        />
        <MetricCard
          label="待付款"
          value={currency.format(metrics.pendingPayment)}
          hint="未付款 / 部分付款"
        />
      </section>
      <section className="mt-5 grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
        <div className="card p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-bold text-plum">今日重點：即將到店客人</h2>
            <StatusPill tone="amber">
              取消率 {(metrics.cancellationRate * 100).toFixed(0)}% / 未到率{" "}
              {(metrics.noShowRate * 100).toFixed(0)}%
            </StatusPill>
          </div>
          <div className="mt-4 space-y-3">
            {metrics.upcoming.length ? (
              metrics.upcoming.map((appointment) => {
                const customer = data.customers.find(
                  (item) => item.id === appointment.customerId,
                );
                const technician = data.staff.find(
                  (item) => item.id === appointment.technicianId,
                );
                return (
                  <article
                    key={appointment.id}
                    className="rounded-3xl bg-blush p-4"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <strong>
                        {formatTime(appointment.startAt)}{" "}
                        {customer?.name ?? "未命名客戶"}
                      </strong>
                      <StatusPill tone={appointmentStatusTone(appointment.status)}>
                        {statusLabel(appointment.status)}
                      </StatusPill>
                    </div>
                    <p className="mt-1 text-sm text-ink/60">
                      技師 {technician?.name ?? "未指派"}｜
                      {appointment.note ?? "無備註"}
                    </p>
                  </article>
                );
              })
            ) : (
              <EmptyState
                title="目前沒有即將到店預約"
                action="下一步行動：新增第一筆預約後，這裡會顯示今日與近期排程。"
              />
            )}
          </div>
        </div>
        <div className="card p-5">
          <h2 className="text-lg font-bold text-plum">新客 / 回訪客</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <MetricCard
              label="新客"
              value={metrics.newCustomers}
              hint="會員等級為新客"
            />
            <MetricCard
              label="回訪客"
              value={metrics.returningCustomers}
              hint="已有上次到訪日"
            />
          </div>
        </div>
      </section>
      <section className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="text-lg font-bold text-plum">技師業績</h2>
          <div className="mt-4 space-y-3">
            {metrics.technicianRevenue.length ? (
              metrics.technicianRevenue.map((item, index) => (
                <div
                  key={`${item.name}-${index}`}
                  className="flex flex-col gap-2 rounded-2xl bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="min-w-0 break-words">
                    {item.name}
                    <small className="ml-2 text-ink/45">
                      服務 {item.services} 次
                    </small>
                  </span>
                  <strong>{currency.format(item.revenue)}</strong>
                </div>
              ))
            ) : (
              <EmptyState
                title="目前沒有技師業績資料"
                action="完成預約與訂單後，這裡會顯示各技師的營收與服務次數。"
              />
            )}
          </div>
        </div>
        <div className="card p-5">
          <h2 className="text-lg font-bold text-plum">熱門服務</h2>
          <div className="mt-4 space-y-3">
            {metrics.serviceRanking.length ? (
              metrics.serviceRanking.map((item, index) => (
                <div
                  key={`${item.name}-${index}`}
                  className="flex flex-col gap-2 rounded-2xl bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="min-w-0 break-words">{item.name}</span>
                  <StatusPill tone="plum">{item.count} 筆</StatusPill>
                </div>
              ))
            ) : (
              <EmptyState
                title="目前沒有熱門服務"
                action="建立服務與預約後，這裡會自動整理最常被選擇的項目。"
              />
            )}
          </div>
        </div>
      </section>
    </AppShell>
  );
}

export function AppointmentsView({
  data,
  notice,
}: {
  data: AppData;
  notice?: Notice;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = data.appointments.find(
    (appointment) => appointment.id === editingId,
  );

  useEffect(() => {
    if (notice?.kind === "success") {
      setEditingId(null);
    }
  }, [notice?.kind, notice?.message]);

  return (
    <AppShell
      title="預約系統"
      subtitle="把電話、LINE 與現場預約整理成清楚流程，協助櫃台確認時段、技師與服務內容。"
      {...shellProps(data)}
    >
      <NoticeBanner notice={notice} />
      <div className="mb-5 grid gap-3 md:grid-cols-2">
        <AppointmentForm
          key={editing?.id ?? "new"}
          data={data}
          appointment={editing}
          onCancel={editing ? () => setEditingId(null) : undefined}
        />
        <div className="card p-5">
          <h2 className="text-lg font-bold text-plum">預約資料會即時寫入資料庫</h2>
          <p className="mt-2 text-sm text-ink/65">
            新增或編輯預約會寫入 Supabase，並同步
            appointment_services。系統會阻擋同一技師重疊時段。
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {appointmentStatuses.map((status) => {
              const count = data.appointments.filter((appointment) => appointment.status === status).length;
              return (
                <StatusPill key={status} tone={appointmentStatusTone(status)}>
                  {statusLabel(status)} {count}
                </StatusPill>
              );
            })}
          </div>
        </div>
      </div>
      <ModuleTable
        rows={data.appointments}
        searchPlaceholder="搜尋客戶、技師、來源、備註"
        filterOptions={["pending", "confirmed", "completed", "no_show"]}
        emptyTitle="目前沒有預約"
        columns={[
          {
            key: "time",
            label: "日期 / 時間",
            sortValue: (row) => row.startAt,
            render: (row) => (
              <>
                <strong>{formatDate(row.startAt)}</strong>
                <p className="text-ink/60">
                  {formatTime(row.startAt)}–{formatTime(row.endAt)}
                </p>
              </>
            ),
          },
          {
            key: "customer",
            label: "客戶",
            render: (row) =>
              data.customers.find((item) => item.id === row.customerId)?.name ??
              "-",
          },
          {
            key: "service",
            label: "服務",
            render: (row) => namesFromIds(row.serviceIds, data.services),
          },
          {
            key: "tech",
            label: "技師",
            render: (row) =>
              data.staff.find((item) => item.id === row.technicianId)?.name ??
              "-",
          },
          {
            key: "status",
            label: "狀態",
            render: (row) => (
              <StatusPill tone={appointmentStatusTone(row.status)}>
                {statusLabel(row.status)}
              </StatusPill>
            ),
          },
          {
            key: "actions",
            label: "操作",
            render: (row) => (
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  className="mobile-tap rounded-xl bg-champagne px-3 py-2 font-semibold text-plum"
                  onClick={() => setEditingId(row.id)}
                >
                  編輯
                </button>
                <form action={updateAppointmentStatus} className="flex flex-col gap-2 sm:flex-row">
                  <input type="hidden" name="id" value={row.id} />
                  <select
                    name="status"
                    className="mobile-tap w-full rounded-xl border border-champagne px-2 py-2 sm:w-auto"
                    defaultValue={row.status}
                  >
                    {appointmentStatuses.map((status) => (
                      <option key={status} value={status}>
                        {statusLabel(status)}
                      </option>
                    ))}
                  </select>
                  <SubmitButton tone="white">更新狀態</SubmitButton>
                </form>
              </div>
            ),
          },
        ]}
      />
    </AppShell>
  );
}

export function ServicesView({
  data,
  notice,
}: {
  data: AppData;
  notice?: Notice;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = data.services.find((service) => service.id === editingId);

  useEffect(() => {
    if (notice?.kind === "success") {
      setEditingId(null);
    }
  }, [notice?.kind, notice?.message]);

  return (
    <AppShell
      title="服務項目管理"
      subtitle="分類、價格、所需時間、說明、啟用狀態與加購項目管理。"
      {...shellProps(data)}
    >
      <NoticeBanner notice={notice} />
      <div className="mb-5">
        <ServiceForm
          key={editing?.id ?? "new"}
          service={editing}
          categories={data.categories}
          onCancel={editing ? () => setEditingId(null) : undefined}
        />
      </div>
      <ModuleTable
        rows={data.services}
        searchPlaceholder="搜尋服務名稱、分類、說明"
        filterOptions={["美甲", "美睫", "美容", "SPA", "霧眉", "加購"]}
        emptyTitle="尚未建立服務項目"
        columns={[
          {
            key: "name",
            label: "服務",
            render: (row) => (
              <>
                <strong>{row.name}</strong>
                <p className="text-ink/60">{row.description}</p>
              </>
            ),
          },
          {
            key: "category",
            label: "分類",
            render: (row) => <StatusPill>{row.category}</StatusPill>,
          },
          {
            key: "price",
            label: "價格",
            sortValue: (row) => row.price,
            render: (row) => currency.format(row.price),
          },
          {
            key: "duration",
            label: "時間",
            sortValue: (row) => row.durationMin,
            render: (row) => `${row.durationMin} 分鐘`,
          },
          {
            key: "addon",
            label: "加購",
            render: (row) =>
              row.addOn ? <StatusPill tone="amber">加購</StatusPill> : "主服務",
          },
          {
            key: "enabled",
            label: "狀態",
            render: (row) =>
              row.enabled ? (
                <StatusPill tone="sage">啟用</StatusPill>
              ) : (
                <StatusPill>停用</StatusPill>
              ),
          },
          {
            key: "actions",
            label: "操作",
            render: (row) => (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="mobile-tap rounded-xl bg-champagne px-3 py-2 font-semibold text-plum"
                  onClick={() => setEditingId(row.id)}
                >
                  編輯
                </button>
                <form action={setServiceEnabled}>
                  <input type="hidden" name="id" value={row.id} />
                  <input
                    type="hidden"
                    name="enabled"
                    value={row.enabled ? "false" : "true"}
                  />
                  <SubmitButton tone="white">
                    {row.enabled ? "停用" : "啟用"}
                  </SubmitButton>
                </form>
              </div>
            ),
          },
        ]}
      />
    </AppShell>
  );
}

export function CustomersView({
  data,
  notice,
}: {
  data: AppData;
  notice?: Notice;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = data.customers.find((customer) => customer.id === editingId);

  useEffect(() => {
    if (notice?.kind === "success") {
      setEditingId(null);
    }
  }, [notice?.kind, notice?.message]);

  return (
    <AppShell
      title="客戶 CRM"
      subtitle="沉澱客戶偏好、禁忌與回訪提醒，讓美甲沙龍更容易做熟客經營。"
      {...shellProps(data)}
    >
      <NoticeBanner notice={notice} />
      <div className="mb-5">
        <CustomerForm
          key={editing?.id ?? "new"}
          customer={editing}
          onCancel={editing ? () => setEditingId(null) : undefined}
        />
      </div>
      <ModuleTable
        rows={data.customers}
        searchPlaceholder="搜尋姓名、電話、LINE、標籤"
        filterOptions={["VIP", "VVIP", "新客", "高價值客戶", "已封存"]}
        emptyTitle="尚無客戶資料"
        columns={[
          {
            key: "name",
            label: "客戶",
            sortValue: (row) => row.name,
            render: (row) => (
              <>
                <strong>{row.name}</strong>
                <p className="text-ink/60">
                  {row.phone}｜LINE {row.lineId ?? "-"}
                </p>
              </>
            ),
          },
          {
            key: "tier",
            label: "會員",
            render: (row) => <StatusPill tone="plum">{row.tier}</StatusPill>,
          },
          {
            key: "prefs",
            label: "偏好紀錄",
            render: (row) => row.preferences.join("、") || "-",
          },
          {
            key: "cautions",
            label: "注意事項",
            render: (row) =>
              row.cautions.length ? (
                <span className="text-rose">{row.cautions.join("、")}</span>
              ) : (
                "無"
              ),
          },
          {
            key: "reminder",
            label: "回訪提醒",
            render: (row) => {
              const reminder = reminderDisplay(row.nextReminder);
              return reminder ? (
                <StatusPill tone={reminder.tone}>{reminder.label}</StatusPill>
              ) : (
                "-"
              );
            },
          },
          {
            key: "tags",
            label: "標記",
            render: (row) =>
              row.tags.map((tag) => (
                <StatusPill key={tag} tone="sage">
                  {tag}
                </StatusPill>
              )),
          },
          {
            key: "actions",
            label: "操作",
            render: (row) => (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="mobile-tap rounded-xl bg-champagne px-3 py-2 font-semibold text-plum"
                  onClick={() => setEditingId(row.id)}
                >
                  編輯
                </button>
                <form action={deleteOrArchiveCustomer}>
                  <input type="hidden" name="id" value={row.id} />
                  <SubmitButton tone="danger">刪除 / 封存</SubmitButton>
                </form>
              </div>
            ),
          },
        ]}
      />
    </AppShell>
  );
}

export function InventoryView({
  data,
  notice,
}: {
  data: AppData;
  notice?: Notice;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const canManageInventory = can(data.currentMember?.role ?? "staff", "inventory");
  const editingItem = data.inventory.find((item) => item.id === editingId);
  const hasInventory = data.inventory.length > 0;
  const inventoryRows = [...data.inventory].sort((a, b) => {
    const aLow = a.quantity <= a.lowStockThreshold;
    const bLow = b.quantity <= b.lowStockThreshold;
    if (aLow !== bLow) return aLow ? -1 : 1;
    return a.quantity - b.quantity;
  });
  const lowStockCount = data.inventory.filter(
    (item) => item.quantity <= item.lowStockThreshold,
  ).length;
  const totalValue = data.inventory.reduce(
    (sum, item) => sum + item.quantity * item.cost,
    0,
  );
  const netMovement = data.inventoryMovements.reduce(
    (sum, movement) => sum + movement.quantity,
    0,
  );
  const movementOutflow = data.inventoryMovements
    .filter((movement) => movement.quantity < 0)
    .reduce((sum, movement) => sum + Math.abs(movement.quantity), 0);
  const recentMovements = data.inventoryMovements.slice(0, 25);

  useEffect(() => {
    if (notice?.kind === "success") {
      setEditingId(null);
    }
  }, [notice?.kind, notice?.message]);

  return (
    <AppShell
      title="庫存管理"
      subtitle="用品、耗材、色膠、低庫存提醒與進銷存紀錄。"
      {...shellProps(data)}
    >
      {notice ? <NoticeBanner notice={notice} /> : null}
      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard label="品項數" value={`${data.inventory.length}`} hint="所有在庫品項" />
        <MetricCard label="低庫存" value={`${lowStockCount}`} hint="已低於警戒值" />
        <MetricCard label="庫存成本" value={currency.format(totalValue)} hint="依成本估值" />
        <MetricCard label="淨異動" value={netMovement.toFixed(2)} hint={`出庫累計 ${movementOutflow.toFixed(2)}`} />
      </section>
      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        {canManageInventory ? (
          <InventoryItemForm
            key={editingItem?.id ?? "new"}
            item={editingItem}
            onCancel={editingItem ? () => setEditingId(null) : undefined}
          />
        ) : null}
        <div className="space-y-5">
          {canManageInventory && hasInventory ? (
            <InventoryMovementForm data={data} />
          ) : canManageInventory ? (
            <EmptyState
              title="先建立第一筆庫存品項"
              action="建立品項後，就能直接記錄入庫、出庫與調整。"
            />
          ) : null}
          <div className="card p-5">
            <h2 className="text-lg font-bold text-plum">庫存運作</h2>
            <div className="mt-4 space-y-3 text-sm text-ink/70">
              <p>入庫、出庫、調整都會寫入 `inventory_movements`，並同步更新品項數量。</p>
              <p>出庫前會檢查餘量，不允許扣成負數。</p>
              <p>這裡是後續結算、報表與耗材成本的共同來源。</p>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-5">
        <ModuleTable
          rows={inventoryRows}
          searchPlaceholder="搜尋品牌、品項、分類"
          filterOptions={["凝膠", "保養", "耗材", "工具"]}
          emptyTitle="尚無庫存資料"
          columns={[
            {
              key: "name",
              label: "品項",
              render: (row) => (
                <>
                  <strong>{row.name}</strong>
                  <p className="text-ink/60">
                    {row.brand}｜{row.category}
                  </p>
                </>
              ),
            },
            {
              key: "qty",
              label: "庫存",
              sortValue: (row) => row.quantity,
              render: (row) => (
                <StatusPill tone={row.quantity <= row.lowStockThreshold ? "amber" : "sage"}>
                  {row.quantity}
                </StatusPill>
              ),
            },
            {
              key: "cost",
              label: "成本",
              sortValue: (row) => row.cost,
              render: (row) => currency.format(row.cost),
            },
            {
              key: "retail",
              label: "售價",
              sortValue: (row) => row.retailPrice,
              render: (row) => currency.format(row.retailPrice),
            },
            ...(canManageInventory
              ? [
                  {
                    key: "actions",
                    label: "操作",
                    render: (row: InventoryItem) => (
                      <button
                        type="button"
                        className="mobile-tap rounded-xl bg-white px-3 py-2 text-sm font-semibold text-plum"
                        onClick={() => setEditingId(row.id)}
                      >
                        編輯
                      </button>
                    ),
                  },
                ]
              : []),
          ]}
        />
      </div>
      <div className="mt-5">
        <ModuleTable
          rows={recentMovements}
          searchPlaceholder="搜尋異動、備註、品項"
          filterOptions={["purchase", "consume", "adjust"]}
          emptyTitle="尚無庫存異動"
          columns={[
            {
              key: "time",
              label: "時間",
              sortValue: (row) => row.createdAt,
              render: (row) => new Date(row.createdAt).toLocaleString("zh-TW"),
            },
            {
              key: "item",
              label: "品項",
              render: (row) => data.inventory.find((item) => item.id === row.itemId)?.name ?? row.itemId,
            },
            {
              key: "type",
              label: "類型",
              render: (row) => (
                <StatusPill tone={row.movementType === "consume" ? "amber" : row.movementType === "adjust" ? "plum" : "sage"}>
                  {row.movementType === "purchase" ? "入庫" : row.movementType === "consume" ? "出庫" : "調整"}
                </StatusPill>
              ),
            },
            {
              key: "qty",
              label: "異動量",
              sortValue: (row) => row.quantity,
              render: (row) => row.quantity.toFixed(2),
            },
            {
              key: "note",
              label: "備註",
              render: (row) => row.note ?? "-",
            },
          ]}
        />
      </div>
    </AppShell>
  );
}

export function CheckoutView({
  data,
  notice,
}: {
  data: AppData;
  notice?: Notice;
}) {
  const activeStaff = data.staff.filter((member) => member.active);
  const totalOutstanding = data.orders.reduce(
    (sum, order) => sum + outstandingAmount(order),
    0,
  );
  const paidOrders = data.orders.filter((order) => orderPaymentState(order) === "paid").length;
  const partialOrders = data.orders.filter((order) => orderPaymentState(order) === "partial").length;
  const unpaidOrders = data.orders.filter((order) => orderPaymentState(order) === "unpaid").length;
  const orderFormKey = `${data.orders.length}:${data.orders[0]?.id ?? "none"}`;
  return (
    <AppShell
      title="訂單 / 結帳 / 收款"
      subtitle="從預約轉訂單或直接開單，支援折扣、小費、多付款方式、收據明細與待收金額。"
      {...shellProps(data)}
    >
      <NoticeBanner notice={notice} />
      {!data.customers.length || !activeStaff.length ? (
        <div className="mb-5">
          <EmptyState
            title={
              !data.customers.length
                ? "先建立客戶再開單"
                : "先建立可指派技師再開單"
            }
            action={
              !data.customers.length
                ? "建立至少一位客戶後，這裡才能建立訂單並正確歸屬收款。"
                : "建立至少一位在職技師後，這裡才能建立訂單並指派服務人員。"
            }
          />
        </div>
      ) : null}
      <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="訂單總數" value={`${data.orders.length}`} hint="目前工作區的所有訂單" />
        <MetricCard label="待收金額" value={currency.format(totalOutstanding)} hint="所有未結清訂單的合計欠款" />
        <MetricCard label="已結清" value={`${paidOrders}`} hint="付款金額已覆蓋總額" />
        <MetricCard label="部分 / 未收" value={`${partialOrders + unpaidOrders}`} hint="仍需追款或補收的訂單" />
      </div>
      <div className="mb-5">
        <OrderForm key={orderFormKey} data={data} />
      </div>
      <ModuleTable
        rows={data.orders}
        searchPlaceholder="搜尋訂單、客戶、付款方式"
        filterOptions={["paid", "partial", "unpaid", "card", "line_pay"]}
        emptyTitle="尚無訂單"
        columns={[
          {
            key: "id",
            label: "訂單",
            render: (row) => (
              <>
                <strong>{row.id.slice(0, 8)}</strong>
                <p className="text-ink/60">
                  {new Date(row.createdAt).toLocaleString("zh-TW")}
                </p>
              </>
            ),
          },
          {
            key: "customer",
            label: "客戶 / 技師",
            render: (row) =>
              `${data.customers.find((item) => item.id === row.customerId)?.name ?? "-"}｜${data.staff.find((item) => item.id === row.technicianId)?.name ?? "-"}`,
          },
          {
            key: "lines",
            label: "明細",
            render: (row) => (
              <div>
                {row.lines.map((line) => (
                  <div
                    key={line.id ?? `${line.name}-${line.serviceId}`}
                    className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span>
                      {line.name} x{line.quantity}
                    </span>
                    {line.id ? (
                      <form action={removeOrderLine} className="self-start sm:self-auto">
                        <input type="hidden" name="order_id" value={row.id} />
                        <input type="hidden" name="line_id" value={line.id} />
                        <SubmitButton tone="white">移除</SubmitButton>
                      </form>
                    ) : null}
                  </div>
                ))}
                <AddLineForm order={row} services={data.services} />
                <p className="mt-3 text-xs text-ink/60">
                  小計 {currency.format(orderSubtotal(row))} · 折扣 {currency.format(row.discount)} · 小費 {currency.format(row.tip)}
                </p>
              </div>
            ),
          },
          {
            key: "total",
            label: "總額",
            sortValue: (row) => orderTotal(row),
            render: (row) => (
              <div>
                <strong>{currency.format(orderTotal(row))}</strong>
                <p className="text-xs text-ink/60">實收 {currency.format(row.paidAmount)}</p>
              </div>
            ),
          },
          {
            key: "paid",
            label: "待收",
            render: (row) => {
              const balance = outstandingAmount(row);
              return (
                <div>
                  <strong>{balance === 0 ? "0" : currency.format(balance)}</strong>
                  <p className="text-xs text-ink/60">
                    {balance === 0 ? "已結清" : `尚欠 ${currency.format(balance)}`}
                  </p>
                </div>
              );
            },
          },
          {
            key: "status",
            label: "狀態",
            render: (row) => {
              const state = orderPaymentState(row);
              return (
                <div className="space-y-2">
                  <StatusPill tone={orderStatusTone(state)}>{orderStatusLabel(state)}</StatusPill>
                  <p className="text-xs text-ink/60">
                    訂單狀態：{orderStatusLabel(row.status)} · 付款方式：{paymentMethodLabels[row.paymentMethod]}
                  </p>
                </div>
              );
            },
          },
        ]}
      />
    </AppShell>
  );
}

export function StaffView({
  data,
  notice,
}: {
  data: AppData;
  notice?: Notice;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [draftShiftStaffId, setDraftShiftStaffId] = useState<string | null>(null);
  const editing = data.staff.find((staff) => staff.id === editingId);
  const editingShift = data.shifts.find((shift) => shift.id === editingShiftId);
  const defaultShiftStaffId =
    editingShift?.staffId ??
    draftShiftStaffId ??
    editing?.id ??
    data.staff.find((member) => member.role === "technician" && member.active)?.id ??
    data.staff.find((member) => member.active)?.id ??
    data.staff[0]?.id ??
    "";
  const canManageStaff = can(data.currentMember?.role ?? "staff", "staff");
  const activeStaff = data.staff.filter((staff) => staff.active).length;
  const technicians = data.staff.filter((staff) => staff.role === "technician" && staff.active).length;
  const admins = data.staff.filter((staff) => (staff.role === "owner" || staff.role === "admin") && staff.active).length;
  const shifts = [...data.shifts].sort((a, b) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime));

  useEffect(() => {
    if (notice?.kind === "success") {
      setEditingId(null);
      setEditingShiftId(null);
      setDraftShiftStaffId(null);
    }
  }, [notice?.kind, notice?.message]);

  return (
    <AppShell
      title="員工 / 技師管理"
      subtitle="新增邀請、角色權限、班表、抽成、專長與在職狀態。"
      {...shellProps(data)}
    >
      <NoticeBanner notice={notice} />
      {canManageStaff && data.staffInviteFeatureEnabled ? (
        <form action={createStaffInviteAction} className="card p-5">
          <h2 className="text-lg font-bold text-plum">新增員工邀請</h2>
          <p className="mt-1 text-sm text-ink/60">輸入對方 email 後會產生可分享的加入連結。對方登入並接受後，會成為目前店鋪成員。</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-semibold text-plum">
              顯示名稱
              <input className="mobile-tap mt-2 w-full rounded-2xl border border-champagne p-3" name="displayName" required />
            </label>
            <label className="block text-sm font-semibold text-plum">
              Email
              <input className="mobile-tap mt-2 w-full rounded-2xl border border-champagne p-3" name="email" type="email" autoComplete="email" required />
            </label>
            <label className="block text-sm font-semibold text-plum">
              電話
              <input className="mobile-tap mt-2 w-full rounded-2xl border border-champagne p-3" name="phone" autoComplete="tel" />
            </label>
            <label className="block text-sm font-semibold text-plum">
              角色
              <select className="mobile-tap mt-2 w-full rounded-2xl border border-champagne p-3" name="role" defaultValue="staff">
                <option value="staff">一般員工</option>
                <option value="front_desk">櫃台</option>
                <option value="technician">技師</option>
                <option value="admin">管理員</option>
                <option value="owner">店主</option>
              </select>
            </label>
            <label className="block text-sm font-semibold text-plum">
              抽成
              <input className="mobile-tap mt-2 w-full rounded-2xl border border-champagne p-3" name="commissionRate" type="number" min="0" max="1" step="0.01" defaultValue="0" />
            </label>
            <label className="block text-sm font-semibold text-plum">
              專長
              <textarea className="mobile-tap mt-2 min-h-24 w-full rounded-2xl border border-champagne p-3" name="specialties" placeholder="例如：凝膠美甲, 眉型設計" />
            </label>
          </div>
          <button type="submit" className="mobile-tap mt-5 rounded-2xl bg-plum font-semibold text-white">
            建立邀請連結
          </button>
        </form>
      ) : canManageStaff ? (
        <div className="card p-5">
          <h2 className="text-lg font-bold text-plum">員工邀請</h2>
          <p className="mt-1 text-sm text-ink/60">目前資料庫尚未啟用邀請表，請先完成 schema 更新。</p>
        </div>
      ) : null}
      {data.staffInviteFeatureEnabled && data.staffInvites.some((invite) => invite.status === "pending") ? (
        <div className="card p-5">
          <h2 className="text-lg font-bold text-plum">待處理邀請</h2>
          <div className="mt-4 space-y-3">
            {data.staffInvites.filter((invite) => invite.status === "pending").map((invite) => (
              <div key={invite.id} className="rounded-2xl bg-blush p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <strong className="block text-plum">{invite.displayName}</strong>
                    <p className="text-sm text-ink/60">{invite.email} ｜ {roleLabel(invite.role)}</p>
                  </div>
                  <StatusPill tone="amber">待接受</StatusPill>
                </div>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <code className="break-all rounded-2xl bg-white px-3 py-2 text-xs text-ink/70">{buildStaffInvitePath(invite.token)}</code>
                  <Link href={buildStaffInvitePath(invite.token)} className="mobile-tap rounded-2xl bg-plum px-4 py-2 text-center font-semibold text-white">
                    開啟邀請
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      <div className="mb-5 grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
        {canManageStaff ? <StaffForm key={editing?.id ?? "new"} staff={editing} /> : null}
        <div className="card p-5">
          <h2 className="text-lg font-bold text-plum">人事概況</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-2xl bg-blush p-4">
              <p className="text-xs font-semibold text-ink/55">在職人數</p>
              <p className="mt-1 text-2xl font-bold text-plum">{activeStaff}</p>
            </div>
            <div className="rounded-2xl bg-blush p-4">
              <p className="text-xs font-semibold text-ink/55">可排技師</p>
              <p className="mt-1 text-2xl font-bold text-plum">{technicians}</p>
            </div>
            <div className="rounded-2xl bg-blush p-4">
              <p className="text-xs font-semibold text-ink/55">管理權限</p>
              <p className="mt-1 text-2xl font-bold text-plum">{admins}</p>
            </div>
          </div>
          {canManageStaff && editing ? (
            <button
              type="button"
              className="mobile-tap mt-4 rounded-2xl bg-white font-semibold text-plum"
              onClick={() => setEditingId(null)}
            >
              清除編輯狀態
            </button>
          ) : null}
        </div>
      </div>
      {canManageStaff ? (
        <div className="mb-5 card p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-plum">班表 / 休息</h2>
              <p className="mt-1 text-sm text-ink/60">新增或編輯當日班表，勾選休假 / 休息會把該筆班表視為離班狀態。</p>
            </div>
            {editingShift ? (
              <button
                type="button"
                className="mobile-tap rounded-2xl bg-white px-4 py-2 font-semibold text-plum"
                onClick={() => {
                  setEditingShiftId(null);
                  setDraftShiftStaffId(null);
                }}
              >
                改為新增
              </button>
            ) : null}
          </div>
          <ShiftForm
            key={editingShift?.id ?? draftShiftStaffId ?? "new"}
            data={data}
            shift={editingShift}
            defaultStaffId={defaultShiftStaffId}
            onReset={() => {
              setEditingShiftId(null);
              setDraftShiftStaffId(null);
            }}
          />
          <div className="mt-5 grid gap-3 xl:grid-cols-2">
            {shifts.length ? (
              shifts.map((shift) => {
                const memberName = data.staff.find((member) => member.id === shift.staffId)?.name ?? "未命名員工";
                return (
                  <div key={shift.id} className="flex flex-col gap-3 rounded-2xl bg-blush p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <strong className="block text-plum">{memberName}</strong>
                      <p className="text-sm text-ink/60">{formatDate(shift.date)} ｜ {shiftSummary(shift)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {shift.leave ? <StatusPill tone="amber">休息</StatusPill> : <StatusPill tone="sage">排班中</StatusPill>}
                      <button
                        type="button"
                        className="mobile-tap rounded-xl bg-white px-3 py-2 font-semibold text-plum"
                        onClick={() => {
                          setDraftShiftStaffId(null);
                          setEditingShiftId(shift.id);
                        }}
                      >
                        編輯
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="rounded-2xl bg-blush p-4 text-sm text-ink/60">尚無班表，先建立一筆排班或休息紀錄。</p>
            )}
          </div>
        </div>
      ) : null}
      <ModuleTable
        rows={data.staff}
        searchPlaceholder="搜尋員工、角色、專長"
        filterOptions={["owner", "admin", "technician", "front_desk", "staff"]}
        emptyTitle="尚無員工資料"
        columns={[
          {
            key: "name",
            label: "員工",
            render: (row) => (
              <>
                <strong>{row.name}</strong>
                <p className="text-ink/60">{row.phone}</p>
              </>
            ),
          },
          {
            key: "role",
            label: "角色",
            render: (row) => <StatusPill>{roleLabel(row.role)}</StatusPill>,
          },
          {
            key: "specialty",
            label: "專長",
            render: (row) => row.specialties.join("、") || "-",
          },
          {
            key: "commission",
            label: "抽成",
            sortValue: (row) => row.commissionRate,
            render: (row) => `${Math.round(row.commissionRate * 100)}%`,
          },
          {
            key: "shift",
            label: "班表",
            render: (row) => {
              const shift = shifts.find((item) => item.staffId === row.id);
              if (!shift) {
                return "未排班";
              }
              return (
                <div>
                  <p>{formatDate(shift.date)}</p>
                  <p className="text-ink/60">{shiftSummary(shift)}</p>
                </div>
              );
            },
          },
          {
            key: "status",
            label: "狀態",
            render: (row) =>
              row.active ? (
                <StatusPill tone="sage">在職</StatusPill>
              ) : (
                <StatusPill>停用</StatusPill>
              ),
          },
          ...(canManageStaff
            ? [
                {
                  key: "actions",
                  label: "操作",
                  render: (row: StaffMember) => (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="mobile-tap rounded-xl bg-champagne px-3 py-2 font-semibold text-plum"
                        onClick={() => {
                          setDraftShiftStaffId(null);
                          setEditingId(row.id);
                        }}
                      >
                        編輯
                      </button>
                      <button
                        type="button"
                        className="mobile-tap rounded-xl bg-white px-3 py-2 font-semibold text-plum"
                        onClick={() => {
                          setEditingId(null);
                          setEditingShiftId(null);
                          setDraftShiftStaffId(row.id);
                        }}
                      >
                        新增班表
                      </button>
                    </div>
                  ),
                },
            ]
          : []),
        ]}
      />
    </AppShell>
  );
}

export function TechnicianView({ data }: { data: AppData }) {
  const technicianId =
    data.currentMember?.role === "technician"
      ? data.currentMember.id
      : data.staff.find((item) => item.role === "technician")?.id;
  const mine = technicianId
    ? data.appointments.filter((item) => item.technicianId === technicianId)
    : [];
  return (
    <AppShell
      title="技師工作台"
      subtitle="技師只看自己的今日預約、客戶注意事項、服務紀錄與服務前後照片欄位。"
      {...shellProps(data)}
    >
      <div className="grid gap-4">
        {mine.length ? (
          mine.map((appointment) => {
            const customer = data.customers.find(
              (item) => item.id === appointment.customerId,
            );
            return (
              <article key={appointment.id} className="card p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-bold text-plum">
                      {formatTime(appointment.startAt)}–
                      {formatTime(appointment.endAt)}｜
                      {customer?.name ?? "未命名客戶"}
                    </p>
                    <p className="mt-1 text-sm text-ink/60">
                      {namesFromIds(appointment.serviceIds, data.services)}
                    </p>
                  </div>
                  <StatusPill>{statusLabel(appointment.status)}</StatusPill>
                </div>
                <div className="mt-4 rounded-3xl bg-blush p-4 text-sm">
                  <strong>注意事項：</strong>
                  {customer?.cautions.join("、") || "無"}
                  <br />
                  <strong>偏好：</strong>
                  {customer?.preferences.join("、") || "無"}
                </div>
              </article>
            );
          })
        ) : (
          <EmptyState
            title="目前沒有指派給你的預約"
            action="當預約指定到技師後，會顯示服務紀錄與客戶注意事項。"
          />
        )}
      </div>
    </AppShell>
  );
}

export function ReportsView({ data }: { data: AppData }) {
  const metrics = dashboardMetrics(
    new Date(),
    data.appointments,
    data.orders,
    data.customers,
    data.services,
    data.staff,
  );
  const avg = data.orders.length
    ? metrics.monthRevenue / data.orders.length
    : 0;
  const returningRate = data.customers.length
    ? Math.round((metrics.returningCustomers / data.customers.length) * 100)
    : 0;
  const lowStockCount = data.inventory.filter(
    (item) => item.quantity <= item.lowStockThreshold,
  ).length;
  const topService = metrics.serviceRanking[0];
  const inventoryNet = data.inventoryMovements.reduce(
    (sum, movement) => sum + movement.quantity,
    0,
  );
  const inventoryOutflow = data.inventoryMovements
    .filter((movement) => movement.quantity < 0)
    .reduce((sum, movement) => sum + Math.abs(movement.quantity), 0);
  const workspaceEmpty = isWorkspaceEmpty(data);
  const setupGuide = !data.needsWorkspace ? getWorkspaceSetupGuide(data) : null;
  return (
    <AppShell
      title="報表分析"
      subtitle="日 / 月營收、服務排行、技師排行、回訪率、客單價、來源與庫存消耗分析。"
      {...shellProps(data)}
    >
      {setupGuide ? (
        <div className="mb-5">
          <SetupGuide
            title={setupGuide.title}
            action={setupGuide.action}
            links={setupGuide.links}
          />
        </div>
      ) : null}
      {workspaceEmpty && !setupGuide ? (
        <div className="mb-5">
          <SetupGuide
            title="報表會在第一筆營運資料後開始有內容"
            action="先建立服務、客戶與第一筆預約或訂單，這裡就會開始出現營收、排行與來源分析。"
            links={[
              { href: "/settings?message=settings_setup_hint", label: "先去設定" },
              { href: "/appointments", label: "建立預約" },
              { href: "/customers", label: "建立客戶" },
            ]}
          />
        </div>
      ) : null}
      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard
          label="月營收"
          value={currency.format(metrics.monthRevenue)}
          hint="本月已建立訂單"
        />
        <MetricCard
          label="客單價"
          value={currency.format(avg)}
          hint="訂單平均金額"
        />
        <MetricCard
          label="回訪率"
          value={`${returningRate}%`}
          hint="有 lastVisit 的客戶比例"
        />
        <MetricCard
          label="低庫存"
          value={`${lowStockCount}`}
          hint="目前低於警戒值的品項"
        />
      </section>
      <section className="mt-5 card p-5">
        <h2 className="text-lg font-bold text-plum">本月跟進焦點</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-4">
            <div className="text-sm text-ink/60">待收款</div>
            <div className="mt-1 text-lg font-bold text-plum">
              {currency.format(metrics.pendingPayment)}
            </div>
          </div>
          <div className="rounded-2xl bg-white p-4">
            <div className="text-sm text-ink/60">今日待處理</div>
            <div className="mt-1 text-lg font-bold text-plum">
              {metrics.upcoming.length} 筆預約
            </div>
          </div>
          <div className="rounded-2xl bg-white p-4">
            <div className="text-sm text-ink/60">熱門服務</div>
            <div className="mt-1 text-lg font-bold text-plum">
              {topService ? `${topService.name} × ${topService.count}` : "暫無資料"}
            </div>
          </div>
        </div>
      </section>
      <section className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="text-lg font-bold text-plum">預約來源</h2>
          {data.appointments.length ? (
            sources.map((source) => (
              <div
                key={source}
                className="mt-3 flex flex-col gap-2 rounded-2xl bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <span>{source}</span>
                <StatusPill>
                  {
                    data.appointments.filter((item) => item.source === source)
                      .length
                  }{" "}
                  筆
                </StatusPill>
              </div>
            ))
          ) : (
            <EmptyState
              title="目前還沒有可分析的預約來源"
              action="先建立第一筆預約，來源分析與到店轉換就會自動出現在這裡。"
            />
          )}
        </div>
        <div className="card p-5">
          <h2 className="text-lg font-bold text-plum">服務銷售排行</h2>
          {metrics.serviceRanking.length ? (
            metrics.serviceRanking.map((item, index) => (
              <div
                key={`${item.name}-${index}`}
                className="mt-3 flex flex-col gap-2 rounded-2xl bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="min-w-0 break-words">{item.name}</span>
                <strong>{item.count}</strong>
              </div>
            ))
          ) : (
            <EmptyState
              title="目前還沒有服務排行"
              action="建立服務與預約後，這裡會自動整理出最常被選擇的項目。"
            />
          )}
        </div>
      </section>
      <section className="mt-5 grid gap-4 md:grid-cols-3">
        <MetricCard
          label="庫存淨異動"
          value={inventoryNet.toFixed(2)}
          hint="入庫與出庫、調整的淨變化"
        />
        <MetricCard
          label="庫存出庫"
          value={inventoryOutflow.toFixed(2)}
          hint="扣料與報廢合計"
        />
        <MetricCard
          label="庫存品項"
          value={`${data.inventory.length}`}
          hint="現有在庫品項數"
        />
      </section>
    </AppShell>
  );
}

export function SettingsView({
  data,
  notice,
}: {
  data: AppData;
  notice?: Notice;
}) {
  const parsedHours = useMemo(() => {
    try {
      return JSON.stringify(
        JSON.parse(data.workspace.businessHours || "{}"),
        null,
        2,
      );
    } catch {
      return data.workspace.businessHours || "{}";
    }
  }, [data.workspace.businessHours]);
  const setupGuide = !data.needsWorkspace ? getWorkspaceSetupGuide(data) : null;

  return (
    <AppShell
      title="店鋪設定"
      subtitle="店鋪基本資料、預約規則、收款、稅務、品牌外觀與多店設定。"
      {...shellProps(data)}
    >
      <NoticeBanner notice={notice} />
      {setupGuide ? (
        <div className="mb-5">
          <SetupGuide
            title={setupGuide.title}
            action={setupGuide.action}
            links={setupGuide.links}
          />
        </div>
      ) : null}
      {isWorkspaceEmpty(data) && !setupGuide ? (
        <div className="mb-5">
          <SetupGuide
            title="先把店鋪骨架補齊"
            action="設定店名與營業資訊後，下一步請建立服務分類、員工與客戶，後續頁面才不會是空的。"
            links={[
              { href: "/services", label: "建立服務" },
              { href: "/staff", label: "建立員工" },
              { href: "/customers", label: "建立客戶" },
            ]}
          />
        </div>
      ) : null}
      <form action={updateWorkspaceSettings} className="card p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-semibold text-plum">
            店鋪名稱
            <input
              required
              name="name"
              className={fieldClass()}
              defaultValue={data.workspace.name}
            />
          </label>
          <label className="block text-sm font-semibold text-plum">
            電話
            <input
              name="phone"
              className={fieldClass()}
              defaultValue={data.workspace.phone}
            />
          </label>
          <label className="block text-sm font-semibold text-plum md:col-span-2">
            地址
            <input
              name="address"
              className={fieldClass()}
              defaultValue={data.workspace.address}
            />
          </label>
          <label className="block text-sm font-semibold text-plum">
            品牌色
            <input
              name="brand_color"
              type="color"
              className="mobile-tap mt-2 h-12 w-full rounded-2xl border border-champagne p-1"
              defaultValue={data.workspace.brandColor}
            />
          </label>
          <label className="block text-sm font-semibold text-plum md:col-span-2">
            營業時間 JSON
            <textarea
              name="business_hours"
              className={`${fieldClass()} min-h-40 font-mono text-xs`}
              defaultValue={parsedHours}
            />
            <p className="mt-2 text-xs font-normal text-ink/60">
              可先保留 `{}`，之後再補上各日的營業時段。
            </p>
          </label>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {data.categories.length ? (
            data.categories.map((category) => (
              <div
                key={category.id}
                className="rounded-2xl bg-blush p-4 font-medium"
              >
                服務分類：{category.name}
              </div>
            ))
          ) : (
            <EmptyState
              title="尚未建立服務分類"
              action="先到服務頁建立第一個服務，系統會依分類自動整理後續的報表與排程。"
            />
          )}
          <div className="rounded-2xl bg-blush p-4 font-medium">
            設定會直接更新目前 workspace，並受 Supabase RLS 與 owner/admin
            policy 保護。
          </div>
        </div>
        <div className="mt-5">
          <SubmitButton>儲存設定</SubmitButton>
        </div>
      </form>
    </AppShell>
  );
}
