"use client";

import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { updateWorkspaceSettingsAction } from "@/app/settings/actions";
import { createCustomerAction } from "@/app/customers/actions";
import { updateCustomerAction } from "@/app/customers/update-actions";
import { createAppointmentAction } from "@/app/appointments/actions";
import { cancelAppointmentAction, updateAppointmentAction, updateAppointmentStatusAction } from "@/app/appointments/update-actions";
import { updateStaffAction } from "@/app/staff/actions";
import { createServiceAction } from "@/app/services/actions";
import { updateServiceAction } from "@/app/services/update-actions";
import { ModuleTable } from "@/components/ModuleTable";
import { FormNotice } from "@/components/FormNotice";
import { MetricCard, StatusPill, EmptyState, LoadingState } from "@/components/ui";
import { statusLabel } from "@/lib/appointments";
import { dashboardMetrics } from "@/lib/analytics";
import { orderTotal, outstandingAmount } from "@/lib/orders";
import { roleLabel } from "@/lib/permissions";
import type { AppData } from "@/lib/app-data";
import { currency, formatDate, formatDateTime, formatDateTimeLocalInput, formatTime } from "@/lib/utils";

const liveNotice = "正式資料模式：資料由 Supabase Auth + RLS 依 workspace 隔離。";
const sources = ["LINE", "Instagram", "電話", "現場", "官網"];

function useClientReady() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  return ready;
}

function shellProps(data: AppData) {
  return {
    workspace: data.workspace,
    role: data.currentMember?.role ?? "owner",
    notice: data.needsWorkspace ? "尚未完成 workspace 初始化，請重新登入或聯絡管理員。" : liveNotice
  };
}

export function DashboardView({ data }: { data: AppData }) {
  const ready = useClientReady();
  if (!ready) {
    return (
      <AppShell title="營運總覽" subtitle="今日預約、營收、技師業績、熱門服務與風險提醒集中管理。" {...shellProps(data)}>
        <LoadingState />
      </AppShell>
    );
  }

  const metrics = dashboardMetrics(new Date(), data.appointments, data.orders, data.customers, data.services, data.staff);

  return (
    <AppShell title="營運總覽" subtitle="今日預約、營收、技師業績、熱門服務與風險提醒集中管理。" {...shellProps(data)}>
      {data.needsWorkspace ? <EmptyState title="尚未完成 workspace 初始化" action="請重新登入，系統會依註冊資料補齊 workspace、owner profile 與 membership。" /> : null}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="今日預約數" value={metrics.todayAppointments} hint="含待確認與已確認" />
        <MetricCard label="今日營收" value={currency.format(metrics.todayRevenue)} hint="依訂單建立日統計" />
        <MetricCard label="本月營收" value={currency.format(metrics.monthRevenue)} hint="可接正式報表週期" />
        <MetricCard label="待付款" value={currency.format(metrics.pendingPayment)} hint="未付款 / 部分付款" />
      </section>
      <section className="mt-5 grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
        <div className="card p-5">
          <div className="flex items-center justify-between"><h2 className="text-lg font-bold text-plum">即將到店客人</h2><StatusPill tone="amber">取消率 {(metrics.cancellationRate * 100).toFixed(0)}% / 未到率 {(metrics.noShowRate * 100).toFixed(0)}%</StatusPill></div>
          <div className="mt-4 space-y-3">
            {metrics.upcoming.length ? metrics.upcoming.map((appointment) => {
              const customer = data.customers.find((item) => item.id === appointment.customerId);
              const technician = data.staff.find((item) => item.id === appointment.technicianId);
              return <article key={appointment.id} className="rounded-3xl bg-blush p-4"><div className="flex items-center justify-between"><strong>{formatTime(appointment.startAt)} {customer?.name ?? "未命名客戶"}</strong><StatusPill>{statusLabel(appointment.status)}</StatusPill></div><p className="mt-1 text-sm text-ink/60">技師 {technician?.name ?? "未指派"}｜{appointment.note ?? "無備註"}</p></article>;
            }) : <EmptyState title="目前沒有即將到店預約" action="新增第一筆預約後，這裡會顯示今日與近期排程。" />}
          </div>
        </div>
        <div className="card p-5"><h2 className="text-lg font-bold text-plum">新客 / 回訪客</h2><div className="mt-4 grid grid-cols-2 gap-3"><MetricCard label="新客" value={metrics.newCustomers} hint="會員等級為新客"/><MetricCard label="回訪客" value={metrics.returningCustomers} hint="已有上次到訪日"/></div></div>
      </section>
      <section className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="card p-5"><h2 className="text-lg font-bold text-plum">技師業績</h2><div className="mt-4 space-y-3">{metrics.technicianRevenue.map((item) => <div key={item.name} className="flex items-center justify-between rounded-2xl bg-white p-4"><span>{item.name}<small className="ml-2 text-ink/45">服務 {item.services} 次</small></span><strong>{currency.format(item.revenue)}</strong></div>)}</div></div>
        <div className="card p-5"><h2 className="text-lg font-bold text-plum">熱門服務</h2><div className="mt-4 space-y-3">{metrics.serviceRanking.map((item) => <div key={item.name} className="flex items-center justify-between rounded-2xl bg-white p-4"><span>{item.name}</span><StatusPill tone="plum">{item.count} 筆</StatusPill></div>)}</div></div>
      </section>
    </AppShell>
  );
}

export function AppointmentsView({ data, notice }: { data: AppData; notice?: { kind: "error" | "success"; message: string } }) {
  const ready = useClientReady();
  const createFormRef = useRef<HTMLFormElement | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  if (!ready) {
    return (
      <AppShell title="預約系統" subtitle="新增、修改、取消預約；日曆 / 列表檢視與技師衝突檢查。" {...shellProps(data)}>
        <LoadingState />
      </AppShell>
    );
  }

  const canCreateAppointments = !data.needsWorkspace && (data.currentMember ? ["owner", "admin", "front_desk"].includes(data.currentMember.role) : true);
  const activeTechnicians = data.staff.filter((staff) => staff.role === "technician" && staff.active);
  const bookableServices = data.services.filter((service) => service.enabled);
  const canCreateAppointmentForm = canCreateAppointments && data.customers.length > 0 && activeTechnicians.length > 0 && bookableServices.length > 0;
  const groupedByDate = data.appointments.reduce<Record<string, typeof data.appointments>>((accumulator, appointment) => {
    const key = formatDate(appointment.startAt);
    accumulator[key] ??= [];
    accumulator[key].push(appointment);
    return accumulator;
  }, {});
  const sortedCalendarDays = Object.entries(groupedByDate).sort((left, right) => left[0].localeCompare(right[0]));

  return (
    <AppShell title="預約系統" subtitle="新增、修改、取消預約；日曆 / 列表檢視與技師衝突檢查。" {...shellProps(data)}>
      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <button
          type="button"
          className="mobile-tap rounded-2xl bg-plum font-semibold text-white"
          onClick={() => createFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
        >
          ＋ 新增預約
        </button>
        <button
          type="button"
          className={`mobile-tap rounded-2xl font-semibold ${viewMode === "calendar" ? "bg-plum text-white" : "bg-white text-plum"}`}
          onClick={() => setViewMode("calendar")}
        >
          日曆檢視
        </button>
        <button
          type="button"
          className={`mobile-tap rounded-2xl font-semibold ${viewMode === "list" ? "bg-plum text-white" : "bg-white text-plum"}`}
          onClick={() => setViewMode("list")}
        >
          列表檢視
        </button>
      </div>
      <div className="grid gap-5">
        {notice ? <FormNotice kind={notice.kind}>{notice.message}</FormNotice> : null}
        {viewMode === "calendar" ? (
          <div className="card p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-plum">預約日曆</h2>
              <StatusPill tone="plum">{data.appointments.length} 筆預約</StatusPill>
            </div>
            <div className="mt-4 grid gap-3">
              {sortedCalendarDays.length ? sortedCalendarDays.map(([date, appointments]) => (
                <article key={date} className="rounded-3xl bg-blush p-4">
                  <div className="flex items-center justify-between gap-3">
                    <strong className="text-plum">{date}</strong>
                    <StatusPill>{appointments.length} 筆</StatusPill>
                  </div>
                  <div className="mt-3 space-y-2">
                    {appointments.map((appointment) => {
                      const customer = data.customers.find((item) => item.id === appointment.customerId);
                      const technician = data.staff.find((item) => item.id === appointment.technicianId);
                      return (
                        <div key={appointment.id} className="rounded-2xl bg-white p-3 text-sm">
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                            <strong>{formatTime(appointment.startAt)}–{formatTime(appointment.endAt)}｜{customer?.name ?? "未命名客戶"}</strong>
                            <StatusPill>{statusLabel(appointment.status)}</StatusPill>
                          </div>
                          <p className="mt-1 text-ink/60">技師 {technician?.name ?? "未指派"}｜{appointment.note ?? "無備註"}</p>
                        </div>
                      );
                    })}
                  </div>
                </article>
              )) : <EmptyState title="目前沒有預約" action="建立第一筆預約後，這裡會顯示以日期分組的工作排程。" />}
            </div>
          </div>
        ) : null}
        {viewMode === "list" && canCreateAppointments ? (
          <form ref={createFormRef} action={createAppointmentAction} className="card p-5">
            <h2 className="text-lg font-bold text-plum">建立預約</h2>
            <p className="mt-1 text-sm text-ink/60">選擇客戶、技師、時間與服務項目後，系統會自動檢查技師衝突。</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-semibold text-plum">
                客戶
                <select className="mt-2 w-full rounded-2xl border border-champagne p-3" name="customerId" required defaultValue="">
                  <option value="" disabled>請選擇客戶</option>
                  {data.customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}｜{customer.phone}</option>)}
                </select>
              </label>
              <label className="block text-sm font-semibold text-plum">
                技師
                <select className="mt-2 w-full rounded-2xl border border-champagne p-3" name="technicianId" required defaultValue="">
                  <option value="" disabled>請選擇技師</option>
                  {activeTechnicians.map((staff) => <option key={staff.id} value={staff.id}>{staff.name}</option>)}
                </select>
              </label>
              <label className="block text-sm font-semibold text-plum">
                預約時間
                <input className="mt-2 w-full rounded-2xl border border-champagne p-3" name="startAt" type="datetime-local" required />
              </label>
              <label className="block text-sm font-semibold text-plum">
                來源
                <select className="mt-2 w-full rounded-2xl border border-champagne p-3" name="source" required defaultValue="LINE">
                  {sources.map((source) => <option key={source} value={source}>{source}</option>)}
                </select>
              </label>
              <label className="block text-sm font-semibold text-plum md:col-span-2">
                服務項目
                <div className="mt-2 grid gap-2 rounded-2xl border border-champagne p-3">
                  {bookableServices.map((service) => (
                    <label key={service.id} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 text-sm">
                      <span>
                        <strong>{service.name}</strong>
                        <span className="ml-2 text-ink/55">{service.category}</span>
                      </span>
                      <span className="flex items-center gap-2 text-ink/60">
                        <span>{currency.format(service.price)}</span>
                        <input type="checkbox" name="serviceIds" value={service.id} />
                      </span>
                    </label>
                  ))}
                </div>
              </label>
              <label className="block text-sm font-semibold text-plum md:col-span-2">
                備註
                <textarea className="mt-2 min-h-24 w-full rounded-2xl border border-champagne p-3" name="note" placeholder="例如：首次到店、請提早 10 分鐘、特殊注意事項" />
              </label>
            </div>
            {!canCreateAppointmentForm ? <p className="mt-4 rounded-2xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">目前缺少可建立預約的資料，請先確認有客戶、啟用中的服務與在職技師。</p> : null}
            <button type="submit" className="mobile-tap mt-5 rounded-2xl bg-plum font-semibold text-white" disabled={!canCreateAppointmentForm}>
              建立預約
            </button>
          </form>
        ) : null}
        {viewMode === "list" ? (
          <ModuleTable
            rows={data.appointments}
            searchPlaceholder="搜尋客戶、技師、來源、備註"
            filterOptions={["pending", "confirmed", "completed", "no_show"]}
            emptyTitle="目前沒有預約"
            columns={[
              { key: "time", label: "日期 / 時間", sortValue: (row) => row.startAt, render: (row) => <><strong>{formatDate(row.startAt)}</strong><p className="text-ink/60">{formatTime(row.startAt)}–{formatTime(row.endAt)}</p></> },
              { key: "customer", label: "客戶", render: (row) => data.customers.find((item) => item.id === row.customerId)?.name ?? "-" },
              { key: "service", label: "服務", render: (row) => row.serviceIds.map((id) => data.services.find((service) => service.id === id)?.name).filter(Boolean).join("、") || "-" },
              { key: "tech", label: "技師", render: (row) => data.staff.find((item) => item.id === row.technicianId)?.name ?? "-" },
              { key: "status", label: "狀態", render: (row) => <StatusPill>{statusLabel(row.status)}</StatusPill> },
              {
                key: "edit",
                label: "編輯",
                render: (row) => {
                  const editableServices = data.services.filter((service) => service.enabled || row.serviceIds.includes(service.id));
                  return (
                    <form action={updateAppointmentAction} className="grid min-w-[24rem] gap-2 rounded-2xl bg-blush p-3">
                      <input type="hidden" name="appointmentId" value={row.id} />
                      <div className="grid gap-2 sm:grid-cols-2">
                        <label className="text-xs font-semibold text-plum">
                          客戶
                          <select className="mt-1 w-full rounded-xl border border-champagne p-2" name="customerId" defaultValue={row.customerId} required>
                            {data.customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
                          </select>
                        </label>
                        <label className="text-xs font-semibold text-plum">
                          技師
                          <select className="mt-1 w-full rounded-xl border border-champagne p-2" name="technicianId" defaultValue={row.technicianId} required>
                            {activeTechnicians.map((staff) => <option key={staff.id} value={staff.id}>{staff.name}</option>)}
                          </select>
                        </label>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <label className="text-xs font-semibold text-plum">
                          預約時間
                          <input className="mt-1 w-full rounded-xl border border-champagne p-2" name="startAt" type="datetime-local" defaultValue={formatDateTimeLocalInput(row.startAt)} required />
                        </label>
                        <label className="text-xs font-semibold text-plum">
                          來源
                          <select className="mt-1 w-full rounded-xl border border-champagne p-2" name="source" defaultValue={row.source} required>
                            {sources.map((source) => <option key={source} value={source}>{source}</option>)}
                          </select>
                        </label>
                      </div>
                      <label className="text-xs font-semibold text-plum">
                        服務項目
                        <div className="mt-1 grid gap-2 rounded-xl border border-champagne p-2">
                          {editableServices.map((service) => (
                            <label key={service.id} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-xs">
                              <span>
                                <strong>{service.name}</strong>
                                <span className="ml-2 text-ink/55">{service.category}</span>
                              </span>
                              <input type="checkbox" name="serviceIds" value={service.id} defaultChecked={row.serviceIds.includes(service.id)} />
                            </label>
                          ))}
                        </div>
                      </label>
                      <label className="text-xs font-semibold text-plum">
                        備註
                        <textarea className="mt-1 min-h-20 w-full rounded-xl border border-champagne p-2" name="note" defaultValue={row.note ?? ""} />
                      </label>
                      <button type="submit" className="mobile-tap rounded-xl bg-plum px-3 py-2 font-semibold text-white">
                        儲存
                      </button>
                    </form>
                  );
                }
              },
              {
                key: "actions",
                label: "快速操作",
                render: (row) => (
                  <div className="flex flex-wrap gap-2">
                    {row.status === "pending" ? (
                      <form action={updateAppointmentStatusAction}>
                        <input type="hidden" name="appointmentId" value={row.id} />
                        <button type="submit" name="status" value="confirmed" className="rounded-xl bg-champagne px-3 py-2 font-semibold text-plum">
                          確認
                        </button>
                      </form>
                    ) : null}
                    {row.status === "confirmed" ? (
                      <form action={updateAppointmentStatusAction}>
                        <input type="hidden" name="appointmentId" value={row.id} />
                        <button type="submit" name="status" value="in_service" className="rounded-xl bg-sage/15 px-3 py-2 font-semibold text-sage">
                          開始服務
                        </button>
                      </form>
                    ) : null}
                    {row.status === "in_service" ? (
                      <form action={updateAppointmentStatusAction}>
                        <input type="hidden" name="appointmentId" value={row.id} />
                        <button type="submit" name="status" value="completed" className="rounded-xl bg-sage/15 px-3 py-2 font-semibold text-sage">
                          完成
                        </button>
                      </form>
                    ) : null}
                    {row.status !== "cancelled" && row.status !== "completed" ? (
                      <form action={cancelAppointmentAction}>
                        <input type="hidden" name="appointmentId" value={row.id} />
                        <button type="submit" className="rounded-xl bg-rose/10 px-3 py-2 font-semibold text-rose">
                          取消
                        </button>
                      </form>
                    ) : null}
                  </div>
                )
              }
            ]}
          />
        ) : null}
      </div>
    </AppShell>
  );
}

export function CustomersView({ data, notice }: { data: AppData; notice?: { kind: "error" | "success"; message: string } }) {
  const canEditCustomers = !data.needsWorkspace && (data.currentMember ? ["owner", "admin", "front_desk"].includes(data.currentMember.role) : true);

  return (
    <AppShell title="客戶 CRM" subtitle="電話、生日、LINE、偏好、過敏禁忌、會員等級與回訪提醒。" {...shellProps(data)}>
      <div className="grid gap-5">
        {notice ? <FormNotice kind={notice.kind}>{notice.message}</FormNotice> : null}
        {canEditCustomers ? (
          <form action={createCustomerAction} className="card p-5">
            <h2 className="text-lg font-bold text-plum">新增客戶</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-semibold text-plum">
                姓名
                <input className="mt-2 w-full rounded-2xl border border-champagne p-3" name="name" required />
              </label>
              <label className="block text-sm font-semibold text-plum">
                電話
                <input className="mt-2 w-full rounded-2xl border border-champagne p-3" name="phone" required />
              </label>
              <label className="block text-sm font-semibold text-plum">
                會員等級
                <select className="mt-2 w-full rounded-2xl border border-champagne p-3" name="tier" defaultValue="一般">
                  <option>一般</option>
                  <option>新客</option>
                  <option>VIP</option>
                  <option>VVIP</option>
                </select>
              </label>
              <label className="block text-sm font-semibold text-plum">
                生日
                <input className="mt-2 w-full rounded-2xl border border-champagne p-3" name="birthday" type="date" />
              </label>
              <label className="block text-sm font-semibold text-plum">
                LINE ID
                <input className="mt-2 w-full rounded-2xl border border-champagne p-3" name="lineId" />
              </label>
              <label className="block text-sm font-semibold text-plum">
                下次提醒
                <input className="mt-2 w-full rounded-2xl border border-champagne p-3" name="nextReminder" type="date" />
              </label>
              <label className="block text-sm font-semibold text-plum md:col-span-2">
                備註
                <textarea className="mt-2 min-h-24 w-full rounded-2xl border border-champagne p-3" name="note" />
              </label>
              <label className="block text-sm font-semibold text-plum">
                偏好
                <textarea className="mt-2 min-h-24 w-full rounded-2xl border border-champagne p-3" name="preferences" placeholder="例如：裸粉, 短甲" />
              </label>
              <label className="block text-sm font-semibold text-plum">
                注意事項
                <textarea className="mt-2 min-h-24 w-full rounded-2xl border border-champagne p-3" name="cautions" placeholder="例如：對酒精氣味敏感" />
              </label>
              <label className="block text-sm font-semibold text-plum md:col-span-2">
                標記
                <textarea className="mt-2 min-h-24 w-full rounded-2xl border border-champagne p-3" name="tags" placeholder="例如：高價值客戶, 回訪提醒" />
              </label>
            </div>
            <button type="submit" className="mobile-tap mt-5 rounded-2xl bg-plum font-semibold text-white">
              建立客戶
            </button>
          </form>
        ) : null}
        <ModuleTable
          rows={data.customers}
          searchPlaceholder="搜尋姓名、電話、LINE、標籤"
          filterOptions={["VIP", "VVIP", "新客", "高價值客戶"]}
          emptyTitle="尚無客戶資料"
          columns={[
            { key: "name", label: "客戶", sortValue: (row) => row.name, render: (row) => <><strong>{row.name}</strong><p className="text-ink/60">{row.phone}｜LINE {row.lineId ?? "-"}</p></> },
            { key: "tier", label: "會員", render: (row) => <StatusPill tone="plum">{row.tier}</StatusPill> },
            { key: "prefs", label: "偏好紀錄", render: (row) => row.preferences.join("、") || "-" },
            { key: "cautions", label: "注意事項", render: (row) => row.cautions.length ? <span className="text-rose">{row.cautions.join("、")}</span> : "無" },
            { key: "reminder", label: "回訪提醒", render: (row) => row.nextReminder ?? "-" },
            { key: "tags", label: "標記", render: (row) => row.tags.map((tag) => <StatusPill key={tag} tone="sage">{tag}</StatusPill>) },
            {
              key: "edit",
              label: "編輯",
              render: (row) => (
                <form action={updateCustomerAction} className="grid min-w-[22rem] gap-2 rounded-2xl bg-blush p-3">
                  <input type="hidden" name="customerId" value={row.id} />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="text-xs font-semibold text-plum">
                      姓名
                      <input className="mt-1 w-full rounded-xl border border-champagne p-2" name="name" defaultValue={row.name} required />
                    </label>
                    <label className="text-xs font-semibold text-plum">
                      電話
                      <input className="mt-1 w-full rounded-xl border border-champagne p-2" name="phone" defaultValue={row.phone} required />
                    </label>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="text-xs font-semibold text-plum">
                      會員等級
                      <select className="mt-1 w-full rounded-xl border border-champagne p-2" name="tier" defaultValue={row.tier}>
                        <option>一般</option>
                        <option>新客</option>
                        <option>VIP</option>
                        <option>VVIP</option>
                      </select>
                    </label>
                    <label className="text-xs font-semibold text-plum">
                      生日
                      <input className="mt-1 w-full rounded-xl border border-champagne p-2" name="birthday" type="date" defaultValue={row.birthday} />
                    </label>
                  </div>
                  <label className="text-xs font-semibold text-plum">
                    LINE ID
                    <input className="mt-1 w-full rounded-xl border border-champagne p-2" name="lineId" defaultValue={row.lineId ?? ""} />
                  </label>
                  <label className="text-xs font-semibold text-plum">
                    下次提醒
                    <input className="mt-1 w-full rounded-xl border border-champagne p-2" name="nextReminder" type="date" defaultValue={row.nextReminder ?? ""} />
                  </label>
                  <label className="text-xs font-semibold text-plum">
                    偏好
                    <textarea className="mt-1 min-h-20 w-full rounded-xl border border-champagne p-2" name="preferences" defaultValue={row.preferences.join(", ")} />
                  </label>
                  <label className="text-xs font-semibold text-plum">
                    注意事項
                    <textarea className="mt-1 min-h-20 w-full rounded-xl border border-champagne p-2" name="cautions" defaultValue={row.cautions.join(", ")} />
                  </label>
                  <label className="text-xs font-semibold text-plum">
                    標記
                    <textarea className="mt-1 min-h-20 w-full rounded-xl border border-champagne p-2" name="tags" defaultValue={row.tags.join(", ")} />
                  </label>
                  <label className="text-xs font-semibold text-plum">
                    備註
                    <textarea className="mt-1 min-h-20 w-full rounded-xl border border-champagne p-2" name="note" defaultValue={row.note ?? ""} />
                  </label>
                  <button type="submit" className="mobile-tap rounded-xl bg-plum px-3 py-2 font-semibold text-white">
                    儲存
                  </button>
                </form>
              )
            }
          ]}
        />
      </div>
    </AppShell>
  );
}

export function ServicesView({ data, notice }: { data: AppData; notice?: { kind: "error" | "success"; message: string } }) {
  const canEditServices = !data.needsWorkspace && (data.currentMember ? ["owner", "admin"].includes(data.currentMember.role) : true);

  return (
    <AppShell title="服務項目管理" subtitle="分類、價格、所需時間、說明、啟用狀態與加購項目管理。" {...shellProps(data)}>
      <div className="grid gap-5">
        {notice ? <FormNotice kind={notice.kind}>{notice.message}</FormNotice> : null}
        {canEditServices ? (
          <form action={createServiceAction} className="card p-5">
            <h2 className="text-lg font-bold text-plum">新增服務項目</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-semibold text-plum">
                服務名稱
                <input className="mt-2 w-full rounded-2xl border border-champagne p-3" name="name" required />
              </label>
              <label className="block text-sm font-semibold text-plum">
                分類
                <input className="mt-2 w-full rounded-2xl border border-champagne p-3" name="category" placeholder="例如：美甲" />
              </label>
              <label className="block text-sm font-semibold text-plum">
                價格
                <input className="mt-2 w-full rounded-2xl border border-champagne p-3" name="price" type="number" min="0" step="1" required />
              </label>
              <label className="block text-sm font-semibold text-plum">
                所需時間
                <input className="mt-2 w-full rounded-2xl border border-champagne p-3" name="durationMin" type="number" min="1" step="1" required />
              </label>
              <label className="block text-sm font-semibold text-plum md:col-span-2">
                說明
                <textarea className="mt-2 min-h-24 w-full rounded-2xl border border-champagne p-3" name="description" />
              </label>
              <label className="flex items-center gap-3 text-sm font-semibold text-plum">
                <input type="checkbox" name="addOn" />
                加購項目
              </label>
              <label className="flex items-center gap-3 text-sm font-semibold text-plum">
                <input type="checkbox" name="enabled" defaultChecked />
                啟用
              </label>
            </div>
            <button type="submit" className="mobile-tap mt-5 rounded-2xl bg-plum font-semibold text-white">
              建立服務
            </button>
          </form>
        ) : null}
        <ModuleTable
          rows={data.services}
          searchPlaceholder="搜尋服務名稱、分類、說明"
          filterOptions={["美甲", "美睫", "美容", "SPA", "霧眉", "加購"]}
          emptyTitle="尚未建立服務項目"
          columns={[
            { key: "name", label: "服務", render: (row) => <><strong>{row.name}</strong><p className="text-ink/60">{row.description}</p></> },
            { key: "category", label: "分類", render: (row) => <StatusPill>{row.category}</StatusPill> },
            { key: "price", label: "價格", sortValue: (row) => row.price, render: (row) => currency.format(row.price) },
            { key: "duration", label: "時間", sortValue: (row) => row.durationMin, render: (row) => `${row.durationMin} 分鐘` },
            { key: "addon", label: "加購", render: (row) => row.addOn ? <StatusPill tone="amber">加購</StatusPill> : "主服務" },
            { key: "enabled", label: "狀態", render: (row) => row.enabled ? <StatusPill tone="sage">啟用</StatusPill> : <StatusPill>停用</StatusPill> },
            {
              key: "edit",
              label: "編輯",
              render: (row) => (
                <form action={updateServiceAction} className="grid min-w-[22rem] gap-2 rounded-2xl bg-blush p-3">
                  <input type="hidden" name="serviceId" value={row.id} />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="text-xs font-semibold text-plum">
                      服務名稱
                      <input className="mt-1 w-full rounded-xl border border-champagne p-2" name="name" defaultValue={row.name} required />
                    </label>
                    <label className="text-xs font-semibold text-plum">
                      分類
                      <input className="mt-1 w-full rounded-xl border border-champagne p-2" name="category" defaultValue={row.category} />
                    </label>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="text-xs font-semibold text-plum">
                      價格
                      <input className="mt-1 w-full rounded-xl border border-champagne p-2" name="price" type="number" min="0" step="1" defaultValue={row.price} required />
                    </label>
                    <label className="text-xs font-semibold text-plum">
                      所需時間
                      <input className="mt-1 w-full rounded-xl border border-champagne p-2" name="durationMin" type="number" min="1" step="1" defaultValue={row.durationMin} required />
                    </label>
                  </div>
                  <label className="text-xs font-semibold text-plum">
                    說明
                    <textarea className="mt-1 min-h-20 w-full rounded-xl border border-champagne p-2" name="description" defaultValue={row.description} />
                  </label>
                  <div className="flex flex-wrap gap-3 text-xs font-semibold text-plum">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" name="addOn" defaultChecked={row.addOn} />
                      加購項目
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" name="enabled" defaultChecked={row.enabled} />
                      啟用
                    </label>
                  </div>
                  <button type="submit" className="mobile-tap rounded-xl bg-plum px-3 py-2 font-semibold text-white">
                    儲存
                  </button>
                </form>
              )
            }
          ]}
        />
      </div>
    </AppShell>
  );
}

export function CheckoutView({ data }: { data: AppData }) {
  const ready = useClientReady();

  if (!ready) {
    return (
      <AppShell title="訂單 / 結帳 / 收款" subtitle="從預約轉訂單，支援折扣、小費、多付款方式、收據明細與每日結帳。" {...shellProps(data)}>
        <LoadingState />
      </AppShell>
    );
  }

  return <AppShell title="訂單 / 結帳 / 收款" subtitle="從預約轉訂單，支援折扣、小費、多付款方式、收據明細與每日結帳。" {...shellProps(data)}><ModuleTable rows={data.orders} searchPlaceholder="搜尋訂單、客戶、付款方式" filterOptions={["paid", "partial", "unpaid", "card", "line_pay"]} emptyTitle="尚無訂單" columns={[{ key: "id", label: "訂單", render: (row) => <><strong>{row.id}</strong><p className="text-ink/60">{formatDateTime(row.createdAt)}</p></> }, { key: "customer", label: "客戶 / 技師", render: (row) => `${data.customers.find((item) => item.id === row.customerId)?.name ?? "-"}｜${data.staff.find((item) => item.id === row.technicianId)?.name ?? "-"}` }, { key: "lines", label: "明細", render: (row) => row.lines.map((line) => `${line.name} x${line.quantity}`).join("、") }, { key: "total", label: "總額", sortValue: (row) => orderTotal(row), render: (row) => currency.format(orderTotal(row)) }, { key: "paid", label: "待收", render: (row) => currency.format(outstandingAmount(row)) }, { key: "status", label: "狀態", render: (row) => <StatusPill tone={row.status === "paid" ? "sage" : "amber"}>{row.status}</StatusPill> }]} /></AppShell>;
}

export function InventoryView({ data }: { data: AppData }) {
  return <AppShell title="庫存管理" subtitle="材料、品牌、成本售價、低庫存提醒、進貨 / 消耗紀錄與訂單扣庫存基礎。" {...shellProps(data)}><ModuleTable rows={data.inventory} searchPlaceholder="搜尋品牌、品名、分類" filterOptions={["美甲膠", "睫毛材料", "保養品"]} emptyTitle="尚無庫存品項" columns={[{ key: "name", label: "品項", render: (row) => <><strong>{row.name}</strong><p className="text-ink/60">{row.brand}</p></> }, { key: "category", label: "分類", render: (row) => row.category }, { key: "cost", label: "成本 / 售價", render: (row) => `${currency.format(row.cost)} / ${currency.format(row.retailPrice)}` }, { key: "qty", label: "庫存", sortValue: (row) => row.quantity, render: (row) => <StatusPill tone={row.quantity <= row.lowStockThreshold ? "amber" : "sage"}>{row.quantity}</StatusPill> }, { key: "alert", label: "提醒", render: (row) => row.quantity <= row.lowStockThreshold ? "低庫存，請補貨" : "安全庫存" }]} /></AppShell>;
}

export function StaffView({ data, notice }: { data: AppData; notice?: { kind: "error" | "success"; message: string } }) {
  return (
    <AppShell title="員工 / 班表 / 業績" subtitle="員工資料、技師排班、請假休息日、服務數量、營收與抽成欄位。" {...shellProps(data)}>
      <div className="grid gap-5">
        {notice ? <FormNotice kind={notice.kind}>{notice.message}</FormNotice> : null}
        <div className="card p-5">
          <h2 className="text-lg font-bold text-plum">員工資料管理</h2>
          <p className="mt-1 text-sm text-ink/60">目前支援更新既有員工、技師、櫃台與在職狀態。新增員工需對應 auth 使用者，會在後續邀請流程補齊。</p>
          <ModuleTable
            rows={data.staff}
            searchPlaceholder="搜尋員工、角色、專長"
            filterOptions={["technician", "front_desk", "owner"]}
            emptyTitle="尚無員工資料"
            columns={[
              { key: "name", label: "員工", render: (row) => <><strong>{row.name}</strong><p className="text-ink/60">{row.phone}</p></> },
              { key: "role", label: "角色", render: (row) => <StatusPill>{roleLabel(row.role)}</StatusPill> },
              { key: "specialty", label: "專長", render: (row) => row.specialties.join("、") || "-" },
              { key: "commission", label: "抽成", sortValue: (row) => row.commissionRate, render: (row) => `${Math.round(row.commissionRate * 100)}%` },
              { key: "shift", label: "今日班表", render: (row) => { const shift = data.shifts.find((item) => item.staffId === row.id); return shift ? `${shift.startTime}–${shift.endTime}` : "休息"; } },
              {
                key: "edit",
                label: "編輯",
                render: (row) => (
                  <form action={updateStaffAction} className="grid min-w-[20rem] gap-2 rounded-2xl bg-blush p-3">
                    <input type="hidden" name="memberId" value={row.id} />
                    <label className="text-xs font-semibold text-plum">
                      姓名
                      <input className="mt-1 w-full rounded-xl border border-champagne p-2" name="displayName" defaultValue={row.name} required />
                    </label>
                    <label className="text-xs font-semibold text-plum">
                      電話
                      <input className="mt-1 w-full rounded-xl border border-champagne p-2" name="phone" defaultValue={row.phone} />
                    </label>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className="text-xs font-semibold text-plum">
                        角色
                        <select className="mt-1 w-full rounded-xl border border-champagne p-2" name="role" defaultValue={row.role}>
                          <option value="owner">店主</option>
                          <option value="admin">管理員</option>
                          <option value="technician">技師</option>
                          <option value="front_desk">櫃台</option>
                          <option value="staff">員工</option>
                        </select>
                      </label>
                      <label className="text-xs font-semibold text-plum">
                        抽成
                        <input className="mt-1 w-full rounded-xl border border-champagne p-2" name="commissionRate" type="number" min="0" max="1" step="0.01" defaultValue={row.commissionRate} />
                      </label>
                    </div>
                    <label className="text-xs font-semibold text-plum">
                      專長
                      <textarea className="mt-1 min-h-20 w-full rounded-xl border border-champagne p-2" name="specialties" defaultValue={row.specialties.join(", ")} />
                    </label>
                    <label className="flex items-center gap-2 text-xs font-semibold text-plum">
                      <input type="checkbox" name="active" defaultChecked={row.active} />
                      在職
                    </label>
                    <button type="submit" className="mobile-tap rounded-xl bg-plum px-3 py-2 font-semibold text-white">
                      儲存
                    </button>
                  </form>
                )
              },
              { key: "status", label: "狀態", render: (row) => row.active ? <StatusPill tone="sage">在職</StatusPill> : <StatusPill>停用</StatusPill> }
            ]}
          />
        </div>
      </div>
    </AppShell>
  );
}

export function TechnicianView({ data }: { data: AppData }) {
  const technicianId = data.currentMember?.role === "technician" ? data.currentMember.id : data.staff.find((item) => item.role === "technician")?.id;
  const mine = technicianId ? data.appointments.filter((item) => item.technicianId === technicianId) : [];
  return <AppShell title="技師工作台" subtitle="技師只看自己的今日預約、客戶注意事項、服務紀錄與服務前後照片欄位。" {...shellProps(data)}><div className="grid gap-4">{mine.length ? mine.map((appointment) => { const customer = data.customers.find((item) => item.id === appointment.customerId); return <article key={appointment.id} className="card p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="font-bold text-plum">{formatTime(appointment.startAt)}–{formatTime(appointment.endAt)}｜{customer?.name ?? "未命名客戶"}</p><p className="mt-1 text-sm text-ink/60">{appointment.serviceIds.map((id) => data.services.find((service) => service.id === id)?.name).filter(Boolean).join("、") || "未指定服務"}</p></div><StatusPill>{statusLabel(appointment.status)}</StatusPill></div><div className="mt-4 rounded-3xl bg-blush p-4 text-sm"><strong>注意事項：</strong>{customer?.cautions.join("、") || "無"}<br/><strong>偏好：</strong>{customer?.preferences.join("、") || "無"}</div><textarea className="mt-4 min-h-28 w-full rounded-3xl border border-champagne p-4" placeholder="填寫服務紀錄、使用色號、補充說明…" /><div className="mt-4 rounded-2xl border border-dashed border-champagne bg-white p-4 text-sm text-ink/70"><strong className="text-plum">照片上傳</strong><p className="mt-1">目前已保留服務前 / 服務後照片欄位的工作流程，待 Supabase Storage 接上後再啟用實際上傳。</p></div></article>; }) : <EmptyState title="目前沒有指派給你的預約" action="當預約指定到技師後，會顯示服務紀錄與客戶注意事項。" />}</div></AppShell>;
}

export function ReportsView({ data }: { data: AppData }) {
  const metrics = dashboardMetrics(new Date(), data.appointments, data.orders, data.customers, data.services, data.staff);
  const avg = data.orders.length ? metrics.monthRevenue / data.orders.length : 0;
  const returningRate = data.customers.length ? Math.round(metrics.returningCustomers / data.customers.length * 100) : 0;
  return <AppShell title="報表分析" subtitle="日 / 月營收、服務排行、技師排行、回訪率、客單價、來源與庫存消耗分析。" {...shellProps(data)}><section className="grid gap-4 md:grid-cols-3"><MetricCard label="月營收" value={currency.format(metrics.monthRevenue)} hint="本月已建立訂單"/><MetricCard label="客單價" value={currency.format(avg)} hint="訂單平均金額"/><MetricCard label="回訪率" value={`${returningRate}%`} hint="有 lastVisit 的客戶比例"/></section><section className="mt-5 grid gap-5 lg:grid-cols-2"><div className="card p-5"><h2 className="font-bold text-plum">預約來源</h2>{sources.map((source) => <div key={source} className="mt-3 flex justify-between rounded-2xl bg-white p-4"><span>{source}</span><StatusPill>{data.appointments.filter((item) => item.source === source).length} 筆</StatusPill></div>)}</div><div className="card p-5"><h2 className="font-bold text-plum">服務銷售排行</h2>{metrics.serviceRanking.map((item) => <div key={item.name} className="mt-3 flex justify-between rounded-2xl bg-white p-4"><span>{item.name}</span><strong>{item.count}</strong></div>)}</div></section></AppShell>;
}

export function SettingsView({ data, notice }: { data: AppData; notice?: { kind: "error" | "success"; message: string } }) {
  const settings = ["店鋪名稱、電話、地址", "營業時間", "預約規則與取消政策", "付款方式", "服務分類", "稅務 / 收據設定", "品牌色與外觀設定"];
  return <AppShell title="設定頁" subtitle="店鋪基本資料、預約規則、收款、稅務、品牌外觀與多店設定。" {...shellProps(data)}><div className="card p-5">{notice ? <FormNotice kind={notice.kind}>{notice.message}</FormNotice> : null}<form action={updateWorkspaceSettingsAction} className="mt-4 grid gap-4"><div className="grid gap-4 md:grid-cols-2"><label className="block text-sm font-semibold text-plum">店鋪名稱<input className="mt-2 w-full rounded-2xl border border-champagne p-3" name="name" defaultValue={data.workspace.name} required /></label><label className="block text-sm font-semibold text-plum">電話<input className="mt-2 w-full rounded-2xl border border-champagne p-3" name="phone" defaultValue={data.workspace.phone} /></label><label className="block text-sm font-semibold text-plum md:col-span-2">地址<input className="mt-2 w-full rounded-2xl border border-champagne p-3" name="address" defaultValue={data.workspace.address} /></label><label className="block text-sm font-semibold text-plum">品牌色<input className="mt-2 h-12 w-full rounded-2xl border border-champagne p-1" name="brandColor" type="color" defaultValue={data.workspace.brandColor} /></label><label className="block text-sm font-semibold text-plum md:col-span-2">營業時間<textarea className="mt-2 min-h-24 w-full rounded-2xl border border-champagne p-3" name="businessHours" defaultValue={data.workspace.businessHours} /></label></div><input type="hidden" name="next" value="/settings" /><div className="mt-2 grid gap-3">{settings.map((item) => <div key={item} className="rounded-2xl bg-blush p-4 font-medium">{item}</div>)}</div><button type="submit" className="mobile-tap mt-5 rounded-2xl bg-plum font-semibold text-white">儲存設定</button></form></div></AppShell>;
}
