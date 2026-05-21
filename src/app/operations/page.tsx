import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { EmptyState, MetricCard, StatusPill } from "@/components/ui";
import { dashboardMetrics } from "@/lib/analytics";
import { loadAppData } from "@/lib/app-data";
import { statusLabel } from "@/lib/appointments";
import { orderTotal, outstandingAmount } from "@/lib/orders";
import { currency, formatDate, formatTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function OperationsCommandCenterPage() {
  const data = await loadAppData();
  const metrics = dashboardMetrics(
    new Date(),
    data.appointments,
    data.orders,
    data.customers,
    data.services,
    data.staff,
  );

  const pendingAppointments = data.appointments.filter((appointment) =>
    ["pending", "confirmed", "in_service"].includes(appointment.status),
  );
  const unpaidOrders = data.orders.filter((order) => order.status !== "paid");
  const lowStockItems = data.inventory.filter(
    (item) => item.quantity <= item.lowStockThreshold,
  );
  const reminderCustomers = data.customers.filter(Boolean).filter((customer) => {
    if (!customer.nextReminder) return false;
    const reminder = new Date(customer.nextReminder).getTime();
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return reminder <= today.getTime();
  });

  const shellProps = {
    workspace: data.workspace,
    role: data.currentMember?.role ?? "owner",
    notice: data.needsWorkspace
      ? "尚未完成 workspace 初始化，請重新登入或聯絡管理員。"
      : "營運指揮中心：集中查看今日重點、風險與下一步。",
  } as const;

  return (
    <AppShell
      title="營運指揮中心"
      subtitle="把今日重點、收款風險、庫存警示與回訪提醒集中在一頁。"
      {...shellProps}
    >
      {data.needsWorkspace ? (
        <EmptyState
          title="尚未完成 workspace 初始化"
          action="完成 workspace 後，這裡會顯示正式營運指標。"
        />
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="今日預約" value={metrics.todayAppointments} hint="含待確認與已確認" />
        <MetricCard label="待確認 / 進行中" value={pendingAppointments.length} hint="需要店長或櫃檯跟進" />
        <MetricCard label="待收款" value={currency.format(metrics.pendingPayment)} hint="未付款與部分付款" />
        <MetricCard label="低庫存" value={lowStockItems.length} hint="低於安全庫存門檻" />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
        <div className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-plum">今日處理清單</h2>
              <p className="mt-1 text-sm text-ink/60">
                優先處理會影響營收與客戶體驗的項目。共 {pendingAppointments.length} 筆，僅顯示前 5 筆。
              </p>
            </div>
            <Link href="/appointments" className="mobile-tap rounded-2xl bg-plum px-4 py-2 font-semibold text-white">
              去預約系統
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {pendingAppointments.slice(0, 5).map((appointment) => {
              const customer = data.customers.find((item) => item.id === appointment.customerId);
              const technician = data.staff.find((item) => item.id === appointment.technicianId);
              return (
                <article key={appointment.id} className="rounded-3xl bg-blush p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong className="text-plum">
                      {formatDate(appointment.startAt)} {formatTime(appointment.startAt)}
                    </strong>
                    <StatusPill>{statusLabel(appointment.status)}</StatusPill>
                  </div>
                  <p className="mt-1 text-sm text-ink/65">
                    {customer?.name ?? "未命名客戶"}｜技師 {technician?.name ?? "未指派"}
                  </p>
                </article>
              );
            })}
            {!pendingAppointments.length ? (
              <EmptyState title="目前沒有待處理預約" action="新增預約後，這裡會自動整理今日重點。" />
            ) : null}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-lg font-bold text-plum">收款風險</h2>
          <div className="mt-4 space-y-3">
            {unpaidOrders.slice(0, 5).map((order) => {
              const customer = data.customers.find((item) => item.id === order.customerId);
              const total = orderTotal(order);
              const outstanding = outstandingAmount(order);
              return (
                <article key={order.id} className="rounded-3xl bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong>{customer?.name ?? "未命名客戶"}</strong>
                    <StatusPill tone="amber">未收 {currency.format(outstanding)}</StatusPill>
                  </div>
                  <p className="mt-1 text-sm text-ink/60">
                    訂單總額 {currency.format(total)}｜狀態 {order.status}
                  </p>
                </article>
              );
            })}
            {!unpaidOrders.length ? <EmptyState title="目前沒有待收款訂單" action="已收款訂單會從這裡移除。" /> : null}
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="text-lg font-bold text-plum">庫存警示</h2>
          <div className="mt-4 space-y-3">
            {lowStockItems.slice(0, 6).map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-2xl bg-white p-4">
                <span>
                  {item.name}
                  <small className="ml-2 text-ink/45">{item.brand || item.category}</small>
                </span>
                <StatusPill tone="amber">剩 {item.quantity}</StatusPill>
              </div>
            ))}
            {!lowStockItems.length ? <EmptyState title="目前沒有低庫存品項" action="低於門檻時會自動出現在這裡。" /> : null}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-lg font-bold text-plum">回訪提醒</h2>
          <div className="mt-4 space-y-3">
            {reminderCustomers.slice(0, 6).map((customer) => (
              <div key={customer.id} className="flex items-center justify-between rounded-2xl bg-white p-4">
                <span>
                  {customer.name}
                  <small className="ml-2 text-ink/45">{customer.phone}</small>
                </span>
                <StatusPill tone="sage">{customer.nextReminder}</StatusPill>
              </div>
            ))}
            {!reminderCustomers.length ? <EmptyState title="目前沒有到期回訪提醒" action="客戶設定下次提醒後會顯示在這裡。" /> : null}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
