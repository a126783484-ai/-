"use client";

import { AppShell } from "@/components/AppShell";
import { ModuleTable } from "@/components/ModuleTable";
import { MetricCard, StatusPill, EmptyState } from "@/components/ui";
import { statusLabel } from "@/lib/appointments";
import { dashboardMetrics } from "@/lib/analytics";
import { orderTotal, outstandingAmount } from "@/lib/orders";
import { roleLabel } from "@/lib/permissions";
import type { AppData } from "@/lib/app-data";
import { currency, formatDate, formatTime } from "@/lib/utils";

const liveNotice = "正式資料模式：資料由 Supabase Auth + RLS 依 workspace 隔離。";
const sources = ["LINE", "Instagram", "電話", "現場", "官網"];

function shellProps(data: AppData) {
  return {
    workspace: data.workspace,
    role: data.currentMember?.role ?? "owner",
    notice: data.needsWorkspace ? "尚未完成 workspace 初始化，請重新登入或聯絡管理員。" : liveNotice
  };
}

export function DashboardView({ data }: { data: AppData }) {
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

export function AppointmentsView({ data }: { data: AppData }) {
  return <AppShell title="預約系統" subtitle="新增、修改、取消預約；日曆 / 列表檢視與技師衝突檢查。" {...shellProps(data)}><div className="mb-4 grid gap-3 md:grid-cols-3"><button type="button" className="mobile-tap rounded-2xl bg-plum font-semibold text-white opacity-60" disabled title="新增預約表單尚未接上 API">＋ 新增預約</button><button type="button" className="mobile-tap rounded-2xl bg-white font-semibold text-plum">日曆檢視</button><button type="button" className="mobile-tap rounded-2xl bg-white font-semibold text-plum">列表檢視</button></div><ModuleTable rows={data.appointments} searchPlaceholder="搜尋客戶、技師、來源、備註" filterOptions={["pending", "confirmed", "completed", "no_show"]} emptyTitle="目前沒有預約" columns={[{ key: "time", label: "日期 / 時間", sortValue: (row) => row.startAt, render: (row) => <><strong>{formatDate(row.startAt)}</strong><p className="text-ink/60">{formatTime(row.startAt)}–{formatTime(row.endAt)}</p></> }, { key: "customer", label: "客戶", render: (row) => data.customers.find((item) => item.id === row.customerId)?.name ?? "-" }, { key: "service", label: "服務", render: (row) => row.serviceIds.map((id) => data.services.find((service) => service.id === id)?.name).filter(Boolean).join("、") || "-" }, { key: "tech", label: "技師", render: (row) => data.staff.find((item) => item.id === row.technicianId)?.name ?? "-" }, { key: "status", label: "狀態", render: (row) => <StatusPill>{statusLabel(row.status)}</StatusPill> }, { key: "actions", label: "快速操作", render: () => <button type="button" className="rounded-xl bg-champagne px-3 py-2 font-semibold text-plum opacity-60" disabled title="狀態更新流程尚未接上後端">更新</button> }]} /></AppShell>;
}

export function CustomersView({ data }: { data: AppData }) {
  return <AppShell title="客戶 CRM" subtitle="電話、生日、LINE、偏好、過敏禁忌、會員等級與回訪提醒。" {...shellProps(data)}><ModuleTable rows={data.customers} searchPlaceholder="搜尋姓名、電話、LINE、標籤" filterOptions={["VIP", "VVIP", "新客", "高價值客戶"]} emptyTitle="尚無客戶資料" columns={[{ key: "name", label: "客戶", sortValue: (row) => row.name, render: (row) => <><strong>{row.name}</strong><p className="text-ink/60">{row.phone}｜LINE {row.lineId ?? "-"}</p></> }, { key: "tier", label: "會員", render: (row) => <StatusPill tone="plum">{row.tier}</StatusPill> }, { key: "prefs", label: "偏好紀錄", render: (row) => row.preferences.join("、") || "-" }, { key: "cautions", label: "注意事項", render: (row) => row.cautions.length ? <span className="text-rose">{row.cautions.join("、")}</span> : "無" }, { key: "reminder", label: "回訪提醒", render: (row) => row.nextReminder ?? "-" }, { key: "tags", label: "標記", render: (row) => row.tags.map((tag) => <StatusPill key={tag} tone="sage">{tag}</StatusPill>) }]} /></AppShell>;
}

export function ServicesView({ data }: { data: AppData }) {
  return <AppShell title="服務項目管理" subtitle="分類、價格、所需時間、說明、啟用狀態與加購項目管理。" {...shellProps(data)}><ModuleTable rows={data.services} searchPlaceholder="搜尋服務名稱、分類、說明" filterOptions={["美甲", "美睫", "美容", "SPA", "霧眉", "加購"]} emptyTitle="尚未建立服務項目" columns={[{ key: "name", label: "服務", render: (row) => <><strong>{row.name}</strong><p className="text-ink/60">{row.description}</p></> }, { key: "category", label: "分類", render: (row) => <StatusPill>{row.category}</StatusPill> }, { key: "price", label: "價格", sortValue: (row) => row.price, render: (row) => currency.format(row.price) }, { key: "duration", label: "時間", sortValue: (row) => row.durationMin, render: (row) => `${row.durationMin} 分鐘` }, { key: "addon", label: "加購", render: (row) => row.addOn ? <StatusPill tone="amber">加購</StatusPill> : "主服務" }, { key: "enabled", label: "狀態", render: (row) => row.enabled ? <StatusPill tone="sage">啟用</StatusPill> : <StatusPill>停用</StatusPill> }]} /></AppShell>;
}

export function CheckoutView({ data }: { data: AppData }) {
  return <AppShell title="訂單 / 結帳 / 收款" subtitle="從預約轉訂單，支援折扣、小費、多付款方式、收據明細與每日結帳。" {...shellProps(data)}><ModuleTable rows={data.orders} searchPlaceholder="搜尋訂單、客戶、付款方式" filterOptions={["paid", "partial", "unpaid", "card", "line_pay"]} emptyTitle="尚無訂單" columns={[{ key: "id", label: "訂單", render: (row) => <><strong>{row.id}</strong><p className="text-ink/60">{new Date(row.createdAt).toLocaleString("zh-TW")}</p></> }, { key: "customer", label: "客戶 / 技師", render: (row) => `${data.customers.find((item) => item.id === row.customerId)?.name ?? "-"}｜${data.staff.find((item) => item.id === row.technicianId)?.name ?? "-"}` }, { key: "lines", label: "明細", render: (row) => row.lines.map((line) => `${line.name} x${line.quantity}`).join("、") }, { key: "total", label: "總額", sortValue: (row) => orderTotal(row), render: (row) => currency.format(orderTotal(row)) }, { key: "paid", label: "待收", render: (row) => currency.format(outstandingAmount(row)) }, { key: "status", label: "狀態", render: (row) => <StatusPill tone={row.status === "paid" ? "sage" : "amber"}>{row.status}</StatusPill> }]} /></AppShell>;
}

export function InventoryView({ data }: { data: AppData }) {
  return <AppShell title="庫存管理" subtitle="材料、品牌、成本售價、低庫存提醒、進貨 / 消耗紀錄與訂單扣庫存基礎。" {...shellProps(data)}><ModuleTable rows={data.inventory} searchPlaceholder="搜尋品牌、品名、分類" filterOptions={["美甲膠", "睫毛材料", "保養品"]} emptyTitle="尚無庫存品項" columns={[{ key: "name", label: "品項", render: (row) => <><strong>{row.name}</strong><p className="text-ink/60">{row.brand}</p></> }, { key: "category", label: "分類", render: (row) => row.category }, { key: "cost", label: "成本 / 售價", render: (row) => `${currency.format(row.cost)} / ${currency.format(row.retailPrice)}` }, { key: "qty", label: "庫存", sortValue: (row) => row.quantity, render: (row) => <StatusPill tone={row.quantity <= row.lowStockThreshold ? "amber" : "sage"}>{row.quantity}</StatusPill> }, { key: "alert", label: "提醒", render: (row) => row.quantity <= row.lowStockThreshold ? "低庫存，請補貨" : "安全庫存" }]} /></AppShell>;
}

export function StaffView({ data }: { data: AppData }) {
  return <AppShell title="員工 / 班表 / 業績" subtitle="員工資料、技師排班、請假休息日、服務數量、營收與抽成欄位。" {...shellProps(data)}><ModuleTable rows={data.staff} searchPlaceholder="搜尋員工、角色、專長" filterOptions={["technician", "front_desk", "owner"]} emptyTitle="尚無員工資料" columns={[{ key: "name", label: "員工", render: (row) => <><strong>{row.name}</strong><p className="text-ink/60">{row.phone}</p></> }, { key: "role", label: "角色", render: (row) => <StatusPill>{roleLabel(row.role)}</StatusPill> }, { key: "specialty", label: "專長", render: (row) => row.specialties.join("、") || "-" }, { key: "commission", label: "抽成", sortValue: (row) => row.commissionRate, render: (row) => `${Math.round(row.commissionRate * 100)}%` }, { key: "shift", label: "今日班表", render: (row) => { const shift = data.shifts.find((item) => item.staffId === row.id); return shift ? `${shift.startTime}–${shift.endTime}` : "休息"; } }, { key: "status", label: "狀態", render: (row) => row.active ? <StatusPill tone="sage">在職</StatusPill> : <StatusPill>停用</StatusPill> }]} /></AppShell>;
}

export function TechnicianView({ data }: { data: AppData }) {
  const technicianId = data.currentMember?.role === "technician" ? data.currentMember.id : data.staff.find((item) => item.role === "technician")?.id;
  const mine = technicianId ? data.appointments.filter((item) => item.technicianId === technicianId) : [];
  return <AppShell title="技師工作台" subtitle="技師只看自己的今日預約、客戶注意事項、服務紀錄與服務前後照片欄位。" {...shellProps(data)}><div className="grid gap-4">{mine.length ? mine.map((appointment) => { const customer = data.customers.find((item) => item.id === appointment.customerId); return <article key={appointment.id} className="card p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="font-bold text-plum">{formatTime(appointment.startAt)}–{formatTime(appointment.endAt)}｜{customer?.name ?? "未命名客戶"}</p><p className="mt-1 text-sm text-ink/60">{appointment.serviceIds.map((id) => data.services.find((service) => service.id === id)?.name).filter(Boolean).join("、") || "未指定服務"}</p></div><StatusPill>{statusLabel(appointment.status)}</StatusPill></div><div className="mt-4 rounded-3xl bg-blush p-4 text-sm"><strong>注意事項：</strong>{customer?.cautions.join("、") || "無"}<br/><strong>偏好：</strong>{customer?.preferences.join("、") || "無"}</div><textarea className="mt-4 min-h-28 w-full rounded-3xl border border-champagne p-4" placeholder="填寫服務紀錄、使用色號、補充說明…" /><div className="mt-3 grid gap-3 sm:grid-cols-2"><button type="button" className="mobile-tap rounded-2xl bg-white font-semibold text-plum opacity-60" disabled title="照片上傳尚未接上後端">上傳服務前照片</button><button type="button" className="mobile-tap rounded-2xl bg-white font-semibold text-plum opacity-60" disabled title="照片上傳尚未接上後端">上傳服務後照片</button></div></article>; }) : <EmptyState title="目前沒有指派給你的預約" action="當預約指定到技師後，會顯示服務紀錄與客戶注意事項。" />}</div></AppShell>;
}

export function ReportsView({ data }: { data: AppData }) {
  const metrics = dashboardMetrics(new Date(), data.appointments, data.orders, data.customers, data.services, data.staff);
  const avg = data.orders.length ? metrics.monthRevenue / data.orders.length : 0;
  const returningRate = data.customers.length ? Math.round(metrics.returningCustomers / data.customers.length * 100) : 0;
  return <AppShell title="報表分析" subtitle="日 / 月營收、服務排行、技師排行、回訪率、客單價、來源與庫存消耗分析。" {...shellProps(data)}><section className="grid gap-4 md:grid-cols-3"><MetricCard label="月營收" value={currency.format(metrics.monthRevenue)} hint="本月已建立訂單"/><MetricCard label="客單價" value={currency.format(avg)} hint="訂單平均金額"/><MetricCard label="回訪率" value={`${returningRate}%`} hint="有 lastVisit 的客戶比例"/></section><section className="mt-5 grid gap-5 lg:grid-cols-2"><div className="card p-5"><h2 className="font-bold text-plum">預約來源</h2>{sources.map((source) => <div key={source} className="mt-3 flex justify-between rounded-2xl bg-white p-4"><span>{source}</span><StatusPill>{data.appointments.filter((item) => item.source === source).length} 筆</StatusPill></div>)}</div><div className="card p-5"><h2 className="font-bold text-plum">服務銷售排行</h2>{metrics.serviceRanking.map((item) => <div key={item.name} className="mt-3 flex justify-between rounded-2xl bg-white p-4"><span>{item.name}</span><strong>{item.count}</strong></div>)}</div></section></AppShell>;
}

export function SettingsView({ data }: { data: AppData }) {
  const settings = ["店鋪名稱、電話、地址", "營業時間", "預約規則與取消政策", "付款方式", "服務分類", "稅務 / 收據設定", "品牌色與外觀設定"];
  return <AppShell title="設定頁" subtitle="店鋪基本資料、預約規則、收款、稅務、品牌外觀與多店設定。" {...shellProps(data)}><div className="card p-5"><div className="grid gap-4 md:grid-cols-2"><label className="block text-sm font-semibold text-plum">店鋪名稱<input className="mt-2 w-full rounded-2xl border border-champagne p-3" defaultValue={data.workspace.name}/></label><label className="block text-sm font-semibold text-plum">電話<input className="mt-2 w-full rounded-2xl border border-champagne p-3" defaultValue={data.workspace.phone}/></label><label className="block text-sm font-semibold text-plum md:col-span-2">地址<input className="mt-2 w-full rounded-2xl border border-champagne p-3" defaultValue={data.workspace.address}/></label></div><div className="mt-6 grid gap-3">{settings.map((item) => <div key={item} className="rounded-2xl bg-blush p-4 font-medium">{item}</div>)}</div><button type="button" className="mobile-tap mt-5 rounded-2xl bg-plum font-semibold text-white opacity-60" disabled title="設定儲存 API 尚未接上">儲存設定</button></div></AppShell>;
}
