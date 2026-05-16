"use client";
import { AppShell } from "@/components/AppShell";
import { ModuleTable } from "@/components/ModuleTable";
import { StatusPill } from "@/components/ui";
import { appointments, customers, services, staff } from "@/lib/seed";
import { formatDate, formatTime } from "@/lib/utils";
import { statusLabel } from "@/lib/appointments";

export default function AppointmentsPage() {
  return <AppShell title="預約系統" subtitle="新增、修改、取消預約；日曆 / 列表檢視與技師衝突檢查已抽成可測試邏輯。"><div className="mb-4 grid gap-3 md:grid-cols-3"><button className="mobile-tap rounded-2xl bg-plum font-semibold text-white" onClick={() => alert("正式串接後會開啟新增預約表單，並檢查同技師同時段衝突。")}>＋ 新增預約</button><button className="mobile-tap rounded-2xl bg-white font-semibold text-plum">日曆檢視</button><button className="mobile-tap rounded-2xl bg-white font-semibold text-plum">列表檢視</button></div><ModuleTable rows={appointments} searchPlaceholder="搜尋客戶、技師、來源、備註" filterOptions={["pending", "confirmed", "completed", "no_show"]} emptyTitle="目前沒有預約" columns={[{ key: "time", label: "日期 / 時間", sortValue: (row) => row.startAt, render: (row) => <><strong>{formatDate(row.startAt)}</strong><p className="text-ink/60">{formatTime(row.startAt)}–{formatTime(row.endAt)}</p></> }, { key: "customer", label: "客戶", render: (row) => customers.find((item) => item.id === row.customerId)?.name }, { key: "service", label: "服務", render: (row) => row.serviceIds.map((id) => services.find((service) => service.id === id)?.name).join("、") }, { key: "tech", label: "技師", render: (row) => staff.find((item) => item.id === row.technicianId)?.name }, { key: "status", label: "狀態", render: (row) => <StatusPill>{statusLabel(row.status)}</StatusPill> }, { key: "actions", label: "快速操作", render: () => <button className="rounded-xl bg-champagne px-3 py-2 font-semibold text-plum" onClick={() => confirm("確定要更新這筆預約狀態？")}>更新</button> }]} /></AppShell>;
}
