import { AppShell } from "@/components/AppShell";
import { MetricCard, StatusPill } from "@/components/ui";
import { appointments, customers, orders, services, staff } from "@/lib/seed";
import { dashboardMetrics } from "@/lib/analytics";
import { currency, formatTime } from "@/lib/utils";
import { statusLabel } from "@/lib/appointments";
import { requireCurrentUser } from "@/lib/session";

export default async function DashboardPage() {
  await requireCurrentUser();
  const metrics = dashboardMetrics(new Date("2026-05-15T12:00:00+08:00"), appointments, orders, customers, services, staff);
  return (
    <AppShell title="營運總覽" subtitle="今日預約、營收、技師業績、熱門服務與風險提醒集中管理。">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="今日預約數" value={metrics.todayAppointments} hint="含待確認與已確認" />
        <MetricCard label="今日營收" value={currency.format(metrics.todayRevenue)} hint="依訂單建立日統計" />
        <MetricCard label="本月營收" value={currency.format(metrics.monthRevenue)} hint="可接正式報表週期" />
        <MetricCard label="待付款" value={currency.format(metrics.pendingPayment)} hint="未付款 / 部分付款" />
      </section>
      <section className="mt-5 grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
        <div className="card p-5"><div className="flex items-center justify-between"><h2 className="text-lg font-bold text-plum">即將到店客人</h2><StatusPill tone="amber">取消率 {(metrics.cancellationRate * 100).toFixed(0)}% / 未到率 {(metrics.noShowRate * 100).toFixed(0)}%</StatusPill></div><div className="mt-4 space-y-3">{metrics.upcoming.map((appointment) => { const customer = customers.find((item) => item.id === appointment.customerId); const technician = staff.find((item) => item.id === appointment.technicianId); return <article key={appointment.id} className="rounded-3xl bg-blush p-4"><div className="flex items-center justify-between"><strong>{formatTime(appointment.startAt)} {customer?.name}</strong><StatusPill>{statusLabel(appointment.status)}</StatusPill></div><p className="mt-1 text-sm text-ink/60">技師 {technician?.name}｜{appointment.note}</p></article>; })}</div></div>
        <div className="card p-5"><h2 className="text-lg font-bold text-plum">新客 / 回訪客</h2><div className="mt-4 grid grid-cols-2 gap-3"><MetricCard label="新客" value={metrics.newCustomers} hint="會員等級為新客"/><MetricCard label="回訪客" value={metrics.returningCustomers} hint="已有上次到訪日"/></div></div>
      </section>
      <section className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="card p-5"><h2 className="text-lg font-bold text-plum">技師業績</h2><div className="mt-4 space-y-3">{metrics.technicianRevenue.map((item) => <div key={item.name} className="flex items-center justify-between rounded-2xl bg-white p-4"><span>{item.name}<small className="ml-2 text-ink/45">服務 {item.services} 次</small></span><strong>{currency.format(item.revenue)}</strong></div>)}</div></div>
        <div className="card p-5"><h2 className="text-lg font-bold text-plum">熱門服務</h2><div className="mt-4 space-y-3">{metrics.serviceRanking.map((item) => <div key={item.name} className="flex items-center justify-between rounded-2xl bg-white p-4"><span>{item.name}</span><StatusPill tone="plum">{item.count} 筆</StatusPill></div>)}</div></div>
      </section>
    </AppShell>
  );
}
