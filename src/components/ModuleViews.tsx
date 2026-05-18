"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
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
import { createStaffAction, createStaffInviteAction, updateStaffAction } from "@/app/staff/actions";
import { recordInventoryMovementAction } from "@/app/inventory/actions";
import { AppShell } from "@/components/AppShell";
import { FormNotice } from "@/components/FormNotice";
import { ModuleTable } from "@/components/ModuleTable";
import { MetricCard, StatusPill, EmptyState } from "@/components/ui";
import { statusLabel } from "@/lib/appointments";
import { dashboardMetrics } from "@/lib/analytics";
import { orderTotal, outstandingAmount } from "@/lib/orders";
import { can, roleLabel } from "@/lib/permissions";
import type { AppData } from "@/lib/app-data";
import type { Appointment, Customer, Order, ServiceItem, StaffMember } from "@/lib/types";
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
const orderStatuses = ["unpaid", "partial", "paid", "refunded"] as const;
const tiers = ["新客", "一般", "VIP", "VVIP"];
const staffRoles = ["owner", "admin", "technician", "front_desk", "staff"] as const;
const inventoryMovementTypes = ["purchase", "consume", "adjust"] as const;
type Notice = { kind: "error" | "success"; message: string };

function NoticeBanner({ notice }: { notice?: Notice }) {
  if (!notice) return null;
  return <FormNotice kind={notice.kind}>{notice.message}</FormNotice>;
}

function SubmitButton({
  children,
  tone = "plum",
}: {
  children: React.ReactNode;
  tone?: "plum" | "white" | "danger";
}) {
  const { pending } = useFormStatus();
  const className =
    tone === "danger"
      ? "mobile-tap rounded-2xl bg-rose px-4 py-3 font-semibold text-white disabled:opacity-60"
      : tone === "white"
        ? "mobile-tap rounded-2xl bg-white px-4 py-3 font-semibold text-plum disabled:opacity-60"
        : "mobile-tap rounded-2xl bg-plum px-4 py-3 font-semibold text-white disabled:opacity-60";
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? "儲存中…" : children}
    </button>
  );
}

function fieldClass() {
  return "mt-2 w-full rounded-2xl border border-champagne bg-white p-3 text-ink";
}

function compactDateTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function namesFromIds(ids: string[], services: ServiceItem[]) {
  return (
    ids
      .map((id) => services.find((service) => service.id === id)?.name)
      .filter(Boolean)
      .join("、") || "-"
  );
}

function CustomerForm({ customer }: { customer?: Customer }) {
  return (
    <form action={saveCustomer} className="card p-5">
      <input type="hidden" name="id" value={customer?.id ?? ""} />
      <h2 className="text-lg font-bold text-plum">
        {customer ? "編輯客戶" : "新增客戶"}
      </h2>
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
}: {
  service?: ServiceItem;
  categories: AppData["categories"];
}) {
  return (
    <form action={saveService} className="card p-5">
      <input type="hidden" name="id" value={service?.id ?? ""} />
      <h2 className="text-lg font-bold text-plum">
        {service ? "編輯服務" : "新增服務"}
      </h2>
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
        <label className="flex items-center gap-3 rounded-2xl bg-blush p-4 font-semibold text-plum">
          <input
            type="checkbox"
            name="enabled"
            defaultChecked={service?.enabled ?? true}
          />{" "}
          啟用服務
        </label>
        <label className="flex items-center gap-3 rounded-2xl bg-blush p-4 font-semibold text-plum">
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
}: {
  data: AppData;
  appointment?: Appointment;
}) {
  const fallbackStart = compactDateTime(new Date().toISOString());
  const selectedServiceIds = new Set(appointment?.serviceIds ?? []);
  return (
    <form action={saveAppointment} className="card p-5">
      <input type="hidden" name="id" value={appointment?.id ?? ""} />
      <h2 className="text-lg font-bold text-plum">
        {appointment ? "編輯預約" : "新增預約"}
      </h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="text-sm font-semibold text-plum">
          客戶
          <select
            required
            name="customer_id"
            className={fieldClass()}
            defaultValue={appointment?.customerId ?? ""}
          >
            <option value="" disabled>
              請選擇
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
              data.staff.find((member) => member.role === "technician")?.id ??
              data.staff[0]?.id ??
              ""
            }
          >
            {data.staff
              .filter((member) => member.active)
              .map((member) => (
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
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {data.services
              .filter((service) => service.enabled || selectedServiceIds.has(service.id))
              .map((service) => (
                <label
                  key={service.id}
                  className="flex items-center gap-3 rounded-2xl bg-blush p-3"
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
        <SubmitButton>{appointment ? "更新預約" : "建立預約"}</SubmitButton>
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
  return (
    <form action={saveOrder} className="card p-5">
      <h2 className="text-lg font-bold text-plum">新增訂單 / 預約轉結帳</h2>
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
            defaultValue={data.staff[0]?.id ?? ""}
          >
            {data.staff
              .filter((member) => member.active)
              .map((member) => (
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
                {method}
              </option>
            ))}
          </select>
        </label>
        <fieldset className="md:col-span-2 rounded-3xl border border-champagne p-4">
          <legend className="px-2 text-sm font-bold text-plum">服務明細</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {data.services
              .filter((service) => service.enabled)
              .map((service) => (
                <label
                  key={service.id}
                  className="flex items-center gap-3 rounded-2xl bg-blush p-3"
                >
                  <input
                    type="checkbox"
                    name="line_service_ids"
                    value={service.id}
                  />{" "}
                  <span>
                    {service.name}
                    <small className="ml-2 text-ink/50">
                      {currency.format(service.price)}
                    </small>
                  </span>
                </label>
              ))}
          </div>
        </fieldset>
        <label className="text-sm font-semibold text-plum">
          自訂項目
          <input
            name="custom_line_name"
            className={fieldClass()}
            placeholder="卸甲 / 產品"
          />
        </label>
        <label className="text-sm font-semibold text-plum">
          自訂單價
          <input
            type="number"
            min="0"
            name="custom_line_price"
            className={fieldClass()}
            defaultValue={0}
          />
        </label>
        <label className="text-sm font-semibold text-plum">
          自訂數量
          <input
            type="number"
            min="1"
            name="custom_line_quantity"
            className={fieldClass()}
            defaultValue={1}
          />
        </label>
        <label className="text-sm font-semibold text-plum">
          折扣
          <input
            type="number"
            min="0"
            name="discount"
            className={fieldClass()}
            defaultValue={0}
          />
        </label>
        <label className="text-sm font-semibold text-plum">
          小費
          <input
            type="number"
            min="0"
            name="tip"
            className={fieldClass()}
            defaultValue={0}
          />
        </label>
        <label className="text-sm font-semibold text-plum">
          已收金額
          <input
            type="number"
            min="0"
            name="paid_amount"
            className={fieldClass()}
            defaultValue={0}
          />
        </label>
        <label className="text-sm font-semibold text-plum">
          付款狀態
          <select name="status" className={fieldClass()} defaultValue="">
            <option value="">自動判斷</option>
            {orderStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="mt-4">
        <SubmitButton>建立訂單</SubmitButton>
      </div>
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
        className="rounded-xl border border-champagne p-2"
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
        className="rounded-xl border border-champagne p-2"
        placeholder="或輸入自訂項目"
      />
      <input
        type="number"
        min="0"
        name="custom_line_price"
        className="rounded-xl border border-champagne p-2"
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

function shellProps(data: AppData) {
  return {
    workspace: data.workspace,
    role: data.currentMember?.role ?? "owner",
    notice: data.needsWorkspace
      ? "尚未完成 workspace 初始化，請重新登入或聯絡管理員。"
      : liveNotice,
  };
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

  return (
    <AppShell
      title="營運總覽"
      subtitle="今日預約、營收、技師業績、熱門服務與風險提醒集中管理。"
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
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-plum">即將到店客人</h2>
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
                    <div className="flex items-center justify-between">
                      <strong>
                        {formatTime(appointment.startAt)}{" "}
                        {customer?.name ?? "未命名客戶"}
                      </strong>
                      <StatusPill>{statusLabel(appointment.status)}</StatusPill>
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
                action="新增第一筆預約後，這裡會顯示今日與近期排程。"
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
            {metrics.technicianRevenue.map((item, index) => (
              <div
                key={`${item.name}-${index}`}
                className="flex items-center justify-between rounded-2xl bg-white p-4"
              >
                <span>
                  {item.name}
                  <small className="ml-2 text-ink/45">
                    服務 {item.services} 次
                  </small>
                </span>
                <strong>{currency.format(item.revenue)}</strong>
              </div>
            ))}
          </div>
        </div>
        <div className="card p-5">
          <h2 className="text-lg font-bold text-plum">熱門服務</h2>
          <div className="mt-4 space-y-3">
            {metrics.serviceRanking.map((item, index) => (
              <div
                key={`${item.name}-${index}`}
                className="flex items-center justify-between rounded-2xl bg-white p-4"
              >
                <span>{item.name}</span>
                <StatusPill tone="plum">{item.count} 筆</StatusPill>
              </div>
            ))}
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

  return (
    <AppShell
      title="預約系統"
      subtitle="新增、修改、取消預約；日曆 / 列表檢視與技師衝突檢查。"
      {...shellProps(data)}
    >
      <NoticeBanner notice={notice} />
      <div className="mb-5 grid gap-3 md:grid-cols-2">
        <AppointmentForm data={data} appointment={editing} />
        <div className="card p-5">
          <h2 className="text-lg font-bold text-plum">預約資料會即時持久化</h2>
          <p className="mt-2 text-sm text-ink/65">
            新增或編輯預約會寫入 Supabase，並同步
            appointment_services。系統會阻擋同一技師重疊時段。
          </p>
          {editing ? (
            <button
              className="mobile-tap mt-4 rounded-2xl bg-white font-semibold text-plum"
              onClick={() => setEditingId(null)}
            >
              清除編輯狀態
            </button>
          ) : null}
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
            render: (row) => <StatusPill>{statusLabel(row.status)}</StatusPill>,
          },
          {
            key: "actions",
            label: "操作",
            render: (row) => (
              <div className="flex flex-wrap gap-2">
                <button
                  className="rounded-xl bg-champagne px-3 py-2 font-semibold text-plum"
                  onClick={() => setEditingId(row.id)}
                >
                  編輯
                </button>
                <form action={updateAppointmentStatus} className="flex gap-2">
                  <input type="hidden" name="id" value={row.id} />
                  <select
                    name="status"
                    className="rounded-xl border border-champagne px-2 py-2"
                    defaultValue={row.status}
                  >
                    {appointmentStatuses.map((status) => (
                      <option key={status} value={status}>
                        {statusLabel(status)}
                      </option>
                    ))}
                  </select>
                  <SubmitButton tone="white">更新</SubmitButton>
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

  return (
    <AppShell
      title="服務項目管理"
      subtitle="分類、價格、所需時間、說明、啟用狀態與加購項目管理。"
      {...shellProps(data)}
    >
      <NoticeBanner notice={notice} />
      <div className="mb-5">
        <ServiceForm service={editing} categories={data.categories} />
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
                  className="rounded-xl bg-champagne px-3 py-2 font-semibold text-plum"
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

  return (
    <AppShell
      title="客戶 CRM"
      subtitle="電話、生日、LINE、偏好、過敏禁忌、會員等級與回訪提醒。"
      {...shellProps(data)}
    >
      <NoticeBanner notice={notice} />
      <div className="mb-5">
        <CustomerForm customer={editing} />
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
            render: (row) => row.nextReminder ?? "-",
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
                  className="rounded-xl bg-champagne px-3 py-2 font-semibold text-plum"
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
  const canManageInventory = can(data.currentMember?.role ?? "staff", "inventory");
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
      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]">
        {canManageInventory ? <InventoryMovementForm data={data} /> : null}
        <div className="card p-5">
          <h2 className="text-lg font-bold text-plum">庫存運作</h2>
          <div className="mt-4 space-y-3 text-sm text-ink/70">
            <p>入庫、出庫、調整都會寫入 `inventory_movements`，並同步更新品項數量。</p>
            <p>出庫前會檢查餘量，不允許扣成負數。</p>
            <p>這裡是後續結算、報表與耗材成本的共同來源。</p>
          </div>
        </div>
      </div>
      <div className="mt-5">
        <ModuleTable
          rows={data.inventory}
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
  return (
    <AppShell
      title="訂單 / 結帳 / 收款"
      subtitle="從預約轉訂單，支援折扣、小費、多付款方式、收據明細與每日結帳。"
      {...shellProps(data)}
    >
      <NoticeBanner notice={notice} />
      <div className="mb-5">
        <OrderForm data={data} />
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
                    className="mb-2 flex items-center justify-between gap-2"
                  >
                    <span>
                      {line.name} x{line.quantity}
                    </span>
                    {line.id ? (
                      <form action={removeOrderLine}>
                        <input type="hidden" name="order_id" value={row.id} />
                        <input type="hidden" name="line_id" value={line.id} />
                        <SubmitButton tone="white">移除</SubmitButton>
                      </form>
                    ) : null}
                  </div>
                ))}
                <AddLineForm order={row} services={data.services} />
              </div>
            ),
          },
          {
            key: "total",
            label: "總額",
            sortValue: (row) => orderTotal(row),
            render: (row) => currency.format(orderTotal(row)),
          },
          {
            key: "paid",
            label: "待收",
            render: (row) => currency.format(outstandingAmount(row)),
          },
          {
            key: "status",
            label: "狀態",
            render: (row) => (
              <StatusPill tone={row.status === "paid" ? "sage" : "amber"}>
                {row.status}
              </StatusPill>
            ),
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
  const editing = data.staff.find((staff) => staff.id === editingId);
  const canManageStaff = can(data.currentMember?.role ?? "staff", "staff");
  const activeStaff = data.staff.filter((staff) => staff.active).length;
  const technicians = data.staff.filter((staff) => staff.role === "technician" && staff.active).length;
  const admins = data.staff.filter((staff) => (staff.role === "owner" || staff.role === "admin") && staff.active).length;

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
              <input className="mt-2 w-full rounded-2xl border border-champagne p-3" name="displayName" required />
            </label>
            <label className="block text-sm font-semibold text-plum">
              Email
              <input className="mt-2 w-full rounded-2xl border border-champagne p-3" name="email" type="email" autoComplete="email" required />
            </label>
            <label className="block text-sm font-semibold text-plum">
              電話
              <input className="mt-2 w-full rounded-2xl border border-champagne p-3" name="phone" autoComplete="tel" />
            </label>
            <label className="block text-sm font-semibold text-plum">
              角色
              <select className="mt-2 w-full rounded-2xl border border-champagne p-3" name="role" defaultValue="staff">
                <option value="staff">一般員工</option>
                <option value="front_desk">櫃台</option>
                <option value="technician">技師</option>
                <option value="admin">管理員</option>
                <option value="owner">店主</option>
              </select>
            </label>
            <label className="block text-sm font-semibold text-plum">
              抽成
              <input className="mt-2 w-full rounded-2xl border border-champagne p-3" name="commissionRate" type="number" min="0" max="1" step="0.01" defaultValue="0" />
            </label>
            <label className="block text-sm font-semibold text-plum">
              專長
              <textarea className="mt-2 min-h-24 w-full rounded-2xl border border-champagne p-3" name="specialties" placeholder="例如：凝膠美甲, 眉型設計" />
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
        {canManageStaff ? <StaffForm staff={editing} /> : null}
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
              className="mobile-tap mt-4 rounded-2xl bg-white font-semibold text-plum"
              onClick={() => setEditingId(null)}
            >
              清除編輯狀態
            </button>
          ) : null}
        </div>
      </div>
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
            label: "今日班表",
            render: (row) => {
              const shift = data.shifts.find((item) => item.staffId === row.id);
              return shift ? `${shift.startTime}–${shift.endTime}` : "休息";
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
                    <button
                      className="rounded-xl bg-champagne px-3 py-2 font-semibold text-plum"
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
  const inventoryNet = data.inventoryMovements.reduce(
    (sum, movement) => sum + movement.quantity,
    0,
  );
  const inventoryOutflow = data.inventoryMovements
    .filter((movement) => movement.quantity < 0)
    .reduce((sum, movement) => sum + Math.abs(movement.quantity), 0);
  return (
    <AppShell
      title="報表分析"
      subtitle="日 / 月營收、服務排行、技師排行、回訪率、客單價、來源與庫存消耗分析。"
      {...shellProps(data)}
    >
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
      <section className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="font-bold text-plum">預約來源</h2>
          {sources.map((source) => (
            <div
              key={source}
              className="mt-3 flex justify-between rounded-2xl bg-white p-4"
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
          ))}
        </div>
        <div className="card p-5">
          <h2 className="font-bold text-plum">服務銷售排行</h2>
          {metrics.serviceRanking.map((item, index) => (
            <div
              key={`${item.name}-${index}`}
              className="mt-3 flex justify-between rounded-2xl bg-white p-4"
            >
              <span>{item.name}</span>
              <strong>{item.count}</strong>
            </div>
          ))}
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

  return (
    <AppShell
      title="設定頁"
      subtitle="店鋪基本資料、預約規則、收款、稅務、品牌外觀與多店設定。"
      {...shellProps(data)}
    >
      <NoticeBanner notice={notice} />
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
              className="mt-2 h-12 w-full rounded-2xl border border-champagne p-1"
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
          </label>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {data.categories.map((category) => (
            <div
              key={category.id}
              className="rounded-2xl bg-blush p-4 font-medium"
            >
              服務分類：{category.name}
            </div>
          ))}
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
